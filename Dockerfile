FROM node:20.17.0-bullseye-slim

WORKDIR /app

# Upgrade npm to a stable version (npm 11 requires Node >=20.17)
RUN npm install -g npm@11.7.0

# Copy package manifests first for better caching
COPY package.json package-lock.json* ./

# Deterministic production install
RUN npm ci --omit=dev --no-audit --no-fund

# Verify core deps exist right after install
RUN node -e "require('express'); console.log('express ok after install')"

# Copy app source (node_modules excluded via .dockerignore)
COPY . .

ENV NODE_ENV=production
ENV PORT=10000

EXPOSE 10000

CMD ["npm","start"]
