# ==========================================
# STAGE 1: Build & Dependency Installation
# ==========================================
FROM node:24.14.0-alpine AS builder

WORKDIR /usr/src/app

# Copy dependency configuration files
COPY package.json package-lock.json ./

# Install only production dependencies (faster and smaller)
RUN npm ci --omit=dev

# ==========================================
# STAGE 2: Lightweight Production Runtime
# ==========================================
FROM node:24.14.0-alpine AS runner

# Set production environment explicitly
ENV NODE_ENV=production
ENV PORT=8000

WORKDIR /usr/src/app

# Install dumb-init for proper SIGTERM/SIGINT signal handling (PID 1)
RUN apk add --no-cache dumb-init

# Copy node_modules from builder (no npm cache or temp files in runner layer)
COPY --chown=node:node --from=builder /usr/src/app/node_modules ./node_modules
COPY --chown=node:node package.json package-lock.json ./

# Copy the application source code with correct permissions to prevent layer bloat
COPY --chown=node:node server.js ./
COPY --chown=node:node model ./model
COPY --chown=node:node route ./route
COPY --chown=node:node service ./service
COPY --chown=node:node public ./public

# Create uploads folder and ensure the node user has access to it
RUN mkdir -p public/uploads && chown node:node public/uploads

# Run as non-root user
USER node

# Expose default backend port
EXPOSE 8000

# Health check setup (standard production verification)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); http.get('http://localhost:' + (process.env.PORT || 8000) + '/api/health', (res) => { if (res.statusCode === 200) process.exit(0); else process.exit(1); }).on('error', () => process.exit(1));"

# Use dumb-init as entrypoint to properly forward signals to Node
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
