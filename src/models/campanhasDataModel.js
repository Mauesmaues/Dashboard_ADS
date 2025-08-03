const { supabase } = require('../config/supabase');
const DateFormatter = require('../utils/dateFormatter');

class CampanhasDataModel {
  
  // Get list of companies from empresas table
  static async getCompanies() {
    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('nome as empresa')
        .eq('ativo', true)
        .order('nome');
      
      if (error) throw error;
      console.log(`[getCompanies] Found ${data.length} companies`);
      return data;
    } catch (error) {
      console.error('Error getting companies:', error);
      throw error;
    }
  }

  // Get daily metrics for frontend - baseado em dados reais de campanhas
  static async getDailyMetrics(startDate, endDate, company = null, allowedCompanies = null) {
    try {
      console.log(`[getDailyMetrics] Getting metrics from ${startDate} to ${endDate}, company: ${company || 'all'}, allowed: ${allowedCompanies ? JSON.stringify(allowedCompanies) : 'all'}`);
      
      // Convert dates to database format
      const dbStartDate = DateFormatter.toBrazilianDate(startDate, 'YYYY-MM-DD');
      const dbEndDate = DateFormatter.toBrazilianDate(endDate, 'YYYY-MM-DD');
      
      // Build base query
      let query = supabase
        .from('metricas_campanhas')
        .select(`
          date_start,
          spend,
          impressions,
          clicks,
          cpc,
          ctr,
          contas_ads!inner(
            empresas!inner(nome)
          )
        `)
        .gte('date_start', dbStartDate)
        .lte('date_start', dbEndDate)
        .eq('contas_ads.ativo', true)
        .eq('contas_ads.empresas.ativo', true);
      
      // Add company filter
      if (company) {
        query = query.eq('contas_ads.empresas.nome', company);
      } else if (allowedCompanies && allowedCompanies.length > 0) {
        query = query.in('contas_ads.empresas.nome', allowedCompanies);
      }
      
      const { data, error } = await query.order('date_start');
      
      if (error) {
        console.error('Query error:', error);
        throw error;
      }
      
      // Process and format data for frontend
      const processedData = this.processMetricsForFrontend(data || []);
      
      console.log(`[getDailyMetrics] Processed ${processedData.length} daily metrics`);
      return processedData;
      
    } catch (error) {
      console.error('Error getting daily metrics:', error);
      throw error;
    }
  }

  // Get company metrics for frontend 
  static async getCompanyMetrics(startDate, endDate, company = null, allowedCompanies = null) {
    try {
      console.log(`[getCompanyMetrics] Getting company metrics from ${startDate} to ${endDate}`);
      
      // Convert dates to database format
      const dbStartDate = DateFormatter.toBrazilianDate(startDate, 'YYYY-MM-DD');
      const dbEndDate = DateFormatter.toBrazilianDate(endDate, 'YYYY-MM-DD');
      
      // Build base query
      let query = supabase
        .from('metricas_campanhas')
        .select(`
          spend,
          impressions,
          clicks,
          cpc,
          ctr,
          contas_ads!inner(
            empresas!inner(nome)
          )
        `)
        .gte('date_start', dbStartDate)
        .lte('date_start', dbEndDate)
        .eq('contas_ads.ativo', true)
        .eq('contas_ads.empresas.ativo', true);
      
      // Add company filter
      if (company) {
        query = query.eq('contas_ads.empresas.nome', company);
      } else if (allowedCompanies && allowedCompanies.length > 0) {
        query = query.in('contas_ads.empresas.nome', allowedCompanies);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Query error:', error);
        throw error;
      }
      
      // Process data by company
      const companyMetrics = this.processCompanyMetrics(data || []);
      
      console.log(`[getCompanyMetrics] Found ${companyMetrics.length} company metrics`);
      return companyMetrics;
      
    } catch (error) {
      console.error('Error getting company metrics:', error);
      throw error;
    }
  }

  // Process metrics data to match frontend expectations
  static processMetricsForFrontend(rawData) {
    const groupedByDate = {};
    
    // Group by date and aggregate metrics
    rawData.forEach(row => {
      const dateKey = row.date_start;
      const formattedDate = DateFormatter.toBrazilianDate(dateKey, 'DD/MM/YYYY');
      const empresa = row.contas_ads?.empresas?.nome || 'Desconhecida';
      
      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = {
          date: dateKey,
          formattedDate: formattedDate,
          totalRecords: 0,
          roosterCost: 0,
          expense: 0,
          impressions: 0,
          clicks: 0,
          cpc: 0,
          ctr: 0,
          cplTarget: 0,
          totalCPL: 0
        };
      }
      
      const dayData = groupedByDate[dateKey];
      
      // Aggregate metrics for the day
      dayData.totalRecords += 1; // Count campaigns
      dayData.roosterCost += (parseFloat(row.clicks) || 0) * 0.1; // Simulated rooster cost
      dayData.expense += parseFloat(row.spend) || 0;
      dayData.impressions += parseInt(row.impressions) || 0;
      dayData.clicks += parseInt(row.clicks) || 0;
    });
    
    // Calculate aggregated CPCs and CTRs
    Object.values(groupedByDate).forEach(dayData => {
      if (dayData.clicks > 0) {
        dayData.cpc = dayData.expense / dayData.clicks;
        dayData.cplTarget = dayData.totalRecords > 0 ? dayData.expense / dayData.totalRecords : 0;
        dayData.totalCPL = dayData.totalRecords > 0 ? (dayData.expense + dayData.roosterCost) / dayData.totalRecords : 0;
      }
      
      if (dayData.impressions > 0) {
        dayData.ctr = (dayData.clicks / dayData.impressions) * 100;
      }
    });
    
    // Return sorted array
    return Object.values(groupedByDate).sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  // Process company metrics data
  static processCompanyMetrics(rawData) {
    const companyGroups = {};
    
    // Group by company
    rawData.forEach(row => {
      const empresa = row.contas_ads?.empresas?.nome || 'Desconhecida';
      
      if (!companyGroups[empresa]) {
        companyGroups[empresa] = {
          company: empresa,
          totalRecords: 0,
          roosterCost: 0,
          expense: 0,
          impressions: 0,
          clicks: 0,
          cplTarget: 0,
          totalCPL: 0
        };
      }
      
      const companyData = companyGroups[empresa];
      
      // Aggregate metrics for the company
      companyData.totalRecords += 1;
      companyData.roosterCost += (parseFloat(row.clicks) || 0) * 0.1;
      companyData.expense += parseFloat(row.spend) || 0;
      companyData.impressions += parseInt(row.impressions) || 0;
      companyData.clicks += parseInt(row.clicks) || 0;
    });
    
    // Calculate final metrics for each company
    Object.values(companyGroups).forEach(companyData => {
      if (companyData.totalRecords > 0) {
        companyData.cplTarget = companyData.expense / companyData.totalRecords;
        companyData.totalCPL = (companyData.expense + companyData.roosterCost) / companyData.totalRecords;
      }
    });
    
    // Return sorted array
    return Object.values(companyGroups).sort((a, b) => a.company.localeCompare(b.company));
  }

  // Get data for Excel export
  static async getExportData(startDate, endDate, company = null, allowedCompanies = null) {
    try {
      const dailyMetrics = await this.getDailyMetrics(startDate, endDate, company, allowedCompanies);
      
      // Format for Excel export
      return dailyMetrics.map(metric => ({
        'Data': metric.formattedDate,
        'Total de Registros': metric.totalRecords,
        'Custo Rooster': metric.roosterCost.toFixed(2),
        'Gasto': metric.expense.toFixed(2),
        'Impressões': metric.impressions,
        'Cliques': metric.clicks,
        'CPC': metric.cpc.toFixed(4),
        'CTR': metric.ctr.toFixed(2),
        'CPL Meta': metric.cplTarget.toFixed(2),
        'CPL Total': metric.totalCPL.toFixed(2)
      }));
      
    } catch (error) {
      console.error('Error getting export data:', error);
      throw error;
    }
  }

  // Get company export data
  static async getCompanyExportData(startDate, endDate, company = null, allowedCompanies = null) {
    try {
      const companyMetrics = await this.getCompanyMetrics(startDate, endDate, company, allowedCompanies);
      
      // Format for Excel export
      return companyMetrics.map(metric => ({
        'Empresa': metric.company,
        'Total de Registros': metric.total_registros,
        'Custo Rooster': metric.roosterCost.toFixed(2),
        'Gasto': metric.expense.toFixed(2),
        'CPL Meta': metric.cplTarget.toFixed(2),
        'CPL Total': metric.totalCPL.toFixed(2)
      }));
      
    } catch (error) {
      console.error('Error getting company export data:', error);
      throw error;
    }
  }
}

module.exports = CampanhasDataModel;
