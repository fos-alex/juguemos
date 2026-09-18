FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY api/package.json api/package.json
COPY web/package.json web/package.json
RUN npm ci --workspace api --omit=dev
# The Claude Code CLI, for LLM_PROVIDER=claude-code (JUG-168). It is a native
# binary, which on Alpine needs the C++ runtime.
RUN apk add --no-cache libgcc libstdc++ \
  && npm install -g @anthropic-ai/claude-code \
  && npm cache clean --force
COPY api/migrations api/migrations
COPY api/seeds api/seeds
COPY api/sounds api/sounds
COPY api/src api/src
USER node
CMD ["node", "api/src/server.js"]
