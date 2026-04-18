import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import * as XLSX from "xlsx";

export default function CustomerDetails({ customer, onBack }) {
  const [sales, setSales] = useState([]);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    fetchSales();
  }, [fromDate, toDate]);

  async function fetchSales() {
    let query = supabase
      .from("sales")
      .select("*")
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false });

    if (fromDate) query = query.gte("created_at", fromDate);
    if (toDate) query = query.lte("created_at", toDate + "T23:59:59");

    const { data } = await query;
    setSales(data || []);
  }

  // ======================
  // EXPORT EXCEL
  // ======================
  async function exportExcel() {
    if (sales.length === 0) return;

    const wb = XLSX.utils.book_new();

    for (let sale of sales) {
      const { data: items } = await supabase
        .from("sale_items")
        .select(`
          *,
          products(name, size),
          product_batches(batch_name)
        `)
        .eq("sale_id", sale.id);

      const rows = items.map((i) => ({
        Product: `${i.products?.name} (${i.products?.size})`,
        Batch: i.product_batches?.batch_name,
        Quantity: i.qty,
        Price: i.sell_price,
        Total: i.qty * i.sell_price,
      }));

      rows.push({});
      rows.push({
        Product: "TOTAL",
        Total: sale.final_amount,
      });

      const ws = XLSX.utils.json_to_sheet(rows);

      XLSX.utils.book_append_sheet(
        wb,
        ws,
        `Bill_${sale.id.slice(0, 6)}`
      );
    }

    XLSX.writeFile(wb, `${customer.name}_report.xlsx`);
  }

  // ======================
  // TOTAL DUE
  // ======================
  const totalDue = sales.reduce(
    (sum, s) => sum + Number(s.due_amount || 0),
    0
  );

  return (
    <div style={{ padding: 20 }}>
      <button onClick={onBack}>← Back</button>

      <h2>{customer.name}</h2>
      <p>{customer.phone}</p>

      <h3>Total Due: ₹{totalDue}</h3>

      {/* FILTER */}
      <div style={{ display: "flex", gap: 10, marginBottom: 15 }}>
        <input type="date" onChange={(e) => setFromDate(e.target.value)} />
        <input type="date" onChange={(e) => setToDate(e.target.value)} />
        <button onClick={exportExcel}>Export</button>
      </div>

      {/* SALES */}
      {sales.length === 0 ? (
        <p>No bills found</p>
      ) : (
        sales.map((s) => (
          <div key={s.id} style={styles.card}>
            <strong>Bill #{s.id.slice(0, 6)}</strong>
            <p>Total: ₹{s.final_amount}</p>
            <p>Due: ₹{s.due_amount}</p>
            <p>{new Date(s.created_at).toLocaleString()}</p>
          </div>
        ))
      )}
    </div>
  );
}

const styles = {
  card: {
    background: "#fff",
    padding: 12,
    marginBottom: 10,
    borderRadius: 8,
  },
};