FROM node:20-slim

WORKDIR /app

# Install deps first for better layer caching.
COPY package.json package-lock.json* ./
RUN npm install --omit=dev || npm install

COPY . .

ENV NODE_ENV=production
EXPOSE 8080

# tsx runs the TypeScript entrypoint directly (no separate build step).
CMD ["node", "--import", "tsx", "src/server.ts"]
