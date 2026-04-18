import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function Sales({ user }) {
  const [products, setProducts] = useState([]);
  const [batches, setBatches] = useState([]);

  const [productId, setProductId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [qty, setQty] = useState("");

  const [popup, setPopup] = useState("");

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    const { data } = await supabase.from("products").select("*");
    setProducts(data || []);
  }

  async function fetchBatches(pid) {
    const { data } = await supabase
      .from("product_batches")
      .select("*")
      .eq("product_id", pid);

    setBatches(data || []);
  }

  // ======================
  // SELL FUNCTION
  // ======================
  async function handleSell() {
    if (!productId || !batchId || !qty) {
      setPopup("Fill all fields");
      return;
    }

    const batch = batches.find((b) => b.id === batchId);

    if (!batch) {
      setPopup("Batch not found");
      return;
    }

    const sellQty = Number(qty);

    if (sellQty > batch.remaining_qty) {
      setPopup("Not enough stock ❌");
      return;
    }

    const profit = (batch.sell_price - batch.buy_price) * sellQty;

    // 1️⃣ CREATE SALE
    const { data: saleData } = await supabase
      .from("sales")
      .insert([
        {
          user_id: user.id,
          total_amount: batch.sell_price * sellQty,
          final_amount: batch.sell_price * sellQty,
          paid_amount: batch.sell_price * sellQty,
          due_amount: 0,
          payment_status: "PAID",
          total_profit: profit,
        },
      ])
      .select()
      .single();

    // 2️⃣ SALE ITEM
    await supabase.from("sale_items").insert([
      {
        user_id: user.id,
        sale_id: saleData.id,
        product_id: productId,
        batch_id: batchId,
        qty: sellQty,
        sell_price: batch.sell_price,
        buy_price: batch.buy_price,
      },
    ]);

    // 3️⃣ UPDATE STOCK
    await supabase
      .from("product_batches")
      .update({
        remaining_qty: batch.remaining_qty - sellQty,
      })
      .eq("id", batchId);

    // 4️⃣ STOCK HISTORY (OUTWARD)
    await supabase.from("stock_entries").insert([
      {
        user_id: user.id,
        product_id: productId,
        batch_id: batchId,
        qty_added: -sellQty, // 🔥 negative means sold
      },
    ]);

    setPopup("Sale done ✅");
    setQty("");
    fetchBatches(productId);
  }

  return (
    <div>
      <h2>Sales</h2>

      <div style={styles.form}>
        <select
          value={productId}
          onChange={(e) => {
            setProductId(e.target.value);
            fetchBatches(e.target.value);
          }}
        >
          <option value="">Select Product</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} {p.size}
            </option>
          ))}
        </select>

        <select
          value={batchId}
          onChange={(e) => setBatchId(e.target.value)}
        >
          <option value="">Select Batch</option>
          {batches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.batch_name} (Stock: {b.remaining_qty})
            </option>
          ))}
        </select>

        <input
          type="number"
          placeholder="Quantity"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
        />

        <button onClick={handleSell}>Sell</button>
      </div>

      {popup && (
        <div style={styles.popup}>
          {popup}
          <button onClick={() => setPopup("")}>OK</button>
        </div>
      )}
    </div>
  );
}

const styles = {
  form: {
    display: "flex",
    gap: 10,
    marginTop: 20,
  },
  popup: {
    position: "fixed",
    top: 20,
    right: 20,
    background: "#27ae60",
    color: "#fff",
    padding: 10,
    borderRadius: 6,
  },
};