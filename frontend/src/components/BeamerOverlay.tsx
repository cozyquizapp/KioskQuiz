// 2026-05-05 — BeamerOverlay-Wrapper (Phase 4 Bucket-1, CC-4-Fix)
//
// Zentrale Komponente für Vollflaechen-Overlays auf der QQBeamerPage
// (QuizIntroOverlay, RulesIntroOverlay, kuenftige Splash-Overlays).
//
// Problem: Inline-`position: fixed`-Pattern haengt von Stacking-Context-
// Verhalten der Parent-Hierarchie ab. Sobald irgendwo ein `transform`
// im Ancestor sitzt (z.B. beamerFade-Animation), wird `fixed` zu `absolute`-
// relativ-zum-Transform-Ancestor — was zu unsichtbaren Clipping-Bugs fuehrt.
//
// Loesung: `position: absolute, inset: 0` mit klarem Positioning-Ancestor
// (die QQBeamerPage-Root-Div hat `position: relative`). Damit ist das
// Visual-Result identisch zu `fixed`, aber deterministisch — kein Trap.
//
// Siehe: STYLE_GUIDE.md → "Overlays im BeamerPage" + "Position-Fixed-Trap".

import { useEffect, useState, type ReactNode, type CSSProperties } from 'react';

export type BeamerOverlayProps = {
  /** Steuert opacity + Transform-Crossfade. */
  visible: boolean;
  /** Stacking-Reihenfolge. Default 9988 (unter Grain-Layer 9990, ueber Content). */
  zIndex?: number;
  /** Hintergrund (CSS background-Property). Optional — z.B. radial-gradient. */
  background?: string;
  /** Skalierung im Hidden-Zustand. <1 = wachsen-rein, >1 = schrumpfen-rein. Default 0.98. */
  hiddenScale?: number;
  /** Kinder-Inhalt — wird im Center-Flex-Layout dargestellt. */
  children: ReactNode;
  /** Optionale Style-Overrides (z.B. fontFamily ueberschreiben). */
  style?: CSSProperties;
};

export function BeamerOverlay({
  visible,
  zIndex = 9988,
  background,
  hiddenScale = 0.98,
  children,
  style,
}: BeamerOverlayProps) {
  // Wolf 2026-05-05: Children werden bei jedem visible→true Wechsel via
  // mountKey re-mountet — CSS-Animationen mit `both` fill-mode spielen damit
  // FRISCH ab statt im End-Zustand zu haengen. Vorher: Welcome erschien als
  // Standbild weil die Animationen schon beim ersten Mount (in Lobby-Phase,
  // unsichtbar) durchgelaufen waren.
  // Bei visible→false bleiben Children noch ~700ms gemountet damit der
  // Crossfade-Out die Inhalte mitfaden kann (statt auf leerem Container).
  const [mountKey, setMountKey] = useState(0);
  const [shouldRender, setShouldRender] = useState(visible);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      setMountKey(k => k + 1);
    } else {
      const t = window.setTimeout(() => setShouldRender(false), 700);
      return () => window.clearTimeout(t);
    }
  }, [visible]);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background,
        overflow: 'hidden',
        fontFamily: "'Nunito', system-ui, sans-serif",
        opacity: visible ? 1 : 0,
        transform: visible ? 'scale(1)' : `scale(${hiddenScale})`,
        transition: 'opacity 0.55s ease, transform 0.65s var(--qq-ease-smooth)',
        pointerEvents: visible ? 'auto' : 'none',
        ...style,
      }}
    >
      {shouldRender ? <div key={mountKey}>{children}</div> : null}
    </div>
  );
}
