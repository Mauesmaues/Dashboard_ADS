# 🔄 Guia de Integração N8N - Dashboard ADS

## 🎯 RESUMO DA INTEGRAÇÃO

O sistema foi adaptado para receber dados de campanhas diretamente do N8N a cada 5 minutos, permitindo análise histórica e métricas em tempo real por empresa.

## 📊 ESTRUTURA DE DADOS ESPERADA

### Formato JSON que o N8N deve enviar:
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

### Para múltiplos registros:
```json
[
  {
    "ad_account_id": "act_123456789",
    "spend": 500.00,
    "impressions": 25000,
    "clicks": 1250,
    "cpc": 0.40,
    "ctr": 5.00,
    "date_start": "2025-01-31"
  },
  {
    "ad_account_id": "act_111222333", 
    "spend": 300.00,
    "impressions": 15000,
    "clicks": 750,
    "cpc": 0.40,
    "ctr": 5.00,
    "date_start": "2025-01-31"
  }
]
```

## 🔧 CONFIGURAÇÃO DO N8N

### 1. Endpoint para Envio de Dados
- **URL**: `http://SEU-SERVIDOR:3000/api/campanhas/dados`
- **Método**: `POST`
- **Content-Type**: `application/json`
- **Autenticação**: Não é necessária para este endpoint

### 2. Workflow N8N Sugerido

```json
{
  "nodes": [
    {
      "name": "Schedule Trigger",
      "type": "n8n-nodes-base.cronTrigger",
      "parameters": {
        "rule": {
          "interval": [
            {
              "field": "minutes",
              "value": 5
            }
          ]
        }
      }
    },
    {
      "name": "Get Facebook Data",
      "type": "n8n-nodes-base.facebookGraphApi",
      "parameters": {
        "resource": "ads",
        "operation": "getInsights",
        "fields": [
          "account_id",
          "spend", 
          "impressions",
          "clicks",
          "cpc",
          "ctr"
        ],
        "datePreset": "today"
      }
    },
    {
      "name": "Transform Data",
      "type": "n8n-nodes-base.function",
      "parameters": {
        "functionCode": `
          const items = [];
          
          for (const item of $input.all()) {
            items.push({
              ad_account_id: item.json.account_id,
              spend: parseFloat(item.json.spend || 0),
              impressions: parseInt(item.json.impressions || 0),
              clicks: parseInt(item.json.clicks || 0),
              cpc: parseFloat(item.json.cpc || 0),
              ctr: parseFloat(item.json.ctr || 0),
              date_start: new Date().toISOString().split('T')[0]
            });
          }
          
          return items;
        `
      }
    },
    {
      "name": "Send to Dashboard",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "method": "POST",
        "url": "http://SEU-SERVIDOR:3000/api/campanhas/dados",
        "options": {
          "headers": {
            "Content-Type": "application/json"
          }
        },
        "bodyParametersUi": {
          "parameter": [
            {
              "name": "json",
              "value": "={{ JSON.stringify($json) }}"
            }
          ]
        }
      }
    }
  ]
}
```

## 🏢 MAPEAMENTO DE CONTAS PARA EMPRESAS

### Via API (Endpoint Administrativo):
```javascript
// POST http://localhost:3000/api/campanhas/mapear-conta
{
  "empresa_nome": "Conceito Prime",
  "ad_account_id": "act_123456789",
  "plataforma": "Facebook",
  "nome_conta": "Facebook Ads - Conceito Prime"
}
```

### Via SQL Direto:
```sql
-- Primeiro, verificar ID da empresa
SELECT id, nome FROM empresas;

-- Depois, mapear a conta
INSERT INTO contas_ads (empresa_id, ad_account_id, plataforma, nome_conta) VALUES 
(1, 'act_123456789', 'Facebook', 'Facebook Ads - Conceito Prime');
```

## 📈 ENDPOINTS DISPONÍVEIS

### 1. Receber Dados do N8N
```
POST /api/campanhas/dados
Body: JSON com dados de campanha
Resposta: Status da inserção
```

### 2. Status do Sistema
```
GET /api/campanhas/status
Resposta: Estatísticas gerais do sistema
```

### 3. Métricas Consolidadas
```
GET /api/campanhas/metricas?data_inicio=2025-01-01&data_fim=2025-01-31&empresa=Conceito Prime&agrupamento=dia
Resposta: Métricas agregadas por período
```

### 4. Listar Contas Mapeadas
```
GET /api/campanhas/contas
Resposta: Lista de contas de ads por empresa
```

## 🔄 FUNCIONAMENTO DO SISTEMA

### 1. Coleta de Dados (N8N)
- N8N executa a cada 5 minutos
- Coleta dados das APIs de Facebook/Google/etc
- Envia para endpoint `/api/campanhas/dados`

### 2. Processamento (Dashboard)
- Recebe dados e valida formato
- Mapeia `ad_account_id` para empresa via tabela `contas_ads`
- Insere/atualiza dados na tabela `metricas_campanhas`
- Evita duplicatas usando constraint única

### 3. Visualização (Frontend)
- Sistema existente continua funcionando normalmente
- Views SQL fazem compatibilidade com estrutura anterior
- Dados aparecem automaticamente nos gráficos

## 🛠️ COMANDOS DE TESTE

### Testar endpoint manualmente:
```bash
curl -X POST http://localhost:3000/api/campanhas/dados \
  -H "Content-Type: application/json" \
  -d '{
    "ad_account_id": "act_123456789",
    "spend": 500.00,
    "impressions": 25000,
    "clicks": 1250,
    "cpc": 0.40,
    "ctr": 5.00,
    "date_start": "2025-01-31"
  }'
```

### Verificar status:
```bash
curl http://localhost:3000/api/campanhas/status
```

### Ver dados inseridos:
```sql
SELECT * FROM metricas_campanhas ORDER BY data_coleta DESC LIMIT 10;
```

## 📋 CHECKLIST DE CONFIGURAÇÃO

- [ ] 1. Executar `setup-sistema-campanhas.sql` no Supabase
- [ ] 2. Mapear suas contas de ads para as empresas corretas
- [ ] 3. Configurar workflow no N8N com endpoint correto
- [ ] 4. Testar envio manual de dados
- [ ] 5. Verificar se dados aparecem no dashboard
- [ ] 6. Configurar agendamento no N8N (5 minutos)
- [ ] 7. Monitorar logs para verificar funcionamento

## 🚨 TROUBLESHOOTING

### Erro: "ad_account_id não mapeado"
- Verifique se a conta foi mapeada na tabela `contas_ads`
- Use o endpoint `/api/campanhas/mapear-conta` ou SQL direto

### Dados não aparecem no dashboard
- Verifique se as views `companies`, `bills`, `custoDiaMeta` estão funcionando
- Confirme se o usuário tem acesso à empresa correta

### N8N não consegue enviar dados
- Verifique se o endpoint está acessível
- Confirme se o formato JSON está correto
- Verifique logs do servidor Node.js

---

🎉 **Com essa configuração, seu sistema receberá dados automaticamente do N8N e manterá histórico completo para análises!**
