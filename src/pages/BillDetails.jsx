import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function BillDetails({ sale, onBack }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    fetchItems();
  }, []);

  async function fetchItems() {
    const { data } = await supabase
      .from("sale_items")
      .select("*, products(name, size)")
      .eq("sale_id", sale.id);

    setItems(data || []);
  }

  const totalProfit = items.reduce(
    (sum, i) => sum + (i.sell_price - i.buy_price) * i.qty,
    0
  );

  return (
    <div>
      <button onClick={onBack}>← Back</button>

      <h2>Invoice</h2>

      <p><strong>Customer:</strong> {sale.customers?.name}</p>
      <p><strong>Date:</strong> {new Date(sale.created_at).toLocaleString()}</p>

      {/* ITEMS */}
      <div>
        {items.map((i) => (
          <div key={i.id} style={styles.item}>
            <div>
              <strong>
                {i.products?.name} ({i.products?.size})
              </strong>
              <p>Qty: {i.qty}</p>
            </div>

            <div style={{ textAlign: "right" }}>
              <p>₹{i.sell_price * i.qty}</p>
              <p style={{ fontSize: 12, color: "green" }}>
                Profit: ₹{(i.sell_price - i.buy_price) * i.qty}
              </p>
            </div>
          </div>
        ))}
      </div>

      <hr />

      <h3>Total: ₹{sale.final_amount}</h3>
      <p style={{ color: "green" }}>Profit: ₹{totalProfit}</p>
      <p>Paid: ₹{sale.paid_amount}</p>
      <p>Due: ₹{sale.due_amount}</p>
    </div>
  );
}

const styles = {
  item: {
    display: "flex",
    justifyContent: "space-between",
    background: "#fff",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
};