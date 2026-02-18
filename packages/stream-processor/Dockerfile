FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY packages/common/package.json ./packages/common/
COPY packages/stream-processor/package.json ./packages/stream-processor/
COPY packages/edge-gateway/package.json ./packages/edge-gateway/
COPY packages/batch-processor/package.json ./packages/batch-processor/
COPY packages/api/package.json ./packages/api/
RUN pnpm install --frozen-lockfile

COPY tsconfig.base.json ./
COPY packages/common ./packages/common
COPY packages/stream-processor ./packages/stream-processor

RUN mkdir -p node_modules/@anybotics && \
    rm -rf node_modules/@anybotics/common && \
    ln -s /app/packages/common node_modules/@anybotics/common && \
    pnpm --filter @anybotics/common build && \
    pnpm --filter @anybotics/stream-processor build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/common ./packages/common
COPY --from=builder /app/packages/stream-processor/dist ./dist
COPY --from=builder /app/packages/stream-processor/package.json ./
USER node
EXPOSE 3002
CMD ["node", "dist/main.js"]
