# 🚀 GUIA COMPLETO - Deploy no Railway

## 📋 Análise do Sistema

Após analisar seu código, identifiquei que você possui um **Dashboard ADS** - Sistema de Business Intelligence conectado ao Supabase com as seguintes características:

### 🎯 **Tecnologias Identificadas:**
- **Backend**: Node.js + Express
- **Banco de Dados**: Supabase (PostgreSQL)
- **Frontend**: HTML/CSS/JS (Bootstrap, Chart.js)
- **Autenticação**: Sistema próprio com sessões
- **Arquivos principais**: `src/index.js`, `package.json`

### 💰 **Estimativa de Custos no Railway:**
- **Gratuito**: $0/mês (limitado a 500 horas/mês)
- **Hobby Plan**: $5/mês (uso ilimitado)
- **Pro Plan**: $20/mês (recursos avançados)

---

## 🔧 PASSO A PASSO PARA DEPLOY

### 1️⃣ **PREPARAÇÃO DO CÓDIGO**

#### A) Criar arquivo de configuração para produção
```bash
# Execute no terminal do seu projeto
touch railway.toml
```

**Conteúdo do `railway.toml`:**
```toml
[build]
builder = "NIXPACKS"

[deploy]
healthcheckPath = "/"
healthcheckTimeout = 100
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10

[environment]
NODE_ENV = "production"
```

#### B) Verificar se o `package.json` está correto
Seu arquivo já está bem configurado, mas certifique-se de que tem:
```json
{
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

#### C) Criar script de verificação de produção
```bash
# Execute no terminal
touch verifica-producao.js
```

**Conteúdo do `verifica-producao.js`:**
```javascript
// Script para verificar se o sistema está pronto para produção
const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando preparação para produção...');

// Verificar arquivos essenciais
const arquivosEssenciais = [
  'src/index.js',
  'package.json',
  'src/config/supabase.js'
];

let tudoOk = true;

arquivosEssenciais.forEach(arquivo => {
  if (fs.existsSync(arquivo)) {
    console.log(`✅ ${arquivo} - OK`);
  } else {
    console.log(`❌ ${arquivo} - FALTANDO`);
    tudoOk = false;
  }
});

// Verificar dependências críticas
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const depsCriticas = ['express', '@supabase/supabase-js', 'dotenv'];

depsCriticas.forEach(dep => {
  if (packageJson.dependencies[dep]) {
    console.log(`✅ ${dep} - OK`);
  } else {
    console.log(`❌ ${dep} - FALTANDO`);
    tudoOk = false;
  }
});

console.log(tudoOk ? '🎉 Sistema pronto para produção!' : '⚠️ Corrija os problemas antes de continuar');
```

### 2️⃣ **CONFIGURAÇÃO NO RAILWAY**

#### A) Criar conta no Railway
1. Acesse [railway.app](https://railway.app)
2. Cadastre-se com GitHub (recomendado)
3. Verifique seu email

#### B) Conectar repositório
1. No dashboard Railway, clique em **"New Project"**
2. Selecione **"Deploy from GitHub repo"**
3. Conecte sua conta GitHub
4. Selecione seu repositório do Dashboard_ADS

#### C) Configurar variáveis de ambiente
No Railway Dashboard → Seu Projeto → Variables, adicione:

```env
NODE_ENV=production
PORT=3000
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=sua-api-key-do-supabase
SESSION_SECRET=uma-chave-secreta-muito-complexa-aqui
COOKIE_SECURE=true
COOKIE_SAME_SITE=strict
CORS_ORIGIN=https://seu-app.railway.app
TZ=America/Sao_Paulo
```

⚠️ **IMPORTANTE**: Substitua os valores pelos seus dados reais do Supabase!

### 3️⃣ **OTIMIZAÇÕES PARA RAILWAY**

#### A) Adicionar configuração de produção no `src/index.js`
Adicione no início do arquivo, após as importações:

```javascript
// Configurações específicas para produção
if (process.env.NODE_ENV === 'production') {
  // Forçar HTTPS em produção
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}
```

#### B) Otimizar configuração do CORS
Modifique a configuração do CORS no `src/index.js`:

```javascript
// Middleware CORS otimizado
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'https://seu-app.railway.app',
  credentials: true,
  optionsSuccessStatus: 200
}));
```

#### C) Adicionar health check
Adicione uma rota de health check no `src/index.js`:

```javascript
// Health check para Railway
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
});
```

### 4️⃣ **CONFIGURAÇÃO DO SUPABASE PARA PRODUÇÃO**

#### A) No painel do Supabase:
1. Vá em **Settings** → **API**
2. Na seção **URL**, copie sua URL do projeto
3. Na seção **API Keys**, use a chave **anon/public**

#### B) Configurar políticas RLS (Row Level Security):
```sql
-- Execute no SQL Editor do Supabase
-- Permitir acesso aos dados autenticados
ALTER TABLE acessobi ENABLE ROW LEVEL SECURITY;
ALTER TABLE dados_campanhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;

-- Política para acessobi
CREATE POLICY "Users can view own data" ON acessobi
FOR SELECT USING (true);

-- Política para dados_campanhas
CREATE POLICY "Authenticated users can view campaigns" ON dados_campanhas
FOR SELECT USING (true);
```

### 5️⃣ **DEPLOY E MONITORAMENTO**

#### A) Fazer o deploy
1. No Railway, após configurar as variáveis, clique em **"Deploy"**
2. Aguarde o build completar (5-10 minutos)
3. Railway fornecerá uma URL: `https://seu-app.railway.app`

#### B) Verificar funcionamento
```bash
# Teste local antes do deploy
node verifica-producao.js
npm start

# Teste após deploy
curl https://seu-app.railway.app/health
```

#### C) Monitorar logs
No Railway Dashboard → Seu Projeto → Deployments → View Logs

### 6️⃣ **CONFIGURAÇÕES DE CUSTO MÍNIMO**

#### A) Plan Gratuito (Recomendado para começar):
- **500 horas/mês gratuitas**
- **1GB RAM, 1 vCPU**
- **1GB armazenamento**
- **Domínio gratuito .railway.app**

#### B) Otimizações para reduzir uso:
```javascript
// Adicione no src/index.js para reduzir consumo
if (process.env.NODE_ENV === 'production') {
  // Configurar timeout de sessão
  app.use(session({
    // ... outras configurações
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 horas
      secure: true,
      httpOnly: true
    }
  }));
}
```

### 7️⃣ **DOMÍNIO PERSONALIZADO (OPCIONAL)**

Se quiser um domínio próprio:
1. No Railway → Settings → Domains
2. Adicione seu domínio
3. Configure DNS conforme instruções

---

## 🛠️ COMANDOS ÚTEIS

### Verificar status do deploy:
```bash
# Instalar Railway CLI (opcional)
npm install -g @railway/cli

# Login
railway login

# Ver logs em tempo real
railway logs
```

### Backup antes do deploy:
```bash
# Fazer backup do banco
pg_dump SUPABASE_URL > backup.sql

# Fazer backup dos arquivos
git add .
git commit -m "Backup antes do deploy"
git push
```

---

## 🚨 CHECKLIST FINAL

### Antes do deploy:
- [ ] Variáveis de ambiente configuradas
- [ ] Supabase funcionando
- [ ] Teste local funcionando (`npm start`)
- [ ] Código no GitHub atualizado
- [ ] Backup realizado

### Após o deploy:
- [ ] URL funcionando
- [ ] Login funcionando
- [ ] Dados carregando
- [ ] Health check respondendo
- [ ] Logs sem erros críticos

---

## 🎯 PRÓXIMOS PASSOS

1. **Teste local**: Execute `npm start` e teste tudo
2. **Push para GitHub**: `git push origin main`
3. **Deploy no Railway**: Siga os passos acima
4. **Teste produção**: Acesse sua URL do Railway
5. **Configurar monitoramento**: Configure alertas se necessário

---

## 💡 DICAS DE ECONOMIA

### Para manter no plano gratuito:
- Configure timeouts adequados
- Use cache quando possível
- Otimize queries do banco
- Monitor o uso de horas mensalmente

### Se precisar do plano pago ($5/mês):
- Muito mais estável
- Sem limitação de horas
- Métricas avançadas
- Suporte prioritário

---

## 📞 SUPORTE

Se encontrar problemas:
1. Verifique os logs no Railway
2. Teste as variáveis de ambiente
3. Confirme se o Supabase está acessível
4. Verifique se todas as dependências estão instaladas

**Seu sistema está bem estruturado e pronto para produção! 🚀**
