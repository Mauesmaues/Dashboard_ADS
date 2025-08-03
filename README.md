# 📊 Dashboard ADS - Sistema de Business Intelligence

Sistema completo de Business Intelligence para análise de campanhas de marketing digital, com gestão de empresas, usuários e permissões granulares.

## ⚡ CONFIGURAÇÃO RÁPIDA

O sistema já está **100% funcional** - você só precisa criar as tabelas no Supabase!

### 🗄️ 1. Criar Tabelas no Supabase
Execute este SQL no **SQL Editor** do seu projeto Supabase:

```sql
-- Tabela de usuários e autenticação
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

-- Tabela de empresas
CREATE TABLE companies (
    id SERIAL PRIMARY KEY,
    empresa VARCHAR(255) UNIQUE NOT NULL
);

-- Tabela de mapeamento empresa x ad_account_id (N8N)
CREATE TABLE empresa_ad_accounts (
    id SERIAL PRIMARY KEY,
    empresa VARCHAR(255) NOT NULL REFERENCES companies(empresa),
    ad_account_id VARCHAR(255) NOT NULL,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(empresa, ad_account_id)
);

-- Tabela de leads/conversões
CREATE TABLE bills (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT NOW(),
    empresa VARCHAR(255) NOT NULL,
    leadId VARCHAR(255),
    price DECIMAL(10,2) DEFAULT 0
);

-- Tabela de custos diários
CREATE TABLE custoDiaMeta (
    id SERIAL PRIMARY KEY,
    dia DATE NOT NULL,
    empresa VARCHAR(255) NOT NULL,
    custo DECIMAL(10,2) DEFAULT 0
);

-- Dados iniciais
INSERT INTO companies (empresa) VALUES 
('Conceito Prime'), ('Empresa A'), ('Empresa B');

-- Mapeamento empresa x ad_account_id (exemplo com dados reais)
INSERT INTO empresa_ad_accounts (empresa, ad_account_id) VALUES 
('Conceito Prime', '1348060849739832'),
('Empresa A', '1234567890123456'),
('Empresa B', '9876543210987654'),
('Marcos', '1348060849739832');

INSERT INTO acessoBI (email, password, nome, role, empresa, ativo) VALUES 
('admin@conceitoprime.com', '$2b$10$rQc7VwjCQHXqP9N4GWl/V.HWGx6P4E4VZ2Q4uF8OgZ1v8MzN3D9ZG', 'Administrador', 'Admin', ARRAY['Conceito Prime', 'Empresa A', 'Empresa B'], true);
```

### ⚙️ 2. Configurar Variáveis
Edite o arquivo `.env`:
```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=sua-api-key-aqui
SESSION_SECRET=uma-chave-secreta-aleatoria
PORT=3000
```

### 🚀 3. Iniciar Sistema
```bash
# Testar conexão
node test-supabase.js

# Iniciar em desenvolvimento
npm run dev
```

### 🎯 4. Acessar Dashboard
- **URL**: http://localhost:3000/login.html
- **Login**: admin@conceitoprime.com  
- **Senha**: admin123

## 📊 INSERIR DADOS

### Para Leads/Conversões:
```sql
INSERT INTO bills (created_at, empresa, leadId, price) VALUES 
('2025-01-31T15:30:00+00', 'Conceito Prime', 'LEAD001', 150.00);
```

### Para Custos Diários:
```sql
INSERT INTO custoDiaMeta (dia, empresa, custo) VALUES 
('2025-01-31', 'Conceito Prime', 500.00);
```

### Para Nova Empresa:
```sql
INSERT INTO companies (empresa) VALUES ('Nova Empresa');
```

### Para Mapear Empresa com Ad Account ID (N8N):
```sql
-- Exemplo: mapear empresa "Marcos" com ad_account_id existente
INSERT INTO companies (empresa) VALUES ('Marcos')
ON CONFLICT (empresa) DO NOTHING;

INSERT INTO empresa_ad_accounts (empresa, ad_account_id) VALUES 
('Marcos', '1348060849739832')
ON CONFLICT (empresa, ad_account_id) DO NOTHING;
```

**📋 Consulte `GUIA_REAL_INSERCAO_DADOS.md` para instruções detalhadas de inserção de dados**

## 🔧 ESTRUTURA DO SISTEMA

### Backend (Node.js + Express)
- **Autenticação**: Sistema de login com sessões e bcrypt
- **Permissões**: Usuários Admin e User com acesso por empresa
- **API**: Endpoints RESTful para dados e autenticação
- **Timezone**: Conversão automática UTC ↔ Brasil (UTC-3)

### Frontend (HTML5 + Bootstrap 5)
- **Dashboard**: Visualização de métricas em tempo real
- **Filtros**: Por data e empresa com validação
- **Gráficos**: Chart.js para visualizações interativas
- **Export**: Dados para Excel com formatação

### Banco de Dados (Supabase/PostgreSQL)
- **4 Tabelas**: acessoBI, companies, bills, custoDiaMeta
- **Relacionamentos**: Filtros automáticos por empresa
- **Performance**: Índices otimizados para consultas rápidas

## 📈 MÉTRICAS CALCULADAS

- **Total Registros**: Contagem de leads/conversões
- **Gasto**: Soma da coluna `custo` da tabela `custoDiaMeta`
- **CPL Meta**: Total registros ÷ Gasto

## 🏢 GESTÃO DE EMPRESAS

Cada usuário pode ter acesso a uma ou múltiplas empresas:
- **Admin**: Acesso total a todas as empresas
- **User**: Acesso limitado às empresas definidas no cadastro
- **Filtros**: Automáticos baseados nas permissões do usuário

## 🛠️ COMANDOS ÚTEIS

```bash
# Testar conexão
node test-supabase.js

# Desenvolvimento
npm run dev

# Produção
npm start

# Testar autenticação
node debug-auth.js
```

## 📋 ESTRUTURA DE ARQUIVOS

```
Dashboard_ADS/
├── src/
│   ├── config/supabase.js      # Conexão Supabase
│   ├── controllers/            # Lógica de negócio
│   ├── models/                 # Acesso a dados
│   ├── middleware/             # Autenticação/autorização
│   └── routes/                 # Rotas da API
├── public/
│   ├── index.html              # Dashboard principal
│   ├── login.html              # Página de login
│   ├── js/app.js               # Frontend logic
│   └── css/styles.css          # Estilos
├── GUIA_REAL_INSERCAO_DADOS.md # 👈 GUIA COMPLETO
└── README.md                   # Este arquivo
```

### 5️⃣ Executar Configuração Automática
```bash
# Configurar sistema completo
npm run setup

# Testar configuração
npm run test-config

# Testar conexão banco
npm run test-db
```

### 6️⃣ Iniciar Sistema
```bash
# Desenvolvimento (com auto-reload)
npm run dev

# Produção
npm start
```

Acesse: http://localhost:3000/login.html

2. Instale as dependências
```
npm install
```

3. Configure as variáveis de ambiente
Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:
```
SUPABASE_URL=sua_url_supabase
SUPABASE_KEY=sua_chave_supabase
PORT=3000
```

4. Inicie o servidor de desenvolvimento
```
npm run dev
```

5. Acesse http://localhost:3000 no navegador

## Estrutura da Base de Dados

O sistema espera as seguintes tabelas/estruturas no Supabase:

- **registros**: contém os dados de leads/conversões
- **empresas**: lista de empresas/clientes disponíveis
- **custos**: informações de custos e gastos
- **metas**: metas de CPL e outras métricas

## Desenvolvimento

Para mais detalhes sobre o desenvolvimento, consulte o arquivo `planejamento_projeto.md`.
