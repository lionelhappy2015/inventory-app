import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import BillDetails from "./BillDetails";
import * as XLSX from "xlsx";

export default function SalesHistory({ user }) {
  const [sales, setSales] = useState([]);
  const [grouped, setGrouped] = useState({});
  const [selectedSale, setSelectedSale] = useState(null);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    fetchSales();
  }, []);

  async function fetchSales() {
    let query = supabase
      .from("sales")
      .select("*, customers(name)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (from) query = query.gte("created_at", from);
    if (to) query = query.lte("created_at", to);

    const { data } = await query;
    setSales(data || []);
    groupByDate(data || []);
  }

  // =====================
  // GROUP BY DATE
  // =====================
  function groupByDate(data) {
    const groupedData = {};

    data.forEach((sale) => {
      const date = new Date(sale.created_at).toLocaleDateString();

      if (!groupedData[date]) {
        groupedData[date] = {
          total: 0,
          bills: [],
        };
      }

      groupedData[date].total += Number(sale.final_amount);
      groupedData[date].bills.push(sale);
    });

    setGrouped(groupedData);
  }

  // =====================
  // EXPORT
  // =====================
  async function exportExcel() {
    if (sales.length === 0) return;

    const wb = XLSX.utils.book_new();

    for (let sale of sales) {
      const { data: items } = await supabase
        .from("sale_items")
        .select("*, products(name, size)")
        .eq("sale_id", sale.id);

      const rows = items.map((i) => ({
        Product: i.products?.name,
        Size: i.products?.size,
        Qty: i.qty,
        Price: i.sell_price,
        Total: i.sell_price * i.qty,
        Profit: (i.sell_price - i.buy_price) * i.qty,
      }));

      rows.push({});
      rows.push({ Product: "TOTAL", Total: sale.final_amount });

      const ws = XLSX.utils.json_to_sheet(rows);

      XLSX.utils.book_append_sheet(
        wb,
        ws,
        sale.id.slice(0, 6)
      );
    }

    XLSX.writeFile(wb, "Sales.xlsx");
  }

  // =====================
  // BILL VIEW
  // =====================
  if (selectedSale) {
    return (
      <BillDetails
        sale={selectedSale}
        onBack={() => setSelectedSale(null)}
      />
    );
  }

  return (
    <div>
      <h2>Sales History</h2>

      {/* FILTER */}
      <div style={styles.filter}>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        <button onClick={fetchSales}>Filter</button>
        <button onClick={exportExcel}>Export</button>
      </div>

      {/* GROUPED LIST */}
      {Object.keys(grouped).map((date) => (
        <div key={date} style={styles.dayBlock}>
          {/* DATE HEADER */}
          <div style={styles.dayHeader}>
            <strong>{date}</strong>
            <span>₹{grouped[date].total}</span>
          </div>

          {/* BILLS */}
          {grouped[date].bills.map((s) => (
            <div
              key={s.id}
              style={styles.card}
              onClick={() => setSelectedSale(s)}
            >
              <div>
                <strong>Invoice #{s.id.slice(0, 6)}</strong>
                <p>{s.customers?.name}</p>
              </div>

              <div style={{ textAlign: "right" }}>
                <p>₹{s.final_amount}</p>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

const styles = {
  filter: {
    display: "flex",
    gap: 10,
    marginBottom: 15,
    flexWrap: "wrap",
  },

  dayBlock: {
    marginBottom: 20,
  },

  dayHeader: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 10,
    background: "#eef2f7",
    padding: 10,
    borderRadius: 8,
  },

  card: {
    background: "#fff",
    padding: 12,
    borderRadius: 8,
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 8,
    cursor: "pointer",
  },
};