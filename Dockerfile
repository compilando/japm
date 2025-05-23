# ====================================
# Multi-stage Dockerfile for JAPM API
# ====================================

# ---- Base Node.js image for building ----
FROM node:20-slim AS builder

# Install necessary build tools and SQLite for Prisma
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    git \
    sqlite3 \
    openssl \
    ca-certificates \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci --silent

# Copy source code and necessary files
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Verify build output
RUN echo "Contents of /app/dist after build:" && ls -la /app/dist

# Clean up for production - remove devDependencies
RUN npm prune --production && npm cache clean --force

# ---- Production image ----
FROM node:20-alpine AS production

# Install SQLite and other necessary tools for Alpine
RUN apk add --no-cache \
    sqlite \
    openssl \
    ca-certificates

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S japm -u 1001

# Copy package.json for runtime context
COPY --chown=japm:nodejs package.json ./

# Copy production node_modules from builder
COPY --from=builder --chown=japm:nodejs /app/node_modules ./node_modules

# Copy built application
COPY --from=builder --chown=japm:nodejs /app/dist ./dist

# Copy Prisma schema and migrations (needed for runtime)
COPY --from=builder --chown=japm:nodejs /app/prisma ./prisma

# Copy seed files (might be needed for initialization)
COPY --from=builder --chown=japm:nodejs /app/seed ./seed

# Create directory for database and uploads
RUN mkdir -p /app/data /app/uploads && \
    chown -R japm:nodejs /app/data /app/uploads

# Set proper permissions
RUN chown -R japm:nodejs /app

# Switch to non-root user
USER japm

# Expose application port
EXPOSE 3001

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["node", "dist/src/main"] 