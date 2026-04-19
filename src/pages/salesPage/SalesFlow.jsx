import { useState } from "react";
import SelectCustomer from "../../components/SelectCustomer.jsx";
import SalesInvoicePage from "../salesPage/SalesInvoicePage";


export default function SalesFlow({ user }) {
  const [customer, setCustomer] = useState(null);

  if (!customer) {
    return (
      <SelectCustomer
        onSelect={(c) => setCustomer(c)}
      />
    );
  }

  return (
    <SalesInvoicePage
      user={user}
      customer={customer}
      onBack={() => setCustomer(null)}
    />
  );
}