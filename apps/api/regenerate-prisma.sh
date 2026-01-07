#!/bin/bash

echo "🔄 Regenerating Prisma Client..."

cd apps/api

# Clean up
rm -rf node_modules/.prisma
rm -rf dist

# Generate fresh client
npx prisma generate

# Check if generation succeeded
if [ -f "node_modules/.prisma/client/index.d.ts" ]; then
  echo "✅ Prisma client regenerated successfully!"
  echo ""
  echo "📋 Next steps:"
  echo "1. Restart VS Code TypeScript server"
  echo "2. Check if errors are gone"
else
  echo "❌ Prisma client generation failed"
  exit 1
fi