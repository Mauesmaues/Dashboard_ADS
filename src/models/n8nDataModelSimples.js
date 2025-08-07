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
      
      // Buscar TODAS as métricas no período (sem filtro inicial de empresa)
      let query = supabase
        .from('campanhas_n8n')
        .select('*')
        .gte('date_start', startDateFormatted)
        .lte('date_start', endDateFormatted)
        .order('date_start', { ascending: true })
        .order('ad_account_id', { ascending: true })
        .order('id', { ascending: false }); // Ordenar por ID desc para pegar os mais recentes primeiro
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Erro ao buscar dados diários:', error);
        throw error;
      }
      
      console.log(`[N8NDataModelSimples] 📊 Total de registros encontrados no período: ${data.length}`);
      
      // NOVA LÓGICA: Buscar a última métrica (maior ID) de cada empresa por dia
      const ultimasMetricasPorDiaEmpresa = {};
      
      // Cache para mapeamento ad_account_id -> empresa
      const empresaCache = {};
      
      // Primeiro: mapear ad_account_id para empresas e agrupar
      for (const item of data) {
        const dataItem = item.date_start;
        const adAccountId = item.ad_account_id;
        
        // Obter nome da empresa (com cache)
        if (!empresaCache[adAccountId]) {
          empresaCache[adAccountId] = await this.getEmpresaFromAdAccountId(adAccountId);
        }
        const nomeEmpresa = empresaCache[adAccountId];
        
        // Aplicar filtros de empresa agora, após mapear para nome
        let deveIncluir = true;
        
        // Se empresa específica foi selecionada
        if (empresa && nomeEmpresa !== empresa) {
          deveIncluir = false;
        }
        
        // Se há limitação de empresas permitidas
        if (allowedCompanies && allowedCompanies.length > 0 && !allowedCompanies.includes(nomeEmpresa)) {
          deveIncluir = false;
        }
        
        if (!deveIncluir) continue;
        
        // Chave única: data + empresa
        const chave = `${dataItem}_${nomeEmpresa}`;
        
        // Manter apenas o registro com maior ID para cada combinação data + empresa
        if (!ultimasMetricasPorDiaEmpresa[chave] || item.id > ultimasMetricasPorDiaEmpresa[chave].id) {
          ultimasMetricasPorDiaEmpresa[chave] = {
            ...item,
            nomeEmpresa: nomeEmpresa
          };
        }
      }
      
      console.log(`[N8NDataModelSimples] 🎯 Últimas métricas por dia/empresa: ${Object.keys(ultimasMetricasPorDiaEmpresa).length} registros únicos`);
      
      // Agrupar métricas por data para calcular médias e totais
      const metricas = {};
      
      for (const item of Object.values(ultimasMetricasPorDiaEmpresa)) {
        const data = item.date_start;
        const nomeEmpresa = item.nomeEmpresa;
        
        if (!metricas[data]) {
          metricas[data] = {
            data: data,
            total_gasto: 0,
            total_impressoes: 0,
            total_cliques: 0,
            empresas: {},
            count_empresas: 0
          };
        }
        
        // Somar totais do dia (usando apenas últimas métricas de cada empresa)
        const gasto = (parseFloat(item.spend) || 0) / 100; // Converter centavos em reais
        const impressoes = parseInt(item.impressions) || 0;
        const cliques = parseInt(item.clicks) || 0;
        
        metricas[data].total_gasto += gasto;
        metricas[data].total_impressoes += impressoes;
        metricas[data].total_cliques += cliques;
        
        // Contar empresas únicas por dia
        if (!metricas[data].empresas[nomeEmpresa]) {
          metricas[data].count_empresas++;
        }
        
        // Dados por empresa (usando nome real da empresa)
        metricas[data].empresas[nomeEmpresa] = {
          nome: nomeEmpresa,
          gasto: gasto,
          impressoes: impressoes,
          cliques: cliques,
          cpc: cliques > 0 ? gasto / cliques : 0,
          ctr: impressoes > 0 ? (cliques / impressoes) * 100 : 0
        };
      }
      
      // Converter para array e calcular médias por dia
      const dadosProcessados = Object.values(metricas).map(item => {
        const countEmpresas = item.count_empresas || 1;
        
        // Calcular CPC e CTR médios do dia
        const cpc = item.total_cliques > 0 ? item.total_gasto / item.total_cliques : 0;
        const ctr = item.total_impressoes > 0 ? (item.total_cliques / item.total_impressoes) * 100 : 0;
        
        return {
          data: moment(item.data).format('DD/MM/YYYY'),
          spend: item.total_gasto,
          impressions: item.total_impressoes,
          clicks: item.total_cliques,
          cpc: cpc,
          ctr: ctr,
          empresas: item.empresas,
          count_empresas: countEmpresas
        };
      }).sort((a, b) => {
        // Ordenar por data crescente
        return moment(a.data, 'DD/MM/YYYY').diff(moment(b.data, 'DD/MM/YYYY'));
      });
      
      console.log(`[N8NDataModelSimples] ✅ Retornando ${dadosProcessados.length} dias processados`);
      console.log(`[N8NDataModelSimples] 📈 Resumo: Total gasto=${dadosProcessados.reduce((sum, d) => sum + d.spend, 0).toFixed(2)}, Total cliques=${dadosProcessados.reduce((sum, d) => sum + d.clicks, 0)}`);
      
      return dadosProcessados;
    } catch (error) {
      console.error('[N8NDataModelSimples] Erro ao buscar métricas diárias:', error);
      throw error;
    }
  }

  // Obter lista de empresas únicas dos dados
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
          totalRecords: empresa.clicks, // Total de Cliques = cliques da última métrica do dia
          expense: empresa.expense, // Gasto Total = gasto da última métrica do dia
          roosterCost: 0,
          totalBilling: empresa.expense,
          impressoes: empresa.impressions, // Impressões = impressões da última métrica do dia
          cliques: empresa.clicks,
          plataforma: empresa.plataforma,
          cplTarget: empresa.clicks > 0 ? (empresa.expense / empresa.clicks) : 0, // CPC = Gasto ÷ Cliques
          totalCPL: empresa.clicks > 0 ? (empresa.expense / empresa.clicks) : 0,
          cpc: empresa.clicks > 0 ? (empresa.expense / empresa.clicks) : 0, // CPC = Gasto ÷ Cliques
          ctr: empresa.impressions > 0 ? (empresa.clicks / empresa.impressions) * 100 : 0 // CTR = (Cliques ÷ Impressões) * 100
        }));
        
        console.log(`[N8NDataModelSimples] Dia específico processado: ${resultado.length} empresas`);
        resultado.forEach(r => console.log(`   - ${r.company}: ${r.cliques} cliques, $${r.expense.toFixed(2)}`));
        return resultado;
        
      } else {
        // LÓGICA PARA RANGE DE DIAS: somar as últimas métricas de cada dia
        console.log(`[N8NDataModelSimples] Processando range de dias: ${dataInicio} até ${dataFim}`);
        console.log(`[N8NDataModelSimples] 📊 LÓGICA: Para cada empresa, buscar a última métrica (maior ID) de cada dia e somar os valores do período`);
        
        // Agrupar por empresa e data, mantendo apenas a última métrica (maior ID) de cada dia
        const empresasPorDia = {};
        
        data.forEach(item => {
          const nomeEmpresa = empresaMapping[item.ad_account_id] || `Conta ${item.ad_account_id}`;
          const dataItem = item.date_start;
          
          if (!empresasPorDia[nomeEmpresa]) {
            empresasPorDia[nomeEmpresa] = {};
          }
          
          // Manter apenas a métrica com maior ID de cada dia (último registro do dia)
          if (!empresasPorDia[nomeEmpresa][dataItem] || item.id > empresasPorDia[nomeEmpresa][dataItem].id) {
            const isNewRecord = !empresasPorDia[nomeEmpresa][dataItem];
            const previousId = !isNewRecord ? empresasPorDia[nomeEmpresa][dataItem].id : 'nenhum';
            
            console.log(`[N8NDataModelSimples]    📅 ${dataItem} - ${nomeEmpresa}: ${isNewRecord ? 'Novo' : 'Atualizando'} registro (ID: ${previousId} → ${item.id})`);
            
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
        
        // Calcular totais para cada empresa (soma das últimas métricas de cada dia)
        const empresasMetricas = {};
        
        Object.entries(empresasPorDia).forEach(([nomeEmpresa, diasData]) => {
          const dias = Object.values(diasData);
          const totalDias = dias.length;
          
          console.log(`[N8NDataModelSimples] 🏢 Processando empresa: ${nomeEmpresa} (${totalDias} dias com dados)`);
          
          if (totalDias > 0) {
            // SOMA dos valores da última métrica de cada dia
            const somaExpense = dias.reduce((sum, dia) => sum + dia.expense, 0);
            const somaClicks = dias.reduce((sum, dia) => sum + dia.clicks, 0);
            const somaImpressions = dias.reduce((sum, dia) => sum + dia.impressions, 0);
            
            console.log(`[N8NDataModelSimples]    📈 Totais: Gasto=${somaExpense.toFixed(2)}, Cliques=${somaClicks}, Impressões=${somaImpressions}`);
            console.log(`[N8NDataModelSimples]    🧮 CPC Calculado: ${somaClicks > 0 ? (somaExpense / somaClicks).toFixed(4) : '0.0000'}`);
            console.log(`[N8NDataModelSimples]    🧮 CTR Calculado: ${somaImpressions > 0 ? ((somaClicks / somaImpressions) * 100).toFixed(2) : '0.00'}%`);
            
            empresasMetricas[nomeEmpresa] = {
              company: nomeEmpresa,
              totalRecords: somaClicks, // Total de Cliques = soma dos cliques da última métrica de cada dia
              expense: somaExpense, // Gasto Total = soma dos gastos da última métrica de cada dia
              roosterCost: 0,
              totalBilling: somaExpense,
              impressoes: somaImpressions, // Impressões = soma das impressões da última métrica de cada dia
              cliques: somaClicks, // Total de clicks
              plataforma: 'Facebook',
              cpc: somaClicks > 0 ? (somaExpense / somaClicks) : 0, // CPC Médio = Gasto Total ÷ Total de Cliques
              ctr: somaImpressions > 0 ? (somaClicks / somaImpressions) * 100 : 0, // CTR = (Total de Cliques ÷ Impressões) * 100
              diasComDados: totalDias
            };
          }
        });
        
        // Converter para formato esperado
        const resultado = Object.values(empresasMetricas).map(empresa => ({
          ...empresa,
          cplTarget: empresa.cliques > 0 ? (empresa.expense / empresa.cliques) : 0, // CPC Médio = Gasto Total ÷ Total de Cliques
          totalCPL: empresa.cliques > 0 ? (empresa.expense / empresa.cliques) : 0
        }));
        
        console.log(`[N8NDataModelSimples] ✅ Range processado: ${resultado.length} empresas`);
        console.log(`[N8NDataModelSimples] 📊 RESUMO DOS TOTAIS POR EMPRESA (soma das últimas métricas de cada dia):`);
        resultado.forEach(r => {
          console.log(`   🏢 ${r.company}:`);
          console.log(`      💰 Gasto Total: $${r.expense.toFixed(2)}`);
          console.log(`      🖱️ Cliques Totais: ${r.cliques}`);
          console.log(`      👁️ Impressões Totais: ${r.impressoes}`);
          console.log(`      💲 CPC Médio: $${r.cpc.toFixed(4)}`);
          console.log(`      📈 CTR Médio: ${r.ctr.toFixed(2)}%`);
          console.log(`      📅 Dias com dados: ${r.diasComDados}`);
        });
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
