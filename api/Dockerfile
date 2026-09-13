FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY api/package.json api/package.json
COPY web/package.json web/package.json
RUN npm ci --workspace api --omit=dev
COPY api/src api/src
USER node
CMD ["node", "api/src/server.js"]
