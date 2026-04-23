import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { reduceStock } from "../utils/stockAdjust";

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

  const [search, setSearch] = useState("");
  const [showLowStock, setShowLowStock] = useState(false);

  const [showReduce, setShowReduce] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [reduceQty, setReduceQty] = useState("");
  const [reason, setReason] = useState("");

  const [showEdit, setShowEdit] = useState(false);
  const [editBatch, setEditBatch] = useState(null);
  const [editBuy, setEditBuy] = useState("");
  const [editSell, setEditSell] = useState("");

  useEffect(() => {
    fetchProducts();
    fetchBatches();
  }, []);

  async function fetchProducts() {
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("user_id", user.id); // ✅ FIXED

    const map = {};
    data?.forEach((p) => (map[p.id] = p));

    setProducts(data || []);
    setProductMap(map);
  }

  async function fetchBatches() {
    const { data } = await supabase
      .from("product_batches")
      .select("*")
      .eq("user_id", user.id);

    setBatches(data || []);
  }

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
    setPopup("Batch created ✅");
  }

  function resetForm() {
    setProductId("");
    setBatchName("");
    setBuy("");
    setSell("");
    setQty("");
    setShowModal(false);
  }

  const filteredBatches = batches.filter((b) => {
    const product = productMap[b.product_id];
    const text = `${product?.name || ""} ${b.batch_name || ""}`.toLowerCase();

    const matchesSearch = text.includes(search.toLowerCase());
    const isLowStock = b.remaining_qty <= 10;

    if (showLowStock) return matchesSearch && isLowStock;
    return matchesSearch;
  });

  return (
    <div>
      <h2 style={styles.title}>Batch Management</h2>

      <button style={styles.addBtn} onClick={() => setShowModal(true)}>
        + Add Batch
      </button>

      {/* SEARCH */}
      <div style={styles.searchBar}>
        <input
          placeholder="Search..."
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
        {filteredBatches.map((b) => {
          const product = productMap[b.product_id];

          return (
            <div key={b.id} style={styles.card}>
              <div>
                <h3>{b.batch_name}</h3>
                <p>{product?.name} ({product?.size})</p>
                <p style={{ color: b.remaining_qty <= 10 ? "red" : "black" }}>
                  Stock: {b.remaining_qty}
                </p>
              </div>

              <div>
                <p>Buy: ₹{b.buy_price}</p>
                <p>Sell: ₹{b.sell_price}</p>

                <button
                  style={styles.reduceBtn}
                  onClick={() => {
                    setSelectedBatch(b);
                    setShowReduce(true);
                  }}
                >
                  Reduce
                </button>

                <button
                  style={{ ...styles.reduceBtn, background: "#3498db" }}
                  onClick={() => {
                    setEditBatch(b);
                    setEditBuy(String(b.buy_price));
                    setEditSell(String(b.sell_price));
                    setShowEdit(true);
                  }}
                >
                  Edit
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 🔥 ADD BATCH MODAL */}
      {showModal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3>Add Batch</h3>

            <select value={productId} onChange={(e) => setProductId(e.target.value)}>
              <option value="">Select Product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.size})
                </option>
              ))}
            </select>

            <input placeholder="Batch Name" value={batchName} onChange={(e) => setBatchName(e.target.value)} />
            <input placeholder="Buy Price" value={buy} onChange={(e) => setBuy(e.target.value)} />
            <input placeholder="Sell Price" value={sell} onChange={(e) => setSell(e.target.value)} />
            <input placeholder="Quantity" value={qty} onChange={(e) => setQty(e.target.value)} />

            <div style={styles.modalBtns}>
              <button onClick={() => setShowModal(false)}>Cancel</button>
              <button onClick={saveBatch}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* REDUCE MODAL */}
      {showReduce && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3>Reduce Stock</h3>

            <input value={reduceQty} onChange={(e) => setReduceQty(e.target.value)} />
            <input value={reason} onChange={(e) => setReason(e.target.value)} />

            <div style={styles.modalBtns}>
              <button onClick={() => setShowReduce(false)}>Cancel</button>

              <button
                onClick={async () => {
                  await reduceStock({
                    user,
                    product_id: selectedBatch.product_id,
                    batch_id: selectedBatch.id,
                    quantity: Number(reduceQty),
                    reason,
                  });
                  fetchBatches();
                  setShowReduce(false);
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEdit && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3>Edit Batch</h3>

            <input value={editBuy} onChange={(e) => setEditBuy(e.target.value)} />
            <input value={editSell} onChange={(e) => setEditSell(e.target.value)} />

            <div style={styles.modalBtns}>
              <button onClick={() => setShowEdit(false)}>Cancel</button>

              <button
                onClick={async () => {
                  await supabase
                    .from("product_batches")
                    .update({
                      buy_price: Number(editBuy),
                      sell_price: Number(editSell),
                    })
                    .eq("id", editBatch.id);

                  fetchBatches();
                  setShowEdit(false);
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

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
  title: { marginBottom: 15 },
  addBtn: { padding: 10, background: "#1abc9c", color: "#fff", border: "none", borderRadius: 6 },
  searchBar: { display: "flex", gap: 10, marginBottom: 15 },
  searchInput: { flex: 1, padding: 8 },
  filterBtn: { padding: 8, color: "#fff", border: "none", borderRadius: 6 },
  list: { display: "flex", flexDirection: "column", gap: 10 },
  card: { display: "flex", justifyContent: "space-between", padding: 15, background: "#fff" },
  reduceBtn: { marginTop: 5, background: "#e74c3c", color: "#fff", border: "none", padding: 6 },
  overlay: { position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.4)", display: "flex", justifyContent: "center", alignItems: "center" },
  modal: { background: "#fff", padding: 20, display: "flex", flexDirection: "column", gap: 10 },
  modalBtns: { display: "flex", justifyContent: "space-between" },
  popup: { position: "fixed", top: 20, right: 20, background: "#1abc9c", color: "#fff", padding: 10 },
};