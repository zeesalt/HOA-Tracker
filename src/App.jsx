import { useState, useEffect, useMemo, useRef } from "react";
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
  textLight: "#736D66",
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
const CATEGORY_EMOJIS = {
  "Landscaping": "🌿", "Plumbing": "🔧", "Electrical": "⚡",
  "General Maintenance": "🔨", "Snow Removal": "❄️", "Cleaning": "🧹",
  "Vendor Coordination": "📞", "Administrative Work": "📝", "Emergency Repairs": "🚨",
};
const STATUSES = { DRAFT: "Draft", SUBMITTED: "Submitted", APPROVED: "Approved", AWAITING_SECOND: "Awaiting 2nd Approval", REJECTED: "Rejected", PAID: "Paid" };
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
const Icon = ({ name, size = 18, filled = false }) => {
  // For filled tab icons, render with fill instead of stroke
  const filledIcons = {
    homeFilled: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }} aria-hidden="true" focusable="false">
        <path d="M12.71 2.29a1 1 0 00-1.42 0l-9 9a1 1 0 00.71 1.71H4v7a2 2 0 002 2h3a1 1 0 001-1v-4h4v4a1 1 0 001 1h3a2 2 0 002-2v-7h.59a1 1 0 00.7-1.71l-9-9z" />
      </svg>
    ),
    clipboardFilled: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }} aria-hidden="true" focusable="false">
        <path d="M10 3a1 1 0 00-1 1H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2h-2a1 1 0 00-1-1h-4z" />
        <rect x="9" y="12" width="6" height="1.5" rx=".75" fill="#fff" />
        <rect x="9" y="15.5" width="4" height="1.5" rx=".75" fill="#fff" />
      </svg>
    ),
    shieldCheckFilled: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }} aria-hidden="true" focusable="false">
        <path d="M12 2L3.5 6.5V11c0 5.25 3.63 10.17 8.5 11.38C16.87 21.17 20.5 16.25 20.5 11V6.5L12 2z" />
        <path d="M10 14.2l-2.1-2.1L6.5 13.5l3.5 3.5 7-7L15.6 8.6 10 14.2z" fill="#fff" />
      </svg>
    ),
    barChartFilled: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }} aria-hidden="true" focusable="false">
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <rect x="7" y="14" width="2" height="3" rx=".5" fill="#fff" />
        <rect x="11" y="11" width="2" height="6" rx=".5" fill="#fff" />
        <rect x="15" y="8" width="2" height="9" rx=".5" fill="#fff" />
      </svg>
    ),
    insightsFilled: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }} aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" />
        <circle cx="12" cy="12" r="2" fill="#fff" />
      </svg>
    ),
  };
  if (filledIcons[name]) return filledIcons[name];

  const paths = {
    home: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z",
    clipboard: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9h6m-6 4h4",
    shieldCheck: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
    barChart: "M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
    insights: "M21 12a9 9 0 11-18 0 9 9 0 0118 0zM12 6v6l4 2",
    plus: "M12 4v16m8-8H4",
    check: "M5 13l4 4L19 7",
    x: "M6 18L18 6M6 6l12 12",
    edit: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
    clock: "M12 8v4l3 3M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    file: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
    download: "M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 3v12",
    settings: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z",
    users: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
    chart: "M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
    send: "M12 19l9 2-9-18-9 18 9-2zm0 0v-8",
    camera: "M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z",
    back: "M10 19l-7-7m0 0l7-7m-7 7h18",
    trash: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
    copy: "M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2v-2m-4-12h6a2 2 0 012 2v8a2 2 0 01-2 2h-6a2 2 0 01-2-2V7a2 2 0 012-2z",
    alert: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
    logout: "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1",
    dollar: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    inbox: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    menu: "M4 6h16M4 12h16M4 18h16",
    bell: "M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0",
    bellOff: "M13.73 21a2 2 0 01-3.46 0M18.63 13A17.89 17.89 0 0118 8M6.26 6.26A5.86 5.86 0 006 8c0 7-3 9-3 9h14M1 1l22 22",
    wifiOff: "M1 1l22 22M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.56 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0M12 20h.01",
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }} aria-hidden="true" focusable="false">
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
    "Awaiting 2nd Approval": { bg: "#EEF2FF", text: "#4338CA", border: "#C7D2FE" },
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
  input: { width: "100%", padding: "10px 14px", border: "1px solid " + BRAND.border, borderRadius: 6, fontSize: 14, fontFamily: BRAND.sans, background: BRAND.white, color: BRAND.charcoal, boxSizing: "border-box" },
  textarea: { width: "100%", padding: "10px 14px", border: "1px solid " + BRAND.border, borderRadius: 6, fontSize: 14, fontFamily: BRAND.sans, background: BRAND.white, color: BRAND.charcoal, resize: "vertical", minHeight: 80, boxSizing: "border-box" },
  select: { width: "100%", padding: "10px 14px", border: "1px solid " + BRAND.border, borderRadius: 6, fontSize: 14, fontFamily: BRAND.sans, background: BRAND.white, color: BRAND.charcoal, cursor: "pointer", boxSizing: "border-box", appearance: "auto" },
  label: { display: "block", fontSize: 14, fontWeight: 600, color: BRAND.textMuted, marginBottom: 6, fontFamily: BRAND.sans },
  field: { marginBottom: 20 },

  // Table
  th: { textAlign: "left", padding: "12px 16px", fontWeight: 600, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em", color: BRAND.textMuted, borderBottom: "2px solid " + BRAND.borderLight, background: BRAND.bgSoft, fontFamily: BRAND.sans },
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
  const modalRef = useRef(null);
  const prevFocusRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    prevFocusRef.current = document.activeElement;
    const handleEsc = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleEsc);
    // Focus first focusable element
    setTimeout(() => {
      const focusable = modalRef.current?.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (focusable?.length) focusable[0].focus();
    }, 50);
    return () => {
      document.removeEventListener("keydown", handleEsc);
      if (prevFocusRef.current) prevFocusRef.current.focus();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(31,42,56,0.45)" }} onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div ref={modalRef} className="fade-in" style={{ background: BRAND.white, borderRadius: 12, width: 520, maxWidth: "92vw", maxHeight: "88vh", overflow: "auto", boxShadow: "0 20px 60px rgba(31,42,56,0.2)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid " + BRAND.borderLight }}>
          <h3 id="modal-title" style={{ ...S.h3, fontSize: 18 }}>{title}</h3>
          <button onClick={onClose} style={{ ...S.btnGhost, padding: 6 }} aria-label="Close dialog"><Icon name="x" size={20} /></button>
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
// IMAGE COMPRESSION + UPLOADER
// ═══════════════════════════════════════════════════════════════════════════
function compressImage(file, maxWidth = 1200, quality = 0.7) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let w = img.width, h = img.height;
        if (w > maxWidth) { h = Math.round((h * maxWidth) / w); w = maxWidth; }
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

const ImageUploader = ({ images, onChange, label, color, icon, readOnly, mob }) => {
  const [dragOver, setDragOver] = useState(false);
  const [viewImg, setViewImg] = useState(null);
  const inputRef = useRef(null);

  const handleFiles = async (files) => {
    const newImages = [];
    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;
      const dataUrl = await compressImage(file);
      newImages.push({ id: uid(), dataUrl, caption: "", createdAt: new Date().toISOString() });
    }
    if (newImages.length) onChange([...images, ...newImages]);
  };

  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); };
  const updateCaption = (id, caption) => onChange(images.map(img => img.id === id ? { ...img, caption } : img));
  const removeImage = (id) => onChange(images.filter(img => img.id !== id));

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 14, background: color + "18", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name={icon} size={16} />
        </div>
        <span style={{ fontSize: 14, fontWeight: 600, color: BRAND.navy }}>{label}</span>
        <span style={{ fontSize: 12, color: BRAND.textLight }}>({images.length})</span>
      </div>

      {/* Thumbnails grid */}
      {images.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: mob ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: 10, marginBottom: 12 }}>
          {images.map(img => (
            <div key={img.id} style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: "1px solid " + BRAND.borderLight, background: BRAND.bgSoft }}>
              <img src={img.dataUrl} alt={img.caption || (label + " photo")} style={{ width: "100%", height: 100, objectFit: "cover", display: "block", cursor: "pointer" }} onClick={() => setViewImg(img)} />
              {!readOnly && (
                <>
                  <button aria-label={"Remove " + label + " photo"} onClick={() => removeImage(img.id)} style={{ position: "absolute", top: 2, right: 2, width: 28, height: 28, borderRadius: 14, background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>✕</button>
                  <input aria-label={"Caption for " + label + " photo"} style={{ width: "100%", border: "none", borderTop: "1px solid " + BRAND.borderLight, padding: "6px 8px", fontSize: 13, fontFamily: BRAND.sans, background: BRAND.white }} placeholder="Add caption..." value={img.caption || ""} onChange={e => updateCaption(img.id, e.target.value)} />
                </>
              )}
              {readOnly && img.caption && <div style={{ padding: "4px 8px", fontSize: 11, color: BRAND.textMuted, background: BRAND.white }}>{img.caption}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Upload zone */}
      {!readOnly && (
        <div onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop} onClick={() => inputRef.current?.click()} style={{ border: "2px dashed " + (dragOver ? color : BRAND.border), borderRadius: 10, padding: "18px 16px", textAlign: "center", cursor: "pointer", background: dragOver ? color + "08" : BRAND.bgSoft, transition: "all 200ms" }}>
          <input ref={inputRef} type="file" accept="image/*" multiple capture="environment" style={{ display: "none" }} onChange={e => { handleFiles(e.target.files); e.target.value = ""; }} />
          <div style={{ fontSize: 24, marginBottom: 4, opacity: 0.5 }}>📷</div>
          <div style={{ fontSize: 13, color: BRAND.textMuted }}>Tap to take a photo or choose from gallery</div>
          <div style={{ fontSize: 11, color: BRAND.textLight, marginTop: 2 }}>Drag & drop also works</div>
        </div>
      )}

      {/* Lightbox */}
      {viewImg && (
        <Modal open={true} onClose={() => setViewImg(null)} title={label}>
          <img src={viewImg.dataUrl} alt={viewImg.caption || "Uploaded photo"} style={{ width: "100%", borderRadius: 8, marginBottom: viewImg.caption ? 8 : 0 }} />
          {viewImg.caption && <div style={{ fontSize: 13, color: BRAND.textMuted, textAlign: "center" }}>{viewImg.caption}</div>}
        </Modal>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MATERIALS EDITOR
// ═══════════════════════════════════════════════════════════════════════════
const MaterialsEditor = ({ materials, onChange, readOnly, mob }) => {
  const add = () => onChange([...materials, { id: uid(), name: "", quantity: 1, unitCost: 0, description: "", notes: "" }]);
  const update = (i, field, val) => { const next = [...materials]; next[i] = { ...next[i], [field]: val }; onChange(next); };
  const remove = (i) => onChange(materials.filter((_, idx) => idx !== i));
  const total = calcMaterialsTotal(materials);
  return (
    <div>
      {materials.map((m, i) => (
        <div key={m.id} style={{ border: "1px solid " + BRAND.borderLight, borderRadius: 10, padding: mob ? 12 : 16, marginBottom: 10, background: BRAND.white }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 18 }}>🧱</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: BRAND.navy }}>Item {i + 1}</span>
            </div>
            {!readOnly && <button aria-label="Remove material item" style={{ ...S.btnGhost, padding: 4, color: BRAND.error }} onClick={() => remove(i)}><Icon name="trash" size={16} /></button>}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "2fr 1fr 1fr 1fr", gap: 10, marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 11, color: BRAND.textLight, marginBottom: 3 }}>Item Name</div>
              {readOnly ? <div style={{ fontSize: 14, fontWeight: 500 }}>{m.name}</div> : <input style={{ ...S.input, padding: "8px 10px" }} value={m.name} onChange={e => update(i, "name", e.target.value)} placeholder="e.g. PVC Pipe 3/4 in" />}
            </div>
            <div>
              <div style={{ fontSize: 11, color: BRAND.textLight, marginBottom: 3 }}>Qty</div>
              {readOnly ? <div style={{ fontSize: 14 }}>{m.quantity}</div> : <input type="number" min="0" style={{ ...S.input, padding: "8px 10px" }} value={m.quantity} onChange={e => update(i, "quantity", e.target.value)} />}
            </div>
            <div>
              <div style={{ fontSize: 11, color: BRAND.textLight, marginBottom: 3 }}>Unit Cost</div>
              {readOnly ? <div style={{ fontSize: 14 }}>{fmt(m.unitCost)}</div> : <input type="number" min="0" step="0.01" style={{ ...S.input, padding: "8px 10px" }} value={m.unitCost} onChange={e => update(i, "unitCost", e.target.value)} />}
            </div>
            <div>
              <div style={{ fontSize: 11, color: BRAND.textLight, marginBottom: 3 }}>Total</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: BRAND.brick, paddingTop: readOnly ? 0 : 8 }}>{fmt((Number(m.quantity) || 0) * (Number(m.unitCost) || 0))}</div>
            </div>
          </div>
          {/* Description */}
          <div style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 11, color: BRAND.textLight, marginBottom: 3 }}>Description</div>
            {readOnly ? (m.description && <div style={{ fontSize: 13, color: BRAND.charcoal }}>{m.description}</div>) : <input style={{ ...S.input, padding: "8px 10px", fontSize: 13 }} value={m.description || ""} onChange={e => update(i, "description", e.target.value)} placeholder="What is this for? Where to get it?" />}
          </div>
          {/* Notes */}
          <div>
            <div style={{ fontSize: 11, color: BRAND.textLight, marginBottom: 3 }}>Notes</div>
            {readOnly ? (m.notes && <div style={{ fontSize: 13, color: BRAND.charcoal, fontStyle: "italic" }}>{m.notes}</div>) : <input style={{ ...S.input, padding: "8px 10px", fontSize: 13 }} value={m.notes || ""} onChange={e => update(i, "notes", e.target.value)} placeholder="Receipt #, vendor, notes..." />}
          </div>
        </div>
      ))}
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
    materials: entry?.materials || [], preImages: entry?.preImages || [], postImages: entry?.postImages || [],
    notes: entry?.notes || "", mileage: entry?.mileage || "",
    userId: entry?.userId || currentUser.id,
  });
  const [errors, setErrors] = useState({});
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [formDirty, setFormDirty] = useState(false);
  const [draftId, setDraftId] = useState(entry?.id || null);
  const [autoSaveStatus, setAutoSaveStatus] = useState(""); // "", "saving", "saved"
  const [submitting, setSubmitting] = useState(false);
  const draftIdRef = useRef(draftId);
  draftIdRef.current = draftId;
  const set = (k, v) => { setFormDirty(true); setForm(f => ({ ...f, [k]: v })); };
  const setEndFromDuration = (mins) => {
    if (!form.startTime) return;
    const [h, m] = form.startTime.split(":").map(Number);
    const total = h * 60 + m + mins;
    const eh = Math.floor(total / 60) % 24, em = total % 60;
    set("endTime", String(eh).padStart(2, "0") + ":" + String(em).padStart(2, "0"));
  };
  const hours = calcHours(form.startTime, form.endTime);
  const rate = getUserRate(users, settings, form.userId);
  const laborTotal = calcLabor(hours, rate);
  const matTotal = calcMaterialsTotal(form.materials);
  const grandTotal = laborTotal + matTotal;

  // Auto-save draft every 3 seconds when form changes
  useEffect(() => {
    // Don't auto-save if editing a submitted/approved/paid entry
    if (entry && entry.status && entry.status !== STATUSES.DRAFT && entry.status !== STATUSES.REJECTED) return;
    // Don't auto-save if user is in the submit flow
    if (showSubmitConfirm || submitting) return;
    const timer = setTimeout(async () => {
      // Need at least date to save
      if (!form.date) return;
      // Double-check submit isn't in progress (async guard)
      if (showSubmitConfirm || submitting) return;
      setAutoSaveStatus("saving");
      const data = { ...form, status: STATUSES.DRAFT, userId: form.userId || currentUser.id };
      try {
        const result = await onSave(data, draftIdRef.current, true); // true = silent (don't navigate)
        if (result && !draftIdRef.current) { setDraftId(result.id); draftIdRef.current = result.id; }
        setAutoSaveStatus("saved");
        setTimeout(() => setAutoSaveStatus(""), 2000);
      } catch (e) {
        setAutoSaveStatus("");
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [form, showSubmitConfirm, submitting]);

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
          </select>{errors.userId && <span role="alert" style={{ color: BRAND.error, fontSize: 13 }}>{errors.userId}</span>}
        </Field>
      )}
      <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr 1fr", gap: mob ? 12 : 16 }}>
        <Field label="Date" required><input type="date" style={{ ...S.input, ...errStyle("date") }} value={form.date} onChange={e => set("date", e.target.value)} />{errors.date && <span role="alert" style={{ color: BRAND.error, fontSize: 13 }}>{errors.date}</span>}</Field>
        <Field label="Start Time" required><input type="time" style={{ ...S.input, ...errStyle("startTime") }} value={form.startTime} onChange={e => set("startTime", e.target.value)} />{errors.startTime && <span role="alert" style={{ color: BRAND.error, fontSize: 13 }}>{errors.startTime}</span>}</Field>
        <Field label="End Time" required><input type="time" style={{ ...S.input, ...errStyle("endTime") }} value={form.endTime} onChange={e => set("endTime", e.target.value)} />{errors.endTime && <span role="alert" style={{ color: BRAND.error, fontSize: 13 }}>{errors.endTime}</span>}</Field>
      </div>
      {/* Quick duration buttons */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: -8, marginBottom: 16 }}>
        <span style={{ fontSize: 12, color: BRAND.textLight, lineHeight: "28px" }}>Quick:</span>
        {[30, 60, 90, 120, 180, 240].map(mins => (
          <button key={mins} type="button" onClick={() => setEndFromDuration(mins)} style={{ padding: "4px 12px", borderRadius: 14, border: "1px solid " + BRAND.borderLight, background: hours > 0 && Math.round(hours * 60) === mins ? BRAND.navy : BRAND.white, color: hours > 0 && Math.round(hours * 60) === mins ? "#fff" : BRAND.textMuted, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: BRAND.sans, transition: "all 150ms" }}>{mins < 60 ? mins + "m" : (mins / 60) + "hr"}</button>
        ))}
      </div>
      <Field label="Category" required>
        <select style={{ ...S.select, ...errStyle("category") }} value={form.category} onChange={e => set("category", e.target.value)}>
          <option value="">Select category...</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_EMOJIS[c] || "📋"} {c}</option>)}
        </select>{errors.category && <span role="alert" style={{ color: BRAND.error, fontSize: 13 }}>{errors.category}</span>}
      </Field>
      <Field label="Task Description" required>
        <textarea style={{ ...S.textarea, ...errStyle("description") }} value={form.description} onChange={e => set("description", e.target.value)} placeholder="Describe the work performed..." />
        {errors.description && <span role="alert" style={{ color: BRAND.error, fontSize: 13 }}>{errors.description}</span>}
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: mob ? 12 : 16 }}>
        <Field label="Location"><input style={S.input} value={form.location} onChange={e => set("location", e.target.value)} placeholder="e.g. Unit 3B" /></Field>
        <Field label="Mileage"><input type="number" min="0" style={S.input} value={form.mileage} onChange={e => set("mileage", e.target.value)} placeholder="Miles driven" /></Field>
      </div>
      <Field label="Materials"><MaterialsEditor materials={form.materials} onChange={m => set("materials", m)} mob={mob} /></Field>

      {/* Pre / Post Images */}
      <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: mob ? 16 : 20, marginBottom: 16 }}>
        <Field label="">
          <ImageUploader images={form.preImages} onChange={imgs => set("preImages", imgs)} label="Before Photos" color="#E65100" icon="camera" mob={mob} />
        </Field>
        <Field label="">
          <ImageUploader images={form.postImages} onChange={imgs => set("postImages", imgs)} label="After Photos" color="#2E7D32" icon="camera" mob={mob} />
        </Field>
      </div>

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

      {/* Action bar */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: mob ? 10 : 14, marginBottom: 16 }}>
        {/* Cancel */}
        <button onClick={() => formDirty ? setShowCancelConfirm(true) : onCancel()} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: mob ? "16px 8px" : "20px 12px", borderRadius: 14, border: "1px solid " + BRAND.border, background: BRAND.white, cursor: "pointer", transition: "all 200ms", fontFamily: BRAND.sans, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }} onMouseEnter={ev => { ev.currentTarget.style.transform = "translateY(-2px)"; ev.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.1)"; }} onMouseLeave={ev => { ev.currentTarget.style.transform = "translateY(0)"; ev.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)"; }}>
          <div style={{ width: 44, height: 44, borderRadius: 22, background: "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", color: "#6B7280" }}><Icon name="x" size={22} /></div>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#6B7280" }}>Cancel</span>
        </button>
        {/* Save Draft */}
        <button onClick={async () => { const data = { ...form, status: STATUSES.DRAFT, userId: form.userId || currentUser.id }; setAutoSaveStatus("saving"); const result = await onSave(data, draftIdRef.current, false); if (result && !draftIdRef.current) { setDraftId(result.id); draftIdRef.current = result.id; } setAutoSaveStatus("saved"); setTimeout(() => setAutoSaveStatus(""), 2000); }} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: mob ? "16px 8px" : "20px 12px", borderRadius: 14, border: "1px solid #DBEAFE", background: "#EFF6FF", cursor: "pointer", transition: "all 200ms", fontFamily: BRAND.sans, boxShadow: "0 2px 8px rgba(21,101,192,0.08)" }} onMouseEnter={ev => { ev.currentTarget.style.transform = "translateY(-2px)"; ev.currentTarget.style.boxShadow = "0 4px 16px rgba(21,101,192,0.18)"; }} onMouseLeave={ev => { ev.currentTarget.style.transform = "translateY(0)"; ev.currentTarget.style.boxShadow = "0 2px 8px rgba(21,101,192,0.08)"; }}>
          <div style={{ width: 44, height: 44, borderRadius: 22, background: "#1565C0", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}><Icon name="edit" size={22} /></div>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#1565C0" }}>Save Draft</span>
          {autoSaveStatus === "saving" && <span role="status" aria-live="polite" style={{ fontSize: 11, color: "#1565C0", opacity: 0.7 }}>Saving...</span>}
          {autoSaveStatus === "saved" && <span role="status" aria-live="polite" style={{ fontSize: 11, color: BRAND.success }}>✓ Saved</span>}
        </button>
        {/* Submit for Review */}
        <button onClick={() => { if (validate()) setShowSubmitConfirm(true); }} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: mob ? "16px 8px" : "20px 12px", borderRadius: 14, border: "1px solid " + BRAND.brick + "30", background: BRAND.brick + "0A", cursor: "pointer", transition: "all 200ms", fontFamily: BRAND.sans, boxShadow: "0 2px 8px rgba(142,59,46,0.08)" }} onMouseEnter={ev => { ev.currentTarget.style.transform = "translateY(-3px)"; ev.currentTarget.style.boxShadow = "0 6px 20px rgba(142,59,46,0.22)"; }} onMouseLeave={ev => { ev.currentTarget.style.transform = "translateY(0)"; ev.currentTarget.style.boxShadow = "0 2px 8px rgba(142,59,46,0.08)"; }}>
          <div style={{ width: 44, height: 44, borderRadius: 22, background: BRAND.brick, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}><Icon name="send" size={22} /></div>
          <span style={{ fontSize: 13, fontWeight: 700, color: BRAND.brick }}>Submit</span>
          <span style={{ fontSize: 10, color: BRAND.brick, opacity: 0.7 }}>For Review</span>
        </button>
      </div>

      {/* Delete + auto-save row */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 16 }}>
        {entry && entry.status === STATUSES.DRAFT && <button style={{ ...S.btnGhost, color: BRAND.error, fontSize: 13 }} onClick={() => setShowDeleteConfirm(true)}><Icon name="trash" size={14} /> Delete Draft</button>}
      </div>
      <ConfirmDialog open={showSubmitConfirm} onClose={() => setShowSubmitConfirm(false)} title="Submit Entry?" message={"Submit for review? Total: " + fmt(grandTotal)} confirmText="Submit" onConfirm={() => { setSubmitting(true); onSubmit({ ...form, status: STATUSES.SUBMITTED }, draftIdRef.current); }} />
      <ConfirmDialog open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Delete Entry?" message="This draft will be permanently deleted." confirmText="Delete" danger onConfirm={onDelete} />
      <ConfirmDialog open={showCancelConfirm} onClose={() => setShowCancelConfirm(false)} title="Discard Changes?" message="You have unsaved changes. Are you sure you want to leave?" confirmText="Discard" danger onConfirm={onCancel} />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// ENTRY DETAIL
// ═══════════════════════════════════════════════════════════════════════════
const EntryDetail = ({ entry, settings, users, currentUser, onBack, onEdit, onApprove, onReject, onMarkPaid, onDuplicate, onSecondApprove, mob }) => {
  const [reviewNotes, setReviewNotes] = useState(entry.reviewerNotes || "");
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [showPaidConfirm, setShowPaidConfirm] = useState(false);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [payMethod, setPayMethod] = useState("Zelle");
  const [payRef, setPayRef] = useState("");
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
  const needsSecondApproval = entry.status === STATUSES.AWAITING_SECOND;
  const canSecondApprove = isTreasurer && needsSecondApproval;
  // Check if dual approval is required for this entry's amount
  const dualRequired = settings.dualApprovalThreshold > 0 && grandTotal >= settings.dualApprovalThreshold;

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
        {!canEdit && <button style={S.btnSecondary} onClick={() => onDuplicate(entry)}><Icon name="copy" size={16} /> Duplicate</button>}
      </div>
      <div style={S.card}>
        <div style={S.sectionLabel}>Task Description</div>
        <p style={{ margin: 0, lineHeight: 1.7, fontSize: 15 }}>{entry.description}</p>
        {entry.location && <div style={{ marginTop: 12, fontSize: 13, color: BRAND.textMuted }}>📍 {entry.location}</div>}
        {entry.mileage && <div style={{ marginTop: 6, fontSize: 13, color: BRAND.textMuted }}>🚗 {entry.mileage} miles</div>}
        {entry.notes && <div style={{ marginTop: 16, padding: 14, background: BRAND.bgSoft, borderRadius: 6, fontSize: 14, border: "1px solid " + BRAND.borderLight }}><span style={{ fontWeight: 600, color: BRAND.textMuted }}>Notes: </span>{entry.notes}</div>}
      </div>
      {entry.materials?.length > 0 && <div style={S.card}><div style={S.sectionLabel}>Materials</div><MaterialsEditor materials={entry.materials} readOnly onChange={() => {}} mob={mob} /></div>}

      {/* Pre/Post Images */}
      {(entry.preImages?.length > 0 || entry.postImages?.length > 0) && (
        <div style={S.card}>
          <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: 20 }}>
            {entry.preImages?.length > 0 && <ImageUploader images={entry.preImages} onChange={() => {}} label="Before Photos" color="#E65100" icon="camera" readOnly mob={mob} />}
            {entry.postImages?.length > 0 && <ImageUploader images={entry.postImages} onChange={() => {}} label="After Photos" color="#2E7D32" icon="camera" readOnly mob={mob} />}
          </div>
        </div>
      )}
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
          <button style={S.btnSuccess} onClick={() => setShowApproveConfirm(true)}><Icon name="check" size={16} /> {dualRequired ? "First Approval" : "Approve"}</button>
          {dualRequired && <div style={{ fontSize: 11, color: "#4338CA", alignSelf: "center" }}>⚖️ Dual approval required ({fmt(settings.dualApprovalThreshold)}+ threshold)</div>}
        </div>
      )}
      {canSecondApprove && (
        <div style={{ ...S.card, background: "#EEF2FF", borderColor: "#C7D2FE", borderLeft: "4px solid #4338CA" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div><div style={{ fontWeight: 600, color: "#4338CA", marginBottom: 4 }}>⚖️ Awaiting Second Approval</div><div style={{ fontSize: 13, color: BRAND.textMuted }}>This entry ({fmt(grandTotal)}) exceeds the {fmt(settings.dualApprovalThreshold)} threshold. A second board member must approve.</div>
              {entry.reviewedAt && <div style={{ fontSize: 12, color: BRAND.textLight, marginTop: 4 }}>First approved on {formatDate(entry.reviewedAt.split("T")[0])}</div>}
            </div>
            <button style={{ ...S.btnSuccess, whiteSpace: "nowrap" }} onClick={() => onSecondApprove(entry.id)}><Icon name="check" size={16} /> Second Approve</button>
          </div>
        </div>
      )}
      {canMarkPaid && (
        <div style={{ ...S.card, borderColor: "#B8C8E0" }}>
          <div style={S.sectionLabel}>Payment Details</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><label style={S.label}>Payment Method</label><select style={S.select} value={payMethod} onChange={e => setPayMethod(e.target.value)}><option>Zelle</option><option>Venmo</option><option>Check</option><option>Bank Transfer</option><option>Cash</option><option>Other</option></select></div>
            <div><label style={S.label}>Reference # (optional)</label><input style={S.input} value={payRef} onChange={e => setPayRef(e.target.value)} placeholder="Check #, transaction ID..." /></div>
          </div>
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <button style={{ ...S.btnPrimary, background: "#3B5998" }} onClick={() => setShowPaidConfirm(true)}><Icon name="dollar" size={16} /> Mark as Paid — {fmt(grandTotal)}</button>
          </div>
        </div>
      )}
      {entry.status === STATUSES.PAID && entry.paidAt && (
        <div style={{ ...S.card, background: "#E8EDF5", borderColor: "#B8C8E0" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#3B5998" }}>✓ Paid on {formatDate(entry.paidAt.split("T")[0])}</div>
        </div>
      )}
      {/* Audit Trail */}
      {entry.auditLog?.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <button style={{ ...S.btnGhost, fontSize: 12, color: BRAND.textLight }} onClick={() => setShowAuditLog(p => !p)}><Icon name="file" size={14} /> {showAuditLog ? "Hide" : "Show"} Audit Trail ({entry.auditLog.length})</button>
          {showAuditLog && (
            <div style={{ ...S.card, marginTop: 8, padding: 16 }}>
              <div style={S.sectionLabel}>Audit Trail</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {[...entry.auditLog].reverse().map((log, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: i < entry.auditLog.length - 1 ? "1px solid " + BRAND.borderLight : "none" }}>
                    <div style={{ width: 8, height: 8, borderRadius: 4, background: log.action.includes("Reject") ? BRAND.error : log.action.includes("Approv") ? BRAND.success : log.action.includes("Paid") ? "#3B5998" : BRAND.textLight, flexShrink: 0, marginTop: 5 }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: BRAND.charcoal }}>{log.action}</div>
                      <div style={{ fontSize: 12, color: BRAND.textMuted }}>{log.byName} · {new Date(log.at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}</div>
                      {log.details && <div style={{ fontSize: 12, color: BRAND.textLight, marginTop: 2 }}>{log.details}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      <ConfirmDialog open={showApproveConfirm} onClose={() => setShowApproveConfirm(false)} title={dualRequired ? "First Approval" : "Approve?"} message={dualRequired ? "This entry (" + fmt(grandTotal) + ") exceeds the dual-approval threshold. A second board member will need to approve before it's final." : "Approve " + fmt(grandTotal) + " for " + (user?.name || "member") + "?"} confirmText={dualRequired ? "First Approve" : "Approve"} onConfirm={() => onApprove(reviewNotes)} />
      <ConfirmDialog open={showRejectConfirm} onClose={() => setShowRejectConfirm(false)} title="Reject?" message="Member can edit and resubmit." confirmText="Reject" danger onConfirm={() => onReject(reviewNotes)} />
      <ConfirmDialog open={showPaidConfirm} onClose={() => setShowPaidConfirm(false)} title="Mark as Paid?" message={"Confirm payment of " + fmt(grandTotal) + " to " + (user?.name || "member") + " via " + payMethod + (payRef ? " (#" + payRef + ")" : "") + "?"} confirmText="Mark Paid" onConfirm={() => onMarkPaid({ method: payMethod, reference: payRef })} />
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
  const photoCount = (entry.preImages?.length || 0) + (entry.postImages?.length || 0);
  return (
    <div role="button" tabIndex={0} onKeyDown={e => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onClick())} aria-label={entry.category + ": " + entry.description + ", " + fmt(total) + ", " + entry.status} style={{ ...S.card, cursor: "pointer", padding: "14px 16px" }} onClick={onClick}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}><CategoryBadge category={entry.category} /><StatusBadge status={entry.status} />{photoCount > 0 && <span aria-label={photoCount + " photos"} style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 12, color: BRAND.textLight, background: BRAND.bgSoft, padding: "2px 8px", borderRadius: 10 }}>📷 {photoCount}</span>}</div>
          <div style={{ fontSize: 14, fontWeight: 500, color: BRAND.charcoal, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{entry.description}</div>
        </div>
        <div style={{ textAlign: "right", marginLeft: 12 }}><div style={{ fontSize: 16, fontWeight: 700, color: BRAND.navy }}>{fmt(total)}</div></div>
      </div>
      <div style={{ fontSize: 13, color: BRAND.textLight }}>{formatDate(entry.date)} · {fmtHours(hrs)}{u ? " · " + u.name : ""}</div>
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

  // ── Fiscal Year Report (CPA-ready) ──────────────────────────────────────
  const exportFiscalYear = (year) => {
    const yrEntries = entries.filter(e => e.date.startsWith(String(year)) && (e.status === "Approved" || e.status === "Paid"));

    // By Category
    const byCat = {};
    CATEGORIES.forEach(c => { byCat[c] = { labor: 0, materials: 0, hours: 0, count: 0 }; });
    yrEntries.forEach(e => {
      const h = calcHours(e.startTime, e.endTime);
      const r = getUserRate(users, settings, e.userId);
      if (!byCat[e.category]) byCat[e.category] = { labor: 0, materials: 0, hours: 0, count: 0 };
      byCat[e.category].labor += calcLabor(h, r);
      byCat[e.category].materials += calcMaterialsTotal(e.materials);
      byCat[e.category].hours += h;
      byCat[e.category].count += 1;
    });

    // By Member
    const byMember = {};
    yrEntries.forEach(e => {
      const u = users.find(u => u.id === e.userId);
      const name = u?.name || "Unknown";
      if (!byMember[name]) byMember[name] = { labor: 0, materials: 0, hours: 0, count: 0 };
      const h = calcHours(e.startTime, e.endTime);
      const r = getUserRate(users, settings, e.userId);
      byMember[name].labor += calcLabor(h, r);
      byMember[name].materials += calcMaterialsTotal(e.materials);
      byMember[name].hours += h;
      byMember[name].count += 1;
    });

    // By Month
    const byMonth = {};
    yrEntries.forEach(e => {
      const mo = e.date.slice(0, 7);
      if (!byMonth[mo]) byMonth[mo] = { labor: 0, materials: 0, hours: 0, count: 0 };
      const h = calcHours(e.startTime, e.endTime);
      const r = getUserRate(users, settings, e.userId);
      byMonth[mo].labor += calcLabor(h, r);
      byMonth[mo].materials += calcMaterialsTotal(e.materials);
      byMonth[mo].hours += h;
      byMonth[mo].count += 1;
    });

    let totalLabor = 0, totalMat = 0, totalHrs = 0;
    yrEntries.forEach(e => { const h = calcHours(e.startTime, e.endTime); const r = getUserRate(users, settings, e.userId); totalLabor += calcLabor(h, r); totalMat += calcMaterialsTotal(e.materials); totalHrs += h; });

    // Build CSV with multiple sections
    const lines = [];
    lines.push(settings.hoaName + " — Fiscal Year Report " + year);
    lines.push("Generated: " + new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }));
    lines.push("Default Hourly Rate: $" + settings.defaultHourlyRate);
    lines.push("Entries Included: " + yrEntries.length + " (Approved + Paid)");
    lines.push("");
    lines.push("═══ SUMMARY ═══");
    lines.push("Total Labor,$" + totalLabor.toFixed(2));
    lines.push("Total Materials,$" + totalMat.toFixed(2));
    lines.push("Grand Total,$" + (totalLabor + totalMat).toFixed(2));
    lines.push("Total Hours," + totalHrs.toFixed(2));
    lines.push("");
    lines.push("═══ BY CATEGORY (Chart of Accounts) ═══");
    lines.push("Category,Entries,Hours,Labor,Materials,Total");
    Object.entries(byCat).filter(([_, d]) => d.count > 0).sort((a, b) => (b[1].labor + b[1].materials) - (a[1].labor + a[1].materials)).forEach(([cat, d]) => {
      lines.push('"' + cat + '",' + d.count + "," + d.hours.toFixed(2) + "," + d.labor.toFixed(2) + "," + d.materials.toFixed(2) + "," + (d.labor + d.materials).toFixed(2));
    });
    lines.push("");
    lines.push("═══ BY MEMBER ═══");
    lines.push("Member,Entries,Hours,Labor,Materials,Total");
    Object.entries(byMember).sort((a, b) => (b[1].labor + b[1].materials) - (a[1].labor + a[1].materials)).forEach(([name, d]) => {
      lines.push('"' + name + '",' + d.count + "," + d.hours.toFixed(2) + "," + d.labor.toFixed(2) + "," + d.materials.toFixed(2) + "," + (d.labor + d.materials).toFixed(2));
    });
    lines.push("");
    lines.push("═══ BY MONTH ═══");
    lines.push("Month,Entries,Hours,Labor,Materials,Total");
    Object.keys(byMonth).sort().forEach(mo => {
      const d = byMonth[mo];
      const monthLabel = new Date(mo + "-01").toLocaleDateString("en-US", { year: "numeric", month: "long" });
      lines.push(monthLabel + "," + d.count + "," + d.hours.toFixed(2) + "," + d.labor.toFixed(2) + "," + d.materials.toFixed(2) + "," + (d.labor + d.materials).toFixed(2));
    });
    lines.push("");
    lines.push("═══ ITEMIZED ENTRIES ═══");
    lines.push("Date,Member,Category,Description,Hours,Rate,Labor,Materials,Total,Status");
    yrEntries.sort((a, b) => a.date.localeCompare(b.date)).forEach(e => {
      const u = users.find(u => u.id === e.userId);
      const h = calcHours(e.startTime, e.endTime);
      const r = getUserRate(users, settings, e.userId);
      const l = calcLabor(h, r);
      const m = calcMaterialsTotal(e.materials);
      lines.push(e.date + ',"' + (u?.name || "") + '","' + e.category + '","' + e.description.replace(/"/g, '""') + '",' + h.toFixed(2) + "," + r.toFixed(2) + "," + l.toFixed(2) + "," + m.toFixed(2) + "," + (l + m).toFixed(2) + "," + e.status);
    });

    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = settings.hoaName.replace(/\s+/g, "_") + "_FiscalYear_" + year + ".csv"; a.click();
  };

  return (
    <div className="fade-in">
      <h2 style={{ ...S.h2, marginBottom: 24 }}>Reports</h2>
      {/* Fiscal Year Export */}
      {isTreasurer && (
        <div style={{ ...S.card, marginBottom: 20, background: "#FAFCFF", borderColor: "#C7D2FE" }}>
          <div style={{ display: "flex", alignItems: mob ? "flex-start" : "center", justifyContent: "space-between", flexDirection: mob ? "column" : "row", gap: 12 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 18 }}>📊</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: BRAND.navy }}>Fiscal Year Report</span>
              </div>
              <div style={{ fontSize: 13, color: BRAND.textMuted }}>CPA-ready export: totals by category, member, and month. Includes all approved + paid entries.</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={S.btnSecondary} onClick={() => exportFiscalYear(new Date().getFullYear())}><Icon name="download" size={16} /> {new Date().getFullYear()}</button>
              <button style={{ ...S.btnGhost, fontSize: 13 }} onClick={() => exportFiscalYear(new Date().getFullYear() - 1)}>{new Date().getFullYear() - 1}</button>
            </div>
          </div>
        </div>
      )}
      <div style={S.card}>
        {/* Quick date presets */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
          <span style={{ fontSize: 12, color: BRAND.textLight, lineHeight: "30px", marginRight: 4 }}>Quick:</span>
          {[
            { label: "This Month", fn: () => { const d = new Date(); setDateFrom(d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-01"); setDateTo(todayStr()); } },
            { label: "Last Month", fn: () => { const d = new Date(); d.setMonth(d.getMonth() - 1); const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"); setDateFrom(y + "-" + m + "-01"); const end = new Date(y, d.getMonth() + 1, 0); setDateTo(end.toISOString().split("T")[0]); } },
            { label: "This Quarter", fn: () => { const d = new Date(); const q = Math.floor(d.getMonth() / 3) * 3; setDateFrom(d.getFullYear() + "-" + String(q + 1).padStart(2, "0") + "-01"); setDateTo(todayStr()); } },
            { label: "YTD", fn: () => { setDateFrom(new Date().getFullYear() + "-01-01"); setDateTo(todayStr()); } },
            { label: "Last Year", fn: () => { const y = new Date().getFullYear() - 1; setDateFrom(y + "-01-01"); setDateTo(y + "-12-31"); } },
          ].map(p => (
            <button key={p.label} onClick={() => { p.fn(); setGenerated(true); }} style={{ padding: "5px 14px", borderRadius: 14, border: "1px solid " + BRAND.borderLight, background: BRAND.white, color: BRAND.navy, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: BRAND.sans, transition: "all 150ms" }} onMouseEnter={ev => { ev.currentTarget.style.background = BRAND.navy; ev.currentTarget.style.color = "#fff"; }} onMouseLeave={ev => { ev.currentTarget.style.background = BRAND.white; ev.currentTarget.style.color = BRAND.navy; }}>{p.label}</button>
          ))}
        </div>
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
                  <caption className="sr-only">Work entries report</caption>
                  <thead><tr><th scope="col" style={S.th}>Date</th>{isTreasurer && <th scope="col" style={S.th}>Member</th>}<th scope="col" style={S.th}>Category</th><th scope="col" style={S.th}>Description</th><th scope="col" style={{ ...S.th, textAlign: "right" }}>Hours</th><th scope="col" style={{ ...S.th, textAlign: "right" }}>Total</th></tr></thead>
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
// PAGE TRANSITION LOADER
// ═══════════════════════════════════════════════════════════════════════════
const LOADING_MESSAGES = {
  dashboard: [
    { emoji: "🏠", text: "Sweeping the front porch..." },
    { emoji: "📊", text: "Crunching the numbers..." },
    { emoji: "🔑", text: "Unlocking the front door..." },
    { emoji: "☕", text: "Brewing your dashboard..." },
  ],
  entries: [
    { emoji: "📋", text: "Dusting off the clipboard..." },
    { emoji: "🔍", text: "Hunting down your entries..." },
    { emoji: "📦", text: "Unpacking the work logs..." },
    { emoji: "🗂️", text: "Organizing the filing cabinet..." },
  ],
  review: [
    { emoji: "🧐", text: "Putting on reading glasses..." },
    { emoji: "⚖️", text: "Calibrating the scales..." },
    { emoji: "🔬", text: "Inspecting the fine print..." },
    { emoji: "📝", text: "Sharpening the red pen..." },
  ],
  reports: [
    { emoji: "📈", text: "Polishing the spreadsheets..." },
    { emoji: "🧮", text: "Consulting the abacus..." },
    { emoji: "🖨️", text: "Warming up the printer..." },
    { emoji: "📊", text: "Making charts look fancy..." },
  ],
  settings: [
    { emoji: "⚙️", text: "Turning the gears..." },
    { emoji: "🔧", text: "Grabbing the wrench..." },
    { emoji: "🎛️", text: "Adjusting the dials..." },
  ],
  insights: [
    { emoji: "🏘️", text: "Surveying the neighborhood..." },
    { emoji: "🧾", text: "Tallying up the receipts..." },
    { emoji: "🔎", text: "Inspecting every penny..." },
    { emoji: "📊", text: "Crunching community numbers..." },
    { emoji: "💡", text: "Gathering HOA wisdom..." },
  ],
};
const PageLoader = ({ page }) => {
  const msgs = LOADING_MESSAGES[page] || LOADING_MESSAGES.dashboard;
  const msg = msgs[Math.floor(Math.random() * msgs.length)];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 20px", textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 16, animation: "bounce 600ms ease-in-out infinite" }}>{msg.emoji}</div>
      <div style={{ fontSize: 14, color: BRAND.textMuted, fontFamily: BRAND.sans, animation: "fadeIn 300ms ease-out" }}>{msg.text}</div>
    </div>
  );
};
// ═══════════════════════════════════════════════════════════════════════════
const RateInput = ({ initialValue, placeholder, onSave }) => {
  const [val, setVal] = useState(initialValue || "");
  return <input aria-label="Hourly rate" type="number" min="0" step="0.50" style={{ ...S.input, padding: "6px 10px" }} value={val} onChange={e => setVal(e.target.value)} onBlur={() => onSave(Number(val) || null)} placeholder={placeholder} />;
};

// ═══════════════════════════════════════════════════════════════════════════
// SETTINGS PAGE
// ═══════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════
// COMMUNITY INSIGHTS (visible to all members)
// ═══════════════════════════════════════════════════════════════════════════
const CATEGORY_COLORS = {
  "Landscaping": "#2E7D32", "Plumbing": "#1565C0", "Electrical": "#F9A825",
  "General Maintenance": "#6D4C41", "Snow Removal": "#0097A7", "Cleaning": "#7B1FA2",
  "Vendor Coordination": "#E65100", "Administrative Work": "#455A64", "Emergency Repairs": "#C62828",
};
const INSIGHTS_LOADING = [
  { emoji: "🏘️", text: "Surveying the neighborhood..." },
  { emoji: "🧾", text: "Tallying up the receipts..." },
  { emoji: "🔎", text: "Inspecting every nook and cranny..." },
  { emoji: "📊", text: "Crunching community numbers..." },
  { emoji: "🏗️", text: "Building your insights..." },
  { emoji: "🧮", text: "Doing the HOA math..." },
  { emoji: "🗃️", text: "Raiding the filing cabinet..." },
];

const CommunityInsights = ({ fetchStats, settings, mob }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadMsg] = useState(() => INSIGHTS_LOADING[Math.floor(Math.random() * INSIGHTS_LOADING.length)]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      // Minimum display time for the fun loader
      const [data] = await Promise.all([
        fetchStats(),
        new Promise(r => setTimeout(r, 1200 + Math.random() * 1000)),
      ]);
      if (!cancelled && data) setStats(data);
      if (!cancelled) setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", textAlign: "center" }}>
      <div style={{ fontSize: 44, marginBottom: 14, animation: "bounce 600ms ease-in-out infinite" }}>{loadMsg.emoji}</div>
      <div style={{ fontSize: 14, color: BRAND.textMuted, fontFamily: BRAND.sans }}>{loadMsg.text}</div>
    </div>
  );

  if (!stats || !stats.by_month?.length) return (
    <div style={{ textAlign: "center", padding: 40, color: BRAND.textLight }}>No community spending data yet. Once entries are approved, insights will appear here.</div>
  );

  const fmt = (n) => "$" + (Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const totals = stats.totals || {};
  const grandTotal = (Number(totals.total_labor) || 0) + (Number(totals.total_materials) || 0);

  // Get available years
  const years = [...new Set((stats.by_month || []).map(m => m.month.slice(0, 4)))].sort().reverse();
  const yearMonths = (stats.by_month || []).filter(m => m.month.startsWith(selectedYear));
  const yearCategories = {};
  (stats.by_month_category || []).filter(m => m.month.startsWith(selectedYear)).forEach(mc => {
    if (!yearCategories[mc.category]) yearCategories[mc.category] = { labor: 0, materials: 0, count: 0 };
    yearCategories[mc.category].labor += Number(mc.labor_total) || 0;
    yearCategories[mc.category].materials += Number(mc.materials_total) || 0;
    yearCategories[mc.category].count += Number(mc.entry_count) || 0;
  });
  const catList = Object.entries(yearCategories).sort((a, b) => (b[1].labor + b[1].materials) - (a[1].labor + a[1].materials));
  const yearTotal = catList.reduce((s, [, v]) => s + v.labor + v.materials, 0);
  const maxCat = catList.length ? catList[0][1].labor + catList[0][1].materials : 1;

  // Month names
  const monthName = (m) => {
    const [y, mo] = m.split("-");
    return new Date(Number(y), Number(mo) - 1).toLocaleDateString("en-US", { month: "short" });
  };
  const monthMaxTotal = Math.max(...yearMonths.map(m => (Number(m.labor_total) || 0) + (Number(m.materials_total) || 0)), 1);

  return (
    <div>
      {/* All-time totals */}
      <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr 1fr" : "repeat(4, 1fr)", gap: mob ? 8 : 16, marginBottom: 24 }}>
        <StatCard label="Total Spent" value={fmt(grandTotal)} icon="dollar" accentColor={BRAND.brick} />
        <StatCard label="Labor" value={fmt(totals.total_labor)} icon="users" accentColor="#1565C0" />
        <StatCard label="Materials" value={fmt(totals.total_materials)} icon="file" accentColor="#6A1B9A" />
        <StatCard label="Work Entries" value={totals.total_entries || 0} icon="check" accentColor="#2E7D32" />
      </div>

      {/* Year picker */}
      {years.length > 1 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {years.map(y => (
            <button key={y} onClick={() => setSelectedYear(y)} style={{ padding: "6px 16px", borderRadius: 20, border: "1px solid " + (selectedYear === y ? BRAND.navy : BRAND.border), background: selectedYear === y ? BRAND.navy : BRAND.white, color: selectedYear === y ? "#fff" : BRAND.textMuted, fontWeight: selectedYear === y ? 700 : 500, fontSize: 13, fontFamily: BRAND.sans, cursor: "pointer" }}>{y}</button>
          ))}
        </div>
      )}

      {/* Monthly breakdown with horizontal bars */}
      <div style={{ background: BRAND.white, border: "1px solid " + BRAND.borderLight, borderRadius: 12, padding: mob ? 16 : 24, marginBottom: 20 }}>
        <h3 style={{ fontFamily: BRAND.serif, fontSize: 18, fontWeight: 600, color: BRAND.navy, margin: "0 0 20px" }}>Monthly Spending — {selectedYear}</h3>
        {yearMonths.length === 0 ? <div style={{ color: BRAND.textLight, padding: 16, textAlign: "center" }}>No data for {selectedYear}</div> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {yearMonths.map(m => {
              const total = (Number(m.labor_total) || 0) + (Number(m.materials_total) || 0);
              const pct = (total / monthMaxTotal) * 100;
              return (
                <div key={m.month}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: BRAND.navy }}>{monthName(m.month)} {m.month.slice(0, 4)}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: BRAND.brick }}>{fmt(total)}</span>
                  </div>
                  <div style={{ height: 20, background: BRAND.bgSoft, borderRadius: 10, overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 10, width: pct + "%", minWidth: pct > 0 ? 8 : 0, background: "linear-gradient(90deg, #1565C0, #0097A7)", transition: "width 600ms ease-out" }} />
                  </div>
                  <div style={{ fontSize: 11, color: BRAND.textLight, marginTop: 2 }}>{m.entry_count} entries · {m.member_count} member{m.member_count > 1 ? "s" : ""}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Category breakdown with colored bars */}
      <div style={{ background: BRAND.white, border: "1px solid " + BRAND.borderLight, borderRadius: 12, padding: mob ? 16 : 24 }}>
        <h3 style={{ fontFamily: BRAND.serif, fontSize: 18, fontWeight: 600, color: BRAND.navy, margin: "0 0 20px" }}>Where the Money Goes — {selectedYear}</h3>
        {catList.length === 0 ? <div style={{ color: BRAND.textLight, padding: 16, textAlign: "center" }}>No data for {selectedYear}</div> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {catList.map(([cat, data]) => {
              const total = data.labor + data.materials;
              const pct = (total / maxCat) * 100;
              const sharePct = yearTotal ? ((total / yearTotal) * 100).toFixed(0) : 0;
              const color = CATEGORY_COLORS[cat] || BRAND.navy;
              const emoji = CATEGORY_EMOJIS[cat] || "🔧";
              return (
                <div key={cat}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 20 }}>{emoji}</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: BRAND.charcoal }}>{cat}</span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color }}>{fmt(total)}</span>
                      <span style={{ fontSize: 11, color: BRAND.textLight, marginLeft: 6 }}>{sharePct}%</span>
                    </div>
                  </div>
                  <div style={{ height: 14, background: color + "15", borderRadius: 7, overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 7, width: pct + "%", minWidth: pct > 0 ? 6 : 0, background: color, transition: "width 600ms ease-out", opacity: 0.85 }} />
                  </div>
                  <div style={{ display: "flex", gap: 12, fontSize: 11, color: BRAND.textLight, marginTop: 3 }}>
                    <span>Labor: {fmt(data.labor)}</span><span>Materials: {fmt(data.materials)}</span><span>{data.count} entries</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// IN-APP NOTIFICATION PANEL
// ═══════════════════════════════════════════════════════════════════════════
const NotificationPanel = ({ entries, users, settings, onView, onClose, onReviewAll, mob }) => {
  const pending = entries.filter(e => e.status === STATUSES.SUBMITTED).sort((a, b) => b.createdAt?.localeCompare(a.createdAt) || b.date.localeCompare(a.date));
  const timeAgo = (dateStr) => {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return mins + "m ago";
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + "h ago";
    const days = Math.floor(hrs / 24);
    return days + "d ago";
  };
  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 89 }} onClick={onClose} aria-hidden="true" />
      <div role="dialog" aria-label="Notifications" style={{ position: "absolute", top: mob ? "100%" : 44, right: mob ? 16 : 0, width: mob ? "calc(100vw - 32px)" : 360, maxHeight: 420, background: BRAND.white, borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.15)", border: "1px solid " + BRAND.borderLight, zIndex: 90, overflow: "hidden", animation: "fadeIn 200ms ease-out" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid " + BRAND.borderLight }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="bell" size={18} />
            <span style={{ fontWeight: 700, fontSize: 15, color: BRAND.navy }}>Notifications</span>
            {pending.length > 0 && <span aria-label={pending.length + " pending"} style={{ background: "#EF4444", color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10 }}>{pending.length}</span>}
          </div>
          <button aria-label="Close notifications" style={{ background: "none", border: "none", color: BRAND.textLight, cursor: "pointer", padding: 8, minWidth: 36, minHeight: 36, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}><Icon name="x" size={18} /></button>
        </div>
        <div style={{ overflowY: "auto", maxHeight: 320 }}>
          {pending.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
              <div style={{ fontWeight: 600, color: BRAND.navy, marginBottom: 4 }}>All caught up!</div>
              <div style={{ fontSize: 13, color: BRAND.textLight }}>No entries waiting for your review.</div>
            </div>
          ) : (
            pending.map((e, i) => {
              const u = users.find(u => u.id === e.userId);
              const h = calcHours(e.startTime, e.endTime);
              const r = getUserRate(users, settings, e.userId);
              const total = calcLabor(h, r) + calcMaterialsTotal(e.materials);
              return (
                <div key={e.id} role="button" tabIndex={0} onKeyDown={ev => (ev.key === "Enter" || ev.key === " ") && (ev.preventDefault(), onView(e))} aria-label={(u?.name || "Member") + ": " + e.category + ", " + fmt(total)} style={{ padding: "12px 16px", borderBottom: i < pending.length - 1 ? "1px solid " + BRAND.borderLight : "none", cursor: "pointer", background: BRAND.white, transition: "background 150ms" }} onClick={() => onView(e)} onMouseEnter={ev => ev.currentTarget.style.background = BRAND.bgSoft} onMouseLeave={ev => ev.currentTarget.style.background = BRAND.white}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 14, background: BRAND.brick + "18", color: BRAND.brick, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{(u?.name || "?").split(" ").map(n => n[0]).join("").slice(0, 2)}</div>
                      <span style={{ fontWeight: 600, fontSize: 13, color: BRAND.navy }}>{u?.name || "Member"}</span>
                    </div>
                    <span style={{ fontSize: 11, color: BRAND.textLight, whiteSpace: "nowrap" }}>{timeAgo(e.createdAt)}</span>
                  </div>
                  <div style={{ marginLeft: 36, fontSize: 13, color: BRAND.charcoal, marginBottom: 4 }}><CategoryBadge category={e.category} /> <span style={{ marginLeft: 4 }}>{e.description.slice(0, 60)}{e.description.length > 60 ? "..." : ""}</span></div>
                  <div style={{ marginLeft: 36, display: "flex", gap: 12, fontSize: 12, color: BRAND.textLight }}>
                    <span>{formatDate(e.date)}</span><span>{fmtHours(h)}</span><span style={{ fontWeight: 600, color: BRAND.brick }}>{fmt(total)}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
        {pending.length > 0 && (
          <div style={{ padding: "10px 16px", borderTop: "1px solid " + BRAND.borderLight, textAlign: "center" }}>
            <button style={{ background: "none", border: "none", color: BRAND.brick, fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: BRAND.sans }} onClick={onReviewAll}>Review All ({pending.length}) →</button>
          </div>
        )}
      </div>
    </>
  );
};

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
        <div style={{ borderTop: "1px solid " + BRAND.borderLight, marginTop: 8, paddingTop: 16 }}>
          <div style={S.sectionLabel}>Governance</div>
          <Field label="Annual Reimbursement Budget ($)"><div><input type="number" min="0" step="500" style={S.input} value={form.annualBudget || ""} onChange={e => set("annualBudget", Number(e.target.value))} placeholder="0 = no limit" /><div style={{ fontSize: 12, color: BRAND.textLight, marginTop: 6 }}>Set to 0 to disable. Shows a progress bar on the dashboard.</div></div></Field>
          <Field label="Dual Approval Threshold ($)"><div><input type="number" min="0" step="50" style={S.input} value={form.dualApprovalThreshold || ""} onChange={e => set("dualApprovalThreshold", Number(e.target.value))} placeholder="0 = single approval" /><div style={{ fontSize: 12, color: BRAND.textLight, marginTop: 6 }}>Entries ≥ this amount require two board members to approve. Set to 0 to disable.</div></div></Field>
        </div>
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
              <thead><tr><th scope="col" style={S.th}>Name</th><th scope="col" style={S.th}>Email</th><th scope="col" style={{ ...S.th, width: 120 }}>Rate</th><th scope="col" style={{ ...S.th, width: 50 }}></th></tr></thead>
              <tbody>{members.map(u => (
                <tr key={u.id}>
                  <td style={{ ...S.td, fontWeight: 500 }}>{u.name}</td>
                  <td style={{ ...S.td, color: BRAND.textMuted }}>{u.email}</td>
                  <td style={S.td}><RateInput initialValue={u.hourlyRate} placeholder={"$" + form.defaultHourlyRate} onSave={val => onUpdateRate(u.id, val)} /></td>
                  <td style={S.td}><button aria-label={"Remove " + u.name} style={{ ...S.btnGhost, padding: 6, color: BRAND.error }} onClick={() => setDeleteTarget(u)}><Icon name="trash" size={16} /></button></td>
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
    saveEntry, deleteEntry, approveEntry, firstApprove, secondApprove, rejectEntry, markPaid,
    saveSettings, addUser, removeUser, updateUserRate,
    setAuthError, fetchCommunityStats,
  } = useSupabase();

  const [page, setPage] = useState("dashboard");
  const [viewEntry, setViewEntry] = useState(null);
  const [editEntry, setEditEntry] = useState(null);
  const [newEntry, setNewEntry] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [pageLoading, setPageLoading] = useState(null); // null = not loading, string = target page
  const [authMode, setAuthMode] = useState("login"); // "login" or "register"
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regCode, setRegCode] = useState("");
  const [regError, setRegError] = useState("");
  const [registering, setRegistering] = useState(false);
  const [regSuccess, setRegSuccess] = useState(false);
  const [filterSearch, setFilterSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterMember, setFilterMember] = useState("all");

  // Sync auth errors from hook
  useEffect(() => { if (authError) setLoginError(authError); }, [authError]);

  const isTreasurer = currentUser?.role === ROLES.TREASURER;
  const myEntries = entries.filter(e => isTreasurer || e.userId === currentUser?.id).sort((a, b) => b.date.localeCompare(a.date));
  const pendingCount = entries.filter(e => e.status === STATUSES.SUBMITTED || e.status === STATUSES.AWAITING_SECOND).length;

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
  const nav = (p) => {
    if (p === page && !viewEntry && !editEntry && !newEntry) return; // already there
    setViewEntry(null); setEditEntry(null); setNewEntry(false); setDrawerOpen(false);
    setPageLoading(p);
    const delay = 800 + Math.floor(Math.random() * 800); // 800-1600ms
    setTimeout(() => { setPageLoading(null); setPage(p); }, delay);
  };

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
  const doApprove = async (notes) => {
    if (!viewEntry) return;
    const h = calcHours(viewEntry.startTime, viewEntry.endTime);
    const r = getRate(viewEntry.userId);
    const total = calcLabor(h, r) + calcMaterialsTotal(viewEntry.materials);
    const needsDual = settings.dualApprovalThreshold > 0 && total >= settings.dualApprovalThreshold;
    if (needsDual) {
      const updated = await firstApprove(viewEntry.id, notes, "Dual approval required (" + fmt(total) + " ≥ " + fmt(settings.dualApprovalThreshold) + ")");
      if (updated) setViewEntry(updated);
    } else {
      const updated = await approveEntry(viewEntry.id, notes);
      if (updated) setViewEntry(updated);
    }
  };
  const doSecondApprove = async (id) => { const updated = await secondApprove(id); if (updated) setViewEntry(updated); };
  const doReject = async (notes) => { if (viewEntry) { const updated = await rejectEntry(viewEntry.id, notes); if (updated) setViewEntry(updated); } };
  const doMarkPaid = async (paymentDetails) => { if (viewEntry) { const updated = await markPaid(viewEntry.id, paymentDetails); if (updated) setViewEntry(updated); } };
  // Quick approve/reject from review queue (without opening detail)
  const doApproveEntry = async (id, notes) => { await approveEntry(id, notes); };
  const doRejectEntry = async (id, notes) => { await rejectEntry(id, notes); };

  // Dashboard stats
  const dashStats = (() => {
    if (!currentUser) return { total: 0, approved: 0, pending: 0, monthReimb: 0, paid: 0, ytdReimb: 0, monthHours: 0, pendingPayout: 0 };
    const relevant = isTreasurer ? entries : entries.filter(e => e.userId === currentUser.id);
    const approved = relevant.filter(e => e.status === STATUSES.APPROVED || e.status === STATUSES.PAID);
    const thisMonth = approved.filter(e => e.date.startsWith(new Date().toISOString().slice(0, 7)));
    const thisYear = approved.filter(e => e.date.startsWith(String(new Date().getFullYear())));
    let monthReimb = 0, ytdReimb = 0, monthHours = 0, pendingPayout = 0;
    thisMonth.forEach(e => { const h = calcHours(e.startTime, e.endTime); const r = getRate(e.userId); monthReimb += calcLabor(h, r) + calcMaterialsTotal(e.materials); monthHours += h; });
    thisYear.forEach(e => { const h = calcHours(e.startTime, e.endTime); const r = getRate(e.userId); ytdReimb += calcLabor(h, r) + calcMaterialsTotal(e.materials); });
    relevant.filter(e => e.status === STATUSES.APPROVED).forEach(e => { const h = calcHours(e.startTime, e.endTime); const r = getRate(e.userId); pendingPayout += calcLabor(h, r) + calcMaterialsTotal(e.materials); });
    return { total: relevant.length, approved: approved.length, pending: relevant.filter(e => e.status === STATUSES.SUBMITTED).length, monthReimb, paid: relevant.filter(e => e.status === STATUSES.PAID).length, ytdReimb, monthHours, pendingPayout };
  })();

  // ══════════════════════════════════════════════════════════════════════════
  // LOGIN SCREEN
  // ══════════════════════════════════════════════════════════════════════════
  if (!currentUser) {
    if (loading) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: BRAND.bgSoft, fontFamily: BRAND.sans }}><div style={{ textAlign: "center" }}><img src="/logo.png" alt="24 Mill Street" style={{ width: 120, height: 120, objectFit: "contain", margin: "0 auto 16px", display: "block", opacity: 0.5 }} /><div style={{ fontSize: 14, color: BRAND.textMuted }}>Loading...</div></div></div>;
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
              <form onSubmit={e => { e.preventDefault(); handleLogin(); }} autoComplete="on">
                <label style={S.label} htmlFor="login-email">Email Address</label>
                <input id="login-email" name="email" type="email" autoComplete="username" style={{ ...S.input, marginBottom: 16, fontSize: 15, padding: "12px 16px" }} value={loginEmail} onChange={e => { setLoginEmail(e.target.value); setLoginError(""); }} placeholder="you@example.com" autoFocus />
                <label style={S.label} htmlFor="login-password">Password</label>
                <input id="login-password" name="password" type="password" autoComplete="current-password" style={{ ...S.input, marginBottom: loginError ? 8 : 20, fontSize: 15, padding: "12px 16px", borderColor: loginError ? BRAND.error : BRAND.border }} value={loginPassword} onChange={e => { setLoginPassword(e.target.value); setLoginError(""); }} placeholder="Enter your password" />
                {loginError && <div style={{ color: BRAND.error, fontSize: 13, marginBottom: 16, display: "flex", alignItems: "flex-start", gap: 6 }}><Icon name="alert" size={14} /><span>{loginError}</span></div>}
                <button type="submit" style={{ ...S.btnPrimary, width: "100%", justifyContent: "center", padding: "12px 20px", fontSize: 15, borderRadius: 8, opacity: loggingIn ? 0.6 : 1 }} disabled={loggingIn}>{loggingIn ? "Signing in..." : "Sign In"}</button>
              </form>
            ) : regSuccess ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ width: 48, height: 48, borderRadius: 24, background: BRAND.success + "15", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: BRAND.success }}><Icon name="check" size={24} /></div>
                <div style={{ fontSize: 18, fontWeight: 600, color: BRAND.navy, marginBottom: 8, fontFamily: BRAND.serif }}>Account Created!</div>
                <div style={{ fontSize: 14, color: BRAND.textMuted, marginBottom: 24, lineHeight: 1.6 }}>You can now sign in with your email and password.</div>
                <button style={{ ...S.btnPrimary, width: "100%", justifyContent: "center", padding: "12px 20px", fontSize: 15, borderRadius: 8 }} onClick={() => { setAuthMode("login"); setLoginEmail(regEmail); setRegSuccess(false); }}>Go to Sign In</button>
              </div>
            ) : (
              <form onSubmit={e => { e.preventDefault(); handleRegister(); }} autoComplete="on">
                <label style={S.label} htmlFor="reg-name">Full Name</label>
                <input id="reg-name" name="name" type="text" autoComplete="name" style={{ ...S.input, marginBottom: 16, fontSize: 15, padding: "12px 16px" }} value={regName} onChange={e => { setRegName(e.target.value); setRegError(""); }} placeholder="Your full name" autoFocus />
                <label style={S.label} htmlFor="reg-email">Email Address</label>
                <input id="reg-email" name="email" type="email" autoComplete="username" style={{ ...S.input, marginBottom: 16, fontSize: 15, padding: "12px 16px" }} value={regEmail} onChange={e => { setRegEmail(e.target.value); setRegError(""); }} placeholder="you@example.com" />
                <label style={S.label} htmlFor="reg-password">Password</label>
                <input id="reg-password" name="password" type="password" autoComplete="new-password" style={{ ...S.input, marginBottom: 16, fontSize: 15, padding: "12px 16px" }} value={regPassword} onChange={e => { setRegPassword(e.target.value); setRegError(""); }} placeholder="Min 6 characters" />
                <label style={S.label} htmlFor="reg-code">Invite Code</label>
                <input id="reg-code" name="invite-code" type="text" autoComplete="off" style={{ ...S.input, marginBottom: regError ? 8 : 20, fontSize: 15, padding: "12px 16px", borderColor: regError ? BRAND.error : BRAND.border, textTransform: "uppercase", letterSpacing: "0.1em" }} value={regCode} onChange={e => { setRegCode(e.target.value); setRegError(""); }} placeholder="From your HOA Treasurer" />
                {regError && <div style={{ color: BRAND.error, fontSize: 13, marginBottom: 16, display: "flex", alignItems: "flex-start", gap: 6 }}><Icon name="alert" size={14} /><span>{regError}</span></div>}
                <button type="submit" style={{ ...S.btnPrimary, width: "100%", justifyContent: "center", padding: "12px 20px", fontSize: 15, borderRadius: 8, opacity: registering ? 0.6 : 1 }} disabled={registering}>{registering ? "Creating account..." : "Create Account"}</button>
              </form>
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
    ...(!isTreasurer ? [{ id: "insights", label: "Community Insights", icon: "insights" }] : []),
    ...(isTreasurer ? [{ id: "review", label: "Review Queue", icon: "inbox", badge: pendingCount }] : []),
    ...(isTreasurer ? [{ id: "reports", label: "Reports", icon: "chart" }] : []),
    ...(isTreasurer ? [{ id: "insights", label: "Community Insights", icon: "insights" }] : []),
    ...(isTreasurer ? [{ id: "settings", label: "Settings", icon: "settings" }] : []),
  ];
  const bottomTabs = isTreasurer ? [
    { id: "dashboard", label: "Home", icon: "home", iconFilled: "homeFilled", color: "#2E7D32", tint: "#2E7D3218" },
    { id: "entries", label: "Entries", icon: "clipboard", iconFilled: "clipboardFilled", color: "#1565C0", tint: "#1565C018" },
    { id: "review", label: "Review", icon: "shieldCheck", iconFilled: "shieldCheckFilled", color: BRAND.brick, tint: BRAND.brick + "18", badge: pendingCount },
    { id: "reports", label: "Reports", icon: "barChart", iconFilled: "barChartFilled", color: "#6A1B9A", tint: "#6A1B9A18" },
  ] : [
    { id: "dashboard", label: "Home", icon: "home", iconFilled: "homeFilled", color: "#2E7D32", tint: "#2E7D3218" },
    { id: "entries", label: "Entries", icon: "clipboard", iconFilled: "clipboardFilled", color: "#1565C0", tint: "#1565C018" },
    { id: "insights", label: "Insights", icon: "insights", iconFilled: "insightsFilled", color: "#6A1B9A", tint: "#6A1B9A18" },
  ];

  // ══════════════════════════════════════════════════════════════════════════
  // PAGE CONTENT
  // ══════════════════════════════════════════════════════════════════════════
  const renderPage = () => {
    if (pageLoading) return <PageLoader page={pageLoading} />;
    if (newEntry || editEntry) return (
      <div className="fade-in"><h2 style={{ ...S.h2, marginBottom: 24 }}>{editEntry ? "Edit Entry" : "New Work Entry"}</h2>
        <div style={S.card}><EntryForm entry={editEntry} settings={settings} users={users} currentUser={currentUser} onSave={doSave} onSubmit={doSubmit} onCancel={() => { setNewEntry(false); setEditEntry(null); }} onDelete={doDelete} mob={mob} /></div></div>
    );
    if (viewEntry) {
      const fresh = entries.find(e => e.id === viewEntry.id) || viewEntry;
      return <EntryDetail entry={fresh} settings={settings} users={users} currentUser={currentUser} onBack={() => setViewEntry(null)} onEdit={() => { setEditEntry(fresh); setViewEntry(null); }} onApprove={doApprove} onReject={doReject} onMarkPaid={doMarkPaid} onSecondApprove={doSecondApprove} onDuplicate={(e) => { setViewEntry(null); setEditEntry(null); setNewEntry(true); setTimeout(() => setEditEntry({ ...e, id: null, status: STATUSES.DRAFT, date: todayStr(), startTime: nowTime(), endTime: "", preImages: [], postImages: [], reviewerNotes: "", reviewedAt: "", paidAt: "" }), 50); }} mob={mob} />;
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
            {isTreasurer ? (<>
              <StatCard label="Total Entries" value={dashStats.total} icon="file" />
              <StatCard label="Pending Review" value={dashStats.pending} icon="clock" accentColor={BRAND.warning} />
              <StatCard label="Approved" value={dashStats.approved} icon="check" accentColor={BRAND.success} />
              <StatCard label="This Month" value={fmt(dashStats.monthReimb)} icon="dollar" accentColor={BRAND.brick} />
            </>) : (<>
              <StatCard label="This Month" value={fmt(dashStats.monthReimb)} icon="dollar" accentColor={BRAND.brick} />
              <StatCard label="Hours This Month" value={fmtHours(dashStats.monthHours)} icon="clock" accentColor="#2563eb" />
              <StatCard label="Pending Payout" value={fmt(dashStats.pendingPayout)} icon="alert" accentColor={BRAND.warning} />
              <StatCard label="Year to Date" value={fmt(dashStats.ytdReimb)} icon="chart" accentColor={BRAND.success} />
            </>)}
          </div>
          {isTreasurer && pendingCount > 0 && (
            <div style={{ ...S.card, background: "#FFF8F0", borderColor: "#F0D4A8", borderLeft: "4px solid " + BRAND.warning, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}><Icon name="alert" size={20} /><span style={{ fontWeight: 600 }}>{pendingCount} entry(ies) awaiting your review</span></div>
              <button style={S.btnPrimary} onClick={() => setPage("review")}>Review Now</button>
            </div>
          )}
          {/* Annual Budget Progress Bar */}
          {isTreasurer && settings.annualBudget > 0 && (() => {
            const yr = String(new Date().getFullYear());
            let ytdSpent = 0;
            entries.filter(e => (e.status === STATUSES.APPROVED || e.status === STATUSES.PAID) && e.date.startsWith(yr)).forEach(e => { const h = calcHours(e.startTime, e.endTime); const r = getRate(e.userId); ytdSpent += calcLabor(h, r) + calcMaterialsTotal(e.materials); });
            const pct = Math.min((ytdSpent / settings.annualBudget) * 100, 100);
            const isWarning = pct >= 80;
            const isDanger = pct >= 100;
            const barColor = isDanger ? BRAND.error : isWarning ? BRAND.warning : "#2E7D32";
            return (
              <div style={{ ...S.card, padding: "18px 24px", marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 18 }}>💰</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: BRAND.navy }}>{yr} Reimbursement Budget</span>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: barColor }}>{pct.toFixed(0)}% used</span>
                </div>
                <div style={{ height: 12, background: BRAND.bgSoft, borderRadius: 6, overflow: "hidden", marginBottom: 8 }}>
                  <div style={{ height: "100%", borderRadius: 6, width: pct + "%", background: barColor, transition: "width 600ms ease-out" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: BRAND.textMuted }}>{fmt(ytdSpent)} spent</span>
                  <span style={{ color: BRAND.textLight }}>{fmt(settings.annualBudget - ytdSpent)} remaining of {fmt(settings.annualBudget)}</span>
                </div>
                {isWarning && !isDanger && <div style={{ marginTop: 8, fontSize: 12, fontWeight: 600, color: BRAND.warning }}>⚠️ Budget is at {pct.toFixed(0)}% — approaching the annual limit.</div>}
                {isDanger && <div style={{ marginTop: 8, fontSize: 12, fontWeight: 600, color: BRAND.error }}>🚨 Budget exceeded! Approved reimbursements surpass the annual budget.</div>}
              </div>
            );
          })()}
          {/* Rejected entries banner for members */}
          {!isTreasurer && (() => { const rejected = myEntries.filter(e => e.status === STATUSES.REJECTED); return rejected.length > 0 ? (
            <div style={{ ...S.card, background: "#FFF5F5", borderColor: "#F0BABA", borderLeft: "4px solid " + BRAND.error, display: "flex", alignItems: mob ? "flex-start" : "center", justifyContent: "space-between", flexDirection: mob ? "column" : "row", gap: 10, marginBottom: mob ? 8 : 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}><span style={{ fontSize: 20 }}>⚠️</span><div><span style={{ fontWeight: 600, display: "block", color: BRAND.error }}>{rejected.length} entry(ies) need your attention</span><span style={{ fontSize: 13, color: BRAND.textMuted }}>The Treasurer returned these with notes. Fix and resubmit.</span></div></div>
              <button style={{ ...S.btnPrimary, background: BRAND.error }} onClick={() => { setFilterStatus(STATUSES.REJECTED); nav("entries"); }}>View Rejected →</button>
            </div>
          ) : null; })()}
          {/* Onboarding card for new members */}
          {myEntries.length === 0 && !isTreasurer && (
            <div style={{ ...S.card, background: "linear-gradient(135deg, #EEF2FF 0%, #F0FDF4 100%)", borderColor: "#C7D2FE", padding: mob ? 20 : 28 }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>👋</div>
              <div style={{ fontFamily: BRAND.serif, fontSize: 20, fontWeight: 600, color: BRAND.navy, marginBottom: 8 }}>Welcome to {settings.hoaName}!</div>
              <div style={{ fontSize: 14, color: BRAND.charcoal, lineHeight: 1.7, marginBottom: 16 }}>Here's how reimbursement works:<br/>
                <strong>1.</strong> Log your work — date, time, category, and what you did<br/>
                <strong>2.</strong> Add materials and photos if applicable<br/>
                <strong>3.</strong> Submit for review — the Treasurer will approve or request changes<br/>
                <strong>4.</strong> Get reimbursed once approved</div>
              <button style={S.btnPrimary} onClick={() => setNewEntry(true)}><Icon name="plus" size={16} /> Create Your First Entry</button>
            </div>
          )}
          <div style={S.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}><h3 style={S.h3}>Recent Entries</h3><button style={S.btnGhost} onClick={() => setPage("entries")}>View all →</button></div>
            {recent.length === 0 ? <div style={{ textAlign: "center", padding: 40, color: BRAND.textLight }}>No entries yet. Create your first work entry.</div>
            : mob ? recent.map(e => <EntryCard key={e.id} entry={e} users={users} settings={settings} onClick={() => setViewEntry(e)} />)
            : (
              <div style={{ border: "1px solid " + BRAND.borderLight, borderRadius: 8, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead><tr><th scope="col" style={S.th}>Date</th>{isTreasurer && <th scope="col" style={S.th}>Member</th>}<th scope="col" style={S.th}>Category</th><th scope="col" style={S.th}>Description</th><th scope="col" style={{ ...S.th, textAlign: "right" }}>Total</th><th scope="col" style={S.th}>Status</th></tr></thead>
                  <tbody>{recent.map((e, i) => { const u = users.find(u => u.id === e.userId); const h = calcHours(e.startTime, e.endTime); const r = getUserRate(users, settings, e.userId); const total = calcLabor(h, r) + calcMaterialsTotal(e.materials); return (
                    <tr key={e.id} tabIndex={0} role="row" onKeyDown={ev => (ev.key === "Enter" || ev.key === " ") && (ev.preventDefault(), setViewEntry(e))} onClick={() => setViewEntry(e)} style={{ cursor: "pointer", background: i % 2 === 1 ? BRAND.bgSoft : BRAND.white, transition: "background 150ms" }} onMouseEnter={ev => ev.currentTarget.style.background = BRAND.beige + "40"} onMouseLeave={ev => ev.currentTarget.style.background = i % 2 === 1 ? BRAND.bgSoft : BRAND.white}>
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={S.h2}>{isTreasurer ? "All Entries" : "My Entries"}</h2>
          {!mob && <button style={S.btnPrimary} onClick={() => setNewEntry(true)}><Icon name="plus" size={16} /> New Entry</button>}
        </div>
        {/* Filter bar */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16, alignItems: "center" }}>
          <input style={{ ...S.input, width: mob ? "100%" : 200, padding: "8px 12px", fontSize: 13 }} placeholder="🔍 Search descriptions..." value={filterSearch} onChange={e => setFilterSearch(e.target.value)} />
          <select style={{ ...S.select, width: "auto", padding: "8px 12px", fontSize: 13, minWidth: 120 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="all">All Statuses</option>
            {Object.values(STATUSES).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select style={{ ...S.select, width: "auto", padding: "8px 12px", fontSize: 13, minWidth: 130 }} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
            <option value="all">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {isTreasurer && (
            <select style={{ ...S.select, width: "auto", padding: "8px 12px", fontSize: 13, minWidth: 130 }} value={filterMember} onChange={e => setFilterMember(e.target.value)}>
              <option value="all">All Members</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          )}
          {(filterSearch || filterStatus !== "all" || filterCategory !== "all" || filterMember !== "all") && (
            <button style={{ ...S.btnGhost, fontSize: 12, padding: "6px 10px" }} onClick={() => { setFilterSearch(""); setFilterStatus("all"); setFilterCategory("all"); setFilterMember("all"); }}>Clear filters</button>
          )}
        </div>
        {(() => {
          let filtered = myEntries;
          if (filterSearch) { const q = filterSearch.toLowerCase(); filtered = filtered.filter(e => e.description.toLowerCase().includes(q) || e.category.toLowerCase().includes(q)); }
          if (filterStatus !== "all") filtered = filtered.filter(e => e.status === filterStatus);
          if (filterCategory !== "all") filtered = filtered.filter(e => e.category === filterCategory);
          if (filterMember !== "all") filtered = filtered.filter(e => e.userId === filterMember);
          return filtered.length === 0 ? <div style={{ ...S.card, textAlign: "center", padding: 60, color: BRAND.textLight }}>{myEntries.length === 0 ? "No entries yet." : "No entries match your filters."}</div>
          : mob ? filtered.map(e => <EntryCard key={e.id} entry={e} users={users} settings={settings} onClick={() => setViewEntry(e)} />)
          : (
            <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead><tr><th scope="col" style={S.th}>Date</th>{isTreasurer && <th scope="col" style={S.th}>Member</th>}<th scope="col" style={S.th}>Category</th><th scope="col" style={S.th}>Description</th><th scope="col" style={{ ...S.th, textAlign: "right" }}>Hours</th><th scope="col" style={{ ...S.th, textAlign: "right" }}>Total</th><th scope="col" style={S.th}>Status</th></tr></thead>
                <tbody>{filtered.map((e, i) => { const u = users.find(u => u.id === e.userId); const h = calcHours(e.startTime, e.endTime); const r = getUserRate(users, settings, e.userId); const total = calcLabor(h, r) + calcMaterialsTotal(e.materials); return (
                  <tr key={e.id} tabIndex={0} role="row" onKeyDown={ev => (ev.key === "Enter" || ev.key === " ") && (ev.preventDefault(), setViewEntry(e))} onClick={() => setViewEntry(e)} style={{ cursor: "pointer", background: i % 2 === 1 ? BRAND.bgSoft : BRAND.white, transition: "background 150ms" }} onMouseEnter={ev => ev.currentTarget.style.background = BRAND.beige + "40"} onMouseLeave={ev => ev.currentTarget.style.background = i % 2 === 1 ? BRAND.bgSoft : BRAND.white}>
                    <td style={S.td}>{formatDate(e.date)}</td>{isTreasurer && <td style={S.td}>{u?.name}</td>}<td style={S.td}><CategoryBadge category={e.category} /></td><td style={{ ...S.td, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.description}</td><td style={{ ...S.td, textAlign: "right" }}>{fmtHours(h)}</td><td style={{ ...S.td, textAlign: "right", fontWeight: 600 }}>{fmt(total)}</td><td style={S.td}><StatusBadge status={e.status} /></td>
                  </tr>); })}</tbody>
              </table>
            </div>
          );
        })()}
      </div>
    );
    if (page === "review") {
      if (!isTreasurer) { nav("dashboard"); return null; }
      const pending = entries.filter(e => e.status === STATUSES.SUBMITTED || e.status === STATUSES.AWAITING_SECOND).sort((a, b) => a.date.localeCompare(b.date));
      return (
        <div className="fade-in">
          <h2 style={{ ...S.h2, marginBottom: 8 }}>Review Queue</h2>
          <p style={{ margin: "0 0 24px", fontSize: 14, color: BRAND.textMuted }}>{pending.length} entries pending your review</p>
          {pending.length === 0 ? <div style={{ ...S.card, textAlign: "center", padding: 60, color: BRAND.textLight }}>All caught up! No entries to review.</div> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {pending.map(e => { const u = users.find(u => u.id === e.userId); const h = calcHours(e.startTime, e.endTime); const r = getUserRate(users, settings, e.userId); const total = calcLabor(h, r) + calcMaterialsTotal(e.materials); return (
                <div key={e.id} style={{ ...S.card, padding: "20px 24px", transition: "box-shadow 150ms", borderLeft: "4px solid " + BRAND.brick }} onMouseEnter={ev => ev.currentTarget.style.boxShadow = "0 4px 16px rgba(31,42,56,0.08)"} onMouseLeave={ev => ev.currentTarget.style.boxShadow = "0 1px 3px rgba(31,42,56,0.04)"}>
                  <div role="button" tabIndex={0} onKeyDown={ev => (ev.key === "Enter" || ev.key === " ") && (ev.preventDefault(), setViewEntry(e))} style={{ display: "flex", justifyContent: "space-between", cursor: "pointer" }} onClick={() => setViewEntry(e)}>
                    <div><div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}><span style={{ fontWeight: 700, fontSize: 16, color: BRAND.navy }}>{u?.name}</span><CategoryBadge category={e.category} /></div><div style={{ fontSize: 14, color: BRAND.charcoal, marginBottom: 4 }}>{e.description}</div><div style={{ fontSize: 13, color: BRAND.textLight }}>{formatDate(e.date)} · {fmtHours(h)}</div></div>
                    <div style={{ textAlign: "right" }}><div style={{ fontSize: 22, fontWeight: 800, color: BRAND.brick }}>{fmt(total)}</div><div style={{ fontSize: 12, color: BRAND.textLight }}>reimbursement</div></div>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 12, paddingTop: 12, borderTop: "1px solid " + BRAND.borderLight, justifyContent: "flex-end" }}>
                    <button style={{ ...S.btnGhost, fontSize: 13, padding: "6px 14px" }} onClick={() => setViewEntry(e)}>View Details</button>
                    <button style={{ ...S.btnDanger, fontSize: 13, padding: "6px 14px" }} onClick={async (ev) => { ev.stopPropagation(); const note = prompt("Rejection reason:"); if (note) await doRejectEntry(e.id, note); }}><Icon name="x" size={14} /> Reject</button>
                    <button style={{ ...S.btnSuccess, fontSize: 13, padding: "6px 14px" }} onClick={async (ev) => { ev.stopPropagation(); await doApproveEntry(e.id, ""); }}><Icon name="check" size={14} /> Approve</button>
                  </div>
                </div>); })}
            </div>
          )}
        </div>
      );
    }
    if (page === "reports") { if (!isTreasurer) { nav("dashboard"); return null; } return <ReportsPage entries={entries} users={users} settings={settings} currentUser={currentUser} mob={mob} />; }
    if (page === "settings") { if (!isTreasurer) { nav("dashboard"); return null; } return <SettingsPage settings={settings} users={users} currentUser={currentUser} onSaveSettings={saveSettings} onAddUser={addUser} onRemoveUser={removeUser} onUpdateRate={updateUserRate} />; }
    if (page === "insights") return (
      <div className="fade-in">
        <h2 style={{ ...S.h2, marginBottom: 8 }}>Community Insights</h2>
        <p style={{ margin: "0 0 24px", fontSize: 14, color: BRAND.textMuted }}>See how your HOA dollars are being put to work.</p>
        <CommunityInsights fetchStats={fetchCommunityStats} settings={settings} mob={mob} />
      </div>
    );
    return null;
  };

  // ══════════════════════════════════════════════════════════════════════════
  // MAIN LAYOUT
  // ══════════════════════════════════════════════════════════════════════════
  const initials = currentUser.name.split(" ").map(n => n[0]).join("");
  const isActive = (id) => page === id && !viewEntry && !editEntry && !newEntry;

  if (mob) {
    return (
      <div style={{ minHeight: "100vh", fontFamily: BRAND.sans, background: BRAND.bgSoft, color: BRAND.charcoal, paddingBottom: 88 }}>
        <a href="#main-content" className="skip-link">Skip to main content</a>
        {/* Mobile top bar */}
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: BRAND.navy, position: "sticky", top: 0, zIndex: 20 }} role="banner">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/logo.png" alt="24 Mill Street logo" style={{ width: 32, height: 32, borderRadius: 4, objectFit: "cover", background: BRAND.beige }} />
            <span style={{ fontFamily: BRAND.serif, fontWeight: 600, fontSize: 16, color: "#fff" }}>24 Mill</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {isTreasurer && (
              <button style={{ background: "none", border: "none", color: "#fff", padding: 6, cursor: "pointer", position: "relative", minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowNotifPanel(p => !p)} aria-label={"Notifications" + (pendingCount > 0 ? ", " + pendingCount + " pending" : "")}>
                <Icon name="bell" size={22} />
                {pendingCount > 0 && <span aria-hidden="true" style={{ position: "absolute", top: 2, right: 2, background: "#EF4444", color: "#fff", fontSize: 9, fontWeight: 700, width: 16, height: 16, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid " + BRAND.navy }}>{pendingCount}</span>}
              </button>
            )}
            <button style={{ background: "none", border: "none", color: "#fff", padding: 4, cursor: "pointer", minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setDrawerOpen(true)} aria-label="Open navigation menu"><Icon name="menu" size={24} /></button>
          </div>
        </header>
        {/* Notification panel */}
        {showNotifPanel && isTreasurer && <NotificationPanel entries={entries} users={users} settings={settings} onView={(e) => { setShowNotifPanel(false); setViewEntry(e); }} onClose={() => setShowNotifPanel(false)} onReviewAll={() => { setShowNotifPanel(false); nav("review"); }} mob={mob} />}
        {/* Slide-out drawer */}
        {drawerOpen && (
          <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.4)" }} onClick={() => setDrawerOpen(false)} aria-hidden="true">
            <div role="dialog" aria-label="Navigation menu" style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 280, background: BRAND.navy, padding: "20px 16px", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                <span style={{ fontFamily: BRAND.serif, fontWeight: 600, fontSize: 18, color: "#fff" }}>Menu</span>
                <button aria-label="Close menu" style={{ background: "none", border: "none", color: "#9B978F", cursor: "pointer", padding: 8, minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setDrawerOpen(false)}><Icon name="x" size={24} /></button>
              </div>
              <div style={{ padding: "12px 8px", borderRadius: 8, background: "rgba(255,255,255,0.06)", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
                <div aria-hidden="true" style={{ width: 36, height: 36, borderRadius: 6, background: isTreasurer ? BRAND.brick : BRAND.green, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff" }}>{initials}</div>
                <div><div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{currentUser.name}</div><div style={{ fontSize: 13, color: "#7A766E" }}>{currentUser.role}</div></div>
              </div>
              {navItems.map(item => (
                <button key={item.id} aria-current={isActive(item.id) ? "page" : undefined} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 12px", borderRadius: 6, fontSize: 15, fontWeight: isActive(item.id) ? 600 : 400, background: isActive(item.id) ? "rgba(255,255,255,0.1)" : "transparent", color: isActive(item.id) ? "#fff" : "#9B978F", cursor: "pointer", border: "none", width: "100%", textAlign: "left", fontFamily: BRAND.sans, marginBottom: 2 }} onClick={() => nav(item.id)}>
                  <Icon name={item.icon} size={20} /><span style={{ flex: 1 }}>{item.label}</span>
                  {item.badge > 0 && <span aria-label={item.badge + " pending"} style={{ background: BRAND.brick, color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10 }}>{item.badge}</span>}
                </button>
              ))}
              <div style={{ flex: 1 }} />
              <button style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 12px", borderRadius: 6, fontSize: 15, background: "transparent", color: "#9B978F", cursor: "pointer", border: "none", width: "100%", textAlign: "left", fontFamily: BRAND.sans }} onClick={handleLogout}><Icon name="logout" size={20} /> Sign Out</button>
            </div>
          </div>
        )}
        {/* Offline banner */}
        {!online && <div role="alert" style={{ background: "#FFF3E0", borderBottom: "1px solid #FFB74D", padding: "8px 16px", display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#E65100" }}><Icon name="wifiOff" size={16} /><span>You're offline. Viewing cached data.</span></div>}
        {/* Content */}
        <main id="main-content" style={{ padding: "16px 16px" }}>{renderPage()}</main>
        {/* FAB */}
        {!newEntry && !editEntry && !viewEntry && (page === "dashboard" || page === "entries") && (
          <button aria-label="Create new work entry" style={{ position: "fixed", bottom: 96, right: 20, width: 56, height: 56, borderRadius: 28, background: BRAND.brick, color: "#fff", border: "none", boxShadow: "0 4px 16px rgba(142,59,46,0.35)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 15 }} onClick={() => setNewEntry(true)}>
            <Icon name="plus" size={24} />
          </button>
        )}
        {/* Bottom tab bar */}
        <nav aria-label="Main navigation" style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: BRAND.white, borderTop: "1px solid " + BRAND.border, display: "flex", zIndex: 20, paddingBottom: "env(safe-area-inset-bottom)", boxShadow: "0 -2px 16px rgba(0,0,0,0.08)" }}>
          {bottomTabs.map(t => {
            const active = isActive(t.id);
            return (
            <button key={t.id} aria-label={t.label + (t.badge > 0 ? ", " + t.badge + " pending" : "")} aria-current={active ? "page" : undefined} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "14px 4px 12px", background: "none", border: "none", cursor: "pointer", color: active ? t.color : BRAND.textLight, fontFamily: BRAND.sans, fontSize: 11, fontWeight: active ? 700 : 500, position: "relative", transition: "color 200ms" }} onClick={() => nav(t.id)}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 56, height: 36, borderRadius: 18, background: active ? t.tint : "transparent", transition: "background 250ms" }}>
                <Icon name={active ? t.iconFilled : t.icon} size={28} />
              </div>
              <span aria-hidden="true" style={{ transition: "color 200ms" }}>{t.label}</span>
              {t.badge > 0 && <span aria-hidden="true" style={{ position: "absolute", top: 6, right: "50%", marginRight: -26, background: BRAND.brick, color: "#fff", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 10, minWidth: 18, textAlign: "center", boxShadow: "0 1px 4px rgba(142,59,46,0.3)" }}>{t.badge}</span>}
            </button>
          );})}
        </nav>
      </div>
    );
  }

  // ── DESKTOP LAYOUT ─────────────────────────────────────────────────────
  return (
    <div style={S.app}>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <aside style={S.sidebar} aria-label="Sidebar navigation">
        <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img src="/logo.png" alt="24 Mill Street logo" style={{ width: 40, height: 40, borderRadius: 6, objectFit: "cover", background: BRAND.beige }} />
            <div>
              <div style={{ fontFamily: BRAND.serif, fontWeight: 600, fontSize: 17, color: "#FFFFFF", lineHeight: 1.2 }}>24 Mill</div>
              <div style={{ fontSize: 12, color: "#7A766E", letterSpacing: "0.02em" }}>Log Your Work</div>
            </div>
          </div>
        </div>
        <nav aria-label="Main navigation" style={{ padding: "12px 12px", flex: 1 }}>
          {navItems.map(item => (
            <button key={item.id} aria-current={isActive(item.id) ? "page" : undefined} style={S.navItem(isActive(item.id))} onClick={() => nav(item.id)}>
              <Icon name={item.icon} size={18} /><span style={{ flex: 1 }}>{item.label}</span>
              {item.badge > 0 && <span aria-label={item.badge + " pending"} style={{ background: BRAND.brick, color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10 }}>{item.badge}</span>}
            </button>
          ))}
        </nav>
        <div style={{ padding: "16px 12px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,0.06)", marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
            <div aria-hidden="true" style={{ width: 32, height: 32, borderRadius: 6, background: isTreasurer ? BRAND.brick : BRAND.green, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff" }}>{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{currentUser.name}</div>
              <div style={{ fontSize: 12, color: "#7A766E", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentUser.role}</div>
            </div>
          </div>
          <button style={{ ...S.navItem(false), padding: "8px 12px", fontSize: 13 }} onClick={handleLogout}><Icon name="logout" size={16} /> Sign Out</button>
        </div>
      </aside>
      <div style={S.main}>
        <header style={S.header} role="banner">
          <span style={{ fontSize: 14, color: BRAND.textMuted }}>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 12, position: "relative" }}>
            {isTreasurer && (
              <button aria-label={"Notifications" + (pendingCount > 0 ? ", " + pendingCount + " pending" : "")} style={{ background: "none", border: "none", color: BRAND.charcoal, padding: 6, cursor: "pointer", position: "relative", borderRadius: 8, minWidth: 36, minHeight: 36, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowNotifPanel(p => !p)}>
                <Icon name="bell" size={20} />
                {pendingCount > 0 && <span aria-hidden="true" style={{ position: "absolute", top: 2, right: 2, background: "#EF4444", color: "#fff", fontSize: 9, fontWeight: 700, width: 16, height: 16, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>{pendingCount}</span>}
              </button>
            )}
            <span style={{ fontSize: 14, fontWeight: 500, color: BRAND.charcoal }}>{currentUser.name}</span>
            <RoleBadge role={currentUser.role} />
            {showNotifPanel && isTreasurer && <NotificationPanel entries={entries} users={users} settings={settings} onView={(e) => { setShowNotifPanel(false); setViewEntry(e); }} onClose={() => setShowNotifPanel(false)} onReviewAll={() => { setShowNotifPanel(false); nav("review"); }} mob={mob} />}
          </div>
        </header>
        {!online && <div role="alert" style={{ background: "#FFF3E0", borderBottom: "1px solid #FFB74D", padding: "10px 32px", display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#E65100" }}><Icon name="wifiOff" size={16} /><span>You're offline. Viewing cached data — changes require an internet connection.</span></div>}
        <main id="main-content" style={S.content}>{renderPage()}</main>
      </div>
    </div>
  );
}
