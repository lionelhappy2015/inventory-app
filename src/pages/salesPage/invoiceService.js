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
      },
    ])
    .select()
    .single();

  if (error) throw new Error("Error saving sale");

  for (let i of items) {
    const { data: batch } = await supabase
      .from("product_batches")
      .select("remaining_qty, buy_price")
      .eq("id", i.batch_id)
      .single();

    if (batch.remaining_qty < i.qty) {
      throw new Error("Stock issue detected");
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
      buy_price: batch.buy_price,
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

  doc.text(`Final: ₹${final}`, 14, y);
  y += 6;

  doc.text(`Paid: ₹${paid}`, 14, y);
  y += 6;

  if (due > 0) {
    doc.text(`Due: ₹${due}`, 14, y);
  }

  doc.save(`invoice-${id}.pdf`);
}

// ================= PRINT (BEAUTIFUL) =================
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

        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&display=swap" rel="stylesheet">

        <style>
          body {
            font-family: 'Inter', sans-serif;
            padding: 30px;
            color: #000;
          }

          .container {
            max-width: 800px;
            margin: auto;
          }

          .header {
            display: flex;
            justify-content: space-between;
            border-bottom: 2px solid #000;
            margin-bottom: 20px;
          }

          .title {
            font-size: 22px;
            font-weight: 600;
          }

          .meta {
            font-size: 12px;
            text-align: right;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
          }

          th {
            border-bottom: 2px solid #000;
            padding: 8px;
            text-align: left;
          }

          td {
            padding: 8px;
            border-bottom: 1px solid #ddd;
          }

          .right {
            text-align: right;
          }

          .summary {
            margin-top: 20px;
            width: 250px;
            margin-left: auto;
          }

          .summary div {
            display: flex;
            justify-content: space-between;
            margin-bottom: 6px;
          }

          .final {
            font-weight: bold;
            border-top: 2px solid #000;
            padding-top: 8px;
          }

          .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 12px;
            color: #666;
          }
        </style>
      </head>

      <body>
        <div class="container">

          <div class="header">
            <div class="title">INVOICE #${id.slice(0,6)}</div>
            <div class="meta">${new Date().toLocaleString()}</div>
          </div>

          <p><b>Customer:</b> ${customer.name}</p>

          <table>
            <tr>
              <th>Product</th>
              <th>Batch</th>
              <th class="right">Qty</th>
              <th class="right">Price</th>
              <th class="right">Total</th>
            </tr>

            ${items.map(i => `
              <tr>
                <td>${i.name} (${i.size})</td>
                <td>${i.batch_name}</td>
                <td class="right">${i.qty}</td>
                <td class="right">₹${i.sell_price}</td>
                <td class="right">₹${i.qty * i.sell_price}</td>
              </tr>
            `).join("")}
          </table>

          <div class="summary">
            <div class="final">
              <span>Final</span>
              <span>₹${final}</span>
            </div>

            <div>
              <span>Paid</span>
              <span>₹${paid}</span>
            </div>

            ${due > 0 ? `
              <div>
                <span>Due</span>
                <span>₹${due}</span>
              </div>
            ` : ""}
          </div>

          <div class="footer">
            Thank you for your business!
          </div>

        </div>

        <script>
          window.onload = () => window.print();
        </script>

      </body>
    </html>
  `);

  win.document.close();
}