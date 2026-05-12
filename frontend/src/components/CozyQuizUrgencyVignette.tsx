/**
 * CozyQuizUrgencyVignette — fullscreen Pulse-Overlay bei Timer-Ende.
 *
 * Letzte 5 Sek vor Timer-Ende: orange-pulse. Letzte 3 Sek: red-aggressive
 * (kuerzerer Loop). Bei 0s: kurzer Gold-Flash. Pure Overlay (fixed/inset/
 * pointer-none) — beeinflusst Layout nicht.
 *
 * 2026-05-04 (Wolf #1): "den ganzen Bildschirm beleben in den letzten Sek".
 * Extrahiert 2026-05-12 (Refactor Phase 1) — nur in BeamerView Top-Level
 * verwendet (1 internal Caller).
 *
 * Keyframes (urgencyFlashGold, urgencyVignettePulse): in BEAMER_CSS global.
 */
import { useEffect, useState } from 'react';

export function UrgencyVignette({ endsAt }: { endsAt: number }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, (endsAt - Date.now()) / 1000));
  useEffect(() => {
    const iv = setInterval(() => {
      const r = Math.max(0, (endsAt - Date.now()) / 1000);
      setRemaining(r);
      if (r === 0) clearInterval(iv);
    }, 100);
    return () => clearInterval(iv);
  }, [endsAt]);

  const isCritical = remaining > 0 && remaining <= 3;
  const isWarning = remaining > 3 && remaining <= 5;
  const justExpired = remaining === 0;

  if (!isCritical && !isWarning && !justExpired) return null;

  if (justExpired) {
    return (
      <div
        aria-hidden
        style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 8500,
          animation: 'urgencyFlashGold 0.6s ease-out 1 both',
        }}
      />
    );
  }

  // Vignette: rot pulsierend bei <=3s (0.4s Loop = aggressiv),
  // orange dezenter bei <=5s (0.8s Loop).
  const color = isCritical ? '239,68,68' : '249,115,22';   // red-500 / orange-500
  const animDuration = isCritical ? '0.4s' : '0.8s';
  return (
    <div
      aria-hidden
      style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 8500,
        animation: `urgencyVignettePulse ${animDuration} ease-in-out infinite`,
        ['--urg-color' as any]: color,
      }}
    />
  );
}
