const { supabase } = require('../config/supabase');
const moment = require('moment-timezone');
const EmpresaAdAccountModel = require('../models/empresaAdAccountModel');

class CampanhasController {

  // Obter métricas dos dados enviados pelo N8N
  static async obterMetricasN8N(req, res) {
    try {
      const { 
        data_inicio, 
        data_fim,
        empresa = null
      } = req.query;
      
      // Definir período padrão se não fornecido
      const dataInicio = data_inicio || moment().subtract(30, 'days').format('YYYY-MM-DD');
      const dataFim = data_fim || moment().format('YYYY-MM-DD');
      
      console.log(`🔍 Buscando métricas de ${dataInicio} até ${dataFim}`);
      console.log(`👤 Usuário logado:`, req.session?.user?.email, `(${req.session?.user?.role})`);
      
      // Verificar se o usuário está logado
      if (!req.session || !req.session.user) {
        return res.status(401).json({
          sucesso: false,
          erro: 'Usuário não autenticado'
        });
      }
      
      const user = req.session.user;
      let allowedAdAccountIds = [];
      
      // Se não for admin, filtrar por empresas do usuário
      if (user.role !== 'Admin') {
        console.log(`🔒 Usuário não-admin. Empresas permitidas:`, user.empresa);
        
        // Buscar ad_account_ids das empresas do usuário na tabela empresa_ad_accounts
        const userEmpresas = Array.isArray(user.empresa) ? user.empresa : [user.empresa];
        
        for (const empresaName of userEmpresas) {
          console.log(`🔍 Buscando ad_account_ids para empresa: ${empresaName}`);
          const mappings = await EmpresaAdAccountModel.getMappingsByEmpresa(empresaName);
          const adAccountIds = mappings.map(m => m.ad_account_id);
          allowedAdAccountIds.push(...adAccountIds);
          console.log(`📋 Ad Account IDs encontrados para ${empresaName}:`, adAccountIds);
        }
        
        // Remove duplicatas
        allowedAdAccountIds = [...new Set(allowedAdAccountIds)];
        console.log(`🔑 Ad Account IDs únicos permitidos:`, allowedAdAccountIds);
        
        if (allowedAdAccountIds.length === 0) {
          console.log(`⚠️ Nenhum ad_account_id encontrado para as empresas do usuário`);
          return res.status(200).json({
            sucesso: true,
            dados: [],
            periodo: { data_inicio: dataInicio, data_fim: dataFim },
            total_registros: 0,
            mensagem: 'Usuário não possui acesso a nenhuma empresa com campanhas'
          });
        }
      } else {
        console.log(`👑 Usuário admin - acesso total`);
      }
      
      // Query para buscar dados da tabela campanhas_n8n
      let query = supabase
        .from('campanhas_n8n')
        .select('*')
        .gte('date_start', dataInicio)
        .lte('date_start', dataFim)
        .order('date_start', { ascending: false });
      
      // Se não for admin, filtrar por ad_account_ids permitidos
      if (user.role !== 'Admin' && allowedAdAccountIds.length > 0) {
        console.log(`🔒 Aplicando filtro de ad_account_ids:`, allowedAdAccountIds);
        query = query.in('ad_account_id', allowedAdAccountIds);
      }
      
      const { data: campanhasData, error } = await query;
      
      if (error) {
        console.error('Erro ao buscar dados do N8N:', error);
        throw error;
      }
      
      console.log(`✅ Encontrados ${campanhasData.length} registros de campanhas`);
      
      // Buscar informações das empresas para correlacionar com os ad_account_ids
      const allMappings = await EmpresaAdAccountModel.getAllMappings();
      const adAccountToEmpresaMap = {};
      
      allMappings.forEach(mapping => {
        adAccountToEmpresaMap[mapping.ad_account_id] = mapping.empresa;
      });
      
      console.log(`📊 Mapeamento ad_account_id -> empresa:`, adAccountToEmpresaMap);
      
      // Processar dados correlacionando ad_account_id com empresa
      const dadosProcessados = campanhasData.map(item => {
        const empresaName = adAccountToEmpresaMap[item.ad_account_id] || `Ad Account ${item.ad_account_id}`;
        
        return {
          data: item.date_start,
          empresa: empresaName,
          ad_account_id: item.ad_account_id,
          gasto: parseFloat(item.spend) || 0,
          impressoes: parseInt(item.impressions) || 0,
          cliques: parseInt(item.clicks) || 0,
          cpc: parseFloat(item.cpc) || 0,
          ctr: parseFloat(item.ctr) || 0,
          plataforma: 'Facebook' // Assumindo Facebook como padrão
        };
      });
      
      // Filtrar por empresa específica se solicitado
      let dadosFiltrados = dadosProcessados;
      if (empresa) {
        dadosFiltrados = dadosProcessados.filter(item => item.empresa === empresa);
        console.log(`🔍 Filtrado por empresa "${empresa}": ${dadosFiltrados.length} registros`);
      }
      
      return res.status(200).json({
        sucesso: true,
        dados: dadosFiltrados,
        periodo: { data_inicio: dataInicio, data_fim: dataFim },
        total_registros: dadosFiltrados.length
      });
      
    } catch (error) {
      console.error('Erro ao obter métricas do N8N:', error);
      return res.status(500).json({
        sucesso: false,
        erro: 'Erro ao consultar dados',
        detalhes: error.message
      });
    }
  }

  // Obter empresas disponíveis nos dados do N8N
  static async obterEmpresasN8N(req, res) {
    try {
      // Verificar se o usuário está logado
      if (!req.session || !req.session.user) {
        return res.status(401).json({
          sucesso: false,
          erro: 'Usuário não autenticado'
        });
      }
      
      const user = req.session.user;
      console.log(`🏢 Buscando empresas para usuário:`, user.email, `(${user.role})`);
      
      // Se for admin, retorna todas as empresas
      if (user.role === 'Admin') {
        console.log(`👑 Admin - retornando todas as empresas`);
        const allMappings = await EmpresaAdAccountModel.getAllMappings();
        
        const empresasMap = new Map();
        allMappings.forEach(mapping => {
          if (!empresasMap.has(mapping.empresa)) {
            empresasMap.set(mapping.empresa, {
              nome: mapping.empresa,
              plataforma: 'Facebook',
              contas: []
            });
          }
          empresasMap.get(mapping.empresa).contas.push(mapping.ad_account_id);
        });
        
        const empresas = Array.from(empresasMap.values());
        
        return res.status(200).json({
          sucesso: true,
          empresas: empresas,
          total: empresas.length
        });
      }
      
      // Para usuários não-admin, retorna apenas suas empresas
      const userEmpresas = Array.isArray(user.empresa) ? user.empresa : [user.empresa];
      console.log(`🔒 Usuário não-admin. Empresas permitidas:`, userEmpresas);
      
      const empresasMap = new Map();
      
      for (const empresaName of userEmpresas) {
        const mappings = await EmpresaAdAccountModel.getMappingsByEmpresa(empresaName);
        
        if (mappings.length > 0) {
          empresasMap.set(empresaName, {
            nome: empresaName,
            plataforma: 'Facebook',
            contas: mappings.map(m => m.ad_account_id)
          });
        }
      }
      
      const empresas = Array.from(empresasMap.values());
      console.log(`📊 Empresas retornadas:`, empresas.map(e => e.nome));
      
      return res.status(200).json({
        sucesso: true,
        empresas: empresas,
        total: empresas.length
      });
      
    } catch (error) {
      console.error('Erro ao obter empresas:', error);
      return res.status(500).json({
        sucesso: false,
        erro: 'Erro ao consultar empresas',
        detalhes: error.message
      });
    }
  }
  // Mapear conta de ads para empresa
  static async mapearContaEmpresa(req, res) {
    try {
      const { ad_account_id, nome_empresa, plataforma = 'Facebook' } = req.body;
      
      if (!ad_account_id || !nome_empresa) {
        return res.status(400).json({ 
          erro: 'ad_account_id e nome_empresa são obrigatórios' 
        });
      }
      
      const { data, error } = await supabase
        .from('contas_empresas')
        .upsert({
          ad_account_id,
          nome_empresa,
          plataforma,
          ativo: true
        })
        .select()
        .single();
        
      if (error) throw error;
      
      return res.status(200).json({
        sucesso: true,
        conta: data,
        mensagem: `Conta ${ad_account_id} mapeada para ${nome_empresa}`
      });
      
    } catch (error) {
      console.error('Erro ao mapear conta:', error);
      return res.status(500).json({
        erro: 'Erro ao mapear conta',
        detalhes: error.message
      });
    }
  }

  // Status dos dados do N8N
  static async statusDados(req, res) {
    try {
      // Total de registros
      const { count: totalRegistros } = await supabase
        .from('campanhas_n8n')
        .select('*', { count: 'exact', head: true });
      
      // Último registro
      const { data: ultimoRegistro } = await supabase
        .from('campanhas_n8n')
        .select('date_start, ad_account_id, created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      // Dados dos últimos 7 dias
      const dataLimite = moment().subtract(7, 'days').format('YYYY-MM-DD');
      const { count: registrosRecentes } = await supabase
        .from('campanhas_n8n')
        .select('*', { count: 'exact', head: true })
        .gte('date_start', dataLimite);
      
      // Contas únicas
      const { data: contasUnicas } = await supabase
        .from('campanhas_n8n')
        .select('ad_account_id')
        .limit(1000);
      
      const totalContas = new Set(contasUnicas?.map(c => c.ad_account_id)).size;
      
      return res.status(200).json({
        sistema: 'Dashboard ADS - Dados N8N',
        status: 'Operacional',
        estatisticas: {
          total_registros: totalRegistros,
          total_contas_unicas: totalContas,
          registros_ultimos_7_dias: registrosRecentes,
          ultimo_registro: ultimoRegistro
        },
        versao: '1.0.0'
      });
      
    } catch (error) {
      console.error('Erro ao obter status:', error);
      return res.status(500).json({
        sistema: 'Dashboard ADS - Dados N8N',
        status: 'Erro',
        erro: error.message
      });
    }
  }
}

module.exports = CampanhasController;
