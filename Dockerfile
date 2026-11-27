FROM node:22-alpine AS builder
WORKDIR /app

# Copy workspace manifests
COPY package.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/

RUN npm install

# Copy shared, server, and client source
COPY shared ./shared
COPY server ./server
COPY client ./client

# Build client and server
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY package.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/
RUN npm install --omit=dev --workspace=server

COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./client/dist

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "server/dist/server/src/index.js"]
