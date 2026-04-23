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

  // 🔍 SEARCH
  const [search, setSearch] = useState("");
  const [showLowStock, setShowLowStock] = useState(false);

  // 🔥 REDUCE STATES
  const [showReduce, setShowReduce] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [reduceQty, setReduceQty] = useState("");
  const [reason, setReason] = useState("");

  // 🔥 EDIT STATES (NEW)
  const [showEdit, setShowEdit] = useState(false);
  const [editBatch, setEditBatch] = useState(null);
  const [editBuy, setEditBuy] = useState("");
  const [editSell, setEditSell] = useState("");

  useEffect(() => {
    fetchProducts();
    fetchBatches();
  }, []);

  async function fetchProducts() {
    const { data } = await supabase.from("products").select("*");

    const map = {};
    data?.forEach((p) => {
      map[p.id] = p;
    });

    setProducts(data || []);
    setProductMap(map);
  }

  async function fetchBatches() {
    const { data } = await supabase.from("product_batches").select("*");
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

      <div style={styles.list}>
        {filteredBatches.length === 0 ? (
          <p>No batches found</p>
        ) : (
          filteredBatches.map((b) => {
            const product = productMap[b.product_id];

            return (
              <div key={b.id} style={styles.card}>
                <div style={styles.left}>
                  <h3 style={styles.batchName}>{b.batch_name}</h3>

                  <p style={styles.product}>
                    {product?.name} {product?.size} {product?.unit}
                  </p>

                  <p
                    style={{
                      ...styles.stock,
                      color: b.remaining_qty <= 10 ? "red" : "black",
                    }}
                  >
                    Stock: {b.remaining_qty}
                  </p>
                </div>

                <div style={styles.right}>
                  <p style={styles.buy}>Buy: ₹{b.buy_price}</p>
                  <p style={styles.sell}>Sell: ₹{b.sell_price}</p>

                  <button
                    style={styles.reduceBtn}
                    onClick={() => {
                      setSelectedBatch(b);
                      setShowReduce(true);
                    }}
                  >
                    Reduce
                  </button>

                  {/* 🔥 EDIT BUTTON */}
                  <button
                    style={{ ...styles.reduceBtn, background: "#3498db" }}
                    onClick={() => {
                      setEditBatch(b);
                      setEditBuy(String(b.buy_price || ""));
                      setEditSell(String(b.sell_price || ""));
                      setShowEdit(true);
                    }}
                  >
                    Edit
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* EDIT MODAL */}
      {showEdit && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3>Edit Batch Price</h3>

            <p>
              {productMap[editBatch?.product_id]?.name}{" "}
              {productMap[editBatch?.product_id]?.size}
            </p>

            <input
              type="number"
              value={editBuy || ""}
              onChange={(e) => setEditBuy(e.target.value)}
            />

            <input
              type="number"
              value={editSell || ""}
              onChange={(e) => setEditSell(e.target.value)}
            />

            <div style={styles.modalBtns}>
              <button onClick={() => setShowEdit(false)}>Cancel</button>

              <button
                onClick={async () => {
                  try {
                    if (!editBuy || !editSell) {
                      setPopup("Fill all fields");
                      return;
                    }

                    const { error } = await supabase
                      .from("product_batches")
                      .update({
                        buy_price: Number(editBuy),
                        sell_price: Number(editSell),
                      })
                      .eq("id", editBatch.id);

                    if (error) throw error;

                    setPopup("Batch updated ✅");
                    setShowEdit(false);
                    fetchBatches();
                  } catch (err) {
                    setPopup(err.message);
                  }
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REDUCE MODAL (UNCHANGED) */}
      {showReduce && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3>Reduce Stock</h3>

            <input
              value={reduceQty}
              onChange={(e) => setReduceQty(e.target.value)}
            />
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />

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
                }}
              >
                Confirm
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
  addBtn: {
    marginBottom: 20,
    padding: 10,
    background: "#1abc9c",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
  },
  searchBar: { display: "flex", gap: 10, marginBottom: 15 },
  searchInput: { flex: 1, padding: 8, borderRadius: 6, border: "1px solid #ccc" },
  filterBtn: { padding: "8px 12px", border: "none", borderRadius: 6, cursor: "pointer", color: "#fff" },
  list: { display: "flex", flexDirection: "column", gap: 12 },
  card: { display: "flex", justifyContent: "space-between", padding: 15, background: "#fff", borderRadius: 10 },
  left: { display: "flex", flexDirection: "column", gap: 4 },
  right: { display: "flex", flexDirection: "column", gap: 4 },
  batchName: { margin: 0, fontSize: 16 },
  product: { margin: 0, fontSize: 14 },
  stock: { margin: 0, fontSize: 14 },
  buy: { margin: 0 },
  sell: { margin: 0 },
  reduceBtn: {
    marginTop: 5,
    background: "#e74c3c",
    color: "#fff",
    border: "none",
    padding: "6px 10px",
    borderRadius: 6,
    cursor: "pointer",
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
  modalBtns: { display: "flex", justifyContent: "space-between" },
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