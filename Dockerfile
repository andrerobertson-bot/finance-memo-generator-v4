FROM node:18-bullseye-slim

WORKDIR /app

# Copy package manifests first for better caching
COPY package.json package-lock.json* ./

# Install production dependencies
RUN npm install --omit=dev

# Check immediately after install
RUN node -e "require('express'); console.log('express ok after install')"

# Copy app source (node_modules excluded via .dockerignore)
COPY . .

# Check again after copying source (detect accidental overwrite)
RUN node -e "require('express'); console.log('express ok after copy')"

ENV NODE_ENV=production
ENV PORT=10000

EXPOSE 10000

CMD ["npm","start"]
