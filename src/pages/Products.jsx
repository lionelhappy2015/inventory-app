import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function Products({ user }) {
  const [products, setProducts] = useState([]);
  const [stockMap, setStockMap] = useState({});

  useEffect(() => {
    fetchProducts();
    fetchStock();
  }, []);

  async function fetchProducts() {
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("user_id", user.id);

    setProducts(data || []);
  }

  async function fetchStock() {
    const { data } = await supabase
      .from("product_batches")
      .select("product_id, remaining_qty")
      .eq("user_id", user.id);

    const map = {};

    data?.forEach((b) => {
      map[b.product_id] =
        (map[b.product_id] || 0) + b.remaining_qty;
    });

    setStockMap(map);
  }

  return (
    <div>
      <h2>Products</h2>

      {products.map((p) => (
        <div key={p.id} style={styles.card}>
          <div>
            <strong>{p.name}</strong>
            <p>{p.size} {p.unit}</p>
          </div>

          <div>
            <strong>Stock: {stockMap[p.id] || 0}</strong>
          </div>
        </div>
      ))}
    </div>
  );
}

const styles = {
  card: {
    display: "flex",
    justifyContent: "space-between",
    padding: "12px",
    background: "#fff",
    marginBottom: "10px",
    borderRadius: "6px",
  },
};