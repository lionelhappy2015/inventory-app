import { useState } from "react";
import SelectCustomer from "../components/SelectCustomer";
import Billing from "../components/Billing";

export default function Sales({ user }) {
  const [customer, setCustomer] = useState(null);

  function handleSelectCustomer(c) {
    if (!c) return;
    setCustomer(c);
  }

  function handleBack() {
    setCustomer(null);
  }

  return (
    <div style={styles.page}>
      {!customer ? (
        <SelectCustomer onSelect={handleSelectCustomer} />
      ) : (
        <Billing
          user={user}
          customer={customer}
          onBack={handleBack}
        />
      )}
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f5f6fa",
  },
};