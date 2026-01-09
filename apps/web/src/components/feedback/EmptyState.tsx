import React from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Search } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  message,
  actionLabel,
  onAction,
  icon,
}) => {
  const defaultIcon = icon || <Search className="h-12 w-12 text-gray-300 mb-4" />;
  
  return (
    <Card className="py-12">
      <div className="flex flex-col items-center justify-center text-center">
        <div className="mb-4 text-gray-400">
          {defaultIcon}
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 max-w-sm mb-6">{message}</p>
        {actionLabel && onAction && (
          <Button onClick={onAction}>
            {actionLabel}
          </Button>
        )}
      </div>
    </Card>
  );
};
