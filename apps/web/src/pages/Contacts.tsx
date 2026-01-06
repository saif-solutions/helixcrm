import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Contacts: React.FC = () => {
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
    } catch (error: any) {
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
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Contacts</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {contacts.map((contact: any) => (
          <div key={contact.id} className="border p-4 rounded shadow">
            <h2 className="font-bold">{contact.firstName} {contact.lastName}</h2>
            <p>{contact.email}</p>
            <p>{contact.phone}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Contacts;
