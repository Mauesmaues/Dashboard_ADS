const { supabase } = require('./src/config/supabase');

async function setupEmpresaMapping() {
    try {
        console.log('🔄 Configurando mapeamento empresa x ad_account_id...\n');
        
        // Verificar se a tabela existe tentando inserir dados
        console.log('ℹ️ IMPORTANTE: Certifique-se de que a tabela empresa_ad_accounts foi criada no Supabase SQL Editor!');
        console.log('Execute este SQL no Supabase primeiro:');
        console.log(`
CREATE TABLE IF NOT EXISTS empresa_ad_accounts (
    id SERIAL PRIMARY KEY,
    empresa VARCHAR(255) NOT NULL,
    ad_account_id VARCHAR(255) NOT NULL,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(empresa, ad_account_id)
);
        `);
        
        // Verificar dados existentes
        const { data: existingMappings, error: checkError } = await supabase
            .from('empresa_ad_accounts')
            .select('*');
            
        if (checkError) {
            console.error('❌ Erro: Tabela empresa_ad_accounts não existe ainda.');
            console.log('Por favor, execute o SQL acima no Supabase SQL Editor primeiro.');
            return;
        }
        
        console.log('\n✅ Tabela empresa_ad_accounts encontrada!');
        
        if (existingMappings.length === 0) {
            console.log('\n🔄 Inserindo dados de mapeamento...');
            
            const mappingsToInsert = [
                { empresa: 'Conceito Prime', ad_account_id: '1348060849739832' },
                { empresa: 'Empresa A', ad_account_id: '1234567890123456' },
                { empresa: 'Empresa B', ad_account_id: '9876543210987654' }
            ];
            
            const { error: insertError } = await supabase
                .from('empresa_ad_accounts')
                .insert(mappingsToInsert);
                
            if (insertError) {
                console.error('❌ Erro ao inserir dados:', insertError);
            } else {
                console.log('✅ Dados de mapeamento inseridos com sucesso!');
            }
        } else {
            console.log('\nℹ️ Dados de mapeamento já existem:');
            console.table(existingMappings);
        }
        
        // Mostrar resultado final
        const { data: finalMappings } = await supabase
            .from('empresa_ad_accounts')
            .select('*')
            .order('id');
            
        console.log('\n📊 Mapeamento atual:');
        console.table(finalMappings);
        
        console.log('\n🎯 Próximo passo: Atualizar o modelo N8N para usar esse mapeamento');
        
    } catch (error) {
        console.error('❌ Erro:', error);
    }
}

setupEmpresaMapping();
