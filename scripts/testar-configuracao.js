const { supabase } = require('../src/config/supabase');

async function testarConfiguracao() {
    console.log('🔍 Testando configuração do sistema...');
    console.log('');
    
    let tudoOk = true;
    
    try {
        // 1. Testar conexão básica
        console.log('1️⃣ Testando conexão com Supabase...');
        await testarConexao();
        
        // 2. Testar estrutura de tabelas
        console.log('2️⃣ Verificando estrutura de tabelas...');
        await verificarTabelas();
        
        // 3. Testar usuários
        console.log('3️⃣ Verificando usuários...');
        await verificarUsuarios();
        
        // 4. Testar empresas
        console.log('4️⃣ Verificando empresas...');
        await verificarEmpresas();
        
        // 5. Testar dados
        console.log('5️⃣ Verificando dados...');
        await verificarDados();
        
        // 6. Testar permissões
        console.log('6️⃣ Testando permissões...');
        await testarPermissoes();
        
        console.log('');
        if (tudoOk) {
            console.log('✅ Todos os testes passaram! Sistema configurado corretamente.');
        } else {
            console.log('⚠️  Alguns testes falharam. Verifique os detalhes acima.');
        }
        
    } catch (erro) {
        console.error('❌ Erro durante os testes:', erro);
        tudoOk = false;
    }
    
    return tudoOk;
}

async function testarConexao() {
    try {
        const { data, error } = await supabase
            .from('acessoBI')
            .select('count')
            .limit(1);
            
        if (error) throw error;
        
        console.log('   ✅ Conexão estabelecida');
        return true;
    } catch (erro) {
        console.error('   ❌ Falha na conexão:', erro.message);
        console.log('      🔧 Verifique: .env, SUPABASE_URL, SUPABASE_KEY');
        return false;
    }
}

async function verificarTabelas() {
    const tabelas = ['acessoBI', 'empresas', 'contas_campanhas', 'dados_campanhas'];
    let todasExistem = true;
    
    for (const tabela of tabelas) {
        try {
            const { data, error } = await supabase
                .from(tabela)
                .select('*')
                .limit(1);
                
            if (error && error.message.includes('does not exist')) {
                console.log(`   ❌ Tabela '${tabela}' não existe`);
                todasExistem = false;
            } else if (error) {
                console.log(`   ⚠️  Tabela '${tabela}': ${error.message}`);
            } else {
                console.log(`   ✅ Tabela '${tabela}' ok`);
            }
        } catch (erro) {
            console.log(`   ❌ Erro ao verificar '${tabela}': ${erro.message}`);
            todasExistem = false;
        }
    }
    
    if (!todasExistem) {
        console.log('      🔧 Execute: scripts/criar-tabelas.sql no Supabase');
    }
    
    return todasExistem;
}

async function verificarUsuarios() {
    try {
        const { data, error } = await supabase
            .from('acessoBI')
            .select('email, nome, role, empresa, ativo');
            
        if (error) throw error;
        
        console.log(`   📊 Total de usuários: ${data.length}`);
        
        const admin = data.find(u => u.role === 'Admin');
        if (admin) {
            console.log(`   👑 Admin encontrado: ${admin.email}`);
        } else {
            console.log('   ⚠️  Nenhum admin encontrado');
        }
        
        const usuarios = data.filter(u => u.role === 'User');
        console.log(`   👤 Usuários normais: ${usuarios.length}`);
        
        // Listar usuários
        data.forEach(user => {
            const empresas = Array.isArray(user.empresa) ? user.empresa.join(', ') : user.empresa;
            console.log(`      • ${user.email} (${user.role}) - ${empresas}`);
        });
        
        return true;
    } catch (erro) {
        console.error('   ❌ Erro ao verificar usuários:', erro.message);
        return false;
    }
}

async function verificarEmpresas() {
    try {
        // Tentar tabela empresas primeiro
        let { data, error } = await supabase
            .from('empresas')
            .select('nome, codigo, ativo');
            
        if (error && error.message.includes('does not exist')) {
            console.log('   ⚠️  Tabela empresas não existe, verificando dados_campanhas...');
            
            // Fallback: buscar empresas únicas em dados_campanhas
            const { data: dadosEmpresas, error: erroDados } = await supabase
                .from('dados_campanhas')
                .select('empresa')
                .neq('empresa', null);
                
            if (erroDados) throw erroDados;
            
            const empresasUnicas = [...new Set(dadosEmpresas.map(d => d.empresa))];
            console.log(`   📊 Empresas encontradas em dados: ${empresasUnicas.length}`);
            empresasUnicas.forEach(empresa => {
                console.log(`      • ${empresa}`);
            });
            
        } else if (error) {
            throw error;
        } else {
            console.log(`   📊 Total de empresas: ${data.length}`);
            data.forEach(empresa => {
                const status = empresa.ativo ? '✅' : '❌';
                console.log(`      ${status} ${empresa.nome} (${empresa.codigo})`);
            });
        }
        
        return true;
    } catch (erro) {
        console.error('   ❌ Erro ao verificar empresas:', erro.message);
        return false;
    }
}

async function verificarDados() {
    try {
        const { data, error } = await supabase
            .from('dados_campanhas')
            .select('empresa, data, gastos, impressoes, cliques')
            .order('data', { ascending: false })
            .limit(10);
            
        if (error) throw error;
        
        console.log(`   📊 Total de registros encontrados: ${data.length}`);
        
        if (data.length > 0) {
            console.log('   📅 Últimos registros:');
            data.slice(0, 5).forEach(registro => {
                console.log(`      • ${registro.data} - ${registro.empresa} - R$ ${registro.gastos}`);
            });
            
            // Estatísticas básicas
            const totalGastos = data.reduce((sum, r) => sum + (parseFloat(r.gastos) || 0), 0);
            const totalImpr = data.reduce((sum, r) => sum + (parseInt(r.impressoes) || 0), 0);
            const totalCliques = data.reduce((sum, r) => sum + (parseInt(r.cliques) || 0), 0);
            
            console.log(`   💰 Total gastos (amostra): R$ ${totalGastos.toFixed(2)}`);
            console.log(`   👁️  Total impressões (amostra): ${totalImpr.toLocaleString()}`);
            console.log(`   👆 Total cliques (amostra): ${totalCliques.toLocaleString()}`);
        } else {
            console.log('   ⚠️  Nenhum dado encontrado');
            console.log('      🔧 Execute: node scripts/setup-inicial.js');
        }
        
        return true;
    } catch (erro) {
        console.error('   ❌ Erro ao verificar dados:', erro.message);
        return false;
    }
}

async function testarPermissoes() {
    try {
        // Buscar um usuário não-admin para testar
        const { data: usuarios, error } = await supabase
            .from('acessoBI')
            .select('email, empresa, role')
            .eq('role', 'User')
            .limit(1);
            
        if (error) throw error;
        
        if (usuarios.length === 0) {
            console.log('   ⚠️  Nenhum usuário regular encontrado para testar permissões');
            return true;
        }
        
        const usuario = usuarios[0];
        const empresasUsuario = Array.isArray(usuario.empresa) ? usuario.empresa : [usuario.empresa];
        
        console.log(`   🔐 Testando permissões para: ${usuario.email}`);
        console.log(`   🏢 Empresas permitidas: ${empresasUsuario.join(', ')}`);
        
        // Verificar se dados batem com permissões
        const { data: dadosUsuario } = await supabase
            .from('dados_campanhas')
            .select('empresa')
            .in('empresa', empresasUsuario);
            
        if (dadosUsuario && dadosUsuario.length > 0) {
            console.log(`   ✅ Usuário tem ${dadosUsuario.length} registros acessíveis`);
        } else {
            console.log('   ⚠️  Usuário não tem dados acessíveis');
        }
        
        return true;
    } catch (erro) {
        console.error('   ❌ Erro ao testar permissões:', erro.message);
        return false;
    }
}

// Função para teste rápido de login
async function testarLogin() {
    console.log('🔑 Testando sistema de login...');
    
    const AuthModel = require('../src/models/authModel');
    
    try {
        // Testar login admin
        console.log('   Testando login admin...');
        const admin = await AuthModel.login('admin@conceitoprime.com', 'admin123');
        
        if (admin) {
            console.log(`   ✅ Admin login ok: ${admin.email} (${admin.role})`);
        } else {
            console.log('   ❌ Admin login falhou');
        }
        
        // Testar login usuário
        console.log('   Testando login usuário...');
        const user = await AuthModel.login('user@empresaA.com', 'user123');
        
        if (user) {
            console.log(`   ✅ User login ok: ${user.email} (${user.role})`);
        } else {
            console.log('   ❌ User login falhou');
        }
        
    } catch (erro) {
        console.error('   ❌ Erro no teste de login:', erro.message);
    }
}

// Executar testes
async function executar() {
    const sistemaOk = await testarConfiguracao();
    
    console.log('');
    console.log('🔑 Teste adicional de login:');
    await testarLogin();
    
    console.log('');
    console.log('📋 RESUMO DOS TESTES:');
    console.log(sistemaOk ? '✅ Sistema pronto para uso!' : '❌ Sistema precisa de configuração');
    
    if (sistemaOk) {
        console.log('');
        console.log('🚀 PRÓXIMOS PASSOS:');
        console.log('1. Iniciar servidor: npm start ou node src/index.js');
        console.log('2. Acessar: http://localhost:3000/login.html');
        console.log('3. Login: admin@conceitoprime.com / admin123');
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    executar();
}

module.exports = {
    testarConfiguracao,
    testarLogin,
    verificarTabelas,
    verificarUsuarios
};
