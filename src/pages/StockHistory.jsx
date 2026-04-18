import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function StockHistory({ user }) {
  const [entries, setEntries] = useState([]);
  const [productMap, setProductMap] = useState({});
  const [batchMap, setBatchMap] = useState({});
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchAll();
  }, [filter]);

  async function fetchAll() {
    // ======================
    // 1️⃣ FETCH PRODUCTS
    // ======================
    const { data: products } = await supabase
      .from("products")
      .select("*");

    const pMap = {};
    (products || []).forEach((p) => {
      pMap[p.id] = p;
    });

    setProductMap(pMap);

    // ======================
    // 2️⃣ FETCH BATCHES
    // ======================
    const { data: batches } = await supabase
      .from("product_batches")
      .select("*");

    const bMap = {};
    (batches || []).forEach((b) => {
      bMap[b.id] = b;
    });

    setBatchMap(bMap);

    // ======================
    // 3️⃣ FETCH ENTRIES (WITH FILTER)
    // ======================
    let query = supabase.from("stock_entries").select("*");

    if (filter === "today") {
      const today = new Date().toISOString().split("T")[0];
      query = query.gte("created_at", today);
    }

    if (filter === "week") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      query = query.gte("created_at", d.toISOString());
    }

    if (filter === "month") {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      query = query.gte("created_at", d.toISOString());
    }

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    console.log("ENTRIES:", data);

    setEntries(data || []);
  }

  return (
    <div>
      <h2>Stock History</h2>

      {/* FILTER */}
      <div style={styles.filter}>
        <button onClick={() => setFilter("all")}>All</button>
        <button onClick={() => setFilter("today")}>Today</button>
        <button onClick={() => setFilter("week")}>7 Days</button>
        <button onClick={() => setFilter("month")}>30 Days</button>
      </div>

      {/* LIST */}
      {entries.length === 0 ? (
        <p>No history found</p>
      ) : (
        entries.map((e) => {
          const product = productMap[e.product_id];
          const batch = batchMap[e.batch_id];

          return (
            <div key={e.id} style={styles.card}>
              <div>
                <strong>
                  {product
                    ? `${product.name} ${product.size}`
                    : "Unknown Product"}
                </strong>

                <p>
                  Batch:{" "}
                  {batch ? batch.batch_name : "Unknown Batch"}
                </p>
              </div>

              <div>
                <p>+{e.qty_added}</p>
                <p>{new Date(e.created_at).toLocaleString()}</p>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// ======================
// STYLES
// ======================
const styles = {
  filter: {
    display: "flex",
    gap: 10,
    marginBottom: 20,
  },
  card: {
    display: "flex",
    justifyContent: "space-between",
    padding: 15,
    background: "#fff",
    marginBottom: 10,
    borderRadius: 8,
  },
};