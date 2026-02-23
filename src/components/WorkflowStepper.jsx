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

export const WorkflowStepper = ({ status, mob }) => {
  const [mounted, setMounted] = useState(false);
  const prevStatus = useRef(status);
  const [animatingIdx, setAnimatingIdx] = useState(null);

  useEffect(() => {
    // Stagger mount trigger — tiny delay so React paints first
    const t = setTimeout(() => setMounted(true), 30);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (prevStatus.current !== status) {
      // Find which step just became active and fire pop animation
      const rejected = status === STATUSES.REJECTED;
      const awaitingSecond = status === STATUSES.AWAITING_SECOND;
      const steps = rejected ? WORKFLOW_STEPS.slice(0, 2) : awaitingSecond ? [...WORKFLOW_STEPS.slice(0, 3)] : WORKFLOW_STEPS;
      const newIdx = rejected ? 1 : awaitingSecond ? 2 : steps.findIndex(s => s.key === status);
      setAnimatingIdx(newIdx);
      const t = setTimeout(() => setAnimatingIdx(null), 600);
      prevStatus.current = status;
      return () => clearTimeout(t);
    }
  }, [status]);

  const rejected = status === STATUSES.REJECTED;
  const awaitingSecond = status === STATUSES.AWAITING_SECOND;
  const steps = rejected ? WORKFLOW_STEPS.slice(0, 2) : awaitingSecond ? [...WORKFLOW_STEPS.slice(0, 3)] : WORKFLOW_STEPS;
  const currentIdx = rejected ? 1 : awaitingSecond ? 2 : steps.findIndex(s => s.key === status);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, width: "100%", overflow: "hidden" }}>
      {steps.map((s, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        const isRejectStep = rejected && active;
        const isAwaitStep = awaitingSecond && active;
        const dotColor = isRejectStep ? BRAND.error : isAwaitStep ? "#4338CA" : done ? BRAND.success : active ? BRAND.navy : BRAND.border;
        const lineColor = done ? BRAND.success : BRAND.borderLight;
        const delay = i * 70; // stagger ms
        const isAnimating = animatingIdx === i;

        return (
          <div key={s.key} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : "none" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: mob ? 48 : 64 }}>
              {/* Dot */}
              <div style={{
                width: mob ? 28 : 32, height: mob ? 28 : 32, borderRadius: 16,
                background: (done || active) ? dotColor : BRAND.bgSoft,
                border: "2px solid " + dotColor,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: (done || active) ? "#fff" : BRAND.textLight,
                transition: "background 400ms ease, border-color 400ms ease, transform 300ms ease",
                opacity: mounted ? 1 : 0,
                transform: mounted ? "scale(1)" : "scale(0.5)",
                animation: mounted
                  ? isAnimating
                    ? "stepPop 500ms cubic-bezier(0.34,1.56,0.64,1)"
                    : active
                      ? (isRejectStep ? "none" : `stepPulse${done ? "Success" : ""} 2s ease-in-out 800ms infinite`)
                      : "none"
                  : "none",
                // Stagger the initial transition delay
                transitionDelay: mounted ? "0ms" : `${delay}ms`,
                animationName: isAnimating ? "stepPop" : active && !isRejectStep ? (done ? "stepPulseSuccess" : "stepPulse") : "none",
              }}>
                {isRejectStep ? <Icon name="x" size={14} /> : done ? <Icon name="check" size={14} /> : <Icon name={s.icon} size={14} />}
              </div>
              {/* Label */}
              <span style={{
                fontSize: 11, fontWeight: active ? 700 : 500,
                color: active ? dotColor : done ? BRAND.success : BRAND.textLight,
                marginTop: 4, whiteSpace: "nowrap",
                opacity: mounted ? 1 : 0,
                transition: `opacity 300ms ease ${delay + 80}ms, color 400ms ease`,
              }}>
                {isRejectStep ? "Rejected" : isAwaitStep ? "Awaiting 2nd" : s.label}
              </span>
            </div>
            {/* Connecting line with fill animation */}
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 2, background: BRAND.borderLight, minWidth: 12, marginBottom: 18, position: "relative", overflow: "hidden" }}>
                <div style={{
                  position: "absolute", inset: 0,
                  background: BRAND.success,
                  width: done ? "100%" : "0%",
                  transition: `width 500ms ease ${delay + 120}ms`,
                }} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// ENTRY DETAIL
// ═══════════════════════════════════════════════════════════════════════════
