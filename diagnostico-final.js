// DIAGNÓSTICO FINAL: Problema de criação de usuário
console.log('🔍 DIAGNÓSTICO FINAL - Criação de Usuário');
console.log('==========================================\n');

async function diagnosticoCompleto() {
  const testes = [];
  
  try {
    // 1. Teste básico do banco
    console.log('1️⃣ TESTE: Conexão direta com banco...');
    const { supabase } = require('./src/config/supabase');
    
    const { data: testDB, error: errorDB } = await supabase
      .from('acessobi')
      .select('count');
      
    if (errorDB) {
      testes.push({ nome: 'Conexão DB', status: '❌', erro: errorDB.message });
    } else {
      testes.push({ nome: 'Conexão DB', status: '✅', info: 'OK' });
    }
    
    // 2. Teste do AuthModel
    console.log('2️⃣ TESTE: AuthModel.createUser...');
    const AuthModel = require('./src/models/authModel');
    
    const dadosModel = {
      nome: 'Teste AuthModel',
      email: `authmodel_${Date.now()}@teste.com`,
      password: '123456',
      empresa: ['Marcos'],
      role: 'user'
    };
    
    try {
      const resultModel = await AuthModel.createUser(dadosModel);
      if (resultModel && resultModel.length > 0) {
        testes.push({ nome: 'AuthModel', status: '✅', info: `Usuário ${resultModel[0].email} criado` });
        // Limpar
        await AuthModel.deleteUser(dadosModel.email);
      } else {
        testes.push({ nome: 'AuthModel', status: '❌', erro: 'Retornou vazio' });
      }
    } catch (errModel) {
      testes.push({ nome: 'AuthModel', status: '❌', erro: errModel.message });
    }
    
    // 3. Teste do Controller
    console.log('3️⃣ TESTE: AuthController.createUser...');
    const AuthController = require('./src/controllers/authController');
    
    const dadosController = {
      nome: 'Teste Controller',
      email: `controller_${Date.now()}@teste.com`,
      password: '123456',
      empresa: ['Marcos'],
      role: 'user'
    };
    
    const req = {
      body: dadosController,
      session: { user: { email: 'admin@teste.com', role: 'Admin' } }
    };
    
    let controllerStatus = null;
    let controllerData = null;
    
    const res = {
      status: (code) => { controllerStatus = code; return res; },
      json: (data) => { controllerData = data; return res; }
    };
    
    try {
      await AuthController.createUser(req, res);
      if (controllerStatus === 201) {
        testes.push({ nome: 'AuthController', status: '✅', info: `Usuário ${controllerData.email} criado` });
        // Limpar
        await AuthModel.deleteUser(dadosController.email);
      } else {
        testes.push({ nome: 'AuthController', status: '❌', erro: controllerData?.error || `Status ${controllerStatus}` });
      }
    } catch (errController) {
      testes.push({ nome: 'AuthController', status: '❌', erro: errController.message });
    }
    
    // 4. Teste de diferentes formatos de empresa
    console.log('4️⃣ TESTE: Formatos de array empresa...');
    
    const formatosEmpresa = [
      { nome: 'Array simples', valor: ['Marcos'] },
      { nome: 'Array múltiplo', valor: ['Marcos', 'Conceito Prime'] },
      { nome: 'String simples', valor: 'Marcos' },
      { nome: 'Array vazio', valor: [] }
    ];
    
    for (const formato of formatosEmpresa) {
      try {
        const dadosTeste = {
          nome: `Teste ${formato.nome}`,
          email: `${formato.nome.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}@teste.com`,
          password: '123456',
          empresa: formato.valor,
          role: 'user'
        };
        
        // Garantir que empresa seja array (como faz o AuthModel)
        if (!Array.isArray(dadosTeste.empresa)) {
          dadosTeste.empresa = dadosTeste.empresa ? [dadosTeste.empresa] : [];
        }
        
        const resultado = await AuthModel.createUser(dadosTeste);
        if (resultado && resultado.length > 0) {
          testes.push({ nome: `Empresa ${formato.nome}`, status: '✅', info: 'OK' });
          await AuthModel.deleteUser(dadosTeste.email);
        } else {
          testes.push({ nome: `Empresa ${formato.nome}`, status: '❌', erro: 'Retornou vazio' });
        }
      } catch (err) {
        testes.push({ nome: `Empresa ${formato.nome}`, status: '❌', erro: err.message });
      }
    }
    
    // 5. Verificar estrutura da tabela
    console.log('5️⃣ TESTE: Estrutura da tabela...');
    try {
      const { data: estrutura, error: errEstrutura } = await supabase
        .from('acessobi')
        .select('*')
        .limit(1);
        
      if (errEstrutura) {
        testes.push({ nome: 'Estrutura tabela', status: '❌', erro: errEstrutura.message });
      } else if (estrutura && estrutura.length > 0) {
        const campos = Object.keys(estrutura[0]);
        const temNome = campos.includes('nome');
        const temEmpresa = campos.includes('empresa');
        
        testes.push({ 
          nome: 'Estrutura tabela', 
          status: '✅', 
          info: `Campos: ${campos.join(', ')}. Nome: ${temNome ? '✅' : '❌'}, Empresa: ${temEmpresa ? '✅' : '❌'}` 
        });
      } else {
        testes.push({ nome: 'Estrutura tabela', status: '⚠️', erro: 'Tabela vazia' });
      }
    } catch (err) {
      testes.push({ nome: 'Estrutura tabela', status: '❌', erro: err.message });
    }
    
  } catch (erro) {
    console.error('❌ ERRO GERAL:', erro.message);
  }
  
  // Relatório final
  console.log('\n📊 RELATÓRIO FINAL');
  console.log('==================');
  
  testes.forEach(teste => {
    console.log(`${teste.status} ${teste.nome}: ${teste.info || teste.erro || 'N/A'}`);
  });
  
  const sucessos = testes.filter(t => t.status === '✅').length;
  const falhas = testes.filter(t => t.status === '❌').length;
  
  console.log(`\nRESUMO: ${sucessos} sucessos, ${falhas} falhas de ${testes.length} testes`);
  
  if (falhas === 0) {
    console.log('\n🎉 TODOS OS TESTES BACKEND PASSARAM!');
    console.log('💡 O problema está na interface web (HTML/JavaScript)');
    console.log('🔧 Próximos passos:');
    console.log('   1. Verificar se o formulário HTML está capturando dados corretos');
    console.log('   2. Verificar se o JavaScript está enviando os dados corretos');
    console.log('   3. Verificar se há erros no console do navegador');
    console.log('   4. Verificar se o usuário admin está logado corretamente');
  } else {
    console.log('\n⚠️ HÁ PROBLEMAS NO BACKEND');
    console.log('🔧 Corrija os itens marcados com ❌ primeiro');
  }
}

diagnosticoCompleto().catch(console.error);
