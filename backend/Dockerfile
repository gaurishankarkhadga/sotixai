# ==========================================
# STAGE 1: Build & Dependency Installation
# ==========================================
FROM node:24.14.0-alpine AS builder

WORKDIR /usr/src/app

# Copy dependency configuration files
COPY package.json package-lock.json ./

# Install all dependencies
RUN npm ci

# Copy the rest of the application source code
COPY . .

# ==========================================
# STAGE 2: Lightweight Production Runtime
# ==========================================
FROM node:24.14.0-alpine AS runner

# Set production environment
ENV NODE_ENV=production

WORKDIR /usr/src/app

# Copy production package configs
COPY package.json package-lock.json ./

# Install only production dependencies for optimal size and security
RUN npm ci --only=production && npm cache clean --force

# Copy only the necessary files/directories from the builder stage
COPY --from=builder /usr/src/app/server.js ./server.js
COPY --from=builder /usr/src/app/model ./model
COPY --from=builder /usr/src/app/route ./route
COPY --from=builder /usr/src/app/service ./service
COPY --from=builder /usr/src/app/public ./public

# Create uploads folder and ensure the node user has access to it
RUN mkdir -p public/uploads && chown -R node:node /usr/src/app

# Run as non-root user
USER node

# Expose default backend port
EXPOSE 8000

# Health check setup (standard production verification)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); http.get('http://localhost:' + (process.env.PORT || 8000) + '/api/health', (res) => { if (res.statusCode === 200) process.exit(0); else process.exit(1); }).on('error', () => process.exit(1));"

# Entrypoint definition
CMD ["node", "server.js"]
