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

export const MoreSheet = ({ onClose, trashCount, nav }) => {
  const sheetRef = useRef(null);
  const [pullY, setPullY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startY = useRef(null);
  const DISMISS_THRESHOLD = 80;

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const onTouchStart = (e) => {
    startY.current = e.touches[0].clientY;
    setDragging(true);
  };
  const onTouchMove = (e) => {
    if (startY.current == null) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0) { setPullY(dy); e.preventDefault(); }
  };
  const onTouchEnd = () => {
    setDragging(false);
    if (pullY >= DISMISS_THRESHOLD) { onClose(); }
    else { setPullY(0); }
    startY.current = null;
  };

  const items = [
    { id: "members",   label: "Members",              emoji: "👥", desc: "Directory & nudge members" },
    { id: "insights",  label: "Community Insights",   emoji: "✨", desc: "Spending trends" },
    { id: "settings",  label: "Settings",             emoji: "⚙️",  desc: "HOA name, rates, invite codes" },
    { id: "trash",     label: "Trash",                emoji: "🗑",  desc: trashCount > 0 ? trashCount + " item" + (trashCount > 1 ? "s" : "") : "Empty", badge: trashCount || 0 },
    { id: "notification-test", label: "Notification Testing", emoji: "🧪", desc: "Test digests & nudges" },
    { id: "help",      label: "Help",                 emoji: "❓", desc: "How to use the app" },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 80 }} onClick={onClose}>
      {/* Backdrop dims as sheet is pulled */}
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0," + Math.max(0.3 - pullY * 0.003, 0) + ")", transition: dragging ? "none" : "background 300ms" }} />
      <div
        ref={sheetRef}
        onClick={e => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          background: BRAND.white, borderRadius: "20px 20px 0 0",
          padding: "0 0 calc(env(safe-area-inset-bottom) + 16px)",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.18)",
          transform: "translateY(" + pullY + "px)",
          transition: dragging ? "none" : "transform 300ms cubic-bezier(0.34,1.56,0.64,1)",
          touchAction: "none",
        }}
      >
        {/* Drag handle */}
        <div onClick={onClose} style={{ cursor: "pointer", padding: "12px 0 8px", display: "flex", justifyContent: "center" }}>
          <div style={{ width: 40, height: 4, background: pullY > 40 ? BRAND.textMuted : BRAND.borderLight, borderRadius: 2, transition: "background 150ms" }} />
        </div>
        <div style={{ padding: "0 20px", marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: BRAND.textLight, letterSpacing: "0.08em", textTransform: "uppercase" }}>Treasurer Tools</div>
            <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", color: BRAND.textMuted, cursor: "pointer", padding: 6, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", minWidth: 36, minHeight: 36 }}><Icon name="x" size={20} /></button>
          </div>
          {items.map(item => (
            <button key={item.id} style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", padding: "14px 16px", borderRadius: 12, border: "none", background: "none", cursor: "pointer", fontFamily: BRAND.sans, marginBottom: 4, textAlign: "left" }}
              onMouseEnter={ev => ev.currentTarget.style.background = BRAND.bgSoft}
              onMouseLeave={ev => ev.currentTarget.style.background = "none"}
              onClick={() => { onClose(); nav(item.id); }}>
              <span style={{ fontSize: 28, width: 36, textAlign: "center" }}>{item.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: BRAND.charcoal }}>{item.label}</div>
                <div style={{ fontSize: 12, color: BRAND.textLight }}>{item.desc}</div>
              </div>
              {item.badge > 0 && <span style={{ background: BRAND.brick, color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10 }}>{item.badge}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

