import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function Dashboard({ user }) {
  const [stats, setStats] = useState({
    todaySales: 0,
    todayProfit: 0,
    totalDue: 0,
    totalSales: 0,
    totalProfit: 0, // ✅ NEW
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    setLoading(true);

    const today = new Date().toISOString().split("T")[0];

    // 🔥 FETCH ALL SALES ONCE (OPTIMIZED)
    const { data, error } = await supabase
      .from("sales")
      .select("final_amount, total_profit, due_amount, created_at")
      .eq("user_id", user.id);

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    let todaySales = 0;
    let todayProfit = 0;
    let totalDue = 0;
    let totalSales = 0;
    let totalProfit = 0;

    data?.forEach((s) => {
      const saleDate = s.created_at?.split("T")[0];

      const amount = Number(s.final_amount || 0);
      const profit = Number(s.total_profit || 0);
      const due = Number(s.due_amount || 0);

      // ✅ TODAY
      if (saleDate === today) {
        todaySales += amount;
        todayProfit += profit;
      }

      // ✅ TOTALS
      totalSales += amount;
      totalProfit += profit;
      totalDue += due;
    });

    setStats({
      todaySales,
      todayProfit,
      totalDue,
      totalSales,
      totalProfit, // ✅ NEW
    });

    setLoading(false);
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Dashboard</h2>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div style={styles.grid}>
          <Card title="Today Sales" value={stats.todaySales} color="#3498db" />
          <Card title="Today Profit" value={stats.todayProfit} color="#2ecc71" />
          <Card title="Total Due" value={stats.totalDue} color="#e74c3c" />
          <Card title="Total Sales" value={stats.totalSales} color="#9b59b6" />

          {/* 🔥 NEW CARD */}
          <Card title="Total Profit" value={stats.totalProfit} color="#f39c12" />
        </div>
      )}
    </div>
  );
}

function Card({ title, value, color }) {
  return (
    <div style={{ ...styles.card, borderTop: `5px solid ${color}` }}>
      <h4 style={{ marginBottom: 10 }}>{title}</h4>
      <h2>₹ {Number(value).toFixed(2)}</h2>
    </div>
  );
}

const styles = {
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "20px",
    marginTop: "20px",
  },
  card: {
    background: "#fff",
    padding: "20px",
    borderRadius: "10px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  },
};