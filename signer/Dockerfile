# Node 22+ ships a global WebSocket, which @supabase/supabase-js (realtime) needs at init.
FROM node:22-slim

WORKDIR /app

# Install deps first for better layer caching. tsx is a runtime dep (runs the TS entrypoint),
# so install everything — do NOT use --omit=dev here.
COPY package.json package-lock.json* ./
RUN npm install

COPY . .

ENV NODE_ENV=production
EXPOSE 8080

# tsx runs the TypeScript entrypoint directly (no separate build step).
CMD ["node", "--import", "tsx", "src/server.ts"]
