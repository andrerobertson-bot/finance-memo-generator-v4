
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install
EXPOSE 10000
CMD ["node", "server/index.js"]
