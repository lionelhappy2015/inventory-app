import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";


import {
  saveSaleService,
  downloadInvoicePDF,
  printInvoice,
} from "../salesPage/invoiceService";

export default function SalesInvoicePage({ user, customer, onBack }) {
  const [items, setItems] = useState([]);
  const [batches, setBatches] = useState([]);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productBatches, setProductBatches] = useState([]);
  const [showSelector, setShowSelector] = useState(true);

  const [discount, setDiscount] = useState("");
  const [paid, setPaid] = useState("");
  const [note, setNote] = useState("");

  const [savedSaleId, setSavedSaleId] = useState(null);

  // 🔥 NEW (for smart paid behavior)
  const [isPaidEdited, setIsPaidEdited] = useState(false);

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

  const products = [
    ...new Map(batches.map((b) => [b.product_id, b.products])).values(),
  ];

  function addItem(batch) {
    if (batch.remaining_qty <= 0) return alert("No stock");

    if (items.find((it) => it.batch_id === batch.id)) {
      return alert("Batch already added");
    }

    setItems((prev) => [
      ...prev,
      {
        product_id: batch.product_id,
        batch_id: batch.id,
        qty: "",
        sell_price: batch.sell_price,
        name: batch.products.name,
        size: batch.products.size,
        batch_name: batch.batch_name,
      },
    ]);
  }

  function updateQty(index, value) {
    const newQty = value === "" ? "" : Number(value);
    const item = items[index];
    const batch = batches.find((b) => b.id === item.batch_id);

    if (newQty !== "" && newQty > batch.remaining_qty + (item.qty || 0)) {
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

  const total = items.reduce(
    (s, i) => s + (Number(i.qty) || 0) * i.sell_price,
    0
  );

  const discountNum = Number(discount) || 0;
  const paidNum = Number(paid) || 0;

  const final = Math.max(0, total - discountNum);
  const safePaid = Math.min(paidNum, final);
  const due = Math.max(0, final - safePaid);

  // 🔥 AUTO UPDATE PAID (ONLY IF USER HAS NOT EDITED)
  useEffect(() => {
    if (!isPaidEdited) {
      setPaid(total);
    }
  }, [total]);

  async function saveSale() {
    try {
      const saleId = await saveSaleService({
        user,
        customer,
        items,
        total,
        discount: discountNum,
        final,
        paid: safePaid,
        due,
      });

      alert("Saved ✅");
      setSavedSaleId(saleId);
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>{customer?.name}</h2>
        <button onClick={onBack}>← Change</button>
      </div>

      {showSelector && (
        <>
          <select
            style={styles.select}
            onChange={(e) => {
              const p = products.find((p) => p.id === e.target.value);
              setSelectedProduct(p);
              setProductBatches(
                batches.filter((b) => b.product_id === e.target.value)
              );
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
                const b = productBatches.find(
                  (b) => b.id === e.target.value
                );
                if (b) {
                  addItem(b);
                  setShowSelector(false);
                  setSelectedProduct(null);
                }
              }}
            >
              <option>Select Batch</option>
              {productBatches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.batch_name} | ₹{b.sell_price} | Stock: {b.remaining_qty}
                </option>
              ))}
            </select>
          )}
        </>
      )}

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
              onChange={(e) => updateQty(idx, e.target.value)}
              placeholder="Qty"
            />

            <span>₹{i.sell_price}</span>
            <span>₹{(Number(i.qty) || 0) * i.sell_price}</span>

            <button onClick={() => removeItem(idx)}>✕</button>
          </div>
        ))}
      </div>

      <div style={styles.summary}>
        <div>Total: ₹{total}</div>

        <input
          placeholder="Discount"
          value={discount}
          onChange={(e) => setDiscount(e.target.value)}
        />

        <input
          placeholder="Paid"
          value={paid}
          maxLength={10}
          onChange={(e) => {
            if (/^\d*$/.test(e.target.value)) {
              setIsPaidEdited(true);
              setPaid(e.target.value);
            }
          }}
        />

        <div>
          <b>Final:</b> ₹{final}
        </div>
        <div>
          <b>Due:</b> ₹{due}
        </div>

        <textarea
          placeholder="Note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <button style={styles.saveBtn} onClick={saveSale}>
          Save Bill
        </button>

        {savedSaleId && (
          <>
            <button
              onClick={() =>
                downloadInvoicePDF({
                  id: savedSaleId,
                  items,
                  customer,
                  total,
                  final,
                  paid: safePaid,
                  due,
                  discount: discountNum,
                })
              }
            >
              Download PDF
            </button>

            <button
              onClick={() =>
                printInvoice({
                  id: savedSaleId,
                  items,
                  customer,
                  total,
                  final,
                  paid: safePaid,
                  due,
                })
              }
            >
              Print
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { maxWidth: 1000, margin: "auto", padding: 20 },
  header: { display: "flex", justifyContent: "space-between" },
  select: { padding: 10, marginBottom: 10, width: "100%" },
  table: { marginTop: 20, border: "1px solid #eee" },
  tableHeader: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 50px",
    background: "#f7f7f7",
    padding: 10,
  },
  tableRow: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 50px",
    padding: 10,
    borderTop: "1px solid #eee",
  },
  qtyInput: { width: 60 },
  addBtn: {
    marginLeft: 10,
    borderRadius: "50%",
    background: "#000",
    color: "#fff",
  },
  summary: { marginTop: 20, display: "flex", flexDirection: "column", gap: 10 },
  saveBtn: { padding: 10, background: "#000", color: "#fff" },
};