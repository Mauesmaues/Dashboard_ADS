const { supabase } = require('../config/supabase');
const moment = require('moment-timezone');

class N8NDataModel {

  // Obter dados formatados para o frontend (compatível com interface existente)
  static async getDailyMetrics(dataInicio, dataFim, empresa = null) {
    try {
      console.log(`[N8NDataModel] Buscando métricas de ${dataInicio} até ${dataFim}`);
      
      let query = supabase
        .from('campanhas_n8n')
        .select(`
          date_start,
          ad_account_id,
          spend,
          impressions,
          clicks,
          cpc,
          ctr,
          contas_empresas!left(nome_empresa, plataforma)
        `)
        .gte('date_start', dataInicio)
        .lte('date_start', dataFim)
        .order('date_start', { ascending: false });
      
      if (empresa) {
        query = query.eq('contas_empresas.nome_empresa', empresa);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Erro ao buscar dados diários:', error);
        throw error;
      }
      
      // Agrupar por data
      const metricas = {};
      
      data.forEach(item => {
        const data = item.date_start;
        const nomeEmpresa = item.contas_empresas?.nome_empresa || item.ad_account_id;
        
        if (!metricas[data]) {
          metricas[data] = {
            data: data,
            total_gasto: 0,
            total_impressoes: 0,
            total_cliques: 0,
            empresas: {}
          };
        }
        
        // Somar totais do dia
        metricas[data].total_gasto += parseFloat(item.spend) || 0;
        metricas[data].total_impressoes += parseInt(item.impressions) || 0;
        metricas[data].total_cliques += parseInt(item.clicks) || 0;
        
        // Dados por empresa
        if (!metricas[data].empresas[nomeEmpresa]) {
          metricas[data].empresas[nomeEmpresa] = {
            gasto: 0,
            impressoes: 0,
            cliques: 0,
            contas: []
          };
        }
        
        metricas[data].empresas[nomeEmpresa].gasto += parseFloat(item.spend) || 0;
        metricas[data].empresas[nomeEmpresa].impressoes += parseInt(item.impressions) || 0;
        metricas[data].empresas[nomeEmpresa].cliques += parseInt(item.clicks) || 0;
        metricas[data].empresas[nomeEmpresa].contas.push(item.ad_account_id);
      });
      
      // Converter para array e calcular métricas
      const resultado = Object.values(metricas).map(dia => ({
        ...dia,
        cpc_medio: dia.total_cliques > 0 ? (dia.total_gasto / dia.total_cliques).toFixed(2) : '0.00',
        ctr_medio: dia.total_impressoes > 0 ? ((dia.total_cliques / dia.total_impressoes) * 100).toFixed(2) : '0.00'
      }));
      
      console.log(`✅ Processados ${resultado.length} dias de métricas`);
      return resultado;
      
    } catch (error) {
      console.error('Erro em getDailyMetrics:', error);
      throw error;
    }
  }

  // Obter empresas disponíveis
  static async getCompanies() {
    try {
      const { data, error } = await supabase
        .from('campanhas_n8n')
        .select(`
          ad_account_id,
          contas_empresas!left(nome_empresa, plataforma)
        `);
      
      if (error) throw error;
      
      // Criar mapa de empresas únicas
      const empresasMap = new Map();
      
      data.forEach(item => {
        const nomeEmpresa = item.contas_empresas?.nome_empresa || item.ad_account_id;
        const plataforma = item.contas_empresas?.plataforma || 'Facebook';
        
        if (!empresasMap.has(nomeEmpresa)) {
          empresasMap.set(nomeEmpresa, {
            name: nomeEmpresa,
            codigo: nomeEmpresa.toLowerCase().replace(/\s+/g, '_'),
            plataforma: plataforma
          });
        }
      });
      
      const empresas = Array.from(empresasMap.values());
      console.log(`✅ Encontradas ${empresas.length} empresas`);
      
      return empresas;
      
    } catch (error) {
      console.error('Erro em getCompanies:', error);
      throw error;
    }
  }

  // Obter métricas por empresa (compatível com interface existente)
  static async getCompanyMetrics(dataInicio, dataFim) {
    try {
      const { data, error } = await supabase
        .from('campanhas_n8n')
        .select(`
          date_start,
          ad_account_id,
          spend,
          impressions,
          clicks,
          cpc,
          ctr,
          contas_empresas!left(nome_empresa, plataforma)
        `)
        .gte('date_start', dataInicio)
        .lte('date_start', dataFim);
      
      if (error) throw error;
      
      // Agrupar por empresa
      const empresasMetricas = {};
      
      data.forEach(item => {
        const nomeEmpresa = item.contas_empresas?.nome_empresa || item.ad_account_id;
        
        if (!empresasMetricas[nomeEmpresa]) {
          empresasMetricas[nomeEmpresa] = {
            company: nomeEmpresa,
            totalBilling: 0,
            impressoes: 0,
            cliques: 0,
            plataforma: item.contas_empresas?.plataforma || 'Facebook'
          };
        }
        
        empresasMetricas[nomeEmpresa].totalBilling += parseFloat(item.spend) || 0;
        empresasMetricas[nomeEmpresa].impressoes += parseInt(item.impressions) || 0;
        empresasMetricas[nomeEmpresa].cliques += parseInt(item.clicks) || 0;
      });
      
      // Converter para formato esperado pelo frontend
      const resultado = Object.values(empresasMetricas).map(empresa => ({
        ...empresa,
        cpc: empresa.cliques > 0 ? (empresa.totalBilling / empresa.cliques).toFixed(2) : '0.00',
        ctr: empresa.impressoes > 0 ? ((empresa.cliques / empresa.impressoes) * 100).toFixed(2) : '0.00'
      }));
      
      console.log(`✅ Métricas processadas para ${resultado.length} empresas`);
      return resultado;
      
    } catch (error) {
      console.error('Erro em getCompanyMetrics:', error);
      throw error;
    }
  }

  // Verificar se há dados disponíveis (usado pelo sistema de detecção)
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
}

module.exports = N8NDataModel;
