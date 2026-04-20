import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import * as XLSX from "xlsx";

export default function Products({ user }) {
  const [products, setProducts] = useState([]);
  const [stockMap, setStockMap] = useState({});
  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);

  const [name, setName] = useState("");
  const [size, setSize] = useState("");
  const [pieces, setPieces] = useState(1);

  useEffect(() => {
    fetchProducts();
    fetchStock();
  }, []);

  async function fetchProducts() {
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("user_id", user.id);

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

  // 🔥 SIZE PARSER (IMPORTANT)
  function parseSize(size) {
    if (!size) return 0;

    const lower = size.toLowerCase();

    if (lower.includes("ml")) {
      return parseFloat(lower);
    }

    if (lower.includes("l")) {
      return parseFloat(lower) * 1000;
    }

    return parseFloat(lower) || 0;
  }

  // 🔥 SORT + SEARCH
  const filteredProducts = products
    .filter((p) =>
      `${p.name} ${p.size}`
        .toLowerCase()
        .includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const sizeA = parseSize(a.size);
      const sizeB = parseSize(b.size);

      if (sizeA !== sizeB) return sizeA - sizeB;

      return a.name.localeCompare(b.name);
    });

  // ===== ADD PRODUCT =====
  async function addProduct() {
    if (!name || !size) {
      return alert("Enter name and size");
    }

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
        pieces_per_unit: pieces,
      },
    ]);

    if (error) {
      alert("Error adding product");
      return;
    }

    setName("");
    setSize("");
    setPieces(1);
    setShowModal(false);

    fetchProducts();
  }

  // 🔥 EXPORT
  function exportProducts() {
    const data = filteredProducts.map((p) => ({
      Product: p.name,
      Size: p.size,
      Pieces: p.pieces_per_unit,
      Stock: stockMap[p.id] || 0,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Products");

    XLSX.writeFile(wb, "products.xlsx");
  }

  return (
    <div style={{ padding: 20 }}>
      {/* HEADER */}
      <div style={styles.header}>
        <h2>Products</h2>

        <div style={{ display: "flex", gap: 10 }}>
          <button style={styles.addBtn} onClick={() => setShowModal(true)}>
            + Add Product
          </button>

          <button style={styles.addBtn} onClick={exportProducts}>
            Export
          </button>
        </div>
      </div>

      {/* SEARCH */}
      <input
        placeholder="Search product..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={styles.input}
      />

      {/* LIST */}
      {filteredProducts.map((p) => (
        <div key={p.id} style={styles.card}>
          <div>
            <strong>{p.name}</strong>
            <p>{p.size}</p>
            <p>Pieces: {p.pieces_per_unit}</p>
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
              placeholder="Product Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={styles.input}
            />

            <input
              placeholder="Size (200ml / 1L)"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              style={styles.input}
            />

            <input
              type="number"
              placeholder="Pieces per unit"
              value={pieces}
              onChange={(e) => setPieces(e.target.value)}
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
  },
  card: {
    display: "flex",
    justifyContent: "space-between",
    padding: 12,
    background: "#fff",
    marginBottom: 10,
    borderRadius: 6,
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
    marginBottom: 10,
  },
  saveBtn: {
    background: "green",
    color: "#fff",
    padding: "8px 12px",
    borderRadius: 6,
  },
};