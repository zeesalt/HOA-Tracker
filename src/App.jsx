import { useState, useEffect, useMemo, useRef } from "react";
import { useSupabase } from "./useSupabase";
import {
  BRAND, CATEGORIES, STATUSES, ROLES,
  PURCHASE_CATEGORY_EMOJIS,
  useIsMobile, useOnline,
  fmt, fmtHours, todayStr, nowTime, relativeDate,
  calcHours, calcLabor, calcMaterialsTotal, formatDate, timeAgo, getUserRate,
  Icon, StatusBadge, CategoryBadge, RoleBadge,
  S, Modal, ConfirmDialog, StatCard,
} from "./shared";
import { EntryForm } from "./components/EntryForm";
import { PurchaseEntryForm } from "./components/PurchaseEntryForm";
import { PurchaseEntryDetail } from "./components/PurchaseEntryDetail";
import { WorkflowStepper } from "./components/WorkflowStepper";
import { EntryDetail } from "./components/EntryDetail";
import { EntryCard } from "./components/EntryCard";
import { ReportsPage } from "./components/ReportsPage";
import { PageLoader } from "./components/PageLoader";
import { HelpPage } from "./components/HelpPage";
import { PaymentRunPage } from "./components/PaymentRunPage";
import { CommunityInsights } from "./components/CommunityInsights";
import { HelpModal } from "./components/HelpModal";
import { NotificationPanel } from "./components/NotificationPanel";
import { SettingsPage } from "./components/SettingsPage";
import { MoreSheet } from "./components/MoreSheet";

export default function App() {
  // Inject global CSS keyframes once
  useEffect(() => {
    const id = "hoa-global-styles";
    if (document.getElementById(id)) return;
    const el = document.createElement("style");
    el.id = id;
    el.textContent = `
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      @keyframes bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
      @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes slideDown { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(16px); } }
      @keyframes slideInRight { from { opacity: 0; transform: translateX(24px); } to { opacity: 1; transform: translateX(0); } }
      @keyframes slideOutLeft { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(-24px); } }
      @keyframes stepPop { 0% { transform: scale(0.6); opacity: 0; } 70% { transform: scale(1.18); } 100% { transform: scale(1); opacity: 1; } }
      @keyframes stepPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(31,42,56,0.18); } 50% { box-shadow: 0 0 0 7px rgba(31,42,56,0); } }
      @keyframes stepPulseSuccess { 0%,100% { box-shadow: 0 0 0 0 rgba(46,125,50,0.22); } 50% { box-shadow: 0 0 0 8px rgba(46,125,50,0); } }
      @keyframes lineFill { from { width: 0%; } to { width: 100%; } }
      @keyframes ripple { 0% { transform: scale(0); opacity: 0.5; } 100% { transform: scale(4); opacity: 0; } }
      @keyframes shake { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-5px); } 40% { transform: translateX(5px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(4px); } }
      @keyframes badgeSwap { 0% { transform: scale(1); opacity: 1; } 40% { transform: scale(0.75); opacity: 0; } 60% { transform: scale(0.75); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
      @keyframes countUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes ringDraw { from { stroke-dashoffset: 113; } to { stroke-dashoffset: 0; } }
      @keyframes cardSlideIn { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes cardCollapse { 0% { max-height: 200px; opacity: 1; margin-bottom: 10px; } 100% { max-height: 0; opacity: 0; margin-bottom: 0; padding-top: 0; padding-bottom: 0; } }
      @keyframes highlightFlash { 0% { background-color: rgba(245,194,72,0.35); } 100% { background-color: transparent; } }
      @keyframes toastSlideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes undoBar { from { width: 100%; } to { width: 0%; } }
      @keyframes saveCheck { 0% { transform: scale(0.7) rotate(-10deg); opacity: 0; } 60% { transform: scale(1.15) rotate(2deg); } 100% { transform: scale(1) rotate(0deg); opacity: 1; } }
      @keyframes validShake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
      @keyframes paidCount { from { opacity: 0; transform: translateY(4px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
      @keyframes springBack { 0% { transform: translateX(var(--snap-x, 0px)); } 60% { transform: translateX(calc(var(--snap-x, 0px) * -0.08)); } 100% { transform: translateX(0); } }
      .fade-in { animation: fadeIn 200ms ease-out; }
      .page-enter { animation: slideInRight 220ms cubic-bezier(0.25,0.46,0.45,0.94); }
      .page-exit { animation: slideOutLeft 180ms ease-in forwards; }
      .card-new { animation: cardSlideIn 320ms cubic-bezier(0.34,1.56,0.64,1); }
      .card-remove { animation: cardCollapse 280ms ease-in forwards; overflow: hidden; }
      .card-highlight { animation: highlightFlash 1400ms ease-out forwards; }
      .toast-enter { animation: toastSlideUp 280ms cubic-bezier(0.34,1.56,0.64,1); }
      .shake { animation: shake 300ms ease-in-out; }
      .skip-link { position: absolute; left: -9999px; top: 0; }
      .skip-link:focus { left: 0; background: #fff; padding: 8px 16px; z-index: 9999; color: #000; font-weight: 600; }
      .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
    `;
    document.head.appendChild(el);
  }, []);

  const mob = useIsMobile();
  const online = useOnline();
  const {
    currentUser, users, entries, purchaseEntries, settings, loading, authError,
    login, logout: sbLogout, register, resetPassword, changePassword,
    saveEntry, deleteEntry, trashEntry, restoreEntry, approveEntry, firstApprove, secondApprove, rejectEntry, markPaid,
    needsInfoEntry, bulkApprove, addComment,
    savePurchaseEntry, deletePurchaseEntry, approvePurchaseEntry, rejectPurchaseEntry, markPurchasePaid,
    saveSettings, addUser, removeUser, updateUserRate,
    setAuthError, fetchCommunityStats, refresh,
  } = useSupabase();

  const [page, setPage] = useState("dashboard");
  // Undo stack — last action that can be reversed
  const [undoStack, setUndoStack] = useState([]); // [{label, action, timeout}]
  const pushUndo = (label, undoFn) => {
    // Clear previous undo if any
    setUndoStack(prev => {
      prev.forEach(u => clearTimeout(u.timeout));
      const tid = setTimeout(() => setUndoStack(p => p.filter(u => u.label !== label)), 6000);
      return [{ label, undoFn, timeout: tid }];
    });
  };
  const popUndo = async () => {
    const [top, ...rest] = undoStack;
    if (!top) return;
    clearTimeout(top.timeout);
    setUndoStack(rest);
    await top.undoFn();
  };
  const [viewEntry, setViewEntry] = useState(null);
  const [editEntry, setEditEntry] = useState(null);
  const [newEntry, setNewEntry] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [pageLoading, setPageLoading] = useState(null); // null = not loading, string = target page
  const [authMode, setAuthMode] = useState(() => {
    // If redirected back from password-reset email, go straight to reset form
    if (typeof window !== "undefined" && window.location.search.includes("reset=1")) return "reset";
    return "login";
  }); // "login" | "register" | "forgot" | "reset"
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [newPw, setNewPw] = useState("");
  const [newPwConfirm, setNewPwConfirm] = useState("");
  const [newPwError, setNewPwError] = useState("");
  const [newPwLoading, setNewPwLoading] = useState(false);
  const [newPwDone, setNewPwDone] = useState(false);
  // Change-password modal (for logged-in users)
  const [showChangePw, setShowChangePw] = useState(false);
  const [changePwCurrent, setChangePwCurrent] = useState("");
  const [changePwNew, setChangePwNew] = useState("");
  const [changePwConfirm, setChangePwConfirm] = useState("");
  const [changePwError, setChangePwError] = useState("");
  const [changePwLoading, setChangePwLoading] = useState(false);
  const [changePwDone, setChangePwDone] = useState(false);
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regCode, setRegCode] = useState("");
  const [regError, setRegError] = useState("");
  const [registering, setRegistering] = useState(false);
  const [regSuccess, setRegSuccess] = useState(false);
  const [filterSearch, setFilterSearch] = useState("");
  const [permDeleteTarget, setPermDeleteTarget] = useState(null); // for trash permanent delete confirm
  const [cachedInsightsStats, setCachedInsightsStats] = useState(null); // cache between tab visits
  const [selectedIds, setSelectedIds] = useState(new Set()); // bulk selection in review queue
  const [moreSheetOpen, setMoreSheetOpen] = useState(false); // mobile "More" bottom sheet
  const [showHelp, setShowHelp] = useState(false);
  const [entryTab, setEntryTab] = useState("work"); // "work" | "purchases"
  const [newPurchase, setNewPurchase] = useState(false);
  const [editPurchase, setEditPurchase] = useState(null);
  const [viewPurchase, setViewPurchase] = useState(null);
  const [newEntryType, setNewEntryType] = useState(null); // null | "work" | "purchase" — for FAB chooser
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterMember, setFilterMember] = useState("all");
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [sortField, setSortField] = useState("date");   // date | member | category | total | status | hours
  const [sortDir, setSortDir] = useState("desc");       // asc | desc
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectNote, setRejectNote] = useState("");
  const [needsInfoId, setNeedsInfoId] = useState(null);
  const [needsInfoNote, setNeedsInfoNote] = useState("");
  const [toast, setToast] = useState(null); // { message, type, detail }
  const [previewAsId, setPreviewAsId] = useState(null); // non-null = Treasurer previewing as a member

  // Sync auth errors from hook
  useEffect(() => { if (authError) setLoginError(authError); }, [authError]);

  // Scroll lock for drawer and help modal
  useEffect(() => {
    if (drawerOpen || showHelp) { document.body.style.overflow = "hidden"; }
    else { document.body.style.overflow = ""; }
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen, showHelp]);

  // ── PULL-TO-REFRESH state (must be before any early returns) ─────────────
  const [pullY, setPullY] = useState(0);
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const pullStartY = useRef(null);

  // When previewing, derive a fake currentUser from the chosen member — role overridden to Member
  const realIsTreasurer = currentUser?.role === ROLES.TREASURER;
  const previewUser = previewAsId ? users.find(u => u.id === previewAsId) : null;
  const viewAs = (realIsTreasurer && previewUser) ? { ...previewUser, role: ROLES.MEMBER } : currentUser;
  const isTreasurer = viewAs?.role === ROLES.TREASURER;
  const myEntries = useMemo(() =>
    entries.filter(e => isTreasurer || e.userId === viewAs?.id).sort((a, b) => b.date.localeCompare(a.date)),
  [entries, isTreasurer, viewAs?.id]);
  const pendingCount = entries.filter(e => e.status === STATUSES.SUBMITTED || e.status === STATUSES.AWAITING_SECOND || e.status === STATUSES.NEEDS_INFO).length
    + purchaseEntries.filter(e => e.status === "Submitted").length;

  // Helper: get rate for a user
  const getRate = (userId) => getUserRate(users, settings, userId);

  // Auth
  const handleLogin = async () => {
    setLoginError("");
    const email = loginEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setLoginError("Please enter a valid email"); return; }
    if (!loginPassword) { setLoginError("Please enter your password"); return; }
    setLoggingIn(true);
    const ok = await login(email, loginPassword);
    setLoggingIn(false);
    if (ok) setPage("dashboard");
  };
  const handleRegister = async () => {
    setRegError("");
    const name = regName.trim();
    const email = regEmail.trim().toLowerCase();
    if (!name) { setRegError("Please enter your full name"); return; }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setRegError("Please enter a valid email"); return; }
    if (!regPassword || regPassword.length < 6) { setRegError("Password must be at least 6 characters"); return; }
    if (!regCode.trim()) { setRegError("Please enter the invite code from your HOA Treasurer"); return; }
    setRegistering(true);
    const result = await register(name, email, regPassword, regCode.trim());
    setRegistering(false);
    if (result.error) { setRegError(result.error); return; }
    setRegSuccess(true);
  };
  const handleLogout = async () => { await sbLogout(); setLoginEmail(""); setLoginPassword(""); setLoginError(""); setPage("dashboard"); setViewEntry(null); setEditEntry(null); setNewEntry(false); };

  const handleForgotPassword = async () => {
    setForgotError("");
    const email = forgotEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setForgotError("Please enter a valid email address."); return; }
    setForgotLoading(true);
    const result = await resetPassword(email);
    setForgotLoading(false);
    if (result.error) { setForgotError(result.error); return; }
    setForgotSent(true);
  };

  const [resetNewPass, setResetNewPass] = useState("");
  const [resetConfPass, setResetConfPass] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError]   = useState("");
  const [resetDone, setResetDone]     = useState(false);

  const handleResetPassword = async () => {
    setResetError("");
    if (!resetNewPass || resetNewPass.length < 6) { setResetError("Password must be at least 6 characters."); return; }
    if (resetNewPass !== resetConfPass) { setResetError("Passwords do not match."); return; }
    setResetLoading(true);
    const result = await changePassword(resetNewPass);
    setResetLoading(false);
    if (result.error) { setResetError(result.error); return; }
    setResetDone(true);
    // Clean up URL
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  // Change Password modal (for logged-in users)
  const [showChangePass, setShowChangePass]     = useState(false);
  const [cpCurrent, setCpCurrent]               = useState("");
  const [cpNew, setCpNew]                       = useState("");
  const [cpConfirm, setCpConfirm]               = useState("");
  const [cpLoading, setCpLoading]               = useState(false);
  const [cpError, setCpError]                   = useState("");
  const [cpDone, setCpDone]                     = useState(false);

  const handleChangePassword = async () => {
    setCpError("");
    if (!cpNew || cpNew.length < 6) { setCpError("New password must be at least 6 characters."); return; }
    if (cpNew !== cpConfirm)         { setCpError("Passwords do not match."); return; }
    setCpLoading(true);
    // Re-authenticate first then update
    const reauth = await login(currentUser.email, cpCurrent);
    if (!reauth) { setCpLoading(false); setCpError("Current password is incorrect."); return; }
    const result = await changePassword(cpNew);
    setCpLoading(false);
    if (result.error) { setCpError(result.error); return; }
    setCpDone(true);
    setTimeout(() => { setShowChangePass(false); setCpCurrent(""); setCpNew(""); setCpConfirm(""); setCpError(""); setCpDone(false); }, 2000);
  };
  // Track when each page was last visited so we can skip the loading animation
  const lastVisitedRef = useRef({});
  const nav = (p) => {
    if (p === page && !viewEntry && !editEntry && !newEntry) return; // already there
    setViewEntry(null); setEditEntry(null); setNewEntry(false); setDrawerOpen(false);
    setViewPurchase(null); setEditPurchase(null); setNewPurchase(false); setNewEntryType(null);
    // Skip loading animation if visited in the last 5 minutes
    const now = Date.now();
    const lastVisit = lastVisitedRef.current[p] || 0;
    const skipAnimation = (now - lastVisit) < 5 * 60 * 1000;
    if (skipAnimation) { setPage(p); return; }
    lastVisitedRef.current[p] = now;
    setPageLoading(p);
    const delay = 800 + Math.floor(Math.random() * 800); // 800-1600ms
    setTimeout(() => { setPageLoading(null); setPage(p); }, delay);
  };

  // Entry operations (now async)
  const doSave = async (formData, existingId, silent) => {
    const id = existingId || (editEntry ? editEntry.id : null);
    if (id) {
      const result = await saveEntry(formData, id);
      if (result?.error) { if (!silent) showToast("Save failed", "error", result.error); return null; }
      if (!silent && result) { setViewEntry(result); setEditEntry(null); setNewEntry(false); }
      return result;
    } else {
      const result = await saveEntry(formData, null);
      if (result?.error) { if (!silent) showToast("Save failed", "error", result.error); return null; }
      if (!silent && result) { setNewEntry(false); setEditEntry(null); if (formData.status === STATUSES.SUBMITTED) setPage("entries"); else setViewEntry(result); }
      return result;
    }
  };
  const showToast = (message, type, detail) => { setToast({ message, type, detail }); setTimeout(() => setToast(null), 4000); };
  const doSubmit = async (formData, draftId) => {
    const id = draftId || (editEntry ? editEntry.id : null);
    const data = { ...formData, status: STATUSES.SUBMITTED };
    const result = await saveEntry(data, id);
    if (result?.error) { showToast("Submit failed", "error", result.error); return; }
    const total = calcLabor(calcHours(formData.startTime, formData.endTime), getRate(formData.userId || currentUser.id)) + calcMaterialsTotal(formData.materials);
    setEditEntry(null); setNewEntry(false); setPage("entries");
    showToast("Entry submitted!", "success", fmt(total) + " for " + formData.category + " — Treasurer will review shortly");
  };
  const doDelete = async () => { if (editEntry) { await deleteEntry(editEntry.id); setEditEntry(null); setPage("entries"); } };
  const doApprove = async (notes) => {
    if (!viewEntry) return;
    const h = calcHours(viewEntry.startTime, viewEntry.endTime);
    const r = getRate(viewEntry.userId);
    const total = calcLabor(h, r) + calcMaterialsTotal(viewEntry.materials);
    const needsDual = settings.dualApprovalThreshold > 0 && total >= settings.dualApprovalThreshold;
    if (needsDual) {
      const updated = await firstApprove(viewEntry.id, notes, "Dual approval required (" + fmt(total) + " ≥ " + fmt(settings.dualApprovalThreshold) + ")");
      if (updated) setViewEntry(updated);
    } else {
      const updated = await approveEntry(viewEntry.id, notes);
      if (updated) setViewEntry(updated);
    }
  };
  const doSecondApprove = async (id) => { const updated = await secondApprove(id); if (updated) setViewEntry(updated); };
  const doReject = async (notes) => { if (viewEntry) { const updated = await rejectEntry(viewEntry.id, notes); if (updated) setViewEntry(updated); } };
  const doMarkPaid = async (paymentDetails) => { if (viewEntry) { const updated = await markPaid(viewEntry.id, paymentDetails); if (updated) setViewEntry(updated); } };
  const doComment = async (entryId, message) => { const updated = await addComment(entryId, message); if (updated && viewEntry?.id === entryId) setViewEntry(updated); return updated; };

  // ── PURCHASE ENTRY OPERATIONS ─────────────────────────────────────────────
  const doPurchaseSave = async (formData, existingId) => {
    const result = await savePurchaseEntry(formData, existingId);
    if (result?.error) { showToast("Save failed", "error", result.error); return null; }
    if (result) { setViewPurchase(result); setEditPurchase(null); setNewPurchase(false); }
    return result;
  };
  const doPurchaseSubmit = async (formData, existingId) => {
    const data = { ...formData, status: "Submitted" };
    const result = await savePurchaseEntry(data, existingId);
    if (result?.error) { showToast("Submit failed", "error", result.error); return; }
    setEditPurchase(null); setNewPurchase(false); setPage("entries"); setEntryTab("purchases");
    showToast("Purchase submitted!", "success", fmt(formData.total) + " at " + formData.storeName + " — Treasurer will review shortly");
  };
  const doPurchaseDelete = async () => { if (editPurchase) { await deletePurchaseEntry(editPurchase.id); setEditPurchase(null); setPage("entries"); showToast("Purchase draft deleted", "success"); } };
  const doPurchaseApprove = async (idOrNotes, notesArg) => {
    // Called as (notes) from detail view, or (id, notes) from review queue
    // Detect: if second arg exists, first is ID. Otherwise check if first looks like a UUID.
    const isIdCall = notesArg !== undefined || (typeof idOrNotes === "string" && idOrNotes.length > 20 && idOrNotes.includes("-"));
    const id = isIdCall ? idOrNotes : viewPurchase?.id;
    const notes = isIdCall ? (notesArg || "") : (idOrNotes || "");
    if (!id) return;
    const updated = await approvePurchaseEntry(id, notes);
    if (updated) {
      if (viewPurchase?.id === id) setViewPurchase(updated);
      showToast("Purchase approved", "success", fmt(updated.total) + " at " + updated.storeName);
    }
  };
  const doPurchaseReject = async (idOrNotes, notesArg) => {
    const isIdCall = notesArg !== undefined || (typeof idOrNotes === "string" && idOrNotes.length > 20 && idOrNotes.includes("-"));
    const id = isIdCall ? idOrNotes : viewPurchase?.id;
    const notes = isIdCall ? (notesArg || "") : (idOrNotes || "");
    if (!id) return;
    const updated = await rejectPurchaseEntry(id, notes);
    if (updated) {
      if (viewPurchase?.id === id) setViewPurchase(updated);
      showToast("Purchase returned for edits", "error");
    }
  };
  const doPurchaseMarkPaid = async (idOrDetails, detailsArg) => {
    const isIdCall = detailsArg !== undefined || (typeof idOrDetails === "string" && idOrDetails.length > 20 && idOrDetails.includes("-"));
    const id = isIdCall ? idOrDetails : viewPurchase?.id;
    const details = isIdCall ? (detailsArg || {}) : (idOrDetails || {});
    if (!id) return;
    const updated = await markPurchasePaid(id, details);
    if (updated) {
      if (viewPurchase?.id === id) setViewPurchase(updated);
      showToast("Purchase marked as paid", "success");
    }
  };
  const doDecline = async (notes) => {
    if (!viewEntry) return;
    const u = users.find(x => x.id === viewEntry.userId);
    const updated = await rejectEntry(viewEntry.id, notes);
    if (updated) { setViewEntry(updated); showToast("Entry declined", "error", (u?.name || "Member") + " will be notified"); }
  };
  const doTrash = async (entry, comment, action) => {
    const u = users.find(x => x.id === entry.userId);
    const updated = await trashEntry(entry.id, comment, action || "Moved to Trash");
    if (updated) { setViewEntry(null); showToast("Moved to Trash", "success", (u?.name || "Member") + " — " + entry.category); }
  };
  const doRestore = async (entry) => {
    // Restore to Draft (safe default regardless of previous status)
    const updated = await restoreEntry(entry.id, STATUSES.DRAFT);
    if (updated) { setViewEntry(updated); showToast("Entry restored to Draft", "success"); }
  };
  const doTrashFromList = async (entry, comment) => {
    const u = users.find(x => x.id === entry.userId);
    const updated = await trashEntry(entry.id, comment, "Moved to Trash");
    if (updated) showToast("Moved to Trash", "success", (u?.name || "Member") + " — " + entry.category);
  };
  // Quick approve/reject from review queue (without opening detail)
  const doApproveEntry = async (id, notes) => { await approveEntry(id, notes); const e = entries.find(x => x.id === id); const u = users.find(x => x.id === e?.userId); showToast("Entry approved", "success", u?.name + " — " + (e?.category || "")); };
  const doRejectEntry = async (id, notes) => { await rejectEntry(id, notes); const e = entries.find(x => x.id === id); const u = users.find(x => x.id === e?.userId); showToast("Entry returned for edits", "error", u?.name + " will be notified"); };
  const doNeedsInfo = async (id, notes) => { await needsInfoEntry(id, notes); const e = entries.find(x => x.id === id); const u = users.find(x => x.id === e?.userId); showToast("Needs Info requested", "info", u?.name + " will be notified to add details"); };
  const doBulkApprove = async (ids) => {
    const results = await bulkApprove(ids);
    showToast(results.length + " " + (results.length === 1 ? "entry" : "entries") + " approved", "success", "");
    return results;
  };

  // Dashboard stats — memoized so it only recalculates when entries/users/settings change
  const dashStats = useMemo(() => {
    if (!currentUser) return { total: 0, approved: 0, pending: 0, monthReimb: 0, paid: 0, ytdReimb: 0, monthHours: 0, pendingPayout: 0, purchaseCount: 0, purchaseTotal: 0 };
    const relevant = isTreasurer ? entries : entries.filter(e => e.userId === currentUser.id);
    const approved = relevant.filter(e => e.status === STATUSES.APPROVED || e.status === STATUSES.PAID);
    const thisMonth = approved.filter(e => e.date.startsWith(new Date().toISOString().slice(0, 7)));
    const thisYear = approved.filter(e => e.date.startsWith(String(new Date().getFullYear())));
    let monthReimb = 0, ytdReimb = 0, monthHours = 0, pendingPayout = 0;
    thisMonth.forEach(e => { const h = calcHours(e.startTime, e.endTime); const r = getRate(e.userId); monthReimb += calcLabor(h, r) + calcMaterialsTotal(e.materials); monthHours += h; });
    thisYear.forEach(e => { const h = calcHours(e.startTime, e.endTime); const r = getRate(e.userId); ytdReimb += calcLabor(h, r) + calcMaterialsTotal(e.materials); });
    relevant.filter(e => e.status === STATUSES.APPROVED).forEach(e => { const h = calcHours(e.startTime, e.endTime); const r = getRate(e.userId); pendingPayout += calcLabor(h, r) + calcMaterialsTotal(e.materials); });
    // Purchase totals
    const relevantPurchases = isTreasurer ? purchaseEntries : purchaseEntries.filter(e => e.userId === currentUser.id);
    const approvedPurchases = relevantPurchases.filter(e => e.status === "Approved" || e.status === "Paid");
    const monthPurchases = approvedPurchases.filter(e => e.date.startsWith(new Date().toISOString().slice(0, 7)));
    const yearPurchases = approvedPurchases.filter(e => e.date.startsWith(String(new Date().getFullYear())));
    monthPurchases.forEach(e => { monthReimb += e.total; });
    yearPurchases.forEach(e => { ytdReimb += e.total; });
    relevantPurchases.filter(e => e.status === "Approved").forEach(e => { pendingPayout += e.total; });
    return { total: relevant.length + relevantPurchases.length, approved: approved.length + approvedPurchases.length, pending: relevant.filter(e => e.status === STATUSES.SUBMITTED).length + relevantPurchases.filter(e => e.status === "Submitted").length, monthReimb, paid: relevant.filter(e => e.status === STATUSES.PAID).length + relevantPurchases.filter(e => e.status === "Paid").length, ytdReimb, monthHours, pendingPayout, purchaseCount: relevantPurchases.length, purchaseTotal: approvedPurchases.reduce((s, e) => s + e.total, 0) };
  }, [entries, purchaseEntries, users, settings, currentUser?.id, isTreasurer]);

  // ══════════════════════════════════════════════════════════════════════════
  // LOGIN SCREEN
  // ══════════════════════════════════════════════════════════════════════════
  if (!currentUser) {
    if (loading) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: BRAND.bgSoft, fontFamily: BRAND.sans }}><div style={{ textAlign: "center" }}><img src="/logo.png" alt="24 Mill Street" style={{ width: 120, height: 120, objectFit: "contain", margin: "0 auto 16px", display: "block", opacity: 0.5 }} /><div style={{ fontSize: 14, color: BRAND.textMuted }}>Loading...</div></div></div>;
    return (
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "safe center", justifyContent: "center", background: BRAND.bgSoft, fontFamily: BRAND.sans, padding: mob ? "24px 16px" : 0, overflow: "auto", WebkitOverflowScrolling: "touch" }}>
        <div className="fade-in" style={{ textAlign: "center", maxWidth: 420, width: "100%" }}>
          <img src="/logo.png" alt="24 Mill" style={{ width: mob ? 160 : 200, height: mob ? 160 : 200, objectFit: "contain", margin: "0 auto 24px", display: "block" }} />
          <h1 style={{ fontFamily: BRAND.serif, fontSize: mob ? 28 : 34, fontWeight: 600, color: BRAND.navy, margin: "0 0 32px" }}>Log Your Work</h1>
          <div style={{ background: BRAND.white, border: "1px solid " + BRAND.borderLight, borderRadius: 12, padding: mob ? 24 : 32, textAlign: "left", boxShadow: "0 4px 20px rgba(31,42,56,0.06)" }}>
            {/* Tab toggle */}
            <div style={{ display: "flex", marginBottom: 24, borderRadius: 8, background: BRAND.bgSoft, padding: 4 }}>
              <button style={{ flex: 1, padding: "10px 0", borderRadius: 6, border: "none", fontFamily: BRAND.sans, fontSize: 14, fontWeight: 600, cursor: "pointer", background: authMode === "login" ? BRAND.white : "transparent", color: authMode === "login" ? BRAND.navy : BRAND.textMuted, boxShadow: authMode === "login" ? "0 1px 3px rgba(0,0,0,0.08)" : "none", transition: "all 150ms" }} onClick={() => { setAuthMode("login"); setRegError(""); setRegSuccess(false); }}>Sign In</button>
              <button style={{ flex: 1, padding: "10px 0", borderRadius: 6, border: "none", fontFamily: BRAND.sans, fontSize: 14, fontWeight: 600, cursor: "pointer", background: authMode === "register" ? BRAND.white : "transparent", color: authMode === "register" ? BRAND.navy : BRAND.textMuted, boxShadow: authMode === "register" ? "0 1px 3px rgba(0,0,0,0.08)" : "none", transition: "all 150ms" }} onClick={() => { setAuthMode("register"); setLoginError(""); }}>Register</button>
            </div>
            {authMode === "forgot" ? (
              <div>
                <button style={{ ...S.btnGhost, fontSize: 13, marginBottom: 20, padding: "4px 0" }} onClick={() => { setAuthMode("login"); setForgotError(""); setForgotSent(false); }}>← Back to Sign In</button>
                {forgotSent ? (
                  <div style={{ textAlign: "center", padding: "20px 0" }}>
                    <div style={{ fontSize: 44, marginBottom: 12 }}>📬</div>
                    <div style={{ fontSize: 17, fontWeight: 600, color: BRAND.navy, marginBottom: 8, fontFamily: BRAND.serif }}>Check your inbox</div>
                    <div style={{ fontSize: 14, color: BRAND.textMuted, lineHeight: 1.7, marginBottom: 24 }}>We sent a reset link to <strong>{forgotEmail}</strong>. Click it to set a new password. Check spam if it doesn't arrive within a minute.</div>
                    <button style={{ ...S.btnGhost, fontSize: 13 }} onClick={() => { setForgotSent(false); setForgotEmail(""); }}>Try a different email</button>
                  </div>
                ) : (
                  <form onSubmit={e => { e.preventDefault(); handleForgotPassword(); }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: BRAND.navy, marginBottom: 6, fontFamily: BRAND.serif }}>Reset your password</div>
                    <div style={{ fontSize: 13, color: BRAND.textMuted, marginBottom: 20 }}>Enter your email and we'll send you a reset link.</div>
                    <label style={S.label} htmlFor="forgot-email">Email Address</label>
                    <input id="forgot-email" type="email" autoComplete="email" style={{ ...S.input, marginBottom: forgotError ? 8 : 20, fontSize: 15, padding: "12px 16px" }} value={forgotEmail} onChange={e => { setForgotEmail(e.target.value); setForgotError(""); }} placeholder="you@example.com" autoFocus />
                    {forgotError && <div style={{ color: BRAND.error, fontSize: 13, marginBottom: 12, display: "flex", alignItems: "flex-start", gap: 6 }}><Icon name="alert" size={14} /><span>{forgotError}</span></div>}
                    <button type="submit" style={{ ...S.btnPrimary, width: "100%", justifyContent: "center", padding: "12px 20px", fontSize: 15, borderRadius: 8, opacity: forgotLoading ? 0.6 : 1 }} disabled={forgotLoading}>{forgotLoading ? "Sending..." : "Send Reset Link"}</button>
                  </form>
                )}
              </div>
            ) : authMode === "reset" ? (
              <div>
                {resetDone ? (
                  <div style={{ textAlign: "center", padding: "20px 0" }}>
                    <div style={{ width: 48, height: 48, borderRadius: 24, background: BRAND.success + "15", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: BRAND.success }}><Icon name="check" size={24} /></div>
                    <div style={{ fontSize: 17, fontWeight: 600, color: BRAND.navy, marginBottom: 8, fontFamily: BRAND.serif }}>Password updated!</div>
                    <div style={{ fontSize: 14, color: BRAND.textMuted, marginBottom: 24 }}>You can now sign in with your new password.</div>
                    <button style={{ ...S.btnPrimary, width: "100%", justifyContent: "center", padding: "12px 20px", fontSize: 15, borderRadius: 8 }} onClick={() => setAuthMode("login")}>Go to Sign In</button>
                  </div>
                ) : (
                  <form onSubmit={e => { e.preventDefault(); handleResetPassword(); }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: BRAND.navy, marginBottom: 6, fontFamily: BRAND.serif }}>Choose a new password</div>
                    <div style={{ fontSize: 13, color: BRAND.textMuted, marginBottom: 20 }}>Pick something strong that you haven't used before.</div>
                    <label style={S.label} htmlFor="reset-new">New Password</label>
                    <input id="reset-new" type="password" autoComplete="new-password" style={{ ...S.input, marginBottom: 16, fontSize: 15, padding: "12px 16px" }} value={resetNewPass} onChange={e => { setResetNewPass(e.target.value); setResetError(""); }} placeholder="Min 6 characters" autoFocus />
                    <label style={S.label} htmlFor="reset-confirm">Confirm New Password</label>
                    <input id="reset-confirm" type="password" autoComplete="new-password" style={{ ...S.input, marginBottom: resetError ? 8 : 20, fontSize: 15, padding: "12px 16px", borderColor: resetError ? BRAND.error : BRAND.border }} value={resetConfPass} onChange={e => { setResetConfPass(e.target.value); setResetError(""); }} placeholder="Repeat new password" />
                    {resetError && <div style={{ color: BRAND.error, fontSize: 13, marginBottom: 12, display: "flex", alignItems: "flex-start", gap: 6 }}><Icon name="alert" size={14} /><span>{resetError}</span></div>}
                    <button type="submit" style={{ ...S.btnPrimary, width: "100%", justifyContent: "center", padding: "12px 20px", fontSize: 15, borderRadius: 8, opacity: resetLoading ? 0.6 : 1 }} disabled={resetLoading}>{resetLoading ? "Updating..." : "Update Password"}</button>
                  </form>
                )}
              </div>
            ) : authMode === "login" ? (
              <form onSubmit={e => { e.preventDefault(); handleLogin(); }} autoComplete="on">
                <label style={S.label} htmlFor="login-email">Email Address</label>
                <input id="login-email" name="email" type="email" autoComplete="username" style={{ ...S.input, marginBottom: 16, fontSize: 15, padding: "12px 16px" }} value={loginEmail} onChange={e => { setLoginEmail(e.target.value); setLoginError(""); }} placeholder="you@example.com" autoFocus />
                <label style={S.label} htmlFor="login-password">Password</label>
                <input id="login-password" name="password" type="password" autoComplete="current-password" style={{ ...S.input, marginBottom: loginError ? 8 : 12, fontSize: 15, padding: "12px 16px", borderColor: loginError ? BRAND.error : BRAND.border }} value={loginPassword} onChange={e => { setLoginPassword(e.target.value); setLoginError(""); }} placeholder="Enter your password" />
                {loginError && <div style={{ color: BRAND.error, fontSize: 13, marginBottom: 8, display: "flex", alignItems: "flex-start", gap: 6 }}><Icon name="alert" size={14} /><span>{loginError}</span></div>}
                <div style={{ textAlign: "right", marginBottom: 20 }}>
                  <button type="button" style={{ background: "none", border: "none", color: BRAND.navy, fontSize: 13, cursor: "pointer", fontFamily: BRAND.sans, textDecoration: "underline", padding: 0 }} onClick={() => { setAuthMode("forgot"); setForgotEmail(loginEmail); setForgotError(""); setForgotSent(false); }}>Forgot password?</button>
                </div>
                <button type="submit" style={{ ...S.btnPrimary, width: "100%", justifyContent: "center", padding: "12px 20px", fontSize: 15, borderRadius: 8, opacity: loggingIn ? 0.6 : 1 }} disabled={loggingIn}>{loggingIn ? "Signing in..." : "Sign In"}</button>
              </form>
            ) : regSuccess ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ width: 48, height: 48, borderRadius: 24, background: BRAND.success + "15", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: BRAND.success }}><Icon name="check" size={24} /></div>
                <div style={{ fontSize: 18, fontWeight: 600, color: BRAND.navy, marginBottom: 8, fontFamily: BRAND.serif }}>Account Created!</div>
                <div style={{ fontSize: 14, color: BRAND.textMuted, marginBottom: 24, lineHeight: 1.6 }}>You can now sign in with your email and password.</div>
                <button style={{ ...S.btnPrimary, width: "100%", justifyContent: "center", padding: "12px 20px", fontSize: 15, borderRadius: 8 }} onClick={() => { setAuthMode("login"); setLoginEmail(regEmail); setRegSuccess(false); }}>Go to Sign In</button>
              </div>
            ) : (
              <form onSubmit={e => { e.preventDefault(); handleRegister(); }} autoComplete="on">
                <label style={S.label} htmlFor="reg-name">Full Name</label>
                <input id="reg-name" name="name" type="text" autoComplete="name" style={{ ...S.input, marginBottom: 16, fontSize: 15, padding: "12px 16px" }} value={regName} onChange={e => { setRegName(e.target.value); setRegError(""); }} placeholder="Your full name" autoFocus />
                <label style={S.label} htmlFor="reg-email">Email Address</label>
                <input id="reg-email" name="email" type="email" autoComplete="username" style={{ ...S.input, marginBottom: 16, fontSize: 15, padding: "12px 16px" }} value={regEmail} onChange={e => { setRegEmail(e.target.value); setRegError(""); }} placeholder="you@example.com" />
                <label style={S.label} htmlFor="reg-password">Password</label>
                <input id="reg-password" name="password" type="password" autoComplete="new-password" style={{ ...S.input, marginBottom: 16, fontSize: 15, padding: "12px 16px" }} value={regPassword} onChange={e => { setRegPassword(e.target.value); setRegError(""); }} placeholder="Min 6 characters" />
                <label style={S.label} htmlFor="reg-code">Invite Code</label>
                <input id="reg-code" name="invite-code" type="text" autoComplete="off" style={{ ...S.input, marginBottom: regError ? 8 : 20, fontSize: 15, padding: "12px 16px", borderColor: regError ? BRAND.error : BRAND.border, textTransform: "uppercase", letterSpacing: "0.1em" }} value={regCode} onChange={e => { setRegCode(e.target.value); setRegError(""); }} placeholder="From your HOA Treasurer" />
                {regError && <div style={{ color: BRAND.error, fontSize: 13, marginBottom: 16, display: "flex", alignItems: "flex-start", gap: 6 }}><Icon name="alert" size={14} /><span>{regError}</span></div>}
                <button type="submit" style={{ ...S.btnPrimary, width: "100%", justifyContent: "center", padding: "12px 20px", fontSize: 15, borderRadius: 8, opacity: registering ? 0.6 : 1 }} disabled={registering}>{registering ? "Creating account..." : "Create Account"}</button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // NAVIGATION
  // ══════════════════════════════════════════════════════════════════════════
  const trashCount = entries.filter(e => e.status === STATUSES.TRASH).length;
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: "home" },
    { id: "entries", label: isTreasurer ? "All Entries" : "My Entries", icon: "file" },
    ...(!isTreasurer ? [{ id: "insights", label: "Community Insights", icon: "insights" }] : []),
    ...(!isTreasurer ? [{ id: "help", label: "Help", icon: "help" }] : []),
    ...(isTreasurer ? [{ id: "review", label: "Review Queue", icon: "inbox", badge: pendingCount }] : []),
    ...(isTreasurer ? [{ id: "payment", label: "Payment Run", icon: "dollar" }] : []),
    ...(isTreasurer ? [{ id: "reports", label: "Reports", icon: "chart" }] : []),
    ...(isTreasurer ? [{ id: "insights", label: "Community Insights", icon: "insights" }] : []),
    ...(isTreasurer ? [{ id: "trash", label: "Trash", icon: "trash", badge: trashCount || 0 }] : []),
    ...(isTreasurer ? [{ id: "settings", label: "Settings", icon: "settings" }] : []),
    ...(isTreasurer ? [{ id: "help", label: "Help", icon: "help" }] : []),
  ];
  const bottomTabs = isTreasurer ? [
    { id: "dashboard", label: "Home", icon: "home", iconFilled: "homeFilled", color: "#2E7D32", tint: "#2E7D3218" },
    { id: "entries", label: "Entries", icon: "clipboard", iconFilled: "clipboardFilled", color: "#1565C0", tint: "#1565C018" },
    { id: "review", label: "Review", icon: "shieldCheck", iconFilled: "shieldCheckFilled", color: BRAND.brick, tint: BRAND.brick + "18", badge: pendingCount },
    { id: "__more__", label: "More", icon: "settings", iconFilled: "settings", color: BRAND.navy, tint: BRAND.navy + "18", badge: trashCount || 0 },
  ] : [
    { id: "dashboard", label: "Home", icon: "home", iconFilled: "homeFilled", color: "#2E7D32", tint: "#2E7D3218" },
    { id: "entries", label: "Entries", icon: "clipboard", iconFilled: "clipboardFilled", color: "#1565C0", tint: "#1565C018" },
    { id: "insights", label: "Insights", icon: "insights", iconFilled: "insightsFilled", color: "#6A1B9A", tint: "#6A1B9A18" },
    { id: "help", label: "Help", icon: "help", iconFilled: "help", color: "#B8860B", tint: "#B8860B18" },
  ];

  // ══════════════════════════════════════════════════════════════════════════
  // PAGE CONTENT
  // ══════════════════════════════════════════════════════════════════════════
  const renderPage = () => {
    if (pageLoading) return <PageLoader page={pageLoading} />;
    if (newEntry || editEntry) {
      // Smart defaults: pre-fill from member's most recent entry
      const lastEntry = (() => {
        const userEntries = entries.filter(e => e.userId === currentUser.id).sort((a, b) => b.date.localeCompare(a.date));
        return userEntries.length > 0 ? userEntries[0] : null;
      })();
      const preFilled = !editEntry && lastEntry;
      const smartEntry = editEntry || (lastEntry ? { category: lastEntry.category, location: lastEntry.location || "", userId: currentUser.id } : null);
      return (
      <div className="fade-in">
        <h2 style={{ ...S.h2, marginBottom: preFilled ? 8 : 24 }}>{editEntry ? "Edit Entry" : "New Work Entry"}</h2>
        {preFilled && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, padding: "8px 14px", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, fontSize: 13, color: "#1d4ed8" }}>
            <span>✨</span>
            <span>Pre-filled from your last entry <strong>({lastEntry.category}{lastEntry.location ? " · " + lastEntry.location : ""})</strong>. Update any fields that differ.</span>
          </div>
        )}
        <div style={S.card}><EntryForm entry={smartEntry} settings={settings} users={users} currentUser={currentUser} onSave={doSave} onSubmit={previewAsId ? () => {} : doSubmit} onCancel={() => { setNewEntry(false); setEditEntry(null); }} onDelete={previewAsId ? () => {} : doDelete} disableAutoSave={!!previewAsId} mob={mob} /></div></div>
    );}
    // Purchase entry form
    if (newPurchase || editPurchase) {
      return (
        <div className="fade-in">
          <h2 style={{ ...S.h2, marginBottom: 24 }}>{editPurchase ? "Edit Purchase" : "New Purchase Entry"}</h2>
          <div style={S.card}><PurchaseEntryForm entry={editPurchase} settings={settings} currentUser={currentUser} onSave={doPurchaseSave} onSubmit={doPurchaseSubmit} onCancel={() => { setNewPurchase(false); setEditPurchase(null); }} onDelete={doPurchaseDelete} mob={mob} /></div>
        </div>
      );
    }
    // Purchase detail view
    if (viewPurchase) {
      const fresh = purchaseEntries.find(e => e.id === viewPurchase.id) || viewPurchase;
      return <PurchaseEntryDetail entry={fresh} settings={settings} users={users} currentUser={viewAs} onBack={() => setViewPurchase(null)} onEdit={() => { setEditPurchase(fresh); setViewPurchase(null); }} onApprove={doPurchaseApprove} onReject={doPurchaseReject} onMarkPaid={doPurchaseMarkPaid} mob={mob} />;
    }
    if (viewEntry) {
      const fresh = entries.find(e => e.id === viewEntry.id) || viewEntry;
      return <EntryDetail entry={fresh} settings={settings} users={users} currentUser={viewAs} onBack={() => setViewEntry(null)} onEdit={() => { setEditEntry(fresh); setViewEntry(null); }} onApprove={doApprove} onReject={doDecline} onTrash={doTrash} onRestore={doRestore} onMarkPaid={doMarkPaid} onComment={doComment} onSecondApprove={doSecondApprove} onDelete={async (e) => { await deleteEntry(e.id); setViewEntry(null); showToast("Entry deleted", "success"); }} onDuplicate={(e) => { setViewEntry(null); setEditEntry(null); setNewEntry(true); setTimeout(() => setEditEntry({ ...e, id: null, status: STATUSES.DRAFT, date: todayStr(), startTime: nowTime(), endTime: "", preImages: [], postImages: [], reviewerNotes: "", reviewedAt: "", paidAt: "" }), 50); }} mob={mob} />;
    }
    if (page === "dashboard") {
      const recent = myEntries.slice(0, 5);
      return (
        <div className="fade-in">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <h2 style={S.h2}>Dashboard</h2>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button onClick={() => setShowHelp(true)} aria-label="Help — User Guide" style={{ background: "none", border: "1px solid " + BRAND.borderLight, color: BRAND.textMuted, padding: "6px 12px", cursor: "pointer", borderRadius: 8, fontSize: 12, fontWeight: 600, fontFamily: BRAND.sans, display: "flex", alignItems: "center", gap: 5, transition: "all 150ms" }} onMouseEnter={e => { e.currentTarget.style.background = BRAND.bgSoft; e.currentTarget.style.color = BRAND.navy; }} onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = BRAND.textMuted; }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>?</span> Help
              </button>
              {!mob && (
                <div style={{ display: "flex", gap: 8, position: "relative" }}>
                  <button style={S.btnPrimary} onClick={() => setNewEntryType(t => t ? null : "chooser")}><Icon name="plus" size={16} /> New Entry</button>
                  {newEntryType === "chooser" && (<>
                    <div style={{ position: "fixed", inset: 0, zIndex: 29 }} onClick={() => setNewEntryType(null)} />
                    <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 6, background: BRAND.white, border: "1px solid " + BRAND.borderLight, borderRadius: 10, boxShadow: "0 8px 32px rgba(0,0,0,0.12)", zIndex: 30, minWidth: 220, overflow: "hidden" }}>
                      <button style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", width: "100%", border: "none", background: "none", cursor: "pointer", fontFamily: BRAND.sans, fontSize: 14, color: BRAND.charcoal, textAlign: "left" }}
                        onMouseEnter={ev => ev.currentTarget.style.background = BRAND.bgSoft} onMouseLeave={ev => ev.currentTarget.style.background = "none"}
                        onClick={() => { setNewEntryType(null); setNewEntry(true); }}>
                        <span style={{ fontSize: 20 }}>🔨</span><div><div style={{ fontWeight: 600 }}>Work Entry</div><div style={{ fontSize: 12, color: BRAND.textLight }}>Log labor hours & tasks</div></div>
                      </button>
                      <div style={{ borderTop: "1px solid " + BRAND.borderLight }} />
                      <button style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", width: "100%", border: "none", background: "none", cursor: "pointer", fontFamily: BRAND.sans, fontSize: 14, color: BRAND.charcoal, textAlign: "left" }}
                        onMouseEnter={ev => ev.currentTarget.style.background = BRAND.bgSoft} onMouseLeave={ev => ev.currentTarget.style.background = "none"}
                        onClick={() => { setNewEntryType(null); setNewPurchase(true); }}>
                        <span style={{ fontSize: 20 }}>🛍️</span><div><div style={{ fontWeight: 600 }}>Purchase Entry</div><div style={{ fontSize: 12, color: BRAND.textLight }}>Log expenses & receipts</div></div>
                      </button>
                    </div>
                  </>)}
                </div>
              )}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr 1fr" : "repeat(4, 1fr)", gap: mob ? 8 : 16, marginBottom: mob ? 16 : 28 }}>
            {isTreasurer ? (<>
              <StatCard label="Total Entries" value={dashStats.total} icon="file" />
              <StatCard label="Pending Review" value={dashStats.pending} icon="clock" accentColor={BRAND.warning} />
              <StatCard label="Approved" value={dashStats.approved} icon="check" accentColor={BRAND.success} />
              <StatCard label="This Month" value={fmt(dashStats.monthReimb)} icon="dollar" accentColor={BRAND.brick} />
            </>) : (<>
              <StatCard label="Owed to You" value={fmt(dashStats.pendingPayout)} icon="dollar" accentColor={BRAND.success} />
              <StatCard label="Awaiting Review" value={dashStats.pending || 0} icon="clock" accentColor={BRAND.warning} />
              <StatCard label="This Month" value={fmt(dashStats.monthReimb)} icon="chart" accentColor={BRAND.brick} />
              <StatCard label="Year to Date" value={fmt(dashStats.ytdReimb)} icon="check" accentColor="#2563eb" />
            </>)}
          </div>
          {isTreasurer && pendingCount > 0 && (
            <div style={{ ...S.card, background: "#FFF8F0", borderColor: "#F0D4A8", borderLeft: "4px solid " + BRAND.warning, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}><Icon name="alert" size={20} /><span style={{ fontWeight: 600 }}>{pendingCount === 1 ? "1 entry" : pendingCount + " entries"} awaiting your review</span></div>
              <button style={S.btnPrimary} onClick={() => setPage("review")}>Review Now</button>
            </div>
          )}
          {/* Annual Budget Progress Bar */}
          {isTreasurer && settings.annualBudget > 0 && (() => {
            const yr = String(new Date().getFullYear());
            let ytdSpent = 0;
            entries.filter(e => (e.status === STATUSES.APPROVED || e.status === STATUSES.PAID) && e.date.startsWith(yr)).forEach(e => { const h = calcHours(e.startTime, e.endTime); const r = getRate(e.userId); ytdSpent += calcLabor(h, r) + calcMaterialsTotal(e.materials); });
            const pct = Math.min((ytdSpent / settings.annualBudget) * 100, 100);
            const isWarning = pct >= 80;
            const isDanger = pct >= 100;
            const barColor = isDanger ? BRAND.error : isWarning ? BRAND.warning : "#2E7D32";
            return (
              <div style={{ ...S.card, padding: "18px 24px", marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 18 }}>💰</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: BRAND.navy }}>{yr} Reimbursement Budget</span>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: barColor }}>{pct.toFixed(0)}% used</span>
                </div>
                <div style={{ height: 12, background: BRAND.bgSoft, borderRadius: 6, overflow: "hidden", marginBottom: 8 }}>
                  <div style={{ height: "100%", borderRadius: 6, width: pct + "%", background: barColor, transition: "width 600ms ease-out" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: BRAND.textMuted }}>{fmt(ytdSpent)} spent</span>
                  <span style={{ color: BRAND.textLight }}>{fmt(settings.annualBudget - ytdSpent)} remaining of {fmt(settings.annualBudget)}</span>
                </div>
                {isWarning && !isDanger && <div style={{ marginTop: 8, fontSize: 12, fontWeight: 600, color: BRAND.warning }}>⚠️ Budget is at {pct.toFixed(0)}% — approaching the annual limit.</div>}
                {isDanger && <div style={{ marginTop: 8, fontSize: 12, fontWeight: 600, color: BRAND.error }}>🚨 Budget exceeded! Approved reimbursements surpass the annual budget.</div>}
              </div>
            );
          })()}
          {/* Annual Budget Progress Bar */}
          {isTreasurer && settings.annualBudget > 0 && (() => {
            const yr = String(new Date().getFullYear());
            let ytdSpent = 0;
            entries.filter(e => (e.status === STATUSES.APPROVED || e.status === STATUSES.PAID) && e.date.startsWith(yr)).forEach(e => { const h = calcHours(e.startTime, e.endTime); const r = getRate(e.userId); ytdSpent += calcLabor(h, r) + calcMaterialsTotal(e.materials); });
            const pct = Math.min((ytdSpent / settings.annualBudget) * 100, 100);
            const isWarning = pct >= 80;
            const isDanger = pct >= 100;
            const barColor = isDanger ? BRAND.error : isWarning ? BRAND.warning : "#2E7D32";
            return (
              <div style={{ ...S.card, padding: "18px 24px", marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 18 }}>💰</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: BRAND.navy }}>{yr} Reimbursement Budget</span>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: barColor }}>{pct.toFixed(0)}% used</span>
                </div>
                <div style={{ height: 12, background: BRAND.bgSoft, borderRadius: 6, overflow: "hidden", marginBottom: 8 }}>
                  <div style={{ height: "100%", borderRadius: 6, width: pct + "%", background: barColor, transition: "width 600ms ease-out" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: BRAND.textMuted }}>{fmt(ytdSpent)} spent</span>
                  <span style={{ color: BRAND.textLight }}>{fmt(settings.annualBudget - ytdSpent)} remaining of {fmt(settings.annualBudget)}</span>
                </div>
                {isWarning && !isDanger && <div style={{ marginTop: 8, fontSize: 12, fontWeight: 600, color: BRAND.warning }}>⚠️ Budget is at {pct.toFixed(0)}% — approaching the annual limit.</div>}
                {isDanger && <div style={{ marginTop: 8, fontSize: 12, fontWeight: 600, color: BRAND.error }}>🚨 Budget exceeded! Approved reimbursements surpass the annual budget.</div>}
              </div>
            );
          })()}

          {/* ── TREASURER COMMAND CENTER ── */}
          {isTreasurer && (() => {
            const yr = String(new Date().getFullYear());
            const mo = String(new Date().getMonth() + 1).padStart(2, "0");
            const thisMonthStr = yr + "-" + mo;
            const lastMonthStr = (() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); })();

            // Unpaid approved entries grouped by user
            const unpaidApproved = entries.filter(e => e.status === STATUSES.APPROVED);
            const unpaidTotal = unpaidApproved.reduce((s, e) => { const h = calcHours(e.startTime, e.endTime); const r = getRate(e.userId); return s + calcLabor(h, r) + calcMaterialsTotal(e.materials); }, 0);
            const needsInfoCount = entries.filter(e => e.status === STATUSES.NEEDS_INFO).length;

            // Oldest pending entry age
            const submitted = entries.filter(e => e.status === STATUSES.SUBMITTED && e.submittedAt);
            const oldestDays = submitted.length ? Math.floor((Date.now() - new Date(submitted.sort((a,b) => a.submittedAt.localeCompare(b.submittedAt))[0].submittedAt).getTime()) / 86400000) : 0;

            // Member activity this month vs last month
            const memberActivity = users.filter(u => u.role === ROLES.MEMBER).map(u => {
              const thisM = entries.filter(e => e.userId === u.id && e.date?.startsWith(thisMonthStr) && e.status !== STATUSES.TRASH).length;
              const lastM = entries.filter(e => e.userId === u.id && e.date?.startsWith(lastMonthStr) && e.status !== STATUSES.TRASH).length;
              return { ...u, thisMonth: thisM, lastMonth: lastM };
            }).sort((a, b) => b.thisMonth - a.thisMonth);

            return (
              <div style={{ marginBottom: 16 }}>
                {/* Action strip */}
                <div style={{ display: "flex", gap: 10, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
                  {[
                    { label: "Pending Review", value: pendingCount, sub: pendingCount > 0 ? fmt(entries.filter(e=>e.status===STATUSES.SUBMITTED).reduce((s,e)=>{const h=calcHours(e.startTime,e.endTime);const r=getRate(e.userId);return s+calcLabor(h,r)+calcMaterialsTotal(e.materials);},0)) : "All clear", color: pendingCount > 0 ? BRAND.warning : BRAND.success, page: "review", emoji: "🕐" },
                    { label: "Awaiting Payment", value: unpaidApproved.length, sub: unpaidApproved.length > 0 ? fmt(unpaidTotal) + " owed" : "All paid", color: unpaidApproved.length > 0 ? "#1565C0" : BRAND.success, page: "payment", emoji: "💳" },
                    { label: "Needs Info", value: needsInfoCount, sub: needsInfoCount > 0 ? "Awaiting member reply" : "None", color: needsInfoCount > 0 ? "#C2410C" : BRAND.success, page: "entries", emoji: "💬" },
                  ].map(item => (
                    <button key={item.label} onClick={() => nav(item.page)} style={{ flex: "0 0 auto", minWidth: 140, padding: "14px 16px", borderRadius: 12, border: "1px solid " + item.color + "30", background: item.color + "08", cursor: "pointer", fontFamily: BRAND.sans, textAlign: "left", transition: "all 200ms" }}
                      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 20px " + item.color + "22"; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
                      <div style={{ fontSize: 22, marginBottom: 4 }}>{item.emoji}</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: item.color, lineHeight: 1 }}>{item.value}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: BRAND.charcoal, marginTop: 2 }}>{item.label}</div>
                      <div style={{ fontSize: 11, color: BRAND.textMuted, marginTop: 1 }}>{item.sub}</div>
                    </button>
                  ))}
                  {oldestDays > 0 && (
                    <button onClick={() => nav("review")} style={{ flex: "0 0 auto", minWidth: 140, padding: "14px 16px", borderRadius: 12, border: "1px solid " + (oldestDays >= 7 ? BRAND.error : BRAND.warning) + "40", background: (oldestDays >= 7 ? BRAND.error : BRAND.warning) + "08", cursor: "pointer", fontFamily: BRAND.sans, textAlign: "left" }}>
                      <div style={{ fontSize: 22, marginBottom: 4 }}>⏳</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: oldestDays >= 7 ? BRAND.error : BRAND.warning, lineHeight: 1 }}>{oldestDays}d</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: BRAND.charcoal, marginTop: 2 }}>Oldest Pending</div>
                      <div style={{ fontSize: 11, color: BRAND.textMuted }}>{oldestDays >= 7 ? "⚠️ Overdue" : "Within SLA"}</div>
                    </button>
                  )}
                </div>

                {/* Member activity table */}
                {memberActivity.length > 0 && (
                  <div style={{ ...S.card, padding: 0, overflow: "hidden", marginBottom: 16 }}>
                    <div style={{ padding: "14px 20px", borderBottom: "1px solid " + BRAND.borderLight, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: BRAND.navy }}>Member Activity</span>
                      <span style={{ fontSize: 12, color: BRAND.textLight }}>This month vs last month</span>
                    </div>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead><tr style={{ background: BRAND.bgSoft }}>
                          <th style={{ ...S.th, textAlign: "left" }}>Member</th>
                          <th style={{ ...S.th, textAlign: "right" }}>This Month</th>
                          <th style={{ ...S.th, textAlign: "right" }}>Last Month</th>
                          <th style={{ ...S.th, textAlign: "right" }}>YTD Total</th>
                        </tr></thead>
                        <tbody>{memberActivity.map((u, i) => {
                          const ytd = entries.filter(e => e.userId === u.id && e.date?.startsWith(yr) && (e.status === STATUSES.APPROVED || e.status === STATUSES.PAID)).reduce((s,e)=>{const h=calcHours(e.startTime,e.endTime);const r=getRate(u.id);return s+calcLabor(h,r)+calcMaterialsTotal(e.materials);},0);
                          const trend = u.thisMonth > u.lastMonth ? "↑" : u.thisMonth < u.lastMonth ? "↓" : "→";
                          const trendColor = u.thisMonth > u.lastMonth ? BRAND.success : u.thisMonth < u.lastMonth ? BRAND.error : BRAND.textLight;
                          return (
                            <tr key={u.id} style={{ background: i % 2 ? BRAND.bgSoft : BRAND.white, borderBottom: "1px solid " + BRAND.borderLight }}>
                              <td style={{ padding: "10px 16px", fontWeight: 600, color: BRAND.charcoal }}>{u.name}</td>
                              <td style={{ padding: "10px 12px", textAlign: "right" }}>
                                <span style={{ fontWeight: 700, color: BRAND.navy }}>{u.thisMonth}</span>
                                <span style={{ marginLeft: 4, color: trendColor, fontWeight: 700 }}>{trend}</span>
                              </td>
                              <td style={{ padding: "10px 12px", textAlign: "right", color: BRAND.textMuted }}>{u.lastMonth}</td>
                              <td style={{ padding: "10px 16px", textAlign: "right", fontWeight: 600, color: BRAND.brick }}>{fmt(ytd)}</td>
                            </tr>
                          );
                        })}</tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── MEMBER DASHBOARD ── */}
          {!isTreasurer && (() => {
            const yr = String(new Date().getFullYear());
            const myYrEntries = myEntries.filter(e => e.date?.startsWith(yr) && e.status !== STATUSES.TRASH);
            const ytdApproved = myYrEntries.filter(e => e.status === STATUSES.APPROVED).reduce((s,e)=>{const h=calcHours(e.startTime,e.endTime);const r=getRate(e.userId);return s+calcLabor(h,r)+calcMaterialsTotal(e.materials);},0);
            const ytdPaid = myYrEntries.filter(e => e.status === STATUSES.PAID).reduce((s,e)=>{const h=calcHours(e.startTime,e.endTime);const r=getRate(e.userId);return s+calcLabor(h,r)+calcMaterialsTotal(e.materials);},0);
            const pendingEntries = myEntries.filter(e => [STATUSES.SUBMITTED, STATUSES.AWAITING_SECOND].includes(e.status));
            const rejectedEntries = myEntries.filter(e => e.status === STATUSES.REJECTED);
            const needsInfoEntries = myEntries.filter(e => e.status === STATUSES.NEEDS_INFO);

            // Average approval time from auditLog
            const approvedWithLog = myEntries.filter(e => (e.status === STATUSES.APPROVED || e.status === STATUSES.PAID) && e.submittedAt && e.reviewedAt);
            const avgApprovalDays = approvedWithLog.length ? (approvedWithLog.reduce((s,e) => s + (new Date(e.reviewedAt) - new Date(e.submittedAt)) / 86400000, 0) / approvedWithLog.length).toFixed(1) : null;

            // Pending entries with age
            const withAge = pendingEntries.map(e => ({ ...e, ageDays: e.submittedAt ? Math.floor((Date.now() - new Date(e.submittedAt).getTime()) / 86400000) : 0 })).sort((a,b) => b.ageDays - a.ageDays);

            if (myEntries.length === 0) return (
              <div style={{ ...S.card, background: "linear-gradient(135deg, #EEF2FF 0%, #F0FDF4 100%)", borderColor: "#C7D2FE", padding: mob ? 20 : 28, marginBottom: 16 }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>👋</div>
                <div style={{ fontFamily: BRAND.serif, fontSize: 20, fontWeight: 600, color: BRAND.navy, marginBottom: 8 }}>Welcome to {settings.hoaName}!</div>
                <div style={{ fontSize: 14, color: BRAND.charcoal, lineHeight: 1.7, marginBottom: 16 }}>Here's how reimbursement works:<br/>
                  <strong>1.</strong> Log your work — date, time, category, and what you did<br/>
                  <strong>2.</strong> Add materials and photos if applicable<br/>
                  <strong>3.</strong> Submit for review — the Treasurer will approve or request changes<br/>
                  <strong>4.</strong> Get reimbursed once approved</div>
                <button style={S.btnPrimary} onClick={() => setNewEntryType("chooser")}><Icon name="plus" size={16} /> Create Your First Entry</button>
              </div>
            );

            return (
              <div style={{ marginBottom: 16 }}>
                {/* 1. YTD earnings summary */}
                <div style={{ ...S.card, background: "linear-gradient(135deg, #F0FDF4 0%, #E8EDF5 100%)", borderColor: "#B5CCAE", marginBottom: 16 }}>
                  <div style={{ fontFamily: BRAND.serif, fontSize: 16, fontWeight: 600, color: BRAND.navy, marginBottom: 14 }}>{yr} Earnings Summary</div>
                  <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr 1fr" : "repeat(4, 1fr)", gap: mob ? 12 : 16 }}>
                    {[
                      { label: "Approved", value: fmt(ytdApproved), color: BRAND.success, icon: "✓" },
                      { label: "Paid Out", value: fmt(ytdPaid), color: "#3B5998", icon: "💳" },
                      { label: "Pending", value: fmt(dashStats.pendingPayout || 0), color: BRAND.warning, icon: "⏳" },
                      { label: "Total Entries", value: myYrEntries.length, color: BRAND.navy, icon: "📋" },
                    ].map(s => (
                      <div key={s.label} style={{ textAlign: "center", padding: "12px 8px", background: "rgba(255,255,255,0.6)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.8)" }}>
                        <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
                        <div style={{ fontSize: mob ? 18 : 22, fontWeight: 800, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: 11, color: BRAND.textMuted, marginTop: 2, fontWeight: 600 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                  {avgApprovalDays && (
                    <div style={{ marginTop: 12, padding: "8px 12px", background: "rgba(255,255,255,0.5)", borderRadius: 8, fontSize: 12, color: BRAND.textMuted, display: "flex", gap: 6, alignItems: "center" }}>
                      <span>⚡</span>
                      <span>Your entries are typically approved in <strong style={{ color: BRAND.navy }}>{avgApprovalDays} days</strong></span>
                    </div>
                  )}
                </div>

                {/* 2. Pending entries with age */}
                {withAge.length > 0 && (
                  <div style={{ ...S.card, padding: 0, overflow: "hidden", marginBottom: 16 }}>
                    <div style={{ padding: "14px 20px", borderBottom: "1px solid " + BRAND.borderLight }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: BRAND.navy }}>⏳ Awaiting Review</span>
                      <span style={{ fontSize: 12, color: BRAND.textLight, marginLeft: 8 }}>{withAge.length} entr{withAge.length === 1 ? "y" : "ies"}</span>
                    </div>
                    <div style={{ padding: "8px 0" }}>
                      {withAge.map(e => {
                        const ageColor = e.ageDays >= 7 ? BRAND.error : e.ageDays >= 3 ? BRAND.warning : BRAND.success;
                        const total = calcLabor(calcHours(e.startTime, e.endTime), getRate(e.userId)) + calcMaterialsTotal(e.materials);
                        return (
                          <div key={e.id} onClick={() => setViewEntry(e)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", cursor: "pointer", borderBottom: "1px solid " + BRAND.borderLight + "80", transition: "background 150ms" }}
                            onMouseEnter={ev => ev.currentTarget.style.background = BRAND.bgSoft}
                            onMouseLeave={ev => ev.currentTarget.style.background = "transparent"}>
                            <div style={{ width: 8, height: 8, borderRadius: 4, background: ageColor, flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 600, fontSize: 13, color: BRAND.charcoal, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.category} — {e.description}</div>
                              <div style={{ fontSize: 11, color: BRAND.textLight, marginTop: 2 }}>{formatDate(e.date)}</div>
                            </div>
                            <div style={{ textAlign: "right", flexShrink: 0 }}>
                              <div style={{ fontWeight: 700, fontSize: 13, color: BRAND.navy }}>{fmt(total)}</div>
                              <div style={{ fontSize: 11, fontWeight: 600, color: ageColor }}>{e.ageDays === 0 ? "Today" : e.ageDays + "d ago"}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 3+4. Rejected / Needs Info — needing action */}
                {(rejectedEntries.length > 0 || needsInfoEntries.length > 0) && (
                  <div style={{ ...S.card, background: "#FFF5F5", borderColor: "#F0BABA", borderLeft: "4px solid " + BRAND.error, marginBottom: 16 }}>
                    <div style={{ fontWeight: 700, color: BRAND.error, marginBottom: 10 }}>⚠️ {rejectedEntries.length + needsInfoEntries.length} entr{rejectedEntries.length + needsInfoEntries.length === 1 ? "y needs" : "ies need"} your attention</div>
                    {[...rejectedEntries, ...needsInfoEntries].slice(0, 3).map(e => {
                      const total = calcLabor(calcHours(e.startTime, e.endTime), getRate(e.userId)) + calcMaterialsTotal(e.materials);
                      return (
                        <div key={e.id} onClick={() => setViewEntry(e)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#fff", borderRadius: 8, marginBottom: 6, cursor: "pointer", border: "1px solid #F0BABA" }}>
                          <StatusBadge status={e.status} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: BRAND.charcoal, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.category} — {e.description}</div>
                            {e.reviewerNotes && <div style={{ fontSize: 12, color: BRAND.textMuted, marginTop: 2 }}>"{e.reviewerNotes.slice(0, 60)}{e.reviewerNotes.length > 60 ? "…" : ""}"</div>}
                          </div>
                          <div style={{ fontWeight: 700, fontSize: 13, color: BRAND.navy, flexShrink: 0 }}>{fmt(total)}</div>
                        </div>
                      );
                    })}
                    {rejectedEntries.length + needsInfoEntries.length > 3 && (
                      <button style={{ ...S.btnGhost, fontSize: 12, marginTop: 4 }} onClick={() => { setFilterStatus(STATUSES.REJECTED); nav("entries"); }}>View all →</button>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          <div style={S.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}><h3 style={S.h3}>Recent Entries</h3><button style={S.btnGhost} onClick={() => setPage("entries")}>View all →</button></div>
            {recent.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 20px" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: BRAND.navy, marginBottom: 6 }}>No entries yet</div>
                <div style={{ fontSize: 13, color: BRAND.textLight, marginBottom: 16 }}>{isTreasurer ? "Entries will appear here once members submit work." : "Log your first work session to get started."}</div>
                {!isTreasurer && <button style={S.btnPrimary} onClick={() => setNewEntryType("chooser")}><Icon name="plus" size={15} /> New Entry</button>}
              </div>
            )
            : mob ? recent.map(e => <EntryCard key={e.id + "-" + page} entry={e} users={users} settings={settings} currentUser={viewAs} onClick={() => setViewEntry(e)} onEdit={(e) => { setEditEntry(e); }} onSubmit={(e) => doSubmit(e, e.id)} onApprove={(e) => doApproveEntry(e.id, "")} onReject={(e) => setViewEntry(e)} onDelete={(e) => doTrashFromList(e, "")} />)
            : (
              <div style={{ border: "1px solid " + BRAND.borderLight, borderRadius: 8, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead><tr><th scope="col" style={S.th}>Date</th>{isTreasurer && <th scope="col" style={S.th}>Member</th>}<th scope="col" style={S.th}>Category</th><th scope="col" style={S.th}>Description</th><th scope="col" style={{ ...S.th, textAlign: "right" }}>Total</th><th scope="col" style={S.th}>Status</th></tr></thead>
                  <tbody>{recent.map((e, i) => { const u = users.find(u => u.id === e.userId); const h = calcHours(e.startTime, e.endTime); const r = getUserRate(users, settings, e.userId); const total = calcLabor(h, r) + calcMaterialsTotal(e.materials); return (
                    <tr key={e.id} tabIndex={0} role="row" onKeyDown={ev => (ev.key === "Enter" || ev.key === " ") && (ev.preventDefault(), setViewEntry(e))} onClick={() => setViewEntry(e)} style={{ cursor: "pointer", background: i % 2 === 1 ? BRAND.bgSoft : BRAND.white, transition: "background 150ms" }} onMouseEnter={ev => ev.currentTarget.style.background = BRAND.beige + "40"} onMouseLeave={ev => ev.currentTarget.style.background = i % 2 === 1 ? BRAND.bgSoft : BRAND.white}>
                      <td style={S.td}>{formatDate(e.date)}</td>{isTreasurer && <td style={S.td}>{u?.name}</td>}<td style={S.td}><CategoryBadge category={e.category} /></td><td style={{ ...S.td, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.description}</td><td style={{ ...S.td, textAlign: "right", fontWeight: 600 }}>{fmt(total)}</td><td style={S.td}><StatusBadge status={e.status} /></td>
                    </tr>); })}</tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      );
    }
    if (page === "entries") return (
      <div className="fade-in">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={S.h2}>{isTreasurer ? "All Entries" : "My Entries"}</h2>
          {!mob && (
            <div style={{ display: "flex", gap: 8, position: "relative" }}>
              <button style={S.btnPrimary} onClick={() => setNewEntryType(t => t ? null : "chooser")}>
                <Icon name="plus" size={16} /> New Entry
              </button>
              {newEntryType === "chooser" && (<>
                <div style={{ position: "fixed", inset: 0, zIndex: 29 }} onClick={() => setNewEntryType(null)} />
                <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 6, background: BRAND.white, border: "1px solid " + BRAND.borderLight, borderRadius: 10, boxShadow: "0 8px 32px rgba(0,0,0,0.12)", zIndex: 30, minWidth: 220, overflow: "hidden" }}>
                  <button style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", width: "100%", border: "none", background: "none", cursor: "pointer", fontFamily: BRAND.sans, fontSize: 14, color: BRAND.charcoal, textAlign: "left" }}
                    onMouseEnter={ev => ev.currentTarget.style.background = BRAND.bgSoft} onMouseLeave={ev => ev.currentTarget.style.background = "none"}
                    onClick={() => { setNewEntryType(null); setNewEntry(true); }}>
                    <span style={{ fontSize: 20 }}>🔨</span><div><div style={{ fontWeight: 600 }}>Work Entry</div><div style={{ fontSize: 12, color: BRAND.textLight }}>Log labor hours & tasks</div></div>
                  </button>
                  <div style={{ borderTop: "1px solid " + BRAND.borderLight }} />
                  <button style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", width: "100%", border: "none", background: "none", cursor: "pointer", fontFamily: BRAND.sans, fontSize: 14, color: BRAND.charcoal, textAlign: "left" }}
                    onMouseEnter={ev => ev.currentTarget.style.background = BRAND.bgSoft} onMouseLeave={ev => ev.currentTarget.style.background = "none"}
                    onClick={() => { setNewEntryType(null); setNewPurchase(true); }}>
                    <span style={{ fontSize: 20 }}>🛍️</span><div><div style={{ fontWeight: 600 }}>Purchase Entry</div><div style={{ fontSize: 12, color: BRAND.textLight }}>Log expenses & receipts</div></div>
                  </button>
                </div>
              </>)}
            </div>
          )}
        </div>
        {/* Entry type tabs */}
        <div style={{ display: "flex", marginBottom: 16, borderRadius: 8, background: BRAND.bgSoft, padding: 4, maxWidth: 320 }}>
          <button style={{ flex: 1, padding: "9px 16px", borderRadius: 6, border: "none", fontFamily: BRAND.sans, fontSize: 13, fontWeight: 600, cursor: "pointer", background: entryTab === "work" ? BRAND.white : "transparent", color: entryTab === "work" ? BRAND.navy : BRAND.textMuted, boxShadow: entryTab === "work" ? "0 1px 3px rgba(0,0,0,0.08)" : "none", transition: "all 150ms" }} onClick={() => setEntryTab("work")}>
            🔨 Work{myEntries.length > 0 ? ` (${myEntries.length})` : ""}
          </button>
          <button style={{ flex: 1, padding: "9px 16px", borderRadius: 6, border: "none", fontFamily: BRAND.sans, fontSize: 13, fontWeight: 600, cursor: "pointer", background: entryTab === "purchases" ? BRAND.white : "transparent", color: entryTab === "purchases" ? BRAND.navy : BRAND.textMuted, boxShadow: entryTab === "purchases" ? "0 1px 3px rgba(0,0,0,0.08)" : "none", transition: "all 150ms" }} onClick={() => setEntryTab("purchases")}>
            🛍️ Purchases{(() => { const c = (isTreasurer ? purchaseEntries : purchaseEntries.filter(e => e.userId === viewAs?.id)).length; return c > 0 ? ` (${c})` : ""; })()}
          </button>
        </div>
        {entryTab === "purchases" ? (() => {
          const myPurchases = isTreasurer ? purchaseEntries : purchaseEntries.filter(e => e.userId === viewAs?.id);
          const filtered = myPurchases.filter(e => {
            if (filterSearch) { const s = filterSearch.toLowerCase(); if (!e.storeName?.toLowerCase().includes(s) && !e.category?.toLowerCase().includes(s) && !e.description?.toLowerCase().includes(s)) return false; }
            if (filterStatus !== "all" && e.status !== filterStatus) return false;
            return true;
          }).sort((a, b) => b.date.localeCompare(a.date));
          if (filtered.length === 0) return (
            <div style={{ ...S.card, textAlign: "center", padding: "48px 32px" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🛍️</div>
              <div style={{ fontWeight: 600, color: BRAND.navy, marginBottom: 8, fontSize: 16 }}>No purchase entries yet</div>
              <div style={{ fontSize: 14, color: BRAND.textLight, marginBottom: 20 }}>Track HOA purchases like supplies, decor, and fuel.</div>
              <button style={S.btnPrimary} onClick={() => setNewPurchase(true)}><Icon name="plus" size={16} /> New Purchase</button>
            </div>
          );
          return mob ? filtered.map((e, i) => (
            <div key={e.id} style={{ animation: `cardSlideIn 280ms cubic-bezier(0.34,1.56,0.64,1) ${Math.min(i, 7) * 45}ms both`, marginBottom: 10 }}>
              <div onClick={() => setViewPurchase(e)} style={{ ...S.card, cursor: "pointer", padding: "14px 16px", transition: "box-shadow 150ms" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15, color: BRAND.charcoal }}>{e.storeName}</div>
                    <div style={{ fontSize: 12, color: BRAND.textMuted }}>{formatDate(e.date)} · {e.category}</div>
                  </div>
                  <StatusBadge status={e.status} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 12, color: BRAND.textLight }}>{e.items?.length || 0} item{(e.items?.length || 0) !== 1 ? "s" : ""}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: BRAND.navy }}>{fmt(e.total)}</div>
                </div>
              </div>
            </div>
          )) : (
            <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead><tr>
                  <th style={S.th}>Date</th>
                  {isTreasurer && <th style={S.th}>Member</th>}
                  <th style={S.th}>Store</th>
                  <th style={S.th}>Category</th>
                  <th style={{ ...S.th, textAlign: "right" }}>Items</th>
                  <th style={{ ...S.th, textAlign: "right" }}>Total</th>
                  <th style={S.th}>Status</th>
                </tr></thead>
                <tbody>{filtered.map((e, i) => {
                  const u = users.find(u => u.id === e.userId);
                  return (
                    <tr key={e.id} onClick={() => setViewPurchase(e)} style={{ cursor: "pointer", background: i % 2 === 1 ? BRAND.bgSoft : BRAND.white, transition: "background 150ms" }} onMouseEnter={ev => ev.currentTarget.style.background = BRAND.beige + "40"} onMouseLeave={ev => ev.currentTarget.style.background = i % 2 === 1 ? BRAND.bgSoft : BRAND.white}>
                      <td style={S.td}>{formatDate(e.date)}</td>
                      {isTreasurer && <td style={S.td}>{u?.name}</td>}
                      <td style={S.td}>{e.storeName}</td>
                      <td style={S.td}>{PURCHASE_CATEGORY_EMOJIS[e.category] || "📦"} {e.category}</td>
                      <td style={{ ...S.td, textAlign: "right" }}>{e.items?.length || 0}</td>
                      <td style={{ ...S.td, textAlign: "right", fontWeight: 600 }}>{fmt(e.total)}</td>
                      <td style={S.td}><StatusBadge status={e.status} /></td>
                    </tr>
                  );
                })}</tbody>
              </table>
            </div>
          );
        })() : (<>
        {/* Filter bar — search always visible; advanced filters collapse into a panel on mobile */}
        {(() => {
          const hasActiveFilter = filterSearch || filterStatus !== "all" || filterCategory !== "all" || filterMember !== "all" || filterDateFrom || filterDateTo;
          const activeCount = [filterSearch, filterStatus !== "all", filterCategory !== "all", filterMember !== "all", filterDateFrom, filterDateTo].filter(Boolean).length;
          const advancedCount = [filterStatus !== "all", filterCategory !== "all", filterMember !== "all", filterDateFrom, filterDateTo].filter(Boolean).length;
          const clearAll = () => { setFilterSearch(""); setFilterStatus("all"); setFilterCategory("all"); setFilterMember("all"); setFilterDateFrom(""); setFilterDateTo(""); };
          const datePresets = [
            { label: "This Month", fn: () => { const d = new Date(); setFilterDateFrom(d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-01"); setFilterDateTo(new Date().toISOString().split("T")[0]); } },
            { label: "Last Month", fn: () => { const d = new Date(); d.setMonth(d.getMonth()-1); const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"); setFilterDateFrom(y+"-"+m+"-01"); const end=new Date(y,d.getMonth()+1,0); setFilterDateTo(end.toISOString().split("T")[0]); } },
            { label: "YTD", fn: () => { setFilterDateFrom(new Date().getFullYear()+"-01-01"); setFilterDateTo(new Date().toISOString().split("T")[0]); } },
          ];
          return (
            <div style={{ marginBottom: 16 }}>
              {/* Row 1: search + filter button (mobile) or full bar (desktop) */}
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input style={{ ...S.input, flex: 1, padding: "8px 12px", fontSize: 13 }} placeholder="🔍 Search entries, members, locations..." value={filterSearch} onChange={e => setFilterSearch(e.target.value)} />
                {mob ? (
                  <button onClick={() => setFilterPanelOpen(p => !p)} aria-expanded={filterPanelOpen} aria-label="Toggle filters"
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 6, border: "1px solid " + (advancedCount > 0 ? BRAND.brick : BRAND.border), background: advancedCount > 0 ? BRAND.brick + "0F" : BRAND.white, color: advancedCount > 0 ? BRAND.brick : BRAND.textMuted, fontFamily: BRAND.sans, fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
                    <Icon name="settings" size={16} />
                    {advancedCount > 0 ? <span style={{ background: BRAND.brick, color: "#fff", borderRadius: 10, fontSize: 11, fontWeight: 700, padding: "1px 6px", minWidth: 18, textAlign: "center" }}>{advancedCount}</span> : "Filter"}
                  </button>
                ) : (
                  <>
                    <select style={{ ...S.select, width: "auto", padding: "8px 12px", fontSize: 13, minWidth: 120 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                      <option value="all">All Statuses</option>
                      {Object.values(STATUSES).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select style={{ ...S.select, width: "auto", padding: "8px 12px", fontSize: 13, minWidth: 130 }} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                      <option value="all">All Categories</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {isTreasurer && (
                      <select style={{ ...S.select, width: "auto", padding: "8px 12px", fontSize: 13, minWidth: 130 }} value={filterMember} onChange={e => setFilterMember(e.target.value)}>
                        <option value="all">All Members</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                    )}
                    <input type="date" style={{ ...S.input, padding: "7px 10px", fontSize: 12, width: "auto" }} value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} title="From" />
                    <span style={{ fontSize: 12, color: BRAND.textLight }}>–</span>
                    <input type="date" style={{ ...S.input, padding: "7px 10px", fontSize: 12, width: "auto" }} value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} title="To" />
                    {datePresets.map(p => <button key={p.label} onClick={p.fn} style={{ padding: "5px 10px", borderRadius: 12, border: "1px solid "+BRAND.borderLight, background: BRAND.white, color: BRAND.navy, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: BRAND.sans, whiteSpace: "nowrap" }}>{p.label}</button>)}
                    {hasActiveFilter && <button style={{ ...S.btnGhost, fontSize: 12, padding: "6px 10px", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }} onClick={clearAll}><span style={{ background: BRAND.brick, color: "#fff", borderRadius: 10, fontSize: 11, fontWeight: 700, padding: "1px 6px", minWidth: 18, textAlign: "center" }}>{activeCount}</span>Clear</button>}
                  </>
                )}
              </div>

              {/* Mobile expanded filter panel */}
              {mob && filterPanelOpen && (
                <div className="fade-in" style={{ marginTop: 8, padding: "14px 14px 10px", background: BRAND.white, border: "1px solid " + BRAND.borderLight, borderRadius: 10, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: BRAND.textLight, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>Status</div>
                      <select style={{ ...S.select, fontSize: 13, padding: "8px 10px" }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                        <option value="all">All</option>
                        {Object.values(STATUSES).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: BRAND.textLight, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>Category</div>
                      <select style={{ ...S.select, fontSize: 13, padding: "8px 10px" }} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                        <option value="all">All</option>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    {isTreasurer && (
                      <div style={{ gridColumn: "1 / -1" }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: BRAND.textLight, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>Member</div>
                        <select style={{ ...S.select, fontSize: 13, padding: "8px 10px" }} value={filterMember} onChange={e => setFilterMember(e.target.value)}>
                          <option value="all">All Members</option>
                          {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: BRAND.textLight, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>From</div>
                      <input type="date" style={{ ...S.input, fontSize: 13, padding: "8px 10px" }} value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} />
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: BRAND.textLight, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>To</div>
                      <input type="date" style={{ ...S.input, fontSize: 13, padding: "8px 10px" }} value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                    {datePresets.map(p => <button key={p.label} onClick={p.fn} style={{ padding: "5px 12px", borderRadius: 12, border: "1px solid "+BRAND.borderLight, background: BRAND.bgSoft, color: BRAND.navy, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: BRAND.sans }}>{p.label}</button>)}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid " + BRAND.borderLight, paddingTop: 10 }}>
                    {advancedCount > 0 ? <button style={{ ...S.btnGhost, fontSize: 13, color: BRAND.brick, padding: "6px 4px" }} onClick={clearAll}>✕ Clear filters</button> : <span />}
                    <button style={{ ...S.btnPrimary, fontSize: 13, padding: "8px 20px" }} onClick={() => setFilterPanelOpen(false)}>Done</button>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
        {(() => {
          let filtered = myEntries;
          if (filterDateFrom) filtered = filtered.filter(e => e.date >= filterDateFrom);
          if (filterDateTo)   filtered = filtered.filter(e => e.date <= filterDateTo);
          if (filterSearch) {
            const q = filterSearch.toLowerCase();
            filtered = filtered.filter(e => {
              const u = users.find(u => u.id === e.userId);
              return (
                e.description.toLowerCase().includes(q) ||
                e.category.toLowerCase().includes(q) ||
                (e.location || "").toLowerCase().includes(q) ||
                (e.notes || "").toLowerCase().includes(q) ||
                (u?.name || "").toLowerCase().includes(q) ||
                (e.materials || []).some(m => (m.name || "").toLowerCase().includes(q))
              );
            });
          }
          if (filterStatus !== "all") filtered = filtered.filter(e => e.status === filterStatus);
          if (filterCategory !== "all") filtered = filtered.filter(e => e.category === filterCategory);
          if (filterMember !== "all") filtered = filtered.filter(e => e.userId === filterMember);
          const hasActiveFilter = filterSearch || filterStatus !== "all" || filterCategory !== "all" || filterMember !== "all" || filterDateFrom || filterDateTo;
          if (filtered.length === 0) {
            if (myEntries.length === 0) return (
              <div style={{ ...S.card, textAlign: "center", padding: "48px 32px" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                <div style={{ fontWeight: 600, color: BRAND.navy, marginBottom: 8, fontSize: 16 }}>No entries yet</div>
                <div style={{ fontSize: 14, color: BRAND.textLight, marginBottom: 20 }}>{isTreasurer ? "Work entries from all members will appear here once submitted." : "Start by logging your first work session."}</div>
                {!isTreasurer && <button style={S.btnPrimary} onClick={() => setNewEntryType("chooser")}><Icon name="plus" size={16} /> New Entry</button>}
              </div>
            );
            return (
              <div style={{ ...S.card, textAlign: "center", padding: "48px 32px" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
                <div style={{ fontWeight: 600, color: BRAND.navy, marginBottom: 8, fontSize: 16 }}>No results</div>
                <div style={{ fontSize: 14, color: BRAND.textLight, marginBottom: 20 }}>No entries match your current filters. Try broadening your search.</div>
                <button style={S.btnSecondary} onClick={() => { setFilterSearch(""); setFilterStatus("all"); setFilterCategory("all"); setFilterMember("all"); setFilterDateFrom(""); setFilterDateTo(""); }}>Clear all filters</button>
              </div>
            );
          }
          return mob ? filtered.map((e, i) => (
            <div key={e.id + "-" + page} style={{ animation: `cardSlideIn 280ms cubic-bezier(0.34,1.56,0.64,1) ${Math.min(i, 7) * 45}ms both` }}>
              <EntryCard entry={e} users={users} settings={settings} currentUser={viewAs} onClick={() => setViewEntry(e)} onEdit={(e) => { setEditEntry(e); }} onSubmit={(e) => doSubmit(e, e.id)} onApprove={(e) => doApproveEntry(e.id, "")} onReject={(e) => setViewEntry(e)} onDelete={(e) => doTrashFromList(e, "")} />
            </div>
          ))
          : (
            <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead><tr>
                  {[
                    { key: "date",     label: "Date",        align: "left" },
                    ...(isTreasurer ? [{ key: "member", label: "Member", align: "left" }] : []),
                    { key: "category", label: "Category",    align: "left" },
                    { key: "desc",     label: "Description", align: "left", noSort: true },
                    { key: "hours",    label: "Hours",       align: "right" },
                    { key: "total",    label: "Total",       align: "right" },
                    { key: "status",   label: "Status",      align: "left" },
                  ].map(col => (
                    <th key={col.key} scope="col" style={{ ...S.th, textAlign: col.align, cursor: col.noSort ? "default" : "pointer", userSelect: "none", whiteSpace: "nowrap" }}
                      onClick={col.noSort ? undefined : () => { if (sortField === col.key) setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSortField(col.key); setSortDir("asc"); } }}>
                      {col.label}
                      {!col.noSort && (
                        <span style={{ marginLeft: 4, opacity: sortField === col.key ? 1 : 0.3, fontSize: 11 }}>
                          {sortField === col.key ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}
                        </span>
                      )}
                    </th>
                  ))}
                </tr></thead>
                <tbody>{(() => {
                  const sorted = [...filtered].sort((a, b) => {
                    const ua = users.find(u => u.id === a.userId);
                    const ub = users.find(u => u.id === b.userId);
                    const ha = calcHours(a.startTime, a.endTime);
                    const hb = calcHours(b.startTime, b.endTime);
                    const ra = getUserRate(users, settings, a.userId);
                    const rb = getUserRate(users, settings, b.userId);
                    const ta = calcLabor(ha, ra) + calcMaterialsTotal(a.materials);
                    const tb = calcLabor(hb, rb) + calcMaterialsTotal(b.materials);
                    let cmp = 0;
                    if (sortField === "date")     cmp = a.date.localeCompare(b.date);
                    else if (sortField === "member")   cmp = (ua?.name || "").localeCompare(ub?.name || "");
                    else if (sortField === "category") cmp = a.category.localeCompare(b.category);
                    else if (sortField === "hours")    cmp = ha - hb;
                    else if (sortField === "total")    cmp = ta - tb;
                    else if (sortField === "status")   cmp = a.status.localeCompare(b.status);
                    return sortDir === "asc" ? cmp : -cmp;
                  });
                  return sorted;
                })().map((e, i) => { const u = users.find(u => u.id === e.userId); const h = calcHours(e.startTime, e.endTime); const r = getUserRate(users, settings, e.userId); const total = calcLabor(h, r) + calcMaterialsTotal(e.materials); return (
                  <tr key={e.id} tabIndex={0} role="row" onKeyDown={ev => (ev.key === "Enter" || ev.key === " ") && (ev.preventDefault(), setViewEntry(e))} onClick={() => setViewEntry(e)} style={{ cursor: "pointer", background: i % 2 === 1 ? BRAND.bgSoft : BRAND.white, transition: "background 150ms" }} onMouseEnter={ev => ev.currentTarget.style.background = BRAND.beige + "40"} onMouseLeave={ev => ev.currentTarget.style.background = i % 2 === 1 ? BRAND.bgSoft : BRAND.white}>
                    <td style={S.td}>{formatDate(e.date)}</td>{isTreasurer && <td style={S.td}>{u?.name}</td>}<td style={S.td}><CategoryBadge category={e.category} /></td><td style={{ ...S.td, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.description}</td><td style={{ ...S.td, textAlign: "right" }}>{fmtHours(h)}</td><td style={{ ...S.td, textAlign: "right", fontWeight: 600 }}>{fmt(total)}</td><td style={S.td}><StatusBadge status={e.status} /></td>
                  </tr>); })}</tbody>
              </table>
            </div>
          );
        })()}
        </>)}
      </div>
    );
    if (page === "review") {
      if (!isTreasurer || previewAsId) { nav("dashboard"); return null; }
      const pendingWork = entries.filter(e => e.status === STATUSES.SUBMITTED || e.status === STATUSES.AWAITING_SECOND || e.status === STATUSES.NEEDS_INFO).map(e => ({ ...e, _type: "work" }));
      const pendingPurch = purchaseEntries.filter(e => e.status === "Submitted").map(e => ({ ...e, _type: "purchase" }));
      const pending = [...pendingWork, ...pendingPurch].sort((a, b) => (b.submittedAt || b.date || "").localeCompare(a.submittedAt || a.date || ""));
      // Only first-approval work entries are bulk-selectable (not dual-approval ones, not purchases)
      const bulkEligible = pendingWork.filter(e => e.status === STATUSES.SUBMITTED);
      const allSelected = bulkEligible.length > 0 && bulkEligible.every(e => selectedIds.has(e.id));
      const someSelected = selectedIds.size > 0;
      const bulkTotal = [...selectedIds].reduce((acc, id) => {
        const e = entries.find(x => x.id === id);
        if (!e) return acc;
        const h = calcHours(e.startTime, e.endTime);
        const r = getUserRate(users, settings, e.userId);
        return acc + calcLabor(h, r) + calcMaterialsTotal(e.materials);
      }, 0);
      return (
        <div className="fade-in">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, flexWrap: "wrap", gap: 12 }}>
            <div>
              <h2 style={{ ...S.h2, marginBottom: 4 }}>Review Queue</h2>
              <p style={{ margin: 0, fontSize: 14, color: BRAND.textMuted }}>{pending.length} {pending.length === 1 ? "entry" : "entries"} pending your review</p>
            </div>
            {pending.length > 0 && (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {bulkEligible.length > 1 && (
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: BRAND.textMuted, cursor: "pointer", userSelect: "none" }}>
                    <input type="checkbox" checked={allSelected} onChange={() => {
                      if (allSelected) setSelectedIds(new Set());
                      else setSelectedIds(new Set(bulkEligible.map(e => e.id)));
                    }} style={{ width: 16, height: 16, accentColor: BRAND.navy, cursor: "pointer" }} />
                    Select all work ({bulkEligible.length})
                  </label>
                )}
                {someSelected && (
                  <button
                    style={{ ...S.btnSuccess, fontSize: 13, padding: "8px 16px", gap: 6 }}
                    onClick={async () => {
                      const ids = [...selectedIds];
                      setSelectedIds(new Set());
                      await doBulkApprove(ids);
                      pushUndo("Approved " + ids.length + " entries", async () => {
                        for (const id of ids) await rejectEntry(id, "Undone — moved back to Submitted for re-review");
                        showToast("Bulk approve undone", "info");
                      });
                    }}
                  >
                    <Icon name="check" size={14} /> Approve {selectedIds.size} selected · {fmt(bulkTotal)}
                  </button>
                )}
              </div>
            )}
          </div>
          {pending.length === 0 ? (
            <div style={{ ...S.card, textAlign: "center", padding: 60 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
              <div style={{ fontWeight: 600, color: BRAND.navy, marginBottom: 8 }}>All caught up!</div>
              <div style={{ fontSize: 14, color: BRAND.textLight, marginBottom: 16 }}>No entries waiting for review.</div>
              <button style={S.btnGhost} onClick={() => { setFilterStatus(STATUSES.APPROVED); nav("entries"); }}>View approved entries →</button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {pending.map(e => {
                const u = users.find(u => u.id === e.userId);
                const isPurchase = e._type === "purchase";
                const total = isPurchase ? (e.total || 0) : (calcLabor(calcHours(e.startTime, e.endTime), getUserRate(users, settings, e.userId)) + calcMaterialsTotal(e.materials));
                const h = isPurchase ? null : calcHours(e.startTime, e.endTime);
                const isRejecting = rejectingId === e.id;
                const isNeedsInfo = needsInfoId === e.id;
                const isSelected = selectedIds.has(e.id);
                const isBulkEligible = !isPurchase && e.status === STATUSES.SUBMITTED;
                const submittedAgo = e.submittedAt ? timeAgo(e.submittedAt) : null;
                return (
                <div key={e.id} style={{ ...S.card, padding: "20px 24px", transition: "box-shadow 150ms, border-color 150ms", borderLeft: "4px solid " + (isSelected ? BRAND.navy : isPurchase ? "#0E7490" : e.status === STATUSES.AWAITING_SECOND ? "#4338CA" : BRAND.brick), outline: isSelected ? "2px solid " + BRAND.navy + "30" : "none" }} onMouseEnter={ev => ev.currentTarget.style.boxShadow = "0 4px 16px rgba(31,42,56,0.08)"} onMouseLeave={ev => ev.currentTarget.style.boxShadow = "0 1px 3px rgba(31,42,56,0.04)"}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    {isBulkEligible && (
                      <div style={{ paddingTop: 4, flexShrink: 0 }}>
                        <input type="checkbox" checked={isSelected} onChange={() => {
                          setSelectedIds(prev => { const s = new Set(prev); if (s.has(e.id)) s.delete(e.id); else s.add(e.id); return s; });
                        }} style={{ width: 16, height: 16, accentColor: BRAND.navy, cursor: "pointer" }} />
                      </div>
                    )}
                    <div role="button" tabIndex={0} onKeyDown={ev => (ev.key === "Enter" || ev.key === " ") && (ev.preventDefault(), isPurchase ? setViewPurchase(e) : setViewEntry(e))} style={{ flex: 1, cursor: "pointer", minWidth: 0 }} onClick={() => isPurchase ? setViewPurchase(e) : setViewEntry(e)}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 700, fontSize: 16, color: BRAND.navy }}>{u?.name}</span>
                        {isPurchase && <span style={{ fontSize: 10, fontWeight: 700, color: "#0E7490", background: "#ECFEFF", padding: "2px 8px", borderRadius: 10 }}>PURCHASE</span>}
                        <CategoryBadge category={e.category} />
                        {!isPurchase && e.status === STATUSES.AWAITING_SECOND && <span style={{ fontSize: 11, color: "#4338CA", fontWeight: 600 }}>⚖️ 2nd approval</span>}
                        {submittedAgo && <span style={{ fontSize: 11, color: BRAND.textLight }}>submitted {submittedAgo}</span>}
                      </div>
                      <div style={{ fontSize: 14, color: BRAND.charcoal, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{isPurchase ? (e.storeName + " — " + e.description) : e.description}</div>
                      <div style={{ fontSize: 13, color: BRAND.textLight }}>{relativeDate(e.date)}{h != null ? " · " + fmtHours(h) : ""}{isPurchase && e.items?.length ? " · " + e.items.length + " item" + (e.items.length > 1 ? "s" : "") : ""}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: isPurchase ? "#0E7490" : BRAND.brick }}>{fmt(total)}</div>
                      <div style={{ fontSize: 12, color: BRAND.textLight }}>{isPurchase ? "purchase" : "reimbursement"}</div>
                    </div>
                  </div>
                  {isRejecting ? (
                    <div className="fade-in" style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid " + BRAND.borderLight }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: BRAND.charcoal, marginBottom: 6 }}>Rejection reason <span style={{ color: BRAND.error }}>*</span></div>
                      <textarea autoFocus style={{ ...S.textarea, minHeight: 60, marginBottom: 8 }} value={rejectNote} onChange={ev => setRejectNote(ev.target.value)} placeholder="Tell them what needs to be fixed..." />
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button style={{ ...S.btnGhost, fontSize: 13, padding: "6px 14px" }} onClick={() => { setRejectingId(null); setRejectNote(""); }}>Cancel</button>
                        <button style={{ ...S.btnDanger, fontSize: 13, padding: "6px 14px", opacity: !rejectNote.trim() ? 0.5 : 1 }} disabled={!rejectNote.trim()} onClick={async () => {
                          if (isPurchase) { await doPurchaseReject(e.id, rejectNote); } else { await doRejectEntry(e.id, rejectNote); pushUndo("Rejection sent", async () => { await restoreEntry(e.id, "Submitted"); showToast("Rejection undone — restored to queue", "info"); }); }
                          setRejectingId(null); setRejectNote("");
                        }}><Icon name="x" size={14} /> Send Rejection</button>
                      </div>
                    </div>
                  ) : isNeedsInfo && !isPurchase ? (
                    <div className="fade-in" style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid " + BRAND.borderLight }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: BRAND.charcoal, marginBottom: 6 }}>What information do you need? <span style={{ color: BRAND.error }}>*</span></div>
                      <textarea autoFocus style={{ ...S.textarea, minHeight: 60, marginBottom: 8 }} value={needsInfoNote} onChange={ev => setNeedsInfoNote(ev.target.value)} placeholder="e.g. Please attach the receipt for materials..." />
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button style={{ ...S.btnGhost, fontSize: 13, padding: "6px 14px" }} onClick={() => { setNeedsInfoId(null); setNeedsInfoNote(""); }}>Cancel</button>
                        <button style={{ ...S.btnSecondary, fontSize: 13, padding: "6px 14px", opacity: !needsInfoNote.trim() ? 0.5 : 1 }} disabled={!needsInfoNote.trim()} onClick={async () => { await doNeedsInfo(e.id, needsInfoNote); setNeedsInfoId(null); setNeedsInfoNote(""); }}>💬 Request Info</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: 8, marginTop: 12, paddingTop: 12, borderTop: "1px solid " + BRAND.borderLight, justifyContent: "flex-end", flexWrap: "wrap" }}>
                      <button style={{ ...S.btnGhost, fontSize: 13, padding: "6px 14px" }} onClick={() => isPurchase ? setViewPurchase(e) : setViewEntry(e)}>View Details</button>
                      {!isPurchase && <button style={{ ...S.btnGhost, fontSize: 13, padding: "6px 14px", color: "#0284c7", borderColor: "#0284c7" + "40" }} onClick={(ev) => { ev.stopPropagation(); setNeedsInfoId(e.id); setNeedsInfoNote(""); }}>💬 Needs Info</button>}
                      <button style={{ ...S.btnDanger, fontSize: 13, padding: "6px 14px" }} onClick={(ev) => { ev.stopPropagation(); setRejectingId(e.id); setRejectNote(""); }}><Icon name="x" size={14} /> Reject</button>
                      <button style={{ ...S.btnSuccess, fontSize: 13, padding: "6px 14px" }} onClick={async (ev) => {
                        ev.stopPropagation();
                        if (isPurchase) { await doPurchaseApprove(e.id); } else { await doApproveEntry(e.id, ""); pushUndo("Approved: " + (u?.name || ""), async () => { await rejectEntry(e.id, "Undone — returned for re-review"); showToast("Approval undone", "info"); }); }
                      }}><Icon name="check" size={14} /> Approve</button>
                    </div>
                  )}
                </div>);
              })}
            </div>
          )}
        </div>
      );
    }
    if (page === "trash") {
      if (!isTreasurer || previewAsId) { nav("dashboard"); return null; }
      const trashed = entries.filter(e => e.status === STATUSES.TRASH).sort((a, b) => (b.reviewedAt || "").localeCompare(a.reviewedAt || ""));
      return (
        <div className="fade-in">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <h2 style={S.h2}>Trash</h2>
            <span style={{ fontSize: 13, color: BRAND.textMuted }}>{trashed.length} {trashed.length === 1 ? "entry" : "entries"}</span>
          </div>
          <p style={{ margin: "0 0 20px", fontSize: 14, color: BRAND.textMuted }}>Declined or deleted entries. Restore any entry to Draft to reopen it.</p>
          {trashed.length === 0 ? (
            <div style={{ ...S.card, textAlign: "center", padding: 60 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🗑</div>
              <div style={{ fontWeight: 600, color: BRAND.navy, marginBottom: 8 }}>Trash is empty</div>
              <div style={{ fontSize: 14, color: BRAND.textLight }}>Declined or trashed entries will appear here.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {trashed.map(e => {
                const u = users.find(u => u.id === e.userId);
                const h = calcHours(e.startTime, e.endTime);
                const r = getUserRate(users, settings, e.userId);
                const total = calcLabor(h, r) + calcMaterialsTotal(e.materials);
                const lastLog = e.auditLog?.length ? e.auditLog[e.auditLog.length - 1] : null;
                return (
                  <div key={e.id} style={{ ...S.card, padding: "18px 20px", borderLeft: "4px solid #7f1d1d", opacity: 0.9 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                          <CategoryBadge category={e.category} />
                          <span style={{ fontSize: 12, color: BRAND.textLight, fontWeight: 500 }}>{u?.name}</span>
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: BRAND.charcoal, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.description}</div>
                        <div style={{ fontSize: 12, color: BRAND.textLight }}>{formatDate(e.date)} · {fmtHours(h)}</div>
                        {lastLog && (
                          <div style={{ marginTop: 8, padding: "8px 12px", background: "#FFF1F1", borderRadius: 6, fontSize: 12 }}>
                            <span style={{ fontWeight: 600, color: "#7f1d1d" }}>{lastLog.action}</span>
                            {lastLog.details && <span style={{ color: BRAND.textMuted }}> — {lastLog.details.replace("Reason: ", "")}</span>}
                            <span style={{ color: BRAND.textLight }}> · {lastLog.byName} · {new Date(lastLog.at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: "right", marginLeft: 16, flexShrink: 0 }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: "#7f1d1d", marginBottom: 8 }}>{fmt(total)}</div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button style={{ ...S.btnGhost, fontSize: 12, padding: "5px 10px" }} onClick={() => setViewEntry(e)}>View</button>
                          <button style={{ ...S.btnGhost, fontSize: 12, padding: "5px 10px" }} onClick={async () => { const updated = await restoreEntry(e.id, STATUSES.DRAFT); if (updated) showToast("Restored to Draft", "success", e.category + " — " + u?.name); }}>↩ Restore</button>
                          <button style={{ background: "#7f1d1d", color: "#fff", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer", fontWeight: 600 }} onClick={() => setPermDeleteTarget(e)}>Delete</button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        <ConfirmDialog open={!!permDeleteTarget} onClose={() => setPermDeleteTarget(null)} title="Permanently Delete?" message={permDeleteTarget ? "This cannot be undone. " + (permDeleteTarget.category || "") + " by " + (users.find(u => u.id === permDeleteTarget?.userId)?.name || "Unknown") + " will be permanently removed." : ""} confirmText="Delete Forever" danger onConfirm={async () => { if (permDeleteTarget) { await deleteEntry(permDeleteTarget.id); setPermDeleteTarget(null); showToast("Permanently deleted", "success"); }}} />
        </div>
      );
    }
    if (page === "payment") { if (!isTreasurer || previewAsId) { nav("dashboard"); return null; } return <PaymentRunPage entries={entries} purchaseEntries={purchaseEntries} users={users} settings={settings} onMarkPaid={async (ids, paymentDetails) => { let count = 0; for (const id of ids) { const updated = await markPaid(id, paymentDetails); if (updated) count++; } if (count > 0) showToast(count + " entr" + (count === 1 ? "y" : "ies") + " marked as paid", "success"); }} onMarkPurchasePaid={doPurchaseMarkPaid} mob={mob} />; }
    if (page === "help") return <HelpPage currentUser={currentUser} settings={settings} mob={mob} onNav={nav} />;
    if (page === "reports") { if (!isTreasurer || previewAsId) { nav("dashboard"); return null; } return <ReportsPage entries={entries} purchaseEntries={purchaseEntries} users={users} settings={settings} currentUser={currentUser} mob={mob} />; }
    if (page === "settings") { if (!isTreasurer || previewAsId) { nav("dashboard"); return null; } return <SettingsPage settings={settings} users={users} currentUser={currentUser} allEntries={entries} allPurchases={purchaseEntries} onSaveSettings={saveSettings} onAddUser={addUser} onRemoveUser={removeUser} onUpdateRate={updateUserRate} />; }
    if (page === "insights") return (
      <div className="fade-in">
        <h2 style={{ ...S.h2, marginBottom: 8 }}>Community Insights</h2>
        <p style={{ margin: "0 0 24px", fontSize: 14, color: BRAND.textMuted }}>See how your HOA dollars are being put to work.</p>
        <CommunityInsights fetchStats={fetchCommunityStats} settings={settings} mob={mob} cachedStats={cachedInsightsStats} onStatsCached={setCachedInsightsStats} entries={entries} users={users} />
      </div>
    );
    return null;
  };

  // ══════════════════════════════════════════════════════════════════════════
  // MAIN LAYOUT
  // ══════════════════════════════════════════════════════════════════════════
  const PULL_THRESHOLD = 72;
  const onPullStart = (e) => {
    // Don't trigger pull if touch starts on the sticky header (first ~56px)
    if (window.scrollY === 0 && e.touches[0].clientY > 56) {
      pullStartY.current = e.touches[0].clientY;
    }
  };
  const onPullMove = (e) => {
    if (pullStartY.current === null || pullRefreshing) return;
    const dy = e.touches[0].clientY - pullStartY.current;
    if (dy > 0) setPullY(Math.min(dy * 0.4, PULL_THRESHOLD + 16));
  };
  const onPullEnd = async () => {
    if (pullY >= PULL_THRESHOLD && !pullRefreshing) {
      setPullRefreshing(true);
      setPullY(PULL_THRESHOLD);
      await refresh();
      setPullRefreshing(false);
    }
    setPullY(0);
    pullStartY.current = null;
  };
  const initials = (viewAs?.name || currentUser.name).split(" ").map(n => n[0]).join("");
  const isActive = (id) => page === id && !viewEntry && !editEntry && !newEntry && !viewPurchase && !editPurchase && !newPurchase;
  const members = users.filter(u => u.role === ROLES.MEMBER);

  // Preview mode banner — shown at top of content when Treasurer is previewing as Member
  const PreviewBanner = () => realIsTreasurer && previewAsId ? (
    <div role="alert" style={{ background: "#FFF8E1", borderBottom: "2px solid #F59E0B", padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, fontSize: 13, color: "#92400E", position: "sticky", top: mob ? 56 : 57, zIndex: 15 }}>
      <span>👁 Previewing as <strong>{viewAs?.name}</strong> — you're seeing Member view. Actions are disabled.</span>
      <button onClick={() => { setPreviewAsId(null); nav("dashboard"); }} style={{ background: "#F59E0B", color: "#fff", border: "none", borderRadius: 6, padding: "5px 12px", fontWeight: 700, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>Exit Preview</button>
    </div>
  ) : null;

  // ── CHANGE PASSWORD MODAL ────────────────────────────────────────────────
  const ChangePasswordModal = () => (
    <Modal open={showChangePass} onClose={() => { setShowChangePass(false); setCpCurrent(""); setCpNew(""); setCpConfirm(""); setCpError(""); setCpDone(false); }} title="Change Password">
      {cpDone ? (
        <div style={{ textAlign: "center", padding: "16px 0" }}>
          <div style={{ width: 44, height: 44, borderRadius: 22, background: BRAND.success + "15", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", color: BRAND.success }}><Icon name="check" size={22} /></div>
          <div style={{ fontSize: 16, fontWeight: 600, color: BRAND.navy, marginBottom: 6, fontFamily: BRAND.serif }}>Password changed!</div>
          <div style={{ fontSize: 13, color: BRAND.textMuted }}>Your new password is active.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={S.label}>Current Password</label>
            <input type="password" autoComplete="current-password" style={S.input} value={cpCurrent} onChange={e => { setCpCurrent(e.target.value); setCpError(""); }} placeholder="Your current password" autoFocus />
          </div>
          <div>
            <label style={S.label}>New Password</label>
            <input type="password" autoComplete="new-password" style={S.input} value={cpNew} onChange={e => { setCpNew(e.target.value); setCpError(""); }} placeholder="Min 6 characters" />
          </div>
          <div>
            <label style={S.label}>Confirm New Password</label>
            <input type="password" autoComplete="new-password" style={{ ...S.input, borderColor: cpError && cpNew !== cpConfirm ? BRAND.error : BRAND.border }} value={cpConfirm} onChange={e => { setCpConfirm(e.target.value); setCpError(""); }} placeholder="Repeat new password" />
          </div>
          {cpError && <div style={{ color: BRAND.error, fontSize: 13, display: "flex", alignItems: "flex-start", gap: 6 }}><Icon name="alert" size={14} /><span>{cpError}</span></div>}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 4 }}>
            <button style={S.btnSecondary} onClick={() => { setShowChangePass(false); setCpCurrent(""); setCpNew(""); setCpConfirm(""); setCpError(""); }}>Cancel</button>
            <button style={{ ...S.btnPrimary, opacity: cpLoading ? 0.6 : 1 }} disabled={cpLoading} onClick={handleChangePassword}>{cpLoading ? "Updating..." : "Update Password"}</button>
          </div>
        </div>
      )}
    </Modal>
  );

  if (mob) {
    return (
      <div style={{ minHeight: "100vh", fontFamily: BRAND.sans, background: BRAND.bgSoft, color: BRAND.charcoal, paddingBottom: 88 }} onTouchStart={onPullStart} onTouchMove={onPullMove} onTouchEnd={onPullEnd}>
        <a href="#main-content" className="skip-link">Skip to main content</a>
        {/* Mobile top bar */}
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: BRAND.navy, position: "fixed", top: 0, left: 0, right: 0, zIndex: 20 }} role="banner">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/logo.png" alt="24 Mill Street logo" style={{ width: 32, height: 32, borderRadius: 4, objectFit: "cover", background: BRAND.beige }} />
            <span style={{ fontFamily: BRAND.serif, fontWeight: 600, fontSize: 16, color: "#fff" }}>24 Mill</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {isTreasurer && (
              <button style={{ background: "none", border: "none", color: "#fff", padding: 6, cursor: "pointer", position: "relative", minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={(e) => { e.stopPropagation(); setShowNotifPanel(p => !p); }} aria-label={"Notifications" + (pendingCount > 0 ? ", " + pendingCount + " pending" : "")}>
                <Icon name="bell" size={22} />
                {pendingCount > 0 && <span aria-hidden="true" style={{ position: "absolute", top: 2, right: 2, background: "#EF4444", color: "#fff", fontSize: 9, fontWeight: 700, width: 16, height: 16, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid " + BRAND.navy }}>{pendingCount}</span>}
              </button>
            )}
            <button style={{ background: "none", border: "none", color: "#fff", padding: 4, cursor: "pointer", minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setDrawerOpen(true)} aria-label="Open navigation menu"><Icon name="menu" size={24} /></button>
          </div>
        </header>
        {/* Notification panel */}
        {showNotifPanel && isTreasurer && <NotificationPanel entries={entries} purchaseEntries={purchaseEntries} users={users} settings={settings} onView={(e) => { setShowNotifPanel(false); setViewEntry(e); }} onViewPurchase={(e) => { setShowNotifPanel(false); setViewPurchase(e); }} onClose={() => setShowNotifPanel(false)} onReviewAll={() => { setShowNotifPanel(false); nav("review"); }} mob={mob} />}
        {/* Slide-out drawer */}
        {drawerOpen && (
          <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.4)", touchAction: "none" }} onClick={() => setDrawerOpen(false)} aria-hidden="true">
            <div role="dialog" aria-label="Navigation menu" style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 280, background: BRAND.navy, padding: "20px 16px", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                <span style={{ fontFamily: BRAND.serif, fontWeight: 600, fontSize: 18, color: "#fff" }}>Menu</span>
                <button aria-label="Close menu" style={{ background: "none", border: "none", color: "#9B978F", cursor: "pointer", padding: 8, minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setDrawerOpen(false)}><Icon name="x" size={24} /></button>
              </div>
              <div style={{ padding: "12px 8px", borderRadius: 8, background: "rgba(255,255,255,0.06)", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
                <div aria-hidden="true" style={{ width: 36, height: 36, borderRadius: 6, background: isTreasurer ? BRAND.brick : BRAND.green, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff" }}>{initials}</div>
                <div><div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{currentUser.name}</div><div style={{ fontSize: 13, color: "#7A766E" }}>{realIsTreasurer && previewAsId ? "👁 Previewing as Member" : currentUser.role}</div></div>
              </div>
              {navItems.map(item => (
                <button key={item.id} aria-current={isActive(item.id) ? "page" : undefined} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 12px", borderRadius: 6, fontSize: 15, fontWeight: isActive(item.id) ? 600 : 400, background: isActive(item.id) ? "rgba(255,255,255,0.1)" : "transparent", color: isActive(item.id) ? "#fff" : "#9B978F", cursor: "pointer", border: "none", width: "100%", textAlign: "left", fontFamily: BRAND.sans, marginBottom: 2 }} onClick={() => nav(item.id)}>
                  <Icon name={item.icon} size={20} /><span style={{ flex: 1 }}>{item.label}</span>
                  {item.badge > 0 && <span aria-label={item.badge + " pending"} style={{ background: BRAND.brick, color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10 }}>{item.badge}</span>}
                </button>
              ))}
              <div style={{ flex: 1 }} />
              {realIsTreasurer && members.length > 0 && (
                <div style={{ padding: "12px 8px", borderRadius: 8, background: "rgba(255,255,255,0.06)", marginBottom: 8 }}>
                  <div style={{ fontSize: 11, color: "#7A766E", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Preview as Member</div>
                  <select
                    style={{ width: "100%", background: "rgba(255,255,255,0.08)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, padding: "7px 10px", fontSize: 13, fontFamily: BRAND.sans, cursor: "pointer" }}
                    value={previewAsId || ""}
                    onChange={e => { const v = e.target.value; setPreviewAsId(v || null); if (v) { setDrawerOpen(false); nav("dashboard"); } }}
                  >
                    <option value="">— Treasurer view —</option>
                    {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              )}
              <button style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 6, fontSize: 14, background: "transparent", color: "#9B978F", cursor: "pointer", border: "none", width: "100%", textAlign: "left", fontFamily: BRAND.sans }} onClick={() => { setDrawerOpen(false); setShowChangePass(true); }}>🔒 Change Password</button>
              <button style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 12px", borderRadius: 6, fontSize: 15, background: "transparent", color: "#9B978F", cursor: "pointer", border: "none", width: "100%", textAlign: "left", fontFamily: BRAND.sans }} onClick={handleLogout}><Icon name="logout" size={20} /> Sign Out</button>
            </div>
          </div>
        )}
        {/* Offline banner */}
        {!online && <div role="alert" style={{ background: "#FFF3E0", borderBottom: "1px solid #FFB74D", padding: "8px 16px", display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#E65100" }}><Icon name="wifiOff" size={16} /><span>You're offline. Viewing cached data.</span></div>}
        {/* Content */}
        {/* Pull-to-refresh indicator */}
        {(pullY > 0 || pullRefreshing) && (
          <div style={{ position: "fixed", top: 56, left: 0, right: 0, zIndex: 19, display: "flex", alignItems: "center", justifyContent: "center", height: Math.max(pullY, pullRefreshing ? 40 : 0), overflow: "hidden", transition: pullRefreshing ? "none" : "height 200ms ease", background: BRAND.bgSoft, borderBottom: "1px solid " + BRAND.borderLight }}>
            <div style={{ fontSize: 13, color: BRAND.textMuted, display: "flex", alignItems: "center", gap: 6 }}>
              {pullRefreshing ? "↻ Refreshing..." : pullY >= PULL_THRESHOLD ? "↑ Release to refresh" : "↓ Pull to refresh"}
            </div>
          </div>
        )}
        <PreviewBanner />
        <main id="main-content" style={{ padding: "16px 16px", paddingTop: 72 }}><div key={page} className="page-enter">{renderPage()}</div></main>
        {/* FAB */}
        {!newEntry && !editEntry && !viewEntry && !newPurchase && !editPurchase && !viewPurchase && (page === "dashboard" || page === "entries") && (
          <>
            {newEntryType === "chooser" && <div style={{ position: "fixed", inset: 0, zIndex: 14, background: "rgba(0,0,0,0.3)" }} onClick={() => setNewEntryType(null)} />}
            {newEntryType === "chooser" && (
              <div style={{ position: "fixed", bottom: 230, right: 20, zIndex: 16, background: BRAND.white, borderRadius: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.18)", overflow: "hidden", minWidth: 200 }}>
                <button style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", width: "100%", border: "none", background: "none", cursor: "pointer", fontFamily: BRAND.sans, fontSize: 14, color: BRAND.charcoal, textAlign: "left" }} onClick={() => { setNewEntryType(null); setNewEntry(true); }}>
                  <span style={{ fontSize: 20 }}>🔨</span><div><div style={{ fontWeight: 600 }}>Work Entry</div><div style={{ fontSize: 11, color: BRAND.textLight }}>Log hours & tasks</div></div>
                </button>
                <div style={{ borderTop: "1px solid " + BRAND.borderLight }} />
                <button style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", width: "100%", border: "none", background: "none", cursor: "pointer", fontFamily: BRAND.sans, fontSize: 14, color: BRAND.charcoal, textAlign: "left" }} onClick={() => { setNewEntryType(null); setNewPurchase(true); }}>
                  <span style={{ fontSize: 20 }}>🛍️</span><div><div style={{ fontWeight: 600 }}>Purchase Entry</div><div style={{ fontSize: 11, color: BRAND.textLight }}>Log expenses & receipts</div></div>
                </button>
              </div>
            )}
            <button aria-label="Create new entry" style={{ position: "fixed", bottom: 160, right: 20, width: 56, height: 56, borderRadius: 28, background: BRAND.brick, color: "#fff", border: "none", boxShadow: "0 4px 16px rgba(142,59,46,0.35)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 15, transform: newEntryType === "chooser" ? "rotate(45deg)" : "none", transition: "transform 200ms" }} onClick={() => setNewEntryType(t => t === "chooser" ? null : "chooser")}>
              <Icon name="plus" size={24} />
            </button>
          </>
        )}
        {/* More bottom sheet */}
        {moreSheetOpen && (
          <MoreSheet onClose={() => setMoreSheetOpen(false)} trashCount={trashCount} nav={nav} />
        )}
        <ChangePasswordModal />
        {showHelp && <HelpModal onClose={() => setShowHelp(false)} isTreasurer={isTreasurer} mob={mob} hoaName={settings?.hoaName || "24 Mill Street HOA"} />}
        {/* Toast notification */}
        {toast && (
          <div className="toast-enter" role="status" aria-live="polite" style={{ position: "fixed", bottom: 96, left: 16, right: 16, zIndex: 50, background: toast.type === "success" ? "#065F46" : toast.type === "error" ? "#991B1B" : BRAND.navy, color: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.25)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 18px" }}>
              <span style={{ fontSize: 20 }}>{toast.type === "success" ? "✅" : toast.type === "error" ? "❌" : "ℹ️"}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{toast.message}</div>
                {toast.detail && <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>{toast.detail}</div>}
              </div>
              {undoStack.length > 0 && (
                <button onClick={popUndo} style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", borderRadius: 6, padding: "4px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: BRAND.sans, whiteSpace: "nowrap", flexShrink: 0 }}>Undo</button>
              )}
              <button onClick={() => setToast(null)} aria-label="Dismiss" style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "0 0 0 4px", flexShrink: 0 }}>×</button>
            </div>
            {/* Undo countdown bar */}
            {undoStack.length > 0 && (
              <div style={{ height: 3, background: "rgba(255,255,255,0.15)", position: "relative" }}>
                <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.55)", animation: "undoBar 6000ms linear forwards", transformOrigin: "left" }} />
              </div>
            )}
          </div>
        )}
        {/* Bottom tab bar */}
        <nav aria-label="Main navigation" style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: BRAND.white, borderTop: "1px solid " + BRAND.border, display: "flex", zIndex: 20, paddingBottom: "env(safe-area-inset-bottom)", boxShadow: "0 -2px 16px rgba(0,0,0,0.08)" }}>
          {bottomTabs.map(t => {
            const active = isActive(t.id);
            return (
            <button key={t.id} aria-label={t.label + (t.badge > 0 ? ", " + t.badge + " items" : "")} aria-current={active ? "page" : undefined} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "14px 4px 12px", background: "none", border: "none", cursor: "pointer", color: active ? t.color : BRAND.textLight, fontFamily: BRAND.sans, fontSize: 11, fontWeight: active ? 700 : 500, position: "relative", transition: "color 200ms" }} onClick={() => t.id === "__more__" ? setMoreSheetOpen(true) : nav(t.id)}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 56, height: 36, borderRadius: 18, background: active ? t.tint : "transparent", transition: "background 250ms" }}>
                <Icon name={active ? t.iconFilled : t.icon} size={28} />
              </div>
              <span aria-hidden="true" style={{ transition: "color 200ms" }}>{t.label}</span>
              {t.badge > 0 && <span aria-hidden="true" style={{ position: "absolute", top: 6, right: "50%", marginRight: -26, background: BRAND.brick, color: "#fff", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 10, minWidth: 18, textAlign: "center", boxShadow: "0 1px 4px rgba(142,59,46,0.3)" }}>{t.badge}</span>}
            </button>
          );})}
        </nav>
      </div>
    );
  }

  // ── DESKTOP LAYOUT ─────────────────────────────────────────────────────
  return (
    <div style={S.app}>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <aside style={S.sidebar} aria-label="Sidebar navigation">
        <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img src="/logo.png" alt="24 Mill Street logo" style={{ width: 40, height: 40, borderRadius: 6, objectFit: "cover", background: BRAND.beige }} />
            <div>
              <div style={{ fontFamily: BRAND.serif, fontWeight: 600, fontSize: 17, color: "#FFFFFF", lineHeight: 1.2 }}>24 Mill</div>
              <div style={{ fontSize: 12, color: "#7A766E", letterSpacing: "0.02em" }}>Log Your Work</div>
            </div>
          </div>
        </div>
        <nav aria-label="Main navigation" style={{ padding: "12px 12px", flex: 1 }}>
          {navItems.map(item => (
            <button key={item.id} aria-current={isActive(item.id) ? "page" : undefined} style={S.navItem(isActive(item.id))} onClick={() => nav(item.id)}>
              <Icon name={item.icon} size={18} /><span style={{ flex: 1 }}>{item.label}</span>
              {item.badge > 0 && <span aria-label={item.badge + " pending"} style={{ background: BRAND.brick, color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10 }}>{item.badge}</span>}
            </button>
          ))}
        </nav>
        <div style={{ padding: "16px 12px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,0.06)", marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
            <div aria-hidden="true" style={{ width: 32, height: 32, borderRadius: 6, background: realIsTreasurer ? BRAND.brick : BRAND.green, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff" }}>{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{currentUser.name}</div>
              <div style={{ fontSize: 12, color: "#7A766E", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{realIsTreasurer && previewAsId ? "👁 Previewing as Member" : currentUser.role}</div>
            </div>
          </div>
          {realIsTreasurer && members.length > 0 && (
            <div style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 10, color: "#6B6560", marginBottom: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", paddingLeft: 4 }}>Preview as Member</div>
              <select
                style={{ width: "100%", background: "rgba(255,255,255,0.08)", color: previewAsId ? "#F59E0B" : "#9B978F", border: "1px solid " + (previewAsId ? "#F59E0B" : "rgba(255,255,255,0.12)"), borderRadius: 6, padding: "7px 10px", fontSize: 12, fontFamily: BRAND.sans, cursor: "pointer" }}
                value={previewAsId || ""}
                onChange={e => { const v = e.target.value; setPreviewAsId(v || null); if (v) nav("dashboard"); }}
              >
                <option value="">— Treasurer view —</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          )}
          <button style={{ ...S.navItem(false), padding: "7px 12px", fontSize: 12, color: "#7A766E" }} onClick={() => setShowChangePass(true)}>🔒 Change Password</button>
          <button style={{ ...S.navItem(false), padding: "8px 12px", fontSize: 13 }} onClick={handleLogout}><Icon name="logout" size={16} /> Sign Out</button>
        </div>
      </aside>
      <div style={S.main}>
        <header style={S.header} role="banner">
          <span style={{ fontSize: 14, color: BRAND.textMuted }}>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 12, position: "relative" }}>
            {isTreasurer && (
              <button aria-label={"Notifications" + (pendingCount > 0 ? ", " + pendingCount + " pending" : "")} style={{ background: "none", border: "none", color: BRAND.charcoal, padding: 6, cursor: "pointer", position: "relative", borderRadius: 8, minWidth: 36, minHeight: 36, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={(e) => { e.stopPropagation(); setShowNotifPanel(p => !p); }}>
                <Icon name="bell" size={20} />
                {pendingCount > 0 && <span aria-hidden="true" style={{ position: "absolute", top: 2, right: 2, background: "#EF4444", color: "#fff", fontSize: 9, fontWeight: 700, width: 16, height: 16, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>{pendingCount}</span>}
              </button>
            )}
            <span style={{ fontSize: 14, fontWeight: 500, color: BRAND.charcoal }}>{currentUser.name}{realIsTreasurer && previewAsId ? <span style={{ fontSize: 11, color: "#92400E", background: "#FFF8E1", border: "1px solid #F59E0B", borderRadius: 4, padding: "1px 6px", marginLeft: 6 }}>👁 preview</span> : null}</span>
            <RoleBadge role={realIsTreasurer && !previewAsId ? currentUser.role : ROLES.MEMBER} />
            {showNotifPanel && isTreasurer && <NotificationPanel entries={entries} purchaseEntries={purchaseEntries} users={users} settings={settings} onView={(e) => { setShowNotifPanel(false); setViewEntry(e); }} onViewPurchase={(e) => { setShowNotifPanel(false); setViewPurchase(e); }} onClose={() => setShowNotifPanel(false)} onReviewAll={() => { setShowNotifPanel(false); nav("review"); }} mob={mob} />}
          </div>
        </header>
        {!online && <div role="alert" style={{ background: "#FFF3E0", borderBottom: "1px solid #FFB74D", padding: "10px 32px", display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#E65100" }}><Icon name="wifiOff" size={16} /><span>You're offline. Viewing cached data — changes require an internet connection.</span></div>}
        <PreviewBanner />
        <main id="main-content" style={S.content}><div key={page} className="page-enter">{renderPage()}</div></main>
        <ChangePasswordModal />
        {showHelp && <HelpModal onClose={() => setShowHelp(false)} isTreasurer={isTreasurer} mob={mob} hoaName={settings?.hoaName || "24 Mill Street HOA"} />}
        {toast && (
          <div className="toast-enter" role="status" aria-live="polite" style={{ position: "fixed", bottom: 24, right: 24, zIndex: 50, background: toast.type === "success" ? "#065F46" : toast.type === "error" ? "#991B1B" : BRAND.navy, color: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.25)", maxWidth: 420 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 20px" }}>
              <span style={{ fontSize: 20 }}>{toast.type === "success" ? "✅" : toast.type === "error" ? "❌" : "ℹ️"}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{toast.message}</div>
                {toast.detail && <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>{toast.detail}</div>}
              </div>
              {undoStack.length > 0 && (
                <button onClick={popUndo} style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", borderRadius: 6, padding: "4px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: BRAND.sans, whiteSpace: "nowrap", flexShrink: 0 }}>Undo</button>
              )}
              <button onClick={() => setToast(null)} aria-label="Dismiss" style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "0 0 0 4px", flexShrink: 0 }}>×</button>
            </div>
            {undoStack.length > 0 && (
              <div style={{ height: 3, background: "rgba(255,255,255,0.15)", position: "relative" }}>
                <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.55)", animation: "undoBar 6000ms linear forwards" }} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
