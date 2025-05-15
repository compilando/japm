# ---- Base Node.js image for building ----
FROM node:20-slim AS builder

# Install common build tools that might be needed for native dependencies (Debian-based)
RUN apt-get update && apt-get install -y build-essential python3 git --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package.json and package-lock.json
# package-lock.json is crucial for npm ci to work reliably
COPY package.json package-lock.json ./

# Install all dependencies (including devDependencies for build)
# npm ci is generally faster and safer for CI/Docker environments
RUN npm ci

# Copy the rest of the application source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Check the contents of the dist folder
RUN echo "Contents of /app/dist after build:" && ls -R /app/dist

# After build, prepare node_modules for production
# This will remove devDependencies from the existing node_modules
RUN npm prune --production

# ---- Production image ----
FROM node:20-alpine AS production

WORKDIR /app

# Copy package.json (might be needed by the application or for npm run start:prod context)
COPY package.json ./

# Copy pruned node_modules from builder stage
COPY --from=builder /app/node_modules ./node_modules

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
# If you have other assets like Prisma schema or migration files needed at runtime, copy them too
# Example: COPY --from=builder /app/prisma ./prisma
# Example: COPY --from=builder /app/resources ./resources

# Expose the application port
EXPOSE 3001

# Set NODE_ENV to production (good practice)
ENV NODE_ENV=production

# Default command to run the application
# Adjust if your start:prod script is different or if you directly run the main.js
CMD ["node", "dist/main.js"] 