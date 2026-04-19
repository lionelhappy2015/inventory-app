    import { useEffect, useState } from "react";
    import { supabase } from "../../supabaseClient";
    import EditInvoiceForm from "./EditInvoiceForm";

    export default function EditInvoiceSelect({ user }) {
    const [sales, setSales] = useState([]);
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState(null);

    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");

    useEffect(() => {
        fetchSales();
    }, [search, from, to]);

    async function fetchSales() {
        let query = supabase
        .from("sales")
        .select("*, customers(name)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

        if (from) query = query.gte("created_at", from);
        if (to) query = query.lte("created_at", to);

        const { data } = await query;
        let list = data || [];

        // 🔍 SEARCH (short id + customer)
        if (search.length >= 2) {
        list = list.filter((s) => {
            const shortId = s.id.slice(0, 6).toLowerCase();
            return (
            shortId.includes(search.toLowerCase()) ||
            s.customers?.name?.toLowerCase().includes(search.toLowerCase())
            );
        });
        }

        setSales(list);
    }

    // 👉 GO TO PAGE 2
    if (selected) {
        return (
        <EditInvoiceForm
            sale={selected}
            user={user}
            onBack={() => setSelected(null)}
        />
        );
    }

    return (
        <div>
        <h2>Select Invoice</h2>

        {/* SEARCH */}
        <input
            placeholder="Search invoice (#9f51) or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.input}
        />

        {/* DATE FILTER */}
        <div style={styles.filter}>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>

        {/* LIST */}
        {sales.map((s) => (
            <div key={s.id} style={styles.card} onClick={() => setSelected(s)}>
            <div>
                <strong>#{s.id.slice(0, 6)}</strong>
                <p>{s.customers?.name}</p>
            </div>

            <div style={{ textAlign: "right" }}>
                <p>₹{s.final_amount}</p>
                <p style={{ fontSize: 12 }}>
                {new Date(s.created_at).toLocaleDateString()}
                </p>
            </div>
            </div>
        ))}
        </div>
    );
    }

    const styles = {
    input: {
        width: "100%",
        padding: 10,
        marginBottom: 10,
    },
    filter: {
        display: "flex",
        gap: 10,
        marginBottom: 10,
    },
    card: {
        padding: 12,
        background: "#fff",
        marginBottom: 10,
        display: "flex",
        justifyContent: "space-between",
        cursor: "pointer",
    },
    };