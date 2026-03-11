import React from 'react';
import { Input } from '../atoms/Input';
import { Select, SelectOption } from '../atoms/Select';
import { Button } from '../atoms/Button';
import {
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
  ACTOR_TYPES,
  AUDIT_SEVERITY,
  getActionLabel,
} from '../../lib/types/audit.types';

interface AuditFiltersProps {
  filters: {
    search: string;
    action: string;
    entityType: string;
    actorType: string;
    severity: string;
    from: string;
    to: string;
  };
  onFilterChange: (filters: Partial<AuditFiltersProps['filters']>) => void;
  onReset: () => void;
}

export const AuditFilters: React.FC<AuditFiltersProps> = ({ filters, onFilterChange, onReset }) => {
  const handleInputChange = (name: keyof typeof filters, value: string) => {
    onFilterChange({ [name]: value });
  };

  const handleSelectChange = (
    name: keyof typeof filters,
    value: string | number | (string | number)[]
  ) => {
    // Handle single value selection (not array)
    if (Array.isArray(value)) {
      // Take the first value if it's an array (shouldn't happen for single select)
      const stringValue = value.length > 0 ? String(value[0]) : '';
      onFilterChange({ [name]: stringValue });
    } else {
      const stringValue = typeof value === 'number' ? value.toString() : value;
      onFilterChange({ [name]: stringValue });
    }
  };

  // Cast Object.values() to string[] to fix TypeScript issues
  const actionOptions: SelectOption[] = [
    { value: '', label: 'All Actions' },
    ...(Object.values(AUDIT_ACTIONS) as string[]).map((action) => ({
      value: action,
      label: getActionLabel(action),
    })),
  ];

  const entityTypeOptions: SelectOption[] = [
    { value: '', label: 'All Entities' },
    ...(Object.values(AUDIT_ENTITY_TYPES) as string[]).map((type) => ({
      value: type,
      label: type.charAt(0) + type.slice(1).toLowerCase(),
    })),
  ];

  const actorTypeOptions: SelectOption[] = [
    { value: '', label: 'All Actors' },
    ...(Object.values(ACTOR_TYPES) as string[]).map((type) => ({
      value: type,
      label: type.charAt(0) + type.slice(1).toLowerCase(),
    })),
  ];

  const severityOptions: SelectOption[] = [
    { value: '', label: 'All Severities' },
    ...(Object.values(AUDIT_SEVERITY) as string[]).map((severity) => ({
      value: severity,
      label: severity.charAt(0) + severity.slice(1).toLowerCase(),
    })),
  ];

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
          <Input
            type="text"
            placeholder="Search by email, ID, or action..."
            value={filters.search}
            onChange={(e) => handleInputChange('search', e.target.value)}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
          <Select
            value={filters.action}
            onChange={(value) => handleSelectChange('action', value)}
            options={actionOptions}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Entity Type</label>
          <Select
            value={filters.entityType}
            onChange={(value) => handleSelectChange('entityType', value)}
            options={entityTypeOptions}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Actor Type</label>
          <Select
            value={filters.actorType}
            onChange={(value) => handleSelectChange('actorType', value)}
            options={actorTypeOptions}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
          <Select
            value={filters.severity}
            onChange={(value) => handleSelectChange('severity', value)}
            options={severityOptions}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
          <Input
            type="date"
            value={filters.from}
            onChange={(e) => handleInputChange('from', e.target.value)}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
          <Input
            type="date"
            value={filters.to}
            onChange={(e) => handleInputChange('to', e.target.value)}
            className="w-full"
          />
        </div>

        <div className="flex items-end">
          <Button variant="outline" onClick={onReset} className="w-full">
            Reset Filters
          </Button>
        </div>
      </div>
    </div>
  );
};
