import { useState, useEffect, useRef, useCallback } from "react";
import { BRAND, Icon } from "../shared";

// ═══════════════════════════════════════════════════════════════════════════
// PWA INSTALL PROMPT — Branded banner encouraging app installation.
//
// Behavior:
//   - Tracks visit count via localStorage (hoa_visit_count)
//   - Shows on 3rd visit (not immediately, to avoid overwhelming new users)
//   - Android/Chrome: captures `beforeinstallprompt` and triggers native install
//   - iOS Safari: shows manual "Add to Home Screen" instructions
//   - "Not now" dismisses for 14 days (hoa_install_dismissed_until)
//   - Hides permanently once app is running in standalone mode (already installed)
//
// localStorage keys:
//   hoa_visit_count — number of app loads
//   hoa_install_dismissed_until — ISO date string, suppresses prompt until then
// ═══════════════════════════════════════════════════════════════════════════

const DISMISS_DAYS = 14;
const SHOW_AFTER_VISITS = 3;

function isStandalone() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches
    || window.navigator.standalone === true;
}

function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

export function InstallPrompt({ hoaName, mob }) {
  const [visible, setVisible] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [exiting, setExiting] = useState(false);
  const deferredPromptRef = useRef(null);
  const iosDevice = isIOS();

  // Capture beforeinstallprompt (Android/Chrome/Edge)
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      deferredPromptRef.current = e;
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Visit counting + visibility logic
  useEffect(() => {
    // Already installed? Never show.
    if (isStandalone()) return;

    try {
      // Check dismissal
      const dismissedUntil = localStorage.getItem("hoa_install_dismissed_until");
      if (dismissedUntil && new Date(dismissedUntil) > new Date()) return;

      // Increment visit count
      const count = parseInt(localStorage.getItem("hoa_visit_count") || "0", 10) + 1;
      localStorage.setItem("hoa_visit_count", String(count));

      // Show after N visits
      if (count >= SHOW_AFTER_VISITS) {
        // Small delay so it doesn't flash during page load
        const timer = setTimeout(() => setVisible(true), 1500);
        return () => clearTimeout(timer);
      }
    } catch {
      // localStorage blocked — skip silently
    }
  }, []);

  const handleDismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => {
      setVisible(false);
      setExiting(false);
      try {
        const until = new Date();
        until.setDate(until.getDate() + DISMISS_DAYS);
        localStorage.setItem("hoa_install_dismissed_until", until.toISOString());
      } catch {}
    }, 250);
  }, []);

  const handleInstall = useCallback(async () => {
    if (deferredPromptRef.current) {
      // Android/Chrome native prompt
      deferredPromptRef.current.prompt();
      const result = await deferredPromptRef.current.userChoice;
      deferredPromptRef.current = null;
      if (result.outcome === "accepted") {
        setExiting(true);
        setTimeout(() => setVisible(false), 250);
        // Don't set dismissal — they installed it
      } else {
        handleDismiss();
      }
    } else if (iosDevice) {
      setShowIOSInstructions(true);
    }
  }, [iosDevice, handleDismiss]);

  if (!visible) return null;

  return (
    <div
      style={{
        margin: mob ? "0 0 12px" : "0 0 16px",
        borderRadius: 12,
        background: "linear-gradient(135deg, " + BRAND.navy + " 0%, #2D3B4E 100%)",
        overflow: "hidden",
        boxShadow: "0 4px 20px rgba(31,42,56,0.2)",
        animation: exiting ? "slideDown 250ms ease forwards" : "slideUp 300ms cubic-bezier(0.34,1.56,0.64,1)",
      }}
    >
      <div style={{
        display: "flex", alignItems: mob ? "flex-start" : "center",
        gap: mob ? 12 : 16, padding: mob ? "14px 14px" : "16px 20px",
        flexDirection: mob ? "column" : "row",
      }}>
        {/* Icon + text */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: "rgba(255,255,255,0.12)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <span style={{ fontSize: 22 }}>📱</span>
          </div>
          <div>
            <div style={{
              fontSize: 14, fontWeight: 700, color: "#fff",
              fontFamily: BRAND.sans, marginBottom: 2,
            }}>
              Install {hoaName}
            </div>
            <div style={{
              fontSize: 12, color: "rgba(255,255,255,0.7)",
              fontFamily: BRAND.sans, lineHeight: 1.4,
            }}>
              Add to your home screen for faster access. No app store needed.
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
          <button
            onClick={handleInstall}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "8px 18px", borderRadius: 8,
              background: BRAND.brick, color: "#fff",
              border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 700, fontFamily: BRAND.sans,
              boxShadow: "0 2px 8px rgba(142,59,46,0.3)",
              transition: "transform 150ms",
            }}
            onMouseEnter={e => e.currentTarget.style.transform = "scale(1.03)"}
            onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
          >
            Install
          </button>
          <button
            onClick={handleDismiss}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 500,
              fontFamily: BRAND.sans, padding: "8px 10px",
            }}
          >
            Not now
          </button>
        </div>
      </div>

      {/* iOS instructions dropdown */}
      {showIOSInstructions && iosDevice && (
        <div style={{
          borderTop: "1px solid rgba(255,255,255,0.1)",
          padding: "14px 20px",
          background: "rgba(255,255,255,0.06)",
          animation: "fadeIn 200ms ease",
        }}>
          <div style={{
            fontSize: 13, color: "rgba(255,255,255,0.85)",
            fontFamily: BRAND.sans, lineHeight: 1.7,
          }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>To install on iOS:</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{
                width: 22, height: 22, borderRadius: 11,
                background: "rgba(255,255,255,0.15)",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 700, flexShrink: 0,
              }}>1</span>
              Tap the <span style={{ display: "inline-flex", alignItems: "center", padding: "1px 6px", background: "rgba(255,255,255,0.15)", borderRadius: 4, fontSize: 14 }}>⬆</span> Share button in Safari
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{
                width: 22, height: 22, borderRadius: 11,
                background: "rgba(255,255,255,0.15)",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 700, flexShrink: 0,
              }}>2</span>
              Scroll down and tap <strong>"Add to Home Screen"</strong>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{
                width: 22, height: 22, borderRadius: 11,
                background: "rgba(255,255,255,0.15)",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 700, flexShrink: 0,
              }}>3</span>
              Tap <strong>"Add"</strong> to confirm
            </div>
          </div>
          <button
            onClick={() => setShowIOSInstructions(false)}
            style={{
              marginTop: 10, background: "none", border: "none",
              color: "rgba(255,255,255,0.5)", fontSize: 12,
              cursor: "pointer", fontFamily: BRAND.sans, padding: 0,
            }}
          >
            Got it
          </button>
        </div>
      )}
    </div>
  );
}
