FROM node:18-bullseye-slim

WORKDIR /app

# Make npm more stable (workaround for npm 10.x bugs in some CI environments)
RUN npm install -g npm@11.7.0

# Copy package manifests first for better caching
COPY package.json package-lock.json* ./

# Install production dependencies (fast, deterministic)
RUN npm ci --omit=dev --no-audit --no-fund

# Verify core deps exist right after install
RUN node -e "require('express'); console.log('express ok after install')"

# Copy app source (node_modules excluded via .dockerignore)
COPY . .

ENV NODE_ENV=production
ENV PORT=10000

EXPOSE 10000

CMD ["npm","start"]
