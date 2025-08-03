const { supabase } = require('./src/config/supabase');

async function inserirEmpresaMarcos() {
    try {
        console.log('🔄 Inserindo empresa "Marcos"...\n');
        
        // 1. Verificar qual ad_account_id existe na tabela campanhas_n8n
        const { data: campanhas, error: campanhasError } = await supabase
            .from('campanhas_n8n')
            .select('ad_account_id')
            .limit(1);
            
        if (campanhasError) {
            console.error('❌ Erro ao buscar campanhas:', campanhasError);
            return;
        }
        
        if (!campanhas || campanhas.length === 0) {
            console.log('❌ Nenhum ad_account_id encontrado na tabela campanhas_n8n');
            return;
        }
        
        const adAccountId = campanhas[0].ad_account_id;
        console.log(`✅ Ad Account ID encontrado: ${adAccountId}`);
        
        // 2. Inserir empresa na tabela companies
        console.log('\n🔄 Inserindo empresa "Marcos" na tabela companies...');
        const { error: companyError } = await supabase
            .from('companies')
            .insert({ empresa: 'Marcos' });
            
        if (companyError && !companyError.message?.includes('duplicate key')) {
            console.error('❌ Erro ao inserir empresa:', companyError);
            return;
        }
        
        if (companyError?.message?.includes('duplicate key')) {
            console.log('ℹ️ Empresa "Marcos" já existe na tabela companies');
        } else {
            console.log('✅ Empresa "Marcos" inserida na tabela companies');
        }
        
        // 3. Inserir mapeamento na tabela empresa_ad_accounts
        console.log('\n🔄 Criando mapeamento empresa_ad_accounts...');
        const { error: mappingError } = await supabase
            .from('empresa_ad_accounts')
            .insert({ 
                empresa: 'Marcos', 
                ad_account_id: adAccountId 
            });
            
        if (mappingError && !mappingError.message?.includes('duplicate key')) {
            console.error('❌ Erro ao criar mapeamento:', mappingError);
            return;
        }
        
        if (mappingError?.message?.includes('duplicate key')) {
            console.log('ℹ️ Mapeamento "Marcos" x "' + adAccountId + '" já existe');
        } else {
            console.log('✅ Mapeamento criado: "Marcos" -> "' + adAccountId + '"');
        }
        
        // 4. Verificar resultado final
        console.log('\n📊 Verificando dados inseridos:');
        const { data: verificacao, error: verificacaoError } = await supabase
            .from('empresa_ad_accounts')
            .select('*')
            .eq('empresa', 'Marcos');
            
        if (verificacaoError) {
            console.error('❌ Erro na verificação:', verificacaoError);
        } else {
            console.table(verificacao);
        }
        
        // 5. Mostrar todos os mapeamentos
        console.log('\n📋 Todos os mapeamentos existentes:');
        const { data: todosMapeamentos } = await supabase
            .from('empresa_ad_accounts')
            .select('*')
            .order('created_at');
            
        console.table(todosMapeamentos);
        
        console.log('\n🎯 Próximo passo: Testar o dashboard com a empresa "Marcos"');
        
    } catch (error) {
        console.error('❌ Erro geral:', error);
    }
}

inserirEmpresaMarcos();
