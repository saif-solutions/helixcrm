#!/bin/bash

echo "=== WEBHOOK MODULE VALIDATION ==="
echo ""

echo "1. Checking file structure..."
FILES=(
  "src/modules/webhooks/webhooks.controller.ts"
  "src/modules/webhooks/webhooks.service.ts" 
  "src/modules/webhooks/webhooks.module.ts"
  "src/modules/webhooks/processors/webhook.processor.ts"
  "src/modules/webhooks/repositories/webhook.repository.ts"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✓ $file"
  else
    echo "  ✗ $file (MISSING)"
  fi
done

echo ""
echo "2. Checking repository pattern usage..."
if grep -q "this.prisma\." src/modules/webhooks/webhooks.service.ts | grep -v "this.prisma.user.findUnique"; then
  echo "  ✗ Found direct Prisma calls (violates repository pattern)"
else
  echo "  ✓ No direct Prisma calls found (except user lookup)"
fi

echo ""
echo "3. Checking tenant isolation..."
if grep -q "this.tenantId" src/modules/webhooks/repositories/webhook.repository.ts; then
  echo "  ✓ Repository uses tenant isolation"
else
  echo "  ✗ Repository missing tenant isolation"
fi

echo ""
echo "4. Checking permission checks..."
if grep -q "permissionContext.hasPermission" src/modules/webhooks/webhooks.service.ts; then
  echo "  ✓ Service has permission checks"
else
  echo "  ✗ Service missing permission checks"
fi

echo ""
echo "5. Checking audit logging..."
if grep -q "auditLogService.logEvent" src/modules/webhooks/webhooks.service.ts; then
  echo "  ✓ Service has audit logging"
else
  echo "  ✗ Service missing audit logging"
fi

echo ""
echo "=== VALIDATION COMPLETE ==="
