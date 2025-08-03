#!/bin/sh
set -e

# Script de inicialização para ambiente Docker

echo "Iniciando BI Supabase em ambiente Docker"
echo "========================================"
echo "Node.js: $(node -v)"
echo "Ambiente: $NODE_ENV"
echo "Timezone: $(date +%Z)"
echo "Data/hora atual: $(date)"

# Executar script de verificação e correção da tabela acessosBI
echo "Verificando estrutura de dados..."
node scripts/fix-table-structure.js

# Executar script de fix para conexão com Supabase
echo "Verificando configuração do Supabase..."
node scripts/fix-supabase-connection.js

# Iniciar a aplicação
echo "Iniciando aplicação..."
exec node src/index.js
