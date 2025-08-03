-- 🗄️ Script SQL para Criação de Tabelas - Dashboard ADS
-- Execute este script no SQL Editor do Supabase

-- ============================================
-- 1. TABELA DE EMPRESAS
-- ============================================
CREATE TABLE IF NOT EXISTS empresas (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) UNIQUE NOT NULL,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    ativo BOOLEAN DEFAULT true,
    data_criacao TIMESTAMP DEFAULT NOW(),
    configuracoes JSONB DEFAULT '{}',
    observacoes TEXT
);

-- Inserir empresas padrão
INSERT INTO empresas (nome, codigo, ativo) VALUES
('Conceito Prime', 'CP', true),
('Empresa Demo A', 'EDA', true),
('Empresa Demo B', 'EDB', true)
ON CONFLICT (nome) DO NOTHING;

-- ============================================
-- 2. TABELA DE CONTAS/CAMPANHAS
-- ============================================
CREATE TABLE IF NOT EXISTS contas_campanhas (
    id SERIAL PRIMARY KEY,
    empresa_id INTEGER REFERENCES empresas(id),
    nome_conta VARCHAR(255) NOT NULL,
    plataforma VARCHAR(100) NOT NULL,
    conta_id VARCHAR(255),
    ativo BOOLEAN DEFAULT true,
    data_criacao TIMESTAMP DEFAULT NOW(),
    configuracoes JSONB DEFAULT '{}',
    observacoes TEXT
);

-- Inserir contas de exemplo
INSERT INTO contas_campanhas (empresa_id, nome_conta, plataforma, conta_id, ativo) VALUES
(2, 'Google Ads - Demo A', 'Google Ads', 'GA_DEMO_A', true),
(2, 'Facebook Ads - Demo A', 'Facebook', 'FB_DEMO_A', true),
(3, 'Google Ads - Demo B', 'Google Ads', 'GA_DEMO_B', true),
(3, 'Instagram Ads - Demo B', 'Instagram', 'IG_DEMO_B', true);

-- ============================================
-- 3. ATUALIZAR TABELA DE DADOS DE CAMPANHAS
-- ============================================
-- Adicionar campos de relacionamento se não existirem
ALTER TABLE dados_campanhas 
ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id),
ADD COLUMN IF NOT EXISTS conta_campanha_id INTEGER REFERENCES contas_campanhas(id);

-- ============================================
-- 4. ATUALIZAR TABELA DE USUÁRIOS (acessoBI)
-- ============================================
-- Verificar se a tabela existe e adicionar campos se necessário
ALTER TABLE acessoBI 
ADD COLUMN IF NOT EXISTS nome VARCHAR(255),
ADD COLUMN IF NOT EXISTS data_criacao TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS ultimo_acesso TIMESTAMP,
ADD COLUMN IF NOT EXISTS observacoes TEXT;

-- ============================================
-- 5. ÍNDICES PARA PERFORMANCE
-- ============================================
-- Índices na tabela dados_campanhas
CREATE INDEX IF NOT EXISTS idx_dados_campanhas_data ON dados_campanhas(data);
CREATE INDEX IF NOT EXISTS idx_dados_campanhas_empresa ON dados_campanhas(empresa);
CREATE INDEX IF NOT EXISTS idx_dados_campanhas_empresa_id ON dados_campanhas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_dados_campanhas_conta_id ON dados_campanhas(conta_campanha_id);

-- Índices na tabela acessoBI
CREATE INDEX IF NOT EXISTS idx_acessobi_email ON acessoBI(email);
CREATE INDEX IF NOT EXISTS idx_acessobi_role ON acessoBI(role);
CREATE INDEX IF NOT EXISTS idx_acessobi_ativo ON acessoBI(ativo);

-- Índices na tabela empresas
CREATE INDEX IF NOT EXISTS idx_empresas_codigo ON empresas(codigo);
CREATE INDEX IF NOT EXISTS idx_empresas_ativo ON empresas(ativo);

-- Índices na tabela contas_campanhas
CREATE INDEX IF NOT EXISTS idx_contas_empresa_id ON contas_campanhas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_contas_ativo ON contas_campanhas(ativo);

-- ============================================
-- 6. FUNÇÕES AUXILIARES
-- ============================================

-- Função para buscar empresas de um usuário
CREATE OR REPLACE FUNCTION buscar_empresas_usuario(usuario_email TEXT)
RETURNS TABLE(empresa_nome TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT unnest(empresa) as empresa_nome
    FROM acessoBI 
    WHERE email = usuario_email AND ativo = true;
END;
$$ LANGUAGE plpgsql;

-- Função para verificar acesso de usuário à empresa
CREATE OR REPLACE FUNCTION verificar_acesso_empresa(usuario_email TEXT, empresa_nome TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    usuario_role TEXT;
    tem_acesso BOOLEAN := false;
BEGIN
    -- Buscar role do usuário
    SELECT role INTO usuario_role
    FROM acessoBI 
    WHERE email = usuario_email AND ativo = true;
    
    -- Admin tem acesso a tudo
    IF usuario_role = 'Admin' THEN
        RETURN true;
    END IF;
    
    -- Verificar se empresa está na lista do usuário
    SELECT empresa_nome = ANY(empresa) INTO tem_acesso
    FROM acessoBI 
    WHERE email = usuario_email AND ativo = true;
    
    RETURN COALESCE(tem_acesso, false);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. VIEWS ÚTEIS
-- ============================================

-- View com dados de campanha + informações de empresa
CREATE OR REPLACE VIEW vw_dados_completos AS
SELECT 
    dc.*,
    e.nome as nome_empresa,
    e.codigo as codigo_empresa,
    cc.nome_conta,
    cc.plataforma
FROM dados_campanhas dc
LEFT JOIN empresas e ON dc.empresa_id = e.id
LEFT JOIN contas_campanhas cc ON dc.conta_campanha_id = cc.id;

-- View com resumo por empresa
CREATE OR REPLACE VIEW vw_resumo_empresas AS
SELECT 
    e.nome as empresa,
    e.codigo,
    COUNT(dc.id) as total_registros,
    SUM(dc.gastos) as total_gastos,
    SUM(dc.impressoes) as total_impressoes,
    SUM(dc.cliques) as total_cliques,
    AVG(dc.cpc) as cpc_medio,
    AVG(dc.ctr) as ctr_medio,
    MIN(dc.data) as primeira_data,
    MAX(dc.data) as ultima_data
FROM empresas e
LEFT JOIN dados_campanhas dc ON e.id = dc.empresa_id
WHERE e.ativo = true
GROUP BY e.id, e.nome, e.codigo;

-- ============================================
-- 8. POLÍTICAS DE SEGURANÇA (RLS)
-- ============================================

-- Habilitar RLS nas tabelas sensíveis
ALTER TABLE acessoBI ENABLE ROW LEVEL SECURITY;
ALTER TABLE dados_campanhas ENABLE ROW LEVEL SECURITY;

-- Política para acessoBI - usuários só veem próprios dados
CREATE POLICY usuarios_proprios_dados ON acessoBI
    FOR ALL USING (auth.jwt() ->> 'email' = email);

-- Política para dados_campanhas - baseada em acesso por empresa
CREATE POLICY acesso_por_empresa ON dados_campanhas
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM acessoBI 
            WHERE email = auth.jwt() ->> 'email' 
            AND ativo = true 
            AND (
                role = 'Admin' 
                OR empresa @> ARRAY[dados_campanhas.empresa]
            )
        )
    );

-- ============================================
-- 9. TRIGGERS PARA AUDITORIA
-- ============================================

-- Função para atualizar ultimo_acesso
CREATE OR REPLACE FUNCTION atualizar_ultimo_acesso()
RETURNS TRIGGER AS $$
BEGIN
    NEW.ultimo_acesso = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar ultimo_acesso em acessoBI
DROP TRIGGER IF EXISTS trigger_ultimo_acesso ON acessoBI;
CREATE TRIGGER trigger_ultimo_acesso
    BEFORE UPDATE ON acessoBI
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_ultimo_acesso();

-- ============================================
-- COMANDO FINAL DE VERIFICAÇÃO
-- ============================================

-- Verificar se todas as tabelas foram criadas
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE tablename IN ('empresas', 'contas_campanhas', 'dados_campanhas', 'acessoBI')
ORDER BY tablename;
