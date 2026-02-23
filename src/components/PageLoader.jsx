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

export const LOADING_MESSAGES = {
  dashboard: [
    { emoji: "🏠", text: "Sweeping the front porch..." },
    { emoji: "📊", text: "Crunching the numbers..." },
    { emoji: "🔑", text: "Unlocking the front door..." },
    { emoji: "☕", text: "Brewing your dashboard..." },
  ],
  entries: [
    { emoji: "📋", text: "Dusting off the clipboard..." },
    { emoji: "🔍", text: "Hunting down your entries..." },
    { emoji: "📦", text: "Unpacking the work logs..." },
    { emoji: "🗂️", text: "Organizing the filing cabinet..." },
  ],
  review: [
    { emoji: "🧐", text: "Putting on reading glasses..." },
    { emoji: "⚖️", text: "Calibrating the scales..." },
    { emoji: "🔬", text: "Inspecting the fine print..." },
    { emoji: "📝", text: "Sharpening the red pen..." },
  ],
  reports: [
    { emoji: "📈", text: "Polishing the spreadsheets..." },
    { emoji: "🧮", text: "Consulting the abacus..." },
    { emoji: "🖨️", text: "Warming up the printer..." },
    { emoji: "📊", text: "Making charts look fancy..." },
  ],
  settings: [
    { emoji: "⚙️", text: "Turning the gears..." },
    { emoji: "🔧", text: "Grabbing the wrench..." },
    { emoji: "🎛️", text: "Adjusting the dials..." },
  ],
  insights: [
    { emoji: "🏘️", text: "Surveying the neighborhood..." },
    { emoji: "🧾", text: "Tallying up the receipts..." },
    { emoji: "🔎", text: "Inspecting every penny..." },
    { emoji: "📊", text: "Crunching community numbers..." },
    { emoji: "💡", text: "Gathering HOA wisdom..." },
  ],
};
export const PageLoader = ({ page }) => {
  const msgs = LOADING_MESSAGES[page] || LOADING_MESSAGES.dashboard;
  const msg = msgs[Math.floor(Math.random() * msgs.length)];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 20px", textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 16, animation: "bounce 600ms ease-in-out infinite" }}>{msg.emoji}</div>
      <div style={{ fontSize: 14, color: BRAND.textMuted, fontFamily: BRAND.sans, animation: "fadeIn 300ms ease-out" }}>{msg.text}</div>
    </div>
  );
};
// ═══════════════════════════════════════════════════════════════════════════
export const RateInput = ({ initialValue, placeholder, onSave }) => {
  const [val, setVal] = useState(initialValue || "");
  return <input aria-label="Hourly rate" type="number" min="0" step="0.50" style={{ ...S.input, padding: "6px 10px" }} value={val} onChange={e => setVal(e.target.value)} onBlur={() => onSave(Number(val) || null)} placeholder={placeholder} />;
};

// ═══════════════════════════════════════════════════════════════════════════
// SETTINGS PAGE
// ═══════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════
// COMMUNITY INSIGHTS (visible to all members)
// ═══════════════════════════════════════════════════════════════════════════
