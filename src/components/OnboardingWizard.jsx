import { useState, useRef, useEffect, useCallback } from "react";
import { BRAND, Icon } from "../shared";

// ═══════════════════════════════════════════════════════════════════════════
// ONBOARDING WIZARD — 3-screen first-run experience for new members
// Shows once on first login when user has zero entries.
// localStorage key: hoa_onboarding_seen_{userId}
// ═══════════════════════════════════════════════════════════════════════════

const STEPS = [
  {
    emoji: "📋",
    title: "How Reimbursement Works",
    steps: [
      { icon: "✏️", label: "Draft", desc: "Log your work or purchase with date, time, and details" },
      { icon: "📤", label: "Submit", desc: "Send it to your Treasurer for review" },
      { icon: "✅", label: "Approved", desc: "Treasurer reviews and approves your entry" },
      { icon: "💳", label: "Paid", desc: "Receive your reimbursement" },
    ],
  },
  {
    emoji: "🔨",
    title: "What You Can Log",
    items: [
      { icon: "⏱️", label: "Work hours", desc: "Landscaping, plumbing, maintenance, and more" },
      { icon: "🛍️", label: "Purchases", desc: "Supplies, tools, materials with receipts" },
      { icon: "📸", label: "Photos", desc: "Before/after shots and receipt images" },
      { icon: "🚗", label: "Mileage", desc: "Travel for HOA-related errands" },
    ],
  },
  {
    emoji: "🚀",
    title: "You're Ready!",
    cta: true,
  },
];

export function OnboardingWizard({ onClose, onCreateEntry, hoaName, mob }) {
  const [step, setStep] = useState(0);
  const [exiting, setExiting] = useState(false);
  const [slideDir, setSlideDir] = useState("right"); // "right" or "left"
  const touchStartX = useRef(null);
  const containerRef = useRef(null);

  const isLast = step === STEPS.length - 1;

  const goNext = useCallback(() => {
    if (isLast) return;
    setSlideDir("right");
    setStep(s => s + 1);
  }, [isLast]);

  const goPrev = useCallback(() => {
    if (step === 0) return;
    setSlideDir("left");
    setStep(s => s - 1);
  }, [step]);

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(onClose, 200);
  }, [onClose]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") goNext();
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") goPrev();
      else if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev, dismiss]);

  // Focus trap
  useEffect(() => {
    if (containerRef.current) containerRef.current.focus();
  }, [step]);

  // Touch swipe
  const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 40) return;
    if (dx < 0) goNext();
    else goPrev();
  };

  const current = STEPS[step];

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: mob ? 16 : 24,
        animation: exiting ? "fadeOut 200ms ease forwards" : "fadeIn 200ms ease",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}
    >
      <div
        ref={containerRef}
        tabIndex={-1}
        role="dialog"
        aria-label="Welcome to your HOA"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{
          background: BRAND.white,
          borderRadius: 20,
          width: "100%",
          maxWidth: 420,
          overflow: "hidden",
          boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
          outline: "none",
          animation: exiting ? "slideDown 200ms ease forwards" : "slideUp 280ms cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        {/* Header bar */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px 0",
        }}>
          <span style={{ fontSize: 12, color: BRAND.textMuted, fontWeight: 600, fontFamily: BRAND.sans }}>
            Welcome to {hoaName}
          </span>
          <button
            aria-label="Skip onboarding"
            onClick={dismiss}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: BRAND.textLight, fontSize: 13, fontFamily: BRAND.sans,
              fontWeight: 500, padding: "4px 8px", borderRadius: 6,
            }}
          >
            Skip
          </button>
        </div>

        {/* Content area */}
        <div
          key={step}
          style={{
            padding: mob ? "24px 20px 20px" : "32px 28px 24px",
            animation: slideDir === "right"
              ? "slideInRight 220ms cubic-bezier(0.25,0.46,0.45,0.94)"
              : "slideInLeft 220ms cubic-bezier(0.25,0.46,0.45,0.94)",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>{current.emoji}</div>
            <div style={{
              fontFamily: BRAND.serif, fontSize: mob ? 22 : 26, fontWeight: 600,
              color: BRAND.navy, lineHeight: 1.2,
            }}>
              {current.title}
            </div>
          </div>

          {/* Step 1: Workflow steps */}
          {current.steps && (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {current.steps.map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  {/* Connector line + dot */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 32 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 16,
                      background: BRAND.navy + "12", display: "flex",
                      alignItems: "center", justifyContent: "center", fontSize: 16,
                      animation: `stepPop 300ms cubic-bezier(0.34,1.56,0.64,1) ${i * 120}ms both`,
                    }}>
                      {s.icon}
                    </div>
                    {i < current.steps.length - 1 && (
                      <div style={{
                        width: 2, height: 24, background: BRAND.navy + "18",
                        animation: `fadeIn 200ms ease ${(i + 1) * 120}ms both`,
                      }} />
                    )}
                  </div>
                  <div style={{
                    flex: 1, paddingBottom: i < current.steps.length - 1 ? 8 : 0,
                    animation: `fadeIn 250ms ease ${i * 120}ms both`,
                  }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: BRAND.navy }}>{s.label}</div>
                    <div style={{ fontSize: 13, color: BRAND.textMuted, lineHeight: 1.5 }}>{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step 2: Feature cards */}
          {current.items && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {current.items.map((item, i) => (
                <div
                  key={i}
                  style={{
                    padding: "14px 12px", borderRadius: 12,
                    background: BRAND.bgSoft, border: "1px solid " + BRAND.borderLight,
                    textAlign: "center",
                    animation: `stepPop 300ms cubic-bezier(0.34,1.56,0.64,1) ${i * 80}ms both`,
                  }}
                >
                  <div style={{ fontSize: 24, marginBottom: 6 }}>{item.icon}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: BRAND.navy, marginBottom: 2 }}>{item.label}</div>
                  <div style={{ fontSize: 12, color: BRAND.textMuted, lineHeight: 1.4 }}>{item.desc}</div>
                </div>
              ))}
            </div>
          )}

          {/* Step 3: CTA */}
          {current.cta && (
            <div style={{ textAlign: "center" }}>
              <div style={{
                fontSize: 15, color: BRAND.textMuted, lineHeight: 1.7, marginBottom: 24,
                animation: "fadeIn 300ms ease both",
              }}>
                Create your first entry to get started. You can save it as a draft and submit when ready.
              </div>
              <button
                onClick={() => { dismiss(); setTimeout(() => onCreateEntry(), 250); }}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "14px 28px", background: BRAND.brick, color: "#fff",
                  border: "none", borderRadius: 10, fontSize: 16, fontWeight: 700,
                  cursor: "pointer", fontFamily: BRAND.sans,
                  boxShadow: "0 4px 16px rgba(142,59,46,0.3)",
                  transition: "transform 150ms",
                  animation: "stepPop 400ms cubic-bezier(0.34,1.56,0.64,1) 100ms both",
                }}
                onMouseEnter={e => e.currentTarget.style.transform = "scale(1.04)"}
                onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
              >
                <Icon name="plus" size={18} /> Create Your First Entry
              </button>
              <button
                onClick={dismiss}
                style={{
                  display: "block", margin: "14px auto 0", background: "none",
                  border: "none", color: BRAND.textLight, fontSize: 13,
                  cursor: "pointer", fontFamily: BRAND.sans, padding: "6px 12px",
                }}
              >
                I'll explore first
              </button>
            </div>
          )}
        </div>

        {/* Footer: dots + nav buttons */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 20px 20px", borderTop: "1px solid " + BRAND.borderLight,
        }}>
          <button
            onClick={goPrev}
            disabled={step === 0}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "8px 14px", borderRadius: 8,
              background: step === 0 ? "transparent" : BRAND.bgSoft,
              border: "none", cursor: step === 0 ? "default" : "pointer",
              color: step === 0 ? "transparent" : BRAND.textMuted,
              fontSize: 13, fontWeight: 600, fontFamily: BRAND.sans,
            }}
          >
            ← Back
          </button>

          {/* Dots */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {STEPS.map((_, i) => (
              <button
                key={i}
                aria-label={`Go to step ${i + 1}`}
                onClick={() => { setSlideDir(i > step ? "right" : "left"); setStep(i); }}
                style={{
                  width: i === step ? 20 : 8, height: 8,
                  borderRadius: 4,
                  background: i === step ? BRAND.navy : BRAND.navy + "25",
                  border: "none", cursor: "pointer", padding: 0,
                  transition: "all 250ms ease",
                }}
              />
            ))}
          </div>

          {!isLast ? (
            <button
              onClick={goNext}
              style={{
                display: "flex", alignItems: "center", gap: 4,
                padding: "8px 14px", borderRadius: 8,
                background: BRAND.navy, color: "#fff",
                border: "none", cursor: "pointer",
                fontSize: 13, fontWeight: 600, fontFamily: BRAND.sans,
              }}
            >
              Next →
            </button>
          ) : (
            <div style={{ width: 80 }} /> // spacer to keep dots centered
          )}
        </div>
      </div>
    </div>
  );
}
