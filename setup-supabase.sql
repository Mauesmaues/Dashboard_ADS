-- 📊 Script SQL para Dashboard ADS - Supabase
-- Execute este script completo no SQL Editor do Supabase

-- 1. Criar tabela de usuários e autenticação
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

-- 2. Criar tabela de empresas
CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    empresa VARCHAR(255) UNIQUE NOT NULL
);

-- 3. Criar tabela de leads/conversões
CREATE TABLE IF NOT EXISTS bills (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT NOW(),
    empresa VARCHAR(255) NOT NULL,
    leadId VARCHAR(255),
    price DECIMAL(10,2) DEFAULT 0
);

-- 4. Criar tabela de custos diários
CREATE TABLE IF NOT EXISTS custoDiaMeta (
    id SERIAL PRIMARY KEY,
    dia DATE NOT NULL,
    empresa VARCHAR(255) NOT NULL,
    custo DECIMAL(10,2) DEFAULT 0
);

-- 5. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_bills_empresa_date ON bills(empresa, created_at);
CREATE INDEX IF NOT EXISTS idx_custodiameta_empresa_dia ON custoDiaMeta(empresa, dia);
CREATE INDEX IF NOT EXISTS idx_acessobi_email ON acessoBI(email);

-- 6. Inserir empresas iniciais
INSERT INTO companies (empresa) VALUES 
('Conceito Prime'),
('Empresa A'),
('Empresa B'),
('Empresa C')
ON CONFLICT (empresa) DO NOTHING;

-- 7. Criar usuário administrador
-- Senha: admin123 (já hasheada com bcrypt)
INSERT INTO acessoBI (email, password, nome, role, empresa, ativo) VALUES 
('admin@conceitoprime.com', '$2b$10$rQc7VwjCQHXqP9N4GWl/V.HWGx6P4E4VZ2Q4uF8OgZ1v8MzN3D9ZG', 'Administrador', 'Admin', ARRAY['Conceito Prime', 'Empresa A', 'Empresa B', 'Empresa C'], true)
ON CONFLICT (email) DO NOTHING;

-- 8. Inserir dados de exemplo dos últimos 7 dias
-- Leads/conversões
INSERT INTO bills (created_at, empresa, leadId, price) VALUES 
-- Hoje
(NOW() - INTERVAL '0 days' + INTERVAL '10 hours', 'Conceito Prime', 'LEAD001', 150.00),
(NOW() - INTERVAL '0 days' + INTERVAL '14 hours', 'Empresa A', 'LEAD002', 200.00),
(NOW() - INTERVAL '0 days' + INTERVAL '16 hours', 'Empresa B', 'LEAD003', 175.00),
-- Ontem
(NOW() - INTERVAL '1 days' + INTERVAL '9 hours', 'Conceito Prime', 'LEAD004', 225.00),
(NOW() - INTERVAL '1 days' + INTERVAL '15 hours', 'Empresa A', 'LEAD005', 180.00),
(NOW() - INTERVAL '1 days' + INTERVAL '17 hours', 'Empresa C', 'LEAD006', 190.00),
-- 2 dias atrás
(NOW() - INTERVAL '2 days' + INTERVAL '11 hours', 'Conceito Prime', 'LEAD007', 160.00),
(NOW() - INTERVAL '2 days' + INTERVAL '13 hours', 'Empresa B', 'LEAD008', 210.00),
-- 3 dias atrás
(NOW() - INTERVAL '3 days' + INTERVAL '12 hours', 'Empresa A', 'LEAD009', 195.00),
(NOW() - INTERVAL '3 days' + INTERVAL '16 hours', 'Empresa C', 'LEAD010', 170.00),
-- 4 dias atrás
(NOW() - INTERVAL '4 days' + INTERVAL '10 hours', 'Conceito Prime', 'LEAD011', 185.00),
(NOW() - INTERVAL '4 days' + INTERVAL '14 hours', 'Empresa B', 'LEAD012', 205.00),
-- 5 dias atrás
(NOW() - INTERVAL '5 days' + INTERVAL '11 hours', 'Empresa A', 'LEAD013', 165.00),
(NOW() - INTERVAL '5 days' + INTERVAL '15 hours', 'Conceito Prime', 'LEAD014', 220.00),
-- 6 dias atrás
(NOW() - INTERVAL '6 days' + INTERVAL '13 hours', 'Empresa C', 'LEAD015', 175.00),
(NOW() - INTERVAL '6 days' + INTERVAL '17 hours', 'Empresa B', 'LEAD016', 155.00);

-- 9. Inserir custos diários dos últimos 7 dias
INSERT INTO custoDiaMeta (dia, empresa, custo) VALUES 
-- Hoje
(CURRENT_DATE, 'Conceito Prime', 500.00),
(CURRENT_DATE, 'Empresa A', 300.00),
(CURRENT_DATE, 'Empresa B', 450.00),
(CURRENT_DATE, 'Empresa C', 350.00),
-- Ontem
(CURRENT_DATE - INTERVAL '1 day', 'Conceito Prime', 480.00),
(CURRENT_DATE - INTERVAL '1 day', 'Empresa A', 320.00),
(CURRENT_DATE - INTERVAL '1 day', 'Empresa B', 470.00),
(CURRENT_DATE - INTERVAL '1 day', 'Empresa C', 340.00),
-- 2 dias atrás
(CURRENT_DATE - INTERVAL '2 days', 'Conceito Prime', 520.00),
(CURRENT_DATE - INTERVAL '2 days', 'Empresa A', 290.00),
(CURRENT_DATE - INTERVAL '2 days', 'Empresa B', 440.00),
(CURRENT_DATE - INTERVAL '2 days', 'Empresa C', 360.00),
-- 3 dias atrás
(CURRENT_DATE - INTERVAL '3 days', 'Conceito Prime', 495.00),
(CURRENT_DATE - INTERVAL '3 days', 'Empresa A', 310.00),
(CURRENT_DATE - INTERVAL '3 days', 'Empresa B', 455.00),
(CURRENT_DATE - INTERVAL '3 days', 'Empresa C', 345.00),
-- 4 dias atrás
(CURRENT_DATE - INTERVAL '4 days', 'Conceito Prime', 510.00),
(CURRENT_DATE - INTERVAL '4 days', 'Empresa A', 305.00),
(CURRENT_DATE - INTERVAL '4 days', 'Empresa B', 460.00),
(CURRENT_DATE - INTERVAL '4 days', 'Empresa C', 355.00),
-- 5 dias atrás
(CURRENT_DATE - INTERVAL '5 days', 'Conceito Prime', 485.00),
(CURRENT_DATE - INTERVAL '5 days', 'Empresa A', 315.00),
(CURRENT_DATE - INTERVAL '5 days', 'Empresa B', 435.00),
(CURRENT_DATE - INTERVAL '5 days', 'Empresa C', 365.00),
-- 6 dias atrás
(CURRENT_DATE - INTERVAL '6 days', 'Conceito Prime', 505.00),
(CURRENT_DATE - INTERVAL '6 days', 'Empresa A', 295.00),
(CURRENT_DATE - INTERVAL '6 days', 'Empresa B', 465.00),
(CURRENT_DATE - INTERVAL '6 days', 'Empresa C', 335.00);

-- 10. Verificar se tudo foi criado corretamente
SELECT 'Tabelas criadas:' as status;
SELECT schemaname, tablename FROM pg_tables WHERE tablename IN ('acessobi', 'companies', 'bills', 'custodiameta');

SELECT 'Empresas cadastradas:' as status;
SELECT empresa FROM companies ORDER BY empresa;

SELECT 'Usuários criados:' as status;
SELECT email, nome, role, empresa FROM acessoBI;

SELECT 'Total de leads:' as status;
SELECT COUNT(*) as total_leads FROM bills;

SELECT 'Total de custos:' as status;
SELECT COUNT(*) as total_custos FROM custoDiaMeta;

-- 🎉 PRONTO! Agora você pode:
-- 1. Configurar o .env com suas credenciais do Supabase
-- 2. Executar: node test-supabase.js
-- 3. Executar: npm run dev
-- 4. Acessar: http://localhost:3000/login.html
-- 5. Login: admin@conceitoprime.com | Senha: admin123
