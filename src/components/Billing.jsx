import { useState } from "react";
import ProductSearch from "./ProductSearch";
import Cart from "./Cart";
import { supabase } from "../supabaseClient";

export default function Billing({ user, customer, onBack }) {
  const [items, setItems] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [paid, setPaid] = useState(0);
  const [popup, setPopup] = useState("");

  function addProduct(p) {
    setItems([
      ...items,
      {
        productId: p.id,
        name: p.name,
        qty: 0,
        batchId: "",
        _batch: null,
      },
    ]);
  }

  // ✅ ALWAYS FROM BATCH
  const total = items.reduce((sum, item) => {
    const price = item._batch?.sell_price || 0;
    return sum + (item.qty || 0) * price;
  }, 0);

  const finalAmount = total - discount;
  const due = finalAmount - paid;

  async function saveSale() {
    if (!customer || items.length === 0) {
      setPopup("Add items");
      return;
    }

    const { data: sale } = await supabase
      .from("sales")
      .insert([
        {
          user_id: user.id,
          customer_id: customer.id,
          total_amount: total,
          discount,
          final_amount: finalAmount,
          paid_amount: paid,
          due_amount: due,
        },
      ])
      .select()
      .single();

    for (let item of items) {
      const batch = item._batch;

      if (!batch) {
        setPopup("Select batch");
        return;
      }

      const qty = Number(item.qty);

      if (qty <= 0 || qty > batch.remaining_qty) {
        setPopup("Invalid quantity");
        return;
      }

      const sell = Number(batch.sell_price);
      const buy = Number(batch.buy_price);

      const totalLine = sell * qty;
      const profit = (sell - buy) * qty;
      const margin =
        buy === 0 ? 0 : ((sell - buy) / buy) * 100;

      // SALE ITEM
      await supabase.from("sale_items").insert([
        {
          user_id: user.id,
          sale_id: sale.id,
          product_id: item.productId,
          batch_id: batch.id,
          qty,
          sell_price: sell,
          buy_price: buy,
        },
      ]);

      // 🔥 CORRECT STOCK DEDUCTION
      await supabase
        .from("product_batches")
        .update({
          remaining_qty: batch.remaining_qty - qty,
        })
        .eq("id", batch.id);

      // HISTORY
      await supabase.from("sales_history").insert([
        {
          user_id: user.id,
          sale_id: sale.id,
          customer_id: customer.id,
          product_id: item.productId,
          batch_id: batch.id,
          qty,
          sell_price: sell,
          buy_price: buy,
          total: totalLine,
          profit,
          profit_margin: margin,
        },
      ]);
    }

    setPopup("Bill saved ✅");
    setItems([]);
  }

  return (
    <div style={styles.page}>
      <button onClick={onBack}>← Back</button>

      <h2>{customer.name}</h2>

      <ProductSearch onAdd={addProduct} />

      <Cart items={items} setItems={setItems} />

      <h3>Total: ₹{total}</h3>

      <input
        placeholder="Discount"
        onChange={(e) => setDiscount(Number(e.target.value))}
      />

      <h3>Final: ₹{finalAmount}</h3>

      <input
        placeholder="Paid"
        onChange={(e) => setPaid(Number(e.target.value))}
      />

      <h3>Due: ₹{due}</h3>

      <button onClick={saveSale}>Save Bill</button>

      {popup && <p>{popup}</p>}
    </div>
  );
}

const styles = {
  page: {
    padding: 20,
    background: "#f5f6fa",
    minHeight: "100vh",
  },
};