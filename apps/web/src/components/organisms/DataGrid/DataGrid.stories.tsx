// D:\Projects-In-Hand\helixcrm/apps/web/src/components/organisms/DataGrid/DataGrid.stories.tsx
import * as React from 'react';
import { DataGrid } from './DataGrid';
import type { Column } from './DataGrid.types';
import { Button } from '../../atoms/Button/Button';
import { Badge } from '../../atoms/Badge/Badge';
import { Avatar } from '../../atoms/Avatar/Avatar';

// Define data types for our examples
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive' | 'pending';
  lastLogin: string;
  department: string;
}

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
}

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  company: string;
  email: string;
  phone: string;
  status: 'lead' | 'customer' | 'inactive';
  lastContact: string;
  value: number;
}

// Sample data
const users: User[] = [
  { id: '1', name: 'John Doe', email: 'john@example.com', role: 'Admin', status: 'active', lastLogin: '2024-01-10', department: 'Engineering' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'Editor', status: 'active', lastLogin: '2024-01-09', department: 'Marketing' },
  { id: '3', name: 'Bob Johnson', email: 'bob@example.com', role: 'Viewer', status: 'inactive', lastLogin: '2024-01-05', department: 'Sales' },
  { id: '4', name: 'Alice Brown', email: 'alice@example.com', role: 'Admin', status: 'pending', lastLogin: '2024-01-08', department: 'Engineering' },
  { id: '5', name: 'Charlie Wilson', email: 'charlie@example.com', role: 'Editor', status: 'active', lastLogin: '2024-01-11', department: 'Support' },
  { id: '6', name: 'Diana Prince', email: 'diana@example.com', role: 'Viewer', status: 'active', lastLogin: '2024-01-07', department: 'Marketing' },
  { id: '7', name: 'Edward Lee', email: 'edward@example.com', role: 'Admin', status: 'inactive', lastLogin: '2024-01-02', department: 'Engineering' },
  { id: '8', name: 'Fiona Green', email: 'fiona@example.com', role: 'Editor', status: 'pending', lastLogin: '2024-01-06', department: 'Sales' },
];

const products: Product[] = [
  { id: '1', name: 'Laptop Pro', category: 'Electronics', price: 1299.99, stock: 45, status: 'in_stock' },
  { id: '2', name: 'Wireless Mouse', category: 'Accessories', price: 49.99, stock: 5, status: 'low_stock' },
  { id: '3', name: 'Mechanical Keyboard', category: 'Accessories', price: 89.99, stock: 0, status: 'out_of_stock' },
  { id: '4', name: 'Monitor 27"', category: 'Electronics', price: 299.99, stock: 12, status: 'in_stock' },
  { id: '5', name: 'USB-C Hub', category: 'Accessories', price: 39.99, stock: 3, status: 'low_stock' },
  { id: '6', name: 'Webcam HD', category: 'Electronics', price: 79.99, stock: 25, status: 'in_stock' },
];

const contacts: Contact[] = [
  { id: '1', firstName: 'John', lastName: 'Doe', company: 'Tech Corp', email: 'john@techcorp.com', phone: '(555) 123-4567', status: 'customer', lastContact: '2024-01-10', value: 50000 },
  { id: '2', firstName: 'Jane', lastName: 'Smith', company: 'Marketing Inc', email: 'jane@marketing.com', phone: '(555) 987-6543', status: 'lead', lastContact: '2024-01-09', value: 25000 },
  { id: '3', firstName: 'Bob', lastName: 'Johnson', company: 'Sales Co', email: 'bob@sales.com', phone: '(555) 456-7890', status: 'customer', lastContact: '2024-01-11', value: 75000 },
  { id: '4', firstName: 'Alice', lastName: 'Brown', company: 'Startup XYZ', email: 'alice@startup.com', phone: '(555) 321-0987', status: 'lead', lastContact: '2024-01-05', value: 15000 },
  { id: '5', firstName: 'Charlie', lastName: 'Wilson', company: 'Enterprise Ltd', email: 'charlie@enterprise.com', phone: '(555) 654-3210', status: 'customer', lastContact: '2024-01-12', value: 120000 },
  { id: '6', firstName: 'Diana', lastName: 'Prince', company: 'Business Co', email: 'diana@business.com', phone: '(555) 789-0123', status: 'inactive', lastContact: '2023-12-15', value: 0 },
];

// ==================== BASIC EXAMPLES ====================

/**
 * Default DataGrid with minimal configuration.
 * Shows basic tabular data display.
 */
export const Default = () => {
  const columns: Column<User>[] = [
    { key: 'name', title: 'Name', width: '200px' },
    { key: 'email', title: 'Email', width: '250px' },
    { key: 'role', title: 'Role', width: '120px' },
    { key: 'department', title: 'Department', width: '150px' },
    { key: 'lastLogin', title: 'Last Login', width: '120px' },
  ];
  
  return (
    <div className="p-6">
      <DataGrid 
        data={users.slice(0, 5)} 
        columns={columns} 
        rowKey="id" 
        aria-label="User management table" 
      />
    </div>
  );
};

/**
 * DataGrid with row selection enabled.
 * Demonstrates single and multi-select capabilities.
 */
export const WithSelection = () => {
  const columns: Column<User>[] = [
    { key: 'name', title: 'Name', width: '200px' },
    { key: 'email', title: 'Email', width: '250px' },
    { key: 'role', title: 'Role', width: '120px' },
    { key: 'status', title: 'Status', width: '120px' },
    { key: 'lastLogin', title: 'Last Login', width: '120px' },
  ];
  
  return (
    <div className="p-6">
      <DataGrid 
        data={users} 
        columns={columns} 
        rowKey="id"
        selectable
        striped
        hoverable
        aria-label="User table with selection"
      />
    </div>
  );
};

/**
 * DataGrid with custom cell rendering.
 * Shows how to customize cell content using render functions.
 */
export const WithCustomRendering = () => {
  const columns: Column<User>[] = [
    {
      key: 'name',
      title: 'User',
      width: '200px',
      render: (_: unknown, row: User) => (
        <div className="flex items-center gap-3">
          <Avatar fallback={row.name} size="sm" />
          <div>
            <div className="font-medium text-gray-900">{row.name}</div>
            <div className="text-sm text-gray-500">{row.department}</div>
          </div>
        </div>
      ),
    },
    { key: 'email', title: 'Email', width: '250px' },
    {
      key: 'role',
      title: 'Role',
      width: '120px',
      render: (value: string) => (
        <Badge variant={value === 'Admin' ? 'primary' : 'default'}>
          {value}
        </Badge>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      width: '120px',
      render: (value: User['status']) => {
        const variants = {
          active: { variant: 'success' as const, label: 'Active' },
          inactive: { variant: 'error' as const, label: 'Inactive' },
          pending: { variant: 'warning' as const, label: 'Pending' },
        };
        const { variant, label } = variants[value];
        return <Badge variant={variant}>{label}</Badge>;
      },
    },
    { key: 'lastLogin', title: 'Last Login', width: '120px' },
  ];
  
  return (
    <div className="p-6">
      <DataGrid 
        data={users} 
        columns={columns} 
        rowKey="id"
        selectable
        hoverable
        aria-label="User table with custom rendering"
      />
    </div>
  );
};

/**
 * DataGrid with column sorting.
 * Demonstrates sortable columns with visual indicators.
 */
export const WithSorting = () => {
  const [sort, setSort] = React.useState({ column: 'name', direction: 'asc' as 'asc' | 'desc' });
  
  const columns: Column<User>[] = [
    { key: 'name', title: 'Name', width: '200px', sortable: true },
    { key: 'email', title: 'Email', width: '250px', sortable: true },
    { key: 'role', title: 'Role', width: '120px', sortable: true },
    { key: 'status', title: 'Status', width: '120px', sortable: true },
    { key: 'lastLogin', title: 'Last Login', width: '120px', sortable: true },
  ];
  
  const handleSortChange = (column: string, direction: 'asc' | 'desc') => {
    setSort({ column, direction });
    console.log(`Sort by ${column} ${direction}`);
  };
  
  return (
    <div className="p-6">
      <DataGrid 
        data={users} 
        columns={columns} 
        rowKey="id"
        sort={sort}
        onSortChange={handleSortChange}
        aria-label="Sortable user table"
      />
    </div>
  );
};

/**
 * DataGrid with row actions.
 * Shows how to add action buttons per row.
 */
export const WithRowActions = () => {
  const columns: Column<User>[] = [
    { key: 'name', title: 'Name', width: '200px' },
    { key: 'email', title: 'Email', width: '250px' },
    { key: 'role', title: 'Role', width: '120px' },
    { key: 'status', title: 'Status', width: '120px' },
  ];
  
  const rowActions = (row: User) => (
    <>
      <Button size="sm" variant="ghost" aria-label={`Edit ${row.name}`}>
        Edit
      </Button>
      <Button size="sm" variant="ghost" aria-label={`Delete ${row.name}`}>
        Delete
      </Button>
    </>
  );
  
  return (
    <div className="p-6">
      <DataGrid 
        data={users.slice(0, 4)} 
        columns={columns} 
        rowKey="id"
        actions={rowActions}
        aria-label="User table with row actions"
      />
    </div>
  );
};

/**
 * DataGrid with pagination.
 * Demonstrates client-side pagination.
 */
export const WithPagination = () => {
  const [page, setPage] = React.useState(1);
  const pageSize = 3;
  
  const columns: Column<User>[] = [
    { key: 'name', title: 'Name', width: '200px' },
    { key: 'email', title: 'Email', width: '250px' },
    { key: 'role', title: 'Role', width: '120px' },
    { key: 'status', title: 'Status', width: '120px' },
  ];
  
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    console.log(`Page changed to ${newPage}`);
  };
  
  const paginatedData = users.slice((page - 1) * pageSize, page * pageSize);
  
  return (
    <div className="p-6">
      <DataGrid 
        data={paginatedData} 
        columns={columns} 
        rowKey="id"
        pagination={{
          page,
          pageSize,
          total: users.length,
          onPageChange: handlePageChange,
        }}
        aria-label="Paginated user table"
      />
    </div>
  );
};

/**
 * DataGrid with bulk actions.
 * Demonstrates actions that affect multiple selected rows.
 */
export const WithBulkActions = () => {
  const [selectedRows, setSelectedRows] = React.useState<string[]>([]);
  
  const columns: Column<User>[] = [
    { key: 'name', title: 'Name', width: '200px' },
    { key: 'email', title: 'Email', width: '250px' },
    { key: 'role', title: 'Role', width: '120px' },
    { key: 'status', title: 'Status', width: '120px' },
  ];
  
  const bulkActions = selectedRows.length > 0 ? (
    <>
      <Button size="sm" variant="primary" aria-label="Export selected users">
        Export Selected
      </Button>
      <Button size="sm" variant="danger" aria-label="Delete selected users">
        Delete Selected
      </Button>
    </>
  ) : null;
  
  return (
    <div className="p-6">
      <DataGrid 
        data={users} 
        columns={columns} 
        rowKey="id"
        selectable
        selectedRows={selectedRows}
        onSelectionChange={setSelectedRows}
        bulkActions={bulkActions}
        aria-label="User table with bulk actions"
      />
    </div>
  );
};

// ==================== STATE EXAMPLES ====================

/**
 * Compact mode DataGrid.
 * Shows dense data display for space-constrained layouts.
 */
export const CompactMode = () => {
  const columns: Column<Product>[] = [
    { key: 'name', title: 'Product', width: '200px' },
    { key: 'category', title: 'Category', width: '150px' },
    { 
      key: 'price', 
      title: 'Price', 
      width: '120px',
      align: 'right' as const,
      render: (value: number) => `$${value.toFixed(2)}`,
    },
    { 
      key: 'stock', 
      title: 'Stock', 
      width: '120px',
      align: 'right' as const,
    },
    {
      key: 'status',
      title: 'Status',
      width: '120px',
      render: (value: Product['status']) => {
        const variants = {
          in_stock: { variant: 'success' as const, label: 'In Stock' },
          low_stock: { variant: 'warning' as const, label: 'Low Stock' },
          out_of_stock: { variant: 'error' as const, label: 'Out of Stock' },
        };
        const { variant, label } = variants[value];
        return <Badge variant={variant}>{label}</Badge>;
      },
    },
  ];
  
  return (
    <div className="p-6">
      <DataGrid 
        data={products} 
        columns={columns} 
        rowKey="id"
        compact
        striped={false}
        aria-label="Compact product inventory table"
      />
    </div>
  );
};

/**
 * Empty state DataGrid.
 * Shows how the component behaves with no data.
 */
export const EmptyState = () => {
  const columns: Column<User>[] = [
    { key: 'name', title: 'Name', width: '200px' },
    { key: 'email', title: 'Email', width: '250px' },
    { key: 'role', title: 'Role', width: '120px' },
    { key: 'status', title: 'Status', width: '120px' },
  ];
  
  return (
    <div className="p-6">
      <DataGrid 
        data={[]} 
        columns={columns} 
        rowKey="id"
        emptyMessage="No users found. Try adjusting your filters or add new users."
        aria-label="Empty user table"
      />
    </div>
  );
};

/**
 * Loading state DataGrid.
 * Shows loading indicator while data is being fetched.
 */
export const LoadingState = () => {
  const columns: Column<User>[] = [
    { key: 'name', title: 'Name', width: '200px' },
    { key: 'email', title: 'Email', width: '250px' },
    { key: 'role', title: 'Role', width: '120px' },
    { key: 'status', title: 'Status', width: '120px' },
  ];
  
  return (
    <div className="p-6">
      <DataGrid 
        data={[]} 
        columns={columns} 
        rowKey="id"
        loading
        aria-label="Loading user table"
      />
    </div>
  );
};

// ==================== REAL-WORLD EXAMPLES ====================

/**
 * Complete example with all features.
 * Demonstrates comprehensive usage in a real-world scenario.
 */
export const CompleteExample = () => {
  const [selectedRows, setSelectedRows] = React.useState<string[]>([]);
  const [sort, setSort] = React.useState({ column: 'name', direction: 'asc' as 'asc' | 'desc' });
  const [page, setPage] = React.useState(1);
  
  const pageSize = 4;
  const total = users.length;
  const paginatedData = users.slice((page - 1) * pageSize, page * pageSize);
  
  const columns: Column<User>[] = [
    {
      key: 'name',
      title: 'User',
      width: '200px',
      sortable: true,
      render: (_: unknown, row: User) => (
        <div className="flex items-center gap-3">
          <Avatar fallback={row.name} size="sm" />
          <div>
            <div className="font-medium text-gray-900">{row.name}</div>
            <div className="text-sm text-gray-500">{row.department}</div>
          </div>
        </div>
      ),
    },
    { 
      key: 'email', 
      title: 'Email', 
      width: '250px',
      sortable: true,
    },
    {
      key: 'role',
      title: 'Role',
      width: '120px',
      sortable: true,
      render: (value: string) => (
        <Badge variant={value === 'Admin' ? 'primary' : 'default'}>
          {value}
        </Badge>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      width: '120px',
      sortable: true,
      render: (value: User['status']) => {
        const variants = {
          active: { variant: 'success' as const, label: 'Active' },
          inactive: { variant: 'error' as const, label: 'Inactive' },
          pending: { variant: 'warning' as const, label: 'Pending' },
        };
        const { variant, label } = variants[value];
        return <Badge variant={variant}>{label}</Badge>;
      },
    },
    { 
      key: 'lastLogin', 
      title: 'Last Login', 
      width: '120px',
      sortable: true,
    },
  ];
  
  const rowActions = (_: User) => (
    <>
      <Button size="sm" variant="ghost" aria-label="View details">
        View
      </Button>
      <Button size="sm" variant="ghost" aria-label="Edit user">
        Edit
      </Button>
    </>
  );
  
  const bulkActions = selectedRows.length > 0 ? (
    <>
      <Button size="sm" variant="primary" aria-label={`Export ${selectedRows.length} selected users`}>
        Export ({selectedRows.length})
      </Button>
      <Button size="sm" variant="danger" aria-label={`Delete ${selectedRows.length} selected users`}>
        Delete ({selectedRows.length})
      </Button>
    </>
  ) : null;
  
  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">User Management</h2>
        <p className="text-gray-600">Manage your team members and their permissions.</p>
      </div>
      
      <DataGrid 
        data={paginatedData} 
        columns={columns} 
        rowKey="id"
        selectable
        selectedRows={selectedRows}
        onSelectionChange={setSelectedRows}
        sort={sort}
        onSortChange={(column: string, direction: 'asc' | 'desc') => setSort({ column, direction })}
        actions={rowActions}
        bulkActions={bulkActions}
        pagination={{
          page,
          pageSize,
          total,
          onPageChange: setPage,
        }}
        hoverable
        striped
        onRowClick={(row: User) => {
          console.log('Row clicked:', row);
        }}
        aria-label="Complete user management table example"
      />
    </div>
  );
};

/**
 * CRM Contacts example.
 * Real-world scenario for customer relationship management.
 */
export const CRMContactsExample = () => {
  const columns: Column<Contact>[] = [
    {
      key: 'name',
      title: 'Contact',
      width: '200px',
      render: (_: unknown, row: Contact) => (
        <div>
          <div className="font-medium text-gray-900">{row.firstName} {row.lastName}</div>
          <div className="text-sm text-gray-500">{row.company}</div>
        </div>
      ),
    },
    { key: 'email', title: 'Email', width: '220px' },
    { key: 'phone', title: 'Phone', width: '150px' },
    {
      key: 'status',
      title: 'Status',
      width: '120px',
      render: (value: Contact['status']) => {
        const variants = {
          lead: { variant: 'warning' as const, label: 'Lead' },
          customer: { variant: 'success' as const, label: 'Customer' },
          inactive: { variant: 'error' as const, label: 'Inactive' },
        };
        const { variant, label } = variants[value];
        return <Badge variant={variant}>{label}</Badge>;
      },
    },
    { key: 'lastContact', title: 'Last Contact', width: '120px' },
    {
      key: 'value',
      title: 'Value',
      width: '120px',
      align: 'right' as const,
      render: (value: number) => (
        <div className="font-medium">
          ${value.toLocaleString()}
        </div>
      ),
    },
  ];
  
  const rowActions = (_: Contact) => (
    <>
      <Button size="sm" variant="ghost" aria-label="Send email">
        Email
      </Button>
      <Button size="sm" variant="ghost" aria-label="Make call">
        Call
      </Button>
      <Button size="sm" variant="ghost" aria-label="More options">
        More
      </Button>
    </>
  );
  
  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Contacts</h2>
        <p className="text-gray-600">Manage your customer relationships</p>
      </div>
      
      <DataGrid 
        data={contacts} 
        columns={columns} 
        rowKey="id"
        selectable
        actions={rowActions}
        hoverable
        striped
        aria-label="CRM contacts table"
      />
    </div>
  );
};

/**
 * Accessibility-focused example.
 * Demonstrates proper ARIA attributes and keyboard navigation.
 */
export const AccessibilityExample = () => {
  const columns: Column<User>[] = [
    { 
      key: 'name', 
      title: 'Name', 
      width: '200px',
      sortable: true,
    },
    { 
      key: 'email', 
      title: 'Email', 
      width: '250px',
      sortable: true,
    },
    { 
      key: 'role', 
      title: 'Role', 
      width: '120px',
    },
  ];
  
  return (
    <div className="p-6">
      <div id="table-description" className="sr-only">
        User management table with sortable columns and row selection. Use Tab to navigate, Space to select rows, and Enter to activate sortable headers.
      </div>
      <DataGrid 
        data={users.slice(0, 3)} 
        columns={columns} 
        rowKey="id"
        selectable
        aria-label="Accessible user table"
        aria-describedby="table-description"
      />
      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-medium text-blue-900 mb-2">Accessibility Features:</h3>
        <ul className="text-sm text-blue-800 list-disc list-inside space-y-1">
          <li>Full keyboard navigation (Tab, Space, Enter, Arrow keys)</li>
          <li>ARIA labels for all interactive elements</li>
          <li>Screen reader announcements for state changes</li>
          <li>Proper focus management with visible indicators</li>
          <li>Color contrast meeting WCAG 2.1 AA standards</li>
        </ul>
      </div>
    </div>
  );
};

/**
 * Performance-focused example.
 * Demonstrates handling large datasets efficiently.
 */
export const PerformanceExample = () => {
  const [page, setPage] = React.useState(1);
  const pageSize = 50;
  
  // Generate 1000 sample users
  const largeData = React.useMemo(() => 
    Array.from({ length: 1000 }, (_, i) => ({
      id: `${i + 1}`,
      name: `User ${i + 1}`,
      email: `user${i + 1}@example.com`,
      role: i % 3 === 0 ? 'Admin' : i % 3 === 1 ? 'Editor' : 'Viewer',
      status: (i % 4 === 0 ? 'pending' : i % 4 === 1 ? 'inactive' : 'active') as User['status'],
      lastLogin: '2024-01-15',
      department: ['Engineering', 'Marketing', 'Sales', 'Support'][i % 4],
    })), []
  );
  
  const columns: Column<User>[] = [
    { key: 'name', title: 'Name', width: '200px' },
    { key: 'email', title: 'Email', width: '250px' },
    { key: 'role', title: 'Role', width: '120px' },
    { key: 'status', title: 'Status', width: '120px' },
    { key: 'department', title: 'Department', width: '150px' },
  ];
  
  const paginatedData = largeData.slice((page - 1) * pageSize, page * pageSize);
  
  return (
    <div className="p-6">
      <DataGrid 
        data={paginatedData} 
        columns={columns} 
        rowKey="id"
        selectable
        pagination={{
          page,
          pageSize,
          total: largeData.length,
          onPageChange: setPage,
        }}
        aria-label="Large dataset performance table"
      />
      <div className="mt-4 text-sm text-gray-600">
        <p>Showing 50 of 1000 records. Pagination is essential for performance with large datasets.</p>
      </div>
    </div>
  );
};

// Default export for Storybook
export default {
  title: 'Organisms/DataGrid',
  component: DataGrid,
  parameters: {
    layout: 'fullscreen',
  },
};