import { useState, useEffect, useMemo } from "react";

// ─── Constants ───────────────────────────────────────────────────────────────
const CATEGORIES = [
  "Landscaping", "Plumbing", "Electrical", "General Maintenance",
  "Snow Removal", "Cleaning", "Vendor Coordination", "Administrative Work",
  "Emergency Repairs"
];
const STATUSES = { DRAFT: "Draft", SUBMITTED: "Submitted", APPROVED: "Approved", REJECTED: "Rejected" };
const ROLES = { TREASURER: "Treasurer", MEMBER: "Member" };
const DEFAULT_SETTINGS = { hoaName: "24 Mill Street", defaultHourlyRate: 35, userRates: {}, currency: "USD" };
const INITIAL_USERS = [
  { id: "usr_admin", name: "Zsolt Kemecsei", email: "zsolt.kemecsei@gmail.com", role: ROLES.TREASURER }
];

// ─── Storage (synchronous localStorage) ──────────────────────────────────────
function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}
function save(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) { /* ignore */ }
}

// ─── Utilities ───────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 10);
const fmt = (n) => "$" + Number(n || 0).toFixed(2);
const fmtHours = (h) => Number(h || 0).toFixed(2) + " hrs";
const todayStr = () => new Date().toISOString().split("T")[0];
const nowTime = () => {
  const d = new Date();
  return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
};

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
  return (hr > 12 ? hr - 12 : hr || 12) + ":" + m + " " + (hr >= 12 ? "PM" : "AM");
}

// ─── Icon Component ──────────────────────────────────────────────────────────
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
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d={paths[name] || ""} />
    </svg>
  );
};

// ─── Status Badge ────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const c = {
    Draft: { bg: "#f0f0ee", text: "#6b6b60", border: "#ddddd8" },
    Submitted: { bg: "#fef5e7", text: "#b5850a", border: "#fae3a7" },
    Approved: { bg: "#e8f5e4", text: "#2d7a1e", border: "#b8e0ae" },
    Rejected: { bg: "#fde8e8", text: "#c53030", border: "#f5b8b8" },
  }[status] || { bg: "#f0f0ee", text: "#6b6b60", border: "#ddddd8" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px",
      borderRadius: 20, fontSize: 12, fontWeight: 600, background: c.bg, color: c.text,
      border: "1px solid " + c.border
    }}>
      {status === "Approved" && <Icon name="check" size={12} />}
      {status === "Rejected" && <Icon name="x" size={12} />}
      {status === "Submitted" && <Icon name="clock" size={12} />}
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
      borderRadius: 20, fontSize: 12, fontWeight: 500, background: c + "14", color: c,
      border: "1px solid " + c + "30"
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: c }} />
      {category}
    </span>
  );
};

// ─── Common Styles ───────────────────────────────────────────────────────────
const S = {
  app: { display: "flex", minHeight: "100vh", fontFamily: "'DM Sans', 'Helvetica Neue', system-ui, sans-serif", background: "#f7f7f5", color: "#1a1a18" },
  sidebar: { width: 260, background: "#1a1a18", color: "#e8e8e4", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", overflow: "auto", borderRight: "1px solid #2a2a28" },
  main: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column" },
  header: { padding: "20px 32px", borderBottom: "1px solid #e5e5e0", background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10 },
  content: { padding: "24px 32px", flex: 1 },
  card: { background: "#fff", borderRadius: 12, border: "1px solid #e5e5e0", padding: 24, marginBottom: 16 },
  btn: (bg, color, border) => ({ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 20px", background: bg, color: color, border: border ? "1px solid " + border : "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }),
  ghost: { display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "transparent", color: "#6b6b60", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" },
  input: { width: "100%", padding: "10px 14px", border: "1px solid #ddddd8", borderRadius: 8, fontSize: 14, fontFamily: "inherit", background: "#fff", color: "#1a1a18", outline: "none", boxSizing: "border-box" },
  textarea: { width: "100%", padding: "10px 14px", border: "1px solid #ddddd8", borderRadius: 8, fontSize: 14, fontFamily: "inherit", background: "#fff", color: "#1a1a18", outline: "none", resize: "vertical", minHeight: 80, boxSizing: "border-box" },
  select: { width: "100%", padding: "10px 14px", border: "1px solid #ddddd8", borderRadius: 8, fontSize: 14, fontFamily: "inherit", background: "#fff", color: "#1a1a18", outline: "none", cursor: "pointer", boxSizing: "border-box", appearance: "auto" },
  label: { display: "block", fontSize: 13, fontWeight: 600, color: "#4a4a44", marginBottom: 6 },
  field: { marginBottom: 20 },
  th: { textAlign: "left", padding: "12px 16px", fontWeight: 600, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6b6b60", borderBottom: "2px solid #e5e5e0", background: "#fafaf8" },
  td: { padding: "14px 16px", borderBottom: "1px solid #f0f0ee", verticalAlign: "top" },
  navItem: (active) => ({ display: "flex", alignItems: "center", gap: 10, padding: "10px 20px", borderRadius: 8, fontSize: 14, fontWeight: active ? 600 : 400, background: active ? "#2a2a28" : "transparent", color: active ? "#fff" : "#a0a098", cursor: "pointer", border: "none", width: "100%", textAlign: "left", fontFamily: "inherit", margin: "2px 0" }),
};

// ─── Field / Modal / Confirm helpers ─────────────────────────────────────────
const Field = ({ label, required, children }) => (
  <div style={S.field}>
    <label style={S.label}>{label}{required && <span style={{ color: "#c53030" }}> *</span>}</label>
    {children}
  </div>
);

const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)" }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 16, width: 520, maxWidth: "92vw", maxHeight: "88vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid #e5e5e0" }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{title}</h3>
          <button onClick={onClose} style={{ ...S.ghost, padding: 6 }}><Icon name="x" size={20} /></button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  );
};

const ConfirmDialog = ({ open, onClose, onConfirm, title, message, confirmText, danger }) => (
  <Modal open={open} onClose={onClose} title={title}>
    <p style={{ fontSize: 14, color: "#4a4a44", lineHeight: 1.6, margin: "0 0 24px" }}>{message}</p>
    <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
      <button style={S.btn("#fff", "#1a1a18", "#ddddd8")} onClick={onClose}>Cancel</button>
      <button style={S.btn(danger ? "#c53030" : "#1a1a18", "#fff")} onClick={() => { onConfirm(); onClose(); }}>
        {confirmText || "Confirm"}
      </button>
    </div>
  </Modal>
);

const StatCard = ({ label, value, icon, color = "#1a1a18" }) => (
  <div style={{ ...S.card, padding: "20px 24px", display: "flex", alignItems: "center", gap: 16, marginBottom: 0 }}>
    <div style={{ width: 44, height: 44, borderRadius: 10, background: color + "12", display: "flex", alignItems: "center", justifyContent: "center", color }}>
      <Icon name={icon} size={22} />
    </div>
    <div>
      <div style={{ fontSize: 12, color: "#8a8a82", fontWeight: 500, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
    </div>
  </div>
);

// ─── Materials Editor ────────────────────────────────────────────────────────
const MaterialsEditor = ({ materials, onChange, readOnly }) => {
  const add = () => onChange([...materials, { id: uid(), name: "", quantity: 1, unitCost: 0 }]);
  const update = (i, field, val) => { const next = [...materials]; next[i] = { ...next[i], [field]: val }; onChange(next); };
  const remove = (i) => onChange(materials.filter((_, idx) => idx !== i));
  const total = calcMaterialsTotal(materials);
  return (
    <div>
      {materials.length > 0 && (
        <div style={{ border: "1px solid #e5e5e0", borderRadius: 10, overflow: "hidden", marginBottom: 12 }}>
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
                  {!readOnly && <td style={S.td}><button style={{ ...S.ghost, padding: 4, color: "#c53030" }} onClick={() => remove(i)}><Icon name="trash" size={16} /></button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!readOnly && <button style={{ ...S.ghost, color: "#1a1a18" }} onClick={add}><Icon name="plus" size={16} /> Add Material</button>}
      {materials.length > 0 && <div style={{ textAlign: "right", fontSize: 14, fontWeight: 700, marginTop: 8 }}>Materials Total: {fmt(total)}</div>}
    </div>
  );
};

// ─── Entry Form ──────────────────────────────────────────────────────────────
const EntryForm = ({ entry, settings, onSave, onCancel, onSubmit, onDelete }) => {
  const [form, setForm] = useState({
    date: entry?.date || todayStr(), startTime: entry?.startTime || nowTime(), endTime: entry?.endTime || "",
    category: entry?.category || "", description: entry?.description || "", location: entry?.location || "",
    materials: entry?.materials || [], notes: entry?.notes || "", mileage: entry?.mileage || "",
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

  const errStyle = (f) => errors[f] ? { border: "1px solid #c53030" } : {};

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        <Field label="Date" required><input type="date" style={{ ...S.input, ...errStyle("date") }} value={form.date} onChange={e => set("date", e.target.value)} />{errors.date && <span style={{ color: "#c53030", fontSize: 12 }}>{errors.date}</span>}</Field>
        <Field label="Start Time" required><input type="time" style={{ ...S.input, ...errStyle("startTime") }} value={form.startTime} onChange={e => set("startTime", e.target.value)} />{errors.startTime && <span style={{ color: "#c53030", fontSize: 12 }}>{errors.startTime}</span>}</Field>
        <Field label="End Time" required><input type="time" style={{ ...S.input, ...errStyle("endTime") }} value={form.endTime} onChange={e => set("endTime", e.target.value)} />{errors.endTime && <span style={{ color: "#c53030", fontSize: 12 }}>{errors.endTime}</span>}</Field>
      </div>
      <Field label="Category" required>
        <select style={{ ...S.select, ...errStyle("category") }} value={form.category} onChange={e => set("category", e.target.value)}>
          <option value="">Select category...</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>{errors.category && <span style={{ color: "#c53030", fontSize: 12 }}>{errors.category}</span>}
      </Field>
      <Field label="Task Description" required>
        <textarea style={{ ...S.textarea, ...errStyle("description") }} value={form.description} onChange={e => set("description", e.target.value)} placeholder="Describe the work performed..." />
        {errors.description && <span style={{ color: "#c53030", fontSize: 12 }}>{errors.description}</span>}
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Field label="Location"><input style={S.input} value={form.location} onChange={e => set("location", e.target.value)} placeholder="e.g. Unit 3B" /></Field>
        <Field label="Mileage"><input type="number" min="0" style={S.input} value={form.mileage} onChange={e => set("mileage", e.target.value)} placeholder="Miles driven" /></Field>
      </div>
      <Field label="Materials"><MaterialsEditor materials={form.materials} onChange={m => set("materials", m)} /></Field>
      <Field label="Notes"><textarea style={{ ...S.textarea, minHeight: 60 }} value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Additional notes..." /></Field>

      {/* Summary */}
      <div style={{ background: "#fafaf8", borderRadius: 10, padding: 20, marginBottom: 24, border: "1px solid #e5e5e0" }}>
        <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", color: "#6b6b60", marginBottom: 12 }}>Reimbursement Summary</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16 }}>
          <div><div style={{ fontSize: 12, color: "#8a8a82" }}>Hours</div><div style={{ fontSize: 18, fontWeight: 700 }}>{fmtHours(hours)}</div></div>
          <div><div style={{ fontSize: 12, color: "#8a8a82" }}>Labor ({fmt(rate)}/hr)</div><div style={{ fontSize: 18, fontWeight: 700 }}>{fmt(laborTotal)}</div></div>
          <div><div style={{ fontSize: 12, color: "#8a8a82" }}>Materials</div><div style={{ fontSize: 18, fontWeight: 700 }}>{fmt(matTotal)}</div></div>
          <div><div style={{ fontSize: 12, color: "#8a8a82" }}>Total</div><div style={{ fontSize: 22, fontWeight: 800 }}>{fmt(grandTotal)}</div></div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "space-between" }}>
        <div>{entry && entry.status === STATUSES.DRAFT && <button style={S.btn("#fde8e8", "#c53030", "#f5b8b8")} onClick={() => setShowDeleteConfirm(true)}><Icon name="trash" size={16} /> Delete</button>}</div>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={S.btn("#fff", "#1a1a18", "#ddddd8")} onClick={onCancel}>Cancel</button>
          <button style={S.btn("#fff", "#1a1a18", "#ddddd8")} onClick={() => { if (validate()) onSave({ ...form, status: STATUSES.DRAFT }); }}><Icon name="edit" size={16} /> Save Draft</button>
          <button style={S.btn("#1a1a18", "#fff")} onClick={() => { if (validate()) setShowSubmitConfirm(true); }}><Icon name="send" size={16} /> Submit for Review</button>
        </div>
      </div>
      <ConfirmDialog open={showSubmitConfirm} onClose={() => setShowSubmitConfirm(false)} title="Submit Entry?" message={"Submit for review? Total: " + fmt(grandTotal)} confirmText="Submit" onConfirm={() => onSubmit({ ...form, status: STATUSES.SUBMITTED })} />
      <ConfirmDialog open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Delete Entry?" message="This draft will be permanently deleted." confirmText="Delete" danger onConfirm={onDelete} />
    </div>
  );
};

// ─── Entry Detail ────────────────────────────────────────────────────────────
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
      <button style={{ ...S.ghost, marginBottom: 20, padding: "6px 0" }} onClick={onBack}><Icon name="back" size={18} /> Back to entries</button>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>{entry.category}</h2>
            <StatusBadge status={entry.status} />
          </div>
          <div style={{ fontSize: 14, color: "#6b6b60" }}>{formatDate(entry.date)} · {formatTime(entry.startTime)} – {formatTime(entry.endTime)} · {user?.name || "Unknown"}</div>
        </div>
        {canEdit && <button style={S.btn("#1a1a18", "#fff")} onClick={onEdit}><Icon name="edit" size={16} /> Edit</button>}
      </div>

      <div style={S.card}>
        <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", color: "#6b6b60", marginBottom: 12 }}>Task Description</div>
        <p style={{ margin: 0, lineHeight: 1.7 }}>{entry.description}</p>
        {entry.location && <div style={{ marginTop: 12, fontSize: 13, color: "#6b6b60" }}>📍 {entry.location}</div>}
        {entry.mileage && <div style={{ marginTop: 6, fontSize: 13, color: "#6b6b60" }}>🚗 {entry.mileage} miles</div>}
        {entry.notes && <div style={{ marginTop: 12, padding: 14, background: "#fafaf8", borderRadius: 8, fontSize: 13 }}>{entry.notes}</div>}
      </div>

      {entry.materials?.length > 0 && <div style={S.card}><div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", color: "#6b6b60", marginBottom: 12 }}>Materials</div><MaterialsEditor materials={entry.materials} readOnly onChange={() => {}} /></div>}

      <div style={{ ...S.card, background: "#fafaf8", display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 20 }}>
        <div><div style={{ fontSize: 12, color: "#8a8a82", marginBottom: 4 }}>Hours</div><div style={{ fontSize: 20, fontWeight: 700 }}>{fmtHours(hours)}</div></div>
        <div><div style={{ fontSize: 12, color: "#8a8a82", marginBottom: 4 }}>Labor ({fmt(rate)}/hr)</div><div style={{ fontSize: 20, fontWeight: 700 }}>{fmt(laborTotal)}</div></div>
        <div><div style={{ fontSize: 12, color: "#8a8a82", marginBottom: 4 }}>Materials</div><div style={{ fontSize: 20, fontWeight: 700 }}>{fmt(matTotal)}</div></div>
        <div><div style={{ fontSize: 12, color: "#8a8a82", marginBottom: 4 }}>Total</div><div style={{ fontSize: 24, fontWeight: 800 }}>{fmt(grandTotal)}</div></div>
      </div>

      {(entry.reviewerNotes || canReview) && (
        <div style={{ ...S.card, borderColor: entry.status === STATUSES.REJECTED ? "#f5b8b8" : "#e5e5e0" }}>
          <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", color: "#6b6b60", marginBottom: 12 }}>Reviewer Notes</div>
          {canReview ? <textarea style={S.textarea} value={reviewNotes} onChange={e => setReviewNotes(e.target.value)} placeholder="Add notes..." />
            : entry.reviewerNotes ? <div style={{ padding: 14, background: "#fafaf8", borderRadius: 8, fontSize: 14 }}>{entry.reviewerNotes}</div>
            : <div style={{ color: "#8a8a82", fontSize: 14 }}>No notes yet.</div>}
        </div>
      )}

      {canReview && (
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
          <button style={S.btn("#c53030", "#fff")} onClick={() => { if (!reviewNotes.trim()) { alert("Please add a note explaining the rejection."); return; } setShowRejectConfirm(true); }}><Icon name="x" size={16} /> Reject</button>
          <button style={S.btn("#2d7a1e", "#fff")} onClick={() => setShowApproveConfirm(true)}><Icon name="check" size={16} /> Approve</button>
        </div>
      )}
      <ConfirmDialog open={showApproveConfirm} onClose={() => setShowApproveConfirm(false)} title="Approve?" message={"Approve " + fmt(grandTotal) + " for " + (user?.name || "member") + "?"} confirmText="Approve" onConfirm={() => onApprove(reviewNotes)} />
      <ConfirmDialog open={showRejectConfirm} onClose={() => setShowRejectConfirm(false)} title="Reject?" message="Member can edit and resubmit." confirmText="Reject" danger onConfirm={() => onReject(reviewNotes)} />
    </div>
  );
};

// ─── Reports Page ────────────────────────────────────────────────────────────
const ReportsPage = ({ entries, users, settings, currentUser }) => {
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
    filtered.forEach(e => { const h = calcHours(e.startTime, e.endTime); const r = settings.userRates?.[e.userId] || settings.defaultHourlyRate; totalHours += h; totalLabor += h * r; totalMat += calcMaterialsTotal(e.materials); });
    return { totalHours, totalLabor, totalMat, grand: totalLabor + totalMat };
  }, [filtered, settings]);

  const exportCSV = () => {
    const header = "Date,Member,Category,Description,Hours,Rate,Labor,Materials,Total";
    const rows = filtered.map(e => { const u = users.find(u => u.id === e.userId); const h = calcHours(e.startTime, e.endTime); const r = settings.userRates?.[e.userId] || settings.defaultHourlyRate; const l = h * r; const m = calcMaterialsTotal(e.materials); return e.date + ',"' + (u?.name || "") + '","' + e.category + '","' + e.description.replace(/"/g, '""') + '",' + h.toFixed(2) + ',' + r.toFixed(2) + ',' + l.toFixed(2) + ',' + m.toFixed(2) + ',' + (l + m).toFixed(2); });
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = settings.hoaName.replace(/\s+/g, "_") + "_Report.csv"; a.click();
  };

  return (
    <div>
      <h2 style={{ margin: "0 0 24px", fontSize: 24, fontWeight: 800 }}>Reports</h2>
      <div style={S.card}>
        <div style={{ display: "grid", gridTemplateColumns: isTreasurer ? "1fr 1fr 1fr 1fr" : "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
          <Field label="From"><input type="date" style={S.input} value={dateFrom} onChange={e => setDateFrom(e.target.value)} /></Field>
          <Field label="To"><input type="date" style={S.input} value={dateTo} onChange={e => setDateTo(e.target.value)} /></Field>
          {isTreasurer && <Field label="Member"><select style={S.select} value={filterUser} onChange={e => setFilterUser(e.target.value)}><option value="all">All Members</option>{users.filter(u => u.role === ROLES.MEMBER).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></Field>}
          <Field label="Status"><select style={S.select} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}><option value={STATUSES.APPROVED}>Approved Only</option><option value="all">All</option></select></Field>
        </div>
        <button style={S.btn("#1a1a18", "#fff")} onClick={() => setGenerated(true)}><Icon name="chart" size={16} /> Generate Report</button>
      </div>
      {generated && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
            <StatCard label="Entries" value={filtered.length} icon="file" />
            <StatCard label="Total Hours" value={fmtHours(totals.totalHours)} icon="clock" color="#2563eb" />
            <StatCard label="Labor" value={fmt(totals.totalLabor)} icon="users" color="#16a34a" />
            <StatCard label="Grand Total" value={fmt(totals.grand)} icon="dollar" />
          </div>
          <div style={S.card}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <div><h3 style={{ margin: 0 }}>{settings.hoaName}</h3><div style={{ fontSize: 13, color: "#6b6b60" }}>{formatDate(dateFrom)} – {formatDate(dateTo)}</div></div>
              <button style={S.btn("#fff", "#1a1a18", "#ddddd8")} onClick={exportCSV}><Icon name="download" size={16} /> CSV</button>
            </div>
            {filtered.length === 0 ? <div style={{ textAlign: "center", padding: 40, color: "#8a8a82" }}>No entries found.</div> : (
              <div style={{ border: "1px solid #e5e5e0", borderRadius: 10, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead><tr><th style={S.th}>Date</th>{isTreasurer && <th style={S.th}>Member</th>}<th style={S.th}>Category</th><th style={S.th}>Description</th><th style={{ ...S.th, textAlign: "right" }}>Hours</th><th style={{ ...S.th, textAlign: "right" }}>Total</th></tr></thead>
                  <tbody>{filtered.map(e => { const u = users.find(u => u.id === e.userId); const h = calcHours(e.startTime, e.endTime); const r = settings.userRates?.[e.userId] || settings.defaultHourlyRate; return (
                    <tr key={e.id}><td style={S.td}>{formatDate(e.date)}</td>{isTreasurer && <td style={S.td}>{u?.name}</td>}<td style={S.td}><CategoryBadge category={e.category} /></td><td style={{ ...S.td, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.description}</td><td style={{ ...S.td, textAlign: "right" }}>{h.toFixed(2)}</td><td style={{ ...S.td, textAlign: "right", fontWeight: 700 }}>{fmt(h * r + calcMaterialsTotal(e.materials))}</td></tr>
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

// ─── Settings Page ───────────────────────────────────────────────────────────
const SettingsPage = ({ settings, users, onSaveSettings, onSaveUsers }) => {
  const [form, setForm] = useState({ ...settings });
  const [saved, setSaved] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [memberError, setMemberError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const handleSave = () => { onSaveSettings(form); setSaved(true); setTimeout(() => setSaved(false), 2000); };
  const addMember = () => {
    setMemberError("");
    const email = newEmail.trim().toLowerCase();
    const name = newName.trim();
    if (!name) { setMemberError("Name is required"); return; }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setMemberError("Valid email is required"); return; }
    if (users.some(u => u.email.toLowerCase() === email)) { setMemberError("Email already registered"); return; }
    onSaveUsers([...users, { id: "usr_" + uid(), name, email, role: ROLES.MEMBER }]);
    setNewName(""); setNewEmail("");
  };
  const removeMember = (id) => { onSaveUsers(users.filter(u => u.id !== id)); setDeleteTarget(null); };
  const members = users.filter(u => u.role === ROLES.MEMBER);

  return (
    <div>
      <h2 style={{ margin: "0 0 24px", fontSize: 24, fontWeight: 800 }}>Settings</h2>
      <div style={{ ...S.card, maxWidth: 600 }}>
        <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", color: "#6b6b60", marginBottom: 16 }}>HOA Configuration</div>
        <Field label="HOA Name"><input style={S.input} value={form.hoaName} onChange={e => set("hoaName", e.target.value)} /></Field>
        <Field label="Default Hourly Rate ($)"><input type="number" min="0" step="0.50" style={S.input} value={form.defaultHourlyRate} onChange={e => set("defaultHourlyRate", Number(e.target.value))} /></Field>
        <button style={S.btn("#1a1a18", "#fff")} onClick={handleSave}>{saved ? "Saved!" : "Save Settings"}</button>
      </div>
      <div style={{ ...S.card, maxWidth: 600, marginTop: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", color: "#6b6b60", marginBottom: 16 }}>HOA Members</div>
        <div style={{ padding: 16, background: "#fafaf8", borderRadius: 10, border: "1px solid #e5e5e0", marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Add New Member</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><label style={S.label}>Full Name</label><input style={S.input} value={newName} onChange={e => setNewName(e.target.value)} placeholder="Jordan Chen" onKeyDown={e => e.key === "Enter" && addMember()} /></div>
            <div><label style={S.label}>Email</label><input style={S.input} value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="jordan@email.com" onKeyDown={e => e.key === "Enter" && addMember()} /></div>
          </div>
          {memberError && <div style={{ color: "#c53030", fontSize: 13, marginBottom: 10 }}>{memberError}</div>}
          <button style={S.btn("#1a1a18", "#fff")} onClick={addMember}><Icon name="plus" size={16} /> Add Member</button>
        </div>
        {members.length === 0 ? <div style={{ textAlign: "center", padding: 24, color: "#8a8a82", fontSize: 14 }}>No members yet.</div> : (
          <div style={{ border: "1px solid #e5e5e0", borderRadius: 10, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead><tr><th style={S.th}>Name</th><th style={S.th}>Email</th><th style={{ ...S.th, width: 120 }}>Rate</th><th style={{ ...S.th, width: 50 }}></th></tr></thead>
              <tbody>{members.map(u => (
                <tr key={u.id}>
                  <td style={{ ...S.td, fontWeight: 500 }}>{u.name}</td>
                  <td style={{ ...S.td, color: "#6b6b60" }}>{u.email}</td>
                  <td style={S.td}><input type="number" min="0" step="0.50" style={{ ...S.input, padding: "6px 10px" }} value={form.userRates?.[u.id] || ""} onChange={e => set("userRates", { ...form.userRates, [u.id]: Number(e.target.value) || undefined })} placeholder={"$" + form.defaultHourlyRate} /></td>
                  <td style={S.td}><button style={{ ...S.ghost, padding: 6, color: "#c53030" }} onClick={() => setDeleteTarget(u)}><Icon name="trash" size={16} /></button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        {members.length > 0 && <div style={{ marginTop: 12 }}><button style={S.btn("#1a1a18", "#fff")} onClick={handleSave}>{saved ? "Saved!" : "Save Rates"}</button></div>}
      </div>
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Remove Member?" message={deleteTarget ? "Remove " + deleteTarget.name + "?" : ""} confirmText="Remove" danger onConfirm={() => removeMember(deleteTarget.id)} />
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [currentUser, setCurrentUser] = useState(() => load("hoa-user", null));
  const [users, setUsers] = useState(() => load("hoa-users", INITIAL_USERS));
  const [entries, setEntries] = useState(() => load("hoa-entries", []));
  const [settings, setSettings] = useState(() => load("hoa-settings", DEFAULT_SETTINGS));
  const [page, setPage] = useState("dashboard");
  const [viewEntry, setViewEntry] = useState(null);
  const [editEntry, setEditEntry] = useState(null);
  const [newEntry, setNewEntry] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginError, setLoginError] = useState("");

  // Persist on change
  useEffect(() => { save("hoa-user", currentUser); }, [currentUser]);
  useEffect(() => { save("hoa-users", users); }, [users]);
  useEffect(() => { save("hoa-entries", entries); }, [entries]);
  useEffect(() => { save("hoa-settings", settings); }, [settings]);

  // Derived
  const isTreasurer = currentUser?.role === ROLES.TREASURER;
  const myEntries = entries
    .filter(e => isTreasurer || e.userId === currentUser?.id)
    .sort((a, b) => b.date.localeCompare(a.date));
  const pendingCount = entries.filter(e => e.status === STATUSES.SUBMITTED).length;

  // Auth
  const handleLogin = () => {
    setLoginError("");
    const email = loginEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setLoginError("Please enter a valid email"); return; }
    const user = users.find(u => u.email.toLowerCase() === email);
    if (!user) { setLoginError("No account found. Contact your HOA Treasurer."); return; }
    setCurrentUser(user);
    setPage("dashboard");
  };
  const handleLogout = () => { setCurrentUser(null); setLoginEmail(""); setLoginError(""); setPage("dashboard"); setViewEntry(null); setEditEntry(null); setNewEntry(false); };

  // Entry operations
  const doSave = (formData) => {
    if (editEntry) {
      setEntries(entries.map(e => e.id === editEntry.id ? { ...e, ...formData } : e));
      setViewEntry({ ...editEntry, ...formData }); setEditEntry(null);
    } else {
      const entry = { ...formData, id: uid(), userId: currentUser.id };
      setEntries([entry, ...entries]); setNewEntry(false);
      if (formData.status === STATUSES.SUBMITTED) setPage("entries"); else setViewEntry(entry);
    }
  };
  const doSubmit = (formData) => {
    const id = editEntry?.id || uid();
    const entry = { ...formData, id, userId: editEntry?.userId || currentUser.id, status: STATUSES.SUBMITTED };
    setEntries(editEntry ? entries.map(e => e.id === id ? entry : e) : [entry, ...entries]);
    setEditEntry(null); setNewEntry(false); setPage("entries");
  };
  const doDelete = () => { if (editEntry) { setEntries(entries.filter(e => e.id !== editEntry.id)); setEditEntry(null); setPage("entries"); } };
  const doApprove = (notes) => { if (viewEntry) { setEntries(entries.map(e => e.id === viewEntry.id ? { ...e, status: STATUSES.APPROVED, reviewerNotes: notes, reviewedAt: new Date().toISOString() } : e)); setViewEntry({ ...viewEntry, status: STATUSES.APPROVED, reviewerNotes: notes }); } };
  const doReject = (notes) => { if (viewEntry) { setEntries(entries.map(e => e.id === viewEntry.id ? { ...e, status: STATUSES.REJECTED, reviewerNotes: notes, reviewedAt: new Date().toISOString() } : e)); setViewEntry({ ...viewEntry, status: STATUSES.REJECTED, reviewerNotes: notes }); } };

  // Dashboard stats
  const dashStats = (() => {
    if (!currentUser) return { total: 0, approved: 0, pending: 0, monthReimb: 0 };
    const relevant = isTreasurer ? entries : entries.filter(e => e.userId === currentUser.id);
    const approved = relevant.filter(e => e.status === STATUSES.APPROVED);
    const thisMonth = approved.filter(e => e.date.startsWith(new Date().toISOString().slice(0, 7)));
    let monthReimb = 0;
    thisMonth.forEach(e => { const h = calcHours(e.startTime, e.endTime); const r = settings.userRates?.[e.userId] || settings.defaultHourlyRate; monthReimb += h * r + calcMaterialsTotal(e.materials); });
    return { total: relevant.length, approved: approved.length, pending: relevant.filter(e => e.status === STATUSES.SUBMITTED).length, monthReimb };
  })();

  // ── LOGIN SCREEN ───────────────────────────────────────────────────────────
  if (!currentUser) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(145deg, #1a1a18 0%, #2a2a28 50%, #1a1a18 100%)", fontFamily: "'DM Sans', 'Helvetica Neue', system-ui, sans-serif" }}>
        <div style={{ textAlign: "center", maxWidth: 400, width: "100%", padding: "0 20px" }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}><Icon name="home" size={32} /></div>
          <h1 style={{ color: "#fff", margin: "0 0 8px", fontSize: 28, fontWeight: 800 }}>{settings.hoaName}</h1>
          <p style={{ color: "#8a8a82", margin: "0 0 36px", fontSize: 15 }}>HOA Work Tracker</p>
          <div style={{ background: "#2a2a28", border: "1px solid #3a3a38", borderRadius: 16, padding: 32, textAlign: "left" }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#fff", marginBottom: 4 }}>Sign in</div>
            <div style={{ fontSize: 13, color: "#8a8a82", marginBottom: 24 }}>Enter your email address to continue</div>
            <label style={{ ...S.label, color: "#a0a098" }}>Email Address</label>
            <input type="email" style={{ ...S.input, background: "#1a1a18", color: "#fff", border: loginError ? "1px solid #c53030" : "1px solid #3a3a38", marginBottom: loginError ? 8 : 20, fontSize: 15, padding: "12px 16px" }} value={loginEmail} onChange={e => { setLoginEmail(e.target.value); setLoginError(""); }} onKeyDown={e => e.key === "Enter" && handleLogin()} placeholder="you@example.com" autoFocus />
            {loginError && <div style={{ color: "#f87171", fontSize: 13, marginBottom: 16, display: "flex", alignItems: "flex-start", gap: 6 }}><Icon name="alert" size={14} /><span>{loginError}</span></div>}
            <button style={{ ...S.btn("#fff", "#1a1a18"), width: "100%", justifyContent: "center", padding: "12px 20px", fontSize: 15, borderRadius: 10 }} onClick={handleLogin}>Continue</button>
          </div>
          <p style={{ color: "#4a4a44", fontSize: 12, marginTop: 24 }}>Don't have an account? Ask your HOA Treasurer to add you.</p>
        </div>
      </div>
    );
  }

  // ── NAV ITEMS ──────────────────────────────────────────────────────────────
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: "home" },
    { id: "entries", label: isTreasurer ? "All Entries" : "My Entries", icon: "file" },
    ...(isTreasurer ? [{ id: "review", label: "Review Queue", icon: "inbox", badge: pendingCount }] : []),
    { id: "reports", label: "Reports", icon: "chart" },
    ...(isTreasurer ? [{ id: "settings", label: "Settings", icon: "settings" }] : []),
  ];

  // ── PAGE CONTENT ───────────────────────────────────────────────────────────
  const renderPage = () => {
    if (newEntry || editEntry) return (
      <div><h2 style={{ margin: "0 0 24px", fontSize: 24, fontWeight: 800 }}>{editEntry ? "Edit Entry" : "New Work Entry"}</h2>
        <div style={S.card}><EntryForm entry={editEntry} settings={settings} onSave={doSave} onSubmit={doSubmit} onCancel={() => { setNewEntry(false); setEditEntry(null); }} onDelete={doDelete} /></div></div>
    );

    if (viewEntry) {
      const fresh = entries.find(e => e.id === viewEntry.id) || viewEntry;
      return <EntryDetail entry={fresh} settings={settings} users={users} currentUser={currentUser} onBack={() => setViewEntry(null)} onEdit={() => { setEditEntry(fresh); setViewEntry(null); }} onApprove={doApprove} onReject={doReject} />;
    }

    if (page === "dashboard") {
      const recent = myEntries.slice(0, 5);
      return (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Dashboard</h2>
            {!isTreasurer && <button style={S.btn("#1a1a18", "#fff")} onClick={() => setNewEntry(true)}><Icon name="plus" size={16} /> New Entry</button>}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
            <StatCard label={isTreasurer ? "Total Entries" : "My Entries"} value={dashStats.total} icon="file" />
            <StatCard label="Pending Review" value={dashStats.pending} icon="clock" color="#b5850a" />
            <StatCard label="Approved" value={dashStats.approved} icon="check" color="#2d7a1e" />
            <StatCard label="This Month" value={fmt(dashStats.monthReimb)} icon="dollar" color="#2563eb" />
          </div>
          {isTreasurer && pendingCount > 0 && (
            <div style={{ ...S.card, background: "#fef5e7", borderColor: "#fae3a7", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}><Icon name="alert" size={20} /><span style={{ fontWeight: 600 }}>{pendingCount} entry(ies) awaiting review</span></div>
              <button style={{ ...S.btn("#1a1a18", "#fff"), padding: "8px 16px" }} onClick={() => setPage("review")}>Review Now</button>
            </div>
          )}
          <div style={S.card}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}><h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Recent Entries</h3><button style={S.ghost} onClick={() => setPage("entries")}>View all →</button></div>
            {recent.length === 0 ? <div style={{ textAlign: "center", padding: 40, color: "#8a8a82" }}>No entries yet.{!isTreasurer && " Create your first work entry."}</div> : (
              <div style={{ border: "1px solid #e5e5e0", borderRadius: 10, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead><tr><th style={S.th}>Date</th>{isTreasurer && <th style={S.th}>Member</th>}<th style={S.th}>Category</th><th style={S.th}>Description</th><th style={{ ...S.th, textAlign: "right" }}>Total</th><th style={S.th}>Status</th></tr></thead>
                  <tbody>{recent.map(e => { const u = users.find(u => u.id === e.userId); const h = calcHours(e.startTime, e.endTime); const r = settings.userRates?.[e.userId] || settings.defaultHourlyRate; const total = h * r + calcMaterialsTotal(e.materials); return (
                    <tr key={e.id} onClick={() => setViewEntry(e)} style={{ cursor: "pointer" }} onMouseEnter={ev => ev.currentTarget.style.background = "#fafaf8"} onMouseLeave={ev => ev.currentTarget.style.background = "transparent"}>
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
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>{isTreasurer ? "All Entries" : "My Entries"}</h2>
          {!isTreasurer && <button style={S.btn("#1a1a18", "#fff")} onClick={() => setNewEntry(true)}><Icon name="plus" size={16} /> New Entry</button>}
        </div>
        {myEntries.length === 0 ? <div style={{ ...S.card, textAlign: "center", padding: 60, color: "#8a8a82" }}>No entries yet.</div> : (
          <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead><tr><th style={S.th}>Date</th>{isTreasurer && <th style={S.th}>Member</th>}<th style={S.th}>Category</th><th style={S.th}>Description</th><th style={{ ...S.th, textAlign: "right" }}>Hours</th><th style={{ ...S.th, textAlign: "right" }}>Total</th><th style={S.th}>Status</th></tr></thead>
              <tbody>{myEntries.map(e => { const u = users.find(u => u.id === e.userId); const h = calcHours(e.startTime, e.endTime); const r = settings.userRates?.[e.userId] || settings.defaultHourlyRate; const total = h * r + calcMaterialsTotal(e.materials); return (
                <tr key={e.id} onClick={() => setViewEntry(e)} style={{ cursor: "pointer" }} onMouseEnter={ev => ev.currentTarget.style.background = "#fafaf8"} onMouseLeave={ev => ev.currentTarget.style.background = "transparent"}>
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
        <div>
          <h2 style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 800 }}>Review Queue</h2>
          <p style={{ margin: "0 0 24px", fontSize: 14, color: "#6b6b60" }}>{pending.length} entries pending</p>
          {pending.length === 0 ? <div style={{ ...S.card, textAlign: "center", padding: 60, color: "#8a8a82" }}>All caught up!</div> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {pending.map(e => { const u = users.find(u => u.id === e.userId); const h = calcHours(e.startTime, e.endTime); const r = settings.userRates?.[e.userId] || settings.defaultHourlyRate; const total = h * r + calcMaterialsTotal(e.materials); return (
                <div key={e.id} style={{ ...S.card, cursor: "pointer", padding: "20px 24px" }} onClick={() => setViewEntry(e)}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div><div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}><span style={{ fontWeight: 700, fontSize: 16 }}>{u?.name}</span><CategoryBadge category={e.category} /></div><div style={{ fontSize: 14, color: "#4a4a44", marginBottom: 4 }}>{e.description}</div><div style={{ fontSize: 13, color: "#8a8a82" }}>{formatDate(e.date)} · {fmtHours(h)}</div></div>
                    <div style={{ textAlign: "right" }}><div style={{ fontSize: 20, fontWeight: 800 }}>{fmt(total)}</div><div style={{ fontSize: 12, color: "#8a8a82" }}>reimbursement</div></div>
                  </div>
                </div>); })}
            </div>
          )}
        </div>
      );
    }

    if (page === "reports") return <ReportsPage entries={entries} users={users} settings={settings} currentUser={currentUser} />;
    if (page === "settings") return <SettingsPage settings={settings} users={users} onSaveSettings={s => setSettings(s)} onSaveUsers={u => setUsers(u)} />;
    return null;
  };

  // ── MAIN LAYOUT ────────────────────────────────────────────────────────────
  return (
    <div style={S.app}>
      <style>{"button:hover { opacity: 0.92; } input:focus, select:focus, textarea:focus { border-color: #1a1a18 !important; }"}</style>
      <aside style={S.sidebar}>
        <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid #2a2a28" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="home" size={18} /></div>
            <div><div style={{ fontWeight: 700, fontSize: 15, color: "#fff" }}>{settings.hoaName}</div><div style={{ fontSize: 11, color: "#6b6b60" }}>Work Tracker</div></div>
          </div>
        </div>
        <nav style={{ padding: "12px 12px", flex: 1 }}>
          {navItems.map(item => (
            <button key={item.id} style={S.navItem(page === item.id && !viewEntry && !editEntry && !newEntry)} onClick={() => { setPage(item.id); setViewEntry(null); setEditEntry(null); setNewEntry(false); }}>
              <Icon name={item.icon} size={18} /><span style={{ flex: 1 }}>{item.label}</span>
              {item.badge > 0 && <span style={{ background: "#f97316", color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10 }}>{item.badge}</span>}
            </button>
          ))}
        </nav>
        <div style={{ padding: "16px 12px", borderTop: "1px solid #2a2a28" }}>
          <div style={{ padding: "10px 12px", borderRadius: 8, background: "#2a2a28", marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: isTreasurer ? "#f97316" : "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff" }}>{currentUser.name.split(" ").map(n => n[0]).join("")}</div>
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{currentUser.name}</div><div style={{ fontSize: 11, color: "#6b6b60", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentUser.email}</div></div>
          </div>
          <button style={{ ...S.navItem(false), padding: "8px 12px", fontSize: 13 }} onClick={handleLogout}><Icon name="logout" size={16} /> Sign Out</button>
        </div>
      </aside>
      <main style={S.main}>
        <header style={S.header}>
          <span style={{ fontSize: 14, color: "#8a8a82" }}>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</span>
          {!isTreasurer && <button style={S.btn("#1a1a18", "#fff")} onClick={() => { setNewEntry(true); setViewEntry(null); setEditEntry(null); }}><Icon name="plus" size={16} /> New Entry</button>}
        </header>
        <div style={S.content}>{renderPage()}</div>
      </main>
    </div>
  );
}
