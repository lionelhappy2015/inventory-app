import { supabase } from "../../supabaseClient";
import html2pdf from "html2pdf.js";

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
  // 🔥 15 sec duplicate protection
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
    const now = Date.now();

    if (now - lastTime < 15000) {
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
  total,
  final,
  paid,
  due,
  discount = 0,
}) {
  const now = new Date();

  const element = document.createElement("div");

  element.innerHTML = `
    <div style="
      font-family: Arial, sans-serif;
      padding:20px;
      color:#000;
      font-size:13px;
    ">
      
      <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
        <h2 style="margin:0;">INVOICE #${id.slice(0,6)}</h2>
        <div style="text-align:right; font-size:12px;">
          ${now.toLocaleDateString()}<br/>
          ${now.toLocaleTimeString()}
        </div>
      </div>

      <p><b>Customer:</b> ${customer.name}</p>

      <table style="
        width:100%;
        border-collapse:collapse;
        margin-top:10px;
        border:3px solid black;
      ">
        <thead>
          <tr>
            <th style="border:3px solid black; padding:10px;">Product</th>
            <th style="border:3px solid black; padding:10px;">Batch</th>
            <th style="border:3px solid black; padding:10px;">Qty</th>
            <th style="border:3px solid black; padding:10px;">Price</th>
            <th style="border:3px solid black; padding:10px;">Total</th>
          </tr>
        </thead>

        <tbody>
          ${items.map(i => `
            <tr>
              <td style="border:3px solid black; padding:10px;">
                ${i.name} ${i.size}
              </td>
              <td style="border:3px solid black; padding:10px;">
                ${i.batch_name}
              </td>
              <td style="border:3px solid black; padding:10px; text-align:center;">
                ${i.qty}
              </td>
              <td style="border:3px solid black; padding:10px;">
                ₹${i.sell_price}
              </td>
              <td style="border:3px solid black; padding:10px;">
                ₹${i.qty * i.sell_price}
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>

      <div style="margin-top:15px;">
        <p><b>Total:</b> ₹${total}</p>

        ${discount > 0 ? `<p><b>Discount:</b> ₹${discount}</p>` : ""}

        <p><b>Final:</b> ₹${final}</p>
        <p><b>Paid:</b> ₹${paid}</p>
        <p><b>Due:</b> ₹${due}</p>
      </div>

    </div>
  `;

  html2pdf()
    .set({
      margin: 5,
      filename: `invoice-${id}.pdf`,
      html2canvas: { scale: 2 }, // 🔥 makes borders visible
    })
    .from(element)
    .save();
}