import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";

export default function EditInvoiceForm({ sale, user, onBack }) {
  const [items, setItems] = useState([]);
  const [batches, setBatches] = useState([]);
  const [productBatchMap, setProductBatchMap] = useState({});

  const [search, setSearch] = useState("");
  const [showList, setShowList] = useState(false);

  const [discount, setDiscount] = useState("");
  const [paid, setPaid] = useState("");

  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState("");

  useEffect(() => {
    loadData();
    loadCustomers();
  }, []);

  async function loadCustomers() {
    const { data } = await supabase
      .from("customers")
      .select("*")
      .eq("user_id", user.id);

    setCustomers(data || []);
    setSelectedCustomer(sale.customer_id);
  }

  async function loadData() {
    const { data } = await supabase
      .from("sale_items")
      .select(`*, products(id,name,size), product_batches(*)`)
      .eq("sale_id", sale.id);

    setItems(
      (data || []).map((i) => ({
        id: i.id,
        product_id: i.product_id,
        batch_id: i.batch_id,
        qty: i.qty,
        sell_price: i.sell_price,
        buy_price: i.buy_price,
        name: i.products.name,
        size: i.products.size,
        batch_name: i.product_batches?.batch_name || "Batch",
      }))
    );

    setDiscount(String(sale.discount || ""));
    setPaid(String(sale.paid_amount || ""));

    const { data: b } = await supabase
      .from("product_batches")
      .select("*, products(id,name,size)")
      .eq("user_id", user.id);

    const grouped = {};
    (b || []).forEach((batch) => {
      if (!grouped[batch.product_id]) grouped[batch.product_id] = [];
      grouped[batch.product_id].push(batch);
    });

    setBatches(b || []);
    setProductBatchMap(grouped);
  }

  const products = [
    ...new Map(batches.map((b) => [b.product_id, b.products])).values(),
  ];

  const filtered = products.filter((p) =>
    `${p.name} ${p.size}`.toLowerCase().includes(search.toLowerCase())
  );

  // ✅ FIXED ADD ITEM (ONLY CHANGE)
  function addItem(batch) {
    if (Number(batch.remaining_qty) <= 0) {
      alert("Out of stock ❌");
      return;
    }

    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        product_id: batch.product_id,
        batch_id: batch.id,
        qty: 1,
        sell_price: batch.sell_price,
        buy_price: batch.buy_price,
        name: batch.products.name,
        size: batch.products.size,
        batch_name: batch.batch_name,
      },
    ]);
  }

  function updateQty(idx, val) {
    if (!/^\d*$/.test(val)) return;
    const updated = [...items];
    updated[idx].qty = Number(val || 0);
    setItems(updated);
  }

  function removeItem(idx) {
    setItems(items.filter((_, i) => i !== idx));
  }

  const subtotal = items.reduce((s, i) => s + i.qty * i.sell_price, 0);
  const final = Math.max(subtotal - (Number(discount) || 0), 0);
  const due = Math.max(final - (Number(paid) || 0), 0);

  useEffect(() => {
    if (!paid) setPaid(String(final));
  }, [final]);

  async function updateCustomer() {
    await supabase
      .from("sales")
      .update({ customer_id: selectedCustomer })
      .eq("id", sale.id);

    alert("Customer updated ✅");
  }

  async function deleteInvoice() {
    if (!window.confirm("Delete invoice?")) return;

    const { data: oldItems } = await supabase
      .from("sale_items")
      .select("*")
      .eq("sale_id", sale.id);

    for (let i of oldItems || []) {
      const { data: batch } = await supabase
        .from("product_batches")
        .select("remaining_qty")
        .eq("id", i.batch_id)
        .single();

      await supabase
        .from("product_batches")
        .update({
          remaining_qty: batch.remaining_qty + i.qty,
        })
        .eq("id", i.batch_id);
    }

    await supabase.from("sale_items").delete().eq("sale_id", sale.id);
    await supabase.from("sales").delete().eq("id", sale.id);

    alert("Deleted ✅");
    onBack();
  }

  async function saveInvoice() {
    try {
      const { data: oldItems } = await supabase
        .from("sale_items")
        .select("*")
        .eq("sale_id", sale.id);
  
      const logs = [];
  
      const oldMap = new Map();
      oldItems.forEach((i) => oldMap.set(i.batch_id, i));
  
      const newMap = new Map();
      items.forEach((i) => newMap.set(i.batch_id, i));
  
      // 🔥 REMOVED + UPDATED
      for (let old of oldItems) {
        const n = newMap.get(old.batch_id);
  
        if (!n) {
          logs.push({
            sale_id: sale.id,
            user_id: user.id,
            action: "REMOVED",
            product_id: old.product_id,
            batch_id: old.batch_id,
            old_qty: old.qty,
            new_qty: 0,
            old_price: old.sell_price,
            new_price: 0,
            old_total: old.qty * old.sell_price,
            new_total: 0,
            note: `Removed ${old.qty} qty`,
          });
        } else {
          if (
            old.qty !== n.qty ||
            Number(old.sell_price) !== Number(n.sell_price)
          ) {
            logs.push({
              sale_id: sale.id,
              user_id: user.id,
              action: "UPDATED",
              product_id: old.product_id,
              batch_id: old.batch_id,
              old_qty: old.qty,
              new_qty: n.qty,
              old_price: old.sell_price,
              new_price: n.sell_price,
              old_total: old.qty * old.sell_price,
              new_total: n.qty * n.sell_price,
              note: `Qty ${old.qty} → ${n.qty}`,
            });
          }
        }
      }
  
      // 🔥 ADDED ITEMS
      for (let i of items) {
        if (!oldMap.has(i.batch_id)) {
          logs.push({
            sale_id: sale.id,
            user_id: user.id,
            action: "ADDED",
            product_id: i.product_id,
            batch_id: i.batch_id,
            old_qty: 0,
            new_qty: i.qty,
            old_price: 0,
            new_price: i.sell_price,
            old_total: 0,
            new_total: i.qty * i.sell_price,
            note: `Added ${i.qty} qty`,
          });
        }
      }
  
      // 🔥 STOCK LOGIC (UNCHANGED)
      const batchIds = [
        ...new Set([
          ...oldItems.map((i) => i.batch_id),
          ...items.map((i) => i.batch_id),
        ]),
      ];
  
      const { data: batchData } = await supabase
        .from("product_batches")
        .select("id, remaining_qty")
        .in("id", batchIds);
  
      const batchMap = {};
      batchData.forEach((b) => (batchMap[b.id] = b.remaining_qty));
  
      oldItems.forEach((i) => {
        batchMap[i.batch_id] += i.qty;
      });
  
      for (let i of items) {
        if (batchMap[i.batch_id] < i.qty) {
          alert("Stock issue ❌");
          return;
        }
        batchMap[i.batch_id] -= i.qty;
      }
  
      await Promise.all(
        Object.entries(batchMap).map(([id, qty]) =>
          supabase
            .from("product_batches")
            .update({ remaining_qty: qty })
            .eq("id", id)
        )
      );
  
      await supabase.from("sale_items").delete().eq("sale_id", sale.id);
  
      await supabase.from("sale_items").insert(
        items.map((i) => ({
          sale_id: sale.id,
          user_id: user.id,
          product_id: i.product_id,
          batch_id: i.batch_id,
          qty: i.qty,
          sell_price: i.sell_price,
          buy_price: i.buy_price,
        }))
      );
  
      await supabase
        .from("sales")
        .update({
          total_amount: subtotal,
          final_amount: final,
          paid_amount: Number(paid) || 0,
          discount: Number(discount) || 0,
          due_amount: due,
        })
        .eq("id", sale.id);
  
      // 🔥 INSERT LOGS
      if (logs.length) {
        await supabase.from("sale_edit_logs").insert(logs);
      }
  
      alert("Updated ✅");
      onBack();
  
    } catch (err) {
      console.error(err);
      alert("Error saving");
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: "auto", fontFamily: "sans-serif" }}>
      <h2>Edit Invoice</h2>

      <select value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)}>
        {customers.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>

      <button onClick={updateCustomer}>Update Customer</button>
      <button onClick={deleteInvoice} style={{ marginLeft: 10, color: "red" }}>
        Delete Invoice
      </button>

      <input
        placeholder="Search product..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setShowList(true);
        }}
        style={{ width: "100%", padding: 10 }}
      />

      {showList && search && (
        <div style={{ border: "1px solid #ddd", marginTop: 5 }}>
          {filtered.map((p) => (
            <div
              key={p.id}
              style={{ padding: 10, cursor: "pointer" }}
              onClick={() => {
                const available = productBatchMap[p.id] || [];

                const valid = available.filter(
                  (b) => Number(b.remaining_qty) > 0
                );

                if (!valid.length) {
                  alert("Out of stock ❌");
                  return;
                }

                const latest = valid.sort(
                  (a, b) =>
                    new Date(b.created_at) - new Date(a.created_at)
                )[0];

                addItem(latest);

                setSearch("");
                setShowList(false);
              }}
            >
              {p.name} ({p.size})
            </div>
          ))}
        </div>
      )}

      {items.map((i, idx) => (
        <div key={idx} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr auto", gap: 10, marginTop: 10, border: "1px solid #eee", padding: 10 }}>
          <div>{i.name} ({i.size})<br /><small>{i.batch_name}</small></div>
          <input value={i.qty} onChange={(e) => updateQty(idx, e.target.value)} />
          <div>₹{i.sell_price}</div>
          <div>₹{i.qty * i.sell_price}</div>
          <button onClick={() => removeItem(idx)}>X</button>
        </div>
      ))}

      <div style={{ marginTop: 20 }}>
        <p>Subtotal: ₹{subtotal}</p>
        <input value={discount} onChange={(e) => /^\d*$/.test(e.target.value) && setDiscount(e.target.value)} />
        <p>Final: ₹{final}</p>
        <input value={paid} onChange={(e) => /^\d*$/.test(e.target.value) && setPaid(e.target.value)} />
        <p>Due: ₹{due}</p>
      </div>

      <button onClick={saveInvoice} style={{ marginTop: 20 }}>Save</button>
    </div>
  );
}