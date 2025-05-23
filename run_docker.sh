#!/bin/bash

# =====================================================
# Docker Management Script for JAPM
# =====================================================
# 
# Usage: ./run_docker.sh [COMMAND] [OPTIONS]
# 
# Commands:
#   build      Build the Docker image
#   run        Run production container
#   dev        Run development container with hot reload
#   stop       Stop running containers
#   clean      Clean up containers and images
#   logs       Show container logs
#   health     Check container health
#   shell      Open shell in running container
#   compose    Use docker-compose operations
#
# =====================================================

set -e  # Exit on error

# Configuration
IMAGE_NAME="japm-api"
CONTAINER_NAME="japm-api-container"
DEV_CONTAINER_NAME="japm-dev-container"
CONTAINER_PORT=3001
HOST_PORT=3001

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

# Function to show help
show_help() {
    echo -e "${BLUE}================================================="
    echo -e "  JAPM - Docker Management Script"
    echo -e "=================================================${NC}"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  build                Build production Docker image"
    echo "  run                  Run production container"
    echo "  dev                  Run development container with hot reload"
    echo "  stop                 Stop running containers"
    echo "  clean                Clean up containers and images"
    echo "  logs [service]       Show container logs"
    echo "  health               Check container health"
    echo "  shell [service]      Open shell in running container"
    echo "  compose [args]       Run docker-compose commands"
    echo ""
    echo "Docker Compose Services:"
    echo "  japm-api            Production API service"
    echo "  japm-dev            Development API service"
    echo "  postgres            PostgreSQL database"
    echo "  mysql               MySQL database"
    echo "  redis               Redis cache"
    echo ""
    echo "Examples:"
    echo "  $0 build"
    echo "  $0 run"
    echo "  $0 dev"
    echo "  $0 compose up -d postgres"
    echo "  $0 logs japm-api"
    echo "  $0 shell japm-api"
    echo ""
}

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        error "Docker is not running. Please start Docker first."
        exit 1
    fi
}

# Function to create necessary directories
create_directories() {
    log "Creating necessary directories..."
    mkdir -p data uploads
    chmod 755 data uploads
}

# Function to check for .env file
check_env() {
    if [ ! -f .env ]; then
        warn "No .env file found. Creating from .env.example..."
        if [ -f env.example ]; then
            cp env.example .env
            info "Please review and update .env file with your configuration"
        else
            error "No env.example file found. Please create .env file manually."
            exit 1
        fi
    fi
}

# Function to build Docker image
build_image() {
    log "Building Docker image: $IMAGE_NAME"
    
    # Check if Dockerfile exists
    if [ ! -f Dockerfile ]; then
        error "Dockerfile not found in current directory"
        exit 1
    fi
    
    docker build -t $IMAGE_NAME . || {
        error "Failed to build Docker image"
        exit 1
    }
    
    log "✅ Docker image built successfully: $IMAGE_NAME"
}

# Function to stop and remove existing container
cleanup_container() {
    local container_name=$1
    
    if [ "$(docker ps -q -f name=$container_name)" ]; then
        log "Stopping existing container: $container_name"
        docker stop $container_name
    fi
    
    if [ "$(docker ps -aq -f name=$container_name)" ]; then
        log "Removing existing container: $container_name"
        docker rm $container_name
    fi
}

# Function to run production container
run_production() {
    log "Starting production container..."
    
    cleanup_container $CONTAINER_NAME
    create_directories
    check_env
    
    # Run container with .env file
    docker run -d \
        --name $CONTAINER_NAME \
        -p $HOST_PORT:$CONTAINER_PORT \
        --env-file .env \
        -v "$(pwd)/data:/app/data" \
        -v "$(pwd)/uploads:/app/uploads" \
        --restart unless-stopped \
        $IMAGE_NAME || {
        error "Failed to start production container"
        exit 1
    }
    
    log "✅ Production container started successfully"
    info "Application available at: http://localhost:$HOST_PORT"
    info "API Documentation: http://localhost:$HOST_PORT/api-docs"
    info "Health Check: http://localhost:$HOST_PORT/health"
}

# Function to run development container
run_development() {
    log "Starting development environment..."
    
    check_env
    
    # Use docker-compose for development
    docker-compose -f docker-compose.yml --profile dev up -d japm-dev || {
        error "Failed to start development environment"
        exit 1
    }
    
    log "✅ Development environment started successfully"
    info "Application available at: http://localhost:$HOST_PORT"
    info "Debug port available at: 9229"
    info "Use 'docker-compose logs -f japm-dev' to view logs"
}

# Function to show logs
show_logs() {
    local service=${1:-$CONTAINER_NAME}
    
    if docker ps --format "table {{.Names}}" | grep -q "^$service$"; then
        log "Showing logs for: $service"
        docker logs -f $service
    elif docker-compose ps --services | grep -q "^$service$"; then
        log "Showing docker-compose logs for: $service"
        docker-compose logs -f $service
    else
        warn "Container/service '$service' not found or not running"
        info "Available containers:"
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    fi
}

# Function to check health
check_health() {
    log "Checking container health..."
    
    if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -q $CONTAINER_NAME; then
        docker exec $CONTAINER_NAME curl -f http://localhost:$CONTAINER_PORT/health || {
            warn "Health check failed"
            return 1
        }
        log "✅ Container is healthy"
    else
        warn "Container is not running"
        return 1
    fi
}

# Function to open shell
open_shell() {
    local service=${1:-$CONTAINER_NAME}
    
    if docker ps --format "table {{.Names}}" | grep -q "^$service$"; then
        log "Opening shell in: $service"
        docker exec -it $service /bin/sh
    else
        warn "Container '$service' not found or not running"
    fi
}

# Function to stop containers
stop_containers() {
    log "Stopping JAPM containers..."
    
    # Stop docker-compose services
    docker-compose down
    
    # Stop standalone containers
    cleanup_container $CONTAINER_NAME
    cleanup_container $DEV_CONTAINER_NAME
    
    log "✅ All containers stopped"
}

# Function to clean up
clean_up() {
    log "Cleaning up Docker resources..."
    
    # Stop containers
    stop_containers
    
    # Remove images if they exist
    if docker images -q $IMAGE_NAME > /dev/null 2>&1; then
        docker rmi $IMAGE_NAME
    fi
    
    # Remove unused images and containers
    docker system prune -f
    
    log "✅ Cleanup completed"
}

# Function to run docker-compose commands
run_compose() {
    log "Running docker-compose $*"
    docker-compose "$@"
}

# Main script logic
main() {
    check_docker
    
    case ${1:-help} in
        build)
            build_image
            ;;
        run)
            build_image
            run_production
            ;;
        dev)
            run_development
            ;;
        stop)
            stop_containers
            ;;
        clean)
            clean_up
            ;;
        logs)
            show_logs $2
            ;;
        health)
            check_health
            ;;
        shell)
            open_shell $2
            ;;
        compose)
            shift
            run_compose "$@"
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            error "Unknown command: $1"
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@" 