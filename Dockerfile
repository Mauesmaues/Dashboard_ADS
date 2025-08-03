FROM node:20-alpine

# Criar diretório da aplicação
WORKDIR /app

# Instalar pacotes necessários
RUN apk add --no-cache --virtual .build-deps python3 make g++ \
    && apk add --no-cache bash curl tzdata \
    && cp /usr/share/zoneinfo/America/Sao_Paulo /etc/localtime \
    && echo "America/Sao_Paulo" > /etc/timezone

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm install --quiet

# Remover pacotes de build e limpar cache
RUN apk del .build-deps \
    && npm cache clean --force \
    && rm -rf /tmp/*

# Copiar todo o código fonte da aplicação
COPY . .

# Atualizar a configuração do Supabase para corrigir problemas de sessão
COPY src/config/supabase.js.new src/config/supabase.js

# Expor a porta da aplicação
EXPOSE 3000

# Definir variáveis de ambiente para desenvolvimento
ENV NODE_ENV=development
ENV PORT=3000
ENV SESSION_SECRET=bi-supabase-secret-key-complex
ENV COOKIE_SECURE=false
ENV COOKIE_SAME_SITE=lax
ENV CORS_ORIGIN=http://localhost:3000
ENV TZ=America/Sao_Paulo

# Script para iniciar a aplicação com verificação de estrutura de dados
COPY scripts/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Comando para iniciar a aplicação
ENTRYPOINT ["/docker-entrypoint.sh"]
