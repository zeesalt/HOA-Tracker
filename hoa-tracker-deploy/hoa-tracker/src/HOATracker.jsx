import { useState, useEffect, useCallback, useMemo } from "react";

// ─── Constants ───────────────────────────────────────────────────────────────
const CATEGORIES = [
  "Landscaping", "Plumbing", "Electrical", "General Maintenance",
  "Snow Removal", "Cleaning", "Vendor Coordination", "Administrative Work",
  "Emergency Repairs"
];
const STATUSES = { DRAFT: "Draft", SUBMITTED: "Submitted", APPROVED: "Approved", REJECTED: "Rejected" };
const ROLES = { TREASURER: "Treasurer", MEMBER: "Member" };

const DEFAULT_SETTINGS = {
  hoaName: "24 Mill Street",
  defaultHourlyRate: 35,
  userRates: {},
  currency: "USD"
};

const STORAGE_KEYS = {
  settings: "hoa-settings",
  entries: "hoa-entries",
  users: "hoa-users",
  currentUser: "hoa-current-user",
  materials: "hoa-materials",
  version: "hoa-version"
};
const STORAGE_VERSION = "2"; // bump this to reset all data

// ─── Utility Functions ───────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 10);
const fmt = (n) => `$${Number(n || 0).toFixed(2)}`;
const fmtHours = (h) => `${Number(h || 0).toFixed(2)} hrs`;
const today = () => new Date().toISOString().split("T")[0];
const nowTime = () => { const d = new Date(); return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`; };

function calcHours(start, end) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff < 0) diff += 24 * 60;
  return Math.round((diff / 60) * 100) / 100;
}

function calcMaterialsTotal(materials) {
  return (materials || []).reduce((sum, m) => sum + (Number(m.quantity) || 0) * (Number(m.unitCost) || 0), 0);
}

function formatDate(d) {
  if (!d) return "";
  const date = new Date(d + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hr = parseInt(h);
  return `${hr > 12 ? hr - 12 : hr || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`;
}

// ─── Storage (persistent via localStorage) ───────────────────────────────────
async function loadData(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

async function saveData(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) { console.error("Save failed:", e); }
}

// ─── Seed Data ───────────────────────────────────────────────────────────────
const INITIAL_USERS = [
  { id: "usr_admin", name: "Zsolt Kemecsei", email: "zsolt.kemecsei@gmail.com", role: ROLES.TREASURER }
];

function seedEntries() {
  return [];
}

// ─── Icons (inline SVG) ──────────────────────────────────────────────────────
const Icon = ({ name, size = 18, className = "" }) => {
  const icons = {
    home: <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z" />,
    plus: <path d="M12 4v16m8-8H4" />,
    check: <path d="M5 13l4 4L19 7" />,
    x: <path d="M6 18L18 6M6 6l12 12" />,
    edit: <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />,
    eye: <><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>,
    clock: <><path d="M12 8v4l3 3" /><circle cx="12" cy="12" r="9" /></>,
    file: <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
    download: <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 3v12" />,
    settings: <><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><circle cx="12" cy="12" r="3" /></>,
    users: <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />,
    chart: <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
    send: <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />,
    back: <path d="M10 19l-7-7m0 0l7-7m-7 7h18" />,
    trash: <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />,
    photo: <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />,
    receipt: <path d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />,
    filter: <path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />,
    chevDown: <path d="M19 9l-7 7-7-7" />,
    chevRight: <path d="M9 5l7 7-7 7" />,
    alert: <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />,
    logout: <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />,
    dollar: <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
    inbox: <path d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}
      style={{ flexShrink: 0 }}>
      {icons[name]}
    </svg>
  );
};

// ─── Status Badge ────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const colors = {
    [STATUSES.DRAFT]: { bg: "#f0f0ee", text: "#6b6b60", border: "#ddddd8" },
    [STATUSES.SUBMITTED]: { bg: "#fef5e7", text: "#b5850a", border: "#fae3a7" },
    [STATUSES.APPROVED]: { bg: "#e8f5e4", text: "#2d7a1e", border: "#b8e0ae" },
    [STATUSES.REJECTED]: { bg: "#fde8e8", text: "#c53030", border: "#f5b8b8" },
  };
  const c = colors[status] || colors[STATUSES.DRAFT];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px",
      borderRadius: 20, fontSize: 12, fontWeight: 600, letterSpacing: "0.02em",
      background: c.bg, color: c.text, border: `1px solid ${c.border}`
    }}>
      {status === STATUSES.APPROVED && <Icon name="check" size={12} />}
      {status === STATUSES.REJECTED && <Icon name="x" size={12} />}
      {status === STATUSES.SUBMITTED && <Icon name="clock" size={12} />}
      {status}
    </span>
  );
};

// ─── Category Badge ──────────────────────────────────────────────────────────
const catColors = {
  "Landscaping": "#16a34a", "Plumbing": "#2563eb", "Electrical": "#eab308",
  "General Maintenance": "#6b7280", "Snow Removal": "#06b6d4", "Cleaning": "#8b5cf6",
  "Vendor Coordination": "#f97316", "Administrative Work": "#64748b", "Emergency Repairs": "#dc2626"
};

const CategoryBadge = ({ category }) => {
  const c = catColors[category] || "#6b7280";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px",
      borderRadius: 20, fontSize: 12, fontWeight: 500,
      background: c + "14", color: c, border: `1px solid ${c}30`
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: c }} />
      {category}
    </span>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const S = {
  // Layout
  app: { display: "flex", minHeight: "100vh", fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif", background: "#f7f7f5", color: "#1a1a18" },
  sidebar: {
    width: 260, background: "#1a1a18", color: "#e8e8e4", display: "flex", flexDirection: "column",
    padding: "0", position: "sticky", top: 0, height: "100vh", overflow: "auto",
    borderRight: "1px solid #2a2a28"
  },
  main: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column" },
  header: {
    padding: "20px 32px", borderBottom: "1px solid #e5e5e0",
    background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between",
    position: "sticky", top: 0, zIndex: 10
  },
  content: { padding: "24px 32px", flex: 1 },
  // Cards
  card: {
    background: "#fff", borderRadius: 12, border: "1px solid #e5e5e0",
    padding: 24, marginBottom: 16, transition: "box-shadow 0.15s ease"
  },
  cardHover: { boxShadow: "0 2px 12px rgba(0,0,0,0.06)" },
  // Buttons
  btnPrimary: {
    display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 20px",
    background: "#1a1a18", color: "#fff", border: "none", borderRadius: 8,
    fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
    fontFamily: "inherit"
  },
  btnSecondary: {
    display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 20px",
    background: "#fff", color: "#1a1a18", border: "1px solid #ddddd8", borderRadius: 8,
    fontSize: 14, fontWeight: 500, cursor: "pointer", transition: "all 0.15s",
    fontFamily: "inherit"
  },
  btnDanger: {
    display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 20px",
    background: "#fde8e8", color: "#c53030", border: "1px solid #f5b8b8", borderRadius: 8,
    fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "inherit"
  },
  btnGhost: {
    display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px",
    background: "transparent", color: "#6b6b60", border: "none", borderRadius: 8,
    fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit"
  },
  btnApprove: {
    display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 20px",
    background: "#2d7a1e", color: "#fff", border: "none", borderRadius: 8,
    fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit"
  },
  btnReject: {
    display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 20px",
    background: "#c53030", color: "#fff", border: "none", borderRadius: 8,
    fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit"
  },
  // Forms
  input: {
    width: "100%", padding: "10px 14px", border: "1px solid #ddddd8", borderRadius: 8,
    fontSize: 14, fontFamily: "inherit", background: "#fff", color: "#1a1a18",
    outline: "none", transition: "border 0.15s", boxSizing: "border-box"
  },
  textarea: {
    width: "100%", padding: "10px 14px", border: "1px solid #ddddd8", borderRadius: 8,
    fontSize: 14, fontFamily: "inherit", background: "#fff", color: "#1a1a18",
    outline: "none", transition: "border 0.15s", resize: "vertical", minHeight: 80,
    boxSizing: "border-box"
  },
  select: {
    width: "100%", padding: "10px 14px", border: "1px solid #ddddd8", borderRadius: 8,
    fontSize: 14, fontFamily: "inherit", background: "#fff", color: "#1a1a18",
    outline: "none", cursor: "pointer", boxSizing: "border-box", appearance: "auto"
  },
  label: { display: "block", fontSize: 13, fontWeight: 600, color: "#4a4a44", marginBottom: 6, letterSpacing: "0.01em" },
  fieldGroup: { marginBottom: 20 },
  // Nav
  navItem: (active) => ({
    display: "flex", alignItems: "center", gap: 10, padding: "10px 20px",
    borderRadius: 8, fontSize: 14, fontWeight: active ? 600 : 400,
    background: active ? "#2a2a28" : "transparent", color: active ? "#fff" : "#a0a098",
    cursor: "pointer", transition: "all 0.15s", border: "none", width: "100%",
    textAlign: "left", fontFamily: "inherit", margin: "2px 0"
  }),
  // Table
  table: { width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 14 },
  th: {
    textAlign: "left", padding: "12px 16px", fontWeight: 600, fontSize: 12,
    textTransform: "uppercase", letterSpacing: "0.05em", color: "#6b6b60",
    borderBottom: "2px solid #e5e5e0", background: "#fafaf8"
  },
  td: { padding: "14px 16px", borderBottom: "1px solid #f0f0ee", verticalAlign: "top" },
};

// ─── Reusable Components ─────────────────────────────────────────────────────
const Field = ({ label, required, children }) => (
  <div style={S.fieldGroup}>
    <label style={S.label}>{label}{required && <span style={{ color: "#c53030" }}> *</span>}</label>
    {children}
  </div>
);

const EmptyState = ({ icon, title, desc, action }) => (
  <div style={{ textAlign: "center", padding: "60px 20px", color: "#8a8a82" }}>
    <div style={{ marginBottom: 16, opacity: 0.5 }}><Icon name={icon} size={48} /></div>
    <div style={{ fontSize: 18, fontWeight: 600, color: "#4a4a44", marginBottom: 8 }}>{title}</div>
    <div style={{ fontSize: 14, marginBottom: 24, maxWidth: 360, margin: "0 auto 24px" }}>{desc}</div>
    {action}
  </div>
);

const StatCard = ({ label, value, icon, color = "#1a1a18" }) => (
  <div style={{ ...S.card, padding: "20px 24px", display: "flex", alignItems: "center", gap: 16, marginBottom: 0 }}>
    <div style={{
      width: 44, height: 44, borderRadius: 10, background: color + "12",
      display: "flex", alignItems: "center", justifyContent: "center", color
    }}>
      <Icon name={icon} size={22} />
    </div>
    <div>
      <div style={{ fontSize: 12, color: "#8a8a82", fontWeight: 500, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
    </div>
  </div>
);

const Modal = ({ open, onClose, title, children, wide }) => {
  if (!open) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)"
    }} onClick={onClose}>
      <div style={{
        background: "#fff", borderRadius: 16, width: wide ? 720 : 520, maxWidth: "92vw",
        maxHeight: "88vh", overflow: "auto", padding: 0,
        boxShadow: "0 20px 60px rgba(0,0,0,0.15)"
      }} onClick={e => e.stopPropagation()}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 24px", borderBottom: "1px solid #e5e5e0", position: "sticky", top: 0,
          background: "#fff", zIndex: 1, borderRadius: "16px 16px 0 0"
        }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{title}</h3>
          <button onClick={onClose} style={{ ...S.btnGhost, padding: 6 }}><Icon name="x" size={20} /></button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  );
};

const ConfirmDialog = ({ open, onClose, onConfirm, title, message, confirmText = "Confirm", danger }) => (
  <Modal open={open} onClose={onClose} title={title}>
    <p style={{ fontSize: 14, color: "#4a4a44", lineHeight: 1.6, margin: "0 0 24px" }}>{message}</p>
    <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
      <button style={S.btnSecondary} onClick={onClose}>Cancel</button>
      <button style={danger ? S.btnDanger : S.btnPrimary} onClick={() => { onConfirm(); onClose(); }}>
        {confirmText}
      </button>
    </div>
  </Modal>
);

// ─── Materials Editor ────────────────────────────────────────────────────────
const MaterialsEditor = ({ materials, onChange, readOnly }) => {
  const add = () => onChange([...materials, { id: uid(), name: "", quantity: 1, unitCost: 0 }]);
  const update = (i, field, val) => {
    const next = [...materials];
    next[i] = { ...next[i], [field]: val };
    onChange(next);
  };
  const remove = (i) => onChange(materials.filter((_, idx) => idx !== i));
  const total = calcMaterialsTotal(materials);

  return (
    <div>
      {materials.length > 0 && (
        <div style={{ border: "1px solid #e5e5e0", borderRadius: 10, overflow: "hidden", marginBottom: 12 }}>
          <table style={{ ...S.table, marginBottom: 0 }}>
            <thead>
              <tr>
                <th style={{ ...S.th, borderRadius: 0 }}>Item</th>
                <th style={{ ...S.th, width: 80, borderRadius: 0 }}>Qty</th>
                <th style={{ ...S.th, width: 100, borderRadius: 0 }}>Unit Cost</th>
                <th style={{ ...S.th, width: 90, borderRadius: 0, textAlign: "right" }}>Total</th>
                {!readOnly && <th style={{ ...S.th, width: 40, borderRadius: 0 }}></th>}
              </tr>
            </thead>
            <tbody>
              {materials.map((m, i) => (
                <tr key={m.id}>
                  <td style={S.td}>
                    {readOnly ? m.name : (
                      <input style={{ ...S.input, padding: "6px 10px" }} value={m.name}
                        onChange={e => update(i, "name", e.target.value)} placeholder="Item name" />
                    )}
                  </td>
                  <td style={S.td}>
                    {readOnly ? m.quantity : (
                      <input type="number" min="0" style={{ ...S.input, padding: "6px 10px" }}
                        value={m.quantity} onChange={e => update(i, "quantity", e.target.value)} />
                    )}
                  </td>
                  <td style={S.td}>
                    {readOnly ? fmt(m.unitCost) : (
                      <input type="number" min="0" step="0.01" style={{ ...S.input, padding: "6px 10px" }}
                        value={m.unitCost} onChange={e => update(i, "unitCost", e.target.value)} />
                    )}
                  </td>
                  <td style={{ ...S.td, textAlign: "right", fontWeight: 600 }}>
                    {fmt((Number(m.quantity) || 0) * (Number(m.unitCost) || 0))}
                  </td>
                  {!readOnly && (
                    <td style={S.td}>
                      <button style={{ ...S.btnGhost, padding: 4, color: "#c53030" }} onClick={() => remove(i)}>
                        <Icon name="trash" size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!readOnly && (
        <button style={{ ...S.btnGhost, color: "#1a1a18" }} onClick={add}>
          <Icon name="plus" size={16} /> Add Material
        </button>
      )}
      {materials.length > 0 && (
        <div style={{ textAlign: "right", fontSize: 14, fontWeight: 700, marginTop: 8, color: "#1a1a18" }}>
          Materials Total: {fmt(total)}
        </div>
      )}
    </div>
  );
};

// ─── Entry Form ──────────────────────────────────────────────────────────────
const EntryForm = ({ entry, settings, onSave, onCancel, onSubmit, onDelete }) => {
  const [form, setForm] = useState({
    date: entry?.date || today(),
    startTime: entry?.startTime || nowTime(),
    endTime: entry?.endTime || "",
    category: entry?.category || "",
    description: entry?.description || "",
    location: entry?.location || "",
    materials: entry?.materials || [],
    photos: entry?.photos || [],
    receipts: entry?.receipts || [],
    notes: entry?.notes || "",
    mileage: entry?.mileage || "",
  });
  const [errors, setErrors] = useState({});
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const hours = calcHours(form.startTime, form.endTime);
  const rate = settings.defaultHourlyRate;
  const laborTotal = hours * rate;
  const matTotal = calcMaterialsTotal(form.materials);
  const grandTotal = laborTotal + matTotal;
  const isEdit = !!entry;

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
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (validate()) onSave({ ...form, status: STATUSES.DRAFT });
  };

  const handleSubmit = () => {
    if (validate()) setShowSubmitConfirm(true);
  };

  const errStyle = (field) => errors[field] ? { border: "1px solid #c53030" } : {};

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        <Field label="Date" required>
          <input type="date" style={{ ...S.input, ...errStyle("date") }}
            value={form.date} onChange={e => set("date", e.target.value)} />
          {errors.date && <span style={{ color: "#c53030", fontSize: 12 }}>{errors.date}</span>}
        </Field>
        <Field label="Start Time" required>
          <input type="time" style={{ ...S.input, ...errStyle("startTime") }}
            value={form.startTime} onChange={e => set("startTime", e.target.value)} />
          {errors.startTime && <span style={{ color: "#c53030", fontSize: 12 }}>{errors.startTime}</span>}
        </Field>
        <Field label="End Time" required>
          <input type="time" style={{ ...S.input, ...errStyle("endTime") }}
            value={form.endTime} onChange={e => set("endTime", e.target.value)} />
          {errors.endTime && <span style={{ color: "#c53030", fontSize: 12 }}>{errors.endTime}</span>}
        </Field>
      </div>

      <Field label="Category" required>
        <select style={{ ...S.select, ...errStyle("category") }}
          value={form.category} onChange={e => set("category", e.target.value)}>
          <option value="">Select category...</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {errors.category && <span style={{ color: "#c53030", fontSize: 12 }}>{errors.category}</span>}
      </Field>

      <Field label="Task Description" required>
        <textarea style={{ ...S.textarea, ...errStyle("description") }}
          value={form.description} onChange={e => set("description", e.target.value)}
          placeholder="Describe the work performed..." />
        {errors.description && <span style={{ color: "#c53030", fontSize: 12 }}>{errors.description}</span>}
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Field label="Location">
          <input style={S.input} value={form.location} onChange={e => set("location", e.target.value)}
            placeholder="e.g. Unit 3B, Main lobby" />
        </Field>
        <Field label="Mileage">
          <input type="number" min="0" style={S.input} value={form.mileage}
            onChange={e => set("mileage", e.target.value)} placeholder="Miles driven" />
        </Field>
      </div>

      <Field label="Materials">
        <MaterialsEditor materials={form.materials} onChange={m => set("materials", m)} />
      </Field>

      <Field label="Notes">
        <textarea style={{ ...S.textarea, minHeight: 60 }}
          value={form.notes} onChange={e => set("notes", e.target.value)}
          placeholder="Additional notes..." />
      </Field>

      {/* Summary */}
      <div style={{
        background: "#fafaf8", borderRadius: 10, padding: 20, marginBottom: 24,
        border: "1px solid #e5e5e0"
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6b6b60", marginBottom: 12 }}>
          Reimbursement Summary
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16 }}>
          <div><div style={{ fontSize: 12, color: "#8a8a82" }}>Hours</div><div style={{ fontSize: 18, fontWeight: 700 }}>{fmtHours(hours)}</div></div>
          <div><div style={{ fontSize: 12, color: "#8a8a82" }}>Labor ({fmt(rate)}/hr)</div><div style={{ fontSize: 18, fontWeight: 700 }}>{fmt(laborTotal)}</div></div>
          <div><div style={{ fontSize: 12, color: "#8a8a82" }}>Materials</div><div style={{ fontSize: 18, fontWeight: 700 }}>{fmt(matTotal)}</div></div>
          <div><div style={{ fontSize: 12, color: "#8a8a82" }}>Total</div><div style={{ fontSize: 22, fontWeight: 800, color: "#1a1a18" }}>{fmt(grandTotal)}</div></div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 10, justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 10 }}>
          {isEdit && entry.status === STATUSES.DRAFT && (
            <button style={S.btnDanger} onClick={() => setShowDeleteConfirm(true)}>
              <Icon name="trash" size={16} /> Delete
            </button>
          )}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={S.btnSecondary} onClick={onCancel}>Cancel</button>
          <button style={S.btnSecondary} onClick={handleSave}>
            <Icon name="edit" size={16} /> Save Draft
          </button>
          <button style={S.btnPrimary} onClick={handleSubmit}>
            <Icon name="send" size={16} /> Submit for Review
          </button>
        </div>
      </div>

      <ConfirmDialog open={showSubmitConfirm} onClose={() => setShowSubmitConfirm(false)}
        title="Submit Entry?" message={`This will submit the entry for treasurer review. Total reimbursement: ${fmt(grandTotal)}.`}
        confirmText="Submit" onConfirm={() => onSubmit({ ...form, status: STATUSES.SUBMITTED })} />

      <ConfirmDialog open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)}
        title="Delete Entry?" message="This draft entry will be permanently deleted."
        confirmText="Delete" danger onConfirm={onDelete} />
    </div>
  );
};

// ─── Entry Detail View ───────────────────────────────────────────────────────
const EntryDetail = ({ entry, settings, users, currentUser, onBack, onEdit, onApprove, onReject }) => {
  const [reviewNotes, setReviewNotes] = useState(entry.reviewerNotes || "");
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const isTreasurer = currentUser.role === ROLES.TREASURER;
  const user = users.find(u => u.id === entry.userId);
  const hours = calcHours(entry.startTime, entry.endTime);
  const rate = settings.userRates?.[entry.userId] || settings.defaultHourlyRate;
  const laborTotal = hours * rate;
  const matTotal = calcMaterialsTotal(entry.materials);
  const grandTotal = laborTotal + matTotal;
  const canEdit = entry.userId === currentUser.id && [STATUSES.DRAFT, STATUSES.REJECTED].includes(entry.status);
  const canReview = isTreasurer && entry.status === STATUSES.SUBMITTED;

  return (
    <div>
      <button style={{ ...S.btnGhost, marginBottom: 20, padding: "6px 0" }} onClick={onBack}>
        <Icon name="back" size={18} /> Back to entries
      </button>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>{entry.category}</h2>
            <StatusBadge status={entry.status} />
          </div>
          <div style={{ fontSize: 14, color: "#6b6b60" }}>
            {formatDate(entry.date)} &middot; {formatTime(entry.startTime)} – {formatTime(entry.endTime)} &middot; {user?.name || "Unknown"}
          </div>
        </div>
        {canEdit && (
          <button style={S.btnPrimary} onClick={onEdit}><Icon name="edit" size={16} /> Edit Entry</button>
        )}
      </div>

      <div style={{ ...S.card }}>
        <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6b6b60", marginBottom: 12 }}>
          Task Description
        </div>
        <p style={{ margin: 0, lineHeight: 1.7, color: "#2a2a28" }}>{entry.description}</p>
        {entry.location && (
          <div style={{ marginTop: 12, fontSize: 13, color: "#6b6b60" }}>
            📍 {entry.location}
          </div>
        )}
        {entry.mileage && (
          <div style={{ marginTop: 6, fontSize: 13, color: "#6b6b60" }}>
            🚗 {entry.mileage} miles
          </div>
        )}
        {entry.notes && (
          <div style={{ marginTop: 12, padding: 14, background: "#fafaf8", borderRadius: 8, fontSize: 13, color: "#4a4a44", lineHeight: 1.6 }}>
            {entry.notes}
          </div>
        )}
      </div>

      {entry.materials?.length > 0 && (
        <div style={{ ...S.card }}>
          <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6b6b60", marginBottom: 12 }}>
            Materials
          </div>
          <MaterialsEditor materials={entry.materials} readOnly onChange={() => { }} />
        </div>
      )}

      <div style={{
        ...S.card, background: "#fafaf8",
        display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 20
      }}>
        <div><div style={{ fontSize: 12, color: "#8a8a82", marginBottom: 4 }}>Hours</div><div style={{ fontSize: 20, fontWeight: 700 }}>{fmtHours(hours)}</div></div>
        <div><div style={{ fontSize: 12, color: "#8a8a82", marginBottom: 4 }}>Labor ({fmt(rate)}/hr)</div><div style={{ fontSize: 20, fontWeight: 700 }}>{fmt(laborTotal)}</div></div>
        <div><div style={{ fontSize: 12, color: "#8a8a82", marginBottom: 4 }}>Materials</div><div style={{ fontSize: 20, fontWeight: 700 }}>{fmt(matTotal)}</div></div>
        <div><div style={{ fontSize: 12, color: "#8a8a82", marginBottom: 4 }}>Total Reimbursement</div><div style={{ fontSize: 24, fontWeight: 800, color: "#1a1a18" }}>{fmt(grandTotal)}</div></div>
      </div>

      {/* Reviewer Notes */}
      {(entry.reviewerNotes || canReview) && (
        <div style={{ ...S.card, borderColor: entry.status === STATUSES.REJECTED ? "#f5b8b8" : "#e5e5e0" }}>
          <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6b6b60", marginBottom: 12 }}>
            Reviewer Notes
          </div>
          {canReview ? (
            <textarea style={S.textarea} value={reviewNotes} onChange={e => setReviewNotes(e.target.value)}
              placeholder="Add notes for the member..." />
          ) : (
            entry.reviewerNotes ? (
              <div style={{ padding: 14, background: "#fafaf8", borderRadius: 8, fontSize: 14, color: "#4a4a44", lineHeight: 1.6 }}>
                {entry.reviewerNotes}
              </div>
            ) : (
              <div style={{ color: "#8a8a82", fontSize: 14 }}>No notes yet.</div>
            )
          )}
        </div>
      )}

      {/* Review Actions */}
      {canReview && (
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
          <button style={S.btnReject} onClick={() => {
            if (!reviewNotes.trim()) { alert("Please add a note explaining the rejection."); return; }
            setShowRejectConfirm(true);
          }}>
            <Icon name="x" size={16} /> Reject
          </button>
          <button style={S.btnApprove} onClick={() => setShowApproveConfirm(true)}>
            <Icon name="check" size={16} /> Approve
          </button>
        </div>
      )}

      <ConfirmDialog open={showApproveConfirm} onClose={() => setShowApproveConfirm(false)}
        title="Approve Entry?" message={`Approve reimbursement of ${fmt(grandTotal)} for ${user?.name}? This will lock the entry.`}
        confirmText="Approve" onConfirm={() => onApprove(reviewNotes)} />

      <ConfirmDialog open={showRejectConfirm} onClose={() => setShowRejectConfirm(false)}
        title="Reject Entry?" message="The member will be able to edit and resubmit."
        confirmText="Reject" danger onConfirm={() => onReject(reviewNotes)} />
    </div>
  );
};

// ─── Reports Page ────────────────────────────────────────────────────────────
const ReportsPage = ({ entries, users, settings, currentUser }) => {
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(1);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(today());
  const [filterUser, setFilterUser] = useState("all");
  const [filterStatus, setFilterStatus] = useState(STATUSES.APPROVED);
  const [generated, setGenerated] = useState(false);

  const isTreasurer = currentUser.role === ROLES.TREASURER;

  const filtered = useMemo(() => {
    return entries.filter(e => {
      if (e.date < dateFrom || e.date > dateTo) return false;
      if (filterStatus !== "all" && e.status !== filterStatus) return false;
      if (!isTreasurer && e.userId !== currentUser.id) return false;
      if (isTreasurer && filterUser !== "all" && e.userId !== filterUser) return false;
      return true;
    }).sort((a, b) => a.date.localeCompare(b.date));
  }, [entries, dateFrom, dateTo, filterUser, filterStatus, isTreasurer, currentUser.id]);

  const totals = useMemo(() => {
    let totalHours = 0, totalLabor = 0, totalMat = 0;
    filtered.forEach(e => {
      const h = calcHours(e.startTime, e.endTime);
      const r = settings.userRates?.[e.userId] || settings.defaultHourlyRate;
      totalHours += h;
      totalLabor += h * r;
      totalMat += calcMaterialsTotal(e.materials);
    });
    return { totalHours, totalLabor, totalMat, grand: totalLabor + totalMat };
  }, [filtered, settings]);

  const exportCSV = () => {
    const header = "Date,Member,Category,Description,Hours,Rate,Labor,Materials,Total";
    const rows = filtered.map(e => {
      const u = users.find(u => u.id === e.userId);
      const h = calcHours(e.startTime, e.endTime);
      const r = settings.userRates?.[e.userId] || settings.defaultHourlyRate;
      const l = h * r;
      const m = calcMaterialsTotal(e.materials);
      return `${e.date},"${u?.name}","${e.category}","${e.description.replace(/"/g, '""')}",${h.toFixed(2)},${r.toFixed(2)},${l.toFixed(2)},${m.toFixed(2)},${(l + m).toFixed(2)}`;
    });
    const summaryRow = `\nTOTALS,,,,${totals.totalHours.toFixed(2)},,${totals.totalLabor.toFixed(2)},${totals.totalMat.toFixed(2)},${totals.grand.toFixed(2)}`;
    const csv = [header, ...rows, summaryRow].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${settings.hoaName.replace(/\s+/g, "_")}_Report_${dateFrom}_to_${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Reports</h2>
      </div>

      <div style={{ ...S.card }}>
        <div style={{ display: "grid", gridTemplateColumns: isTreasurer ? "1fr 1fr 1fr 1fr" : "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
          <Field label="From Date">
            <input type="date" style={S.input} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </Field>
          <Field label="To Date">
            <input type="date" style={S.input} value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </Field>
          {isTreasurer && (
            <Field label="Member">
              <select style={S.select} value={filterUser} onChange={e => setFilterUser(e.target.value)}>
                <option value="all">All Members</option>
                {users.filter(u => u.role === ROLES.MEMBER).map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Status">
            <select style={S.select} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value={STATUSES.APPROVED}>Approved Only</option>
              <option value="all">All Statuses</option>
              <option value={STATUSES.SUBMITTED}>Submitted</option>
              <option value={STATUSES.DRAFT}>Draft</option>
              <option value={STATUSES.REJECTED}>Rejected</option>
            </select>
          </Field>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={S.btnPrimary} onClick={() => setGenerated(true)}>
            <Icon name="chart" size={16} /> Generate Report
          </button>
        </div>
      </div>

      {generated && (
        <>
          {/* Summary Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
            <StatCard label="Entries" value={filtered.length} icon="file" />
            <StatCard label="Total Hours" value={fmtHours(totals.totalHours)} icon="clock" color="#2563eb" />
            <StatCard label="Labor" value={fmt(totals.totalLabor)} icon="users" color="#16a34a" />
            <StatCard label="Grand Total" value={fmt(totals.grand)} icon="dollar" color="#1a1a18" />
          </div>

          {/* Report Preview */}
          <div style={{ ...S.card }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{settings.hoaName}</h3>
                <div style={{ fontSize: 13, color: "#6b6b60" }}>
                  Reimbursement Report &middot; {formatDate(dateFrom)} – {formatDate(dateTo)} &middot; Generated {formatDate(today())}
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button style={S.btnSecondary} onClick={exportCSV}>
                  <Icon name="download" size={16} /> Export CSV
                </button>
              </div>
            </div>

            {filtered.length === 0 ? (
              <EmptyState icon="file" title="No entries found" desc="Adjust your filters to see results." />
            ) : (
              <div style={{ border: "1px solid #e5e5e0", borderRadius: 10, overflow: "hidden" }}>
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={S.th}>Date</th>
                      {isTreasurer && <th style={S.th}>Member</th>}
                      <th style={S.th}>Category</th>
                      <th style={S.th}>Description</th>
                      <th style={{ ...S.th, textAlign: "right" }}>Hours</th>
                      <th style={{ ...S.th, textAlign: "right" }}>Rate</th>
                      <th style={{ ...S.th, textAlign: "right" }}>Labor</th>
                      <th style={{ ...S.th, textAlign: "right" }}>Materials</th>
                      <th style={{ ...S.th, textAlign: "right" }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(e => {
                      const u = users.find(u => u.id === e.userId);
                      const h = calcHours(e.startTime, e.endTime);
                      const r = settings.userRates?.[e.userId] || settings.defaultHourlyRate;
                      const l = h * r;
                      const m = calcMaterialsTotal(e.materials);
                      return (
                        <tr key={e.id}>
                          <td style={S.td}>{formatDate(e.date)}</td>
                          {isTreasurer && <td style={S.td}>{u?.name}</td>}
                          <td style={S.td}><CategoryBadge category={e.category} /></td>
                          <td style={{ ...S.td, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.description}</td>
                          <td style={{ ...S.td, textAlign: "right" }}>{h.toFixed(2)}</td>
                          <td style={{ ...S.td, textAlign: "right" }}>{fmt(r)}</td>
                          <td style={{ ...S.td, textAlign: "right" }}>{fmt(l)}</td>
                          <td style={{ ...S.td, textAlign: "right" }}>{fmt(m)}</td>
                          <td style={{ ...S.td, textAlign: "right", fontWeight: 700 }}>{fmt(l + m)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: "#fafaf8" }}>
                      <td colSpan={isTreasurer ? 4 : 3} style={{ ...S.td, fontWeight: 700, borderBottom: "none" }}>TOTALS</td>
                      <td style={{ ...S.td, textAlign: "right", fontWeight: 700, borderBottom: "none" }}>{totals.totalHours.toFixed(2)}</td>
                      <td style={{ ...S.td, borderBottom: "none" }}></td>
                      <td style={{ ...S.td, textAlign: "right", fontWeight: 700, borderBottom: "none" }}>{fmt(totals.totalLabor)}</td>
                      <td style={{ ...S.td, textAlign: "right", fontWeight: 700, borderBottom: "none" }}>{fmt(totals.totalMat)}</td>
                      <td style={{ ...S.td, textAlign: "right", fontWeight: 800, fontSize: 16, borderBottom: "none" }}>{fmt(totals.grand)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

// ─── Settings Page ───────────────────────────────────────────────────────────
const SettingsPage = ({ settings, users, onSave, onSaveUsers }) => {
  const [form, setForm] = useState({ ...settings });
  const [saved, setSaved] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberName, setNewMemberName] = useState("");
  const [memberError, setMemberError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    onSave(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addMember = () => {
    setMemberError("");
    const email = newMemberEmail.trim().toLowerCase();
    const name = newMemberName.trim();
    if (!name) { setMemberError("Name is required"); return; }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setMemberError("Valid email is required"); return; }
    if (users.some(u => u.email.toLowerCase() === email)) { setMemberError("This email is already registered"); return; }
    const newUser = { id: "usr_" + uid(), name, email, role: ROLES.MEMBER };
    onSaveUsers([...users, newUser]);
    setNewMemberEmail("");
    setNewMemberName("");
  };

  const removeMember = (userId) => {
    onSaveUsers(users.filter(u => u.id !== userId));
    setShowDeleteConfirm(null);
  };

  const members = users.filter(u => u.role === ROLES.MEMBER);

  return (
    <div>
      <h2 style={{ margin: "0 0 24px", fontSize: 24, fontWeight: 800 }}>Settings</h2>

      <div style={{ ...S.card, maxWidth: 600 }}>
        <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6b6b60", marginBottom: 16 }}>
          HOA Configuration
        </div>
        <Field label="HOA Name">
          <input style={S.input} value={form.hoaName} onChange={e => set("hoaName", e.target.value)} />
        </Field>
        <Field label="Default Hourly Rate ($)">
          <input type="number" min="0" step="0.50" style={S.input}
            value={form.defaultHourlyRate} onChange={e => set("defaultHourlyRate", Number(e.target.value))} />
        </Field>
        <button style={S.btnPrimary} onClick={handleSave}>
          {saved ? <><Icon name="check" size={16} /> Saved!</> : "Save Settings"}
        </button>
      </div>

      {/* Member Management */}
      <div style={{ ...S.card, maxWidth: 600, marginTop: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6b6b60", marginBottom: 16 }}>
          HOA Members
        </div>

        {/* Add new member */}
        <div style={{ padding: 16, background: "#fafaf8", borderRadius: 10, border: "1px solid #e5e5e0", marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Add New Member</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={S.label}>Full Name</label>
              <input style={S.input} value={newMemberName} onChange={e => setNewMemberName(e.target.value)}
                placeholder="e.g. Jordan Chen" onKeyDown={e => e.key === "Enter" && addMember()} />
            </div>
            <div>
              <label style={S.label}>Email Address</label>
              <input style={S.input} value={newMemberEmail} onChange={e => setNewMemberEmail(e.target.value)}
                placeholder="e.g. jordan@email.com" onKeyDown={e => e.key === "Enter" && addMember()} />
            </div>
          </div>
          {memberError && <div style={{ color: "#c53030", fontSize: 13, marginBottom: 10 }}>{memberError}</div>}
          <button style={S.btnPrimary} onClick={addMember}>
            <Icon name="plus" size={16} /> Add Member
          </button>
        </div>

        {/* Members list */}
        {members.length === 0 ? (
          <div style={{ textAlign: "center", padding: "24px 16px", color: "#8a8a82", fontSize: 14 }}>
            No members added yet. Add members above so they can log in and submit work entries.
          </div>
        ) : (
          <div style={{ border: "1px solid #e5e5e0", borderRadius: 10, overflow: "hidden" }}>
            <table style={{ ...S.table, marginBottom: 0 }}>
              <thead>
                <tr>
                  <th style={S.th}>Name</th>
                  <th style={S.th}>Email</th>
                  <th style={{ ...S.th, width: 120 }}>Rate Override</th>
                  <th style={{ ...S.th, width: 60 }}></th>
                </tr>
              </thead>
              <tbody>
                {members.map(u => (
                  <tr key={u.id}>
                    <td style={{ ...S.td, fontWeight: 500 }}>{u.name}</td>
                    <td style={{ ...S.td, color: "#6b6b60" }}>{u.email}</td>
                    <td style={S.td}>
                      <input type="number" min="0" step="0.50" style={{ ...S.input, padding: "6px 10px" }}
                        value={form.userRates?.[u.id] || ""}
                        onChange={e => set("userRates", { ...form.userRates, [u.id]: Number(e.target.value) || undefined })}
                        placeholder={`$${form.defaultHourlyRate}`} />
                    </td>
                    <td style={S.td}>
                      <button style={{ ...S.btnGhost, padding: 6, color: "#c53030" }}
                        onClick={() => setShowDeleteConfirm(u)}>
                        <Icon name="trash" size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {members.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <button style={S.btnPrimary} onClick={handleSave}>
              {saved ? <><Icon name="check" size={16} /> Saved!</> : "Save Rate Overrides"}
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog open={!!showDeleteConfirm} onClose={() => setShowDeleteConfirm(null)}
        title="Remove Member?"
        message={showDeleteConfirm ? `Remove ${showDeleteConfirm.name} (${showDeleteConfirm.email}) from the HOA? Their existing work entries will be preserved.` : ""}
        confirmText="Remove Member" danger
        onConfirm={() => removeMember(showDeleteConfirm.id)} />
    </div>
  );
};

// ─── Login Screen ────────────────────────────────────────────────────────────
const LoginScreen = ({ settings, users, onLogin }) => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [shaking, setShaking] = useState(false);

  const handleLogin = () => {
    setError("");
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) { setError("Please enter your email address"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) { setError("Please enter a valid email address"); return; }
    const user = users.find(u => u.email.toLowerCase() === trimmed);
    if (!user) {
      setError("No account found for this email. Contact your HOA Treasurer to be added.");
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
      return;
    }
    onLogin(user);
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(145deg, #1a1a18 0%, #2a2a28 50%, #1a1a18 100%)",
      fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif"
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&display=swap');
        @keyframes shake { 0%, 100% { transform: translateX(0); } 20%, 60% { transform: translateX(-8px); } 40%, 80% { transform: translateX(8px); } }
      `}</style>
      <div style={{ textAlign: "center", maxWidth: 400, width: "100%", padding: "0 20px" }}>
        <div style={{
          width: 64, height: 64, borderRadius: 16, background: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 24px", boxShadow: "0 8px 32px rgba(0,0,0,0.3)"
        }}>
          <Icon name="home" size={32} className="" />
        </div>
        <h1 style={{ color: "#fff", margin: "0 0 8px", fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em" }}>
          {settings.hoaName}
        </h1>
        <p style={{ color: "#8a8a82", margin: "0 0 36px", fontSize: 15 }}>HOA Work Tracker</p>

        <div style={{
          background: "#2a2a28", border: "1px solid #3a3a38", borderRadius: 16,
          padding: 32, textAlign: "left",
          animation: shaking ? "shake 0.4s ease-in-out" : "none"
        }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#fff", marginBottom: 4 }}>Sign in</div>
          <div style={{ fontSize: 13, color: "#8a8a82", marginBottom: 24 }}>Enter your email address to continue</div>

          <label style={{ ...S.label, color: "#a0a098" }}>Email Address</label>
          <input
            type="email"
            style={{
              ...S.input,
              background: "#1a1a18", color: "#fff", border: error ? "1px solid #c53030" : "1px solid #3a3a38",
              marginBottom: error ? 8 : 20, fontSize: 15, padding: "12px 16px"
            }}
            value={email}
            onChange={e => { setEmail(e.target.value); setError(""); }}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            placeholder="you@example.com"
            autoFocus
          />
          {error && (
            <div style={{
              color: "#f87171", fontSize: 13, marginBottom: 16,
              display: "flex", alignItems: "flex-start", gap: 6
            }}>
              <Icon name="alert" size={14} />
              <span>{error}</span>
            </div>
          )}
          <button style={{
            ...S.btnPrimary, width: "100%", justifyContent: "center",
            padding: "12px 20px", fontSize: 15, borderRadius: 10,
            background: "#fff", color: "#1a1a18"
          }} onClick={handleLogin}>
            Continue
          </button>
        </div>

        <p style={{ color: "#4a4a44", fontSize: 12, marginTop: 24, lineHeight: 1.6 }}>
          Don't have an account? Ask your HOA Treasurer to add you.
        </p>
      </div>
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═════════════════════════════════════════════════════════════════════════════
export default function HOATracker() {
  // State
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState(INITIAL_USERS);
  const [entries, setEntries] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [page, setPage] = useState("dashboard");
  const [viewEntry, setViewEntry] = useState(null);
  const [editEntry, setEditEntry] = useState(null);
  const [newEntry, setNewEntry] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Load data
  useEffect(() => {
    (async () => {
      // Version check: clear stale data when app is upgraded
      const savedVersion = await loadData(STORAGE_KEYS.version, null);
      if (savedVersion !== STORAGE_VERSION) {
        // Clear all old data
        for (const key of Object.values(STORAGE_KEYS)) {
          try { localStorage.removeItem(key); } catch {}
        }
        await saveData(STORAGE_KEYS.version, STORAGE_VERSION);
      }

      const [savedSettings, savedEntries, savedUsers, savedCurrentUser] = await Promise.all([
        loadData(STORAGE_KEYS.settings, DEFAULT_SETTINGS),
        loadData(STORAGE_KEYS.entries, null),
        loadData(STORAGE_KEYS.users, INITIAL_USERS),
        loadData(STORAGE_KEYS.currentUser, null)
      ]);
      setSettings(savedSettings);
      setUsers(savedUsers);
      if (savedEntries) {
        setEntries(savedEntries);
      } else {
        const seeded = seedEntries();
        setEntries(seeded);
        await saveData(STORAGE_KEYS.entries, seeded);
      }
      if (savedCurrentUser) setCurrentUser(savedCurrentUser);
      setLoading(false);
    })();
  }, []);

  // Persist
  const persistEntries = useCallback(async (next) => {
    setEntries(next);
    await saveData(STORAGE_KEYS.entries, next);
  }, []);

  const persistSettings = useCallback(async (next) => {
    setSettings(next);
    await saveData(STORAGE_KEYS.settings, next);
  }, []);

  const persistUsers = useCallback(async (next) => {
    setUsers(next);
    await saveData(STORAGE_KEYS.users, next);
  }, []);

  const login = useCallback(async (user) => {
    setCurrentUser(user);
    await saveData(STORAGE_KEYS.currentUser, user);
    setPage("dashboard");
    setViewEntry(null);
    setEditEntry(null);
    setNewEntry(false);
  }, []);

  const logout = useCallback(async () => {
    setCurrentUser(null);
    await saveData(STORAGE_KEYS.currentUser, null);
    setPage("dashboard");
    setViewEntry(null);
    setEditEntry(null);
    setNewEntry(false);
  }, []);

  // Derived
  const isTreasurer = currentUser?.role === ROLES.TREASURER;
  const myEntries = useMemo(() =>
    entries.filter(e => isTreasurer || e.userId === currentUser?.id)
      .sort((a, b) => b.date.localeCompare(a.date)),
    [entries, currentUser, isTreasurer]
  );
  const pendingCount = useMemo(() =>
    entries.filter(e => e.status === STATUSES.SUBMITTED).length,
    [entries]
  );

  // Entry CRUD
  const saveEntry = useCallback(async (formData) => {
    if (editEntry) {
      const next = entries.map(e => e.id === editEntry.id ? { ...e, ...formData } : e);
      await persistEntries(next);
      setEditEntry(null);
      setViewEntry({ ...editEntry, ...formData });
    } else {
      const entry = { ...formData, id: uid(), userId: currentUser.id };
      const next = [entry, ...entries];
      await persistEntries(next);
      setNewEntry(false);
      if (formData.status === STATUSES.SUBMITTED) setPage("entries");
      else setViewEntry(entry);
    }
  }, [editEntry, entries, currentUser, persistEntries]);

  const submitEntry = useCallback(async (formData) => {
    const id = editEntry?.id || uid();
    const entry = { ...formData, id, userId: editEntry?.userId || currentUser.id, status: STATUSES.SUBMITTED };
    const next = editEntry
      ? entries.map(e => e.id === id ? entry : e)
      : [entry, ...entries];
    await persistEntries(next);
    setEditEntry(null);
    setNewEntry(false);
    setPage("entries");
  }, [editEntry, entries, currentUser, persistEntries]);

  const deleteEntry = useCallback(async () => {
    if (!editEntry) return;
    await persistEntries(entries.filter(e => e.id !== editEntry.id));
    setEditEntry(null);
    setPage("entries");
  }, [editEntry, entries, persistEntries]);

  const approveEntry = useCallback(async (notes) => {
    if (!viewEntry) return;
    const next = entries.map(e => e.id === viewEntry.id
      ? { ...e, status: STATUSES.APPROVED, reviewerNotes: notes, reviewedAt: new Date().toISOString() }
      : e
    );
    await persistEntries(next);
    setViewEntry({ ...viewEntry, status: STATUSES.APPROVED, reviewerNotes: notes });
  }, [viewEntry, entries, persistEntries]);

  const rejectEntry = useCallback(async (notes) => {
    if (!viewEntry) return;
    const next = entries.map(e => e.id === viewEntry.id
      ? { ...e, status: STATUSES.REJECTED, reviewerNotes: notes, reviewedAt: new Date().toISOString() }
      : e
    );
    await persistEntries(next);
    setViewEntry({ ...viewEntry, status: STATUSES.REJECTED, reviewerNotes: notes });
  }, [viewEntry, entries, persistEntries]);

  // ── Dashboard Stats (must be before early returns to satisfy Rules of Hooks) ──
  const dashStats = useMemo(() => {
    if (!currentUser) return { total: 0, approved: 0, pending: 0, totalReimb: 0, monthReimb: 0, totalHours: 0 };
    const relevant = isTreasurer ? entries : entries.filter(e => e.userId === currentUser.id);
    const approved = relevant.filter(e => e.status === STATUSES.APPROVED);
    const thisMonth = approved.filter(e => e.date.startsWith(new Date().toISOString().slice(0, 7)));
    let totalReimb = 0, monthReimb = 0, totalHours = 0;
    approved.forEach(e => {
      const h = calcHours(e.startTime, e.endTime);
      const r = settings.userRates?.[e.userId] || settings.defaultHourlyRate;
      totalReimb += h * r + calcMaterialsTotal(e.materials);
      totalHours += h;
    });
    thisMonth.forEach(e => {
      const h = calcHours(e.startTime, e.endTime);
      const r = settings.userRates?.[e.userId] || settings.defaultHourlyRate;
      monthReimb += h * r + calcMaterialsTotal(e.materials);
    });
    return { total: relevant.length, approved: approved.length, pending: relevant.filter(e => e.status === STATUSES.SUBMITTED).length, totalReimb, monthReimb, totalHours };
  }, [entries, currentUser, isTreasurer, settings]);

  // ── Loading Screen ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif" }}>
        <div style={{ textAlign: "center", color: "#6b6b60" }}>Loading...</div>
      </div>
    );
  }

  // ── Login Screen ─────────────────────────────────────────────────────────
  if (!currentUser) {
    return <LoginScreen settings={settings} users={users} onLogin={login} />;
  }

  // ── Navigation ─────────────────────────────────────────────────────────────
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: "home" },
    { id: "entries", label: isTreasurer ? "All Entries" : "My Entries", icon: "file" },
    ...(isTreasurer ? [{ id: "review", label: "Review Queue", icon: "inbox", badge: pendingCount }] : []),
    { id: "reports", label: "Reports", icon: "chart" },
    ...(isTreasurer ? [{ id: "settings", label: "Settings", icon: "settings" }] : []),
  ];

  // ── Render Page Content ────────────────────────────────────────────────────
  const renderContent = () => {
    // New / Edit Entry
    if (newEntry || editEntry) {
      return (
        <div>
          <h2 style={{ margin: "0 0 24px", fontSize: 24, fontWeight: 800 }}>
            {editEntry ? "Edit Entry" : "New Work Entry"}
          </h2>
          <div style={{ ...S.card }}>
            <EntryForm
              entry={editEntry}
              settings={settings}
              onSave={saveEntry}
              onSubmit={submitEntry}
              onCancel={() => { setNewEntry(false); setEditEntry(null); }}
              onDelete={deleteEntry}
            />
          </div>
        </div>
      );
    }

    // View Entry Detail
    if (viewEntry) {
      const fresh = entries.find(e => e.id === viewEntry.id) || viewEntry;
      return (
        <EntryDetail
          entry={fresh}
          settings={settings}
          users={users}
          currentUser={currentUser}
          onBack={() => setViewEntry(null)}
          onEdit={() => { setEditEntry(fresh); setViewEntry(null); }}
          onApprove={approveEntry}
          onReject={rejectEntry}
        />
      );
    }

    // Dashboard
    if (page === "dashboard") {
      const recentEntries = myEntries.slice(0, 5);
      return (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Dashboard</h2>
            {!isTreasurer && (
              <button style={S.btnPrimary} onClick={() => setNewEntry(true)}>
                <Icon name="plus" size={16} /> New Entry
              </button>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
            <StatCard label={isTreasurer ? "Total Entries" : "My Entries"} value={dashStats.total} icon="file" />
            <StatCard label="Pending Review" value={dashStats.pending} icon="clock" color="#b5850a" />
            <StatCard label="Approved" value={dashStats.approved} icon="check" color="#2d7a1e" />
            <StatCard label="This Month" value={fmt(dashStats.monthReimb)} icon="dollar" color="#2563eb" />
          </div>

          {isTreasurer && pendingCount > 0 && (
            <div style={{
              ...S.card, background: "#fef5e7", borderColor: "#fae3a7",
              display: "flex", alignItems: "center", justifyContent: "space-between"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Icon name="alert" size={20} />
                <span style={{ fontWeight: 600 }}>{pendingCount} {pendingCount === 1 ? "entry" : "entries"} awaiting your review</span>
              </div>
              <button style={{ ...S.btnPrimary, padding: "8px 16px" }} onClick={() => setPage("review")}>
                Review Now
              </button>
            </div>
          )}

          <div style={{ ...S.card, marginTop: 4 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Recent Entries</h3>
              <button style={S.btnGhost} onClick={() => setPage("entries")}>View all →</button>
            </div>
            {recentEntries.length === 0 ? (
              <EmptyState icon="file" title="No entries yet" desc="Create your first work entry to get started."
                action={!isTreasurer && <button style={S.btnPrimary} onClick={() => setNewEntry(true)}><Icon name="plus" size={16} /> New Entry</button>}
              />
            ) : (
              <div style={{ border: "1px solid #e5e5e0", borderRadius: 10, overflow: "hidden" }}>
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={S.th}>Date</th>
                      {isTreasurer && <th style={S.th}>Member</th>}
                      <th style={S.th}>Category</th>
                      <th style={S.th}>Description</th>
                      <th style={{ ...S.th, textAlign: "right" }}>Total</th>
                      <th style={S.th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentEntries.map(e => {
                      const u = users.find(u => u.id === e.userId);
                      const h = calcHours(e.startTime, e.endTime);
                      const r = settings.userRates?.[e.userId] || settings.defaultHourlyRate;
                      const total = h * r + calcMaterialsTotal(e.materials);
                      return (
                        <tr key={e.id} onClick={() => setViewEntry(e)}
                          style={{ cursor: "pointer", transition: "background 0.1s" }}
                          onMouseEnter={ev => ev.currentTarget.style.background = "#fafaf8"}
                          onMouseLeave={ev => ev.currentTarget.style.background = "transparent"}>
                          <td style={S.td}>{formatDate(e.date)}</td>
                          {isTreasurer && <td style={S.td}>{u?.name}</td>}
                          <td style={S.td}><CategoryBadge category={e.category} /></td>
                          <td style={{ ...S.td, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.description}</td>
                          <td style={{ ...S.td, textAlign: "right", fontWeight: 600 }}>{fmt(total)}</td>
                          <td style={S.td}><StatusBadge status={e.status} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      );
    }

    // Entries List
    if (page === "entries") {
      return (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>{isTreasurer ? "All Entries" : "My Entries"}</h2>
            {!isTreasurer && (
              <button style={S.btnPrimary} onClick={() => setNewEntry(true)}>
                <Icon name="plus" size={16} /> New Entry
              </button>
            )}
          </div>

          {myEntries.length === 0 ? (
            <div style={S.card}>
              <EmptyState icon="file" title="No entries yet" desc="Create your first work entry to track reimbursable work."
                action={!isTreasurer && <button style={S.btnPrimary} onClick={() => setNewEntry(true)}><Icon name="plus" size={16} /> New Entry</button>}
              />
            </div>
          ) : (
            <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Date</th>
                    {isTreasurer && <th style={S.th}>Member</th>}
                    <th style={S.th}>Category</th>
                    <th style={S.th}>Description</th>
                    <th style={{ ...S.th, textAlign: "right" }}>Hours</th>
                    <th style={{ ...S.th, textAlign: "right" }}>Total</th>
                    <th style={S.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {myEntries.map(e => {
                    const u = users.find(u => u.id === e.userId);
                    const h = calcHours(e.startTime, e.endTime);
                    const r = settings.userRates?.[e.userId] || settings.defaultHourlyRate;
                    const total = h * r + calcMaterialsTotal(e.materials);
                    return (
                      <tr key={e.id} onClick={() => setViewEntry(e)}
                        style={{ cursor: "pointer", transition: "background 0.1s" }}
                        onMouseEnter={ev => ev.currentTarget.style.background = "#fafaf8"}
                        onMouseLeave={ev => ev.currentTarget.style.background = "transparent"}>
                        <td style={S.td}>{formatDate(e.date)}</td>
                        {isTreasurer && <td style={S.td}>{u?.name}</td>}
                        <td style={S.td}><CategoryBadge category={e.category} /></td>
                        <td style={{ ...S.td, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.description}</td>
                        <td style={{ ...S.td, textAlign: "right" }}>{fmtHours(h)}</td>
                        <td style={{ ...S.td, textAlign: "right", fontWeight: 600 }}>{fmt(total)}</td>
                        <td style={S.td}><StatusBadge status={e.status} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      );
    }

    // Review Queue (Treasurer only)
    if (page === "review") {
      const pending = entries.filter(e => e.status === STATUSES.SUBMITTED).sort((a, b) => a.date.localeCompare(b.date));
      return (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Review Queue</h2>
              <p style={{ margin: "4px 0 0", fontSize: 14, color: "#6b6b60" }}>{pending.length} entries pending review</p>
            </div>
          </div>

          {pending.length === 0 ? (
            <div style={S.card}>
              <EmptyState icon="check" title="All caught up!" desc="No entries pending review." />
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {pending.map(e => {
                const u = users.find(u => u.id === e.userId);
                const h = calcHours(e.startTime, e.endTime);
                const r = settings.userRates?.[e.userId] || settings.defaultHourlyRate;
                const total = h * r + calcMaterialsTotal(e.materials);
                return (
                  <div key={e.id} style={{ ...S.card, cursor: "pointer", padding: "20px 24px" }}
                    onClick={() => setViewEntry(e)}
                    onMouseEnter={ev => ev.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)"}
                    onMouseLeave={ev => ev.currentTarget.style.boxShadow = "none"}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                          <span style={{ fontWeight: 700, fontSize: 16 }}>{u?.name}</span>
                          <CategoryBadge category={e.category} />
                        </div>
                        <div style={{ fontSize: 14, color: "#4a4a44", marginBottom: 4 }}>{e.description}</div>
                        <div style={{ fontSize: 13, color: "#8a8a82" }}>
                          {formatDate(e.date)} &middot; {formatTime(e.startTime)} – {formatTime(e.endTime)} &middot; {fmtHours(h)}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 20, fontWeight: 800 }}>{fmt(total)}</div>
                        <div style={{ fontSize: 12, color: "#8a8a82" }}>reimbursement</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    // Reports
    if (page === "reports") {
      return <ReportsPage entries={entries} users={users} settings={settings} currentUser={currentUser} />;
    }

    // Settings
    if (page === "settings") {
      return <SettingsPage settings={settings} users={users} onSave={persistSettings} onSaveUsers={persistUsers} />;
    }

    return null;
  };

  // ── Main Layout ────────────────────────────────────────────────────────────
  return (
    <div style={S.app}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #ccc; border-radius: 3px; }
        button:hover { opacity: 0.92; }
        input:focus, select:focus, textarea:focus { border-color: #1a1a18 !important; }
      `}</style>

      {/* Sidebar */}
      <aside style={S.sidebar}>
        <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid #2a2a28" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, background: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <Icon name="home" size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#fff", letterSpacing: "-0.01em" }}>{settings.hoaName}</div>
              <div style={{ fontSize: 11, color: "#6b6b60" }}>Work Tracker</div>
            </div>
          </div>
        </div>

        <nav style={{ padding: "12px 12px", flex: 1 }}>
          {navItems.map(item => (
            <button key={item.id} style={S.navItem(page === item.id && !viewEntry && !editEntry && !newEntry)}
              onClick={() => { setPage(item.id); setViewEntry(null); setEditEntry(null); setNewEntry(false); }}>
              <Icon name={item.icon} size={18} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge > 0 && (
                <span style={{
                  background: "#f97316", color: "#fff", fontSize: 11, fontWeight: 700,
                  padding: "2px 8px", borderRadius: 10, minWidth: 22, textAlign: "center"
                }}>{item.badge}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Current user + logout */}
        <div style={{ padding: "16px 12px", borderTop: "1px solid #2a2a28" }}>
          <div style={{ padding: "10px 12px", borderRadius: 8, background: "#2a2a28", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: currentUser.role === ROLES.TREASURER ? "#f97316" : "#2563eb",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700, color: "#fff"
              }}>
                {currentUser.name.split(" ").map(n => n[0]).join("")}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{currentUser.name}</div>
                <div style={{ fontSize: 11, color: "#6b6b60", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentUser.email}</div>
              </div>
            </div>
          </div>
          <button style={{ ...S.navItem(false), padding: "8px 12px", fontSize: 13 }} onClick={logout}>
            <Icon name="logout" size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={S.main}>
        <header style={S.header}>
          <div>
            <span style={{ fontSize: 14, color: "#8a8a82" }}>
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {!isTreasurer && (
              <button style={S.btnPrimary} onClick={() => { setNewEntry(true); setViewEntry(null); setEditEntry(null); }}>
                <Icon name="plus" size={16} /> New Entry
              </button>
            )}
          </div>
        </header>
        <div style={S.content}>
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
