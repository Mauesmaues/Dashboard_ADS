const { supabase } = require('./src/config/supabase');

async function setupMarcosMapping() {
    console.log('🏢 Configurando mapeamento da empresa Marcos...\n');

    try {
        // 1. Verificar se já existe o mapeamento
        console.log('1. Verificando se o mapeamento já existe...');
        const { data: existingMapping, error: checkError } = await supabase
            .from('empresa_ad_accounts')
            .select('*')
            .eq('empresa', 'Marcos')
            .eq('ad_account_id', '1010333534298546')
            .single();

        if (existingMapping) {
            console.log('✅ Mapeamento já existe:', existingMapping);
            return existingMapping;
        }

        if (checkError && checkError.code !== 'PGRST116') {
            throw checkError;
        }

        // 2. Criar o mapeamento
        console.log('2. Criando mapeamento Marcos -> 1010333534298546...');
        const { data: newMapping, error: insertError } = await supabase
            .from('empresa_ad_accounts')
            .insert([{
                empresa: 'Marcos',
                ad_account_id: '1010333534298546',
                created_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (insertError) {
            throw insertError;
        }

        console.log('✅ Mapeamento criado com sucesso:', newMapping);

        // 3. Verificar campanhas existentes com este ad_account_id
        console.log('\n3. Verificando campanhas vinculadas...');
        const { data: campaigns, error: campaignError } = await supabase
            .from('campanhas_n8n')
            .select('count', { count: 'exact' })
            .eq('ad_account_id', '1010333534298546');

        if (campaignError) {
            console.log('⚠️ Erro ao verificar campanhas:', campaignError.message);
        } else {
            const campaignCount = campaigns.length || 0;
            console.log(`📊 Encontradas ${campaignCount} campanhas para ad_account_id: 1010333534298546`);
            
            if (campaignCount > 0) {
                console.log('🎯 A empresa Marcos está agora vinculada às campanhas existentes!');
            } else {
                console.log('ℹ️ Nenhuma campanha encontrada. Quando campanhas forem adicionadas com este ad_account_id, serão automaticamente vinculadas à empresa Marcos.');
            }
        }

        // 4. Listar todos os mapeamentos
        console.log('\n4. Mapeamentos atuais na tabela empresa_ad_accounts:');
        const { data: allMappings, error: listError } = await supabase
            .from('empresa_ad_accounts')
            .select('*')
            .order('created_at', { ascending: false });

        if (listError) {
            console.log('⚠️ Erro ao listar mapeamentos:', listError.message);
        } else {
            allMappings.forEach((mapping, index) => {
                console.log(`   ${index + 1}. ${mapping.empresa} -> ${mapping.ad_account_id} (${mapping.created_at})`);
            });
        }

        console.log('\n✅ Setup da empresa Marcos concluído com sucesso!');
        return newMapping;

    } catch (error) {
        console.error('❌ Erro durante setup:', error);
        throw error;
    }
}

if (require.main === module) {
    setupMarcosMapping()
        .then(() => {
            console.log('\n🎉 Processo concluído!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Processo falhou:', error.message);
            process.exit(1);
        });
}

module.exports = { setupMarcosMapping };
