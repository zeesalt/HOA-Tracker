import { useState, useMemo } from "react";
import {
  BRAND, STATUSES, ROLES,
  fmt, calcHours, calcLabor, calcMaterialsTotal, getUserRate, timeAgo,
  Icon, RoleBadge,
  S, Modal,
} from "../shared";
import { RateInput } from "./PageLoader";
import { NudgeComposer, SentNudgesLog } from "./NudgeSystem";

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Member Engagement Status (same logic as CommandCenter)
// ═══════════════════════════════════════════════════════════════════════════
function getMemberStatus(userId, entries, purchaseEntries) {
  const all = [
    ...entries.filter(e => e.userId === userId && e.status !== STATUSES.TRASH),
    ...purchaseEntries.filter(e => e.userId === userId),
  ];
  if (all.length === 0) return { status: "new", label: "New", color: "#6366F1", daysSince: null };
  const latest = all.reduce((max, e) => {
    const d = e.createdAt || e.date;
    return d > max ? d : max;
  }, "");
  const daysSince = Math.floor((Date.now() - new Date(latest).getTime()) / 86400000);
  if (daysSince <= 14) return { status: "active", label: "Active", color: BRAND.success, daysSince };
  if (daysSince <= 30) return { status: "idle", label: "Idle", color: BRAND.warning, daysSince };
  return { status: "inactive", label: "Inactive", color: BRAND.error, daysSince };
}

// ═══════════════════════════════════════════════════════════════════════════
// MEMBERS PAGE — Directory + Nudge, with last-active timestamps
// ═══════════════════════════════════════════════════════════════════════════
export const MembersPage = ({
  users, currentUser, entries, purchaseEntries, settings,
  nudges, onSendNudges, onAddUser, onRemoveUser, onUpdateRate,
  mob, showToast,
}) => {
  const [tab, setTab] = useState("directory"); // "directory" | "nudge"
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState(ROLES.MEMBER);
  const [newPassword, setNewPassword] = useState("");
  const [memberError, setMemberError] = useState("");
  const [addingUser, setAddingUser] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const members = users.filter(u => u.id !== currentUser?.id);
  const memberUsers = users.filter(u => u.role === ROLES.MEMBER);

  // Computed member stats with last-active
  const memberStats = useMemo(() => {
    return memberUsers.map(u => {
      const userEntries = entries.filter(e => e.userId === u.id && e.status !== STATUSES.TRASH);
      const userPurchases = purchaseEntries.filter(e => e.userId === u.id);
      const engagement = getMemberStatus(u.id, entries, purchaseEntries);
      const totalCount = userEntries.length + userPurchases.length;
      const approvedCount = userEntries.filter(e => [STATUSES.APPROVED, STATUSES.PAID].includes(e.status)).length
        + userPurchases.filter(e => ["Approved", "Paid"].includes(e.status)).length;
      const pendingCount = userEntries.filter(e => e.status === STATUSES.SUBMITTED).length
        + userPurchases.filter(e => e.status === "Submitted").length;
      const totalReimb = userEntries.filter(e => [STATUSES.APPROVED, STATUSES.PAID].includes(e.status))
        .reduce((s, e) => {
          const h = calcHours(e.startTime, e.endTime);
          const r = getUserRate(users, settings, e.userId);
          return s + calcLabor(h, r) + calcMaterialsTotal(e.materials);
        }, 0);

      // Last active: prefer lastActiveAt from profile, fall back to entry dates
      let lastActive = u.lastActiveAt || null;
      if (!lastActive) {
        const allDates = [...userEntries, ...userPurchases].map(e => e.createdAt || e.date).filter(Boolean);
        if (allDates.length > 0) lastActive = allDates.sort().pop();
      }

      return { user: u, engagement, totalCount, approvedCount, pendingCount, totalReimb, lastActive };
    }).sort((a, b) => {
      // Sort: active first, then by last activity
      const order = { active: 0, idle: 1, new: 2, inactive: 3 };
      const diff = (order[a.engagement.status] || 9) - (order[b.engagement.status] || 9);
      if (diff !== 0) return diff;
      return (b.lastActive || "").localeCompare(a.lastActive || "");
    });
  }, [memberUsers, entries, purchaseEntries, users, settings]);

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
    setShowAddForm(false);
    showToast?.("Member added", "success");
  };

  const removeMember = async (id) => { await onRemoveUser(id); setDeleteTarget(null); showToast?.("Member removed", "success"); };

  const tabs = [
    { id: "directory", label: "Directory", icon: "👥", count: memberUsers.length },
    { id: "nudge", label: "Nudge", icon: "🔔", count: null },
  ];

  return (
    <div className="fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ ...S.h2, marginBottom: 4 }}>Members</h2>
          <p style={{ margin: 0, fontSize: 14, color: BRAND.textMuted }}>
            {memberUsers.length} member{memberUsers.length !== 1 ? "s" : ""} · {memberStats.filter(m => m.engagement.status === "active").length} active
          </p>
        </div>
        {tab === "directory" && (
          <button style={S.btnPrimary} onClick={() => setShowAddForm(!showAddForm)}>
            <Icon name="plus" size={16} /> Add Member
          </button>
        )}
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: "2px solid " + BRAND.borderLight }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "10px 20px", border: "none", cursor: "pointer",
            fontFamily: BRAND.sans, fontSize: 14, fontWeight: tab === t.id ? 700 : 500,
            color: tab === t.id ? BRAND.navy : BRAND.textMuted,
            background: "none",
            borderBottom: tab === t.id ? "2px solid " + BRAND.navy : "2px solid transparent",
            marginBottom: -2, transition: "all 200ms",
          }}>
            <span>{t.icon}</span> {t.label}
            {t.count != null && <span style={{ fontSize: 11, fontWeight: 600, background: BRAND.bgSoft, padding: "1px 6px", borderRadius: 8, color: BRAND.textLight }}>{t.count}</span>}
          </button>
        ))}
      </div>

      {/* ── DIRECTORY TAB ── */}
      {tab === "directory" && (
        <div>
          {/* Add member form (collapsible) */}
          {showAddForm && (
            <div className="fade-in" style={{ ...S.card, marginBottom: 20, background: BRAND.bgSoft, borderColor: BRAND.borderLight }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: BRAND.navy }}>Add New Member</div>
              <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div><label style={S.label}>Full Name</label><input style={S.input} value={newName} onChange={e => setNewName(e.target.value)} placeholder="Jordan Chen" autoFocus /></div>
                <div><label style={S.label}>Email</label><input style={S.input} value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="jordan@email.com" /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div><label style={S.label}>Role</label><select style={S.select} value={newRole} onChange={e => setNewRole(e.target.value)}><option value={ROLES.MEMBER}>Member</option><option value={ROLES.TREASURER}>Treasurer</option></select></div>
                <div><label style={S.label}>Password</label><input type="password" style={S.input} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min 6 chars" onKeyDown={e => e.key === "Enter" && addMember()} /></div>
              </div>
              {memberError && <div style={{ color: BRAND.error, fontSize: 13, marginBottom: 10 }}>{memberError}</div>}
              <div style={{ display: "flex", gap: 10 }}>
                <button style={{ ...S.btnPrimary, opacity: addingUser ? 0.6 : 1 }} onClick={addMember} disabled={addingUser}>{addingUser ? "Adding..." : "Add Member"}</button>
                <button style={S.btnSecondary} onClick={() => { setShowAddForm(false); setMemberError(""); }}>Cancel</button>
              </div>
            </div>
          )}

          {/* Member cards */}
          {memberStats.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 20px", color: BRAND.textLight }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: BRAND.navy, marginBottom: 4 }}>No members yet</div>
              <div style={{ fontSize: 14 }}>Add your first member above, or share your invite code.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {memberStats.map(ms => (
                <div key={ms.user.id} style={{ border: "1px solid " + BRAND.borderLight, borderRadius: 12, padding: mob ? "12px 14px" : "16px 20px", background: BRAND.white }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                    {/* Left: avatar + info */}
                    <div style={{ flex: 1, minWidth: 180 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                        {/* Avatar with status dot */}
                        <div style={{ position: "relative", flexShrink: 0 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 18, background: BRAND.navy + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: BRAND.navy }}>
                            {ms.user.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                          </div>
                          <div style={{ position: "absolute", bottom: -1, right: -1, width: 12, height: 12, borderRadius: 6, background: ms.engagement.color, border: "2px solid " + BRAND.white }} title={ms.engagement.label} />
                        </div>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 14, fontWeight: 600, color: BRAND.charcoal }}>{ms.user.name}</span>
                            <RoleBadge role={ms.user.role} />
                            <span style={{ fontSize: 10, fontWeight: 600, color: ms.engagement.color, padding: "1px 6px", borderRadius: 8, background: ms.engagement.color + "15" }}>{ms.engagement.label}</span>
                          </div>
                          <div style={{ fontSize: 12, color: BRAND.textMuted }}>{ms.user.email}</div>
                        </div>
                      </div>
                      {/* Stats row */}
                      <div style={{ display: "flex", gap: 12, fontSize: 12, color: BRAND.textLight, paddingLeft: 46, flexWrap: "wrap" }}>
                        <span>{ms.totalCount} entries</span>
                        {ms.approvedCount > 0 && <span style={{ color: BRAND.success }}>✓ {ms.approvedCount} approved</span>}
                        {ms.pendingCount > 0 && <span style={{ color: BRAND.warning }}>⏳ {ms.pendingCount} pending</span>}
                        {ms.totalReimb > 0 && <span style={{ color: BRAND.brick, fontWeight: 600 }}>{fmt(ms.totalReimb)}</span>}
                      </div>
                      {/* Last active timestamp */}
                      <div style={{ fontSize: 12, color: BRAND.textLight, paddingLeft: 46, marginTop: 4 }}>
                        {ms.lastActive
                          ? "Last active " + timeAgo(ms.lastActive)
                          : "Never logged in"}
                      </div>
                    </div>
                    {/* Right: rate + remove */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                        <label style={{ fontSize: 11, color: BRAND.textLight, fontWeight: 600 }}>Hourly Rate</label>
                        <RateInput initialValue={ms.user.hourlyRate} placeholder={"$" + (settings.defaultHourlyRate || 40) + " default"} onSave={val => onUpdateRate(ms.user.id, val)} />
                      </div>
                      <button
                        aria-label={"Remove " + ms.user.name}
                        style={{ ...S.btnGhost, padding: "8px 12px", color: BRAND.error, border: "1px solid " + BRAND.error + "30", borderRadius: 8, fontSize: 13 }}
                        onClick={() => setDeleteTarget(ms.user)}
                      >
                        <Icon name="trash" size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── NUDGE TAB ── */}
      {tab === "nudge" && (
        <div>
          <div style={{ ...S.card, marginBottom: 20 }}>
            <NudgeComposer
              users={users}
              currentUser={currentUser}
              onSend={async (recipientIds, message, template) => {
                const sent = await onSendNudges(recipientIds, message, template);
                if (sent.length > 0) showToast?.("Nudge sent to " + sent.length + " member" + (sent.length !== 1 ? "s" : ""), "success");
              }}
            />
          </div>
          <div style={{ ...S.card }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: BRAND.navy, marginBottom: 12 }}>Sent Nudges</div>
            <SentNudgesLog nudges={nudges} users={users} mob={mob} />
          </div>
        </div>
      )}

      {/* Remove Member Confirm */}
      {deleteTarget && (() => {
        const entryCount = entries.filter(e => e.userId === deleteTarget.id).length;
        const hasPending = entries.some(e => e.userId === deleteTarget.id && e.status === "Submitted");
        const hasApproved = entries.some(e => e.userId === deleteTarget.id && (e.status === "Approved" || e.status === "Paid"));
        return (
          <Modal open={true} onClose={() => setDeleteTarget(null)} title={"Remove " + deleteTarget.name + "?"}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <p style={{ fontSize: 14, color: BRAND.textMuted, lineHeight: 1.7 }}>
                <strong>{deleteTarget.name}</strong> will lose access immediately. Their entries are retained for your records.
              </p>
              {entryCount > 0 && (
                <div style={{ padding: "12px 14px", background: BRAND.bgSoft, borderRadius: 8, border: "1px solid " + BRAND.borderLight, fontSize: 13 }}>
                  <div style={{ fontWeight: 600, color: BRAND.navy, marginBottom: 4 }}>📋 {entryCount} {entryCount === 1 ? "entry" : "entries"} on file</div>
                  {hasApproved && <div style={{ color: BRAND.success, marginTop: 2 }}>✓ Approved/paid entries are preserved in reports.</div>}
                  {hasPending && <div style={{ color: BRAND.warning, marginTop: 2 }}>⏳ Pending submissions — review or decline before removing.</div>}
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
