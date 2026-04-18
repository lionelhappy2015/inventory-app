import { useState } from "react";

import Dashboard from "../pages/Dashboard";
import Products from "../pages/Products";
import Batch from "../pages/Batch";
import AddStock from "../pages/AddStock";
import StockHistory from "../pages/StockHistory";
import Export from "../pages/Export";
import Sales from "../pages/Sales";
import Customers from "../pages/Customers";

export default function Layout({ user }) {
  const [page, setPage] = useState("dashboard");

  function renderPage() {
    if (page === "dashboard") return <Dashboard user={user} />;
    if (page === "products") return <Products user={user} />;
    if (page === "batch") return <Batch user={user} />;
    if (page === "stock") return <AddStock user={user} />;
    if (page === "sales") return <Sales user={user} />;
    if (page === "history") return <h2>History</h2>;
    if (page === "credit") return <h2>Credit</h2>;
    if (page === "stockHistory") return <StockHistory user={user} />;
    if (page === "export") return <Export user={user} />;
    if (page === "customers") return <Customers user={user} />;
  }

  return (
    <div style={styles.container}>
      {/* SIDEBAR */}
      <div style={styles.sidebar}>
        <h2 style={{ color: "#fff" }}>Inventory</h2>

        <NavButton label="Dashboard" active={page === "dashboard"} onClick={() => setPage("dashboard")} />
        <NavButton label="Products" active={page === "products"} onClick={() => setPage("products")} />
        <NavButton label="Batch" active={page === "batch"} onClick={() => setPage("batch")} />
        <NavButton label="Add Stock" active={page === "stock"} onClick={() => setPage("stock")} />

        <NavButton label="Sales" active={page === "sales"} onClick={() => setPage("sales")} />
        <NavButton label="History" active={page === "history"} onClick={() => setPage("history")} />
        <NavButton label="Credit" active={page === "credit"} onClick={() => setPage("credit")} />
        <NavButton
  label="Customers"
  active={page === "customers"}
  onClick={() => setPage("customers")}
/>
        <NavButton
  label="Stock History"
  active={page === "stockHistory"}
  onClick={() => setPage("stockHistory")}
/>

<NavButton
  label="Stock history Export"
  active={page === "export"}
  onClick={() => setPage("export")}
/>
      </div>

      {/* MAIN */}
      <div style={styles.main}>
        {/* TOPBAR */}
        <div style={styles.topbar}>
          <span>{user.email}</span>
        </div>

        {/* CONTENT */}
        <div style={styles.content}>{renderPage()}</div>
      </div>
    </div>
  );
}

// ======================
// NAV BUTTON
// ======================
function NavButton({ label, active, onClick }) {
  const [hover, setHover] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...styles.navBtn,
        background: active
          ? "#1abc9c"
          : hover
          ? "#3d566e"
          : "#34495e",
        transform: hover ? "translateX(5px)" : "translateX(0px)",
      }}
    >
      {label}
    </button>
  );
}

// ======================
// STYLES
// ======================
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
    color: "#fff",
    cursor: "pointer",
    textAlign: "left",
    transition: "all 0.2s ease",
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