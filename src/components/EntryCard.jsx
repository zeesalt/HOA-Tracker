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

const SWIPE_THRESHOLD     = 60;   // px to commit reveal
const SWIPE_MAX_MEMBER    = 80;   // px travel for single-button reveal (View/Edit only)
const SWIPE_MAX_MEMBER_2  = 144;  // px travel for two-button reveal (Edit + Delete: 80+64)
const SWIPE_MAX_TREASURER = 196;  // px travel for three 64px buttons (3×64=192 + 4px buffer)

export const EntryCard = ({ entry, users, settings, currentUser, onClick, onEdit, onSubmit, onApprove, onReject, onDelete }) => {
  const u = users.find(u => u.id === entry.userId);
  const hrs   = calcHours(entry.startTime, entry.endTime);
  const rate  = getUserRate(users, settings, entry.userId);
  const total = calcLabor(hrs, rate) + calcMaterialsTotal(entry.materials);
  const photoCount = (entry.preImages?.length || 0) + (entry.postImages?.length || 0);

  const isTreasurer = currentUser?.role === ROLES.TREASURER;

  // ── what actions apply to this card ───────────────────────────────────
  const canSubmit  = !isTreasurer && entry.status === STATUSES.DRAFT && entry.userId === currentUser?.id;
  const canEdit    = !isTreasurer && [STATUSES.DRAFT, STATUSES.REJECTED].includes(entry.status) && entry.userId === currentUser?.id;
  // Treasurer can approve/decline Submitted or Awaiting 2nd entries
  const canApprove = isTreasurer && [STATUSES.SUBMITTED, STATUSES.AWAITING_SECOND].includes(entry.status);
  const canDecline = isTreasurer && [STATUSES.SUBMITTED, STATUSES.AWAITING_SECOND].includes(entry.status);
  // Treasurer can delete any entry (Draft, Rejected, etc.) — not Approved/Paid
  const canTreasDelete = isTreasurer && ![STATUSES.APPROVED, STATUSES.PAID].includes(entry.status);

  const canMemberDelete = !isTreasurer && canEdit && entry.status === STATUSES.DRAFT;
  const swipeMax = isTreasurer ? SWIPE_MAX_TREASURER : (canMemberDelete ? SWIPE_MAX_MEMBER_2 : SWIPE_MAX_MEMBER);
  // Treasurer: only left swipe allowed
  const allowSwipeRight = !isTreasurer && canSubmit;
  const allowSwipeLeft  = isTreasurer ? (canApprove || canTreasDelete) : (canEdit || true); // members can always view

  // ── swipe state ────────────────────────────────────────────────────────
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const [offsetX, setOffsetX]   = useState(0);
  const [revealed, setRevealed] = useState(null); // "left" | "right" | null
  const [swiping, setSwiping]   = useState(false);

  const reset = () => { setOffsetX(0); setRevealed(null); setSwiping(false); };

  const onTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    setSwiping(false);
  };

  const onTouchMove = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (!swiping && Math.abs(dy) > Math.abs(dx)) return; // vertical scroll — ignore
    setSwiping(true);
    e.preventDefault();
    // Start from current revealed position so swipe-back feels natural
    const base = revealed === "left" ? -swipeMax : revealed === "right" ? swipeMax : 0;
    const lo = allowSwipeLeft  ? -swipeMax : 0;
    const hi = allowSwipeRight ? swipeMax  : 0;
    setOffsetX(Math.max(lo, Math.min(hi, base + dx)));
  };

  const onTouchEnd = () => {
    if (!swiping) { touchStartX.current = null; return; }
    // If we've moved enough toward center from a revealed state → dismiss
    const base = revealed === "left" ? -swipeMax : revealed === "right" ? swipeMax : 0;
    const delta = offsetX - base;
    if (revealed === "left"  && delta > SWIPE_THRESHOLD)  { reset(); }
    else if (revealed === "right" && delta < -SWIPE_THRESHOLD) { reset(); }
    else if (!revealed && offsetX < -SWIPE_THRESHOLD && allowSwipeLeft)  { setOffsetX(-swipeMax); setRevealed("left"); }
    else if (!revealed && offsetX > SWIPE_THRESHOLD  && allowSwipeRight) { setOffsetX(swipeMax);  setRevealed("right"); }
    else { setOffsetX(base); } // snap back to current state
    touchStartX.current = null;
  };

  const handleCardClick = () => { if (revealed) { reset(); return; } onClick(); };

  // ── backdrop colours ───────────────────────────────────────────────────
  // Left-swipe backdrop (right side of card) — danger zone for treasurer
  const leftSwipeBg = isTreasurer ? "#7f1d1d" : (canEdit ? BRAND.navy : "#4B5563");

  return (
    <div style={{ position: "relative", overflow: "hidden", borderRadius: 12, marginBottom: 10 }}>

      {/* ── SWIPE-RIGHT backdrop (Member submit only) ── */}
      {allowSwipeRight && (
        <div aria-hidden="true" style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center",
          paddingLeft: 20, background: BRAND.green, borderRadius: 12,
        }}>
          <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>✅ Submit</span>
        </div>
      )}

      {/* ── SWIPE-LEFT backdrop ── */}
      {allowSwipeLeft && (
        <div aria-hidden="true" style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center",
          justifyContent: "flex-end", paddingRight: 20, background: leftSwipeBg, borderRadius: 12,
          gap: 8,
        }}>
          {isTreasurer ? (
            <>
              {canApprove     && <Icon name="check" size={22} style={{ color: "#fff" }} />}
              {canDecline     && <Icon name="x"     size={22} style={{ color: "#fff" }} />}
              {canTreasDelete && <Icon name="trash" size={20} style={{ color: "#fff" }} />}
            </>
          ) : (
            <span style={{ color: "#fff", fontSize: 22 }}>{canEdit ? <Icon name="edit" size={22} style={{ color: "#fff" }} /> : <Icon name="inbox" size={22} style={{ color: "#fff" }} />}</span>
          )}
        </div>
      )}

      {/* ── CARD (slides) ── */}
      <div
        role="button" tabIndex={0}
        aria-label={entry.category + ": " + entry.description + ", " + fmt(total) + ", " + entry.status}
        onKeyDown={e => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onClick())}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={handleCardClick}
        style={{
          ...S.card,
          cursor: "pointer",
          padding: "14px 16px",
          marginBottom: 0,
          transform: `translateX(${offsetX}px)`,
          transition: swiping ? "none" : "transform 380ms cubic-bezier(0.34,1.56,0.64,1)",
          userSelect: "none",
          WebkitUserSelect: "none",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
              <CategoryBadge category={entry.category} />
              <StatusBadge status={entry.status} />
              {photoCount > 0 && (
                <span aria-label={photoCount + " photos"} style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 12, color: BRAND.textLight, background: BRAND.bgSoft, padding: "2px 8px", borderRadius: 10 }}>
                  📷 {photoCount}
                </span>
              )}
              {entry.comments?.length > 0 && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 12, color: "#4338CA", background: "#EEF2FF", padding: "2px 8px", borderRadius: 10, fontWeight: 600 }}>
                  💬 {entry.comments.length}
                </span>
              )}
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, color: BRAND.charcoal, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {entry.description}
            </div>
          </div>
          <div style={{ textAlign: "right", marginLeft: 12 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: BRAND.navy }}>{fmt(total)}</div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 13, color: BRAND.textLight }}>
            {relativeDate(entry.date)} · {fmtHours(hrs)}{u ? " · " + u.name : ""}
          </div>
          {/* swipe hint: ‹ for left-swipeable, › for right-swipeable */}
          {!revealed && (
            <div aria-hidden="true" style={{ fontSize: 16, opacity: 0.2, letterSpacing: -2, lineHeight: 1 }}>
              {allowSwipeRight && <span>›</span>}
              {allowSwipeLeft  && <span>‹</span>}
            </div>
          )}
        </div>
      </div>

      {/* ── REVEALED: swipe-right → Submit (Member, Draft) ── */}
      {revealed === "right" && canSubmit && (
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, display: "flex", alignItems: "center", paddingLeft: 12, zIndex: 2 }}>
          <button
            style={{ background: "#fff", color: BRAND.green, border: "2px solid " + BRAND.green, borderRadius: 8, padding: "7px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
            onClick={(e) => { e.stopPropagation(); reset(); onSubmit(entry); }}
          >
            Submit
          </button>
        </div>
      )}

      {/* ── REVEALED: swipe-left (Treasurer) → Approve / Decline / Delete ── */}
      {revealed === "left" && isTreasurer && (
        <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, display: "flex", alignItems: "stretch", zIndex: 2 }}>
          {canApprove && (
            <button
              aria-label="Approve"
              style={{ background: BRAND.success, color: "#fff", border: "none", width: 64, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 22, transition: "transform 120ms ease, filter 120ms ease" }}
              onTouchStart={e => e.currentTarget.style.transform = "scale(0.88)"}
              onTouchEnd={e => { e.currentTarget.style.transform = "scale(1)"; e.stopPropagation(); reset(); onApprove(entry); }}
            >
              <Icon name="check" size={22} />
            </button>
          )}
          {canDecline && (
            <button
              aria-label="Decline"
              style={{ background: BRAND.brick, color: "#fff", border: "none", width: 64, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "transform 120ms ease" }}
              onTouchStart={e => e.currentTarget.style.transform = "scale(0.88)"}
              onTouchEnd={e => { e.currentTarget.style.transform = "scale(1)"; e.stopPropagation(); reset(); onReject(entry); }}
            >
              <Icon name="x" size={22} />
            </button>
          )}
          {canTreasDelete && (
            <button
              aria-label="Move to trash"
              style={{ background: "#7f1d1d", color: "#fff", border: "none", width: 64, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 20, transition: "transform 120ms ease" }}
              onTouchStart={e => e.currentTarget.style.transform = "scale(0.88)"}
              onTouchEnd={e => { e.currentTarget.style.transform = "scale(1)"; e.stopPropagation(); reset(); onDelete(entry); }}
            >
              <Icon name="trash" size={20} />
            </button>
          )}
        </div>
      )}

      {/* ── REVEALED: swipe-left (Member) → Edit/View + Delete (drafts) ── */}
      {revealed === "left" && !isTreasurer && (
        <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, display: "flex", alignItems: "stretch", zIndex: 2 }}>
          {canEdit && entry.status === STATUSES.DRAFT && (
            <button
              aria-label="Delete draft"
              style={{ background: "#7f1d1d", color: "#fff", border: "none", width: 64, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "transform 120ms ease" }}
              onTouchStart={e => e.currentTarget.style.transform = "scale(0.88)"}
              onTouchEnd={e => { e.currentTarget.style.transform = "scale(1)"; e.stopPropagation(); reset(); onDelete(entry); }}
              onClick={(e) => { e.stopPropagation(); reset(); onDelete(entry); }}
            >
              <Icon name="trash" size={20} />
            </button>
          )}
          <button
            aria-label={canEdit ? "Edit entry" : "View entry"}
            style={{ background: canEdit ? BRAND.navy : "#4B5563", color: "#fff", border: "none", width: 80, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            onClick={(e) => { e.stopPropagation(); reset(); canEdit ? onEdit(entry) : onClick(); }}
          >
            <Icon name={canEdit ? "edit" : "inbox"} size={22} />
          </button>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// REPORTS PAGE
// ═══════════════════════════════════════════════════════════════════════════
