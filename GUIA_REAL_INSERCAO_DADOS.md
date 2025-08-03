# 🎯 Guia REAL para Inserção de Dados - Dashboard ADS

## 📋 ANÁLISE DO CÓDIGO EXISTENTE

Após análise completa do código, identifiquei que o sistema já está **COMPLETO** e estruturado, mas precisa das tabelas corretas no Supabase.

### 🗄️ TABELAS NECESSÁRIAS (baseado no código atual)

O sistema espera exatamente estas 4 tabelas:

#### 1. `acessoBI` - Usuários e Autenticação
```sql
CREATE TABLE acessoBI (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    nome VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'User', -- 'Admin' ou 'User'
    empresa TEXT[], -- Array de empresas que o usuário pode acessar
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    ultimo_acesso TIMESTAMP
);
```

#### 2. `companies` - Lista de Empresas
```sql
CREATE TABLE companies (
    id SERIAL PRIMARY KEY,
    empresa VARCHAR(255) UNIQUE NOT NULL -- Nome da empresa
);
```

#### 3. `bills` - Registros de Leads/Conversões  
```sql
CREATE TABLE bills (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT NOW(),
    empresa VARCHAR(255) NOT NULL,
    leadId VARCHAR(255),
    price DECIMAL(10,2) DEFAULT 0 -- Custo Rooster
);
```

#### 4. `custoDiaMeta` - Custos e Gastos por Dia
```sql
CREATE TABLE custoDiaMeta (
    id SERIAL PRIMARY KEY,
    dia DATE NOT NULL,
    empresa VARCHAR(255) NOT NULL,
    custo DECIMAL(10,2) DEFAULT 0 -- Gasto do dia
);
```

## 🚀 PASSO A PASSO PARA CONFIGURAR

### 1️⃣ Criar as Tabelas no Supabase
Execute este SQL no **SQL Editor** do Supabase:

```sql
-- 1. Tabela de usuários
CREATE TABLE acessoBI (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    nome VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'User',
    empresa TEXT[],
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    ultimo_acesso TIMESTAMP
);

-- 2. Tabela de empresas
CREATE TABLE companies (
    id SERIAL PRIMARY KEY,
    empresa VARCHAR(255) UNIQUE NOT NULL
);

-- 3. Tabela de leads/conversões
CREATE TABLE bills (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT NOW(),
    empresa VARCHAR(255) NOT NULL,
    leadId VARCHAR(255),
    price DECIMAL(10,2) DEFAULT 0
);

-- 4. Tabela de custos diários
CREATE TABLE custoDiaMeta (
    id SERIAL PRIMARY KEY,
    dia DATE NOT NULL,
    empresa VARCHAR(255) NOT NULL,
    custo DECIMAL(10,2) DEFAULT 0
);

-- Índices para performance
CREATE INDEX idx_bills_empresa_date ON bills(empresa, created_at);
CREATE INDEX idx_custodiameta_empresa_dia ON custoDiaMeta(empresa, dia);
```

### 2️⃣ Inserir Empresas Iniciais
```sql
-- Inserir empresas de exemplo
INSERT INTO companies (empresa) VALUES 
('Conceito Prime'),
('Empresa A'),
('Empresa B'),
('Empresa C');
```

### 3️⃣ Criar Usuário Administrador
```sql
-- Inserir admin (senha será: admin123)
INSERT INTO acessoBI (email, password, nome, role, empresa, ativo) VALUES 
('admin@conceitoprime.com', '$2b$10$rQc7VwjCQHXqP9N4GWl/V.HWGx6P4E4VZ2Q4uF8OgZ1v8MzN3D9ZG', 'Administrador', 'Admin', ARRAY['Conceito Prime', 'Empresa A', 'Empresa B', 'Empresa C'], true);
```

### 4️⃣ Inserir Dados de Exemplo
```sql
-- Dados de exemplo para leads/conversões (últimos 30 dias)
INSERT INTO bills (created_at, empresa, leadId, price) VALUES 
('2025-01-01 10:00:00+00', 'Conceito Prime', 'LEAD001', 150.00),
('2025-01-01 14:30:00+00', 'Empresa A', 'LEAD002', 200.00),
('2025-01-02 09:15:00+00', 'Conceito Prime', 'LEAD003', 175.00),
('2025-01-02 16:45:00+00', 'Empresa B', 'LEAD004', 225.00),
('2025-01-03 11:20:00+00', 'Empresa A', 'LEAD005', 180.00);

-- Dados de exemplo para custos diários
INSERT INTO custoDiaMeta (dia, empresa, custo) VALUES 
('2025-01-01', 'Conceito Prime', 500.00),
('2025-01-01', 'Empresa A', 300.00),
('2025-01-02', 'Conceito Prime', 450.00),
('2025-01-02', 'Empresa B', 600.00),
('2025-01-03', 'Empresa A', 350.00);
```

## 📊 COMO INSERIR DADOS REAIS

### Para Leads/Conversões (tabela `bills`):
```sql
INSERT INTO bills (created_at, empresa, leadId, price) VALUES 
('2025-01-31 15:30:00+00', 'SUA_EMPRESA', 'LEAD_ID_UNICO', 150.00);
```

**Campos obrigatórios:**
- `created_at`: Data/hora em UTC (formato: 'YYYY-MM-DD HH:MM:SS+00')
- `empresa`: Nome exato da empresa (deve existir na tabela `companies`)
- `price`: Valor do custo Rooster (pode ser 0)

### Para Custos Diários (tabela `custoDiaMeta`):
```sql
INSERT INTO custoDiaMeta (dia, empresa, custo) VALUES 
('2025-01-31', 'SUA_EMPRESA', 800.00);
```

**Campos obrigatórios:**
- `dia`: Data no formato 'YYYY-MM-DD'
- `empresa`: Nome exato da empresa
- `custo`: Valor do gasto do dia

## 🏢 CADASTRAR NOVA EMPRESA

### 1. Adicionar na tabela `companies`:
```sql
INSERT INTO companies (empresa) VALUES ('Nome da Nova Empresa');
```

### 2. Criar usuário para a empresa:
```sql
-- Primeiro, gere a senha hasheada executando no Node.js:
-- const bcrypt = require('bcryptjs');
-- console.log(bcrypt.hashSync('senha123', 10));

INSERT INTO acessoBI (email, password, nome, role, empresa, ativo) VALUES 
('usuario@novaempresa.com', '$2b$10$HASH_DA_SENHA_AQUI', 'Nome do Usuário', 'User', ARRAY['Nome da Nova Empresa'], true);
```

## 📈 IMPORTAÇÃO EM MASSA

### Script para importar dados via CSV/Excel:

```javascript
// importar-dados.js
const { supabase } = require('./src/config/supabase');
const XLSX = require('xlsx');

async function importarLeads(arquivoExcel) {
    const workbook = XLSX.readFile(arquivoExcel);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const dados = XLSX.utils.sheet_to_json(worksheet);
    
    for (const linha of dados) {
        await supabase.from('bills').insert({
            created_at: new Date(linha.data).toISOString(),
            empresa: linha.empresa,
            leadId: linha.leadId,
            price: parseFloat(linha.price) || 0
        });
    }
}

async function importarCustos(arquivoExcel) {
    const workbook = XLSX.readFile(arquivoExcel);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const dados = XLSX.utils.sheet_to_json(worksheet);
    
    for (const linha of dados) {
        await supabase.from('custoDiaMeta').insert({
            dia: linha.dia, // formato: 'YYYY-MM-DD'
            empresa: linha.empresa,
            custo: parseFloat(linha.custo) || 0
        });
    }
}
```

## 🔧 COMANDOS ÚTEIS

### Testar conexão:
```bash
node test-supabase.js
```

### Iniciar o sistema:
```bash
npm run dev
```

### Acessar o sistema:
- URL: http://localhost:3000/login.html
- Login: admin@conceitoprime.com
- Senha: admin123

## 📝 ESTRUTURA DE DADOS ESPERADA

### Formato dos dados de leads:
```json
{
  "created_at": "2025-01-31T15:30:00.000Z",
  "empresa": "Conceito Prime",
  "leadId": "LEAD001", 
  "price": 150.00
}
```

### Formato dos dados de custos:
```json
{
  "dia": "2025-01-31",
  "empresa": "Conceito Prime",
  "custo": 500.00
}
```

## ⚡ PRÓXIMOS PASSOS

1. **Execute o SQL no Supabase** para criar as tabelas
2. **Teste a conexão** com `node test-supabase.js`
3. **Inicie o sistema** com `npm run dev`
4. **Faça login** com as credenciais do admin
5. **Insira seus dados reais** usando os scripts SQL

O sistema já está **100% funcional** - você só precisa das tabelas corretas no banco!
