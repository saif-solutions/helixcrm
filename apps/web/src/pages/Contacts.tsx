import React, { useState, useEffect } from "react";
import axios from "axios";

const Contacts: React.FC = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const response = await axios.get("http://localhost:3000/contacts");
      setContacts(response.data);
    } catch (error) {
      console.error("Failed to fetch contacts:", error);
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
