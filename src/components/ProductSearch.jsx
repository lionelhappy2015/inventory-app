import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function ProductSearch({ onAdd }) {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    const { data } = await supabase.from("products").select("*");
    setProducts(data || []);
  }

  const filtered = products.filter((p) =>
    `${p.name} ${p.size}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <input
        placeholder="Search product..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={styles.search}
      />

      <div style={styles.list}>
        {filtered.map((p) => (
          <div
            key={p.id}
            style={styles.card}
            onClick={() => onAdd(p)}
          >
            <strong>{p.name}</strong>
            <p style={styles.sub}>{p.size}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  search: {
    width: "100%",
    padding: 10,
    borderRadius: 8,
    border: "1px solid #ccc",
    marginBottom: 10,
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    maxHeight: 250,
    overflowY: "auto",
  },
  card: {
    padding: 10,
    borderRadius: 8,
    background: "#fff",
    cursor: "pointer",
    boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
  },
  sub: {
    margin: 0,
    fontSize: 12,
    color: "#777",
  },
};