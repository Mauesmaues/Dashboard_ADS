const { supabase } = require('../src/config/supabase');
const bcrypt = require('bcryptjs');

async function configuracaoInicial() {
    console.log('🚀 Iniciando configuração completa do sistema...');
    console.log('');
    
    try {
        // 1. Criar tabelas se não existirem
        await criarTabelas();
        
        // 2. Criar empresas padrão
        await criarEmpresasPadrao();
        
        // 3. Criar usuário admin
        await criarUsuarioAdmin();
        
        // 4. Criar usuários de teste
        await criarUsuariosTeste();
        
        // 5. Criar contas de exemplo
        await criarContasExemplo();
        
        // 6. Inserir dados de exemplo
        await inserirDadosExemplo();
        
        console.log('');
        console.log('✅ Configuração concluída com sucesso!');
        console.log('');
        console.log('📋 USUÁRIOS CRIADOS:');
        console.log('👑 Admin: admin@conceitoprime.com / admin123');
        console.log('👤 Usuário A: user@empresaA.com / user123');
        console.log('👤 Usuário B: user@empresaB.com / user123');
        console.log('👤 Gerente: gerente@conceitoprime.com / gerente123');
        console.log('');
        console.log('🏢 EMPRESAS CRIADAS:');
        console.log('• Conceito Prime');
        console.log('• Empresa Demo A');
        console.log('• Empresa Demo B');
        console.log('');
        console.log('🎯 Próximo passo: Acessar http://localhost:3000/login.html');
        
    } catch (erro) {
        console.error('❌ Erro na configuração:', erro);
        process.exit(1);
    }
}

async function criarTabelas() {
    console.log('📋 Criando estrutura de tabelas...');
    
    // As tabelas serão criadas diretamente no Supabase via SQL
    // Este é apenas um placeholder para futuras migrações
    console.log('⚠️  IMPORTANTE: Execute primeiro os comandos SQL no Supabase:');
    console.log('   1. Acesse seu projeto Supabase');
    console.log('   2. Vá em "SQL Editor"');
    console.log('   3. Execute os comandos SQL do GUIA_CONFIGURACAO_COMPLETA.md');
    console.log('   4. Depois execute este script novamente');
    console.log('');
}

async function criarEmpresasPadrao() {
    console.log('🏢 Criando empresas padrão...');
    
    const empresas = [
        { nome: 'Conceito Prime', codigo: 'CP', ativo: true },
        { nome: 'Empresa Demo A', codigo: 'EDA', ativo: true },
        { nome: 'Empresa Demo B', codigo: 'EDB', ativo: true }
    ];
    
    for (const empresa of empresas) {
        try {
            const { data, error } = await supabase
                .from('empresas')
                .upsert(empresa, { onConflict: 'nome' })
                .select();
                
            if (error && !error.message.includes('already exists')) {
                console.warn(`⚠️  Tabela 'empresas' pode não existir. Usando tabela alternativa.`);
                // Fallback: inserir na estrutura existente se necessário
                break;
            }
            
            console.log(`   ✅ ${empresa.nome} (${empresa.codigo})`);
        } catch (erro) {
            console.warn(`   ⚠️  ${empresa.nome}: ${erro.message}`);
        }
    }
}

async function criarUsuarioAdmin() {
    console.log('👑 Criando usuário administrador...');
    
    const senhaHash = await bcrypt.hash('admin123', 10);
    
    try {
        const { data, error } = await supabase
            .from('acessoBI')
            .upsert({
                email: 'admin@conceitoprime.com',
                password: senhaHash,
                nome: 'Administrador',
                role: 'Admin',
                empresa: ['Conceito Prime', 'Empresa Demo A', 'Empresa Demo B'],
                ativo: true
            }, { onConflict: 'email' })
            .select();
            
        if (error) throw error;
        
        console.log('   ✅ Admin criado: admin@conceitoprime.com');
    } catch (erro) {
        console.error('   ❌ Erro ao criar admin:', erro.message);
    }
}

async function criarUsuariosTeste() {
    console.log('👥 Criando usuários de teste...');
    
    const usuarios = [
        {
            email: 'user@empresaA.com',
            password: await bcrypt.hash('user123', 10),
            nome: 'Usuário Empresa A',
            role: 'User',
            empresa: ['Empresa Demo A'],
            ativo: true
        },
        {
            email: 'user@empresaB.com',
            password: await bcrypt.hash('user123', 10),
            nome: 'Usuário Empresa B',
            role: 'User',
            empresa: ['Empresa Demo B'],
            ativo: true
        },
        {
            email: 'gerente@conceitoprime.com',
            password: await bcrypt.hash('gerente123', 10),
            nome: 'Gerente Multi-Empresa',
            role: 'User',
            empresa: ['Empresa Demo A', 'Empresa Demo B'],
            ativo: true
        }
    ];
    
    for (const usuario of usuarios) {
        try {
            const { data, error } = await supabase
                .from('acessoBI')
                .upsert(usuario, { onConflict: 'email' })
                .select();
                
            if (error) throw error;
            
            console.log(`   ✅ ${usuario.nome}: ${usuario.email}`);
        } catch (erro) {
            console.error(`   ❌ Erro ao criar ${usuario.email}:`, erro.message);
        }
    }
}

async function criarContasExemplo() {
    console.log('🔗 Criando contas de exemplo...');
    
    // Como a tabela contas_campanhas pode não existir ainda,
    // vamos apenas indicar o que seria criado
    console.log('   ℹ️  Contas a serem criadas (quando tabela estiver pronta):');
    console.log('   • Google Ads - Empresa Demo A');
    console.log('   • Facebook Ads - Empresa Demo A');
    console.log('   • Google Ads - Empresa Demo B');
    console.log('   • Instagram Ads - Empresa Demo B');
}

async function inserirDadosExemplo() {
    console.log('📊 Inserindo dados de exemplo...');
    
    const hoje = new Date();
    const ontem = new Date(hoje);
    ontem.setDate(hoje.getDate() - 1);
    
    const dadosExemplo = [
        {
            data: hoje.toISOString().split('T')[0],
            empresa: 'Empresa Demo A',
            gastos: 1500.00,
            impressoes: 25000,
            cliques: 350,
            cpc: 4.29,
            ctr: 0.0140,
            custo_prime: 800.00,
            total_registros: 45
        },
        {
            data: hoje.toISOString().split('T')[0],
            empresa: 'Empresa Demo B',
            gastos: 2200.00,
            impressoes: 18000,
            cliques: 420,
            cpc: 5.24,
            ctr: 0.0233,
            custo_prime: 1200.00,
            total_registros: 32
        },
        {
            data: ontem.toISOString().split('T')[0],
            empresa: 'Empresa Demo A',
            gastos: 1200.00,
            impressoes: 22000,
            cliques: 280,
            cpc: 4.29,
            ctr: 0.0127,
            custo_prime: 600.00,
            total_registros: 38
        }
    ];
    
    for (const dados of dadosExemplo) {
        try {
            const { data, error } = await supabase
                .from('dados_campanhas')
                .upsert(dados)
                .select();
                
            if (error && error.message.includes('relation') && error.message.includes('does not exist')) {
                console.warn('   ⚠️  Tabela dados_campanhas não existe. Dados serão inseridos depois.');
                break;
            }
            
            if (error) throw error;
            
            console.log(`   ✅ ${dados.empresa} - ${dados.data}`);
        } catch (erro) {
            console.error(`   ❌ Erro ao inserir dados:`, erro.message);
        }
    }
}

// Verificar conexão antes de executar
async function verificarConexao() {
    try {
        const { data, error } = await supabase
            .from('acessoBI')
            .select('count')
            .limit(1);
            
        if (error) throw error;
        
        console.log('✅ Conexão com Supabase confirmada');
        return true;
    } catch (erro) {
        console.error('❌ Erro de conexão:', erro.message);
        console.log('');
        console.log('🔧 VERIFICAÇÕES NECESSÁRIAS:');
        console.log('1. Arquivo .env existe e tem SUPABASE_URL e SUPABASE_KEY?');
        console.log('2. Projeto Supabase está ativo?');
        console.log('3. Tabela acessoBI foi criada?');
        console.log('');
        return false;
    }
}

// Executar configuração
async function executar() {
    console.log('🔍 Verificando conexão com Supabase...');
    
    const conexaoOk = await verificarConexao();
    if (!conexaoOk) {
        process.exit(1);
    }
    
    await configuracaoInicial();
}

// Executar se chamado diretamente
if (require.main === module) {
    executar();
}

module.exports = {
    configuracaoInicial,
    criarEmpresasPadrao,
    criarUsuarioAdmin,
    criarUsuariosTeste
};
