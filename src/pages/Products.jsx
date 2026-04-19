import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function Products({ user }) {
  const [products, setProducts] = useState([]);
  const [stockMap, setStockMap] = useState({});

  const [showModal, setShowModal] = useState(false);

  // form state
  const [name, setName] = useState("");
  const [size, setSize] = useState("");

  useEffect(() => {
    fetchProducts();
    fetchStock();
  }, []);

  async function fetchProducts() {
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setProducts(data || []);
  }

  async function fetchStock() {
    const { data } = await supabase
      .from("product_batches")
      .select("product_id, remaining_qty")
      .eq("user_id", user.id);

    const map = {};
    data?.forEach((b) => {
      map[b.product_id] =
        (map[b.product_id] || 0) + b.remaining_qty;
    });

    setStockMap(map);
  }

  // ===== ADD PRODUCT =====
  async function addProduct() {
    if (!name || !size) {
      return alert("Enter name and size");
    }

    // 🚀 DUPLICATE CHECK
    const exists = products.find(
      (p) =>
        p.name.toLowerCase() === name.toLowerCase() &&
        p.size.toLowerCase() === size.toLowerCase()
    );

    if (exists) {
      return alert("Product already exists");
    }

    const { error } = await supabase.from("products").insert([
      {
        user_id: user.id,
        name,
        size,
      },
    ]);

    if (error) {
      alert("Error adding product");
      return;
    }

    // reset
    setName("");
    setSize("");
    setShowModal(false);

    fetchProducts();
  }

  return (
    <div style={{ padding: 20 }}>
      {/* HEADER */}
      <div style={styles.header}>
        <h2>Products</h2>
        <button style={styles.addBtn} onClick={() => setShowModal(true)}>
          + Add Product
        </button>
      </div>

      {/* LIST */}
      {products.map((p) => (
        <div key={p.id} style={styles.card}>
          <div>
            <strong>{p.name}</strong>
            <p>{p.size}</p>
          </div>

          <div>
            <strong>Stock: {stockMap[p.id] || 0}</strong>
          </div>
        </div>
      ))}

      {/* MODAL */}
      {showModal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3>Add Product</h3>

            <input
              placeholder="Product Name (e.g. Sprite)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={styles.input}
            />

            <input
              placeholder="Size (e.g. 200ml)"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              style={styles.input}
            />

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowModal(false)}>Cancel</button>

              <button style={styles.saveBtn} onClick={addProduct}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  header: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  addBtn: {
    background: "#000",
    color: "#fff",
    padding: "8px 12px",
    borderRadius: 6,
    cursor: "pointer",
  },

  card: {
    display: "flex",
    justifyContent: "space-between",
    padding: "12px",
    background: "#fff",
    marginBottom: "10px",
    borderRadius: "6px",
    border: "1px solid #eee",
  },

  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },

  modal: {
    background: "#fff",
    padding: 20,
    borderRadius: 10,
    width: 300,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },

  input: {
    padding: 10,
    borderRadius: 6,
    border: "1px solid #ccc",
  },

  saveBtn: {
    background: "green",
    color: "#fff",
    padding: "8px 12px",
    borderRadius: 6,
  },
};