FROM node:20-alpine AS base
RUN apk add --no-cache tini
WORKDIR /app

# ── Dependencies ──
FROM base AS deps
COPY server/package.json server/package-lock.json* ./server/
COPY package.json package-lock.json* ./
RUN cd server && npm ci --omit=dev && cd .. && npm ci --omit=dev

# ── Build frontend ──
FROM base AS builder
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

# ── Production image ──
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=5000

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser

COPY --from=deps /app/server/node_modules ./server/node_modules
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

COPY server/ ./server/

RUN mkdir -p server/uploads && chown -R appuser:nodejs /app

USER appuser

EXPOSE 5000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server/server.js"]
