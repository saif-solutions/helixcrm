#!/bin/bash

echo "🔍 Debugging Validation Setup"
echo "============================"

# Check if server is running
echo "1. Checking server status..."
curl -s http://localhost:3001/api/v1/health && echo "✅ Server is running" || echo "❌ Server is not running"

# Check if ValidationPipe is imported in main.ts
echo -e "\n2. Checking main.ts for ValidationPipe..."
if grep -q "ValidationPipe" apps/api/src/main.ts; then
  echo "✅ ValidationPipe found in main.ts"
else
  echo "❌ ValidationPipe NOT found in main.ts"
fi

# Check DTO files for validation decorators
echo -e "\n3. Checking DTOs for validation decorators..."
if grep -q "@IsNotEmpty" apps/api/src/modules/leads/dto/create-lead.dto.ts; then
  echo "✅ @IsNotEmpty found in CreateLeadDto"
else
  echo "❌ @IsNotEmpty NOT found in CreateLeadDto"
fi

# Test a simple endpoint without validation to see if it's a DTO issue
echo -e "\n4. Testing endpoint structure..."
curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@test.com", "password": "test"}' | grep -o '"statusCode":[0-9]*' || echo "✅ Endpoint responding"

echo -e "\n🔍 Debug complete!"