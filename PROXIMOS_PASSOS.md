# ⚡ CONFIGURAÇÃO FINAL - Sistema de Campanhas N8N

## 🎯 PRÓXIMOS PASSOS (2 etapas):

### 1️⃣ EXECUTAR SQL NO SUPABASE
- Abra o **SQL Editor** no seu projeto Supabase
- Cole e execute o conteúdo completo do arquivo `setup-sistema-campanhas.sql`
- ✅ Isso criará toda a estrutura necessária

### 2️⃣ TESTAR SISTEMA
```bash
# Testar conexão
node test-supabase.js

# Iniciar sistema  
npm run dev

# Acessar dashboard
# URL: http://localhost:3000/login.html
# Login: admin@conceitoprime.com
# Senha: admin123
```

---

## 📊 ESTRUTURA CRIADA

### Tabelas Principais:
- **`metricas_campanhas`** - Dados vindos do N8N
- **`contas_ads`** - Mapeia ad_account_id para empresas
- **`empresas`** - Suas empresas 
- **`acessoBI`** - Usuários do sistema

### Views de Compatibilidade:
- **`companies`** - Compatible com código existente
- **`bills`** - Simula leads baseado nos cliques
- **`custoDiaMeta`** - Gastos por dia de cada empresa

---

## 🔄 INTEGRAÇÃO N8N

### Endpoint para N8N:
```
POST http://localhost:3000/api/campanhas/dados
```

### Formato de dados:
```json
{
  "ad_account_id": "act_123456789",
  "spend": 500.00,
  "impressions": 25000, 
  "clicks": 1250,
  "cpc": 0.40,
  "ctr": 5.00,
  "date_start": "2025-01-31"
}
```

### Mapear suas contas reais:
```sql
-- Substituir pelos seus ad_account_id reais
INSERT INTO contas_ads (empresa_id, ad_account_id, plataforma, nome_conta) VALUES 
(1, 'SEU_AD_ACCOUNT_ID_REAL', 'Facebook', 'Nome da Conta Facebook'),
(1, 'SEU_GOOGLE_ACCOUNT_ID', 'Google', 'Nome da Conta Google');
```

---

## 🏆 RESULTADO FINAL

✅ **Sistema completo funcionando**  
✅ **Interface web com gráficos**  
✅ **Dados automáticos do N8N a cada 5 minutos**  
✅ **Histórico completo por empresa**  
✅ **Filtros por data e empresa**  
✅ **Permissões de acesso por usuário**  
✅ **Export para Excel**  

---

📚 **Consulte os guias completos:**
- `GUIA_INTEGRACAO_N8N.md` - Configuração detalhada do N8N
- `setup-sistema-campanhas.sql` - Script SQL completo
