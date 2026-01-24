// apps/web/src/pages/TestPage.tsx
import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Card } from '../components/molecules/Card';
import { Button } from '../components/atoms/Button';
import { Input } from '../components/atoms/Input';

const TestPage: React.FC = () => {
  const { user } = useAuth(); // Removed 'token' - auth is cookie-based
  const [message, setMessage] = useState('');

  const handleTestClick = () => {
    // Removed token usage - auth is handled via cookies
    const authToken = localStorage.getItem('helix_token') || sessionStorage.getItem('helix_token');
    console.log('Test click - User:', user?.email, 'Token exists:', !!authToken);
    setMessage(`User: ${user?.email || 'none'}, Token in storage: ${!!authToken}`);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Test Page</h1>

      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-2">Authentication Info</h2>
            <p className="text-sm text-gray-600">User: {user?.email || 'Not logged in'}</p>
            <p className="text-sm text-gray-600">Organization: {user?.organizationId || 'None'}</p>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleTestClick}>Test Authentication</Button>
            <Button variant="outline" onClick={() => setMessage('')}>
              Clear
            </Button>
          </div>

          {message && (
            <div className="p-4 bg-gray-100 rounded">
              <p className="text-sm">{message}</p>
            </div>
          )}

          <div>
            <h3 className="font-medium mb-2">Test Input</h3>
            <Input
              placeholder="Type something..."
              onChange={(e) => console.log('Input changed:', e.target.value)}
            />
          </div>
        </div>
      </Card>
    </div>
  );
};

export default TestPage;
