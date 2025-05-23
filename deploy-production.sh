#!/bin/bash

# =====================================================
# Production Deployment Script - JAPM API
# Handles deployment using Docker Compose in production
# =====================================================

set -e

# Default configuration
COMPOSE_FILE="docker-compose.production.yml"
PROJECT_NAME="japm-production"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Help function
show_help() {
    echo -e "${BLUE}================================================="
    echo -e "  JAPM - Production Deployment Script"
    echo -e "=================================================${NC}"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  start                Start all services"
    echo "  stop                 Stop all services"
    echo "  restart              Restart all services"
    echo "  build                Build image and deploy"
    echo "  logs [service]       View logs for specific service"
    echo "  status               View services status"
    echo "  cleanup              Clean containers and volumes"
    echo "  backup               Create database backup"
    echo "  restore [file]       Restore database backup"
    echo "  shell [service]      Open shell in service"
    echo "  migrate              Execute migrations manually"
    echo "  seed                 Execute seed manually"
    echo ""
    echo "Options:"
    echo "  --monitoring         Include monitoring services"
    echo "  --nginx              Include nginx reverse proxy"
    echo "  --env-file FILE      Use specific environment file"
    echo "  --build-args ARGS    Additional build arguments"
    echo "  -v, --verbose        Detailed output"
    echo ""
    echo "Examples:"
    echo "  $0 start                          # Start basic services"
    echo "  $0 start --monitoring             # Include monitoring"
    echo "  $0 build --build-args='--no-cache'"
    echo "  $0 logs japm-api                  # View API logs"
    echo "  $0 backup                         # Create backup"
    echo ""
}

# Check dependencies
check_dependencies() {
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        error "docker-compose is not installed"
        exit 1
    fi
    
    if ! docker info > /dev/null 2>&1; then
        error "Docker is not running"
        exit 1
    fi
    
    log "✅ Dependencies verified"
}

# Setup profiles
setup_profiles() {
    local profiles=()
    
    if [ "$ENABLE_MONITORING" = "true" ]; then
        profiles+=("monitoring")
        log "📊 Monitoring enabled"
    fi
    
    if [ "$ENABLE_NGINX" = "true" ]; then
        profiles+=("nginx")
        log "🌐 Nginx enabled"
    fi
    
    if [ ${#profiles[@]} -gt 0 ]; then
        PROFILE_ARGS="--profile $(IFS=, ; echo "${profiles[*]}")"
        log "🎯 Active profiles: ${profiles[*]}"
    else
        PROFILE_ARGS=""
    fi
}

# Check configuration
check_configuration() {
    log "🔧 Checking configuration..."
    
    if [ ! -f "$COMPOSE_FILE" ]; then
        error "Docker-compose file not found: $COMPOSE_FILE"
        exit 1
    fi
    
    # Check critical variables
    if [ -z "$DATABASE_URL" ] && [ ! -f ".env" ]; then
        warn ".env file or DATABASE_URL not found"
        warn "Using default docker-compose configuration"
    fi
    
    # Create necessary directories
    mkdir -p mysql-init ssl logs
    
    log "✅ Configuration verified"
}

# Build services
build_services() {
    log "🔨 Building services..."
    
    local build_cmd="docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME build"
    
    if [ -n "$BUILD_ARGS" ]; then
        build_cmd="$build_cmd $BUILD_ARGS"
    fi
    
    if [ "$VERBOSE" = "true" ]; then
        build_cmd="$build_cmd --progress=plain"
    fi
    
    eval $build_cmd
    
    if [ $? -eq 0 ]; then
        log "✅ Services built successfully"
    else
        error "❌ Error building services"
        exit 1
    fi
}

# Start services
start_services() {
    log "🚀 Starting production services..."
    
    setup_profiles
    
    local start_cmd="docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME up -d $PROFILE_ARGS"
    
    if [ -n "$ENV_FILE" ]; then
        start_cmd="$start_cmd --env-file $ENV_FILE"
    fi
    
    eval $start_cmd
    
    if [ $? -eq 0 ]; then
        log "✅ Services started successfully"
        
        # Show status
        show_status
        
        # Show useful URLs
        info "🌐 Available URLs:"
        echo "   API: http://localhost:3001"
        echo "   API Health: http://localhost:3001/health"
        echo "   API Docs: http://localhost:3001/api-docs"
        
        if [ "$ENABLE_MONITORING" = "true" ]; then
            echo "   Prometheus: http://localhost:9090"
            echo "   Grafana: http://localhost:3000 (admin/admin_password_change_me)"
        fi
    else
        error "❌ Error starting services"
        exit 1
    fi
}

# Stop services
stop_services() {
    log "🛑 Stopping services..."
    
    docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME down
    
    log "✅ Services stopped"
}

# Restart services
restart_services() {
    log "🔄 Restarting services..."
    stop_services
    start_services
}

# Show status
show_status() {
    log "📊 Services status:"
    docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME ps
}

# Show logs
show_logs() {
    local service="$1"
    
    if [ -n "$service" ]; then
        log "📋 Logs for $service:"
        docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME logs -f "$service"
    else
        log "📋 Logs for all services:"
        docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME logs -f
    fi
}

# Clean up resources
cleanup() {
    log "🧹 Cleaning up resources..."
    
    read -p "Are you sure you want to remove all containers and volumes? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME down -v --remove-orphans
        docker system prune -f
        log "✅ Cleanup completed"
    else
        log "❌ Cleanup cancelled"
    fi
}

# Create backup
create_backup() {
    log "💾 Creating database backup..."
    
    local backup_file="backup_japm_$(date +%Y%m%d_%H%M%S).sql"
    
    docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME exec mysql \
        mysqldump -u japm_user -pjapm_password_secure japm > "$backup_file"
    
    if [ $? -eq 0 ]; then
        log "✅ Backup created: $backup_file"
    else
        error "❌ Error creating backup"
        exit 1
    fi
}

# Restore backup
restore_backup() {
    local backup_file="$1"
    
    if [ -z "$backup_file" ]; then
        error "Please specify backup file"
        exit 1
    fi
    
    if [ ! -f "$backup_file" ]; then
        error "Backup file not found: $backup_file"
        exit 1
    fi
    
    log "📥 Restoring backup: $backup_file"
    
    docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME exec -T mysql \
        mysql -u japm_user -pjapm_password_secure japm < "$backup_file"
    
    if [ $? -eq 0 ]; then
        log "✅ Backup restored successfully"
    else
        error "❌ Error restoring backup"
        exit 1
    fi
}

# Open shell in service
open_shell() {
    local service="$1"
    
    if [ -z "$service" ]; then
        service="japm-api"
    fi
    
    log "🐚 Opening shell in $service..."
    docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME exec "$service" sh
}

# Execute migrations
run_migrations() {
    log "🗄️ Executing migrations..."
    
    docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME exec japm-api \
        npx prisma migrate deploy
    
    if [ $? -eq 0 ]; then
        log "✅ Migrations executed successfully"
    else
        error "❌ Error executing migrations"
        exit 1
    fi
}

# Execute seed
run_seed() {
    log "🌱 Executing seed..."
    
    docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME exec japm-api \
        npx ts-node seed/seed.ts
    
    if [ $? -eq 0 ]; then
        log "✅ Seed executed successfully"
    else
        error "❌ Error executing seed"
        exit 1
    fi
}

# Main function
main() {
    local command="$1"
    shift
    
    # Default variables
    ENABLE_MONITORING="false"
    ENABLE_NGINX="false"
    VERBOSE="false"
    ENV_FILE=""
    BUILD_ARGS=""
    
    # Process options
    while [[ $# -gt 0 ]]; do
        case $1 in
            --monitoring)
                ENABLE_MONITORING="true"
                shift
                ;;
            --nginx)
                ENABLE_NGINX="true"
                shift
                ;;
            --env-file)
                ENV_FILE="$2"
                shift 2
                ;;
            --build-args)
                BUILD_ARGS="$2"
                shift 2
                ;;
            -v|--verbose)
                VERBOSE="true"
                shift
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                # This is probably an argument for the command
                break
                ;;
        esac
    done
    
    # Check dependencies
    check_dependencies
    
    # Check configuration
    check_configuration
    
    # Execute command
    case $command in
        start)
            start_services
            ;;
        stop)
            stop_services
            ;;
        restart)
            restart_services
            ;;
        build)
            build_services
            start_services
            ;;
        logs)
            show_logs "$1"
            ;;
        status)
            show_status
            ;;
        cleanup)
            cleanup
            ;;
        backup)
            create_backup
            ;;
        restore)
            restore_backup "$1"
            ;;
        shell)
            open_shell "$1"
            ;;
        migrate)
            run_migrations
            ;;
        seed)
            run_seed
            ;;
        ""|help)
            show_help
            ;;
        *)
            error "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
}

# Execute main function
main "$@" 