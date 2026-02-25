import { useState, useEffect, useRef } from "react";
import {
  BRAND, STATUSES, Icon, formatDate,
} from "../shared";

// ═══════════════════════════════════════════════════════════════════════════
// ACTIVITY TIMELINE
// Shows chronological history of an entry's lifecycle.
// Works for both Work Entries and Purchase Entries.
// ═══════════════════════════════════════════════════════════════════════════

const TIMELINE_EVENTS = {
  created:        { icon: "edit",    label: "Created",              color: "#57534E" },
  submitted:      { icon: "send",    label: "Submitted for review", color: "#8E3B2E" },
  approved:       { icon: "check",   label: "Approved",             color: "#2E7D32" },
  firstApproval:  { icon: "check",   label: "First approval",      color: "#4338CA" },
  secondApproval: { icon: "check",   label: "Second approval",     color: "#2E7D32" },
  declined:       { icon: "x",       label: "Declined",             color: "#C62828" },
  needsInfo:      { icon: "help",    label: "Info requested",       color: "#9A3412" },
  resubmitted:    { icon: "send",    label: "Resubmitted",          color: "#8E3B2E" },
  paid:           { icon: "dollar",  label: "Paid",                 color: "#3B5998" },
  trashed:        { icon: "trash",   label: "Moved to trash",       color: "#7f1d1d" },
  restored:       { icon: "inbox",   label: "Restored from trash",  color: "#57534E" },
};

// Maps audit log action strings to timeline event types
function mapAuditAction(action, newStatus) {
  const map = {
    create: "created", created: "created",
    submit: "submitted", submitted: "submitted",
    resubmit: "resubmitted", resubmitted: "resubmitted",
    reject: "declined", rejected: "declined",
    decline: "declined", declined: "declined",
    needs_info: "needsInfo",
    paid: "paid", mark_paid: "paid",
    trash: "trashed", trashed: "trashed",
    restore: "restored", restored: "restored",
    second_approve: "secondApproval",
  };
  if (action === "approve" || action === "approved") {
    return newStatus === "Awaiting 2nd Approval" ? "firstApproval" : "approved";
  }
  return map[action] || null;
}

// Build timeline from entry data
export function buildTimeline(entry) {
  const events = [];

  // Created timestamp
  if (entry.createdAt) {
    events.push({ type: "created", at: entry.createdAt });
  }

  // If we have a structured audit log (from Supabase JSONB), use it
  if (entry.auditLog && Array.isArray(entry.auditLog) && entry.auditLog.length > 0) {
    entry.auditLog.forEach(log => {
      const type = mapAuditAction(log.action, log.newStatus || log.new_status);
      if (type) {
        events.push({
          type,
          at: log.timestamp || log.created_at,
          by: log.actorName || log.actor_name,
          note: log.note || log.details,
        });
      }
    });
  } else {
    // Fallback: reconstruct timeline from entry timestamp fields
    if (entry.submittedAt) {
      events.push({ type: "submitted", at: entry.submittedAt });
    }

    // If entry has been resubmitted (rejected then resubmitted),
    // we can infer from the presence of reviewerNotes + current submitted status
    if (entry.resubmittedAt) {
      events.push({ type: "resubmitted", at: entry.resubmittedAt });
    }

    if (entry.reviewedAt) {
      const status = entry.status;
      if (status === STATUSES.APPROVED || status === STATUSES.PAID) {
        events.push({ type: "approved", at: entry.reviewedAt, note: entry.reviewerNotes || null });
      } else if (status === STATUSES.REJECTED) {
        events.push({ type: "declined", at: entry.reviewedAt, note: entry.reviewerNotes || null });
      } else if (status === STATUSES.NEEDS_INFO) {
        events.push({ type: "needsInfo", at: entry.reviewedAt, note: entry.reviewerNotes || null });
      } else if (status === STATUSES.AWAITING_SECOND) {
        events.push({ type: "firstApproval", at: entry.reviewedAt, note: entry.reviewerNotes || null });
      }
    }

    if (entry.secondApprovedAt) {
      events.push({ type: "secondApproval", at: entry.secondApprovedAt });
    }

    if (entry.paidAt) {
      const payNote = entry.paymentMethod
        ? "via " + entry.paymentMethod + (entry.paymentRef ? " #" + entry.paymentRef : "")
        : null;
      events.push({ type: "paid", at: entry.paidAt, note: payNote });
    }

    if (entry.trashedAt) {
      events.push({ type: "trashed", at: entry.trashedAt });
    }
    if (entry.restoredAt) {
      events.push({ type: "restored", at: entry.restoredAt });
    }
  }

  // Sort chronologically
  events.sort((a, b) => new Date(a.at) - new Date(b.at));
  return events;
}

function formatTimelineDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / 86400000);
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  if (diffDays === 0) return "Today at " + time;
  if (diffDays === 1) return "Yesterday at " + time;
  if (diffDays < 7) return diffDays + "d ago at " + time;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " at " + time;
}

export const ActivityTimeline = ({ entry, mob }) => {
  const events = buildTimeline(entry);
  if (events.length === 0) return null;

  return (
    <div style={{ marginTop: 24, marginBottom: 8 }}>
      <div style={{
        fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
        color: BRAND.textLight, marginBottom: 14, paddingBottom: 8,
        borderBottom: "1px solid " + BRAND.borderLight,
        display: "flex", alignItems: "center", gap: 6,
      }}>
        <Icon name="clock" size={14} />
        Activity
      </div>
      <div style={{ position: "relative", paddingLeft: 28 }}>
        {/* Vertical connector line */}
        <div aria-hidden="true" style={{
          position: "absolute", left: 9, top: 6, bottom: 6,
          width: 2, background: BRAND.borderLight, borderRadius: 1,
        }} />

        {events.map((ev, i) => {
          const config = TIMELINE_EVENTS[ev.type] || TIMELINE_EVENTS.created;
          const isLast = i === events.length - 1;

          return (
            <div key={i} style={{
              position: "relative",
              marginBottom: isLast ? 0 : 16,
              animation: "fadeIn 300ms ease-out",
              animationDelay: (i * 60) + "ms",
              animationFillMode: "backwards",
            }}>
              {/* Timeline dot */}
              <div aria-hidden="true" style={{
                position: "absolute", left: -28, top: 1,
                width: 20, height: 20, borderRadius: 10,
                background: isLast ? config.color : BRAND.white,
                border: "2px solid " + config.color,
                display: "flex", alignItems: "center", justifyContent: "center",
                zIndex: 1,
              }}>
                <svg width={10} height={10} viewBox="0 0 24 24" fill="none"
                  stroke={isLast ? "#fff" : config.color}
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d={getIconPath(config.icon)} />
                </svg>
              </div>

              {/* Event content */}
              <div>
                <div style={{
                  display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap",
                }}>
                  <span style={{
                    fontSize: 14, fontWeight: 600, color: BRAND.charcoal,
                  }}>
                    {config.label}
                  </span>
                  <span style={{ fontSize: 13, color: BRAND.textLight }}>
                    {formatTimelineDate(ev.at)}
                  </span>
                </div>
                {ev.by && (
                  <div style={{ fontSize: 13, color: BRAND.textMuted, marginTop: 2 }}>
                    by {ev.by}
                  </div>
                )}
                {ev.note && (
                  <div style={{
                    fontSize: 13, color: BRAND.textMuted, marginTop: 4,
                    padding: "6px 10px", background: BRAND.bgSoft,
                    borderRadius: 6, borderLeft: "3px solid " + config.color,
                    lineHeight: 1.5,
                  }}>
                    {ev.note}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Inline icon paths so we don't depend on the full Icon component for the tiny 10px dots
function getIconPath(name) {
  const paths = {
    edit: "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7",
    send: "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z",
    check: "M20 6L9 17l-5-5",
    x: "M18 6L6 18M6 6l12 12",
    dollar: "M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6",
    clock: "M12 2a10 10 0 100 20 10 10 0 000-20zM12 6v6l4 2",
    help: "M12 2a10 10 0 100 20 10 10 0 000-20zM9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01",
    trash: "M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2",
    inbox: "M22 12h-6l-2 3h-4l-2-3H2",
  };
  return paths[name] || paths.check;
}
