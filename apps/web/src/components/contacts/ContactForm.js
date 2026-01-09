import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Contact Form Component
 * Handles creating and editing contacts with validation
 *
 * HELIX Requirements:
 * - Multi-tenant (organizationId auto-set)
 * - Validation with clear errors
 * - Loading/success/error states
 * - Audit logging ready
 */
import { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../ui/Card';
import { Loader2 } from 'lucide-react';
// Simple validation functions
const validateForm = (data) => {
    const errors = {};
    if (!data.firstName?.trim()) {
        errors.firstName = 'First name is required';
    }
    else if (data.firstName.length > 50) {
        errors.firstName = 'First name cannot exceed 50 characters';
    }
    if (!data.lastName?.trim()) {
        errors.lastName = 'Last name is required';
    }
    else if (data.lastName.length > 50) {
        errors.lastName = 'Last name cannot exceed 50 characters';
    }
    if (!data.email?.trim()) {
        errors.email = 'Email is required';
    }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        errors.email = 'Please enter a valid email address';
    }
    else if (data.email.length > 100) {
        errors.email = 'Email cannot exceed 100 characters';
    }
    if (data.phone && data.phone.length > 20) {
        errors.phone = 'Phone number cannot exceed 20 characters';
    }
    return {
        isValid: Object.keys(errors).length === 0,
        errors,
    };
};
export const ContactForm = ({ mode, contact, onSubmit, onCancel, isLoading = false, }) => {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
    });
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});
    // Initialize form with contact data if editing
    useEffect(() => {
        if (contact) {
            setFormData({
                firstName: contact.firstName || '',
                lastName: contact.lastName || '',
                email: contact.email || '',
                phone: contact.phone || '',
            });
        }
    }, [contact]);
    const handleChange = (field) => (e) => {
        setFormData((prev) => ({
            ...prev,
            [field]: e.target.value,
        }));
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors((prev) => ({
                ...prev,
                [field]: '',
            }));
        }
    };
    const handleBlur = (field) => () => {
        setTouched((prev) => ({
            ...prev,
            [field]: true,
        }));
        // Validate field on blur
        const validation = validateForm({ ...formData });
        if (validation.errors[field]) {
            setErrors((prev) => ({
                ...prev,
                [field]: validation.errors[field],
            }));
        }
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        const validation = validateForm(formData);
        setErrors(validation.errors);
        // Mark all fields as touched for error display
        const allTouched = Object.keys(formData).reduce((acc, key) => {
            acc[key] = true;
            return acc;
        }, {});
        setTouched(allTouched);
        if (!validation.isValid) {
            return;
        }
        // Clean up phone field if empty
        const submitData = {
            ...formData,
            phone: formData.phone?.trim() || undefined,
        };
        await onSubmit(submitData);
    };
    const getFieldError = (field) => {
        return touched[field] ? errors[field] : '';
    };
    return (_jsx("form", { onSubmit: handleSubmit, children: _jsxs(Card, { className: "border-0 shadow-none", children: [_jsx(CardHeader, { className: "px-0 pt-0", children: _jsx(CardTitle, { className: "text-lg font-semibold", children: mode === 'create' ? 'Add New Contact' : 'Edit Contact' }) }), _jsxs(CardContent, { className: "px-0 space-y-4", children: [_jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { htmlFor: "firstName", className: "block text-sm font-medium text-gray-700 mb-1", children: "First Name *" }), _jsx(Input, { id: "firstName", value: formData.firstName, onChange: handleChange('firstName'), onBlur: handleBlur('firstName'), placeholder: "John", className: getFieldError('firstName') ? 'border-red-500' : '', disabled: isLoading }), getFieldError('firstName') && (_jsx("p", { className: "mt-1 text-sm text-red-600", children: getFieldError('firstName') }))] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "lastName", className: "block text-sm font-medium text-gray-700 mb-1", children: "Last Name *" }), _jsx(Input, { id: "lastName", value: formData.lastName, onChange: handleChange('lastName'), onBlur: handleBlur('lastName'), placeholder: "Doe", className: getFieldError('lastName') ? 'border-red-500' : '', disabled: isLoading }), getFieldError('lastName') && (_jsx("p", { className: "mt-1 text-sm text-red-600", children: getFieldError('lastName') }))] })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "email", className: "block text-sm font-medium text-gray-700 mb-1", children: "Email Address *" }), _jsx(Input, { id: "email", type: "email", value: formData.email, onChange: handleChange('email'), onBlur: handleBlur('email'), placeholder: "john.doe@example.com", className: getFieldError('email') ? 'border-red-500' : '', disabled: isLoading }), getFieldError('email') && (_jsx("p", { className: "mt-1 text-sm text-red-600", children: getFieldError('email') }))] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "phone", className: "block text-sm font-medium text-gray-700 mb-1", children: "Phone Number (Optional)" }), _jsx(Input, { id: "phone", value: formData.phone || '', onChange: handleChange('phone'), onBlur: handleBlur('phone'), placeholder: "+1 (555) 123-4567", className: getFieldError('phone') ? 'border-red-500' : '', disabled: isLoading }), getFieldError('phone') && (_jsx("p", { className: "mt-1 text-sm text-red-600", children: getFieldError('phone') })), _jsx("p", { className: "mt-1 text-xs text-gray-500", children: "Include country code for international numbers" })] })] }), _jsxs(CardFooter, { className: "px-0 pb-0 flex justify-end space-x-2", children: [_jsx(Button, { type: "button", variant: "outline", onClick: onCancel, disabled: isLoading, children: "Cancel" }), _jsx(Button, { type: "submit", disabled: isLoading, children: isLoading ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }), mode === 'create' ? 'Creating...' : 'Saving...'] })) : (mode === 'create' ? 'Create Contact' : 'Save Changes') })] })] }) }));
};
