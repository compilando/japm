#!/bin/bash

# Salir inmediatamente si un comando falla
set -e

echo "🚧 Inicializando la base de datos con Prisma..."
# Genera/aplica migraciones y genera el cliente Prisma
npx prisma migrate dev --name init

echo "🌱 Ejecutando todos los scripts de seed..."
# Ejecuta el script seed:all definido en package.json
pnpm run seed:all

echo "✅ ¡Base de datos inicializada y poblada!" 