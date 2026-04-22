import { supabase } from "../supabaseClient";

export async function reduceStock({
  user,
  product_id,
  batch_id,
  quantity,
  reason,
}) {
  // 1. get batch
  const { data: batch, error } = await supabase
    .from("product_batches")
    .select("remaining_qty")
    .eq("id", batch_id)
    .single();

  if (error || !batch) throw new Error("Batch not found");

  if (quantity > batch.remaining_qty) {
    throw new Error("Stock exceeded");
  }

  // 2. update stock
  await supabase
    .from("product_batches")
    .update({
      remaining_qty: batch.remaining_qty - quantity,
    })
    .eq("id", batch_id);

  // 3. insert log
  await supabase.from("stock_adjustments").insert([
    {
      user_id: user.id,
      product_id,
      batch_id,
      quantity,
      reason,
    },
  ]);
}