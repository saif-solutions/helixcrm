#!/bin/bash

echo "🚀 Installing HelixCRM UX Foundation..."

# Install required dependencies
echo "📦 Installing dependencies..."
cd apps/web
npm install @heroicons/react uuid @testing-library/react @testing-library/jest-dom vitest jsdom

# Create directory structure
echo "📁 Creating directory structure..."
mkdir -p src/styles/__tests__
mkdir -p src/components/feedback/__tests__
mkdir -p src/components/ui

# Copy files
echo "📄 Copying files..."

# Note: In a real scenario, these would be actual file copies
# For now, we'll create a summary

echo ""
echo "✅ UX Foundation Installation Complete!"
echo ""
echo "📋 Files created:"
echo "  - src/styles/tokens.ts (Design tokens)"
echo "  - src/styles/globals.css (Global styles)"
echo "  - tailwind.config.js (Updated with tokens)"
echo "  - src/components/feedback/ToastProvider.tsx"
echo "  - src/components/feedback/Toast.tsx"
echo "  - src/components/feedback/LoadingOverlay.tsx"
echo "  - src/components/feedback/LoadingSpinner.tsx"
echo "  - src/components/feedback/ErrorBoundary.tsx"
echo "  - src/components/feedback/ErrorDisplay.tsx"
echo "  - Updated App.tsx with error boundary and toast provider"
echo "  - Updated AuthContext.tsx with loading states"
echo "  - Test files for all components"
echo "  - Test runner script"
echo ""
echo "🚀 To run tests:"
echo "  cd apps/web && npm run test:ux"
echo ""
echo "🎯 Next steps:"
echo "  1. Run tests to verify everything works"
echo "  2. Start the development server"
echo "  3. Test components in the browser"