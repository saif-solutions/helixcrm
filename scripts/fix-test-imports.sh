#!/bin/bash

echo "í´§ Fixing test imports..."

# Fix relative imports to use @api alias
find tests/unit/api -name "*.spec.ts" -type f | while read file; do
  echo "Processing $file"
  
  # Replace '../../../src/' with '@api/'
  sed -i 's|from '\''\.\.\/\.\.\/\.\.\/src\/|from '\''@api\/|g' "$file"
  sed -i 's|from "'\''\.\.\/\.\.\/\.\.\/src\/|from "'\''@api\/|g' "$file"
  
  # Replace '../../../shared/' with '@api/shared/'
  sed -i 's|from '\''\.\.\/\.\.\/\.\.\/shared\/|from '\''@api\/shared\/|g' "$file"
  sed -i 's|from "'\''\.\.\/\.\.\/\.\.\/shared\/|from "'\''@api\/shared\/|g' "$file"
  
  # Fix webhook tests (they use different patterns)
  sed -i 's|from '\''\.\.\/webhooks\.service|from '\''@api\/modules\/webhooks\/webhooks.service|g' "$file"
  sed -i 's|from '\''\.\.\/repositories\/webhook\.repository|from '\''@api\/modules\/webhooks\/repositories\/webhook.repository|g' "$file"
  sed -i 's|from '\''\.\.\/webhooks\.module|from '\''@api\/modules\/webhooks\/webhooks.module|g' "$file"
done

# Fix Vitest imports (replace with Jest)
find tests -name "*.spec.ts" -type f | xargs grep -l "from 'vitest'" | while read file; do
  echo "Converting Vitest to Jest in $file"
  sed -i 's|from '\''vitest'\''|from '\''@jest/globals'\''|g' "$file"
done

echo "âœ… Import fixes complete!"
