import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function AddStock({ user }) {
  const [batches, setBatches] = useState([]);
  const [batchId, setBatchId] = useState("");
  const [qty, setQty] = useState("");

  useEffect(() => {
    fetchBatches();
  }, []);

  async function fetchBatches() {
    const { data } = await supabase
      .from("product_batches")
      .select("*, products(name, size, unit)")
      .eq("user_id", user.id);

    setBatches(data || []);
  }

  async function addStock() {
    if (!batchId || !qty) return alert("Fill all");

    const batch = batches.find((b) => b.id === batchId);

    await supabase
      .from("product_batches")
      .update({
        quantity: batch.quantity + Number(qty),
        remaining_qty: batch.remaining_qty + Number(qty),
      })
      .eq("id", batchId);

    alert("Stock Added");
    fetchBatches();
  }

  return (
    <div>
      <h2>Add Stock</h2>

      <select onChange={(e) => setBatchId(e.target.value)}>
        <option>Select Batch</option>
        {batches.map((b, i) => (
          <option key={b.id} value={b.id}>
            B{i + 1} → {b.products.name} {b.products.size}{b.products.unit}
          </option>
        ))}
      </select>

      <input
        placeholder="Quantity"
        onChange={(e) => setQty(e.target.value)}
      />

      <button onClick={addStock}>Add</button>
    </div>
  );
}