import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function Batch({ user }) {
  // ======================
  // STATES
  // ======================
  const [products, setProducts] = useState([]);
  const [batches, setBatches] = useState([]);

  const [productId, setProductId] = useState("");
  const [batchName, setBatchName] = useState("");
  const [buy, setBuy] = useState("");
  const [sell, setSell] = useState("");
  const [qty, setQty] = useState("");

  const [loading, setLoading] = useState(false);

  // ======================
  // LOAD DATA
  // ======================
  useEffect(() => {
    fetchProducts();
    fetchBatches();
  }, []);

  async function fetchProducts() {
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setProducts(data || []);
  }

  async function fetchBatches() {
    setLoading(true);

    const { data } = await supabase
      .from("product_batches")
      .select("*, products(name, size, unit)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setBatches(data || []);
    setLoading(false);
  }

  // ======================
  // CREATE BATCH
  // ======================
  async function createBatch() {
    if (!productId || !batchName || !buy || !sell || !qty) {
      alert("Fill all fields");
      return;
    }

    const { error } = await supabase.from("product_batches").insert([
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

    if (error) {
      alert(error.message);
    } else {
      setBatchName("");
      setBuy("");
      setSell("");
      setQty("");
      fetchBatches();
    }
  }

  // ======================
  // UI
  // ======================
  return (
    <div>
      <h2>Batch</h2>

      {/* ================= CREATE ================= */}
      <div style={styles.form}>
        {/* PRODUCT */}
        <select onChange={(e) => setProductId(e.target.value)}>
          <option value="">Select Product</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} {p.size} {p.unit}
            </option>
          ))}
        </select>

        {/* BATCH NAME */}
        <input
          placeholder="Batch Name (B1, Lot-A)"
          value={batchName}
          onChange={(e) => setBatchName(e.target.value)}
        />

        {/* PRICES */}
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

        {/* QUANTITY */}
        <input
          placeholder="Quantity"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
        />

        <button onClick={createBatch}>Create Batch</button>
      </div>

      {/* ================= LIST ================= */}
      {loading ? (
        <p>Loading...</p>
      ) : batches.length === 0 ? (
        <p>No batches yet</p>
      ) : (
        <div style={styles.list}>
          {batches.map((b) => (
            <div key={b.id} style={styles.card}>
              <div>
                <strong>{b.batch_name}</strong>
                <p>
                  {b.products?.name} {b.products?.size} {b.products?.unit}
                </p>
              </div>

              <div>
                <p>Buy: ₹{b.buy_price}</p>
                <p>Sell: ₹{b.sell_price}</p>
                <p>Stock: {b.remaining_qty}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ======================
// STYLES
// ======================
const styles = {
  form: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginBottom: "20px",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  card: {
    display: "flex",
    justifyContent: "space-between",
    padding: "15px",
    background: "#fff",
    borderRadius: "8px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  },
};