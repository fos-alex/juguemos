# Caddy with the web app built in, so every `docker compose up --build` ships
# the current web app along with the API. Build context: the repo root.
FROM node:24-alpine AS web
WORKDIR /app
COPY package.json package-lock.json ./
COPY api/package.json api/package.json
COPY web/package.json web/package.json
RUN npm ci --workspace web
COPY web web
RUN npm run build -w web

FROM caddy:2-alpine
COPY --from=web /app/web/dist /srv
