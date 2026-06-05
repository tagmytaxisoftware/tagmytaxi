# ── Build stage ────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY packages/web-app/package*.json ./packages/web-app/
COPY packages/shared/package*.json ./packages/shared/
RUN npm ci --workspace=packages/web-app --workspace=packages/shared

COPY packages/shared ./packages/shared
COPY packages/web-app ./packages/web-app
COPY tsconfig.json ./

RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=packages/web-app

# ── Production stage ────────────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/packages/web-app/.next/standalone ./
COPY --from=builder /app/packages/web-app/.next/static ./packages/web-app/.next/static
COPY --from=builder /app/packages/web-app/public ./packages/web-app/public

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

USER node
CMD ["node", "packages/web-app/server.js"]
