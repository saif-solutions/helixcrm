import React, { useState, useMemo } from 'react';
import { usePermission } from '../../lib/hooks/usePermission';
import { useToast } from '../../components/feedback/ToastProvider';
import { Card } from '../../components/molecules/Card';
import { Button } from '../../components/atoms/Button';
import { Input } from '../../components/atoms/Input';
import { LoadingSpinner } from '../../components/feedback/LoadingSpinner';
import { EmptyState } from '../../components/feedback/EmptyState';
import { Modal } from '../../components/feedback/Modal';
import { ConfirmationDialog } from '../../components/feedback/ConfirmationDialog';
import {
  UserPlus,
  Search,
  Filter,
  Edit,
  Trash2,
  Shield,
  Mail,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Download,
  Lock,
  Unlock,
  Key,
} from 'lucide-react';

// Types
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'manager' | 'user';
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt?: string;
  createdAt: string;
  permissions: string[];
}

// Mock data - replace with actual API calls
const MOCK_USERS: User[] = [
  {
    id: '1',
    email: 'admin@helixcrm.com',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    isActive: true,
    emailVerified: true,
    lastLoginAt: '2026-03-01T09:30:00Z',
    createdAt: '2026-01-01T00:00:00Z',
    permissions: ['*'], // Admin has all permissions
  },
  {
    id: '2',
    email: 'manager@helixcrm.com',
    firstName: 'Manager',
    lastName: 'User',
    role: 'manager',
    isActive: true,
    emailVerified: true,
    lastLoginAt: '2026-02-28T14:20:00Z',
    createdAt: '2026-01-15T10:30:00Z',
    permissions: [
      'user:read',
      'contact:read',
      'contact:write',
      'lead:read',
      'lead:write',
      'deal:read',
      'deal:write',
      'report:read',
    ],
  },
  {
    id: '3',
    email: 'sales1@helixcrm.com',
    firstName: 'Sarah',
    lastName: 'Johnson',
    role: 'user',
    isActive: true,
    emailVerified: true,
    lastLoginAt: '2026-03-01T11:15:00Z',
    createdAt: '2026-02-01T08:45:00Z',
    permissions: ['contact:read', 'contact:write', 'lead:read', 'lead:write', 'deal:read'],
  },
  {
    id: '4',
    email: 'sales2@helixcrm.com',
    firstName: 'Mike',
    lastName: 'Wilson',
    role: 'user',
    isActive: true,
    emailVerified: false,
    lastLoginAt: '2026-02-25T16:30:00Z',
    createdAt: '2026-02-10T13:20:00Z',
    permissions: ['contact:read', 'lead:read', 'deal:read'],
  },
  {
    id: '5',
    email: 'inactive@helixcrm.com',
    firstName: 'Inactive',
    lastName: 'User',
    role: 'user',
    isActive: false,
    emailVerified: true,
    lastLoginAt: '2026-02-01T10:00:00Z',
    createdAt: '2026-01-20T09:15:00Z',
    permissions: ['contact:read'],
  },
];

const ITEMS_PER_PAGE = 10;

const UserManagementPage: React.FC = () => {
  const { hasPermission } = usePermission();
  const { success } = useToast();

  // State
  const users = MOCK_USERS;
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [showInactive, setShowInactive] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Modal states
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [showResetPasswordConfirm, setShowResetPasswordConfirm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Filter users
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // Filter by active status
      if (!showInactive && !user.isActive) return false;

      // Filter by role
      if (selectedRole !== 'all' && user.role !== selectedRole) return false;

      // Filter by search term
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          user.firstName.toLowerCase().includes(searchLower) ||
          user.lastName.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower)
        );
      }

      return true;
    });
  }, [users, searchTerm, selectedRole, showInactive]);

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'manager':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleInviteUser = () => {
    // TODO: Implement invite
    setShowInviteModal(false);
    success('Invitation Sent', 'User has been invited successfully');
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const handleUpdateUser = () => {
    // TODO: Implement update
    setShowEditModal(false);
    setSelectedUser(null);
    success('User Updated', 'User information has been updated');
  };

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    // TODO: Implement delete
    setShowDeleteConfirm(false);
    setSelectedUser(null);
    success('User Deleted', 'User has been removed');
  };

  const handleManagePermissions = (user: User) => {
    setSelectedUser(user);
    setShowPermissionsModal(true);
  };

  const handleResetPassword = (user: User) => {
    setSelectedUser(user);
    setShowResetPasswordConfirm(true);
  };

  const handleConfirmResetPassword = () => {
    // TODO: Implement password reset
    setShowResetPasswordConfirm(false);
    setSelectedUser(null);
    success('Password Reset', 'Password reset email has been sent');
  };

  const handleToggleUserStatus = (user: User) => {
    // TODO: Implement toggle active status
    success(
      user.isActive ? 'User Deactivated' : 'User Activated',
      `${user.firstName} ${user.lastName} has been ${user.isActive ? 'deactivated' : 'activated'}`
    );
  };

  const handleExport = () => {
    success('Export Started', 'User list export will begin shortly');
    // TODO: Implement export
  };

  const handleRefresh = () => {
    setLoading(true);
    // TODO: Implement refresh
    setTimeout(() => {
      setLoading(false);
      success('Refreshed', 'User list has been updated');
    }, 1000);
  };

  // Check if user has permission to view this page
  if (!hasPermission('user:read')) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-12 text-center">
          <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-500">You don't have permission to view user management.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">Manage users, roles, and permissions</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Export - requires user:read or report:read */}
          {(hasPermission('user:read') || hasPermission('report:read')) && (
            <Button
              variant="outline"
              leftIcon={<Download className="w-4 h-4" />}
              onClick={handleExport}
              disabled={users.length === 0}
            >
              Export
            </Button>
          )}

          {/* Refresh */}
          <Button
            variant="outline"
            leftIcon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
            onClick={handleRefresh}
            disabled={loading}
          >
            Refresh
          </Button>

          {/* Invite User - requires user:write */}
          {hasPermission('user:write') && (
            <Button
              leftIcon={<UserPlus className="w-4 h-4" />}
              onClick={() => setShowInviteModal(true)}
            >
              Invite User
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="search"
                  placeholder="Search users by name or email..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
            </div>

            {/* Role filter */}
            <div className="flex gap-2">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <select
                  value={selectedRole}
                  onChange={(e) => {
                    setSelectedRole(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none bg-white min-w-[140px]"
                >
                  <option value="all">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="user">User</option>
                </select>
              </div>

              {/* Show inactive toggle */}
              <button
                onClick={() => {
                  setShowInactive(!showInactive);
                  setCurrentPage(1);
                }}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  showInactive
                    ? 'bg-gray-200 text-gray-800'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {showInactive ? 'Show Active Only' : 'Show Inactive'}
              </button>
            </div>
          </div>

          {/* Active filters indicator */}
          {(searchTerm || selectedRole !== 'all' || showInactive) && (
            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs font-medium text-gray-500">Active filters:</span>
              {searchTerm && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-50 text-blue-700">
                  Search: "{searchTerm}"
                </span>
              )}
              {selectedRole !== 'all' && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-50 text-blue-700">
                  Role: {selectedRole}
                </span>
              )}
              {showInactive && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-50 text-blue-700">
                  Showing inactive
                </span>
              )}
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedRole('all');
                  setShowInactive(false);
                  setCurrentPage(1);
                }}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      </Card>

      {/* Users Table */}
      <Card>
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : paginatedUsers.length === 0 ? (
          <EmptyState
            title="No users found"
            message={
              searchTerm || selectedRole !== 'all' || showInactive
                ? 'Try adjusting your filters'
                : 'Invite your first user to get started'
            }
            actionLabel={hasPermission('user:write') ? 'Invite User' : undefined}
            onAction={hasPermission('user:write') ? () => setShowInviteModal(true) : undefined}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">
                      User
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">
                      Role
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">
                      Last Login
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">
                      Created
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-medium mr-3">
                            {user.firstName.charAt(0)}
                            {user.lastName.charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="text-sm text-gray-500 flex items-center">
                              <Mail className="w-3 h-3 mr-1" />
                              {user.email}
                              {!user.emailVerified && (
                                <span className="ml-2 text-xs text-yellow-600">(unverified)</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            user.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {formatDate(user.lastLoginAt)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {/* Reset Password - requires user:write */}
                          {hasPermission('user:write') && (
                            <button
                              onClick={() => handleResetPassword(user)}
                              className="p-1 text-gray-400 hover:text-primary-600 rounded-lg hover:bg-gray-100"
                              title="Reset Password"
                            >
                              <Key className="w-4 h-4" />
                            </button>
                          )}

                          {/* Manage Permissions - requires user:write or admin access */}
                          {(hasPermission('user:write') || hasPermission('admin:access')) && (
                            <button
                              onClick={() => handleManagePermissions(user)}
                              className="p-1 text-gray-400 hover:text-primary-600 rounded-lg hover:bg-gray-100"
                              title="Manage Permissions"
                            >
                              <Shield className="w-4 h-4" />
                            </button>
                          )}

                          {/* Toggle Active Status - requires user:write */}
                          {hasPermission('user:write') && (
                            <button
                              onClick={() => handleToggleUserStatus(user)}
                              className={`p-1 rounded-lg hover:bg-gray-100 ${
                                user.isActive
                                  ? 'text-gray-400 hover:text-orange-600'
                                  : 'text-gray-400 hover:text-green-600'
                              }`}
                              title={user.isActive ? 'Deactivate User' : 'Activate User'}
                            >
                              {user.isActive ? (
                                <Lock className="w-4 h-4" />
                              ) : (
                                <Unlock className="w-4 h-4" />
                              )}
                            </button>
                          )}

                          {/* Edit User - requires user:write */}
                          {hasPermission('user:write') && (
                            <button
                              onClick={() => handleEditUser(user)}
                              className="p-1 text-gray-400 hover:text-primary-600 rounded-lg hover:bg-gray-100"
                              title="Edit User"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}

                          {/* Delete User - requires user:delete */}
                          {hasPermission('user:delete') && user.role !== 'admin' && (
                            <button
                              onClick={() => handleDeleteUser(user)}
                              className="p-1 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100"
                              title="Delete User"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t">
                <div className="text-sm text-gray-700">
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
                  {Math.min(currentPage * ITEMS_PER_PAGE, filteredUsers.length)} of{' '}
                  {filteredUsers.length} users
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="px-3 py-1 text-sm text-gray-700">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Invite User Modal */}
      <Modal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title="Invite New User"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Send an invitation email to add a new user to your organization.
          </p>
          {/* Form fields would go here */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
              <Input type="text" placeholder="John" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
              <Input type="text" placeholder="Doe" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
            <Input type="email" placeholder="john.doe@example.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent">
              <option value="user">User</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={() => setShowInviteModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleInviteUser}>
              Send Invitation
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit User Modal */}
      {selectedUser && (
        <Modal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedUser(null);
          }}
          title="Edit User"
          size="lg"
        >
          <div className="space-y-4">
            <p className="text-gray-600">
              Edit user: <span className="font-medium">{selectedUser.email}</span>
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <Input type="text" defaultValue={selectedUser.firstName} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <Input type="text" defaultValue={selectedUser.lastName} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <Input type="email" defaultValue={selectedUser.email} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                defaultValue={selectedUser.role}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="user">User</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedUser(null);
                }}
              >
                Cancel
              </Button>
              <Button variant="primary" onClick={handleUpdateUser}>
                Update User
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Permissions Modal */}
      {selectedUser && (
        <Modal
          isOpen={showPermissionsModal}
          onClose={() => {
            setShowPermissionsModal(false);
            setSelectedUser(null);
          }}
          title={`Permissions - ${selectedUser.firstName} ${selectedUser.lastName}`}
          size="lg"
        >
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                {selectedUser.role === 'admin'
                  ? 'Admin users have all permissions automatically.'
                  : 'Select permissions for this user.'}
              </p>
            </div>

            {selectedUser.role !== 'admin' && (
              <div className="space-y-3">
                {/* Permission groups would go here */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Contacts</h4>
                  <div className="space-y-2 pl-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">View contacts</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Create/Edit contacts</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Delete contacts</span>
                    </label>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Leads</h4>
                  <div className="space-y-2 pl-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">View leads</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Create/Edit leads</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Delete leads</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPermissionsModal(false);
                  setSelectedUser(null);
                }}
              >
                Cancel
              </Button>
              <Button variant="primary">Save Permissions</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Dialog */}
      {selectedUser && (
        <ConfirmationDialog
          isOpen={showDeleteConfirm}
          onClose={() => {
            setShowDeleteConfirm(false);
            setSelectedUser(null);
          }}
          onConfirm={handleConfirmDelete}
          title="Delete User"
          message={`Are you sure you want to delete ${selectedUser.firstName} ${selectedUser.lastName}? This action cannot be undone.`}
          confirmText="Delete User"
          cancelText="Cancel"
          isLoading={false}
        />
      )}

      {/* Reset Password Confirmation */}
      {selectedUser && (
        <ConfirmationDialog
          isOpen={showResetPasswordConfirm}
          onClose={() => {
            setShowResetPasswordConfirm(false);
            setSelectedUser(null);
          }}
          onConfirm={handleConfirmResetPassword}
          title="Reset Password"
          message={`Send a password reset email to ${selectedUser.email}?`}
          confirmText="Send Reset Email"
          cancelText="Cancel"
          isLoading={false}
        />
      )}
    </div>
  );
};

export default UserManagementPage;
