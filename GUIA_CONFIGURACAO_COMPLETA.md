# 🔐 Guia Completo de Configuração - Filtros, Empresas e Acessos

## 🎯 Configuração Passo a Passo do Sistema

### 📋 1. ESTRUTURA COMPLETA DO BANCO DE DADOS

#### Tabela de Usuários e Acessos: `acessoBI`
```sql
CREATE TABLE acessoBI (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    nome VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'User', -- 'Admin' ou 'User'
    empresa TEXT[], -- Array de empresas que o usuário pode acessar
    ativo BOOLEAN DEFAULT true,
    data_criacao TIMESTAMP DEFAULT NOW(),
    ultimo_acesso TIMESTAMP,
    observacoes TEXT
);
```

#### Tabela de Empresas: `empresas`
```sql
CREATE TABLE empresas (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) UNIQUE NOT NULL,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    ativo BOOLEAN DEFAULT true,
    data_criacao TIMESTAMP DEFAULT NOW(),
    configuracoes JSONB DEFAULT '{}',
    observacoes TEXT
);
```

#### Tabela de Contas/Campanhas: `contas_campanhas`
```sql
CREATE TABLE contas_campanhas (
    id SERIAL PRIMARY KEY,
    empresa_id INTEGER REFERENCES empresas(id),
    nome_conta VARCHAR(255) NOT NULL,
    plataforma VARCHAR(100) NOT NULL, -- 'Google Ads', 'Facebook', 'Instagram', etc.
    conta_id VARCHAR(255), -- ID da conta na plataforma
    ativo BOOLEAN DEFAULT true,
    data_criacao TIMESTAMP DEFAULT NOW(),
    configuracoes JSONB DEFAULT '{}',
    observacoes TEXT
);
```

#### Tabela de Dados de Campanhas: `dados_campanhas`
```sql
CREATE TABLE dados_campanhas (
    id SERIAL PRIMARY KEY,
    data DATE NOT NULL,
    empresa_id INTEGER REFERENCES empresas(id),
    conta_campanha_id INTEGER REFERENCES contas_campanhas(id),
    empresa VARCHAR(100) NOT NULL, -- Manter para compatibilidade
    gastos DECIMAL(10,2) DEFAULT 0,
    impressoes INTEGER DEFAULT 0,
    cliques INTEGER DEFAULT 0,
    cpc DECIMAL(10,4) DEFAULT 0,
    ctr DECIMAL(5,4) DEFAULT 0,
    custo_prime DECIMAL(10,2) DEFAULT 0,
    total_registros INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 🏢 2. CONFIGURAÇÃO DE EMPRESAS

#### A) Inserir Empresas no Sistema
```sql
-- Inserir empresas principais
INSERT INTO empresas (nome, codigo, ativo) VALUES
('Conceito Prime', 'CP', true),
('Empresa Cliente A', 'ECA', true),
('Empresa Cliente B', 'ECB', true),
('Empresa Cliente C', 'ECC', true);
```

#### B) Script para Adicionar Empresa via API
```javascript
// Endpoint: POST /api/admin/empresas
// Em src/controllers/adminController.js
static async criarEmpresa(req, res) {
    try {
        const { nome, codigo, ativo = true, observacoes } = req.body;
        
        // Verificar se usuário é admin
        if (req.session?.user?.role !== 'Admin') {
            return res.status(403).json({ erro: 'Acesso negado' });
        }
        
        const { data, error } = await supabase
            .from('empresas')
            .insert({
                nome,
                codigo,
                ativo,
                observacoes
            })
            .select()
            .single();
            
        if (error) throw error;
        
        res.json({ sucesso: true, empresa: data });
    } catch (erro) {
        res.status(500).json({ erro: erro.message });
    }
}
```

### 👥 3. CONFIGURAÇÃO DE USUÁRIOS E ACESSOS

#### A) Criar Usuário Administrador Inicial
```sql
-- Inserir admin principal (senha será hasheada pelo sistema)
INSERT INTO acessoBI (email, password, nome, role, empresa, ativo)
VALUES 
('admin@conceitoprime.com', '$2b$10$hash_da_senha', 'Administrador', 'Admin', ARRAY['Conceito Prime'], true);
```

#### B) Criar Usuários por Empresa
```sql
-- Usuário para Empresa Cliente A
INSERT INTO acessoBI (email, password, nome, role, empresa, ativo)
VALUES 
('user@empresaA.com', '$2b$10$hash_da_senha', 'Usuário Empresa A', 'User', ARRAY['Empresa Cliente A'], true);

-- Usuário para Empresa Cliente B
INSERT INTO acessoBI (email, password, nome, role, empresa, ativo)
VALUES 
('user@empresaB.com', '$2b$10$hash_da_senha', 'Usuário Empresa B', 'User', ARRAY['Empresa Cliente B'], true);

-- Usuário com acesso a múltiplas empresas
INSERT INTO acessoBI (email, password, nome, role, empresa, ativo)
VALUES 
('gerente@conceitoprime.com', '$2b$10$hash_da_senha', 'Gerente', 'User', ARRAY['Empresa Cliente A', 'Empresa Cliente B'], true);
```

### 🔑 4. SISTEMA DE FILTROS E PERMISSÕES

#### A) Filtro por Empresa no Frontend
```javascript
// Em public/js/app.js - Função para carregar empresas do usuário
async function carregarEmpresasUsuario() {
    try {
        const resposta = await fetch('/api/empresas', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });
        
        if (!resposta.ok) throw new Error('Erro ao carregar empresas');
        
        const empresas = await resposta.json();
        const selectEmpresa = document.getElementById('company-select');
        
        // Limpar opções existentes (exceto "Todas as Empresas")
        selectEmpresa.innerHTML = '<option value="">Todas as Empresas</option>';
        
        // Adicionar empresas do usuário
        empresas.forEach(empresa => {
            const option = document.createElement('option');
            option.value = empresa.nome || empresa.empresa;
            option.textContent = empresa.nome || empresa.empresa;
            selectEmpresa.appendChild(option);
        });
        
    } catch (erro) {
        console.error('Erro ao carregar empresas:', erro);
    }
}
```

#### B) Middleware de Verificação de Acesso
```javascript
// Em src/middleware/accessMiddleware.js
const verificarAcessoEmpresa = (req, res, next) => {
    const empresaSolicitada = req.query.company || req.body.empresa;
    const usuarioEmpresas = req.session?.user?.empresa || [];
    const usuarioRole = req.session?.user?.role;
    
    // Admin tem acesso a tudo
    if (usuarioRole === 'Admin') {
        return next();
    }
    
    // Se não especificou empresa, usuário pode ver suas empresas
    if (!empresaSolicitada) {
        return next();
    }
    
    // Verificar se usuário tem acesso à empresa solicitada
    if (!usuarioEmpresas.includes(empresaSolicitada)) {
        return res.status(403).json({
            erro: 'Acesso negado à empresa solicitada',
            empresasSolicitada: empresaSolicitada,
            empresasPermitidas: usuarioEmpresas
        });
    }
    
    next();
};

module.exports = { verificarAcessoEmpresa };
```

### 🏗️ 5. CONFIGURAÇÃO DE CONTAS E CAMPANHAS

#### A) Adicionar Contas por Empresa
```sql
-- Contas para Empresa Cliente A
INSERT INTO contas_campanhas (empresa_id, nome_conta, plataforma, conta_id, ativo)
VALUES 
(2, 'Google Ads - Cliente A', 'Google Ads', 'GA_12345', true),
(2, 'Facebook Ads - Cliente A', 'Facebook', 'FB_67890', true);

-- Contas para Empresa Cliente B
INSERT INTO contas_campanhas (empresa_id, nome_conta, plataforma, conta_id, ativo)
VALUES 
(3, 'Google Ads - Cliente B', 'Google Ads', 'GA_54321', true),
(3, 'Instagram Ads - Cliente B', 'Instagram', 'IG_09876', true);
```

#### B) API para Gerenciar Contas
```javascript
// Em src/controllers/contasController.js
class ContasController {
    // Listar contas por empresa
    static async listarContasPorEmpresa(req, res) {
        try {
            const { empresaId } = req.params;
            
            const { data, error } = await supabase
                .from('contas_campanhas')
                .select(`
                    *,
                    empresas!inner(nome, codigo)
                `)
                .eq('empresa_id', empresaId)
                .eq('ativo', true);
                
            if (error) throw error;
            
            res.json(data);
        } catch (erro) {
            res.status(500).json({ erro: erro.message });
        }
    }
    
    // Criar nova conta
    static async criarConta(req, res) {
        try {
            const { empresaId, nomeConta, plataforma, contaId } = req.body;
            
            const { data, error } = await supabase
                .from('contas_campanhas')
                .insert({
                    empresa_id: empresaId,
                    nome_conta: nomeConta,
                    plataforma,
                    conta_id: contaId,
                    ativo: true
                })
                .select()
                .single();
                
            if (error) throw error;
            
            res.json({ sucesso: true, conta: data });
        } catch (erro) {
            res.status(500).json({ erro: erro.message });
        }
    }
}
```

### 🎛️ 6. CONFIGURAÇÃO AVANÇADA DE FILTROS

#### A) Filtros Hierárquicos (Empresa > Conta > Campanha)
```javascript
// Em public/js/filters.js
class FiltrosAvancados {
    constructor() {
        this.selectEmpresa = document.getElementById('empresa-select');
        this.selectConta = document.getElementById('conta-select');
        this.selectCampanha = document.getElementById('campanha-select');
        
        this.configurarEventos();
    }
    
    configurarEventos() {
        this.selectEmpresa.addEventListener('change', () => {
            this.carregarContas();
        });
        
        this.selectConta.addEventListener('change', () => {
            this.carregarCampanhas();
        });
    }
    
    async carregarContas() {
        const empresaSelecionada = this.selectEmpresa.value;
        
        if (!empresaSelecionada) {
            this.limparSelect(this.selectConta);
            this.limparSelect(this.selectCampanha);
            return;
        }
        
        try {
            const resposta = await fetch(`/api/contas/empresa/${empresaSelecionada}`);
            const contas = await resposta.json();
            
            this.popularSelect(this.selectConta, contas, 'nome_conta', 'id');
            this.limparSelect(this.selectCampanha);
            
        } catch (erro) {
            console.error('Erro ao carregar contas:', erro);
        }
    }
    
    popularSelect(select, opcoes, textoField, valorField) {
        select.innerHTML = '<option value="">Selecione...</option>';
        
        opcoes.forEach(opcao => {
            const option = document.createElement('option');
            option.value = opcao[valorField];
            option.textContent = opcao[textoField];
            select.appendChild(option);
        });
    }
    
    limparSelect(select) {
        select.innerHTML = '<option value="">Selecione...</option>';
    }
}
```

### 📊 7. INSERÇÃO DE DADOS COM RELACIONAMENTOS

#### A) Inserir Dados Relacionados às Empresas
```javascript
// Script para importar dados com relacionamentos
async function inserirDadosRelacionados(dadosImportacao) {
    for (const linha of dadosImportacao) {
        // Buscar ID da empresa
        const { data: empresa } = await supabase
            .from('empresas')
            .select('id')
            .eq('nome', linha.nomeEmpresa)
            .single();
            
        if (!empresa) {
            console.error(`Empresa não encontrada: ${linha.nomeEmpresa}`);
            continue;
        }
        
        // Buscar ID da conta
        const { data: conta } = await supabase
            .from('contas_campanhas')
            .select('id')
            .eq('empresa_id', empresa.id)
            .eq('nome_conta', linha.nomeConta)
            .single();
            
        // Inserir dados da campanha
        await supabase
            .from('dados_campanhas')
            .insert({
                data: linha.data,
                empresa_id: empresa.id,
                conta_campanha_id: conta?.id,
                empresa: linha.nomeEmpresa, // Manter para compatibilidade
                gastos: linha.gastos,
                impressoes: linha.impressoes,
                cliques: linha.cliques,
                cpc: linha.gastos / linha.cliques,
                ctr: (linha.cliques / linha.impressoes) * 100,
                custo_prime: linha.custoPrime || 0,
                total_registros: linha.totalRegistros || 0
            });
    }
}
```

### 🔧 8. SCRIPTS DE CONFIGURAÇÃO AUTOMÁTICA

#### A) Script de Setup Inicial
```javascript
// scripts/setup-inicial.js
const { supabase } = require('../src/config/supabase');
const bcrypt = require('bcryptjs');

async function configuracaoInicial() {
    console.log('🚀 Iniciando configuração do sistema...');
    
    // 1. Criar empresas padrão
    await criarEmpresasPadrao();
    
    // 2. Criar usuário admin
    await criarUsuarioAdmin();
    
    // 3. Criar usuários de teste
    await criarUsuariosTeste();
    
    // 4. Criar contas de exemplo
    await criarContasExemplo();
    
    console.log('✅ Configuração concluída!');
}

async function criarEmpresasPadrao() {
    const empresas = [
        { nome: 'Conceito Prime', codigo: 'CP' },
        { nome: 'Empresa Demo A', codigo: 'EDA' },
        { nome: 'Empresa Demo B', codigo: 'EDB' }
    ];
    
    for (const empresa of empresas) {
        await supabase
            .from('empresas')
            .upsert(empresa, { onConflict: 'nome' });
    }
    
    console.log('✅ Empresas criadas');
}

async function criarUsuarioAdmin() {
    const senhaHash = await bcrypt.hash('admin123', 10);
    
    await supabase
        .from('acessoBI')
        .upsert({
            email: 'admin@conceitoprime.com',
            password: senhaHash,
            nome: 'Administrador',
            role: 'Admin',
            empresa: ['Conceito Prime', 'Empresa Demo A', 'Empresa Demo B'],
            ativo: true
        }, { onConflict: 'email' });
        
    console.log('✅ Usuário admin criado');
    console.log('📧 Email: admin@conceitoprime.com');
    console.log('🔑 Senha: admin123');
}
```

### 🎯 9. CHECKLIST DE CONFIGURAÇÃO

```
□ 1. Configurar Supabase e criar todas as tabelas
□ 2. Executar script de configuração inicial
□ 3. Criar empresas no sistema
□ 4. Configurar usuários e suas permissões
□ 5. Associar usuários às empresas corretas
□ 6. Criar contas/campanhas para cada empresa
□ 7. Testar filtros de acesso
□ 8. Inserir dados de teste
□ 9. Validar permissões de cada usuário
□ 10. Configurar automação de dados
```

### 🔄 10. COMANDOS PARA EXECUÇÃO

#### A) Executar Setup Inicial
```bash
# No terminal, na pasta do projeto
cd c:\Users\yboos\gitClones\Dashboard_ADS
node scripts/setup-inicial.js
```

#### B) Testar Configuração
```bash
# Testar conexão com Supabase
node test-supabase.js

# Testar autenticação
node test-auth.js
```

### 🚨 11. SOLUÇÃO DE PROBLEMAS COMUNS

#### Erro: "Usuário não tem acesso à empresa"
- ✅ Verificar array `empresa` na tabela `acessoBI`
- ✅ Confirmar que o nome da empresa está exato
- ✅ Verificar se usuário tem role adequado

#### Erro: "Dados não aparecem para usuário"
- ✅ Verificar filtros de empresa no frontend
- ✅ Confirmar middleware de acesso
- ✅ Verificar logs do servidor

#### Erro: "Filtros não funcionam"
- ✅ Verificar JavaScript no console
- ✅ Confirmar endpoints da API
- ✅ Testar permissões de usuário

---

💡 **Dica:** Execute sempre o script de setup inicial antes de configurar dados de produção!
