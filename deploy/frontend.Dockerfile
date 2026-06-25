# Frontend image — Next.js standalone build.
#
# next.config.ts sets `output: "standalone"`, so `next build` emits a
# self-contained server bundle (.next/standalone/server.js + a minimal
# node_modules). The runner stage carries only that bundle plus the static
# assets — no full node_modules, no `next` CLI. Caddy proxies / to this server.
FROM node:20-alpine AS builder

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ---- runner ----
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production \
    PORT=5010 \
    HOSTNAME=0.0.0.0

# Standalone server + the static/public assets it serves.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 5010
CMD ["node", "server.js"]
