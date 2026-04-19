// src/utils/time.js

const IST_OPTIONS = {
    timeZone: "Asia/Kolkata",
  };
  
  // ✅ Full date + time (e.g. 19/04/2026, 1:30:00 pm)
  export function formatIST(date) {
    if (!date) return "";
    return new Date(date).toLocaleString("en-IN", IST_OPTIONS);
  }
  
  // ✅ Only date (e.g. 19/04/2026)
  export function formatDateIST(date) {
    if (!date) return "";
    return new Date(date).toLocaleDateString("en-IN", IST_OPTIONS);
  }
  
  // ✅ Only time (e.g. 1:30:00 pm)
  export function formatTimeIST(date) {
    if (!date) return "";
    return new Date(date).toLocaleTimeString("en-IN", IST_OPTIONS);
  }
  
  // ✅ Custom format (flexible)
  export function formatCustomIST(date, options = {}) {
    if (!date) return "";
    return new Date(date).toLocaleString("en-IN", {
      ...IST_OPTIONS,
      ...options,
    });
  }
  
  // ✅ Human readable (optional but powerful)
  export function formatRelativeIST(date) {
    if (!date) return "";
  
    const now = new Date();
    const input = new Date(date);
  
    const diffMs = now - input;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);
  
    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin} min ago`;
    if (diffHr < 24) return `${diffHr} hr ago`;
  
    // fallback to normal date
    return formatIST(date);
  }
  
  // ✅ Get current IST time (useful for logs / PDF)
  export function nowIST() {
    return new Date().toLocaleString("en-IN", IST_OPTIONS);
  }