import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function Batch({ user }) {
  const [products, setProducts] = useState([]);
  const [productMap, setProductMap] = useState({});
  const [batches, setBatches] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);

  const [productId, setProductId] = useState("");
  const [batchName, setBatchName] = useState("");
  const [buy, setBuy] = useState("");
  const [sell, setSell] = useState("");
  const [qty, setQty] = useState("");

  const [popup, setPopup] = useState("");

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
  // CREATE / UPDATE
  // ======================
  async function saveBatch() {
    if (!productId || !batchName || !buy || !sell || !qty) {
      setPopup("Fill all fields");
      return;
    }

    if (editingBatch) {
      await supabase
        .from("product_batches")
        .update({
          batch_name: batchName,
          buy_price: Number(buy),
          sell_price: Number(sell),
          remaining_qty: Number(qty),
        })
        .eq("id", editingBatch.id);
    } else {
      await supabase.from("product_batches").insert([
        {
          product_id: productId,
          batch_name: batchName,
          buy_price: Number(buy),
          sell_price: Number(sell),
          quantity: Number(qty),
          remaining_qty: Number(qty),
          user_id: user.id,
        },
      ]);
    }

    resetForm();
    fetchBatches();
    setPopup(editingBatch ? "Batch updated" : "Batch created");
  }

  // ======================
  // DELETE
  // ======================
  async function deleteBatch(id) {
    if (!window.confirm("Delete this batch?")) return;

    await supabase.from("product_batches").delete().eq("id", id);
    fetchBatches();
  }

  // ======================
  // EDIT INIT
  // ======================
  function startEdit(b) {
    setEditingBatch(b);
    setProductId(b.product_id);
    setBatchName(b.batch_name);
    setBuy(b.buy_price);
    setSell(b.sell_price);
    setQty(b.remaining_qty);
    setShowModal(true);
  }

  function resetForm() {
    setEditingBatch(null);
    setProductId("");
    setBatchName("");
    setBuy("");
    setSell("");
    setQty("");
    setShowModal(false);
  }

  return (
    <div>
      <h2>Batch</h2>

      {/* ADD BUTTON */}
      <button style={styles.addBtn} onClick={() => setShowModal(true)}>
        + Add Batch
      </button>

      {/* LIST */}
      <div style={styles.list}>
        {batches.map((b) => {
          const product = productMap[b.product_id];

          return (
            <div key={b.id} style={styles.card}>
              <div>
                <strong>{b.batch_name}</strong>
                <p>
                  {product?.name} {product?.size} {product?.unit}
                </p>
                <p>Stock: {b.remaining_qty}</p>
              </div>

              <div style={styles.actions}>
                <button onClick={() => startEdit(b)}>Edit</button>
                <button onClick={() => deleteBatch(b.id)}>Delete</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL */}
      {showModal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3>{editingBatch ? "Edit Batch" : "Create Batch"}</h3>

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
              placeholder="Buy Price"
              value={buy}
              onChange={(e) => setBuy(e.target.value)}
            />

            <input
              placeholder="Sell Price"
              value={sell}
              onChange={(e) => setSell(e.target.value)}
            />

            <input
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
  addBtn: {
    marginBottom: 20,
    padding: 10,
    background: "#1abc9c",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  card: {
    display: "flex",
    justifyContent: "space-between",
    padding: 15,
    background: "#fff",
    borderRadius: 8,
  },
  actions: {
    display: "flex",
    gap: 10,
  },
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