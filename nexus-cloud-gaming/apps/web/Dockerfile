# Imagem de produção do site (build a partir da raiz do monorepo):
#   docker build -f apps/web/Dockerfile -t nexus-web .
FROM node:22-alpine AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/
COPY apps/web/package.json apps/web/
RUN npm ci --ignore-scripts

FROM deps AS build
COPY packages packages
COPY apps/web apps/web
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build -w @nexus/web

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /repo/apps/web/public ./apps/web/public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "apps/web/server.js"]
