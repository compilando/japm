#!/bin/bash

# Script para iniciar la aplicación NestJS en modo desarrollo con watch

# Detener el script si ocurre algún error
set -e

# Ejecutar el comando de inicio de desarrollo definido en package.json
echo "Iniciando la aplicación en modo desarrollo (con pnpm)..."
pnpm run start:dev 