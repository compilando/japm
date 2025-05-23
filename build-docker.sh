#!/bin/bash

# =====================================================
# Docker Build Script for JAPM API
# Builds optimized images for different environments
# =====================================================

set -e

# Default configuration
DEFAULT_IMAGE_NAME="japm-api"
DEFAULT_TAG="latest"
DEFAULT_REGISTRY=""
DEFAULT_PLATFORM="linux/amd64"

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
    echo -e "  JAPM - Docker Build Script"
    echo -e "=================================================${NC}"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -n, --name NAME          Image name (default: $DEFAULT_IMAGE_NAME)"
    echo "  -t, --tag TAG            Image tag (default: $DEFAULT_TAG)"
    echo "  -r, --registry REGISTRY  Target registry (e.g: my-registry.com)"
    echo "  -p, --platform PLATFORM  Target platform (default: $DEFAULT_PLATFORM)"
    echo "      --production         Use Dockerfile.production instead of Dockerfile"
    echo "      --multi-arch         Build for multiple architectures"
    echo "      --push               Automatic push after build"
    echo "      --no-cache           Build without using cache"
    echo "      --version VERSION    Set specific version"
    echo "  -h, --help               Show this help"
    echo ""
    echo "Environment variables:"
    echo "  DOCKER_REGISTRY          Default registry"
    echo "  DOCKER_BUILDKIT          Enable BuildKit (default: 1)"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Basic build"
    echo "  $0 --production                      # Production build"
    echo "  $0 --name japm --tag 1.0.0          # Custom name and tag"
    echo "  $0 --registry my-reg.com --push      # Build and push to registry"
    echo "  $0 --multi-arch --production         # Multi-architecture for production"
    echo ""
}

# Setup BuildKit
setup_buildkit() {
    export DOCKER_BUILDKIT=1
    log "Docker BuildKit enabled"
}

# Check dependencies
check_dependencies() {
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    if ! docker info > /dev/null 2>&1; then
        error "Docker is not running"
        exit 1
    fi
    
    log "✅ Dependencies verified"
}

# Build image
build_image() {
    local image_name="$1"
    local tag="$2"
    local dockerfile="$3"
    local platform="$4"
    local push="$5"
    local no_cache="$6"
    local multi_arch="$7"
    
    local full_image_name="${image_name}:${tag}"
    
    if [ -n "$REGISTRY" ]; then
        full_image_name="${REGISTRY}/${full_image_name}"
    fi
    
    log "🔨 Building image: $full_image_name"
    log "📄 Dockerfile: $dockerfile"
    log "🏗️  Platform: $platform"
    
    # Build Docker arguments
    local build_args=()
    build_args+=("--file" "$dockerfile")
    build_args+=("--tag" "$full_image_name")
    
    if [ "$no_cache" = "true" ]; then
        build_args+=("--no-cache")
        log "🚫 Cache disabled"
    fi
    
    if [ "$multi_arch" = "true" ]; then
        build_args+=("--platform" "linux/amd64,linux/arm64")
        log "🌍 Multi-architecture build enabled"
    else
        build_args+=("--platform" "$platform")
    fi
    
    if [ "$push" = "true" ]; then
        build_args+=("--push")
        log "📤 Automatic push enabled"
    fi
    
    # Add build arguments
    if [ -n "$VERSION" ]; then
        build_args+=("--build-arg" "VERSION=$VERSION")
        log "🏷️  Version: $VERSION"
    fi
    
    build_args+=("--build-arg" "BUILDKIT_INLINE_CACHE=1")
    build_args+=(".")
    
    # Execute build
    if [ "$multi_arch" = "true" ] || [ "$push" = "true" ]; then
        docker buildx build "${build_args[@]}"
    else
        docker build "${build_args[@]}"
    fi
    
    if [ $? -eq 0 ]; then
        log "✅ Image built successfully: $full_image_name"
        
        if [ "$push" != "true" ] && [ "$multi_arch" != "true" ]; then
            info "📊 Image information:"
            docker images "$full_image_name" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
        fi
    else
        error "❌ Error building image"
        exit 1
    fi
}

# Check Dockerfile
check_dockerfile() {
    local dockerfile="$1"
    
    if [ ! -f "$dockerfile" ]; then
        error "Dockerfile not found: $dockerfile"
        exit 1
    fi
    
    log "✅ Dockerfile found: $dockerfile"
}

# Prepare environment
prepare_environment() {
    log "🔧 Preparing build environment..."
    
    # Check if .dockerignore exists
    if [ ! -f ".dockerignore" ]; then
        warn ".dockerignore file not found, unnecessary files might be included"
    fi
    
    # Check if package.json exists
    if [ ! -f "package.json" ]; then
        error "package.json not found in current directory"
        exit 1
    fi
    
    # Create temporary directory if needed
    mkdir -p .docker-tmp
    
    log "✅ Environment prepared"
}

# Clean up after build
cleanup() {
    log "🧹 Cleaning temporary files..."
    rm -rf .docker-tmp
}

# Main function
main() {
    # Default variables
    local image_name="$DEFAULT_IMAGE_NAME"
    local tag="$DEFAULT_TAG"
    local platform="$DEFAULT_PLATFORM"
    local dockerfile="Dockerfile"
    local push="false"
    local no_cache="false"
    local multi_arch="false"
    local production="false"
    
    # Process arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -n|--name)
                image_name="$2"
                shift 2
                ;;
            -t|--tag)
                tag="$2"
                shift 2
                ;;
            -r|--registry)
                REGISTRY="$2"
                shift 2
                ;;
            -p|--platform)
                platform="$2"
                shift 2
                ;;
            --production)
                production="true"
                dockerfile="Dockerfile.production"
                shift
                ;;
            --multi-arch)
                multi_arch="true"
                shift
                ;;
            --push)
                push="true"
                shift
                ;;
            --no-cache)
                no_cache="true"
                shift
                ;;
            --version)
                VERSION="$2"
                shift 2
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # Use registry from environment variable if available
    if [ -z "$REGISTRY" ] && [ -n "$DOCKER_REGISTRY" ]; then
        REGISTRY="$DOCKER_REGISTRY"
    fi
    
    # Setup BuildKit
    setup_buildkit
    
    # Check dependencies
    check_dependencies
    
    # Check Dockerfile
    check_dockerfile "$dockerfile"
    
    # Prepare environment
    prepare_environment
    
    # Setup buildx if needed for multi-arch or push
    if [ "$multi_arch" = "true" ] || [ "$push" = "true" ]; then
        if ! docker buildx version > /dev/null 2>&1; then
            error "docker buildx is not available"
            exit 1
        fi
        
        # Create builder if it doesn't exist
        if ! docker buildx inspect mybuilder > /dev/null 2>&1; then
            log "🏗️  Creating buildx builder..."
            docker buildx create --name mybuilder --use
        else
            docker buildx use mybuilder
        fi
    fi
    
    # Build image
    build_image "$image_name" "$tag" "$dockerfile" "$platform" "$push" "$no_cache" "$multi_arch"
    
    # Clean up
    cleanup
    
    log "🎉 Build completed successfully!"
    
    if [ "$push" != "true" ] && [ "$multi_arch" != "true" ]; then
        info "💡 To run the image:"
        echo "   docker run -p 3001:3001 ${REGISTRY:+$REGISTRY/}${image_name}:${tag}"
    fi
}

# Signal handling
trap cleanup EXIT

# Execute main function
main "$@" 