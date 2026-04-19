import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

import * as invoiceService from "../pages/salesPage/invoiceService";

export default function BillDetails({ sale, onBack }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    fetchItems();
  }, []);

  // ================= FETCH =================
  async function fetchItems() {
    const { data } = await supabase
      .from("sale_items")
      .select(`
        *,
        products(name, size),
        product_batches(batch_name)
      `)
      .eq("sale_id", sale.id);

    setItems(data || []);
  }

  // ================= FORMAT =================
  function getFormattedItems() {
    return items.map((i) => ({
      name: i.products?.name,
      size: i.products?.size,
      batch_name: i.product_batches?.batch_name,
      qty: i.qty,
      sell_price: i.sell_price,
    }));
  }

  // ================= PROFIT =================
  const totalProfit = items.reduce(
    (sum, i) => sum + (i.sell_price - i.buy_price) * i.qty,
    0
  );

  return (
    <div style={styles.container}>
      <button onClick={onBack}>← Back</button>

      <h2>Invoice #{sale.id.slice(0, 6)}</h2>

      <p>
        <strong>Customer:</strong> {sale.customers?.name}
      </p>
      <p>
        <strong>Date:</strong>{" "}
        {new Date(sale.created_at).toLocaleString()}
      </p>

      {/* ITEMS */}
      <div style={{ marginTop: 15 }}>
        {items.map((i) => (
          <div key={i.id} style={styles.item}>
            <div>
              <strong>
                {i.products?.name} ({i.products?.size})
              </strong>
              <p>Batch: {i.product_batches?.batch_name}</p>
              <p>Qty: {i.qty}</p>
            </div>

            <div style={{ textAlign: "right" }}>
              <p>₹{i.sell_price * i.qty}</p>
              <p style={styles.profit}>
                Profit: ₹{(i.sell_price - i.buy_price) * i.qty}
              </p>
            </div>
          </div>
        ))}
      </div>

      <hr />

      {/* SUMMARY */}
      <div style={{ marginTop: 10 }}>
        <h3>Final: ₹{sale.final_amount}</h3>
        <p style={styles.profit}>Profit: ₹{totalProfit}</p>
        <p>Paid: ₹{sale.paid_amount}</p>

        {sale.due_amount > 0 && (
          <p>Due: ₹{sale.due_amount}</p>
        )}
      </div>

      {/* ACTIONS */}
      <div style={styles.actions}>
        <button
          onClick={() =>
            invoiceService.printInvoice({
              id: sale.id,
              items: getFormattedItems(),
              customer: { name: sale.customers?.name },
              final: sale.final_amount,
              paid: sale.paid_amount,
              due: sale.due_amount,
            })
          }
        >
          🖨 Print
        </button>

        <button
          onClick={() =>
            invoiceService.downloadInvoicePDF({
              id: sale.id,
              items: getFormattedItems(),
              customer: { name: sale.customers?.name },
              final: sale.final_amount,
              paid: sale.paid_amount,
              due: sale.due_amount,
            })
          }
        >
          📄 Download PDF
        </button>
      </div>
    </div>
  );
}

// ================= STYLES =================
const styles = {
  container: {
    maxWidth: 800,
    margin: "auto",
    padding: 20,
  },

  item: {
    display: "flex",
    justifyContent: "space-between",
    background: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },

  profit: {
    fontSize: 12,
    color: "green",
  },

  actions: {
    marginTop: 20,
    display: "flex",
    gap: 10,
  },
};