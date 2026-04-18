import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function SelectCustomer({ onSelect }) {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");

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

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const display = search ? filtered : customers.slice(0, 7);

  return (
    <div style={styles.page}>
      <h2>Select Customer</h2>

      <input
        placeholder="Search..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={styles.input}
      />

      {display.map((c) => (
        <div
          key={c.id}
          style={styles.card}
          onClick={() => onSelect(c)}
        >
          <strong>{c.name}</strong>
          <p>{c.phone}</p>
        </div>
      ))}
    </div>
  );
}

const styles = {
  page: { padding: 20 },
  input: { width: "100%", padding: 10, marginBottom: 15 },
  card: {
    padding: 12,
    background: "#fff",
    marginBottom: 10,
    borderRadius: 8,
    cursor: "pointer",
  },
};