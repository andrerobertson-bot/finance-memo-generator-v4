
FROM node:18-bullseye-slim
WORKDIR /app
COPY . .
RUN npm install
ENV NODE_ENV=production
EXPOSE 10000
CMD ["npm","start"]
