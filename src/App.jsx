import { useState, useEffect, useMemo } from "react";
import { useSupabase } from "./useSupabase";

// ═══════════════════════════════════════════════════════════════════════════
// BRAND TOKENS
// ═══════════════════════════════════════════════════════════════════════════
const BRAND = {
  navy: "#1F2A38",
  beige: "#D9D3C8",
  bgSoft: "#F5F2ED",
  charcoal: "#222222",
  brick: "#8E3B2E",
  brickDark: "#7A3226",
  green: "#2F4F3E",
  success: "#2E7D32",
  warning: "#ED6C02",
  error: "#C62828",
  border: "#E0E0E0",
  borderLight: "#EDE9E3",
  white: "#FFFFFF",
  textMuted: "#6B6560",
  textLight: "#8A847D",
  serif: "'Cormorant Garamond', Georgia, 'Times New Roman', serif",
  sans: "'Inter', system-ui, -apple-system, sans-serif",
};

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════
const CATEGORIES = [
  "Landscaping", "Plumbing", "Electrical", "General Maintenance",
  "Snow Removal", "Cleaning", "Vendor Coordination", "Administrative Work",
  "Emergency Repairs"
];
const STATUSES = { DRAFT: "Draft", SUBMITTED: "Submitted", APPROVED: "Approved", REJECTED: "Rejected", PAID: "Paid" };
const ROLES = { TREASURER: "Treasurer", MEMBER: "Member" };
const DEFAULT_SETTINGS = { hoaName: "24 Mill Street", defaultHourlyRate: 40, userRates: {}, currency: "USD" };
const MOBILE_BP = 768;

function useIsMobile() {
  const [m, setM] = useState(typeof window !== "undefined" ? window.innerWidth < MOBILE_BP : false);
  useEffect(() => { const h = () => setM(window.innerWidth < MOBILE_BP); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, []);
  return m;
}

function useOnline() {
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);
  return online;
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════
const uid = () => Math.random().toString(36).slice(2, 10);
const fmt = (n) => "$" + Number(n || 0).toFixed(2);
const fmtHours = (h) => Number(h || 0).toFixed(2) + " hrs";
const todayStr = () => new Date().toISOString().split("T")[0];
const nowTime = () => { const d = new Date(); return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); };

function calcHours(start, end) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff < 0) diff += 24 * 60;
  return Math.round((diff / 60) * 100) / 100;
}
// 30-min increment billing: round up to nearest 0.5hr, each 0.5hr = 50% of rate
function calcLabor(hours, rate) {
  if (!hours || !rate) return 0;
  const blocks = Math.ceil(hours * 2); // number of 30-min blocks (rounds up)
  return blocks * (rate / 2);
}
function calcMaterialsTotal(materials) {
  return (materials || []).reduce((sum, m) => sum + (Number(m.quantity) || 0) * (Number(m.unitCost) || 0), 0);
}
function formatDate(d) { if (!d) return ""; const date = new Date(d + "T00:00:00"); return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
function formatTime(t) { if (!t) return ""; const [h, m] = t.split(":"); const hr = parseInt(h); return (hr > 12 ? hr - 12 : hr || 12) + ":" + m + " " + (hr >= 12 ? "PM" : "AM"); }
function getUserRate(users, settings, userId) {
  const u = users?.find(u => u.id === userId);
  return u?.hourlyRate || settings?.defaultHourlyRate || 40;
}

// ═══════════════════════════════════════════════════════════════════════════
// ICON COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
const Icon = ({ name, size = 18 }) => {
  const paths = {
    home: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z",
    plus: "M12 4v16m8-8H4",
    check: "M5 13l4 4L19 7",
    x: "M6 18L18 6M6 6l12 12",
    edit: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
    clock: "M12 8v4l3 3M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    file: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    download: "M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 3v12",
    settings: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z",
    users: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
    chart: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
    send: "M12 19l9 2-9-18-9 18 9-2zm0 0v-8",
    back: "M10 19l-7-7m0 0l7-7m-7 7h18",
    trash: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
    alert: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
    logout: "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1",
    dollar: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    inbox: "M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4",
    menu: "M4 6h16M4 12h16M4 18h16",
    wifiOff: "M1 1l22 22M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.56 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0M12 20h.01",
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d={paths[name] || ""} />
    </svg>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// BRANDED UI COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

// Status Badge — branded pill style
const StatusBadge = ({ status }) => {
  const map = {
    Draft: { bg: "#EDEBE8", text: BRAND.textMuted, border: "#D5D0C9" },
    Submitted: { bg: "#FFF0E0", text: BRAND.brick, border: "#E8C4A8" },
    Approved: { bg: "#E8F0E6", text: BRAND.green, border: "#B5CCAE" },
    Rejected: { bg: "#FDEAEA", text: BRAND.error, border: "#F0BABA" },
    Paid: { bg: "#E8EDF5", text: "#3B5998", border: "#B8C8E0" },
  };
  const c = map[status] || map.Draft;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, fontFamily: BRAND.sans, background: c.bg, color: c.text, border: "1px solid " + c.border, letterSpacing: "0.02em" }}>
      {status === "Approved" && <Icon name="check" size={12} />}
      {status === "Paid" && <Icon name="dollar" size={12} />}
      {status === "Rejected" && <Icon name="x" size={12} />}
      {status === "Submitted" && <Icon name="clock" size={12} />}
      {status}
    </span>
  );
};

// Category Badge
const catColors = {
  "Landscaping": BRAND.green, "Plumbing": "#2563eb", "Electrical": "#b5850a",
  "General Maintenance": "#6B6560", "Snow Removal": "#4688A0", "Cleaning": "#7B5EA7",
  "Vendor Coordination": BRAND.brick, "Administrative Work": BRAND.navy, "Emergency Repairs": BRAND.error
};
const CategoryBadge = ({ category }) => {
  const c = catColors[category] || BRAND.textMuted;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 4, fontSize: 12, fontWeight: 500, fontFamily: BRAND.sans, background: c + "10", color: c, border: "1px solid " + c + "25" }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: c }} />
      {category}
    </span>
  );
};

// Role Badge
const RoleBadge = ({ role }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600, fontFamily: BRAND.sans, letterSpacing: "0.04em", textTransform: "uppercase",
    background: role === ROLES.TREASURER ? BRAND.brick + "18" : BRAND.navy + "12",
    color: role === ROLES.TREASURER ? BRAND.brick : BRAND.navy,
    border: "1px solid " + (role === ROLES.TREASURER ? BRAND.brick + "30" : BRAND.navy + "20"),
  }}>{role}</span>
);

// ═══════════════════════════════════════════════════════════════════════════
// STYLE SYSTEM
// ═══════════════════════════════════════════════════════════════════════════
const S = {
  // Layout
  app: { display: "flex", minHeight: "100vh", fontFamily: BRAND.sans, background: BRAND.bgSoft, color: BRAND.charcoal },
  sidebar: { width: 260, background: BRAND.navy, color: "#CCC8C0", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", overflow: "auto" },
  main: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column" },
  header: { padding: "16px 32px", borderBottom: "1px solid " + BRAND.border, background: BRAND.white, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10 },
  content: { padding: "28px 32px", flex: 1 },

  // Card — with navy top accent
  card: { background: BRAND.white, borderRadius: 8, border: "1px solid " + BRAND.borderLight, padding: 24, marginBottom: 16, boxShadow: "0 1px 3px rgba(31,42,56,0.04)" },
  cardAccent: { background: BRAND.white, borderRadius: 8, border: "1px solid " + BRAND.borderLight, padding: 24, marginBottom: 16, boxShadow: "0 1px 3px rgba(31,42,56,0.04)", borderTop: "3px solid " + BRAND.navy },

  // Buttons
  btnPrimary: { display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 22px", background: BRAND.brick, color: BRAND.white, border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: BRAND.sans },
  btnSecondary: { display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 22px", background: BRAND.white, color: BRAND.charcoal, border: "1px solid " + BRAND.border, borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: BRAND.sans },
  btnDanger: { display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 22px", background: BRAND.error, color: BRAND.white, border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: BRAND.sans },
  btnSuccess: { display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 22px", background: BRAND.success, color: BRAND.white, border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: BRAND.sans },
  btnGhost: { display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "transparent", color: BRAND.textMuted, border: "none", borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: BRAND.sans },

  // Form elements
  input: { width: "100%", padding: "10px 14px", border: "1px solid " + BRAND.border, borderRadius: 6, fontSize: 14, fontFamily: BRAND.sans, background: BRAND.white, color: BRAND.charcoal, outline: "none", boxSizing: "border-box" },
  textarea: { width: "100%", padding: "10px 14px", border: "1px solid " + BRAND.border, borderRadius: 6, fontSize: 14, fontFamily: BRAND.sans, background: BRAND.white, color: BRAND.charcoal, outline: "none", resize: "vertical", minHeight: 80, boxSizing: "border-box" },
  select: { width: "100%", padding: "10px 14px", border: "1px solid " + BRAND.border, borderRadius: 6, fontSize: 14, fontFamily: BRAND.sans, background: BRAND.white, color: BRAND.charcoal, outline: "none", cursor: "pointer", boxSizing: "border-box", appearance: "auto" },
  label: { display: "block", fontSize: 13, fontWeight: 600, color: BRAND.textMuted, marginBottom: 6, fontFamily: BRAND.sans },
  field: { marginBottom: 20 },

  // Table
  th: { textAlign: "left", padding: "12px 16px", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: BRAND.textMuted, borderBottom: "2px solid " + BRAND.borderLight, background: BRAND.bgSoft, fontFamily: BRAND.sans },
  td: { padding: "14px 16px", borderBottom: "1px solid " + BRAND.borderLight, verticalAlign: "top", fontSize: 14 },

  // Nav
  navItem: (active) => ({
    display: "flex", alignItems: "center", gap: 10, padding: "11px 20px", borderRadius: 6, fontSize: 14, fontWeight: active ? 600 : 400, fontFamily: BRAND.sans,
    background: active ? "rgba(255,255,255,0.1)" : "transparent", color: active ? "#FFFFFF" : "#9B978F",
    cursor: "pointer", border: "none", width: "100%", textAlign: "left", margin: "1px 0",
    borderLeft: active ? "3px solid " + BRAND.brick : "3px solid transparent",
  }),

  // Headings
  h1: { fontFamily: BRAND.serif, fontSize: 34, fontWeight: 600, color: BRAND.navy, margin: 0, letterSpacing: "-0.01em" },
  h2: { fontFamily: BRAND.serif, fontSize: 26, fontWeight: 600, color: BRAND.navy, margin: 0 },
  h3: { fontFamily: BRAND.sans, fontSize: 16, fontWeight: 700, color: BRAND.charcoal, margin: 0 },
  sectionLabel: { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: BRAND.textMuted, marginBottom: 12, fontFamily: BRAND.sans },
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════
const Field = ({ label, required, children }) => (
  <div style={S.field}>
    <label style={S.label}>{label}{required && <span style={{ color: BRAND.error }}> *</span>}</label>
    {children}
  </div>
);

const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(31,42,56,0.45)" }} onClick={onClose}>
      <div className="fade-in" style={{ background: BRAND.white, borderRadius: 12, width: 520, maxWidth: "92vw", maxHeight: "88vh", overflow: "auto", boxShadow: "0 20px 60px rgba(31,42,56,0.2)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid " + BRAND.borderLight }}>
          <h3 style={{ ...S.h3, fontSize: 18 }}>{title}</h3>
          <button onClick={onClose} style={{ ...S.btnGhost, padding: 6 }}><Icon name="x" size={20} /></button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  );
};

const ConfirmDialog = ({ open, onClose, onConfirm, title, message, confirmText, danger }) => (
  <Modal open={open} onClose={onClose} title={title}>
    <p style={{ fontSize: 14, color: BRAND.textMuted, lineHeight: 1.7, margin: "0 0 24px" }}>{message}</p>
    <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
      <button style={S.btnSecondary} onClick={onClose}>Cancel</button>
      <button style={danger ? S.btnDanger : S.btnPrimary} onClick={() => { onConfirm(); onClose(); }}>{confirmText || "Confirm"}</button>
    </div>
  </Modal>
);

// Dashboard Card — with navy top accent line
const StatCard = ({ label, value, icon, accentColor }) => (
  <div style={{ ...S.cardAccent, padding: "20px 24px", display: "flex", alignItems: "center", gap: 16, marginBottom: 0 }}>
    <div style={{ width: 44, height: 44, borderRadius: 8, background: (accentColor || BRAND.navy) + "10", display: "flex", alignItems: "center", justifyContent: "center", color: accentColor || BRAND.navy }}>
      <Icon name={icon} size={22} />
    </div>
    <div>
      <div style={{ fontSize: 12, color: BRAND.textLight, fontWeight: 500, marginBottom: 2, fontFamily: BRAND.sans }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: BRAND.navy, fontFamily: BRAND.sans }}>{value}</div>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// MATERIALS EDITOR
// ═══════════════════════════════════════════════════════════════════════════
const MaterialsEditor = ({ materials, onChange, readOnly }) => {
  const add = () => onChange([...materials, { id: uid(), name: "", quantity: 1, unitCost: 0 }]);
  const update = (i, field, val) => { const next = [...materials]; next[i] = { ...next[i], [field]: val }; onChange(next); };
  const remove = (i) => onChange(materials.filter((_, idx) => idx !== i));
  const total = calcMaterialsTotal(materials);
  return (
    <div>
      {materials.length > 0 && (
        <div style={{ border: "1px solid " + BRAND.borderLight, borderRadius: 8, overflow: "hidden", marginBottom: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead><tr>
              <th style={S.th}>Item</th><th style={{ ...S.th, width: 80 }}>Qty</th>
              <th style={{ ...S.th, width: 100 }}>Unit Cost</th><th style={{ ...S.th, width: 90, textAlign: "right" }}>Total</th>
              {!readOnly && <th style={{ ...S.th, width: 40 }}></th>}
            </tr></thead>
            <tbody>
              {materials.map((m, i) => (
                <tr key={m.id}>
                  <td style={S.td}>{readOnly ? m.name : <input style={{ ...S.input, padding: "6px 10px" }} value={m.name} onChange={e => update(i, "name", e.target.value)} placeholder="Item name" />}</td>
                  <td style={S.td}>{readOnly ? m.quantity : <input type="number" min="0" style={{ ...S.input, padding: "6px 10px" }} value={m.quantity} onChange={e => update(i, "quantity", e.target.value)} />}</td>
                  <td style={S.td}>{readOnly ? fmt(m.unitCost) : <input type="number" min="0" step="0.01" style={{ ...S.input, padding: "6px 10px" }} value={m.unitCost} onChange={e => update(i, "unitCost", e.target.value)} />}</td>
                  <td style={{ ...S.td, textAlign: "right", fontWeight: 600 }}>{fmt((Number(m.quantity) || 0) * (Number(m.unitCost) || 0))}</td>
                  {!readOnly && <td style={S.td}><button style={{ ...S.btnGhost, padding: 4, color: BRAND.error }} onClick={() => remove(i)}><Icon name="trash" size={16} /></button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!readOnly && <button style={{ ...S.btnGhost, color: BRAND.navy }} onClick={add}><Icon name="plus" size={16} /> Add Material</button>}
      {materials.length > 0 && <div style={{ textAlign: "right", fontSize: 14, fontWeight: 700, marginTop: 8, color: BRAND.navy }}>Materials Total: {fmt(total)}</div>}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// ENTRY FORM
// ═══════════════════════════════════════════════════════════════════════════
const EntryForm = ({ entry, settings, users, currentUser, onSave, onCancel, onSubmit, onDelete, mob }) => {
  const isTreasurer = currentUser.role === ROLES.TREASURER;
  const [form, setForm] = useState({
    date: entry?.date || todayStr(), startTime: entry?.startTime || nowTime(), endTime: entry?.endTime || "",
    category: entry?.category || "", description: entry?.description || "", location: entry?.location || "",
    materials: entry?.materials || [], notes: entry?.notes || "", mileage: entry?.mileage || "",
    userId: entry?.userId || currentUser.id,
  });
  const [errors, setErrors] = useState({});
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [draftId, setDraftId] = useState(entry?.id || null);
  const [autoSaveStatus, setAutoSaveStatus] = useState(""); // "", "saving", "saved"
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const hours = calcHours(form.startTime, form.endTime);
  const rate = getUserRate(users, settings, form.userId);
  const laborTotal = calcLabor(hours, rate);
  const matTotal = calcMaterialsTotal(form.materials);
  const grandTotal = laborTotal + matTotal;

  // Auto-save draft every 3 seconds when form changes
  useEffect(() => {
    // Don't auto-save if editing a submitted/approved/paid entry
    if (entry && entry.status && entry.status !== STATUSES.DRAFT && entry.status !== STATUSES.REJECTED) return;
    const timer = setTimeout(async () => {
      // Need at least date to save
      if (!form.date) return;
      setAutoSaveStatus("saving");
      const data = { ...form, status: STATUSES.DRAFT, userId: form.userId || currentUser.id };
      try {
        const result = await onSave(data, draftId, true); // true = silent (don't navigate)
        if (result && !draftId) setDraftId(result.id);
        setAutoSaveStatus("saved");
        setTimeout(() => setAutoSaveStatus(""), 2000);
      } catch (e) {
        setAutoSaveStatus("");
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [form]);

  const validate = () => {
    const e = {};
    if (!form.date) e.date = "Required";
    if (!form.startTime) e.startTime = "Required";
    if (!form.endTime) e.endTime = "Required";
    if (form.startTime && form.endTime && hours <= 0) e.endTime = "End must be after start";
    if (form.startTime && form.endTime && hours > 16) e.endTime = "Maximum 16 hours per entry";
    if (!form.category) e.category = "Required";
    if (!form.description.trim()) e.description = "Required";
    if (form.description.trim().length < 10) e.description = "Minimum 10 characters";
    if (isTreasurer && !form.userId) e.userId = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };
  const errStyle = (f) => errors[f] ? { border: "1px solid " + BRAND.error } : {};
  const allMembers = users.filter(u => u.role === ROLES.MEMBER || u.role === ROLES.TREASURER);

  return (
    <div className="fade-in">
      {isTreasurer && (
        <Field label="Member" required>
          <select style={{ ...S.select, ...errStyle("userId") }} value={form.userId} onChange={e => set("userId", e.target.value)}>
            {allMembers.map(u => <option key={u.id} value={u.id}>{u.name}{u.role === ROLES.TREASURER ? " (Treasurer)" : ""}</option>)}
          </select>{errors.userId && <span style={{ color: BRAND.error, fontSize: 12 }}>{errors.userId}</span>}
        </Field>
      )}
      <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr 1fr", gap: mob ? 12 : 16 }}>
        <Field label="Date" required><input type="date" style={{ ...S.input, ...errStyle("date") }} value={form.date} onChange={e => set("date", e.target.value)} />{errors.date && <span style={{ color: BRAND.error, fontSize: 12 }}>{errors.date}</span>}</Field>
        <Field label="Start Time" required><input type="time" style={{ ...S.input, ...errStyle("startTime") }} value={form.startTime} onChange={e => set("startTime", e.target.value)} />{errors.startTime && <span style={{ color: BRAND.error, fontSize: 12 }}>{errors.startTime}</span>}</Field>
        <Field label="End Time" required><input type="time" style={{ ...S.input, ...errStyle("endTime") }} value={form.endTime} onChange={e => set("endTime", e.target.value)} />{errors.endTime && <span style={{ color: BRAND.error, fontSize: 12 }}>{errors.endTime}</span>}</Field>
      </div>
      <Field label="Category" required>
        <select style={{ ...S.select, ...errStyle("category") }} value={form.category} onChange={e => set("category", e.target.value)}>
          <option value="">Select category...</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>{errors.category && <span style={{ color: BRAND.error, fontSize: 12 }}>{errors.category}</span>}
      </Field>
      <Field label="Task Description" required>
        <textarea style={{ ...S.textarea, ...errStyle("description") }} value={form.description} onChange={e => set("description", e.target.value)} placeholder="Describe the work performed..." />
        {errors.description && <span style={{ color: BRAND.error, fontSize: 12 }}>{errors.description}</span>}
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: mob ? 12 : 16 }}>
        <Field label="Location"><input style={S.input} value={form.location} onChange={e => set("location", e.target.value)} placeholder="e.g. Unit 3B" /></Field>
        <Field label="Mileage"><input type="number" min="0" style={S.input} value={form.mileage} onChange={e => set("mileage", e.target.value)} placeholder="Miles driven" /></Field>
      </div>
      <Field label="Materials"><MaterialsEditor materials={form.materials} onChange={m => set("materials", m)} /></Field>
      <Field label="Notes"><textarea style={{ ...S.textarea, minHeight: 60 }} value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Additional notes..." /></Field>

      {/* Summary */}
      <div style={{ background: BRAND.bgSoft, borderRadius: 8, padding: 20, marginBottom: 24, border: "1px solid " + BRAND.borderLight }}>
        <div style={S.sectionLabel}>Reimbursement Summary</div>
        <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr 1fr" : "1fr 1fr 1fr 1fr", gap: mob ? 12 : 16 }}>
          <div><div style={{ fontSize: 12, color: BRAND.textLight }}>Hours</div><div style={{ fontSize: 18, fontWeight: 700, color: BRAND.navy }}>{fmtHours(hours)}</div></div>
          <div><div style={{ fontSize: 12, color: BRAND.textLight }}>Labor ({fmt(rate)}/hr)</div><div style={{ fontSize: 18, fontWeight: 700, color: BRAND.navy }}>{fmt(laborTotal)}</div></div>
          <div><div style={{ fontSize: 12, color: BRAND.textLight }}>Materials</div><div style={{ fontSize: 18, fontWeight: 700, color: BRAND.navy }}>{fmt(matTotal)}</div></div>
          <div><div style={{ fontSize: 12, color: BRAND.textLight }}>Total</div><div style={{ fontSize: 22, fontWeight: 800, color: BRAND.brick }}>{fmt(grandTotal)}</div></div>
        </div>
        <div style={{ fontSize: 11, color: BRAND.textLight, marginTop: 10 }}>Billed in 30-min increments, rounded up.</div>
      </div>

      <div style={{ display: "flex", flexDirection: mob ? "column-reverse" : "row", gap: 10, justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {entry && entry.status === STATUSES.DRAFT && <button style={S.btnDanger} onClick={() => setShowDeleteConfirm(true)}><Icon name="trash" size={16} /> Delete</button>}
          {autoSaveStatus === "saving" && <span style={{ fontSize: 12, color: BRAND.textLight }}>Saving...</span>}
          {autoSaveStatus === "saved" && <span style={{ fontSize: 12, color: BRAND.success }}>✓ Draft saved</span>}
        </div>
        <div style={{ display: "flex", flexDirection: mob ? "column" : "row", gap: 10, width: mob ? "100%" : "auto" }}>
          <button style={S.btnSecondary} onClick={onCancel}>Cancel</button>
          <button style={S.btnSecondary} onClick={async () => { const data = { ...form, status: STATUSES.DRAFT, userId: form.userId || currentUser.id }; const result = await onSave(data, draftId, false); if (result && !draftId) setDraftId(result.id); }}><Icon name="edit" size={16} /> Save Draft</button>
          <button style={S.btnPrimary} onClick={() => { if (validate()) setShowSubmitConfirm(true); }}><Icon name="send" size={16} /> Submit for Review</button>
        </div>
      </div>
      <ConfirmDialog open={showSubmitConfirm} onClose={() => setShowSubmitConfirm(false)} title="Submit Entry?" message={"Submit for review? Total: " + fmt(grandTotal)} confirmText="Submit" onConfirm={() => onSubmit({ ...form, status: STATUSES.SUBMITTED }, draftId)} />
      <ConfirmDialog open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Delete Entry?" message="This draft will be permanently deleted." confirmText="Delete" danger onConfirm={onDelete} />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// ENTRY DETAIL
// ═══════════════════════════════════════════════════════════════════════════
const EntryDetail = ({ entry, settings, users, currentUser, onBack, onEdit, onApprove, onReject, onMarkPaid, mob }) => {
  const [reviewNotes, setReviewNotes] = useState(entry.reviewerNotes || "");
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [showPaidConfirm, setShowPaidConfirm] = useState(false);
  const isTreasurer = currentUser.role === ROLES.TREASURER;
  const user = users.find(u => u.id === entry.userId);
  const hours = calcHours(entry.startTime, entry.endTime);
  const rate = getUserRate(users, settings, entry.userId);
  const laborTotal = calcLabor(hours, rate);
  const matTotal = calcMaterialsTotal(entry.materials);
  const grandTotal = laborTotal + matTotal;
  const canEdit = (entry.userId === currentUser.id || isTreasurer) && [STATUSES.DRAFT, STATUSES.REJECTED].includes(entry.status);
  const canReview = isTreasurer && entry.status === STATUSES.SUBMITTED;
  const canMarkPaid = isTreasurer && entry.status === STATUSES.APPROVED;

  return (
    <div className="fade-in">
      <button style={{ ...S.btnGhost, marginBottom: 20, padding: "6px 0" }} onClick={onBack}><Icon name="back" size={18} /> Back to entries</button>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <h2 style={S.h2}>{entry.category}</h2>
            <StatusBadge status={entry.status} />
          </div>
          <div style={{ fontSize: 14, color: BRAND.textMuted }}>{formatDate(entry.date)} · {formatTime(entry.startTime)} – {formatTime(entry.endTime)} · {user?.name || "Unknown"}</div>
        </div>
        {canEdit && <button style={S.btnPrimary} onClick={onEdit}><Icon name="edit" size={16} /> Edit</button>}
      </div>
      <div style={S.card}>
        <div style={S.sectionLabel}>Task Description</div>
        <p style={{ margin: 0, lineHeight: 1.7, fontSize: 15 }}>{entry.description}</p>
        {entry.location && <div style={{ marginTop: 12, fontSize: 13, color: BRAND.textMuted }}>📍 {entry.location}</div>}
        {entry.mileage && <div style={{ marginTop: 6, fontSize: 13, color: BRAND.textMuted }}>🚗 {entry.mileage} miles</div>}
        {entry.notes && <div style={{ marginTop: 16, padding: 14, background: BRAND.bgSoft, borderRadius: 6, fontSize: 14, border: "1px solid " + BRAND.borderLight }}><span style={{ fontWeight: 600, color: BRAND.textMuted }}>Notes: </span>{entry.notes}</div>}
      </div>
      {entry.materials?.length > 0 && <div style={S.card}><div style={S.sectionLabel}>Materials</div><MaterialsEditor materials={entry.materials} readOnly onChange={() => {}} /></div>}
      <div style={{ ...S.cardAccent, display: "grid", gridTemplateColumns: mob ? "1fr 1fr" : "1fr 1fr 1fr 1fr", gap: mob ? 12 : 20, background: BRAND.bgSoft }}>
        <div><div style={{ fontSize: 12, color: BRAND.textLight, marginBottom: 4 }}>Hours</div><div style={{ fontSize: 20, fontWeight: 700, color: BRAND.navy }}>{fmtHours(hours)}</div></div>
        <div><div style={{ fontSize: 12, color: BRAND.textLight, marginBottom: 4 }}>Labor ({fmt(rate)}/hr)</div><div style={{ fontSize: 20, fontWeight: 700, color: BRAND.navy }}>{fmt(laborTotal)}</div></div>
        <div><div style={{ fontSize: 12, color: BRAND.textLight, marginBottom: 4 }}>Materials</div><div style={{ fontSize: 20, fontWeight: 700, color: BRAND.navy }}>{fmt(matTotal)}</div></div>
        <div><div style={{ fontSize: 12, color: BRAND.textLight, marginBottom: 4 }}>Total</div><div style={{ fontSize: 24, fontWeight: 800, color: BRAND.brick }}>{fmt(grandTotal)}</div></div>
      </div>
      {(entry.reviewerNotes || canReview) && (
        <div style={{ ...S.card, borderColor: entry.status === STATUSES.REJECTED ? "#F0BABA" : BRAND.borderLight }}>
          <div style={S.sectionLabel}>Reviewer Notes</div>
          {canReview ? <textarea style={S.textarea} value={reviewNotes} onChange={e => setReviewNotes(e.target.value)} placeholder="Add notes..." />
            : entry.reviewerNotes ? <div style={{ padding: 14, background: BRAND.bgSoft, borderRadius: 6, fontSize: 14 }}>{entry.reviewerNotes}</div>
            : <div style={{ color: BRAND.textLight, fontSize: 14 }}>No notes yet.</div>}
        </div>
      )}
      {canReview && (
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
          <button style={S.btnDanger} onClick={() => { if (!reviewNotes.trim()) { alert("Please add a note explaining the rejection."); return; } setShowRejectConfirm(true); }}><Icon name="x" size={16} /> Reject</button>
          <button style={S.btnSuccess} onClick={() => setShowApproveConfirm(true)}><Icon name="check" size={16} /> Approve</button>
        </div>
      )}
      {canMarkPaid && (
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
          <button style={{ ...S.btnPrimary, background: "#3B5998" }} onClick={() => setShowPaidConfirm(true)}><Icon name="dollar" size={16} /> Mark as Paid</button>
        </div>
      )}
      {entry.status === STATUSES.PAID && entry.paidAt && (
        <div style={{ ...S.card, background: "#E8EDF5", borderColor: "#B8C8E0" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#3B5998" }}>✓ Paid on {formatDate(entry.paidAt.split("T")[0])}</div>
        </div>
      )}
      <ConfirmDialog open={showApproveConfirm} onClose={() => setShowApproveConfirm(false)} title="Approve?" message={"Approve " + fmt(grandTotal) + " for " + (user?.name || "member") + "?"} confirmText="Approve" onConfirm={() => onApprove(reviewNotes)} />
      <ConfirmDialog open={showRejectConfirm} onClose={() => setShowRejectConfirm(false)} title="Reject?" message="Member can edit and resubmit." confirmText="Reject" danger onConfirm={() => onReject(reviewNotes)} />
      <ConfirmDialog open={showPaidConfirm} onClose={() => setShowPaidConfirm(false)} title="Mark as Paid?" message={"Confirm payment of " + fmt(grandTotal) + " to " + (user?.name || "member") + "?"} confirmText="Mark Paid" onConfirm={onMarkPaid} />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// ENTRY CARD (Mobile list replacement for tables)
// ═══════════════════════════════════════════════════════════════════════════
const EntryCard = ({entry, users, settings, onClick}) => {
  const u = users.find(u => u.id === entry.userId);
  const hrs = calcHours(entry.startTime, entry.endTime);
  const rate = getUserRate(users, settings, entry.userId);
  const total = calcLabor(hrs, rate) + calcMaterialsTotal(entry.materials);
  return (
    <div style={{ ...S.card, cursor: "pointer", padding: "14px 16px" }} onClick={onClick}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}><CategoryBadge category={entry.category} /><StatusBadge status={entry.status} /></div>
          <div style={{ fontSize: 14, fontWeight: 500, color: BRAND.charcoal, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{entry.description}</div>
        </div>
        <div style={{ textAlign: "right", marginLeft: 12 }}><div style={{ fontSize: 16, fontWeight: 700, color: BRAND.navy }}>{fmt(total)}</div></div>
      </div>
      <div style={{ fontSize: 12, color: BRAND.textLight }}>{formatDate(entry.date)} · {fmtHours(hrs)}{u ? " · " + u.name : ""}</div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// REPORTS PAGE
// ═══════════════════════════════════════════════════════════════════════════
const ReportsPage = ({ entries, users, settings, currentUser, mob }) => {
  const [dateFrom, setDateFrom] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().split("T")[0]; });
  const [dateTo, setDateTo] = useState(todayStr());
  const [filterUser, setFilterUser] = useState("all");
  const [filterStatus, setFilterStatus] = useState(STATUSES.APPROVED);
  const [generated, setGenerated] = useState(false);
  const isTreasurer = currentUser.role === ROLES.TREASURER;

  const filtered = useMemo(() => entries.filter(e => {
    if (e.date < dateFrom || e.date > dateTo) return false;
    if (filterStatus !== "all" && e.status !== filterStatus) return false;
    if (!isTreasurer && e.userId !== currentUser.id) return false;
    if (isTreasurer && filterUser !== "all" && e.userId !== filterUser) return false;
    return true;
  }).sort((a, b) => a.date.localeCompare(b.date)), [entries, dateFrom, dateTo, filterUser, filterStatus, isTreasurer, currentUser.id]);

  const totals = useMemo(() => {
    let totalHours = 0, totalLabor = 0, totalMat = 0;
    filtered.forEach(e => { const h = calcHours(e.startTime, e.endTime); const r = getUserRate(users, settings, e.userId); totalHours += h; totalLabor += calcLabor(h, r); totalMat += calcMaterialsTotal(e.materials); });
    return { totalHours, totalLabor, totalMat, grand: totalLabor + totalMat };
  }, [filtered, settings]);

  const exportCSV = () => {
    const header = "Date,Member,Category,Description,Hours,Rate,Labor,Materials,Total";
    const rows = filtered.map(e => { const u = users.find(u => u.id === e.userId); const h = calcHours(e.startTime, e.endTime); const r = getUserRate(users, settings, e.userId); const l = calcLabor(h, r); const m = calcMaterialsTotal(e.materials); return e.date + ',"' + (u?.name || "") + '","' + e.category + '","' + e.description.replace(/"/g, '""') + '",' + h.toFixed(2) + ',' + r.toFixed(2) + ',' + l.toFixed(2) + ',' + m.toFixed(2) + ',' + (l + m).toFixed(2); });
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = settings.hoaName.replace(/\s+/g, "_") + "_Report.csv"; a.click();
  };

  return (
    <div className="fade-in">
      <h2 style={{ ...S.h2, marginBottom: 24 }}>Reports</h2>
      <div style={S.card}>
        <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : (isTreasurer ? "1fr 1fr 1fr 1fr" : "1fr 1fr 1fr"), gap: mob ? 12 : 16, marginBottom: 20 }}>
          <Field label="From"><input type="date" style={S.input} value={dateFrom} onChange={e => setDateFrom(e.target.value)} /></Field>
          <Field label="To"><input type="date" style={S.input} value={dateTo} onChange={e => setDateTo(e.target.value)} /></Field>
          {isTreasurer && <Field label="Member"><select style={S.select} value={filterUser} onChange={e => setFilterUser(e.target.value)}><option value="all">All Members</option>{users.filter(u => u.role === ROLES.MEMBER).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></Field>}
          <Field label="Status"><select style={S.select} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}><option value={STATUSES.APPROVED}>Approved Only</option><option value={STATUSES.PAID}>Paid Only</option><option value="all">All</option></select></Field>
        </div>
        <button style={S.btnPrimary} onClick={() => setGenerated(true)}><Icon name="chart" size={16} /> Generate Report</button>
      </div>
      {generated && (
        <div className="fade-in">
          <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr 1fr" : "1fr 1fr 1fr 1fr", gap: mob ? 8 : 16, marginBottom: 20 }}>
            <StatCard label="Entries" value={filtered.length} icon="file" />
            <StatCard label="Total Hours" value={fmtHours(totals.totalHours)} icon="clock" accentColor="#2563eb" />
            <StatCard label="Labor" value={fmt(totals.totalLabor)} icon="users" accentColor={BRAND.green} />
            <StatCard label="Grand Total" value={fmt(totals.grand)} icon="dollar" accentColor={BRAND.brick} />
          </div>
          <div style={S.card}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <div><h3 style={{ ...S.h2, fontSize: 20 }}>{settings.hoaName}</h3><div style={{ fontSize: 13, color: BRAND.textMuted }}>{formatDate(dateFrom)} – {formatDate(dateTo)}</div></div>
              <button style={S.btnSecondary} onClick={exportCSV}><Icon name="download" size={16} /> Export CSV</button>
            </div>
            {filtered.length === 0 ? <div style={{ textAlign: "center", padding: 40, color: BRAND.textLight }}>No entries found for this period.</div> : (
              <div style={{ border: "1px solid " + BRAND.borderLight, borderRadius: 8, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead><tr><th style={S.th}>Date</th>{isTreasurer && <th style={S.th}>Member</th>}<th style={S.th}>Category</th><th style={S.th}>Description</th><th style={{ ...S.th, textAlign: "right" }}>Hours</th><th style={{ ...S.th, textAlign: "right" }}>Total</th></tr></thead>
                  <tbody>{filtered.map((e, i) => { const u = users.find(u => u.id === e.userId); const h = calcHours(e.startTime, e.endTime); const r = getUserRate(users, settings, e.userId); return (
                    <tr key={e.id} style={{ background: i % 2 === 1 ? BRAND.bgSoft : BRAND.white }}><td style={S.td}>{formatDate(e.date)}</td>{isTreasurer && <td style={S.td}>{u?.name}</td>}<td style={S.td}><CategoryBadge category={e.category} /></td><td style={{ ...S.td, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.description}</td><td style={{ ...S.td, textAlign: "right" }}>{h.toFixed(2)}</td><td style={{ ...S.td, textAlign: "right", fontWeight: 700 }}>{fmt(calcLabor(h, r) + calcMaterialsTotal(e.materials))}</td></tr>
                  ); })}</tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// RATE INPUT (saves on blur)
// ═══════════════════════════════════════════════════════════════════════════
const RateInput = ({ initialValue, placeholder, onSave }) => {
  const [val, setVal] = useState(initialValue || "");
  return <input type="number" min="0" step="0.50" style={{ ...S.input, padding: "6px 10px" }} value={val} onChange={e => setVal(e.target.value)} onBlur={() => onSave(Number(val) || null)} placeholder={placeholder} />;
};

// ═══════════════════════════════════════════════════════════════════════════
// SETTINGS PAGE
// ═══════════════════════════════════════════════════════════════════════════
const SettingsPage = ({ settings, users, currentUser, onSaveSettings, onAddUser, onRemoveUser, onUpdateRate }) => {
  const [form, setForm] = useState({ ...settings });
  const [saved, setSaved] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState(ROLES.MEMBER);
  const [newPassword, setNewPassword] = useState("");
  const [memberError, setMemberError] = useState("");
  const [addingUser, setAddingUser] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const handleSave = async () => { await onSaveSettings(form); setSaved(true); setTimeout(() => setSaved(false), 2000); };
  const addMember = async () => {
    setMemberError("");
    const email = newEmail.trim().toLowerCase();
    const name = newName.trim();
    const password = newPassword.trim();
    if (!name) { setMemberError("Name is required"); return; }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setMemberError("Valid email is required"); return; }
    if (!password || password.length < 6) { setMemberError("Password must be at least 6 characters"); return; }
    if (users.some(u => u.email.toLowerCase() === email)) { setMemberError("Email already registered"); return; }
    setAddingUser(true);
    const result = await onAddUser(name, email, newRole, password);
    setAddingUser(false);
    if (result.error) { setMemberError(result.error); return; }
    setNewName(""); setNewEmail(""); setNewPassword(""); setNewRole(ROLES.MEMBER);
  };
  const removeMember = async (id) => { await onRemoveUser(id); setDeleteTarget(null); };
  const members = users.filter(u => u.id !== currentUser?.id);

  return (
    <div className="fade-in">
      <h2 style={{ ...S.h2, marginBottom: 24 }}>Settings</h2>
      <div style={{ ...S.card, maxWidth: 600 }}>
        <div style={S.sectionLabel}>HOA Configuration</div>
        <Field label="HOA Name"><input style={S.input} value={form.hoaName} onChange={e => set("hoaName", e.target.value)} /></Field>
        <Field label="Default Hourly Rate ($)"><input type="number" min="0" step="0.50" style={S.input} value={form.defaultHourlyRate} onChange={e => set("defaultHourlyRate", Number(e.target.value))} /></Field>
        <Field label="Invite Code"><div style={{ position: "relative" }}><input style={{ ...S.input, fontFamily: "monospace", letterSpacing: "0.1em", textTransform: "uppercase" }} value={form.inviteCode || ""} onChange={e => set("inviteCode", e.target.value.toUpperCase())} placeholder="e.g. MILL2024" /><div style={{ fontSize: 12, color: BRAND.textLight, marginTop: 6 }}>New members need this code to register.</div></div></Field>
        <button style={S.btnPrimary} onClick={handleSave}>{saved ? "✓ Saved" : "Save Settings"}</button>
      </div>
      <div style={{ ...S.card, maxWidth: 600, marginTop: 20 }}>
        <div style={S.sectionLabel}>HOA Members</div>
        <div style={{ padding: 16, background: BRAND.bgSoft, borderRadius: 8, border: "1px solid " + BRAND.borderLight, marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: BRAND.navy }}>Add New Member</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><label style={S.label}>Full Name</label><input style={S.input} value={newName} onChange={e => setNewName(e.target.value)} placeholder="Jordan Chen" /></div>
            <div><label style={S.label}>Email</label><input style={S.input} value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="jordan@email.com" /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><label style={S.label}>Role</label><select style={S.select} value={newRole} onChange={e => setNewRole(e.target.value)}><option value={ROLES.MEMBER}>Member</option><option value={ROLES.TREASURER}>Treasurer</option></select></div>
            <div><label style={S.label}>Password</label><input type="password" style={S.input} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min 6 chars" onKeyDown={e => e.key === "Enter" && addMember()} /></div>
          </div>
          {memberError && <div style={{ color: BRAND.error, fontSize: 13, marginBottom: 10 }}>{memberError}</div>}
          <button style={{ ...S.btnPrimary, opacity: addingUser ? 0.6 : 1 }} onClick={addMember} disabled={addingUser}><Icon name="plus" size={16} /> {addingUser ? "Adding..." : "Add Member"}</button>
        </div>
        {members.length === 0 ? <div style={{ textAlign: "center", padding: 24, color: BRAND.textLight, fontSize: 14 }}>No members yet.</div> : (
          <div style={{ border: "1px solid " + BRAND.borderLight, borderRadius: 8, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead><tr><th style={S.th}>Name</th><th style={S.th}>Email</th><th style={{ ...S.th, width: 120 }}>Rate</th><th style={{ ...S.th, width: 50 }}></th></tr></thead>
              <tbody>{members.map(u => (
                <tr key={u.id}>
                  <td style={{ ...S.td, fontWeight: 500 }}>{u.name}</td>
                  <td style={{ ...S.td, color: BRAND.textMuted }}>{u.email}</td>
                  <td style={S.td}><RateInput initialValue={u.hourlyRate} placeholder={"$" + form.defaultHourlyRate} onSave={val => onUpdateRate(u.id, val)} /></td>
                  <td style={S.td}><button style={{ ...S.btnGhost, padding: 6, color: BRAND.error }} onClick={() => setDeleteTarget(u)}><Icon name="trash" size={16} /></button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        {members.length > 0 && <div style={{ marginTop: 8, fontSize: 12, color: BRAND.textLight }}>Rates save automatically when you leave the field.</div>}
      </div>
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Remove Member?" message={deleteTarget ? "Remove " + deleteTarget.name + "?" : ""} confirmText="Remove" danger onConfirm={() => removeMember(deleteTarget.id)} />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════
export default function App() {
  const mob = useIsMobile();
  const online = useOnline();
  const {
    currentUser, users, entries, settings, loading, authError,
    login, logout: sbLogout, register,
    saveEntry, deleteEntry, approveEntry, rejectEntry, markPaid,
    saveSettings, addUser, removeUser, updateUserRate,
    setAuthError,
  } = useSupabase();

  const [page, setPage] = useState("dashboard");
  const [viewEntry, setViewEntry] = useState(null);
  const [editEntry, setEditEntry] = useState(null);
  const [newEntry, setNewEntry] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [authMode, setAuthMode] = useState("login"); // "login" or "register"
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regCode, setRegCode] = useState("");
  const [regError, setRegError] = useState("");
  const [registering, setRegistering] = useState(false);
  const [regSuccess, setRegSuccess] = useState(false);

  // Sync auth errors from hook
  useEffect(() => { if (authError) setLoginError(authError); }, [authError]);

  const isTreasurer = currentUser?.role === ROLES.TREASURER;
  const myEntries = entries.filter(e => isTreasurer || e.userId === currentUser?.id).sort((a, b) => b.date.localeCompare(a.date));
  const pendingCount = entries.filter(e => e.status === STATUSES.SUBMITTED).length;

  // Helper: get rate for a user
  const getRate = (userId) => getUserRate(users, settings, userId);

  // Auth
  const handleLogin = async () => {
    setLoginError("");
    const email = loginEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setLoginError("Please enter a valid email"); return; }
    if (!loginPassword) { setLoginError("Please enter your password"); return; }
    setLoggingIn(true);
    const ok = await login(email, loginPassword);
    setLoggingIn(false);
    if (ok) setPage("dashboard");
  };
  const handleRegister = async () => {
    setRegError("");
    const name = regName.trim();
    const email = regEmail.trim().toLowerCase();
    if (!name) { setRegError("Please enter your full name"); return; }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setRegError("Please enter a valid email"); return; }
    if (!regPassword || regPassword.length < 6) { setRegError("Password must be at least 6 characters"); return; }
    if (!regCode.trim()) { setRegError("Please enter the invite code from your HOA Treasurer"); return; }
    setRegistering(true);
    const result = await register(name, email, regPassword, regCode.trim());
    setRegistering(false);
    if (result.error) { setRegError(result.error); return; }
    setRegSuccess(true);
  };
  const handleLogout = async () => { await sbLogout(); setLoginEmail(""); setLoginPassword(""); setLoginError(""); setPage("dashboard"); setViewEntry(null); setEditEntry(null); setNewEntry(false); };
  const nav = (p) => { setPage(p); setViewEntry(null); setEditEntry(null); setNewEntry(false); setDrawerOpen(false); };

  // Entry operations (now async)
  const doSave = async (formData, existingId, silent) => {
    const id = existingId || (editEntry ? editEntry.id : null);
    if (id) {
      const updated = await saveEntry(formData, id);
      if (!silent && updated) { setViewEntry(updated); setEditEntry(null); setNewEntry(false); }
      return updated;
    } else {
      const created = await saveEntry(formData, null);
      if (!silent && created) { setNewEntry(false); setEditEntry(null); if (formData.status === STATUSES.SUBMITTED) setPage("entries"); else setViewEntry(created); }
      return created;
    }
  };
  const doSubmit = async (formData, draftId) => {
    const id = draftId || (editEntry ? editEntry.id : null);
    const data = { ...formData, status: STATUSES.SUBMITTED };
    await saveEntry(data, id);
    setEditEntry(null); setNewEntry(false); setPage("entries");
  };
  const doDelete = async () => { if (editEntry) { await deleteEntry(editEntry.id); setEditEntry(null); setPage("entries"); } };
  const doApprove = async (notes) => { if (viewEntry) { const updated = await approveEntry(viewEntry.id, notes); if (updated) setViewEntry(updated); } };
  const doReject = async (notes) => { if (viewEntry) { const updated = await rejectEntry(viewEntry.id, notes); if (updated) setViewEntry(updated); } };
  const doMarkPaid = async () => { if (viewEntry) { const updated = await markPaid(viewEntry.id); if (updated) setViewEntry(updated); } };

  // Dashboard stats
  const dashStats = (() => {
    if (!currentUser) return { total: 0, approved: 0, pending: 0, monthReimb: 0, paid: 0 };
    const relevant = isTreasurer ? entries : entries.filter(e => e.userId === currentUser.id);
    const approved = relevant.filter(e => e.status === STATUSES.APPROVED || e.status === STATUSES.PAID);
    const thisMonth = approved.filter(e => e.date.startsWith(new Date().toISOString().slice(0, 7)));
    let monthReimb = 0;
    thisMonth.forEach(e => { const h = calcHours(e.startTime, e.endTime); const r = getRate(e.userId); monthReimb += calcLabor(h, r) + calcMaterialsTotal(e.materials); });
    return { total: relevant.length, approved: approved.length, pending: relevant.filter(e => e.status === STATUSES.SUBMITTED).length, monthReimb, paid: relevant.filter(e => e.status === STATUSES.PAID).length };
  })();

  // ══════════════════════════════════════════════════════════════════════════
  // LOGIN SCREEN
  // ══════════════════════════════════════════════════════════════════════════
  if (!currentUser) {
    if (loading) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: BRAND.bgSoft, fontFamily: BRAND.sans }}><div style={{ textAlign: "center" }}><img src="/logo.png" alt="" style={{ width: 120, height: 120, objectFit: "contain", margin: "0 auto 16px", display: "block", opacity: 0.5 }} /><div style={{ fontSize: 14, color: BRAND.textMuted }}>Loading...</div></div></div>;
    return (
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "safe center", justifyContent: "center", background: BRAND.bgSoft, fontFamily: BRAND.sans, padding: mob ? "24px 16px" : 0, overflow: "auto", WebkitOverflowScrolling: "touch" }}>
        <div className="fade-in" style={{ textAlign: "center", maxWidth: 420, width: "100%" }}>
          <img src="/logo.png" alt="24 Mill" style={{ width: mob ? 160 : 200, height: mob ? 160 : 200, objectFit: "contain", margin: "0 auto 24px", display: "block" }} />
          <h1 style={{ fontFamily: BRAND.serif, fontSize: mob ? 28 : 34, fontWeight: 600, color: BRAND.navy, margin: "0 0 32px" }}>Log Your Work</h1>
          <div style={{ background: BRAND.white, border: "1px solid " + BRAND.borderLight, borderRadius: 12, padding: mob ? 24 : 32, textAlign: "left", boxShadow: "0 4px 20px rgba(31,42,56,0.06)" }}>
            {/* Tab toggle */}
            <div style={{ display: "flex", marginBottom: 24, borderRadius: 8, background: BRAND.bgSoft, padding: 4 }}>
              <button style={{ flex: 1, padding: "10px 0", borderRadius: 6, border: "none", fontFamily: BRAND.sans, fontSize: 14, fontWeight: 600, cursor: "pointer", background: authMode === "login" ? BRAND.white : "transparent", color: authMode === "login" ? BRAND.navy : BRAND.textMuted, boxShadow: authMode === "login" ? "0 1px 3px rgba(0,0,0,0.08)" : "none", transition: "all 150ms" }} onClick={() => { setAuthMode("login"); setRegError(""); setRegSuccess(false); }}>Sign In</button>
              <button style={{ flex: 1, padding: "10px 0", borderRadius: 6, border: "none", fontFamily: BRAND.sans, fontSize: 14, fontWeight: 600, cursor: "pointer", background: authMode === "register" ? BRAND.white : "transparent", color: authMode === "register" ? BRAND.navy : BRAND.textMuted, boxShadow: authMode === "register" ? "0 1px 3px rgba(0,0,0,0.08)" : "none", transition: "all 150ms" }} onClick={() => { setAuthMode("register"); setLoginError(""); }}>Register</button>
            </div>
            {authMode === "login" ? (
              <div>
                <label style={S.label}>Email Address</label>
                <input type="email" style={{ ...S.input, marginBottom: 16, fontSize: 15, padding: "12px 16px" }} value={loginEmail} onChange={e => { setLoginEmail(e.target.value); setLoginError(""); }} onKeyDown={e => e.key === "Enter" && handleLogin()} placeholder="you@example.com" autoFocus />
                <label style={S.label}>Password</label>
                <input type="password" style={{ ...S.input, marginBottom: loginError ? 8 : 20, fontSize: 15, padding: "12px 16px", borderColor: loginError ? BRAND.error : BRAND.border }} value={loginPassword} onChange={e => { setLoginPassword(e.target.value); setLoginError(""); }} onKeyDown={e => e.key === "Enter" && handleLogin()} placeholder="Enter your password" />
                {loginError && <div style={{ color: BRAND.error, fontSize: 13, marginBottom: 16, display: "flex", alignItems: "flex-start", gap: 6 }}><Icon name="alert" size={14} /><span>{loginError}</span></div>}
                <button style={{ ...S.btnPrimary, width: "100%", justifyContent: "center", padding: "12px 20px", fontSize: 15, borderRadius: 8, opacity: loggingIn ? 0.6 : 1 }} onClick={handleLogin} disabled={loggingIn}>{loggingIn ? "Signing in..." : "Sign In"}</button>
              </div>
            ) : regSuccess ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ width: 48, height: 48, borderRadius: 24, background: BRAND.success + "15", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: BRAND.success }}><Icon name="check" size={24} /></div>
                <div style={{ fontSize: 18, fontWeight: 600, color: BRAND.navy, marginBottom: 8, fontFamily: BRAND.serif }}>Account Created!</div>
                <div style={{ fontSize: 14, color: BRAND.textMuted, marginBottom: 24, lineHeight: 1.6 }}>You can now sign in with your email and password.</div>
                <button style={{ ...S.btnPrimary, width: "100%", justifyContent: "center", padding: "12px 20px", fontSize: 15, borderRadius: 8 }} onClick={() => { setAuthMode("login"); setLoginEmail(regEmail); setRegSuccess(false); }}>Go to Sign In</button>
              </div>
            ) : (
              <div>
                <label style={S.label}>Full Name</label>
                <input type="text" style={{ ...S.input, marginBottom: 16, fontSize: 15, padding: "12px 16px" }} value={regName} onChange={e => { setRegName(e.target.value); setRegError(""); }} placeholder="Your full name" autoFocus />
                <label style={S.label}>Email Address</label>
                <input type="email" style={{ ...S.input, marginBottom: 16, fontSize: 15, padding: "12px 16px" }} value={regEmail} onChange={e => { setRegEmail(e.target.value); setRegError(""); }} placeholder="you@example.com" />
                <label style={S.label}>Password</label>
                <input type="password" style={{ ...S.input, marginBottom: 16, fontSize: 15, padding: "12px 16px" }} value={regPassword} onChange={e => { setRegPassword(e.target.value); setRegError(""); }} placeholder="Min 6 characters" />
                <label style={S.label}>Invite Code</label>
                <input type="text" style={{ ...S.input, marginBottom: regError ? 8 : 20, fontSize: 15, padding: "12px 16px", borderColor: regError ? BRAND.error : BRAND.border, textTransform: "uppercase", letterSpacing: "0.1em" }} value={regCode} onChange={e => { setRegCode(e.target.value); setRegError(""); }} onKeyDown={e => e.key === "Enter" && handleRegister()} placeholder="From your HOA Treasurer" />
                {regError && <div style={{ color: BRAND.error, fontSize: 13, marginBottom: 16, display: "flex", alignItems: "flex-start", gap: 6 }}><Icon name="alert" size={14} /><span>{regError}</span></div>}
                <button style={{ ...S.btnPrimary, width: "100%", justifyContent: "center", padding: "12px 20px", fontSize: 15, borderRadius: 8, opacity: registering ? 0.6 : 1 }} onClick={handleRegister} disabled={registering}>{registering ? "Creating account..." : "Create Account"}</button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // NAVIGATION
  // ══════════════════════════════════════════════════════════════════════════
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: "home" },
    { id: "entries", label: isTreasurer ? "All Entries" : "My Entries", icon: "file" },
    ...(isTreasurer ? [{ id: "review", label: "Review Queue", icon: "inbox", badge: pendingCount }] : []),
    { id: "reports", label: "Reports", icon: "chart" },
    ...(isTreasurer ? [{ id: "settings", label: "Settings", icon: "settings" }] : []),
  ];
  const bottomTabs = [
    { id: "dashboard", label: "Home", icon: "home" },
    { id: "entries", label: "Entries", icon: "file" },
    ...(isTreasurer ? [{ id: "review", label: "Review", icon: "inbox", badge: pendingCount }] : []),
    { id: "reports", label: "Reports", icon: "chart" },
  ];

  // ══════════════════════════════════════════════════════════════════════════
  // PAGE CONTENT
  // ══════════════════════════════════════════════════════════════════════════
  const renderPage = () => {
    if (newEntry || editEntry) return (
      <div className="fade-in"><h2 style={{ ...S.h2, marginBottom: 24 }}>{editEntry ? "Edit Entry" : "New Work Entry"}</h2>
        <div style={S.card}><EntryForm entry={editEntry} settings={settings} users={users} currentUser={currentUser} onSave={doSave} onSubmit={doSubmit} onCancel={() => { setNewEntry(false); setEditEntry(null); }} onDelete={doDelete} mob={mob} /></div></div>
    );
    if (viewEntry) {
      const fresh = entries.find(e => e.id === viewEntry.id) || viewEntry;
      return <EntryDetail entry={fresh} settings={settings} users={users} currentUser={currentUser} onBack={() => setViewEntry(null)} onEdit={() => { setEditEntry(fresh); setViewEntry(null); }} onApprove={doApprove} onReject={doReject} onMarkPaid={doMarkPaid} mob={mob} />;
    }
    if (page === "dashboard") {
      const recent = myEntries.slice(0, 5);
      return (
        <div className="fade-in">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <h2 style={S.h2}>Dashboard</h2>
            {!mob && <button style={S.btnPrimary} onClick={() => setNewEntry(true)}><Icon name="plus" size={16} /> New Entry</button>}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr 1fr" : "repeat(4, 1fr)", gap: mob ? 8 : 16, marginBottom: mob ? 16 : 28 }}>
            <StatCard label={isTreasurer ? "Total Entries" : "My Entries"} value={dashStats.total} icon="file" />
            <StatCard label="Pending Review" value={dashStats.pending} icon="clock" accentColor={BRAND.warning} />
            <StatCard label="Approved" value={dashStats.approved} icon="check" accentColor={BRAND.success} />
            <StatCard label="This Month" value={fmt(dashStats.monthReimb)} icon="dollar" accentColor={BRAND.brick} />
          </div>
          {isTreasurer && pendingCount > 0 && (
            <div style={{ ...S.card, background: "#FFF8F0", borderColor: "#F0D4A8", borderLeft: "4px solid " + BRAND.warning, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}><Icon name="alert" size={20} /><span style={{ fontWeight: 600 }}>{pendingCount} entry(ies) awaiting your review</span></div>
              <button style={S.btnPrimary} onClick={() => setPage("review")}>Review Now</button>
            </div>
          )}
          <div style={S.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}><h3 style={S.h3}>Recent Entries</h3><button style={S.btnGhost} onClick={() => setPage("entries")}>View all →</button></div>
            {recent.length === 0 ? <div style={{ textAlign: "center", padding: 40, color: BRAND.textLight }}>No entries yet. Create your first work entry.</div>
            : mob ? recent.map(e => <EntryCard key={e.id} entry={e} users={users} settings={settings} onClick={() => setViewEntry(e)} />)
            : (
              <div style={{ border: "1px solid " + BRAND.borderLight, borderRadius: 8, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead><tr><th style={S.th}>Date</th>{isTreasurer && <th style={S.th}>Member</th>}<th style={S.th}>Category</th><th style={S.th}>Description</th><th style={{ ...S.th, textAlign: "right" }}>Total</th><th style={S.th}>Status</th></tr></thead>
                  <tbody>{recent.map((e, i) => { const u = users.find(u => u.id === e.userId); const h = calcHours(e.startTime, e.endTime); const r = getUserRate(users, settings, e.userId); const total = calcLabor(h, r) + calcMaterialsTotal(e.materials); return (
                    <tr key={e.id} onClick={() => setViewEntry(e)} style={{ cursor: "pointer", background: i % 2 === 1 ? BRAND.bgSoft : BRAND.white, transition: "background 150ms" }} onMouseEnter={ev => ev.currentTarget.style.background = BRAND.beige + "40"} onMouseLeave={ev => ev.currentTarget.style.background = i % 2 === 1 ? BRAND.bgSoft : BRAND.white}>
                      <td style={S.td}>{formatDate(e.date)}</td>{isTreasurer && <td style={S.td}>{u?.name}</td>}<td style={S.td}><CategoryBadge category={e.category} /></td><td style={{ ...S.td, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.description}</td><td style={{ ...S.td, textAlign: "right", fontWeight: 600 }}>{fmt(total)}</td><td style={S.td}><StatusBadge status={e.status} /></td>
                    </tr>); })}</tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      );
    }
    if (page === "entries") return (
      <div className="fade-in">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={S.h2}>{isTreasurer ? "All Entries" : "My Entries"}</h2>
          {!mob && <button style={S.btnPrimary} onClick={() => setNewEntry(true)}><Icon name="plus" size={16} /> New Entry</button>}
        </div>
        {myEntries.length === 0 ? <div style={{ ...S.card, textAlign: "center", padding: 60, color: BRAND.textLight }}>No entries yet.</div>
        : mob ? myEntries.map(e => <EntryCard key={e.id} entry={e} users={users} settings={settings} onClick={() => setViewEntry(e)} />)
        : (
          <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead><tr><th style={S.th}>Date</th>{isTreasurer && <th style={S.th}>Member</th>}<th style={S.th}>Category</th><th style={S.th}>Description</th><th style={{ ...S.th, textAlign: "right" }}>Hours</th><th style={{ ...S.th, textAlign: "right" }}>Total</th><th style={S.th}>Status</th></tr></thead>
              <tbody>{myEntries.map((e, i) => { const u = users.find(u => u.id === e.userId); const h = calcHours(e.startTime, e.endTime); const r = getUserRate(users, settings, e.userId); const total = calcLabor(h, r) + calcMaterialsTotal(e.materials); return (
                <tr key={e.id} onClick={() => setViewEntry(e)} style={{ cursor: "pointer", background: i % 2 === 1 ? BRAND.bgSoft : BRAND.white, transition: "background 150ms" }} onMouseEnter={ev => ev.currentTarget.style.background = BRAND.beige + "40"} onMouseLeave={ev => ev.currentTarget.style.background = i % 2 === 1 ? BRAND.bgSoft : BRAND.white}>
                  <td style={S.td}>{formatDate(e.date)}</td>{isTreasurer && <td style={S.td}>{u?.name}</td>}<td style={S.td}><CategoryBadge category={e.category} /></td><td style={{ ...S.td, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.description}</td><td style={{ ...S.td, textAlign: "right" }}>{fmtHours(h)}</td><td style={{ ...S.td, textAlign: "right", fontWeight: 600 }}>{fmt(total)}</td><td style={S.td}><StatusBadge status={e.status} /></td>
                </tr>); })}</tbody>
            </table>
          </div>
        )}
      </div>
    );
    if (page === "review") {
      const pending = entries.filter(e => e.status === STATUSES.SUBMITTED).sort((a, b) => a.date.localeCompare(b.date));
      return (
        <div className="fade-in">
          <h2 style={{ ...S.h2, marginBottom: 8 }}>Review Queue</h2>
          <p style={{ margin: "0 0 24px", fontSize: 14, color: BRAND.textMuted }}>{pending.length} entries pending your review</p>
          {pending.length === 0 ? <div style={{ ...S.card, textAlign: "center", padding: 60, color: BRAND.textLight }}>All caught up! No entries to review.</div> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {pending.map(e => { const u = users.find(u => u.id === e.userId); const h = calcHours(e.startTime, e.endTime); const r = getUserRate(users, settings, e.userId); const total = calcLabor(h, r) + calcMaterialsTotal(e.materials); return (
                <div key={e.id} style={{ ...S.card, cursor: "pointer", padding: "20px 24px", transition: "box-shadow 150ms", borderLeft: "4px solid " + BRAND.brick }} onClick={() => setViewEntry(e)} onMouseEnter={ev => ev.currentTarget.style.boxShadow = "0 4px 16px rgba(31,42,56,0.08)"} onMouseLeave={ev => ev.currentTarget.style.boxShadow = "0 1px 3px rgba(31,42,56,0.04)"}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div><div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}><span style={{ fontWeight: 700, fontSize: 16, color: BRAND.navy }}>{u?.name}</span><CategoryBadge category={e.category} /></div><div style={{ fontSize: 14, color: BRAND.charcoal, marginBottom: 4 }}>{e.description}</div><div style={{ fontSize: 13, color: BRAND.textLight }}>{formatDate(e.date)} · {fmtHours(h)}</div></div>
                    <div style={{ textAlign: "right" }}><div style={{ fontSize: 22, fontWeight: 800, color: BRAND.brick }}>{fmt(total)}</div><div style={{ fontSize: 12, color: BRAND.textLight }}>reimbursement</div></div>
                  </div>
                </div>); })}
            </div>
          )}
        </div>
      );
    }
    if (page === "reports") return <ReportsPage entries={entries} users={users} settings={settings} currentUser={currentUser} mob={mob} />;
    if (page === "settings") return <SettingsPage settings={settings} users={users} currentUser={currentUser} onSaveSettings={saveSettings} onAddUser={addUser} onRemoveUser={removeUser} onUpdateRate={updateUserRate} />;
    return null;
  };

  // ══════════════════════════════════════════════════════════════════════════
  // MAIN LAYOUT
  // ══════════════════════════════════════════════════════════════════════════
  const initials = currentUser.name.split(" ").map(n => n[0]).join("");
  const isActive = (id) => page === id && !viewEntry && !editEntry && !newEntry;

  if (mob) {
    return (
      <div style={{ minHeight: "100vh", fontFamily: BRAND.sans, background: BRAND.bgSoft, color: BRAND.charcoal, paddingBottom: 72 }}>
        {/* Mobile top bar */}
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: BRAND.navy, position: "sticky", top: 0, zIndex: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/logo.png" alt="" style={{ width: 32, height: 32, borderRadius: 4, objectFit: "cover", background: BRAND.beige }} />
            <span style={{ fontFamily: BRAND.serif, fontWeight: 600, fontSize: 16, color: "#fff" }}>24 Mill</span>
          </div>
          <button style={{ background: "none", border: "none", color: "#fff", padding: 4, cursor: "pointer" }} onClick={() => setDrawerOpen(true)}><Icon name="menu" size={24} /></button>
        </header>
        {/* Slide-out drawer */}
        {drawerOpen && (
          <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.4)" }} onClick={() => setDrawerOpen(false)}>
            <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 280, background: BRAND.navy, padding: "20px 16px", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                <span style={{ fontFamily: BRAND.serif, fontWeight: 600, fontSize: 18, color: "#fff" }}>Menu</span>
                <button style={{ background: "none", border: "none", color: "#9B978F", cursor: "pointer" }} onClick={() => setDrawerOpen(false)}><Icon name="x" size={24} /></button>
              </div>
              <div style={{ padding: "12px 8px", borderRadius: 8, background: "rgba(255,255,255,0.06)", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 6, background: isTreasurer ? BRAND.brick : BRAND.green, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff" }}>{initials}</div>
                <div><div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{currentUser.name}</div><div style={{ fontSize: 12, color: "#7A766E" }}>{currentUser.role}</div></div>
              </div>
              {navItems.map(item => (
                <button key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 12px", borderRadius: 6, fontSize: 15, fontWeight: isActive(item.id) ? 600 : 400, background: isActive(item.id) ? "rgba(255,255,255,0.1)" : "transparent", color: isActive(item.id) ? "#fff" : "#9B978F", cursor: "pointer", border: "none", width: "100%", textAlign: "left", fontFamily: BRAND.sans, marginBottom: 2 }} onClick={() => nav(item.id)}>
                  <Icon name={item.icon} size={20} /><span style={{ flex: 1 }}>{item.label}</span>
                  {item.badge > 0 && <span style={{ background: BRAND.brick, color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10 }}>{item.badge}</span>}
                </button>
              ))}
              <div style={{ flex: 1 }} />
              <button style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 12px", borderRadius: 6, fontSize: 15, background: "transparent", color: "#9B978F", cursor: "pointer", border: "none", width: "100%", textAlign: "left", fontFamily: BRAND.sans }} onClick={handleLogout}><Icon name="logout" size={20} /> Sign Out</button>
            </div>
          </div>
        )}
        {/* Offline banner */}
        {!online && <div style={{ background: "#FFF3E0", borderBottom: "1px solid #FFB74D", padding: "8px 16px", display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#E65100" }}><Icon name="wifiOff" size={16} /><span>You're offline. Viewing cached data.</span></div>}
        {/* Content */}
        <div style={{ padding: "16px 16px" }}>{renderPage()}</div>
        {/* FAB */}
        {!newEntry && !editEntry && !viewEntry && (page === "dashboard" || page === "entries") && (
          <button style={{ position: "fixed", bottom: 84, right: 20, width: 56, height: 56, borderRadius: 28, background: BRAND.brick, color: "#fff", border: "none", boxShadow: "0 4px 16px rgba(142,59,46,0.35)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 15 }} onClick={() => setNewEntry(true)}>
            <Icon name="plus" size={24} />
          </button>
        )}
        {/* Bottom tab bar */}
        <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: BRAND.white, borderTop: "1px solid " + BRAND.border, display: "flex", zIndex: 20, paddingBottom: "env(safe-area-inset-bottom)" }}>
          {bottomTabs.map(t => (
            <button key={t.id} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "12px 4px", background: "none", border: "none", cursor: "pointer", color: isActive(t.id) ? BRAND.brick : BRAND.textLight, fontFamily: BRAND.sans, fontSize: 12, fontWeight: isActive(t.id) ? 600 : 400, position: "relative" }} onClick={() => nav(t.id)}>
              <Icon name={t.icon} size={30} /><span>{t.label}</span>
              {t.badge > 0 && <span style={{ position: "absolute", top: 4, right: "50%", marginRight: -20, background: BRAND.brick, color: "#fff", fontSize: 10, fontWeight: 700, padding: "1px 5px", borderRadius: 10, minWidth: 16, textAlign: "center" }}>{t.badge}</span>}
            </button>
          ))}
        </nav>
      </div>
    );
  }

  // ── DESKTOP LAYOUT ─────────────────────────────────────────────────────
  return (
    <div style={S.app}>
      <aside style={S.sidebar}>
        <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img src="/logo.png" alt="" style={{ width: 40, height: 40, borderRadius: 6, objectFit: "cover", background: BRAND.beige }} />
            <div>
              <div style={{ fontFamily: BRAND.serif, fontWeight: 600, fontSize: 17, color: "#FFFFFF", lineHeight: 1.2 }}>24 Mill</div>
              <div style={{ fontSize: 11, color: "#7A766E", letterSpacing: "0.02em" }}>Log Your Work</div>
            </div>
          </div>
        </div>
        <nav style={{ padding: "12px 12px", flex: 1 }}>
          {navItems.map(item => (
            <button key={item.id} style={S.navItem(isActive(item.id))} onClick={() => nav(item.id)}>
              <Icon name={item.icon} size={18} /><span style={{ flex: 1 }}>{item.label}</span>
              {item.badge > 0 && <span style={{ background: BRAND.brick, color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10 }}>{item.badge}</span>}
            </button>
          ))}
        </nav>
        <div style={{ padding: "16px 12px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,0.06)", marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 6, background: isTreasurer ? BRAND.brick : BRAND.green, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff" }}>{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{currentUser.name}</div>
              <div style={{ fontSize: 11, color: "#7A766E", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentUser.role}</div>
            </div>
          </div>
          <button style={{ ...S.navItem(false), padding: "8px 12px", fontSize: 13 }} onClick={handleLogout}><Icon name="logout" size={16} /> Sign Out</button>
        </div>
      </aside>
      <main style={S.main}>
        <header style={S.header}>
          <span style={{ fontSize: 14, color: BRAND.textMuted }}>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 500, color: BRAND.charcoal }}>{currentUser.name}</span>
            <RoleBadge role={currentUser.role} />
          </div>
        </header>
        {!online && <div style={{ background: "#FFF3E0", borderBottom: "1px solid #FFB74D", padding: "10px 32px", display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#E65100" }}><Icon name="wifiOff" size={16} /><span>You're offline. Viewing cached data — changes require an internet connection.</span></div>}
        <div style={S.content}>{renderPage()}</div>
      </main>
    </div>
  );
}
