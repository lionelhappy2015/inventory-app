import { useState } from "react";
import Dashboard from "../pages/Dashboard";
import Products from "../pages/Products";
export default function Layout({ user }) {
  const [page, setPage] = useState("dashboard");

  function renderPage() {
    if (page === "dashboard") return <Dashboard user={user} />;
    if (page === "products") return <Products user={user} />;
    if (page === "sales") return <h2>Sales</h2>;
    if (page === "history") return <h2>History</h2>;
    if (page === "credit") return <h2>Credit</h2>;
  }

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <h2 style={{ color: "#fff" }}>Inventory</h2>

        <NavButton label="Dashboard" active={page === "dashboard"} onClick={() => setPage("dashboard")} />
        <NavButton label="Products" active={page === "products"} onClick={() => setPage("products")} />
        <NavButton label="Sales" active={page === "sales"} onClick={() => setPage("sales")} />
        <NavButton label="History" active={page === "history"} onClick={() => setPage("history")} />
        <NavButton label="Credit" active={page === "credit"} onClick={() => setPage("credit")} />
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

// =====================
// NAV BUTTON WITH HOVER
// =====================
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

// =====================
// STYLES
// =====================
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