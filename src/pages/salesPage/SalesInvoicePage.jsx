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

  const [latestBatchMap, setLatestBatchMap] = useState({});
  const [productBatchMap, setProductBatchMap] = useState({});

  const [discount, setDiscount] = useState("");
  const [paid, setPaid] = useState("");
  const [note, setNote] = useState("");

  const [savedSaleId, setSavedSaleId] = useState(null);
  const [isPaidEdited, setIsPaidEdited] = useState(false);

  const [productSearch, setProductSearch] = useState("");
  const [showProductList, setShowProductList] = useState(false);

  useEffect(() => {
    loadBatches();
  }, []);

  async function loadBatches() {
    const { data } = await supabase
      .from("product_batches")
      .select("*, products(id,name,size)")
      .eq("user_id", user.id);

    const all = data || [];
    setBatches(all);

    const grouped = {};
    const latest = {};

    for (let b of all) {
      if (!grouped[b.product_id]) grouped[b.product_id] = [];
      grouped[b.product_id].push(b);

      if (b.remaining_qty > 0) {
        if (
          !latest[b.product_id] ||
          new Date(b.created_at) > new Date(latest[b.product_id].created_at)
        ) {
          latest[b.product_id] = b;
        }
      }
    }

    setProductBatchMap(grouped);
    setLatestBatchMap(latest);
  }

  const products = [
    ...new Map(batches.map((b) => [b.product_id, b.products])).values(),
  ];

  const filteredProducts = products.filter((p) =>
    `${p.name} ${p.size}`
      .toLowerCase()
      .includes(productSearch.toLowerCase())
  );

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
        buy_price: batch.buy_price,
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

  function updatePrice(index, value) {
    const updated = [...items];
    updated[index].sell_price = Number(value) || 0;
    setItems(updated);
  }

  function removeItem(index) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  const total = items.reduce(
    (s, i) => s + (Number(i.qty) || 0) * i.sell_price,
    0
  );

  // ✅ BASE PROFIT
  const baseProfit = items.reduce((sum, i) => {
    const qty = Number(i.qty) || 0;
    return sum + (i.sell_price - i.buy_price) * qty;
  }, 0);

  // ✅ FINAL PROFIT (DISCOUNT ADJUSTED)
  const totalProfit = Math.max(0, baseProfit - (Number(discount) || 0));

  const discountNum = Number(discount) || 0;
  const paidNum = Number(paid) || 0;

  const final = Math.max(0, total - discountNum);
  const safePaid = Math.min(paidNum, final);
  const due = Math.max(0, final - safePaid);

  useEffect(() => {
    if (!isPaidEdited) setPaid(total);
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

      {/* 🔍 SEARCH */}
      <div style={{ position: "relative" }}>
        <input
          style={styles.select}
          placeholder="Search Product..."
          value={productSearch}
          onChange={(e) => {
            setProductSearch(e.target.value);
            setShowProductList(true);
          }}
          onFocus={() => setShowProductList(true)}
        />

        {showProductList && productSearch && (
          <div style={styles.dropdown}>
            {filteredProducts.slice(0, 20).map((p) => (
              <div
                key={p.id}
                style={styles.dropdownItem}
                onClick={() => {
                  const available = productBatchMap[p.id] || [];
                  const valid = available.filter(
                    (b) => b.remaining_qty > 0
                  );

                  if (!valid.length) {
                    alert("Out of stock");
                    return;
                  }

                  const latestValid = valid.sort(
                    (a, b) =>
                      new Date(b.created_at) -
                      new Date(a.created_at)
                  )[0];

                  addItem(latestValid);

                  setProductSearch("");
                  setShowProductList(false);
                }}
              >
                {p.name} ({p.size})
              </div>
            ))}
          </div>
        )}
      </div>

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
            <span>{i.name} ({i.size})</span>

            <select
              value={i.batch_id}
              onChange={(e) => {
                const newBatch = (productBatchMap[i.product_id] || []).find(
                  (b) => b.id === e.target.value
                );

                if (!newBatch) return;

                const updated = [...items];
                updated[idx] = {
                  ...updated[idx],
                  batch_id: newBatch.id,
                  batch_name: newBatch.batch_name,
                  sell_price: newBatch.sell_price,
                  buy_price: newBatch.buy_price,
                };

                setItems(updated);
              }}
            >
              {(productBatchMap[i.product_id] || []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.batch_name}
                </option>
              ))}
            </select>

            <input
              style={styles.qtyInput}
              value={i.qty}
              onChange={(e) => updateQty(idx, e.target.value)}
              placeholder="Qty"
            />

            <input
              style={{ width: 80 }}
              value={i.sell_price}
              onChange={(e) => updatePrice(idx, e.target.value)}
            />

            <span>₹{(Number(i.qty) || 0) * i.sell_price}</span>

            <button onClick={() => removeItem(idx)}>✕</button>
          </div>
        ))}
      </div>

      {/* SUMMARY */}
      <div style={styles.summary}>
        <div>Total: ₹{total}</div>
        <div><b>Profit:</b> ₹{totalProfit}</div>

        <input
          placeholder="Discount"
          value={discount}
          onChange={(e) => setDiscount(e.target.value)}
        />

        <input
          placeholder="Paid"
          value={paid}
          onChange={(e) => {
            if (/^\d*$/.test(e.target.value)) {
              setIsPaidEdited(true);
              setPaid(e.target.value);
            }
          }}
        />

        <div><b>Final:</b> ₹{final}</div>
        <div><b>Due:</b> ₹{due}</div>

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
            <button onClick={() =>
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
            }>
              Download PDF
            </button>

            <button onClick={() =>
              printInvoice({
                id: savedSaleId,
                items,
                customer,
                total,
                final,
                paid: safePaid,
                due,
              })
            }>
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
  dropdown: {
    position: "absolute",
    background: "#fff",
    border: "1px solid #ccc",
    width: "100%",
    maxHeight: 200,
    overflowY: "auto",
    zIndex: 10,
  },
  dropdownItem: {
    padding: 8,
    cursor: "pointer",
    borderBottom: "1px solid #eee",
  },
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
  summary: { marginTop: 20, display: "flex", flexDirection: "column", gap: 10 },
  saveBtn: { padding: 10, background: "#000", color: "#fff" },
};