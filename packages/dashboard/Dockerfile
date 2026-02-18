FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY packages/dashboard/package.json ./packages/dashboard/
COPY packages/common/package.json ./packages/common/
COPY packages/edge-gateway/package.json ./packages/edge-gateway/
COPY packages/stream-processor/package.json ./packages/stream-processor/
COPY packages/batch-processor/package.json ./packages/batch-processor/
COPY packages/api/package.json ./packages/api/
RUN pnpm install --frozen-lockfile

COPY packages/dashboard ./packages/dashboard
RUN pnpm --filter @anybotics/dashboard build

FROM nginx:alpine
COPY --from=builder /app/packages/dashboard/dist /usr/share/nginx/html
COPY packages/dashboard/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
