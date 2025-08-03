-- 🚀 SISTEMA ADAPTADO PARA DADOS REAIS DE CAMPANHAS N8N
-- Execute este script no SQL Editor do Supabase

-- ========================================
-- 1. ESTRUTURA DE AUTENTICAÇÃO E EMPRESAS
-- ========================================

-- Tabela de usuários e autenticação
CREATE TABLE IF NOT EXISTS acessoBI (
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
CREATE TABLE IF NOT EXISTS empresas (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) UNIQUE NOT NULL,
    codigo VARCHAR(50) UNIQUE,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ========================================
-- 2. NOVA ESTRUTURA PARA DADOS DE CAMPANHAS
-- ========================================

-- Tabela para mapear ad_account_id para empresas
CREATE TABLE IF NOT EXISTS contas_ads (
    id SERIAL PRIMARY KEY,
    empresa_id INTEGER REFERENCES empresas(id),
    ad_account_id VARCHAR(255) UNIQUE NOT NULL,
    plataforma VARCHAR(100) NOT NULL, -- 'Facebook', 'Google', 'Instagram', etc.
    nome_conta VARCHAR(255),
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela principal de métricas de campanhas (dados do N8N)
CREATE TABLE IF NOT EXISTS metricas_campanhas (
    id SERIAL PRIMARY KEY,
    ad_account_id VARCHAR(255) NOT NULL,
    spend DECIMAL(12,2) DEFAULT 0,        -- Gasto
    impressions INTEGER DEFAULT 0,        -- Impressões
    clicks INTEGER DEFAULT 0,             -- Cliques
    cpc DECIMAL(10,4) DEFAULT 0,         -- Custo por clique
    ctr DECIMAL(8,4) DEFAULT 0,          -- Taxa de clique
    date_start DATE NOT NULL,             -- Data da campanha
    data_coleta TIMESTAMP DEFAULT NOW(),  -- Quando foi coletado
    
    -- Índices únicos para evitar duplicatas
    UNIQUE(ad_account_id, date_start)
);

-- ========================================
-- 3. VIEWS PARA COMPATIBILIDADE COM SISTEMA ATUAL
-- ========================================

-- View que simula a tabela 'companies' atual
CREATE OR REPLACE VIEW companies AS
SELECT nome as empresa FROM empresas WHERE ativo = true;

-- View que simula a tabela 'bills' para leads/conversões
CREATE OR REPLACE VIEW bills AS
SELECT 
    mc.id,
    (mc.date_start::date + INTERVAL '12 hours')::timestamp as created_at,
    e.nome as empresa,
    CONCAT('CONV_', mc.ad_account_id, '_', mc.date_start) as leadId,
    (mc.clicks * 0.1) as price  -- Simula custo rooster baseado nos cliques
FROM metricas_campanhas mc
JOIN contas_ads ca ON mc.ad_account_id = ca.ad_account_id
JOIN empresas e ON ca.empresa_id = e.id
WHERE ca.ativo = true AND e.ativo = true;

-- View que simula a tabela 'custoDiaMeta' com gastos
CREATE OR REPLACE VIEW custoDiaMeta AS
SELECT 
    ROW_NUMBER() OVER (ORDER BY e.nome, mc.date_start) as id,
    mc.date_start as dia,
    e.nome as empresa,
    SUM(mc.spend) as custo
FROM metricas_campanhas mc
JOIN contas_ads ca ON mc.ad_account_id = ca.ad_account_id
JOIN empresas e ON ca.empresa_id = e.id
WHERE ca.ativo = true AND e.ativo = true
GROUP BY e.nome, mc.date_start;

-- ========================================
-- 4. ÍNDICES PARA PERFORMANCE
-- ========================================

CREATE INDEX IF NOT EXISTS idx_metricas_ad_account_date ON metricas_campanhas(ad_account_id, date_start);
CREATE INDEX IF NOT EXISTS idx_metricas_date_start ON metricas_campanhas(date_start);
CREATE INDEX IF NOT EXISTS idx_metricas_data_coleta ON metricas_campanhas(data_coleta);
CREATE INDEX IF NOT EXISTS idx_contas_ads_account_id ON contas_ads(ad_account_id);
CREATE INDEX IF NOT EXISTS idx_contas_ads_empresa ON contas_ads(empresa_id);

-- ========================================
-- 5. DADOS INICIAIS DE EXEMPLO
-- ========================================

-- Inserir empresas
INSERT INTO empresas (nome, codigo) VALUES 
('Conceito Prime', 'CP'),
('Empresa Cliente A', 'ECA'),
('Empresa Cliente B', 'ECB'),
('Empresa Cliente C', 'ECC')
ON CONFLICT (nome) DO NOTHING;

-- Inserir contas de ads (mapear ad_account_id para empresas)
INSERT INTO contas_ads (empresa_id, ad_account_id, plataforma, nome_conta) VALUES 
(1, 'act_123456789', 'Facebook', 'Facebook Ads - Conceito Prime'),
(1, 'ga_987654321', 'Google', 'Google Ads - Conceito Prime'),
(2, 'act_111222333', 'Facebook', 'Facebook Ads - Cliente A'),
(2, 'ga_444555666', 'Google', 'Google Ads - Cliente A'),
(3, 'act_777888999', 'Facebook', 'Facebook Ads - Cliente B'),
(4, 'act_000111222', 'Facebook', 'Facebook Ads - Cliente C')
ON CONFLICT (ad_account_id) DO NOTHING;

-- Criar usuário administrador
INSERT INTO acessoBI (email, password, nome, role, empresa, ativo) VALUES 
('admin@conceitoprime.com', '$2b$10$rQc7VwjCQHXqP9N4GWl/V.HWGx6P4E4VZ2Q4uF8OgZ1v8MzN3D9ZG', 'Administrador', 'Admin', ARRAY['Conceito Prime', 'Empresa Cliente A', 'Empresa Cliente B', 'Empresa Cliente C'], true)
ON CONFLICT (email) DO NOTHING;

-- Inserir dados de exemplo dos últimos 7 dias para diferentes contas
INSERT INTO metricas_campanhas (ad_account_id, spend, impressions, clicks, cpc, ctr, date_start) VALUES 
-- Conceito Prime - Facebook
('act_123456789', 500.00, 25000, 1250, 0.40, 5.00, CURRENT_DATE),
('act_123456789', 480.00, 24000, 1200, 0.40, 5.00, CURRENT_DATE - INTERVAL '1 day'),
('act_123456789', 520.00, 26000, 1300, 0.40, 5.00, CURRENT_DATE - INTERVAL '2 days'),
-- Conceito Prime - Google
('ga_987654321', 300.00, 15000, 750, 0.40, 5.00, CURRENT_DATE),
('ga_987654321', 290.00, 14500, 725, 0.40, 5.00, CURRENT_DATE - INTERVAL '1 day'),
('ga_987654321', 310.00, 15500, 775, 0.40, 5.00, CURRENT_DATE - INTERVAL '2 days'),
-- Cliente A - Facebook
('act_111222333', 450.00, 22500, 1125, 0.40, 5.00, CURRENT_DATE),
('act_111222333', 435.00, 21750, 1087, 0.40, 5.00, CURRENT_DATE - INTERVAL '1 day'),
('act_111222333', 465.00, 23250, 1162, 0.40, 5.00, CURRENT_DATE - INTERVAL '2 days'),
-- Cliente A - Google
('ga_444555666', 280.00, 14000, 700, 0.40, 5.00, CURRENT_DATE),
('ga_444555666', 270.00, 13500, 675, 0.40, 5.00, CURRENT_DATE - INTERVAL '1 day'),
('ga_444555666', 290.00, 14500, 725, 0.40, 5.00, CURRENT_DATE - INTERVAL '2 days'),
-- Cliente B - Facebook
('act_777888999', 380.00, 19000, 950, 0.40, 5.00, CURRENT_DATE),
('act_777888999', 370.00, 18500, 925, 0.40, 5.00, CURRENT_DATE - INTERVAL '1 day'),
('act_777888999', 390.00, 19500, 975, 0.40, 5.00, CURRENT_DATE - INTERVAL '2 days'),
-- Cliente C - Facebook
('act_000111222', 320.00, 16000, 800, 0.40, 5.00, CURRENT_DATE),
('act_000111222', 310.00, 15500, 775, 0.40, 5.00, CURRENT_DATE - INTERVAL '1 day'),
('act_000111222', 330.00, 16500, 825, 0.40, 5.00, CURRENT_DATE - INTERVAL '2 days')
ON CONFLICT (ad_account_id, date_start) DO UPDATE SET
    spend = EXCLUDED.spend,
    impressions = EXCLUDED.impressions,
    clicks = EXCLUDED.clicks,
    cpc = EXCLUDED.cpc,
    ctr = EXCLUDED.ctr,
    data_coleta = NOW();

-- ========================================
-- 6. FUNÇÃO PARA EXECUTAR SQL CUSTOMIZADO
-- ========================================

-- Função para executar SQL dinâmico (necessária para o sistema)
CREATE OR REPLACE FUNCTION exec_sql(sql TEXT)
RETURNS TABLE(result JSONB) AS $$
BEGIN
    RETURN QUERY EXECUTE sql;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'SQL Error: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 7. FUNÇÃO PARA INSERIR DADOS VIA N8N
-- ========================================
CREATE OR REPLACE FUNCTION inserir_metricas_campanha(
    p_ad_account_id VARCHAR(255),
    p_spend DECIMAL(12,2),
    p_impressions INTEGER,
    p_clicks INTEGER,
    p_cpc DECIMAL(10,4),
    p_ctr DECIMAL(8,4),
    p_date_start DATE
) RETURNS VOID AS $$
BEGIN
    INSERT INTO metricas_campanhas (ad_account_id, spend, impressions, clicks, cpc, ctr, date_start)
    VALUES (p_ad_account_id, p_spend, p_impressions, p_clicks, p_cpc, p_ctr, p_date_start)
    ON CONFLICT (ad_account_id, date_start) 
    DO UPDATE SET
        spend = EXCLUDED.spend,
        impressions = EXCLUDED.impressions,
        clicks = EXCLUDED.clicks,
        cpc = EXCLUDED.cpc,
        ctr = EXCLUDED.ctr,
        data_coleta = NOW();
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 7. VERIFICAÇÕES FINAIS
-- ========================================

SELECT 'CONFIGURAÇÃO CONCLUÍDA!' as status;

SELECT 'Empresas cadastradas:' as info;
SELECT nome, codigo FROM empresas ORDER BY nome;

SELECT 'Contas de ads mapeadas:' as info;
SELECT e.nome as empresa, ca.ad_account_id, ca.plataforma, ca.nome_conta 
FROM contas_ads ca 
JOIN empresas e ON ca.empresa_id = e.id 
ORDER BY e.nome, ca.plataforma;

SELECT 'Total de métricas inseridas:' as info;
SELECT COUNT(*) as total FROM metricas_campanhas;

SELECT 'Exemplo de dados via view companies:' as info;
SELECT * FROM companies LIMIT 3;

SELECT 'Exemplo de dados via view bills:' as info;
SELECT empresa, DATE(created_at) as data, COUNT(*) as registros, SUM(price) as custo_rooster 
FROM bills 
GROUP BY empresa, DATE(created_at) 
ORDER BY data DESC 
LIMIT 5;

SELECT 'Exemplo de dados via view custoDiaMeta:' as info;
SELECT empresa, dia, custo 
FROM custoDiaMeta 
ORDER BY dia DESC, empresa 
LIMIT 10;

-- 🎉 SISTEMA PRONTO PARA RECEBER DADOS DO N8N!
