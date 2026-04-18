export default function ConfirmModal({ message, onConfirm, onCancel }) {
    return (
      <div style={styles.overlay}>
        <div style={styles.modal}>
          <p>{message}</p>
  
          <div style={styles.actions}>
            <button style={styles.cancel} onClick={onCancel}>
              Cancel
            </button>
            <button style={styles.confirm} onClick={onConfirm}>
              Confirm
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  const styles = {
    overlay: {
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      background: "rgba(0,0,0,0.4)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    },
    modal: {
      background: "#fff",
      padding: "20px",
      borderRadius: "10px",
      width: "300px",
      textAlign: "center",
    },
    actions: {
      marginTop: "20px",
      display: "flex",
      justifyContent: "space-between",
    },
    cancel: {
      padding: "8px 12px",
      border: "none",
      background: "#ccc",
      borderRadius: "6px",
    },
    confirm: {
      padding: "8px 12px",
      border: "none",
      background: "#e74c3c",
      color: "#fff",
      borderRadius: "6px",
    },
  };