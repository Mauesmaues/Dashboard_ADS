const { createClient } = require('@supabase/supabase-js');

// Configurações do Supabase
const supabaseUrl = 'https://njwuuflfnqdllgoxfhcc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qd3V1ZmxmbnFkbGxnb3hmaGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQxMjEzMTEsImV4cCI6MjA0OTY5NzMxMX0.1L_H8K0HrL5Eg3U5fwrZUIp3rF3qM2TzZCfSPJ5NE4w';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugSaldo() {
    console.log('🔍 Verificando dados de saldo...\n');
    
    try {
        // 1. Verificar se existe coluna saldo na tabela campanhas_n8n
        console.log('1. Verificando estrutura da tabela campanhas_n8n...');
        const { data: sampleData, error: sampleError } = await supabase
            .from('campanhas_n8n')
            .select('*')
            .limit(1);
            
        if (sampleError) {
            console.error('❌ Erro ao acessar campanhas_n8n:', sampleError);
            return;
        }
        
        if (sampleData && sampleData.length > 0) {
            console.log('✅ Estrutura encontrada. Colunas disponíveis:', Object.keys(sampleData[0]));
            console.log('📋 Dados de exemplo:', sampleData[0]);
        } else {
            console.log('⚠️ Tabela campanhas_n8n está vazia');
        }
        
        // 2. Verificar se existe dados com saldo
        console.log('\n2. Verificando registros com saldo...');
        const { data: saldoData, error: saldoError } = await supabase
            .from('campanhas_n8n')
            .select('ad_account_id, saldo, created_at')
            .not('saldo', 'is', null)
            .order('created_at', { ascending: false })
            .limit(5);
            
        if (saldoError) {
            console.error('❌ Erro ao buscar saldos:', saldoError);
        } else if (saldoData && saldoData.length > 0) {
            console.log('✅ Registros com saldo encontrados:');
            console.table(saldoData);
        } else {
            console.log('⚠️ Nenhum registro com saldo encontrado');
        }
        
        // 3. Verificar empresa_ad_accounts
        console.log('\n3. Verificando empresa_ad_accounts...');
        const { data: empresaData, error: empresaError } = await supabase
            .from('empresa_ad_accounts')
            .select('*');
            
        if (empresaError) {
            console.error('❌ Erro ao buscar empresas:', empresaError);
        } else {
            console.log('✅ Empresas encontradas:');
            console.table(empresaData);
        }
        
        // 4. Testar a query que está sendo usada no modelo
        if (empresaData && empresaData.length > 0) {
            console.log('\n4. Testando query de saldo para primeira empresa...');
            const firstEmpresa = empresaData[0];
            
            const { data: balanceTest, error: balanceTestError } = await supabase
                .from('campanhas_n8n')
                .select('saldo, created_at')
                .eq('ad_account_id', firstEmpresa.ad_account_id)
                .order('created_at', { ascending: false })
                .limit(1);
                
            if (balanceTestError) {
                console.error('❌ Erro no teste de saldo:', balanceTestError);
            } else {
                console.log(`✅ Teste para ad_account_id ${firstEmpresa.ad_account_id}:`, balanceTest);
            }
        }
        
    } catch (error) {
        console.error('❌ Erro geral:', error);
    }
}

debugSaldo();
