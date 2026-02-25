import { useState, useMemo, useCallback } from "react";
import {
  BRAND, ROLES, STATUSES,
  Icon, S, Modal, Field,
  fmt, formatDate, timeAgo, fmtHours, getUserRate,
} from "../shared";

// ═══════════════════════════════════════════════════════════════════════════
// DIGEST TEMPLATES — simulate what a real email digest would contain
// ═══════════════════════════════════════════════════════════════════════════

const DIGEST_TYPES = [
  {
    id: "treasurer_daily",
    label: "Treasurer Daily Digest",
    emoji: "📬",
    description: "Summary of pending reviews, new submissions, and member activity from the last 24 hours.",
    role: "Treasurer",
  },
  {
    id: "treasurer_weekly",
    label: "Treasurer Weekly Summary",
    emoji: "📊",
    description: "Week-in-review with approval stats, outstanding items, and payment run reminders.",
    role: "Treasurer",
  },
  {
    id: "member_weekly",
    label: "Member Weekly Recap",
    emoji: "📋",
    description: "Member's own submission status, any rejected entries needing attention, and earnings summary.",
    role: "Member",
  },
  {
    id: "member_status_change",
    label: "Member Status Update",
    emoji: "🔔",
    description: "Triggered when one of the member's entries changes status (approved, rejected, paid, needs info).",
    role: "Member",
  },
  {
    id: "payment_confirmation",
    label: "Payment Confirmation",
    emoji: "💳",
    description: "Sent after a payment run marks entries as paid. Includes amount and payment reference.",
    role: "Member",
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// NUDGE PREVIEW TEMPLATES — matches NUDGE_TEMPLATES from NudgeSystem
// ═══════════════════════════════════════════════════════════════════════════

const TEST_NUDGE_SCENARIOS = [
  { id: "overdue_draft", label: "Overdue drafts", emoji: "📝", message: "You have draft entries that haven't been submitted yet. Don't forget to submit them so you can get reimbursed!" },
  { id: "pending_review", label: "Pending review reminder", emoji: "⏳", message: "Your submitted entries have been waiting for review. The Treasurer will get to them soon." },
  { id: "rejected_followup", label: "Rejected entry followup", emoji: "🔄", message: "You have a rejected entry that needs your attention. Please review the Treasurer's notes and resubmit with the requested changes." },
  { id: "monthly_reminder", label: "Monthly submission reminder", emoji: "📅", message: "End of month is approaching. Make sure all your work and purchases for this month are logged and submitted." },
  { id: "welcome", label: "Welcome & onboarding", emoji: "👋", message: "Welcome to the HOA reimbursement system! Start by logging your first work entry or purchase. Tap the + button to get started." },
];

// ═══════════════════════════════════════════════════════════════════════════
// DIGEST PREVIEW RENDERER
// ═══════════════════════════════════════════════════════════════════════════

const DigestPreview = ({ type, entries, purchaseEntries, users, settings, currentUser, targetUser, mob }) => {
  const hoaName = settings?.hoaName || "24 Mill Street";
  const rate = settings?.defaultHourlyRate || 40;
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  // Compute stats based on real data
  const pendingWork = entries.filter(e => e.status === STATUSES.SUBMITTED);
  const pendingPurch = (purchaseEntries || []).filter(e => e.status === "Submitted");
  const approvedToday = entries.filter(e => e.status === STATUSES.APPROVED && e.reviewedAt && new Date(e.reviewedAt).toDateString() === now.toDateString());
  const rejectedRecent = entries.filter(e => e.status === STATUSES.REJECTED);
  const paidRecent = entries.filter(e => e.status === STATUSES.PAID);
  const approvedUnpaid = entries.filter(e => e.status === STATUSES.APPROVED);

  // Member-specific
  const memberEntries = targetUser ? entries.filter(e => e.userId === targetUser.id) : [];
  const memberPending = memberEntries.filter(e => e.status === STATUSES.SUBMITTED);
  const memberRejected = memberEntries.filter(e => e.status === STATUSES.REJECTED);
  const memberApproved = memberEntries.filter(e => e.status === STATUSES.APPROVED || e.status === STATUSES.PAID);
  const memberTotalHours = memberApproved.reduce((sum, e) => sum + (e.totalHours || 0), 0);
  const memberTotalEarnings = memberApproved.reduce((sum, e) => sum + (e.laborTotal || 0) + (e.materialsTotal || 0), 0);

  const emailFrame = {
    background: BRAND.white,
    border: "1px solid " + BRAND.borderLight,
    borderRadius: 12,
    overflow: "hidden",
    maxWidth: 520,
    margin: "0 auto",
    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
  };
  const emailHeader = {
    background: "linear-gradient(135deg, " + BRAND.navy + " 0%, #2A3A4E 100%)",
    padding: mob ? "20px 16px" : "28px 32px",
    color: BRAND.white,
  };
  const emailBody = { padding: mob ? "20px 16px" : "24px 32px" };
  const statBox = (label, value, color) => (
    <div style={{ flex: 1, textAlign: "center", padding: "14px 8px", background: color + "08", borderRadius: 8, border: "1px solid " + color + "20" }}>
      <div style={{ fontSize: 22, fontWeight: 700, color, fontFamily: BRAND.serif }}>{value}</div>
      <div style={{ fontSize: 11, color: BRAND.textMuted, marginTop: 4 }}>{label}</div>
    </div>
  );
  const entryRow = (e, i) => {
    const user = users.find(u => u.id === e.userId);
    return (
      <div key={e.id || i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid " + BRAND.borderLight }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: BRAND.navy, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {e.description?.slice(0, 50) || e.category || "Untitled"}
          </div>
          <div style={{ fontSize: 11, color: BRAND.textMuted, marginTop: 2 }}>
            {user?.name || "Member"} · {formatDate(e.date)} · {fmtHours(e.totalHours || 0)}
          </div>
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: BRAND.navy, flexShrink: 0 }}>
          {fmt((e.laborTotal || 0) + (e.materialsTotal || 0))}
        </div>
      </div>
    );
  };

  // ── TREASURER DAILY ────────────────────────────────────────────────────
  if (type === "treasurer_daily") return (
    <div style={emailFrame}>
      <div style={emailHeader}>
        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.7, marginBottom: 6 }}>{hoaName}</div>
        <div style={{ fontFamily: BRAND.serif, fontSize: 22, fontWeight: 700 }}>Daily Digest</div>
        <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>{dateStr}</div>
      </div>
      <div style={emailBody}>
        <div style={{ fontSize: 14, color: BRAND.textMuted, marginBottom: 20, lineHeight: 1.6 }}>
          Good morning{currentUser?.name ? ", " + currentUser.name.split(" ")[0] : ""}. Here's your summary for today.
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
          {statBox("Pending Review", pendingWork.length + pendingPurch.length, BRAND.brick)}
          {statBox("Approved Today", approvedToday.length, BRAND.success)}
          {statBox("Awaiting Payment", approvedUnpaid.length, "#3B5998")}
        </div>

        {pendingWork.length > 0 && (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: BRAND.textLight, marginBottom: 10 }}>
              Entries awaiting review ({pendingWork.length})
            </div>
            {pendingWork.slice(0, 5).map(entryRow)}
            {pendingWork.length > 5 && (
              <div style={{ fontSize: 12, color: BRAND.brick, fontWeight: 600, padding: "8px 0", cursor: "pointer" }}>
                +{pendingWork.length - 5} more entries →
              </div>
            )}
          </>
        )}

        {pendingWork.length === 0 && pendingPurch.length === 0 && (
          <div style={{ textAlign: "center", padding: "20px 0", color: BRAND.textMuted }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>All caught up!</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>No entries pending review right now.</div>
          </div>
        )}

        <div style={{ marginTop: 24, padding: "16px 0", borderTop: "1px solid " + BRAND.borderLight, textAlign: "center" }}>
          <div style={{ display: "inline-block", padding: "10px 28px", background: BRAND.brick, color: BRAND.white, borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            Open Review Queue →
          </div>
        </div>
      </div>
      <div style={{ background: BRAND.bgSoft, padding: "14px 32px", textAlign: "center", fontSize: 11, color: BRAND.textLight }}>
        {hoaName} Reimbursement System · You're receiving this because you're a Treasurer
      </div>
    </div>
  );

  // ── TREASURER WEEKLY ───────────────────────────────────────────────────
  if (type === "treasurer_weekly") {
    const totalApproved = entries.filter(e => e.status === STATUSES.APPROVED || e.status === STATUSES.PAID);
    const weekTotal = totalApproved.reduce((s, e) => s + (e.laborTotal || 0) + (e.materialsTotal || 0), 0);
    const activeMembers = new Set(entries.filter(e => e.status !== STATUSES.DRAFT && e.status !== STATUSES.TRASH).map(e => e.userId)).size;
    return (
      <div style={emailFrame}>
        <div style={emailHeader}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.7, marginBottom: 6 }}>{hoaName}</div>
          <div style={{ fontFamily: BRAND.serif, fontSize: 22, fontWeight: 700 }}>Weekly Summary</div>
          <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>Week of {dateStr}</div>
        </div>
        <div style={emailBody}>
          <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
            {statBox("Total Approved", fmt(weekTotal), BRAND.success)}
            {statBox("Active Members", activeMembers, BRAND.navy)}
            {statBox("Pending", pendingWork.length + pendingPurch.length, BRAND.brick)}
          </div>

          {approvedUnpaid.length > 0 && (
            <div style={{ background: "#FFF8E1", border: "1px solid #F59E0B40", borderRadius: 8, padding: 16, marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#92400E", marginBottom: 4 }}>
                💰 Payment run reminder
              </div>
              <div style={{ fontSize: 12, color: "#92400E", opacity: 0.8 }}>
                {approvedUnpaid.length} approved {approvedUnpaid.length === 1 ? "entry" : "entries"} totaling{" "}
                {fmt(approvedUnpaid.reduce((s, e) => s + (e.laborTotal || 0) + (e.materialsTotal || 0), 0))}{" "}
                are awaiting payment.
              </div>
            </div>
          )}

          {rejectedRecent.length > 0 && (
            <div style={{ background: "#FFF5F5", border: "1px solid #EF444440", borderRadius: 8, padding: 16, marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#7f1d1d", marginBottom: 4 }}>
                🔄 {rejectedRecent.length} rejected {rejectedRecent.length === 1 ? "entry" : "entries"} still unresolved
              </div>
              <div style={{ fontSize: 12, color: "#7f1d1d", opacity: 0.8 }}>
                Consider sending a nudge to remind members to revise and resubmit.
              </div>
            </div>
          )}

          <div style={{ marginTop: 20, padding: "16px 0", borderTop: "1px solid " + BRAND.borderLight, textAlign: "center" }}>
            <div style={{ display: "inline-block", padding: "10px 28px", background: BRAND.brick, color: BRAND.white, borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              View Full Dashboard →
            </div>
          </div>
        </div>
        <div style={{ background: BRAND.bgSoft, padding: "14px 32px", textAlign: "center", fontSize: 11, color: BRAND.textLight }}>
          {hoaName} · Weekly digest sent every Monday at 8:00 AM
        </div>
      </div>
    );
  }

  // ── MEMBER WEEKLY ──────────────────────────────────────────────────────
  if (type === "member_weekly") {
    const member = targetUser || currentUser;
    return (
      <div style={emailFrame}>
        <div style={emailHeader}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.7, marginBottom: 6 }}>{hoaName}</div>
          <div style={{ fontFamily: BRAND.serif, fontSize: 22, fontWeight: 700 }}>Your Weekly Recap</div>
          <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>{dateStr}</div>
        </div>
        <div style={emailBody}>
          <div style={{ fontSize: 14, color: BRAND.textMuted, marginBottom: 20, lineHeight: 1.6 }}>
            Hi {member?.name?.split(" ")[0] || "there"}, here's where your entries stand this week.
          </div>

          <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
            {statBox("YTD Hours", fmtHours(memberTotalHours), BRAND.navy)}
            {statBox("YTD Earnings", fmt(memberTotalEarnings), BRAND.success)}
            {statBox("Pending", memberPending.length, BRAND.brick)}
          </div>

          {memberRejected.length > 0 && (
            <div style={{ background: "#FFF5F5", border: "1px solid #EF444440", borderRadius: 8, padding: 16, marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#7f1d1d", marginBottom: 4 }}>
                🔄 Action needed: {memberRejected.length} rejected {memberRejected.length === 1 ? "entry" : "entries"}
              </div>
              <div style={{ fontSize: 12, color: "#7f1d1d", opacity: 0.8 }}>
                The Treasurer returned {memberRejected.length === 1 ? "an entry" : "entries"} with feedback. Review notes and resubmit.
              </div>
            </div>
          )}

          {memberPending.length > 0 && (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: BRAND.textLight, marginBottom: 10 }}>
                Awaiting review ({memberPending.length})
              </div>
              {memberPending.slice(0, 3).map(entryRow)}
            </>
          )}

          <div style={{ marginTop: 20, padding: "16px 0", borderTop: "1px solid " + BRAND.borderLight, textAlign: "center" }}>
            <div style={{ display: "inline-block", padding: "10px 28px", background: BRAND.brick, color: BRAND.white, borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              View My Entries →
            </div>
          </div>
        </div>
        <div style={{ background: BRAND.bgSoft, padding: "14px 32px", textAlign: "center", fontSize: 11, color: BRAND.textLight }}>
          {hoaName} · Weekly recap sent every Friday at 9:00 AM
        </div>
      </div>
    );
  }

  // ── MEMBER STATUS CHANGE ───────────────────────────────────────────────
  if (type === "member_status_change") {
    const sampleEntry = memberEntries.find(e => e.status !== STATUSES.DRAFT) || entries[0];
    const statusColors = {
      [STATUSES.APPROVED]: { bg: "#E8F0E6", border: "#B5CCAE", text: "#2F4F3E", label: "Approved ✓" },
      [STATUSES.REJECTED]: { bg: "#FDEAEA", border: "#F0BABA", text: "#7f1d1d", label: "Rejected" },
      [STATUSES.PAID]: { bg: "#E8EDF5", border: "#B8C8E0", text: "#2C4478", label: "Paid 💳" },
      [STATUSES.NEEDS_INFO]: { bg: "#FFF7ED", border: "#FED7AA", text: "#7C3910", label: "Needs Info" },
    };
    const sc = statusColors[sampleEntry?.status] || statusColors[STATUSES.APPROVED];

    return (
      <div style={emailFrame}>
        <div style={emailHeader}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.7, marginBottom: 6 }}>{hoaName}</div>
          <div style={{ fontFamily: BRAND.serif, fontSize: 22, fontWeight: 700 }}>Entry Status Update</div>
        </div>
        <div style={emailBody}>
          <div style={{ fontSize: 14, color: BRAND.textMuted, marginBottom: 20, lineHeight: 1.6 }}>
            Hi {(targetUser || currentUser)?.name?.split(" ")[0] || "there"}, your entry status has changed:
          </div>

          <div style={{ background: sc.bg, border: "1px solid " + sc.border, borderRadius: 10, padding: 20, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: sc.text, padding: "3px 10px", background: BRAND.white, borderRadius: 6, border: "1px solid " + sc.border }}>
                {sc.label}
              </span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: BRAND.navy, marginBottom: 6 }}>
              {sampleEntry?.description?.slice(0, 60) || sampleEntry?.category || "Sample Entry"}
            </div>
            <div style={{ fontSize: 12, color: BRAND.textMuted }}>
              {formatDate(sampleEntry?.date)} · {sampleEntry?.category} · {fmt((sampleEntry?.laborTotal || 0) + (sampleEntry?.materialsTotal || 0))}
            </div>
            {sampleEntry?.reviewerNotes && (
              <div style={{ marginTop: 12, padding: "10px 14px", background: BRAND.white, borderRadius: 6, border: "1px solid " + BRAND.borderLight }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: BRAND.textLight, marginBottom: 4 }}>Treasurer notes:</div>
                <div style={{ fontSize: 13, color: BRAND.navy, lineHeight: 1.5, fontStyle: "italic" }}>
                  "{sampleEntry.reviewerNotes.slice(0, 120)}"
                </div>
              </div>
            )}
          </div>

          <div style={{ textAlign: "center" }}>
            <div style={{ display: "inline-block", padding: "10px 28px", background: BRAND.brick, color: BRAND.white, borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              View Entry Details →
            </div>
          </div>
        </div>
        <div style={{ background: BRAND.bgSoft, padding: "14px 32px", textAlign: "center", fontSize: 11, color: BRAND.textLight }}>
          {hoaName} · Sent when your entry status changes
        </div>
      </div>
    );
  }

  // ── PAYMENT CONFIRMATION ───────────────────────────────────────────────
  if (type === "payment_confirmation") {
    const paidEntries = (targetUser ? entries.filter(e => e.userId === targetUser.id) : entries).filter(e => e.status === STATUSES.PAID);
    const total = paidEntries.reduce((s, e) => s + (e.laborTotal || 0) + (e.materialsTotal || 0), 0);
    return (
      <div style={emailFrame}>
        <div style={{ ...emailHeader, background: "linear-gradient(135deg, #1B5E20 0%, #2E7D32 100%)" }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.7, marginBottom: 6 }}>{hoaName}</div>
          <div style={{ fontFamily: BRAND.serif, fontSize: 22, fontWeight: 700 }}>Payment Confirmed 🎉</div>
        </div>
        <div style={emailBody}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 36, fontWeight: 700, color: BRAND.success, fontFamily: BRAND.serif }}>
              {fmt(total || 425)}
            </div>
            <div style={{ fontSize: 13, color: BRAND.textMuted, marginTop: 4 }}>
              has been sent to you
            </div>
          </div>

          <div style={{ background: BRAND.bgSoft, borderRadius: 8, padding: 16, marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: BRAND.textMuted }}>Payment method</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: BRAND.navy }}>Check #1234</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: BRAND.textMuted }}>Entries included</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: BRAND.navy }}>{paidEntries.length || 3}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: BRAND.textMuted }}>Payment date</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: BRAND.navy }}>{dateStr}</span>
            </div>
          </div>

          {paidEntries.length > 0 && (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: BRAND.textLight, marginBottom: 10 }}>
                Entries included
              </div>
              {paidEntries.slice(0, 5).map(entryRow)}
            </>
          )}

          <div style={{ marginTop: 20, textAlign: "center" }}>
            <div style={{ display: "inline-block", padding: "10px 28px", background: BRAND.success, color: BRAND.white, borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              View Payment Details →
            </div>
          </div>
        </div>
        <div style={{ background: BRAND.bgSoft, padding: "14px 32px", textAlign: "center", fontSize: 11, color: BRAND.textLight }}>
          {hoaName} · Payment confirmation
        </div>
      </div>
    );
  }

  return <div style={{ padding: 20, color: BRAND.textMuted, textAlign: "center" }}>Select a digest type to preview.</div>;
};

// ═══════════════════════════════════════════════════════════════════════════
// NUDGE PREVIEW (renders as in-app banner simulation)
// ═══════════════════════════════════════════════════════════════════════════

const NudgePreview = ({ scenario, senderName, recipientName, mob }) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return (
    <div style={{ textAlign: "center", padding: 16, color: BRAND.textMuted, fontSize: 13 }}>
      Nudge dismissed. <button onClick={() => setDismissed(false)} style={{ color: BRAND.brick, background: "none", border: "none", cursor: "pointer", fontWeight: 600, fontFamily: BRAND.sans }}>Show again</button>
    </div>
  );

  const style = {
    bg: "#FFF8ED",
    border: "#F0D4A8",
    iconColor: "#92400E",
  };

  return (
    <div style={{ border: "1px solid " + BRAND.borderLight, borderRadius: 10, overflow: "hidden" }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: BRAND.textLight, padding: "8px 14px", background: BRAND.bgSoft, borderBottom: "1px solid " + BRAND.borderLight, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        Banner Preview — as seen by {recipientName || "member"}
      </div>
      <div style={{ padding: "10px 14px", background: style.bg, borderLeft: "3px solid " + style.border, display: "flex", alignItems: "flex-start", gap: 10 }}>
        <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{scenario.emoji}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: style.iconColor }}>
            Message from {senderName || "Treasurer"}
          </div>
          <div style={{ fontSize: 12, color: BRAND.textMuted, marginTop: 2, lineHeight: 1.5 }}>
            {scenario.message}
          </div>
        </div>
        <button onClick={() => setDismissed(true)} style={{ background: "none", border: "none", color: BRAND.textLight, cursor: "pointer", padding: 4, fontSize: 14, lineHeight: 1, borderRadius: 4 }} aria-label="Dismiss">×</button>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PANEL
// ═══════════════════════════════════════════════════════════════════════════

export const NotificationTestPanel = ({
  entries, purchaseEntries, users, settings, currentUser,
  onSendNudge, // (recipientIds, message, template) => Promise
  mob,
}) => {
  const [activeTab, setActiveTab] = useState("digest"); // "digest" | "nudge"
  const [selectedDigest, setSelectedDigest] = useState(null);
  const [selectedNudge, setSelectedNudge] = useState(null);
  const [targetUserId, setTargetUserId] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [testSent, setTestSent] = useState(null); // { type, timestamp }
  const [sendLog, setSendLog] = useState([]);

  const members = users.filter(u => u.role === ROLES.MEMBER);
  const targetUser = users.find(u => u.id === targetUserId);
  const isTreasurer = currentUser?.role === ROLES.TREASURER;

  const handleSendTestNudge = useCallback(async () => {
    if (!selectedNudge || !targetUserId || !onSendNudge) return;
    const scenario = TEST_NUDGE_SCENARIOS.find(s => s.id === selectedNudge);
    if (!scenario) return;

    setSendingTest(true);
    try {
      await onSendNudge([targetUserId], "[TEST] " + scenario.message, scenario.id);
      const entry = {
        type: "nudge",
        template: scenario.label,
        recipient: targetUser?.name || "Unknown",
        timestamp: new Date().toISOString(),
      };
      setSendLog(prev => [entry, ...prev]);
      setTestSent(entry);
      setTimeout(() => setTestSent(null), 3000);
    } catch (err) {
      console.error("Test nudge error:", err);
    }
    setSendingTest(false);
  }, [selectedNudge, targetUserId, targetUser, onSendNudge]);

  const tabBtn = (id, label, emoji) => (
    <button
      onClick={() => setActiveTab(id)}
      style={{
        flex: 1,
        padding: "10px 16px",
        fontSize: 13,
        fontWeight: 600,
        fontFamily: BRAND.sans,
        color: activeTab === id ? BRAND.brick : BRAND.textMuted,
        background: activeTab === id ? BRAND.brick + "08" : "transparent",
        border: "none",
        borderBottom: "2px solid " + (activeTab === id ? BRAND.brick : "transparent"),
        cursor: "pointer",
        transition: "all 150ms",
      }}
    >
      {emoji} {label}
    </button>
  );

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 22 }}>🧪</span>
          <h2 style={{ ...S.h2, margin: 0 }}>Notification Testing</h2>
        </div>
        <p style={{ fontSize: 13, color: BRAND.textMuted, margin: 0, lineHeight: 1.6 }}>
          Preview digest emails and test nudge notifications using live data. Sent nudges are tagged with [TEST] prefix.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid " + BRAND.borderLight, marginBottom: 20 }}>
        {tabBtn("digest", "Digest Previews", "📬")}
        {tabBtn("nudge", "Nudge Testing", "📣")}
        {tabBtn("log", "Send Log", "📜")}
      </div>

      {/* ── DIGEST TAB ──────────────────────────────────────────────── */}
      {activeTab === "digest" && (
        <div>
          {/* Type selector */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: BRAND.textMuted, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Select digest type
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {DIGEST_TYPES.map(d => {
                const sel = selectedDigest === d.id;
                return (
                  <button
                    key={d.id}
                    onClick={() => setSelectedDigest(sel ? null : d.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 16px",
                      background: sel ? BRAND.brick + "06" : BRAND.white,
                      border: "1px solid " + (sel ? BRAND.brick + "40" : BRAND.borderLight),
                      borderRadius: 10,
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: BRAND.sans,
                      transition: "all 150ms",
                    }}
                  >
                    <span style={{ fontSize: 22, flexShrink: 0 }}>{d.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: sel ? BRAND.brick : BRAND.navy }}>{d.label}</div>
                      <div style={{ fontSize: 12, color: BRAND.textMuted, marginTop: 2 }}>{d.description}</div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: d.role === "Treasurer" ? "#E8EDF5" : "#E8F0E6", color: d.role === "Treasurer" ? "#3B5998" : BRAND.success }}>
                      {d.role}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Target user (for member digests) */}
          {selectedDigest && DIGEST_TYPES.find(d => d.id === selectedDigest)?.role === "Member" && (
            <div style={{ marginBottom: 20 }}>
              <Field label="Preview as member">
                <select
                  style={S.input}
                  value={targetUserId}
                  onChange={e => setTargetUserId(e.target.value)}
                >
                  <option value="">Select a member...</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.email})</option>
                  ))}
                </select>
              </Field>
            </div>
          )}

          {/* Preview */}
          {selectedDigest && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: BRAND.textMuted, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Email preview
              </div>
              <DigestPreview
                type={selectedDigest}
                entries={entries}
                purchaseEntries={purchaseEntries}
                users={users}
                settings={settings}
                currentUser={currentUser}
                targetUser={targetUser}
                mob={mob}
              />
              <div style={{ marginTop: 16, padding: "12px 16px", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#1E40AF", marginBottom: 4 }}>ℹ️ Preview mode</div>
                <div style={{ fontSize: 12, color: "#1E40AF", opacity: 0.8, lineHeight: 1.5 }}>
                  This preview uses live data from your database. No email is actually sent. When email integration is configured, this digest format will be delivered on the schedule shown in the footer.
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── NUDGE TAB ───────────────────────────────────────────────── */}
      {activeTab === "nudge" && (
        <div>
          {/* Scenario selector */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: BRAND.textMuted, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Select nudge scenario
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {TEST_NUDGE_SCENARIOS.map(s => {
                const sel = selectedNudge === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedNudge(sel ? null : s.id)}
                    style={{
                      padding: "8px 14px",
                      fontSize: 12,
                      fontWeight: 500,
                      fontFamily: BRAND.sans,
                      borderRadius: 8,
                      border: "1px solid " + (sel ? BRAND.brick + "40" : BRAND.borderLight),
                      background: sel ? BRAND.brick + "08" : BRAND.white,
                      color: sel ? BRAND.brick : BRAND.textMuted,
                      cursor: "pointer",
                      transition: "all 150ms",
                    }}
                  >
                    {s.emoji} {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Target member */}
          <div style={{ marginBottom: 20 }}>
            <Field label="Send test nudge to">
              <select
                style={S.input}
                value={targetUserId}
                onChange={e => setTargetUserId(e.target.value)}
              >
                <option value="">Select a member...</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({m.email})</option>
                ))}
              </select>
            </Field>
          </div>

          {/* Preview */}
          {selectedNudge && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: BRAND.textMuted, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Banner preview
              </div>
              <NudgePreview
                scenario={TEST_NUDGE_SCENARIOS.find(s => s.id === selectedNudge)}
                senderName={currentUser?.name}
                recipientName={targetUser?.name}
                mob={mob}
              />
            </div>
          )}

          {/* Send button */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              style={{
                ...S.btnPrimary,
                opacity: !selectedNudge || !targetUserId || sendingTest ? 0.5 : 1,
              }}
              disabled={!selectedNudge || !targetUserId || sendingTest}
              onClick={handleSendTestNudge}
            >
              {sendingTest ? "Sending..." : "Send Test Nudge"}
            </button>
            {testSent && (
              <span className="fade-in" style={{ fontSize: 13, color: BRAND.success, fontWeight: 600 }}>
                ✅ Sent to {testSent.recipient}
              </span>
            )}
          </div>

          <div style={{ marginTop: 16, padding: "12px 16px", background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#92400E", marginBottom: 4 }}>⚠️ Live send</div>
            <div style={{ fontSize: 12, color: "#92400E", opacity: 0.8, lineHeight: 1.5 }}>
              Test nudges are sent to the real nudge system and will appear in the member's app with a [TEST] prefix. The member will see the banner on their next visit.
            </div>
          </div>
        </div>
      )}

      {/* ── SEND LOG TAB ────────────────────────────────────────────── */}
      {activeTab === "log" && (
        <div>
          {sendLog.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: BRAND.textMuted }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📜</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No test notifications sent yet</div>
              <div style={{ fontSize: 12 }}>Send a test nudge from the Nudge Testing tab to see it logged here.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {sendLog.map((log, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: BRAND.white, border: "1px solid " + BRAND.borderLight, borderRadius: 8 }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>
                    {log.type === "nudge" ? "📣" : "📬"}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: BRAND.navy }}>
                      {log.type === "nudge" ? "Test Nudge" : "Digest Preview"}: {log.template}
                    </div>
                    <div style={{ fontSize: 11, color: BRAND.textMuted, marginTop: 2 }}>
                      To: {log.recipient} · {timeAgo(log.timestamp)}
                    </div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: "#E8F0E6", color: BRAND.success }}>
                    ✓ Sent
                  </span>
                </div>
              ))}
              <button
                style={{ ...S.btnGhost, fontSize: 12, alignSelf: "center", marginTop: 8 }}
                onClick={() => setSendLog([])}
              >
                Clear log
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationTestPanel;
