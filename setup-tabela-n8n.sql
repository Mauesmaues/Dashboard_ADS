-- ========================================
-- TABELA PARA DADOS DO N8N
-- ========================================

-- Tabela simples que corresponde exatamente ao formato do N8N
CREATE TABLE IF NOT EXISTS campanhas_n8n (
    id SERIAL PRIMARY KEY,
    ad_account_id VARCHAR(100) NOT NULL,
    spend DECIMAL(12,2) DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    cpc DECIMAL(8,4) DEFAULT 0,
    ctr DECIMAL(8,4) DEFAULT 0,
    date_start DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_campanhas_n8n_date ON campanhas_n8n(date_start);
CREATE INDEX IF NOT EXISTS idx_campanhas_n8n_account ON campanhas_n8n(ad_account_id);
CREATE INDEX IF NOT EXISTS idx_campanhas_n8n_account_date ON campanhas_n8n(ad_account_id, date_start);

-- Tabela para mapear ad_account_id para nomes de empresas (opcional)
CREATE TABLE IF NOT EXISTS contas_empresas (
    id SERIAL PRIMARY KEY,
    ad_account_id VARCHAR(100) UNIQUE NOT NULL,
    nome_empresa VARCHAR(200) NOT NULL,
    plataforma VARCHAR(50) DEFAULT 'Facebook',
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Alguns dados de exemplo para mapeamento (ajuste com seus dados reais)
INSERT INTO contas_empresas (ad_account_id, nome_empresa, plataforma) VALUES 
('act_123456789', 'Empresa A', 'Facebook'),
('act_987654321', 'Empresa B', 'Facebook'),
('act_555666777', 'Empresa C', 'Google')
ON CONFLICT (ad_account_id) DO NOTHING;

-- View para consultas fáceis com nome da empresa
CREATE OR REPLACE VIEW campanhas_com_empresa AS
SELECT 
    c.*,
    COALESCE(ce.nome_empresa, c.ad_account_id) as nome_empresa,
    COALESCE(ce.plataforma, 'Facebook') as plataforma
FROM campanhas_n8n c
LEFT JOIN contas_empresas ce ON c.ad_account_id = ce.ad_account_id
WHERE ce.ativo IS NULL OR ce.ativo = true;

-- Função para buscar métricas consolidadas por período
CREATE OR REPLACE FUNCTION obter_metricas_periodo(
    data_inicio DATE,
    data_fim DATE,
    empresa_filtro VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    data DATE,
    empresa VARCHAR,
    total_spend DECIMAL,
    total_impressions BIGINT,
    total_clicks BIGINT,
    cpc_medio DECIMAL,
    ctr_medio DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.date_start as data,
        c.nome_empresa as empresa,
        SUM(c.spend) as total_spend,
        SUM(c.impressions)::BIGINT as total_impressions,
        SUM(c.clicks)::BIGINT as total_clicks,
        CASE 
            WHEN SUM(c.clicks) > 0 THEN ROUND(SUM(c.spend) / SUM(c.clicks), 4)
            ELSE 0 
        END as cpc_medio,
        CASE 
            WHEN SUM(c.impressions) > 0 THEN ROUND((SUM(c.clicks)::DECIMAL / SUM(c.impressions) * 100), 4)
            ELSE 0 
        END as ctr_medio
    FROM campanhas_com_empresa c
    WHERE c.date_start >= data_inicio 
      AND c.date_start <= data_fim
      AND (empresa_filtro IS NULL OR c.nome_empresa = empresa_filtro)
    GROUP BY c.date_start, c.nome_empresa
    ORDER BY c.date_start DESC, c.nome_empresa;
END;
$$ LANGUAGE plpgsql;

-- Testando se a estrutura está correta
SELECT 'Tabela campanhas_n8n criada com sucesso!' as status;
