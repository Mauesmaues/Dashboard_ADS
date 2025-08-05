const EmpresaAdAccountModel = require('../models/empresaAdAccountModel');
const { supabase } = require('../config/supabase');

class CompanyController {
  // Get all companies (admin only)
  static async getAllCompanies(req, res) {
    console.log('\n📋 ============ GET ALL COMPANIES CALLED ============');
    
    try {
      // Check if user is admin
      if (!req.session || !req.session.user || req.session.user.role !== 'Admin') {
        console.log('❌ ACESSO NEGADO - Usuário não é admin');
        return res.status(403).json({ error: 'Acesso restrito' });
      }
      
      console.log('✅ ACESSO PERMITIDO - Usuário é admin');
      
      const companies = await EmpresaAdAccountModel.getAllMappings();
      
      console.log('📊 Companies returned from model:', companies.length, 'companies');
      console.log('📊 Sample company data with saldo:', companies.map(c => ({
        empresa: c.empresa,
        ad_account_id: c.ad_account_id,
        saldo: c.saldo,
        saldo_updated_at: c.saldo_updated_at
      })));
      
      return res.status(200).json(companies);
    } catch (error) {
      console.error('❌ Get all companies controller error:', error);
      return res.status(500).json({ error: 'Erro ao buscar empresas' });
    }
  }

  // Create new company (admin only)
  static async createCompany(req, res) {
    console.log('\n🏢 ============ CREATE COMPANY CALLED ============');
    console.log('📋 Request body:', JSON.stringify(req.body, null, 2));
    
    try {
      // Check if user is admin
      if (!req.session || !req.session.user || req.session.user.role !== 'Admin') {
        console.log('❌ ACESSO NEGADO - Usuário não é admin');
        return res.status(403).json({ error: 'Acesso restrito' });
      }
      
      const { nome, ad_account_id, descricao, created_at } = req.body;
      
      console.log('📝 Extracted fields:');
      console.log('   - nome:', nome);
      console.log('   - ad_account_id:', ad_account_id);
      console.log('   - descricao:', descricao);
      console.log('   - created_at:', created_at);

      // Validate required fields
      if (!nome || !ad_account_id) {
        return res.status(400).json({ error: 'Nome e Ad Account ID são obrigatórios' });
      }

      // Validate ad_account_id format (should be only numbers)
      if (!/^\d+$/.test(ad_account_id)) {
        return res.status(400).json({ error: 'Ad Account ID deve conter apenas números' });
      }

      // Check if there are campaigns with this ad_account_id in campanhas_n8n
      console.log('🔍 Verificando campanhas existentes para ad_account_id:', ad_account_id);
      const { data: campaigns, error: campaignError } = await supabase
        .from('campanhas_n8n')
        .select('campaign_name, spend, impressions, clicks')
        .eq('ad_account_id', ad_account_id)
        .limit(5);

      if (campaignError) {
        console.log('⚠️ Erro ao verificar campanhas:', campaignError);
      } else {
        console.log(`📊 Encontradas ${campaigns?.length || 0} campanhas para este ad_account_id`);
        if (campaigns && campaigns.length > 0) {
          console.log('🎯 Campanhas vinculadas:');
          campaigns.forEach((campaign, index) => {
            console.log(`   ${index + 1}. ${campaign.campaign_name} - Spend: ${campaign.spend}`);
          });
        }
      }

      // Create mapping in empresa_ad_accounts table
      const newCompany = await EmpresaAdAccountModel.createMapping(nome, ad_account_id, created_at);
      
      console.log('✅ Company mapping created successfully:', newCompany);
      
      // Add campaign count to response
      const response = {
        ...newCompany,
        campaign_count: campaigns?.length || 0,
        campaigns_found: campaigns?.length > 0
      };
      
      return res.status(201).json(response);
    } catch (error) {
      console.error('Create company controller error:', error);
      return res.status(500).json({ error: `Erro ao criar empresa: ${error.message}` });
    }
  }

  // Update existing company (admin only)
  static async updateCompany(req, res) {
    try {
      // Check if user is admin
      if (!req.session || !req.session.user || req.session.user.role !== 'Admin') {
        return res.status(403).json({ error: 'Acesso restrito' });
      }
      
      const { id } = req.params;
      const { nome, ad_account_id, descricao } = req.body;
      
      console.log('Updating company:', id, 'with data:', req.body);

      // Validate required fields
      if (!nome || !ad_account_id) {
        return res.status(400).json({ error: 'Nome e Ad Account ID são obrigatórios' });
      }

      // Validate ad_account_id format (should be only numbers)
      if (!/^\d+$/.test(ad_account_id)) {
        return res.status(400).json({ error: 'Ad Account ID deve conter apenas números' });
      }

      // Get current mapping
      const allMappings = await EmpresaAdAccountModel.getAllMappings();
      const currentMapping = allMappings.find(m => m.id == id);
      
      if (!currentMapping) {
        return res.status(404).json({ error: 'Empresa não encontrada' });
      }

      // Delete old mapping and create new one
      await EmpresaAdAccountModel.deleteMapping(currentMapping.empresa, currentMapping.ad_account_id);
      const updatedCompany = await EmpresaAdAccountModel.createMapping(nome, ad_account_id);
      
      return res.status(200).json(updatedCompany);
    } catch (error) {
      console.error('Update company controller error:', error);
      return res.status(500).json({ error: `Erro ao atualizar empresa: ${error.message}` });
    }
  }

  // Delete a company (admin only)
  static async deleteCompany(req, res) {
    console.log('\n🗑️ ============ DELETE COMPANY CALLED ============');
    console.log('📋 Request params:', JSON.stringify(req.params, null, 2));
    console.log('📋 Request URL:', req.url);
    console.log('📋 Request path:', req.path);
    
    try {
      // Check if user is admin
      if (!req.session || !req.session.user || req.session.user.role !== 'Admin') {
        console.log('❌ ACESSO NEGADO - Usuário não é admin');
        return res.status(403).json({ error: 'Acesso restrito' });
      }
      
      const { id } = req.params;
      
      console.log('🗑️ Deleting company with ID:', id, '(type:', typeof id, ')');

      if (!id || id === 'undefined') {
        console.log('❌ ID inválido recebido:', id);
        return res.status(400).json({ error: 'ID da empresa é obrigatório' });
      }

      // Get the mapping before deletion to get the ad_account_id
      const allMappings = await EmpresaAdAccountModel.getAllMappings();
      console.log('📊 Total mappings found:', allMappings.length);
      console.log('📊 Looking for mapping with ID:', id);
      
      const mapping = allMappings.find(m => m.id == id);
      
      if (!mapping) {
        console.log('❌ Empresa não encontrada com ID:', id);
        console.log('📊 Available IDs:', allMappings.map(m => m.id));
        return res.status(404).json({ error: 'Empresa não encontrada' });
      }
      
      console.log('✅ Found company to delete:', {
        empresa: mapping.empresa,
        ad_account_id: mapping.ad_account_id
      });
      
      // Delete using ad_account_id directly
      console.log('🗑️ Deleting by ad_account_id:', mapping.ad_account_id);
      await EmpresaAdAccountModel.deleteMappingByAdAccountId(mapping.ad_account_id);
      
      console.log('✅ Company deleted successfully');
      return res.status(200).json({ 
        success: true, 
        message: `Empresa "${mapping.empresa}" (Ad Account ID: ${mapping.ad_account_id}) excluída com sucesso` 
      });
    } catch (error) {
      console.error('❌ Delete company controller error:', error);
      return res.status(500).json({ error: `Erro ao excluir empresa: ${error.message}` });
    }
  }

  // Delete a company by ad_account_id (admin only)
  static async deleteCompanyByAdAccountId(req, res) {
    console.log('\n🗑️ ============ DELETE COMPANY BY AD_ACCOUNT_ID CALLED ============');
    console.log('📋 Request params:', JSON.stringify(req.params, null, 2));
    console.log('📋 Request URL:', req.url);
    
    try {
      // Check if user is admin
      if (!req.session || !req.session.user || req.session.user.role !== 'Admin') {
        console.log('❌ ACESSO NEGADO - Usuário não é admin');
        return res.status(403).json({ error: 'Acesso restrito' });
      }
      
      const { ad_account_id } = req.params;
      
      console.log('🗑️ Deleting company with ad_account_id:', ad_account_id);

      if (!ad_account_id) {
        console.log('❌ ad_account_id não fornecido');
        return res.status(400).json({ error: 'Ad Account ID é obrigatório' });
      }

      // Get the company info before deletion for the response message
      const allMappings = await EmpresaAdAccountModel.getAllMappings();
      const mapping = allMappings.find(m => m.ad_account_id === ad_account_id);
      
      if (!mapping) {
        console.log('❌ Empresa não encontrada com ad_account_id:', ad_account_id);
        return res.status(404).json({ error: 'Empresa não encontrada' });
      }
      
      console.log('✅ Found company to delete:', {
        empresa: mapping.empresa,
        ad_account_id: mapping.ad_account_id
      });
      
      // Delete using ad_account_id directly
      await EmpresaAdAccountModel.deleteMappingByAdAccountId(ad_account_id);
      
      console.log('✅ Company deleted successfully');
      return res.status(200).json({ 
        success: true, 
        message: `Empresa "${mapping.empresa}" (Ad Account ID: ${ad_account_id}) excluída com sucesso` 
      });
    } catch (error) {
      console.error('❌ Delete company by ad_account_id controller error:', error);
      return res.status(500).json({ error: `Erro ao excluir empresa: ${error.message}` });
    }
  }
}

module.exports = CompanyController;
