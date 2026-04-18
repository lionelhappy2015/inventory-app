import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function Export({ user }) {
  const [entries, setEntries] = useState([]);
  const [productMap, setProductMap] = useState({});
  const [batchMap, setBatchMap] = useState({});

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    fetchBaseData();
  }, []);

  // ======================
  // FETCH PRODUCTS & BATCHES
  // ======================
  async function fetchBaseData() {
    const { data: products } = await supabase.from("products").select("*");
    const { data: batches } = await supabase.from("product_batches").select("*");

    const pMap = {};
    (products || []).forEach((p) => (pMap[p.id] = p));
    setProductMap(pMap);

    const bMap = {};
    (batches || []).forEach((b) => (bMap[b.id] = b));
    setBatchMap(bMap);
  }

  // ======================
  // FETCH ENTRIES
  // ======================
  async function fetchEntries() {
    let query = supabase.from("stock_entries").select("*");

    if (fromDate) query = query.gte("created_at", fromDate);
    if (toDate) query = query.lte("created_at", toDate + "T23:59:59");

    const { data } = await query.order("created_at", {
      ascending: false,
    });

    setEntries(data || []);
  }

  // ======================
  // EXPORT CSV
  // ======================
  function exportCSV() {
    if (entries.length === 0) {
      alert("No data to export");
      return;
    }

    const rows = entries.map((e) => {
      const product = productMap[e.product_id];
      const batch = batchMap[e.batch_id];

      // 🔥 PRODUCT LEVEL CLOSING STOCK
      const closingStock = Object.values(batchMap)
        .filter((b) => b.product_id === e.product_id)
        .reduce((sum, b) => sum + Number(b.remaining_qty), 0);

      const dateObj = new Date(e.created_at);

      return {
        Product: product ? `${product.name} ${product.size}` : "",
        Batch: batch ? batch.batch_name : "",
        Quantity: e.qty_added,
        Date: dateObj.toLocaleDateString(),
        Time: dateObj.toLocaleTimeString(),
        Closing_Stock: closingStock,
      };
    });

    const headers = Object.keys(rows[0]);

    const csv =
      headers.join(",") +
      "\n" +
      rows.map((r) => headers.map((h) => r[h]).join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "stock_history.csv";
    a.click();
  }

  return (
    <div>
      <h2>Export Data</h2>

      <div style={styles.container}>
        <div style={styles.filters}>
          <div>
            <label>From</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>

          <div>
            <label>To</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
        </div>

        <div style={styles.buttons}>
          <button onClick={fetchEntries}>Load Data</button>
          <button onClick={exportCSV}>Export Excel</button>
        </div>
      </div>

      <p>Total Records: {entries.length}</p>
    </div>
  );
}

const styles = {
  container: {
    marginTop: 20,
    display: "flex",
    flexDirection: "column",
    gap: 15,
  },
  filters: {
    display: "flex",
    gap: 20,
  },
  buttons: {
    display: "flex",
    gap: 10,
  },
};