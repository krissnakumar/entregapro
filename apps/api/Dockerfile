# Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Copy root workspace files
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY packages/shared-types ./packages/shared-types
COPY apps/api ./apps/api

# Install dependencies
RUN npm install -g pnpm
RUN pnpm install --filter api... --filter @entregapro/shared-types

# Generate Prisma client
WORKDIR /app/apps/api
RUN npx prisma generate

# Build the app
RUN pnpm build

# Production stage
FROM node:20-alpine

WORKDIR /app

COPY --from=build /app/package.json ./
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/prisma ./apps/api/prisma

EXPOSE 3000

CMD ["node", "apps/api/dist/main"]
