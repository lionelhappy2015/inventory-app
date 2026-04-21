import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import * as XLSX from "xlsx";

export default function SalesDashboard({ user }) {
  const [date, setDate] = useState("");
  const [data, setData] = useState([]);
  const [lowStock, setLowStock] = useState([]);

  useEffect(() => {
    if (date) fetchData();
  }, [date]);

  async function fetchData() {
    // 🔥 FETCH ONLY REQUIRED DATA
    const { data: items } = await supabase
      .from("sale_items")
      .select("product_id, qty, products(name,size)")
      .gte("created_at", date + "T00:00:00")
      .lte("created_at", date + "T23:59:59")
      .eq("user_id", user.id);

    const map = {};

    items?.forEach((i) => {
      if (!map[i.product_id]) {
        map[i.product_id] = {
          id: i.product_id,
          name: i.products?.name,
          size: i.products?.size,
          total: 0,
        };
      }
      map[i.product_id].total += Number(i.qty || 0);
    });

    const result = Object.values(map).sort((a, b) => b.total - a.total);
    setData(result);

    // 🔥 FETCH STOCK
    const { data: batches } = await supabase
      .from("product_batches")
      .select("product_id, remaining_qty");

    const stockMap = {};
    batches?.forEach((b) => {
      stockMap[b.product_id] =
        (stockMap[b.product_id] || 0) + b.remaining_qty;
    });

    // 🔥 HIGH DEMAND + LOW STOCK
    const risky = result
      .map((p) => ({
        ...p,
        stock: stockMap[p.id] || 0,
      }))
      .filter((p) => p.stock <= 5)
      .sort((a, b) => b.total - a.total);

    setLowStock(risky);
  }

  // 🔥 EXPORT
  function exportExcel() {
    const sheet = data.map((d) => ({
      Product: `${d.name} (${d.size})`,
      Sold: d.total,
    }));

    const ws = XLSX.utils.json_to_sheet(sheet);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sales");

    XLSX.writeFile(wb, "sales_dashboard.xlsx");
  }

  const max = Math.max(...data.map((d) => d.total), 1);

  return (
    <div style={{ padding: 20 }}>
      <h2>Sales Dashboard</h2>

      {/* 📅 DATE PICKER */}
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        style={styles.date}
      />

      <button onClick={exportExcel} style={styles.export}>
        Export Excel
      </button>

      {/* 📊 TOP PRODUCTS */}
      <h3>Top Selling</h3>

      {data.map((d) => (
        <div key={d.id} style={styles.card}>
          <div style={{ width: "40%" }}>
            {d.name} ({d.size})
          </div>

          {/* 🔥 BAR GRAPH */}
          <div style={styles.barContainer}>
            <div
              style={{
                ...styles.bar,
                width: `${(d.total / max) * 100}%`,
              }}
            />
          </div>

          <strong>{d.total}</strong>
        </div>
      ))}

      {/* ⚠ LOW STOCK */}
      <h3 style={{ marginTop: 30 }}>High Demand + Low Stock</h3>

      {lowStock.map((d) => (
        <div key={d.id} style={styles.lowCard}>
          <span>
            {d.name} ({d.size})
          </span>

          <span>Sold: {d.total}</span>

          <span style={{ color: "red" }}>
            Stock: {d.stock}
          </span>
        </div>
      ))}
    </div>
  );
}

const styles = {
  date: {
    padding: 8,
    marginBottom: 15,
    marginRight: 10,
  },

  export: {
    padding: "8px 12px",
    background: "#000",
    color: "#fff",
    borderRadius: 6,
  },

  card: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: 10,
    background: "#fff",
    marginBottom: 8,
    borderRadius: 6,
  },

  barContainer: {
    flex: 1,
    height: 10,
    background: "#eee",
    borderRadius: 6,
  },

  bar: {
    height: "100%",
    background: "#2ecc71",
    borderRadius: 6,
  },

  lowCard: {
    display: "flex",
    justifyContent: "space-between",
    padding: 12,
    background: "#fff",
    marginBottom: 8,
    borderLeft: "4px solid red",
    borderRadius: 6,
  },
};