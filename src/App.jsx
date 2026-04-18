import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import Login from "./pages/Login";

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
  }, []);

  if (!user) return <Login setUser={setUser} />;

  return <h1>Welcome 🚀</h1>;
}

export default App;