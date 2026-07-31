FROM node:24-bookworm-slim AS base
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

FROM base AS deps
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
COPY apps/site/package.json apps/site/package.json
COPY apps/admin/package.json apps/admin/package.json
COPY packages/brand/package.json packages/brand/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/database/package.json packages/database/package.json
RUN npm ci --ignore-scripts

FROM base AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run db:generate
RUN BETTER_AUTH_SECRET=build-only-secret-that-is-never-used-at-runtime \
    AUTH_RATE_LIMIT_SECRET=build-only-rate-secret-that-is-never-used \
    ADMIN_APP_URL=http://localhost:3001 \
    PUBLIC_SITE_URL=http://localhost:3000 \
    ADMIN_EMAILS=build@example.com \
    DATABASE_URL=postgresql://build:build@localhost:5432/build \
    npm run build --workspace @fruition/admin

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3001
COPY --from=builder --chown=node:node /app/apps/admin/.next/standalone ./
COPY --from=builder --chown=node:node /app/apps/admin/.next/static ./apps/admin/.next/static
USER node
EXPOSE 3001
CMD ["node", "apps/admin/server.js"]
