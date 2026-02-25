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
import { ActivityTimeline } from "./ActivityTimeline";
export const PurchaseEntryDetail = ({ entry, settings, users, currentUser, onBack, onEdit, onApprove, onReject, onMarkPaid, mob }) => {
  const user = users.find(u => u.id === entry.userId);
  const isTreasurer = currentUser?.role === ROLES.TREASURER;
  const isOwner = currentUser?.id === entry.userId;
  const canEdit = isOwner && (entry.status === "Draft" || entry.status === "Rejected");
  const canReview = isTreasurer && entry.status === "Submitted";
  const [reviewNotes, setReviewNotes] = useState("");
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [processing, setProcessing] = useState(false);
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
          <div><div style={{ fontSize: 12, color: BRAND.textLight, textTransform: "uppercase", marginBottom: 4 }}>Store</div><div style={{ fontSize: 15, fontWeight: 600, color: BRAND.charcoal }}>{entry.storeName}</div></div>
          <div><div style={{ fontSize: 12, color: BRAND.textLight, textTransform: "uppercase", marginBottom: 4 }}>Category</div><div style={{ fontSize: 14 }}>{PURCHASE_CATEGORY_EMOJIS[entry.category] || "📦"} {entry.category}</div></div>
          {entry.paymentMethod && <div><div style={{ fontSize: 12, color: BRAND.textLight, textTransform: "uppercase", marginBottom: 4 }}>Payment Method</div><div style={{ fontSize: 14 }}>{entry.paymentMethod}</div></div>}
          {entry.description && <div style={{ gridColumn: "1 / -1" }}><div style={{ fontSize: 12, color: BRAND.textLight, textTransform: "uppercase", marginBottom: 4 }}>Description</div><div style={{ fontSize: 14 }}>{entry.description}</div></div>}
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
              {entry.receiptUrls.map((url, i) => <img key={i} src={url} alt={"Receipt " + (i + 1)} style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8, border: "1px solid " + BRAND.borderLight, cursor: "pointer" }} onClick={() => window.open(url)} />)}
            </div>
          </div>
        )}
        {entry.photoUrls?.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={S.sectionLabel}>Photos</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              {entry.photoUrls.map((url, i) => <img key={i} src={url} alt={"Photo " + (i + 1)} style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8, border: "1px solid " + BRAND.borderLight, cursor: "pointer" }} onClick={() => window.open(url)} />)}
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

        {/* Activity Timeline */}
        <ActivityTimeline entry={entry} mob={mob} />

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end", marginTop: 8 }}>
          {canEdit && <button style={S.btnPrimary} onClick={onEdit}><Icon name="edit" size={16} /> Edit</button>}
          {canReview && (
            <>
              <div style={{ flex: 1 }} />
              <input style={{ ...S.input, flex: 2, minWidth: 200, maxWidth: 400, fontSize: 13 }} value={reviewNotes} onChange={e => setReviewNotes(e.target.value)} placeholder="Reviewer notes (optional)..." />
              <button style={{ ...S.btnGhost, color: BRAND.error, border: "1px solid " + BRAND.error + "40", opacity: processing ? 0.6 : 1 }} disabled={processing} onClick={() => setShowRejectConfirm(true)}><Icon name="x" size={16} /> Decline</button>
              <button style={{ ...S.btnPrimary, opacity: processing ? 0.6 : 1 }} disabled={processing} onClick={async () => { setProcessing(true); await onApprove(reviewNotes); setProcessing(false); }}><Icon name="check" size={16} /> {processing ? "Approving..." : "Approve"}</button>
            </>
          )}
          {isTreasurer && entry.status === "Approved" && (
            <button style={{ ...S.btnPrimary, background: BRAND.success, opacity: processing ? 0.6 : 1 }} disabled={processing} onClick={async () => { setProcessing(true); await (onMarkPaid && onMarkPaid({ method: "Check" })); setProcessing(false); }}><Icon name="dollar" size={16} /> {processing ? "Processing..." : "Mark Paid"}</button>
          )}
        </div>
      </div>

      <ConfirmDialog open={showRejectConfirm} onClose={() => setShowRejectConfirm(false)} onConfirm={async () => { setProcessing(true); await onReject(reviewNotes); setShowRejectConfirm(false); setProcessing(false); }} title="Decline Purchase Entry?" message="This will return the entry to the member for edits." confirmText="Decline" danger />
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
