FROM node:20-bookworm-slim

# --- System deps for Chromium (Playwright) ---
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    fontconfig \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpangocairo-1.0-0 \
    libpango-1.0-0 \
    libcairo2 \
    libdrm2 \
    libgtk-3-0 \
    libx11-6 \
    libxext6 \
    libxrender1 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Build stamp (optional)
ARG GIT_SHA=unknown
ENV GIT_SHA=${GIT_SHA}
ENV BUILD_TIME=unknown

COPY package*.json ./
RUN npm install --omit=dev

# Install Chromium
RUN npx playwright install --with-deps chromium

COPY . .

ENV NODE_ENV=production
ENV PORT=10000
EXPOSE 10000

CMD ["npm","start"]
