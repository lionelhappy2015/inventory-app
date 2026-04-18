import { useState } from "react";
import { supabase } from "../supabaseClient";

export default function Cart({ items, setItems }) {
  const [batches, setBatches] = useState({});

  async function fetchBatches(productId) {
    const { data } = await supabase
      .from("product_batches")
      .select("*")
      .eq("product_id", productId);

    setBatches((prev) => ({
      ...prev,
      [productId]: data || [],
    }));
  }

  function updateItem(index, key, value) {
    const newItems = [...items];
    newItems[index][key] = value;

    // 🔥 store full batch when selected
    if (key === "batchId") {
      const batch = batches[newItems[index].productId]?.find(
        (b) => b.id === value
      );
      if (batch) {
        newItems[index]._batch = batch;
      }
    }

    setItems(newItems);
  }

  function removeItem(index) {
    setItems(items.filter((_, i) => i !== index));
  }

  return (
    <div>
      {items.map((item, i) => {
        const productBatches = batches[item.productId] || [];
        const batch = item._batch;

        const price = batch?.sell_price || 0; // ✅ per unit
        const stock = batch?.remaining_qty || 0;
        const qty = item.qty || 0;

        const lineTotal = price * qty; // ✅ correct formula

        return (
          <div key={i} style={styles.row}>
            {/* PRODUCT */}
            <span style={styles.name}>{item.name}</span>

            {/* BATCH */}
            <select
              value={item.batchId || ""}
              onClick={() => fetchBatches(item.productId)}
              onChange={(e) =>
                updateItem(i, "batchId", e.target.value)
              }
            >
              <option value="">Select Batch</option>
              {productBatches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.batch_name} (Stock: {b.remaining_qty})
                </option>
              ))}
            </select>

            {/* QTY */}
            <input
              type="number"
              placeholder="Qty"
              value={item.qty || ""}
              onChange={(e) =>
                updateItem(i, "qty", Number(e.target.value))
              }
              style={{
                ...styles.qty,
                border:
                  qty > stock
                    ? "2px solid red"
                    : "1px solid #ccc",
              }}
            />

            {/* PRICE */}
            <span>₹{price}</span>

            {/* TOTAL */}
            <strong style={styles.total}>₹{lineTotal}</strong>

            {/* STOCK */}
            <small style={{ color: "#666" }}>
              Stock: {stock}
            </small>

            {/* REMOVE */}
            <button onClick={() => removeItem(i)}>❌</button>
          </div>
        );
      })}
    </div>
  );
}

const styles = {
  row: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  name: { width: 120 },
  qty: { width: 60, padding: 5 },
  total: { width: 80, textAlign: "right" },
};