-- Create companies table for Dashboard_ADS
-- Run this SQL in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS empresas (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL UNIQUE,
    descricao TEXT,
    ad_account_id VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_empresas_nome ON empresas(nome);
CREATE INDEX IF NOT EXISTS idx_empresas_ad_account_id ON empresas(ad_account_id);

-- Insert sample data (optional)
INSERT INTO empresas (nome, descricao, ad_account_id) VALUES 
('Marcos', 'Empresa principal de campanhas', 'act_123456789')
ON CONFLICT (nome) DO NOTHING;

-- Enable Row Level Security (RLS) if needed
-- ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users (if RLS is enabled)
-- CREATE POLICY "Allow authenticated users to view companies" ON empresas
--     FOR SELECT USING (auth.role() = 'authenticated');

-- Create policy for admins to manage companies (if RLS is enabled)
-- CREATE POLICY "Allow admins to manage companies" ON empresas
--     FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

COMMENT ON TABLE empresas IS 'Tabela para gerenciar empresas e seus Ad Account IDs';
COMMENT ON COLUMN empresas.nome IS 'Nome único da empresa';
COMMENT ON COLUMN empresas.descricao IS 'Descrição opcional da empresa';
COMMENT ON COLUMN empresas.ad_account_id IS 'ID da conta de anúncios no formato act_XXXXXXXXX';
