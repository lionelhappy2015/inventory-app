import { useState } from "react";

import Dashboard from "../pages/Dashboard";
import Products from "../pages/Products";
import Batch from "../pages/Batch";
import AddStock from "../pages/AddStock";

import Export from "../pages/Export";

import SalesHistory from "../pages/SalesHistory";
import Customers from "../pages/Customers";

import EditInvoiceSelect from "../pages/editStock/EditInvoiceSelect";
import SalesFlow from "../pages/salesPage/SalesFlow";
import SaleLogsPage from "../pages/SaleLogsPage";
import SalesDashboard from "../pages/SalesDashboard";
import InventoryDashboard from "../pages/InventoryDashboard";
import DueDashboard from "../pages/DueDashboard";

export default function Layout({ user }) {
  const [page, setPage] = useState("dashboard");

  function renderPage() {
    if (page === "dashboard") return <Dashboard user={user} />;
    if (page === "products") return <Products user={user} />;
    if (page === "batch") return <Batch user={user} />;
    if (page === "stock") return <AddStock user={user} />;
    if (page === "sales") return <SalesFlow user={user} />;
    if (page === "salesHistory") return <SalesHistory user={user} />;
    if (page === "editStock") return <EditInvoiceSelect user={user} />;
    if (page === "sale_logs") return <SaleLogsPage user={user} />;
    if (page === "salesDashboard") return <SalesDashboard user={user} />;
    if (page === "inventoryDashboard") return <InventoryDashboard user={user} />;
    
    

    if (page === "dues") return <DueDashboard user={user} />;

   
    if (page === "export") return <Export user={user} />;
    if (page === "customers") return <Customers user={user} />;
  }

  return (
    <div style={styles.container}>
      {/* SIDEBAR */}
      <div style={styles.sidebar}>
        <h2 style={{ color: "#fff" }}>Inventory</h2>
        <NavButton
  label="Inventory Dashboard"
  active={page === "inventoryDashboard"}
  onClick={() => setPage("inventoryDashboard")}
/>
        <NavButton label="Dashboard" active={page === "dashboard"} onClick={() => setPage("dashboard")} />
        <NavButton label="Products" active={page === "products"} onClick={() => setPage("products")} />
        <NavButton label="Batch" active={page === "batch"} onClick={() => setPage("batch")} />
        <NavButton label="Add Stock" active={page === "stock"} onClick={() => setPage("stock")} />

        <NavButton
  label="Sales"
  active={page === "saless"}
  onClick={() => setPage("sales")}
/>
        
<NavButton 
  label="Dues / Credit" 
  active={page === "dues"} 
  onClick={() => setPage("dues")} 
/>
        <NavButton
  label="Customers"
  active={page === "customers"}
  onClick={() => setPage("customers")}
/>

<NavButton
  label="Sales Dashboard"
  active={page === "salesDashboard"}
  onClick={() => setPage("salesDashboard")}
/>

<NavButton
  label="Sales History"
  active={page === "salesHistory"}
  onClick={() => setPage("salesHistory")}
/>

<NavButton
  label="Edit Invoice"
  active={page === "editStock"}
  onClick={() => setPage("editStock")}
/>

<NavButton 
  label="AUDIT Sale edit Logs" 
  active={page === "sale_logs"} 
  onClick={() => setPage("sale_logs")} 
/>
       


<NavButton
  label="Stock Add history Export"
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