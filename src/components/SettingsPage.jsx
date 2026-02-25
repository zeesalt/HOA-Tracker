import { useState, useEffect, useMemo, useRef } from "react";
import {
  BRAND, DEFAULT_BRAND, createTheme, getLogoUrl,
  CATEGORIES, CATEGORY_EMOJIS, STATUSES, ROLES, DEFAULT_SETTINGS,
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
import { RateInput } from "./PageLoader";
export const SettingsPage = ({ settings, users, currentUser, allEntries, allPurchases, onSaveSettings, onAddUser, onRemoveUser, onUpdateRate }) => {
  const [form, setForm] = useState({ ...settings });
  const [saved, setSaved] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState(ROLES.MEMBER);
  const [newPassword, setNewPassword] = useState("");
  const [memberError, setMemberError] = useState("");
  const [addingUser, setAddingUser] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setBranding = (k, v) => setForm(f => ({ ...f, branding: { ...(f.branding || {}), [k]: v } }));
  const logoInputRef = useRef(null);
  const handleSave = async () => { await onSaveSettings(form); setSaved(true); setTimeout(() => setSaved(false), 2000); };
  const addMember = async () => {
    setMemberError("");
    const email = newEmail.trim().toLowerCase();
    const name = newName.trim();
    const password = newPassword.trim();
    if (!name) { setMemberError("Name is required"); return; }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setMemberError("Valid email is required"); return; }
    if (!password || password.length < 6) { setMemberError("Password must be at least 6 characters"); return; }
    if (users.some(u => u.email.toLowerCase() === email)) { setMemberError("Email already registered"); return; }
    setAddingUser(true);
    const result = await onAddUser(name, email, newRole, password);
    setAddingUser(false);
    if (result.error) { setMemberError(result.error); return; }
    setNewName(""); setNewEmail(""); setNewPassword(""); setNewRole(ROLES.MEMBER);
  };
  const removeMember = async (id) => { await onRemoveUser(id); setDeleteTarget(null); };
  const members = users.filter(u => u.id !== currentUser?.id);

  return (
    <div className="fade-in">
      <h2 style={{ ...S.h2, marginBottom: 24 }}>Settings</h2>
      <div style={{ ...S.card, maxWidth: 600 }}>
        <div style={S.sectionLabel}>HOA Configuration</div>
        <Field label="HOA Name"><input style={S.input} value={form.hoaName} onChange={e => set("hoaName", e.target.value)} /></Field>
        <Field label="Default Hourly Rate ($)"><input type="number" min="0" step="0.50" style={S.input} value={form.defaultHourlyRate} onChange={e => set("defaultHourlyRate", Number(e.target.value))} /></Field>
        <Field label="Mileage Reimbursement Rate ($/mile)">
          <div>
            <input type="number" min="0" step="0.005" style={S.input} value={form.mileageRate != null ? form.mileageRate : 0.725} onChange={e => set("mileageRate", Number(e.target.value))} />
            <div style={{ fontSize: 12, color: BRAND.textLight, marginTop: 6 }}>2026 IRS standard rate: $0.725/mile. Used for mileage reimbursement on purchase entries.</div>
          </div>
        </Field>
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Invite Code">
              <div style={{ display: "flex", gap: 8 }}>
                <input style={{ ...S.input, fontFamily: "monospace", letterSpacing: "0.1em", textTransform: "uppercase", flex: 1 }}
                  value={form.inviteCode || ""} onChange={e => set("inviteCode", e.target.value.toUpperCase())} placeholder="e.g. MILL2024" />
                {form.inviteCode && (
                  <button
                    type="button"
                    style={{ ...S.btnSecondary, padding: "10px 14px", flexShrink: 0 }}
                    title="Copy invite code"
                    onClick={() => { navigator.clipboard.writeText(form.inviteCode).then(() => { setSaved("code"); setTimeout(() => setSaved(false), 1500); }); }}
                  >
                    {saved === "code" ? <Icon name="check" size={16} /> : <Icon name="copy" size={16} />}
                  </button>
                )}
              </div>
            </Field>
            <Field label="Code Expires">
              <input type="datetime-local" style={S.input}
                value={form.inviteExpiresAt ? form.inviteExpiresAt.slice(0, 16) : ""}
                onChange={e => set("inviteExpiresAt", e.target.value ? new Date(e.target.value).toISOString() : null)} />
            </Field>
          </div>
          <div style={{ fontSize: 12, color: BRAND.textLight, marginTop: 6 }}>
            New members need this code to register.
            {form.inviteExpiresAt && (() => {
              const exp = new Date(form.inviteExpiresAt);
              const expired = exp < new Date();
              return <span style={{ marginLeft: 8, color: expired ? BRAND.error : BRAND.success, fontWeight: 600 }}>
                {expired ? "⚠ Expired " : "✓ Expires "}{exp.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>;
            })()}
            {!form.inviteExpiresAt && <span style={{ marginLeft: 8, color: "#F59E0B" }}>No expiry set — code works indefinitely.</span>}
          </div>
        </div>
        <div style={{ borderTop: "1px solid " + BRAND.borderLight, marginTop: 8, paddingTop: 16 }}>
          <div style={S.sectionLabel}>Governance</div>
          <Field label="Annual Reimbursement Budget ($)"><div><input type="number" min="0" step="500" style={S.input} value={form.annualBudget || ""} onChange={e => set("annualBudget", Number(e.target.value))} placeholder="0 = no limit" /><div style={{ fontSize: 12, color: BRAND.textLight, marginTop: 6 }}>Set to 0 to disable. Shows a progress bar on the dashboard.</div></div></Field>
          <Field label="Dual Approval Threshold ($)"><div><input type="number" min="0" step="50" style={S.input} value={form.dualApprovalThreshold || ""} onChange={e => set("dualApprovalThreshold", Number(e.target.value))} placeholder="0 = single approval" /><div style={{ fontSize: 12, color: BRAND.textLight, marginTop: 6 }}>Entries ≥ this amount require two board members to approve. Set to 0 to disable.</div></div></Field>
        </div>

        {/* ── BRANDING / WHITELABEL SECTION ─────────────────────────── */}
        <div style={{ borderTop: "1px solid " + BRAND.borderLight, marginTop: 8, paddingTop: 16 }}>
          <div style={S.sectionLabel}>Branding</div>
          <div style={{ fontSize: 13, color: BRAND.textLight, marginBottom: 16, lineHeight: 1.6 }}>
            Customize colors and logo to match your HOA's identity. Changes apply to all members after saving.
          </div>

          {/* Color pickers row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <Field label="Primary Color (Sidebar, Headings)">
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="color" value={form.branding?.primaryColor || DEFAULT_BRAND.navy} onChange={e => setBranding("primaryColor", e.target.value)}
                  style={{ width: 40, height: 36, border: "1px solid " + BRAND.border, borderRadius: 6, cursor: "pointer", padding: 2, background: BRAND.white }} />
                <input style={{ ...S.input, fontFamily: "monospace", fontSize: 13, flex: 1 }} value={form.branding?.primaryColor || DEFAULT_BRAND.navy}
                  onChange={e => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) setBranding("primaryColor", e.target.value); }} placeholder="#1F2A38" />
              </div>
            </Field>
            <Field label="Accent Color (Buttons, Highlights)">
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="color" value={form.branding?.accentColor || DEFAULT_BRAND.brick} onChange={e => setBranding("accentColor", e.target.value)}
                  style={{ width: 40, height: 36, border: "1px solid " + BRAND.border, borderRadius: 6, cursor: "pointer", padding: 2, background: BRAND.white }} />
                <input style={{ ...S.input, fontFamily: "monospace", fontSize: 13, flex: 1 }} value={form.branding?.accentColor || DEFAULT_BRAND.brick}
                  onChange={e => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) setBranding("accentColor", e.target.value); }} placeholder="#8E3B2E" />
              </div>
            </Field>
          </div>

          <Field label="Background Color">
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="color" value={form.branding?.bgColor || DEFAULT_BRAND.bgSoft} onChange={e => setBranding("bgColor", e.target.value)}
                style={{ width: 40, height: 36, border: "1px solid " + BRAND.border, borderRadius: 6, cursor: "pointer", padding: 2, background: BRAND.white }} />
              <input style={{ ...S.input, fontFamily: "monospace", fontSize: 13, maxWidth: 160 }} value={form.branding?.bgColor || DEFAULT_BRAND.bgSoft}
                onChange={e => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) setBranding("bgColor", e.target.value); }} placeholder="#F5F2ED" />
              <button type="button" style={{ ...S.btnGhost, fontSize: 12, padding: "6px 10px", color: BRAND.textLight }} onClick={() => setBranding("bgColor", "")}>Reset</button>
            </div>
          </Field>

          {/* Logo upload */}
          <Field label="HOA Logo">
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 64, height: 64, borderRadius: 8, border: "1px solid " + BRAND.borderLight, background: BRAND.bgSoft, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                {(form.branding?.logoUrl || form.branding?.logoPreview) ? (
                  <img src={form.branding?.logoPreview || form.branding?.logoUrl} alt="Logo preview" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                ) : (
                  <span style={{ fontSize: 28, opacity: 0.4 }}>🏠</span>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" style={{ display: "none" }}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 2 * 1024 * 1024) { alert("Logo must be under 2 MB."); e.target.value = ""; return; }
                    const dataUrl = file.type === "image/svg+xml"
                      ? await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(file); })
                      : await compressImage(file, 400, 0.85);
                    setBranding("logoPreview", dataUrl);
                    setBranding("logoUrl", dataUrl);
                    e.target.value = "";
                  }} />
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" style={{ ...S.btnSecondary, fontSize: 13, padding: "8px 14px" }} onClick={() => logoInputRef.current?.click()}>
                    <Icon name="camera" size={14} /> Upload Logo
                  </button>
                  {(form.branding?.logoUrl || form.branding?.logoPreview) && (
                    <button type="button" style={{ ...S.btnGhost, fontSize: 12, color: BRAND.error }} onClick={() => { setBranding("logoUrl", ""); setBranding("logoPreview", ""); }}>
                      Remove
                    </button>
                  )}
                </div>
                <div style={{ fontSize: 11, color: BRAND.textLight, marginTop: 6 }}>PNG, JPG, SVG, or WebP. Max 2 MB. Square ratio recommended.</div>
              </div>
            </div>
          </Field>

          {/* Live preview strip */}
          {(() => {
            const preview = createTheme({ branding: form.branding });
            const logoSrc = form.branding?.logoPreview || form.branding?.logoUrl;
            return (
              <div style={{ border: "1px solid " + BRAND.borderLight, borderRadius: 10, overflow: "hidden", marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: BRAND.textMuted, padding: "8px 12px", background: BRAND.bgSoft, borderBottom: "1px solid " + BRAND.borderLight }}>Live Preview</div>
                {/* Mini sidebar + header mockup */}
                <div style={{ display: "flex", height: 80 }}>
                  <div style={{ width: 80, background: preview.navy, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, padding: 8 }}>
                    {logoSrc ? <img src={logoSrc} alt="" style={{ width: 28, height: 28, borderRadius: 4, objectFit: "contain" }} /> : <span style={{ fontSize: 18 }}>🏠</span>}
                    <span style={{ fontSize: 8, color: "rgba(255,255,255,0.7)", textAlign: "center", lineHeight: 1.2 }}>{form.hoaName || "Your HOA"}</span>
                  </div>
                  <div style={{ flex: 1, background: preview.bgSoft, display: "flex", flexDirection: "column" }}>
                    <div style={{ height: 28, background: BRAND.white, borderBottom: "1px solid " + BRAND.borderLight, display: "flex", alignItems: "center", padding: "0 12px" }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: preview.navy, fontFamily: BRAND.serif }}>Dashboard</span>
                    </div>
                    <div style={{ flex: 1, padding: 8, display: "flex", gap: 6 }}>
                      <div style={{ flex: 1, background: BRAND.white, borderRadius: 4, borderTop: "2px solid " + preview.navy, padding: "6px 8px" }}>
                        <div style={{ fontSize: 8, color: BRAND.textLight }}>Stat</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: preview.navy }}>$420.00</div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <button style={{ background: preview.brick, color: "#fff", border: "none", borderRadius: 3, fontSize: 8, padding: "4px 10px", fontWeight: 600, cursor: "default" }}>Button</button>
                        <button style={{ background: BRAND.white, color: preview.navy, border: "1px solid " + BRAND.border, borderRadius: 3, fontSize: 8, padding: "4px 10px", fontWeight: 600, cursor: "default" }}>Secondary</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Preset themes */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: BRAND.textMuted, marginBottom: 8 }}>Quick Presets</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {[
                { label: "Default", primary: DEFAULT_BRAND.navy, accent: DEFAULT_BRAND.brick, bg: DEFAULT_BRAND.bgSoft },
                { label: "Ocean",   primary: "#1A365D", accent: "#2B6CB0", bg: "#EBF8FF" },
                { label: "Forest",  primary: "#22543D", accent: "#38A169", bg: "#F0FFF4" },
                { label: "Slate",   primary: "#334155", accent: "#6366F1", bg: "#F1F5F9" },
                { label: "Warm",    primary: "#44322D", accent: "#C05621", bg: "#FFFAF0" },
                { label: "Night",   primary: "#1A1A2E", accent: "#E94560", bg: "#F7F7FB" },
              ].map(preset => (
                <button key={preset.label} type="button" onClick={() => setForm(f => ({ ...f, branding: { ...(f.branding || {}), primaryColor: preset.primary, accentColor: preset.accent, bgColor: preset.bg } }))}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 6, border: "1px solid " + BRAND.borderLight, background: BRAND.white, cursor: "pointer", fontSize: 12, fontWeight: 500, fontFamily: BRAND.sans, transition: "all 150ms" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = BRAND.border} onMouseLeave={e => e.currentTarget.style.borderColor = BRAND.borderLight}>
                  <div style={{ display: "flex", gap: 2 }}>
                    <span style={{ width: 12, height: 12, borderRadius: 3, background: preset.primary }} />
                    <span style={{ width: 12, height: 12, borderRadius: 3, background: preset.accent }} />
                    <span style={{ width: 12, height: 12, borderRadius: 3, background: preset.bg, border: "1px solid " + BRAND.borderLight }} />
                  </div>
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button style={S.btnPrimary} onClick={handleSave}>{saved ? "✓ Saved" : "Save Settings"}</button>
      </div>
      <div style={{ ...S.card, maxWidth: 600, marginTop: 20 }}>
        <div style={S.sectionLabel}>HOA Members</div>
        <div style={{ padding: 16, background: BRAND.bgSoft, borderRadius: 8, border: "1px solid " + BRAND.borderLight, marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: BRAND.navy }}>Add New Member</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><label style={S.label}>Full Name</label><input style={S.input} value={newName} onChange={e => setNewName(e.target.value)} placeholder="Jordan Chen" /></div>
            <div><label style={S.label}>Email</label><input style={S.input} value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="jordan@email.com" /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><label style={S.label}>Role</label><select style={S.select} value={newRole} onChange={e => setNewRole(e.target.value)}><option value={ROLES.MEMBER}>Member</option><option value={ROLES.TREASURER}>Treasurer</option></select></div>
            <div><label style={S.label}>Password</label><input type="password" style={S.input} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min 6 chars" onKeyDown={e => e.key === "Enter" && addMember()} /></div>
          </div>
          {memberError && <div style={{ color: BRAND.error, fontSize: 13, marginBottom: 10 }}>{memberError}</div>}
          <button style={{ ...S.btnPrimary, opacity: addingUser ? 0.6 : 1 }} onClick={addMember} disabled={addingUser}><Icon name="plus" size={16} /> {addingUser ? "Adding..." : "Add Member"}</button>
        </div>
        {members.length === 0 ? <div style={{ textAlign: "center", padding: 24, color: BRAND.textLight, fontSize: 14 }}>No other members yet. Add someone above.</div> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {members.map(u => {
              const entryCount = (allEntries).filter(e => e.userId === u.id).length;
              const purchCount = (allPurchases || []).filter(e => e.userId === u.id).length;
              const approvedCount = (allEntries).filter(e => e.userId === u.id && (e.status === "Approved" || e.status === "Paid")).length
                + (allPurchases || []).filter(e => e.userId === u.id && (e.status === "Approved" || e.status === "Paid")).length;
              const pendingCount  = (allEntries).filter(e => e.userId === u.id && e.status === "Submitted").length
                + (allPurchases || []).filter(e => e.userId === u.id && e.status === "Submitted").length;
              const hasHistory = entryCount > 0 || purchCount > 0;
              return (
                <div key={u.id} style={{ border: "1px solid " + BRAND.borderLight, borderRadius: 10, padding: "14px 16px", background: BRAND.white }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 16, background: BRAND.navy + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: BRAND.navy, flexShrink: 0 }}>
                          {u.name.split(" ").map(n => n[0]).join("").slice(0,2)}
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: BRAND.charcoal }}>{u.name}</div>
                          <div style={{ fontSize: 12, color: BRAND.textMuted }}>{u.email}</div>
                        </div>
                        <RoleBadge role={u.role} />
                      </div>
                      {hasHistory && (
                        <div style={{ display: "flex", gap: 12, fontSize: 12, color: BRAND.textLight, marginTop: 6, paddingLeft: 40 }}>
                          <span>{entryCount + purchCount} total{purchCount > 0 ? " (" + entryCount + " work, " + purchCount + " purchase)" : ""}</span>
                          {approvedCount > 0 && <span style={{ color: BRAND.success }}>✓ {approvedCount} approved/paid</span>}
                          {pendingCount  > 0 && <span style={{ color: BRAND.warning }}>⏳ {pendingCount} pending</span>}
                        </div>
                      )}
                      {!hasHistory && <div style={{ fontSize: 12, color: BRAND.textLight, marginTop: 4, paddingLeft: 40 }}>No entries yet</div>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                        <label style={{ fontSize: 11, color: BRAND.textLight, fontWeight: 600 }}>Hourly Rate</label>
                        <RateInput initialValue={u.hourlyRate} placeholder={"$" + form.defaultHourlyRate + " default"} onSave={val => onUpdateRate(u.id, val)} />
                      </div>
                      <button
                        aria-label={"Remove " + u.name}
                        style={{ ...S.btnGhost, padding: "8px 12px", color: BRAND.error, border: "1px solid " + BRAND.error + "30", borderRadius: 8, fontSize: 13 }}
                        onClick={() => setDeleteTarget(u)}
                      >
                        <Icon name="trash" size={16} /> Remove
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {members.length > 0 && <div style={{ marginTop: 8, fontSize: 12, color: BRAND.textLight }}>Rates save automatically when you leave the field. Removed members\'s entries are retained for record-keeping.</div>}
      </div>

      {/* Remove Member Confirm — with entry count warning */}
      {deleteTarget && (() => {
        const entryCount = (allEntries).filter(e => e.userId === deleteTarget.id).length;
        const hasPending  = (allEntries).some(e => e.userId === deleteTarget.id && e.status === "Submitted");
        const hasApproved = (allEntries).some(e => e.userId === deleteTarget.id && (e.status === "Approved" || e.status === "Paid"));
        return (
          <Modal open={true} onClose={() => setDeleteTarget(null)} title={"Remove " + deleteTarget.name + "?"}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <p style={{ fontSize: 14, color: BRAND.textMuted, lineHeight: 1.7 }}>
                <strong>{deleteTarget.name}</strong> will lose access immediately. Their profile will be removed but their work entries are retained for your records.
              </p>
              {entryCount > 0 && (
                <div style={{ padding: "12px 14px", background: BRAND.bgSoft, borderRadius: 8, border: "1px solid " + BRAND.borderLight, fontSize: 13 }}>
                  <div style={{ fontWeight: 600, color: BRAND.navy, marginBottom: 4 }}>📋 {entryCount} work {entryCount === 1 ? "entry" : "entries"} on file</div>
                  {hasApproved && <div style={{ color: BRAND.success, marginTop: 2 }}>✓ Approved/paid entries are preserved in reports.</div>}
                  {hasPending  && <div style={{ color: BRAND.warning, marginTop: 2 }}>⏳ They have pending submissions — review or decline before removing.</div>}
                </div>
              )}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
                <button style={S.btnSecondary} onClick={() => setDeleteTarget(null)}>Cancel</button>
                <button style={S.btnDanger} onClick={() => removeMember(deleteTarget.id)}>
                  <Icon name="trash" size={16} /> Remove {deleteTarget.name}
                </button>
              </div>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════
// MORE SHEET (Treasurer Tools bottom sheet with scroll lock + pull-down)
// ═══════════════════════════════════════════════════════════════════════════
