import { useState, useRef, useCallback } from "react";
import { BRAND, ROLES } from "../shared";

// ═══════════════════════════════════════════════════════════════════════════
// SHARE INVITE CARD — Appears on Treasurer dashboard when invite codes
// exist but fewer than 2 members have joined. Helps Treasurers onboard
// their first members with one-tap copy or native share.
// ═══════════════════════════════════════════════════════════════════════════

export function ShareInviteCard({ settings, users, mob }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const timerRef = useRef(null);

  const inviteCodes = settings.inviteCodes || [];
  const memberCount = users.filter(u => u.role === ROLES.MEMBER).length;

  // Don't show if no invite codes created yet, or if 2+ members already joined
  if (inviteCodes.length === 0 || memberCount >= 2) return null;

  const code = inviteCodes[0]; // Primary invite code
  const hoaName = settings.hoaName || "24 Mill Street";
  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  const inviteMessage = [
    `You've been invited to join ${hoaName} HOA on our reimbursement app.`,
    ``,
    `Sign up here: ${appUrl}`,
    `Invite code: ${code}`,
    ``,
    `Use this to log your work hours, purchases, and get reimbursed. It takes about 2 minutes to create an account.`,
  ].join("\n");

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(inviteMessage);
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback for older browsers
      const ta = document.createElement("textarea");
      ta.value = inviteMessage;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 2500);
    }
  }, [inviteMessage]);

  const handleNativeShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${hoaName} HOA`,
          text: inviteMessage,
        });
      } catch {
        // User cancelled share — no action needed
      }
    } else {
      handleCopy();
    }
  }, [hoaName, inviteMessage, handleCopy]);

  const handleEmail = useCallback(() => {
    const subject = encodeURIComponent(`Join ${hoaName} HOA — Reimbursement App`);
    const body = encodeURIComponent(inviteMessage);
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  }, [hoaName, inviteMessage]);

  const canNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  return (
    <div style={{
      background: "linear-gradient(135deg, #FFF7ED 0%, #FEF3C7 100%)",
      border: "1px solid #FDE68A",
      borderLeft: "4px solid #F59E0B",
      borderRadius: 12,
      padding: mob ? 16 : 20,
      marginBottom: 16,
      animation: "fadeIn 300ms ease",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <span style={{ fontSize: 24, lineHeight: 1 }}>📨</span>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 15, fontWeight: 700, color: BRAND.navy, marginBottom: 4,
            fontFamily: BRAND.sans,
          }}>
            {memberCount === 0 ? "Invite your first member" : "Invite more members"}
          </div>
          <div style={{
            fontSize: 13, color: BRAND.textMuted, lineHeight: 1.5, marginBottom: 14,
            fontFamily: BRAND.sans,
          }}>
            {memberCount === 0
              ? "Your HOA is set up. Share an invite so members can start logging work and purchases."
              : `${memberCount} member${memberCount === 1 ? " has" : "s have"} joined. Share the invite with more members.`}
          </div>

          {/* Preview toggle */}
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "none", border: "none", cursor: "pointer",
              color: "#92400E", fontSize: 12, fontWeight: 600,
              fontFamily: BRAND.sans, padding: 0, marginBottom: expanded ? 10 : 14,
            }}
          >
            {expanded ? "▾ Hide message preview" : "▸ Preview invite message"}
          </button>

          {expanded && (
            <div style={{
              background: BRAND.white, borderRadius: 8,
              border: "1px solid #FDE68A",
              padding: 12, marginBottom: 14,
              fontSize: 12, color: BRAND.charcoal, lineHeight: 1.6,
              fontFamily: BRAND.sans, whiteSpace: "pre-wrap",
              maxHeight: 160, overflowY: "auto",
            }}>
              {inviteMessage}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={handleCopy}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "8px 16px", borderRadius: 8,
                background: copied ? "#065F46" : BRAND.navy,
                color: "#fff", border: "none", cursor: "pointer",
                fontSize: 13, fontWeight: 600, fontFamily: BRAND.sans,
                transition: "background 200ms",
                minWidth: 110,
                justifyContent: "center",
              }}
            >
              {copied ? "✓ Copied!" : "📋 Copy Message"}
            </button>

            {canNativeShare && (
              <button
                onClick={handleNativeShare}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "8px 16px", borderRadius: 8,
                  background: BRAND.white, color: BRAND.navy,
                  border: "1px solid " + BRAND.navy + "30",
                  cursor: "pointer", fontSize: 13, fontWeight: 600,
                  fontFamily: BRAND.sans,
                }}
              >
                📤 Share
              </button>
            )}

            <button
              onClick={handleEmail}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "8px 16px", borderRadius: 8,
                background: BRAND.white, color: BRAND.navy,
                border: "1px solid " + BRAND.navy + "30",
                cursor: "pointer", fontSize: 13, fontWeight: 600,
                fontFamily: BRAND.sans,
              }}
            >
              ✉️ Email
            </button>
          </div>

          {/* Invite code callout */}
          <div style={{
            marginTop: 12, padding: "8px 12px",
            background: "rgba(255,255,255,0.6)", borderRadius: 8,
            fontSize: 12, color: BRAND.textMuted,
            display: "flex", alignItems: "center", gap: 8,
            fontFamily: BRAND.sans,
          }}>
            <span style={{ fontWeight: 600 }}>Invite code:</span>
            <code style={{
              fontFamily: "monospace", fontSize: 13, fontWeight: 700,
              color: "#92400E", letterSpacing: "0.08em",
              background: "#FEF3C7", padding: "2px 8px", borderRadius: 4,
              textTransform: "uppercase",
            }}>
              {code}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
