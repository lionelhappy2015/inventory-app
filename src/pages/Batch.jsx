import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function Batch({ user }) {
  const [products, setProducts] = useState([]);
  const [productMap, setProductMap] = useState({});
  const [batches, setBatches] = useState([]);

  const [showModal, setShowModal] = useState(false);

  const [productId, setProductId] = useState("");
  const [batchName, setBatchName] = useState("");
  const [buy, setBuy] = useState("");
  const [sell, setSell] = useState("");
  const [qty, setQty] = useState("");

  const [popup, setPopup] = useState("");

  // 🔍 NEW
  const [search, setSearch] = useState("");
  const [showLowStock, setShowLowStock] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchBatches();
  }, []);

  // ======================
  // FETCH PRODUCTS
  // ======================
  async function fetchProducts() {
    const { data } = await supabase.from("products").select("*");

    const map = {};
    data?.forEach((p) => {
      map[p.id] = p;
    });

    setProducts(data || []);
    setProductMap(map);
  }

  // ======================
  // FETCH BATCHES
  // ======================
  async function fetchBatches() {
    const { data } = await supabase.from("product_batches").select("*");
    setBatches(data || []);
  }

  // ======================
  // CREATE BATCH + HISTORY
  // ======================
  async function saveBatch() {
    if (!productId || !batchName || !buy || !sell || !qty) {
      setPopup("Fill all fields");
      return;
    }

    const newQty = Number(qty);

    if (isNaN(newQty) || newQty <= 0) {
      setPopup("Invalid quantity");
      return;
    }

    // CREATE BATCH
    const { data: batchData, error } = await supabase
      .from("product_batches")
      .insert([
        {
          product_id: productId,
          batch_name: batchName,
          buy_price: Number(buy),
          sell_price: Number(sell),
          quantity: newQty,
          remaining_qty: newQty,
          user_id: user.id,
        },
      ])
      .select()
      .single();

    if (error) {
      setPopup(error.message);
      return;
    }

    // INSERT HISTORY
    await supabase.from("stock_entries").insert([
      {
        user_id: user.id,
        product_id: productId,
        batch_id: batchData.id,
        qty_added: newQty,
      },
    ]);

    resetForm();
    fetchBatches();
    setPopup("Batch created & stock recorded");
  }

  function resetForm() {
    setProductId("");
    setBatchName("");
    setBuy("");
    setSell("");
    setQty("");
    setShowModal(false);
  }

  // ======================
  // 🔍 FILTER LOGIC
  // ======================
  const filteredBatches = batches.filter((b) => {
    const product = productMap[b.product_id];

    const text = `${product?.name || ""} ${b.batch_name || ""}`.toLowerCase();

    const matchesSearch = text.includes(search.toLowerCase());
    const isLowStock = b.remaining_qty <= 10;

    if (showLowStock) {
      return matchesSearch && isLowStock;
    }

    return matchesSearch;
  });

  return (
    <div>
      <h2 style={styles.title}>Batch Management</h2>

      {/* ADD BUTTON */}
      <button style={styles.addBtn} onClick={() => setShowModal(true)}>
        + Add Batch
      </button>

      {/* 🔍 SEARCH + FILTER */}
      <div style={styles.searchBar}>
        <input
          type="text"
          placeholder="Search product or batch..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.searchInput}
        />

        <button
          style={{
            ...styles.filterBtn,
            background: showLowStock ? "#e74c3c" : "#95a5a6",
          }}
          onClick={() => setShowLowStock(!showLowStock)}
        >
          Low Stock
        </button>
      </div>

      {/* LIST */}
      <div style={styles.list}>
        {filteredBatches.length === 0 ? (
          <p>No batches found</p>
        ) : (
          filteredBatches.map((b) => {
            const product = productMap[b.product_id];

            return (
              <div key={b.id} style={styles.card}>
                {/* LEFT */}
                <div style={styles.left}>
                  <h3 style={styles.batchName}>{b.batch_name}</h3>

                  <p style={styles.product}>
                    {product?.name} {product?.size} {product?.unit}
                  </p>

                  <p
                    style={{
                      ...styles.stock,
                      color: b.remaining_qty <= 10 ? "red" : "black",
                      fontWeight: b.remaining_qty <= 10 ? "600" : "normal",
                    }}
                  >
                    Stock: {b.remaining_qty}
                  </p>
                </div>

                {/* RIGHT */}
                <div style={styles.right}>
                  <p style={styles.buy}>Buy: ₹{b.buy_price}</p>
                  <p style={styles.sell}>Sell: ₹{b.sell_price}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL */}
      {showModal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3>Create Batch</h3>

            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
            >
              <option value="">Select Product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.size}
                </option>
              ))}
            </select>

            <input
              placeholder="Batch Name"
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
            />

            <input
              type="number"
              placeholder="Buy Price"
              value={buy}
              onChange={(e) => setBuy(e.target.value)}
            />

            <input
              type="number"
              placeholder="Sell Price"
              value={sell}
              onChange={(e) => setSell(e.target.value)}
            />

            <input
              type="number"
              placeholder="Stock"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />

            <div style={styles.modalBtns}>
              <button onClick={saveBatch}>Save</button>
              <button onClick={resetForm}>Cancel</button>
            </div>
          </div>
        </div>
      )}

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

// ======================
// STYLES
// ======================
const styles = {
  title: { marginBottom: 15 },

  addBtn: {
    marginBottom: 20,
    padding: 10,
    background: "#1abc9c",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
  },

  searchBar: {
    display: "flex",
    gap: 10,
    marginBottom: 15,
  },

  searchInput: {
    flex: 1,
    padding: 8,
    borderRadius: 6,
    border: "1px solid #ccc",
  },

  filterBtn: {
    padding: "8px 12px",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    color: "#fff",
  },

  list: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },

  card: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    background: "#fff",
    borderRadius: 10,
    boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
  },

  left: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },

  right: {
    textAlign: "right",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },

  batchName: { margin: 0, fontSize: 16, fontWeight: "600" },

  product: { margin: 0, fontSize: 14, color: "#555" },

  stock: { margin: 0, fontSize: 14 },

  buy: { margin: 0, fontSize: 14, color: "#3498db" },

  sell: { margin: 0, fontSize: 14, color: "#27ae60", fontWeight: "600" },

  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "rgba(0,0,0,0.4)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },

  modal: {
    background: "#fff",
    padding: 20,
    borderRadius: 10,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    width: 300,
  },

  modalBtns: {
    display: "flex",
    justifyContent: "space-between",
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