import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient";

// Maps DB row → app shape
function mapEntry(row) {
  return {
    id: row.id,
    userId: row.user_id,
    date: row.date,
    startTime: row.start_time?.slice(0, 5) || "",
    endTime: row.end_time?.slice(0, 5) || "",
    category: row.category,
    description: row.description,
    location: row.location || "",
    mileage: row.mileage || "",
    materials: row.materials || [],
    preImages: row.pre_images || [],
    postImages: row.post_images || [],
    notes: row.notes || "",
    status: row.status,
    reviewerNotes: row.reviewer_notes || "",
    reviewedAt: row.reviewed_at || "",
    submittedAt: row.submitted_at || "",
    paidAt: row.paid_at || "",
    auditLog: row.audit_log || [],
    comments: row.comments || [],
    secondApproverId: row.second_approver_id || null,
    secondApprovedAt: row.second_approved_at || "",
    createdAt: row.created_at,
  };
}

// Maps DB row → app shape for purchase entries
function mapPurchaseEntry(row) {
  return {
    id: row.id,
    entryType: "purchase",
    userId: row.user_id,
    date: row.date,
    storeName: row.store_name,
    category: row.category,
    description: row.description || "",
    status: row.status,
    items: row.items || [],
    subtotal: Number(row.subtotal) || 0,
    tax: Number(row.tax) || 0,
    total: Number(row.total) || 0,
    mileage: row.mileage || "",
    mileageRate: row.mileage_rate ? Number(row.mileage_rate) : null,
    mileageTotal: row.mileage_total ? Number(row.mileage_total) : 0,
    paymentMethod: row.payment_method || "",
    receiptUrls: row.receipt_urls || [],
    photoUrls: row.photo_urls || [],
    notes: row.notes || "",
    reviewerNotes: row.reviewer_notes || "",
    reviewedBy: row.reviewed_by || null,
    reviewedAt: row.reviewed_at || "",
    submittedAt: row.submitted_at || "",
    paidAt: row.paid_at || "",
    auditLog: row.audit_log || [],
    createdAt: row.created_at,
  };
}

function mapProfile(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    hourlyRate: row.hourly_rate ? Number(row.hourly_rate) : null,
    lastActiveAt: row.last_active_at || null,
  };
}

function mapSettings(row) {
  return {
    hoaName: row.hoa_name,
    defaultHourlyRate: Number(row.default_hourly_rate),
    currency: row.currency,
    inviteCode: row.invite_code || "",
    inviteExpiresAt: row.invite_expires_at || null,
    annualBudget: Number(row.annual_budget) || 0,
    dualApprovalThreshold: Number(row.dual_approval_threshold) || 0,
    mileageRate: row.mileage_rate != null ? Number(row.mileage_rate) : 0.725,
    branding: row.branding || null,
  };
}

export function useSupabase() {
  const [session, setSession] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [entries, setEntries] = useState([]);
  const [purchaseEntries, setPurchaseEntries] = useState([]);
  const [settings, setSettings] = useState({ hoaName: "24 Mill Street", defaultHourlyRate: 40, currency: "USD", inviteCode: "", inviteExpiresAt: null, mileageRate: 0.725, branding: null });
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  // ── AUTH ────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === "PASSWORD_RECOVERY") {
        setPasswordRecovery(true);
      }
      if (!session) { setCurrentUser(null); setLoading(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  // When session changes, load profile + all data
  useEffect(() => {
    if (!session?.user) return;
    loadAll(session.user.id);
  }, [session?.user?.id]);

  async function loadAll(userId) {
    setLoading(true);
    try {
      // Load current user profile
      const { data: profile } = await supabase
        .from("profiles").select("*").eq("id", userId).single();
      if (profile) setCurrentUser(mapProfile(profile));

      // Update last-active timestamp (fire-and-forget)
      supabase.from("profiles").update({ last_active_at: new Date().toISOString() }).eq("id", userId).then(() => {});

      // Load all profiles (for member names in entries)
      const { data: allProfiles } = await supabase.from("profiles").select("*");
      if (allProfiles) setUsers(allProfiles.map(mapProfile));

      // Load entries (RLS handles visibility)
      const { data: allEntries } = await supabase
        .from("entries").select("*").order("date", { ascending: false });
      if (allEntries) setEntries(allEntries.map(mapEntry));

      // Load purchase entries (RLS handles visibility)
      const { data: allPurchases } = await supabase
        .from("purchase_entries").select("*").order("date", { ascending: false });
      if (allPurchases) setPurchaseEntries(allPurchases.map(mapPurchaseEntry));

      // Load settings
      const { data: settingsRow } = await supabase
        .from("settings").select("*").eq("id", 1).single();
      if (settingsRow) setSettings(mapSettings(settingsRow));
    } catch (err) {
      console.error("Load error:", err);
    }
    setLoading(false);
  }

  // ── REAL-TIME ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!session?.user) return;
    const channel = supabase
      .channel("entries-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "entries" }, (payload) => {
        if (payload.eventType === "INSERT") {
          setEntries(prev => {
            if (prev.find(e => e.id === payload.new.id)) return prev;
            return [mapEntry(payload.new), ...prev];
          });
        } else if (payload.eventType === "UPDATE") {
          setEntries(prev => prev.map(e => e.id === payload.new.id ? mapEntry(payload.new) : e));
        } else if (payload.eventType === "DELETE") {
          setEntries(prev => prev.filter(e => e.id !== payload.old.id));
        }
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [session?.user?.id]);

  // Real-time for purchase entries
  useEffect(() => {
    if (!session?.user) return;
    const channel = supabase
      .channel("purchase-entries-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "purchase_entries" }, (payload) => {
        if (payload.eventType === "INSERT") {
          setPurchaseEntries(prev => {
            if (prev.find(e => e.id === payload.new.id)) return prev;
            return [mapPurchaseEntry(payload.new), ...prev];
          });
        } else if (payload.eventType === "UPDATE") {
          setPurchaseEntries(prev => prev.map(e => e.id === payload.new.id ? mapPurchaseEntry(payload.new) : e));
        } else if (payload.eventType === "DELETE") {
          setPurchaseEntries(prev => prev.filter(e => e.id !== payload.old.id));
        }
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [session?.user?.id]);

  // ── LOGIN / LOGOUT ─────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    setAuthError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message.includes("Invalid login")) setAuthError("Incorrect email or password.");
      else setAuthError(error.message);
      return false;
    }
    return true;
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setUsers([]);
    setEntries([]);
    setPurchaseEntries([]);
  }, []);

  const register = useCallback(async (name, email, password, inviteCode) => {
    setAuthError("");
    // Validate invite code server-side
    const { data: valid, error: valErr } = await supabase.rpc("validate_invite_code", { code: inviteCode });
    if (valErr || !valid) {
      const msg = "Invalid invite code. Ask your HOA Treasurer for the correct code.";
      setAuthError(msg);
      return { error: msg };
    }
    // Create the account
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, role: "Member" } },
    });
    if (error) {
      let msg = error.message;
      if (msg.includes("Signups not allowed") || msg.includes("not allowed")) {
        msg = "Registration is currently disabled. Your HOA Treasurer needs to enable email signups in Supabase Dashboard → Authentication → Providers → Email.";
      } else if (msg.includes("already registered") || msg.includes("already been registered")) {
        msg = "This email is already registered. Try signing in instead, or use 'Forgot Password' to reset your credentials.";
      }
      setAuthError(msg);
      return { error: msg };
    }
    return { user: data.user };
  }, []);

  const resetPassword = useCallback(async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/?reset=1",
    });
    if (error) return { error: error.message };
    return { ok: true };
  }, []);

  const changePassword = useCallback(async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { error: error.message };
    return { ok: true };
  }, []);

  // ── ENTRIES ────────────────────────────────────────────────────────────
  // Helper: append to audit log (JSONB on entry row — backward-compatible)
  const appendAuditLog = (existingLog, action, details, changes) => {
    const user = currentUser || {};
    return [...(existingLog || []), {
      action,
      by: user.id || "system",
      byName: user.name || "System",
      at: new Date().toISOString(),
      details: details || null,
      changes: changes || null,   // array of { field, from, to }
    }];
  };

  // Server-side audit event (writes to audit_events table if it exists)
  const logAuditEvent = async (entryId, entryType, action, details, changes) => {
    try {
      await supabase.from("audit_events").insert({
        entry_id: entryId,
        entry_type: entryType || "work", // "work" | "purchase"
        action,
        actor_id: currentUser?.id || null,
        actor_name: currentUser?.name || "System",
        details: details || null,
        changes: changes || null,
        created_at: new Date().toISOString(),
      });
    } catch {
      // Table may not exist yet — silently fall back to JSONB-only
    }
  };

  // Produce a human-readable diff between old DB row and new formData
  const diffEntry = (old, form) => {
    const changes = [];
    const fmtTime = (t) => t ? t.slice(0, 5) : "—";
    const fmtMat  = (m) => m?.length ? m.map(x => x.name || "item").join(", ") : "none";
    const checks = [
      { field: "Date",        from: old.date,                  to: form.date },
      { field: "Start time",  from: fmtTime(old.start_time),   to: fmtTime(form.startTime) },
      { field: "End time",    from: fmtTime(old.end_time),      to: fmtTime(form.endTime) },
      { field: "Category",    from: old.category,               to: form.category },
      { field: "Description", from: old.description,            to: form.description },
      { field: "Location",    from: old.location || "",          to: form.location || "" },
      { field: "Mileage",     from: String(old.mileage || ""),  to: String(form.mileage || "") },
      { field: "Notes",       from: old.notes || "",             to: form.notes || "" },
      { field: "Materials",
        from: fmtMat(old.materials),
        to:   fmtMat(form.materials),
        skip: JSON.stringify(old.materials || []) === JSON.stringify(form.materials || []) },
    ];
    for (const c of checks) {
      if (c.skip) continue;
      const f = String(c.from ?? "").trim();
      const t = String(c.to   ?? "").trim();
      if (f !== t) changes.push({ field: c.field, from: f || "—", to: t || "—" });
    }
    return changes;
  };

  const saveEntry = useCallback(async (formData, existingId) => {
    const row = {
      user_id: formData.userId,
      date: formData.date,
      start_time: formData.startTime,
      end_time: formData.endTime,
      category: formData.category,
      description: formData.description,
      location: formData.location || null,
      mileage: formData.mileage ? Number(formData.mileage) : null,
      materials: formData.materials || [],
      pre_images: formData.preImages || [],
      post_images: formData.postImages || [],
      notes: formData.notes || null,
      status: formData.status,
      ...(formData.status === "Submitted" ? { submitted_at: new Date().toISOString() } : {}),
    };

    if (existingId) {
      const { data: current } = await supabase
        .from("entries")
        .select("audit_log, status, date, start_time, end_time, category, description, location, mileage, notes, materials")
        .eq("id", existingId).single();

      const statusChanged = formData.status !== current?.status;
      const action = formData.status === "Submitted" ? "Submitted for review"
                   : formData.status === "Draft"     ? "Draft saved"
                   : "Entry edited";
      const details = statusChanged ? "Status: " + current?.status + " → " + formData.status : null;
      const changes = statusChanged ? null : diffEntry(current || {}, formData);

      row.audit_log = appendAuditLog(current?.audit_log, action, details, changes?.length ? changes : null);

      const { data, error } = await supabase
        .from("entries").update(row).eq("id", existingId).select().single();
      if (error) { console.error("Update error:", error); return { error: error.message }; }
      logAuditEvent(existingId, "work", action, details, changes?.length ? changes : null);
      const mapped = mapEntry(data);
      setEntries(prev => prev.map(e => e.id === existingId ? mapped : e));
      return mapped;
    } else {
      // New entry — record all initial field values
      const initChanges = [
        { field: "Date",        from: "—", to: formData.date || "—" },
        { field: "Category",    from: "—", to: formData.category || "—" },
        { field: "Start time",  from: "—", to: formData.startTime ? formData.startTime.slice(0,5) : "—" },
        { field: "End time",    from: "—", to: formData.endTime   ? formData.endTime.slice(0,5)   : "—" },
        { field: "Description", from: "—", to: formData.description || "—" },
        ...(formData.location ? [{ field: "Location", from: "—", to: formData.location }] : []),
        ...(formData.mileage  ? [{ field: "Mileage",  from: "—", to: String(formData.mileage) }] : []),
        ...(formData.materials?.length ? [{ field: "Materials", from: "—", to: formData.materials.map(m => m.name).join(", ") }] : []),
      ];
      row.audit_log = appendAuditLog([], "Entry created", null, initChanges);
      const { data, error } = await supabase
        .from("entries").insert(row).select().single();
      if (error) { console.error("Insert error:", error); return { error: error.message }; }
      logAuditEvent(data.id, "work", "Entry created", null, initChanges);
      const mapped = mapEntry(data);
      setEntries(prev => [mapped, ...prev]);
      return mapped;
    }
  }, [currentUser]);

  const deleteEntry = useCallback(async (id) => {
    const { error } = await supabase.from("entries").delete().eq("id", id);
    if (error) { console.error("Delete error:", error); return false; }
    setEntries(prev => prev.filter(e => e.id !== id));
    return true;
  }, []);

  const approveEntry = useCallback(async (id, reviewerNotes) => {
    const { data: current } = await supabase.from("entries").select("audit_log").eq("id", id).single();
    const log = appendAuditLog(current?.audit_log, "Approved",
      reviewerNotes ? "Notes: " + reviewerNotes : null,
      [{ field: "Status", from: current?.status || "Submitted", to: "Approved" },
       ...(reviewerNotes ? [{ field: "Reviewer note", from: "—", to: reviewerNotes }] : [])]);
    const { data, error } = await supabase.from("entries").update({
      status: "Approved", reviewer_notes: reviewerNotes || null, reviewed_at: new Date().toISOString(), audit_log: log,
    }).eq("id", id).select().single();
    if (error) { console.error("Approve error:", error); return null; }
    logAuditEvent(id, "work", "Approved", reviewerNotes || null, null);
    const mapped = mapEntry(data);
    setEntries(prev => prev.map(e => e.id === id ? mapped : e));
    return mapped;
  }, [currentUser]);

  // First approval when dual approval is required — sets to "Awaiting 2nd Approval"
  const firstApprove = useCallback(async (id, reviewerNotes, thresholdInfo) => {
    const { data: current } = await supabase.from("entries").select("audit_log").eq("id", id).single();
    const log = appendAuditLog(current?.audit_log, "First approval",
      thresholdInfo,
      [{ field: "Status", from: current?.status || "Submitted", to: "Awaiting 2nd Approval" },
       ...(reviewerNotes ? [{ field: "Reviewer note", from: "—", to: reviewerNotes }] : [])]);
    const { data, error } = await supabase.from("entries").update({
      status: "Awaiting 2nd Approval", reviewer_notes: reviewerNotes || null, reviewed_at: new Date().toISOString(), audit_log: log,
    }).eq("id", id).select().single();
    if (error) { console.error("FirstApprove error:", error); return null; }
    const mapped = mapEntry(data);
    setEntries(prev => prev.map(e => e.id === id ? mapped : e));
    return mapped;
  }, [currentUser]);

  const secondApprove = useCallback(async (id) => {
    const { data: current } = await supabase.from("entries").select("audit_log").eq("id", id).single();
    const log = appendAuditLog(current?.audit_log, "Second approval granted", "Dual approval complete",
      [{ field: "Status", from: "Awaiting 2nd Approval", to: "Approved" }]);
    const { data, error } = await supabase.from("entries").update({
      status: "Approved", second_approver_id: session?.user?.id, second_approved_at: new Date().toISOString(), audit_log: log,
    }).eq("id", id).select().single();
    if (error) { console.error("SecondApprove error:", error); return null; }
    const mapped = mapEntry(data);
    setEntries(prev => prev.map(e => e.id === id ? mapped : e));
    return mapped;
  }, [currentUser, session]);

  const rejectEntry = useCallback(async (id, reviewerNotes) => {
    const { data: current } = await supabase.from("entries").select("audit_log").eq("id", id).single();
    const log = appendAuditLog(current?.audit_log, "Declined",
      null,
      [{ field: "Status", from: current?.status || "Submitted", to: "Rejected" },
       { field: "Reason", from: "—", to: reviewerNotes || "No reason given" }]);
    const { data, error } = await supabase.from("entries").update({
      status: "Rejected", reviewer_notes: reviewerNotes || null, reviewed_at: new Date().toISOString(), audit_log: log,
    }).eq("id", id).select().single();
    if (error) { console.error("Reject error:", error); return null; }
    logAuditEvent(id, "work", "Declined", reviewerNotes || null, null);
    const mapped = mapEntry(data);
    setEntries(prev => prev.map(e => e.id === id ? mapped : e));
    return mapped;
  }, [currentUser]);

  const needsInfoEntry = useCallback(async (id, reviewerNotes) => {
    const { data: current } = await supabase.from("entries").select("audit_log, status").eq("id", id).single();
    const log = appendAuditLog(current?.audit_log, "Needs Info",
      null,
      [{ field: "Status", from: current?.status || "Submitted", to: "Needs Info" },
       { field: "Reviewer note", from: "—", to: reviewerNotes || "No details given" }]);
    const { data, error } = await supabase.from("entries").update({
      status: "Needs Info", reviewer_notes: reviewerNotes || null, reviewed_at: new Date().toISOString(), audit_log: log,
    }).eq("id", id).select().single();
    if (error) { console.error("NeedsInfo error:", error); return null; }
    const mapped = mapEntry(data);
    setEntries(prev => prev.map(e => e.id === id ? mapped : e));
    return mapped;
  }, [currentUser]);

  const bulkApprove = useCallback(async (ids) => {
    const results = [];
    for (const id of ids) {
      const { data: current } = await supabase.from("entries").select("audit_log, status").eq("id", id).single();
      const log = appendAuditLog(current?.audit_log, "Approved (bulk)", null,
        [{ field: "Status", from: current?.status || "Submitted", to: "Approved" }]);
      const { data, error } = await supabase.from("entries").update({
        status: "Approved", reviewer_notes: null, reviewed_at: new Date().toISOString(), audit_log: log,
      }).eq("id", id).select().single();
      if (!error && data) {
        const mapped = mapEntry(data);
        setEntries(prev => prev.map(e => e.id === id ? mapped : e));
        results.push(mapped);
      }
    }
    return results;
  }, [currentUser]);

  const trashEntry = useCallback(async (id, comment, action) => {
    const { data: current } = await supabase.from("entries").select("audit_log").eq("id", id).single();
    const { data: currentFull } = await supabase.from("entries").select("status").eq("id", id).single();
    const log = appendAuditLog(current?.audit_log, action || "Moved to Trash",
      null,
      [{ field: "Status", from: currentFull?.status || "—", to: "Trash" },
       ...(comment ? [{ field: "Reason", from: "—", to: comment }] : [])]);
    const { data, error } = await supabase.from("entries").update({
      status: "Trash",
      reviewer_notes: comment || null,
      reviewed_at: new Date().toISOString(),
      audit_log: log,
    }).eq("id", id).select().single();
    if (error) { console.error("TrashEntry error:", error); return null; }
    const mapped = mapEntry(data);
    setEntries(prev => prev.map(e => e.id === id ? mapped : e));
    return mapped;
  }, [currentUser]);

  const restoreEntry = useCallback(async (id, previousStatus) => {
    const { data: current } = await supabase.from("entries").select("audit_log").eq("id", id).single();
    const log = appendAuditLog(current?.audit_log, "Restored from Trash",
      null,
      [{ field: "Status", from: "Trash", to: previousStatus || "Draft" }]);
    const { data, error } = await supabase.from("entries").update({
      status: previousStatus || "Draft",
      audit_log: log,
    }).eq("id", id).select().single();
    if (error) { console.error("RestoreEntry error:", error); return null; }
    const mapped = mapEntry(data);
    setEntries(prev => prev.map(e => e.id === id ? mapped : e));
    return mapped;
  }, [currentUser]);

  const markPaid = useCallback(async (id, paymentDetails) => {
    const { data: current } = await supabase.from("entries").select("audit_log").eq("id", id).single();
    const detailStr = paymentDetails ? paymentDetails.method + (paymentDetails.reference ? " #" + paymentDetails.reference : "") : "No details";
    const log = appendAuditLog(current?.audit_log, "Marked as Paid",
      null,
      [{ field: "Status", from: "Approved", to: "Paid" },
       { field: "Payment", from: "—", to: detailStr }]);
    const { data, error } = await supabase.from("entries").update({
      status: "Paid", paid_at: new Date().toISOString(), audit_log: log,
    }).eq("id", id).select().single();
    if (error) { console.error("MarkPaid error:", error); return null; }
    const mapped = mapEntry(data);
    setEntries(prev => prev.map(e => e.id === id ? mapped : e));
    return mapped;
  }, [currentUser]);

  // ── PURCHASE ENTRIES ─────────────────────────────────────────────────────
  const savePurchaseEntry = useCallback(async (formData, existingId) => {
    const row = {
      user_id: formData.userId,
      date: formData.date,
      store_name: formData.storeName,
      category: formData.category,
      description: formData.description || null,
      items: formData.items || [],
      subtotal: Number(formData.subtotal) || 0,
      tax: Number(formData.tax) || 0,
      total: Number(formData.total) || 0,
      mileage: formData.mileage ? Number(formData.mileage) : null,
      mileage_rate: formData.mileageRate ? Number(formData.mileageRate) : null,
      mileage_total: formData.mileageTotal ? Number(formData.mileageTotal) : null,
      payment_method: formData.paymentMethod || null,
      receipt_urls: formData.receiptUrls || [],
      photo_urls: formData.photoUrls || [],
      notes: formData.notes || null,
      status: formData.status,
      ...(formData.status === "Submitted" ? { submitted_at: new Date().toISOString() } : {}),
    };

    if (existingId) {
      const { data: current } = await supabase
        .from("purchase_entries").select("audit_log, status").eq("id", existingId).single();
      const statusChanged = formData.status !== current?.status;
      const action = formData.status === "Submitted" ? "Submitted for review"
                   : formData.status === "Draft" ? "Draft saved" : "Entry edited";
      const details = statusChanged ? "Status: " + current?.status + " → " + formData.status : null;
      row.audit_log = appendAuditLog(current?.audit_log, action, details, null);
      const { data, error } = await supabase
        .from("purchase_entries").update(row).eq("id", existingId).select().single();
      if (error) { console.error("Purchase update error:", error); return { error: error.message }; }
      const mapped = mapPurchaseEntry(data);
      setPurchaseEntries(prev => prev.map(e => e.id === existingId ? mapped : e));
      return mapped;
    } else {
      row.audit_log = appendAuditLog([], "Purchase entry created", null, [
        { field: "Store", from: "—", to: formData.storeName || "—" },
        { field: "Category", from: "—", to: formData.category || "—" },
        { field: "Total", from: "—", to: "$" + (Number(formData.total) || 0).toFixed(2) },
      ]);
      const { data, error } = await supabase
        .from("purchase_entries").insert(row).select().single();
      if (error) { console.error("Purchase insert error:", error); return { error: error.message }; }
      const mapped = mapPurchaseEntry(data);
      setPurchaseEntries(prev => [mapped, ...prev]);
      return mapped;
    }
  }, [currentUser]);

  const deletePurchaseEntry = useCallback(async (id) => {
    const { error } = await supabase.from("purchase_entries").delete().eq("id", id);
    if (error) { console.error("Purchase delete error:", error); return false; }
    setPurchaseEntries(prev => prev.filter(e => e.id !== id));
    return true;
  }, []);

  const approvePurchaseEntry = useCallback(async (id, reviewerNotes) => {
    const { data: current } = await supabase.from("purchase_entries").select("audit_log").eq("id", id).single();
    const log = appendAuditLog(current?.audit_log, "Approved",
      reviewerNotes ? "Notes: " + reviewerNotes : null,
      [{ field: "Status", from: "Submitted", to: "Approved" }]);
    const { data, error } = await supabase.from("purchase_entries").update({
      status: "Approved", reviewer_notes: reviewerNotes || null, reviewed_at: new Date().toISOString(),
      reviewed_by: session?.user?.id, audit_log: log,
    }).eq("id", id).select().single();
    if (error) { console.error("Purchase approve error:", error); return null; }
    const mapped = mapPurchaseEntry(data);
    setPurchaseEntries(prev => prev.map(e => e.id === id ? mapped : e));
    return mapped;
  }, [currentUser, session]);

  const rejectPurchaseEntry = useCallback(async (id, reviewerNotes) => {
    const { data: current } = await supabase.from("purchase_entries").select("audit_log").eq("id", id).single();
    const log = appendAuditLog(current?.audit_log, "Rejected",
      null,
      [{ field: "Status", from: "Submitted", to: "Rejected" },
       { field: "Reason", from: "—", to: reviewerNotes || "No reason given" }]);
    const { data, error } = await supabase.from("purchase_entries").update({
      status: "Rejected", reviewer_notes: reviewerNotes || null, reviewed_at: new Date().toISOString(),
      reviewed_by: session?.user?.id, audit_log: log,
    }).eq("id", id).select().single();
    if (error) { console.error("Purchase reject error:", error); return null; }
    const mapped = mapPurchaseEntry(data);
    setPurchaseEntries(prev => prev.map(e => e.id === id ? mapped : e));
    return mapped;
  }, [currentUser, session]);

  const markPurchasePaid = useCallback(async (id, paymentDetails) => {
    const { data: current } = await supabase.from("purchase_entries").select("audit_log").eq("id", id).single();
    const detailStr = paymentDetails ? paymentDetails.method + (paymentDetails.reference ? " #" + paymentDetails.reference : "") : "No details";
    const log = appendAuditLog(current?.audit_log, "Marked as Paid", null,
      [{ field: "Status", from: "Approved", to: "Paid" },
       { field: "Payment", from: "—", to: detailStr }]);
    const { data, error } = await supabase.from("purchase_entries").update({
      status: "Paid", paid_at: new Date().toISOString(), audit_log: log,
    }).eq("id", id).select().single();
    if (error) { console.error("Purchase markPaid error:", error); return null; }
    const mapped = mapPurchaseEntry(data);
    setPurchaseEntries(prev => prev.map(e => e.id === id ? mapped : e));
    return mapped;
  }, [currentUser]);

  // ── COMMENTS ───────────────────────────────────────────────────────────
  const addComment = useCallback(async (entryId, message) => {
    const { data: current } = await supabase.from("entries").select("comments").eq("id", entryId).single();
    const existing = current?.comments || [];
    const newComment = {
      id: crypto.randomUUID(),
      userId: currentUser.id,
      userName: currentUser.name,
      role: currentUser.role,
      message: message.trim(),
      createdAt: new Date().toISOString(),
    };
    const updated = [...existing, newComment];
    const { data, error } = await supabase.from("entries").update({ comments: updated }).eq("id", entryId).select().single();
    if (error) { console.error("Comment error:", error); return null; }
    const mapped = mapEntry(data);
    setEntries(prev => prev.map(e => e.id === entryId ? mapped : e));
    return mapped;
  }, [currentUser]);

  // ── SETTINGS ───────────────────────────────────────────────────────────
  const saveSettings = useCallback(async (newSettings) => {
    // ── Handle logo upload to Supabase Storage ────────────────────────
    let branding = newSettings.branding ? { ...newSettings.branding } : null;
    if (branding) {
      // Clean up the preview key (only used for local UI state)
      delete branding.logoPreview;

      // If logoUrl is a data URL, upload it to Storage and replace with public URL
      if (branding.logoUrl && branding.logoUrl.startsWith("data:")) {
        try {
          // Convert data URL to Blob
          const res = await fetch(branding.logoUrl);
          const blob = await res.blob();
          const ext = blob.type === "image/svg+xml" ? "svg"
                    : blob.type === "image/png" ? "png"
                    : blob.type === "image/webp" ? "webp"
                    : "jpg";
          const filePath = `hoa-logo-${Date.now()}.${ext}`;

          // Delete previous logo if it was stored in our bucket
          const prevUrl = settings?.branding?.logoUrl || "";
          if (prevUrl.includes("/storage/v1/object/public/logos/")) {
            const prevPath = prevUrl.split("/logos/").pop();
            if (prevPath) {
              await supabase.storage.from("logos").remove([prevPath]);
            }
          }

          // Upload new logo
          const { error: upErr } = await supabase.storage
            .from("logos")
            .upload(filePath, blob, { contentType: blob.type, upsert: true });
          if (upErr) {
            console.error("Logo upload error:", upErr);
            // Fall back to storing the data URL in JSONB (works but not ideal)
          } else {
            // Get public URL
            const { data: urlData } = supabase.storage
              .from("logos")
              .getPublicUrl(filePath);
            branding.logoUrl = urlData.publicUrl;
          }
        } catch (err) {
          console.error("Logo upload exception:", err);
          // Keep the data URL as fallback — it'll still render
        }
      }

      // If logo was removed (empty string), clean up old file
      if (branding.logoUrl === "" || branding.logoUrl === null) {
        const prevUrl = settings?.branding?.logoUrl || "";
        if (prevUrl.includes("/storage/v1/object/public/logos/")) {
          const prevPath = prevUrl.split("/logos/").pop();
          if (prevPath) {
            await supabase.storage.from("logos").remove([prevPath]).catch(() => {});
          }
        }
        branding.logoUrl = null;
      }
    }

    const { error } = await supabase.from("settings").update({
      hoa_name: newSettings.hoaName,
      default_hourly_rate: newSettings.defaultHourlyRate,
      currency: newSettings.currency || "USD",
      invite_code: newSettings.inviteCode || null,
      invite_expires_at: newSettings.inviteExpiresAt || null,
      annual_budget: newSettings.annualBudget || 0,
      dual_approval_threshold: newSettings.dualApprovalThreshold || 0,
      mileage_rate: newSettings.mileageRate != null ? newSettings.mileageRate : 0.725,
      branding: branding,
    }).eq("id", 1);
    if (error) { console.error("Settings error:", error); return false; }
    setSettings({ ...newSettings, branding });
    return true;
  }, [settings?.branding?.logoUrl]);

  // ── USER MANAGEMENT (Treasurer only) ───────────────────────────────────
  const addUser = useCallback(async (name, email, role, password) => {
    // Create auth user via admin invite (uses the signup endpoint)
    // The on_auth_user_created trigger will create the profile
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, role } },
    });
    if (error) return { error: error.message };
    // Reload profiles
    const { data: allProfiles } = await supabase.from("profiles").select("*");
    if (allProfiles) setUsers(allProfiles.map(mapProfile));
    return { user: data.user };
  }, []);

  const removeUser = useCallback(async (userId) => {
    // Delete profile (auth user remains but can't access anything without profile)
    const { error } = await supabase.from("profiles").delete().eq("id", userId);
    if (error) { console.error("Remove user error:", error); return false; }
    setUsers(prev => prev.filter(u => u.id !== userId));
    return true;
  }, []);

  const updateUserRate = useCallback(async (userId, rate) => {
    const { error } = await supabase.from("profiles").update({
      hourly_rate: rate || null,
    }).eq("id", userId);
    if (error) { console.error("Rate update error:", error); return false; }
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, hourlyRate: rate || null } : u));
    return true;
  }, []);

  // ── COMMUNITY STATS (aggregates visible to all members) ───────────────
  async function fetchCommunityStats() {
    const { data, error } = await supabase.rpc("get_community_stats");
    if (error) { console.error("Community stats error:", error); return null; }
    return data;
  }

  // ── NUDGES ─────────────────────────────────────────────────────────────
  const [nudges, setNudges] = useState([]);

  function mapNudge(row) {
    return {
      id: row.id,
      senderId: row.sender_id,
      recipientId: row.recipient_id,
      message: row.message,
      template: row.template,
      readAt: row.read_at,
      dismissedAt: row.dismissed_at,
      actedOnAt: row.acted_on_at,
      createdAt: row.created_at,
    };
  }

  // Load nudges when authenticated
  useEffect(() => {
    if (!session?.user) return;
    const loadNudges = async () => {
      try {
        const { data, error } = await supabase
          .from("nudges")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100);
        if (data) setNudges(data.map(mapNudge));
        if (error && error.code !== "42P01") console.error("Nudge load error:", error);
        // 42P01 = table doesn't exist yet — gracefully handle pre-migration state
      } catch (e) {
        // Silently fail if nudges table doesn't exist yet
      }
    };
    loadNudges();
  }, [session?.user?.id]);

  // Real-time for nudges
  useEffect(() => {
    if (!session?.user) return;
    let channel;
    try {
      channel = supabase
        .channel("nudges-realtime")
        .on("postgres_changes", { event: "*", schema: "public", table: "nudges" }, (payload) => {
          if (payload.eventType === "INSERT") {
            setNudges(prev => {
              if (prev.find(n => n.id === payload.new.id)) return prev;
              return [mapNudge(payload.new), ...prev];
            });
          } else if (payload.eventType === "UPDATE") {
            setNudges(prev => prev.map(n => n.id === payload.new.id ? mapNudge(payload.new) : n));
          } else if (payload.eventType === "DELETE") {
            setNudges(prev => prev.filter(n => n.id !== payload.old.id));
          }
        })
        .subscribe();
    } catch (e) {
      // Graceful: table may not exist yet
    }
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [session?.user?.id]);

  // Send nudges (Treasurer only)
  const sendNudges = useCallback(async (recipientIds, message, template) => {
    if (!currentUser) return [];
    const rows = recipientIds.map(rid => ({
      sender_id: currentUser.id,
      recipient_id: rid,
      message,
      template: template || null,
    }));
    try {
      const { data, error } = await supabase.from("nudges").insert(rows).select();
      if (error) { console.error("Send nudge error:", error); return []; }
      const mapped = (data || []).map(mapNudge);
      setNudges(prev => [...mapped, ...prev]);

      // Fire-and-forget: forward nudge via email
      try {
        supabase.functions.invoke("send-nudge-email", {
          body: {
            recipientIds,
            message,
            senderName: currentUser.name,
            hoaName: settings.hoaName,
          },
        });
      } catch (emailErr) {
        console.warn("Nudge email forwarding failed (non-blocking):", emailErr);
      }

      return mapped;
    } catch (e) {
      console.error("Send nudge exception:", e);
      return [];
    }
  }, [currentUser, settings.hoaName]);

  // Mark nudge as read (Member)
  const markNudgeRead = useCallback(async (nudgeId) => {
    try {
      const { data, error } = await supabase.from("nudges").update({
        read_at: new Date().toISOString(),
      }).eq("id", nudgeId).select().single();
      if (data) setNudges(prev => prev.map(n => n.id === nudgeId ? mapNudge(data) : n));
    } catch (e) {
      // Graceful
    }
  }, []);

  // Dismiss nudge (Member)
  const dismissNudge = useCallback(async (nudgeId) => {
    try {
      const { data, error } = await supabase.from("nudges").update({
        dismissed_at: new Date().toISOString(),
        read_at: new Date().toISOString(),  // Also mark as read
      }).eq("id", nudgeId).select().single();
      if (data) setNudges(prev => prev.map(n => n.id === nudgeId ? mapNudge(data) : n));
    } catch (e) {
      // Graceful
    }
  }, []);

  // ── EMAIL NOTIFICATIONS (Edge Functions) ───────────────────────────────

  // Send a test digest email to a specific address via the send-digest edge function
  const sendTestDigest = useCallback(async (testRecipientEmail, digestType, testAsUserId) => {
    try {
      const { data: { session: sess } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke("send-digest", {
        body: {
          testRecipientEmail,
          testDigestType: digestType || "treasurer",
          testAsUserId: testAsUserId || null,
        },
        headers: sess?.access_token
          ? { Authorization: "Bearer " + sess.access_token }
          : {},
      });
      if (error) {
        console.error("sendTestDigest error:", error);
        let msg = error.message || String(error);
        try {
          if (error.context?.body) {
            const text = await new Response(error.context.body).text();
            const parsed = JSON.parse(text);
            if (parsed.error) msg = parsed.error;
          }
        } catch { /* ignore parse errors */ }
        return { error: msg };
      }
      return data || { sent: 0 };
    } catch (e) {
      console.error("sendTestDigest exception:", e);
      return { error: String(e) };
    }
  }, []);

  // Send a nudge email via the send-nudge-email edge function
  const sendNudgeEmail = useCallback(async (recipientIds, message, senderName, hoaName) => {
    try {
      const { data: { session: sess } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke("send-nudge-email", {
        body: { recipientIds, message, senderName, hoaName },
        headers: sess?.access_token
          ? { Authorization: "Bearer " + sess.access_token }
          : {},
      });
      if (error) {
        console.error("sendNudgeEmail error:", error);
        let msg = error.message || String(error);
        try {
          if (error.context?.body) {
            const text = await new Response(error.context.body).text();
            const parsed = JSON.parse(text);
            if (parsed.error) msg = parsed.error;
          }
        } catch { /* ignore parse errors */ }
        return { error: msg };
      }
      return data || { sent: 0 };
    } catch (e) {
      console.error("sendNudgeEmail exception:", e);
      return { error: String(e) };
    }
  }, []);

  // ── REFRESH ────────────────────────────────────────────────────────────
  const refresh = useCallback(() => {
    if (session?.user?.id) loadAll(session.user.id);
  }, [session?.user?.id]);

  return {
    // State
    currentUser, users, entries, purchaseEntries, settings, loading, authError, nudges,
    // Auth
    login, logout, register, resetPassword, changePassword,
    // Entries
    saveEntry, deleteEntry, trashEntry, restoreEntry, approveEntry, firstApprove, secondApprove, rejectEntry, markPaid,
    needsInfoEntry, bulkApprove, addComment,
    // Purchase Entries
    savePurchaseEntry, deletePurchaseEntry, approvePurchaseEntry, rejectPurchaseEntry, markPurchasePaid,
    // Settings & Users
    saveSettings, addUser, removeUser, updateUserRate,
    // Nudges
    sendNudges, markNudgeRead, dismissNudge,
    // Email (Edge Functions)
    sendTestDigest, sendNudgeEmail,
    // Misc
    refresh, setAuthError, fetchCommunityStats, logAuditEvent, passwordRecovery, setPasswordRecovery,
  };
}
