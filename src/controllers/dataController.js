const DataModel = require('../models/dataModel');
const CampanhasDataModel = require('../models/campanhasDataModel');
const N8NDataModel = require('../models/n8nDataModelSimples'); // Versão simplificada
const moment = require('moment');
const XLSX = require('xlsx');
const DateFormatter = require('../utils/dateFormatter');

class DataController {
  
  // Detect which data model to use based on available tables
  static async detectDataModel() {
    try {
      // First priority: Check for N8N data
      const hasN8NData = await N8NDataModel.hasData();
      if (hasN8NData) {
        console.log('[detectDataModel] Using N8NDataModel - N8N data detected');
        return N8NDataModel;
      }

      // Second priority: Try campaigns structure
      try {
        const campanhasTest = await CampanhasDataModel.getCompanies();
        console.log('[detectDataModel] Using CampanhasDataModel - campaign structure detected');
        return CampanhasDataModel;
      } catch (error) {
        console.log('[detectDataModel] Falling back to DataModel - legacy structure');
        return DataModel;
      }
    } catch (error) {
      console.log('[detectDataModel] Error detecting model, using legacy:', error.message);
      return DataModel;
    }
  }
  
  // Get list of companies
  static async getCompanies(req, res) {
    try {
      // Detect which model to use
      const ModelToUse = await DataController.detectDataModel();
      
      // Obter todas as empresas
      const todasEmpresas = await ModelToUse.getCompanies();
      
      // Verificar se o usuário é admin ou tem permissões específicas
      let empresasUsuario;
      
      if (req.session?.user?.role === 'Admin') {
        // Admin pode ver todas as empresas
        console.log('[getCompanies] Usuário é admin, mostrando todas as empresas');
        empresasUsuario = todasEmpresas;
      } else if (req.session?.user?.empresa) {
        // Usuário regular pode ver apenas as empresas às quais tem acesso
        const empresasPermitidas = Array.isArray(req.session.user.empresa) 
          ? req.session.user.empresa 
          : [req.session.user.empresa];
        
        console.log(`[getCompanies] Usuário ${req.session.user.email} tem acesso a: ${JSON.stringify(empresasPermitidas)}`);
        
        // Filtrar a lista completa de empresas para incluir apenas as permitidas
        empresasUsuario = todasEmpresas.filter(empresa => 
          empresasPermitidas.includes(empresa.empresa || empresa.name)
        );
        
        console.log(`[getCompanies] Empresas filtradas: ${empresasUsuario.map(c => c.empresa || c.name).join(', ')}`);
      } else {
        // Se o usuário não tiver permissões, retornar uma lista vazia
        console.log('[getCompanies] Usuário não tem permissões de empresa');
        empresasUsuario = [];
      }
      
      return res.status(200).json(empresasUsuario);
    } catch (erro) {
      console.error('Erro no controller getCompanies:', erro);
      return res.status(500).json({ erro: 'Falha ao buscar empresas' });
    }
  }

  // Get metrics based on date range and optional company filter
  static async getMetrics(req, res) {
    try {
      const { startDate, endDate, company } = req.query;
      
      // Log user and request info for debugging
      console.log(`[getMetrics] Request from user: ${req.session?.user?.email || 'unknown'}`);
      console.log(`[getMetrics] Date range: ${startDate} to ${endDate}`);
      console.log(`[getMetrics] Company filter: ${company || 'All companies'}`);
      console.log(`[getMetrics] User role: ${req.session?.user?.role || 'unknown'}`);
      
      // Validate required params
      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'startDate and endDate are required' });
      }

      // Validate date format usando o DateFormatter
      if (!DateFormatter.isValidDate(startDate) || !DateFormatter.isValidDate(endDate)) {
        return res.status(400).json({ error: 'Date format must be DD/MM/YYYY' });
      }

      // Determine which companies to include in the query
      let companiesToInclude;
      
      // If a specific company is selected in the filter
      if (company) {
        // Verify user has access to this specific company (skip for admin)
        if (req.session?.user?.role !== 'Admin') {
          const userCompanies = Array.isArray(req.session?.user?.empresa)
            ? req.session.user.empresa
            : [req.session?.user?.empresa];
            
          if (!userCompanies.includes(company)) {
            console.log(`[getMetrics] Access denied: User ${req.session?.user?.email} tried to access company ${company}`);
            return res.status(403).json({ 
              error: 'Você não tem acesso a esta empresa',
              requestedCompany: company,
              allowedCompanies: userCompanies
            });
          }
        }
        companiesToInclude = [company]; // Filtrar apenas a empresa selecionada
        console.log(`[getMetrics] Aplicando filtro para empresa específica: ${company}`);
      } 
      // Se "Todas as Empresas" for selecionado, precisamos limitar às empresas que o usuário tem acesso
      else if (req.session?.user?.role !== 'Admin') {
        // Usuário regular deve ver apenas empresas permitidas
        companiesToInclude = Array.isArray(req.session?.user?.empresa)
          ? req.session.user.empresa
          : [req.session?.user?.empresa];
        
        console.log(`[getMetrics] Filtro "Todas as Empresas": Limitando aos dados das empresas: ${JSON.stringify(companiesToInclude)}`);
      }
      // Admin sem filtro específico verá todas as empresas (companiesToInclude permanece undefined)
      else {
        console.log(`[getMetrics] Admin sem filtro específico: Mostrando todas as empresas`);
        companiesToInclude = null;
      }

      // Detect which model to use and call appropriate method
      const ModelToUse = await DataController.detectDataModel();
      console.log(`[getMetrics] Using ${ModelToUse.name} with companies: ${companiesToInclude ? JSON.stringify(companiesToInclude) : 'All (admin)'}`);
      
      const metrics = await ModelToUse.getDailyMetrics(startDate, endDate, company, companiesToInclude);
      console.log(`[getMetrics] Returned ${metrics.length} daily metrics`);
      return res.status(200).json(metrics);
    } catch (error) {
      console.error('Error in getMetrics controller:', error);
      return res.status(500).json({ error: 'Failed to fetch metrics' });
    }
  }

  // Get default date range (primeiro dia do mês atual ou range real dos dados)
  static async getDefaultDateRange() {
    try {
      // Detectar qual modelo usar
      const ModelToUse = await DataController.detectDataModel();
      
      // Se estiver usando N8NDataModel, buscar range real dos dados
      if (ModelToUse === N8NDataModel && typeof N8NDataModel.getDateRange === 'function') {
        console.log('[getDefaultDateRange] Buscando range real dos dados N8N...');
        const dateRange = await N8NDataModel.getDateRange();
        
        if (dateRange.hasData) {
          console.log(`[getDefaultDateRange] Range real encontrado: ${dateRange.startDate} até ${dateRange.endDate}`);
          return dateRange;
        } else {
          console.log('[getDefaultDateRange] Nenhum dado N8N encontrado, usando range padrão');
        }
      }
      
      // Range padrão expandido para incluir dados históricos (último ano completo)
      const now = moment();
      const firstDayLastYear = moment().subtract(1, 'year').startOf('year'); // 01/01/2024
      
      console.log(`[getDefaultDateRange] Usando range expandido: ${firstDayLastYear.format('DD/MM/YYYY')} até ${now.format('DD/MM/YYYY')}`);
      
      return {
        startDate: firstDayLastYear.format('DD/MM/YYYY'),
        endDate: now.format('DD/MM/YYYY'),
        hasData: false
      };
      
    } catch (error) {
      console.error('[getDefaultDateRange] Erro ao buscar range de datas:', error);
      
      // Em caso de erro, retornar range expandido
      const now = moment();
      const firstDayLastYear = moment().subtract(1, 'year').startOf('year');
      
      return {
        startDate: firstDayLastYear.format('DD/MM/YYYY'),
        endDate: now.format('DD/MM/YYYY'),
        hasData: false,
        error: error.message
      };
    }
  }

  // Export metrics data to Excel
  static async exportToExcel(req, res) {
    try {
      const { startDate, endDate, company } = req.query;
      
      // Log user and request info for debugging
      console.log(`[exportToExcel] Request from user: ${req.session?.user?.email || 'unknown'}`);
      console.log(`[exportToExcel] Date range: ${startDate} to ${endDate}`);
      console.log(`[exportToExcel] Company filter: ${company || 'All companies'}`);
      
      // Validate required params
      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'startDate and endDate are required' });
      }

      // Determine which companies to include
      let companiesToInclude;
      
      // If a specific company is selected in the filter
      if (company) {
        // Verify user has access to this specific company (skip for admin)
        if (req.session?.user?.role !== 'Admin') {
          const userCompanies = Array.isArray(req.session?.user?.empresa)
            ? req.session.user.empresa
            : [req.session?.user?.empresa];
            
          if (!userCompanies.includes(company)) {
            return res.status(403).json({ 
              error: 'Você não tem acesso a esta empresa',
              requestedCompany: company,
              allowedCompanies: userCompanies
            });
          }
        }
        companiesToInclude = [company]; // Filtrar apenas a empresa selecionada
      } 
      // Se "Todas as Empresas" for selecionado, precisamos limitar às empresas que o usuário tem acesso
      else if (req.session?.user?.role !== 'Admin') {
        // Usuário regular deve ver apenas empresas permitidas
        companiesToInclude = Array.isArray(req.session?.user?.empresa)
          ? req.session.user.empresa
          : [req.session?.user?.empresa];
      }
      // Admin sem filtro específico verá todas as empresas
      else {
        companiesToInclude = null;
      }

      // Get metrics data with proper filtering
      const metrics = await DataModel.getDailyMetrics(startDate, endDate, company, companiesToInclude);
      
      // Format data for Excel
      const excelData = metrics.map(metric => ({
        'Data': metric.formattedDate,
        'Total de Registros': metric.totalRecords,
        'Custo Rooster': metric.roosterCost.toFixed(2),
        'Gasto': metric.expense.toFixed(2),
        'CPL Meta': metric.cplTarget.toFixed(2),
        'CPL Total': metric.totalCPL.toFixed(2)
      }));
      
      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Métricas');
      
      // Create Excel file buffer
      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      // Set response headers for Excel download
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=metricas_${moment().format('YYYY-MM-DD')}.xlsx`);
      
      return res.send(excelBuffer);
    } catch (error) {
      console.error('Error in exportToExcel controller:', error);
      return res.status(500).json({ error: 'Failed to export data' });
    }
  }

  // Get metrics grouped by company based on date range
  static async getCompanyMetrics(req, res) {
    try {
      const { startDate, endDate, company } = req.query;
      
      // Enhanced debugging
      console.log('\n🎯 ============ GET COMPANY METRICS CALLED ============');
      console.log(`[getCompanyMetrics] Request from user: ${req.session?.user?.email || 'unknown'}`);
      console.log(`[getCompanyMetrics] Date range: ${startDate} to ${endDate}`);
      console.log(`[getCompanyMetrics] Company filter: ${company || 'All companies'}`);
      console.log(`[getCompanyMetrics] User role: ${req.session?.user?.role || 'unknown'}`);
      console.log(`[getCompanyMetrics] User empresas: ${req.session?.user?.empresa ? JSON.stringify(req.session.user.empresa) : 'unknown'}`);
      console.log(`[getCompanyMetrics] Session data:`, JSON.stringify(req.session?.user || {}, null, 2));
      console.log(`[getCompanyMetrics] Query params:`, req.query);
      
      // Validate required params
      if (!startDate || !endDate) {
        console.log(`[getCompanyMetrics] ❌ Missing required params: startDate=${startDate}, endDate=${endDate}`);
        return res.status(400).json({ error: 'startDate and endDate are required' });
      }

      // Validate date format
      if (!moment(startDate, 'DD/MM/YYYY', true).isValid() || 
          !moment(endDate, 'DD/MM/YYYY', true).isValid()) {
        return res.status(400).json({ error: 'Date format must be DD/MM/YYYY' });
      }

      // Determine which companies to include in the query
      let companiesToInclude;
      
      // If a specific company is selected in the filter
      if (company) {
        console.log(`[getCompanyMetrics] 🔍 Specific company filter detected: "${company}"`);
        // Verify user has access to this specific company (skip for admin)
        if (req.session?.user?.role !== 'Admin') {
          const userCompanies = Array.isArray(req.session?.user?.empresa)
            ? req.session.user.empresa
            : [req.session?.user?.empresa];
            
          console.log(`[getCompanyMetrics] 🔍 User companies: ${JSON.stringify(userCompanies)}`);
          console.log(`[getCompanyMetrics] 🔍 Checking if user has access to: "${company}"`);
          
          if (!userCompanies.includes(company)) {
            console.log(`[getCompanyMetrics] ❌ Access denied: User ${req.session?.user?.email} tried to access company ${company}`);
            return res.status(403).json({ 
              error: 'Você não tem acesso a esta empresa',
              requestedCompany: company,
              allowedCompanies: userCompanies
            });
          }
        }
        companiesToInclude = [company]; // Filtrar apenas a empresa selecionada
        console.log(`[getCompanyMetrics] ✅ Aplicando filtro para empresa específica: ${company}`);
      } 
      // Se "Todas as Empresas" for selecionado, precisamos limitar às empresas que o usuário tem acesso
      else if (req.session?.user?.role !== 'Admin') {
        console.log(`[getCompanyMetrics] 🔍 Non-admin user requesting all companies`);
        // Usuário regular deve ver apenas empresas permitidas
        companiesToInclude = Array.isArray(req.session?.user?.empresa)
          ? req.session.user.empresa
          : [req.session?.user?.empresa];
        
        console.log(`[getCompanyMetrics] 🔍 Filtro "Todas as Empresas": Limitando aos dados das empresas: ${JSON.stringify(companiesToInclude)}`);
      }
      // Admin sem filtro específico verá todas as empresas
      else {
        console.log(`[getCompanyMetrics] 🔍 Admin requesting all companies - no filtering applied`);
        companiesToInclude = null;
      }

      console.log(`[getCompanyMetrics] 📋 Final companiesToInclude: ${companiesToInclude ? JSON.stringify(companiesToInclude) : 'null (all companies)'}`);

      // Detect which model to use and get company metrics
      const ModelToUse = await DataController.detectDataModel();
      console.log(`[getCompanyMetrics] 🎯 Using model: ${ModelToUse.name}`);
      console.log(`[getCompanyMetrics] 🎯 Calling getCompanyMetrics with params:`, {
        startDate,
        endDate,
        company,
        companiesToInclude
      });
      
      const allMetrics = await ModelToUse.getCompanyMetrics(startDate, endDate, company, companiesToInclude);
      console.log(`[getCompanyMetrics] 📊 Model returned ${allMetrics.length} registros`);
      
      if (allMetrics.length > 0) {
        console.log(`[getCompanyMetrics] 📊 Sample results:`);
        allMetrics.slice(0, 3).forEach((item, index) => {
          console.log(`   ${index + 1}. Company: ${item.company || item.empresa}, Expense: ${item.expense}, Clicks: ${item.cliques || item.clicks}`);
        });
      } else {
        console.log(`[getCompanyMetrics] ❌ No results returned from model`);
      }
      
      console.log(`[getCompanyMetrics] ✅ Retornando ${allMetrics.length} registros para o frontend`);
      console.log(`[getCompanyMetrics] 🔍 JSON sendo enviado:`, JSON.stringify(allMetrics, null, 2));
      
      // Adicionar debug sobre a resposta final
      const jsonResponse = JSON.stringify(allMetrics);
      console.log(`[getCompanyMetrics] 📤 Response status: 200`);
      console.log(`[getCompanyMetrics] 📤 Response:`, allMetrics);
      console.log(`[getCompanyMetrics] 📤 Response JSON length: ${jsonResponse.length} caracteres`);
      
      return res.status(200).json(allMetrics);
    } catch (error) {
      console.error('Error in getCompanyMetrics controller:', error);
      return res.status(500).json({ error: 'Failed to fetch company metrics' });
    }
  }

  // Export company metrics data to Excel
  static async exportCompanyMetricsToExcel(req, res) {
    try {
      const { startDate, endDate, company } = req.query;
      
      // Log user and request info for debugging
      console.log(`[exportCompanyMetricsToExcel] Request from user: ${req.session?.user?.email || 'unknown'}`);
      console.log(`[exportCompanyMetricsToExcel] Date range: ${startDate} to ${endDate}`);
      console.log(`[exportCompanyMetricsToExcel] Company filter: ${company || 'All companies'}`);
      
      // Validate required params
      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'startDate and endDate are required' });
      }

      // Determine which companies to include
      let companiesToInclude;
      
      // If a specific company is selected in the filter
      if (company) {
        // Verify user has access to this specific company (skip for admin)
        if (req.session?.user?.role !== 'Admin') {
          const userCompanies = Array.isArray(req.session?.user?.empresa)
            ? req.session.user.empresa
            : [req.session?.user?.empresa];
            
          if (!userCompanies.includes(company)) {
            return res.status(403).json({ 
              error: 'Você não tem acesso a esta empresa',
              requestedCompany: company,
              allowedCompanies: userCompanies
            });
          }
        }
        companiesToInclude = [company]; // Filtrar apenas a empresa selecionada
      } 
      // Se "Todas as Empresas" for selecionado, precisamos limitar às empresas que o usuário tem acesso
      else if (req.session?.user?.role !== 'Admin') {
        // Usuário regular deve ver apenas empresas permitidas
        companiesToInclude = Array.isArray(req.session?.user?.empresa)
          ? req.session.user.empresa
          : [req.session?.user?.empresa];
      }
      // Admin sem filtro específico verá todas as empresas
      else {
        companiesToInclude = null;
      }

      // Get metrics data with proper filtering
      const metrics = await DataModel.getCompanyMetrics(startDate, endDate, company, companiesToInclude);
      
      // Format data for Excel
      const excelData = metrics.map(metric => ({
        'Empresa': metric.company,
        'Total de Registros': metric.totalRecords,
        'Custo Rooster': metric.roosterCost.toFixed(2),
        'Gasto': metric.expense.toFixed(2),
        'CPL Meta': metric.cplTarget.toFixed(2),
        'CPL Total': metric.totalCPL.toFixed(2)
      }));
      
      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Métricas por Empresa');
      
      // Create Excel file buffer
      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      // Set response headers for Excel download
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=metricas_empresas_${moment().format('YYYY-MM-DD')}.xlsx`);
      
      return res.send(excelBuffer);
    } catch (error) {
      console.error('Error in exportCompanyMetricsToExcel controller:', error);
      return res.status(500).json({ error: 'Failed to export data' });
    }
  }
}

module.exports = DataController;
