#!/bin/bash
# Update all imports to use new aliases

echo "Updating imports to use aliases..."

# Atomic Design Components
find src -type f \( -name "*.ts" -o -name "*.tsx" \) \
  -exec sed -i 's|from "\.\./components/atoms/|from "@atoms/|g' {} \;

find src -type f \( -name "*.ts" -o -name "*.tsx" \) \
  -exec sed -i 's|from "\.\./components/molecules/|from "@molecules/|g' {} \;

find src -type f \( -name "*.ts" -o -name "*.tsx" \) \
  -exec sed -i 's|from "\.\./components/organisms/|from "@organisms/|g' {} \;

find src -type f \( -name "*.ts" -o -name "*.tsx" \) \
  -exec sed -i 's|from "\.\./components/feedback/|from "@feedback/|g' {} \;

find src -type f \( -name "*.ts" -o -name "*.tsx" \) \
  -exec sed -i 's|from "\.\./components/layout/|from "@layout/|g' {} \;

# Feature imports
find src -type f \( -name "*.ts" -o -name "*.tsx" \) \
  -exec sed -i 's|from "\.\./pages/|from "@pages/|g' {} \;

find src -type f \( -name "*.ts" -o -name "*.tsx" \) \
  -exec sed -i 's|from "\.\./services/|from "@services/|g' {} \;

find src -type f \( -name "*.ts" -o -name "*.tsx" \) \
  -exec sed -i 's|from "\.\./hooks/|from "@hooks/|g' {} \;

find src -type f \( -name "*.ts" -o -name "*.tsx" \) \
  -exec sed -i 's|from "\.\./utils/|from "@utils/|g' {} \;

# Fix common patterns
find src -type f \( -name "*.ts" -o -name "*.tsx" \) \
  -exec sed -i 's|from "src/components/|from "@|g' {} \;

echo "Import updates complete!"