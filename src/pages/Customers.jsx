import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import CustomerDetails from "./CustomerDetails";

export default function Customers({ user }) {
  const [customers, setCustomers] = useState([]);
  const [selected, setSelected] = useState(null);

  // 🔥 NEW STATES
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    fetchCustomers();
  }, []);

  async function fetchCustomers() {
    const { data } = await supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false });

    setCustomers(data || []);
  }

  // 🔥 ADD CUSTOMER
  async function addCustomer() {
    if (!name || !phone) {
      alert("Name and phone required");
      return;
    }

    const { error } = await supabase.from("customers").insert([
      {
        name,
        phone,
        address,
        user_id: user.id,
      },
    ]);

    if (error) {
      alert("Error adding customer");
      console.error(error);
      return;
    }

    // reset
    setName("");
    setPhone("");
    setAddress("");
    setShowForm(false);

    fetchCustomers(); // refresh list
  }

  // 👉 OPEN DETAILS PAGE
  if (selected) {
    return (
      <CustomerDetails
        customer={selected}
        onBack={() => setSelected(null)}
      />
    );
  }

  return (
    <div>
      <h2>Customers</h2>

      {/* 🔥 ADD BUTTON */}
      <button style={styles.addBtn} onClick={() => setShowForm(!showForm)}>
        + Add Customer
      </button>

      {/* 🔥 FORM */}
      {showForm && (
        <div style={styles.form}>
          <input
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <input
            placeholder="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <input
            placeholder="Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />

          <button onClick={addCustomer}>Save</button>
        </div>
      )}

      {/* 🔥 CUSTOMER LIST */}
      {customers.map((c) => (
        <div
          key={c.id}
          style={styles.card}
          onClick={() => setSelected(c)}
        >
          <strong>{c.name}</strong>
          <p>{c.phone}</p>
          <p>{c.address}</p>
        </div>
      ))}
    </div>
  );
}

const styles = {
  card: {
    background: "#fff",
    padding: 12,
    marginBottom: 10,
    borderRadius: 8,
    cursor: "pointer",
  },

  addBtn: {
    marginBottom: 10,
    padding: "8px 12px",
    background: "#000",
    color: "#fff",
    borderRadius: 6,
    cursor: "pointer",
  },

  form: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginBottom: 15,
    background: "#fff",
    padding: 12,
    borderRadius: 8,
  },
};