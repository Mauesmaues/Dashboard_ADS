const { supabase } = require('../config/supabase');
const moment = require('moment-timezone');

class N8NDataModelSimples {

  // Obter mapeamento ad_account_id -> empresa
  static async getEmpresaMapping() {
    try {
      const { data, error } = await supabase
        .from('empresa_ad_accounts')
        .select('empresa, ad_account_id')
        .eq('ativo', true);
      
      if (error) {
        // Se a tabela não existe, criar mapeamento básico
        console.log('[N8NDataModelSimples] Tabela empresa_ad_accounts não encontrada, usando mapeamento direto');
        return {};
      }
      
      // Converter para objeto ad_account_id -> empresa (invertido)
      const mapping = {};
      data.forEach(row => {
        mapping[row.ad_account_id] = row.empresa;
      });
      
      console.log('[N8NDataModelSimples] Mapeamento carregado (ad_account_id -> empresa):', mapping);
      return mapping;
    } catch (error) {
      console.error('[N8NDataModelSimples] Erro ao carregar mapeamento:', error);
      return {};
    }
  }

  // Obter ad_account_id baseado no nome da empresa
  static async getAdAccountIdFromEmpresa(empresa) {
    if (!empresa) return null;
    
    try {
      const { data, error } = await supabase
        .from('empresa_ad_accounts')
        .select('ad_account_id')
        .eq('empresa', empresa)
        .eq('ativo', true);
      
      if (error || !data || data.length === 0) {
        console.log(`[N8NDataModelSimples] Empresa "${empresa}" não encontrada na tabela empresa_ad_accounts`);
        return empresa; // Fallback: assume que empresa é o próprio ad_account_id
      }
      
      return data[0].ad_account_id;
    } catch (error) {
      console.error('[N8NDataModelSimples] Erro ao buscar ad_account_id:', error);
      return empresa; // Fallback em caso de erro
    }
  }

  // Obter nome da empresa baseado no ad_account_id
  static async getEmpresaFromAdAccountId(adAccountId) {
    try {
      const { data, error } = await supabase
        .from('empresa_ad_accounts')
        .select('empresa')
        .eq('ad_account_id', adAccountId)
        .eq('ativo', true)
        .single();
      
      if (error || !data) {
        // Se não encontrar, usar o ad_account_id como nome da empresa
        return `Conta ${adAccountId}`;
      }
      
      return data.empresa;
    } catch (error) {
      return `Conta ${adAccountId}`;
    }
  }

  // Obter dados formatados para o frontend (COM mapeamento de empresas)
  static async getDailyMetrics(dataInicio, dataFim, empresa = null, allowedCompanies = null) {
    try {
      console.log(`[N8NDataModelSimples] Buscando métricas de ${dataInicio} até ${dataFim}`);
      console.log(`[N8NDataModelSimples] Empresa específica: ${empresa || 'todas'}`);
      console.log(`[N8NDataModelSimples] Empresas permitidas: ${allowedCompanies ? JSON.stringify(allowedCompanies) : 'todas'}`);
      
      // EXECUTAR LIMPEZA AUTOMÁTICA ANTES DE BUSCAR DADOS
      console.log(`[N8NDataModelSimples] 🧹 Executando limpeza automática de dados duplicados...`);
      try {
        const limpezaResult = await this.cleanDuplicateData();
        console.log(`[N8NDataModelSimples] ✅ Limpeza concluída: ${limpezaResult.deleted} registros removidos, ${limpezaResult.kept} mantidos`);
      } catch (limpezaError) {
        console.warn(`[N8NDataModelSimples] ⚠️ Erro na limpeza automática (continuando): ${limpezaError.message}`);
      }
      
      // Converter datas do formato DD/MM/YYYY para YYYY-MM-DD (formato do banco)
      const startDateFormatted = moment(dataInicio, 'DD/MM/YYYY').format('YYYY-MM-DD');
      const endDateFormatted = moment(dataFim, 'DD/MM/YYYY').format('YYYY-MM-DD');
      
      console.log(`[N8NDataModelSimples] 📅 Datas convertidas: ${dataInicio} -> ${startDateFormatted}, ${dataFim} -> ${endDateFormatted}`);
      
      let query = supabase
        .from('campanhas_n8n')
        .select('*')
        .gte('date_start', startDateFormatted)
        .lte('date_start', endDateFormatted)
        .order('date_start', { ascending: false });
      
      // Filtrar por empresa específica (convertendo nome da empresa para ad_account_id)
      if (empresa) {
        const adAccountId = await this.getAdAccountIdFromEmpresa(empresa);
        if (adAccountId) {
          console.log(`[N8NDataModelSimples] Filtrando por empresa específica "${empresa}" -> ad_account_id "${adAccountId}"`);
          query = query.eq('ad_account_id', adAccountId);
        } else {
          console.log(`[N8NDataModelSimples] Empresa "${empresa}" não encontrada no mapeamento`);
        }
      }
      // Se não há empresa específica mas há limitação de empresas permitidas
      else if (allowedCompanies && allowedCompanies.length > 0) {
        console.log(`[N8NDataModelSimples] Aplicando filtro de empresas permitidas: ${JSON.stringify(allowedCompanies)}`);
        
        // Converter nomes de empresas para ad_account_ids
        const allowedAdAccountIds = [];
        for (const empresaName of allowedCompanies) {
          const { data, error } = await supabase
            .from('empresa_ad_accounts')
            .select('ad_account_id')
            .eq('empresa', empresaName)
            .eq('ativo', true);
          
          if (!error && data && data.length > 0) {
            data.forEach(row => {
              allowedAdAccountIds.push(row.ad_account_id);
            });
          }
        }
        
        if (allowedAdAccountIds.length > 0) {
          console.log(`[N8NDataModelSimples] Filtrando por ad_account_ids permitidos: ${JSON.stringify(allowedAdAccountIds)}`);
          query = query.in('ad_account_id', allowedAdAccountIds);
        } else {
          console.log(`[N8NDataModelSimples] Nenhum ad_account_id encontrado para as empresas permitidas - retornando dados vazios`);
          return [];
        }
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Erro ao buscar dados diários:', error);
        throw error;
      }
      
      // Agrupar por data, mantendo apenas a última métrica (maior ID) de cada conta por dia
      const metricas = {};
      
      // Cache para mapeamento ad_account_id -> empresa
      const empresaCache = {};
      
      // Primeiro passo: agrupar por data e ad_account_id, mantendo apenas o maior ID
      const dadosPorDiaEConta = {};
      
      for (const item of data) {
        const dataItem = item.date_start;
        const adAccountId = item.ad_account_id;
        const chave = `${dataItem}_${adAccountId}`;
        
        // Manter apenas o registro com maior ID para cada combinação data + conta
        if (!dadosPorDiaEConta[chave] || item.id > dadosPorDiaEConta[chave].id) {
          dadosPorDiaEConta[chave] = item;
        }
      }
      
      // Segundo passo: processar apenas os registros únicos (últimas métricas de cada conta por dia)
      for (const item of Object.values(dadosPorDiaEConta)) {
        const data = item.date_start;
        const adAccountId = item.ad_account_id;
        
        // Obter nome da empresa (com cache)
        if (!empresaCache[adAccountId]) {
          empresaCache[adAccountId] = await this.getEmpresaFromAdAccountId(adAccountId);
        }
        const nomeEmpresa = empresaCache[adAccountId];
        
        if (!metricas[data]) {
          metricas[data] = {
            data: data,
            total_gasto: 0,
            total_impressoes: 0,
            total_cliques: 0,
            empresas: {}
          };
        }
        
        // Somar totais do dia (agora usando apenas últimas métricas de cada conta)
        metricas[data].total_gasto += (parseFloat(item.spend) || 0) / 100; // Dividir por 100 para converter centavos em reais
        metricas[data].total_impressoes += parseInt(item.impressions) || 0;
        metricas[data].total_cliques += parseInt(item.clicks) || 0;
        
        // Dados por empresa (usando nome real da empresa)
        if (!metricas[data].empresas[nomeEmpresa]) {
          metricas[data].empresas[nomeEmpresa] = {
            gasto: 0,
            impressoes: 0,
            cliques: 0,
            contas: []
          };
        }
        
        metricas[data].empresas[nomeEmpresa].gasto += (parseFloat(item.spend) || 0) / 100; // Dividir por 100 para converter centavos em reais
        metricas[data].empresas[nomeEmpresa].impressoes += parseInt(item.impressions) || 0;
        metricas[data].empresas[nomeEmpresa].cliques += parseInt(item.clicks) || 0;
        metricas[data].empresas[nomeEmpresa].contas.push(item.ad_account_id);
      }
      
      // Converter para array e formatar para métricas de campanhas publicitárias
      const resultado = Object.values(metricas).map(dia => {
        // Métricas principais de campanhas
        const totalGasto = dia.total_gasto;
        const totalImpressoes = dia.total_impressoes;
        const totalCliques = dia.total_cliques;
        
        // Calcular métricas derivadas
        const cpcMedio = totalCliques > 0 ? (totalGasto / totalCliques) : 0;
        const ctrMedio = totalImpressoes > 0 ? ((totalCliques / totalImpressoes) * 100) : 0;
        
        return {
          date: dia.data,
          formattedDate: dia.data,
          // Métricas principais de campanhas
          totalSpend: totalGasto,
          totalImpressions: totalImpressoes, 
          totalClicks: totalCliques,
          avgCPC: cpcMedio,
          avgCTR: ctrMedio,
          // Manter compatibilidade com formato antigo (para não quebrar)
          totalRecords: totalCliques, // Usar cliques como "registros" para compatibilidade
          expense: totalGasto,
          roosterCost: 0,
          cplTarget: cpcMedio, // CPC como CPL Target
          totalCPL: cpcMedio,  // CPC como CPL Total
          // Dados originais para referência
          total_gasto: dia.total_gasto,
          total_impressoes: dia.total_impressoes,
          total_cliques: dia.total_cliques,
          empresas: dia.empresas
        };
      });
      
      console.log(`✅ Processados ${resultado.length} dias de métricas`);
      return resultado;
      
    } catch (error) {
      console.error('Erro em getDailyMetrics:', error);
      throw error;
    }
  }

  // Obter empresas disponíveis (usando mapeamento empresa_ad_accounts)
  static async getCompanies() {
    try {
      // Primeiro tentar obter da tabela de mapeamento
      const { data: mappingData, error: mappingError } = await supabase
        .from('empresa_ad_accounts')
        .select('empresa, ad_account_id')
        .eq('ativo', true);
      
      if (!mappingError && mappingData && mappingData.length > 0) {
        // Usar dados da tabela de mapeamento
        const empresas = mappingData.map(mapping => ({
          name: mapping.empresa,
          codigo: mapping.empresa,
          empresa: mapping.empresa,
          ad_account_id: mapping.ad_account_id,
          plataforma: 'Facebook'
        }));
        
        console.log(`[N8NDataModelSimples] Empresas carregadas do mapeamento: ${empresas.map(e => e.name).join(', ')}`);
        return empresas;
      }
      
      // Fallback: usar ad_account_id únicos da tabela campanhas_n8n
      console.log('[N8NDataModelSimples] Tabela empresa_ad_accounts não encontrada, usando fallback');
      const { data, error } = await supabase
        .from('campanhas_n8n')
        .select('ad_account_id');
      
      if (error) throw error;
      
      // Criar lista usando ad_account_id únicos
      const accountIds = [...new Set(data.map(item => item.ad_account_id))];
      
      const empresas = accountIds.map(accountId => ({
        name: `Conta ${accountId}`,
        codigo: accountId,
        empresa: `Conta ${accountId}`,
        ad_account_id: accountId,
        plataforma: 'Facebook'
      }));
      
      console.log(`✅ Encontradas ${empresas.length} contas`);
      return empresas;
      
    } catch (error) {
      console.error('Erro em getCompanies:', error);
      throw error;
    }
  }

  // Obter métricas por empresa (compatível com interface existente)
  static async getCompanyMetrics(dataInicio, dataFim, empresa = null, allowedCompanies = null) {
    try {
      console.log(`[N8NDataModelSimples] getCompanyMetrics: ${dataInicio} até ${dataFim}`);
      console.log(`[N8NDataModelSimples] Empresa específica: ${empresa || 'todas'}`);
      console.log(`[N8NDataModelSimples] Empresas permitidas: ${allowedCompanies ? JSON.stringify(allowedCompanies) : 'todas'}`);
      
      // EXECUTAR LIMPEZA AUTOMÁTICA ANTES DE BUSCAR DADOS
      console.log(`[N8NDataModelSimples] 🧹 Executando limpeza automática de dados duplicados...`);
      try {
        const limpezaResult = await this.cleanDuplicateData();
        console.log(`[N8NDataModelSimples] ✅ Limpeza concluída: ${limpezaResult.deleted} registros removidos, ${limpezaResult.kept} mantidos`);
      } catch (limpezaError) {
        console.warn(`[N8NDataModelSimples] ⚠️ Erro na limpeza automática (continuando): ${limpezaError.message}`);
      }
      
      // Converter datas do formato DD/MM/YYYY para YYYY-MM-DD (formato do banco)
      const startDateFormatted = moment(dataInicio, 'DD/MM/YYYY').format('YYYY-MM-DD');
      const endDateFormatted = moment(dataFim, 'DD/MM/YYYY').format('YYYY-MM-DD');
      
      console.log(`[N8NDataModelSimples] 📅 Datas convertidas: ${dataInicio} -> ${startDateFormatted}, ${dataFim} -> ${endDateFormatted}`);
      
      let query = supabase
        .from('campanhas_n8n')
        .select('*')
        .gte('date_start', startDateFormatted)
        .lte('date_start', endDateFormatted);
      
      // Se há uma empresa específica selecionada
      if (empresa) {
        // Converter nome da empresa para ad_account_id
        console.log(`[N8NDataModelSimples] 🔍 Buscando ad_account_id para empresa: "${empresa}"`);
        
        const { data: empresaData, error: empresaError } = await supabase
          .from('empresa_ad_accounts')
          .select('ad_account_id')
          .eq('empresa', empresa)
          .eq('ativo', true);
        
        console.log(`[N8NDataModelSimples] 📊 Resultado da busca:`, { empresaData, empresaError });
        
        if (!empresaError && empresaData && empresaData.length > 0) {
          const adAccountIds = empresaData.map(row => row.ad_account_id);
          console.log(`[N8NDataModelSimples] ✅ Ad account IDs encontrados:`, adAccountIds);
          console.log(`[N8NDataModelSimples] 🔍 Aplicando filtro: .in('ad_account_id', ${JSON.stringify(adAccountIds)})`);
          
          query = query.in('ad_account_id', adAccountIds);
          
          // Debug: vamos ver a query final que está sendo executada
          console.log(`[N8NDataModelSimples] 📋 Query final:`, {
            table: 'campanhas_n8n',
            filters: {
              'date_start >=': startDateFormatted,
              'date_start <=': endDateFormatted,
              'ad_account_id IN': adAccountIds
            }
          });
          
        } else {
          console.log(`[N8NDataModelSimples] ❌ Empresa específica "${empresa}" não encontrada - retornando dados vazios`);
          console.log(`[N8NDataModelSimples] ❌ Erro:`, empresaError);
          console.log(`[N8NDataModelSimples] ❌ Dados:`, empresaData);
          return [];
        }
      }
      // Se não há empresa específica mas há limitação de empresas permitidas
      else if (allowedCompanies && allowedCompanies.length > 0) {
        console.log(`[N8NDataModelSimples] Aplicando filtro de empresas permitidas: ${JSON.stringify(allowedCompanies)}`);
        
        // Converter nomes de empresas para ad_account_ids
        const allowedAdAccountIds = [];
        for (const empresaName of allowedCompanies) {
          const { data, error } = await supabase
            .from('empresa_ad_accounts')
            .select('ad_account_id')
            .eq('empresa', empresaName)
            .eq('ativo', true);
          
          if (!error && data && data.length > 0) {
            data.forEach(row => {
              allowedAdAccountIds.push(row.ad_account_id);
            });
          }
        }
        
        if (allowedAdAccountIds.length > 0) {
          console.log(`[N8NDataModelSimples] Filtrando por ad_account_ids permitidos: ${JSON.stringify(allowedAdAccountIds)}`);
          query = query.in('ad_account_id', allowedAdAccountIds);
        } else {
          console.log(`[N8NDataModelSimples] Nenhum ad_account_id encontrado para as empresas permitidas - retornando dados vazios`);
          return [];
        }
      }
      
      const { data, error } = await query;
      
      console.log(`[N8NDataModelSimples] Query executada - registros retornados: ${data ? data.length : 'ERRO'}`);
      if (data && data.length > 0) {
        console.log(`[N8NDataModelSimples] Primeiros registros:`);
        data.slice(0, 3).forEach((record, index) => {
          console.log(`   ${index + 1}. ID: ${record.id}, ad_account_id: ${record.ad_account_id}, data: ${record.date_start}, gasto: $${record.spend}`);
        });
      } else if (error) {
        console.log(`[N8NDataModelSimples] Erro na query:`, error);
      } else {
        console.log(`[N8NDataModelSimples] ❌ Nenhum registro retornado pela query`);
      }
      
      if (error) throw error;
      
      // Carregar mapeamento de empresas
      const empresaMapping = await this.getEmpresaMapping();
      
      // Verificar se o filtro é para um dia específico ou range de dias
      const isSpecificDay = dataInicio === dataFim;
      console.log(`[N8NDataModelSimples] Filtro: ${isSpecificDay ? 'Dia específico' : 'Range de dias'} (${dataInicio} até ${dataFim})`);
      
      if (isSpecificDay) {
        // LÓGICA PARA DIA ESPECÍFICO: última métrica (maior ID) do dia
        console.log(`[N8NDataModelSimples] Processando dia específico: ${dataInicio}`);
        
        // Agrupar por empresa e buscar a métrica com maior ID para cada uma
        const empresasMetricas = {};
        
        data.forEach(item => {
          const nomeEmpresa = empresaMapping[item.ad_account_id] || `Conta ${item.ad_account_id}`;
          
          if (!empresasMetricas[nomeEmpresa] || item.id > empresasMetricas[nomeEmpresa].maxId) {
            empresasMetricas[nomeEmpresa] = {
              company: nomeEmpresa,
              maxId: item.id,
              expense: (parseFloat(item.spend) || 0) / 100, // Dividir por 100 para converter centavos em reais
              clicks: parseInt(item.clicks) || 0,
              impressions: parseInt(item.impressions) || 0,
              cpc: parseFloat(item.cpc) || 0, // CPC já está correto, não dividir
              ctr: parseFloat(item.ctr) || 0,
              plataforma: 'Facebook'
            };
          }
        });
        
        // Converter para formato esperado
        const resultado = Object.values(empresasMetricas).map(empresa => ({
          company: empresa.company,
          totalRecords: empresa.clicks,
          expense: empresa.expense,
          roosterCost: 0,
          totalBilling: empresa.expense,
          impressoes: empresa.impressions,
          cliques: empresa.clicks,
          plataforma: empresa.plataforma,
          cplTarget: empresa.clicks > 0 ? (empresa.expense / empresa.clicks) : 0,
          totalCPL: empresa.clicks > 0 ? (empresa.expense / empresa.clicks) : 0,
          cpc: empresa.cpc,
          ctr: empresa.ctr
        }));
        
        console.log(`[N8NDataModelSimples] Dia específico processado: ${resultado.length} empresas`);
        resultado.forEach(r => console.log(`   - ${r.company}: ${r.cliques} cliques, $${r.expense}`));
        return resultado;
        
      } else {
        // LÓGICA PARA RANGE DE DIAS: média das últimas métricas de cada dia
        console.log(`[N8NDataModelSimples] Processando range de dias: ${dataInicio} até ${dataFim}`);
        
        // Agrupar por empresa e data, mantendo apenas a última métrica (maior ID) de cada dia
        const empresasPorDia = {};
        
        data.forEach(item => {
          const nomeEmpresa = empresaMapping[item.ad_account_id] || `Conta ${item.ad_account_id}`;
          const dataItem = item.date_start;
          
          if (!empresasPorDia[nomeEmpresa]) {
            empresasPorDia[nomeEmpresa] = {};
          }
          
          if (!empresasPorDia[nomeEmpresa][dataItem] || item.id > empresasPorDia[nomeEmpresa][dataItem].id) {
            empresasPorDia[nomeEmpresa][dataItem] = {
              id: item.id,
              expense: (parseFloat(item.spend) || 0) / 100, // Dividir por 100 para converter centavos em reais
              clicks: parseInt(item.clicks) || 0,
              impressions: parseInt(item.impressions) || 0,
              cpc: parseFloat(item.cpc) || 0, // CPC já está correto, não dividir
              ctr: parseFloat(item.ctr) || 0
            };
          }
        });
        
        // Calcular médias para cada empresa
        const empresasMetricas = {};
        
        Object.entries(empresasPorDia).forEach(([nomeEmpresa, diasData]) => {
          const dias = Object.values(diasData);
          const totalDias = dias.length;
          
          if (totalDias > 0) {
            const somaExpense = dias.reduce((sum, dia) => sum + dia.expense, 0);
            const somaClicks = dias.reduce((sum, dia) => sum + dia.clicks, 0);
            const somaImpressions = dias.reduce((sum, dia) => sum + dia.impressions, 0);
            const somaCpc = dias.reduce((sum, dia) => sum + dia.cpc, 0);
            const somaCtr = dias.reduce((sum, dia) => sum + dia.ctr, 0);
            
            empresasMetricas[nomeEmpresa] = {
              company: nomeEmpresa,
              totalRecords: Math.round(somaClicks / totalDias), // Média de clicks
              expense: somaExpense / totalDias, // Média de gastos
              roosterCost: 0,
              totalBilling: somaExpense / totalDias,
              impressoes: Math.round(somaImpressions / totalDias), // Média de impressões
              cliques: Math.round(somaClicks / totalDias), // Média de clicks
              plataforma: 'Facebook',
              cpc: somaCpc / totalDias, // Média de CPC
              ctr: somaCtr / totalDias, // Média de CTR
              diasComDados: totalDias
            };
          }
        });
        
        // Converter para formato esperado
        const resultado = Object.values(empresasMetricas).map(empresa => ({
          ...empresa,
          cplTarget: empresa.cliques > 0 ? (empresa.expense / empresa.cliques) : 0,
          totalCPL: empresa.cliques > 0 ? (empresa.expense / empresa.cliques) : 0
        }));
        
        console.log(`[N8NDataModelSimples] Range processado: ${resultado.length} empresas`);
        resultado.forEach(r => console.log(`   - ${r.company}: ${r.cliques} cliques (média de ${r.diasComDados} dias), $${r.expense.toFixed(2)}`));
        return resultado;
      }
      
    } catch (error) {
      console.error('Erro em getCompanyMetrics:', error);
      throw error;
    }
  }

  // Verificar se há dados disponíveis
  static async hasData() {
    try {
      const { count, error } = await supabase
        .from('campanhas_n8n')
        .select('*', { count: 'exact', head: true })
        .limit(1);
      
      if (error) {
        console.log('Tabela campanhas_n8n não existe ainda');
        return false;
      }
      
      return count > 0;
      
    } catch (error) {
      console.log('Erro ao verificar dados N8N:', error.message);
      return false;
    }
  }

  // Obter estatísticas gerais
  static async getStats() {
    try {
      const { count: totalRegistros } = await supabase
        .from('campanhas_n8n')
        .select('*', { count: 'exact', head: true });
      
      const { data: ultimoRegistro } = await supabase
        .from('campanhas_n8n')
        .select('date_start, created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      // Contas únicas
      const { data: contas } = await supabase
        .from('campanhas_n8n')
        .select('ad_account_id');
      
      const contasUnicas = new Set(contas?.map(c => c.ad_account_id)).size;
      
      return {
        total_registros: totalRegistros,
        contas_unicas: contasUnicas,
        ultimo_registro: ultimoRegistro?.date_start,
        ultima_atualizacao: ultimoRegistro?.created_at
      };
      
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      return null;
    }
  }

  // Buscar range de datas real dos dados
  static async getDateRange() {
    try {
      console.log('[N8NDataModelSimples] Buscando range de datas dos dados...');
      
      const { data, error } = await supabase
        .from('campanhas_n8n')
        .select('date_start')
        .order('date_start', { ascending: true });
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        console.log('[N8NDataModelSimples] Nenhum dado encontrado, usando range padrão');
        // Se não há dados, retornar range padrão (primeiro dia do mês até hoje)
        const now = moment();
        const firstDay = moment().startOf('month');
        
        return {
          startDate: firstDay.format('DD/MM/YYYY'),
          endDate: now.format('DD/MM/YYYY'),
          hasData: false
        };
      }
      
      const primeiraData = moment(data[0].date_start);
      const ultimaData = moment(data[data.length - 1].date_start);
      
      console.log(`[N8NDataModelSimples] Range encontrado: ${primeiraData.format('DD/MM/YYYY')} até ${ultimaData.format('DD/MM/YYYY')}`);
      
      return {
        startDate: primeiraData.format('DD/MM/YYYY'),
        endDate: ultimaData.format('DD/MM/YYYY'),
        hasData: true,
        totalDays: data.length,
        firstRecord: primeiraData.format('YYYY-MM-DD'),
        lastRecord: ultimaData.format('YYYY-MM-DD')
      };
      
    } catch (error) {
      console.error('Erro ao buscar range de datas:', error);
      // Em caso de erro, retornar range padrão
      const now = moment();
      const firstDay = moment().startOf('month');
      
      return {
        startDate: firstDay.format('DD/MM/YYYY'),
        endDate: now.format('DD/MM/YYYY'),
        hasData: false,
        error: error.message
      };
    }
  }

  // Limpar dados duplicados, mantendo apenas os 2 últimos registros (maiores IDs) de cada dia por conta
  static async cleanDuplicateData(forceClean = false) {
    try {
      // Controle de frequência: só executar se forçado ou se passou um tempo mínimo
      const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutos
      const now = Date.now();
      
      if (!forceClean) {
        // Verificar último cleanup (usando uma variável estática simples)
        if (!this._lastCleanup) {
          this._lastCleanup = 0;
        }
        
        if (now - this._lastCleanup < CLEANUP_INTERVAL) {
          console.log(`[N8NDataModelSimples] 🕒 Limpeza executada recentemente (${Math.round((now - this._lastCleanup) / 1000)}s atrás), pulando...`);
          return { deleted: 0, kept: 0, skipped: true };
        }
      }
      
      console.log('[N8NDataModelSimples] 🧹 Iniciando limpeza de dados duplicados...');
      
      // Atualizar timestamp do último cleanup
      this._lastCleanup = now;
      
      // Buscar todos os registros
      const { data: allData, error: fetchError } = await supabase
        .from('campanhas_n8n')
        .select('id, ad_account_id, date_start')
        .order('id', { ascending: true });
      
      if (fetchError) {
        console.error('[N8NDataModelSimples] Erro ao buscar dados:', fetchError);
        throw fetchError;
      }
      
      if (!allData || allData.length === 0) {
        console.log('[N8NDataModelSimples] Nenhum dado encontrado para limpeza');
        return { deleted: 0, kept: 0 };
      }
      
      console.log(`[N8NDataModelSimples] 📊 Total de registros encontrados: ${allData.length}`);
      console.log(`[N8NDataModelSimples] 🔒 Política: Manter 2 últimos registros por dia/conta (por segurança)`);
      
      // Agrupar por data + ad_account_id e encontrar os 2 maiores IDs de cada grupo
      const grupos = {};
      const idsParaManter = new Set();
      
      allData.forEach(item => {
        const chave = `${item.date_start}_${item.ad_account_id}`;
        
        if (!grupos[chave]) {
          grupos[chave] = {
            items: [item],
            count: 1
          };
        } else {
          grupos[chave].items.push(item);
          grupos[chave].count++;
        }
      });
      
      // Identificar IDs para manter (os 2 maiores IDs de cada grupo)
      Object.values(grupos).forEach(grupo => {
        // Ordenar itens por ID decrescente e pegar os 2 primeiros
        const sortedItems = grupo.items.sort((a, b) => b.id - a.id);
        const idsToKeep = sortedItems.slice(0, 2); // Manter os 2 maiores IDs
        
        idsToKeep.forEach(item => {
          idsParaManter.add(item.id);
        });
      });
      
      // Identificar IDs para deletar
      const idsParaDeletar = allData
        .filter(item => !idsParaManter.has(item.id))
        .map(item => item.id);
      
      console.log(`[N8NDataModelSimples] 📋 Estatísticas:`);
      console.log(`   - Grupos únicos (data + conta): ${Object.keys(grupos).length}`);
      console.log(`   - Registros a manter: ${idsParaManter.size} (máximo 2 por grupo)`);
      console.log(`   - Registros a deletar: ${idsParaDeletar.length}`);
      
      if (idsParaDeletar.length === 0) {
        console.log('[N8NDataModelSimples] ✅ Nenhum registro em excesso encontrado (máximo 2 por grupo já respeitado)');
        return { deleted: 0, kept: idsParaManter.size };
      }
      
      // Mostrar alguns exemplos de grupos com duplicatas
      const gruposComDuplicatas = Object.entries(grupos).filter(([_, grupo]) => grupo.count > 2);
      if (gruposComDuplicatas.length > 0) {
        console.log(`[N8NDataModelSimples] 📝 Exemplos de grupos com mais de 2 registros:`);
        gruposComDuplicatas.slice(0, 5).forEach(([chave, grupo]) => {
          const [data, adAccountId] = chave.split('_');
          const sortedItems = grupo.items.sort((a, b) => b.id - a.id);
          const keepingIds = sortedItems.slice(0, 2).map(item => item.id);
          console.log(`   - ${data} | Conta ${adAccountId}: ${grupo.count} registros, mantendo 2 últimos IDs [${keepingIds.join(', ')}]`);
        });
      }
      
      // Executar deleção em lotes para evitar problemas de performance
      const batchSize = 100;
      let totalDeleted = 0;
      
      for (let i = 0; i < idsParaDeletar.length; i += batchSize) {
        const batch = idsParaDeletar.slice(i, i + batchSize);
        
        console.log(`[N8NDataModelSimples] 🗑️ Deletando lote ${Math.floor(i/batchSize) + 1}: ${batch.length} registros`);
        
        const { error: deleteError } = await supabase
          .from('campanhas_n8n')
          .delete()
          .in('id', batch);
        
        if (deleteError) {
          console.error(`[N8NDataModelSimples] Erro ao deletar lote:`, deleteError);
          throw deleteError;
        }
        
        totalDeleted += batch.length;
        
        // Pequena pausa entre lotes para não sobrecarregar o banco
        if (i + batchSize < idsParaDeletar.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      console.log(`[N8NDataModelSimples] ✅ Limpeza concluída:`);
      console.log(`   - Registros deletados: ${totalDeleted}`);
      console.log(`   - Registros mantidos: ${idsParaManter.size}`);
      console.log(`   - Redução de dados: ${((totalDeleted / allData.length) * 100).toFixed(1)}%`);
      
      return { 
        deleted: totalDeleted, 
        kept: idsParaManter.size,
        reductionPercentage: ((totalDeleted / allData.length) * 100).toFixed(1)
      };
      
    } catch (error) {
      console.error('[N8NDataModelSimples] Erro na limpeza de dados:', error);
      throw error;
    }
  }
}

module.exports = N8NDataModelSimples;
