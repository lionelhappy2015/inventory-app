import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import html2pdf from "html2pdf.js";

export default function SalesInvoicePage({ user, customer, onBack }) {
  const [items, setItems] = useState([]);
  const [batches, setBatches] = useState([]);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productBatches, setProductBatches] = useState([]);
  const [showSelector, setShowSelector] = useState(true);

  const [discount, setDiscount] = useState(0);
  const [paid, setPaid] = useState(0);
  const [note, setNote] = useState("");

  useEffect(() => {
    loadBatches();
  }, []);

  async function loadBatches() {
    const { data } = await supabase
      .from("product_batches")
      .select("*, products(id,name,size)")
      .eq("user_id", user.id);

    setBatches(data || []);
  }

  // ===== PRODUCTS =====
  const products = [
    ...new Map(batches.map((b) => [b.product_id, b.products])).values(),
  ];

  // ===== ADD ITEM =====
  function addItem(batch) {
    if (batch.remaining_qty <= 0) {
      alert("No stock");
      return;
    }

    setItems((prev) => [
      ...prev,
      {
        product_id: batch.product_id,
        batch_id: batch.id,
        qty: 1,
        sell_price: batch.sell_price,
        name: batch.products.name,
        size: batch.products.size,
        batch_name: batch.batch_name,
      },
    ]);
  }

  // ===== UPDATE =====
  function updateQty(index, value) {
    const newQty = Number(value);
    const item = items[index];
    const batch = batches.find((b) => b.id === item.batch_id);

    if (newQty > batch.remaining_qty + item.qty) {
      alert("Stock exceeded");
      return;
    }

    const updated = [...items];
    updated[index].qty = newQty;
    setItems(updated);
  }

  function removeItem(index) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  // ===== CALC =====
  const total = items.reduce((s, i) => s + i.qty * i.sell_price, 0);
  const final = total - discount;
  const due = final - paid;

  // ===== SAVE =====
  async function saveSale() {
    if (!customer) return alert("Select customer");

    const { data: sale } = await supabase
      .from("sales")
      .insert([
        {
          user_id: user.id,
          customer_id: customer.id,
          total_amount: total,
          discount,
          final_amount: final,
          paid_amount: paid,
          due_amount: due,
          note,
        },
      ])
      .select()
      .single();

    for (let i of items) {
      const { data: batch } = await supabase
        .from("product_batches")
        .select("remaining_qty")
        .eq("id", i.batch_id)
        .single();

      if (batch.remaining_qty < i.qty) {
        alert("Stock issue");
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

    alert("Saved ✅");
    downloadInvoicePDF(sale.id);
    setItems([]);
  }

  // ===== PDF =====
  function downloadInvoicePDF(id) {
    const element = document.createElement("div");

    element.innerHTML = `
      <h2>Invoice #${id.slice(0,6)}</h2>
      <p>Customer: ${customer.name}</p>

      <table border="1" style="width:100%; border-collapse: collapse;">
        <tr>
          <th>Product</th>
          <th>Batch</th>
          <th>Qty</th>
          <th>Price</th>
          <th>Total</th>
        </tr>

        ${items
          .map(
            (i) => `
          <tr>
            <td>${i.name} (${i.size})</td>
            <td>${i.batch_name}</td>
            <td>${i.qty}</td>
            <td>${i.sell_price}</td>
            <td>${i.qty * i.sell_price}</td>
          </tr>
        `
          )
          .join("")}
      </table>

      <h3>Total: ₹${total}</h3>
      <h4>Discount: ₹${discount}</h4>
      <h2>Final: ₹${final}</h2>
      <h4>Paid: ₹${paid}</h4>
      <h3>Due: ₹${due}</h3>
    `;

    html2pdf()
      .from(element)
      .set({
        margin: 10,
        filename: `invoice-${id}.pdf`,
        html2canvas: { scale: 2 },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .save();
  }

  return (
    <div style={styles.container}>
      {/* HEADER */}
      <div style={styles.header}>
        <h2>{customer.name}</h2>
        <button onClick={onBack}>← Change</button>
      </div>

      {/* SELECTOR */}
      {showSelector && (
        <>
          <select
            style={styles.select}
            onChange={(e) => {
              const product = products.find(
                (p) => p.id === e.target.value
              );
              setSelectedProduct(product);

              const filtered = batches.filter(
                (b) => b.product_id === e.target.value
              );
              setProductBatches(filtered);
            }}
          >
            <option>Select Product</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.size})
              </option>
            ))}
          </select>

          {selectedProduct && (
            <select
              style={styles.select}
              onChange={(e) => {
                const batch = productBatches.find(
                  (b) => b.id === e.target.value
                );
                if (batch) {
                  addItem(batch);
                  setShowSelector(false);
                  setSelectedProduct(null);
                }
              }}
            >
              <option>Select Batch</option>
              {productBatches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.batch_name} | ₹{b.sell_price} | Stock:{" "}
                  {b.remaining_qty}
                </option>
              ))}
            </select>
          )}
        </>
      )}

      {/* TABLE */}
      <div style={styles.table}>
        <div style={styles.tableHeader}>
          <span>Product</span>
          <span>Batch</span>
          <span>Qty</span>
          <span>Price</span>
          <span>Total</span>
          <span></span>
        </div>

        {items.map((i, idx) => (
          <div key={idx} style={styles.tableRow}>
            <span>
              {i.name} ({i.size})
              <button
                style={styles.addBtn}
                onClick={() => setShowSelector(true)}
              >
                +
              </button>
            </span>

            <span>{i.batch_name}</span>

            <input
              style={styles.qtyInput}
              value={i.qty}
              onChange={(e) =>
                updateQty(idx, e.target.value)
              }
            />

            <span>₹{i.sell_price}</span>
            <span>₹{i.qty * i.sell_price}</span>

            <button onClick={() => removeItem(idx)}>✕</button>
          </div>
        ))}
      </div>

      {/* SUMMARY */}
      <div style={styles.summary}>
        <div>Total: ₹{total}</div>

        <input
          placeholder="Discount"
          onChange={(e) =>
            setDiscount(Number(e.target.value))
          }
        />

        <input
          placeholder="Paid"
          onChange={(e) =>
            setPaid(Number(e.target.value))
          }
        />

        <div><b>Final:</b> ₹{final}</div>
        <div><b>Due:</b> ₹{due}</div>

        <textarea
          placeholder="Note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <button style={styles.saveBtn} onClick={saveSale}>
          Save & Download PDF
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 1000,
    margin: "auto",
    padding: 20,
    fontFamily: "sans-serif",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  select: {
    padding: 10,
    marginBottom: 10,
    width: "100%",
    borderRadius: 8,
  },

  table: {
    marginTop: 20,
    border: "1px solid #eee",
    borderRadius: 10,
    overflow: "hidden",
  },

  tableHeader: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 50px",
    background: "#f7f7f7",
    padding: 10,
    fontWeight: "bold",
  },

  tableRow: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 50px",
    padding: 10,
    borderTop: "1px solid #eee",
    alignItems: "center",
  },

  qtyInput: {
    width: 60,
    padding: 5,
  },

  addBtn: {
    marginLeft: 10,
    padding: "2px 8px",
    borderRadius: "50%",
    border: "none",
    background: "#000",
    color: "#fff",
    cursor: "pointer",
  },

  summary: {
    marginTop: 20,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    maxWidth: 300,
  },

  saveBtn: {
    padding: 12,
    background: "#000",
    color: "#fff",
    borderRadius: 8,
    cursor: "pointer",
  },
};