# Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Copy root workspace files
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY packages/shared-types ./packages/shared-types
COPY apps/web ./apps/web

# Install dependencies
RUN npm install -g pnpm
RUN pnpm install --filter web... --filter @entregapro/shared-types

# Build the app
WORKDIR /app/apps/web
RUN pnpm build

# Production stage
FROM nginx:alpine

COPY --from=build /app/apps/web/dist /usr/share/nginx/html
# Add custom nginx config if needed (e.g. for React Router)
RUN echo "server { listen 80; location / { root /usr/share/nginx/html; index index.html; try_files \$uri \$uri/ /index.html; } }" > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
