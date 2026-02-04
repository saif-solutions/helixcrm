#!/bin/bash
# scripts/verify-performance-setup.sh
echo "🔍 Verifying Performance Test Setup..."
echo "======================================"

cd /d/Projects-In-Hand/helixcrm

# Check directories
echo ""
echo "📁 Checking directory structure:"
dirs=(
  "tests/performance/scenarios"
  "tests/performance/utils"
  "tests/performance/slo"
  "tests/performance/results"
  "tests/performance/baselines"
  "scripts/performance"
  "configs/performance"
)

for dir in "${dirs[@]}"; do
  if [ -d "$dir" ]; then
    echo "  ✅ $dir"
  else
    echo "  ❌ $dir (missing)"
  fi
done

# Check files
echo ""
echo "📄 Checking important files:"
files=(
  "scripts/performance/final-runner.ts"
  "configs/performance/slo-definitions.json"
  "apps/api/src/shared/performance/performance-metrics.service.ts"
  "tests/performance/scenarios/sales-morning-peak.scenario.ts"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✅ $file"
  else
    echo "  ❌ $file (missing)"
  fi
done

# Check package.json scripts
echo ""
echo "📦 Checking package.json scripts:"
cd apps/api
if grep -q "test:performance" package.json; then
  echo "  ✅ test:performance script found"
else
  echo "  ❌ test:performance script missing"
fi

echo ""
echo "🎉 Verification complete!"
echo ""
echo "To test the setup:"
echo "  cd apps/api && npm run perf:help"
echo "  cd apps/api && npm run test:performance:smoke"
