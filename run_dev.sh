#!/bin/bash

echo "Starting JAPM API in development mode (Linux/macOS)..."

# Script to start the NestJS application in development mode with watch

# Stop the script if an error occurs
set -e

# Ejecutar el comando de inicio de desarrollo definido en package.json
# Execute the development start command defined in package.json
echo "Starting the application in development mode (with pnpm)..."
pnpm run start:dev 