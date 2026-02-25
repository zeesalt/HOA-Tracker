import { useState, useEffect, useMemo, useRef, Component } from "react";

// ═══════════════════════════════════════════════════════════════════════════
// ERROR BOUNDARY — prevents white-screen crashes
// ═══════════════════════════════════════════════════════════════════════════
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, textAlign: "center", fontFamily: "'Inter', system-ui, sans-serif", background: "#F5F2ED", minHeight: this.props.fullScreen ? "100vh" : "auto", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏚️</div>
          <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 24, color: "#1F2A38", marginBottom: 8 }}>
            {this.props.title || "Something went wrong"}
          </h2>
          <p style={{ color: "#6B6560", fontSize: 14, marginBottom: 24, maxWidth: 400, lineHeight: 1.6 }}>
            {this.props.fullScreen
              ? "The app hit an unexpected error. Your data is safe. Try refreshing the page."
              : "This section encountered an error. Your other data is unaffected."}
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => this.setState({ hasError: false, error: null })}
              style={{ padding: "10px 22px", background: "#8E3B2E", color: "#fff", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', system-ui, sans-serif" }}>
              Try Again
            </button>
            {this.props.fullScreen && (
              <button onClick={() => window.location.reload()}
                style={{ padding: "10px 22px", background: "#fff", color: "#222", border: "1px solid #E0E0E0", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', system-ui, sans-serif" }}>
                Reload Page
              </button>
            )}
          </div>
          {this.state.error && (
            <details style={{ marginTop: 24, fontSize: 12, color: "#5C5752", maxWidth: 500, textAlign: "left" }}>
              <summary style={{ cursor: "pointer", fontWeight: 600 }}>Technical details</summary>
              <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", marginTop: 8, padding: 12, background: "#fff", borderRadius: 6, border: "1px solid #EDE9E3" }}>
                {this.state.error.toString()}
              </pre>
            </details>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// BRAND TOKENS
// ═══════════════════════════════════════════════════════════════════════════
export const BRAND = {
  navy: "#1F2A38",
  beige: "#D9D3C8",
  bgSoft: "#F5F2ED",
  charcoal: "#222222",
  brick: "#8E3B2E",
  brickDark: "#7A3226",
  green: "#2F4F3E",
  success: "#2E7D32",
  warning: "#C77700",
  error: "#C62828",
  border: "#E0E0E0",
  borderLight: "#EDE9E3",
  white: "#FFFFFF",
  textMuted: "#57534E",
  textLight: "#5C5752",
  serif: "'Cormorant Garamond', Georgia, 'Times New Roman', serif",
  sans: "'Inter', system-ui, -apple-system, sans-serif",
};

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════
export const CATEGORIES = [
  "Landscaping", "Plumbing", "Electrical", "General Maintenance",
  "Snow Removal", "Cleaning", "Vendor Coordination", "Administrative Work",
  "Emergency Repairs"
];
export const CATEGORY_EMOJIS = {
  "Landscaping": "🌿", "Plumbing": "🔧", "Electrical": "⚡",
  "General Maintenance": "🔨", "Snow Removal": "❄️", "Cleaning": "🧹",
  "Vendor Coordination": "📞", "Administrative Work": "📝", "Emergency Repairs": "🚨",
};
export const STATUSES = { DRAFT: "Draft", SUBMITTED: "Submitted", APPROVED: "Approved", AWAITING_SECOND: "Awaiting 2nd Approval", REJECTED: "Rejected", NEEDS_INFO: "Needs Info", PAID: "Paid", TRASH: "Trash" };
export const ROLES = { TREASURER: "Treasurer", MEMBER: "Member" };
export const DEFAULT_SETTINGS = { hoaName: "24 Mill Street", defaultHourlyRate: 40, userRates: {}, currency: "USD" };
export const MOBILE_BP = 768;
export const IRS_MILEAGE_RATE = 0.725; // IRS standard mileage rate 2026 ($/mile) — update annually

// Display-friendly status labels (internal "Rejected" → user-facing "Declined")
export const statusLabel = (status) => status === "Rejected" ? "Declined" : status;

export const PURCHASE_CATEGORIES = [
  "Cleaning Supplies", "Landscaping Supplies", "Decor",
  "Tools & Equipment", "Office Supplies", "Fuel & Gas",
  "Plumbing Supplies", "Electrical Supplies",
  "Snow Removal Supplies", "Safety Equipment", "Other"
];
export const PURCHASE_CATEGORY_EMOJIS = {
  "Cleaning Supplies": "🧹", "Landscaping Supplies": "🌿", "Decor": "🎨",
  "Tools & Equipment": "🔧", "Office Supplies": "📎", "Fuel & Gas": "⛽",
  "Plumbing Supplies": "🚿", "Electrical Supplies": "💡",
  "Snow Removal Supplies": "❄️", "Safety Equipment": "🦺", "Other": "📦",
};
export const PAYMENT_METHODS = ["Cash", "Personal Credit Card", "Personal Debit Card", "HOA Card", "Other"];

export function useIsMobile() {
  const [m, setM] = useState(typeof window !== "undefined" ? window.innerWidth < MOBILE_BP : false);
  useEffect(() => { const h = () => setM(window.innerWidth < MOBILE_BP); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, []);
  return m;
}

export function useOnline() {
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
export const uid = () => Math.random().toString(36).slice(2, 10);
export const fmt = (n) => "$" + Number(n || 0).toFixed(2);
export const fmtHours = (h) => Number(h || 0).toFixed(2) + " hrs";
export const todayStr = () => new Date().toISOString().split("T")[0];
export const nowTime = () => { const d = new Date(); return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); };
export const relativeDate = (dateStr) => {
  const today = todayStr();
  if (dateStr === today) return "Today";
  const d = new Date(dateStr + "T12:00:00");
  const t = new Date(today + "T12:00:00");
  const diff = Math.round((t - d) / 86400000);
  if (diff === 1) return "Yesterday";
  if (diff > 1 && diff <= 6) return diff + " days ago";
  return formatDate(dateStr);
};

export function calcHours(start, end) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff < 0) diff += 24 * 60;
  return Math.round((diff / 60) * 100) / 100;
}
// 30-min increment billing: round up to nearest 0.5hr, each 0.5hr = 50% of rate
export function calcLabor(hours, rate) {
  if (!hours || !rate) return 0;
  const blocks = Math.ceil(hours * 2); // number of 30-min blocks (rounds up)
  return blocks * (rate / 2);
}
export function calcMaterialsTotal(materials) {
  return (materials || []).reduce((sum, m) => sum + (Number(m.quantity) || 0) * (Number(m.unitCost) || 0), 0);
}
export function formatDate(d) { if (!d) return ""; const date = new Date(d + "T00:00:00"); return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
export function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return mins + "m ago";
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + "h ago";
  return Math.floor(hrs / 24) + "d ago";
}
export function formatTime(t) { if (!t) return ""; const [h, m] = t.split(":"); const hr = parseInt(h); return (hr > 12 ? hr - 12 : hr || 12) + ":" + m + " " + (hr >= 12 ? "PM" : "AM"); }
export function getUserRate(users, settings, userId) {
  const u = users?.find(u => u.id === userId);
  return u?.hourlyRate || settings?.defaultHourlyRate || 40;
}

// ═══════════════════════════════════════════════════════════════════════════
// ICON COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export const Icon = ({ name, size = 18, filled = false }) => {
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
    help: "M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
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

// Status Badge — branded pill style with transition animation
export const StatusBadge = ({ status }) => {
  const prevStatus = useRef(status);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (prevStatus.current !== status) {
      setAnimating(true);
      const t = setTimeout(() => setAnimating(false), 400);
      prevStatus.current = status;
      return () => clearTimeout(t);
    }
  }, [status]);

  const map = {
    Draft: { bg: "#EDEBE8", text: "#57534E", border: "#D5D0C9" },
    Submitted: { bg: "#FFF0E0", text: BRAND.brick, border: "#E8C4A8" },
    Trash: { bg: "#FFF1F1", text: "#7f1d1d", border: "#FCA5A520" },
    Approved: { bg: "#E8F0E6", text: BRAND.green, border: "#B5CCAE" },
    "Awaiting 2nd Approval": { bg: "#EEF2FF", text: "#4338CA", border: "#C7D2FE" },
    Rejected:             { bg: "#FDEAEA", text: BRAND.error,   border: "#F0BABA" },
    "Needs Info":         { bg: "#FFF7ED", text: "#9A3412",     border: "#FED7AA" },
    Paid:                 { bg: "#E8EDF5", text: "#3B5998",     border: "#B8C8E0" },
  };
  const c = map[status] || map.Draft;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, fontFamily: BRAND.sans, background: c.bg, color: c.text, border: "1px solid " + c.border, letterSpacing: "0.02em", animation: animating ? "badgeSwap 400ms ease-in-out" : "none", transition: "background 300ms ease, color 300ms ease, border-color 300ms ease" }}>
      {status === "Approved"   && <Icon name="check" size={12} />}
      {status === "Paid"       && <Icon name="dollar" size={12} />}
      {status === "Rejected"   && <Icon name="x" size={12} />}
      {status === "Submitted"  && <Icon name="clock" size={12} />}
      {status === "Needs Info" && <span style={{ fontSize: 11 }}>💬</span>}
      {status === "Rejected" ? "Declined" : status}
    </span>
  );
};

// Category Badge
export const catColors = {
  "Landscaping": BRAND.green, "Plumbing": "#2563eb", "Electrical": "#b5850a",
  "General Maintenance": "#6B6560", "Snow Removal": "#4688A0", "Cleaning": "#7B5EA7",
  "Vendor Coordination": BRAND.brick, "Administrative Work": BRAND.navy, "Emergency Repairs": BRAND.error
};
export const CategoryBadge = ({ category }) => {
  const c = catColors[category] || BRAND.textMuted;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 4, fontSize: 12, fontWeight: 500, fontFamily: BRAND.sans, background: c + "10", color: c, border: "1px solid " + c + "25" }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: c }} />
      {category}
    </span>
  );
};

// Role Badge
export const RoleBadge = ({ role }) => (
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
export const S = {
  // Layout
  app: { display: "flex", minHeight: "100vh", fontFamily: BRAND.sans, background: BRAND.bgSoft, color: BRAND.charcoal },
  sidebar: { width: 260, background: BRAND.navy, color: "#CCC8C0", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", overflow: "auto" },
  main: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column" },
  header: { padding: "16px 32px", borderBottom: "1px solid " + BRAND.border, background: BRAND.white, display: "flex", alignItems: "center", justifyContent: "space-between", position: "fixed", top: 0, left: 260, right: 0, zIndex: 10, boxSizing: "border-box" },
  content: { padding: "28px 32px", flex: 1, marginTop: 57 },

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
    background: active ? "rgba(255,255,255,0.1)" : "transparent", color: active ? "#FFFFFF" : "#A8A29E",
    cursor: "pointer", border: "none", width: "100%", textAlign: "left", margin: "1px 0",
    borderLeft: active ? "3px solid " + BRAND.brick : "3px solid transparent",
  }),

  // Headings
  h1: { fontFamily: BRAND.serif, fontSize: 34, fontWeight: 600, color: BRAND.navy, margin: 0, letterSpacing: "-0.01em" },
  h2: { fontFamily: BRAND.serif, fontSize: 26, fontWeight: 600, color: BRAND.navy, margin: 0 },
  h3: { fontFamily: BRAND.sans, fontSize: 16, fontWeight: 700, color: BRAND.charcoal, margin: 0 },
  sectionLabel: { fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: BRAND.textMuted, marginBottom: 12, fontFamily: BRAND.sans },

  // Utility styles extracted from inline usage
  flexBetween: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  flexCenter: { display: "flex", alignItems: "center", justifyContent: "center" },
  flexCol: { display: "flex", flexDirection: "column" },
  flexWrap: { display: "flex", flexWrap: "wrap", gap: 10 },
  flexGap: (gap = 12) => ({ display: "flex", alignItems: "center", gap }),
  truncate: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  badge: (bg, color, border) => ({ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, fontFamily: BRAND.sans, background: bg, color, border: "1px solid " + (border || bg), letterSpacing: "0.02em" }),
  srOnly: { position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap", border: 0 },
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════
export const Field = ({ label, required, children }) => (
  <div style={S.field}>
    <label style={S.label}>{label}{required && <span style={{ color: BRAND.error }}> *</span>}</label>
    {children}
  </div>
);

export const Modal = ({ open, onClose, title, children }) => {
  const modalRef = useRef(null);
  const prevFocusRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    prevFocusRef.current = document.activeElement;
    // Focus first focusable element
    setTimeout(() => {
      const focusable = modalRef.current?.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (focusable?.length) focusable[0].focus();
    }, 50);
    return () => {
      if (prevFocusRef.current) prevFocusRef.current.focus();
    };
  }, [open]);

  // Focus trap + Escape handler
  const handleKeyDown = (e) => {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key !== "Tab") return;
    const focusable = modalRef.current?.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };

  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(31,42,56,0.45)" }} onClick={onClose} onKeyDown={handleKeyDown} role="dialog" aria-modal="true" aria-labelledby="modal-title">
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

export const ConfirmDialog = ({ open, onClose, onConfirm, title, message, confirmText, danger }) => (
  <Modal open={open} onClose={onClose} title={title}>
    <p style={{ fontSize: 14, color: BRAND.textMuted, lineHeight: 1.7, margin: "0 0 24px" }}>{message}</p>
    <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
      <button style={S.btnSecondary} onClick={onClose}>Cancel</button>
      <button style={danger ? S.btnDanger : S.btnPrimary} onClick={() => { onConfirm(); onClose(); }}>{confirmText || "Confirm"}</button>
    </div>
  </Modal>
);

// Dashboard Card — with navy top accent line
// ═══════════════════════════════════════════════════════════════════════════
// useCountUp — ease-out cubic number roll-up
// ═══════════════════════════════════════════════════════════════════════════
export function useCountUp(target, duration = 850) {
  const [display, setDisplay] = useState(0);
  const prefersReduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  useEffect(() => {
    const num = typeof target === "string" ? parseFloat(target.replace(/[^0-9.\-]/g, "")) || 0 : Number(target) || 0;
    if (prefersReduced || num === 0) { setDisplay(num); return; }
    let start = null;
    let raf;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3); // ease-out cubic
      setDisplay(num * ease);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, prefersReduced]);
  return display;
}

// ═══════════════════════════════════════════════════════════════════════════
// AnimatedBar — renders at 0% then transitions to real width
// ═══════════════════════════════════════════════════════════════════════════
export const AnimatedBar = ({ percent, color, height = 8, style = {} }) => {
  const [width, setWidth] = useState(0);
  const prefersReduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  useEffect(() => {
    if (prefersReduced) { setWidth(percent); return; }
    requestAnimationFrame(() => requestAnimationFrame(() => setWidth(percent)));
  }, [percent, prefersReduced]);
  return (
    <div style={{ height, background: BRAND.borderLight, borderRadius: height / 2, overflow: "hidden", ...style }}>
      <div style={{ height: "100%", width: Math.min(width, 100) + "%", background: color || BRAND.navy, borderRadius: height / 2, transition: "width 700ms cubic-bezier(0.34, 1.56, 0.64, 1)" }} />
    </div>
  );
};

export const StatCard = ({ label, value, icon, accentColor }) => {
  const isDollar = typeof value === "string" && value.startsWith("$");
  const raw = isDollar ? parseFloat(value.replace(/[^0-9.\-]/g, "")) || 0 : Number(value) || 0;
  const animated = useCountUp(raw);
  const formatted = isDollar ? "$" + animated.toFixed(2) : (Number.isInteger(raw) ? Math.round(animated) : animated.toFixed(2));

  return (
    <div style={{ ...S.cardAccent, padding: "20px 24px", display: "flex", alignItems: "center", gap: 16, marginBottom: 0 }}>
      <div style={{ width: 44, height: 44, borderRadius: 8, background: (accentColor || BRAND.navy) + "10", display: "flex", alignItems: "center", justifyContent: "center", color: accentColor || BRAND.navy }}>
        <Icon name={icon} size={22} />
      </div>
      <div>
        <div style={{ fontSize: 13, color: BRAND.textLight, fontWeight: 500, marginBottom: 2, fontFamily: BRAND.sans }}>{label}</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: BRAND.navy, fontFamily: BRAND.sans }}>{formatted}</div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// IMAGE COMPRESSION + UPLOADER
// ═══════════════════════════════════════════════════════════════════════════
export function compressImage(file, maxWidth = 1200, quality = 0.7) {
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

export const ImageUploader = ({ images, onChange, label, color, icon, readOnly, mob }) => {
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
              <img src={img.dataUrl} alt={img.caption || (label + " photo")} style={{ width: "100%", height: 100, objectFit: "cover", display: "block", cursor: "pointer", transition: "transform 150ms ease, box-shadow 150ms ease" }} onClick={() => setViewImg(img)} onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.04)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.15)"; }} onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "none"; }} />
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

      {/* Lightbox — full-screen zoom overlay */}
      {viewImg && (
        <div onClick={() => setViewImg(null)} onKeyDown={e => e.key === "Escape" && setViewImg(null)} tabIndex={-1}
          style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-out", animation: "fadeIn 200ms ease-out" }}>
          <img src={viewImg.dataUrl} alt={viewImg.caption || "Photo"}
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: "90vw", maxHeight: "90vh", borderRadius: 8, boxShadow: "0 16px 64px rgba(0,0,0,0.5)", cursor: "default", animation: "lightboxZoom 280ms cubic-bezier(0.34, 1.56, 0.64, 1)" }} />
          {viewImg.caption && <div style={{ position: "absolute", bottom: 32, color: "#fff", fontSize: 14, textAlign: "center", width: "100%", textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>{viewImg.caption}</div>}
          <button onClick={() => setViewImg(null)} aria-label="Close"
            style={{ position: "absolute", top: 20, right: 20, width: 40, height: 40, borderRadius: 20, background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MATERIALS EDITOR
// ═══════════════════════════════════════════════════════════════════════════
export const MaterialsEditor = ({ materials, onChange, readOnly, mob }) => {
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
