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
} from "../shared";

const HELP_TABS = ["How it works", "Features", "Statuses", "Tips"];

export const HelpModal = ({ onClose, isTreasurer, mob, hoaName }) => {
  const [tab, setTab] = useState(0);

  // trap focus & close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", handler); document.body.style.overflow = ""; };
  }, [onClose]);

  const sectionLabel = (text) => (
    <div style={{ fontFamily: BRAND.sans, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: BRAND.textLight, marginBottom: 16, paddingBottom: 8, borderBottom: "1px solid " + BRAND.borderLight }}>{text}</div>
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

