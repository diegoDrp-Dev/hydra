FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY turbo.json ./
COPY packages ./packages
COPY apps/api-gateway/package*.json ./apps/api-gateway/

# Install dependencies
# Adicionamos as engines para garantir que o esbuild linux seja baixado
RUN npm install --legacy-peer-deps --platform=linux --arch=x64

# Copy prisma schema for generation
COPY apps/api-gateway/prisma ./apps/api-gateway/prisma

# Generate Prisma client
RUN cd apps/api-gateway && npx prisma generate

EXPOSE 3000

# No desenvolvimento, o código é montado via volume, 
# mas mantemos o CMD apontando para o workspace correto
CMD ["npm", "--workspace=api-gateway", "run", "dev"]
