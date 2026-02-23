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

export const NotificationPanel = ({ entries, purchaseEntries, users, settings, onView, onViewPurchase, onClose, onReviewAll, mob }) => {
  const pendingWork = entries.filter(e => e.status === STATUSES.SUBMITTED).map(e => ({ ...e, _type: "work" }));
  const pendingPurch = (purchaseEntries || []).filter(e => e.status === "Submitted").map(e => ({ ...e, _type: "purchase" }));
  const pending = [...pendingWork, ...pendingPurch].sort((a, b) => (b.createdAt || b.date || "").localeCompare(a.createdAt || a.date || ""));
  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 94 }} onClick={onClose} aria-hidden="true" />
      <div role="dialog" aria-label="Notifications" style={{ position: mob ? "fixed" : "absolute", top: mob ? 58 : 44, right: mob ? 8 : 0, left: mob ? 8 : "auto", width: mob ? "auto" : 360, maxHeight: mob ? "70vh" : 420, background: BRAND.white, borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.15)", border: "1px solid " + BRAND.borderLight, zIndex: 95, overflow: "hidden", animation: "fadeIn 200ms ease-out" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid " + BRAND.borderLight }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="bell" size={18} />
            <span style={{ fontWeight: 700, fontSize: 15, color: BRAND.navy }}>Notifications</span>
            {pending.length > 0 && <span aria-label={pending.length + " pending"} style={{ background: "#EF4444", color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10 }}>{pending.length}</span>}
          </div>
          <button aria-label="Close notifications" style={{ background: "none", border: "none", color: BRAND.textLight, cursor: "pointer", padding: 8, minWidth: 36, minHeight: 36, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}><Icon name="x" size={18} /></button>
        </div>
        <div style={{ overflowY: "auto", maxHeight: 320 }}>
          {pending.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
              <div style={{ fontWeight: 600, color: BRAND.navy, marginBottom: 4 }}>All caught up!</div>
              <div style={{ fontSize: 13, color: BRAND.textLight }}>No entries waiting for your review.</div>
            </div>
          ) : (
            pending.map((e, i) => {
              const u = users.find(u => u.id === e.userId);
              const isPurchase = e._type === "purchase";
              const h = isPurchase ? null : calcHours(e.startTime, e.endTime);
              const total = isPurchase ? (e.total || 0) : (calcLabor(h, getUserRate(users, settings, e.userId)) + calcMaterialsTotal(e.materials));
              const desc = isPurchase ? (e.storeName + " — " + (e.description || "")).slice(0, 60) : (e.description || "").slice(0, 60);
              return (
                <div key={e.id} role="button" tabIndex={0} onKeyDown={ev => (ev.key === "Enter" || ev.key === " ") && (ev.preventDefault(), isPurchase ? onViewPurchase(e) : onView(e))} aria-label={(u?.name || "Member") + ": " + e.category + ", " + fmt(total)} style={{ padding: "12px 16px", borderBottom: i < pending.length - 1 ? "1px solid " + BRAND.borderLight : "none", cursor: "pointer", background: BRAND.white, transition: "background 150ms" }} onClick={() => isPurchase ? onViewPurchase(e) : onView(e)} onMouseEnter={ev => ev.currentTarget.style.background = BRAND.bgSoft} onMouseLeave={ev => ev.currentTarget.style.background = BRAND.white}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 14, background: (isPurchase ? "#0E7490" : BRAND.brick) + "18", color: isPurchase ? "#0E7490" : BRAND.brick, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{isPurchase ? "🛍" : (u?.name || "?").split(" ").map(n => n[0]).join("").slice(0, 2)}</div>
                      <span style={{ fontWeight: 600, fontSize: 13, color: BRAND.navy }}>{u?.name || "Member"}</span>
                      {isPurchase && <span style={{ fontSize: 9, fontWeight: 700, color: "#0E7490", background: "#ECFEFF", padding: "1px 6px", borderRadius: 8 }}>PURCHASE</span>}
                    </div>
                    <span style={{ fontSize: 11, color: BRAND.textLight, whiteSpace: "nowrap" }}>{timeAgo(e.createdAt || e.submittedAt)}</span>
                  </div>
                  <div style={{ marginLeft: 36, fontSize: 13, color: BRAND.charcoal, marginBottom: 4 }}><CategoryBadge category={e.category} /> <span style={{ marginLeft: 4 }}>{desc}{desc.length >= 60 ? "..." : ""}</span></div>
                  <div style={{ marginLeft: 36, display: "flex", gap: 12, fontSize: 12, color: BRAND.textLight }}>
                    <span>{formatDate(e.date)}</span>{h != null && <span>{fmtHours(h)}</span>}<span style={{ fontWeight: 600, color: isPurchase ? "#0E7490" : BRAND.brick }}>{fmt(total)}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
        {pending.length > 0 && (
          <div style={{ padding: "10px 16px", borderTop: "1px solid " + BRAND.borderLight, textAlign: "center" }}>
            <button style={{ background: "none", border: "none", color: BRAND.brick, fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: BRAND.sans }} onClick={onReviewAll}>Review All ({pending.length}) →</button>
          </div>
        )}
      </div>
    </>
  );
};

