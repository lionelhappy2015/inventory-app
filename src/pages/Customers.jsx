import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import CustomerDetails from "./CustomerDetails";

export default function Customers({ user }) {
  const [customers, setCustomers] = useState([]);
  const [selected, setSelected] = useState(null);

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
};