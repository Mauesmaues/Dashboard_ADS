// Endpoint de teste para verificar dados de saldo
const express = require('express');
const { supabase } = require('../config/supabase');

async function testSaldoEndpoint(req, res) {
  try {
    console.log('🧪 [TEST] Verificando dados de saldo...');
    
    // 1. Verificar se existem dados na tabela campanhas_n8n
    const { data: campanhas, error: campanhasError } = await supabase
      .from('campanhas_n8n')
      .select('ad_account_id, saldo, created_at')
      .limit(5);
      
    if (campanhasError) {
      console.error('❌ [TEST] Erro ao acessar campanhas_n8n:', campanhasError);
      return res.status(500).json({ error: 'Erro ao acessar campanhas_n8n', details: campanhasError });
    }
    
    console.log('✅ [TEST] Dados campanhas_n8n:', campanhas);
    
    // 2. Verificar empresas
    const { data: empresas, error: empresasError } = await supabase
      .from('empresa_ad_accounts')
      .select('*');
      
    if (empresasError) {
      console.error('❌ [TEST] Erro ao acessar empresa_ad_accounts:', empresasError);
      return res.status(500).json({ error: 'Erro ao acessar empresa_ad_accounts', details: empresasError });
    }
    
    console.log('✅ [TEST] Dados empresa_ad_accounts:', empresas);
    
    // 3. Testar query de saldo para primeira empresa
    let saldoTest = null;
    if (empresas && empresas.length > 0) {
      const firstEmpresa = empresas[0];
      const { data: saldoData, error: saldoError } = await supabase
        .from('campanhas_n8n')
        .select('saldo, created_at')
        .eq('ad_account_id', firstEmpresa.ad_account_id)
        .order('created_at', { ascending: false })
        .limit(1);
        
      saldoTest = { saldoData, saldoError, ad_account_id: firstEmpresa.ad_account_id };
      console.log('✅ [TEST] Teste de saldo:', saldoTest);
    }
    
    return res.status(200).json({
      status: 'success',
      campanhas_sample: campanhas,
      empresas_sample: empresas,
      saldo_test: saldoTest
    });
    
  } catch (error) {
    console.error('❌ [TEST] Erro geral:', error);
    return res.status(500).json({ error: 'Erro geral', details: error.message });
  }
}

module.exports = { testSaldoEndpoint };
