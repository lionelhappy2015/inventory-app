import { supabase } from "../../supabaseClient";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ================= SAVE =================
export async function saveSaleService({
  user,
  customer,
  items,
  total,
  discount,
  final,
  paid,
  due,
}) {
  // ⛔ prevent duplicate fast clicks
  const { data: lastSale } = await supabase
    .from("sales")
    .select("created_at")
    .eq("user_id", user.id)
    .eq("customer_id", customer.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastSale) {
    const lastTime = new Date(lastSale.created_at).getTime();
    if (Date.now() - lastTime < 15000) {
      throw new Error("Wait 15 seconds before saving again");
    }
  }

  // ================= PROFIT CALC =================
  let totalProfit = 0;
  const processedItems = [];

  for (let i of items) {
    const qty = Number(i.qty || 0);

    const { data: batch } = await supabase
      .from("product_batches")
      .select("remaining_qty, buy_price")
      .eq("id", i.batch_id)
      .single();

    if (batch.remaining_qty < qty) {
      throw new Error("Stock issue detected");
    }

    const buy = Number(batch.buy_price || 0);
    const sell = Number(i.sell_price || 0);

    const itemProfit = (sell - buy) * qty;

    totalProfit += itemProfit;

    processedItems.push({
      ...i,
      qty,
      buy_price: buy,
      profit: itemProfit,
      remaining_qty: batch.remaining_qty,
    });
  }

  // ================= PAYMENT STATUS =================
  let payment_status = "DUE";
  if (paid === final) payment_status = "PAID";
  else if (paid > 0) payment_status = "PARTIAL";

  // ================= SAVE SALE =================
  const { data: sale, error } = await supabase
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
        payment_status,

        total_profit: totalProfit, // 🔥 FIXED
      },
    ])
    .select()
    .single();

  if (error) throw new Error("Error saving sale");

  // ================= SAVE ITEMS + UPDATE STOCK =================
  for (let i of processedItems) {
    // update stock
    await supabase
      .from("product_batches")
      .update({
        remaining_qty: i.remaining_qty - i.qty,
      })
      .eq("id", i.batch_id);

    // insert sale item
    await supabase.from("sale_items").insert({
      user_id: user.id,
      sale_id: sale.id,
      product_id: i.product_id,
      batch_id: i.batch_id,

      qty: i.qty,
      sell_price: i.sell_price,
      buy_price: i.buy_price,

      profit: i.profit, // 🔥 NEW COLUMN USED
    });
  }

  return sale.id;
}

// ================= PDF =================
export function downloadInvoicePDF({
  id,
  items,
  customer,
  final,
  paid,
  due,
  discount = 0,
}) {
  const doc = new jsPDF();
  const now = new Date();

  doc.setFontSize(16);
  doc.text(`INVOICE #${id.slice(0, 6)}`, 14, 15);

  doc.setFontSize(10);
  doc.text(now.toLocaleString(), 150, 12);

  doc.setFontSize(12);
  doc.text(`Customer: ${customer.name}`, 14, 25);

  autoTable(doc, {
    startY: 30,
    head: [["Product", "Batch", "Qty", "Price", "Total"]],
    body: items.map((i) => [
      `${i.name} (${i.size})`,
      i.batch_name,
      i.qty,
      `₹${i.sell_price}`,
      `₹${i.qty * i.sell_price}`,
    ]),
    theme: "grid",
    styles: { fontSize: 10 },
  });

  let y = doc.lastAutoTable.finalY + 10;

  doc.text(`Total: ₹${final}`, 14, y);
  y += 6;

  if (discount > 0) {
    doc.text(`Discount: ₹${discount}`, 14, y);
    y += 6;
  }

  doc.text(`Paid: ₹${paid}`, 14, y);
  y += 6;

  if (due > 0) {
    doc.text(`Due: ₹${due}`, 14, y);
  }

  doc.save(`invoice-${id}.pdf`);
}

// ================= PRINT =================
export function printInvoice({
  id,
  items,
  customer,
  final,
  paid,
  due,
}) {
  const win = window.open("", "_blank");

  win.document.write(`
    <html>
      <head>
        <title>Invoice</title>
        <style>
          body { font-family: Arial; padding: 30px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #000; padding: 8px; }
        </style>
      </head>

      <body>
        <h2>Invoice #${id.slice(0,6)}</h2>
        <p>${new Date().toLocaleString()}</p>
        <p><b>Customer:</b> ${customer.name}</p>

        <table>
          <tr>
            <th>Product</th>
            <th>Batch</th>
            <th>Qty</th>
            <th>Price</th>
            <th>Total</th>
          </tr>

          ${items.map(i => `
            <tr>
              <td>${i.name} (${i.size})</td>
              <td>${i.batch_name}</td>
              <td>${i.qty}</td>
              <td>₹${i.sell_price}</td>
              <td>₹${i.qty * i.sell_price}</td>
            </tr>
          `).join("")}
        </table>

        <h3>Total: ₹${final}</h3>
        <h3>Paid: ₹${paid}</h3>
        ${due > 0 ? `<h3>Due: ₹${due}</h3>` : ""}

        <script>
          window.onload = () => window.print();
        </script>
      </body>
    </html>
  `);

  win.document.close();
}