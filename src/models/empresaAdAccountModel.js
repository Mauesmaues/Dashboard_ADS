const { supabase } = require('../config/supabase');

class EmpresaAdAccountModel {
  // Create mapping between empresa and ad_account_id
  static async createMapping(empresa, ad_account_id, created_at = null) {
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
          created_at: created_at || new Date().toISOString()
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

  // Get all mappings with latest balance from campanhas_n8n
  static async getAllMappings() {
    try {
      console.log('🔍 [getAllMappings] Iniciando busca de empresas...');
      
      // Buscar todas as empresas
      const { data: empresasData, error: empresasError } = await supabase
        .from('empresa_ad_accounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (empresasError) throw empresasError;

      console.log(`✅ [getAllMappings] Encontradas ${empresasData?.length || 0} empresas`);

      if (!empresasData || empresasData.length === 0) {
        return [];
      }

      // Buscar todos os saldos de uma vez usando query otimizada
      const adAccountIds = empresasData.map(e => e.ad_account_id);
      console.log('🔍 [getAllMappings] Buscando saldos para ad_account_ids:', adAccountIds);

      // Query para buscar o último saldo de cada ad_account_id
      const { data: saldosData, error: saldosError } = await supabase
        .from('campanhas_n8n')
        .select('ad_account_id, saldo, created_at')
        .in('ad_account_id', adAccountIds)
        .order('created_at', { ascending: false });

      if (saldosError) {
        console.error('❌ [getAllMappings] Erro ao buscar saldos:', saldosError);
        // Se der erro, retorna empresas com saldo 0
        return empresasData.map(empresa => ({
          ...empresa,
          saldo: 0,
          saldo_updated_at: null
        }));
      }

      console.log(`✅ [getAllMappings] Encontrados ${saldosData?.length || 0} registros de saldo`);

      // Criar mapa com o último saldo de cada ad_account_id
      const saldoMap = {};
      if (saldosData) {
        saldosData.forEach(record => {
          // Só adiciona se ainda não tem um registro para este ad_account_id (já que está ordenado por data DESC)
          if (!saldoMap[record.ad_account_id]) {
            saldoMap[record.ad_account_id] = {
              saldo: record.saldo !== null ? parseFloat(record.saldo) : 0,
              saldo_updated_at: record.created_at
            };
          }
        });
      }

      console.log('📊 [getAllMappings] Mapa de saldos:', saldoMap);

      // Combinar empresas com seus saldos
      const mappingsWithBalance = empresasData.map(empresa => {
        const saldoInfo = saldoMap[empresa.ad_account_id] || { saldo: 0, saldo_updated_at: null };
        
        console.log(`✅ [getAllMappings] ${empresa.empresa} (${empresa.ad_account_id}): R$ ${saldoInfo.saldo}`);
        
        return {
          ...empresa,
          saldo: saldoInfo.saldo,
          saldo_updated_at: saldoInfo.saldo_updated_at
        };
      });

      console.log('📊 [getAllMappings] Resultado final com saldos:', mappingsWithBalance.map(m => ({
        empresa: m.empresa,
        ad_account_id: m.ad_account_id,
        saldo: m.saldo
      })));

      return mappingsWithBalance;
    } catch (error) {
      console.error('❌ [getAllMappings] Erro geral:', error);
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
