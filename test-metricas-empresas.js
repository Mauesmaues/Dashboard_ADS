// 🧪 TESTE DA LÓGICA DE MÉTRICAS POR EMPRESA
// Execute: node test-metricas-empresas.js

console.log('🧪 Testando lógica de métricas por empresa...\n');

const { createClient } = require('@supabase/supabase-js');
const moment = require('moment');

// Configuração do Supabase
const supabaseUrl = 'https://dhgqwshbvvmkekavozfb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRoZ3F3c2hidnZta2VrYXZvemZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjI0NzI5MzMsImV4cCI6MjAzODA0ODkzM30.YECj5ELLfaOZtqJ_2WQJz0cCDdM3vhFTw-u6JUOEQBo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testMetricasEmpresas() {
    try {
        console.log('📊 Simulando dados para teste...');
        
        // Primeiro vamos verificar que dados existem
        const { data: existingData, error } = await supabase
            .from('campanhas_n8n')
            .select('*')
            .order('date_start', { ascending: false })
            .limit(10);
            
        if (error) throw error;
        
        console.log(`✅ Encontrados ${existingData.length} registros na tabela campanhas_n8n`);
        
        if (existingData.length > 0) {
            console.log('📋 Primeiros registros:');
            existingData.slice(0, 3).forEach((record, index) => {
                console.log(`   ${index + 1}. ID: ${record.id}, ad_account_id: ${record.ad_account_id}, data: ${record.date_start}, gasto: $${record.spend}, cliques: ${record.clicks}`);
            });
        }
        
        // Agora vamos testar a lógica com um período específico
        console.log('\n🎯 Testando lógica de range de datas...');
        
        // Vamos buscar dados dos últimos 7 dias
        const dataFim = moment().format('YYYY-MM-DD');
        const dataInicio = moment().subtract(7, 'days').format('YYYY-MM-DD');
        
        console.log(`📅 Período de teste: ${dataInicio} até ${dataFim}`);
        
        // Buscar todos os dados do período
        const { data: dadosPeriodo } = await supabase
            .from('campanhas_n8n')
            .select('*')
            .gte('date_start', dataInicio)
            .lte('date_start', dataFim)
            .order('date_start', { ascending: true });
            
        console.log(`📊 Encontrados ${dadosPeriodo.length} registros no período`);
        
        if (dadosPeriodo.length === 0) {
            console.log('⚠️ Nenhum dado encontrado no período. Vamos testar com dados existentes...');
            
            // Pegar as datas dos últimos registros
            const { data: lastRecords } = await supabase
                .from('campanhas_n8n')
                .select('date_start')
                .order('date_start', { ascending: false })
                .limit(1);
                
            if (lastRecords && lastRecords.length > 0) {
                const ultimaData = lastRecords[0].date_start;
                console.log(`🎯 Testando com a última data disponível: ${ultimaData}`);
                
                const { data: dadosUltimaData } = await supabase
                    .from('campanhas_n8n')
                    .select('*')
                    .eq('date_start', ultimaData)
                    .order('id', { ascending: true });
                    
                console.log(`📊 Registros da data ${ultimaData}:`);
                dadosUltimaData.forEach(record => {
                    console.log(`   ID: ${record.id}, ad_account_id: ${record.ad_account_id}, gasto: $${record.spend}, cliques: ${record.clicks}`);
                });
                
                // Simular a lógica de pegar o último registro (maior ID)
                const empresasPorDia = {};
                
                dadosUltimaData.forEach(item => {
                    const adAccountId = item.ad_account_id;
                    const dataItem = item.date_start;
                    
                    if (!empresasPorDia[adAccountId]) {
                        empresasPorDia[adAccountId] = {};
                    }
                    
                    if (!empresasPorDia[adAccountId][dataItem] || item.id > empresasPorDia[adAccountId][dataItem].id) {
                        console.log(`   ✅ ${adAccountId} - ${dataItem}: Mantendo registro ID ${item.id} (gasto: $${item.spend}, cliques: ${item.clicks})`);
                        empresasPorDia[adAccountId][dataItem] = {
                            id: item.id,
                            expense: parseFloat(item.spend) || 0,
                            clicks: parseInt(item.clicks) || 0,
                            impressions: parseInt(item.impressions) || 0
                        };
                    } else {
                        console.log(`   ❌ ${adAccountId} - ${dataItem}: Descartando registro ID ${item.id} (ID ${empresasPorDia[adAccountId][dataItem].id} é maior)`);
                    }
                });
                
                console.log('\n🎯 RESULTADO FINAL - últimos registros por empresa/dia:');
                Object.entries(empresasPorDia).forEach(([adAccountId, diasData]) => {
                    console.log(`🏢 ad_account_id: ${adAccountId}`);
                    Object.entries(diasData).forEach(([data, metrics]) => {
                        console.log(`   📅 ${data}: ID ${metrics.id} - Gasto: $${metrics.expense}, Cliques: ${metrics.clicks}, Impressões: ${metrics.impressions}`);
                    });
                });
            }
        }
        
        console.log('\n✅ Teste concluído!');
        console.log('\n📝 LÓGICA IMPLEMENTADA:');
        console.log('   1. Para cada dia do período selecionado');
        console.log('   2. Para cada empresa (ad_account_id)');
        console.log('   3. Manter apenas o registro com maior ID (último do dia)');
        console.log('   4. Somar os valores desses registros únicos por empresa');
        console.log('   5. Calcular CPC = Total Gasto ÷ Total Cliques');
        console.log('   6. Calcular CTR = (Total Cliques ÷ Total Impressões) × 100');
        
    } catch (error) {
        console.error('❌ Erro no teste:', error);
    }
}

testMetricasEmpresas();
