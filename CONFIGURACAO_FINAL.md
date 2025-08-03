# ⚡ CONFIGURAÇÃO FINAL - Dashboard ADS

## 🎯 O QUE VOCÊ PRECISA FAZER (4 passos simples):

### 1️⃣ Configurar variáveis de ambiente
```bash
# Copiar arquivo de exemplo
copy .env.example .env
```

Editar `.env` com seus dados do Supabase:
```env
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_KEY=SUA-API-KEY-AQUI
SESSION_SECRET=qualquer-texto-aleatorio
PORT=3000
```

### 2️⃣ Executar SQL no Supabase
- Abra o **SQL Editor** no seu projeto Supabase
- Cole e execute o conteúdo do arquivo `setup-supabase.sql`
- ✅ Isso criará todas as tabelas e dados de exemplo

### 3️⃣ Testar conexão
```bash
node test-supabase.js
```
**Deve mostrar**: "Successfully connected to Supabase"

### 4️⃣ Iniciar sistema
```bash
npm run dev
```

## 🚀 ACESSAR DASHBOARD
- **URL**: http://localhost:3000/login.html
- **Login**: admin@conceitoprime.com
- **Senha**: admin123

---

## 📊 INSERIR SEUS DADOS REAIS

### Para adicionar nova empresa:
```sql
INSERT INTO companies (empresa) VALUES ('Sua Empresa');
```

### Para adicionar leads/conversões:
```sql
INSERT INTO bills (created_at, empresa, leadId, price) VALUES 
('2025-01-31 15:30:00+00', 'Sua Empresa', 'LEAD001', 150.00);
```

### Para adicionar custos diários:
```sql
INSERT INTO custoDiaMeta (dia, empresa, custo) VALUES 
('2025-01-31', 'Sua Empresa', 500.00);
```

---

## 🏆 PRONTO!
Seu sistema estará funcionando com interface web completa, gráficos, filtros e permissões por empresa.
