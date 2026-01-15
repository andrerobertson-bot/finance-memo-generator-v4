FROM node:18-bullseye-slim

WORKDIR /app

# Copy package manifests first for better caching
COPY package.json package-lock.json* ./

# Install production dependencies
RUN npm install --omit=dev

# Fail fast if core deps are missing
RUN node -e "require('express'); console.log('express ok')"

# Copy app source
COPY . .

ENV NODE_ENV=production
ENV PORT=10000

EXPOSE 10000

CMD ["npm","start"]
