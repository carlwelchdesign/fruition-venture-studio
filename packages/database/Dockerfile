FROM node:24-bookworm-slim
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends postgresql-client \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY apps/site/package.json apps/site/package.json
COPY apps/admin/package.json apps/admin/package.json
COPY packages/brand/package.json packages/brand/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/database/package.json packages/database/package.json
RUN npm ci --ignore-scripts
COPY packages/database packages/database
RUN npm run db:generate
USER node
