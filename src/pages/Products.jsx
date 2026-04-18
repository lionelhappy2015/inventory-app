import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function Products({ user }) {
  const [products, setProducts] = useState([]);
  const [name, setName] = useState("");
  const [size, setSize] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    setLoading(true);

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error) setProducts(data || []);

    setLoading(false);
  }

  async function addProduct() {
    if (!name || !size) {
      alert("Enter name and size");
      return;
    }

    const { error } = await supabase.from("products").insert([
      {
        name,
        size,
        user_id: user.id,
      },
    ]);

    if (error) {
      alert(error.message);
    } else {
      setName("");
      setSize("");
      fetchProducts();
    }
  }

  async function deleteProduct(id) {
    const ok = window.confirm("Delete this product?");
    if (!ok) return;

    await supabase.from("products").delete().eq("id", id);
    fetchProducts();
  }

  return (
    <div>
      <h2>Products</h2>

      {/* ADD FORM */}
      <div style={styles.form}>
        <input
          style={styles.input}
          placeholder="Product Name (Sprite)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          style={styles.input}
          placeholder="Size (200ml)"
          value={size}
          onChange={(e) => setSize(e.target.value)}
        />

        <button style={styles.addBtn} onClick={addProduct}>
          Add Product
        </button>
      </div>

      {/* LIST */}
      {loading ? (
        <p>Loading...</p>
      ) : products.length === 0 ? (
        <p>No products yet</p>
      ) : (
        <div style={styles.list}>
          {products.map((p) => (
            <div key={p.id} style={styles.card}>
              <div>
                <strong>{p.name}</strong>
                <p>{p.size}</p>
              </div>

              <button
                style={styles.deleteBtn}
                onClick={() => deleteProduct(p.id)}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  form: {
    display: "flex",
    gap: "10px",
    marginBottom: "20px",
    flexWrap: "wrap",
  },
  input: {
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #ccc",
  },
  addBtn: {
    padding: "10px 15px",
    background: "#2ecc71",
    border: "none",
    color: "#fff",
    borderRadius: "6px",
    cursor: "pointer",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  card: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "15px",
    background: "#fff",
    borderRadius: "8px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  },
  deleteBtn: {
    background: "#e74c3c",
    border: "none",
    color: "#fff",
    padding: "8px 12px",
    borderRadius: "6px",
    cursor: "pointer",
  },
};