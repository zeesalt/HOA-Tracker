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

export const CommunityInsights = ({ fetchStats, settings, mob, cachedStats, onStatsCached, entries = [], users = [] }) => {
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
