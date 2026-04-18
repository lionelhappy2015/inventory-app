import { useState } from "react";
import Dashboard from "../pages/Dashboard";

export default function Layout({ user }) {
  const [page, setPage] = useState("dashboard");

  function renderPage() {
    if (page === "dashboard") return <Dashboard user={user} />;
    if (page === "products") return <h2>Products</h2>;
    if (page === "sales") return <h2>Sales</h2>;
    if (page === "history") return <h2>History</h2>;
    if (page === "credit") return <h2>Credit</h2>;
  }

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <h2 style={{ color: "#fff" }}>Inventory</h2>

        <NavButton label="Dashboard" onClick={() => setPage("dashboard")} />
        <NavButton label="Products" onClick={() => setPage("products")} />
        <NavButton label="Sales" onClick={() => setPage("sales")} />
        <NavButton label="History" onClick={() => setPage("history")} />
        <NavButton label="Credit" onClick={() => setPage("credit")} />
      </div>

      {/* Main */}
      <div style={styles.main}>
        {/* Topbar */}
        <div style={styles.topbar}>
          <span>{user.email}</span>
        </div>

        {/* Content */}
        <div style={styles.content}>{renderPage()}</div>
      </div>
    </div>
  );
}

function NavButton({ label, onClick }) {
  return (
    <button style={styles.navBtn} onClick={onClick}>
      {label}
    </button>
  );
}

const styles = {
  container: {
    display: "flex",
    height: "100vh",
    background: "#f5f6fa",
  },
  sidebar: {
    width: "220px",
    background: "#2c3e50",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  navBtn: {
    padding: "10px",
    border: "none",
    borderRadius: "6px",
    background: "#34495e",
    color: "#fff",
    cursor: "pointer",
    textAlign: "left",
  },
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },
  topbar: {
    height: "60px",
    background: "#fff",
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    padding: "0 20px",
    borderBottom: "1px solid #ddd",
  },
  content: {
    padding: "20px",
    overflow: "auto",
    flex: 1,
  },
};