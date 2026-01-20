// VERSION: 2.0.0 - PHASE 2A COMPLIANT - 2026-01-20
/**
 * Contacts List Page - ENTERPRISE-GRADE WITH PHASE 2A FIXES
 * 
 * HELIX CRM - Multi-tenant Contacts Management
 * 
 * Phase 2A Fixes Applied:
 * ✅ Uses ConfirmationDialog (not ConfirmationModal)
 * ✅ Button variant="danger" (not "destructive")
 * ✅ Proper Modal component imports
 * ✅ Loading states with aria-busy
 * ✅ Accessible error handling
 * ✅ TypeScript strict compliance
 */
import React, { useState, useEffect, ChangeEvent, useCallback } from 'react';
import { useToast } from '../components/feedback/ToastProvider';
import { Card } from '../components/molecules/Card';
import { Button } from '../components/atoms/Button';
import { Input } from '../components/atoms/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/atoms/Table';
import { Modal } from '../components/feedback/Modal';
import { ConfirmationDialog } from '../components/feedback/ConfirmationDialog';
import { ContactForm } from '../components/contacts/ContactForm';
import { LoadingSpinner } from '../components/feedback/LoadingSpinner';
import { EmptyState } from '../components/feedback/EmptyState';
import { Plus, Search, Loader2 } from 'lucide-react';
import { contactsService } from '../services/contacts.service';
import { Contact as ApiContact } from '../lib/types/api.types';

// Use the imported Contact type from api.types
type Contact = ApiContact;

type FormMode = 'create' | 'edit';

export const ContactsPage: React.FC = () => {
  const { success, error: showError, info } = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 20;

  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch contacts from REAL API
  const fetchContacts = useCallback(async () => {
    console.log('📋 fetchContacts called');
    
    console.log('🚀 Starting fetch from REAL API...');
    setLoading(true);
    
    try {
      console.log('📞 Fetching contacts via service');
      const contactsData = await contactsService.getAll();
      console.log('✅ Contacts loaded from API:', contactsData.length);
      
      setContacts(contactsData);
      setFilteredContacts(contactsData);
      
      if (contactsData.length === 0) {
        info('No contacts found', 'Create your first contact to get started');
      }

    } catch (err) {
      console.error('❌ Error in fetchContacts:', err);
      showError(
        'Failed to load contacts', 
        err instanceof Error ? err.message : 'Please check your connection and try again'
      );
    } finally {
      console.log('✅ Setting loading to false');
      setLoading(false);
    }
  }, [showError, info]);

  // Initial fetch - Only fetch once on mount
  useEffect(() => {
    console.log('🔍 Initial fetch on mount');
    fetchContacts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter contacts based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredContacts(contacts);
    } else {
      const filtered = contacts.filter(contact =>
        `${contact.firstName} ${contact.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (contact.email && contact.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (contact.phone && contact.phone.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredContacts(filtered);
    }
    
    // Reset to page 1 when search changes
    setCurrentPage(1);
  }, [contacts, searchTerm]);

  // Calculate pagination
  useEffect(() => {
    const totalFiltered = filteredContacts.length;
    setTotalPages(Math.ceil(totalFiltered / itemsPerPage));
  }, [filteredContacts]);

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

    setIsDeleting(true);
    console.log('🗑️ Deleting contact:', contactToDelete.id);

    try {
      await contactsService.delete(contactToDelete.id);
      
      // Remove contact from state
      setContacts(prev => prev.filter(contact => contact.id !== contactToDelete.id));
      setFilteredContacts(prev => prev.filter(contact => contact.id !== contactToDelete.id));
      
      success(
        'Contact deleted', 
        `${contactToDelete.firstName} ${contactToDelete.lastName} has been removed from your contacts`
      );
      
      // Close dialog and reset
      setIsDeleteDialogOpen(false);
      setContactToDelete(null);
      
    } catch (err) {
      console.error('Delete error:', err);
      showError(
        'Failed to delete contact', 
        err instanceof Error ? err.message : 'Please try again'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setIsDeleteDialogOpen(false);
    setContactToDelete(null);
  };

  const handleFormSubmit = async (formData: any) => {
    setIsSubmitting(true);
    console.log('📝 Form submission:', formData);

    try {
      if (formMode === 'create') {
        // Create new contact via API
        const newContact = await contactsService.create(formData);
        console.log('✅ Contact created:', newContact);
        
        // Add to state
        setContacts(prev => [newContact, ...prev]);
        setFilteredContacts(prev => [newContact, ...prev]);
        
        success('Contact created', `${formData.firstName} ${formData.lastName} has been added to your contacts`);
      } else {
        // Update existing contact via API
        if (!editingContact) return;

        const updatedContact = await contactsService.update(editingContact.id, formData);
        console.log('✅ Contact updated:', updatedContact);
        
        // Update in state
        setContacts(prev => 
          prev.map(contact => 
            contact.id === editingContact.id ? updatedContact : contact
          )
        );
        setFilteredContacts(prev =>
          prev.map(contact =>
            contact.id === editingContact.id ? updatedContact : contact
          )
        );
        
        success('Contact updated', `${formData.firstName} ${formData.lastName} has been updated`);
      }

      setIsFormOpen(false);
    } catch (err) {
      console.error('Form submission error:', err);
      showError(
        formMode === 'create' ? 'Failed to create contact' : 'Failed to update contact',
        err instanceof Error ? err.message : 'Please try again'
      );
    } finally {
      setIsSubmitting(false);
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

  console.log('🔄 ContactsPage render, loading:', loading, 'contacts:', contacts.length, 'filtered:', filteredContacts.length);

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
          contact={editingContact ? {
            ...editingContact,
            email: editingContact.email || '', // Convert undefined to empty string
          } : undefined}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
          isLoading={isSubmitting}
        />
      </Modal>

      {/* Delete Confirmation Dialog - PHASE 2A FIXED */}
      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Contact"
        message={`Are you sure you want to delete "${contactToDelete?.firstName} ${contactToDelete?.lastName}"? This action cannot be undone.`}
        confirmText={isDeleting ? "Deleting..." : "Delete Contact"}
        cancelText="Cancel"
        isLoading={isDeleting}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="text-gray-600">
            {filteredContacts.length} contact{filteredContacts.length !== 1 ? 's' : ''} found
            {searchTerm && ` for "${searchTerm}"`}
          </p>
        </div>
        <Button 
          onClick={handleCreateContact}
          leftIcon={<Plus className="h-4 w-4" />}
          variant="primary"
          aria-label="Add new contact"
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
            title={searchTerm ? "No matching contacts" : "No contacts yet"}
            message={searchTerm ? "Try adjusting your search terms" : "Get started by adding your first contact"}
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
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getCurrentPageContacts().map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell className="font-medium">
                        {contact.firstName} {contact.lastName}
                      </TableCell>
                      <TableCell>{contact.email || '—'}</TableCell>
                      <TableCell>{contact.phone || '—'}</TableCell>
                      <TableCell>{formatDate(contact.createdAt)}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleEditContact(contact)}
                          aria-label={`Edit ${contact.firstName} ${contact.lastName}`}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDeleteClick(contact)}
                          aria-label={`Delete ${contact.firstName} ${contact.lastName}`}
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
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredContacts.length)} of {filteredContacts.length} contacts
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
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
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
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