import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";

export default function EditInvoiceForm({ sale, user, onBack }) {
  const [items, setItems] = useState([]);
  const [batches, setBatches] = useState([]);

  const [productSearch, setProductSearch] = useState("");
  const [showList, setShowList] = useState(false);

  const [discount, setDiscount] = useState("");
  const [paid, setPaid] = useState("");

  const [productBatchMap, setProductBatchMap] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    // Load existing sale items
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

    setDiscount(String(sale.discount || ""));
    setPaid(String(sale.paid_amount || ""));

    // Load batches
    const { data: b } = await supabase
      .from("product_batches")
      .select("*, products(name,size)")
      .eq("user_id", user.id);

    const all = b || [];
    setBatches(all);

    const grouped = {};
    for (let batch of all) {
      if (!grouped[batch.product_id]) grouped[batch.product_id] = [];
      grouped[batch.product_id].push(batch);
    }

    setProductBatchMap(grouped);
  }

  const products = [
    ...new Map(batches.map((b) => [b.product_id, b.products])).values(),
  ];

  const filteredProducts = products.filter((p) =>
    `${p.name} ${p.size}`.toLowerCase().includes(productSearch.toLowerCase())
  );

  function addItem(batch) {
    if (batch.remaining_qty <= 0) return alert("No stock");

    setItems([
      ...items,
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

  function removeItem(index) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateQty(index, value) {
    const updated = [...items];
    updated[index].qty = Number(value);
    setItems(updated);
  }

  const subtotal = items.reduce((s, i) => s + i.qty * i.sell_price, 0);

  const discountNum = Number(discount) || 0;
  const paidNum = Number(paid) || 0;

  const final = Math.max(subtotal - discountNum, 0);
  const due = Math.max(final - paidNum, 0);

  useEffect(() => {
    if (!paid) setPaid(String(final));
  }, [final]);

  // 🚀 OPTIMIZED SAVE FUNCTION
  async function saveInvoice() {
    try {
      // 1️⃣ OLD ITEMS
      const { data: oldItems, error: oldErr } = await supabase
        .from("sale_items")
        .select("*")
        .eq("sale_id", sale.id);

      if (oldErr) throw oldErr;

      // 2️⃣ ALL BATCHES IN ONE GO
      const batchIds = [
        ...new Set([
          ...oldItems.map((i) => i.batch_id),
          ...items.map((i) => i.batch_id),
        ]),
      ];

      const { data: batchesData, error: batchErr } = await supabase
        .from("product_batches")
        .select("id, remaining_qty")
        .in("id", batchIds);

      if (batchErr) throw batchErr;

      const batchMap = {};
      batchesData.forEach((b) => {
        batchMap[b.id] = b.remaining_qty;
      });

      // 3️⃣ RESTORE OLD STOCK
      oldItems.forEach((item) => {
        batchMap[item.batch_id] += item.qty;
      });

      // 4️⃣ APPLY NEW STOCK
      for (let item of items) {
        if (batchMap[item.batch_id] < item.qty) {
          throw new Error("Not enough stock");
        }
        batchMap[item.batch_id] -= item.qty;
      }

      // 5️⃣ DELETE OLD ITEMS
      const { error: delErr } = await supabase
        .from("sale_items")
        .delete()
        .eq("sale_id", sale.id);

      if (delErr) throw delErr;

      // 6️⃣ INSERT NEW ITEMS
      const newItems = items.map((i) => ({
        sale_id: sale.id,
        product_id: i.product_id,
        batch_id: i.batch_id,
        qty: i.qty,
        sell_price: i.sell_price,
      }));

      const { error: insertErr } = await supabase
        .from("sale_items")
        .insert(newItems);

      if (insertErr) throw insertErr;

      // 7️⃣ BULK STOCK UPDATE
      const updates = Object.entries(batchMap).map(([id, qty]) =>
        supabase
          .from("product_batches")
          .update({ remaining_qty: qty })
          .eq("id", id)
      );

      await Promise.all(updates);

      // 8️⃣ UPDATE SALES
      const { error: saleErr } = await supabase
        .from("sales")
        .update({
          total_amount: final,
          paid_amount: paidNum,
          discount: discountNum,
          due_amount: due,
          status: due > 0 ? "due" : "paid",
        })
        .eq("id", sale.id);

      if (saleErr) throw saleErr;

      alert("Invoice Updated ⚡");
      onBack();
    } catch (err) {
      console.error(err);
      alert(err.message || "Update failed ❌");
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>Invoice #{sale.id.slice(0, 6)}</h2>
        <button onClick={onBack}>← Back</button>
      </div>

      {/* SEARCH */}
      <div style={{ position: "relative" }}>
        <input
          style={styles.select}
          placeholder="Search Product..."
          value={productSearch}
          onChange={(e) => {
            setProductSearch(e.target.value);
            setShowList(true);
          }}
        />

        {showList && productSearch && (
          <div style={styles.dropdown}>
            {filteredProducts.map((p) => (
              <div
                key={p.id}
                style={styles.dropdownItem}
                onClick={() => {
                  const valid = (productBatchMap[p.id] || []).filter(
                    (b) => b.remaining_qty > 0
                  );

                  if (!valid.length) return alert("Out of stock");

                  const latest = valid.sort(
                    (a, b) =>
                      new Date(b.created_at) - new Date(a.created_at)
                  )[0];

                  addItem(latest);
                  setProductSearch("");
                  setShowList(false);
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
        {items.map((i, idx) => (
          <div key={idx} style={styles.row}>
            <span>{i.name} ({i.size})</span>
            <span>{i.batch_name}</span>

            <input
              value={i.qty}
              onChange={(e) => updateQty(idx, e.target.value)}
            />

            <span>₹{i.sell_price}</span>
            <span>₹{i.qty * i.sell_price}</span>

            <button onClick={() => removeItem(idx)}>X</button>
          </div>
        ))}
      </div>

      {/* SUMMARY */}
      <div style={styles.summary}>
        <p>Subtotal: ₹{subtotal}</p>

        <input
          placeholder="Discount"
          value={discount}
          onChange={(e) => {
            if (/^\d*$/.test(e.target.value)) {
              setDiscount(e.target.value);
            }
          }}
        />

        <p>Final: ₹{final}</p>

        <input
          placeholder="Paid"
          value={paid}
          onChange={(e) => {
            if (/^\d*$/.test(e.target.value)) {
              setPaid(e.target.value);
            }
          }}
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

  select: { padding: 10, width: "100%" },

  dropdown: {
    position: "absolute",
    background: "#fff",
    border: "1px solid #ccc",
    width: "100%",
    maxHeight: 200,
    overflowY: "auto",
  },

  dropdownItem: {
    padding: 8,
    cursor: "pointer",
  },

  table: { marginTop: 20 },
  row: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 50px",
    marginBottom: 10,
  },

  summary: { marginTop: 20 },

  saveBtn: { padding: 10, marginTop: 10 },
};