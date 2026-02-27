#!/bin/bash
# scripts/build-performance-tests.sh
echo "🔨 Building Performance Test Infrastructure..."

# Build API
cd apps/api
echo "📦 Building API..."
npm run build
cd ../..

# Create necessary directories
mkdir -p tests/performance/results tests/performance/baselines

# Verify setup
echo "🔍 Verifying setup..."
if [ -f "apps/api/dist/main.js" ]; then
  echo "✅ API built successfully"
else
  echo "❌ API build failed"
  exit 1
fi

if [ -f "configs/performance/slo-definitions.json" ]; then
  echo "✅ SLO definitions found"
else
  echo "⚠️  SLO definitions not found, creating default..."
  mkdir -p configs/performance
  cat > configs/performance/slo-definitions.json << 'EOF'
{
  "salesMorningPeak": {
    "description": "500 concurrent sales users during morning peak",
    "p95Latency": 800,
    "errorRate": 1.0,
    "throughput": 100,
    "concurrentUsers": 500,
    "duration": "15m",
    "justification": "Based on 100 sales reps × 5 simultaneous sessions"
  },
  "smokeTest": {
    "description": "Basic smoke test for CI/CD pipeline",
    "p95Latency": 1000,
    "errorRate": 5.0,
    "throughput": 10,
    "concurrentUsers": 10,
    "duration": "30s",
    "justification": "Quick validation of system health"
  }
}
EOF
fi

echo "🎉 Performance test infrastructure built successfully!"
echo ""
echo "To run tests:"
echo "  cd apps/api && npm run test:performance -- --help"
echo ""
echo "For smoke test:"
echo "  cd apps/api && npm run test:performance:smoke"