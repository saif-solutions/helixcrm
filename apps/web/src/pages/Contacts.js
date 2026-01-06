import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
const Contacts = () => {
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    useEffect(() => {
        fetchContacts();
    }, []);
    const fetchContacts = async () => {
        try {
            const response = await axios.get("http://localhost:3000/contacts");
            setContacts(response.data);
        }
        catch (error) {
            console.error("Failed to fetch contacts:", error);
            // Handle 401 Unauthorized
            if (error.response?.status === 401) {
                console.log("Session expired, redirecting to login");
                // Clear local storage
                localStorage.removeItem("helixcrm_token");
                localStorage.removeItem("helixcrm_user");
                // Redirect to login
                navigate("/login");
                return;
            }
            // For other errors, show a message but stay on page
            alert("Failed to load contacts. Please try again.");
        }
        finally {
            setLoading(false);
        }
    };
    if (loading)
        return _jsx("div", { children: "Loading..." });
    return (_jsxs("div", { className: "container mx-auto p-4", children: [_jsx("h1", { className: "text-2xl font-bold mb-4", children: "Contacts" }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", children: contacts.map((contact) => (_jsxs("div", { className: "border p-4 rounded shadow", children: [_jsxs("h2", { className: "font-bold", children: [contact.firstName, " ", contact.lastName] }), _jsx("p", { children: contact.email }), _jsx("p", { children: contact.phone })] }, contact.id))) })] }));
};
export default Contacts;
