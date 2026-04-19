import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";

export default function EditInvoiceForm({ sale, user, onBack }) {
  const [items, setItems] = useState([]);
  const [batches, setBatches] = useState([]);

  const [discount, setDiscount] = useState(0);
  const [paid, setPaid] = useState(0);
  const [note, setNote] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  // ================= LOAD =================
  async function loadData() {
    const { data } = await supabase
      .from("sale_items")
      .select(`*, products(name,size), product_batches(*)`)
      .eq("sale_id", sale.id);

    const mapped = data.map((i) => ({
      product_id: i.product_id,
      batch_id: i.batch_id,
      qty: i.qty,
      sell_price: i.sell_price,
      name: i.products.name,
      size: i.products.size,
      batch_name: i.product_batches?.batch_name || "Batch",
    }));

    setItems(mapped);

    setDiscount(sale.discount || 0);
    setPaid(sale.paid_amount || 0);

    const { data: b } = await supabase
      .from("product_batches")
      .select("*, products(name,size)")
      .eq("user_id", user.id);

    setBatches(b || []);
  }

  // ================= LOG =================
  async function logEdit(data) {
    await supabase.from("sale_edit_logs").insert({
      sale_id: sale.id,
      note,
      ...data,
    });
  }

  // ================= CALC =================
  const subtotal = items.reduce((s, i) => s + i.qty * i.sell_price, 0);
  const final = Math.max(subtotal - discount, 0);
  const due = Math.max(final - paid, 0);

  // ================= ADD =================
  function addItem(batch) {
    if (batch.remaining_qty <= 0) {
      alert("No stock available");
      return;
    }

    const newItem = {
      product_id: batch.product_id,
      batch_id: batch.id,
      qty: 1,
      sell_price: batch.sell_price,
      name: batch.products.name,
      size: batch.products.size,
      batch_name: batch.batch_name || batch.id.slice(0, 4),
    };

    setItems([...items, newItem]);

    logEdit({
      action: "ADD_ITEM",
      product_id: batch.product_id,
      batch_id: batch.id,
      new_qty: 1,
    });
  }

  // ================= REMOVE =================
  function removeItem(index) {
    const item = items[index];

    logEdit({
      action: "REMOVE_ITEM",
      product_id: item.product_id,
      batch_id: item.batch_id,
      old_qty: item.qty,
    });

    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  // ================= UPDATE QTY =================
  function updateQty(index, value) {
    const newQty = Number(value);
    const item = items[index];

    const batch = batches.find((b) => b.id === item.batch_id);

    // allow previous qty adjustment
    if (newQty > batch.remaining_qty + item.qty) {
      alert("Stock exceeded!");
      return;
    }

    const updated = [...items];
    updated[index].qty = newQty;
    setItems(updated);

    logEdit({
      action: "UPDATE_QTY",
      product_id: item.product_id,
      batch_id: item.batch_id,
      new_qty: newQty,
    });
  }

  // ================= SAVE =================
  async function saveInvoice() {
    // 1. Get old items
    const { data: oldItems } = await supabase
      .from("sale_items")
      .select("*")
      .eq("sale_id", sale.id);

    // 2. Restore stock
    for (let old of oldItems) {
      const { data: batch } = await supabase
        .from("product_batches")
        .select("remaining_qty")
        .eq("id", old.batch_id)
        .single();

      await supabase
        .from("product_batches")
        .update({
          remaining_qty: batch.remaining_qty + old.qty,
        })
        .eq("id", old.batch_id);
    }

    // 3. Delete old items
    await supabase.from("sale_items").delete().eq("sale_id", sale.id);

    // 4. Insert new + deduct
    for (let i of items) {
      const { data: batch } = await supabase
        .from("product_batches")
        .select("remaining_qty")
        .eq("id", i.batch_id)
        .single();

      if (batch.remaining_qty < i.qty) {
        alert(`Not enough stock for ${i.name}`);
        return;
      }

      await supabase
        .from("product_batches")
        .update({
          remaining_qty: batch.remaining_qty - i.qty,
        })
        .eq("id", i.batch_id);

      await supabase.from("sale_items").insert({
        user_id: user.id,
        sale_id: sale.id,
        product_id: i.product_id,
        batch_id: i.batch_id,
        qty: i.qty,
        sell_price: i.sell_price,
        buy_price: 0,
      });
    }

    // 5. Update sale
    await supabase
      .from("sales")
      .update({
        total_amount: subtotal,
        discount,
        final_amount: final,
        paid_amount: paid,
        due_amount: due,
      })
      .eq("id", sale.id);

    alert("Saved ✅");
    onBack();
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>Invoice #{sale.id.slice(0, 6)}</h2>
        <button onClick={onBack}>← Back</button>
      </div>

      {/* TABLE */}
      <div style={styles.table}>
        <div style={styles.rowHead}>
          <span>Product</span>
          <span>Batch</span>
          <span>Qty</span>
          <span>Price</span>
          <span>Total</span>
          <span></span>
        </div>

        {items.map((i, idx) => {
          const batch = batches.find((b) => b.id === i.batch_id);

          return (
            <div key={idx} style={styles.row}>
              <span>{i.name} ({i.size})</span>

              <span style={{ color: "#888" }}>
                {i.batch_name} | Stock: {batch?.remaining_qty ?? 0}
              </span>

              <input
                type="number"
                value={i.qty}
                onChange={(e) => updateQty(idx, e.target.value)}
              />

              <span>₹{i.sell_price}</span>
              <span>₹{i.qty * i.sell_price}</span>

              <button onClick={() => removeItem(idx)}>X</button>
            </div>
          );
        })}
      </div>

      {/* ADD PRODUCT */}
      <select
        onChange={(e) => {
          const batch = batches.find((b) => b.id === e.target.value);
          if (batch) addItem(batch);
        }}
      >
        <option>Add Product + Batch</option>
        {batches.map((b) => (
          <option key={b.id} value={b.id}>
            {b.products.name} ({b.products.size}) - {b.batch_name || b.id.slice(0,4)} - Stock: {b.remaining_qty}
          </option>
        ))}
      </select>

      {/* NOTE */}
      <textarea
        placeholder="Add note for this edit..."
        value={note}
        onChange={(e) => setNote(e.target.value)}
        style={styles.note}
      />

      {/* SUMMARY */}
      <div style={styles.summary}>
        <p>Subtotal: ₹{subtotal}</p>

        <input
          type="number"
          value={discount}
          onChange={(e) => setDiscount(Number(e.target.value))}
          placeholder="Discount"
        />

        <p>Final: ₹{final}</p>

        <input
          type="number"
          value={paid}
          onChange={(e) => setPaid(Number(e.target.value))}
          placeholder="Paid"
        />

        <p>Due: ₹{due}</p>
      </div>

      <button style={styles.saveBtn} onClick={saveInvoice}>
        Save Invoice
      </button>
    </div>
  );
}

const styles = {
  container: { maxWidth: 900, margin: "auto" },
  header: { display: "flex", justifyContent: "space-between" },

  table: { marginTop: 20 },
  rowHead: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 50px",
    fontWeight: "bold",
  },
  row: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 50px",
    gap: 10,
    marginBottom: 10,
    background: "#fff",
    padding: 10,
    borderRadius: 8,
  },

  note: {
    width: "100%",
    marginTop: 20,
    padding: 10,
    borderRadius: 8,
  },

  summary: { marginTop: 20 },

  saveBtn: {
    marginTop: 20,
    padding: 12,
    background: "#1abc9c",
    color: "#fff",
    border: "none",
    borderRadius: 8,
  },
};