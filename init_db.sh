#!/bin/bash

# Salir inmediatamente si un comando falla
set -e

echo "🚧 Inicializando la base de datos con Prisma..."
# Genera/aplica migraciones y genera el cliente Prisma
npx prisma migrate dev --name init

echo "🌱 Ejecutando todos los scripts de seed..."
# Ejecuta los scripts de seed en orden
npx ts-node seed/seed.ts
npx ts-node seed/seed.codegen.ts
npx ts-node seed/seed.invoice-extraction.ts

echo "✅ ¡Base de datos inicializada y poblada!" 