# Multi-stage build for the API. Build context must be the monorepo root:
#   docker build -f docker/api.Dockerfile -t sternen-api .
FROM node:22-alpine AS build
WORKDIR /repo

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci

COPY packages/shared packages/shared
COPY apps/api apps/api
COPY tsconfig.base.json ./

RUN npm run build --workspace packages/shared
RUN npm run build --workspace apps/api

# Prune to production-only dependencies for the final image.
RUN npm prune --omit=dev --workspace apps/api

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /repo/node_modules /app/node_modules
COPY --from=build /repo/packages/shared/package.json /app/packages/shared/package.json
COPY --from=build /repo/packages/shared/dist /app/packages/shared/dist
COPY --from=build /repo/apps/api/package.json /app/apps/api/package.json
COPY --from=build /repo/apps/api/dist /app/apps/api/dist
COPY --from=build /repo/apps/api/src/db/migrations /app/apps/api/dist/db/migrations

EXPOSE 4000
USER node

CMD ["node", "apps/api/dist/server.js"]
