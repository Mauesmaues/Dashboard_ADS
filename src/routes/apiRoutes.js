const express = require('express');
const router = express.Router();
const DataController = require('../controllers/dataController');
const AuthController = require('../controllers/authController');
const CampanhasController = require('../controllers/campanhasController');
const CompanyController = require('../controllers/companyController');
const { testSaldoEndpoint } = require('../controllers/testController');
const authMiddleware = require('../middleware/authMiddleware');

// Auth routes
router.post('/auth/login', AuthController.login);
router.post('/auth/logout', AuthController.logout);
router.get('/auth/check', AuthController.checkAuth);
router.post('/auth/auto-login', AuthController.autoLogin);

// Debug endpoint (temporary, remove in production)
router.get('/debug/users', async (req, res) => {
  try {
    const { supabase } = require('../config/supabase');
    const { data, error } = await supabase
      .from('acessobi')
      .select('id, email, password, role, empresa')
      .order('id');
    
    if (error) throw error;
    
    // For security, don't return full password hashes in the response
    const sanitizedData = data.map(user => ({
      ...user,
      password: user.password ? 
        (user.password.startsWith('$2') ? 'HASHED' : 'PLAINTEXT') : 'NULL'
    }));
    
    res.json(sanitizedData);
  } catch (error) {
    console.error('Debug users error:', error);
    res.status(500).json({ error: 'Error fetching users data' });
  }
});

// Test endpoint for saldo debugging
router.get('/test/saldo', testSaldoEndpoint);

// User management routes (admin only)
router.get('/users', authMiddleware.isAuthenticated, authMiddleware.isAdmin, AuthController.getAllUsers);
router.post('/users', authMiddleware.isAuthenticated, authMiddleware.isAdmin, AuthController.createUser);
router.put('/users/:email', authMiddleware.isAuthenticated, authMiddleware.isAdmin, AuthController.updateUser);
router.delete('/users/:email', authMiddleware.isAuthenticated, authMiddleware.isAdmin, AuthController.deleteUser);

// Protected data routes
// Get list of companies for filters (will use CompanyController.getAllCompanies below)

// Get metrics data filtered by date and company
router.get('/metrics', authMiddleware.isAuthenticated, DataController.getMetrics);

// Get metrics data grouped by company
router.get('/company-metrics', authMiddleware.isAuthenticated, DataController.getCompanyMetrics);

// Get default date range (first day of month to current day)
router.get('/default-dates', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const dates = await DataController.getDefaultDateRange();
    res.json(dates);
  } catch (error) {
    console.error('Erro ao buscar datas padrão:', error);
    res.status(500).json({ error: 'Erro ao buscar range de datas' });
  }
});

// Export metrics data to Excel
router.get('/export', authMiddleware.isAuthenticated, authMiddleware.hasCompanyAccess, DataController.exportToExcel);

// Export company metrics data to Excel
router.get('/export-company', authMiddleware.isAuthenticated, authMiddleware.hasCompanyAccess, DataController.exportCompanyMetricsToExcel);

// ========================================
// ROTAS PARA SISTEMA DE CAMPANHAS N8N
// ========================================

// Endpoint para obter métricas dos dados N8N
router.get('/campanhas/metricas', authMiddleware.isAuthenticated, CampanhasController.obterMetricasN8N);

// Endpoint para obter empresas dos dados N8N
router.get('/campanhas/empresas', authMiddleware.isAuthenticated, CampanhasController.obterEmpresasN8N);

// Status do sistema (público para monitoramento)
router.get('/campanhas/status', CampanhasController.statusDados);

// Endpoints administrativos para campanhas
router.post('/campanhas/mapear-conta', authMiddleware.isAuthenticated, CampanhasController.mapearContaEmpresa);

// Limpar dados duplicados (Admin only)
router.post('/campanhas/limpar-duplicados', authMiddleware.isAuthenticated, authMiddleware.isAdmin, async (req, res) => {
  try {
    const N8NDataModelSimples = require('../models/n8nDataModelSimples');
    const { force = true } = req.body; // Por padrão forçar quando chamado manualmente
    
    console.log(`[API] Usuário ${req.session?.user?.email} iniciando limpeza de dados duplicados (force: ${force})...`);
    
    const resultado = await N8NDataModelSimples.cleanDuplicateData(force);
    
    console.log(`[API] Limpeza concluída:`, resultado);
    
    res.json({
      success: true,
      message: resultado.skipped ? 'Limpeza executada recentemente, nenhuma ação necessária' : 'Limpeza de dados duplicados concluída com sucesso (mantidos 2 últimos registros por dia/conta)',
      stats: resultado
    });
    
  } catch (error) {
    console.error('[API] Erro na limpeza de dados duplicados:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro ao executar limpeza de dados duplicados',
      details: error.message 
    });
  }
});

// Métricas consolidadas com filtros avançados
router.get('/campanhas/metricas-consolidadas', authMiddleware.isAuthenticated, CampanhasController.obterMetricasN8N);

// Company Management Routes (Admin only)
router.get('/companies', authMiddleware.isAuthenticated, CompanyController.getAllCompanies);
router.post('/companies', authMiddleware.isAuthenticated, CompanyController.createCompany);
router.put('/companies/:id', authMiddleware.isAuthenticated, CompanyController.updateCompany);
router.delete('/companies/:id', authMiddleware.isAuthenticated, CompanyController.deleteCompany);
router.delete('/companies/by-ad-account/:ad_account_id', authMiddleware.isAuthenticated, CompanyController.deleteCompanyByAdAccountId);

// CRM Routes
router.get('/crm/leads/:companyName', authMiddleware.isAuthenticated, async (req, res) => {
  try {
    const { companyName } = req.params;
    const { supabase } = require('../config/supabase');
    
    console.log(`[CRM] Buscando leads para empresa: "${companyName}"`);
    
    // Use o nome exato da empresa como nome da tabela (sem sanitização)
    const tableName = companyName;
    
    console.log(`[CRM] Nome da tabela (exato): "${tableName}"`);
    
    // Tentar buscar dados diretamente da tabela
    // Se a tabela não existir, o Supabase retornará um erro específico
    const { data, error } = await supabase
      .from(tableName)
      .select(`
        id,
        data_hora_entrada,
        nome,
        email,
        telefone,
        procedimento_interesse,
        ja_realizou,
        quando_pretende
      `)
      .order('data_hora_entrada', { ascending: false });
    
    if (error) {
      // Se a tabela não existe, retorna array vazio
      if (error.code === 'PGRST106' || error.message.includes('does not exist')) {
        console.log(`[CRM] ⚠️ Tabela "${tableName}" não encontrada - retornando array vazio`);
        return res.json([]);
      }
      
      console.error('[CRM] Erro ao buscar leads:', error);
      throw error;
    }
    
    // Processar dados para garantir que campos vazios sejam tratados
    const processedData = data?.map(lead => ({
      ...lead,
      nome: lead.nome || '',
      email: lead.email || '',
      telefone: lead.telefone || '',
      procedimento_interesse: lead.procedimento_interesse || '',
      ja_realizou: lead.ja_realizou || '',
      quando_pretende: lead.quando_pretende || '',
      data_hora_entrada: lead.data_hora_entrada || ''
    })) || [];
    
    console.log(`[CRM] ✅ Encontrados ${processedData.length} leads para "${companyName}"`);
    res.json(processedData);
    
  } catch (error) {
    console.error('[CRM] Erro no endpoint de leads:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar leads',
      details: error.message 
    });
  }
});

module.exports = router;
