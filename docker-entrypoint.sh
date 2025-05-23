#!/bin/sh

# =====================================================
# Docker Entrypoint Script for JAPM API
# Handles Prisma migrations and seed in production
# =====================================================

set -e

# Logging function
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

error() {
    echo "[ERROR $(date +'%Y-%m-%d %H:%M:%S')] $1" >&2
}

# Function to check database connection
wait_for_db() {
    log "Waiting for database connection..."
    
    # Extract connection information from DATABASE_URL
    if [ -n "$DATABASE_URL" ]; then
        # If it's MySQL, try to connect using mysql client
        if echo "$DATABASE_URL" | grep -q "mysql://"; then
            # Extract host and port from MySQL URL
            DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
            DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
            DB_USER=$(echo "$DATABASE_URL" | sed -n 's/mysql:\/\/\([^:]*\):.*/\1/p')
            DB_NAME=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')
            
            log "Attempting to connect to MySQL at ${DB_HOST}:${DB_PORT}..."
            
            # Wait until database is available
            until mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$(echo "$DATABASE_URL" | sed -n 's/mysql:\/\/[^:]*:\([^@]*\)@.*/\1/p')" -e "SELECT 1;" > /dev/null 2>&1; do
                log "Database not available yet, waiting..."
                sleep 2
            done
            
            log "✅ MySQL connection established successfully"
        else
            log "⚠️  DATABASE_URL is not MySQL, skipping specific connection verification"
        fi
    else
        error "DATABASE_URL is not configured"
        exit 1
    fi
}

# Function to run migrations
run_migrations() {
    log "🔄 Running Prisma migrations..."
    
    if npx prisma migrate deploy; then
        log "✅ Migrations executed successfully"
    else
        error "❌ Error executing migrations"
        exit 1
    fi
}

# Function to run seed (optional)
run_seed() {
    if [ "$SKIP_SEED" = "true" ]; then
        log "⚠️  Seed skipped (SKIP_SEED=true)"
        return 0
    fi
    
    log "🌱 Running database seed..."
    
    if [ "$AUTO_SEED" = "true" ] || [ "$NODE_ENV" = "development" ]; then
        if npx ts-node seed/seed.ts; then
            log "✅ Seed executed successfully"
        else
            log "⚠️  Warning: Error in seed, continuing..."
        fi
    else
        log "⚠️  Seed skipped (AUTO_SEED is not enabled)"
    fi
}

# Main function
main() {
    log "🚀 Starting JAPM API..."
    log "NODE_ENV: ${NODE_ENV:-not set}"
    log "DATABASE_URL: ${DATABASE_URL:+***configured***}"
    
    # Check that Prisma is available
    if ! command -v npx > /dev/null 2>&1; then
        error "npx is not available"
        exit 1
    fi
    
    # Only run migrations and seed if we're not in check-only mode
    if [ "$1" != "--check-only" ]; then
        # Wait for database to be available
        wait_for_db
        
        # Run migrations
        run_migrations
        
        # Run seed if enabled
        run_seed
    fi
    
    log "✅ Initialization completed"
    
    # If arguments were passed, execute them
    if [ $# -gt 0 ]; then
        log "🎯 Executing command: $*"
        exec "$@"
    else
        log "📝 No command specified, keeping container active"
        tail -f /dev/null
    fi
}

# Signal handling for graceful shutdown
trap 'log "🛑 Received termination signal, shutting down..."; exit 0' TERM INT

# Execute main function with all arguments
main "$@" 