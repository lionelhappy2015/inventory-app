import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function DueDashboard({ user }) {
  const [dues, setDues] = useState([]);
  const [selected, setSelected] = useState(null);
  const [logs, setLogs] = useState([]);
  const [amount, setAmount] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);
  const [loading, setLoading] = useState(true);

  // ✅ NEW STATES
  const [processing, setProcessing] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [totalDue, setTotalDue] = useState(0);

  useEffect(() => {
    fetchDues();
  }, []);

  async function fetchDues() {
    setLoading(true);

    const { data, error } = await supabase
      .from("sale_dues")
      .select(`
        *,
        sales (
          id,
          created_at,
          customers ( name )
        )
      `)
      .in("status", ["DUE", "PARTIAL"])
      .gt("due_amount", 0)
      .order("updated_at", { ascending: false });

    if (error) console.error(error);

    setDues(data || []);

    // ✅ TOTAL CALCULATION
    const total = (data || []).reduce(
      (sum, d) => sum + Number(d.due_amount),
      0
    );
    setTotalDue(total);

    setLoading(false);
  }

  async function fetchLogs(dueId) {
    let query = supabase
      .from("sale_due_payments")
      .select("*")
      .eq("due_id", dueId);

    if (!showDeleted) {
      query = query.eq("is_deleted", false);
    }

    const { data } = await query.order("created_at", { ascending: false });
    setLogs(data || []);
  }

  // =========================
  // PAY (UPDATED)
  // =========================
  async function handlePay() {
    if (processing) return;

    const payAmount = Number(amount);

    if (!selected) return;

    if (payAmount <= 0) {
      alert("Amount must be greater than 0");
      return;
    }

    if (payAmount > selected.due_amount) {
      alert("Cannot pay more than remaining due");
      return;
    }

    // ✅ CONFIRMATION
    const confirmPay = window.confirm(
      `Confirm payment of ₹${payAmount}?`
    );
    if (!confirmPay) return;

    setProcessing(true);

    const newPaid = selected.paid_amount + payAmount;
    const newDue = selected.due_amount - payAmount;
    const status = newDue === 0 ? "PAID" : "PARTIAL";

    // 🔊 SOUND (optional file)
    const audio = new Audio("/success.mp3");
    audio.play().catch(() => {});

    // ✅ UPDATE TOTAL
    setTotalDue((prev) => prev - payAmount);

    // ✅ REMOVE WITH ANIMATION IF FULLY PAID
    if (newDue === 0) {
      setRemovingId(selected.id);

      setTimeout(() => {
        setDues((prev) => prev.filter((d) => d.id !== selected.id));
        setRemovingId(null);
      }, 300);

      setSelected(null); // clear details
    }

    try {
      await supabase
        .from("sale_dues")
        .update({
          paid_amount: newPaid,
          due_amount: newDue,
          status,
          updated_at: new Date(),
        })
        .eq("id", selected.id);

      await supabase.from("sale_due_payments").insert({
        sale_id: selected.sale_id,
        due_id: selected.id,
        amount_paid: payAmount,
        note: "payment",
        user_id: user.id,
      });

    } catch (err) {
      console.error(err);
      fetchDues(); // rollback
    }

    setAmount("");
    setProcessing(false);
  }

  // =========================
  // UNDO
  // =========================
  async function undoPayment(log) {
    if (!window.confirm("Undo this payment?")) return;

    const { data: due } = await supabase
      .from("sale_dues")
      .select("*")
      .eq("id", log.due_id)
      .single();

    const newPaid = due.paid_amount - log.amount_paid;
    const newDue = due.due_amount + log.amount_paid;

    let status = "DUE";
    if (newPaid > 0 && newDue > 0) status = "PARTIAL";
    if (newDue === 0) status = "PAID";

    await supabase
      .from("sale_dues")
      .update({
        paid_amount: newPaid,
        due_amount: newDue,
        status,
        updated_at: new Date(),
      })
      .eq("id", due.id);

    await supabase
      .from("sale_due_payments")
      .update({
        is_deleted: true,
        deleted_at: new Date(),
        deleted_by: user.id,
      })
      .eq("id", log.id);

    fetchDues();
    fetchLogs(due.id);
  }

  // =========================
  // EXPORT
  // =========================
  function exportCSV() {
    const csv =
      "Customer,Total,Paid,Due,Status\n" +
      dues
        .map(
          (d) =>
            `${d.sales?.customers?.name || "Walk-in"},${d.total_amount},${d.paid_amount},${d.due_amount},${d.status}`
        )
        .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "dues.csv";
    a.click();
  }

  const statusColor = (status) => {
    if (status === "PAID") return "#2ecc71";
    if (status === "PARTIAL") return "#f39c12";
    return "#e74c3c";
  };

  return (
    <div style={styles.container}>
      {/* 🔥 TOTAL DISPLAY */}
      <div style={styles.topSummary}>
        <h2>Total Outstanding: ₹{totalDue}</h2>
      </div>

      {/* LEFT */}
      <div style={styles.left}>
        <div style={styles.header}>
          <h2>All Dues</h2>
          <button onClick={exportCSV} style={styles.exportBtn}>
            Export CSV
          </button>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : (
          dues.map((d) => (
            <div
              key={d.id}
              style={{
                ...styles.card,
                opacity: removingId === d.id ? 0 : 1,
                transform:
                  removingId === d.id
                    ? "translateX(20px)"
                    : "translateX(0px)",
                transition: "all 0.3s ease",
              }}
              onClick={() => {
                setSelected(d);
                fetchLogs(d.id);
              }}
            >
              <div style={styles.cardTop}>
                <b>{d.sales?.customers?.name || "Walk-in"}</b>
                <span
                  style={{
                    ...styles.badge,
                    background: statusColor(d.status),
                  }}
                >
                  {d.status}
                </span>
              </div>

              <p>Due: ₹{d.due_amount}</p>
            </div>
          ))
        )}
      </div>

      {/* MIDDLE */}
      <div style={styles.middle}>
        {selected ? (
          <>
            <h3>Details</h3>
            <p>Total: ₹{selected.total_amount}</p>
            <p>Paid: ₹{selected.paid_amount}</p>
            <p>Due: ₹{selected.due_amount}</p>

            <div style={styles.payBox}>
              <input
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={styles.input}
              />
              <button
                onClick={handlePay}
                disabled={processing}
                style={{
                  ...styles.payBtn,
                  opacity: processing ? 0.6 : 1,
                }}
              >
                {processing ? "Processing..." : "Pay"}
              </button>
            </div>
          </>
        ) : (
          <p>Select a due</p>
        )}
      </div>

      {/* RIGHT */}
      <div style={styles.right}>
        <h3>Logs</h3>

        <label style={{ fontSize: 13 }}>
          <input
            type="checkbox"
            checked={showDeleted}
            onChange={() => {
              setShowDeleted(!showDeleted);
              if (selected) fetchLogs(selected.id);
            }}
          />
          Show Deleted
        </label>

        {logs.map((log) => (
          <div
            key={log.id}
            style={{
              ...styles.logCard,
              opacity: log.is_deleted ? 0.4 : 1,
            }}
          >
            <p>₹{log.amount_paid}</p>
            <small>{new Date(log.created_at).toLocaleString()}</small>

            {!log.is_deleted && (
              <button
                onClick={() => undoPayment(log)}
                style={styles.undoBtn}
              >
                Undo
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ================= STYLES =================
const styles = {
  container: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "20px",
  },

  topSummary: {
    gridColumn: "span 3",
    background: "#fff",
    padding: "15px",
    borderRadius: "10px",
    fontWeight: "bold",
  },

  left: { background: "#fff", padding: "15px", borderRadius: "10px" },
  middle: { background: "#fff", padding: "15px", borderRadius: "10px" },
  right: { background: "#fff", padding: "15px", borderRadius: "10px" },

  header: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "10px",
  },

  exportBtn: {
    background: "#3498db",
    color: "#fff",
    border: "none",
    padding: "6px 10px",
    borderRadius: "6px",
    cursor: "pointer",
  },

  card: {
    border: "1px solid #eee",
    padding: "10px",
    borderRadius: "8px",
    marginBottom: "8px",
    cursor: "pointer",
  },

  cardTop: {
    display: "flex",
    justifyContent: "space-between",
  },

  badge: {
    color: "#fff",
    padding: "2px 8px",
    borderRadius: "6px",
    fontSize: "12px",
  },

  payBox: {
    display: "flex",
    marginTop: "10px",
  },

  input: {
    flex: 1,
    padding: "8px",
    border: "1px solid #ccc",
  },

  payBtn: {
    marginLeft: "10px",
    background: "#2ecc71",
    color: "#fff",
    border: "none",
    padding: "8px 12px",
    borderRadius: "6px",
  },

  logCard: {
    border: "1px solid #eee",
    padding: "8px",
    marginTop: "8px",
    borderRadius: "6px",
  },

  undoBtn: {
    marginTop: "5px",
    color: "red",
    border: "none",
    background: "none",
    cursor: "pointer",
  },
};