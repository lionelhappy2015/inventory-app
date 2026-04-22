import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function InventoryDashboard({ user }) {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const { data: batches } = await supabase
      .from("product_batches")
      .select(
        "product_id, quantity, remaining_qty, buy_price, sell_price, products(name,size)"
      )
      .eq("user_id", user.id);

    const map = {};

    batches?.forEach((b) => {
      const key = b.product_id;

      if (!map[key]) {
        map[key] = {
          name: b.products?.name,
          size: b.products?.size,
          total_qty: 0,
          remaining: 0,
          total_buy: 0,
          total_sell: 0,
        };
      }

      map[key].total_qty += Number(b.quantity || 0);
      map[key].remaining += Number(b.remaining_qty || 0);

      map[key].total_buy +=
        Number(b.buy_price || 0) * Number(b.quantity || 0);

      map[key].total_sell +=
        Number(b.sell_price || 0) * Number(b.quantity || 0);
    });

    const result = Object.values(map).map((p) => {
      const avg_buy = p.total_qty ? p.total_buy / p.total_qty : 0;
      const avg_sell = p.total_qty ? p.total_sell / p.total_qty : 0;

      const stock_value = avg_sell * p.remaining;
      const cost_value = avg_buy * p.remaining;
      const profit = stock_value - cost_value;

      return {
        ...p,
        avg_buy,
        avg_sell,
        stock_value,
        cost_value,
        profit,
      };
    });

    setData(result);
  }

  // 🔍 SEARCH
  const filtered = data.filter((p) =>
    `${p.name} ${p.size}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  // 🔥 TOTAL SUMMARY
  const totalStockValue = filtered.reduce(
    (sum, p) => sum + p.stock_value,
    0
  );

  const totalCostValue = filtered.reduce(
    (sum, p) => sum + p.cost_value,
    0
  );

  const totalProfit = filtered.reduce(
    (sum, p) => sum + p.profit,
    0
  );

  return (
    <div style={{ padding: 20 }}>
      <h2>Inventory Dashboard</h2>

      {/* 🔍 SEARCH */}
      <input
        placeholder="Search product..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={styles.search}
      />

      {/* TABLE */}
      <div style={styles.table}>
        <div style={styles.header}>
          <span>Product</span>
          <span>Stock</span>
          <span>Total Buy ₹</span>
          <span>Total Sell ₹</span>
          <span>Avg Buy</span>
          <span>Avg Sell</span>
          <span>Stock ₹</span>
          <span>Profit ₹</span>
        </div>

        {filtered.map((p, i) => (
          <div key={i} style={styles.row}>
            <span>
              {p.name} ({p.size})
            </span>

            <span style={{ color: p.remaining <= 5 ? "red" : "black" }}>
              {p.remaining}
            </span>

            <span>₹{p.total_buy.toFixed(0)}</span>
            <span>₹{p.total_sell.toFixed(0)}</span>

            <span>₹{p.avg_buy.toFixed(1)}</span>
            <span>₹{p.avg_sell.toFixed(1)}</span>

            <span>₹{p.stock_value.toFixed(0)}</span>

            <span style={{ color: p.profit < 0 ? "red" : "green" }}>
              ₹{p.profit.toFixed(0)}
            </span>
          </div>
        ))}
      </div>

      {/* 🔥 SUMMARY */}
      <div style={styles.summary}>
        <h3>Overall Summary</h3>

        <div>Total Stock Value: ₹{totalStockValue.toFixed(0)}</div>
        <div>Total Cost Value: ₹{totalCostValue.toFixed(0)}</div>

        <div style={{ fontSize: 18, fontWeight: "bold" }}>
          Total Profit: ₹{totalProfit.toFixed(0)}
        </div>
      </div>
    </div>
  );
}

const styles = {
  search: {
    padding: 10,
    marginBottom: 15,
    width: "100%",
    borderRadius: 6,
    border: "1px solid #ccc",
  },

  table: {
    background: "#fff",
    borderRadius: 10,
    overflow: "hidden",
  },

  header: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr",
    background: "#2c3e50",
    color: "#fff",
    padding: 12,
    fontSize: 14,
  },

  row: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr",
    padding: 12,
    borderTop: "1px solid #eee",
    fontSize: 14,
  },

  summary: {
    marginTop: 25,
    padding: 15,
    background: "#fff",
    borderRadius: 10,
    border: "2px solid #2ecc71",
  },
};