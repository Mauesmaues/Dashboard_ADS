const { supabase } = require('../config/supabase');
const DateFormatter = require('../utils/dateFormatter');

class DataModel {
  // Get list of all companies
  static async getCompanies() {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('empresa')
        .order('empresa');
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting companies:', error);
      throw error;
    }
  }

  // Get bills data (leads/conversões) for date range and optional company filter
  static async getBillsData(startDate, endDate, company = null) {
    try {
      // Convert dates to UTC for database query
      const utcStartDate = DateFormatter.toUTC(startDate);
      const utcEndDate = DateFormatter.toUTC(endDate, true); // End of day
      
      console.log(`[getBillsData] Querying bills from ${utcStartDate} to ${utcEndDate}${company ? ` for company: ${company}` : ''}`);
      
      let query = supabase
        .from('bills')
        .select('*')
        .gte('created_at', utcStartDate)
        .lte('created_at', utcEndDate);
      
      if (company) {
        query = query.eq('empresa', company);
      }
      
      const { data, error } = await query.order('created_at');
      
      if (error) throw error;
      
      console.log(`[getBillsData] Found ${data.length} bills records`);
      return data;
    } catch (error) {
      console.error('Error getting bills data:', error);
      throw error;
    }
  }

  // Get cost data for date range and optional company filter
  static async getCostData(startDate, endDate, company = null) {
    try {
      // Convert dates to database format (YYYY-MM-DD)  
      const dbStartDate = DateFormatter.toBrazilianDate(startDate, 'YYYY-MM-DD');
      const dbEndDate = DateFormatter.toBrazilianDate(endDate, 'YYYY-MM-DD');
      
      console.log(`[getCostData] Querying costs from ${dbStartDate} to ${dbEndDate}${company ? ` for company: ${company}` : ''}`);
      
      let query = supabase
        .from('custoDiaMeta')
        .select('*')
        .gte('dia', dbStartDate)
        .lte('dia', dbEndDate);
      
      if (company) {
        query = query.eq('empresa', company);
      }
      
      const { data, error } = await query.order('dia');
      
      if (error) throw error;
      
      console.log(`[getCostData] Found ${data.length} cost records`);
      return data;
    } catch (error) {
      console.error('Error getting cost data:', error);
      throw error;
    }
  }

  // Get daily metrics for date range
  static async getDailyMetrics(startDate, endDate, company = null, allowedCompanies = null) {
    try {
      console.log(`[getDailyMetrics] Getting metrics from ${startDate} to ${endDate}, company: ${company || 'all'}, allowed: ${allowedCompanies ? JSON.stringify(allowedCompanies) : 'all'}`);
      
      const billsData = await this.getBillsData(startDate, endDate, company);
      const costData = await this.getCostData(startDate, endDate, company);
      
      // Filter data if we have allowed companies but no specific company filter
      let filteredBillsData = billsData;
      let filteredCostData = costData;
      
      if (!company && allowedCompanies && allowedCompanies.length > 0) {
        console.log(`[getDailyMetrics] Filtering data to include only allowed companies: ${JSON.stringify(allowedCompanies)}`);
        
        filteredBillsData = billsData.filter(bill => 
          allowedCompanies.includes(bill.empresa)
        );
        
        filteredCostData = costData.filter(cost => 
          allowedCompanies.includes(cost.empresa)
        );
        
        console.log(`[getDailyMetrics] Before filter: ${billsData.length} bills, ${costData.length} costs`);
        console.log(`[getDailyMetrics] After permission filter: ${filteredBillsData.length} bills, ${filteredCostData.length} costs`);
      }
      
      // Group data by date
      const metricsByDate = {};
      
      // Process bills data
      filteredBillsData.forEach(bill => {
        const brazilianDate = DateFormatter.toBrazilianDate(bill.created_at);
        
        if (!metricsByDate[brazilianDate]) {
          metricsByDate[brazilianDate] = {
            date: brazilianDate,
            formattedDate: brazilianDate,
            totalRecords: 0,
            roosterCost: 0,
            expense: 0,
            cplTarget: 0,
            totalCPL: 0
          };
        }
        
        // Count as record only if price is not 0
        if (bill.price && bill.price !== 0) {
          metricsByDate[brazilianDate].totalRecords += 1;
          metricsByDate[brazilianDate].roosterCost += parseFloat(bill.price) || 0;
        }
      });
      
      // Process cost data
      filteredCostData.forEach(cost => {
        const costDate = DateFormatter.toBrazilianDate(cost.dia);
        
        if (!metricsByDate[costDate]) {
          metricsByDate[costDate] = {
            date: costDate,
            formattedDate: costDate,
            totalRecords: 0,
            roosterCost: 0,
            expense: 0,
            cplTarget: 0,
            totalCPL: 0
          };
        }
        
        // Handle different cost value types (string or number)
        let costValue = 0;
        if (cost.custo !== null && cost.custo !== undefined) {
          if (typeof cost.custo === 'number') {
            costValue = cost.custo;
          } else {
            try {
              const cleanedValue = String(cost.custo).replace(/[^\d.-]/g, '');
              costValue = parseFloat(cleanedValue) || 0;
            } catch (e) {
              console.warn(`Error parsing cost value: ${cost.custo}`, e);
              costValue = 0;
            }
          }
        }
        
        metricsByDate[costDate].expense += costValue;
      });
      
      // Calculate CPL metrics
      Object.keys(metricsByDate).forEach(date => {
        const metrics = metricsByDate[date];
        
        // Ensure values are numbers
        metrics.totalRecords = parseInt(metrics.totalRecords) || 0;
        metrics.expense = parseFloat(metrics.expense) || 0;
        metrics.roosterCost = parseFloat(metrics.roosterCost) || 0;
        
        // Calculate CPL Target (expense / total records)
        metrics.cplTarget = metrics.totalRecords > 0 && metrics.expense > 0 
          ? metrics.expense / metrics.totalRecords 
          : 0;
        
        // Calculate Total CPL ((expense + rooster cost) / total records)
        const totalCost = metrics.expense + metrics.roosterCost;
        metrics.totalCPL = metrics.totalRecords > 0 && totalCost > 0 
          ? totalCost / metrics.totalRecords 
          : 0;
      });
      
      // Convert to array and sort by date
      const result = Object.values(metricsByDate).sort((a, b) => 
        new Date(DateFormatter.parseDate(a.date)) - new Date(DateFormatter.parseDate(b.date))
      );
      
      console.log(`[getDailyMetrics] Returning ${result.length} daily metrics`);
      return result;
    } catch (error) {
      console.error('Error getting daily metrics:', error);
      throw error;
    }
  }

  // Get company metrics for date range  
  static async getCompanyMetrics(startDate, endDate, company = null, allowedCompanies = null) {
    try {
      console.log(`[getCompanyMetrics] Getting company metrics from ${startDate} to ${endDate}, company: ${company || 'all'}, allowed: ${allowedCompanies ? JSON.stringify(allowedCompanies) : 'all'}`);
      
      const billsDataCompany = await this.getBillsData(startDate, endDate, company);
      const costDataCompany = await this.getCostData(startDate, endDate, company);
      
      // Filter data if we have allowed companies but no specific company filter
      let filteredBillsData = billsDataCompany;
      let filteredCostData = costDataCompany;
      
      if (!company && allowedCompanies && allowedCompanies.length > 0) {
        console.log(`[getCompanyMetrics] Filtering data to include only allowed companies: ${JSON.stringify(allowedCompanies)}`);
        
        filteredBillsData = billsDataCompany.filter(bill => 
          allowedCompanies.includes(bill.empresa)
        );
        
        filteredCostData = costDataCompany.filter(cost => 
          allowedCompanies.includes(cost.empresa)
        );
        
        console.log(`[getCompanyMetrics] Before filter: ${billsDataCompany.length} bills, ${costDataCompany.length} costs`);
        console.log(`[getCompanyMetrics] After permission filter: ${filteredBillsData.length} bills, ${filteredCostData.length} costs`);
      }
      
      console.log(`[getCompanyMetrics] Processing ${filteredBillsData.length} bills and ${filteredCostData.length} cost records`);
      
      // Process and organize data by company
      const metricsByCompany = {};
      
      // Process bills data
      filteredBillsData.forEach(bill => {
        const companyName = bill.empresa || 'Sem Empresa';
        
        if (!metricsByCompany[companyName]) {
          metricsByCompany[companyName] = {
            company: companyName,
            totalRecords: 0,
            roosterCost: 0,
            expense: 0,
            cplTarget: 0,
            totalCPL: 0
          };
        }
        
        // Count as record only if price is not 0
        if (bill.price && bill.price !== 0) {
          metricsByCompany[companyName].totalRecords += 1;
          metricsByCompany[companyName].roosterCost += parseFloat(bill.price) || 0;
        }
      });
      
      // Process cost data
      filteredCostData.forEach(cost => {
        const companyName = cost.empresa || 'Sem Empresa';
        
        if (!metricsByCompany[companyName]) {
          metricsByCompany[companyName] = {
            company: companyName,
            totalRecords: 0,
            roosterCost: 0,
            expense: 0,
            cplTarget: 0,
            totalCPL: 0
          };
        }
        
        // Handle different cost value types (string or number)
        let costValue = 0;
        if (cost.custo !== null && cost.custo !== undefined) {
          if (typeof cost.custo === 'number') {
            costValue = cost.custo;
          } else {
            try {
              const cleanedValue = String(cost.custo).replace(/[^\d.-]/g, '');
              costValue = parseFloat(cleanedValue) || 0;
            } catch (e) {
              console.warn(`Error parsing cost value: ${cost.custo}`, e);
              costValue = 0;
            }
          }
        }
        
        metricsByCompany[companyName].expense += costValue;
        console.log(`[getCompanyMetrics] Adding cost ${costValue} for company ${companyName}, New total: ${metricsByCompany[companyName].expense}`);
      });
      
      // Calculate CPL metrics
      Object.keys(metricsByCompany).forEach(companyKey => {
        const metrics = metricsByCompany[companyKey];
        
        // Ensure values are numbers
        metrics.totalRecords = parseInt(metrics.totalRecords) || 0;
        metrics.expense = parseFloat(metrics.expense) || 0;
        metrics.roosterCost = parseFloat(metrics.roosterCost) || 0;
        
        // Calculate CPL Target (expense / total records)
        metrics.cplTarget = metrics.totalRecords > 0 && metrics.expense > 0 
          ? metrics.expense / metrics.totalRecords 
          : 0;
        
        // Calculate Total CPL ((expense + rooster cost) / total records)
        const totalCost = metrics.expense + metrics.roosterCost;
        metrics.totalCPL = metrics.totalRecords > 0 && totalCost > 0 
          ? totalCost / metrics.totalRecords 
          : 0;
      });
      
      // Convert to array and sort by company name
      const result = Object.values(metricsByCompany).sort((a, b) => 
        a.company.localeCompare(b.company)
      );
      
      console.log(`[getCompanyMetrics] Returning ${result.length} company metrics`);
      return result;
    } catch (error) {
      console.error('Error getting company metrics:', error);
      throw error;
    }
  }
}

module.exports = DataModel;
