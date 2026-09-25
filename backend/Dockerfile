FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN apk add --no-cache libstdc++
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY server.js ./
COPY api ./api
COPY db ./db
COPY scripts ./scripts

RUN addgroup -S applika && adduser -S applika -G applika \
  && chown -R applika:applika /app
USER applika

EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --retries=5 --start-period=30s \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
