FROM node:18-bullseye-slim

WORKDIR /app

# Copy package manifests first for better caching
COPY package.json package-lock.json* ./

# Install production dependencies (will run postinstall)
RUN npm install --omit=dev

# Copy app source (node_modules excluded via .dockerignore)
COPY . .

# Fail fast if core deps are missing
RUN node -e "require('express'); console.log('express ok')"

ENV NODE_ENV=production
ENV PORT=10000

EXPOSE 10000

CMD ["npm","start"]
