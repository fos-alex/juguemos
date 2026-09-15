# Caddy with the web app built in, so every `docker compose up --build` ships
# the current web app along with the API. Build context: the repo root.
FROM node:24-alpine AS web-deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY api/package.json api/package.json
COPY web/package.json web/package.json
RUN npm ci --workspace web

# Development only (compose.dev.yml): Vite's dev server, with web/ mounted
# from the host, so a change reloads without a rebuild.
FROM web-deps AS web-dev
USER node
CMD ["npm", "run", "dev", "-w", "web", "--", "--host", "0.0.0.0", "--port", "5173", "--strictPort"]

FROM web-deps AS web
COPY web web
RUN npm run build -w web

FROM caddy:2-alpine
COPY --from=web /app/web/dist /srv
