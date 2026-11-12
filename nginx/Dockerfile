# Build du front puis reverse-proxy Nginx (seul point d'entrée public).
FROM node:24-alpine AS frontend-build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci || npm install
COPY frontend/ ./
RUN if [ ! -f config.js ]; then cp config.example.js config.js; fi
RUN npm run build

FROM node:24-alpine AS admin-build
WORKDIR /app
COPY admin/package.json admin/package-lock.json* ./
RUN npm ci || npm install
COPY admin/ ./
RUN npx vite build

FROM nginx:1.27-alpine
COPY --from=admin-build /app/dist /usr/share/nginx/admin
COPY --from=frontend-build /app/dist /usr/share/nginx/html
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/security-headers.conf /etc/nginx/security-headers.conf
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/healthz || exit 1
