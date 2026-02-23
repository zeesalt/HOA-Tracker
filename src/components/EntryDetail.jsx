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
import { WorkflowStepper } from "./WorkflowStepper";
export const EntryDetail = ({ entry, settings, users, currentUser, onBack, onEdit, onApprove, onReject, onTrash, onRestore, onMarkPaid, onDuplicate, onSecondApprove, onDelete, onComment, mob }) => {
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
  const [processing, setProcessing] = useState(false);
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
                  style={{ ...S.btnSuccess, position: "relative", overflow: "hidden", opacity: processing ? 0.6 : 1 }}
                  disabled={processing}
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
                  style={{ ...S.btnDanger, animation: declineShake ? "shake 300ms ease-in-out" : "none", opacity: processing ? 0.6 : 1 }}
                  disabled={processing}
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
                <button style={{ ...S.btnDanger, fontSize: 13, opacity: declineNote.trim() && !processing ? 1 : 0.5 }}
                  disabled={!declineNote.trim() || processing}
                  onClick={async () => { setProcessing(true); await onReject(declineNote); setShowDeclinePanel(false); setDeclineNote(""); setProcessing(false); }}>
                  <Icon name="x" size={14} /> {processing ? "Declining..." : "Confirm Decline"}
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
            <button style={{ ...S.btnSuccess, whiteSpace: "nowrap", opacity: processing ? 0.6 : 1 }} disabled={processing} onClick={async () => { setProcessing(true); await onSecondApprove(entry.id); setProcessing(false); }}><Icon name="check" size={16} /> {processing ? "Approving..." : "Second Approve"}</button>
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
              style={{ ...S.btnPrimary, background: "#3B5998", position: "relative", overflow: "hidden", transition: "transform 150ms ease", opacity: processing ? 0.6 : 1 }}
              disabled={processing}
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
      <ConfirmDialog open={showApproveConfirm} onClose={() => setShowApproveConfirm(false)} title={dualRequired ? "First Approval" : "Approve?"} message={dualRequired ? "This entry (" + fmt(grandTotal) + ") exceeds the dual-approval threshold. A second board member will need to approve before it's final." : "Approve " + fmt(grandTotal) + " for " + (user?.name || "member") + "?"} confirmText={dualRequired ? "First Approve" : "Approve"} onConfirm={async () => { setProcessing(true); await onApprove(reviewNotes); setProcessing(false); }} />
      <ConfirmDialog open={showPaidConfirm} onClose={() => setShowPaidConfirm(false)} title="Mark as Paid?" message={"Confirm payment of " + fmt(grandTotal) + " to " + (user?.name || "member") + " via " + payMethod + (payRef ? " (#" + payRef + ")" : "") + "?"} confirmText="Mark Paid" onConfirm={async () => { setProcessing(true); await onMarkPaid({ method: payMethod, reference: payRef }); setProcessing(false); }} />
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
