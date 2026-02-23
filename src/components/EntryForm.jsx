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

export const EntryForm = ({ entry, settings, users, currentUser, onSave, onCancel, onSubmit, onDelete, disableAutoSave, mob }) => {
  const isTreasurer = currentUser.role === ROLES.TREASURER;
  const [form, setForm] = useState({
    date: entry?.date || todayStr(), startTime: entry?.startTime || nowTime(), endTime: entry?.endTime || "",
    category: entry?.category || "", description: entry?.description || "", location: entry?.location || "",
    materials: entry?.materials || [], preImages: entry?.preImages || [], postImages: entry?.postImages || [],
    notes: entry?.notes || "", mileage: entry?.mileage || "",
    userId: entry?.userId || currentUser.id,
  });
  const [errors, setErrors] = useState({});
  const [shakeFields, setShakeFields] = useState({});
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [formDirty, setFormDirty] = useState(false);
  const [draftId, setDraftId] = useState(entry?.id || null);
  const [autoSaveStatus, setAutoSaveStatus] = useState(""); // "", "saving", "saved"
  const [submitting, setSubmitting] = useState(false);
  const draftIdRef = useRef(draftId);

  // ── Templates ─────────────────────────────────────────────────────────
  const TMPL_KEY = "hoa_templates_" + currentUser.id;
  const [templates, setTemplates] = useState(() => { try { return JSON.parse(localStorage.getItem(TMPL_KEY) || "[]"); } catch { return []; } });
  const [showTemplateSheet, setShowTemplateSheet] = useState(false);
  const [templateNameInput, setTemplateNameInput] = useState("");
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);

  const saveTemplate = () => {
    if (!templateNameInput.trim()) return;
    const t = { id: Date.now(), name: templateNameInput.trim(), category: form.category, description: form.description, location: form.location, startTime: form.startTime, endTime: form.endTime, notes: form.notes, mileage: form.mileage, materials: form.materials };
    const updated = [...templates.filter(x => x.name !== t.name), t].slice(-10);
    setTemplates(updated);
    localStorage.setItem(TMPL_KEY, JSON.stringify(updated));
    setTemplateNameInput("");
    setShowSaveTemplate(false);
  };
  const applyTemplate = (t) => {
    setForm(f => ({ ...f, category: t.category || f.category, description: t.description || f.description, location: t.location || f.location, startTime: t.startTime || f.startTime, endTime: t.endTime || f.endTime, notes: t.notes || f.notes, mileage: t.mileage || f.mileage, materials: t.materials?.length ? t.materials : f.materials }));
    setFormDirty(true);
    setShowTemplateSheet(false);
  };
  const deleteTemplate = (id) => {
    const updated = templates.filter(t => t.id !== id);
    setTemplates(updated);
    localStorage.setItem(TMPL_KEY, JSON.stringify(updated));
  };
  draftIdRef.current = draftId;
  const autoSaveAbortRef = useRef(false);
  const set = (k, v) => { setFormDirty(true); setForm(f => ({ ...f, [k]: v })); };
  const setEndFromDuration = (mins) => {
    if (!form.startTime) return;
    const [h, m] = form.startTime.split(":").map(Number);
    const total = h * 60 + m + mins;
    const eh = Math.floor(total / 60) % 24, em = total % 60;
    set("endTime", String(eh).padStart(2, "0") + ":" + String(em).padStart(2, "0"));
  };
  const hours = calcHours(form.startTime, form.endTime);
  const rate = getUserRate(users, settings, form.userId);
  const laborTotal = calcLabor(hours, rate);
  const matTotal = calcMaterialsTotal(form.materials);
  const grandTotal = laborTotal + matTotal;

  // Auto-save draft every 3 seconds when form changes
  useEffect(() => {
    // Don't auto-save in preview mode or if editing a submitted/approved/paid entry
    if (disableAutoSave) return;
    if (entry && entry.status && entry.status !== STATUSES.DRAFT && entry.status !== STATUSES.REJECTED) return;
    // Don't auto-save if user is in the submit flow
    if (showSubmitConfirm || submitting) return;
    const timer = setTimeout(async () => {
      // Need at least date to save
      if (!form.date) return;
      // Double-check submit isn't in progress (async guard)
      if (showSubmitConfirm || submitting || autoSaveAbortRef.current) return;
      setAutoSaveStatus("saving");
      const data = { ...form, status: STATUSES.DRAFT, userId: form.userId || currentUser.id };
      try {
        const result = await onSave(data, draftIdRef.current, true); // true = silent (don't navigate)
        // After await: check if submit started while we were saving — if so, discard result
        if (autoSaveAbortRef.current) { setAutoSaveStatus(""); return; }
        if (result && !draftIdRef.current) { setDraftId(result.id); draftIdRef.current = result.id; }
        setAutoSaveStatus("saved");
        setTimeout(() => setAutoSaveStatus(""), 2000);
      } catch (e) {
        setAutoSaveStatus("");
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [form, showSubmitConfirm, submitting]);

  const validate = () => {
    const e = {};
    if (!form.date) e.date = "Required";
    if (!form.startTime) e.startTime = "Required";
    if (!form.endTime) e.endTime = "Required";
    if (form.startTime && form.endTime && hours <= 0) e.endTime = "End must be after start";
    if (form.startTime && form.endTime && hours > 16) e.endTime = "Maximum 16 hours per entry";
    if (!form.category) e.category = "Required";
    if (!form.description.trim()) e.description = "Required";
    if (form.description.trim().length < 10) e.description = "Minimum 10 characters";
    if (isTreasurer && !form.userId) e.userId = "Required";
    setErrors(e);
    if (Object.keys(e).length > 0) {
      // Trigger shake on all errored fields simultaneously
      const shaking = Object.keys(e).reduce((acc, k) => ({ ...acc, [k]: true }), {});
      setShakeFields(shaking);
      setTimeout(() => setShakeFields({}), 400);
    }
    return Object.keys(e).length === 0;
  };
  const errStyle = (f) => errors[f]
    ? { border: "1px solid " + BRAND.error, animation: shakeFields[f] ? "validShake 350ms ease-in-out" : "none" }
    : {};
  const allMembers = users.filter(u => u.role === ROLES.MEMBER || u.role === ROLES.TREASURER);

  return (
    <div className="fade-in">
      {/* Template quick-use banner */}
      {templates.length > 0 && !showTemplateSheet && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
          <span>📋</span>
          <span style={{ flex: 1, color: "#1d4ed8" }}>You have {templates.length} saved template{templates.length > 1 ? "s" : ""}.</span>
          <button style={{ ...S.btnGhost, fontSize: 12, padding: "5px 12px", color: "#1d4ed8", borderColor: "#BFDBFE" }} onClick={() => setShowTemplateSheet("use")}>Use a Template</button>
        </div>
      )}
      {isTreasurer && (
        <Field label="Member" required>
          <select style={{ ...S.select, ...errStyle("userId") }} value={form.userId} onChange={e => set("userId", e.target.value)}>
            {allMembers.map(u => <option key={u.id} value={u.id}>{u.name}{u.role === ROLES.TREASURER ? " (Treasurer)" : ""}</option>)}
          </select>{errors.userId && <span role="alert" style={{ color: BRAND.error, fontSize: 13 }}>{errors.userId}</span>}
        </Field>
      )}
      <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr 1fr", gap: mob ? 12 : 16 }}>
        <Field label="Date" required><input type="date" style={{ ...S.input, ...errStyle("date") }} value={form.date} onChange={e => set("date", e.target.value)} />{errors.date && <span role="alert" style={{ color: BRAND.error, fontSize: 13 }}>{errors.date}</span>}</Field>
        <Field label="Start Time" required><input type="time" style={{ ...S.input, ...errStyle("startTime") }} value={form.startTime} onChange={e => set("startTime", e.target.value)} />{errors.startTime && <span role="alert" style={{ color: BRAND.error, fontSize: 13 }}>{errors.startTime}</span>}</Field>
        <Field label="End Time" required><input type="time" style={{ ...S.input, ...errStyle("endTime") }} value={form.endTime} onChange={e => set("endTime", e.target.value)} />{errors.endTime && <span role="alert" style={{ color: BRAND.error, fontSize: 13 }}>{errors.endTime}</span>}</Field>
      </div>
      {/* Quick duration buttons */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: -8, marginBottom: 16 }}>
        <span style={{ fontSize: 12, color: BRAND.textLight, lineHeight: "28px" }} title="Sets end time based on start time">⏱ Quick duration:</span>
        {[30, 60, 90, 120, 180, 240].map(mins => (
          <button key={mins} type="button" onClick={() => setEndFromDuration(mins)} style={{ padding: "4px 12px", borderRadius: 14, border: "1px solid " + BRAND.borderLight, background: hours > 0 && Math.round(hours * 60) === mins ? BRAND.navy : BRAND.white, color: hours > 0 && Math.round(hours * 60) === mins ? "#fff" : BRAND.textMuted, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: BRAND.sans, transition: "all 150ms" }}>{mins < 60 ? mins + "m" : (mins / 60) + "hr"}</button>
        ))}
      </div>
      <Field label="Category" required>
        <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr 1fr" : "repeat(3, 1fr)", gap: 8 }}>
          {CATEGORIES.map(c => {
            const selected = form.category === c;
            const color = catColors[c] || BRAND.navy;
            return (
              <button key={c} type="button" onClick={() => set("category", c)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10, border: selected ? "2px solid " + color : "1px solid " + BRAND.borderLight, background: selected ? color + "12" : BRAND.white, cursor: "pointer", fontFamily: BRAND.sans, fontSize: 13, fontWeight: selected ? 700 : 500, color: selected ? color : BRAND.charcoal, transition: "all 150ms", textAlign: "left" }}>
                <span style={{ fontSize: 18 }}>{CATEGORY_EMOJIS[c] || "📋"}</span>{c}
              </button>
            );
          })}
        </div>
        {errors.category && <span role="alert" style={{ color: BRAND.error, fontSize: 13, marginTop: 4, display: "block" }}>{errors.category}</span>}
      </Field>
      <Field label="Task Description" required>
        <textarea style={{ ...S.textarea, ...errStyle("description") }} value={form.description} onChange={e => set("description", e.target.value)} placeholder="Describe the work performed..." />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
          {errors.description
            ? <span role="alert" style={{ color: BRAND.error, fontSize: 13 }}>{errors.description}</span>
            : <span style={{ fontSize: 12, color: BRAND.textLight }}>Min 10 characters</span>
          }
          <span style={{
            fontSize: 12, fontWeight: 600,
            color: form.description.trim().length === 0 ? BRAND.textLight
                 : form.description.trim().length < 10  ? BRAND.warning
                 : BRAND.success,
          }}>
            {form.description.trim().length < 10
              ? form.description.trim().length + " / 10"
              : form.description.length + " chars ✓"}
          </span>
        </div>
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: mob ? 12 : 16 }}>
        <Field label="Location"><input style={S.input} value={form.location} onChange={e => set("location", e.target.value)} placeholder="e.g. Unit 3B" /></Field>
        <Field label="Mileage">
          <input type="number" min="0" step="0.1" style={S.input} value={form.mileage} onChange={e => set("mileage", e.target.value)} placeholder="Miles driven" />
          {form.mileage > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: BRAND.textLight, marginTop: 4 }}>
              <span>@ ${IRS_MILEAGE_RATE}/mi (IRS {new Date().getFullYear()})</span>
              <span style={{ fontWeight: 600, color: BRAND.navy }}>{fmt(Number(form.mileage) * IRS_MILEAGE_RATE)} reimbursable</span>
            </div>
          )}
        </Field>
      </div>
      <Field label="Materials"><MaterialsEditor materials={form.materials} onChange={m => set("materials", m)} mob={mob} /></Field>

      {/* Pre / Post Images */}
      <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: mob ? 16 : 20, marginBottom: 16 }}>
        <Field label="">
          <ImageUploader images={form.preImages} onChange={imgs => set("preImages", imgs)} label="Before Photos" color="#E65100" icon="camera" mob={mob} />
        </Field>
        <Field label="">
          <ImageUploader images={form.postImages} onChange={imgs => set("postImages", imgs)} label="After Photos" color="#2E7D32" icon="camera" mob={mob} />
        </Field>
      </div>

      <Field label="Notes"><textarea style={{ ...S.textarea, minHeight: 60 }} value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Additional notes..." /></Field>

      {/* Summary */}
      <div style={{ background: BRAND.bgSoft, borderRadius: 8, padding: 20, marginBottom: 24, border: "1px solid " + BRAND.borderLight }}>
        <div style={S.sectionLabel}>Reimbursement Summary</div>
        <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr 1fr" : "1fr 1fr 1fr 1fr", gap: mob ? 12 : 16 }}>
          <div><div style={{ fontSize: 12, color: BRAND.textLight }}>Hours</div><div style={{ fontSize: 18, fontWeight: 700, color: BRAND.navy }}>{fmtHours(hours)}</div></div>
          <div><div style={{ fontSize: 12, color: BRAND.textLight }}>Labor ({fmt(rate)}/hr)</div><div style={{ fontSize: 18, fontWeight: 700, color: BRAND.navy }}>{fmt(laborTotal)}</div></div>
          <div><div style={{ fontSize: 12, color: BRAND.textLight }}>Materials</div><div style={{ fontSize: 18, fontWeight: 700, color: BRAND.navy }}>{fmt(matTotal)}</div></div>
          <div><div style={{ fontSize: 12, color: BRAND.textLight }}>Total</div><div style={{ fontSize: 22, fontWeight: 800, color: BRAND.brick }}>{fmt(grandTotal)}</div></div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, flexWrap: "wrap", gap: 4 }}>
          <div style={{ fontSize: 11, color: BRAND.textLight }}>Billed in 30-min increments, rounded up.</div>
          <div style={{ fontSize: 11, color: BRAND.textLight }}>
            Rate: <strong style={{ color: BRAND.navy }}>{fmt(rate)}/hr</strong>
            {isTreasurer && form.userId && users.find(u => u.id === form.userId)?.hourlyRate
              ? <span style={{ color: BRAND.textLight }}> (custom rate)</span>
              : <span style={{ color: BRAND.textLight }}> (default rate)</span>
            }
          </div>
        </div>
      </div>

      {/* Sticky autosave status bar */}
      {autoSaveStatus && (
        <div role="status" aria-live="polite" style={{
          position: "sticky", top: 0, zIndex: 8,
          display: "flex", alignItems: "center", gap: 8,
          padding: "8px 14px", marginBottom: 12, borderRadius: 8,
          background: autoSaveStatus === "saved" ? "#E8F5E9" : "#FFF8E1",
          border: "1px solid " + (autoSaveStatus === "saved" ? "#A5D6A7" : "#FFD54F"),
          fontSize: 13, fontWeight: 600,
          color: autoSaveStatus === "saved" ? BRAND.success : "#795548",
          fontFamily: BRAND.sans,
        }}>
          {autoSaveStatus === "saving" && <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span>}
          {autoSaveStatus === "saved"  && <span style={{ display: "inline-block", animation: "saveCheck 350ms cubic-bezier(0.34,1.56,0.64,1)" }}>✓</span>}
          {autoSaveStatus === "saving" ? "Saving draft..." : "Draft saved"}
        </div>
      )}

      {/* Action bar */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: mob ? 10 : 14, marginBottom: 16 }}>
        {/* Cancel */}
        <button onClick={() => formDirty ? setShowCancelConfirm(true) : onCancel()} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: mob ? "16px 8px" : "20px 12px", borderRadius: 14, border: "1px solid " + BRAND.border, background: BRAND.white, cursor: "pointer", transition: "all 200ms", fontFamily: BRAND.sans, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }} onMouseEnter={ev => { ev.currentTarget.style.transform = "translateY(-2px)"; ev.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.1)"; }} onMouseLeave={ev => { ev.currentTarget.style.transform = "translateY(0)"; ev.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)"; }}>
          <div style={{ width: 44, height: 44, borderRadius: 22, background: "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", color: "#6B7280" }}><Icon name="x" size={22} /></div>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#6B7280" }}>Cancel</span>
        </button>
        {/* Save Draft */}
        <button onClick={async () => { const data = { ...form, status: STATUSES.DRAFT, userId: form.userId || currentUser.id }; setAutoSaveStatus("saving"); const result = await onSave(data, draftIdRef.current, false); if (result && !draftIdRef.current) { setDraftId(result.id); draftIdRef.current = result.id; } setAutoSaveStatus("saved"); setTimeout(() => setAutoSaveStatus(""), 2000); }} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: mob ? "16px 8px" : "20px 12px", borderRadius: 14, border: "1px solid #DBEAFE", background: "#EFF6FF", cursor: "pointer", transition: "all 200ms", fontFamily: BRAND.sans, boxShadow: "0 2px 8px rgba(21,101,192,0.08)" }} onMouseEnter={ev => { ev.currentTarget.style.transform = "translateY(-2px)"; ev.currentTarget.style.boxShadow = "0 4px 16px rgba(21,101,192,0.18)"; }} onMouseLeave={ev => { ev.currentTarget.style.transform = "translateY(0)"; ev.currentTarget.style.boxShadow = "0 2px 8px rgba(21,101,192,0.08)"; }}>
          <div style={{ width: 44, height: 44, borderRadius: 22, background: "#1565C0", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}><Icon name="edit" size={22} /></div>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#1565C0" }}>Save Draft</span>
          {/* autosave status now shown in sticky bar above action buttons */}
        </button>
        {/* Submit for Review */}
        <button onClick={() => { if (validate()) setShowSubmitConfirm(true); }} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: mob ? "16px 8px" : "20px 12px", borderRadius: 14, border: "1px solid " + BRAND.brick + "30", background: BRAND.brick + "0A", cursor: "pointer", transition: "all 200ms", fontFamily: BRAND.sans, boxShadow: "0 2px 8px rgba(142,59,46,0.08)" }} onMouseEnter={ev => { ev.currentTarget.style.transform = "translateY(-3px)"; ev.currentTarget.style.boxShadow = "0 6px 20px rgba(142,59,46,0.22)"; }} onMouseLeave={ev => { ev.currentTarget.style.transform = "translateY(0)"; ev.currentTarget.style.boxShadow = "0 2px 8px rgba(142,59,46,0.08)"; }}>
          <div style={{ width: 44, height: 44, borderRadius: 22, background: BRAND.brick, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}><Icon name="send" size={22} /></div>
          <span style={{ fontSize: 13, fontWeight: 700, color: BRAND.brick }}>Submit</span>
          <span style={{ fontSize: 10, color: BRAND.brick, opacity: 0.7 }}>For Review</span>
        </button>
      </div>

      {/* Delete + template row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        {entry && entry.status === STATUSES.DRAFT && <button style={{ ...S.btnGhost, color: BRAND.error, fontSize: 13 }} onClick={() => setShowDeleteConfirm(true)}><Icon name="trash" size={14} /> Delete Draft</button>}
        <div style={{ display: "flex", gap: 10, marginLeft: "auto" }}>
          {templates.length > 0 && (
            <button style={{ ...S.btnGhost, fontSize: 13 }} onClick={() => setShowTemplateSheet("use")}>📋 Templates ({templates.length})</button>
          )}
          <button style={{ ...S.btnGhost, fontSize: 13 }} onClick={() => { setTemplateNameInput(form.category ? form.category + " template" : ""); setShowTemplateSheet("save"); }}>💾 Save as Template</button>
        </div>
      </div>

      {/* Template sheet */}
      {showTemplateSheet && (
        <div style={{ ...S.card, background: "#F8F7F5", border: "1px solid " + BRAND.borderLight, marginTop: 4 }}>
          {showTemplateSheet === "save" ? (
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: BRAND.navy, marginBottom: 12 }}>💾 Save as Template</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input style={{ ...S.input, flex: 1 }} value={templateNameInput} onChange={e => setTemplateNameInput(e.target.value)} placeholder="Template name (e.g. Weekly Mowing)" autoFocus onKeyDown={e => e.key === "Enter" && saveTemplate()} />
                <button style={S.btnPrimary} onClick={saveTemplate} disabled={!templateNameInput.trim()}>Save</button>
                <button style={S.btnGhost} onClick={() => setShowTemplateSheet(false)}>Cancel</button>
              </div>
              <div style={{ fontSize: 12, color: BRAND.textLight, marginTop: 8 }}>Saves category, description, times, location, and materials. Date always resets to today when applied. Max 10 templates.</div>
            </div>
          ) : (
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: BRAND.navy, marginBottom: 12 }}>📋 Your Templates</div>
              {templates.length === 0 ? (
                <div style={{ fontSize: 13, color: BRAND.textLight }}>No templates yet. Fill out a form and save it as a template for quick reuse.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {templates.map(t => (
                    <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: BRAND.white, borderRadius: 8, border: "1px solid " + BRAND.borderLight }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: BRAND.charcoal }}>{t.name}</div>
                        <div style={{ fontSize: 12, color: BRAND.textLight, marginTop: 2 }}>{t.category}{t.description ? " · " + t.description.slice(0, 40) + (t.description.length > 40 ? "…" : "") : ""}</div>
                      </div>
                      <button style={{ ...S.btnPrimary, fontSize: 12, padding: "6px 14px" }} onClick={() => applyTemplate(t)}>Use</button>
                      <button style={{ ...S.btnGhost, fontSize: 12, padding: "6px 10px", color: BRAND.error, borderColor: BRAND.error + "40" }} onClick={() => deleteTemplate(t.id)}>✕</button>
                    </div>
                  ))}
                </div>
              )}
              <button style={{ ...S.btnGhost, fontSize: 13, marginTop: 12 }} onClick={() => setShowTemplateSheet(false)}>Close</button>
            </div>
          )}
        </div>
      )}
      <ConfirmDialog open={showSubmitConfirm} onClose={() => setShowSubmitConfirm(false)} title="Submit Entry?" message={"Submit for review? Total: " + fmt(grandTotal)} confirmText="Submit" onConfirm={() => { autoSaveAbortRef.current = true; setSubmitting(true); onSubmit({ ...form, status: STATUSES.SUBMITTED }, draftIdRef.current); }} />
      <ConfirmDialog open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Delete Entry?" message="This draft will be permanently deleted." confirmText="Delete" danger onConfirm={onDelete} />
      <ConfirmDialog open={showCancelConfirm} onClose={() => setShowCancelConfirm(false)} title="Discard Changes?" message="You have unsaved changes. Are you sure you want to leave?" confirmText="Discard" danger onConfirm={onCancel} />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// PURCHASE ENTRY FORM
// ═══════════════════════════════════════════════════════════════════════════
