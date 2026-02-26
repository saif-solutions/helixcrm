import { DropdownProps, DropdownPlacement, DropdownSize, DropdownVariant } from './Dropdown.types';

// ============================================================================
// GOVERNANCE
// ============================================================================

export interface DropdownGovernance {
  status: 'experimental' | 'alpha' | 'beta' | 'stable' | 'deprecated';
  version: string;
  owner: 'design-system' | 'frontend-core' | 'forms-team';
  designFigmaLink: string;
  lastA11yAudit: string;
}

export interface DropdownComplianceStatus {
  fileStructure: boolean;
  typeSafety: boolean;
  accessibility: 'compliant' | 'partial' | 'non-compliant';
  testCoverage: number;
  documentation: number;
  performance: boolean;
  bundleSize: boolean;
}

export interface DropdownLifecycle {
  status: 'experimental' | 'alpha' | 'beta' | 'stable' | 'deprecated';
  statusDate: string;
  deprecationDate?: string;
  removalDate?: string;
  migrationGuideUrl?: string;
}

// ============================================================================
// VALIDATION
// ============================================================================

export interface DropdownValidationRules {
  minItems?: number;
  maxItems?: number;
  required?: boolean;
  validate?: (value: string | undefined) => string | undefined;
}

export interface DropdownValidationResult {
  isValid: boolean;
  message?: string;
  level: 'error' | 'warning' | 'info';
}

// ============================================================================
// PERFORMANCE
// ============================================================================

export interface DropdownPerformanceMetrics {
  renderTime: number;
  openAnimationTime: number;
  closeAnimationTime: number;
  domNodes: number;
  memoryUsage: number;
}

// ============================================================================
// PRESETS
// ============================================================================

export interface DropdownPreset {
  name: string;
  description: string;
  props: Partial<DropdownProps>;
}

export const DROPDOWN_PRESETS: Record<string, DropdownPreset> = {
  select: {
    name: 'Select',
    description: 'Single selection dropdown',
    props: {
      role: 'listbox',
      closeOnSelect: true,
      autoFocus: true,
    },
  },

  menu: {
    name: 'Menu',
    description: 'Action menu dropdown',
    props: {
      role: 'menu',
      closeOnSelect: true,
    },
  },

  combobox: {
    name: 'Combobox',
    description: 'Searchable dropdown',
    props: {
      role: 'combobox',
      closeOnSelect: false,
      autoFocus: true,
    },
  },

  submenu: {
    name: 'Submenu',
    description: 'Nested dropdown menu',
    props: {
      placement: 'right-start' as DropdownPlacement,
      closeOnSelect: true,
      modal: false,
    },
  },
};

// ============================================================================
// DEFAULTS
// ============================================================================

export const DEFAULT_DROPDOWN_PROPS: Partial<DropdownProps> = {
  size: 'md' as DropdownSize,
  placement: 'bottom-start',
  align: 'start',
  variant: 'primary' as DropdownVariant,

  closeOnSelect: true,
  closeOnEscape: true,
  closeOnOutsideClick: true,
  closeOnScroll: false,

  preventScroll: false,
  lockFocus: true,
  autoFocus: false,
  modal: false,
  persistent: false,
};
