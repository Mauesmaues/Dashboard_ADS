// 🔍 TESTE ESPECÍFICO PARA AD_ACCOUNT_ID: 537800105358529
// Verificar dados e testar lógica de métricas por empresa

const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = 'https://qvkkcbwxdafqmxziqhfp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2a2tjYnd4ZGFmcW14emlxaGZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzMzNDA3NTcsImV4cCI6MjA0ODkxNjc1N30.4BPFKLuYoYKuOd3--ACyqjV8BqLlpEOEI3GE2l8wYnA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testarAdAccount537800105358529() {
    console.log('🔍 TESTE: ad_account_id = 537800105358529');
    console.log('==========================================\n');

    try {
        // 1. BUSCAR TODOS OS DADOS DESTA AD_ACCOUNT_ID
        console.log('1️⃣ BUSCANDO DADOS DA AD_ACCOUNT_ID 537800105358529...');
        
        const { data: dadosCompletos, error: errorCompletos } = await supabase
            .from('campanhas_n8n')
            .select('*')
            .eq('ad_account_id', '537800105358529')
            .order('date_start', { ascending: true })
            .order('id', { ascending: true });

        if (errorCompletos) {
            console.error('❌ Erro ao buscar dados:', errorCompletos);
            return;
        }

        console.log(`✅ Encontrados ${dadosCompletos.length} registros para ad_account_id: 537800105358529\n`);

        if (dadosCompletos.length === 0) {
            console.log('⚠️ Nenhum dado encontrado para esta ad_account_id');
            return;
        }

        // 2. MOSTRAR ESTRUTURA DOS DADOS
        console.log('2️⃣ ESTRUTURA DOS DADOS:');
        console.table(dadosCompletos.map(item => ({
            ID: item.id,
            Data: item.date_start,
            Gasto: `$${item.spend}`,
            Impressões: item.impressions?.toLocaleString('pt-BR') || 0,
            Cliques: item.clicks,
            CPC: `$${item.cpc}`,
            CTR: `${item.ctr}%`,
            Criado: new Date(item.created_at).toLocaleString('pt-BR')
        })));

        // 3. AGRUPAR POR DATA E IDENTIFICAR O MAIOR ID DE CADA DIA
        console.log('\n3️⃣ AGRUPAMENTO POR DATA (LÓGICA: MAIOR ID POR DIA):');
        
        const dadosPorDia = {};
        
        dadosCompletos.forEach(item => {
            const data = item.date_start;
            
            if (!dadosPorDia[data]) {
                dadosPorDia[data] = [];
            }
            
            dadosPorDia[data].push(item);
        });

        console.log('📊 Registros por data:');
        Object.entries(dadosPorDia).forEach(([data, registros]) => {
            console.log(`\n📅 DATA: ${data} (${registros.length} registros)`);
            
            // Ordenar por ID para ver qual é o maior
            registros.sort((a, b) => b.id - a.id);
            
            const ultimoRegistro = registros[0]; // Maior ID (último inserido)
            
            console.log('   🔍 Todos os registros do dia:');
            registros.forEach(reg => {
                const isUltimo = reg.id === ultimoRegistro.id;
                console.log(`      ${isUltimo ? '👉' : '  '} ID: ${reg.id} | Gasto: $${reg.spend} | Cliques: ${reg.clicks} | Impressões: ${reg.impressions} ${isUltimo ? '← ÚLTIMO (USAR ESTE)' : ''}`);
            });
            
            console.log(`   ✅ MÉTRICA SELECIONADA: ID ${ultimoRegistro.id} - Gasto: $${ultimoRegistro.spend}, Cliques: ${ultimoRegistro.clicks}, Impressões: ${ultimoRegistro.impressions}`);
        });

        // 4. SIMULAR BUSCA POR RANGE DE DATAS (EXEMPLO: 06/08/2025 a 07/08/2025)
        console.log('\n4️⃣ SIMULAÇÃO: RANGE 06/08/2025 a 07/08/2025');
        
        const dataInicio = '2025-08-06';
        const dataFim = '2025-08-07';
        
        const dadosRange = dadosCompletos.filter(item => 
            item.date_start >= dataInicio && item.date_start <= dataFim
        );
        
        console.log(`🔍 Registros no range ${dataInicio} a ${dataFim}: ${dadosRange.length}`);
        
        if (dadosRange.length > 0) {
            console.table(dadosRange.map(item => ({
                ID: item.id,
                Data: item.date_start,
                Gasto: `$${item.spend}`,
                Cliques: item.clicks,
                Impressões: item.impressions,
                CPC: `$${item.cpc}`,
                CTR: `${item.ctr}%`
            })));

            // 5. APLICAR LÓGICA DE ÚLTIMA MÉTRICA POR DIA
            console.log('\n5️⃣ APLICANDO LÓGICA DE MÉTRICAS POR EMPRESA:');
            
            const metricasPorDia = {};
            
            dadosRange.forEach(item => {
                const data = item.date_start;
                
                if (!metricasPorDia[data] || item.id > metricasPorDia[data].id) {
                    metricasPorDia[data] = item;
                }
            });
            
            console.log('📊 Últimas métricas por dia:');
            Object.entries(metricasPorDia).forEach(([data, metrica]) => {
                console.log(`   📅 ${data}: ID ${metrica.id} | Gasto: $${metrica.spend} | Cliques: ${metrica.clicks} | Impressões: ${metrica.impressions}`);
            });
            
            // 6. CALCULAR TOTAIS DO PERÍODO
            const ultimasMetricas = Object.values(metricasPorDia);
            
            const totalGasto = ultimasMetricas.reduce((sum, m) => sum + (parseFloat(m.spend) || 0), 0);
            const totalCliques = ultimasMetricas.reduce((sum, m) => sum + (parseInt(m.clicks) || 0), 0);
            const totalImpressions = ultimasMetricas.reduce((sum, m) => sum + (parseInt(m.impressions) || 0), 0);
            
            const cpcMedio = totalCliques > 0 ? totalGasto / totalCliques : 0;
            const ctrMedio = totalImpressions > 0 ? (totalCliques / totalImpressions) * 100 : 0;
            
            console.log('\n6️⃣ RESULTADO FINAL DO PERÍODO:');
            console.log(`📊 Total de Gasto: $${totalGasto.toFixed(2)}`);
            console.log(`👆 Total de Cliques: ${totalCliques}`);
            console.log(`👁️ Total de Impressões: ${totalImpressions.toLocaleString('pt-BR')}`);
            console.log(`💰 CPC Médio: $${cpcMedio.toFixed(4)}`);
            console.log(`📈 CTR Médio: ${ctrMedio.toFixed(2)}%`);
            
            console.log('\n✅ LÓGICA APLICADA:');
            console.log('   • Para cada dia, usar o registro com maior ID');
            console.log('   • Somar gastos das últimas métricas de cada dia');
            console.log('   • Somar cliques das últimas métricas de cada dia');
            console.log('   • Somar impressões das últimas métricas de cada dia');
            console.log('   • CPC Médio = Total Gasto ÷ Total Cliques');
            console.log('   • CTR Médio = (Total Cliques ÷ Total Impressões) × 100');
            
        } else {
            console.log('⚠️ Nenhum dado encontrado no range especificado');
        }

        // 7. VERIFICAR MAPEAMENTO DE EMPRESA
        console.log('\n7️⃣ VERIFICANDO MAPEAMENTO DE EMPRESA:');
        
        const { data: mapeamento, error: errorMapeamento } = await supabase
            .from('empresa_ad_accounts')
            .select('*')
            .eq('ad_account_id', '537800105358529');

        if (errorMapeamento) {
            console.log('❌ Erro ao buscar mapeamento:', errorMapeamento);
        } else if (mapeamento && mapeamento.length > 0) {
            console.log('✅ Mapeamento encontrado:');
            console.table(mapeamento);
        } else {
            console.log('⚠️ Nenhum mapeamento encontrado para esta ad_account_id');
            console.log('   📝 Esta conta aparecerá como "Conta 537800105358529" no sistema');
        }

        // 8. TESTAR BUSCA DE RANGE REAL DOS DADOS
        console.log('\n8️⃣ RANGE REAL DOS DADOS:');
        
        const primeiraData = dadosCompletos[0].date_start;
        const ultimaData = dadosCompletos[dadosCompletos.length - 1].date_start;
        
        console.log(`📅 Primeira data: ${primeiraData}`);
        console.log(`📅 Última data: ${ultimaData}`);
        console.log(`📊 Total de dias com dados: ${Object.keys(dadosPorDia).length}`);
        
        console.log('\n🎯 ESTE AD_ACCOUNT_ID ESTÁ PRONTO PARA TESTES NO PAINEL!');
        console.log(`   • Use as datas entre ${primeiraData} e ${ultimaData}`);
        console.log(`   • O sistema aplicará a lógica de última métrica por dia automaticamente`);

    } catch (error) {
        console.error('❌ Erro durante o teste:', error);
    }
}

// Executar o teste
testarAdAccount537800105358529().catch(console.error);
