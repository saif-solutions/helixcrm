import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// VERSION: 1.0.0 - FIXED HOOK ERROR - 20260108142355
/**
 * Contacts List Page - CLEAN VERSION
 *
 * HELIX CRM - Multi-tenant Contacts Management
 */
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/feedback/ToastProvider';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import { ContactForm } from '../components/contacts/ContactForm';
import { LoadingSpinner } from '../components/feedback/LoadingSpinner';
import { EmptyState } from '../components/feedback/EmptyState';
import { Plus, Search, Loader2 } from 'lucide-react';
import { contactsService } from '../services/contacts.service';
export const ContactsPage = () => {
    const { user, token } = useAuth();
    const { success, error: showError, info } = useToast();
    const [contacts, setContacts] = useState([]);
    const [filteredContacts, setFilteredContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const itemsPerPage = 20;
    // Form state
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [formMode, setFormMode] = useState('create');
    const [editingContact, setEditingContact] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    // Delete state
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [contactToDelete, setContactToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    // Get auth token for API calls
    const getAuthToken = useCallback(() => {
        return token || localStorage.getItem('helix_token') || sessionStorage.getItem('helix_token');
    }, [token]);
    // Fetch contacts from REAL API
    const fetchContacts = useCallback(async () => {
        console.log('��� fetchContacts called');
        const authToken = getAuthToken();
        if (!authToken || !user) {
            console.log('❌ No token/user, showing error');
            showError('Authentication required', 'Please log in to view contacts');
            return;
        }
        console.log('✅ Starting fetch from REAL API...');
        setLoading(true);
        try {
            console.log('��� Fetching contacts with auth token');
            const contactsData = await contactsService.getAll();
            console.log('✅ Contacts loaded from API:', contactsData.length);
            setContacts(contactsData);
            setFilteredContacts(contactsData);
            if (contactsData.length === 0) {
                info('No contacts found', 'Create your first contact to get started');
            }
        }
        catch (err) {
            console.error('❌ Error in fetchContacts:', err);
            showError('Failed to load contacts', err instanceof Error ? err.message : 'Please check your connection and try again');
        }
        finally {
            console.log('✅ Setting loading to false');
            setLoading(false);
        }
    }, [getAuthToken, user, showError, info]);
    // Initial fetch - Only fetch once on mount
    useEffect(() => {
        console.log('��� Initial fetch on mount');
        fetchContacts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    // Filter contacts based on search term
    useEffect(() => {
        if (!searchTerm.trim()) {
            setFilteredContacts(contacts);
        }
        else {
            const filtered = contacts.filter(contact => `${contact.firstName} ${contact.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (contact.phone && contact.phone.toLowerCase().includes(searchTerm.toLowerCase())));
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
    const handleEditContact = (contact) => {
        setFormMode('edit');
        setEditingContact(contact);
        setIsFormOpen(true);
    };
    const handleDeleteClick = (contact) => {
        setContactToDelete(contact);
        setIsDeleteModalOpen(true);
    };
    const handleDeleteConfirm = async () => {
        if (!contactToDelete)
            return;
        setIsDeleting(true);
        console.log('���️ Deleting contact:', contactToDelete.id);
        try {
            await contactsService.delete(contactToDelete.id);
            // Remove contact from state
            setContacts(prev => prev.filter(contact => contact.id !== contactToDelete.id));
            setFilteredContacts(prev => prev.filter(contact => contact.id !== contactToDelete.id));
            success('Contact deleted', `${contactToDelete.firstName} ${contactToDelete.lastName} has been removed from your contacts`);
            // Close modal and reset
            setIsDeleteModalOpen(false);
            setContactToDelete(null);
        }
        catch (err) {
            console.error('Delete error:', err);
            showError('Failed to delete contact', err instanceof Error ? err.message : 'Please try again');
        }
        finally {
            setIsDeleting(false);
        }
    };
    const handleDeleteCancel = () => {
        setIsDeleteModalOpen(false);
        setContactToDelete(null);
    };
    const handleFormSubmit = async (formData) => {
        setIsSubmitting(true);
        console.log('��� Form submission:', formData);
        try {
            if (formMode === 'create') {
                // Create new contact via API
                const newContact = await contactsService.create(formData);
                console.log('✅ Contact created:', newContact);
                // Add to state
                setContacts(prev => [newContact, ...prev]);
                setFilteredContacts(prev => [newContact, ...prev]);
                success('Contact created', `${formData.firstName} ${formData.lastName} has been added to your contacts`);
            }
            else {
                // Update existing contact via API
                if (!editingContact)
                    return;
                const updatedContact = await contactsService.update(editingContact.id, formData);
                console.log('✅ Contact updated:', updatedContact);
                // Update in state
                setContacts(prev => prev.map(contact => contact.id === editingContact.id ? updatedContact : contact));
                setFilteredContacts(prev => prev.map(contact => contact.id === editingContact.id ? updatedContact : contact));
                success('Contact updated', `${formData.firstName} ${formData.lastName} has been updated`);
            }
            setIsFormOpen(false);
        }
        catch (err) {
            console.error('Form submission error:', err);
            showError(formMode === 'create' ? 'Failed to create contact' : 'Failed to update contact', err instanceof Error ? err.message : 'Please try again');
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const handleFormCancel = () => {
        setIsFormOpen(false);
        setEditingContact(null);
    };
    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };
    console.log('��� ContactsPage render, loading:', loading, 'contacts:', contacts.length, 'filtered:', filteredContacts.length);
    if (loading && contacts.length === 0) {
        console.log('⏳ Rendering loading state');
        return (_jsxs("div", { className: "container mx-auto px-4 py-8", children: [_jsxs("div", { className: "flex items-center justify-between mb-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "Contacts" }), _jsx("p", { className: "text-gray-600", children: "Manage your organization's contacts" })] }), _jsxs(Button, { disabled: true, children: [_jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }), "Loading..."] })] }), _jsx(Card, { className: "p-8", children: _jsxs("div", { className: "flex flex-col items-center justify-center space-y-4", children: [_jsx(LoadingSpinner, { size: "lg" }), _jsx("p", { className: "text-gray-600", children: "Loading contacts..." })] }) })] }));
    }
    console.log('��� Rendering contacts table with', filteredContacts.length, 'contacts');
    return (_jsxs("div", { className: "container mx-auto px-4 py-8", children: [_jsx(Modal, { isOpen: isFormOpen, onClose: handleFormCancel, size: "lg", children: _jsx(ContactForm, { mode: formMode, contact: editingContact || undefined, onSubmit: handleFormSubmit, onCancel: handleFormCancel, isLoading: isSubmitting }) }), _jsx(ConfirmationModal, { isOpen: isDeleteModalOpen, onClose: handleDeleteCancel, onConfirm: handleDeleteConfirm, title: "Delete Contact", description: `Are you sure you want to delete "${contactToDelete?.firstName} ${contactToDelete?.lastName}"? This action cannot be undone.`, confirmText: isDeleting ? "Deleting..." : "Delete Contact", cancelText: "Cancel", variant: "destructive", isLoading: isDeleting }), _jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "Contacts" }), _jsxs("p", { className: "text-gray-600", children: [filteredContacts.length, " contact", filteredContacts.length !== 1 ? 's' : '', " found", searchTerm && ` for "${searchTerm}"`] })] }), _jsxs(Button, { onClick: handleCreateContact, children: [_jsx(Plus, { className: "mr-2 h-4 w-4" }), "Add Contact"] })] }), _jsx(Card, { className: "mb-6", children: _jsx("div", { className: "p-4", children: _jsxs("div", { className: "relative", children: [_jsx(Search, { className: "absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" }), _jsx(Input, { type: "search", placeholder: "Search contacts by name, email, or phone...", className: "pl-10", value: searchTerm, onChange: handleSearchChange })] }) }) }), _jsx(Card, { children: filteredContacts.length === 0 ? (_jsx(EmptyState, { title: searchTerm ? "No matching contacts" : "No contacts yet", message: searchTerm ? "Try adjusting your search terms" : "Get started by adding your first contact", actionLabel: "Add Contact", onAction: handleCreateContact })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "overflow-x-auto", children: _jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { children: [_jsx(TableHead, { children: "Name" }), _jsx(TableHead, { children: "Email" }), _jsx(TableHead, { children: "Phone" }), _jsx(TableHead, { children: "Created" }), _jsx(TableHead, { className: "text-right", children: "Actions" })] }) }), _jsx(TableBody, { children: getCurrentPageContacts().map((contact) => (_jsxs(TableRow, { children: [_jsxs(TableCell, { className: "font-medium", children: [contact.firstName, " ", contact.lastName] }), _jsx(TableCell, { children: contact.email }), _jsx(TableCell, { children: contact.phone || '—' }), _jsx(TableCell, { children: formatDate(contact.createdAt) }), _jsxs(TableCell, { className: "text-right space-x-2", children: [_jsx(Button, { variant: "outline", size: "sm", onClick: () => handleEditContact(contact), children: "Edit" }), _jsx(Button, { variant: "destructive", size: "sm", onClick: () => handleDeleteClick(contact), children: "Delete" })] })] }, contact.id))) })] }) }), totalPages > 1 && (_jsxs("div", { className: "flex items-center justify-between p-4 border-t", children: [_jsxs("div", { className: "text-sm text-gray-700", children: ["Showing ", (currentPage - 1) * itemsPerPage + 1, " to ", Math.min(currentPage * itemsPerPage, filteredContacts.length), " of ", filteredContacts.length, " contacts"] }), _jsxs("div", { className: "flex space-x-2", children: [_jsx(Button, { variant: "outline", size: "sm", onClick: () => setCurrentPage(p => Math.max(1, p - 1)), disabled: currentPage === 1, children: "Previous" }), _jsxs("div", { className: "flex items-center px-3 text-sm text-gray-600", children: ["Page ", currentPage, " of ", totalPages] }), _jsx(Button, { variant: "outline", size: "sm", onClick: () => setCurrentPage(p => Math.min(totalPages, p + 1)), disabled: currentPage === totalPages, children: "Next" })] })] }))] })) })] }));
};
