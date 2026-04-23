import { supabase } from "../../supabaseClient";

/**
 * Update quantity of a sale item and log the change
 */
export async function updateItemQty({
  user,
  saleId,
  itemId,
  newQty,
}) {
  // 1️⃣ FETCH OLD DATA (IMPORTANT)
  const { data: oldItem, error: fetchErr } = await supabase
    .from("sale_items")
    .select("id, product_id, batch_id, qty, sell_price")
    .eq("id", itemId)
    .single();

  if (fetchErr) throw new Error(fetchErr.message);

  const oldQty = oldItem.qty;
  const price = oldItem.sell_price;

  // 2️⃣ UPDATE ITEM
  const { error: updateErr } = await supabase
    .from("sale_items")
    .update({ qty: newQty })
    .eq("id", itemId);

  if (updateErr) throw new Error(updateErr.message);

  // 3️⃣ INSERT LOG (FULL DATA)
  const { error: logErr } = await supabase
    .from("sale_edit_logs")
    .insert({
      user_id: user.id,
      sale_id: saleId,

      action: "UPDATE_QTY",

      product_id: oldItem.product_id,
      batch_id: oldItem.batch_id,

      old_qty: oldQty,
      new_qty: newQty,

      old_price: price,
      new_price: price,

      old_total: oldQty * price,
      new_total: newQty * price,

      note: "Quantity updated",
    });

  if (logErr) console.error("Log error:", logErr);
}

/**
 * Update price and log change
 */
export async function updateItemPrice({
  user,
  saleId,
  itemId,
  newPrice,
}) {
  const { data: oldItem } = await supabase
    .from("sale_items")
    .select("id, product_id, batch_id, qty, sell_price")
    .eq("id", itemId)
    .single();

  const oldPrice = oldItem.sell_price;

  await supabase
    .from("sale_items")
    .update({ sell_price: newPrice })
    .eq("id", itemId);

  await supabase.from("sale_edit_logs").insert({
    user_id: user.id,
    sale_id: saleId,

    action: "UPDATE_PRICE",

    product_id: oldItem.product_id,
    batch_id: oldItem.batch_id,

    old_qty: oldItem.qty,
    new_qty: oldItem.qty,

    old_price: oldPrice,
    new_price: newPrice,

    old_total: oldItem.qty * oldPrice,
    new_total: oldItem.qty * newPrice,

    note: "Price updated",
  });
}

/**
 * Remove item and log
 */
export async function removeItem({
  user,
  saleId,
  item,
}) {
  await supabase.from("sale_items").delete().eq("id", item.id);

  await supabase.from("sale_edit_logs").insert({
    user_id: user.id,
    sale_id: saleId,

    action: "REMOVE_ITEM",

    product_id: item.product_id,
    batch_id: item.batch_id,

    old_qty: item.qty,
    new_qty: 0,

    old_price: item.sell_price,
    new_price: 0,

    old_total: item.qty * item.sell_price,
    new_total: 0,

    note: "Item removed",
  });
}

/**
 * Add new item and log
 */
export async function addItem({
  user,
  saleId,
  product_id,
  batch_id,
  qty,
  price,
}) {
  const { data: newItem } = await supabase
    .from("sale_items")
    .insert({
      sale_id: saleId,
      product_id,
      batch_id,
      qty,
      sell_price: price,
    })
    .select()
    .single();

  await supabase.from("sale_edit_logs").insert({
    user_id: user.id,
    sale_id: saleId,

    action: "ADD_ITEM",

    product_id,
    batch_id,

    old_qty: 0,
    new_qty: qty,

    old_price: 0,
    new_price: price,

    old_total: 0,
    new_total: qty * price,

    note: "Item added",
  });

  return newItem;
}