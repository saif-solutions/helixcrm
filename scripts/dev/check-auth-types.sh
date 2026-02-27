#!/bin/bash
echo "í´ Checking auth module TypeScript..."
FILES="
src/modules/auth/auth.module.ts
src/modules/auth/auth.service.ts
src/modules/auth/auth.controller.ts
src/modules/auth/services/account-lockout.service.ts
src/modules/auth/services/refresh-token.service.ts
src/modules/auth/strategies/jwt-refresh.strategy.ts
src/modules/auth/guards/refresh-token.guard.ts
"

for file in $FILES; do
  if [ -f "$file" ]; then
    echo "âœ… $file exists"
  else
    echo "âŒ $file missing"
  fi
done

echo ""
echo "Running TypeScript check..."
npx tsc --noEmit --skipLibCheck $FILES 2>&1 | grep -E "(error|Error|ERROR)" || echo "âœ… No TypeScript errors in auth module"
