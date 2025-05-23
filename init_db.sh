#!/bin/bash

# Exit immediately if a command fails
set -e

echo "🚧 Initializing database with Prisma..."
# Generate/apply migrations and generate Prisma client
npx prisma migrate dev --name init

echo "🌱 Running all seed scripts..."
# Execute seed scripts in order
npx ts-node seed/seed.ts
npx ts-node seed/seed.codegen.ts
npx ts-node seed/seed.invoice-extraction.ts

echo "✅ Database initialized and populated!" 