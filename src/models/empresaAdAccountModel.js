const { supabase } = require('../config/supabase');

class EmpresaAdAccountModel {
  // Create mapping between empresa and ad_account_id
  static async createMapping(empresa, ad_account_id) {
    try {
      // Check if mapping already exists
      const { data: existing, error: checkError } = await supabase
        .from('empresa_ad_accounts')
        .select('*')
        .eq('empresa', empresa)
        .eq('ad_account_id', ad_account_id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found" error
        throw checkError;
      }

      if (existing) {
        console.log(`Mapping already exists: ${empresa} -> ${ad_account_id}`);
        return existing;
      }

      // Insert new mapping
      const { data, error } = await supabase
        .from('empresa_ad_accounts')
        .insert([{
          empresa,
          ad_account_id,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      console.log(`Created mapping: ${empresa} -> ${ad_account_id}`);
      return data;
    } catch (error) {
      console.error('Error creating empresa-ad_account mapping:', error);
      throw error;
    }
  }

  // Get all mappings for a specific empresa
  static async getMappingsByEmpresa(empresa) {
    try {
      const { data, error } = await supabase
        .from('empresa_ad_accounts')
        .select('*')
        .eq('empresa', empresa);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching mappings by empresa:', error);
      throw error;
    }
  }

  // Get all mappings for a specific ad_account_id
  static async getMappingsByAdAccountId(ad_account_id) {
    try {
      const { data, error } = await supabase
        .from('empresa_ad_accounts')
        .select('*')
        .eq('ad_account_id', ad_account_id);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching mappings by ad_account_id:', error);
      throw error;
    }
  }

  // Get all mappings
  static async getAllMappings() {
    try {
      const { data, error } = await supabase
        .from('empresa_ad_accounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching all mappings:', error);
      throw error;
    }
  }

  // Delete mapping
  static async deleteMapping(empresa, ad_account_id) {
    try {
      const { error } = await supabase
        .from('empresa_ad_accounts')
        .delete()
        .eq('empresa', empresa)
        .eq('ad_account_id', ad_account_id);

      if (error) throw error;

      console.log(`Deleted mapping: ${empresa} -> ${ad_account_id}`);
      return { success: true };
    } catch (error) {
      console.error('Error deleting mapping:', error);
      throw error;
    }
  }

  // Update mapping (change ad_account_id for an empresa)
  static async updateMapping(empresa, oldAdAccountId, newAdAccountId) {
    try {
      const { data, error } = await supabase
        .from('empresa_ad_accounts')
        .update({ ad_account_id: newAdAccountId })
        .eq('empresa', empresa)
        .eq('ad_account_id', oldAdAccountId)
        .select()
        .single();

      if (error) throw error;

      console.log(`Updated mapping: ${empresa} -> ${oldAdAccountId} to ${newAdAccountId}`);
      return data;
    } catch (error) {
      console.error('Error updating mapping:', error);
      throw error;
    }
  }

  // Batch create mappings for multiple ad_account_ids for one empresa
  static async createMappingsForEmpresa(empresa, ad_account_ids) {
    try {
      const mappingsToInsert = ad_account_ids.map(ad_account_id => ({
        empresa,
        ad_account_id,
        created_at: new Date().toISOString()
      }));

      const { data, error } = await supabase
        .from('empresa_ad_accounts')
        .insert(mappingsToInsert)
        .select();

      if (error) throw error;

      console.log(`Created ${data.length} mappings for empresa: ${empresa}`);
      return data;
    } catch (error) {
      console.error('Error creating batch mappings:', error);
      throw error;
    }
  }

  // Delete mapping by ad_account_id
  static async deleteMappingByAdAccountId(ad_account_id) {
    try {
      const { error } = await supabase
        .from('empresa_ad_accounts')
        .delete()
        .eq('ad_account_id', ad_account_id);

      if (error) throw error;

      console.log(`Deleted mapping with ad_account_id: ${ad_account_id}`);
      return { success: true };
    } catch (error) {
      console.error('Error deleting mapping by ad_account_id:', error);
      throw error;
    }
  }

  // Delete mapping by ID
  static async deleteMappingById(id) {
    try {
      const { error } = await supabase
        .from('empresa_ad_accounts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      console.log(`Deleted mapping with ID: ${id}`);
      return { success: true };
    } catch (error) {
      console.error('Error deleting mapping by ID:', error);
      throw error;
    }
  }

  // Delete all mappings for an empresa
  static async deleteMappingsForEmpresa(empresa) {
    try {
      const { error } = await supabase
        .from('empresa_ad_accounts')
        .delete()
        .eq('empresa', empresa);

      if (error) throw error;

      console.log(`Deleted all mappings for empresa: ${empresa}`);
      return { success: true };
    } catch (error) {
      console.error('Error deleting mappings for empresa:', error);
      throw error;
    }
  }
}

module.exports = EmpresaAdAccountModel;
