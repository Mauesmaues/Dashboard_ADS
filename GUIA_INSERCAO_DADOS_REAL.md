# 📊 Guia Prático de Inserção de Dados - Dashboard ADS

## 🔍 Análise da Estrutura Atual

Após análise completa do código, o sistema já está **COMPLETO** e usa as seguintes tabelas reais no Supabase:

### 📋 Tabelas Existentes

#### 1. **bills** - Registros de Leads/Conversões
```sql
Colunas principais:
- created_at (timestamp) - Data/hora do registro
- empresa (text) - Nome da empresa
- leadId (text) - ID único do lead
- price (numeric) - Valor do custo Rooster/Prime
```

#### 2. **custoDiaMeta** - Custos por Dia
```sql
Colunas principais:
- dia (date) - Data do custo
- empresa (text) - Nome da empresa  
- custo (numeric) - Valor do gasto diário
```

#### 3. **companies** - Lista de Empresas
```sql
Colunas principais:
- empresa (text) - Nome da empresa (chave única)
```

#### 4. **acessoBI** - Usuários do Sistema
```sql
Colunas principais:
- email (text) - Email do usuário
- password (text) - Senha criptografada
- role (text) - 'Admin' ou 'User'
- empresa (text[]) - Array de empresas permitidas
- ativo (boolean) - Se está ativo
```

---

## 📝 Como Inserir Dados

### 1️⃣ Cadastrar Empresas

**No SQL Editor do Supabase:**
```sql
-- Inserir nova empresa
INSERT INTO companies (empresa) VALUES ('Nome da Empresa');

-- Exemplo:
INSERT INTO companies (empresa) VALUES ('Marketing Digital LTDA');
INSERT INTO companies (empresa) VALUES ('Vendas Online S.A.');
```

### 2️⃣ Inserir Custos Diários

**No SQL Editor do Supabase:**
```sql
-- Inserir custo para uma empresa em uma data específica
INSERT INTO custoDiaMeta (dia, empresa, custo) 
VALUES ('2025-01-15', 'Marketing Digital LTDA', 1500.00);

-- Inserir múltiplos custos
INSERT INTO custoDiaMeta (dia, empresa, custo) VALUES
('2025-01-15', 'Marketing Digital LTDA', 1500.00),
('2025-01-16', 'Marketing Digital LTDA', 1200.00),
('2025-01-17', 'Marketing Digital LTDA', 1800.00),
('2025-01-15', 'Vendas Online S.A.', 2000.00),
('2025-01-16', 'Vendas Online S.A.', 1750.00);
```

### 3️⃣ Inserir Registros de Leads

**No SQL Editor do Supabase:**
```sql
-- Inserir lead individual
INSERT INTO bills (created_at, empresa, leadId, price) 
VALUES (NOW(), 'Marketing Digital LTDA', 'LEAD_001', 25.50);

-- Inserir múltiplos leads
INSERT INTO bills (created_at, empresa, leadId, price) VALUES
('2025-01-15 10:30:00', 'Marketing Digital LTDA', 'LEAD_001', 25.50),
('2025-01-15 14:20:00', 'Marketing Digital LTDA', 'LEAD_002', 30.00),
('2025-01-15 16:45:00', 'Marketing Digital LTDA', 'LEAD_003', 22.75),
('2025-01-16 09:15:00', 'Vendas Online S.A.', 'LEAD_004', 35.00),
('2025-01-16 11:30:00', 'Vendas Online S.A.', 'LEAD_005', 28.50);
```

### 4️⃣ Criar Usuários

**No SQL Editor do Supabase:**
```sql
-- Criar usuário administrador
INSERT INTO acessoBI (email, password, role, empresa, ativo) 
VALUES ('admin@empresa.com', '$2b$10$hash_da_senha', 'Admin', '{}', true);

-- Criar usuário com acesso a empresas específicas
INSERT INTO acessoBI (email, password, role, empresa, ativo) 
VALUES ('usuario@empresa.com', '$2b$10$hash_da_senha', 'User', 
        '["Marketing Digital LTDA", "Vendas Online S.A."]', true);
```

**⚠️ Importante:** Para criar senhas, use o script de setup:
```bash
npm run setup
```

---

## 🚀 Processo Completo de Configuração

### Opção A: Configuração Automática (Recomendado)

1. **Configure o .env:**
```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=sua-api-key-aqui
SESSION_SECRET=uma-chave-secreta-aleatoria
PORT=3000
```

2. **Execute a configuração automática:**
```bash
npm run setup
```

3. **Teste a configuração:**
```bash
npm run test-config
```

### Opção B: Configuração Manual

1. **Criar tabelas (se não existirem):**
```bash
# Execute no SQL Editor do Supabase o conteúdo de:
scripts/criar-tabelas.sql
```

2. **Inserir dados de exemplo:**
```sql
-- 1. Inserir empresas
INSERT INTO companies (empresa) VALUES 
('Conceito Prime'),
('Marketing Digital LTDA'),
('Vendas Online S.A.');

-- 2. Inserir custos de exemplo (Janeiro 2025)
INSERT INTO custoDiaMeta (dia, empresa, custo) VALUES
('2025-01-15', 'Conceito Prime', 1200.00),
('2025-01-16', 'Conceito Prime', 1350.00),
('2025-01-17', 'Conceito Prime', 1100.00),
('2025-01-15', 'Marketing Digital LTDA', 1500.00),
('2025-01-16', 'Marketing Digital LTDA', 1800.00);

-- 3. Inserir leads de exemplo
INSERT INTO bills (created_at, empresa, leadId, price) VALUES
('2025-01-15 10:30:00', 'Conceito Prime', 'CP_LEAD_001', 25.50),
('2025-01-15 14:20:00', 'Conceito Prime', 'CP_LEAD_002', 30.00),
('2025-01-15 16:45:00', 'Conceito Prime', 'CP_LEAD_003', 22.75),
('2025-01-16 09:15:00', 'Conceito Prime', 'CP_LEAD_004', 35.00),
('2025-01-16 11:30:00', 'Conceito Prime', 'CP_LEAD_005', 28.50),
('2025-01-15 12:00:00', 'Marketing Digital LTDA', 'MD_LEAD_001', 40.00),
('2025-01-16 15:30:00', 'Marketing Digital LTDA', 'MD_LEAD_002', 32.50);
```

3. **Criar usuário admin:**
```bash
# Use o script para criar usuário com senha criptografada
node scripts/setup-inicial.js
```

---

## 📊 Como Funciona o Sistema

### Métricas Calculadas Automaticamente:

1. **Total de Registros:** Conta todos os registros na tabela `bills` para o período
2. **Custo Prime:** Soma da coluna `price` da tabela `bills`  
3. **Gasto:** Soma da coluna `custo` da tabela `custoDiaMeta`
4. **CPL Meta:** Gasto ÷ Total de Registros
5. **CPL Total:** (Custo Prime + Gasto) ÷ Total de Registros

### Filtros Disponíveis:
- **Data:** Filtro por período (formato DD/MM/YYYY)
- **Empresa:** Filtro por empresa específica ou "Todas as Empresas"

### Permissões:
- **Admin:** Acesso a todas as empresas
- **User:** Acesso apenas às empresas definidas no campo `empresa`

---

## 🎯 Exemplo Prático Completo

```sql
-- 1. Criar empresa
INSERT INTO companies (empresa) VALUES ('Minha Empresa');

-- 2. Inserir custos para 3 dias
INSERT INTO custoDiaMeta (dia, empresa, custo) VALUES
('2025-01-20', 'Minha Empresa', 1000.00),
('2025-01-21', 'Minha Empresa', 1200.00),
('2025-01-22', 'Minha Empresa', 900.00);

-- 3. Inserir leads para os mesmos dias
INSERT INTO bills (created_at, empresa, leadId, price) VALUES
-- Dia 20/01
('2025-01-20 09:00:00', 'Minha Empresa', 'L001', 20.00),
('2025-01-20 11:00:00', 'Minha Empresa', 'L002', 25.00),
('2025-01-20 15:00:00', 'Minha Empresa', 'L003', 30.00),
-- Dia 21/01  
('2025-01-21 10:00:00', 'Minha Empresa', 'L004', 22.50),
('2025-01-21 14:00:00', 'Minha Empresa', 'L005', 27.50),
('2025-01-21 16:00:00', 'Minha Empresa', 'L006', 35.00),
('2025-01-21 18:00:00', 'Minha Empresa', 'L007', 20.00),
-- Dia 22/01
('2025-01-22 08:00:00', 'Minha Empresa', 'L008', 40.00),
('2025-01-22 12:00:00', 'Minha Empresa', 'L009', 15.00);
```

**Resultado no Dashboard:**
- **20/01:** 3 registros, R$ 75,00 Custo Prime, R$ 1.000,00 Gasto, CPL Total: R$ 358,33
- **21/01:** 4 registros, R$ 105,00 Custo Prime, R$ 1.200,00 Gasto, CPL Total: R$ 326,25  
- **22/01:** 2 registros, R$ 55,00 Custo Prime, R$ 900,00 Gasto, CPL Total: R$ 477,50

---

## ⚡ Iniciar o Sistema

```bash
# Desenvolvimento
npm run dev

# Produção  
npm start
```

**Acessar:** http://localhost:3000/login.html

---

## 🔧 Scripts Úteis

- `npm run setup` - Configuração completa automatizada
- `npm run test-config` - Testar configuração do sistema
- `npm run test-db` - Testar conexão com banco
- `npm run dev` - Iniciar em modo desenvolvimento
- `npm start` - Iniciar em modo produção

---

## 📞 Próximos Passos

1. ✅ Sistema já está completo e funcionando
2. ✅ Interface web já está pronta
3. ✅ Banco de dados já está estruturado
4. 🔄 **Você precisa apenas inserir seus dados reais**
5. 🔄 **Criar usuários conforme necessário**
6. 🔄 **Configurar permissões por empresa**

**O sistema está 100% funcional!** Apenas insira seus dados seguindo este guia.
