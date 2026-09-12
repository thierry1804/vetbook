# Image dédiée VPS (Cloudflare Tunnel -> localhost:3000 dans le conteneur).
# Pas de build front séparé : `npm run build` minifie app.js/styles.css/data-layer.js
# dans dist/, servi statiquement par server.js (Express).
FROM node:22-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build
RUN npm prune --omit=dev

FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/api ./api
COPY --from=build /app/server.js ./server.js
COPY --from=build /app/package.json ./package.json

RUN addgroup -S vetbook && adduser -S vetbook -G vetbook
USER vetbook

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
