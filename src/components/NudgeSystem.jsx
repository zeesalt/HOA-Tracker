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

// ═══════════════════════════════════════════════════════════════════════════
// NUDGE TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════
const NUDGE_TEMPLATES = [
  { id: "submit_drafts",     emoji: "📝", label: "Submit your drafts",     message: "You have draft entries that are ready to submit. Can you finalize and submit them when you get a chance?" },
  { id: "missing_receipts",  emoji: "🧾", label: "Missing receipts",       message: "Some of your entries are missing receipt attachments. Please upload photos of your receipts so we can process your reimbursement." },
  { id: "end_of_month",      emoji: "📅", label: "End-of-month reminder",  message: "Friendly reminder to submit any outstanding work entries before the end of the month so we can include them in this month's payment run." },
  { id: "rejected_followup", emoji: "🔄", label: "Rejected entry followup", message: "You have a rejected entry that needs your attention. Please review the Treasurer's notes and resubmit with the requested changes." },
  { id: "welcome",           emoji: "👋", label: "Welcome & onboarding",   message: "Welcome to the HOA reimbursement system! Start by logging your first work entry or purchase. Tap the + button to get started." },
  { id: "custom",            emoji: "✏️", label: "Custom message...",       message: "" },
];

// ═══════════════════════════════════════════════════════════════════════════
// NUDGE COMPOSER (Treasurer sends nudges)
// ═══════════════════════════════════════════════════════════════════════════
export const NudgeComposer = ({ users, currentUser, onSend, onClose, prefillRecipients, prefillTemplate }) => {
  const [selectedUsers, setSelectedUsers] = useState(new Set(prefillRecipients || []));
  const [selectAll, setSelectAll] = useState(false);
  const [templateId, setTemplateId] = useState(prefillTemplate || null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const members = users.filter(u => u.role === ROLES.MEMBER);

  // When template changes, prefill message
  useEffect(() => {
    if (templateId) {
      const t = NUDGE_TEMPLATES.find(t => t.id === templateId);
      if (t && t.id !== "custom") setMessage(t.message);
    }
  }, [templateId]);

  // Select all toggle
  useEffect(() => {
    if (selectAll) setSelectedUsers(new Set(members.map(u => u.id)));
    else if (!prefillRecipients?.length) setSelectedUsers(new Set());
  }, [selectAll]);

  const toggleUser = (uid) => {
    setSelectedUsers(prev => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
    setSelectAll(false);
  };

  const handleSend = async () => {
    if (!message.trim() || selectedUsers.size === 0) return;
    setSending(true);
    try {
      const recipientIds = [...selectedUsers];
      await onSend(recipientIds, message.trim(), templateId);
      setSent(true);
      setTimeout(() => onClose?.(), 2000);
    } catch (err) {
      console.error("Nudge send error:", err);
    }
    setSending(false);
  };

  if (sent) return (
    <div style={{ textAlign: "center", padding: "32px 20px" }}>
      <div style={{ fontSize: 44, marginBottom: 12 }}>✅</div>
      <div style={{ fontSize: 17, fontWeight: 600, color: BRAND.navy, fontFamily: BRAND.serif, marginBottom: 8 }}>
        Nudge{selectedUsers.size > 1 ? "s" : ""} sent!
      </div>
      <div style={{ fontSize: 13, color: BRAND.textMuted }}>
        {selectedUsers.size} member{selectedUsers.size !== 1 ? "s" : ""} will see your message next time they open the app.
      </div>
    </div>
  );

  return (
    <div>
      {/* Recipients */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: BRAND.textMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>Recipients</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
          <button onClick={() => setSelectAll(!selectAll)}
            style={{ fontSize: 12, padding: "6px 12px", borderRadius: 16, border: "1px solid " + (selectAll ? BRAND.navy : BRAND.border), background: selectAll ? BRAND.navy : BRAND.white, color: selectAll ? "#fff" : BRAND.textMuted, cursor: "pointer", fontFamily: BRAND.sans, fontWeight: 600 }}>
            All Members
          </button>
          {members.map(u => {
            const sel = selectedUsers.has(u.id);
            return (
              <button key={u.id} onClick={() => toggleUser(u.id)}
                style={{ fontSize: 12, padding: "6px 12px", borderRadius: 16, border: "1px solid " + (sel ? BRAND.navy : BRAND.border), background: sel ? BRAND.navy : BRAND.white, color: sel ? "#fff" : BRAND.textMuted, cursor: "pointer", fontFamily: BRAND.sans, fontWeight: 500, transition: "all 150ms" }}>
                {u.name}
              </button>
            );
          })}
        </div>
        {selectedUsers.size === 0 && <div style={{ fontSize: 12, color: BRAND.warning }}>Select at least one recipient</div>}
      </div>

      {/* Template selector */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: BRAND.textMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>Quick Templates</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {NUDGE_TEMPLATES.map(t => {
            const sel = templateId === t.id;
            return (
              <button key={t.id} onClick={() => setTemplateId(sel ? null : t.id)}
                style={{ fontSize: 12, padding: "6px 12px", borderRadius: 8, border: "1px solid " + (sel ? BRAND.brick + "40" : BRAND.border), background: sel ? BRAND.brick + "10" : BRAND.white, color: sel ? BRAND.brick : BRAND.textMuted, cursor: "pointer", fontFamily: BRAND.sans, fontWeight: 500, transition: "all 150ms" }}>
                {t.emoji} {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Message */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: BRAND.textMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>Message</div>
        <textarea
          style={{ ...S.textarea, minHeight: 80, fontSize: 14 }}
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Type your message to the member(s)..."
        />
        <div style={{ fontSize: 11, color: BRAND.textLight, marginTop: 4, textAlign: "right" }}>{message.length} chars</div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        {onClose && <button style={S.btnSecondary} onClick={onClose}>Cancel</button>}
        <button
          style={{ ...S.btnPrimary, opacity: !message.trim() || selectedUsers.size === 0 || sending ? 0.5 : 1 }}
          disabled={!message.trim() || selectedUsers.size === 0 || sending}
          onClick={handleSend}>
          {sending ? "Sending..." : "Send Nudge" + (selectedUsers.size > 1 ? " (" + selectedUsers.size + ")" : "")}
        </button>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MEMBER NUDGE BANNERS (shown on member dashboard)
// ═══════════════════════════════════════════════════════════════════════════
export const MemberNudgeBanners = ({ entries, purchaseEntries, nudges, currentUser, settings, onViewEntry, onViewPurchase, onDismissNudge, mob }) => {
  const [dismissed, setDismissed] = useState(new Set()); // session-only dismissals

  const dismiss = (key) => {
    setDismissed(prev => new Set(prev).add(key));
  };

  // Build banner items
  const banners = useMemo(() => {
    const items = [];
    if (!currentUser) return items;

    // 1. Rejected entries needing revision (highest priority)
    const rejected = entries.filter(e => e.userId === currentUser.id && e.status === STATUSES.REJECTED);
    if (rejected.length > 0) {
      const newest = rejected.sort((a, b) => (b.reviewedAt || "").localeCompare(a.reviewedAt || ""))[0];
      const note = newest.reviewerNotes ? ' — "' + newest.reviewerNotes.slice(0, 60) + (newest.reviewerNotes.length > 60 ? '..."' : '"') : "";
      items.push({
        key: "rejected-" + newest.id,
        priority: 1,
        type: "error",
        emoji: "🔄",
        title: rejected.length + " rejected entr" + (rejected.length === 1 ? "y" : "ies") + " need" + (rejected.length === 1 ? "s" : "") + " revision",
        detail: "Treasurer left a note" + note,
        action: { label: "Fix It →", onClick: () => onViewEntry?.(newest) },
      });
    }

    // 2. Needs Info entries
    const needsInfo = entries.filter(e => e.userId === currentUser.id && e.status === STATUSES.NEEDS_INFO);
    if (needsInfo.length > 0) {
      const newest = needsInfo[0];
      items.push({
        key: "needsinfo-" + newest.id,
        priority: 2,
        type: "warning",
        emoji: "💬",
        title: needsInfo.length + " entr" + (needsInfo.length === 1 ? "y" : "ies") + " need" + (needsInfo.length === 1 ? "s" : "") + " more info",
        detail: "The Treasurer requested additional details before approval.",
        action: { label: "Respond →", onClick: () => onViewEntry?.(newest) },
      });
    }

    // 3. Stale drafts (7+ days)
    const staleDays = settings.staleDraftDays || 7;
    const now = Date.now();
    const staleDrafts = entries.filter(e => {
      if (e.userId !== currentUser.id || e.status !== STATUSES.DRAFT) return false;
      const lastEdit = e.auditLog?.length ? e.auditLog[e.auditLog.length - 1].at : e.createdAt;
      return Math.floor((now - new Date(lastEdit).getTime()) / 86400000) >= staleDays;
    });
    const stalePurchases = purchaseEntries.filter(e => {
      if (e.userId !== currentUser.id || e.status !== "Draft") return false;
      const lastEdit = e.auditLog?.length ? e.auditLog[e.auditLog.length - 1].at : e.createdAt;
      return Math.floor((now - new Date(lastEdit).getTime()) / 86400000) >= staleDays;
    });
    const allStale = staleDrafts.length + stalePurchases.length;
    if (allStale > 0) {
      const oldest = [...staleDrafts, ...stalePurchases].sort((a, b) => {
        const aDate = a.auditLog?.length ? a.auditLog[a.auditLog.length - 1].at : a.createdAt;
        const bDate = b.auditLog?.length ? b.auditLog[b.auditLog.length - 1].at : b.createdAt;
        return new Date(aDate) - new Date(bDate);
      })[0];
      const oldestDays = Math.floor((now - new Date(oldest.auditLog?.length ? oldest.auditLog[oldest.auditLog.length - 1].at : oldest.createdAt).getTime()) / 86400000);
      items.push({
        key: "stale-drafts",
        priority: 3,
        type: "warning",
        emoji: "📝",
        title: allStale + " unfinished draft" + (allStale !== 1 ? "s" : ""),
        detail: "Your oldest draft has been sitting for " + oldestDays + " days. Ready to submit?",
        action: staleDrafts.length > 0
          ? { label: "Continue →", onClick: () => onViewEntry?.(staleDrafts[0]) }
          : { label: "Continue →", onClick: () => onViewPurchase?.(stalePurchases[0]) },
      });
    }

    // 4. Unread nudges from Treasurer
    const unreadNudges = (nudges || []).filter(n =>
      n.recipientId === currentUser.id && !n.readAt && !n.dismissedAt
    );
    unreadNudges.forEach(n => {
      items.push({
        key: "nudge-" + n.id,
        priority: 2.5,
        type: "info",
        emoji: "💬",
        title: "Message from Treasurer",
        detail: n.message,
        nudgeId: n.id,
        action: null,
      });
    });

    // 5. Recent approvals (positive reinforcement)
    const recentApprovals = entries.filter(e =>
      e.userId === currentUser.id &&
      [STATUSES.APPROVED, STATUSES.PAID].includes(e.status) &&
      e.reviewedAt &&
      (now - new Date(e.reviewedAt).getTime()) < 7 * 86400000
    );
    if (recentApprovals.length > 0) {
      const totalApproved = recentApprovals.reduce((s, e) => {
        const h = calcHours(e.startTime, e.endTime);
        const r = getUserRate([], settings, e.userId) || settings.defaultHourlyRate;
        return s + calcLabor(h, r) + calcMaterialsTotal(e.materials);
      }, 0);
      items.push({
        key: "approvals-recent",
        priority: 5,
        type: "success",
        emoji: "🎉",
        title: recentApprovals.length + " entr" + (recentApprovals.length === 1 ? "y" : "ies") + " approved this week!",
        detail: fmt(totalApproved) + " in reimbursements approved.",
        action: null,
      });
    }

    return items.filter(b => !dismissed.has(b.key)).sort((a, b) => a.priority - b.priority);
  }, [entries, purchaseEntries, nudges, currentUser, settings, dismissed]);

  if (banners.length === 0) return null;

  const typeStyles = {
    error: { bg: "#FEF2F2", border: "#EF444425", iconColor: "#DC2626" },
    warning: { bg: "#FFFBEB", border: "#F59E0B25", iconColor: "#D97706" },
    info: { bg: "#EFF6FF", border: "#3B82F625", iconColor: "#2563EB" },
    success: { bg: "#F0FDF4", border: "#10B98125", iconColor: "#059669" },
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
      {banners.slice(0, 3).map(b => {
        const style = typeStyles[b.type] || typeStyles.info;
        return (
          <div key={b.key} className="fade-in" style={{ background: style.bg, border: "1px solid " + style.border, borderRadius: 10, padding: mob ? "10px 12px" : "10px 16px", display: "flex", alignItems: "flex-start", gap: 10 }}>
            <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{b.emoji}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: style.iconColor }}>{b.title}</div>
              {b.detail && <div style={{ fontSize: 12, color: BRAND.textMuted, marginTop: 2, lineHeight: 1.5 }}>{b.detail}</div>}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              {b.action && (
                <button onClick={b.action.onClick}
                  style={{ fontSize: 11, fontWeight: 600, color: style.iconColor, background: BRAND.white, border: "1px solid " + style.iconColor + "30", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontFamily: BRAND.sans, whiteSpace: "nowrap" }}>
                  {b.action.label}
                </button>
              )}
              <button onClick={() => {
                dismiss(b.key);
                if (b.nudgeId && onDismissNudge) onDismissNudge(b.nudgeId);
              }}
                style={{ background: "none", border: "none", color: BRAND.textLight, cursor: "pointer", padding: 4, fontSize: 14, lineHeight: 1, borderRadius: 4 }}
                aria-label="Dismiss">×</button>
            </div>
          </div>
        );
      })}
      {banners.length > 3 && (
        <div style={{ fontSize: 12, color: BRAND.textLight, textAlign: "center", padding: 4 }}>
          +{banners.length - 3} more notification{banners.length - 3 !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// SENT NUDGES LOG (Treasurer view)
// ═══════════════════════════════════════════════════════════════════════════
export const SentNudgesLog = ({ nudges, users, mob }) => {
  if (!nudges || nudges.length === 0) return (
    <div style={{ textAlign: "center", padding: "24px 16px", color: BRAND.textLight, fontSize: 13 }}>
      No nudges sent yet. Use the composer above to send your first one.
    </div>
  );

  // Group by date
  const sorted = [...nudges].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {sorted.slice(0, 20).map(n => {
        const recipient = users.find(u => u.id === n.recipientId);
        const isRead = !!n.readAt;
        const isActedOn = n.actedOnAt;
        return (
          <div key={n.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 14px", background: BRAND.white, border: "1px solid " + BRAND.borderLight, borderRadius: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                <span style={{ fontWeight: 600, fontSize: 13, color: BRAND.navy }}>{recipient?.name || "Unknown"}</span>
                <span style={{ fontSize: 11, color: BRAND.textLight }}>{timeAgo(n.createdAt)}</span>
              </div>
              <div style={{ fontSize: 12, color: BRAND.textMuted, lineHeight: 1.5 }}>{n.message?.slice(0, 100)}{n.message?.length > 100 ? "..." : ""}</div>
            </div>
            <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
              <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 6, background: "#E8EDF5", color: "#3B5998" }} title="Delivered">✓ Sent</span>
              {isRead && <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 6, background: "#E8F0E6", color: BRAND.success }} title="Read by member">✓ Read</span>}
              {isActedOn && <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 6, background: "#F0FDF4", color: "#065F46" }} title="Member took action">✓ Acted</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
};
