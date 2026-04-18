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
    const { data } = await supabase.from("products").select("*");
    setProducts(data || []);
  }

  // ======================
  // FETCH BATCHES FOR PRODUCT
  // ======================
  async function fetchBatches(pid) {
    const { data } = await supabase
      .from("product_batches")
      .select("*")
      .eq("product_id", pid);

    setBatches(data || []);
  }

  // ======================
  // ADD STOCK
  // ======================
  async function addStock() {
    if (!batchId || !qty) {
      setPopup("Select batch & enter quantity");
      return;
    }

    const batch = batches.find((b) => b.id === batchId);

    await supabase
      .from("product_batches")
      .update({
        quantity: batch.quantity + Number(qty),
        remaining_qty: batch.remaining_qty + Number(qty),
      })
      .eq("id", batchId);

    setPopup("Stock added successfully");

    setQty("");
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