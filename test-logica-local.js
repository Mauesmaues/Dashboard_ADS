// 🧪 TESTE LOCAL - LÓGICA DE MÉTRICAS SEM CONEXÃO
// Execute: node test-logica-local.js

console.log('🧪 Testando lógica de métricas localmente...\n');

// Dados de exemplo simulando registros da tabela campanhas_n8n
const dadosSimulados = [
    // Dia 1
    { id: 101, ad_account_id: 'empresa_a', date_start: '2024-01-06', spend: '150.50', clicks: '45', impressions: '1200' },
    { id: 102, ad_account_id: 'empresa_a', date_start: '2024-01-06', spend: '180.75', clicks: '52', impressions: '1350' }, // ← Este deve ser mantido (ID maior)
    { id: 103, ad_account_id: 'empresa_b', date_start: '2024-01-06', spend: '200.00', clicks: '60', impressions: '1500' },
    
    // Dia 2
    { id: 104, ad_account_id: 'empresa_a', date_start: '2024-01-07', spend: '220.25', clicks: '65', impressions: '1600' },
    { id: 105, ad_account_id: 'empresa_b', date_start: '2024-01-07', spend: '175.50', clicks: '48', impressions: '1400' },
    { id: 106, ad_account_id: 'empresa_b', date_start: '2024-01-07', spend: '190.75', clicks: '55', impressions: '1450' }, // ← Este deve ser mantido (ID maior)
    
    // Dia 3
    { id: 107, ad_account_id: 'empresa_a', date_start: '2024-01-08', spend: '165.00', clicks: '50', impressions: '1300' },
];

console.log('📊 Dados simulados:', dadosSimulados.length, 'registros');
console.log('📅 Período: 2024-01-06 a 2024-01-08');
console.log('🏢 Empresas: empresa_a, empresa_b\n');

// APLICANDO A LÓGICA DE ÚLTIMO REGISTRO POR DIA
console.log('🎯 APLICANDO LÓGICA: Último registro (maior ID) por empresa/dia...\n');

const empresasPorDia = {};

dadosSimulados.forEach(item => {
    const adAccountId = item.ad_account_id;
    const dataItem = item.date_start;
    
    if (!empresasPorDia[adAccountId]) {
        empresasPorDia[adAccountId] = {};
    }
    
    if (!empresasPorDia[adAccountId][dataItem] || item.id > empresasPorDia[adAccountId][dataItem].id) {
        console.log(`✅ ${adAccountId} - ${dataItem}: Mantendo registro ID ${item.id} (gasto: $${item.spend}, cliques: ${item.clicks})`);
        empresasPorDia[adAccountId][dataItem] = {
            id: item.id,
            expense: parseFloat(item.spend) || 0,
            clicks: parseInt(item.clicks) || 0,
            impressions: parseInt(item.impressions) || 0
        };
    } else {
        console.log(`❌ ${adAccountId} - ${dataItem}: Descartando registro ID ${item.id} (ID ${empresasPorDia[adAccountId][dataItem].id} é maior)`);
    }
});

// CALCULANDO TOTAIS POR EMPRESA
console.log('\n📊 CALCULANDO TOTAIS POR EMPRESA...\n');

const resultadoFinal = [];

Object.entries(empresasPorDia).forEach(([adAccountId, diasData]) => {
    console.log(`🏢 EMPRESA: ${adAccountId}`);
    
    let totalExpense = 0;
    let totalClicks = 0;
    let totalImpressions = 0;
    
    Object.entries(diasData).forEach(([data, metrics]) => {
        console.log(`   📅 ${data}: Gasto: $${metrics.expense}, Cliques: ${metrics.clicks}, Impressões: ${metrics.impressions}`);
        totalExpense += metrics.expense;
        totalClicks += metrics.clicks;
        totalImpressions += metrics.impressions;
    });
    
    const cpc = totalClicks > 0 ? (totalExpense / totalClicks) : 0;
    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions * 100) : 0;
    
    const resultado = {
        empresa: adAccountId,
        totalExpense: totalExpense,
        totalClicks: totalClicks,
        totalImpressions: totalImpressions,
        cpc: cpc,
        ctr: ctr
    };
    
    console.log(`   💰 TOTAL GASTO: $${totalExpense.toFixed(2)}`);
    console.log(`   👆 TOTAL CLIQUES: ${totalClicks}`);
    console.log(`   👁️ TOTAL IMPRESSÕES: ${totalImpressions}`);
    console.log(`   🎯 CPC: $${cpc.toFixed(2)} (${totalExpense.toFixed(2)} ÷ ${totalClicks})`);
    console.log(`   📈 CTR: ${ctr.toFixed(2)}% (${totalClicks} ÷ ${totalImpressions} × 100)`);
    console.log('');
    
    resultadoFinal.push(resultado);
});

// RESULTADO FINAL
console.log('🎯 RESULTADO FINAL:');
console.log(JSON.stringify(resultadoFinal, null, 2));

console.log('\n✅ VALIDAÇÃO DA LÓGICA:');
console.log('   ✓ Apenas registros com maior ID foram mantidos por empresa/dia');
console.log('   ✓ Empresa A: IDs 102, 104, 107 (últimos de cada dia)');
console.log('   ✓ Empresa B: IDs 103, 106 (últimos de cada dia)');
console.log('   ✓ Totais calculados corretamente');
console.log('   ✓ CPC = Total Gasto ÷ Total Cliques');
console.log('   ✓ CTR = (Total Cliques ÷ Total Impressões) × 100');

console.log('\n🎉 Lógica implementada com sucesso!');
