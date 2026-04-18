import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function AddStock({ user }) {
  const [products, setProducts] = useState([]);
  const [batches, setBatches] = useState([]);

  const [productId, setProductId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [qty, setQty] = useState("");

  const [popup, setPopup] = useState("");

  useEffect(() => {
    fetchProducts();
  }, []);

  // ======================
  // FETCH PRODUCTS
  // ======================
  async function fetchProducts() {
    const { data } = await supabase
      .from("products")
      .select("*");

    setProducts(data || []);
  }

  // ======================
  // FETCH BATCHES
  // ======================
  async function fetchBatches(pid) {
    const { data } = await supabase
      .from("product_batches")
      .select("*")
      .eq("product_id", pid);

    setBatches(data || []);
  }

  // ======================
  // ADD STOCK + HISTORY
  // ======================
  async function addStock() {
    if (!productId || !batchId || !qty) {
      setPopup("Fill all fields");
      return;
    }

    const batch = batches.find((b) => b.id === batchId);

    if (!batch) {
      setPopup("Invalid batch selected ❌");
      return;
    }

    const newQty = Number(qty);

    if (isNaN(newQty) || newQty <= 0) {
      setPopup("Enter valid quantity");
      return;
    }

    console.log("ADDING STOCK:", {
      productId,
      batchId,
      batchName: batch.batch_name,
      qty: newQty,
    });

    // ======================
    // 1️⃣ UPDATE BATCH
    // ======================
    const { error: updateError } = await supabase
      .from("product_batches")
      .update({
        quantity: batch.quantity + newQty,
        remaining_qty: batch.remaining_qty + newQty,
      })
      .eq("id", batch.id);

    if (updateError) {
      setPopup(updateError.message);
      return;
    }

    // ======================
    // 2️⃣ INSERT HISTORY
    // ======================
    const { error: insertError } = await supabase
      .from("stock_entries")
      .insert([
        {
          user_id: user.id,
          product_id: productId,
          batch_id: batch.id, // 🔥 ALWAYS correct
          qty_added: newQty,
        },
      ]);

    if (insertError) {
      setPopup(insertError.message);
      return;
    }

    // ======================
    // SUCCESS
    // ======================
    setPopup("Stock added & history recorded ✅");

    setQty("");
    setBatchId("");

    fetchBatches(productId);
  }

  return (
    <div>
      <h2>Add Stock</h2>

      <div style={styles.form}>
        {/* PRODUCT */}
        <select
          value={productId}
          onChange={(e) => {
            setProductId(e.target.value);
            setBatchId("");
            fetchBatches(e.target.value);
          }}
        >
          <option value="">Select Product</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} {p.size}
            </option>
          ))}
        </select>

        {/* BATCH */}
        <select
          value={batchId}
          onChange={(e) => setBatchId(e.target.value)}
        >
          <option value="">Select Batch</option>
          {batches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.batch_name} (Stock: {b.remaining_qty})
            </option>
          ))}
        </select>

        {/* QTY */}
        <input
          type="number"
          placeholder="Quantity"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
        />

        <button onClick={addStock}>Add Stock</button>
      </div>

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

const styles = {
  form: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginTop: 20,
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