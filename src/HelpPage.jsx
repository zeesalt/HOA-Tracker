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
} from "../shared";

export const HelpPage = ({ currentUser, settings, mob, onNav }) => {
  const isTreasurer = currentUser?.role === ROLES.TREASURER;
  const [openSection, setOpenSection] = useState(null);
  const toggle = (id) => setOpenSection(s => s === id ? null : id);

  const hoaName = settings?.hoaName || "24 Mill Street";

  const WORKFLOW = [
    { emoji: "✏️", label: "Log Work", sub: "Create a draft", bg: "#EFF6FF", color: "#1565C0" },
    { emoji: "📤", label: "Submit", sub: "Send for review", bg: "#FFF0E0", color: "#8E3B2E" },
    { emoji: "✓",  label: "Approved", sub: "Treasurer signs off", bg: "#E8F0E6", color: "#2E7D32" },
    { emoji: "💳", label: "Paid", sub: "Money sent to you", bg: "#E8EDF5", color: "#3B5998" },
  ];

  const MEMBER_SECTIONS = [
    {
      id: "log",
      emoji: "📋",
      title: "Logging Work",
      items: [
        { q: "How do I create a new entry?", a: "Tap the + button (bottom-right on mobile, top-right on desktop) to open a new entry form. Fill in the date, start and end times, category, and a description of what you did." },
        { q: "Can I log work from a past date?", a: "Yes — the date field defaults to today but you can change it to any past date for retroactive logging." },
        { q: "What categories can I use?", a: "Landscaping, Plumbing, Electrical, General Maintenance, Snow Removal, Cleaning, Vendor Coordination, Administrative Work, and Emergency Repairs." },
        { q: "Do I need to fill in the end time?", a: "Yes — start and end time are required. They're used to calculate your total hours and labor amount automatically." },
      ],
    },
    {
      id: "materials",
      emoji: "🧾",
      title: "Materials & Receipts",
      items: [
        { q: "How do I add materials I purchased?", a: "In the entry form, scroll to the Materials section and tap \"Add Material\". Enter the item name, quantity, and unit cost. The total calculates automatically." },
        { q: "Should I attach receipts?", a: "Yes — always attach receipts for material purchases. Entries with receipts are approved faster and reduce back-and-forth with the Treasurer." },
        { q: "Where do I upload photos?", a: "In the entry form, scroll to the Photos section. You can upload before and after photos separately. Photos make it much easier for the Treasurer to approve your work." },
      ],
    },
    {
      id: "templates",
      emoji: "⚡",
      title: "Templates",
      items: [
        { q: "What is a template?", a: "A template saves a complete entry (category, description, times, location, materials) so you can reuse it with one tap. Great for recurring tasks like weekly lawn mowing or monthly inspections." },
        { q: "How do I save a template?", a: "Fill out an entry form and tap \"Save as Template\" at the bottom. Give it a name. It'll appear in your Templates list next time you create an entry." },
        { q: "How do I use a saved template?", a: "When creating a new entry, a blue banner at the top shows your templates. Tap \"Use a Template\", select one, and the form pre-fills. The date always resets to today." },
        { q: "How many templates can I have?", a: "Up to 10. Templates are stored on your device — they won't carry over if you switch browsers or devices." },
      ],
    },
    {
      id: "status",
      emoji: "🔄",
      title: "Entry Status",
      items: [
        { q: "What does Draft mean?", a: "You've saved the entry but haven't submitted it yet. Only you can see drafts. You can edit or delete a draft at any time." },
        { q: "What happens after I submit?", a: "The entry moves to Submitted (Pending Review). The Treasurer will review it and either approve it or send it back with notes." },
        { q: "My entry was declined — what now?", a: "Read the Treasurer's note (shown on the entry), make the requested changes, and resubmit. The entry goes back into the review queue." },
        { q: "What is Needs Info?", a: "The Treasurer has a question but hasn't declined the entry. Check the Discussion thread inside the entry for their message and reply there." },
        { q: "What's the difference between Approved and Paid?", a: "Approved means the Treasurer has signed off. Paid means the money has actually been sent to you via the payment method on record." },
      ],
    },
    {
      id: "comments",
      emoji: "💬",
      title: "Discussion & Messages",
      items: [
        { q: "How do I message the Treasurer about an entry?", a: "Open the entry and scroll to the Discussion section. Type your message and press Send (or Enter). The Treasurer will see it and can reply in the same thread." },
        { q: "How do I know if the Treasurer replied?", a: "A 💬 badge appears on the entry card showing the number of messages. Check entries with that badge for new replies." },
        { q: "Can I message before submitting?", a: "No — the Discussion thread is only available on submitted entries (not drafts). Submit your entry first, then use Discussion for any follow-up." },
      ],
    },
    {
      id: "dashboard",
      emoji: "📊",
      title: "Your Dashboard",
      items: [
        { q: "What does my Dashboard show?", a: "Your year-to-date approved and paid totals, pending entries with how long they've been waiting (color-coded by age), and any declined or Needs Info entries requiring your action." },
        { q: "What does \"Owed to You\" mean?", a: "The total amount across all your Approved entries — work that's been signed off but not yet paid out." },
        { q: "How is my hourly rate set?", a: "The Treasurer sets a default rate for all members. You may have a custom rate set for you individually — the rate is shown on your entry summary when you create one." },
      ],
    },
  ];

  const TREASURER_SECTIONS = [
    {
      id: "review",
      emoji: "🔍",
      title: "Reviewing Entries",
      items: [
        { q: "Where do I review entries?", a: "Go to Review Queue in the sidebar. All Submitted entries appear here, oldest first. You can also bulk-approve multiple entries at once." },
        { q: "How do I approve an entry?", a: "Open the entry and click Approve (or use the quick-approve button in the Review Queue). You can add an optional note before approving." },
        { q: "How do I decline an entry?", a: "Click Decline, enter a reason (required), and confirm. The entry returns to the member as Declined and they'll see your note." },
        { q: "What is Needs Info?", a: "Use this when you have a question but don't want to fully decline. The entry is flagged and the member is expected to respond via the Discussion thread." },
        { q: "What is dual approval?", a: "Entries above the dual approval threshold (set in Settings) require a second board member to approve. The first approval marks it Awaiting Second; a second treasurer-role user must then approve." },
      ],
    },
    {
      id: "payment",
      emoji: "💳",
      title: "Payment Run",
      items: [
        { q: "What is a Payment Run?", a: "A dedicated page (sidebar: Payment Run) that groups all Approved-but-unpaid entries by member. You set the payment method and reference number once per member and mark all their entries paid simultaneously." },
        { q: "Can I pay individual entries instead of a full batch?", a: "Yes — open any individual Approved entry and use the Payment Details section at the bottom to mark it paid with a custom method and reference." },
        { q: "Is marking as Paid reversible?", a: "No — Paid is a terminal status. If you mark something paid in error, contact your administrator. All payment details are recorded in the audit log." },
      ],
    },
    {
      id: "reports",
      emoji: "📄",
      title: "Reports & Export",
      items: [
        { q: "How do I generate a report?", a: "Go to Reports in the sidebar. Choose a date range and member filter, then export as PDF or CSV. Reports only include Approved entries by default." },
        { q: "What's included in a report?", a: "HOA name, date range, hourly rate, and an itemized table of entries with hours, labor, materials, and totals. Summarized totals at the bottom." },
        { q: "Can I include all statuses in a report?", a: "Yes — the Reports page has a status filter so you can include Submitted or other statuses if needed." },
      ],
    },
    {
      id: "settings",
      emoji: "⚙️",
      title: "Settings",
      items: [
        { q: "How do I change the HOA name?", a: "Go to Settings → HOA Name. Changes apply immediately across the app and on all future reports." },
        { q: "How do I change the hourly rate?", a: "Go to Settings → Default Hourly Rate. You can also set a per-member custom rate in the Members section of Settings." },
        { q: "How do I add a new member?", a: "Go to Settings → Members → Add Member. Enter their name, email, and a temporary password. They'll sign in and can change their password after first login." },
        { q: "What is the dual approval threshold?", a: "Set a dollar amount in Settings. Any entry above that amount requires two treasurer-role users to approve before it moves to Approved status." },
      ],
    },
  ];

  const sections = isTreasurer ? TREASURER_SECTIONS : MEMBER_SECTIONS;

  const statusRef = [
    { name: "Draft",     desc: "Saved, not submitted yet", bg: "#EDEBE8", border: "#D5D0C9", dot: "#9E9E9E", text: "#222" },
    { name: "Submitted", desc: "Awaiting Treasurer review", bg: "#FFF0E0", border: "#E8C4A8", dot: "#8E3B2E", text: "#6D3620" },
    { name: "Approved",  desc: "Signed off, payment pending", bg: "#E8F0E6", border: "#B5CCAE", dot: "#2E7D32", text: "#2F4F3E" },
    { name: "Paid",      desc: "Payment sent", bg: "#E8EDF5", border: "#B8C8E0", dot: "#3B5998", text: "#2C4478" },
    { name: "Declined",  desc: "Edit and resubmit", bg: "#FDEAEA", border: "#F0BABA", dot: "#C62828", text: "#7f1d1d" },
    { name: "Needs Info", desc: "Treasurer has a question", bg: "#FFF7ED", border: "#FED7AA", dot: "#C2410C", text: "#7C3910" },
  ];

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ ...S.h2, marginBottom: 6 }}>Help</h2>
        <p style={{ fontSize: 14, color: BRAND.textMuted, margin: 0 }}>
          {isTreasurer ? "Treasurer guide for " : "Member guide for "}<strong style={{ color: BRAND.navy }}>{hoaName}</strong>
        </p>
      </div>

      {/* Workflow strip — member only */}
      {!isTreasurer && (
        <div style={{ ...S.card, padding: mob ? "20px 16px" : "24px 28px", marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: BRAND.textLight, marginBottom: 18 }}>How reimbursement works</div>
          <div style={{ display: "flex", alignItems: "center", flexWrap: mob ? "wrap" : "nowrap", gap: mob ? 12 : 0 }}>
            {WORKFLOW.map((step, i) => (
              <React.Fragment key={step.label}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: mob ? "0 0 calc(50% - 6px)" : 1, textAlign: "center" }}>
                  <div style={{ width: 48, height: 48, borderRadius: 24, background: step.bg, color: step.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, marginBottom: 8, fontWeight: 700 }}>{step.emoji}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: BRAND.navy }}>{step.label}</div>
                  <div style={{ fontSize: 11, color: BRAND.textMuted, marginTop: 2 }}>{step.sub}</div>
                </div>
                {!mob && i < WORKFLOW.length - 1 && (
                  <div style={{ flex: 1, height: 2, background: BRAND.borderLight, margin: "0 8px", marginBottom: 24 }} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Quick actions */}
      {!isTreasurer && (
        <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr 1fr" : "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
          {[
            { emoji: "✏️", label: "Log new work", action: () => onNav("entries") },
            { emoji: "📋", label: "View my entries", action: () => onNav("entries") },
            { emoji: "📊", label: "See my dashboard", action: () => onNav("dashboard") },
          ].map(item => (
            <button key={item.label} onClick={item.action} style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", background: BRAND.white, border: "1px solid " + BRAND.borderLight, borderRadius: 10, cursor: "pointer", fontFamily: BRAND.sans, textAlign: "left", transition: "all 200ms" }}
              onMouseEnter={e => { e.currentTarget.style.background = BRAND.bgSoft; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = BRAND.white; e.currentTarget.style.transform = "translateY(0)"; }}>
              <span style={{ fontSize: 22 }}>{item.emoji}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: BRAND.navy }}>{item.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* FAQ accordion */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: BRAND.textLight, marginBottom: 14, paddingBottom: 10, borderBottom: "1px solid " + BRAND.borderLight }}>
          Frequently asked questions
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {sections.map(section => (
            <div key={section.id} style={{ background: BRAND.white, border: "1px solid " + BRAND.borderLight, borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 6px rgba(0,0,0,0.03)" }}>
              {/* Section header */}
              <button
                onClick={() => toggle(section.id)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", background: "none", border: "none", cursor: "pointer", fontFamily: BRAND.sans, textAlign: "left", borderBottom: openSection === section.id ? "1px solid " + BRAND.borderLight : "none", transition: "background 150ms" }}
                onMouseEnter={e => e.currentTarget.style.background = BRAND.bgSoft}
                onMouseLeave={e => e.currentTarget.style.background = "none"}
              >
                <span style={{ fontSize: 22, flexShrink: 0 }}>{section.emoji}</span>
                <span style={{ flex: 1, fontWeight: 700, fontSize: 15, color: BRAND.navy }}>{section.title}</span>
                <span style={{ fontSize: 18, color: BRAND.textLight, transform: openSection === section.id ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 250ms" }}>⌄</span>
              </button>
              {/* Q&A items */}
              {openSection === section.id && (
                <div className="fade-in">
                  {section.items.map((item, i) => (
                    <div key={i} style={{ padding: "16px 20px", borderBottom: i < section.items.length - 1 ? "1px solid " + BRAND.borderLight + "80" : "none" }}>
                      <div style={{ fontWeight: 600, fontSize: 13.5, color: BRAND.charcoal, marginBottom: 6, display: "flex", gap: 8 }}>
                        <span style={{ color: BRAND.brick, flexShrink: 0, marginTop: 1 }}>Q</span>
                        <span>{item.q}</span>
                      </div>
                      <div style={{ fontSize: 13.5, color: BRAND.textMuted, lineHeight: 1.65, paddingLeft: 20 }}>{item.a}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Status reference */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: BRAND.textLight, marginBottom: 14, paddingBottom: 10, borderBottom: "1px solid " + BRAND.borderLight }}>
          Entry status reference
        </div>
        <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "repeat(2, 1fr)", gap: 10 }}>
          {statusRef.map(s => (
            <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 10, background: s.bg, border: "1px solid " + s.border }}>
              <div style={{ width: 10, height: 10, borderRadius: 5, background: s.dot, flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: s.text }}>{s.name}</div>
                <div style={{ fontSize: 12, color: s.text, opacity: 0.75, marginTop: 1 }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tips — member only */}
      {!isTreasurer && (
        <div style={{ ...S.card, background: BRAND.navy, border: "none", padding: mob ? 20 : 28, marginBottom: 16 }}>
          <div style={{ fontFamily: BRAND.serif, fontSize: 20, fontStyle: "italic", fontWeight: 600, color: "#D4B97A", marginBottom: 18 }}>Tips for faster approvals</div>
          {[
            { icon: "📸", tip: <><strong style={{ color: "#fff" }}>Always attach a photo.</strong> Entries with before/after photos are approved much faster — the Treasurer sees the work without needing to ask.</> },
            { icon: "🧾", tip: <><strong style={{ color: "#fff" }}>Add receipts for materials.</strong> Itemize each purchase individually. Lumping everything into one line will slow down review.</> },
            { icon: "📝", tip: <><strong style={{ color: "#fff" }}>Write a clear description.</strong> "Mowed front lawn, edged walkway, cleared clippings" beats "lawn work" every time.</> },
            { icon: "💬", tip: <><strong style={{ color: "#fff" }}>Use Discussion, not email.</strong> All questions from the Treasurer will come through the entry's Discussion thread — check the 💬 badge on your cards.</> },
          ].map((t, i) => (
            <div key={i} style={{ display: "flex", gap: 14, marginBottom: i < 3 ? 14 : 0 }}>
              <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{t.icon}</span>
              <div style={{ fontSize: 13.5, color: "rgba(255,255,255,0.8)", lineHeight: 1.65 }}>{t.tip}</div>
            </div>
          ))}
        </div>
      )}

      {/* Contact footer */}
      <div style={{ textAlign: "center", padding: "20px 16px", color: BRAND.textMuted, fontSize: 13 }}>
        Have a question not answered here? Use the 💬 Discussion thread on any entry to message your Treasurer directly.
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// PAYMENT RUN PAGE
// ═══════════════════════════════════════════════════════════════════════════
