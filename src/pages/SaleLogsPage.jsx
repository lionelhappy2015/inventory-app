import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import * as XLSX from "xlsx";
import { formatTimeIST, formatIST } from "../utils/time";

export default function SaleLogsPage({ user }) {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");

  useEffect(() => {
    fetchLogs();
  }, []);

  // ================= FETCH =================
  async function fetchLogs() {
    const { data: logsData, error } = await supabase
      .from("sale_edit_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching logs:", error);
      return;
    }

    const { data: products } = await supabase
      .from("products")
      .select("id, name, size");

    const { data: batches } = await supabase
      .from("product_batches")
      .select("id, batch_name");

    const mapped = (logsData || []).map((log) => {
      const product = products?.find(
        (p) => p.id === log.product_id
      );
      const batch = batches?.find(
        (b) => b.id === log.batch_id
      );

      return {
        ...log,
        product_name: product?.name || "-",
        product_size: product?.size || "",
        batch_name: batch?.batch_name || "-",
      };
    });

    setLogs(mapped);
    setFilteredLogs(mapped);
  }

  // ================= FILTER =================
  function filterByDate(date) {
    setSelectedDate(date);

    if (!date) {
      setFilteredLogs(logs);
      return;
    }

    const filtered = logs.filter((l) =>
      l.created_at?.startsWith(date)
    );

    setFilteredLogs(filtered);
  }

  // ================= GROUP =================
  const grouped = filteredLogs.reduce((acc, log) => {
    const date = log.created_at?.split("T")[0];

    if (!acc[date]) acc[date] = [];
    acc[date].push(log);

    return acc;
  }, {});

  // ================= ACTION LABELS =================
  const actionMap = {
    UPDATE_QTY: "Quantity Updated",
    ADD_ITEM: "Item Added",
    REMOVE_ITEM: "Item Removed",
    UPDATE_PRICE: "Price Updated",
  };

  // ================= EXPORT (FIXED) =================
  function exportExcel() {
    try {
      if (!filteredLogs || filteredLogs.length === 0) {
        alert("No logs to export");
        return;
      }

      const data = filteredLogs.map((l) => ({
        // ✅ IST TIME FIX
        Date: l.created_at
          ? formatIST(l.created_at + "Z")
          : "-",

        // ✅ INVOICE
        Invoice: l.sale_id ? `#${l.sale_id.slice(0, 6)}` : "-",

        // ✅ ACTION
        Action: actionMap[l.action] || l.action,

        // ✅ PRODUCT
        Product: `${l.product_name} (${l.product_size})`,

        // ✅ BATCH
        Batch: l.batch_name,

        // ✅ QUANTITY
        OldQuantity: l.old_qty ?? "-",
        NewQuantity: l.new_qty ?? "-",

        QuantityChange:
          l.old_qty != null && l.new_qty != null
            ? `${l.old_qty} → ${l.new_qty}`
            : "-",

        // ✅ PRICE
        OldRate: l.old_price ?? "-",
        NewRate: l.new_price ?? "-",

        // ✅ TOTAL (if exists)
        OldTotal: l.old_total ?? "-",
        NewTotal: l.new_total ?? "-",

        // ✅ NOTE
        Note: l.note || "",
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(wb, ws, "Sale Logs");

      XLSX.writeFile(wb, "sale_logs.xlsx");

    } catch (err) {
      console.error("Export failed:", err);
      alert("Export failed. Check console.");
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Sale Edit Logs</h2>

      {/* FILTER */}
      <div style={styles.filter}>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => filterByDate(e.target.value)}
        />

        <button
          style={styles.exportBtn}
          onClick={() => exportExcel()}
        >
          Export Excel
        </button>
      </div>

      {/* EMPTY */}
      {Object.keys(grouped).length === 0 && (
        <p>No logs found</p>
      )}

      {/* GROUPED */}
      {Object.entries(grouped).map(([date, logs]) => (
        <div key={date} style={styles.dateGroup}>
          <h3>{date}</h3>

          {logs.map((log) => (
            <div key={log.id} style={styles.card}>
              
              <div style={styles.row}>
                <strong>
                  {actionMap[log.action] || log.action}
                </strong>

                {/* ✅ IST TIME FIX */}
                <span>
                  {log.created_at
                    ? formatTimeIST(log.created_at + "Z")
                    : "-"}
                </span>
              </div>

              <p>
                <b>Invoice:</b>{" "}
                {log.sale_id
                  ? `#${log.sale_id.slice(0, 6)}`
                  : "-"}
              </p>

              <div style={styles.details}>
                <p>
                  <b>Product:</b> {log.product_name} (
                  {log.product_size})
                </p>

                <p>
                  <b>Batch:</b> {log.batch_name}
                </p>

                <p>
                  <b>Stock Change:</b>{" "}
                  {log.old_qty ?? "-"} →{" "}
                  {log.new_qty ?? "-"}
                </p>

                <p>
                  <b>Price Change:</b> ₹
                  {log.old_price ?? "-"} → ₹
                  {log.new_price ?? "-"}
                </p>

                {log.note && (
                  <p>
                    <b>Note:</b> {log.note}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ================= STYLES =================
const styles = {
  filter: {
    display: "flex",
    gap: 10,
    marginBottom: 20,
  },

  exportBtn: {
    padding: "6px 12px",
    background: "#000",
    color: "#fff",
    borderRadius: 6,
    cursor: "pointer",
  },

  dateGroup: {
    marginBottom: 30,
  },

  card: {
    background: "#fff",
    padding: 12,
    marginBottom: 10,
    borderRadius: 8,
    borderLeft: "4px solid #e67e22",
  },

  row: {
    display: "flex",
    justifyContent: "space-between",
  },

  details: {
    marginTop: 8,
    fontSize: 14,
    color: "#555",
  },
};