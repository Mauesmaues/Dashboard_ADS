# Planejamento do Projeto: BI Supabase

## Visão Geral
Este projeto consiste em desenvolver uma aplicação de Business Intelligence (BI) que se conecta ao Supabase para extrair, processar e visualizar dados relacionados a métricas de desempenho. A aplicação permitirá filtrar os dados por data e empresa, exibindo informações cruciais em uma tabela de análise.

## Informações do Cliente
**Por favor, preencha as seguintes informações:**

## Tecnologias
- **Backend**: Node.js
- **Banco de Dados**: Supabase (PostgreSQL)
- **Frontend**: HTML, CSS, JavaScript (opcionalmente: React ou Vue.js)
- **Visualização de Dados**: Chart.js

## Estrutura do Projeto
```
BI SUPABASE/
├── src/
│   ├── config/
│   │   └── supabase.js           # Configuração de conexão com o Supabase
│   ├── controllers/
│   │   └── dataController.js     # Controladores para manipulação dos dados
│   ├── models/
│   │   └── dataModel.js          # Modelos de dados e queries para o Supabase
│   ├── routes/
│   │   └── apiRoutes.js          # Rotas da API
│   └── utils/
│       └── dateFormatter.js      # Utilitários para formatação de datas e cálculos
├── public/
│   ├── css/
│   │   └── styles.css            # Estilos da aplicação
│   ├── js/
│   │   ├── app.js                # Lógica principal do frontend
│   │   ├── charts.js             # Configuração e renderização dos gráficos
│   │   └── filters.js            # Implementação dos filtros (data e empresa)
│   └── index.html                # Página principal da aplicação
├── tests/                        # Testes unitários e de integração
├── .env                          # Variáveis de ambiente (credenciais Supabase, etc.)
├── package.json                  # Dependências e scripts do projeto
└── README.md                     # Documentação do projeto
```

## Requisitos Funcionais

### 1. Conexão com o Supabase
- Implementar autenticação segura com o Supabase
- Configurar queries para extração dos dados necessários
- Gerenciar conexões e tratamento de erros

**Informações de Conexão Supabase:**
- **URL do Projeto Supabase**: https://supabase.com/dashboard/project/asjuyhoplswopzxuybrk/settings/general
- **Chave de API (pública)**: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzanV5aG9wbHN3b3B6eHV5YnJrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTE0OTc3OCwiZXhwIjoyMDY0NzI1Nzc4fQ.UX0Hh3LJTFe7LOq94aiIVmUuNr8-l_HaMCMa8pp7iRk
- **Método de Autenticação Preferido**: _________________________________
- **Permissões Necessárias**: _________________________________

### 2. Filtros
- **Filtro de Data**: Permitir seleção de período (intervalo de datas)
- **Filtro de Empresa**: Dropdown com lista de empresas disponíveis
- Implementar filtragem em tempo real ou através de botão "Aplicar Filtros"

**Detalhes dos Filtros Necessários:**
- **Formato de Data Preferido**: dd/MM/yyyy
- **Período Padrão Inicial**: primeiro dia do mês até o dia atual, se atentando com a timezone
- **Lista de Empresas para Filtro** (ou de onde obtê-las): na table companies
- **Filtros Adicionais Necessários**:
  - filtro por empresa
- **Comportamento Preferido**: [ ] Filtragem em tempo real [x] Botão "Aplicar Filtros"

### 3. Tabela de Dados
A tabela principal deverá exibir as seguintes colunas:
- **Data**: Data do registro
- **Total de Registros**: Quantidade de registros para aquela data/empresa
- **Custo Rooster**: Valor do custo Rooster
- **Gasto**: Total gasto
- **CPL Meta**: Meta de Custo Por Lead
- **CPL Total**: Custo Por Lead total realizado

**Detalhes do Cálculo das Métricas:**
- **Cálculo do Total de Registros**: total de itens encontrados nos filtros
- **Descrição do Custo Rooster**: a soma da coluna "price" de todos os itens encontrados nos filtros
- **Fórmula de Cálculo do CPL Total**: Mesmo cálculo do CPL Meta, mas é somado o custo rooster junto ao gasto
- **Origem da CPL Meta**: A CPL Meta é o total de registros no período dividido pelo gasto(encontrado na table custoDiaMeta, separado por dia e empresa)
- **Agrupamento Preferido dos Dados** (diário, semanal, mensal): diário
- **Ordenação Preferida** (crescente/decrescente, por qual coluna): crescente por dia

### 4. Funcionalidades Adicionais
- Exportação de dados para CSV/Excel
- Visualização em gráficos das métricas principais
- Modo de comparação entre períodos ou empresas
- Dashboard com KPIs resumidos

**Preferências para Funcionalidades Adicionais:**
- **Formatos de Exportação Necessários**: [ ] CSV [x] Excel [ ] PDF [ ] Outro: ____________
- **Tipos de Gráficos Desejados**: [ ] Linha [x] Barra [ ] Pizza [ ] Área [ ] Outro: ____________


**Por favor, forneça as informações sobre as tabelas existentes no seu Supabase:**

### Tabela de Registros de Leads/Conversões
- **Nome da Tabela**: bills
- **Colunas Principais**: 
  - created_at,empresa,leadId,price
- **Chave Primária**: leadId
- **Frequência de Atualização**: tempo real

### Tabela de Custos e Gastos
- **Nome da Tabela**: custoDiaMeta 
- **Colunas Principais**: 
  - dia(date),empresa,custo
- **Chave Primária**: dia e empresa
- **Relacionamento com outras tabelas**: relacionado pela empresa

### Tabela de Empresas/Clientes
- **Nome da Tabela**: companies
- **Colunas Principais**: 
  - empresa
- **Chave Primária**: empresa

## Dependências do Node.js
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.x.x",    // Cliente oficial do Supabase
    "express": "^4.x.x",                  // Framework web
    "dotenv": "^16.x.x",                  // Gerenciamento de variáveis de ambiente
    "cors": "^2.x.x",                     // Middleware para CORS
    "moment": "^2.x.x",                   // Manipulação de datas
    "chart.js": "^3.x.x",                 // Biblioteca de gráficos (opcional)
    "xlsx": "^0.18.x"                     // Para exportação de dados
  },
  "devDependencies": {
    "jest": "^29.x.x",                    // Framework de testes
    "nodemon": "^2.x.x",                  // Reinicialização automática durante desenvolvimento
    "eslint": "^8.x.x"                    // Linting de código
  }
}
```

## Considerações de Segurança
- Armazenar credenciais do Supabase em variáveis de ambiente (.env)
- Implementar autenticação de usuários para acesso ao BI
- Validar todas as entradas de usuário para prevenir injeção SQL
- Limitar o acesso a dados sensíveis com base em permissões de usuário

## Interface do Usuário
**Por favor, forneça suas preferências de design:**
- **Esquema de Cores Corporativas**: _________________________________
- **Logo para Inclusão no BI**: [ ] Sim [x] Não
- **Layout Preferido**: [ ] Dashboard Único [x] Múltiplas Páginas [ ] Outro: ____________
- **Responsividade**: [x] Desktop apenas [ ] Desktop e Mobile [ ] Principalmente Mobile
## Requisitos de Hospedagem
- **Ambiente de Hospedagem**: [ ] Nuvem [x] Servidor Local [ ] Outro: ____________
- **Restrições de Acesso**: [ ] Público [x] Restrito por Login [ ] Outro: ____________
