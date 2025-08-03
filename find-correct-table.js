const { supabase } = require('./src/config/supabase');

async function listTables() {
  try {
    console.log('🔍 Listando todas as tabelas disponíveis...');
    
    // Tentar diferentes variações de nome
    const tableNames = ['acessobi', 'acessobI', 'acessoBI', 'acessobiI'];
    
    for (const tableName of tableNames) {
      console.log(`\n📋 Testando tabela: ${tableName}`);
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (!error) {
          console.log(`✅ Tabela ${tableName} encontrada! Registros: ${data?.length || 0}`);
          
          // Se encontrou dados, mostrar a estrutura
          if (data && data.length > 0) {
            console.log('🔍 Estrutura dos dados:');
            const firstRecord = data[0];
            Object.keys(firstRecord).forEach(key => {
              console.log(`   - ${key}: ${typeof firstRecord[key]}`);
            });
          }
        } else {
          console.log(`❌ Tabela ${tableName} não encontrada:`, error.message);
        }
      } catch (err) {
        console.log(`❌ Erro ao testar ${tableName}:`, err.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

listTables();
