import { useState, useEffect, useMemo, useRef } from "react";
import {
  BRAND, CATEGORIES, CATEGORY_EMOJIS, STATUSES, ROLES, DEFAULT_SETTINGS,
  MOBILE_BP, IRS_MILEAGE_RATE,
  PURCHASE_CATEGORIES, PURCHASE_CATEGORY_EMOJIS, PAYMENT_METHODS,
  useIsMobile, useOnline,
  uid, fmt, fmtHours, todayStr, nowTime, relativeDate,
  calcHours, calcLabor, calcMaterialsTotal, formatDate, timeAgo, formatTime, getUserRate,
  compressImage,
  Icon, StatusBadge, catColors, CategoryBadge, RoleBadge,
  S, Field, Modal, ConfirmDialog, StatCard,
  ImageUploader, MaterialsEditor,
} from "./shared";

export const PaymentRunPage = ({ entries, purchaseEntries, users, settings, onMarkPaid, onMarkPurchasePaid, mob }) => {
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

