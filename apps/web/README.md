# HelixCRM Web Application

## Overview
React frontend for HelixCRM platform.

## Development

### Prerequisites
- Backend API running (see [API README](../api/README.md))
- Node.js 18+

### Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev
Environment Variables
Copy .env.example to .env:

bash
cp .env.example .env
Required variables:

VITE_API_URL: Backend API URL (default: http://localhost:3000/api/v1)

Key Scripts
Script	Purpose
npm run dev	Start development server
npm run build	Build for production
npm run preview	Preview production build
npm run lint	Run ESLint
Project Structure
text
src/
├── components/     # React components
├── pages/         # Page components
├── hooks/         # Custom React hooks
├── utils/         # Utility functions
├── types/         # TypeScript definitions
└── styles/        # Global styles
Integration with Backend
API client configured in src/lib/api.ts

Authentication handled via HTTP-only cookies

CSRF protection enabled

Error handling centralized

Testing
bash
# Run component tests
npm run test

# Run auth flow test (requires backend)
./test-auth-flow.sh
Documentation
Architecture: See docs/ARCHITECTURE.md

API Contracts: See docs/API_CONTRACTS.md

Security: See docs/SECURITY.md

Operations: See docs/OPERATIONS.md

Component Standards
Components follow enterprise standards:

6-file structure (component, types, styles, tests, stories, utils)

TypeScript strict mode

Comprehensive testing (>80% coverage)

Accessibility compliance (WCAG 2.1 AA)

Storybook documentation

Example: See Dropdown component
