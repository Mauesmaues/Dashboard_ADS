-- SQL para inserir empresa "Marcos" e vinculá-la ao ad_account_id existente

-- 1. Inserir a empresa na tabela companies (se não existir)
INSERT INTO companies (empresa) VALUES ('Marcos')
ON CONFLICT (empresa) DO NOTHING;

-- 2. Vincular a empresa "Marcos" ao ad_account_id existente
INSERT INTO empresa_ad_accounts (empresa, ad_account_id) VALUES 
('Marcos', '1348060849739832')
ON CONFLICT (empresa, ad_account_id) DO NOTHING;

-- 3. Verificar os dados inseridos
SELECT 
    c.id as company_id,
    c.empresa,
    eaa.ad_account_id,
    eaa.ativo,
    eaa.created_at
FROM companies c
LEFT JOIN empresa_ad_accounts eaa ON c.empresa = eaa.empresa
WHERE c.empresa = 'Marcos';

-- 4. Ver todos os mapeamentos existentes
SELECT * FROM empresa_ad_accounts ORDER BY created_at;
