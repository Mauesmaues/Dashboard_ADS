const { supabase } = require('../config/supabase');

class CompanyModel {
  // Get all companies
  static async getAllCompanies() {
    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .order('nome', { ascending: true });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching companies:', error);
      throw error;
    }
  }

  // Create new company
  static async createCompany(companyData) {
    try {
      const { nome, descricao, ad_account_id } = companyData;
      
      // Validate required fields
      if (!nome || !ad_account_id) {
        throw new Error('Nome e Ad Account ID são obrigatórios');
      }

      // Validate ad_account_id format (should be only numbers)
      if (!/^\d+$/.test(ad_account_id)) {
        throw new Error('Ad Account ID deve conter apenas números');
      }

      // Check if company name already exists
      const { data: existingCompany, error: checkError } = await supabase
        .from('empresas')
        .select('id')
        .eq('nome', nome)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found" error
        throw checkError;
      }

      if (existingCompany) {
        throw new Error('Já existe uma empresa com este nome');
      }

      // Check if ad_account_id already exists
      const { data: existingAdAccount, error: adCheckError } = await supabase
        .from('empresas')
        .select('id')
        .eq('ad_account_id', ad_account_id)
        .single();

      if (adCheckError && adCheckError.code !== 'PGRST116') {
        throw adCheckError;
      }

      if (existingAdAccount) {
        throw new Error('Já existe uma empresa com este Ad Account ID');
      }

      // Insert new company
      const { data, error } = await supabase
        .from('empresas')
        .insert([{
          nome,
          descricao: descricao || '',
          ad_account_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error creating company:', error);
      throw error;
    }
  }

  // Update company
  static async updateCompany(id, companyData) {
    try {
      const { nome, descricao, ad_account_id } = companyData;
      
      // Validate required fields
      if (!nome || !ad_account_id) {
        throw new Error('Nome e Ad Account ID são obrigatórios');
      }

      // Validate ad_account_id format (should be only numbers)
      if (!/^\d+$/.test(ad_account_id)) {
        throw new Error('Ad Account ID deve conter apenas números');
      }

      // Check if company exists
      const { data: existingCompany, error: checkError } = await supabase
        .from('empresas')
        .select('*')
        .eq('id', id)
        .single();

      if (checkError) {
        if (checkError.code === 'PGRST116') {
          throw new Error('Empresa não encontrada');
        }
        throw checkError;
      }

      // Check if name is taken by another company
      if (nome !== existingCompany.nome) {
        const { data: nameCheck, error: nameError } = await supabase
          .from('empresas')
          .select('id')
          .eq('nome', nome)
          .neq('id', id)
          .single();

        if (nameError && nameError.code !== 'PGRST116') {
          throw nameError;
        }

        if (nameCheck) {
          throw new Error('Já existe uma empresa com este nome');
        }
      }

      // Check if ad_account_id is taken by another company
      if (ad_account_id !== existingCompany.ad_account_id) {
        const { data: adCheck, error: adError } = await supabase
          .from('empresas')
          .select('id')
          .eq('ad_account_id', ad_account_id)
          .neq('id', id)
          .single();

        if (adError && adError.code !== 'PGRST116') {
          throw adError;
        }

        if (adCheck) {
          throw new Error('Já existe uma empresa com este Ad Account ID');
        }
      }

      // Update company
      const { data, error } = await supabase
        .from('empresas')
        .update({
          nome,
          descricao: descricao || '',
          ad_account_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error updating company:', error);
      throw error;
    }
  }

  // Delete company
  static async deleteCompany(id) {
    try {
      // Check if company exists
      const { data: existingCompany, error: checkError } = await supabase
        .from('empresas')
        .select('*')
        .eq('id', id)
        .single();

      if (checkError) {
        if (checkError.code === 'PGRST116') {
          throw new Error('Empresa não encontrada');
        }
        throw checkError;
      }

      // Delete company
      const { error } = await supabase
        .from('empresas')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return { success: true, message: 'Empresa deletada com sucesso' };
    } catch (error) {
      console.error('Error deleting company:', error);
      throw error;
    }
  }

  // Get company by ID
  static async getCompanyById(id) {
    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching company by ID:', error);
      throw error;
    }
  }

  // Get company by ad_account_id
  static async getCompanyByAdAccountId(ad_account_id) {
    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .eq('ad_account_id', ad_account_id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching company by ad_account_id:', error);
      throw error;
    }
  }
}

module.exports = CompanyModel;
