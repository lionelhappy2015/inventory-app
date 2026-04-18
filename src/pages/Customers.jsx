import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function Customers({ user }) {
  const [customers, setCustomers] = useState([]);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const [popup, setPopup] = useState("");

  useEffect(() => {
    fetchCustomers();
  }, []);

  // ======================
  // FETCH CUSTOMERS
  // ======================
  async function fetchCustomers() {
    const { data } = await supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false });

    setCustomers(data || []);
  }

  // ======================
  // ADD CUSTOMER
  // ======================
  async function addCustomer() {
    if (!name) {
      setPopup("Customer name required");
      return;
    }

    const { error } = await supabase.from("customers").insert([
      {
        user_id: user.id,
        name,
        phone,
        address,
      },
    ]);

    if (error) {
      setPopup(error.message);
      return;
    }

    setName("");
    setPhone("");
    setAddress("");

    setPopup("Customer added ✅");

    fetchCustomers();
  }

  return (
    <div>
      <h2>Customers</h2>

      {/* FORM */}
      <div style={styles.form}>
        <input
          placeholder="Customer Name"
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

        <button onClick={addCustomer}>Add</button>
      </div>

      {/* LIST */}
      <div style={styles.list}>
        {customers.length === 0 ? (
          <p>No customers yet</p>
        ) : (
          customers.map((c) => (
            <div key={c.id} style={styles.card}>
              <div>
                <strong>{c.name}</strong>
                <p>{c.phone || "No phone"}</p>
                <p style={styles.address}>
                  {c.address || "No address"}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* POPUP */}
      {popup && (
        <div style={styles.popup}>
          {popup}
          <button onClick={() => setPopup("")}>OK</button>
        </div>
      )}
    </div>
  );
}

const styles = {
  form: {
    display: "flex",
    gap: 10,
    marginBottom: 20,
    flexWrap: "wrap",
  },

  list: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },

  card: {
    background: "#fff",
    padding: 15,
    borderRadius: 8,
    boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
  },

  address: {
    fontSize: 13,
    color: "#555",
  },

  popup: {
    position: "fixed",
    top: 20,
    right: 20,
    background: "#1abc9c",
    color: "#fff",
    padding: 10,
    borderRadius: 6,
  },
};