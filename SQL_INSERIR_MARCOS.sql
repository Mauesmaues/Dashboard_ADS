-- Execute este SQL no Supabase SQL Editor:

-- 0. PRIMEIRO: Criar as tabelas se não existirem (usando nome correto do Supabase)
CREATE TABLE IF NOT EXISTS empresas (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS empresa_ad_accounts (
    id SERIAL PRIMARY KEY,
    empresa VARCHAR(255) NOT NULL REFERENCES empresas(nome),
    ad_account_id VARCHAR(255) NOT NULL,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(empresa, ad_account_id)
);

-- 1. Inserir empresas básicas (se não existirem)
INSERT INTO empresas (nome) VALUES 
('Marcos'),
('Conceito Prime'),
('Empresa A'),
('Empresa B')
ON CONFLICT (nome) DO NOTHING;

-- 2. Inserir mapeamento empresa -> ad_account_id
INSERT INTO empresa_ad_accounts (empresa, ad_account_id) VALUES 
('Marcos', '1348060849739832')
ON CONFLICT (empresa, ad_account_id) DO NOTHING;

-- 3. Verificar se foi inserido corretamente
SELECT * FROM empresa_ad_accounts WHERE empresa = 'Marcos';
