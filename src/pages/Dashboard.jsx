import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function Dashboard({ user }) {
  const [stats, setStats] = useState({
    todaySales: 0,
    todayProfit: 0,
    totalDue: 0,
    totalSales: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    setLoading(true);

    const today = new Date().toISOString().split("T")[0];

    // 🔥 TODAY SALES + PROFIT
    const { data: todayData } = await supabase
      .from("sales")
      .select("final_amount, total_profit")
      .eq("user_id", user.id)
      .gte("created_at", today);

    let todaySales = 0;
    let todayProfit = 0;

    todayData?.forEach((s) => {
      todaySales += Number(s.final_amount || 0);
      todayProfit += Number(s.total_profit || 0);
    });

    // 🔥 TOTAL DUE
    const { data: dueData } = await supabase
      .from("sales")
      .select("due_amount")
      .eq("user_id", user.id);

    let totalDue = 0;
    dueData?.forEach((d) => {
      totalDue += Number(d.due_amount || 0);
    });

    // 🔥 TOTAL SALES
    const { data: totalSalesData } = await supabase
      .from("sales")
      .select("final_amount")
      .eq("user_id", user.id);

    let totalSales = 0;
    totalSalesData?.forEach((s) => {
      totalSales += Number(s.final_amount || 0);
    });

    setStats({
      todaySales,
      todayProfit,
      totalDue,
      totalSales,
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