# Multi-stage Production Dockerfile for EPSS Enterprise EDRMS
# Ethiopian Pharmaceutical Supply Service (EPSS)

FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package.json package-lock.json* ./
RUN npm install --frozen-lockfile || npm install

# Copy source tree and compile client asset bundles
COPY . .
RUN npm run build

# Stage 2: Minimal Production Runtime
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies only
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --ignore-scripts || npm install

# Install tsx globally or maintain minimal runner
RUN npm install -g tsx

# Copy built frontend assets and server application code
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/server ./server
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Prepare persistent data directories
RUN mkdir -p /app/data/backups /app/data/uploads && \
    addgroup -g 1001 epss && \
    adduser -u 1001 -G epss -s /bin/sh -D epss && \
    chown -R epss:epss /app/data

USER epss

EXPOSE 3000

VOLUME ["/app/data"]

CMD ["tsx", "server.ts"]
