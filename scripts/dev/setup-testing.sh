#!/bin/bash

echo "📦 Installing testing dependencies..."

# Install testing libraries
npm install --save-dev \
  @testing-library/react \
  @testing-library/jest-dom \
  @testing-library/user-event \
  vitest \
  jsdom \
  @vitest/ui

# Install TypeScript types
npm install --save-dev \
  @types/react \
  @types/react-dom \
  @types/node \
  @types/jest \
  @types/uuid

# Install utility libraries
npm install uuid

echo "✅ Dependencies installed!"

echo "📁 Creating test configuration..."

# Create vitest config
cat > vitest.config.ts << 'EOF'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
})
EOF

echo "✅ Vitest configuration created!"

# Create test setup file
mkdir -p src/test
cat > src/test/setup.ts << 'EOF'
import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Automatically cleanup after each test
afterEach(() => {
  cleanup()
})
EOF

echo "✅ Test setup file created!"

# Update tsconfig.json
echo "📝 Updating TypeScript configuration..."

# Create a backup first
cp tsconfig.json tsconfig.json.backup

# Check if tsconfig.json exists, if not create it
if [ ! -f tsconfig.json ]; then
  cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
EOF
else
  # Update existing tsconfig.json
  cat > tsconfig.temp.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
EOF
  mv tsconfig.temp.json tsconfig.json
fi

echo "✅ TypeScript configuration updated!"

# Update package.json scripts
echo "📝 Updating package.json scripts..."

# Create backup of package.json
cp package.json package.json.backup

# Update scripts section
npm pkg set scripts.test="vitest"
npm pkg set scripts.test:watch="vitest --watch"
npm pkg set scripts.test:coverage="vitest --coverage"
npm pkg set scripts.test:ui="vitest --ui"

echo "✅ Package.json scripts updated!"

echo ""
echo "🎉 Testing setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Run tests: npm test"
echo "2. Run tests in watch mode: npm run test:watch"
echo "3. Run tests with UI: npm run test:ui"
echo "4. Run coverage: npm run test:coverage"
echo ""
echo "🚀 To run all UX tests:"
echo "   npm test -- --run"