// VERSION: 3.5.0 - PHASE 3.5 COMPLIANT - 2026-01-25
/**
 * Contacts List Page - ENTERPRISE-GRADE WITH PHASE 3.5 API INTEGRATION
 *
 * HELIX CRM - Multi-tenant Contacts Management
 *
 * Phase 3.5 Updates:
 * ✅ Uses ContactsAPI from Phase 3.4 backend
 * ✅ Proper TypeScript types from crm.types.ts
 * ✅ Enhanced error handling with Phase 3.4 API errors
 * ✅ React Query integration for mutations
 */
import React, { useState, useEffect, ChangeEvent, useCallback } from 'react';
import { useToast } from '../components/feedback/ToastProvider';
import { useApiMutation } from '../providers/QueryProvider';
import { Card } from '../components/molecules/Card';
import { Button } from '../components/atoms/Button';
import { Input } from '../components/atoms/Input';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../components/atoms/Table';
import { Modal } from '../components/feedback/Modal';
import { ConfirmationDialog } from '../components/feedback/ConfirmationDialog';
import { ContactForm } from '../components/contacts/ContactForm';
import { LoadingSpinner } from '../components/feedback/LoadingSpinner';
import { EmptyState } from '../components/feedback/EmptyState';
import { Plus, Search, Loader2 } from 'lucide-react';
import { ContactsAPI } from '../services/api';
import type { Contact, CreateContactDto, UpdateContactDto } from '../lib/types/crm.types';

type FormMode = 'create' | 'edit';

export const ContactsPage: React.FC = () => {
  const { success, error: showError, info } = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalContacts, setTotalContacts] = useState(0);
  const itemsPerPage = 20;

  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  // Delete state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);

  // Phase 3.4: Create contact mutation
  const createContactMutation = useApiMutation(
    (data: CreateContactDto) => ContactsAPI.create(data),
    {
      onSuccess: (newContact) => {
        success(
          'Contact Created',
          `${newContact.firstName} ${newContact.lastName} has been added to your contacts`
        );
        setIsFormOpen(false);
        fetchContacts(); // Refresh the list
      },
      onError: (error: any) => {
        showError('Create Failed', error.message || 'Failed to create contact');
      },
    }
  );

  // Phase 3.4: Update contact mutation
  const updateContactMutation = useApiMutation(
    ({ id, data }: { id: string; data: UpdateContactDto }) => ContactsAPI.update(id, data),
    {
      onSuccess: (updatedContact) => {
        success(
          'Contact Updated',
          `${updatedContact.firstName} ${updatedContact.lastName} has been updated`
        );
        setIsFormOpen(false);
        setEditingContact(null);
        fetchContacts(); // Refresh the list
      },
      onError: (error: any) => {
        showError('Update Failed', error.message || 'Failed to update contact');
      },
    }
  );

  // Phase 3.4: Delete contact mutation
  const deleteContactMutation = useApiMutation((id: string) => ContactsAPI.delete(id), {
    onSuccess: () => {
      if (contactToDelete) {
        success(
          'Contact Deleted',
          `${contactToDelete.firstName} ${contactToDelete.lastName} has been removed from your contacts`
        );
      }
      setIsDeleteDialogOpen(false);
      setContactToDelete(null);
      fetchContacts(); // Refresh the list
    },
    onError: (error: any) => {
      showError('Delete Failed', error.message || 'Failed to delete contact');
    },
  });

  // Fetch contacts from Phase 3.4 API
  const fetchContacts = useCallback(async () => {
    console.log('📋 fetchContacts called for Phase 3.4 API');

    setLoading(true);

    try {
      const skip = (currentPage - 1) * itemsPerPage;
      console.log('📞 Fetching contacts via Phase 3.4 API, skip:', skip, 'take:', itemsPerPage);

      const response = await ContactsAPI.list(skip, itemsPerPage);
      console.log('✅ Contacts loaded from Phase 3.4 API:', response.data.length);

      setContacts(response.data);
      setFilteredContacts(response.data);
      setTotalContacts(response.meta.total);
      setTotalPages(response.meta.totalPages);

      if (response.data.length === 0) {
        info('No contacts found', 'Create your first contact to get started');
      }
    } catch (err: any) {
      console.error('❌ Error in fetchContacts:', err);
      showError(
        'Failed to load contacts',
        err?.message || 'Please check your connection and try again'
      );
    } finally {
      console.log('✅ Setting loading to false');
      setLoading(false);
    }
  }, [currentPage, showError, info]);

  // Initial fetch and on page change
  useEffect(() => {
    console.log('🔍 Fetching contacts for page:', currentPage);
    fetchContacts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  // Filter contacts based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredContacts(contacts);
      setTotalPages(Math.ceil(contacts.length / itemsPerPage));
    } else {
      const filtered = contacts.filter(
        (contact) =>
          `${contact.firstName} ${contact.lastName}`
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          (contact.email && contact.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (contact.phone && contact.phone.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredContacts(filtered);
      setTotalPages(Math.ceil(filtered.length / itemsPerPage));
    }

    // Reset to page 1 when search changes
    setCurrentPage(1);
  }, [contacts, searchTerm]);

  // Get current page contacts
  const getCurrentPageContacts = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredContacts.slice(startIndex, endIndex);
  };

  // Form Handlers
  const handleCreateContact = () => {
    setFormMode('create');
    setEditingContact(null);
    setIsFormOpen(true);
  };

  const handleEditContact = (contact: Contact) => {
    setFormMode('edit');
    setEditingContact(contact);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (contact: Contact) => {
    setContactToDelete(contact);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!contactToDelete) return;

    deleteContactMutation.mutate(contactToDelete.id);
  };

  const handleDeleteCancel = () => {
    setIsDeleteDialogOpen(false);
    setContactToDelete(null);
  };

  const handleFormSubmit = async (formData: CreateContactDto | UpdateContactDto) => {
    if (formMode === 'create') {
      createContactMutation.mutate(formData as CreateContactDto);
    } else {
      if (!editingContact) return;
      updateContactMutation.mutate({ id: editingContact.id, data: formData as UpdateContactDto });
    }
  };

  const handleFormCancel = () => {
    setIsFormOpen(false);
    setEditingContact(null);
  };

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  console.log(
    '🔄 ContactsPage render, loading:',
    loading,
    'contacts:',
    contacts.length,
    'filtered:',
    filteredContacts.length
  );

  if (loading && contacts.length === 0) {
    console.log('⏳ Rendering loading state');
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
            <p className="text-gray-600">Manage your organization's contacts</p>
          </div>
          <Button disabled aria-busy="true">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading...
          </Button>
        </div>
        <Card className="p-8">
          <div className="flex flex-col items-center justify-center space-y-4">
            <LoadingSpinner size="lg" />
            <p className="text-gray-600">Loading contacts...</p>
          </div>
        </Card>
      </div>
    );
  }

  console.log('📊 Rendering contacts table with', filteredContacts.length, 'contacts');
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Contact Form Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={handleFormCancel}
        size="lg"
        title={formMode === 'create' ? 'Add New Contact' : 'Edit Contact'}
      >
        <ContactForm
          mode={formMode}
          contact={
            editingContact
              ? {
                  ...editingContact,
                  email: editingContact.email || '', // Convert undefined to empty string
                }
              : undefined
          }
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
          isLoading={
            formMode === 'create'
              ? createContactMutation.isPending
              : updateContactMutation.isPending
          }
        />
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Contact"
        message={`Are you sure you want to delete "${contactToDelete?.firstName} ${contactToDelete?.lastName}"? This action cannot be undone.`}
        confirmText={deleteContactMutation.isPending ? 'Deleting...' : 'Delete Contact'}
        cancelText="Cancel"
        isLoading={deleteContactMutation.isPending}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="text-gray-600">
            {totalContacts} contact{totalContacts !== 1 ? 's' : ''} total
            {searchTerm ? `, ${filteredContacts.length} found for "${searchTerm}"` : ''}
          </p>
        </div>
        <Button
          onClick={handleCreateContact}
          leftIcon={<Plus className="h-4 w-4" />}
          variant="primary"
          aria-label="Add new contact"
          loading={createContactMutation.isPending}
        >
          Add Contact
        </Button>
      </div>

      {/* Search Bar */}
      <Card className="mb-6">
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              type="search"
              placeholder="Search contacts by name, email, or phone..."
              className="pl-10"
              value={searchTerm}
              onChange={handleSearchChange}
              aria-label="Search contacts"
            />
          </div>
        </div>
      </Card>

      {/* Contacts Table */}
      <Card>
        {filteredContacts.length === 0 ? (
          <EmptyState
            title={searchTerm ? 'No matching contacts' : 'No contacts yet'}
            message={
              searchTerm
                ? 'Try adjusting your search terms'
                : 'Get started by adding your first contact'
            }
            actionLabel="Add Contact"
            onAction={handleCreateContact}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getCurrentPageContacts().map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell className="font-medium">
                        {contact.firstName} {contact.lastName}
                        {contact.title && (
                          <div className="text-xs text-gray-500">{contact.title}</div>
                        )}
                      </TableCell>
                      <TableCell>{contact.email || '—'}</TableCell>
                      <TableCell>{contact.phone || '—'}</TableCell>
                      <TableCell>{contact.company || '—'}</TableCell>
                      <TableCell>{formatDate(contact.createdAt)}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleEditContact(contact)}
                          aria-label={`Edit ${contact.firstName} ${contact.lastName}`}
                          loading={
                            updateContactMutation.isPending && editingContact?.id === contact.id
                          }
                        >
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDeleteClick(contact)}
                          aria-label={`Delete ${contact.firstName} ${contact.lastName}`}
                          loading={
                            deleteContactMutation.isPending && contactToDelete?.id === contact.id
                          }
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t">
                <div className="text-sm text-gray-700">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                  {Math.min(currentPage * itemsPerPage, filteredContacts.length)} of{' '}
                  {filteredContacts.length} contacts
                  {totalContacts > filteredContacts.length && ` (${totalContacts} total)`}
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    aria-label="Previous page"
                  >
                    Previous
                  </Button>
                  <div className="flex items-center px-3 text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    aria-label="Next page"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
};
