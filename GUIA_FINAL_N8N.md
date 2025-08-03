# 🎯 SISTEMA FINAL - CONSULTA DADOS N8N

## ✅ **PROBLEMA RESOLVIDO!**

Sistema **simplificado** para consultar dados que seu N8N já está enviando para o Supabase!

### 🔄 **FLUXO REAL**

```
N8N → Supabase (tabela campanhas_n8n) → Interface Web → Usuário
```

1. **N8N envia** dados direto para o Supabase
2. **Sistema consulta** os dados da tabela
3. **Interface web** exibe automaticamente
4. **Usuário vê** dashboard atualizado

### 📊 **ESTRUTURA DA TABELA (N8N)**

```sql
campanhas_n8n:
├── id (auto)
├── ad_account_id (do N8N)
├── spend (do N8N)
├── impressions (do N8N)
├── clicks (do N8N)
├── cpc (do N8N)
├── ctr (do N8N)
├── date_start (do N8N)
└── created_at (auto)
```

### 🚀 **CONFIGURAÇÃO**

#### 1. **Execute SQL no Supabase:**
```bash
# Cole o arquivo: setup-tabela-n8n.sql
```

#### 2. **Configure seu N8N para enviar para:**
```sql
-- Tabela: campanhas_n8n
-- Campos exatos: id, ad_account_id, spend, impressions, clicks, cpc, ctr, date_start
```

#### 3. **Mapeie suas contas (opcional):**
```sql
INSERT INTO contas_empresas (ad_account_id, nome_empresa, plataforma) VALUES 
('act_SEU_ID_REAL', 'Nome da Sua Empresa', 'Facebook');
```

#### 4. **Inicie o sistema:**
```bash
npm run dev
```

#### 5. **Acesse:**
- **URL**: http://localhost:3000
- **Login**: admin@conceitoprime.com  
- **Senha**: admin123

### 🖥️ **INTERFACE WEB**

A interface **existente** vai automaticamente:

✅ **Detectar** dados do N8N na tabela `campanhas_n8n`  
✅ **Processar** métricas (CPC, CTR calculados)  
✅ **Exibir gráficos** com dados reais  
✅ **Filtrar** por empresa e período  
✅ **Export Excel** com dados do N8N  

### 📈 **EXEMPLO VISUAL**

Quando seu N8N enviar:
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

Na interface aparece:
```
📅 Dashboard - 31/01/2025

┌─────────────────────────────────────────────────┐
│ 📊 Métricas do Dia                             │
├─────────────────────────────────────────────────┤
│ 💰 Gastos:      R$ 500,00                      │
│ 👁️ Impressões:   25.000                        │
│ 🖱️ Cliques:      1.250                         │
│ 💲 CPC:         R$ 0,40                        │
│ 📈 CTR:         5,0%                           │
└─────────────────────────────────────────────────┘

📈 [Gráfico de linha - evolução temporal]
📊 [Gráfico de barras - por empresa]
```

### 🔧 **SISTEMA INTELIGENTE**

#### **Detecção Automática:**
```javascript
// O sistema detecta automaticamente qual fonte usar:
1. Se existe dados N8N → usa N8NDataModel
2. Se não → usa sistema legado
3. Interface não muda nada!
```

#### **APIs Disponíveis:**
```bash
GET /api/n8n/metricas?data_inicio=2025-01-01&data_fim=2025-01-31
GET /api/n8n/empresas
GET /api/n8n/status
POST /api/mapear-conta (para mapear ad_account_id → empresa)
```

### ✅ **RESULTADO FINAL**

🎯 **N8N envia dados** → Supabase armazena automaticamente  
🎯 **Sistema consulta** dados da tabela `campanhas_n8n`  
🎯 **Interface web** exibe automaticamente  
🎯 **Usuário vê** dados reais sem configuração adicional  

### 🧪 **TESTE RÁPIDO**

```sql
-- 1. Inserir dados de teste na tabela
INSERT INTO campanhas_n8n (ad_account_id, spend, impressions, clicks, cpc, ctr, date_start) 
VALUES ('act_teste123', 100.50, 5000, 250, 0.40, 5.0, '2025-01-31');

-- 2. Acessar http://localhost:3000
-- 3. Ver dados aparecerem automaticamente!
```

### 📞 **STATUS**

```bash
# Ver status dos dados N8N
curl http://localhost:3000/api/n8n/status

# Ver empresas disponíveis  
curl http://localhost:3000/api/n8n/empresas

# Ver métricas
curl "http://localhost:3000/api/n8n/metricas?data_inicio=2025-01-01&data_fim=2025-01-31"
```

**🎉 Sistema pronto para consultar seus dados N8N reais!**
