import React from 'react';
import { usePermission } from '../../lib/hooks/usePermission';

// Only show in development
const IS_DEV = import.meta.env.DEV;

export const PermissionDebug: React.FC = () => {
  const { permissions, roles, hasPermission } = usePermission();

  if (!IS_DEV) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 text-white p-4 rounded-lg shadow-xl text-xs font-mono z-50 max-w-md">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-green-400">🔐 Permission Debug</h3>
        <button
          onClick={() => {
            // Simple toggle to hide - could be expanded
            const el = document.getElementById('permission-debug');
            if (el) el.style.display = 'none';
          }}
          className="text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>
      
      <div className="mb-2">
        <span className="text-gray-400">Roles:</span>{' '}
        {roles.length ? (
          roles.map(r => (
            <span key={r} className="bg-blue-800 px-1 py-0.5 rounded mr-1">
              {r}
            </span>
          ))
        ) : (
          <span className="text-gray-500">none</span>
        )}
      </div>
      
      <div>
        <span className="text-gray-400">Permissions ({permissions.length}):</span>
        {permissions.length > 0 ? (
          <div className="mt-1 max-h-40 overflow-y-auto">
            {permissions.map(p => (
              <div key={p} className="flex items-center">
                <span className="text-green-400 mr-2">✓</span>
                <span>{p}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-500 mt-1">no permissions</div>
        )}
      </div>
      
      {/* Quick test inputs */}
      <div className="mt-3 pt-2 border-t border-gray-700">
        <div className="text-gray-400 text-xs mb-1">Test permission:</div>
        <input
          type="text"
          placeholder="e.g., contact:read"
          className="w-full bg-gray-800 text-white text-xs p-1 rounded"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const input = e.currentTarget;
              const result = hasPermission(input.value);
              alert(`hasPermission("${input.value}") = ${result}`);
            }
          }}
        />
      </div>
    </div>
  );
};