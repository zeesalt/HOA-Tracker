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
  S, Field, Modal, ConfirmDialog, StatCard, AnimatedBar,
  ImageUploader, MaterialsEditor,
} from "../shared";

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Data Quality Score
// ═══════════════════════════════════════════════════════════════════════════
function entryQualityScore(entry) {
  let score = 0, max = 0;
  // Description quality
  max += 30;
  if (entry.description?.length > 30) score += 30;
  else if (entry.description?.length > 10) score += 15;
  // Materials documentation
  max += 20;
  if (entry.materials?.length > 0) score += 20;
  // Photos (before/after)
  max += 20;
  if ((entry.preImages?.length || 0) + (entry.postImages?.length || 0) > 0) score += 20;
  // Location
  max += 15;
  if (entry.location) score += 15;
  // Notes
  max += 15;
  if (entry.notes?.length > 5) score += 15;
  return max > 0 ? Math.round((score / max) * 100) : 0;
}

function purchaseQualityScore(entry) {
  let score = 0, max = 0;
  max += 25; if (entry.description?.length > 10) score += 25;
  max += 25; if (entry.receiptUrls?.length > 0) score += 25;
  max += 20; if (entry.items?.length > 0) score += 20;
  max += 15; if (entry.paymentMethod) score += 15;
  max += 15; if (entry.notes?.length > 5) score += 15;
  return max > 0 ? Math.round((score / max) * 100) : 0;
}

function qualityColor(score) {
  if (score >= 70) return BRAND.success;
  if (score >= 40) return BRAND.warning;
  return BRAND.error;
}

function qualityLabel(score) {
  if (score >= 70) return "Good";
  if (score >= 40) return "Fair";
  return "Thin";
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Member Engagement Status
// ═══════════════════════════════════════════════════════════════════════════
function getMemberStatus(userId, entries, purchaseEntries) {
  const all = [
    ...entries.filter(e => e.userId === userId && e.status !== STATUSES.TRASH),
    ...purchaseEntries.filter(e => e.userId === userId),
  ];
  if (all.length === 0) return { status: "new", label: "New", color: "#6366F1", daysSince: null };
  const latest = all.reduce((max, e) => {
    const d = e.createdAt || e.date;
    return d > max ? d : max;
  }, "");
  const daysSince = Math.floor((Date.now() - new Date(latest).getTime()) / 86400000);
  if (daysSince <= 14) return { status: "active", label: "Active", color: BRAND.success, daysSince };
  if (daysSince <= 30) return { status: "idle", label: "Idle", color: BRAND.warning, daysSince };
  return { status: "inactive", label: "Inactive", color: BRAND.error, daysSince };
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Stale Draft Detection
// ═══════════════════════════════════════════════════════════════════════════
function getStaleDrafts(entries, purchaseEntries, staleDays = 7) {
  const now = Date.now();
  const stale = [];
  entries.filter(e => e.status === STATUSES.DRAFT).forEach(e => {
    const lastEdit = e.auditLog?.length ? e.auditLog[e.auditLog.length - 1].at : e.createdAt;
    const days = Math.floor((now - new Date(lastEdit).getTime()) / 86400000);
    if (days >= staleDays) stale.push({ ...e, _type: "work", staleDays: days });
  });
  purchaseEntries.filter(e => e.status === "Draft").forEach(e => {
    const lastEdit = e.auditLog?.length ? e.auditLog[e.auditLog.length - 1].at : e.createdAt;
    const days = Math.floor((now - new Date(lastEdit).getTime()) / 86400000);
    if (days >= staleDays) stale.push({ ...e, _type: "purchase", staleDays: days });
  });
  return stale.sort((a, b) => b.staleDays - a.staleDays);
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Review SLA
// ═══════════════════════════════════════════════════════════════════════════
function getReviewAge(entry) {
  if (!entry.submittedAt) return 0;
  return Math.floor((Date.now() - new Date(entry.submittedAt).getTime()) / 86400000);
}
function slaColor(days) {
  if (days <= 2) return BRAND.success;
  if (days <= 5) return BRAND.warning;
  return BRAND.error;
}

// ═══════════════════════════════════════════════════════════════════════════
// MINI CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
const KPICard = ({ label, value, sub, color, icon }) => (
  <div style={{ background: BRAND.white, border: "1px solid " + BRAND.borderLight, borderRadius: 10, padding: "16px 18px", textAlign: "center", position: "relative", overflow: "hidden" }}>
    {icon && <div style={{ fontSize: 20, marginBottom: 6, opacity: 0.8 }}>{icon}</div>}
    <div style={{ fontSize: 26, fontWeight: 800, color: color || BRAND.navy, fontFamily: BRAND.serif, lineHeight: 1.1 }}>{value}</div>
    <div style={{ fontSize: 11, fontWeight: 600, color: BRAND.textMuted, marginTop: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
    {sub && <div style={{ fontSize: 11, color: BRAND.textLight, marginTop: 4 }}>{sub}</div>}
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// COMMAND CENTER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export const CommandCenter = ({ entries, purchaseEntries, users, settings, currentUser, mob, onViewEntry, onViewPurchase, onNav, onSendNudge }) => {
  const [expandedSection, setExpandedSection] = useState(null);
  const [showStaleDetails, setShowStaleDetails] = useState(false);

  // ── Computed Metrics ──
  const metrics = useMemo(() => {
    const now = Date.now();
    const thisMonth = new Date().toISOString().slice(0, 7);
    const lastMonth = (() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 7); })();
    const yr = String(new Date().getFullYear());
    const getRate = (uid) => getUserRate(users, settings, uid);
    const calcTotal = (e) => {
      const h = calcHours(e.startTime, e.endTime);
      return calcLabor(h, getRate(e.userId)) + calcMaterialsTotal(e.materials);
    };

    // Pending review (work + purchase)
    const pendingWork = entries.filter(e => [STATUSES.SUBMITTED, STATUSES.AWAITING_SECOND, STATUSES.NEEDS_INFO].includes(e.status));
    const pendingPurchase = purchaseEntries.filter(e => e.status === "Submitted");
    const allPending = [...pendingWork, ...pendingPurchase];
    const pendingCount = allPending.length;

    // Oldest pending age
    const oldestPending = pendingWork.reduce((max, e) => {
      const age = getReviewAge(e);
      return age > max ? age : max;
    }, 0);

    // Avg review time (for entries reviewed this month)
    const reviewedThisMonth = entries.filter(e =>
      e.reviewedAt && e.submittedAt && e.reviewedAt.startsWith(thisMonth)
    );
    const avgReviewDays = reviewedThisMonth.length > 0
      ? (reviewedThisMonth.reduce((s, e) =>
          s + (new Date(e.reviewedAt) - new Date(e.submittedAt)) / 86400000, 0) / reviewedThisMonth.length)
      : null;

    // Last month avg for comparison
    const reviewedLastMonth = entries.filter(e =>
      e.reviewedAt && e.submittedAt && e.reviewedAt.startsWith(lastMonth)
    );
    const avgReviewLastMonth = reviewedLastMonth.length > 0
      ? (reviewedLastMonth.reduce((s, e) =>
          s + (new Date(e.reviewedAt) - new Date(e.submittedAt)) / 86400000, 0) / reviewedLastMonth.length)
      : null;

    // Open drafts
    const draftWork = entries.filter(e => e.status === STATUSES.DRAFT);
    const draftPurchase = purchaseEntries.filter(e => e.status === "Draft");
    const draftCount = draftWork.length + draftPurchase.length;

    // Stale drafts
    const staleDrafts = getStaleDrafts(entries, purchaseEntries, settings.staleDraftDays || 7);
    const staleCount = staleDrafts.length;

    // Stale by member
    const staleByMember = {};
    staleDrafts.forEach(e => {
      if (!staleByMember[e.userId]) staleByMember[e.userId] = [];
      staleByMember[e.userId].push(e);
    });

    // Adoption rate
    const memberUsers = users.filter(u => u.role === ROLES.MEMBER);
    const activeMembers = memberUsers.filter(u => {
      const s = getMemberStatus(u.id, entries, purchaseEntries);
      return s.status === "active";
    }).length;
    const adoptionRate = memberUsers.length > 0 ? Math.round((activeMembers / memberUsers.length) * 100) : 0;

    // Rejection rate this month
    const thisMonthEntries = entries.filter(e => e.date?.startsWith(thisMonth));
    const rejectedThisMonth = thisMonthEntries.filter(e => e.status === STATUSES.REJECTED).length;
    const reviewedCount = thisMonthEntries.filter(e =>
      [STATUSES.APPROVED, STATUSES.PAID, STATUSES.REJECTED].includes(e.status)
    ).length;
    const rejectionRate = reviewedCount > 0 ? Math.round((rejectedThisMonth / reviewedCount) * 100) : 0;

    // Pipeline value ($ in draft + submitted)
    let pipelineValue = 0;
    entries.filter(e => [STATUSES.DRAFT, STATUSES.SUBMITTED, STATUSES.AWAITING_SECOND, STATUSES.NEEDS_INFO].includes(e.status))
      .forEach(e => { pipelineValue += calcTotal(e); });
    purchaseEntries.filter(e => ["Draft", "Submitted"].includes(e.status))
      .forEach(e => { pipelineValue += e.total || 0; });

    // Submission funnel
    const yrEntries = entries.filter(e => e.date?.startsWith(yr) && e.status !== STATUSES.TRASH);
    const funnelCreated = yrEntries.length;
    const funnelSubmitted = yrEntries.filter(e => e.status !== STATUSES.DRAFT).length;
    const funnelApproved = yrEntries.filter(e => [STATUSES.APPROVED, STATUSES.PAID].includes(e.status)).length;
    const funnelPaid = yrEntries.filter(e => e.status === STATUSES.PAID).length;

    // Data quality scores
    const allQuality = entries.filter(e => e.status !== STATUSES.TRASH).map(e => entryQualityScore(e));
    const avgQuality = allQuality.length > 0 ? Math.round(allQuality.reduce((s, q) => s + q, 0) / allQuality.length) : 0;
    const thinEntries = allQuality.filter(q => q < 40).length;

    // Member stats
    const memberStats = memberUsers.map(u => {
      const userEntries = entries.filter(e => e.userId === u.id && e.status !== STATUSES.TRASH);
      const userPurchases = purchaseEntries.filter(e => e.userId === u.id);
      const engagement = getMemberStatus(u.id, entries, purchaseEntries);
      const userDrafts = userEntries.filter(e => e.status === STATUSES.DRAFT).length;
      const userApproved = userEntries.filter(e => [STATUSES.APPROVED, STATUSES.PAID].includes(e.status)).length;
      const userRejected = userEntries.filter(e => e.status === STATUSES.REJECTED).length;
      const totalReimb = userEntries.filter(e => [STATUSES.APPROVED, STATUSES.PAID].includes(e.status))
        .reduce((s, e) => s + calcTotal(e), 0);
      const qualityScores = userEntries.map(e => entryQualityScore(e));
      const avgQ = qualityScores.length > 0 ? Math.round(qualityScores.reduce((s, q) => s + q, 0) / qualityScores.length) : 0;
      const userStale = staleDrafts.filter(e => e.userId === u.id);

      return {
        user: u,
        engagement,
        entryCount: userEntries.length + userPurchases.length,
        draftCount: userDrafts,
        approvedCount: userApproved,
        rejectedCount: userRejected,
        totalReimb,
        avgQuality: avgQ,
        staleDrafts: userStale,
      };
    }).sort((a, b) => b.entryCount - a.entryCount);

    return {
      pendingCount, oldestPending, avgReviewDays, avgReviewLastMonth,
      draftCount, staleCount, staleDrafts, staleByMember,
      adoptionRate, activeMembers, totalMembers: memberUsers.length,
      rejectionRate, pipelineValue,
      funnelCreated, funnelSubmitted, funnelApproved, funnelPaid,
      avgQuality, thinEntries,
      memberStats, pendingWork, pendingPurchase,
    };
  }, [entries, purchaseEntries, users, settings]);

  // ── Section Toggle ──
  const toggle = (s) => setExpandedSection(expandedSection === s ? null : s);

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ ...S.h2, marginBottom: 6 }}>Command Center</h2>
        <p style={{ margin: 0, fontSize: 14, color: BRAND.textMuted }}>Workflow health, member activity, and operational metrics.</p>
      </div>

      {/* ── KPI ROW ── */}
      <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr 1fr" : "repeat(4, 1fr)", gap: mob ? 8 : 12, marginBottom: 20 }}>
        <KPICard
          label="Pending Review"
          value={metrics.pendingCount}
          sub={metrics.oldestPending > 0 ? "oldest: " + metrics.oldestPending + "d" : "queue clear"}
          color={metrics.pendingCount > 0 ? BRAND.warning : BRAND.success}
          icon="📋"
        />
        <KPICard
          label="Open Drafts"
          value={metrics.draftCount}
          sub={metrics.staleCount > 0 ? metrics.staleCount + " stale (7+ days)" : "none stale"}
          color={metrics.staleCount > 0 ? BRAND.error : BRAND.textMuted}
          icon="📝"
        />
        <KPICard
          label="Avg Review Time"
          value={metrics.avgReviewDays != null ? metrics.avgReviewDays.toFixed(1) + "d" : "—"}
          sub={metrics.avgReviewLastMonth != null
            ? (metrics.avgReviewDays < metrics.avgReviewLastMonth ? "↓" : "↑") + " from " + metrics.avgReviewLastMonth.toFixed(1) + "d last mo"
            : "no comparison data"}
          color={metrics.avgReviewDays != null && metrics.avgReviewDays <= 2 ? BRAND.success : metrics.avgReviewDays > 5 ? BRAND.error : BRAND.warning}
          icon="⚡"
        />
        <KPICard
          label="Adoption Rate"
          value={metrics.adoptionRate + "%"}
          sub={metrics.activeMembers + " of " + metrics.totalMembers + " active"}
          color={metrics.adoptionRate >= 80 ? BRAND.success : metrics.adoptionRate >= 50 ? BRAND.warning : BRAND.error}
          icon="👥"
        />
      </div>

      {/* ── STALE DRAFTS ALERT ── */}
      {metrics.staleCount > 0 && (
        <div style={{ ...S.card, background: "#FFFBEB", borderColor: "#F59E0B30", borderLeft: "4px solid #F59E0B", marginBottom: 16, padding: "16px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 22 }}>⚠️</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#92400E" }}>
                  {metrics.staleCount} stale draft{metrics.staleCount !== 1 ? "s" : ""} need attention
                </div>
                <div style={{ fontSize: 12, color: "#B45309", marginTop: 2 }}>
                  {Object.entries(metrics.staleByMember).map(([uid, drafts]) => {
                    const u = users.find(u => u.id === uid);
                    return (u?.name || "Unknown") + " has " + drafts.length;
                  }).join(", ")}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={{ fontSize: 12, fontWeight: 600, color: "#92400E", background: BRAND.white, border: "1px solid #F59E0B40", borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontFamily: BRAND.sans }}
                onClick={() => setShowStaleDetails(!showStaleDetails)}>
                {showStaleDetails ? "Hide" : "Details"}
              </button>
              {onSendNudge && (
                <button style={{ fontSize: 12, fontWeight: 600, color: BRAND.white, background: "#D97706", border: "none", borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontFamily: BRAND.sans }}
                  onClick={() => onSendNudge("stale_drafts", Object.keys(metrics.staleByMember))}>
                  Send Nudges →
                </button>
              )}
            </div>
          </div>
          {showStaleDetails && (
            <div className="fade-in" style={{ marginTop: 14, borderTop: "1px solid #F59E0B25", paddingTop: 12 }}>
              {metrics.staleDrafts.map(e => {
                const u = users.find(u => u.id === e.userId);
                return (
                  <div key={e.id} onClick={() => e._type === "purchase" ? onViewPurchase?.(e) : onViewEntry?.(e)}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", borderRadius: 8, cursor: "pointer", marginBottom: 4, transition: "background 150ms" }}
                    onMouseEnter={ev => ev.currentTarget.style.background = "#FEF3C740"}
                    onMouseLeave={ev => ev.currentTarget.style.background = "transparent"}>
                    <div style={{ width: 8, height: 8, borderRadius: 4, background: e.staleDays >= 14 ? BRAND.error : BRAND.warning, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: BRAND.charcoal, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {u?.name || "Unknown"} — {e._type === "purchase" ? e.storeName : e.category}
                      </div>
                      <div style={{ fontSize: 11, color: BRAND.textLight }}>{e._type === "purchase" ? "Purchase" : "Work"} · {formatDate(e.date)}</div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: e.staleDays >= 14 ? BRAND.error : "#D97706" }}>
                      {e.staleDays}d stale
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── REVIEW QUEUE WITH SLA ── */}
      {metrics.pendingCount > 0 && (
        <div style={{ ...S.card, padding: 0, overflow: "hidden", marginBottom: 16 }}>
          <button onClick={() => toggle("review")} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: "none", border: "none", cursor: "pointer", fontFamily: BRAND.sans, textAlign: "left", borderBottom: expandedSection === "review" ? "1px solid " + BRAND.borderLight : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 18 }}>⏱️</span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: BRAND.navy }}>Review Queue</div>
                <div style={{ fontSize: 12, color: BRAND.textMuted }}>{metrics.pendingCount} pending · oldest {metrics.oldestPending}d</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button style={{ fontSize: 12, fontWeight: 600, color: BRAND.brick, background: BRAND.brick + "10", border: "1px solid " + BRAND.brick + "25", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontFamily: BRAND.sans }}
                onClick={(ev) => { ev.stopPropagation(); onNav?.("review"); }}>
                Review All →
              </button>
              <span style={{ color: BRAND.textLight, fontSize: 12, transition: "transform 200ms", transform: expandedSection === "review" ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
            </div>
          </button>
          {expandedSection === "review" && (
            <div className="fade-in" style={{ maxHeight: 320, overflowY: "auto" }}>
              {[...metrics.pendingWork.map(e => ({ ...e, _t: "work" })), ...metrics.pendingPurchase.map(e => ({ ...e, _t: "purchase" }))].sort((a, b) => {
                const ageA = a.submittedAt ? Date.now() - new Date(a.submittedAt).getTime() : 0;
                const ageB = b.submittedAt ? Date.now() - new Date(b.submittedAt).getTime() : 0;
                return ageB - ageA;
              }).map(e => {
                const u = users.find(u => u.id === e.userId);
                const age = getReviewAge(e);
                const color = slaColor(age);
                const isPurchase = e._t === "purchase";
                const total = isPurchase ? (e.total || 0) : (calcLabor(calcHours(e.startTime, e.endTime), getUserRate(users, settings, e.userId)) + calcMaterialsTotal(e.materials));
                const qScore = isPurchase ? purchaseQualityScore(e) : entryQualityScore(e);
                return (
                  <div key={e.id} onClick={() => isPurchase ? onViewPurchase?.(e) : onViewEntry?.(e)}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: "1px solid " + BRAND.borderLight, cursor: "pointer", transition: "background 150ms" }}
                    onMouseEnter={ev => ev.currentTarget.style.background = BRAND.bgSoft}
                    onMouseLeave={ev => ev.currentTarget.style.background = "transparent"}>
                    <div style={{ width: 10, height: 10, borderRadius: 5, background: color, flexShrink: 0 }} title={age + " days waiting"} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        <span style={{ fontWeight: 600, fontSize: 13, color: BRAND.navy }}>{u?.name || "Unknown"}</span>
                        {isPurchase && <span style={{ fontSize: 9, fontWeight: 700, color: "#0E7490", background: "#ECFEFF", padding: "1px 6px", borderRadius: 8 }}>PURCHASE</span>}
                        <CategoryBadge category={e.category} />
                      </div>
                      <div style={{ fontSize: 12, color: BRAND.textLight, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {isPurchase ? e.storeName : e.description}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: isPurchase ? "#0E7490" : BRAND.brick }}>{fmt(total)}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color }}>{age === 0 ? "today" : age + "d"}</span>
                        <div style={{ width: 6, height: 6, borderRadius: 3, background: qualityColor(qScore) }} title={"Quality: " + qScore + "%"} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── SUBMISSION FUNNEL ── */}
      <div style={{ ...S.card, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 18 }}>🔄</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: BRAND.navy }}>Entry Lifecycle — {new Date().getFullYear()}</div>
            <div style={{ fontSize: 12, color: BRAND.textMuted }}>How entries flow through the system</div>
          </div>
        </div>
        {metrics.funnelCreated === 0 ? (
          <div style={{ textAlign: "center", padding: "20px 0", color: BRAND.textLight, fontSize: 13 }}>No entries this year yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              { stage: "Created", count: metrics.funnelCreated, color: "#3B82F630" },
              { stage: "Submitted", count: metrics.funnelSubmitted, color: "#F59E0B40" },
              { stage: "Approved", count: metrics.funnelApproved, color: "#10B98150" },
              { stage: "Paid", count: metrics.funnelPaid, color: BRAND.success },
            ].map((s, i) => {
              const pct = metrics.funnelCreated > 0 ? (s.count / metrics.funnelCreated) * 100 : 0;
              const dropoff = i > 0 ? {
                0: null,
                1: metrics.funnelCreated - metrics.funnelSubmitted,
                2: metrics.funnelSubmitted - metrics.funnelApproved,
                3: metrics.funnelApproved - metrics.funnelPaid,
              }[i] : null;
              return (
                <div key={s.stage}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: BRAND.navy, width: 70 }}>{s.stage}</span>
                    <div style={{ flex: 1, height: 24, background: BRAND.bgSoft, borderRadius: 6, overflow: "hidden", position: "relative" }}>
                      <div style={{ height: "100%", width: pct + "%", background: s.color, borderRadius: 6, transition: "width 600ms ease", minWidth: s.count > 0 ? 2 : 0 }} />
                      <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: 12, fontWeight: 700, color: BRAND.charcoal }}>{s.count}</span>
                    </div>
                    <span style={{ fontSize: 11, color: BRAND.textLight, width: 36, textAlign: "right" }}>{pct.toFixed(0)}%</span>
                  </div>
                  {dropoff != null && dropoff > 0 && (
                    <div style={{ fontSize: 10, color: BRAND.textLight, marginLeft: 78, marginBottom: 2 }}>
                      ↳ {dropoff} stuck ({((dropoff / metrics.funnelCreated) * 100).toFixed(0)}%)
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── FINANCIAL VELOCITY ── */}
      <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div style={{ ...S.card }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 16 }}>💰</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: BRAND.navy }}>Pipeline Value</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: BRAND.brick, fontFamily: BRAND.serif }}>{fmt(metrics.pipelineValue)}</div>
          <div style={{ fontSize: 12, color: BRAND.textMuted, marginTop: 4 }}>Total $ in drafts + submitted entries awaiting approval or payment</div>
        </div>
        <div style={{ ...S.card }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 16 }}>📊</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: BRAND.navy }}>Data Quality</span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 28, fontWeight: 800, color: qualityColor(metrics.avgQuality), fontFamily: BRAND.serif }}>{metrics.avgQuality}%</span>
            <span style={{ fontSize: 13, color: BRAND.textMuted }}>avg score</span>
          </div>
          <div style={{ fontSize: 12, color: BRAND.textMuted, marginTop: 4 }}>
            {metrics.thinEntries > 0
              ? metrics.thinEntries + " thin entr" + (metrics.thinEntries === 1 ? "y" : "ies") + " missing photos/details"
              : "All entries have good documentation"}
          </div>
        </div>
      </div>

      {/* ── MEMBER SCOREBOARD ── */}
      <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid " + BRAND.borderLight }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>👥</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: BRAND.navy }}>Member Scoreboard</div>
              <div style={{ fontSize: 12, color: BRAND.textMuted }}>Activity, quality, and engagement per member</div>
            </div>
          </div>
        </div>
        {metrics.memberStats.length === 0 ? (
          <div style={{ padding: "30px 20px", textAlign: "center", fontSize: 13, color: BRAND.textLight }}>No members yet. Invite members from Settings.</div>
        ) : (
          <div>
            {metrics.memberStats.map((ms, i) => {
              const isExpanded = expandedSection === "member-" + ms.user.id;
              return (
                <div key={ms.user.id} style={{ borderBottom: i < metrics.memberStats.length - 1 ? "1px solid " + BRAND.borderLight : "none" }}>
                  <button onClick={() => toggle("member-" + ms.user.id)}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: mob ? "12px 16px" : "14px 20px", background: isExpanded ? BRAND.bgSoft : "transparent", border: "none", cursor: "pointer", fontFamily: BRAND.sans, textAlign: "left", transition: "background 150ms" }}>
                    {/* Avatar + status dot */}
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 18, background: BRAND.navy, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14 }}>
                        {ms.user.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ position: "absolute", bottom: -1, right: -1, width: 12, height: 12, borderRadius: 6, background: ms.engagement.color, border: "2px solid " + BRAND.white }} title={ms.engagement.label} />
                    </div>
                    {/* Name + stats row */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: BRAND.charcoal }}>{ms.user.name}</span>
                        <span style={{ fontSize: 10, fontWeight: 600, color: ms.engagement.color, padding: "1px 6px", borderRadius: 8, background: ms.engagement.color + "15" }}>{ms.engagement.label}</span>
                      </div>
                      <div style={{ fontSize: 12, color: BRAND.textMuted }}>
                        {ms.entryCount} entries · {fmt(ms.totalReimb)} approved
                        {ms.staleDrafts.length > 0 && <span style={{ color: BRAND.warning, fontWeight: 600 }}> · {ms.staleDrafts.length} stale</span>}
                      </div>
                    </div>
                    {/* Quality indicator */}
                    {!mob && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                        <div style={{ width: 40, height: 6, background: BRAND.bgSoft, borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: ms.avgQuality + "%", background: qualityColor(ms.avgQuality), borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 11, color: qualityColor(ms.avgQuality), fontWeight: 600 }}>{ms.avgQuality}%</span>
                      </div>
                    )}
                    <span style={{ color: BRAND.textLight, fontSize: 12, transition: "transform 200ms", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }}>▾</span>
                  </button>
                  {isExpanded && (
                    <div className="fade-in" style={{ padding: mob ? "12px 16px" : "12px 20px", background: BRAND.bgSoft }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 12 }}>
                        {[
                          { label: "Drafts", value: ms.draftCount, color: BRAND.textMuted },
                          { label: "Approved", value: ms.approvedCount, color: BRAND.success },
                          { label: "Rejected", value: ms.rejectedCount, color: BRAND.error },
                          { label: "Quality", value: ms.avgQuality + "%", color: qualityColor(ms.avgQuality) },
                        ].map(stat => (
                          <div key={stat.label} style={{ textAlign: "center", padding: "10px 8px", background: BRAND.white, borderRadius: 8, border: "1px solid " + BRAND.borderLight }}>
                            <div style={{ fontSize: 18, fontWeight: 800, color: stat.color }}>{stat.value}</div>
                            <div style={{ fontSize: 10, fontWeight: 600, color: BRAND.textMuted, marginTop: 2 }}>{stat.label}</div>
                          </div>
                        ))}
                      </div>
                      {ms.engagement.daysSince != null && (
                        <div style={{ fontSize: 12, color: BRAND.textMuted, marginBottom: 8 }}>
                          Last activity: {ms.engagement.daysSince === 0 ? "today" : ms.engagement.daysSince + " days ago"}
                        </div>
                      )}
                      {ms.staleDrafts.length > 0 && onSendNudge && (
                        <button style={{ fontSize: 12, fontWeight: 600, color: BRAND.warning, background: "#FFFBEB", border: "1px solid " + BRAND.warning + "30", borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontFamily: BRAND.sans }}
                          onClick={() => onSendNudge("stale_drafts", [ms.user.id])}>
                          📝 Nudge about {ms.staleDrafts.length} stale draft{ms.staleDrafts.length !== 1 ? "s" : ""}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
