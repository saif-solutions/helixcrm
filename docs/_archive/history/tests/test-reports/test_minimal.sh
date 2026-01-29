#!/bin/bash
echo "í´ MINIMAL TEST COMPONENT"
echo "========================"

# Create a minimal test component
cat > apps/web/src/pages/TestPage.tsx << 'TEST'
import React from 'react';
import { useAuth } from '../hooks/useAuth';

export const TestPage: React.FC = () => {
  // This should work if hooks are working
  const { user, token } = useAuth();
  
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>Minimal Test Page</h1>
      <p>Testing React hooks...</p>
      <div style={{ background: '#f0f0f0', padding: '10px', margin: '10px 0' }}>
        <p>User: {user ? 'Logged in' : 'Not logged in'}</p>
        <p>Token: {token ? 'Present' : 'Missing'}</p>
      </div>
      <p>If this page loads without "Invalid hook call" error, then hooks work.</p>
      <p>If it shows error, there's a React configuration issue.</p>
    </div>
  );
};
TEST

echo "âœ… Created TestPage.tsx"
echo "Add route in App.tsx:"
echo "  <Route path=\"/test\" element={<TestPage />} />"
echo "Then visit http://localhost:5173/test"
echo ""
echo "This isolates the hook issue from ContactsPage complexity."
