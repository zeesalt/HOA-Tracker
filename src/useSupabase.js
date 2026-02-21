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
    notes: row.notes || "",
    status: row.status,
    reviewerNotes: row.reviewer_notes || "",
    reviewedAt: row.reviewed_at || "",
    paidAt: row.paid_at || "",
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
  };
}

function mapSettings(row) {
  return {
    hoaName: row.hoa_name,
    defaultHourlyRate: Number(row.default_hourly_rate),
    currency: row.currency,
    inviteCode: row.invite_code || "",
  };
}

export function useSupabase() {
  const [session, setSession] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [entries, setEntries] = useState([]);
  const [settings, setSettings] = useState({ hoaName: "24 Mill Street", defaultHourlyRate: 40, currency: "USD", inviteCode: "" });
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  // ── AUTH ────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
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

      // Load all profiles (for member names in entries)
      const { data: allProfiles } = await supabase.from("profiles").select("*");
      if (allProfiles) setUsers(allProfiles.map(mapProfile));

      // Load entries (RLS handles visibility)
      const { data: allEntries } = await supabase
        .from("entries").select("*").order("date", { ascending: false });
      if (allEntries) setEntries(allEntries.map(mapEntry));

      // Load settings
      const { data: settingsRow } = await supabase
        .from("settings").select("*").eq("id", 1).single();
      if (settingsRow) setSettings(mapSettings(settingsRow));
    } catch (err) {
      console.error("Load error:", err);
    }
    setLoading(false);
  }

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
      setAuthError(error.message);
      return { error: error.message };
    }
    return { user: data.user };
  }, []);

  // ── ENTRIES ────────────────────────────────────────────────────────────
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
      notes: formData.notes || null,
      status: formData.status,
    };

    if (existingId) {
      const { data, error } = await supabase
        .from("entries").update(row).eq("id", existingId).select().single();
      if (error) { console.error("Update error:", error); return null; }
      const mapped = mapEntry(data);
      setEntries(prev => prev.map(e => e.id === existingId ? mapped : e));
      return mapped;
    } else {
      const { data, error } = await supabase
        .from("entries").insert(row).select().single();
      if (error) { console.error("Insert error:", error); return null; }
      const mapped = mapEntry(data);
      setEntries(prev => [mapped, ...prev]);
      return mapped;
    }
  }, []);

  const deleteEntry = useCallback(async (id) => {
    const { error } = await supabase.from("entries").delete().eq("id", id);
    if (error) { console.error("Delete error:", error); return false; }
    setEntries(prev => prev.filter(e => e.id !== id));
    return true;
  }, []);

  const approveEntry = useCallback(async (id, reviewerNotes) => {
    const { data, error } = await supabase.from("entries").update({
      status: "Approved", reviewer_notes: reviewerNotes || null, reviewed_at: new Date().toISOString(),
    }).eq("id", id).select().single();
    if (error) { console.error("Approve error:", error); return null; }
    const mapped = mapEntry(data);
    setEntries(prev => prev.map(e => e.id === id ? mapped : e));
    return mapped;
  }, []);

  const rejectEntry = useCallback(async (id, reviewerNotes) => {
    const { data, error } = await supabase.from("entries").update({
      status: "Rejected", reviewer_notes: reviewerNotes || null, reviewed_at: new Date().toISOString(),
    }).eq("id", id).select().single();
    if (error) { console.error("Reject error:", error); return null; }
    const mapped = mapEntry(data);
    setEntries(prev => prev.map(e => e.id === id ? mapped : e));
    return mapped;
  }, []);

  const markPaid = useCallback(async (id) => {
    const { data, error } = await supabase.from("entries").update({
      status: "Paid", paid_at: new Date().toISOString(),
    }).eq("id", id).select().single();
    if (error) { console.error("MarkPaid error:", error); return null; }
    const mapped = mapEntry(data);
    setEntries(prev => prev.map(e => e.id === id ? mapped : e));
    return mapped;
  }, []);

  // ── SETTINGS ───────────────────────────────────────────────────────────
  const saveSettings = useCallback(async (newSettings) => {
    const { error } = await supabase.from("settings").update({
      hoa_name: newSettings.hoaName,
      default_hourly_rate: newSettings.defaultHourlyRate,
      currency: newSettings.currency || "USD",
      invite_code: newSettings.inviteCode || null,
    }).eq("id", 1);
    if (error) { console.error("Settings error:", error); return false; }
    setSettings(newSettings);
    return true;
  }, []);

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

  // ── REFRESH ────────────────────────────────────────────────────────────
  const refresh = useCallback(() => {
    if (session?.user?.id) loadAll(session.user.id);
  }, [session?.user?.id]);

  return {
    // State
    currentUser, users, entries, settings, loading, authError,
    // Auth
    login, logout, register,
    // Entries
    saveEntry, deleteEntry, approveEntry, rejectEntry, markPaid,
    // Settings & Users
    saveSettings, addUser, removeUser, updateUserRate,
    // Misc
    refresh, setAuthError,
  };
}
