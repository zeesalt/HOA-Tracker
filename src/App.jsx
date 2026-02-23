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
const STATUSES = { DRAFT: "Draft", SUBMITTED: "Submitted", APPROVED: "Approved", AWAITING_SECOND: "Awaiting 2nd Approval", REJECTED: "Rejected", NEEDS_INFO: "Needs Info", PAID: "Paid", TRASH: "Trash" };
const ROLES = { TREASURER: "Treasurer", MEMBER: "Member" };
const DEFAULT_SETTINGS = { hoaName: "24 Mill Street", defaultHourlyRate: 40, userRates: {}, currency: "USD" };
const MOBILE_BP = 768;
const IRS_MILEAGE_RATE = 0.725; // IRS standard mileage rate 2026 ($/mile) — update annually

const PURCHASE_CATEGORIES = [
  "Cleaning Supplies", "Landscaping Supplies", "Decor",
  "Tools & Equipment", "Office Supplies", "Fuel & Gas",
  "Plumbing Supplies", "Electrical Supplies",
  "Snow Removal Supplies", "Safety Equipment", "Other"
];
const PURCHASE_CATEGORY_EMOJIS = {
  "Cleaning Supplies": "🧹", "Landscaping Supplies": "🌿", "Decor": "🎨",
  "Tools & Equipment": "🔧", "Office Supplies": "📎", "Fuel & Gas": "⛽",
  "Plumbing Supplies": "🚿", "Electrical Supplies": "💡",
  "Snow Removal Supplies": "❄️", "Safety Equipment": "🦺", "Other": "📦",
};
const PAYMENT_METHODS = ["Cash", "Personal Credit Card", "Personal Debit Card", "HOA Card", "Other"];

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
const relativeDate = (dateStr) => {
  const today = todayStr();
  if (dateStr === today) return "Today";
  const d = new Date(dateStr + "T12:00:00");
  const t = new Date(today + "T12:00:00");
  const diff = Math.round((t - d) / 86400000);
  if (diff === 1) return "Yesterday";
  if (diff > 1 && diff <= 6) return diff + " days ago";
  return formatDate(dateStr);
};

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
function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return mins + "m ago";
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + "h ago";
  return Math.floor(hrs / 24) + "d ago";
}
function formatTime(t) { if (!t) return ""; const [h, m] = t.split(":"); const hr = parseInt(h); return (hr > 12 ? hr - 12 : hr || 12) + ":" + m + " " + (hr >= 12 ? "PM" : "AM"); }
function getUserRate(users, settings, userId) {
  const u = users?.find(u => u.id === userId);
  return u?.hourlyRate || settings?.defaultHourlyRate || 40;
}

// ═══════════════════════════════════════════════════════════════════════════
// ANIMATION HOOKS & COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

// Count-up hook: animates from 0 to a numeric target over `duration` ms
function useCountUp(target, duration = 900) {
  const [display, setDisplay] = useState(target);
  const rafRef = useRef(null);
  const prevTarget = useRef(target);
  useEffect(() => {
    // Only animate if the value actually changed and reduced-motion isn't set
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setDisplay(target); return; }
    if (prevTarget.current === target) return;
    prevTarget.current = target;
    const start = Date.now();
    const from = 0;
    const step = () => {
      const elapsed = Date.now() - start;
      const pct = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - pct, 3);
      setDisplay(from + (target - from) * eased);
      if (pct < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);
  return display;
}

// Animated progress bar — renders at 0% then transitions to real value on mount
function AnimatedBar({ pct, color, height = 12, radius = 6, style = {} }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setWidth(pct));
    return () => cancelAnimationFrame(id);
  }, [pct]);
  return (
    <div style={{ height, background: BRAND.bgSoft, borderRadius: radius, overflow: "hidden", ...style }}>
      <div style={{ height: "100%", borderRadius: radius, width: width + "%", minWidth: width > 0 ? height / 2 : 0, background: color, transition: "width 700ms cubic-bezier(0.22,1,0.36,1)" }} />
    </div>
  );
}

// Confetti burst — mounts briefly then self-removes
const CONFETTI_COLORS = ["#8E3B2E","#1F2A38","#2E7D32","#F59E0B","#1565C0","#7B1FA2","#00838F"];
function ConfettiBurst({ onDone }) {
  const pieces = useMemo(() => Array.from({ length: 18 }, (_, i) => ({
    id: i,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    x: (Math.random() - 0.5) * 320,
    y: -(80 + Math.random() * 200),
    r: Math.random() * 540 - 270,
    w: 8 + Math.random() * 8,
    h: 5 + Math.random() * 5,
    delay: Math.random() * 180,
  })), []);
  useEffect(() => { const t = setTimeout(onDone, 1100); return () => clearTimeout(t); }, [onDone]);
  return (
    <div aria-hidden="true" style={{ position: "fixed", inset: 0, zIndex: 9999, pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {pieces.map(p => (
        <div key={p.id} style={{
          position: "absolute", top: "50%", left: "50%",
          width: p.w, height: p.h,
          background: p.color, borderRadius: 2,
          "--cx": p.x + "px", "--cy": p.y + "px", "--cr": p.r + "deg",
          animation: `confettiFly 900ms cubic-bezier(0.25,0.46,0.45,0.94) ${p.delay}ms forwards`,
          opacity: 0,
        }} />
      ))}
    </div>
  );
}

// Photo lightbox — full-screen overlay with zoom-in transition
function PhotoLightbox({ src, alt, onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);
  return (
    <div role="dialog" aria-label="Photo preview" onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,0.88)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <img
        src={src} alt={alt}
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: "90vw", maxHeight: "85vh", borderRadius: 10, boxShadow: "0 24px 80px rgba(0,0,0,0.5)", animation: "lightboxIn 220ms cubic-bezier(0.34,1.56,0.64,1)" }}
      />
      <button onClick={onClose} aria-label="Close photo" style={{ position: "absolute", top: 20, right: 20, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", width: 40, height: 40, borderRadius: 20, fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
    </div>
  );
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
const StatusBadge = ({ status }) => {
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
    Draft: { bg: "#EDEBE8", text: BRAND.textMuted, border: "#D5D0C9" },
    Submitted: { bg: "#FFF0E0", text: BRAND.brick, border: "#E8C4A8" },
    Trash: { bg: "#FFF1F1", text: "#7f1d1d", border: "#FCA5A520" },
    Approved: { bg: "#E8F0E6", text: BRAND.green, border: "#B5CCAE" },
    "Awaiting 2nd Approval": { bg: "#EEF2FF", text: "#4338CA", border: "#C7D2FE" },
    Rejected:             { bg: "#FDEAEA", text: BRAND.error,   border: "#F0BABA" },
    "Needs Info":         { bg: "#FFF7ED", text: "#C2410C",     border: "#FED7AA" },
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
  input: { width: "100%", padding: "10px 14px", border: "1px solid " + BRAND.border, borderRadius: 6, fontSize: 16, fontFamily: BRAND.sans, background: BRAND.white, color: BRAND.charcoal, boxSizing: "border-box" },
  textarea: { width: "100%", padding: "10px 14px", border: "1px solid " + BRAND.border, borderRadius: 6, fontSize: 16, fontFamily: BRAND.sans, background: BRAND.white, color: BRAND.charcoal, resize: "vertical", minHeight: 80, boxSizing: "border-box" },
  select: { width: "100%", padding: "10px 14px", border: "1px solid " + BRAND.border, borderRadius: 6, fontSize: 16, fontFamily: BRAND.sans, background: BRAND.white, color: BRAND.charcoal, cursor: "pointer", boxSizing: "border-box", appearance: "auto" },
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
const StatCard = ({ label, value, icon, accentColor }) => {
  // Parse numeric value for count-up; preserve formatting prefix/suffix
  const numMatch = typeof value === "string" ? value.match(/^(\$?)([0-9,.]+)(\s*.*)$/) : null;
  const numericTarget = numMatch ? parseFloat(numMatch[2].replace(/,/g, "")) : (typeof value === "number" ? value : null);
  const counted = useCountUp(numericTarget !== null ? numericTarget : 0, 850);
  let displayValue = value;
  if (numericTarget !== null && numMatch) {
    const prefix = numMatch[1];
    const suffix = numMatch[3] || "";
    displayValue = prefix + (Number.isInteger(numericTarget) ? Math.round(counted).toLocaleString("en-US") : counted.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })) + suffix;
  } else if (typeof value === "number") {
    displayValue = Math.round(counted);
  }
  return (
    <div style={{ ...S.cardAccent, padding: "20px 24px", display: "flex", alignItems: "center", gap: 16, marginBottom: 0 }}>
      <div style={{ width: 44, height: 44, borderRadius: 8, background: (accentColor || BRAND.navy) + "10", display: "flex", alignItems: "center", justifyContent: "center", color: accentColor || BRAND.navy }}>
        <Icon name={icon} size={22} />
      </div>
      <div>
        <div style={{ fontSize: 12, color: BRAND.textLight, fontWeight: 500, marginBottom: 2, fontFamily: BRAND.sans }}>{label}</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: BRAND.navy, fontFamily: BRAND.sans }}>{displayValue}</div>
      </div>
    </div>
  );
};

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
              {readOnly ? <div style={{ fontSize: 14 }}>{m.quantity}</div> : <input type="number" min="0" inputMode="decimal" style={{ ...S.input, padding: "8px 10px" }} value={m.quantity} onChange={e => update(i, "quantity", e.target.value)} />}
            </div>
            <div>
              <div style={{ fontSize: 11, color: BRAND.textLight, marginBottom: 3 }}>Unit Cost</div>
              {readOnly ? <div style={{ fontSize: 14 }}>{fmt(m.unitCost)}</div> : <input type="number" min="0" step="0.01" inputMode="decimal" style={{ ...S.input, padding: "8px 10px" }} value={m.unitCost} onChange={e => update(i, "unitCost", e.target.value)} />}
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
const EntryForm = ({ entry, settings, users, currentUser, onSave, onCancel, onSubmit, onDelete, disableAutoSave, mob }) => {
  const isTreasurer = currentUser.role === ROLES.TREASURER;
  const [form, setForm] = useState({
    date: entry?.date || todayStr(), startTime: entry?.startTime || nowTime(), endTime: entry?.endTime || "",
    category: entry?.category || "", description: entry?.description || "", location: entry?.location || "",
    materials: entry?.materials || [], preImages: entry?.preImages || [], postImages: entry?.postImages || [],
    notes: entry?.notes || "", mileage: entry?.mileage || "",
    userId: entry?.userId || currentUser.id,
  });
  const [errors, setErrors] = useState({});
  const [shakeFields, setShakeFields] = useState({});
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [formDirty, setFormDirty] = useState(false);
  const [draftId, setDraftId] = useState(entry?.id || null);
  const [autoSaveStatus, setAutoSaveStatus] = useState(""); // "", "saving", "saved"
  const [submitting, setSubmitting] = useState(false);
  const draftIdRef = useRef(draftId);

  // ── Templates ─────────────────────────────────────────────────────────
  const TMPL_KEY = "hoa_templates_" + currentUser.id;
  const [templates, setTemplates] = useState(() => { try { return JSON.parse(localStorage.getItem(TMPL_KEY) || "[]"); } catch { return []; } });
  const [showTemplateSheet, setShowTemplateSheet] = useState(false);
  const [templateNameInput, setTemplateNameInput] = useState("");
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);

  const saveTemplate = () => {
    if (!templateNameInput.trim()) return;
    const t = { id: Date.now(), name: templateNameInput.trim(), category: form.category, description: form.description, location: form.location, startTime: form.startTime, endTime: form.endTime, notes: form.notes, mileage: form.mileage, materials: form.materials };
    const updated = [...templates.filter(x => x.name !== t.name), t].slice(-10);
    setTemplates(updated);
    localStorage.setItem(TMPL_KEY, JSON.stringify(updated));
    setTemplateNameInput("");
    setShowSaveTemplate(false);
  };
  const applyTemplate = (t) => {
    setForm(f => ({ ...f, category: t.category || f.category, description: t.description || f.description, location: t.location || f.location, startTime: t.startTime || f.startTime, endTime: t.endTime || f.endTime, notes: t.notes || f.notes, mileage: t.mileage || f.mileage, materials: t.materials?.length ? t.materials : f.materials }));
    setFormDirty(true);
    setShowTemplateSheet(false);
  };
  const deleteTemplate = (id) => {
    const updated = templates.filter(t => t.id !== id);
    setTemplates(updated);
    localStorage.setItem(TMPL_KEY, JSON.stringify(updated));
  };
  draftIdRef.current = draftId;
  const autoSaveAbortRef = useRef(false);
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
    // Don't auto-save in preview mode or if editing a submitted/approved/paid entry
    if (disableAutoSave) return;
    if (entry && entry.status && entry.status !== STATUSES.DRAFT && entry.status !== STATUSES.REJECTED) return;
    // Don't auto-save if user is in the submit flow
    if (showSubmitConfirm || submitting) return;
    const timer = setTimeout(async () => {
      // Need at least date to save
      if (!form.date) return;
      // Double-check submit isn't in progress (async guard)
      if (showSubmitConfirm || submitting || autoSaveAbortRef.current) return;
      setAutoSaveStatus("saving");
      const data = { ...form, status: STATUSES.DRAFT, userId: form.userId || currentUser.id };
      try {
        const result = await onSave(data, draftIdRef.current, true); // true = silent (don't navigate)
        // After await: check if submit started while we were saving — if so, discard result
        if (autoSaveAbortRef.current) { setAutoSaveStatus(""); return; }
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
    if (Object.keys(e).length > 0) {
      // Trigger shake on all errored fields simultaneously
      const shaking = Object.keys(e).reduce((acc, k) => ({ ...acc, [k]: true }), {});
      setShakeFields(shaking);
      setTimeout(() => setShakeFields({}), 400);
    }
    return Object.keys(e).length === 0;
  };
  const errStyle = (f) => errors[f]
    ? { border: "1px solid " + BRAND.error, animation: shakeFields[f] ? "validShake 350ms ease-in-out" : "none" }
    : {};
  const allMembers = users.filter(u => u.role === ROLES.MEMBER || u.role === ROLES.TREASURER);

  return (
    <div className="fade-in">
      {/* Template quick-use banner */}
      {templates.length > 0 && !showTemplateSheet && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
          <span>📋</span>
          <span style={{ flex: 1, color: "#1d4ed8" }}>You have {templates.length} saved template{templates.length > 1 ? "s" : ""}.</span>
          <button style={{ ...S.btnGhost, fontSize: 12, padding: "5px 12px", color: "#1d4ed8", borderColor: "#BFDBFE" }} onClick={() => setShowTemplateSheet("use")}>Use a Template</button>
        </div>
      )}
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
        <span style={{ fontSize: 12, color: BRAND.textLight, lineHeight: "28px" }} title="Sets end time based on start time">⏱ Quick duration:</span>
        {[30, 60, 90, 120, 180, 240].map(mins => (
          <button key={mins} type="button" onClick={() => setEndFromDuration(mins)} style={{ padding: "4px 12px", borderRadius: 14, border: "1px solid " + BRAND.borderLight, background: hours > 0 && Math.round(hours * 60) === mins ? BRAND.navy : BRAND.white, color: hours > 0 && Math.round(hours * 60) === mins ? "#fff" : BRAND.textMuted, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: BRAND.sans, transition: "all 150ms" }}>{mins < 60 ? mins + "m" : (mins / 60) + "hr"}</button>
        ))}
      </div>
      <Field label="Category" required>
        <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr 1fr" : "repeat(3, 1fr)", gap: 8 }}>
          {CATEGORIES.map(c => {
            const selected = form.category === c;
            const color = catColors[c] || BRAND.navy;
            return (
              <button key={c} type="button" onClick={() => set("category", c)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10, border: selected ? "2px solid " + color : "1px solid " + BRAND.borderLight, background: selected ? color + "12" : BRAND.white, cursor: "pointer", fontFamily: BRAND.sans, fontSize: 13, fontWeight: selected ? 700 : 500, color: selected ? color : BRAND.charcoal, transition: "all 150ms", textAlign: "left" }}>
                <span style={{ fontSize: 18 }}>{CATEGORY_EMOJIS[c] || "📋"}</span>{c}
              </button>
            );
          })}
        </div>
        {errors.category && <span role="alert" style={{ color: BRAND.error, fontSize: 13, marginTop: 4, display: "block" }}>{errors.category}</span>}
      </Field>
      <Field label="Task Description" required>
        <textarea style={{ ...S.textarea, ...errStyle("description") }} value={form.description} onChange={e => set("description", e.target.value)} placeholder="Describe the work performed..." />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
          {errors.description
            ? <span role="alert" style={{ color: BRAND.error, fontSize: 13 }}>{errors.description}</span>
            : <span style={{ fontSize: 12, color: BRAND.textLight }}>Min 10 characters</span>
          }
          <span style={{
            fontSize: 12, fontWeight: 600,
            color: form.description.trim().length === 0 ? BRAND.textLight
                 : form.description.trim().length < 10  ? BRAND.warning
                 : BRAND.success,
          }}>
            {form.description.trim().length < 10
              ? form.description.trim().length + " / 10"
              : form.description.length + " chars ✓"}
          </span>
        </div>
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: mob ? 12 : 16 }}>
        <Field label="Location"><input style={S.input} value={form.location} onChange={e => set("location", e.target.value)} placeholder="e.g. Unit 3B" /></Field>
        <Field label="Mileage">
          <input type="number" min="0" step="0.1" inputMode="decimal" style={S.input} value={form.mileage} onChange={e => set("mileage", e.target.value)} placeholder="Miles driven" />
          {form.mileage > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: BRAND.textLight, marginTop: 4 }}>
              <span>@ ${IRS_MILEAGE_RATE}/mi (IRS {new Date().getFullYear()})</span>
              <span style={{ fontWeight: 600, color: BRAND.navy }}>{fmt(Number(form.mileage) * IRS_MILEAGE_RATE)} reimbursable</span>
            </div>
          )}
        </Field>
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, flexWrap: "wrap", gap: 4 }}>
          <div style={{ fontSize: 11, color: BRAND.textLight }}>Billed in 30-min increments, rounded up.</div>
          <div style={{ fontSize: 11, color: BRAND.textLight }}>
            Rate: <strong style={{ color: BRAND.navy }}>{fmt(rate)}/hr</strong>
            {isTreasurer && form.userId && users.find(u => u.id === form.userId)?.hourlyRate
              ? <span style={{ color: BRAND.textLight }}> (custom rate)</span>
              : <span style={{ color: BRAND.textLight }}> (default rate)</span>
            }
          </div>
        </div>
      </div>

      {/* Sticky autosave status bar */}
      {autoSaveStatus && (
        <div role="status" aria-live="polite" style={{
          position: "sticky", top: 0, zIndex: 8,
          display: "flex", alignItems: "center", gap: 8,
          padding: "8px 14px", marginBottom: 12, borderRadius: 8,
          background: autoSaveStatus === "saved" ? "#E8F5E9" : "#FFF8E1",
          border: "1px solid " + (autoSaveStatus === "saved" ? "#A5D6A7" : "#FFD54F"),
          fontSize: 13, fontWeight: 600,
          color: autoSaveStatus === "saved" ? BRAND.success : "#795548",
          fontFamily: BRAND.sans,
        }}>
          {autoSaveStatus === "saving" && <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span>}
          {autoSaveStatus === "saved"  && <span style={{ display: "inline-block", animation: "saveCheck 350ms cubic-bezier(0.34,1.56,0.64,1)" }}>✓</span>}
          {autoSaveStatus === "saving" ? "Saving draft..." : "Draft saved"}
        </div>
      )}

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
          {/* autosave status now shown in sticky bar above action buttons */}
        </button>
        {/* Submit for Review */}
        <button onClick={() => { if (validate()) setShowSubmitConfirm(true); }} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: mob ? "16px 8px" : "20px 12px", borderRadius: 14, border: "1px solid " + BRAND.brick + "30", background: BRAND.brick + "0A", cursor: "pointer", transition: "all 200ms", fontFamily: BRAND.sans, boxShadow: "0 2px 8px rgba(142,59,46,0.08)" }} onMouseEnter={ev => { ev.currentTarget.style.transform = "translateY(-3px)"; ev.currentTarget.style.boxShadow = "0 6px 20px rgba(142,59,46,0.22)"; }} onMouseLeave={ev => { ev.currentTarget.style.transform = "translateY(0)"; ev.currentTarget.style.boxShadow = "0 2px 8px rgba(142,59,46,0.08)"; }}>
          <div style={{ width: 44, height: 44, borderRadius: 22, background: BRAND.brick, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}><Icon name="send" size={22} /></div>
          <span style={{ fontSize: 13, fontWeight: 700, color: BRAND.brick }}>Submit</span>
          <span style={{ fontSize: 10, color: BRAND.brick, opacity: 0.7 }}>For Review</span>
        </button>
      </div>

      {/* Delete + template row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        {entry && entry.status === STATUSES.DRAFT && <button style={{ ...S.btnGhost, color: BRAND.error, fontSize: 13 }} onClick={() => setShowDeleteConfirm(true)}><Icon name="trash" size={14} /> Delete Draft</button>}
        <div style={{ display: "flex", gap: 10, marginLeft: "auto" }}>
          {templates.length > 0 && (
            <button style={{ ...S.btnGhost, fontSize: 13 }} onClick={() => setShowTemplateSheet("use")}>📋 Templates ({templates.length})</button>
          )}
          <button style={{ ...S.btnGhost, fontSize: 13 }} onClick={() => { setTemplateNameInput(form.category ? form.category + " template" : ""); setShowTemplateSheet("save"); }}>💾 Save as Template</button>
        </div>
      </div>

      {/* Template sheet */}
      {showTemplateSheet && (
        <div style={{ ...S.card, background: "#F8F7F5", border: "1px solid " + BRAND.borderLight, marginTop: 4 }}>
          {showTemplateSheet === "save" ? (
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: BRAND.navy, marginBottom: 12 }}>💾 Save as Template</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input style={{ ...S.input, flex: 1 }} value={templateNameInput} onChange={e => setTemplateNameInput(e.target.value)} placeholder="Template name (e.g. Weekly Mowing)" autoFocus onKeyDown={e => e.key === "Enter" && saveTemplate()} />
                <button style={S.btnPrimary} onClick={saveTemplate} disabled={!templateNameInput.trim()}>Save</button>
                <button style={S.btnGhost} onClick={() => setShowTemplateSheet(false)}>Cancel</button>
              </div>
              <div style={{ fontSize: 12, color: BRAND.textLight, marginTop: 8 }}>Saves category, description, times, location, and materials. Date always resets to today when applied. Max 10 templates.</div>
            </div>
          ) : (
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: BRAND.navy, marginBottom: 12 }}>📋 Your Templates</div>
              {templates.length === 0 ? (
                <div style={{ fontSize: 13, color: BRAND.textLight }}>No templates yet. Fill out a form and save it as a template for quick reuse.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {templates.map(t => (
                    <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: BRAND.white, borderRadius: 8, border: "1px solid " + BRAND.borderLight }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: BRAND.charcoal }}>{t.name}</div>
                        <div style={{ fontSize: 12, color: BRAND.textLight, marginTop: 2 }}>{t.category}{t.description ? " · " + t.description.slice(0, 40) + (t.description.length > 40 ? "…" : "") : ""}</div>
                      </div>
                      <button style={{ ...S.btnPrimary, fontSize: 12, padding: "6px 14px" }} onClick={() => applyTemplate(t)}>Use</button>
                      <button style={{ ...S.btnGhost, fontSize: 12, padding: "6px 10px", color: BRAND.error, borderColor: BRAND.error + "40" }} onClick={() => deleteTemplate(t.id)}>✕</button>
                    </div>
                  ))}
                </div>
              )}
              <button style={{ ...S.btnGhost, fontSize: 13, marginTop: 12 }} onClick={() => setShowTemplateSheet(false)}>Close</button>
            </div>
          )}
        </div>
      )}
      <ConfirmDialog open={showSubmitConfirm} onClose={() => setShowSubmitConfirm(false)} title="Submit Entry?" message={"Submit for review? Total: " + fmt(grandTotal)} confirmText="Submit" onConfirm={() => { autoSaveAbortRef.current = true; setSubmitting(true); onSubmit({ ...form, status: STATUSES.SUBMITTED }, draftIdRef.current); }} />
      <ConfirmDialog open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Delete Entry?" message="This draft will be permanently deleted." confirmText="Delete" danger onConfirm={onDelete} />
      <ConfirmDialog open={showCancelConfirm} onClose={() => setShowCancelConfirm(false)} title="Discard Changes?" message="You have unsaved changes. Are you sure you want to leave?" confirmText="Discard" danger onConfirm={onCancel} />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// PURCHASE ENTRY FORM
// ═══════════════════════════════════════════════════════════════════════════
const PurchaseEntryForm = ({ entry, settings, currentUser, onSave, onCancel, onSubmit, onDelete, mob }) => {
  const [form, setForm] = useState({
    userId: entry?.userId || currentUser?.id,
    date: entry?.date || todayStr(),
    storeName: entry?.storeName || "",
    category: entry?.category || "",
    description: entry?.description || "",
    items: entry?.items?.length ? entry.items : [{ id: uid(), name: "", quantity: 1, unitCost: 0 }],
    tax: entry?.tax || 0,
    mileage: entry?.mileage || "",
    paymentMethod: entry?.paymentMethod || "",
    receiptUrls: entry?.receiptUrls || [],
    photoUrls: entry?.photoUrls || [],
    notes: entry?.notes || "",
    status: entry?.status || "Draft",
  });
  const [errors, setErrors] = useState({});
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [receiptWarningDismissed, setReceiptWarningDismissed] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Item management
  const addItem = () => set("items", [...form.items, { id: uid(), name: "", quantity: 1, unitCost: 0 }]);
  const updateItem = (i, field, val) => {
    const next = [...form.items];
    next[i] = { ...next[i], [field]: val };
    set("items", next);
  };
  const removeItem = (i) => set("items", form.items.filter((_, idx) => idx !== i));

  // Calculations
  const subtotal = form.items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitCost) || 0), 0);
  const tax = Number(form.tax) || 0;
  const mileageRate = settings?.mileageRate || IRS_MILEAGE_RATE;
  const mileageVal = Number(form.mileage) || 0;
  const mileageTotal = mileageVal > 0 ? Math.round(mileageVal * mileageRate * 100) / 100 : 0;
  const grandTotal = subtotal + tax + mileageTotal;

  const validate = () => {
    const e = {};
    if (!form.storeName.trim()) e.storeName = "Store name is required";
    if (!form.category) e.category = "Select a category";
    if (!form.items.some(item => item.name?.trim())) e.items = "Add at least one item";
    if (grandTotal <= 0) e.total = "Total must be greater than zero";
    if (form.date > todayStr()) e.date = "Date cannot be in the future";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    const data = { ...form, subtotal, tax, total: grandTotal, mileageRate: mileageVal > 0 ? mileageRate : null, mileageTotal, status: "Draft" };
    await onSave(data, entry?.id);
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    const data = { ...form, subtotal, tax, total: grandTotal, mileageRate: mileageVal > 0 ? mileageRate : null, mileageTotal, status: "Submitted" };
    await onSubmit(data, entry?.id);
    setSubmitting(false);
  };

  const noReceipt = form.receiptUrls.length === 0 && !receiptWarningDismissed;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Date + Store */}
      <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: 16 }}>
        <Field label="Purchase Date" required>
          <input type="date" style={{ ...S.input, borderColor: errors.date ? BRAND.error : BRAND.border }} value={form.date} onChange={e => set("date", e.target.value)} />
          {errors.date && <div style={{ color: BRAND.error, fontSize: 12, marginTop: 4 }}>{errors.date}</div>}
        </Field>
        <Field label="Store Name" required>
          <input style={{ ...S.input, borderColor: errors.storeName ? BRAND.error : BRAND.border }} value={form.storeName} onChange={e => set("storeName", e.target.value)} placeholder="e.g. Home Depot, Target" />
          {errors.storeName && <div style={{ color: BRAND.error, fontSize: 12, marginTop: 4 }}>{errors.storeName}</div>}
        </Field>
      </div>

      {/* Category + Payment */}
      <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: 16 }}>
        <Field label="Category" required>
          <select style={{ ...S.select, borderColor: errors.category ? BRAND.error : BRAND.border }} value={form.category} onChange={e => set("category", e.target.value)}>
            <option value="">Select category...</option>
            {PURCHASE_CATEGORIES.map(c => <option key={c} value={c}>{PURCHASE_CATEGORY_EMOJIS[c] || ""} {c}</option>)}
          </select>
          {errors.category && <div style={{ color: BRAND.error, fontSize: 12, marginTop: 4 }}>{errors.category}</div>}
        </Field>
        <Field label="Payment Method">
          <select style={S.select} value={form.paymentMethod} onChange={e => set("paymentMethod", e.target.value)}>
            <option value="">Select...</option>
            {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Description / Purpose">
        <input style={S.input} value={form.description} onChange={e => set("description", e.target.value)} placeholder="What was this purchase for?" />
      </Field>

      {/* Line Items */}
      <div>
        <div style={{ ...S.sectionLabel, marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span>🛒 Items</span>
          <button type="button" style={{ ...S.btnGhost, fontSize: 12, padding: "4px 12px" }} onClick={addItem}><Icon name="plus" size={14} /> Add Item</button>
        </div>
        {errors.items && <div style={{ color: BRAND.error, fontSize: 12, marginBottom: 8 }}>{errors.items}</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {form.items.map((item, i) => (
            <div key={item.id || i} style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "2fr 80px 100px 90px 36px", gap: 8, alignItems: "end", padding: 12, background: BRAND.bgSoft, borderRadius: 8, border: "1px solid " + BRAND.borderLight }}>
              <div>
                {mob && <div style={{ fontSize: 11, color: BRAND.textLight, marginBottom: 3 }}>Item Name</div>}
                <input style={{ ...S.input, padding: "8px 10px", fontSize: 13 }} value={item.name} onChange={e => updateItem(i, "name", e.target.value)} placeholder="Item name" />
              </div>
              <div>
                {mob && <div style={{ fontSize: 11, color: BRAND.textLight, marginBottom: 3 }}>Qty</div>}
                <input type="number" min="0.01" step="1" inputMode="decimal" style={{ ...S.input, padding: "8px 10px", fontSize: 13, textAlign: "right" }} value={item.quantity} onChange={e => updateItem(i, "quantity", e.target.value)} />
              </div>
              <div>
                {mob && <div style={{ fontSize: 11, color: BRAND.textLight, marginBottom: 3 }}>Unit Cost ($)</div>}
                <input type="number" min="0" step="0.01" inputMode="decimal" style={{ ...S.input, padding: "8px 10px", fontSize: 13, textAlign: "right" }} value={item.unitCost} onChange={e => updateItem(i, "unitCost", e.target.value)} placeholder="0.00" />
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: BRAND.charcoal, textAlign: "right", padding: "8px 0" }}>
                {fmt((Number(item.quantity) || 0) * (Number(item.unitCost) || 0))}
              </div>
              {form.items.length > 1 && (
                <button type="button" onClick={() => removeItem(i)} style={{ background: "none", border: "none", color: BRAND.error, cursor: "pointer", padding: 4 }} title="Remove item"><Icon name="x" size={16} /></button>
              )}
            </div>
          ))}
        </div>

        {/* Totals */}
        <div style={{ marginTop: 16, padding: "14px 16px", background: BRAND.white, border: "1px solid " + BRAND.borderLight, borderRadius: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 14 }}>
            <span style={{ color: BRAND.textMuted }}>Subtotal</span>
            <span style={{ fontWeight: 600 }}>{fmt(subtotal)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, fontSize: 14 }}>
            <span style={{ color: BRAND.textMuted }}>Tax</span>
            <input type="number" min="0" step="0.01" inputMode="decimal" style={{ ...S.input, width: 100, padding: "6px 10px", fontSize: 13, textAlign: "right" }} value={form.tax} onChange={e => set("tax", e.target.value)} placeholder="0.00" />
          </div>
          {mileageTotal > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 14 }}>
              <span style={{ color: BRAND.textMuted }}>Mileage ({mileageVal} mi × {fmt(mileageRate)}/mi)</span>
              <span style={{ fontWeight: 600 }}>{fmt(mileageTotal)}</span>
            </div>
          )}
          <div style={{ borderTop: "2px solid " + BRAND.navy, paddingTop: 10, display: "flex", justifyContent: "space-between", fontSize: 16 }}>
            <span style={{ fontWeight: 700, color: BRAND.navy }}>Grand Total</span>
            <span style={{ fontWeight: 700, color: BRAND.navy }}>{fmt(grandTotal)}</span>
          </div>
          {errors.total && <div style={{ color: BRAND.error, fontSize: 12, marginTop: 6 }}>{errors.total}</div>}
        </div>
      </div>

      {/* Mileage */}
      <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: 16 }}>
        <Field label="Round-trip Mileage (optional)">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="number" min="0" step="0.1" inputMode="decimal" style={{ ...S.input, flex: 1 }} value={form.mileage} onChange={e => set("mileage", e.target.value)} placeholder="0" />
            <span style={{ fontSize: 12, color: BRAND.textLight, whiteSpace: "nowrap" }}>@ {fmt(mileageRate)}/mi</span>
          </div>
        </Field>
      </div>

      {/* Receipts */}
      <ImageUploader images={form.receiptUrls.map((url, i) => ({ id: "r" + i, dataUrl: url }))} onChange={(imgs) => set("receiptUrls", imgs.map(img => img.dataUrl))} label="📎 Receipts" color={BRAND.brick} icon="receipt" mob={mob} />
      {noReceipt && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "#FFF8E1", border: "1px solid #FFE082", borderRadius: 8, fontSize: 13, color: "#92400E" }}>
          <span>⚠️</span>
          <span style={{ flex: 1 }}>No receipt attached. Consider adding one for faster approval.</span>
          <button style={{ ...S.btnGhost, fontSize: 12, padding: "4px 10px" }} onClick={() => setReceiptWarningDismissed(true)}>Dismiss</button>
        </div>
      )}

      {/* Photos */}
      <ImageUploader images={form.photoUrls.map((url, i) => ({ id: "p" + i, dataUrl: url }))} onChange={(imgs) => set("photoUrls", imgs.map(img => img.dataUrl))} label="📷 Photos" color={BRAND.green} icon="camera" mob={mob} />

      {/* Notes */}
      <Field label="Notes">
        <textarea style={{ ...S.input, minHeight: 80 }} value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Any additional notes..." />
      </Field>

      {/* Actions */}
      <div style={{ display: "flex", gap: 10, justifyContent: "space-between", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={S.btnSecondary} onClick={onCancel}>Cancel</button>
          {entry?.id && entry?.status === "Draft" && (
            <button style={{ ...S.btnGhost, color: BRAND.error }} onClick={() => setShowDeleteConfirm(true)}>
              <Icon name="trash" size={16} /> Delete
            </button>
          )}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={S.btnSecondary} onClick={handleSave}><Icon name="save" size={16} /> Save Draft</button>
          <button style={{ ...S.btnPrimary, opacity: submitting ? 0.6 : 1 }} disabled={submitting} onClick={() => setShowSubmitConfirm(true)}>
            <Icon name="send" size={16} /> {submitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      </div>

      <ConfirmDialog open={showSubmitConfirm} onClose={() => setShowSubmitConfirm(false)} onConfirm={handleSubmit}
        title="Submit Purchase Entry?" message={`Submit ${form.storeName || "this purchase"} for ${fmt(grandTotal)} to the Treasurer for review?`} confirmText="Submit" />
      <ConfirmDialog open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} onConfirm={() => onDelete && onDelete()} title="Delete Draft?" message="This purchase entry draft will be permanently deleted." confirmText="Delete" danger />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// PURCHASE ENTRY DETAIL
// ═══════════════════════════════════════════════════════════════════════════
const PurchaseEntryDetail = ({ entry, settings, users, currentUser, onBack, onEdit, onApprove, onReject, onMarkPaid, mob }) => {
  const user = users.find(u => u.id === entry.userId);
  const isTreasurer = currentUser?.role === ROLES.TREASURER;
  const isOwner = currentUser?.id === entry.userId;
  const canEdit = isOwner && (entry.status === "Draft" || entry.status === "Rejected");
  const canReview = isTreasurer && entry.status === "Submitted";
  const [reviewNotes, setReviewNotes] = useState("");
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const mileageRate = entry.mileageRate || settings?.mileageRate || IRS_MILEAGE_RATE;

  return (
    <div className="fade-in">
      <button style={{ ...S.btnGhost, marginBottom: 16, padding: "6px 0" }} onClick={onBack}>← Back</button>

      <div style={S.card}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 20 }}>🛍️</span>
              <h2 style={{ ...S.h2, margin: 0 }}>Purchase Entry</h2>
            </div>
            <div style={{ fontSize: 13, color: BRAND.textMuted }}>{formatDate(entry.date)} · {user?.name || "Unknown"}</div>
          </div>
          <StatusBadge status={entry.status} />
        </div>

        {/* Workflow Stepper */}
        <WorkflowStepper status={entry.status} mob={mob} />

        {/* Details Grid */}
        <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: 16, margin: "20px 0" }}>
          <div><div style={{ fontSize: 11, color: BRAND.textLight, textTransform: "uppercase", marginBottom: 4 }}>Store</div><div style={{ fontSize: 15, fontWeight: 600, color: BRAND.charcoal }}>{entry.storeName}</div></div>
          <div><div style={{ fontSize: 11, color: BRAND.textLight, textTransform: "uppercase", marginBottom: 4 }}>Category</div><div style={{ fontSize: 14 }}>{PURCHASE_CATEGORY_EMOJIS[entry.category] || "📦"} {entry.category}</div></div>
          {entry.paymentMethod && <div><div style={{ fontSize: 11, color: BRAND.textLight, textTransform: "uppercase", marginBottom: 4 }}>Payment Method</div><div style={{ fontSize: 14 }}>{entry.paymentMethod}</div></div>}
          {entry.description && <div style={{ gridColumn: "1 / -1" }}><div style={{ fontSize: 11, color: BRAND.textLight, textTransform: "uppercase", marginBottom: 4 }}>Description</div><div style={{ fontSize: 14 }}>{entry.description}</div></div>}
        </div>

        {/* Line Items Table */}
        <div style={{ ...S.sectionLabel, marginBottom: 8 }}>Items</div>
        <div style={{ border: "1px solid " + BRAND.borderLight, borderRadius: 8, overflow: "hidden", marginBottom: 16 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr><th style={S.th}>Item</th><th style={{ ...S.th, textAlign: "right" }}>Qty</th><th style={{ ...S.th, textAlign: "right" }}>Unit Cost</th><th style={{ ...S.th, textAlign: "right" }}>Total</th></tr></thead>
            <tbody>
              {(entry.items || []).map((item, i) => (
                <tr key={i} style={{ background: i % 2 === 1 ? BRAND.bgSoft : BRAND.white }}>
                  <td style={S.td}>{item.name}</td>
                  <td style={{ ...S.td, textAlign: "right" }}>{item.quantity}</td>
                  <td style={{ ...S.td, textAlign: "right" }}>{fmt(item.unitCost)}</td>
                  <td style={{ ...S.td, textAlign: "right", fontWeight: 600 }}>{fmt((Number(item.quantity) || 0) * (Number(item.unitCost) || 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div style={{ padding: "14px 16px", background: BRAND.bgSoft, borderRadius: 8, border: "1px solid " + BRAND.borderLight, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 14 }}><span>Subtotal</span><span>{fmt(entry.subtotal)}</span></div>
          {entry.tax > 0 && <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 14 }}><span>Tax</span><span>{fmt(entry.tax)}</span></div>}
          {entry.mileageTotal > 0 && <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 14 }}><span>Mileage ({entry.mileage} mi × {fmt(mileageRate)}/mi)</span><span>{fmt(entry.mileageTotal)}</span></div>}
          <div style={{ borderTop: "2px solid " + BRAND.navy, paddingTop: 8, marginTop: 4, display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 700, color: BRAND.navy }}><span>Total</span><span>{fmt(entry.total)}</span></div>
        </div>

        {/* Receipts & Photos */}
        {entry.receiptUrls?.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={S.sectionLabel}>Receipts</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              {entry.receiptUrls.map((url, i) => <img key={i} src={url} alt={"Receipt " + (i + 1)} style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8, border: "1px solid " + BRAND.borderLight, cursor: "pointer", transition: "transform 150ms, box-shadow 150ms" }} onMouseEnter={ev => { ev.currentTarget.style.transform = "scale(1.06)"; ev.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.18)"; }} onMouseLeave={ev => { ev.currentTarget.style.transform = "scale(1)"; ev.currentTarget.style.boxShadow = "none"; }} onClick={() => onLightbox ? onLightbox(url, "Receipt " + (i + 1)) : window.open(url)} />)}
            </div>
          </div>
        )}
        {entry.photoUrls?.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={S.sectionLabel}>Photos</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              {entry.photoUrls.map((url, i) => <img key={i} src={url} alt={"Photo " + (i + 1)} style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8, border: "1px solid " + BRAND.borderLight, cursor: "pointer", transition: "transform 150ms, box-shadow 150ms" }} onMouseEnter={ev => { ev.currentTarget.style.transform = "scale(1.06)"; ev.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.18)"; }} onMouseLeave={ev => { ev.currentTarget.style.transform = "scale(1)"; ev.currentTarget.style.boxShadow = "none"; }} onClick={() => onLightbox ? onLightbox(url, "Photo " + (i + 1)) : window.open(url)} />)}
            </div>
          </div>
        )}

        {/* Notes */}
        {entry.notes && <div style={{ marginBottom: 16 }}><div style={S.sectionLabel}>Notes</div><div style={{ fontSize: 14, color: BRAND.charcoal, marginTop: 4 }}>{entry.notes}</div></div>}

        {/* Reviewer Notes */}
        {entry.reviewerNotes && (
          <div style={{ padding: 14, background: entry.status === "Rejected" ? "#FEF2F2" : "#F0FDF4", border: "1px solid " + (entry.status === "Rejected" ? "#FECACA" : "#BBF7D0"), borderRadius: 8, marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: entry.status === "Rejected" ? BRAND.error : BRAND.success, marginBottom: 4 }}>Reviewer Notes</div>
            <div style={{ fontSize: 14 }}>{entry.reviewerNotes}</div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end", marginTop: 8 }}>
          {canEdit && <button style={S.btnPrimary} onClick={onEdit}><Icon name="edit" size={16} /> Edit</button>}
          {canReview && (
            <>
              <div style={{ flex: 1 }} />
              <input style={{ ...S.input, flex: 2, minWidth: 200, maxWidth: 400, fontSize: 13 }} value={reviewNotes} onChange={e => setReviewNotes(e.target.value)} placeholder="Reviewer notes (optional)..." />
              <button style={{ ...S.btnGhost, color: BRAND.error, border: "1px solid " + BRAND.error + "40" }} onClick={() => setShowRejectConfirm(true)}><Icon name="x" size={16} /> Reject</button>
              <button style={S.btnPrimary} onClick={() => onApprove(reviewNotes)}><Icon name="check" size={16} /> Approve</button>
            </>
          )}
          {isTreasurer && entry.status === "Approved" && (
            <button style={{ ...S.btnPrimary, background: BRAND.success }} onClick={() => onMarkPaid && onMarkPaid({ method: "Check" })}><Icon name="dollar" size={16} /> Mark Paid</button>
          )}
        </div>
      </div>

      <ConfirmDialog open={showRejectConfirm} onClose={() => setShowRejectConfirm(false)} onConfirm={() => { onReject(reviewNotes); setShowRejectConfirm(false); }} title="Reject Purchase Entry?" message="This will return the entry to the member for edits." confirmText="Reject" danger />
    </div>
  );
};

// Workflow Stepper — visual progress indicator
const WORKFLOW_STEPS = [
  { key: "Draft", label: "Draft", icon: "edit" },
  { key: "Submitted", label: "Submitted", icon: "send" },
  { key: "Approved", label: "Approved", icon: "check" },
  { key: "Paid", label: "Paid", icon: "dollar" },
];
const WorkflowStepper = ({ status, mob }) => {
  const [mounted, setMounted] = useState(false);
  const prevStatus = useRef(status);
  const [animatingIdx, setAnimatingIdx] = useState(null);

  useEffect(() => {
    // Stagger mount trigger — tiny delay so React paints first
    const t = setTimeout(() => setMounted(true), 30);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (prevStatus.current !== status) {
      // Find which step just became active and fire pop animation
      const rejected = status === STATUSES.REJECTED;
      const awaitingSecond = status === STATUSES.AWAITING_SECOND;
      const steps = rejected ? WORKFLOW_STEPS.slice(0, 2) : awaitingSecond ? [...WORKFLOW_STEPS.slice(0, 3)] : WORKFLOW_STEPS;
      const newIdx = rejected ? 1 : awaitingSecond ? 2 : steps.findIndex(s => s.key === status);
      setAnimatingIdx(newIdx);
      const t = setTimeout(() => setAnimatingIdx(null), 600);
      prevStatus.current = status;
      return () => clearTimeout(t);
    }
  }, [status]);

  const rejected = status === STATUSES.REJECTED;
  const awaitingSecond = status === STATUSES.AWAITING_SECOND;
  const steps = rejected ? WORKFLOW_STEPS.slice(0, 2) : awaitingSecond ? [...WORKFLOW_STEPS.slice(0, 3)] : WORKFLOW_STEPS;
  const currentIdx = rejected ? 1 : awaitingSecond ? 2 : steps.findIndex(s => s.key === status);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, width: "100%", overflow: "hidden" }}>
      {steps.map((s, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        const isRejectStep = rejected && active;
        const isAwaitStep = awaitingSecond && active;
        const dotColor = isRejectStep ? BRAND.error : isAwaitStep ? "#4338CA" : done ? BRAND.success : active ? BRAND.navy : BRAND.border;
        const lineColor = done ? BRAND.success : BRAND.borderLight;
        const delay = i * 70; // stagger ms
        const isAnimating = animatingIdx === i;

        return (
          <div key={s.key} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : "none" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: mob ? 48 : 64 }}>
              {/* Dot */}
              <div style={{
                width: mob ? 28 : 32, height: mob ? 28 : 32, borderRadius: 16,
                background: (done || active) ? dotColor : BRAND.bgSoft,
                border: "2px solid " + dotColor,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: (done || active) ? "#fff" : BRAND.textLight,
                transition: "background 400ms ease, border-color 400ms ease, transform 300ms ease",
                opacity: mounted ? 1 : 0,
                transform: mounted ? "scale(1)" : "scale(0.5)",
                animation: mounted
                  ? isAnimating
                    ? "stepPop 500ms cubic-bezier(0.34,1.56,0.64,1)"
                    : active
                      ? (isRejectStep ? "none" : `stepPulse${done ? "Success" : ""} 2s ease-in-out 800ms infinite`)
                      : "none"
                  : "none",
                // Stagger the initial transition delay
                transitionDelay: mounted ? "0ms" : `${delay}ms`,
                animationName: isAnimating ? "stepPop" : active && !isRejectStep ? (done ? "stepPulseSuccess" : "stepPulse") : "none",
              }}>
                {isRejectStep ? <Icon name="x" size={14} /> : done ? <Icon name="check" size={14} /> : <Icon name={s.icon} size={14} />}
              </div>
              {/* Label */}
              <span style={{
                fontSize: 11, fontWeight: active ? 700 : 500,
                color: active ? dotColor : done ? BRAND.success : BRAND.textLight,
                marginTop: 4, whiteSpace: "nowrap",
                opacity: mounted ? 1 : 0,
                transition: `opacity 300ms ease ${delay + 80}ms, color 400ms ease`,
              }}>
                {isRejectStep ? "Rejected" : isAwaitStep ? "Awaiting 2nd" : s.label}
              </span>
            </div>
            {/* Connecting line with fill animation */}
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 2, background: BRAND.borderLight, minWidth: 12, marginBottom: 18, position: "relative", overflow: "hidden" }}>
                <div style={{
                  position: "absolute", inset: 0,
                  background: BRAND.success,
                  width: done ? "100%" : "0%",
                  transition: `width 500ms ease ${delay + 120}ms`,
                }} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// ENTRY DETAIL
// ═══════════════════════════════════════════════════════════════════════════
const EntryDetail = ({ entry, settings, users, currentUser, onBack, onEdit, onApprove, onReject, onTrash, onRestore, onMarkPaid, onDuplicate, onSecondApprove, onDelete, onComment, onLightbox, mob }) => {
  const [reviewNotes, setReviewNotes] = useState(entry.reviewerNotes || "");
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showPaidConfirm, setShowPaidConfirm] = useState(false);
  const [showAuditLog, setShowAuditLog] = useState(true); // open by default
  const [showDeclinePanel, setShowDeclinePanel] = useState(false);
  const [showTrashPanel, setShowTrashPanel] = useState(false);
  const [declineNote, setDeclineNote] = useState("");
  const [trashNote, setTrashNote] = useState("");
  const [payMethod, setPayMethod] = useState("Zelle");
  const [payRef, setPayRef] = useState("");
  const [approveRipple, setApproveRipple] = useState(false);
  const [declineShake, setDeclineShake] = useState(false);
  const [paidAnimating, setPaidAnimating] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const commentEndRef = useRef(null);

  const fireApproveRipple = () => {
    setApproveRipple(true);
    setTimeout(() => setApproveRipple(false), 600);
  };
  const fireDeclineShake = () => {
    setDeclineShake(true);
    setTimeout(() => setDeclineShake(false), 320);
  };
  const isTreasurer = currentUser.role === ROLES.TREASURER;
  const user = users.find(u => u.id === entry.userId);
  const hours = calcHours(entry.startTime, entry.endTime);
  const rate = getUserRate(users, settings, entry.userId);
  const laborTotal = calcLabor(hours, rate);
  const matTotal = calcMaterialsTotal(entry.materials);
  const grandTotal = laborTotal + matTotal;
  const canEdit = (entry.userId === currentUser.id || isTreasurer) && [STATUSES.DRAFT, STATUSES.REJECTED, STATUSES.NEEDS_INFO].includes(entry.status);
  const canReview = isTreasurer && [STATUSES.SUBMITTED, STATUSES.AWAITING_SECOND, STATUSES.NEEDS_INFO].includes(entry.status);
  const canMarkPaid = isTreasurer && entry.status === STATUSES.APPROVED;
  const needsSecondApproval = entry.status === STATUSES.AWAITING_SECOND;
  const canSecondApprove = isTreasurer && needsSecondApproval;
  // Treasurer can trash or decline any entry that isn't already in Trash
  const canTrash   = isTreasurer && entry.status !== STATUSES.TRASH;
  const canDecline = isTreasurer && entry.status !== STATUSES.TRASH;
  const canRestore = isTreasurer && entry.status === STATUSES.TRASH;
  // Check if dual approval is required for this entry's amount
  const dualRequired = settings.dualApprovalThreshold > 0 && grandTotal >= settings.dualApprovalThreshold;

  return (
    <div className="fade-in">
      <button style={{ ...S.btnGhost, marginBottom: 20, padding: "6px 0" }} onClick={onBack}><Icon name="back" size={18} /> Back to entries</button>
      <div style={{ position: "sticky", top: mob ? 56 : 57, zIndex: 9, background: BRAND.bgSoft, paddingTop: 16, paddingBottom: 4, marginBottom: 8, marginLeft: mob ? -16 : -32, marginRight: mob ? -16 : -32, paddingLeft: mob ? 16 : 32, paddingRight: mob ? 16 : 32, borderBottom: "1px solid " + BRAND.borderLight }}>
        <WorkflowStepper status={entry.status} mob={mob} />
      </div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <h2 style={S.h2}>{entry.category}</h2>
            <StatusBadge status={entry.status} />
          </div>
          <div style={{ fontSize: 14, color: BRAND.textMuted }}>{formatDate(entry.date)} · {formatTime(entry.startTime)} – {formatTime(entry.endTime)} · {user?.name || "Unknown"}</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {canEdit && <button style={S.btnPrimary} onClick={onEdit}><Icon name="edit" size={16} /> Edit</button>}
          <button
            style={{ ...S.btnGhost, fontSize: 13, border: "1px solid " + BRAND.borderLight }}
            onClick={() => onDuplicate(entry)}
            title="Create a new draft with the same details"
          >
            <Icon name="copy" size={14} /> Duplicate
          </button>
        </div>
      </div>
      <div style={S.card}>
        <div style={S.sectionLabel}>Task Description</div>
        <p style={{ margin: 0, lineHeight: 1.7, fontSize: 15 }}>{entry.description}</p>
        {entry.location && <div style={{ marginTop: 12, fontSize: 13, color: BRAND.textMuted }}>📍 {entry.location}</div>}
        {entry.mileage && <div style={{ marginTop: 6, fontSize: 13, color: BRAND.textMuted }}>🚗 {entry.mileage} miles <span style={{ color: BRAND.navy, fontWeight: 600, marginLeft: 8 }}>{fmt(Number(entry.mileage) * IRS_MILEAGE_RATE)}</span> <span style={{ fontSize: 11, color: BRAND.textLight }}>@ ${IRS_MILEAGE_RATE}/mi IRS rate</span></div>}
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
      {/* Reviewer notes — shown to member (read-only) when set */}
      {!isTreasurer && entry.reviewerNotes && (
        <div style={{ ...S.card,
          borderColor: entry.status === STATUSES.NEEDS_INFO ? "#FED7AA" : entry.status === STATUSES.REJECTED ? "#F0BABA" : BRAND.borderLight,
          borderLeft: "4px solid " + (entry.status === STATUSES.NEEDS_INFO ? "#C2410C" : entry.status === STATUSES.REJECTED ? BRAND.brick : BRAND.success),
          background: entry.status === STATUSES.NEEDS_INFO ? "#FFF7ED" : BRAND.white
        }}>
          <div style={{ ...S.sectionLabel, color: entry.status === STATUSES.NEEDS_INFO ? "#C2410C" : BRAND.textMuted }}>
            {entry.status === STATUSES.NEEDS_INFO ? "💬 Additional info requested" : "Reviewer Notes"}
          </div>
          <div style={{ padding: 14, background: entry.status === STATUSES.NEEDS_INFO ? "#FFF7ED" : BRAND.bgSoft, borderRadius: 6, fontSize: 14 }}>{entry.reviewerNotes}</div>
          {entry.status === STATUSES.NEEDS_INFO && (
            <div style={{ marginTop: 8, fontSize: 13, color: "#9A3412", fontWeight: 600, padding: "0 14px 14px" }}>
              ↑ Add the requested details, then re-submit.
            </div>
          )}
        </div>
      )}
      {/* ── Treasurer Action Bar ── */}
      {isTreasurer && (
        <div style={{ ...S.card, background: "#F8F7F5", borderColor: BRAND.borderLight, padding: "16px 20px" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: BRAND.textMuted, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>Treasurer Actions</div>

          {/* Restored from Trash */}
          {canRestore && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "#FFF8E1", border: "1px solid #F59E0B", borderRadius: 8 }}>
              <span style={{ fontSize: 13, color: "#92400E" }}>🗑 This entry is in the Trash.</span>
              <button style={{ ...S.btnGhost, fontSize: 13, marginLeft: "auto" }} onClick={() => onRestore(entry)}>↩ Restore</button>
            </div>
          )}

          {/* Main action buttons */}
          {!canRestore && (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: (showDeclinePanel || showTrashPanel) ? 12 : 0 }}>
              {canReview && (
                <button
                  style={{ ...S.btnSuccess, position: "relative", overflow: "hidden" }}
                  onClick={() => { fireApproveRipple(); setShowApproveConfirm(true); }}
                >
                  {approveRipple && (
                    <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                      <span style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(255,255,255,0.4)", animation: "ripple 500ms ease-out forwards" }} />
                    </span>
                  )}
                  <Icon name="check" size={16} /> {dualRequired ? "First Approval" : "Approve"}
                </button>
              )}
              {canDecline && !showDeclinePanel && (
                <button
                  style={{ ...S.btnDanger, animation: declineShake ? "shake 300ms ease-in-out" : "none" }}
                  onClick={() => { fireDeclineShake(); setTimeout(() => { setShowDeclinePanel(true); setShowTrashPanel(false); }, 150); }}
                >
                  <Icon name="x" size={16} /> Decline
                </button>
              )}
              {canDecline && showDeclinePanel && (
                <button style={{ ...S.btnGhost, fontSize: 13 }} onClick={() => setShowDeclinePanel(false)}>Cancel Decline</button>
              )}
              {dualRequired && <div style={{ fontSize: 11, color: "#4338CA" }}>⚖️ Dual approval required ({fmt(settings.dualApprovalThreshold)}+)</div>}
              {canTrash && !showTrashPanel && (
                <button style={{ ...S.btnGhost, marginLeft: "auto", color: "#7f1d1d", borderColor: "#7f1d1d40", fontSize: 13 }}
                  onClick={() => { setShowTrashPanel(true); setShowDeclinePanel(false); }}>
                  🗑 Move to Trash
                </button>
              )}
              {canTrash && showTrashPanel && (
                <button style={{ ...S.btnGhost, marginLeft: "auto", fontSize: 13 }} onClick={() => setShowTrashPanel(false)}>Cancel</button>
              )}
            </div>
          )}

          {/* Inline Decline panel */}
          {showDeclinePanel && (
            <div className="fade-in" style={{ borderTop: "1px solid " + BRAND.borderLight, paddingTop: 12 }}>
              <label style={S.label}>Reason for declining <span style={{ color: BRAND.error, fontWeight: 700 }}>*</span></label>
              <textarea style={{ ...S.textarea, minHeight: 72, borderColor: declineNote.trim() ? BRAND.border : BRAND.error + "80" }}
                value={declineNote} onChange={e => setDeclineNote(e.target.value)}
                placeholder="Explain what needs to be fixed. The member will see this note." autoFocus />
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
                <button style={{ ...S.btnGhost, fontSize: 13 }} onClick={() => { setShowDeclinePanel(false); setDeclineNote(""); }}>Cancel</button>
                <button style={{ ...S.btnDanger, fontSize: 13, opacity: declineNote.trim() ? 1 : 0.5 }}
                  disabled={!declineNote.trim()}
                  onClick={() => { onReject(declineNote); setShowDeclinePanel(false); setDeclineNote(""); }}>
                  <Icon name="x" size={14} /> Confirm Decline
                </button>
              </div>
            </div>
          )}

          {/* Inline Trash panel */}
          {showTrashPanel && (
            <div className="fade-in" style={{ borderTop: "1px solid " + BRAND.borderLight, paddingTop: 12 }}>
              <label style={S.label}>Reason <span style={{ color: BRAND.textLight, fontWeight: 400 }}>(optional)</span></label>
              <textarea style={{ ...S.textarea, minHeight: 60 }}
                value={trashNote} onChange={e => setTrashNote(e.target.value)}
                placeholder="Why is this being trashed? (visible in audit log)" autoFocus />
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
                <button style={{ ...S.btnGhost, fontSize: 13 }} onClick={() => { setShowTrashPanel(false); setTrashNote(""); }}>Cancel</button>
                <button style={{ background: "#7f1d1d", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                  onClick={() => { onTrash(entry, trashNote, "Moved to Trash"); setShowTrashPanel(false); setTrashNote(""); }}>
                  🗑 Move to Trash
                </button>
              </div>
            </div>
          )}

          {/* Approve note (for Submitted) */}
          {canReview && !showDeclinePanel && !showTrashPanel && (
            <div style={{ marginTop: 12 }}>
              <label style={S.label}>Approval note <span style={{ color: BRAND.textLight, fontWeight: 400 }}>(optional)</span></label>
              <textarea style={{ ...S.textarea, minHeight: 56 }} value={reviewNotes} onChange={e => setReviewNotes(e.target.value)} placeholder="Optional note for the member..." />
            </div>
          )}
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
            <button
              style={{ ...S.btnPrimary, background: "#3B5998", position: "relative", overflow: "hidden", transition: "transform 150ms ease" }}
              onMouseDown={e => { e.currentTarget.style.transform = "scale(0.96)"; }}
              onMouseUp={e => { e.currentTarget.style.transform = "scale(1)"; setPaidAnimating(true); setTimeout(() => setPaidAnimating(false), 800); setShowPaidConfirm(true); }}
              onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
            >
              <Icon name="dollar" size={16} /> Mark as Paid —{" "}
              <span style={{ animation: paidAnimating ? "paidCount 400ms ease-out" : "none" }}>{fmt(grandTotal)}</span>
            </button>
          </div>
        </div>
      )}
      {entry.status === STATUSES.PAID && entry.paidAt && (
        <div style={{ ...S.card, background: "#E8EDF5", borderColor: "#B8C8E0" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#3B5998" }}>✓ Paid on {formatDate(entry.paidAt.split("T")[0])}</div>
        </div>
      )}
      {/* ── Discussion ── visible when entry is not Draft or Trash */}
      {![STATUSES.DRAFT, STATUSES.TRASH].includes(entry.status) && (
        <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid " + BRAND.borderLight, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: BRAND.charcoal }}>💬 Discussion</span>
            {entry.comments?.length > 0 && (
              <span style={{ fontSize: 11, color: BRAND.textLight, background: BRAND.bgSoft, border: "1px solid " + BRAND.borderLight, borderRadius: 10, padding: "1px 7px" }}>{entry.comments.length}</span>
            )}
          </div>
          <div style={{ padding: "0 20px" }}>
            {/* Message thread */}
            {(!entry.comments || entry.comments.length === 0) ? (
              <div style={{ padding: "20px 0", textAlign: "center", color: BRAND.textLight, fontSize: 13 }}>No messages yet. Start a conversation about this entry.</div>
            ) : (
              <div style={{ paddingTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                {entry.comments.map((c, i) => {
                  const isMe = c.userId === currentUser.id;
                  const isTreas = c.role === ROLES.TREASURER;
                  return (
                    <div key={c.id || i} className="fade-in" style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start" }}>
                      <div style={{ maxWidth: "80%", padding: "10px 14px", borderRadius: isMe ? "12px 12px 2px 12px" : "12px 12px 12px 2px", background: isMe ? BRAND.navy : isTreas ? "#EEF2FF" : BRAND.bgSoft, color: isMe ? "#fff" : BRAND.charcoal, fontSize: 13, lineHeight: 1.5 }}>
                        {c.message}
                      </div>
                      <div style={{ fontSize: 11, color: BRAND.textLight, marginTop: 3, display: "flex", gap: 6, alignItems: "center" }}>
                        <span style={{ fontWeight: 600 }}>{c.userName}</span>
                        {isTreas && !isMe && <span style={{ background: "#EEF2FF", color: "#4338CA", fontSize: 10, padding: "1px 5px", borderRadius: 4, fontWeight: 600 }}>Treasurer</span>}
                        <span>{timeAgo(c.createdAt)}</span>
                      </div>
                    </div>
                  );
                })}
                <div ref={commentEndRef} />
              </div>
            )}
            {/* Input */}
            <div style={{ padding: "14px 0", borderTop: entry.comments?.length ? "1px solid " + BRAND.borderLight : "none", marginTop: entry.comments?.length ? 8 : 0, display: "flex", gap: 8 }}>
              <input
                style={{ ...S.input, flex: 1, fontSize: 13 }}
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder="Write a message…"
                onKeyDown={async e => {
                  if (e.key === "Enter" && !e.shiftKey && commentText.trim()) {
                    e.preventDefault();
                    setSendingComment(true);
                    await onComment(entry.id, commentText);
                    setCommentText("");
                    setSendingComment(false);
                    setTimeout(() => commentEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
                  }
                }}
              />
              <button
                style={{ ...S.btnPrimary, padding: "10px 16px", opacity: commentText.trim() && !sendingComment ? 1 : 0.5 }}
                disabled={!commentText.trim() || sendingComment}
                onClick={async () => {
                  setSendingComment(true);
                  await onComment(entry.id, commentText);
                  setCommentText("");
                  setSendingComment(false);
                  setTimeout(() => commentEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
                }}
              >
                {sendingComment ? "…" : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Audit Trail — visible to all users */}
      {(() => {
        if (!entry.auditLog?.length) return null;

        // colour + icon per action type
        const eventStyle = (action) => {
          if (!action) return { dot: BRAND.textLight, bg: "transparent", icon: "●" };
          const a = action.toLowerCase();
          if (a.includes("creat"))   return { dot: BRAND.navy,    bg: BRAND.navy    + "10", icon: "✦" };
          if (a.includes("submit"))  return { dot: "#2563EB",     bg: "#2563EB10",          icon: "↑" };
          if (a.includes("approv"))  return { dot: BRAND.success, bg: BRAND.success + "12", icon: "✓" };
          if (a.includes("paid"))    return { dot: "#3B5998",     bg: "#3B599812",          icon: "💳" };
          if (a.includes("declin") || a.includes("reject")) return { dot: BRAND.error, bg: BRAND.error + "10", icon: "✕" };
          if (a.includes("trash"))   return { dot: "#7f1d1d",     bg: "#7f1d1d10",          icon: "🗑" };
          if (a.includes("restor"))  return { dot: "#D97706",     bg: "#D9770610",          icon: "↩" };
          if (a.includes("edit") || a.includes("saved")) return { dot: "#6366F1", bg: "#6366F110", icon: "✎" };
          return { dot: BRAND.textLight, bg: "transparent", icon: "●" };
        };

        const logs = [...entry.auditLog].reverse();

        return (
          <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
            <button
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                       padding: "14px 20px", background: "none", border: "none", cursor: "pointer",
                       fontFamily: BRAND.sans, borderBottom: showAuditLog ? "1px solid " + BRAND.borderLight : "none" }}
              onClick={() => setShowAuditLog(p => !p)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: BRAND.charcoal }}>Activity &amp; Changes</span>
                <span style={{ fontSize: 11, color: BRAND.textLight, background: BRAND.bgSoft,
                               border: "1px solid " + BRAND.borderLight, borderRadius: 10, padding: "1px 7px" }}>
                  {entry.auditLog.length}
                </span>
              </div>
              <span style={{ fontSize: 12, color: BRAND.textLight }}>{showAuditLog ? "▲ Hide" : "▼ Show"}</span>
            </button>

            {showAuditLog && (
              <div style={{ padding: "4px 0 8px" }}>
                {logs.map((log, i) => {
                  const es = eventStyle(log.action);
                  const ts = new Date(log.at).toLocaleDateString("en-US", {
                    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit"
                  });
                  return (
                    <div key={i} style={{ display: "flex", gap: 0, padding: "0 20px" }}>
                      {/* Timeline spine */}
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginRight: 12, flexShrink: 0 }}>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: es.bg,
                                      border: "2px solid " + es.dot, display: "flex", alignItems: "center",
                                      justifyContent: "center", fontSize: 12, color: es.dot, flexShrink: 0,
                                      marginTop: 10, zIndex: 1 }}>
                          {es.icon}
                        </div>
                        {i < logs.length - 1 && (
                          <div style={{ width: 2, flex: 1, minHeight: 12, background: BRAND.borderLight, margin: "2px 0" }} />
                        )}
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, padding: "10px 0", paddingBottom: i < logs.length - 1 ? 4 : 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: es.dot }}>{log.action}</span>
                          <span style={{ fontSize: 11, color: BRAND.textLight, whiteSpace: "nowrap" }}>{ts}</span>
                        </div>
                        <div style={{ fontSize: 12, color: BRAND.textMuted, marginTop: 1 }}>{log.byName}</div>

                        {/* Details string (legacy + notes) */}
                        {log.details && (
                          <div style={{ marginTop: 5, fontSize: 12, color: BRAND.charcoal,
                                        background: BRAND.bgSoft, borderRadius: 6, padding: "5px 10px",
                                        borderLeft: "3px solid " + es.dot }}>
                            {log.details}
                          </div>
                        )}

                        {/* Structured field diffs */}
                        {log.changes?.length > 0 && (
                          <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 3 }}>
                            {log.changes.map((c, ci) => (
                              <div key={ci} style={{ fontSize: 12, display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
                                <span style={{ color: BRAND.textLight, fontWeight: 600, minWidth: 80, flexShrink: 0 }}>{c.field}</span>
                                {c.from === "—" || !c.from ? (
                                  <span style={{ color: BRAND.success }}>{c.to}</span>
                                ) : (
                                  <>
                                    <span style={{ color: BRAND.error, textDecoration: "line-through", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.from}</span>
                                    <span style={{ color: BRAND.textLight }}>→</span>
                                    <span style={{ color: BRAND.success, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.to}</span>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}
      <ConfirmDialog open={showApproveConfirm} onClose={() => setShowApproveConfirm(false)} title={dualRequired ? "First Approval" : "Approve?"} message={dualRequired ? "This entry (" + fmt(grandTotal) + ") exceeds the dual-approval threshold. A second board member will need to approve before it's final." : "Approve " + fmt(grandTotal) + " for " + (user?.name || "member") + "?"} confirmText={dualRequired ? "First Approve" : "Approve"} onConfirm={() => onApprove(reviewNotes)} />
      <ConfirmDialog open={showPaidConfirm} onClose={() => setShowPaidConfirm(false)} title="Mark as Paid?" message={"Confirm payment of " + fmt(grandTotal) + " to " + (user?.name || "member") + " via " + payMethod + (payRef ? " (#" + payRef + ")" : "") + "?"} confirmText="Mark Paid" onConfirm={() => onMarkPaid({ method: payMethod, reference: payRef })} />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// ENTRY CARD (Mobile list replacement for tables — swipeable)
//
// TREASURER  — swipe LEFT only → Approve / Decline / Delete
// MEMBER     — swipe LEFT  → Edit (Draft/Rejected) or View
//              swipe RIGHT → Submit (Draft only)
// ═══════════════════════════════════════════════════════════════════════════
const SWIPE_THRESHOLD     = 60;   // px to commit reveal
const SWIPE_MAX_MEMBER    = 80;   // px travel for single-button reveal (View/Edit only)
const SWIPE_MAX_MEMBER_2  = 144;  // px travel for two-button reveal (Edit + Delete: 80+64)
const SWIPE_MAX_TREASURER = 196;  // px travel for three 64px buttons (3×64=192 + 4px buffer)

const EntryCard = ({ entry, users, settings, currentUser, onClick, onEdit, onSubmit, onApprove, onReject, onDelete }) => {
  const u = users.find(u => u.id === entry.userId);
  const hrs   = calcHours(entry.startTime, entry.endTime);
  const rate  = getUserRate(users, settings, entry.userId);
  const total = calcLabor(hrs, rate) + calcMaterialsTotal(entry.materials);
  const photoCount = (entry.preImages?.length || 0) + (entry.postImages?.length || 0);

  const isTreasurer = currentUser?.role === ROLES.TREASURER;

  // ── what actions apply to this card ───────────────────────────────────
  const canSubmit  = !isTreasurer && entry.status === STATUSES.DRAFT && entry.userId === currentUser?.id;
  const canEdit    = !isTreasurer && [STATUSES.DRAFT, STATUSES.REJECTED].includes(entry.status) && entry.userId === currentUser?.id;
  // Treasurer can approve/decline Submitted or Awaiting 2nd entries
  const canApprove = isTreasurer && [STATUSES.SUBMITTED, STATUSES.AWAITING_SECOND].includes(entry.status);
  const canDecline = isTreasurer && [STATUSES.SUBMITTED, STATUSES.AWAITING_SECOND].includes(entry.status);
  // Treasurer can delete any entry (Draft, Rejected, etc.) — not Approved/Paid
  const canTreasDelete = isTreasurer && ![STATUSES.APPROVED, STATUSES.PAID].includes(entry.status);

  const canMemberDelete = !isTreasurer && canEdit && entry.status === STATUSES.DRAFT;
  const swipeMax = isTreasurer ? SWIPE_MAX_TREASURER : (canMemberDelete ? SWIPE_MAX_MEMBER_2 : SWIPE_MAX_MEMBER);
  // Treasurer: only left swipe allowed
  const allowSwipeRight = !isTreasurer && canSubmit;
  const allowSwipeLeft  = isTreasurer ? (canApprove || canTreasDelete) : (canEdit || true); // members can always view

  // ── swipe state ────────────────────────────────────────────────────────
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const [offsetX, setOffsetX]   = useState(0);
  const [revealed, setRevealed] = useState(null); // "left" | "right" | null
  const [swiping, setSwiping]   = useState(false);

  const reset = () => { setOffsetX(0); setRevealed(null); setSwiping(false); };

  const onTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    setSwiping(false);
  };

  const onTouchMove = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (!swiping && Math.abs(dy) > Math.abs(dx)) return; // vertical scroll — ignore
    setSwiping(true);
    e.preventDefault();
    // Start from current revealed position so swipe-back feels natural
    const base = revealed === "left" ? -swipeMax : revealed === "right" ? swipeMax : 0;
    const lo = allowSwipeLeft  ? -swipeMax : 0;
    const hi = allowSwipeRight ? swipeMax  : 0;
    setOffsetX(Math.max(lo, Math.min(hi, base + dx)));
  };

  const onTouchEnd = () => {
    if (!swiping) { touchStartX.current = null; return; }
    // If we've moved enough toward center from a revealed state → dismiss
    const base = revealed === "left" ? -swipeMax : revealed === "right" ? swipeMax : 0;
    const delta = offsetX - base;
    if (revealed === "left"  && delta > SWIPE_THRESHOLD)  { reset(); }
    else if (revealed === "right" && delta < -SWIPE_THRESHOLD) { reset(); }
    else if (!revealed && offsetX < -SWIPE_THRESHOLD && allowSwipeLeft)  { setOffsetX(-swipeMax); setRevealed("left");  if (navigator.vibrate) navigator.vibrate(10); }
    else if (!revealed && offsetX > SWIPE_THRESHOLD  && allowSwipeRight) { setOffsetX(swipeMax);  setRevealed("right"); if (navigator.vibrate) navigator.vibrate(10); }
    else { setOffsetX(base); } // snap back to current state
    touchStartX.current = null;
  };

  const handleCardClick = () => { if (revealed) { reset(); return; } onClick(); };

  // ── backdrop colours ───────────────────────────────────────────────────
  // Left-swipe backdrop (right side of card) — danger zone for treasurer
  const leftSwipeBg = isTreasurer ? "#7f1d1d" : (canEdit ? BRAND.navy : "#4B5563");

  return (
    <div style={{ position: "relative", overflow: "hidden", borderRadius: 12, marginBottom: 10 }}>

      {/* ── SWIPE-RIGHT backdrop (Member submit only) ── */}
      {allowSwipeRight && (
        <div aria-hidden="true" style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center",
          paddingLeft: 20, background: BRAND.green, borderRadius: 12,
        }}>
          <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>✅ Submit</span>
        </div>
      )}

      {/* ── SWIPE-LEFT backdrop ── */}
      {allowSwipeLeft && (
        <div aria-hidden="true" style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center",
          justifyContent: "flex-end", paddingRight: 20, background: leftSwipeBg, borderRadius: 12,
          gap: 8,
        }}>
          {isTreasurer ? (
            <>
              {canApprove     && <Icon name="check" size={22} style={{ color: "#fff" }} />}
              {canDecline     && <Icon name="x"     size={22} style={{ color: "#fff" }} />}
              {canTreasDelete && <Icon name="trash" size={20} style={{ color: "#fff" }} />}
            </>
          ) : (
            <span style={{ color: "#fff", fontSize: 22 }}>{canEdit ? <Icon name="edit" size={22} style={{ color: "#fff" }} /> : <Icon name="inbox" size={22} style={{ color: "#fff" }} />}</span>
          )}
        </div>
      )}

      {/* ── CARD (slides) ── */}
      <div
        role="button" tabIndex={0}
        aria-label={entry.category + ": " + entry.description + ", " + fmt(total) + ", " + entry.status}
        onKeyDown={e => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onClick())}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={handleCardClick}
        style={{
          ...S.card,
          cursor: "pointer",
          padding: "14px 16px",
          marginBottom: 0,
          transform: `translateX(${offsetX}px)`,
          transition: swiping ? "none" : "transform 380ms cubic-bezier(0.34,1.56,0.64,1)",
          userSelect: "none",
          WebkitUserSelect: "none",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
              <CategoryBadge category={entry.category} />
              <StatusBadge status={entry.status} />
              {photoCount > 0 && (
                <span aria-label={photoCount + " photos"} style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 12, color: BRAND.textLight, background: BRAND.bgSoft, padding: "2px 8px", borderRadius: 10 }}>
                  📷 {photoCount}
                </span>
              )}
              {entry.comments?.length > 0 && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 12, color: "#4338CA", background: "#EEF2FF", padding: "2px 8px", borderRadius: 10, fontWeight: 600 }}>
                  💬 {entry.comments.length}
                </span>
              )}
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, color: BRAND.charcoal, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {entry.description}
            </div>
          </div>
          <div style={{ textAlign: "right", marginLeft: 12 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: BRAND.navy }}>{fmt(total)}</div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 13, color: BRAND.textLight }}>
            {relativeDate(entry.date)} · {fmtHours(hrs)}{u ? " · " + u.name : ""}
          </div>
          {/* swipe hint: ‹ for left-swipeable, › for right-swipeable */}
          {!revealed && (
            <div aria-hidden="true" style={{ fontSize: 16, opacity: 0.2, letterSpacing: -2, lineHeight: 1 }}>
              {allowSwipeRight && <span>›</span>}
              {allowSwipeLeft  && <span>‹</span>}
            </div>
          )}
        </div>
      </div>

      {/* ── REVEALED: swipe-right → Submit (Member, Draft) ── */}
      {revealed === "right" && canSubmit && (
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, display: "flex", alignItems: "center", paddingLeft: 12, zIndex: 2 }}>
          <button
            style={{ background: "#fff", color: BRAND.green, border: "2px solid " + BRAND.green, borderRadius: 8, padding: "7px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
            onClick={(e) => { e.stopPropagation(); reset(); onSubmit(entry); }}
          >
            Submit
          </button>
        </div>
      )}

      {/* ── REVEALED: swipe-left (Treasurer) → Approve / Decline / Delete ── */}
      {revealed === "left" && isTreasurer && (
        <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, display: "flex", alignItems: "stretch", zIndex: 2 }}>
          {canApprove && (
            <button
              aria-label="Approve"
              style={{ background: BRAND.success, color: "#fff", border: "none", width: 64, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 22, transition: "transform 120ms ease, filter 120ms ease" }}
              onTouchStart={e => e.currentTarget.style.transform = "scale(0.88)"}
              onTouchEnd={e => { e.currentTarget.style.transform = "scale(1)"; e.stopPropagation(); reset(); if (navigator.vibrate) navigator.vibrate(15); onApprove(entry); }}
            >
              <Icon name="check" size={22} />
            </button>
          )}
          {canDecline && (
            <button
              aria-label="Decline"
              style={{ background: BRAND.brick, color: "#fff", border: "none", width: 64, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "transform 120ms ease" }}
              onTouchStart={e => e.currentTarget.style.transform = "scale(0.88)"}
              onTouchEnd={e => { e.currentTarget.style.transform = "scale(1)"; e.stopPropagation(); reset(); if (navigator.vibrate) navigator.vibrate(15); onReject(entry); }}
            >
              <Icon name="x" size={22} />
            </button>
          )}
          {canTreasDelete && (
            <button
              aria-label="Move to trash"
              style={{ background: "#7f1d1d", color: "#fff", border: "none", width: 64, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 20, transition: "transform 120ms ease" }}
              onTouchStart={e => e.currentTarget.style.transform = "scale(0.88)"}
              onTouchEnd={e => { e.currentTarget.style.transform = "scale(1)"; e.stopPropagation(); reset(); onDelete(entry); }}
            >
              <Icon name="trash" size={20} />
            </button>
          )}
        </div>
      )}

      {/* ── REVEALED: swipe-left (Member) → Edit/View + Delete (drafts) ── */}
      {revealed === "left" && !isTreasurer && (
        <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, display: "flex", alignItems: "stretch", zIndex: 2 }}>
          {canEdit && entry.status === STATUSES.DRAFT && (
            <button
              aria-label="Delete draft"
              style={{ background: "#7f1d1d", color: "#fff", border: "none", width: 64, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "transform 120ms ease" }}
              onTouchStart={e => e.currentTarget.style.transform = "scale(0.88)"}
              onTouchEnd={e => { e.currentTarget.style.transform = "scale(1)"; e.stopPropagation(); reset(); onDelete(entry); }}
              onClick={(e) => { e.stopPropagation(); reset(); onDelete(entry); }}
            >
              <Icon name="trash" size={20} />
            </button>
          )}
          <button
            aria-label={canEdit ? "Edit entry" : "View entry"}
            style={{ background: canEdit ? BRAND.navy : "#4B5563", color: "#fff", border: "none", width: 80, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            onClick={(e) => { e.stopPropagation(); reset(); canEdit ? onEdit(entry) : onClick(); }}
          >
            <Icon name={canEdit ? "edit" : "inbox"} size={22} />
          </button>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// REPORTS PAGE
// ═══════════════════════════════════════════════════════════════════════════
const ReportsPage = ({ entries, purchaseEntries, users, settings, currentUser, mob, onToast }) => {
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

  const filteredPurchases = useMemo(() => (purchaseEntries || []).filter(e => {
    if (e.date < dateFrom || e.date > dateTo) return false;
    if (filterStatus !== "all" && e.status !== filterStatus) return false;
    if (!isTreasurer && e.userId !== currentUser.id) return false;
    if (isTreasurer && filterUser !== "all" && e.userId !== filterUser) return false;
    return true;
  }).sort((a, b) => a.date.localeCompare(b.date)), [purchaseEntries, dateFrom, dateTo, filterUser, filterStatus, isTreasurer, currentUser.id]);

  const purchaseTotals = useMemo(() => {
    let total = 0;
    filteredPurchases.forEach(e => { total += e.total || 0; });
    return total;
  }, [filteredPurchases]);

  const totals = useMemo(() => {
    let totalHours = 0, totalLabor = 0, totalMat = 0;
    filtered.forEach(e => { const h = calcHours(e.startTime, e.endTime); const r = getUserRate(users, settings, e.userId); totalHours += h; totalLabor += calcLabor(h, r); totalMat += calcMaterialsTotal(e.materials); });
    return { totalHours, totalLabor, totalMat, grand: totalLabor + totalMat };
  }, [filtered, settings]);

  const exportCSV = () => {
    const header = "Type,Date,Member,Category,Description,Hours,Rate,Labor,Materials,Total";
    const workRows = filtered.map(e => { const u = users.find(u => u.id === e.userId); const h = calcHours(e.startTime, e.endTime); const r = getUserRate(users, settings, e.userId); const l = calcLabor(h, r); const m = calcMaterialsTotal(e.materials); return 'Work,' + e.date + ',"' + (u?.name || "") + '","' + e.category + '","' + e.description.replace(/"/g, '""') + '",' + h.toFixed(2) + ',' + r.toFixed(2) + ',' + l.toFixed(2) + ',' + m.toFixed(2) + ',' + (l + m).toFixed(2); });
    const purchRows = filteredPurchases.map(e => { const u = users.find(u => u.id === e.userId); return 'Purchase,' + e.date + ',"' + (u?.name || "") + '","' + e.category + '","' + (e.storeName || "").replace(/"/g, '""') + " — " + (e.description || "").replace(/"/g, '""') + '",,,,' + (e.total || 0).toFixed(2) + ',' + (e.total || 0).toFixed(2); });
    const csv = [header, ...workRows, ...purchRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = settings.hoaName.replace(/\s+/g, "_") + "_Report.csv"; a.click();
    if (onToast) onToast("Report CSV downloaded (" + filtered.length + " entries)", "success");
  };

  // ── PDF Export ──────────────────────────────────────────────────────────
  const exportPDF = () => {
    const periodLabel = formatDate(dateFrom) + " – " + formatDate(dateTo);
    const generatedOn = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const statusLabel = filterStatus === "all" ? "All Statuses" : filterStatus;
    const memberLabel = filterUser === "all" ? "All Members" : (users.find(u => u.id === filterUser)?.name || "");

    // Group by member for individual sections
    const byMember = {};
    filtered.forEach(e => {
      const uid = e.userId;
      if (!byMember[uid]) byMember[uid] = [];
      byMember[uid].push(e);
    });

    const fmtC = (n) => "$" + n.toFixed(2);
    const fmtH = (n) => n.toFixed(2) + "h";

    const entryRows = filtered.map(e => {
      const u = users.find(u => u.id === e.userId);
      const h = calcHours(e.startTime, e.endTime);
      const r = getUserRate(users, settings, e.userId);
      const labor = calcLabor(h, r);
      const mat = calcMaterialsTotal(e.materials);
      return `<tr>
        <td>${formatDate(e.date)}</td>
        <td>${u?.name || "—"}</td>
        <td>${e.category}</td>
        <td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${e.description}</td>
        <td style="text-align:right">${fmtH(h)}</td>
        <td style="text-align:right">${fmtC(r)}/hr</td>
        <td style="text-align:right">${fmtC(labor)}</td>
        <td style="text-align:right">${fmtC(mat)}</td>
        <td style="text-align:right;font-weight:700">${fmtC(labor + mat)}</td>
      </tr>`;
    }).join("");

    // Per-member summary rows
    const memberSummaryRows = Object.entries(byMember).map(([uid, ents]) => {
      const u = users.find(u => u.id === uid);
      let hrs = 0, labor = 0, mat = 0;
      ents.forEach(e => {
        const h = calcHours(e.startTime, e.endTime);
        const r = getUserRate(users, settings, e.userId);
        hrs += h; labor += calcLabor(h, r); mat += calcMaterialsTotal(e.materials);
      });
      return `<tr>
        <td style="font-weight:600">${u?.name || "Unknown"}</td>
        <td style="text-align:right">${ents.length}</td>
        <td style="text-align:right">${fmtH(hrs)}</td>
        <td style="text-align:right">${fmtC(labor)}</td>
        <td style="text-align:right">${fmtC(mat)}</td>
        <td style="text-align:right;font-weight:700">${fmtC(labor + mat)}</td>
      </tr>`;
    }).join("");

    const purchaseRows = filteredPurchases.map(e => {
      const u = users.find(u => u.id === e.userId);
      return `<tr>
        <td>${formatDate(e.date)}</td>
        <td>${u?.name || "—"}</td>
        <td>${e.category}</td>
        <td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${(e.storeName || "") + " — " + (e.description || "")}</td>
        <td style="text-align:right;font-weight:700">${fmtC(e.total || 0)}</td>
      </tr>`;
    }).join("");

    const combinedGrand = totals.grand + purchaseTotals;

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>${settings.hoaName} — Reimbursement Report</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Georgia, serif; font-size: 12px; color: #1a1a1a; padding: 32px 40px; }
  .header { border-bottom: 3px solid #2C3E50; padding-bottom: 16px; margin-bottom: 24px; }
  .header h1 { font-size: 22px; color: #2C3E50; margin-bottom: 4px; }
  .header .meta { font-size: 11px; color: #666; display: flex; gap: 24px; flex-wrap: wrap; margin-top: 8px; }
  .header .meta span { font-family: Arial, sans-serif; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.08em; color: #2C3E50; 
       border-bottom: 1px solid #ddd; padding-bottom: 6px; margin: 20px 0 12px; }
  table { width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 11px; }
  th { background: #2C3E50; color: #fff; padding: 6px 8px; text-align: left; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; }
  td { padding: 5px 8px; border-bottom: 1px solid #eee; vertical-align: top; }
  tr:nth-child(even) td { background: #F8F9FA; }
  .totals-row td { background: #EEF2F7 !important; font-weight: 700; border-top: 2px solid #2C3E50; font-size: 12px; }
  .grand-total { background: #2C3E50; color: #fff; padding: 10px 16px; margin-top: 16px; 
                 display: flex; justify-content: space-between; border-radius: 4px; font-family: Arial, sans-serif; }
  .grand-total .label { font-size: 12px; font-weight: 600; }
  .grand-total .value { font-size: 16px; font-weight: 700; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #ddd; 
            font-size: 10px; color: #999; font-family: Arial, sans-serif; display: flex; justify-content: space-between; }
  @media print {
    body { padding: 16px 20px; }
    @page { margin: 16mm 12mm; size: landscape; }
  }
</style>
</head><body>
  <div class="header">
    <h1>${settings.hoaName}</h1>
    <div style="font-size:15px;color:#555;margin-top:2px;font-family:Arial,sans-serif">Reimbursement Report</div>
    <div class="meta">
      <span><strong>Period:</strong> ${periodLabel}</span>
      <span><strong>Status filter:</strong> ${statusLabel}</span>
      ${memberLabel ? `<span><strong>Member:</strong> ${memberLabel}</span>` : ""}
      <span><strong>Rate:</strong> $${settings.defaultHourlyRate}/hr (default)</span>
      <span><strong>Generated:</strong> ${generatedOn}</span>
      <span><strong>Entries:</strong> ${filtered.length} work + ${filteredPurchases.length} purchase</span>
    </div>
  </div>

  <h2>Summary by Member</h2>
  <table>
    <thead><tr><th>Member</th><th style="text-align:right">Entries</th><th style="text-align:right">Hours</th><th style="text-align:right">Labor</th><th style="text-align:right">Materials</th><th style="text-align:right">Total</th></tr></thead>
    <tbody>
      ${memberSummaryRows}
      <tr class="totals-row">
        <td>TOTAL</td>
        <td style="text-align:right">${filtered.length}</td>
        <td style="text-align:right">${fmtH(totals.totalHours)}</td>
        <td style="text-align:right">${fmtC(totals.totalLabor)}</td>
        <td style="text-align:right">${fmtC(totals.totalMat)}</td>
        <td style="text-align:right">${fmtC(totals.grand)}</td>
      </tr>
    </tbody>
  </table>

  <h2>Itemized Work Entries</h2>
  <table>
    <thead><tr><th>Date</th><th>Member</th><th>Category</th><th>Description</th><th style="text-align:right">Hours</th><th style="text-align:right">Rate</th><th style="text-align:right">Labor</th><th style="text-align:right">Materials</th><th style="text-align:right">Total</th></tr></thead>
    <tbody>
      ${entryRows}
      <tr class="totals-row">
        <td colspan="4">TOTALS</td>
        <td style="text-align:right">${fmtH(totals.totalHours)}</td>
        <td></td>
        <td style="text-align:right">${fmtC(totals.totalLabor)}</td>
        <td style="text-align:right">${fmtC(totals.totalMat)}</td>
        <td style="text-align:right">${fmtC(totals.grand)}</td>
      </tr>
    </tbody>
  </table>

  ${filteredPurchases.length > 0 ? `
  <h2>Purchase Entries</h2>
  <table>
    <thead><tr><th>Date</th><th>Member</th><th>Category</th><th>Store / Description</th><th style="text-align:right">Total</th></tr></thead>
    <tbody>
      ${purchaseRows}
      <tr class="totals-row">
        <td colspan="4">PURCHASE TOTAL</td>
        <td style="text-align:right">${fmtC(purchaseTotals)}</td>
      </tr>
    </tbody>
  </table>` : ""}

  <div class="grand-total">
    <span class="label">Grand Total Reimbursement${filteredPurchases.length > 0 ? " (Work + Purchases)" : ""}</span>
    <span class="value">${fmtC(combinedGrand)}</span>
  </div>

  <div class="footer">
    <span>${settings.hoaName} — Confidential</span>
    <span>Generated ${generatedOn} · ${periodLabel}</span>
  </div>
</body></html>`;

    const win = window.open("", "_blank", "width=1100,height=800");
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
    if (onToast) onToast("PDF report opened — use Print to save", "success");
  };

  // ── Fiscal Year Report (CPA-ready) ──────────────────────────────────────
  const exportFiscalYear = (year) => {
    const yrEntries = entries.filter(e => e.date.startsWith(String(year)) && (e.status === "Approved" || e.status === "Paid"));
    const yrPurchases = (purchaseEntries || []).filter(e => e.date.startsWith(String(year)) && (e.status === "Approved" || e.status === "Paid"));

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

    // By Member (work)
    const byMember = {};
    yrEntries.forEach(e => {
      const u = users.find(u => u.id === e.userId);
      const name = u?.name || "Unknown";
      if (!byMember[name]) byMember[name] = { labor: 0, materials: 0, hours: 0, count: 0, purchases: 0 };
      const h = calcHours(e.startTime, e.endTime);
      const r = getUserRate(users, settings, e.userId);
      byMember[name].labor += calcLabor(h, r);
      byMember[name].materials += calcMaterialsTotal(e.materials);
      byMember[name].hours += h;
      byMember[name].count += 1;
    });
    // Add purchase totals to member
    yrPurchases.forEach(e => {
      const u = users.find(u => u.id === e.userId);
      const name = u?.name || "Unknown";
      if (!byMember[name]) byMember[name] = { labor: 0, materials: 0, hours: 0, count: 0, purchases: 0 };
      byMember[name].purchases += e.total || 0;
      byMember[name].count += 1;
    });

    // By Month
    const byMonth = {};
    yrEntries.forEach(e => {
      const mo = e.date.slice(0, 7);
      if (!byMonth[mo]) byMonth[mo] = { labor: 0, materials: 0, hours: 0, count: 0, purchases: 0 };
      const h = calcHours(e.startTime, e.endTime);
      const r = getUserRate(users, settings, e.userId);
      byMonth[mo].labor += calcLabor(h, r);
      byMonth[mo].materials += calcMaterialsTotal(e.materials);
      byMonth[mo].hours += h;
      byMonth[mo].count += 1;
    });
    yrPurchases.forEach(e => {
      const mo = e.date.slice(0, 7);
      if (!byMonth[mo]) byMonth[mo] = { labor: 0, materials: 0, hours: 0, count: 0, purchases: 0 };
      byMonth[mo].purchases += e.total || 0;
      byMonth[mo].count += 1;
    });

    let totalLabor = 0, totalMat = 0, totalHrs = 0, totalPurchases = 0;
    yrEntries.forEach(e => { const h = calcHours(e.startTime, e.endTime); const r = getUserRate(users, settings, e.userId); totalLabor += calcLabor(h, r); totalMat += calcMaterialsTotal(e.materials); totalHrs += h; });
    yrPurchases.forEach(e => { totalPurchases += e.total || 0; });

    // Build CSV with multiple sections
    const lines = [];
    lines.push(settings.hoaName + " — Fiscal Year Report " + year);
    lines.push("Generated: " + new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }));
    lines.push("Default Hourly Rate: $" + settings.defaultHourlyRate);
    lines.push("Work Entries: " + yrEntries.length + " | Purchase Entries: " + yrPurchases.length + " (Approved + Paid)");
    lines.push("");
    lines.push("═══ SUMMARY ═══");
    lines.push("Total Labor,$" + totalLabor.toFixed(2));
    lines.push("Total Materials,$" + totalMat.toFixed(2));
    lines.push("Total Purchases,$" + totalPurchases.toFixed(2));
    lines.push("Grand Total,$" + (totalLabor + totalMat + totalPurchases).toFixed(2));
    lines.push("Total Hours," + totalHrs.toFixed(2));
    lines.push("");
    lines.push("═══ BY CATEGORY (Chart of Accounts — Work Entries) ═══");
    lines.push("Category,Entries,Hours,Labor,Materials,Total");
    Object.entries(byCat).filter(([_, d]) => d.count > 0).sort((a, b) => (b[1].labor + b[1].materials) - (a[1].labor + a[1].materials)).forEach(([cat, d]) => {
      lines.push('"' + cat + '",' + d.count + "," + d.hours.toFixed(2) + "," + d.labor.toFixed(2) + "," + d.materials.toFixed(2) + "," + (d.labor + d.materials).toFixed(2));
    });
    lines.push("");
    lines.push("═══ BY MEMBER ═══");
    lines.push("Member,Entries,Hours,Labor,Materials,Purchases,Total");
    Object.entries(byMember).sort((a, b) => (b[1].labor + b[1].materials + (b[1].purchases || 0)) - (a[1].labor + a[1].materials + (a[1].purchases || 0))).forEach(([name, d]) => {
      lines.push('"' + name + '",' + d.count + "," + d.hours.toFixed(2) + "," + d.labor.toFixed(2) + "," + d.materials.toFixed(2) + "," + (d.purchases || 0).toFixed(2) + "," + (d.labor + d.materials + (d.purchases || 0)).toFixed(2));
    });
    lines.push("");
    lines.push("═══ BY MONTH ═══");
    lines.push("Month,Entries,Hours,Labor,Materials,Purchases,Total");
    Object.keys(byMonth).sort().forEach(mo => {
      const d = byMonth[mo];
      const monthLabel = new Date(mo + "-01").toLocaleDateString("en-US", { year: "numeric", month: "long" });
      lines.push(monthLabel + "," + d.count + "," + d.hours.toFixed(2) + "," + d.labor.toFixed(2) + "," + d.materials.toFixed(2) + "," + (d.purchases || 0).toFixed(2) + "," + (d.labor + d.materials + (d.purchases || 0)).toFixed(2));
    });
    lines.push("");
    lines.push("═══ ITEMIZED WORK ENTRIES ═══");
    lines.push("Date,Member,Category,Description,Hours,Rate,Labor,Materials,Total,Status");
    yrEntries.sort((a, b) => a.date.localeCompare(b.date)).forEach(e => {
      const u = users.find(u => u.id === e.userId);
      const h = calcHours(e.startTime, e.endTime);
      const r = getUserRate(users, settings, e.userId);
      const l = calcLabor(h, r);
      const m = calcMaterialsTotal(e.materials);
      lines.push(e.date + ',"' + (u?.name || "") + '","' + e.category + '","' + e.description.replace(/"/g, '""') + '",' + h.toFixed(2) + "," + r.toFixed(2) + "," + l.toFixed(2) + "," + m.toFixed(2) + "," + (l + m).toFixed(2) + "," + e.status);
    });
    if (yrPurchases.length > 0) {
      lines.push("");
      lines.push("═══ ITEMIZED PURCHASE ENTRIES ═══");
      lines.push("Date,Member,Category,Store,Description,Total,Status");
      yrPurchases.sort((a, b) => a.date.localeCompare(b.date)).forEach(e => {
        const u = users.find(u => u.id === e.userId);
        lines.push(e.date + ',"' + (u?.name || "") + '","' + e.category + '","' + (e.storeName || "").replace(/"/g, '""') + '","' + (e.description || "").replace(/"/g, '""') + '",' + (e.total || 0).toFixed(2) + "," + e.status);
      });
    }

    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = settings.hoaName.replace(/\s+/g, "_") + "_FiscalYear_" + year + ".csv"; a.click();
    if (onToast) onToast(year + " fiscal year CSV downloaded", "success");
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
              <div style={{ fontSize: 13, color: BRAND.textMuted }}>CPA-ready multi-section export: totals by category, member &amp; month. Includes all approved + paid entries. <strong>Tip:</strong> Share this with your accountant at year-end.</div>
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
              <div style={{ display: "flex", gap: 8 }}>
                <button style={{ ...S.btnPrimary, fontSize: 13 }} onClick={exportPDF}><Icon name="file" size={15} /> Export PDF</button>
                <button style={{ ...S.btnGhost, fontSize: 13 }} onClick={exportCSV}><Icon name="download" size={15} /> CSV</button>
              </div>
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
  return <input aria-label="Hourly rate" type="number" min="0" step="0.50" inputMode="decimal" style={{ ...S.input, padding: "6px 10px" }} value={val} onChange={e => setVal(e.target.value)} onBlur={() => onSave(Number(val) || null)} placeholder={placeholder} />;
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

// ═══════════════════════════════════════════════════════════════════════════
// HELP PAGE
// ═══════════════════════════════════════════════════════════════════════════
const HelpPage = ({ currentUser, settings, mob, onNav }) => {
  const isTreasurer = currentUser?.role === ROLES.TREASURER;
  const [openSection, setOpenSection] = useState(null);
  const toggle = (id) => setOpenSection(s => s === id ? null : id);

  const hoaName = settings?.hoaName || "24 Mill Street";

  const WORKFLOW = [
    { emoji: "✏️", label: "Log Work", sub: "Create a draft", bg: "#EFF6FF", color: "#1565C0" },
    { emoji: "📤", label: "Submit", sub: "Send for review", bg: "#FFF0E0", color: "#8E3B2E" },
    { emoji: "✓",  label: "Approved", sub: "Treasurer signs off", bg: "#E8F0E6", color: "#2E7D32" },
    { emoji: "💳", label: "Paid", sub: "Money sent to you", bg: "#E8EDF5", color: "#3B5998" },
  ];

  const MEMBER_SECTIONS = [
    {
      id: "log",
      emoji: "📋",
      title: "Logging Work",
      items: [
        { q: "How do I create a new entry?", a: "Tap the + button (bottom-right on mobile, top-right on desktop) to open a new entry form. Fill in the date, start and end times, category, and a description of what you did." },
        { q: "Can I log work from a past date?", a: "Yes — the date field defaults to today but you can change it to any past date for retroactive logging." },
        { q: "What categories can I use?", a: "Landscaping, Plumbing, Electrical, General Maintenance, Snow Removal, Cleaning, Vendor Coordination, Administrative Work, and Emergency Repairs." },
        { q: "Do I need to fill in the end time?", a: "Yes — start and end time are required. They're used to calculate your total hours and labor amount automatically." },
      ],
    },
    {
      id: "materials",
      emoji: "🧾",
      title: "Materials & Receipts",
      items: [
        { q: "How do I add materials I purchased?", a: "In the entry form, scroll to the Materials section and tap \"Add Material\". Enter the item name, quantity, and unit cost. The total calculates automatically." },
        { q: "Should I attach receipts?", a: "Yes — always attach receipts for material purchases. Entries with receipts are approved faster and reduce back-and-forth with the Treasurer." },
        { q: "Where do I upload photos?", a: "In the entry form, scroll to the Photos section. You can upload before and after photos separately. Photos make it much easier for the Treasurer to approve your work." },
      ],
    },
    {
      id: "templates",
      emoji: "⚡",
      title: "Templates",
      items: [
        { q: "What is a template?", a: "A template saves a complete entry (category, description, times, location, materials) so you can reuse it with one tap. Great for recurring tasks like weekly lawn mowing or monthly inspections." },
        { q: "How do I save a template?", a: "Fill out an entry form and tap \"Save as Template\" at the bottom. Give it a name. It'll appear in your Templates list next time you create an entry." },
        { q: "How do I use a saved template?", a: "When creating a new entry, a blue banner at the top shows your templates. Tap \"Use a Template\", select one, and the form pre-fills. The date always resets to today." },
        { q: "How many templates can I have?", a: "Up to 10. Templates are stored on your device — they won't carry over if you switch browsers or devices." },
      ],
    },
    {
      id: "status",
      emoji: "🔄",
      title: "Entry Status",
      items: [
        { q: "What does Draft mean?", a: "You've saved the entry but haven't submitted it yet. Only you can see drafts. You can edit or delete a draft at any time." },
        { q: "What happens after I submit?", a: "The entry moves to Submitted (Pending Review). The Treasurer will review it and either approve it or send it back with notes." },
        { q: "My entry was Rejected — what now?", a: "Read the Treasurer's note (shown on the entry), make the requested changes, and resubmit. The entry goes back into the review queue." },
        { q: "What is Needs Info?", a: "The Treasurer has a question but hasn't declined the entry. Check the Discussion thread inside the entry for their message and reply there." },
        { q: "What's the difference between Approved and Paid?", a: "Approved means the Treasurer has signed off. Paid means the money has actually been sent to you via the payment method on record." },
      ],
    },
    {
      id: "comments",
      emoji: "💬",
      title: "Discussion & Messages",
      items: [
        { q: "How do I message the Treasurer about an entry?", a: "Open the entry and scroll to the Discussion section. Type your message and press Send (or Enter). The Treasurer will see it and can reply in the same thread." },
        { q: "How do I know if the Treasurer replied?", a: "A 💬 badge appears on the entry card showing the number of messages. Check entries with that badge for new replies." },
        { q: "Can I message before submitting?", a: "No — the Discussion thread is only available on submitted entries (not drafts). Submit your entry first, then use Discussion for any follow-up." },
      ],
    },
    {
      id: "dashboard",
      emoji: "📊",
      title: "Your Dashboard",
      items: [
        { q: "What does my Dashboard show?", a: "Your year-to-date approved and paid totals, pending entries with how long they've been waiting (color-coded by age), and any rejected or Needs Info entries requiring your action." },
        { q: "What does \"Owed to You\" mean?", a: "The total amount across all your Approved entries — work that's been signed off but not yet paid out." },
        { q: "How is my hourly rate set?", a: "The Treasurer sets a default rate for all members. You may have a custom rate set for you individually — the rate is shown on your entry summary when you create one." },
      ],
    },
  ];

  const TREASURER_SECTIONS = [
    {
      id: "review",
      emoji: "🔍",
      title: "Reviewing Entries",
      items: [
        { q: "Where do I review entries?", a: "Go to Review Queue in the sidebar. All Submitted entries appear here, oldest first. You can also bulk-approve multiple entries at once." },
        { q: "How do I approve an entry?", a: "Open the entry and click Approve (or use the quick-approve button in the Review Queue). You can add an optional note before approving." },
        { q: "How do I decline an entry?", a: "Click Decline, enter a reason (required), and confirm. The entry returns to the member as Rejected and they'll see your note." },
        { q: "What is Needs Info?", a: "Use this when you have a question but don't want to fully decline. The entry is flagged and the member is expected to respond via the Discussion thread." },
        { q: "What is dual approval?", a: "Entries above the dual approval threshold (set in Settings) require a second board member to approve. The first approval marks it Awaiting Second; a second treasurer-role user must then approve." },
      ],
    },
    {
      id: "payment",
      emoji: "💳",
      title: "Payment Run",
      items: [
        { q: "What is a Payment Run?", a: "A dedicated page (sidebar: Payment Run) that groups all Approved-but-unpaid entries by member. You set the payment method and reference number once per member and mark all their entries paid simultaneously." },
        { q: "Can I pay individual entries instead of a full batch?", a: "Yes — open any individual Approved entry and use the Payment Details section at the bottom to mark it paid with a custom method and reference." },
        { q: "Is marking as Paid reversible?", a: "No — Paid is a terminal status. If you mark something paid in error, contact your administrator. All payment details are recorded in the audit log." },
      ],
    },
    {
      id: "reports",
      emoji: "📄",
      title: "Reports & Export",
      items: [
        { q: "How do I generate a report?", a: "Go to Reports in the sidebar. Choose a date range and member filter, then export as PDF or CSV. Reports only include Approved entries by default." },
        { q: "What's included in a report?", a: "HOA name, date range, hourly rate, and an itemized table of entries with hours, labor, materials, and totals. Summarized totals at the bottom." },
        { q: "Can I include all statuses in a report?", a: "Yes — the Reports page has a status filter so you can include Submitted or other statuses if needed." },
      ],
    },
    {
      id: "settings",
      emoji: "⚙️",
      title: "Settings",
      items: [
        { q: "How do I change the HOA name?", a: "Go to Settings → HOA Name. Changes apply immediately across the app and on all future reports." },
        { q: "How do I change the hourly rate?", a: "Go to Settings → Default Hourly Rate. You can also set a per-member custom rate in the Members section of Settings." },
        { q: "How do I add a new member?", a: "Go to Settings → Members → Add Member. Enter their name, email, and a temporary password. They'll sign in and can change their password after first login." },
        { q: "What is the dual approval threshold?", a: "Set a dollar amount in Settings. Any entry above that amount requires two treasurer-role users to approve before it moves to Approved status." },
      ],
    },
  ];

  const sections = isTreasurer ? TREASURER_SECTIONS : MEMBER_SECTIONS;

  const statusRef = [
    { name: "Draft",     desc: "Saved, not submitted yet", bg: "#EDEBE8", border: "#D5D0C9", dot: "#9E9E9E", text: "#222" },
    { name: "Submitted", desc: "Awaiting Treasurer review", bg: "#FFF0E0", border: "#E8C4A8", dot: "#8E3B2E", text: "#6D3620" },
    { name: "Approved",  desc: "Signed off, payment pending", bg: "#E8F0E6", border: "#B5CCAE", dot: "#2E7D32", text: "#2F4F3E" },
    { name: "Paid",      desc: "Payment sent", bg: "#E8EDF5", border: "#B8C8E0", dot: "#3B5998", text: "#2C4478" },
    { name: "Rejected",  desc: "Edit and resubmit", bg: "#FDEAEA", border: "#F0BABA", dot: "#C62828", text: "#7f1d1d" },
    { name: "Needs Info", desc: "Treasurer has a question", bg: "#FFF7ED", border: "#FED7AA", dot: "#C2410C", text: "#7C3910" },
  ];

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ ...S.h2, marginBottom: 6 }}>Help</h2>
        <p style={{ fontSize: 14, color: BRAND.textMuted, margin: 0 }}>
          {isTreasurer ? "Treasurer guide for " : "Member guide for "}<strong style={{ color: BRAND.navy }}>{hoaName}</strong>
        </p>
      </div>

      {/* Workflow strip — member only */}
      {!isTreasurer && (
        <div style={{ ...S.card, padding: mob ? "20px 16px" : "24px 28px", marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: BRAND.textLight, marginBottom: 18 }}>How reimbursement works</div>
          <div style={{ display: "flex", alignItems: "center", flexWrap: mob ? "wrap" : "nowrap", gap: mob ? 12 : 0 }}>
            {WORKFLOW.map((step, i) => (
              <React.Fragment key={step.label}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: mob ? "0 0 calc(50% - 6px)" : 1, textAlign: "center" }}>
                  <div style={{ width: 48, height: 48, borderRadius: 24, background: step.bg, color: step.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, marginBottom: 8, fontWeight: 700 }}>{step.emoji}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: BRAND.navy }}>{step.label}</div>
                  <div style={{ fontSize: 11, color: BRAND.textMuted, marginTop: 2 }}>{step.sub}</div>
                </div>
                {!mob && i < WORKFLOW.length - 1 && (
                  <div style={{ flex: 1, height: 2, background: BRAND.borderLight, margin: "0 8px", marginBottom: 24 }} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Quick actions */}
      {!isTreasurer && (
        <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr 1fr" : "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
          {[
            { emoji: "✏️", label: "Log new work", action: () => onNav("entries") },
            { emoji: "📋", label: "View my entries", action: () => onNav("entries") },
            { emoji: "📊", label: "See my dashboard", action: () => onNav("dashboard") },
          ].map(item => (
            <button key={item.label} onClick={item.action} style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", background: BRAND.white, border: "1px solid " + BRAND.borderLight, borderRadius: 10, cursor: "pointer", fontFamily: BRAND.sans, textAlign: "left", transition: "all 200ms" }}
              onMouseEnter={e => { e.currentTarget.style.background = BRAND.bgSoft; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = BRAND.white; e.currentTarget.style.transform = "translateY(0)"; }}>
              <span style={{ fontSize: 22 }}>{item.emoji}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: BRAND.navy }}>{item.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* FAQ accordion */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: BRAND.textLight, marginBottom: 14, paddingBottom: 10, borderBottom: "1px solid " + BRAND.borderLight }}>
          Frequently asked questions
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {sections.map(section => (
            <div key={section.id} style={{ background: BRAND.white, border: "1px solid " + BRAND.borderLight, borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 6px rgba(0,0,0,0.03)" }}>
              {/* Section header */}
              <button
                onClick={() => toggle(section.id)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", background: "none", border: "none", cursor: "pointer", fontFamily: BRAND.sans, textAlign: "left", borderBottom: openSection === section.id ? "1px solid " + BRAND.borderLight : "none", transition: "background 150ms" }}
                onMouseEnter={e => e.currentTarget.style.background = BRAND.bgSoft}
                onMouseLeave={e => e.currentTarget.style.background = "none"}
              >
                <span style={{ fontSize: 22, flexShrink: 0 }}>{section.emoji}</span>
                <span style={{ flex: 1, fontWeight: 700, fontSize: 15, color: BRAND.navy }}>{section.title}</span>
                <span style={{ fontSize: 18, color: BRAND.textLight, transform: openSection === section.id ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 250ms" }}>⌄</span>
              </button>
              {/* Q&A items */}
              {openSection === section.id && (
                <div className="fade-in">
                  {section.items.map((item, i) => (
                    <div key={i} style={{ padding: "16px 20px", borderBottom: i < section.items.length - 1 ? "1px solid " + BRAND.borderLight + "80" : "none" }}>
                      <div style={{ fontWeight: 600, fontSize: 13.5, color: BRAND.charcoal, marginBottom: 6, display: "flex", gap: 8 }}>
                        <span style={{ color: BRAND.brick, flexShrink: 0, marginTop: 1 }}>Q</span>
                        <span>{item.q}</span>
                      </div>
                      <div style={{ fontSize: 13.5, color: BRAND.textMuted, lineHeight: 1.65, paddingLeft: 20 }}>{item.a}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Status reference */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: BRAND.textLight, marginBottom: 14, paddingBottom: 10, borderBottom: "1px solid " + BRAND.borderLight }}>
          Entry status reference
        </div>
        <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "repeat(2, 1fr)", gap: 10 }}>
          {statusRef.map(s => (
            <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 10, background: s.bg, border: "1px solid " + s.border }}>
              <div style={{ width: 10, height: 10, borderRadius: 5, background: s.dot, flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: s.text }}>{s.name}</div>
                <div style={{ fontSize: 12, color: s.text, opacity: 0.75, marginTop: 1 }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tips — member only */}
      {!isTreasurer && (
        <div style={{ ...S.card, background: BRAND.navy, border: "none", padding: mob ? 20 : 28, marginBottom: 16 }}>
          <div style={{ fontFamily: BRAND.serif, fontSize: 20, fontStyle: "italic", fontWeight: 600, color: "#D4B97A", marginBottom: 18 }}>Tips for faster approvals</div>
          {[
            { icon: "📸", tip: <><strong style={{ color: "#fff" }}>Always attach a photo.</strong> Entries with before/after photos are approved much faster — the Treasurer sees the work without needing to ask.</> },
            { icon: "🧾", tip: <><strong style={{ color: "#fff" }}>Add receipts for materials.</strong> Itemize each purchase individually. Lumping everything into one line will slow down review.</> },
            { icon: "📝", tip: <><strong style={{ color: "#fff" }}>Write a clear description.</strong> "Mowed front lawn, edged walkway, cleared clippings" beats "lawn work" every time.</> },
            { icon: "💬", tip: <><strong style={{ color: "#fff" }}>Use Discussion, not email.</strong> All questions from the Treasurer will come through the entry's Discussion thread — check the 💬 badge on your cards.</> },
          ].map((t, i) => (
            <div key={i} style={{ display: "flex", gap: 14, marginBottom: i < 3 ? 14 : 0 }}>
              <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{t.icon}</span>
              <div style={{ fontSize: 13.5, color: "rgba(255,255,255,0.8)", lineHeight: 1.65 }}>{t.tip}</div>
            </div>
          ))}
        </div>
      )}

      {/* Contact footer */}
      <div style={{ textAlign: "center", padding: "20px 16px", color: BRAND.textMuted, fontSize: 13 }}>
        Have a question not answered here? Use the 💬 Discussion thread on any entry to message your Treasurer directly.
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// PAYMENT RUN PAGE
// ═══════════════════════════════════════════════════════════════════════════
const PaymentRunPage = ({ entries, purchaseEntries, users, settings, onMarkPaid, onMarkPurchasePaid, mob }) => {
  const approvedWork = entries.filter(e => e.status === STATUSES.APPROVED).map(e => ({ ...e, _type: "work" }));
  const approvedPurch = (purchaseEntries || []).filter(e => e.status === "Approved").map(e => ({ ...e, _type: "purchase" }));
  const approvedUnpaid = [...approvedWork, ...approvedPurch];
  const fmt = (n) => "$" + (Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const getItemTotal = (e) => e._type === "purchase" ? (e.total || 0) : (calcLabor(calcHours(e.startTime, e.endTime), getUserRate(users, settings, e.userId)) + calcMaterialsTotal(e.materials));

  // Group by user
  const byUser = {};
  approvedUnpaid.forEach(e => {
    if (!byUser[e.userId]) byUser[e.userId] = [];
    byUser[e.userId].push(e);
  });
  const userGroups = Object.entries(byUser).map(([uid, ents]) => {
    const u = users.find(u => u.id === uid);
    const total = ents.reduce((s, e) => s + getItemTotal(e), 0);
    return { uid, user: u, entries: ents.sort((a, b) => b.date.localeCompare(a.date)), total };
  }).sort((a, b) => b.total - a.total);

  const [expanded, setExpanded] = useState({});
  const [payMethods, setPayMethods] = useState({});
  const [payRefs, setPayRefs] = useState({});
  const [paying, setPaying] = useState({});
  const [paid, setPaid] = useState({});

  const getMethod = (uid) => payMethods[uid] || "Zelle";
  const getRef = (uid) => payRefs[uid] || "";

  const handlePay = async (uid, ents, total) => {
    setPaying(p => ({ ...p, [uid]: true }));
    const workIds = ents.filter(e => e._type === "work").map(e => e.id);
    const purchIds = ents.filter(e => e._type === "purchase").map(e => e.id);
    const payDetails = { method: getMethod(uid), reference: getRef(uid) };
    if (workIds.length > 0) await onMarkPaid(workIds, payDetails);
    if (purchIds.length > 0) {
      for (const id of purchIds) await onMarkPurchasePaid(id);
    }
    setPaid(p => ({ ...p, [uid]: total }));
    setPaying(p => ({ ...p, [uid]: false }));
  };

  if (userGroups.length === 0) return (
    <div className="fade-in">
      <h2 style={{ ...{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 26, fontWeight: 700, color: "#1F2A38", margin: "0 0 8px" }, marginBottom: 8 }}>Payment Run</h2>
      <p style={{ margin: "0 0 32px", fontSize: 14, color: "#6B6560" }}>Review and batch-pay approved entries.</p>
      <div style={{ textAlign: "center", padding: "60px 20px", background: "#fff", borderRadius: 12, border: "1px solid #EDE9E3" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#1F2A38", marginBottom: 8 }}>All caught up!</div>
        <div style={{ fontSize: 14, color: "#6B6560" }}>No approved entries are waiting for payment.</div>
      </div>
    </div>
  );

  const grandTotal = userGroups.reduce((s, g) => s + (paid[g.uid] !== undefined ? 0 : g.total), 0);
  const unpaidGroups = userGroups.filter(g => paid[g.uid] === undefined);

  return (
    <div className="fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 26, fontWeight: 700, color: "#1F2A38", margin: "0 0 4px" }}>Payment Run</h2>
          <p style={{ margin: 0, fontSize: 14, color: "#6B6560" }}>
            {unpaidGroups.length} member{unpaidGroups.length !== 1 ? "s" : ""} · {unpaidGroups.reduce((s,g)=>s+g.entries.length,0)} entries · <strong style={{ color: "#1F2A38" }}>{fmt(grandTotal)} total owed</strong>
          </p>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {userGroups.map(({ uid, user, entries: ents, total }) => {
          const isPaid = paid[uid] !== undefined;
          const isExpanded = expanded[uid];
          const isPaying = paying[uid];

          if (isPaid) return (
            <div key={uid} className="fade-in" style={{ background: "#E8F5E9", border: "1px solid #A5D6A7", borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 18, background: "#2E7D32", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, flexShrink: 0 }}>✓</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: "#1B5E20" }}>{user?.name || "Unknown"}</div>
                <div style={{ fontSize: 13, color: "#2E7D32" }}>Paid {fmt(paid[uid])} via {getMethod(uid)}{getRef(uid) ? " · Ref: " + getRef(uid) : ""}</div>
              </div>
            </div>
          );

          return (
            <div key={uid} style={{ background: "#fff", border: "1px solid #EDE9E3", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
              {/* Member header */}
              <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "18px 20px", borderBottom: isExpanded ? "1px solid #EDE9E3" : "none", background: "#FAFAF8" }}>
                <div style={{ width: 40, height: 40, borderRadius: 20, background: "#1F2A38", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
                  {(user?.name || "?").charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#222" }}>{user?.name || "Unknown"}</div>
                  <div style={{ fontSize: 13, color: "#6B6560" }}>{ents.length} entr{ents.length === 1 ? "y" : "ies"}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#1F2A38" }}>{fmt(total)}</div>
                  <button style={{ fontSize: 12, color: "#6B6560", background: "none", border: "none", cursor: "pointer", padding: "2px 0" }} onClick={() => setExpanded(p => ({ ...p, [uid]: !p[uid] }))}>
                    {isExpanded ? "Hide entries ▲" : "View entries ▼"}
                  </button>
                </div>
              </div>

              {/* Entry breakdown */}
              {isExpanded && (
                <div className="fade-in" style={{ borderBottom: "1px solid #EDE9E3" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead><tr style={{ background: "#F5F2ED" }}>
                      <th style={{ padding: "8px 16px", textAlign: "left", fontWeight: 600, color: "#6B6560", fontSize: 11, textTransform: "uppercase" }}>Date</th>
                      <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#6B6560", fontSize: 11, textTransform: "uppercase" }}>Category</th>
                      <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#6B6560", fontSize: 11, textTransform: "uppercase", display: mob ? "none" : "table-cell" }}>Description</th>
                      <th style={{ padding: "8px 16px", textAlign: "right", fontWeight: 600, color: "#6B6560", fontSize: 11, textTransform: "uppercase" }}>Amount</th>
                    </tr></thead>
                    <tbody>{ents.map((e, i) => {
                      const t = getItemTotal(e);
                      const isPurch = e._type === "purchase";
                      return (
                        <tr key={e.id} style={{ background: i % 2 ? "#F5F2ED" : "#fff", borderBottom: "1px solid #EDE9E3" }}>
                          <td style={{ padding: "10px 16px", color: "#222" }}>{formatDate(e.date)}</td>
                          <td style={{ padding: "10px 12px" }}><CategoryBadge category={e.category} />{isPurch && <span style={{ fontSize: 9, fontWeight: 700, color: "#0E7490", background: "#ECFEFF", padding: "1px 5px", borderRadius: 6, marginLeft: 6 }}>P</span>}</td>
                          <td style={{ padding: "10px 12px", color: "#6B6560", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: mob ? "none" : "table-cell" }}>{isPurch ? (e.storeName || "") + " — " + (e.description || "") : e.description}</td>
                          <td style={{ padding: "10px 16px", textAlign: "right", fontWeight: 600, color: "#1F2A38" }}>{fmt(t)}</td>
                        </tr>
                      );
                    })}</tbody>
                    <tfoot><tr style={{ background: "#EDE9E3" }}>
                      <td colSpan={mob ? 2 : 3} style={{ padding: "10px 16px", fontWeight: 700, color: "#1F2A38" }}>Total</td>
                      <td style={{ padding: "10px 16px", textAlign: "right", fontWeight: 800, color: "#1F2A38", fontSize: 15 }}>{fmt(total)}</td>
                    </tr></tfoot>
                  </table>
                </div>
              )}

              {/* Payment controls */}
              <div style={{ padding: "16px 20px", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6B6560", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>Method</label>
                  <select style={{ padding: "8px 12px", border: "1px solid #E0E0E0", borderRadius: 6, fontSize: 13, fontFamily: "'Inter', sans-serif", background: "#fff", cursor: "pointer" }}
                    value={getMethod(uid)} onChange={e => setPayMethods(p => ({ ...p, [uid]: e.target.value }))}>
                    {["Zelle", "Venmo", "Check", "Bank Transfer", "Cash", "Other"].map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6B6560", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>Reference # (optional)</label>
                  <input style={{ width: "100%", padding: "8px 12px", border: "1px solid #E0E0E0", borderRadius: 6, fontSize: 13, fontFamily: "'Inter', sans-serif", boxSizing: "border-box" }}
                    value={getRef(uid)} onChange={e => setPayRefs(p => ({ ...p, [uid]: e.target.value }))} placeholder="Check #, transaction ID..." />
                </div>
                <button
                  style={{ padding: "10px 22px", background: isPaying ? "#6B6560" : "#3B5998", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: isPaying ? "not-allowed" : "pointer", fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap", transition: "all 200ms" }}
                  onClick={() => handlePay(uid, ents, total)}
                  disabled={isPaying}
                >
                  {isPaying ? "Processing…" : "💳 Mark All Paid — " + fmt(total)}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const CommunityInsights = ({ fetchStats, settings, mob, cachedStats, onStatsCached, entries = [], users = [] }) => {
  const [stats, setStats] = useState(cachedStats || null);
  const [loading, setLoading] = useState(!cachedStats);
  const [loadMsg] = useState(() => INSIGHTS_LOADING[Math.floor(Math.random() * INSIGHTS_LOADING.length)]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [memberTableYear, setMemberTableYear] = useState(new Date().getFullYear().toString());
  const [expandedUser, setExpandedUser] = useState(null);

  useEffect(() => {
    // If we have cached stats, skip loading entirely
    if (cachedStats) { setStats(cachedStats); setLoading(false); return; }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      // Minimum display time for the fun loader (first load only)
      const [data] = await Promise.all([
        fetchStats(),
        new Promise(r => setTimeout(r, 1200 + Math.random() * 1000)),
      ]);
      if (!cancelled && data) { setStats(data); onStatsCached && onStatsCached(data); }
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
                  <AnimatedBar pct={pct} color="url(#monthGrad)" height={20} radius={10} style={{ background: BRAND.bgSoft }} />
                  <svg width={0} height={0}><defs><linearGradient id="monthGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#1565C0" /><stop offset="100%" stopColor="#0097A7" /></linearGradient></defs></svg>
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
                  <AnimatedBar pct={pct} color={color} height={14} radius={7} style={{ background: color + "15" }} />
                  <div style={{ display: "flex", gap: 12, fontSize: 11, color: BRAND.textLight, marginTop: 3 }}>
                    <span>Labor: {fmt(data.labor)}</span><span>Materials: {fmt(data.materials)}</span><span>{data.count} entries</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Member Monthly Reimbursement Summary ── */}
      {(() => {
        const fmt2 = (n) => "$" + (Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const allYears = [...new Set(entries.map(e => e.date?.slice(0, 4)).filter(Boolean))].sort().reverse();
        if (allYears.length === 0) return null;
        const year = memberTableYear;
        const yearEntries = entries.filter(e => e.date?.startsWith(year));
        const months = [...new Set(yearEntries.map(e => e.date?.slice(0, 7)))].sort();
        const statusOrder = [STATUSES.SUBMITTED, STATUSES.APPROVED, STATUSES.PAID, STATUSES.REJECTED, STATUSES.DRAFT];
        const STATUS_COLORS = {
          [STATUSES.APPROVED]: { bg: "#E8F0E6", text: BRAND.success,   border: "#B5CCAE" },
          [STATUSES.PAID]:     { bg: "#E8EDF5", text: "#3B5998",        border: "#B8C8E0" },
          [STATUSES.SUBMITTED]:{ bg: "#FFF0E0", text: BRAND.brick,      border: "#E8C4A8" },
          [STATUSES.REJECTED]: { bg: "#FDEAEA", text: BRAND.error,      border: "#F0BABA" },
          [STATUSES.DRAFT]:    { bg: "#EDEBE8", text: BRAND.textMuted,  border: "#D5D0C9" },
        };
        const calcTotal = (e) => {
          const h = calcHours(e.startTime, e.endTime);
          const r = getUserRate(users, settings, e.userId);
          return calcLabor(h, r) + calcMaterialsTotal(e.materials);
        };
        // Build user → month → status → { total, count }
        const tableData = {};
        yearEntries.forEach(e => {
          const month = e.date?.slice(0, 7);
          if (!month) return;
          const uid = e.userId;
          if (!tableData[uid]) tableData[uid] = {};
          if (!tableData[uid][month]) tableData[uid][month] = {};
          if (!tableData[uid][month][e.status]) tableData[uid][month][e.status] = { total: 0, count: 0 };
          tableData[uid][month][e.status].total += calcTotal(e);
          tableData[uid][month][e.status].count += 1;
        });
        const userList = Object.keys(tableData).map(uid => {
          const approvedTotal = Object.values(tableData[uid]).reduce((s, md) =>
            s + [STATUSES.APPROVED, STATUSES.PAID].reduce((ms, st) => ms + (md[st]?.total || 0), 0), 0);
          const allTotal = Object.values(tableData[uid]).reduce((s, md) =>
            s + Object.values(md).reduce((ms, v) => ms + v.total, 0), 0);
          return { uid, approvedTotal, allTotal };
        }).sort((a, b) => b.approvedTotal - a.approvedTotal);
        if (userList.length === 0) return null;
        const mName = (m) => new Date(m + "-01").toLocaleDateString("en-US", { month: "short" });

        return (
          <div style={{ background: BRAND.white, border: "1px solid " + BRAND.borderLight, borderRadius: 12, padding: mob ? 16 : 24, marginTop: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
              <div>
                <h3 style={{ fontFamily: BRAND.serif, fontSize: 18, fontWeight: 600, color: BRAND.navy, margin: "0 0 4px" }}>Member Reimbursements — {year}</h3>
                <p style={{ margin: 0, fontSize: 13, color: BRAND.textMuted }}>Monthly totals per member by entry status. Click a member to expand.</p>
              </div>
              {allYears.length > 1 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {allYears.map(y => (
                    <button key={y} onClick={() => setMemberTableYear(y)} style={{ padding: "5px 14px", borderRadius: 20, border: "1px solid " + (memberTableYear === y ? BRAND.navy : BRAND.border), background: memberTableYear === y ? BRAND.navy : BRAND.white, color: memberTableYear === y ? "#fff" : BRAND.textMuted, fontWeight: memberTableYear === y ? 700 : 500, fontSize: 12, fontFamily: BRAND.sans, cursor: "pointer" }}>{y}</button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {userList.map(({ uid, approvedTotal, allTotal }) => {
                const u = users.find(u => u.id === uid);
                const userName = u?.name || "Unknown";
                const isExpanded = expandedUser === uid;
                const userMonthData = tableData[uid];
                // Yearly totals by status
                const yearlyByStatus = {};
                Object.values(userMonthData).forEach(md => {
                  Object.entries(md).forEach(([st, v]) => {
                    yearlyByStatus[st] = (yearlyByStatus[st] || 0) + v.total;
                  });
                });
                const visibleStatuses = statusOrder.filter(st => yearlyByStatus[st] > 0);
                return (
                  <div key={uid} style={{ border: "1px solid " + BRAND.borderLight, borderRadius: 10, overflow: "hidden", transition: "box-shadow 200ms" }}>
                    {/* Collapsible header */}
                    <button
                      onClick={() => setExpandedUser(isExpanded ? null : uid)}
                      style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: isExpanded ? BRAND.bgSoft : BRAND.white, border: "none", cursor: "pointer", fontFamily: BRAND.sans, textAlign: "left", transition: "background 150ms" }}
                    >
                      <div style={{ width: 36, height: 36, borderRadius: 18, background: BRAND.navy, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                        {userName.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: BRAND.charcoal }}>{userName}</div>
                        <div style={{ fontSize: 12, color: BRAND.textMuted, marginTop: 2 }}>
                          {Object.values(userMonthData).reduce((s, m) => s + Object.values(m).reduce((ms, v) => ms + v.count, 0), 0)} entries
                          {approvedTotal > 0 && <span style={{ color: BRAND.success, fontWeight: 600 }}> · Approved/Paid: {fmt2(approvedTotal)}</span>}
                        </div>
                      </div>
                      {/* Status pill summary — hide on very small screens when expanded */}
                      {!mob && (
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                          {visibleStatuses.map(st => {
                            const c = STATUS_COLORS[st] || {};
                            return (
                              <span key={st} style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 10, background: c.bg, color: c.text, border: "1px solid " + c.border, whiteSpace: "nowrap" }}>
                                {st}: {fmt2(yearlyByStatus[st])}
                              </span>
                            );
                          })}
                        </div>
                      )}
                      <span style={{ color: BRAND.textLight, fontSize: 14, marginLeft: 4, display: "inline-block", transition: "transform 200ms", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }}>▾</span>
                    </button>

                    {/* Expanded breakdown */}
                    {isExpanded && (
                      <div className="fade-in" style={{ borderTop: "1px solid " + BRAND.borderLight }}>
                        {mob ? (
                          // Mobile: stacked month cards
                          <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                            {months.filter(m => userMonthData[m]).map(m => (
                              <div key={m} style={{ padding: "12px 14px", background: BRAND.bgSoft, borderRadius: 8 }}>
                                <div style={{ fontWeight: 700, fontSize: 13, color: BRAND.navy, marginBottom: 8 }}>{mName(m)} {year}</div>
                                {statusOrder.filter(st => userMonthData[m]?.[st]).map(st => {
                                  const v = userMonthData[m][st];
                                  const c = STATUS_COLORS[st] || {};
                                  return (
                                    <div key={st} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                                      <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 8, background: c.bg, color: c.text, border: "1px solid " + c.border }}>{st}</span>
                                      <span style={{ fontSize: 13, fontWeight: 600, color: BRAND.charcoal }}>
                                        {fmt2(v.total)} <span style={{ fontSize: 11, fontWeight: 400, color: BRAND.textLight }}>({v.count})</span>
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            ))}
                            {/* Mobile year totals */}
                            <div style={{ padding: "12px 14px", background: BRAND.navy + "08", borderRadius: 8, borderTop: "2px solid " + BRAND.borderLight }}>
                              <div style={{ fontWeight: 700, fontSize: 13, color: BRAND.charcoal, marginBottom: 6 }}>Year Total</div>
                              {visibleStatuses.map(st => {
                                const c = STATUS_COLORS[st] || {};
                                return (
                                  <div key={st} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                    <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 8, background: c.bg, color: c.text, border: "1px solid " + c.border }}>{st}</span>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: c.text }}>{fmt2(yearlyByStatus[st])}</span>
                                  </div>
                                );
                              })}
                              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, paddingTop: 8, borderTop: "1px solid " + BRAND.borderLight }}>
                                <span style={{ fontSize: 13, fontWeight: 700, color: BRAND.charcoal }}>All entries</span>
                                <span style={{ fontSize: 14, fontWeight: 700, color: BRAND.navy }}>{fmt2(allTotal)}</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          // Desktop: full table
                          <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                              <thead>
                                <tr style={{ background: BRAND.bgSoft }}>
                                  <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: BRAND.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>Month</th>
                                  {visibleStatuses.map(st => (
                                    <th key={st} style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: STATUS_COLORS[st]?.text || BRAND.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{st}</th>
                                  ))}
                                  <th style={{ padding: "10px 16px", textAlign: "right", fontWeight: 700, color: BRAND.charcoal, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Month Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {months.filter(m => userMonthData[m]).map((m, i) => {
                                  const monthTotal = Object.values(userMonthData[m]).reduce((s, v) => s + v.total, 0);
                                  return (
                                    <tr key={m} style={{ background: i % 2 === 0 ? BRAND.white : BRAND.bgSoft, borderBottom: "1px solid " + BRAND.borderLight }}>
                                      <td style={{ padding: "10px 16px", fontWeight: 600, color: BRAND.navy }}>{mName(m)}</td>
                                      {visibleStatuses.map(st => {
                                        const v = userMonthData[m]?.[st];
                                        const c = STATUS_COLORS[st] || {};
                                        return (
                                          <td key={st} style={{ padding: "10px 12px", textAlign: "right" }}>
                                            {v ? (
                                              <div>
                                                <div style={{ fontWeight: 600, color: c.text || BRAND.charcoal }}>{fmt2(v.total)}</div>
                                                <div style={{ fontSize: 11, color: BRAND.textLight }}>{v.count} entr{v.count === 1 ? "y" : "ies"}</div>
                                              </div>
                                            ) : <span style={{ color: BRAND.borderLight }}>—</span>}
                                          </td>
                                        );
                                      })}
                                      <td style={{ padding: "10px 16px", textAlign: "right", fontWeight: 700, color: BRAND.charcoal }}>{fmt2(monthTotal)}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                              <tfoot>
                                <tr style={{ background: BRAND.navy + "08", borderTop: "2px solid " + BRAND.borderLight }}>
                                  <td style={{ padding: "12px 16px", fontWeight: 700, color: BRAND.charcoal }}>Year Total</td>
                                  {visibleStatuses.map(st => (
                                    <td key={st} style={{ padding: "12px 12px", textAlign: "right", fontWeight: 700, color: STATUS_COLORS[st]?.text || BRAND.textMuted }}>
                                      {yearlyByStatus[st] ? fmt2(yearlyByStatus[st]) : <span style={{ color: BRAND.borderLight }}>—</span>}
                                    </td>
                                  ))}
                                  <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700, color: BRAND.navy, fontSize: 14 }}>{fmt2(allTotal)}</td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════
// HELP MODAL
// ═══════════════════════════════════════════════════════════════════════════
const HELP_TABS = ["How it works", "Features", "Statuses", "Tips"];

const HelpModal = ({ onClose, isTreasurer, mob, hoaName }) => {
  const [tab, setTab] = useState(0);

  // trap focus & close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", handler); document.body.style.overflow = ""; };
  }, [onClose]);

  const sectionLabel = (text) => (
    <div style={{ fontFamily: BRAND.sans, fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: BRAND.textLight, marginBottom: 16, paddingBottom: 8, borderBottom: "1px solid " + BRAND.borderLight }}>{text}</div>
  );

  const workflowSteps = [
    { num: "01", label: "Log Work", sub: "Create a draft entry with date, time, category & description", icon: "✏️" },
    { num: "02", label: "Submit", sub: "Send for Treasurer review with one tap", icon: "📤" },
    { num: "03", label: "Approved", sub: "Treasurer reviews and approves the entry", icon: "✓" },
    { num: "04", label: "Paid", sub: "Reimbursement is sent to you", icon: "💳" },
  ];

  const features = [
    { icon: "📋", title: "Log Work Entries", desc: "Record any HOA work — landscaping, plumbing, snow removal, and more. Add date, times, category, and description.", color: BRAND.navy },
    { icon: "🧾", title: "Materials & Receipts", desc: "List materials purchased with name, quantity, and cost. Attach before/after photos and receipt images.", color: "#2E7D32" },
    { icon: "💬", title: "Discussion Threads", desc: "Each entry has a Discussion section. Message the Treasurer directly on the entry — no separate emails needed.", color: "#4338CA" },
    { icon: "⚡", title: "Entry Templates", desc: "Save any entry as a template and reuse it in one tap. Category, description, and times all pre-fill automatically.", color: "#A07840" },
    { icon: "📊", title: "Your Dashboard", desc: "See your YTD approved and paid totals, pending entries with wait times, and anything that needs attention.", color: BRAND.brick },
    { icon: "🏠", title: "Community Insights", desc: "View HOA spending by category and see how your contributions fit the community picture.", color: "#6A1B9A" },
  ];

  const statuses = [
    { label: "Draft", desc: "Saved, not yet submitted", bg: "#F5F5F5", border: "#DDD", text: "#555", dot: "#9E9E9E" },
    { label: "Submitted", desc: "Awaiting Treasurer review", bg: "#FFF8ED", border: "#F0D4A8", text: "#7A5420", dot: "#F59E0B" },
    { label: "Approved", desc: "Locked and queued for payment", bg: "#F0FDF4", border: "#A5D6A7", text: "#1B5E20", dot: "#4CAF50" },
    { label: "Needs Info", desc: "Treasurer has a question — check Discussion", bg: "#EEF2FF", border: "#C7D2FE", text: "#3730A3", dot: "#6366F1" },
    { label: "Declined", desc: "Read the note, fix the entry, resubmit", bg: "#FFF5F5", border: "#F0BABA", text: "#7f1d1d", dot: "#EF5350" },
    { label: "Paid", desc: "Reimbursement complete", bg: "#E8EDF5", border: "#B8C8E0", text: "#3B5998", dot: "#3B5998" },
  ];

  const tips = [
    { icon: "✨", title: "Smart pre-fill", text: "New entries auto-fill category and location from your last entry." },
    { icon: "⏱", title: "Quick durations", text: "Tap 30m / 1hr / 2hr buttons to set end time instantly from your start time." },
    { icon: "🔄", title: "Autosave", text: "Drafts save every 60 seconds automatically — you won't lose progress." },
    { icon: "📱", title: "Swipe gestures", text: "On mobile, swipe left on any entry card for quick actions." },
    { icon: "↩️", title: "After a decline", text: "The entry becomes editable again. Fix the issue and resubmit." },
    { icon: "📷", title: "Attach photos", text: "Entries with photos get approved faster — the Treasurer can see the work." },
    { icon: "📋", title: "Use templates", text: "Save recurring work as a template. Saves time every week." },
    { icon: "💬", title: "Check your badges", text: "A 💬 badge on entry cards means the Treasurer left a message." },
  ];

  const treasurerFeatures = [
    { icon: "🕐", title: "Review Queue", desc: "All submitted entries in one place. Approve or decline with optional reviewer notes." },
    { icon: "💳", title: "Payment Run", desc: "Group all approved-but-unpaid entries by member, set payment method and reference, then mark all paid in one action." },
    { icon: "📊", title: "Reports", desc: "Export approved entries as PDF or CSV for any date range — by individual member or consolidated." },
    { icon: "✅", title: "Bulk Approve", desc: "Select multiple submitted entries in the review queue and approve them all at once." },
    { icon: "🏘", title: "Community Insights", desc: "View spending by category, monthly trends, and per-member reimbursement breakdowns by year." },
    { icon: "⚙️", title: "Settings", desc: "Configure HOA name, default hourly rate, annual budget, dual-approval threshold, and manage members." },
  ];

  const renderTab = () => {
    switch (tab) {
      case 0: return (
        <div>
          {sectionLabel("The reimbursement workflow")}
          <div style={{ display: "flex", flexDirection: "column", gap: 0, marginBottom: 24, background: BRAND.navy, borderRadius: 12, overflow: "hidden" }}>
            {workflowSteps.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, padding: "18px 20px", borderBottom: i < workflowSteps.length - 1 ? "1px solid rgba(255,255,255,0.08)" : "none" }}>
                <div style={{ width: 36, height: 36, borderRadius: 18, background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{s.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: BRAND.serif, fontSize: 16, fontWeight: 600, color: "#fff", lineHeight: 1.2 }}>{s.num}. {s.label}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 3 }}>{s.sub}</div>
                </div>
                {i < workflowSteps.length - 1 && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>↓</div>}
              </div>
            ))}
          </div>
          <div style={{ background: BRAND.bgSoft, border: "1px solid " + BRAND.borderLight, borderRadius: 10, padding: "14px 16px", fontSize: 13, color: BRAND.textMuted, lineHeight: 1.6 }}>
            💡 <strong style={{ color: BRAND.charcoal }}>If your entry is declined</strong>, the Treasurer will leave a note explaining what to fix. The entry becomes editable again automatically — update it and resubmit.
          </div>
        </div>
      );

      case 1: return (
        <div>
          {sectionLabel(isTreasurer ? "Member features" : "What you can do")}
          <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: 12, marginBottom: isTreasurer ? 24 : 0 }}>
            {features.map((f, i) => (
              <div key={i} style={{ background: BRAND.white, border: "1px solid " + BRAND.borderLight, borderRadius: 10, padding: "16px 16px", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: f.color, opacity: 0.5, borderRadius: "10px 10px 0 0" }} />
                <div style={{ fontSize: 22, marginBottom: 8 }}>{f.icon}</div>
                <div style={{ fontFamily: BRAND.serif, fontSize: 16, fontWeight: 600, color: BRAND.navy, marginBottom: 5 }}>{f.title}</div>
                <div style={{ fontSize: 12, color: BRAND.textMuted, lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            ))}
          </div>
          {isTreasurer && (
            <>
              {sectionLabel("Treasurer tools")}
              <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: 12 }}>
                {treasurerFeatures.map((f, i) => (
                  <div key={i} style={{ background: BRAND.white, border: "1px solid " + BRAND.borderLight, borderRadius: 10, padding: "16px 16px", position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: BRAND.navy, opacity: 0.4, borderRadius: "10px 10px 0 0" }} />
                    <div style={{ fontSize: 22, marginBottom: 8 }}>{f.icon}</div>
                    <div style={{ fontFamily: BRAND.serif, fontSize: 16, fontWeight: 600, color: BRAND.navy, marginBottom: 5 }}>{f.title}</div>
                    <div style={{ fontSize: 12, color: BRAND.textMuted, lineHeight: 1.6 }}>{f.desc}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      );

      case 2: return (
        <div>
          {sectionLabel("What each status means")}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {statuses.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "14px 16px", background: s.bg, border: "1px solid " + s.border, borderRadius: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: 5, background: s.dot, flexShrink: 0, marginTop: 5 }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: s.text, marginBottom: 3 }}>{s.label}</div>
                  <div style={{ fontSize: 12, color: s.text, opacity: 0.75, lineHeight: 1.5 }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );

      case 3: return (
        <div>
          {sectionLabel("Tips & shortcuts")}
          <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: 10 }}>
            {tips.map((t, i) => (
              <div key={i} style={{ background: BRAND.bgSoft, border: "1px solid " + BRAND.borderLight, borderRadius: 10, padding: "14px 16px", display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{t.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: BRAND.charcoal, marginBottom: 4 }}>{t.title}</div>
                  <div style={{ fontSize: 12, color: BRAND.textMuted, lineHeight: 1.6 }}>{t.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );

      default: return null;
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Help — User Guide"
      style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: mob ? "flex-end" : "center", justifyContent: "center", padding: mob ? 0 : 24 }}
      onClick={onClose}
    >
      <div
        className="fade-in"
        onClick={e => e.stopPropagation()}
        style={{
          background: BRAND.cream || BRAND.bg || "#F5F0E8",
          borderRadius: mob ? "20px 20px 0 0" : 16,
          width: "100%",
          maxWidth: mob ? "100%" : 680,
          maxHeight: mob ? "92vh" : "88vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 24px 80px rgba(0,0,0,0.3)",
        }}
      >
        {/* Modal header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 16px", borderBottom: "1px solid " + BRAND.borderLight, background: BRAND.navy, flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: BRAND.serif, fontSize: 20, fontWeight: 600, color: "#fff" }}>Help Guide</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>{hoaName}</div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close help"
            style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", width: 32, height: 32, borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, lineHeight: 1, fontFamily: BRAND.sans }}
          >×</button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid " + BRAND.borderLight, background: BRAND.white, flexShrink: 0, overflowX: "auto" }}>
          {HELP_TABS.map((t, i) => (
            <button
              key={i}
              onClick={() => setTab(i)}
              style={{
                flex: mob ? "0 0 auto" : 1,
                padding: "12px 16px",
                border: "none",
                background: "none",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: tab === i ? 600 : 400,
                color: tab === i ? BRAND.navy : BRAND.textMuted,
                borderBottom: tab === i ? "2px solid " + BRAND.navy : "2px solid transparent",
                fontFamily: BRAND.sans,
                whiteSpace: "nowrap",
                transition: "all 150ms",
              }}
            >{t}</button>
          ))}
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: "auto", padding: mob ? "20px 16px" : "24px 24px", WebkitOverflowScrolling: "touch" }}>
          {renderTab()}
        </div>

        {/* Footer */}
        <div style={{ borderTop: "1px solid " + BRAND.borderLight, padding: "12px 20px", background: BRAND.white, flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 12, color: BRAND.textLight }}>
            {tab > 0 && <button onClick={() => setTab(t => t - 1)} style={{ background: "none", border: "none", color: BRAND.textMuted, cursor: "pointer", fontSize: 12, fontFamily: BRAND.sans, padding: "4px 0" }}>← Previous</button>}
          </div>
          <div style={{ fontSize: 12, color: BRAND.textLight }}>
            {tab + 1} / {HELP_TABS.length}
          </div>
          <div>
            {tab < HELP_TABS.length - 1
              ? <button onClick={() => setTab(t => t + 1)} style={{ ...{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "1px solid " + BRAND.borderLight, background: BRAND.white, cursor: "pointer", fontSize: 13, fontWeight: 600, color: BRAND.navy, fontFamily: BRAND.sans } }}>Next →</button>
              : <button onClick={onClose} style={{ ...{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "none", background: BRAND.navy, cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#fff", fontFamily: BRAND.sans } }}>Done ✓</button>
            }
          </div>
        </div>
      </div>
    </div>
  );
};

const NotificationPanel = ({ entries, purchaseEntries, users, settings, onView, onViewPurchase, onClose, onReviewAll, mob }) => {
  const pendingWork = entries.filter(e => e.status === STATUSES.SUBMITTED).map(e => ({ ...e, _type: "work" }));
  const pendingPurch = (purchaseEntries || []).filter(e => e.status === "Submitted").map(e => ({ ...e, _type: "purchase" }));
  const pending = [...pendingWork, ...pendingPurch].sort((a, b) => (b.createdAt || b.date || "").localeCompare(a.createdAt || a.date || ""));
  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 94 }} onClick={onClose} aria-hidden="true" />
      <div role="dialog" aria-label="Notifications" style={{ position: mob ? "fixed" : "absolute", top: mob ? 58 : 44, right: mob ? 8 : 0, left: mob ? 8 : "auto", width: mob ? "auto" : 360, maxHeight: mob ? "70vh" : 420, background: BRAND.white, borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.15)", border: "1px solid " + BRAND.borderLight, zIndex: 95, overflow: "hidden", animation: "fadeIn 200ms ease-out" }}>
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
              const isPurchase = e._type === "purchase";
              const h = isPurchase ? null : calcHours(e.startTime, e.endTime);
              const total = isPurchase ? (e.total || 0) : (calcLabor(h, getUserRate(users, settings, e.userId)) + calcMaterialsTotal(e.materials));
              const desc = isPurchase ? (e.storeName + " — " + (e.description || "")).slice(0, 60) : (e.description || "").slice(0, 60);
              return (
                <div key={e.id} role="button" tabIndex={0} onKeyDown={ev => (ev.key === "Enter" || ev.key === " ") && (ev.preventDefault(), isPurchase ? onViewPurchase(e) : onView(e))} aria-label={(u?.name || "Member") + ": " + e.category + ", " + fmt(total)} style={{ padding: "12px 16px", borderBottom: i < pending.length - 1 ? "1px solid " + BRAND.borderLight : "none", cursor: "pointer", background: BRAND.white, transition: "background 150ms" }} onClick={() => isPurchase ? onViewPurchase(e) : onView(e)} onMouseEnter={ev => ev.currentTarget.style.background = BRAND.bgSoft} onMouseLeave={ev => ev.currentTarget.style.background = BRAND.white}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 14, background: (isPurchase ? "#0E7490" : BRAND.brick) + "18", color: isPurchase ? "#0E7490" : BRAND.brick, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{isPurchase ? "🛍" : (u?.name || "?").split(" ").map(n => n[0]).join("").slice(0, 2)}</div>
                      <span style={{ fontWeight: 600, fontSize: 13, color: BRAND.navy }}>{u?.name || "Member"}</span>
                      {isPurchase && <span style={{ fontSize: 9, fontWeight: 700, color: "#0E7490", background: "#ECFEFF", padding: "1px 6px", borderRadius: 8 }}>PURCHASE</span>}
                    </div>
                    <span style={{ fontSize: 11, color: BRAND.textLight, whiteSpace: "nowrap" }}>{timeAgo(e.createdAt || e.submittedAt)}</span>
                  </div>
                  <div style={{ marginLeft: 36, fontSize: 13, color: BRAND.charcoal, marginBottom: 4 }}><CategoryBadge category={e.category} /> <span style={{ marginLeft: 4 }}>{desc}{desc.length >= 60 ? "..." : ""}</span></div>
                  <div style={{ marginLeft: 36, display: "flex", gap: 12, fontSize: 12, color: BRAND.textLight }}>
                    <span>{formatDate(e.date)}</span>{h != null && <span>{fmtHours(h)}</span>}<span style={{ fontWeight: 600, color: isPurchase ? "#0E7490" : BRAND.brick }}>{fmt(total)}</span>
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

const SettingsPage = ({ settings, users, currentUser, allEntries, allPurchases, onSaveSettings, onAddUser, onRemoveUser, onUpdateRate }) => {
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
        <Field label="Default Hourly Rate ($)"><input type="number" min="0" step="0.50" inputMode="decimal" style={S.input} value={form.defaultHourlyRate} onChange={e => set("defaultHourlyRate", Number(e.target.value))} /></Field>
        <Field label="Mileage Reimbursement Rate ($/mile)">
          <div>
            <input type="number" min="0" step="0.005" inputMode="decimal" style={S.input} value={form.mileageRate != null ? form.mileageRate : 0.725} onChange={e => set("mileageRate", Number(e.target.value))} />
            <div style={{ fontSize: 12, color: BRAND.textLight, marginTop: 6 }}>IRS standard rate for {new Date().getFullYear()}: $0.725/mile. Update each January when the IRS publishes new rates. Applies to all mileage reimbursements.</div>
          </div>
        </Field>
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Invite Code">
              <div style={{ display: "flex", gap: 8 }}>
                <input style={{ ...S.input, fontFamily: "monospace", letterSpacing: "0.1em", textTransform: "uppercase", flex: 1 }}
                  value={form.inviteCode || ""} onChange={e => set("inviteCode", e.target.value.toUpperCase())} placeholder="e.g. MILL2024" />
                {form.inviteCode && (
                  <button
                    type="button"
                    style={{ ...S.btnSecondary, padding: "10px 14px", flexShrink: 0 }}
                    title="Copy invite code"
                    onClick={() => { navigator.clipboard.writeText(form.inviteCode).then(() => { setSaved("code"); setTimeout(() => setSaved(false), 1500); }); }}
                  >
                    {saved === "code" ? <Icon name="check" size={16} /> : <Icon name="copy" size={16} />}
                  </button>
                )}
              </div>
            </Field>
            <Field label="Code Expires">
              <input type="datetime-local" style={S.input}
                value={form.inviteExpiresAt ? form.inviteExpiresAt.slice(0, 16) : ""}
                onChange={e => set("inviteExpiresAt", e.target.value ? new Date(e.target.value).toISOString() : null)} />
            </Field>
          </div>
          <div style={{ fontSize: 12, color: BRAND.textLight, marginTop: 6 }}>
            New members need this code to register.
            {form.inviteExpiresAt && (() => {
              const exp = new Date(form.inviteExpiresAt);
              const expired = exp < new Date();
              return <span style={{ marginLeft: 8, color: expired ? BRAND.error : BRAND.success, fontWeight: 600 }}>
                {expired ? "⚠ Expired " : "✓ Expires "}{exp.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>;
            })()}
            {!form.inviteExpiresAt && <span style={{ marginLeft: 8, color: "#F59E0B" }}>No expiry set — code works indefinitely.</span>}
          </div>
        </div>
        <div style={{ borderTop: "1px solid " + BRAND.borderLight, marginTop: 8, paddingTop: 16 }}>
          <div style={S.sectionLabel}>Governance</div>
          <Field label="Annual Reimbursement Budget ($)"><div><input type="number" min="0" step="500" inputMode="decimal" style={S.input} value={form.annualBudget || ""} onChange={e => set("annualBudget", Number(e.target.value))} placeholder="0 = no limit" /><div style={{ fontSize: 12, color: BRAND.textLight, marginTop: 6 }}>Set to 0 to disable. Shows a progress bar on the dashboard.</div></div></Field>
          <Field label="Dual Approval Threshold ($)"><div><input type="number" min="0" step="50" inputMode="decimal" style={S.input} value={form.dualApprovalThreshold || ""} onChange={e => set("dualApprovalThreshold", Number(e.target.value))} placeholder="0 = single approval" /><div style={{ fontSize: 12, color: BRAND.textLight, marginTop: 6 }}>Entries ≥ this amount require two board members to approve. Set to 0 to disable.</div></div></Field>
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
        {members.length === 0 ? <div style={{ textAlign: "center", padding: 24, color: BRAND.textLight, fontSize: 14 }}>No other members yet. Add someone above.</div> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {members.map(u => {
              const entryCount = (allEntries).filter(e => e.userId === u.id).length;
              const purchCount = (allPurchases || []).filter(e => e.userId === u.id).length;
              const approvedCount = (allEntries).filter(e => e.userId === u.id && (e.status === "Approved" || e.status === "Paid")).length
                + (allPurchases || []).filter(e => e.userId === u.id && (e.status === "Approved" || e.status === "Paid")).length;
              const pendingCount  = (allEntries).filter(e => e.userId === u.id && e.status === "Submitted").length
                + (allPurchases || []).filter(e => e.userId === u.id && e.status === "Submitted").length;
              const hasHistory = entryCount > 0 || purchCount > 0;
              return (
                <div key={u.id} style={{ border: "1px solid " + BRAND.borderLight, borderRadius: 10, padding: "14px 16px", background: BRAND.white }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 16, background: BRAND.navy + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: BRAND.navy, flexShrink: 0 }}>
                          {u.name.split(" ").map(n => n[0]).join("").slice(0,2)}
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: BRAND.charcoal }}>{u.name}</div>
                          <div style={{ fontSize: 12, color: BRAND.textMuted }}>{u.email}</div>
                        </div>
                        <RoleBadge role={u.role} />
                      </div>
                      {hasHistory && (
                        <div style={{ display: "flex", gap: 12, fontSize: 12, color: BRAND.textLight, marginTop: 6, paddingLeft: 40 }}>
                          <span>{entryCount + purchCount} total{purchCount > 0 ? " (" + entryCount + " work, " + purchCount + " purchase)" : ""}</span>
                          {approvedCount > 0 && <span style={{ color: BRAND.success }}>✓ {approvedCount} approved/paid</span>}
                          {pendingCount  > 0 && <span style={{ color: BRAND.warning }}>⏳ {pendingCount} pending</span>}
                        </div>
                      )}
                      {!hasHistory && <div style={{ fontSize: 12, color: BRAND.textLight, marginTop: 4, paddingLeft: 40 }}>No entries yet</div>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                        <label style={{ fontSize: 11, color: BRAND.textLight, fontWeight: 600 }}>Hourly Rate</label>
                        <RateInput initialValue={u.hourlyRate} placeholder={"$" + form.defaultHourlyRate + " default"} onSave={val => onUpdateRate(u.id, val)} />
                      </div>
                      <button
                        aria-label={"Remove " + u.name}
                        style={{ ...S.btnGhost, padding: "8px 12px", color: BRAND.error, border: "1px solid " + BRAND.error + "30", borderRadius: 8, fontSize: 13 }}
                        onClick={() => setDeleteTarget(u)}
                      >
                        <Icon name="trash" size={16} /> Remove
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {members.length > 0 && <div style={{ marginTop: 8, fontSize: 12, color: BRAND.textLight }}>Rates save automatically when you leave the field. Removed members\'s entries are retained for record-keeping.</div>}
      </div>

      {/* Remove Member Confirm — with entry count warning */}
      {deleteTarget && (() => {
        const entryCount = (allEntries).filter(e => e.userId === deleteTarget.id).length;
        const hasPending  = (allEntries).some(e => e.userId === deleteTarget.id && e.status === "Submitted");
        const hasApproved = (allEntries).some(e => e.userId === deleteTarget.id && (e.status === "Approved" || e.status === "Paid"));
        return (
          <Modal open={true} onClose={() => setDeleteTarget(null)} title={"Remove " + deleteTarget.name + "?"}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <p style={{ fontSize: 14, color: BRAND.textMuted, lineHeight: 1.7 }}>
                <strong>{deleteTarget.name}</strong> will lose access immediately. Their profile will be removed but their work entries are retained for your records.
              </p>
              {entryCount > 0 && (
                <div style={{ padding: "12px 14px", background: BRAND.bgSoft, borderRadius: 8, border: "1px solid " + BRAND.borderLight, fontSize: 13 }}>
                  <div style={{ fontWeight: 600, color: BRAND.navy, marginBottom: 4 }}>📋 {entryCount} work {entryCount === 1 ? "entry" : "entries"} on file</div>
                  {hasApproved && <div style={{ color: BRAND.success, marginTop: 2 }}>✓ Approved/paid entries are preserved in reports.</div>}
                  {hasPending  && <div style={{ color: BRAND.warning, marginTop: 2 }}>⏳ They have pending submissions — review or decline before removing.</div>}
                </div>
              )}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
                <button style={S.btnSecondary} onClick={() => setDeleteTarget(null)}>Cancel</button>
                <button style={S.btnDanger} onClick={() => removeMember(deleteTarget.id)}>
                  <Icon name="trash" size={16} /> Remove {deleteTarget.name}
                </button>
              </div>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════
// MORE SHEET (Treasurer Tools bottom sheet with scroll lock + pull-down)
// ═══════════════════════════════════════════════════════════════════════════
const MoreSheet = ({ onClose, trashCount, nav }) => {
  const sheetRef = useRef(null);
  const [pullY, setPullY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startY = useRef(null);
  const DISMISS_THRESHOLD = 80;

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const onTouchStart = (e) => {
    startY.current = e.touches[0].clientY;
    setDragging(true);
  };
  const onTouchMove = (e) => {
    if (startY.current == null) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0) { setPullY(dy); e.preventDefault(); }
  };
  const onTouchEnd = () => {
    setDragging(false);
    if (pullY >= DISMISS_THRESHOLD) { onClose(); }
    else { setPullY(0); }
    startY.current = null;
  };

  const items = [
    { id: "payment",  label: "Payment Run",        emoji: "💳", desc: "Batch pay approved entries" },
    { id: "reports",  label: "Reports",             emoji: "📊", desc: "PDF/CSV export" },
    { id: "insights", label: "Community Insights",  emoji: "✨", desc: "Spending trends" },
    { id: "settings", label: "Settings",            emoji: "⚙️",  desc: "HOA name, rates, members" },
    { id: "trash",    label: "Trash",               emoji: "🗑",  desc: trashCount > 0 ? trashCount + " item" + (trashCount > 1 ? "s" : "") : "Empty", badge: trashCount || 0 },
    { id: "help",     label: "Help",                emoji: "❓", desc: "How to use the app" },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 80 }} onClick={onClose}>
      {/* Backdrop dims as sheet is pulled */}
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0," + Math.max(0.3 - pullY * 0.003, 0) + ")", transition: dragging ? "none" : "background 300ms" }} />
      <div
        ref={sheetRef}
        onClick={e => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          background: BRAND.white, borderRadius: "20px 20px 0 0",
          padding: "0 0 calc(env(safe-area-inset-bottom) + 16px)",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.18)",
          transform: "translateY(" + pullY + "px)",
          transition: dragging ? "none" : "transform 300ms cubic-bezier(0.34,1.56,0.64,1)",
          touchAction: "none",
        }}
      >
        {/* Drag handle */}
        <div onClick={onClose} style={{ cursor: "pointer", padding: "12px 0 8px", display: "flex", justifyContent: "center" }}>
          <div style={{ width: 40, height: 4, background: pullY > 40 ? BRAND.textMuted : BRAND.borderLight, borderRadius: 2, transition: "background 150ms" }} />
        </div>
        <div style={{ padding: "0 20px", marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: BRAND.textLight, letterSpacing: "0.08em", textTransform: "uppercase" }}>Treasurer Tools</div>
            <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", color: BRAND.textMuted, cursor: "pointer", padding: 6, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", minWidth: 36, minHeight: 36 }}><Icon name="x" size={20} /></button>
          </div>
          {items.map(item => (
            <button key={item.id} style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", padding: "14px 16px", borderRadius: 12, border: "none", background: "none", cursor: "pointer", fontFamily: BRAND.sans, marginBottom: 4, textAlign: "left" }}
              onMouseEnter={ev => ev.currentTarget.style.background = BRAND.bgSoft}
              onMouseLeave={ev => ev.currentTarget.style.background = "none"}
              onClick={() => { onClose(); nav(item.id); }}>
              <span style={{ fontSize: 28, width: 36, textAlign: "center" }}>{item.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: BRAND.charcoal }}>{item.label}</div>
                <div style={{ fontSize: 12, color: BRAND.textLight }}>{item.desc}</div>
              </div>
              {item.badge > 0 && <span style={{ background: BRAND.brick, color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10 }}>{item.badge}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default function App() {
  // Inject global CSS keyframes once
  useEffect(() => {
    const id = "hoa-global-styles";
    if (document.getElementById(id)) return;
    const el = document.createElement("style");
    el.id = id;
    el.textContent = `
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      @keyframes bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
      @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes slideDown { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(16px); } }
      @keyframes slideInRight { from { opacity: 0; transform: translateX(24px); } to { opacity: 1; transform: translateX(0); } }
      @keyframes slideOutLeft { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(-24px); } }
      @keyframes stepPop { 0% { transform: scale(0.6); opacity: 0; } 70% { transform: scale(1.18); } 100% { transform: scale(1); opacity: 1; } }
      @keyframes stepPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(31,42,56,0.18); } 50% { box-shadow: 0 0 0 7px rgba(31,42,56,0); } }
      @keyframes stepPulseSuccess { 0%,100% { box-shadow: 0 0 0 0 rgba(46,125,50,0.22); } 50% { box-shadow: 0 0 0 8px rgba(46,125,50,0); } }
      @keyframes lineFill { from { width: 0%; } to { width: 100%; } }
      @keyframes ripple { 0% { transform: scale(0); opacity: 0.5; } 100% { transform: scale(4); opacity: 0; } }
      @keyframes shake { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-5px); } 40% { transform: translateX(5px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(4px); } }
      @keyframes badgeSwap { 0% { transform: scale(1); opacity: 1; } 40% { transform: scale(0.75); opacity: 0; } 60% { transform: scale(0.75); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
      @keyframes countUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes ringDraw { from { stroke-dashoffset: 113; } to { stroke-dashoffset: 0; } }
      @keyframes cardSlideIn { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes cardCollapse { 0% { max-height: 200px; opacity: 1; margin-bottom: 10px; } 100% { max-height: 0; opacity: 0; margin-bottom: 0; padding-top: 0; padding-bottom: 0; } }
      @keyframes highlightFlash { 0% { background-color: rgba(245,194,72,0.35); } 100% { background-color: transparent; } }
      @keyframes toastSlideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes undoBar { from { width: 100%; } to { width: 0%; } }
      @keyframes saveCheck { 0% { transform: scale(0.7) rotate(-10deg); opacity: 0; } 60% { transform: scale(1.15) rotate(2deg); } 100% { transform: scale(1) rotate(0deg); opacity: 1; } }
      @keyframes validShake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
      @keyframes paidCount { from { opacity: 0; transform: translateY(4px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
      @keyframes springBack { 0% { transform: translateX(var(--snap-x, 0px)); } 60% { transform: translateX(calc(var(--snap-x, 0px) * -0.08)); } 100% { transform: translateX(0); } }
      @keyframes approveFlash { 0% { opacity: 0; } 25% { opacity: 1; } 100% { opacity: 0; } }
      @keyframes confettiFly { 0% { transform: translate(0,0) rotate(0deg) scale(1); opacity: 1; } 100% { transform: translate(var(--cx),var(--cy)) rotate(var(--cr)) scale(0.4); opacity: 0; } }
      @keyframes fabRing { 0% { transform: scale(1); opacity: 0.7; } 100% { transform: scale(2.2); opacity: 0; } }
      @keyframes toastProgress { from { width: 100%; } to { width: 0%; } }
      @keyframes lightboxIn { from { opacity: 0; transform: scale(0.88); } to { opacity: 1; transform: scale(1); } }
      @keyframes countUp { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
      .fade-in { animation: fadeIn 200ms ease-out; }
      .page-enter { animation: slideInRight 220ms cubic-bezier(0.25,0.46,0.45,0.94); }
      .page-exit { animation: slideOutLeft 180ms ease-in forwards; }
      .card-new { animation: cardSlideIn 320ms cubic-bezier(0.34,1.56,0.64,1); }
      .card-remove { animation: cardCollapse 280ms ease-in forwards; overflow: hidden; }
      .card-highlight { animation: highlightFlash 1400ms ease-out forwards; }
      .toast-enter { animation: toastSlideUp 280ms cubic-bezier(0.34,1.56,0.64,1); }
      .shake { animation: shake 300ms ease-in-out; }
      .skip-link { position: absolute; left: -9999px; top: 0; }
      .skip-link:focus { left: 0; background: #fff; padding: 8px 16px; z-index: 9999; color: #000; font-weight: 600; }
      .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
    `;
    document.head.appendChild(el);
  }, []);

  const mob = useIsMobile();
  const online = useOnline();
  const {
    currentUser, users, entries, purchaseEntries, settings, loading, authError,
    login, logout: sbLogout, register, resetPassword, changePassword,
    saveEntry, deleteEntry, trashEntry, restoreEntry, approveEntry, firstApprove, secondApprove, rejectEntry, markPaid,
    needsInfoEntry, bulkApprove, addComment,
    savePurchaseEntry, deletePurchaseEntry, approvePurchaseEntry, rejectPurchaseEntry, markPurchasePaid,
    saveSettings, addUser, removeUser, updateUserRate,
    setAuthError, fetchCommunityStats, refresh,
  } = useSupabase();

  const [page, setPage] = useState("dashboard");
  // Undo stack — last action that can be reversed
  const [undoStack, setUndoStack] = useState([]); // [{label, action, timeout}]
  const pushUndo = (label, undoFn) => {
    // Clear previous undo if any
    setUndoStack(prev => {
      prev.forEach(u => clearTimeout(u.timeout));
      const tid = setTimeout(() => setUndoStack(p => p.filter(u => u.label !== label)), 6000);
      return [{ label, undoFn, timeout: tid }];
    });
  };
  const popUndo = async () => {
    const [top, ...rest] = undoStack;
    if (!top) return;
    clearTimeout(top.timeout);
    setUndoStack(rest);
    await top.undoFn();
  };
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
  const [authMode, setAuthMode] = useState(() => {
    // If redirected back from password-reset email, go straight to reset form
    if (typeof window !== "undefined" && window.location.search.includes("reset=1")) return "reset";
    return "login";
  }); // "login" | "register" | "forgot" | "reset"
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [newPw, setNewPw] = useState("");
  const [newPwConfirm, setNewPwConfirm] = useState("");
  const [newPwError, setNewPwError] = useState("");
  const [newPwLoading, setNewPwLoading] = useState(false);
  const [newPwDone, setNewPwDone] = useState(false);
  // Change-password modal (for logged-in users)
  const [showChangePw, setShowChangePw] = useState(false);
  const [changePwCurrent, setChangePwCurrent] = useState("");
  const [changePwNew, setChangePwNew] = useState("");
  const [changePwConfirm, setChangePwConfirm] = useState("");
  const [changePwError, setChangePwError] = useState("");
  const [changePwLoading, setChangePwLoading] = useState(false);
  const [changePwDone, setChangePwDone] = useState(false);
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regCode, setRegCode] = useState("");
  const [regError, setRegError] = useState("");
  const [registering, setRegistering] = useState(false);
  const [regSuccess, setRegSuccess] = useState(false);
  const [filterSearch, setFilterSearch] = useState("");
  const [permDeleteTarget, setPermDeleteTarget] = useState(null); // for trash permanent delete confirm
  const [cachedInsightsStats, setCachedInsightsStats] = useState(null); // cache between tab visits
  const [selectedIds, setSelectedIds] = useState(new Set()); // bulk selection in review queue
  const [moreSheetOpen, setMoreSheetOpen] = useState(false); // mobile "More" bottom sheet
  const [showHelp, setShowHelp] = useState(false);
  const [entryTab, setEntryTab] = useState("work"); // "work" | "purchases"
  const [newPurchase, setNewPurchase] = useState(false);
  const [editPurchase, setEditPurchase] = useState(null);
  const [viewPurchase, setViewPurchase] = useState(null);
  const [newEntryType, setNewEntryType] = useState(null); // null | "work" | "purchase" — for FAB chooser
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterMember, setFilterMember] = useState("all");
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [sortField, setSortField] = useState("date");   // date | member | category | total | status | hours
  const [sortDir, setSortDir] = useState("desc");       // asc | desc
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectNote, setRejectNote] = useState("");
  const [needsInfoId, setNeedsInfoId] = useState(null);
  const [needsInfoNote, setNeedsInfoNote] = useState("");
  const [toast, setToast] = useState(null); // { message, type, detail }
  const [showConfetti, setShowConfetti] = useState(false);
  const [flashApproveId, setFlashApproveId] = useState(null); // id of entry being approve-flashed
  const [lightboxSrc, setLightboxSrc] = useState(null); // { src, alt }
  const [fabPulsed, setFabPulsed] = useState(() => { try { return !!localStorage.getItem("hoa_fab_pulsed"); } catch { return false; } });
  const [previewAsId, setPreviewAsId] = useState(null); // non-null = Treasurer previewing as a member

  // Sync auth errors from hook
  useEffect(() => { if (authError) setLoginError(authError); }, [authError]);

  // Scroll lock for drawer and help modal
  useEffect(() => {
    if (drawerOpen || showHelp) { document.body.style.overflow = "hidden"; }
    else { document.body.style.overflow = ""; }
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen, showHelp]);

  // ── PULL-TO-REFRESH state (must be before any early returns) ─────────────
  const [pullY, setPullY] = useState(0);
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const pullStartY = useRef(null);

  // When previewing, derive a fake currentUser from the chosen member — role overridden to Member
  const realIsTreasurer = currentUser?.role === ROLES.TREASURER;
  const previewUser = previewAsId ? users.find(u => u.id === previewAsId) : null;
  const viewAs = (realIsTreasurer && previewUser) ? { ...previewUser, role: ROLES.MEMBER } : currentUser;
  const isTreasurer = viewAs?.role === ROLES.TREASURER;
  const myEntries = useMemo(() =>
    entries.filter(e => isTreasurer || e.userId === viewAs?.id).sort((a, b) => b.date.localeCompare(a.date)),
  [entries, isTreasurer, viewAs?.id]);
  const pendingCount = entries.filter(e => e.status === STATUSES.SUBMITTED || e.status === STATUSES.AWAITING_SECOND || e.status === STATUSES.NEEDS_INFO).length
    + purchaseEntries.filter(e => e.status === "Submitted").length;

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

  const handleForgotPassword = async () => {
    setForgotError("");
    const email = forgotEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setForgotError("Please enter a valid email address."); return; }
    setForgotLoading(true);
    const result = await resetPassword(email);
    setForgotLoading(false);
    if (result.error) { setForgotError(result.error); return; }
    setForgotSent(true);
  };

  const [resetNewPass, setResetNewPass] = useState("");
  const [resetConfPass, setResetConfPass] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError]   = useState("");
  const [resetDone, setResetDone]     = useState(false);

  const handleResetPassword = async () => {
    setResetError("");
    if (!resetNewPass || resetNewPass.length < 6) { setResetError("Password must be at least 6 characters."); return; }
    if (resetNewPass !== resetConfPass) { setResetError("Passwords do not match."); return; }
    setResetLoading(true);
    const result = await changePassword(resetNewPass);
    setResetLoading(false);
    if (result.error) { setResetError(result.error); return; }
    setResetDone(true);
    // Clean up URL
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  // Change Password modal (for logged-in users)
  const [showChangePass, setShowChangePass]     = useState(false);
  const [cpCurrent, setCpCurrent]               = useState("");
  const [cpNew, setCpNew]                       = useState("");
  const [cpConfirm, setCpConfirm]               = useState("");
  const [cpLoading, setCpLoading]               = useState(false);
  const [cpError, setCpError]                   = useState("");
  const [cpDone, setCpDone]                     = useState(false);

  const handleChangePassword = async () => {
    setCpError("");
    if (!cpNew || cpNew.length < 6) { setCpError("New password must be at least 6 characters."); return; }
    if (cpNew !== cpConfirm)         { setCpError("Passwords do not match."); return; }
    setCpLoading(true);
    // Re-authenticate first then update
    const reauth = await login(currentUser.email, cpCurrent);
    if (!reauth) { setCpLoading(false); setCpError("Current password is incorrect."); return; }
    const result = await changePassword(cpNew);
    setCpLoading(false);
    if (result.error) { setCpError(result.error); return; }
    setCpDone(true);
    setTimeout(() => { setShowChangePass(false); setCpCurrent(""); setCpNew(""); setCpConfirm(""); setCpError(""); setCpDone(false); }, 2000);
  };
  // Track when each page was last visited so we can skip the loading animation
  const lastVisitedRef = useRef({});
  const nav = (p) => {
    if (p === page && !viewEntry && !editEntry && !newEntry) return; // already there
    setViewEntry(null); setEditEntry(null); setNewEntry(false); setDrawerOpen(false);
    setViewPurchase(null); setEditPurchase(null); setNewPurchase(false); setNewEntryType(null);
    // Skip loading animation if visited in the last 5 minutes
    const now = Date.now();
    const lastVisit = lastVisitedRef.current[p] || 0;
    const skipAnimation = (now - lastVisit) < 5 * 60 * 1000;
    if (skipAnimation) { setPage(p); return; }
    lastVisitedRef.current[p] = now;
    setPageLoading(p);
    const delay = 800 + Math.floor(Math.random() * 800); // 800-1600ms
    setTimeout(() => { setPageLoading(null); setPage(p); }, delay);
  };

  // Entry operations (now async)
  const doSave = async (formData, existingId, silent) => {
    const id = existingId || (editEntry ? editEntry.id : null);
    if (id) {
      const result = await saveEntry(formData, id);
      if (result?.error) { if (!silent) showToast("Save failed", "error", result.error); return null; }
      if (!silent && result) { setViewEntry(result); setEditEntry(null); setNewEntry(false); }
      return result;
    } else {
      const result = await saveEntry(formData, null);
      if (result?.error) { if (!silent) showToast("Save failed", "error", result.error); return null; }
      if (!silent && result) { setNewEntry(false); setEditEntry(null); if (formData.status === STATUSES.SUBMITTED) setPage("entries"); else setViewEntry(result); }
      return result;
    }
  };
  const showToast = (message, type, detail) => { setToast({ message, type, detail }); setTimeout(() => setToast(null), 4000); };
  const doSubmit = async (formData, draftId) => {
    const id = draftId || (editEntry ? editEntry.id : null);
    const data = { ...formData, status: STATUSES.SUBMITTED };
    const result = await saveEntry(data, id);
    if (result?.error) { showToast("Submit failed", "error", result.error); return; }
    const total = calcLabor(calcHours(formData.startTime, formData.endTime), getRate(formData.userId || currentUser.id)) + calcMaterialsTotal(formData.materials);
    setEditEntry(null); setNewEntry(false); setPage("entries");
    showToast("Entry submitted!", "success", fmt(total) + " for " + formData.category + " — Treasurer will review shortly");
    setShowConfetti(true);
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
  const doComment = async (entryId, message) => { const updated = await addComment(entryId, message); if (updated && viewEntry?.id === entryId) setViewEntry(updated); return updated; };

  // ── PURCHASE ENTRY OPERATIONS ─────────────────────────────────────────────
  const doPurchaseSave = async (formData, existingId) => {
    const result = await savePurchaseEntry(formData, existingId);
    if (result?.error) { showToast("Save failed", "error", result.error); return null; }
    if (result) { setViewPurchase(result); setEditPurchase(null); setNewPurchase(false); }
    return result;
  };
  const doPurchaseSubmit = async (formData, existingId) => {
    const data = { ...formData, status: "Submitted" };
    const result = await savePurchaseEntry(data, existingId);
    if (result?.error) { showToast("Submit failed", "error", result.error); return; }
    setEditPurchase(null); setNewPurchase(false); setPage("entries"); setEntryTab("purchases");
    showToast("Purchase submitted!", "success", fmt(formData.total) + " at " + formData.storeName + " — Treasurer will review shortly");
  };
  const doPurchaseDelete = async () => { if (editPurchase) { await deletePurchaseEntry(editPurchase.id); setEditPurchase(null); setPage("entries"); showToast("Purchase draft deleted", "success"); } };
  const doPurchaseApprove = async (idOrNotes, notesArg) => {
    // Called as (notes) from detail view, or (id, notes) from review queue
    // Detect: if second arg exists, first is ID. Otherwise check if first looks like a UUID.
    const isIdCall = notesArg !== undefined || (typeof idOrNotes === "string" && idOrNotes.length > 20 && idOrNotes.includes("-"));
    const id = isIdCall ? idOrNotes : viewPurchase?.id;
    const notes = isIdCall ? (notesArg || "") : (idOrNotes || "");
    if (!id) return;
    const updated = await approvePurchaseEntry(id, notes);
    if (updated) {
      if (viewPurchase?.id === id) setViewPurchase(updated);
      showToast("Purchase approved", "success", fmt(updated.total) + " at " + updated.storeName);
    }
  };
  const doPurchaseReject = async (idOrNotes, notesArg) => {
    const isIdCall = notesArg !== undefined || (typeof idOrNotes === "string" && idOrNotes.length > 20 && idOrNotes.includes("-"));
    const id = isIdCall ? idOrNotes : viewPurchase?.id;
    const notes = isIdCall ? (notesArg || "") : (idOrNotes || "");
    if (!id) return;
    const updated = await rejectPurchaseEntry(id, notes);
    if (updated) {
      if (viewPurchase?.id === id) setViewPurchase(updated);
      showToast("Purchase returned for edits", "error");
    }
  };
  const doPurchaseMarkPaid = async (idOrDetails, detailsArg) => {
    const isIdCall = detailsArg !== undefined || (typeof idOrDetails === "string" && idOrDetails.length > 20 && idOrDetails.includes("-"));
    const id = isIdCall ? idOrDetails : viewPurchase?.id;
    const details = isIdCall ? (detailsArg || {}) : (idOrDetails || {});
    if (!id) return;
    const updated = await markPurchasePaid(id, details);
    if (updated) {
      if (viewPurchase?.id === id) setViewPurchase(updated);
      showToast("Purchase marked as paid", "success");
    }
  };
  const doDecline = async (notes) => {
    if (!viewEntry) return;
    const u = users.find(x => x.id === viewEntry.userId);
    const updated = await rejectEntry(viewEntry.id, notes);
    if (updated) { setViewEntry(updated); showToast("Entry declined", "error", (u?.name || "Member") + " will be notified"); }
  };
  const doTrash = async (entry, comment, action) => {
    const u = users.find(x => x.id === entry.userId);
    const updated = await trashEntry(entry.id, comment, action || "Moved to Trash");
    if (updated) { setViewEntry(null); showToast("Moved to Trash", "success", (u?.name || "Member") + " — " + entry.category); }
  };
  const doRestore = async (entry) => {
    // Restore to Draft (safe default regardless of previous status)
    const updated = await restoreEntry(entry.id, STATUSES.DRAFT);
    if (updated) { setViewEntry(updated); showToast("Entry restored to Draft", "success"); }
  };
  const doTrashFromList = async (entry, comment) => {
    const u = users.find(x => x.id === entry.userId);
    const updated = await trashEntry(entry.id, comment, "Moved to Trash");
    if (updated) showToast("Moved to Trash", "success", (u?.name || "Member") + " — " + entry.category);
  };
  // Quick approve/reject from review queue (without opening detail)
  const doApproveEntry = async (id, notes) => {
    setFlashApproveId(id);
    setTimeout(async () => {
      await approveEntry(id, notes);
      setFlashApproveId(null);
      const e = entries.find(x => x.id === id); const u = users.find(x => x.id === e?.userId); showToast("Entry approved", "success", u?.name + " — " + (e?.category || ""));
    }, 380);
  };
  const doRejectEntry = async (id, notes) => { await rejectEntry(id, notes); const e = entries.find(x => x.id === id); const u = users.find(x => x.id === e?.userId); showToast("Entry returned for edits", "error", u?.name + " will be notified"); };
  const doNeedsInfo = async (id, notes) => { await needsInfoEntry(id, notes); const e = entries.find(x => x.id === id); const u = users.find(x => x.id === e?.userId); showToast("Needs Info requested", "info", u?.name + " will be notified to add details"); };
  const doBulkApprove = async (ids) => {
    const results = await bulkApprove(ids);
    showToast(results.length + " " + (results.length === 1 ? "entry" : "entries") + " approved", "success", "");
    return results;
  };

  // Dashboard stats — memoized so it only recalculates when entries/users/settings change
  const dashStats = useMemo(() => {
    if (!currentUser) return { total: 0, approved: 0, pending: 0, monthReimb: 0, paid: 0, ytdReimb: 0, monthHours: 0, pendingPayout: 0, purchaseCount: 0, purchaseTotal: 0 };
    const relevant = isTreasurer ? entries : entries.filter(e => e.userId === currentUser.id);
    const approved = relevant.filter(e => e.status === STATUSES.APPROVED || e.status === STATUSES.PAID);
    const thisMonth = approved.filter(e => e.date.startsWith(new Date().toISOString().slice(0, 7)));
    const thisYear = approved.filter(e => e.date.startsWith(String(new Date().getFullYear())));
    let monthReimb = 0, ytdReimb = 0, monthHours = 0, pendingPayout = 0;
    thisMonth.forEach(e => { const h = calcHours(e.startTime, e.endTime); const r = getRate(e.userId); monthReimb += calcLabor(h, r) + calcMaterialsTotal(e.materials); monthHours += h; });
    thisYear.forEach(e => { const h = calcHours(e.startTime, e.endTime); const r = getRate(e.userId); ytdReimb += calcLabor(h, r) + calcMaterialsTotal(e.materials); });
    relevant.filter(e => e.status === STATUSES.APPROVED).forEach(e => { const h = calcHours(e.startTime, e.endTime); const r = getRate(e.userId); pendingPayout += calcLabor(h, r) + calcMaterialsTotal(e.materials); });
    // Purchase totals
    const relevantPurchases = isTreasurer ? purchaseEntries : purchaseEntries.filter(e => e.userId === currentUser.id);
    const approvedPurchases = relevantPurchases.filter(e => e.status === "Approved" || e.status === "Paid");
    const monthPurchases = approvedPurchases.filter(e => e.date.startsWith(new Date().toISOString().slice(0, 7)));
    const yearPurchases = approvedPurchases.filter(e => e.date.startsWith(String(new Date().getFullYear())));
    monthPurchases.forEach(e => { monthReimb += e.total; });
    yearPurchases.forEach(e => { ytdReimb += e.total; });
    relevantPurchases.filter(e => e.status === "Approved").forEach(e => { pendingPayout += e.total; });
    return { total: relevant.length + relevantPurchases.length, approved: approved.length + approvedPurchases.length, pending: relevant.filter(e => e.status === STATUSES.SUBMITTED).length + relevantPurchases.filter(e => e.status === "Submitted").length, monthReimb, paid: relevant.filter(e => e.status === STATUSES.PAID).length + relevantPurchases.filter(e => e.status === "Paid").length, ytdReimb, monthHours, pendingPayout, purchaseCount: relevantPurchases.length, purchaseTotal: approvedPurchases.reduce((s, e) => s + e.total, 0) };
  }, [entries, purchaseEntries, users, settings, currentUser?.id, isTreasurer]);

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
            {authMode === "forgot" ? (
              <div>
                <button style={{ ...S.btnGhost, fontSize: 13, marginBottom: 20, padding: "4px 0" }} onClick={() => { setAuthMode("login"); setForgotError(""); setForgotSent(false); }}>← Back to Sign In</button>
                {forgotSent ? (
                  <div style={{ textAlign: "center", padding: "20px 0" }}>
                    <div style={{ fontSize: 44, marginBottom: 12 }}>📬</div>
                    <div style={{ fontSize: 17, fontWeight: 600, color: BRAND.navy, marginBottom: 8, fontFamily: BRAND.serif }}>Check your inbox</div>
                    <div style={{ fontSize: 14, color: BRAND.textMuted, lineHeight: 1.7, marginBottom: 24 }}>We sent a reset link to <strong>{forgotEmail}</strong>. Click it to set a new password. Check spam if it doesn't arrive within a minute.</div>
                    <button style={{ ...S.btnGhost, fontSize: 13 }} onClick={() => { setForgotSent(false); setForgotEmail(""); }}>Try a different email</button>
                  </div>
                ) : (
                  <form onSubmit={e => { e.preventDefault(); handleForgotPassword(); }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: BRAND.navy, marginBottom: 6, fontFamily: BRAND.serif }}>Reset your password</div>
                    <div style={{ fontSize: 13, color: BRAND.textMuted, marginBottom: 20 }}>Enter your email and we'll send you a reset link.</div>
                    <label style={S.label} htmlFor="forgot-email">Email Address</label>
                    <input id="forgot-email" type="email" autoComplete="email" style={{ ...S.input, marginBottom: forgotError ? 8 : 20, fontSize: 15, padding: "12px 16px" }} value={forgotEmail} onChange={e => { setForgotEmail(e.target.value); setForgotError(""); }} placeholder="you@example.com" autoFocus />
                    {forgotError && <div style={{ color: BRAND.error, fontSize: 13, marginBottom: 12, display: "flex", alignItems: "flex-start", gap: 6 }}><Icon name="alert" size={14} /><span>{forgotError}</span></div>}
                    <button type="submit" style={{ ...S.btnPrimary, width: "100%", justifyContent: "center", padding: "12px 20px", fontSize: 15, borderRadius: 8, opacity: forgotLoading ? 0.6 : 1 }} disabled={forgotLoading}>{forgotLoading ? "Sending..." : "Send Reset Link"}</button>
                  </form>
                )}
              </div>
            ) : authMode === "reset" ? (
              <div>
                {resetDone ? (
                  <div style={{ textAlign: "center", padding: "20px 0" }}>
                    <div style={{ width: 48, height: 48, borderRadius: 24, background: BRAND.success + "15", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: BRAND.success }}><Icon name="check" size={24} /></div>
                    <div style={{ fontSize: 17, fontWeight: 600, color: BRAND.navy, marginBottom: 8, fontFamily: BRAND.serif }}>Password updated!</div>
                    <div style={{ fontSize: 14, color: BRAND.textMuted, marginBottom: 24 }}>You can now sign in with your new password.</div>
                    <button style={{ ...S.btnPrimary, width: "100%", justifyContent: "center", padding: "12px 20px", fontSize: 15, borderRadius: 8 }} onClick={() => setAuthMode("login")}>Go to Sign In</button>
                  </div>
                ) : (
                  <form onSubmit={e => { e.preventDefault(); handleResetPassword(); }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: BRAND.navy, marginBottom: 6, fontFamily: BRAND.serif }}>Choose a new password</div>
                    <div style={{ fontSize: 13, color: BRAND.textMuted, marginBottom: 20 }}>Pick something strong that you haven't used before.</div>
                    <label style={S.label} htmlFor="reset-new">New Password</label>
                    <input id="reset-new" type="password" autoComplete="new-password" style={{ ...S.input, marginBottom: 16, fontSize: 15, padding: "12px 16px" }} value={resetNewPass} onChange={e => { setResetNewPass(e.target.value); setResetError(""); }} placeholder="Min 6 characters" autoFocus />
                    <label style={S.label} htmlFor="reset-confirm">Confirm New Password</label>
                    <input id="reset-confirm" type="password" autoComplete="new-password" style={{ ...S.input, marginBottom: resetError ? 8 : 20, fontSize: 15, padding: "12px 16px", borderColor: resetError ? BRAND.error : BRAND.border }} value={resetConfPass} onChange={e => { setResetConfPass(e.target.value); setResetError(""); }} placeholder="Repeat new password" />
                    {resetError && <div style={{ color: BRAND.error, fontSize: 13, marginBottom: 12, display: "flex", alignItems: "flex-start", gap: 6 }}><Icon name="alert" size={14} /><span>{resetError}</span></div>}
                    <button type="submit" style={{ ...S.btnPrimary, width: "100%", justifyContent: "center", padding: "12px 20px", fontSize: 15, borderRadius: 8, opacity: resetLoading ? 0.6 : 1 }} disabled={resetLoading}>{resetLoading ? "Updating..." : "Update Password"}</button>
                  </form>
                )}
              </div>
            ) : authMode === "login" ? (
              <form onSubmit={e => { e.preventDefault(); handleLogin(); }} autoComplete="on">
                <label style={S.label} htmlFor="login-email">Email Address</label>
                <input id="login-email" name="email" type="email" autoComplete="username" style={{ ...S.input, marginBottom: 16, fontSize: 15, padding: "12px 16px" }} value={loginEmail} onChange={e => { setLoginEmail(e.target.value); setLoginError(""); }} placeholder="you@example.com" autoFocus />
                <label style={S.label} htmlFor="login-password">Password</label>
                <input id="login-password" name="password" type="password" autoComplete="current-password" style={{ ...S.input, marginBottom: loginError ? 8 : 12, fontSize: 15, padding: "12px 16px", borderColor: loginError ? BRAND.error : BRAND.border }} value={loginPassword} onChange={e => { setLoginPassword(e.target.value); setLoginError(""); }} placeholder="Enter your password" />
                {loginError && <div style={{ color: BRAND.error, fontSize: 13, marginBottom: 8, display: "flex", alignItems: "flex-start", gap: 6 }}><Icon name="alert" size={14} /><span>{loginError}</span></div>}
                <div style={{ textAlign: "right", marginBottom: 20 }}>
                  <button type="button" style={{ background: "none", border: "none", color: BRAND.navy, fontSize: 13, cursor: "pointer", fontFamily: BRAND.sans, textDecoration: "underline", padding: 0 }} onClick={() => { setAuthMode("forgot"); setForgotEmail(loginEmail); setForgotError(""); setForgotSent(false); }}>Forgot password?</button>
                </div>
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
  const trashCount = entries.filter(e => e.status === STATUSES.TRASH).length;
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: "home" },
    { id: "entries", label: isTreasurer ? "All Entries" : "My Entries", icon: "file" },
    ...(!isTreasurer ? [{ id: "insights", label: "Community Insights", icon: "insights" }] : []),
    ...(!isTreasurer ? [{ id: "help", label: "Help", icon: "help" }] : []),
    ...(isTreasurer ? [{ id: "review", label: "Review Queue", icon: "inbox", badge: pendingCount }] : []),
    ...(isTreasurer ? [{ id: "payment", label: "Payment Run", icon: "dollar" }] : []),
    ...(isTreasurer ? [{ id: "reports", label: "Reports", icon: "chart" }] : []),
    ...(isTreasurer ? [{ id: "insights", label: "Community Insights", icon: "insights" }] : []),
    ...(isTreasurer ? [{ id: "trash", label: "Trash", icon: "trash", badge: trashCount || 0 }] : []),
    ...(isTreasurer ? [{ id: "settings", label: "Settings", icon: "settings" }] : []),
    ...(isTreasurer ? [{ id: "help", label: "Help", icon: "help" }] : []),
  ];
  const bottomTabs = isTreasurer ? [
    { id: "dashboard", label: "Home", icon: "home", iconFilled: "homeFilled", color: "#2E7D32", tint: "#2E7D3218" },
    { id: "entries", label: "Entries", icon: "clipboard", iconFilled: "clipboardFilled", color: "#1565C0", tint: "#1565C018" },
    { id: "review", label: "Review", icon: "shieldCheck", iconFilled: "shieldCheckFilled", color: BRAND.brick, tint: BRAND.brick + "18", badge: pendingCount },
    { id: "__more__", label: "More", icon: "settings", iconFilled: "settings", color: BRAND.navy, tint: BRAND.navy + "18", badge: trashCount || 0 },
  ] : [
    { id: "dashboard", label: "Home", icon: "home", iconFilled: "homeFilled", color: "#2E7D32", tint: "#2E7D3218" },
    { id: "entries", label: "Entries", icon: "clipboard", iconFilled: "clipboardFilled", color: "#1565C0", tint: "#1565C018" },
    { id: "insights", label: "Insights", icon: "insights", iconFilled: "insightsFilled", color: "#6A1B9A", tint: "#6A1B9A18" },
    { id: "help", label: "Help", icon: "help", iconFilled: "help", color: "#B8860B", tint: "#B8860B18" },
  ];

  // ══════════════════════════════════════════════════════════════════════════
  // PAGE CONTENT
  // ══════════════════════════════════════════════════════════════════════════
  const renderPage = () => {
    if (pageLoading) return <PageLoader page={pageLoading} />;
    if (newEntry || editEntry) {
      // Smart defaults: pre-fill from member's most recent entry
      const lastEntry = (() => {
        const userEntries = entries.filter(e => e.userId === currentUser.id).sort((a, b) => b.date.localeCompare(a.date));
        return userEntries.length > 0 ? userEntries[0] : null;
      })();
      const preFilled = !editEntry && lastEntry;
      const smartEntry = editEntry || (lastEntry ? { category: lastEntry.category, location: lastEntry.location || "", userId: currentUser.id } : null);
      return (
      <div className="fade-in">
        <h2 style={{ ...S.h2, marginBottom: preFilled ? 8 : 24 }}>{editEntry ? "Edit Entry" : "New Work Entry"}</h2>
        {preFilled && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, padding: "8px 14px", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, fontSize: 13, color: "#1d4ed8" }}>
            <span>✨</span>
            <span>Pre-filled from your last entry <strong>({lastEntry.category}{lastEntry.location ? " · " + lastEntry.location : ""})</strong>. Update any fields that differ.</span>
          </div>
        )}
        <div style={S.card}><EntryForm entry={smartEntry} settings={settings} users={users} currentUser={currentUser} onSave={doSave} onSubmit={previewAsId ? () => {} : doSubmit} onCancel={() => { setNewEntry(false); setEditEntry(null); }} onDelete={previewAsId ? () => {} : doDelete} disableAutoSave={!!previewAsId} mob={mob} /></div></div>
    );}
    // Purchase entry form
    if (newPurchase || editPurchase) {
      return (
        <div className="fade-in">
          <h2 style={{ ...S.h2, marginBottom: 24 }}>{editPurchase ? "Edit Purchase" : "New Purchase Entry"}</h2>
          <div style={S.card}><PurchaseEntryForm entry={editPurchase} settings={settings} currentUser={currentUser} onSave={doPurchaseSave} onSubmit={doPurchaseSubmit} onCancel={() => { setNewPurchase(false); setEditPurchase(null); }} onDelete={doPurchaseDelete} mob={mob} /></div>
        </div>
      );
    }
    // Purchase detail view
    if (viewPurchase) {
      const fresh = purchaseEntries.find(e => e.id === viewPurchase.id) || viewPurchase;
      return <PurchaseEntryDetail entry={fresh} settings={settings} users={users} currentUser={viewAs} onBack={() => setViewPurchase(null)} onEdit={() => { setEditPurchase(fresh); setViewPurchase(null); }} onApprove={doPurchaseApprove} onReject={doPurchaseReject} onMarkPaid={doPurchaseMarkPaid} mob={mob} />;
    }
    if (viewEntry) {
      const fresh = entries.find(e => e.id === viewEntry.id) || viewEntry;
      return <EntryDetail entry={fresh} settings={settings} users={users} currentUser={viewAs} onBack={() => setViewEntry(null)} onEdit={() => { setEditEntry(fresh); setViewEntry(null); }} onApprove={doApprove} onReject={doDecline} onTrash={doTrash} onRestore={doRestore} onMarkPaid={doMarkPaid} onComment={doComment} onSecondApprove={doSecondApprove} onLightbox={(src, alt) => setLightboxSrc({ src, alt })} onDelete={async (e) => { await deleteEntry(e.id); setViewEntry(null); showToast("Entry deleted", "success"); }} onDuplicate={(e) => { setViewEntry(null); setEditEntry(null); setNewEntry(true); setTimeout(() => setEditEntry({ ...e, id: null, status: STATUSES.DRAFT, date: todayStr(), startTime: nowTime(), endTime: "", preImages: [], postImages: [], reviewerNotes: "", reviewedAt: "", paidAt: "" }), 50); }} mob={mob} />;
    }
    if (page === "dashboard") {
      const recent = myEntries.slice(0, 5);
      return (
        <div className="fade-in">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <h2 style={S.h2}>Dashboard</h2>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button onClick={() => setShowHelp(true)} aria-label="Help — User Guide" style={{ background: "none", border: "1px solid " + BRAND.borderLight, color: BRAND.textMuted, padding: "6px 12px", cursor: "pointer", borderRadius: 8, fontSize: 12, fontWeight: 600, fontFamily: BRAND.sans, display: "flex", alignItems: "center", gap: 5, transition: "all 150ms" }} onMouseEnter={e => { e.currentTarget.style.background = BRAND.bgSoft; e.currentTarget.style.color = BRAND.navy; }} onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = BRAND.textMuted; }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>?</span> Help
              </button>
              {!mob && (
                <div style={{ display: "flex", gap: 8, position: "relative" }}>
                  <button style={S.btnPrimary} onClick={() => setNewEntryType(t => t ? null : "chooser")}><Icon name="plus" size={16} /> New Entry</button>
                  {newEntryType === "chooser" && (<>
                    <div style={{ position: "fixed", inset: 0, zIndex: 29 }} onClick={() => setNewEntryType(null)} />
                    <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 6, background: BRAND.white, border: "1px solid " + BRAND.borderLight, borderRadius: 10, boxShadow: "0 8px 32px rgba(0,0,0,0.12)", zIndex: 30, minWidth: 220, overflow: "hidden" }}>
                      <button style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", width: "100%", border: "none", background: "none", cursor: "pointer", fontFamily: BRAND.sans, fontSize: 14, color: BRAND.charcoal, textAlign: "left" }}
                        onMouseEnter={ev => ev.currentTarget.style.background = BRAND.bgSoft} onMouseLeave={ev => ev.currentTarget.style.background = "none"}
                        onClick={() => { setNewEntryType(null); setNewEntry(true); }}>
                        <span style={{ fontSize: 20 }}>🔨</span><div><div style={{ fontWeight: 600 }}>Work Entry</div><div style={{ fontSize: 12, color: BRAND.textLight }}>Log labor hours & tasks</div></div>
                      </button>
                      <div style={{ borderTop: "1px solid " + BRAND.borderLight }} />
                      <button style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", width: "100%", border: "none", background: "none", cursor: "pointer", fontFamily: BRAND.sans, fontSize: 14, color: BRAND.charcoal, textAlign: "left" }}
                        onMouseEnter={ev => ev.currentTarget.style.background = BRAND.bgSoft} onMouseLeave={ev => ev.currentTarget.style.background = "none"}
                        onClick={() => { setNewEntryType(null); setNewPurchase(true); }}>
                        <span style={{ fontSize: 20 }}>🛍️</span><div><div style={{ fontWeight: 600 }}>Purchase Entry</div><div style={{ fontSize: 12, color: BRAND.textLight }}>Log expenses & receipts</div></div>
                      </button>
                    </div>
                  </>)}
                </div>
              )}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr 1fr" : "repeat(4, 1fr)", gap: mob ? 8 : 16, marginBottom: mob ? 16 : 28 }}>
            {isTreasurer ? (<>
              <StatCard label="Total Entries" value={dashStats.total} icon="file" />
              <StatCard label="Pending Review" value={dashStats.pending} icon="clock" accentColor={BRAND.warning} />
              <StatCard label="Approved" value={dashStats.approved} icon="check" accentColor={BRAND.success} />
              <StatCard label="This Month" value={fmt(dashStats.monthReimb)} icon="dollar" accentColor={BRAND.brick} />
            </>) : (<>
              <StatCard label="Owed to You" value={fmt(dashStats.pendingPayout)} icon="dollar" accentColor={BRAND.success} />
              <StatCard label="Awaiting Review" value={dashStats.pending || 0} icon="clock" accentColor={BRAND.warning} />
              <StatCard label="This Month" value={fmt(dashStats.monthReimb)} icon="chart" accentColor={BRAND.brick} />
              <StatCard label="Year to Date" value={fmt(dashStats.ytdReimb)} icon="check" accentColor="#2563eb" />
            </>)}
          </div>
          {isTreasurer && pendingCount > 0 && (
            <div style={{ ...S.card, background: "#FFF8F0", borderColor: "#F0D4A8", borderLeft: "4px solid " + BRAND.warning, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}><Icon name="alert" size={20} /><span style={{ fontWeight: 600 }}>{pendingCount === 1 ? "1 entry" : pendingCount + " entries"} awaiting your review</span></div>
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
              <div style={{ marginBottom: 8 }}>
                  <AnimatedBar pct={pct} color={barColor} height={12} radius={6} />
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

          {/* ── TREASURER COMMAND CENTER ── */}
          {isTreasurer && (() => {
            const yr = String(new Date().getFullYear());
            const mo = String(new Date().getMonth() + 1).padStart(2, "0");
            const thisMonthStr = yr + "-" + mo;
            const lastMonthStr = (() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); })();

            // Unpaid approved entries grouped by user
            const unpaidApproved = entries.filter(e => e.status === STATUSES.APPROVED);
            const unpaidTotal = unpaidApproved.reduce((s, e) => { const h = calcHours(e.startTime, e.endTime); const r = getRate(e.userId); return s + calcLabor(h, r) + calcMaterialsTotal(e.materials); }, 0);
            const needsInfoCount = entries.filter(e => e.status === STATUSES.NEEDS_INFO).length;

            // Oldest pending entry age
            const submitted = entries.filter(e => e.status === STATUSES.SUBMITTED && e.submittedAt);
            const oldestDays = submitted.length ? Math.floor((Date.now() - new Date(submitted.sort((a,b) => a.submittedAt.localeCompare(b.submittedAt))[0].submittedAt).getTime()) / 86400000) : 0;

            // Member activity this month vs last month
            const memberActivity = users.filter(u => u.role === ROLES.MEMBER).map(u => {
              const thisM = entries.filter(e => e.userId === u.id && e.date?.startsWith(thisMonthStr) && e.status !== STATUSES.TRASH).length;
              const lastM = entries.filter(e => e.userId === u.id && e.date?.startsWith(lastMonthStr) && e.status !== STATUSES.TRASH).length;
              return { ...u, thisMonth: thisM, lastMonth: lastM };
            }).sort((a, b) => b.thisMonth - a.thisMonth);

            return (
              <div style={{ marginBottom: 16 }}>
                {/* Action strip */}
                <div style={{ display: "flex", gap: 10, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
                  {[
                    { label: "Pending Review", value: pendingCount, sub: pendingCount > 0 ? fmt(entries.filter(e=>e.status===STATUSES.SUBMITTED).reduce((s,e)=>{const h=calcHours(e.startTime,e.endTime);const r=getRate(e.userId);return s+calcLabor(h,r)+calcMaterialsTotal(e.materials);},0)) : "All clear", color: pendingCount > 0 ? BRAND.warning : BRAND.success, page: "review", emoji: "🕐" },
                    { label: "Awaiting Payment", value: unpaidApproved.length, sub: unpaidApproved.length > 0 ? fmt(unpaidTotal) + " owed" : "All paid", color: unpaidApproved.length > 0 ? "#1565C0" : BRAND.success, page: "payment", emoji: "💳" },
                    { label: "Needs Info", value: needsInfoCount, sub: needsInfoCount > 0 ? "Awaiting member reply" : "None", color: needsInfoCount > 0 ? "#C2410C" : BRAND.success, page: "entries", emoji: "💬" },
                  ].map(item => (
                    <button key={item.label} onClick={() => nav(item.page)} style={{ flex: "0 0 auto", minWidth: 140, padding: "14px 16px", borderRadius: 12, border: "1px solid " + item.color + "30", background: item.color + "08", cursor: "pointer", fontFamily: BRAND.sans, textAlign: "left", transition: "all 200ms" }}
                      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 20px " + item.color + "22"; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
                      <div style={{ fontSize: 22, marginBottom: 4 }}>{item.emoji}</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: item.color, lineHeight: 1 }}>{item.value}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: BRAND.charcoal, marginTop: 2 }}>{item.label}</div>
                      <div style={{ fontSize: 11, color: BRAND.textMuted, marginTop: 1 }}>{item.sub}</div>
                    </button>
                  ))}
                  {oldestDays > 0 && (
                    <button onClick={() => nav("review")} style={{ flex: "0 0 auto", minWidth: 140, padding: "14px 16px", borderRadius: 12, border: "1px solid " + (oldestDays >= 7 ? BRAND.error : BRAND.warning) + "40", background: (oldestDays >= 7 ? BRAND.error : BRAND.warning) + "08", cursor: "pointer", fontFamily: BRAND.sans, textAlign: "left" }}>
                      <div style={{ fontSize: 22, marginBottom: 4 }}>⏳</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: oldestDays >= 7 ? BRAND.error : BRAND.warning, lineHeight: 1 }}>{oldestDays}d</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: BRAND.charcoal, marginTop: 2 }}>Oldest Pending</div>
                      <div style={{ fontSize: 11, color: BRAND.textMuted }}>{oldestDays >= 7 ? "⚠️ Overdue" : "Within SLA"}</div>
                    </button>
                  )}
                </div>

                {/* Member activity table */}
                {memberActivity.length > 0 && (
                  <div style={{ ...S.card, padding: 0, overflow: "hidden", marginBottom: 16 }}>
                    <div style={{ padding: "14px 20px", borderBottom: "1px solid " + BRAND.borderLight, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: BRAND.navy }}>Member Activity</span>
                      <span style={{ fontSize: 12, color: BRAND.textLight }}>This month vs last month</span>
                    </div>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead><tr style={{ background: BRAND.bgSoft }}>
                          <th style={{ ...S.th, textAlign: "left" }}>Member</th>
                          <th style={{ ...S.th, textAlign: "right" }}>This Month</th>
                          <th style={{ ...S.th, textAlign: "right" }}>Last Month</th>
                          <th style={{ ...S.th, textAlign: "right" }}>YTD Total</th>
                        </tr></thead>
                        <tbody>{memberActivity.map((u, i) => {
                          const ytd = entries.filter(e => e.userId === u.id && e.date?.startsWith(yr) && (e.status === STATUSES.APPROVED || e.status === STATUSES.PAID)).reduce((s,e)=>{const h=calcHours(e.startTime,e.endTime);const r=getRate(u.id);return s+calcLabor(h,r)+calcMaterialsTotal(e.materials);},0);
                          const trend = u.thisMonth > u.lastMonth ? "↑" : u.thisMonth < u.lastMonth ? "↓" : "→";
                          const trendColor = u.thisMonth > u.lastMonth ? BRAND.success : u.thisMonth < u.lastMonth ? BRAND.error : BRAND.textLight;
                          return (
                            <tr key={u.id} style={{ background: i % 2 ? BRAND.bgSoft : BRAND.white, borderBottom: "1px solid " + BRAND.borderLight }}>
                              <td style={{ padding: "10px 16px", fontWeight: 600, color: BRAND.charcoal }}>{u.name}</td>
                              <td style={{ padding: "10px 12px", textAlign: "right" }}>
                                <span style={{ fontWeight: 700, color: BRAND.navy }}>{u.thisMonth}</span>
                                <span style={{ marginLeft: 4, color: trendColor, fontWeight: 700 }}>{trend}</span>
                              </td>
                              <td style={{ padding: "10px 12px", textAlign: "right", color: BRAND.textMuted }}>{u.lastMonth}</td>
                              <td style={{ padding: "10px 16px", textAlign: "right", fontWeight: 600, color: BRAND.brick }}>{fmt(ytd)}</td>
                            </tr>
                          );
                        })}</tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── MEMBER DASHBOARD ── */}
          {!isTreasurer && (() => {
            const yr = String(new Date().getFullYear());
            const myYrEntries = myEntries.filter(e => e.date?.startsWith(yr) && e.status !== STATUSES.TRASH);
            const ytdApproved = myYrEntries.filter(e => e.status === STATUSES.APPROVED).reduce((s,e)=>{const h=calcHours(e.startTime,e.endTime);const r=getRate(e.userId);return s+calcLabor(h,r)+calcMaterialsTotal(e.materials);},0);
            const ytdPaid = myYrEntries.filter(e => e.status === STATUSES.PAID).reduce((s,e)=>{const h=calcHours(e.startTime,e.endTime);const r=getRate(e.userId);return s+calcLabor(h,r)+calcMaterialsTotal(e.materials);},0);
            const pendingEntries = myEntries.filter(e => [STATUSES.SUBMITTED, STATUSES.AWAITING_SECOND].includes(e.status));
            const rejectedEntries = myEntries.filter(e => e.status === STATUSES.REJECTED);
            const needsInfoEntries = myEntries.filter(e => e.status === STATUSES.NEEDS_INFO);

            // Average approval time from auditLog
            const approvedWithLog = myEntries.filter(e => (e.status === STATUSES.APPROVED || e.status === STATUSES.PAID) && e.submittedAt && e.reviewedAt);
            const avgApprovalDays = approvedWithLog.length ? (approvedWithLog.reduce((s,e) => s + (new Date(e.reviewedAt) - new Date(e.submittedAt)) / 86400000, 0) / approvedWithLog.length).toFixed(1) : null;

            // Pending entries with age
            const withAge = pendingEntries.map(e => ({ ...e, ageDays: e.submittedAt ? Math.floor((Date.now() - new Date(e.submittedAt).getTime()) / 86400000) : 0 })).sort((a,b) => b.ageDays - a.ageDays);

            if (myEntries.length === 0) return (
              <div style={{ ...S.card, background: "linear-gradient(135deg, #EEF2FF 0%, #F0FDF4 100%)", borderColor: "#C7D2FE", padding: mob ? 20 : 28, marginBottom: 16 }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>👋</div>
                <div style={{ fontFamily: BRAND.serif, fontSize: 20, fontWeight: 600, color: BRAND.navy, marginBottom: 8 }}>Welcome to {settings.hoaName}!</div>
                <div style={{ fontSize: 14, color: BRAND.charcoal, lineHeight: 1.7, marginBottom: 16 }}>Here's how reimbursement works:<br/>
                  <strong>1.</strong> Log your work — date, time, category, and what you did<br/>
                  <strong>2.</strong> Add materials and photos if applicable<br/>
                  <strong>3.</strong> Submit for review — the Treasurer will approve or request changes<br/>
                  <strong>4.</strong> Get reimbursed once approved</div>
                <button style={S.btnPrimary} onClick={() => setNewEntryType("chooser")}><Icon name="plus" size={16} /> Create Your First Entry</button>
              </div>
            );

            return (
              <div style={{ marginBottom: 16 }}>
                {/* ── ACTION REQUIRED banner — pinned to top ── */}
                {(rejectedEntries.length > 0 || needsInfoEntries.length > 0) && (
                  <div style={{ ...S.card, background: "#FFF5F5", borderColor: "#F0BABA", borderLeft: "4px solid " + BRAND.error, marginBottom: 16 }}>
                    <div style={{ fontWeight: 700, color: BRAND.error, marginBottom: 10 }}>⚠️ {rejectedEntries.length + needsInfoEntries.length} entr{rejectedEntries.length + needsInfoEntries.length === 1 ? "y needs" : "ies need"} your attention</div>
                    {[...rejectedEntries, ...needsInfoEntries].slice(0, 3).map(e => {
                      const total = calcLabor(calcHours(e.startTime, e.endTime), getRate(e.userId)) + calcMaterialsTotal(e.materials);
                      return (
                        <div key={e.id} onClick={() => setViewEntry(e)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#fff", borderRadius: 8, marginBottom: 6, cursor: "pointer", border: "1px solid #F0BABA" }}>
                          <StatusBadge status={e.status} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: BRAND.charcoal, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.category} — {e.description}</div>
                            {e.reviewerNotes && <div style={{ fontSize: 12, color: BRAND.textMuted, marginTop: 2 }}>"{e.reviewerNotes.slice(0, 60)}{e.reviewerNotes.length > 60 ? "…" : ""}"</div>}
                          </div>
                          <div style={{ fontWeight: 700, fontSize: 13, color: BRAND.navy, flexShrink: 0 }}>{fmt(total)}</div>
                        </div>
                      );
                    })}
                    {rejectedEntries.length + needsInfoEntries.length > 3 && (
                      <button style={{ ...S.btnGhost, fontSize: 12, marginTop: 4 }} onClick={() => { setFilterStatus(STATUSES.REJECTED); nav("entries"); }}>View all →</button>
                    )}
                  </div>
                )}
                {/* 1. YTD earnings summary */}
                <div style={{ ...S.card, background: "linear-gradient(135deg, #F0FDF4 0%, #E8EDF5 100%)", borderColor: "#B5CCAE", marginBottom: 16 }}>
                  <div style={{ fontFamily: BRAND.serif, fontSize: 16, fontWeight: 600, color: BRAND.navy, marginBottom: 14 }}>{yr} Earnings Summary</div>
                  <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr 1fr" : "repeat(4, 1fr)", gap: mob ? 12 : 16 }}>
                    {[
                      { label: "Approved", value: fmt(ytdApproved), color: BRAND.success, icon: "✓" },
                      { label: "Paid Out", value: fmt(ytdPaid), color: "#3B5998", icon: "💳" },
                      { label: "Pending", value: fmt(dashStats.pendingPayout || 0), color: BRAND.warning, icon: "⏳" },
                      { label: "Total Entries", value: myYrEntries.length, color: BRAND.navy, icon: "📋" },
                    ].map(s => (
                      <div key={s.label} style={{ textAlign: "center", padding: "12px 8px", background: "rgba(255,255,255,0.6)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.8)" }}>
                        <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
                        <div style={{ fontSize: mob ? 18 : 22, fontWeight: 800, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: 11, color: BRAND.textMuted, marginTop: 2, fontWeight: 600 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                  {/* 6-month rolling earnings bar chart */}
                  {(() => {
                    const months = [];
                    const now = new Date();
                    for (let i = 5; i >= 0; i--) {
                      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                      const key = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
                      const label = d.toLocaleDateString("en-US", { month: "short" });
                      months.push({ key, label });
                    }
                    const monthTotals = months.map(({ key, label }) => {
                      const total = myEntries
                        .filter(e => e.date?.startsWith(key) && (e.status === STATUSES.APPROVED || e.status === STATUSES.PAID) && e.status !== STATUSES.TRASH)
                        .reduce((s, e) => s + calcLabor(calcHours(e.startTime, e.endTime), getRate(e.userId)) + calcMaterialsTotal(e.materials), 0);
                      return { key, label, total };
                    });
                    const maxVal = Math.max(...monthTotals.map(m => m.total), 1);
                    const hasAnyData = monthTotals.some(m => m.total > 0);
                    if (!hasAnyData) return null;
                    return (
                      <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.5)" }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: BRAND.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>6-Month Earnings</div>
                        <div style={{ display: "flex", alignItems: "flex-end", gap: mob ? 6 : 10, height: 52 }}>
                          {monthTotals.map(({ key, label, total }) => {
                            const pct = maxVal > 0 ? (total / maxVal) : 0;
                            const barH = Math.max(pct * 44, total > 0 ? 4 : 2);
                            const isCurrent = key === (now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0"));
                            return (
                              <div key={key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }} title={label + ": " + fmt(total)}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: total > 0 ? BRAND.navy : "transparent" }}>{total > 0 ? fmt(total).replace(".00","") : ""}</div>
                                <div style={{ width: "100%", height: barH, borderRadius: "3px 3px 0 0", background: isCurrent ? BRAND.brick : (total > 0 ? BRAND.navy : BRAND.borderLight), transition: "height 400ms ease", minHeight: 2 }} />
                                <div style={{ fontSize: 10, color: isCurrent ? BRAND.brick : BRAND.textMuted, fontWeight: isCurrent ? 700 : 400 }}>{label}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                  {avgApprovalDays && (
                    <div style={{ marginTop: 12, padding: "8px 12px", background: "rgba(255,255,255,0.5)", borderRadius: 8, fontSize: 12, color: BRAND.textMuted, display: "flex", gap: 6, alignItems: "center" }}>
                      <span>⚡</span>
                      <span>Your entries are typically approved in <strong style={{ color: BRAND.navy }}>{avgApprovalDays} days</strong></span>
                    </div>
                  )}
                </div>

                {/* 2. Pending entries with age */}
                {withAge.length > 0 && (
                  <div style={{ ...S.card, padding: 0, overflow: "hidden", marginBottom: 16 }}>
                    <div style={{ padding: "14px 20px", borderBottom: "1px solid " + BRAND.borderLight }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: BRAND.navy }}>⏳ Awaiting Review</span>
                      <span style={{ fontSize: 12, color: BRAND.textLight, marginLeft: 8 }}>{withAge.length} entr{withAge.length === 1 ? "y" : "ies"}</span>
                    </div>
                    <div style={{ padding: "8px 0" }}>
                      {withAge.map(e => {
                        const ageColor = e.ageDays >= 7 ? BRAND.error : e.ageDays >= 3 ? BRAND.warning : BRAND.success;
                        const total = calcLabor(calcHours(e.startTime, e.endTime), getRate(e.userId)) + calcMaterialsTotal(e.materials);
                        return (
                          <div key={e.id} onClick={() => setViewEntry(e)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", cursor: "pointer", borderBottom: "1px solid " + BRAND.borderLight + "80", transition: "background 150ms" }}
                            onMouseEnter={ev => ev.currentTarget.style.background = BRAND.bgSoft}
                            onMouseLeave={ev => ev.currentTarget.style.background = "transparent"}>
                            <div style={{ width: 8, height: 8, borderRadius: 4, background: ageColor, flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 600, fontSize: 13, color: BRAND.charcoal, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.category} — {e.description}</div>
                              <div style={{ fontSize: 11, color: BRAND.textLight, marginTop: 2 }}>{formatDate(e.date)}</div>
                            </div>
                            <div style={{ textAlign: "right", flexShrink: 0 }}>
                              <div style={{ fontWeight: 700, fontSize: 13, color: BRAND.navy }}>{fmt(total)}</div>
                              <div style={{ fontSize: 11, fontWeight: 600, color: ageColor }}>{e.ageDays === 0 ? "Today" : e.ageDays + "d ago"}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>
            );
          })()}

          <div style={S.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}><h3 style={S.h3}>Recent Entries</h3><button style={S.btnGhost} onClick={() => setPage("entries")}>View all →</button></div>
            {recent.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 20px" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: BRAND.navy, marginBottom: 6 }}>No entries yet</div>
                <div style={{ fontSize: 13, color: BRAND.textLight, marginBottom: 16 }}>{isTreasurer ? "Entries will appear here once members submit work." : "Log your first work session to get started."}</div>
                {!isTreasurer && <button style={S.btnPrimary} onClick={() => setNewEntryType("chooser")}><Icon name="plus" size={15} /> New Entry</button>}
              </div>
            )
            : mob ? recent.map(e => <EntryCard key={e.id + "-" + page} entry={e} users={users} settings={settings} currentUser={viewAs} onClick={() => setViewEntry(e)} onEdit={(e) => { setEditEntry(e); }} onSubmit={(e) => doSubmit(e, e.id)} onApprove={(e) => doApproveEntry(e.id, "")} onReject={(e) => setViewEntry(e)} onDelete={(e) => doTrashFromList(e, "")} />)
            : (
              <div style={{ border: "1px solid " + BRAND.borderLight, borderRadius: 8, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead><tr><th scope="col" style={S.th}>Date</th>{isTreasurer && <th scope="col" style={S.th}>Member</th>}<th scope="col" style={S.th}>Category</th><th scope="col" style={S.th}>Description</th><th scope="col" style={{ ...S.th, textAlign: "right" }}>Total</th><th scope="col" style={S.th}>Status</th></tr></thead>
                  <tbody>{recent.map((e, i) => { const u = users.find(u => u.id === e.userId); const h = calcHours(e.startTime, e.endTime); const r = getUserRate(users, settings, e.userId); const total = calcLabor(h, r) + calcMaterialsTotal(e.materials); return (
                    <tr key={e.id} tabIndex={0} role="row" onKeyDown={ev => (ev.key === "Enter" || ev.key === " ") && (ev.preventDefault(), setViewEntry(e))} onClick={() => setViewEntry(e)} style={{ cursor: "pointer", background: i % 2 === 1 ? BRAND.bgSoft : BRAND.white, transition: "background 150ms", animation: `cardSlideIn 200ms ease-out ${Math.min(i, 8) * 25}ms both` }} onMouseEnter={ev => ev.currentTarget.style.background = BRAND.beige + "40"} onMouseLeave={ev => ev.currentTarget.style.background = i % 2 === 1 ? BRAND.bgSoft : BRAND.white}>
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
          {!mob && (
            <div style={{ display: "flex", gap: 8, position: "relative" }}>
              <button style={S.btnPrimary} onClick={() => setNewEntryType(t => t ? null : "chooser")}>
                <Icon name="plus" size={16} /> New Entry
              </button>
              {newEntryType === "chooser" && (<>
                <div style={{ position: "fixed", inset: 0, zIndex: 29 }} onClick={() => setNewEntryType(null)} />
                <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 6, background: BRAND.white, border: "1px solid " + BRAND.borderLight, borderRadius: 10, boxShadow: "0 8px 32px rgba(0,0,0,0.12)", zIndex: 30, minWidth: 220, overflow: "hidden" }}>
                  <button style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", width: "100%", border: "none", background: "none", cursor: "pointer", fontFamily: BRAND.sans, fontSize: 14, color: BRAND.charcoal, textAlign: "left" }}
                    onMouseEnter={ev => ev.currentTarget.style.background = BRAND.bgSoft} onMouseLeave={ev => ev.currentTarget.style.background = "none"}
                    onClick={() => { setNewEntryType(null); setNewEntry(true); }}>
                    <span style={{ fontSize: 20 }}>🔨</span><div><div style={{ fontWeight: 600 }}>Work Entry</div><div style={{ fontSize: 12, color: BRAND.textLight }}>Log labor hours & tasks</div></div>
                  </button>
                  <div style={{ borderTop: "1px solid " + BRAND.borderLight }} />
                  <button style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", width: "100%", border: "none", background: "none", cursor: "pointer", fontFamily: BRAND.sans, fontSize: 14, color: BRAND.charcoal, textAlign: "left" }}
                    onMouseEnter={ev => ev.currentTarget.style.background = BRAND.bgSoft} onMouseLeave={ev => ev.currentTarget.style.background = "none"}
                    onClick={() => { setNewEntryType(null); setNewPurchase(true); }}>
                    <span style={{ fontSize: 20 }}>🛍️</span><div><div style={{ fontWeight: 600 }}>Purchase Entry</div><div style={{ fontSize: 12, color: BRAND.textLight }}>Log expenses & receipts</div></div>
                  </button>
                </div>
              </>)}
            </div>
          )}
        </div>
        {/* Entry type tabs */}
        <div style={{ display: "flex", marginBottom: 16, borderRadius: 8, background: BRAND.bgSoft, padding: 4, maxWidth: 320 }}>
          <button style={{ flex: 1, padding: "9px 16px", borderRadius: 6, border: "none", fontFamily: BRAND.sans, fontSize: 13, fontWeight: 600, cursor: "pointer", background: entryTab === "work" ? BRAND.white : "transparent", color: entryTab === "work" ? BRAND.navy : BRAND.textMuted, boxShadow: entryTab === "work" ? "0 1px 3px rgba(0,0,0,0.08)" : "none", transition: "all 150ms" }} onClick={() => setEntryTab("work")}>
            🔨 Work{myEntries.length > 0 ? ` (${myEntries.length})` : ""}
          </button>
          <button style={{ flex: 1, padding: "9px 16px", borderRadius: 6, border: "none", fontFamily: BRAND.sans, fontSize: 13, fontWeight: 600, cursor: "pointer", background: entryTab === "purchases" ? BRAND.white : "transparent", color: entryTab === "purchases" ? BRAND.navy : BRAND.textMuted, boxShadow: entryTab === "purchases" ? "0 1px 3px rgba(0,0,0,0.08)" : "none", transition: "all 150ms" }} onClick={() => setEntryTab("purchases")}>
            🛍️ Purchases{(() => { const c = (isTreasurer ? purchaseEntries : purchaseEntries.filter(e => e.userId === viewAs?.id)).length; return c > 0 ? ` (${c})` : ""; })()}
          </button>
        </div>
        {entryTab === "purchases" ? (() => {
          const myPurchases = isTreasurer ? purchaseEntries : purchaseEntries.filter(e => e.userId === viewAs?.id);
          const filtered = myPurchases.filter(e => {
            if (filterSearch) { const s = filterSearch.toLowerCase(); if (!e.storeName?.toLowerCase().includes(s) && !e.category?.toLowerCase().includes(s) && !e.description?.toLowerCase().includes(s)) return false; }
            if (filterStatus !== "all" && e.status !== filterStatus) return false;
            return true;
          }).sort((a, b) => b.date.localeCompare(a.date));
          if (filtered.length === 0) return (
            <div style={{ ...S.card, textAlign: "center", padding: "48px 32px" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🛍️</div>
              <div style={{ fontWeight: 600, color: BRAND.navy, marginBottom: 8, fontSize: 16 }}>No purchase entries yet</div>
              <div style={{ fontSize: 14, color: BRAND.textLight, marginBottom: 20 }}>Track HOA purchases like supplies, decor, and fuel.</div>
              <button style={S.btnPrimary} onClick={() => setNewPurchase(true)}><Icon name="plus" size={16} /> New Purchase</button>
            </div>
          );
          return mob ? filtered.map((e, i) => (
            <div key={e.id} style={{ animation: `cardSlideIn 280ms cubic-bezier(0.34,1.56,0.64,1) ${Math.min(i, 7) * 45}ms both`, marginBottom: 10 }}>
              <div onClick={() => setViewPurchase(e)} style={{ ...S.card, cursor: "pointer", padding: "14px 16px", transition: "box-shadow 150ms" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15, color: BRAND.charcoal }}>{e.storeName}</div>
                    <div style={{ fontSize: 12, color: BRAND.textMuted }}>{formatDate(e.date)} · {e.category}</div>
                  </div>
                  <StatusBadge status={e.status} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 12, color: BRAND.textLight }}>{e.items?.length || 0} item{(e.items?.length || 0) !== 1 ? "s" : ""}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: BRAND.navy }}>{fmt(e.total)}</div>
                </div>
              </div>
            </div>
          )) : (
            <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead><tr>
                  <th style={S.th}>Date</th>
                  {isTreasurer && <th style={S.th}>Member</th>}
                  <th style={S.th}>Store</th>
                  <th style={S.th}>Category</th>
                  <th style={{ ...S.th, textAlign: "right" }}>Items</th>
                  <th style={{ ...S.th, textAlign: "right" }}>Total</th>
                  <th style={S.th}>Status</th>
                </tr></thead>
                <tbody>{filtered.map((e, i) => {
                  const u = users.find(u => u.id === e.userId);
                  return (
                    <tr key={e.id} onClick={() => setViewPurchase(e)} style={{ cursor: "pointer", background: i % 2 === 1 ? BRAND.bgSoft : BRAND.white, transition: "background 150ms" }} onMouseEnter={ev => ev.currentTarget.style.background = BRAND.beige + "40"} onMouseLeave={ev => ev.currentTarget.style.background = i % 2 === 1 ? BRAND.bgSoft : BRAND.white}>
                      <td style={S.td}>{formatDate(e.date)}</td>
                      {isTreasurer && <td style={S.td}>{u?.name}</td>}
                      <td style={S.td}>{e.storeName}</td>
                      <td style={S.td}>{PURCHASE_CATEGORY_EMOJIS[e.category] || "📦"} {e.category}</td>
                      <td style={{ ...S.td, textAlign: "right" }}>{e.items?.length || 0}</td>
                      <td style={{ ...S.td, textAlign: "right", fontWeight: 600 }}>{fmt(e.total)}</td>
                      <td style={S.td}><StatusBadge status={e.status} /></td>
                    </tr>
                  );
                })}</tbody>
              </table>
            </div>
          );
        })() : (<>
        {/* Filter bar — search always visible; advanced filters collapse into a panel on mobile */}
        {(() => {
          const hasActiveFilter = filterSearch || filterStatus !== "all" || filterCategory !== "all" || filterMember !== "all" || filterDateFrom || filterDateTo;
          const activeCount = [filterSearch, filterStatus !== "all", filterCategory !== "all", filterMember !== "all", filterDateFrom, filterDateTo].filter(Boolean).length;
          const advancedCount = [filterStatus !== "all", filterCategory !== "all", filterMember !== "all", filterDateFrom, filterDateTo].filter(Boolean).length;
          const clearAll = () => { setFilterSearch(""); setFilterStatus("all"); setFilterCategory("all"); setFilterMember("all"); setFilterDateFrom(""); setFilterDateTo(""); };
          const datePresets = [
            { label: "This Month", fn: () => { const d = new Date(); setFilterDateFrom(d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-01"); setFilterDateTo(new Date().toISOString().split("T")[0]); } },
            { label: "Last Month", fn: () => { const d = new Date(); d.setMonth(d.getMonth()-1); const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"); setFilterDateFrom(y+"-"+m+"-01"); const end=new Date(y,d.getMonth()+1,0); setFilterDateTo(end.toISOString().split("T")[0]); } },
            { label: "YTD", fn: () => { setFilterDateFrom(new Date().getFullYear()+"-01-01"); setFilterDateTo(new Date().toISOString().split("T")[0]); } },
          ];
          return (
            <div style={{ marginBottom: 16 }}>
              {/* Row 1: search + filter button (mobile) or full bar (desktop) */}
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input style={{ ...S.input, flex: 1, padding: "8px 12px", fontSize: 13 }} placeholder="🔍 Search entries, members, locations..." value={filterSearch} onChange={e => setFilterSearch(e.target.value)} />
                {mob ? (
                  <button onClick={() => setFilterPanelOpen(p => !p)} aria-expanded={filterPanelOpen} aria-label="Toggle filters"
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 6, border: "1px solid " + (advancedCount > 0 ? BRAND.brick : BRAND.border), background: advancedCount > 0 ? BRAND.brick + "0F" : BRAND.white, color: advancedCount > 0 ? BRAND.brick : BRAND.textMuted, fontFamily: BRAND.sans, fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
                    <Icon name="settings" size={16} />
                    {advancedCount > 0 ? <span style={{ background: BRAND.brick, color: "#fff", borderRadius: 10, fontSize: 11, fontWeight: 700, padding: "1px 6px", minWidth: 18, textAlign: "center" }}>{advancedCount}</span> : "Filter"}
                  </button>
                ) : (
                  <>
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
                    <input type="date" style={{ ...S.input, padding: "7px 10px", fontSize: 12, width: "auto" }} value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} title="From" />
                    <span style={{ fontSize: 12, color: BRAND.textLight }}>–</span>
                    <input type="date" style={{ ...S.input, padding: "7px 10px", fontSize: 12, width: "auto" }} value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} title="To" />
                    {datePresets.map(p => <button key={p.label} onClick={p.fn} style={{ padding: "5px 10px", borderRadius: 12, border: "1px solid "+BRAND.borderLight, background: BRAND.white, color: BRAND.navy, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: BRAND.sans, whiteSpace: "nowrap" }}>{p.label}</button>)}
                    {hasActiveFilter && <button style={{ ...S.btnGhost, fontSize: 12, padding: "6px 10px", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }} onClick={clearAll}><span style={{ background: BRAND.brick, color: "#fff", borderRadius: 10, fontSize: 11, fontWeight: 700, padding: "1px 6px", minWidth: 18, textAlign: "center" }}>{activeCount}</span>Clear</button>}
                  </>
                )}
              </div>

              {/* Mobile expanded filter panel */}
              {mob && filterPanelOpen && (
                <div className="fade-in" style={{ marginTop: 8, padding: "14px 14px 10px", background: BRAND.white, border: "1px solid " + BRAND.borderLight, borderRadius: 10, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: BRAND.textLight, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>Status</div>
                      <select style={{ ...S.select, fontSize: 13, padding: "8px 10px" }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                        <option value="all">All</option>
                        {Object.values(STATUSES).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: BRAND.textLight, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>Category</div>
                      <select style={{ ...S.select, fontSize: 13, padding: "8px 10px" }} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                        <option value="all">All</option>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    {isTreasurer && (
                      <div style={{ gridColumn: "1 / -1" }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: BRAND.textLight, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>Member</div>
                        <select style={{ ...S.select, fontSize: 13, padding: "8px 10px" }} value={filterMember} onChange={e => setFilterMember(e.target.value)}>
                          <option value="all">All Members</option>
                          {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: BRAND.textLight, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>From</div>
                      <input type="date" style={{ ...S.input, fontSize: 13, padding: "8px 10px" }} value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} />
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: BRAND.textLight, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>To</div>
                      <input type="date" style={{ ...S.input, fontSize: 13, padding: "8px 10px" }} value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                    {datePresets.map(p => <button key={p.label} onClick={p.fn} style={{ padding: "5px 12px", borderRadius: 12, border: "1px solid "+BRAND.borderLight, background: BRAND.bgSoft, color: BRAND.navy, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: BRAND.sans }}>{p.label}</button>)}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid " + BRAND.borderLight, paddingTop: 10 }}>
                    {advancedCount > 0 ? <button style={{ ...S.btnGhost, fontSize: 13, color: BRAND.brick, padding: "6px 4px" }} onClick={clearAll}>✕ Clear filters</button> : <span />}
                    <button style={{ ...S.btnPrimary, fontSize: 13, padding: "8px 20px" }} onClick={() => setFilterPanelOpen(false)}>Done</button>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
        {(() => {
          let filtered = myEntries;
          if (filterDateFrom) filtered = filtered.filter(e => e.date >= filterDateFrom);
          if (filterDateTo)   filtered = filtered.filter(e => e.date <= filterDateTo);
          if (filterSearch) {
            const q = filterSearch.toLowerCase();
            filtered = filtered.filter(e => {
              const u = users.find(u => u.id === e.userId);
              return (
                e.description.toLowerCase().includes(q) ||
                e.category.toLowerCase().includes(q) ||
                (e.location || "").toLowerCase().includes(q) ||
                (e.notes || "").toLowerCase().includes(q) ||
                (u?.name || "").toLowerCase().includes(q) ||
                (e.materials || []).some(m => (m.name || "").toLowerCase().includes(q))
              );
            });
          }
          if (filterStatus !== "all") filtered = filtered.filter(e => e.status === filterStatus);
          if (filterCategory !== "all") filtered = filtered.filter(e => e.category === filterCategory);
          if (filterMember !== "all") filtered = filtered.filter(e => e.userId === filterMember);
          const hasActiveFilter = filterSearch || filterStatus !== "all" || filterCategory !== "all" || filterMember !== "all" || filterDateFrom || filterDateTo;
          if (filtered.length === 0) {
            if (myEntries.length === 0) return (
              <div style={{ ...S.card, textAlign: "center", padding: "48px 32px" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                <div style={{ fontWeight: 600, color: BRAND.navy, marginBottom: 8, fontSize: 16 }}>No entries yet</div>
                <div style={{ fontSize: 14, color: BRAND.textLight, marginBottom: 20 }}>{isTreasurer ? "Work entries from all members will appear here once submitted." : "Start by logging your first work session."}</div>
                {!isTreasurer && <button style={S.btnPrimary} onClick={() => setNewEntryType("chooser")}><Icon name="plus" size={16} /> Log Work</button>}
              </div>
            );
            return (
              <div style={{ ...S.card, textAlign: "center", padding: "48px 32px" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
                <div style={{ fontWeight: 600, color: BRAND.navy, marginBottom: 8, fontSize: 16 }}>No results</div>
                <div style={{ fontSize: 14, color: BRAND.textLight, marginBottom: 20 }}>No entries match your current filters. Try broadening your search.</div>
                <button style={S.btnSecondary} onClick={() => { setFilterSearch(""); setFilterStatus("all"); setFilterCategory("all"); setFilterMember("all"); setFilterDateFrom(""); setFilterDateTo(""); }}>Clear all filters</button>
              </div>
            );
          }
          return mob ? filtered.map((e, i) => (
            <div key={e.id + "-" + page} style={{ animation: `cardSlideIn 280ms cubic-bezier(0.34,1.56,0.64,1) ${Math.min(i, 7) * 45}ms both` }}>
              <EntryCard entry={e} users={users} settings={settings} currentUser={viewAs} onClick={() => setViewEntry(e)} onEdit={(e) => { setEditEntry(e); }} onSubmit={(e) => doSubmit(e, e.id)} onApprove={(e) => doApproveEntry(e.id, "")} onReject={(e) => setViewEntry(e)} onDelete={(e) => doTrashFromList(e, "")} />
            </div>
          ))
          : (
            <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead><tr>
                  {[
                    { key: "date",     label: "Date",        align: "left" },
                    ...(isTreasurer ? [{ key: "member", label: "Member", align: "left" }] : []),
                    { key: "category", label: "Category",    align: "left" },
                    { key: "desc",     label: "Description", align: "left", noSort: true },
                    { key: "hours",    label: "Hours",       align: "right" },
                    { key: "total",    label: "Total",       align: "right" },
                    { key: "status",   label: "Status",      align: "left" },
                  ].map(col => (
                    <th key={col.key} scope="col" style={{ ...S.th, textAlign: col.align, cursor: col.noSort ? "default" : "pointer", userSelect: "none", whiteSpace: "nowrap" }}
                      onClick={col.noSort ? undefined : () => { if (sortField === col.key) setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSortField(col.key); setSortDir("asc"); } }}>
                      {col.label}
                      {!col.noSort && (
                        <span style={{ marginLeft: 4, opacity: sortField === col.key ? 1 : 0.3, fontSize: 11 }}>
                          {sortField === col.key ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}
                        </span>
                      )}
                    </th>
                  ))}
                </tr></thead>
                <tbody>{(() => {
                  const sorted = [...filtered].sort((a, b) => {
                    const ua = users.find(u => u.id === a.userId);
                    const ub = users.find(u => u.id === b.userId);
                    const ha = calcHours(a.startTime, a.endTime);
                    const hb = calcHours(b.startTime, b.endTime);
                    const ra = getUserRate(users, settings, a.userId);
                    const rb = getUserRate(users, settings, b.userId);
                    const ta = calcLabor(ha, ra) + calcMaterialsTotal(a.materials);
                    const tb = calcLabor(hb, rb) + calcMaterialsTotal(b.materials);
                    let cmp = 0;
                    if (sortField === "date")     cmp = a.date.localeCompare(b.date);
                    else if (sortField === "member")   cmp = (ua?.name || "").localeCompare(ub?.name || "");
                    else if (sortField === "category") cmp = a.category.localeCompare(b.category);
                    else if (sortField === "hours")    cmp = ha - hb;
                    else if (sortField === "total")    cmp = ta - tb;
                    else if (sortField === "status")   cmp = a.status.localeCompare(b.status);
                    return sortDir === "asc" ? cmp : -cmp;
                  });
                  return sorted;
                })().map((e, i) => { const u = users.find(u => u.id === e.userId); const h = calcHours(e.startTime, e.endTime); const r = getUserRate(users, settings, e.userId); const total = calcLabor(h, r) + calcMaterialsTotal(e.materials); return (
                  <tr key={e.id} tabIndex={0} role="row" onKeyDown={ev => (ev.key === "Enter" || ev.key === " ") && (ev.preventDefault(), setViewEntry(e))} onClick={() => setViewEntry(e)} style={{ cursor: "pointer", background: i % 2 === 1 ? BRAND.bgSoft : BRAND.white, transition: "background 150ms", animation: `cardSlideIn 220ms ease-out ${Math.min(i, 8) * 30}ms both` }} onMouseEnter={ev => ev.currentTarget.style.background = BRAND.beige + "40"} onMouseLeave={ev => ev.currentTarget.style.background = i % 2 === 1 ? BRAND.bgSoft : BRAND.white}>
                    <td style={S.td}>{formatDate(e.date)}</td>{isTreasurer && <td style={S.td}>{u?.name}</td>}<td style={S.td}><CategoryBadge category={e.category} /></td><td style={{ ...S.td, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.description}</td><td style={{ ...S.td, textAlign: "right" }}>{fmtHours(h)}</td><td style={{ ...S.td, textAlign: "right", fontWeight: 600 }}>{fmt(total)}</td><td style={S.td}><StatusBadge status={e.status} /></td>
                  </tr>); })}</tbody>
              </table>
            </div>
          );
        })()}
        </>)}
      </div>
    );
    if (page === "review") {
      if (!isTreasurer || previewAsId) { nav("dashboard"); return null; }
      const pendingWork = entries.filter(e => e.status === STATUSES.SUBMITTED || e.status === STATUSES.AWAITING_SECOND || e.status === STATUSES.NEEDS_INFO).map(e => ({ ...e, _type: "work" }));
      const pendingPurch = purchaseEntries.filter(e => e.status === "Submitted").map(e => ({ ...e, _type: "purchase" }));
      const pending = [...pendingWork, ...pendingPurch].sort((a, b) => (b.submittedAt || b.date || "").localeCompare(a.submittedAt || a.date || ""));
      // Only first-approval work entries are bulk-selectable (not dual-approval ones, not purchases)
      const bulkEligible = pendingWork.filter(e => e.status === STATUSES.SUBMITTED);
      const allSelected = bulkEligible.length > 0 && bulkEligible.every(e => selectedIds.has(e.id));
      const someSelected = selectedIds.size > 0;
      const bulkTotal = [...selectedIds].reduce((acc, id) => {
        const e = entries.find(x => x.id === id);
        if (!e) return acc;
        const h = calcHours(e.startTime, e.endTime);
        const r = getUserRate(users, settings, e.userId);
        return acc + calcLabor(h, r) + calcMaterialsTotal(e.materials);
      }, 0);
      return (
        <div className="fade-in">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, flexWrap: "wrap", gap: 12 }}>
            <div>
              <h2 style={{ ...S.h2, marginBottom: 4 }}>Review Queue</h2>
              <p style={{ margin: 0, fontSize: 14, color: BRAND.textMuted }}>{pending.length} {pending.length === 1 ? "entry" : "entries"} pending your review</p>
            </div>
            {pending.length > 0 && (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {bulkEligible.length > 1 && (
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: BRAND.textMuted, cursor: "pointer", userSelect: "none" }}>
                    <input type="checkbox" checked={allSelected} onChange={() => {
                      if (allSelected) setSelectedIds(new Set());
                      else setSelectedIds(new Set(bulkEligible.map(e => e.id)));
                    }} style={{ width: 16, height: 16, accentColor: BRAND.navy, cursor: "pointer" }} />
                    Select all work ({bulkEligible.length})
                  </label>
                )}
                {someSelected && (
                  <button
                    style={{ ...S.btnSuccess, fontSize: 13, padding: "8px 16px", gap: 6 }}
                    onClick={async () => {
                      const ids = [...selectedIds];
                      setSelectedIds(new Set());
                      await doBulkApprove(ids);
                      pushUndo("Approved " + ids.length + " entries", async () => {
                        for (const id of ids) await rejectEntry(id, "Undone — moved back to Submitted for re-review");
                        showToast("Bulk approve undone", "info");
                      });
                    }}
                  >
                    <Icon name="check" size={14} /> Approve {selectedIds.size} selected · {fmt(bulkTotal)}
                  </button>
                )}
              </div>
            )}
          </div>
          {pending.length === 0 ? (
            <div style={{ ...S.card, textAlign: "center", padding: 60 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
              <div style={{ fontWeight: 600, color: BRAND.navy, marginBottom: 8 }}>All caught up!</div>
              <div style={{ fontSize: 14, color: BRAND.textLight, marginBottom: 20 }}>No entries waiting for review.</div>
              <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                <button style={S.btnGhost} onClick={() => { setFilterStatus(STATUSES.APPROVED); nav("entries"); }}>View approved entries →</button>
                <button style={S.btnGhost} onClick={() => nav("reports")}>Generate a report →</button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {pending.map(e => {
                const u = users.find(u => u.id === e.userId);
                const isPurchase = e._type === "purchase";
                const total = isPurchase ? (e.total || 0) : (calcLabor(calcHours(e.startTime, e.endTime), getUserRate(users, settings, e.userId)) + calcMaterialsTotal(e.materials));
                const h = isPurchase ? null : calcHours(e.startTime, e.endTime);
                const isRejecting = rejectingId === e.id;
                const isNeedsInfo = needsInfoId === e.id;
                const isSelected = selectedIds.has(e.id);
                const isBulkEligible = !isPurchase && e.status === STATUSES.SUBMITTED;
                const submittedAgo = e.submittedAt ? timeAgo(e.submittedAt) : null;
                return (
                <div key={e.id} style={{ ...S.card, padding: "20px 24px", transition: "box-shadow 150ms, border-color 150ms", borderLeft: "4px solid " + (isSelected ? BRAND.navy : isPurchase ? "#0E7490" : e.status === STATUSES.AWAITING_SECOND ? "#4338CA" : BRAND.brick), outline: isSelected ? "2px solid " + BRAND.navy + "30" : "none", position: "relative", overflow: "hidden" }} onMouseEnter={ev => ev.currentTarget.style.boxShadow = "0 4px 16px rgba(31,42,56,0.08)"} onMouseLeave={ev => ev.currentTarget.style.boxShadow = "0 1px 3px rgba(31,42,56,0.04)"}>
                  {flashApproveId === e.id && <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "#2E7D32", borderRadius: "inherit", animation: "approveFlash 380ms ease-out forwards", pointerEvents: "none", zIndex: 2 }} />}
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    {isBulkEligible && (
                      <div style={{ paddingTop: 4, flexShrink: 0 }}>
                        <input type="checkbox" checked={isSelected} onChange={() => {
                          setSelectedIds(prev => { const s = new Set(prev); if (s.has(e.id)) s.delete(e.id); else s.add(e.id); return s; });
                        }} style={{ width: 16, height: 16, accentColor: BRAND.navy, cursor: "pointer" }} />
                      </div>
                    )}
                    <div role="button" tabIndex={0} onKeyDown={ev => (ev.key === "Enter" || ev.key === " ") && (ev.preventDefault(), isPurchase ? setViewPurchase(e) : setViewEntry(e))} style={{ flex: 1, cursor: "pointer", minWidth: 0 }} onClick={() => isPurchase ? setViewPurchase(e) : setViewEntry(e)}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 700, fontSize: 16, color: BRAND.navy }}>{u?.name}</span>
                        {isPurchase && <span style={{ fontSize: 10, fontWeight: 700, color: "#0E7490", background: "#ECFEFF", padding: "2px 8px", borderRadius: 10 }}>PURCHASE</span>}
                        <CategoryBadge category={e.category} />
                        {!isPurchase && e.status === STATUSES.AWAITING_SECOND && <span style={{ fontSize: 11, color: "#4338CA", fontWeight: 600 }}>⚖️ 2nd approval</span>}
                        {submittedAgo && <span style={{ fontSize: 11, color: BRAND.textLight }}>submitted {submittedAgo}</span>}
                      </div>
                      <div style={{ fontSize: 14, color: BRAND.charcoal, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{isPurchase ? (e.storeName + " — " + e.description) : e.description}</div>
                      <div style={{ fontSize: 13, color: BRAND.textLight }}>{relativeDate(e.date)}{h != null ? " · " + fmtHours(h) : ""}{isPurchase && e.items?.length ? " · " + e.items.length + " item" + (e.items.length > 1 ? "s" : "") : ""}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: isPurchase ? "#0E7490" : BRAND.brick }}>{fmt(total)}</div>
                      <div style={{ fontSize: 12, color: BRAND.textLight }}>{isPurchase ? "purchase" : "reimbursement"}</div>
                    </div>
                  </div>
                  {isRejecting ? (
                    <div className="fade-in" style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid " + BRAND.borderLight }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: BRAND.charcoal, marginBottom: 6 }}>Rejection reason <span style={{ color: BRAND.error }}>*</span></div>
                      <textarea autoFocus style={{ ...S.textarea, minHeight: 60, marginBottom: 8 }} value={rejectNote} onChange={ev => setRejectNote(ev.target.value)} placeholder="Tell them what needs to be fixed..." />
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button style={{ ...S.btnGhost, fontSize: 13, padding: "6px 14px" }} onClick={() => { setRejectingId(null); setRejectNote(""); }}>Cancel</button>
                        <button style={{ ...S.btnDanger, fontSize: 13, padding: "6px 14px", opacity: !rejectNote.trim() ? 0.5 : 1 }} disabled={!rejectNote.trim()} onClick={async () => {
                          if (isPurchase) { await doPurchaseReject(e.id, rejectNote); } else { await doRejectEntry(e.id, rejectNote); pushUndo("Rejection sent", async () => { await restoreEntry(e.id, "Submitted"); showToast("Rejection undone — restored to queue", "info"); }); }
                          setRejectingId(null); setRejectNote("");
                        }}><Icon name="x" size={14} /> Send Rejection</button>
                      </div>
                    </div>
                  ) : isNeedsInfo && !isPurchase ? (
                    <div className="fade-in" style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid " + BRAND.borderLight }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: BRAND.charcoal, marginBottom: 6 }}>What information do you need? <span style={{ color: BRAND.error }}>*</span></div>
                      <textarea autoFocus style={{ ...S.textarea, minHeight: 60, marginBottom: 8 }} value={needsInfoNote} onChange={ev => setNeedsInfoNote(ev.target.value)} placeholder="e.g. Please attach the receipt for materials..." />
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button style={{ ...S.btnGhost, fontSize: 13, padding: "6px 14px" }} onClick={() => { setNeedsInfoId(null); setNeedsInfoNote(""); }}>Cancel</button>
                        <button style={{ ...S.btnSecondary, fontSize: 13, padding: "6px 14px", opacity: !needsInfoNote.trim() ? 0.5 : 1 }} disabled={!needsInfoNote.trim()} onClick={async () => { await doNeedsInfo(e.id, needsInfoNote); setNeedsInfoId(null); setNeedsInfoNote(""); }}>💬 Request Info</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: 8, marginTop: 12, paddingTop: 12, borderTop: "1px solid " + BRAND.borderLight, justifyContent: "flex-end", flexWrap: "wrap" }}>
                      <button style={{ ...S.btnGhost, fontSize: 13, padding: "6px 14px" }} onClick={() => isPurchase ? setViewPurchase(e) : setViewEntry(e)}>View Details</button>
                      {!isPurchase && <button style={{ ...S.btnGhost, fontSize: 13, padding: "6px 14px", color: "#0284c7", borderColor: "#0284c7" + "40" }} onClick={(ev) => { ev.stopPropagation(); setNeedsInfoId(e.id); setNeedsInfoNote(""); }}>💬 Needs Info</button>}
                      <button style={{ ...S.btnDanger, fontSize: 13, padding: "6px 14px" }} onClick={(ev) => { ev.stopPropagation(); setRejectingId(e.id); setRejectNote(""); }}><Icon name="x" size={14} /> Reject</button>
                      <button style={{ ...S.btnSuccess, fontSize: 13, padding: "6px 14px" }} onClick={async (ev) => {
                        ev.stopPropagation();
                        if (isPurchase) { await doPurchaseApprove(e.id); } else { await doApproveEntry(e.id, ""); pushUndo("Approved: " + (u?.name || ""), async () => { await rejectEntry(e.id, "Undone — returned for re-review"); showToast("Approval undone", "info"); }); }
                      }}><Icon name="check" size={14} /> Approve</button>
                    </div>
                  )}
                </div>);
              })}
            </div>
          )}
        </div>
      );
    }
    if (page === "trash") {
      if (!isTreasurer || previewAsId) { nav("dashboard"); return null; }
      const trashed = entries.filter(e => e.status === STATUSES.TRASH).sort((a, b) => (b.reviewedAt || "").localeCompare(a.reviewedAt || ""));
      return (
        <div className="fade-in">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <h2 style={S.h2}>Trash</h2>
            <span style={{ fontSize: 13, color: BRAND.textMuted }}>{trashed.length} {trashed.length === 1 ? "entry" : "entries"}</span>
          </div>
          <p style={{ margin: "0 0 20px", fontSize: 14, color: BRAND.textMuted }}>Declined or deleted entries. Restore any entry to Draft to reopen it.</p>
          {trashed.length === 0 ? (
            <div style={{ ...S.card, textAlign: "center", padding: 60 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🗑</div>
              <div style={{ fontWeight: 600, color: BRAND.navy, marginBottom: 8 }}>Trash is empty</div>
              <div style={{ fontSize: 14, color: BRAND.textLight }}>Declined or trashed entries will appear here.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {trashed.map(e => {
                const u = users.find(u => u.id === e.userId);
                const h = calcHours(e.startTime, e.endTime);
                const r = getUserRate(users, settings, e.userId);
                const total = calcLabor(h, r) + calcMaterialsTotal(e.materials);
                const lastLog = e.auditLog?.length ? e.auditLog[e.auditLog.length - 1] : null;
                return (
                  <div key={e.id} style={{ ...S.card, padding: "18px 20px", borderLeft: "4px solid #7f1d1d", opacity: 0.9 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                          <CategoryBadge category={e.category} />
                          <span style={{ fontSize: 12, color: BRAND.textLight, fontWeight: 500 }}>{u?.name}</span>
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: BRAND.charcoal, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.description}</div>
                        <div style={{ fontSize: 12, color: BRAND.textLight }}>{formatDate(e.date)} · {fmtHours(h)}</div>
                        {lastLog && (
                          <div style={{ marginTop: 8, padding: "8px 12px", background: "#FFF1F1", borderRadius: 6, fontSize: 12 }}>
                            <span style={{ fontWeight: 600, color: "#7f1d1d" }}>{lastLog.action}</span>
                            {lastLog.details && <span style={{ color: BRAND.textMuted }}> — {lastLog.details.replace("Reason: ", "")}</span>}
                            <span style={{ color: BRAND.textLight }}> · {lastLog.byName} · {new Date(lastLog.at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: "right", marginLeft: 16, flexShrink: 0 }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: "#7f1d1d", marginBottom: 8 }}>{fmt(total)}</div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button style={{ ...S.btnGhost, fontSize: 12, padding: "5px 10px" }} onClick={() => setViewEntry(e)}>View</button>
                          <button style={{ ...S.btnGhost, fontSize: 12, padding: "5px 10px" }} onClick={async () => { const updated = await restoreEntry(e.id, STATUSES.DRAFT); if (updated) showToast("Restored to Draft", "success", e.category + " — " + u?.name); }}>↩ Restore</button>
                          <button style={{ background: "#7f1d1d", color: "#fff", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer", fontWeight: 600 }} onClick={() => setPermDeleteTarget(e)}>Delete</button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        <ConfirmDialog open={!!permDeleteTarget} onClose={() => setPermDeleteTarget(null)} title="Permanently Delete?" message={permDeleteTarget ? "This cannot be undone. " + (permDeleteTarget.category || "") + " by " + (users.find(u => u.id === permDeleteTarget?.userId)?.name || "Unknown") + " will be permanently removed." : ""} confirmText="Delete Forever" danger onConfirm={async () => { if (permDeleteTarget) { await deleteEntry(permDeleteTarget.id); setPermDeleteTarget(null); showToast("Permanently deleted", "success"); }}} />
        </div>
      );
    }
    if (page === "payment") { if (!isTreasurer || previewAsId) { nav("dashboard"); return null; } return <PaymentRunPage entries={entries} purchaseEntries={purchaseEntries} users={users} settings={settings} onMarkPaid={async (ids, paymentDetails) => { let count = 0; for (const id of ids) { const updated = await markPaid(id, paymentDetails); if (updated) count++; } if (count > 0) showToast(count + " entr" + (count === 1 ? "y" : "ies") + " marked as paid", "success"); }} onMarkPurchasePaid={doPurchaseMarkPaid} mob={mob} />; }
    if (page === "help") return <HelpPage currentUser={currentUser} settings={settings} mob={mob} onNav={nav} />;
    if (page === "reports") { if (!isTreasurer || previewAsId) { nav("dashboard"); return null; } return <ReportsPage entries={entries} purchaseEntries={purchaseEntries} users={users} settings={settings} currentUser={currentUser} mob={mob} onToast={showToast} />; }
    if (page === "settings") { if (!isTreasurer || previewAsId) { nav("dashboard"); return null; } return <SettingsPage settings={settings} users={users} currentUser={currentUser} allEntries={entries} allPurchases={purchaseEntries} onSaveSettings={saveSettings} onAddUser={addUser} onRemoveUser={removeUser} onUpdateRate={updateUserRate} />; }
    if (page === "insights") return (
      <div className="fade-in">
        <h2 style={{ ...S.h2, marginBottom: 8 }}>Community Insights</h2>
        <p style={{ margin: "0 0 24px", fontSize: 14, color: BRAND.textMuted }}>See how your HOA dollars are being put to work.</p>
        <CommunityInsights fetchStats={fetchCommunityStats} settings={settings} mob={mob} cachedStats={cachedInsightsStats} onStatsCached={setCachedInsightsStats} entries={entries} users={users} />
      </div>
    );
    return null;
  };

  // ══════════════════════════════════════════════════════════════════════════
  // MAIN LAYOUT
  // ══════════════════════════════════════════════════════════════════════════
  const PULL_THRESHOLD = 72;
  const onPullStart = (e) => {
    // Don't trigger pull if touch starts on the sticky header (first ~56px)
    if (window.scrollY === 0 && e.touches[0].clientY > 56) {
      pullStartY.current = e.touches[0].clientY;
    }
  };
  const onPullMove = (e) => {
    if (pullStartY.current === null || pullRefreshing) return;
    const dy = e.touches[0].clientY - pullStartY.current;
    if (dy > 0) setPullY(Math.min(dy * 0.4, PULL_THRESHOLD + 16));
  };
  const onPullEnd = async () => {
    if (pullY >= PULL_THRESHOLD && !pullRefreshing) {
      setPullRefreshing(true);
      setPullY(PULL_THRESHOLD);
      await refresh();
      setPullRefreshing(false);
    }
    setPullY(0);
    pullStartY.current = null;
  };
  const initials = (viewAs?.name || currentUser.name).split(" ").map(n => n[0]).join("");
  const isActive = (id) => page === id && !viewEntry && !editEntry && !newEntry && !viewPurchase && !editPurchase && !newPurchase;
  const members = users.filter(u => u.role === ROLES.MEMBER);

  // Preview mode banner — shown at top of content when Treasurer is previewing as Member
  const PreviewBanner = () => realIsTreasurer && previewAsId ? (
    <div role="alert" style={{ background: "#FFF8E1", borderBottom: "2px solid #F59E0B", padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, fontSize: 13, color: "#92400E", position: "sticky", top: mob ? 56 : 57, zIndex: 15 }}>
      <span>👁 Previewing as <strong>{viewAs?.name}</strong> — you're seeing Member view. Actions are disabled.</span>
      <button onClick={() => { setPreviewAsId(null); nav("dashboard"); }} style={{ background: "#F59E0B", color: "#fff", border: "none", borderRadius: 6, padding: "5px 12px", fontWeight: 700, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>Exit Preview</button>
    </div>
  ) : null;

  // ── CHANGE PASSWORD MODAL ────────────────────────────────────────────────
  const ChangePasswordModal = () => (
    <Modal open={showChangePass} onClose={() => { setShowChangePass(false); setCpCurrent(""); setCpNew(""); setCpConfirm(""); setCpError(""); setCpDone(false); }} title="Change Password">
      {cpDone ? (
        <div style={{ textAlign: "center", padding: "16px 0" }}>
          <div style={{ width: 44, height: 44, borderRadius: 22, background: BRAND.success + "15", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", color: BRAND.success }}><Icon name="check" size={22} /></div>
          <div style={{ fontSize: 16, fontWeight: 600, color: BRAND.navy, marginBottom: 6, fontFamily: BRAND.serif }}>Password changed!</div>
          <div style={{ fontSize: 13, color: BRAND.textMuted }}>Your new password is active.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={S.label}>Current Password</label>
            <input type="password" autoComplete="current-password" style={S.input} value={cpCurrent} onChange={e => { setCpCurrent(e.target.value); setCpError(""); }} placeholder="Your current password" autoFocus />
          </div>
          <div>
            <label style={S.label}>New Password</label>
            <input type="password" autoComplete="new-password" style={S.input} value={cpNew} onChange={e => { setCpNew(e.target.value); setCpError(""); }} placeholder="Min 6 characters" />
          </div>
          <div>
            <label style={S.label}>Confirm New Password</label>
            <input type="password" autoComplete="new-password" style={{ ...S.input, borderColor: cpError && cpNew !== cpConfirm ? BRAND.error : BRAND.border }} value={cpConfirm} onChange={e => { setCpConfirm(e.target.value); setCpError(""); }} placeholder="Repeat new password" />
          </div>
          {cpError && <div style={{ color: BRAND.error, fontSize: 13, display: "flex", alignItems: "flex-start", gap: 6 }}><Icon name="alert" size={14} /><span>{cpError}</span></div>}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 4 }}>
            <button style={S.btnSecondary} onClick={() => { setShowChangePass(false); setCpCurrent(""); setCpNew(""); setCpConfirm(""); setCpError(""); }}>Cancel</button>
            <button style={{ ...S.btnPrimary, opacity: cpLoading ? 0.6 : 1 }} disabled={cpLoading} onClick={handleChangePassword}>{cpLoading ? "Updating..." : "Update Password"}</button>
          </div>
        </div>
      )}
    </Modal>
  );

  if (mob) {
    return (
      <div style={{ minHeight: "100vh", fontFamily: BRAND.sans, background: BRAND.bgSoft, color: BRAND.charcoal, paddingBottom: 88 }} onTouchStart={onPullStart} onTouchMove={onPullMove} onTouchEnd={onPullEnd}>
        <a href="#main-content" className="skip-link">Skip to main content</a>
        {/* Mobile top bar */}
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: BRAND.navy, position: "fixed", top: 0, left: 0, right: 0, zIndex: 20 }} role="banner">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/logo.png" alt="24 Mill Street logo" style={{ width: 32, height: 32, borderRadius: 4, objectFit: "cover", background: BRAND.beige }} />
            <span style={{ fontFamily: BRAND.serif, fontWeight: 600, fontSize: 16, color: "#fff" }}>24 Mill</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {isTreasurer && (
              <button style={{ background: "none", border: "none", color: "#fff", padding: 6, cursor: "pointer", position: "relative", minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={(e) => { e.stopPropagation(); setShowNotifPanel(p => !p); }} aria-label={"Notifications" + (pendingCount > 0 ? ", " + pendingCount + " pending" : "")}>
                <Icon name="bell" size={22} />
                {pendingCount > 0 && <span aria-hidden="true" style={{ position: "absolute", top: 2, right: 2, background: "#EF4444", color: "#fff", fontSize: 9, fontWeight: 700, width: 16, height: 16, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid " + BRAND.navy }}>{pendingCount}</span>}
              </button>
            )}
            <button style={{ background: "none", border: "none", color: "#fff", padding: 4, cursor: "pointer", minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setDrawerOpen(true)} aria-label="Open navigation menu"><Icon name="menu" size={24} /></button>
          </div>
        </header>
        {/* Notification panel */}
        {showNotifPanel && isTreasurer && <NotificationPanel entries={entries} purchaseEntries={purchaseEntries} users={users} settings={settings} onView={(e) => { setShowNotifPanel(false); setViewEntry(e); }} onViewPurchase={(e) => { setShowNotifPanel(false); setViewPurchase(e); }} onClose={() => setShowNotifPanel(false)} onReviewAll={() => { setShowNotifPanel(false); nav("review"); }} mob={mob} />}
        {/* Slide-out drawer */}
        {drawerOpen && (
          <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.4)", touchAction: "none" }} onClick={() => setDrawerOpen(false)} aria-hidden="true">
            <div role="dialog" aria-label="Navigation menu" style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 280, background: BRAND.navy, padding: "20px 16px", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                <span style={{ fontFamily: BRAND.serif, fontWeight: 600, fontSize: 18, color: "#fff" }}>Menu</span>
                <button aria-label="Close menu" style={{ background: "none", border: "none", color: "#9B978F", cursor: "pointer", padding: 8, minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setDrawerOpen(false)}><Icon name="x" size={24} /></button>
              </div>
              <div style={{ padding: "12px 8px", borderRadius: 8, background: "rgba(255,255,255,0.06)", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
                <div aria-hidden="true" style={{ width: 36, height: 36, borderRadius: 6, background: isTreasurer ? BRAND.brick : BRAND.green, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff" }}>{initials}</div>
                <div><div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{currentUser.name}</div><div style={{ fontSize: 13, color: "#7A766E" }}>{realIsTreasurer && previewAsId ? "👁 Previewing as Member" : currentUser.role}</div></div>
              </div>
              {navItems.map(item => (
                <button key={item.id} aria-current={isActive(item.id) ? "page" : undefined} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 12px", borderRadius: 6, fontSize: 15, fontWeight: isActive(item.id) ? 600 : 400, background: isActive(item.id) ? "rgba(255,255,255,0.1)" : "transparent", color: isActive(item.id) ? "#fff" : "#9B978F", cursor: "pointer", border: "none", width: "100%", textAlign: "left", fontFamily: BRAND.sans, marginBottom: 2 }} onClick={() => nav(item.id)}>
                  <Icon name={item.icon} size={20} /><span style={{ flex: 1 }}>{item.label}</span>
                  {item.badge > 0 && <span aria-label={item.badge + " pending"} style={{ background: BRAND.brick, color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10 }}>{item.badge}</span>}
                </button>
              ))}
              <div style={{ flex: 1 }} />
              {realIsTreasurer && members.length > 0 && (
                <div style={{ padding: "12px 8px", borderRadius: 8, background: "rgba(255,255,255,0.06)", marginBottom: 8 }}>
                  <div style={{ fontSize: 11, color: "#7A766E", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Preview as Member</div>
                  <select
                    style={{ width: "100%", background: "rgba(255,255,255,0.08)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, padding: "7px 10px", fontSize: 13, fontFamily: BRAND.sans, cursor: "pointer" }}
                    value={previewAsId || ""}
                    onChange={e => { const v = e.target.value; setPreviewAsId(v || null); if (v) { setDrawerOpen(false); nav("dashboard"); } }}
                  >
                    <option value="">— Treasurer view —</option>
                    {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              )}
              <button style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 6, fontSize: 14, background: "transparent", color: "#9B978F", cursor: "pointer", border: "none", width: "100%", textAlign: "left", fontFamily: BRAND.sans }} onClick={() => { setDrawerOpen(false); setShowChangePass(true); }}>🔒 Change Password</button>
              <button style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 12px", borderRadius: 6, fontSize: 15, background: "transparent", color: "#9B978F", cursor: "pointer", border: "none", width: "100%", textAlign: "left", fontFamily: BRAND.sans }} onClick={handleLogout}><Icon name="logout" size={20} /> Sign Out</button>
            </div>
          </div>
        )}
        {/* Offline banner */}
        {!online && <div role="alert" style={{ background: "#FFF3E0", borderBottom: "1px solid #FFB74D", padding: "8px 16px", display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#E65100" }}><Icon name="wifiOff" size={16} /><span>You're offline. Viewing cached data.</span></div>}
        {/* Content */}
        {/* Pull-to-refresh indicator */}
        {(pullY > 0 || pullRefreshing) && (
          <div style={{ position: "fixed", top: 56, left: 0, right: 0, zIndex: 19, display: "flex", alignItems: "center", justifyContent: "center", height: Math.max(pullY, pullRefreshing ? 40 : 0), overflow: "hidden", transition: pullRefreshing ? "none" : "height 200ms ease", background: BRAND.bgSoft, borderBottom: "1px solid " + BRAND.borderLight }}>
            <div style={{ fontSize: 13, color: BRAND.textMuted, display: "flex", alignItems: "center", gap: 6 }}>
              {pullRefreshing
                ? <><span style={{ display: "inline-block", animation: "spin 600ms linear infinite", fontSize: 16 }}>↻</span> Refreshing...</>
                : pullY >= PULL_THRESHOLD ? "↑ Release to refresh" : "↓ Pull to refresh"
              }
            </div>
          </div>
        )}
        <PreviewBanner />
        <main id="main-content" style={{ padding: "16px 16px", paddingTop: 72 }}><div key={page} className="page-enter">{renderPage()}</div></main>
        {/* FAB */}
        {!newEntry && !editEntry && !viewEntry && !newPurchase && !editPurchase && !viewPurchase && (page === "dashboard" || page === "entries") && (
          <>
            {newEntryType === "chooser" && <div style={{ position: "fixed", inset: 0, zIndex: 14, background: "rgba(0,0,0,0.3)" }} onClick={() => setNewEntryType(null)} />}
            {newEntryType === "chooser" && (
              <div style={{ position: "fixed", bottom: 230, right: 20, zIndex: 16, background: BRAND.white, borderRadius: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.18)", overflow: "hidden", minWidth: 200 }}>
                <button style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", width: "100%", border: "none", background: "none", cursor: "pointer", fontFamily: BRAND.sans, fontSize: 14, color: BRAND.charcoal, textAlign: "left" }} onClick={() => { setNewEntryType(null); setNewEntry(true); }}>
                  <span style={{ fontSize: 20 }}>🔨</span><div><div style={{ fontWeight: 600 }}>Work Entry</div><div style={{ fontSize: 11, color: BRAND.textLight }}>Log hours & tasks</div></div>
                </button>
                <div style={{ borderTop: "1px solid " + BRAND.borderLight }} />
                <button style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", width: "100%", border: "none", background: "none", cursor: "pointer", fontFamily: BRAND.sans, fontSize: 14, color: BRAND.charcoal, textAlign: "left" }} onClick={() => { setNewEntryType(null); setNewPurchase(true); }}>
                  <span style={{ fontSize: 20 }}>🛍️</span><div><div style={{ fontWeight: 600 }}>Purchase Entry</div><div style={{ fontSize: 11, color: BRAND.textLight }}>Log expenses & receipts</div></div>
                </button>
              </div>
            )}
            <button aria-label="Create new entry" style={{ position: "fixed", bottom: 160, right: 20, width: 56, height: 56, borderRadius: 28, background: BRAND.brick, color: "#fff", border: "none", boxShadow: "0 4px 16px rgba(142,59,46,0.35)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 15, transform: newEntryType === "chooser" ? "rotate(45deg)" : "none", transition: "transform 200ms" }} onClick={() => { if (!fabPulsed) { setFabPulsed(true); try { localStorage.setItem("hoa_fab_pulsed", "1"); } catch {} } setNewEntryType(t => t === "chooser" ? null : "chooser"); }}>
              {!fabPulsed && entries.length === 0 && (
                <span aria-hidden="true" style={{ position: "absolute", inset: -4, borderRadius: 32, border: "2px solid " + BRAND.brick, animation: "fabRing 1.6s ease-out 3", pointerEvents: "none" }} />
              )}
              <Icon name="plus" size={24} />
            </button>
          </>
        )}
        {/* More bottom sheet */}
        {moreSheetOpen && (
          <MoreSheet onClose={() => setMoreSheetOpen(false)} trashCount={trashCount} nav={nav} />
        )}
        <ChangePasswordModal />
        {showHelp && <HelpModal onClose={() => setShowHelp(false)} isTreasurer={isTreasurer} mob={mob} hoaName={settings?.hoaName || "24 Mill Street HOA"} />}
        {showConfetti && <ConfettiBurst onDone={() => setShowConfetti(false)} />}
        {lightboxSrc && <PhotoLightbox src={lightboxSrc.src} alt={lightboxSrc.alt} onClose={() => setLightboxSrc(null)} />}
        {/* Toast notification */}
        {toast && (
          <div className="toast-enter" role="status" aria-live="polite" style={{ position: "fixed", bottom: 96, left: 16, right: 16, zIndex: 50, background: toast.type === "success" ? "#065F46" : toast.type === "error" ? "#991B1B" : BRAND.navy, color: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.25)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 18px" }}>
              <span style={{ fontSize: 20 }}>{toast.type === "success" ? "✅" : toast.type === "error" ? "❌" : "ℹ️"}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{toast.message}</div>
                {toast.detail && <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>{toast.detail}</div>}
              </div>
              {undoStack.length > 0 && (
                <button onClick={popUndo} style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", borderRadius: 6, padding: "4px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: BRAND.sans, whiteSpace: "nowrap", flexShrink: 0 }}>Undo</button>
              )}
              <button onClick={() => setToast(null)} aria-label="Dismiss" style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "0 0 0 4px", flexShrink: 0 }}>×</button>
            </div>
            {/* Undo countdown bar */}
            {undoStack.length > 0 && (
              <div style={{ height: 3, background: "rgba(255,255,255,0.15)", position: "relative" }}>
                <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.55)", animation: "undoBar 6000ms linear forwards", transformOrigin: "left" }} />
              </div>
            )}
            {/* Toast auto-dismiss progress bar */}
            {undoStack.length === 0 && (
              <div style={{ height: 3, background: "rgba(255,255,255,0.15)", position: "relative" }}>
                <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.4)", animation: "toastProgress 4000ms linear forwards", transformOrigin: "left" }} />
              </div>
            )}
          </div>
        )}
        <nav aria-label="Main navigation" style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: BRAND.white, borderTop: "1px solid " + BRAND.border, display: "flex", zIndex: 20, paddingBottom: "env(safe-area-inset-bottom)", boxShadow: "0 -2px 16px rgba(0,0,0,0.08)" }}>
          {bottomTabs.map(t => {
            const active = isActive(t.id);
            return (
            <button key={t.id} aria-label={t.label + (t.badge > 0 ? ", " + t.badge + " items" : "")} aria-current={active ? "page" : undefined} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "14px 4px 12px", background: "none", border: "none", cursor: "pointer", color: active ? t.color : BRAND.textLight, fontFamily: BRAND.sans, fontSize: 11, fontWeight: active ? 700 : 500, position: "relative", transition: "color 200ms" }} onClick={() => t.id === "__more__" ? setMoreSheetOpen(true) : nav(t.id)}>
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
            <div aria-hidden="true" style={{ width: 32, height: 32, borderRadius: 6, background: realIsTreasurer ? BRAND.brick : BRAND.green, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff" }}>{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{currentUser.name}</div>
              <div style={{ fontSize: 12, color: "#7A766E", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{realIsTreasurer && previewAsId ? "👁 Previewing as Member" : currentUser.role}</div>
            </div>
          </div>
          {realIsTreasurer && members.length > 0 && (
            <div style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 10, color: "#6B6560", marginBottom: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", paddingLeft: 4 }}>Preview as Member</div>
              <select
                style={{ width: "100%", background: "rgba(255,255,255,0.08)", color: previewAsId ? "#F59E0B" : "#9B978F", border: "1px solid " + (previewAsId ? "#F59E0B" : "rgba(255,255,255,0.12)"), borderRadius: 6, padding: "7px 10px", fontSize: 12, fontFamily: BRAND.sans, cursor: "pointer" }}
                value={previewAsId || ""}
                onChange={e => { const v = e.target.value; setPreviewAsId(v || null); if (v) nav("dashboard"); }}
              >
                <option value="">— Treasurer view —</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          )}
          <button style={{ ...S.navItem(false), padding: "7px 12px", fontSize: 12, color: "#7A766E" }} onClick={() => setShowChangePass(true)}>🔒 Change Password</button>
          <button style={{ ...S.navItem(false), padding: "8px 12px", fontSize: 13 }} onClick={handleLogout}><Icon name="logout" size={16} /> Sign Out</button>
        </div>
      </aside>
      <div style={S.main}>
        <header style={S.header} role="banner">
          <span style={{ fontSize: 14, color: BRAND.textMuted }}>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 12, position: "relative" }}>
            {isTreasurer && (
              <button aria-label={"Notifications" + (pendingCount > 0 ? ", " + pendingCount + " pending" : "")} style={{ background: "none", border: "none", color: BRAND.charcoal, padding: 6, cursor: "pointer", position: "relative", borderRadius: 8, minWidth: 36, minHeight: 36, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={(e) => { e.stopPropagation(); setShowNotifPanel(p => !p); }}>
                <Icon name="bell" size={20} />
                {pendingCount > 0 && <span aria-hidden="true" style={{ position: "absolute", top: 2, right: 2, background: "#EF4444", color: "#fff", fontSize: 9, fontWeight: 700, width: 16, height: 16, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>{pendingCount}</span>}
              </button>
            )}
            <span style={{ fontSize: 14, fontWeight: 500, color: BRAND.charcoal }}>{currentUser.name}{realIsTreasurer && previewAsId ? <span style={{ fontSize: 11, color: "#92400E", background: "#FFF8E1", border: "1px solid #F59E0B", borderRadius: 4, padding: "1px 6px", marginLeft: 6 }}>👁 preview</span> : null}</span>
            <RoleBadge role={realIsTreasurer && !previewAsId ? currentUser.role : ROLES.MEMBER} />
            {showNotifPanel && isTreasurer && <NotificationPanel entries={entries} purchaseEntries={purchaseEntries} users={users} settings={settings} onView={(e) => { setShowNotifPanel(false); setViewEntry(e); }} onViewPurchase={(e) => { setShowNotifPanel(false); setViewPurchase(e); }} onClose={() => setShowNotifPanel(false)} onReviewAll={() => { setShowNotifPanel(false); nav("review"); }} mob={mob} />}
          </div>
        </header>
        {!online && <div role="alert" style={{ background: "#FFF3E0", borderBottom: "1px solid #FFB74D", padding: "10px 32px", display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#E65100" }}><Icon name="wifiOff" size={16} /><span>You're offline. Viewing cached data — changes require an internet connection.</span></div>}
        <PreviewBanner />
        <main id="main-content" style={S.content}><div key={page} className="page-enter">{renderPage()}</div></main>
        <ChangePasswordModal />
        {showHelp && <HelpModal onClose={() => setShowHelp(false)} isTreasurer={isTreasurer} mob={mob} hoaName={settings?.hoaName || "24 Mill Street HOA"} />}
        {showConfetti && <ConfettiBurst onDone={() => setShowConfetti(false)} />}
        {lightboxSrc && <PhotoLightbox src={lightboxSrc.src} alt={lightboxSrc.alt} onClose={() => setLightboxSrc(null)} />}
        {toast && (
          <div className="toast-enter" role="status" aria-live="polite" style={{ position: "fixed", bottom: 24, right: 24, zIndex: 50, background: toast.type === "success" ? "#065F46" : toast.type === "error" ? "#991B1B" : BRAND.navy, color: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.25)", maxWidth: 420 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 20px" }}>
              <span style={{ fontSize: 20 }}>{toast.type === "success" ? "✅" : toast.type === "error" ? "❌" : "ℹ️"}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{toast.message}</div>
                {toast.detail && <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>{toast.detail}</div>}
              </div>
              {undoStack.length > 0 && (
                <button onClick={popUndo} style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", borderRadius: 6, padding: "4px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: BRAND.sans, whiteSpace: "nowrap", flexShrink: 0 }}>Undo</button>
              )}
              <button onClick={() => setToast(null)} aria-label="Dismiss" style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "0 0 0 4px", flexShrink: 0 }}>×</button>
            </div>
            {undoStack.length > 0 && (
              <div style={{ height: 3, background: "rgba(255,255,255,0.15)", position: "relative" }}>
                <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.55)", animation: "undoBar 6000ms linear forwards" }} />
              </div>
            )}
            {undoStack.length === 0 && (
              <div style={{ height: 3, background: "rgba(255,255,255,0.15)", position: "relative" }}>
                <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.4)", animation: "toastProgress 4000ms linear forwards", transformOrigin: "left" }} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
