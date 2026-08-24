/**
 * CozyQuizBeamerTimer — Hero-Ring-Timer fuer Beamer-Views.
 *
 * SVG-Ring der von voll → 0 schrumpft. Multi-Stage-Urgency: blau (default) →
 * pink (≤10s) → orange (≤5s) → rot (≤3s). Critical-Phase pulst zusaetzlich.
 * Outro-Animation wenn Timer natuerlich auf 0 laeuft ODER expireNow=true
 * gesetzt wird (z.B. wenn alle Teams frueh abgeben).
 *
 * Extrahiert aus QQBeamerPage.tsx 2026-05-12 (Refactor Phase 1) — vorher
 * inline um Zeile 21077. 3 externe Importer: QuestionView, BluffVoteScreen,
 * ComebackView. Zero-State-Abhaengigkeit zum Game-State, rein Timer-Logik.
 *
 * Keyframes (qqTimerOutro, bTimerPulse, bTimerGlow) leben in BEAMER_CSS /
 * qqShared — werden global gemounted durch QQBeamerPage's <style>{BEAMER_CSS}</style>.
 */
import { useEffect, useState } from 'react';
import { getServerNow } from '../utils/serverTime';
import { useActiveThemeId, isCozyLook } from '../qqTheme';

/**
 * Zeitleiste ueber die ganze Bildbreite — Uebergabe 2a, Aenderung 7.
 *
 * Die Leiste ist der periphere Kanal: sie sagt aus dem Augenwinkel, wie viel
 * Zeit noch da ist, ohne dass jemand hinsehen muss. Die genaue Zahl liefert
 * die Anzeige rechts oben. Zwei Kanaele, zwei verschiedene Aufgaben — der
 * frueher zusaetzlich vorhandene Ring war ein dritter, der dasselbe wie die
 * Leiste erzaehlt hat (Anteil), nur auf 204px Ecke statt am Bildrand.
 *
 * Die Leiste liegt oben und nicht unten: unten sitzen die Teammarken, und der
 * Blick soll dort nicht mit der Zeit konkurrieren.
 */
/**
 * StageStepBar — Schrittleiste am oberen Buehnenrand.
 *
 * 2026-08-22 (Wolf: „die leiste oben gefaellt mir noch nicht, hast du ne idee
 * wie wir das besser machen koennen?").
 *
 * Ersetzt in den Regeln die Reihe aus fuenf beschrifteten Chips. Die war eine
 * NAVIGATIONSLEISTE, und das ist auf einer Projektion das falsche Werkzeug:
 *   - fuenf Chips von Rand zu Rand sind ein Bedien-Idiom, keine Buehne
 *   - sie konkurrierte mit der Karte: unten eine riesige Ueberschrift, oben
 *     fuenf Beschriftungen in aehnlicher Textgroesse — zwei Textzonen
 *   - und sie war halb redundant. „Get ready" stand oben klein und direkt
 *     darunter gross als Kartenueberschrift.
 *
 * Wofuer die Leiste wirklich da ist: zeigen wie weit wir sind, und beruhigen
 * dass es kurz ist. Beides braucht POSITION, keine Beschriftungen.
 *
 * Geometrie bewusst identisch zur StageTimeBar darunter: ganz oben, volle
 * Breite, 12 px. Damit hat die Buehne EIN Vokabular fuer „hier laeuft etwas
 * am oberen Rand" statt zwei. Unterschied ist nur die Teilung: die Zeit
 * laeuft stufenlos, Schritte sind gezaehlt und werden deshalb segmentiert.
 */
export function StageStepBar({ total, current, accent, endsAt, durationSec }: {
  total: number;
  /** 0-basiert: der Schritt, der gerade laeuft. */
  current: number;
  accent?: string;
  /**
   * 2026-08-24 (Wolf: „waere nice wenn die einzelnen segmente oben quasi wie
   * der timer ablaeuft nur gegenteilig vollaufen, sobald ein teilbalken voll
   * kommt ein neuer regelslide").
   *
   * Wenn gesetzt, LAEUFT das aktuelle Segment voll statt sofort gefuellt zu
   * sein. Die Zahl kommt vom Server (`rulesSlideEndsAt`), nicht von hier: sonst
   * wuerde ein Neuladen des Beamers die Folie neu starten, und Wand und
   * Moderator haetten verschiedene Restzeiten.
   *
   * Ohne die beiden Werte verhaelt sich die Leiste wie vorher - der Aufruf in
   * anderen Ansichten bleibt unveraendert gueltig.
   */
  endsAt?: number | null;
  durationSec?: number;
}) {
  const laeuft = endsAt != null && (durationSec ?? 0) > 0;
  const [anteil, setAnteil] = useState(0);
  useEffect(() => {
    if (!laeuft) { setAnteil(0); return; }
    const tick = () => {
      const rest = Math.max(0, (endsAt! - getServerNow()) / 1000);
      setAnteil(Math.min(1, Math.max(0, 1 - rest / durationSec!)));
    };
    tick();
    const iv = setInterval(tick, 100);
    return () => clearInterval(iv);
  }, [laeuft, endsAt, durationSec]);

  if (total <= 1) return null;
  const farbe = accent ?? 'var(--qq-text)';
  return (
    <div aria-hidden style={{
      position: 'absolute', top: 0, left: 0, right: 0, height: 12,
      display: 'flex', gap: 3, zIndex: 9,
    }}>
      {Array.from({ length: total }, (_, i) => {
        // Erledigte Segmente stehen voll, kommende bleiben der Grund der
        // Leiste. Das aktuelle laeuft - oder steht voll, wenn keine Uhr laeuft
        // (letzte Folie, Willkommen).
        const erledigt = i < current;
        const aktuell = i === current;
        const fuellung = erledigt ? 1 : aktuell ? (laeuft ? anteil : 1) : 0;
        return (
          <div key={i} style={{
            flex: 1, height: '100%', background: 'var(--qq-hairline)',
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${fuellung * 100}%`, height: '100%', background: farbe,
              // Linear und kurz: die Zeit laeuft gleichmaessig, alles andere
              // wuerde luegen. 0.1s deckt genau den Tick-Abstand.
              transition: aktuell && laeuft ? 'width 0.1s linear' : 'width 0.45s ease',
            }} />
          </div>
        );
      })}
    </div>
  );
}

export function StageTimeBar({
  endsAt, durationSec, accent,
}: {
  endsAt: number | null;
  durationSec: number;
  accent: string;
}) {
  const [remaining, setRemaining] = useState(
    () => (endsAt == null ? 0 : Math.max(0, (endsAt - getServerNow()) / 1000)),
  );

  useEffect(() => {
    if (endsAt == null) return;
    const iv = setInterval(() => {
      const r = Math.max(0, (endsAt - getServerNow()) / 1000);
      setRemaining(r);
      if (r === 0) clearInterval(iv);
    }, 100);
    return () => clearInterval(iv);
  }, [endsAt]);

  if (endsAt == null || durationSec <= 0) return null;
  const pct = Math.min(100, Math.max(0, (remaining / durationSec) * 100));
  // Dieselben Dringlichkeitsstufen wie am Ring — die Leiste erbt die Semantik,
  // damit Zahl und Leiste nie Verschiedenes behaupten.
  const color = remaining <= 3 ? '#EF4444'
    : remaining <= 5 ? '#F97316'
    : remaining <= 10 ? 'var(--qq-stage-brand)'
    : accent;

  return (
    <div
      aria-hidden
      style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 12,
        background: 'var(--qq-hairline)', zIndex: 9,
      }}
    >
      <div style={{
        width: `${pct}%`, height: '100%', background: color,
        // linear, nicht gefedert: die Zeit laeuft gleichmaessig ab, alles
        // andere wuerde luegen. 0.1s deckt genau den Tick-Abstand.
        transition: 'width 0.1s linear, background 0.3s ease',
      }} />
    </div>
  );
}

export function BeamerTimer({
  endsAt, durationSec, accent, expireNow, variant = 'ring',
}: {
  endsAt: number;
  durationSec: number;
  accent: string;
  expireNow?: boolean;
  /**
   * 'plain' — nur die ablaufende Zahl. Uebergabe 2a, Aenderung 7: den Anteil
   *           traegt die Leiste am oberen Bildrand (`StageTimeBar`, haengt am
   *           Phase-Root und laeuft deshalb in JEDEM Zustand mit, der einen
   *           Timer hat), die Zahl liefert die Praezision.
   *
   * 'ring'   — Ring mit Zahl, der Zustand vor 2026-08-22. Wolf-Entscheidung an
   *           diesem Tag: „ring brauchen wir nicht da leiste im header die
   *           ablaeuft" — alle sechs Aufrufer stehen jetzt auf 'plain'. Der
   *           Zweig bleibt als dokumentierte Alternative erhalten, wird aber
   *           aktuell nirgends verwendet.
   */
  variant?: 'ring' | 'plain';
}) {
  // 2026-05-19 (Wolf 'beamer timer +6s vs moderator'): Server-Clock statt
  // lokales Date.now(), damit alle Clients dasselbe Zeit-Referenzsystem
  // teilen — egal wie schief deren System-Uhr eingestellt ist.
  const [remaining, setRemaining] = useState(() => Math.max(0, (endsAt - getServerNow()) / 1000));
  // 2026-05-04 (Wolf): Outro-Animation wenn Timer NATUERLICH auf 0 laeuft
  // ODER frueher beendet wird (alle Teams haben geantwortet → expireNow=true).
  // Kurzer Pop + Schrumpfen + Fade. Einmal-Latch verhindert Re-Trigger.
  const [expired, setExpired] = useState(() => Math.max(0, (endsAt - getServerNow()) / 1000) === 0);

  useEffect(() => {
    const iv = setInterval(() => {
      const r = Math.max(0, (endsAt - getServerNow()) / 1000);
      setRemaining(r);
      if (r === 0) {
        setExpired(true);
        clearInterval(iv);
      }
    }, 100);
    return () => clearInterval(iv);
  }, [endsAt]);

  // Wolf-Bug 2026-05-04: 'wenn alle frueh abgeben, Timer-Outro fehlt'.
  // Outer-Wrapper kann jetzt expireNow=true setzen (z.B. revealed=true) und
  // der Timer triggert sofort die Outro-Animation statt abrupt opacity:0.
  useEffect(() => {
    if (expireNow) setExpired(true);
  }, [expireNow]);

  const pct = Math.min(100, (remaining / durationSec) * 100);
  const secs = Math.ceil(remaining);
  const skinId = useActiveThemeId();

  // Urgency levels
  const isAlert   = remaining <= 10 && remaining > 5;
  const isWarning = remaining <= 5 && remaining > 3;
  const isCritical = remaining <= 3;
  const isUrgent = remaining <= 10;

  const color = isCritical ? '#EF4444'
    : isWarning ? '#F97316'
    : isAlert ? 'var(--qq-stage-brand)'
    : accent;

  // Hero timer: big ring
  // 2026-08-22 (Uebergabe 2a, Aenderung 2 „Glühen entfernen"): der Ring trug
  // seine Dringlichkeit ueber Strichstaerke UND Glow. Auf 2,8 m Bildbreite wird
  // jeder Glow zum Halo, das die Kante aufweicht — die Zahl wurde dadurch aus
  // zehn Metern schlechter lesbar, nicht besser. Der Glow ist ersatzlos raus,
  // die Grundstaerke steigt dafuer von 8 auf 12px: dieselbe Auffaelligkeit,
  // aber als Flaeche statt als Streuung. Die Dringlichkeitsstufen bleiben.
  const radius = 80;
  const stroke = isCritical ? 16 : isWarning ? 14 : 12;
  const sz = radius * 2 + stroke * 2 + 20;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pct / 100);

  const pulseAnim = isCritical ? 'bTimerPulse 0.5s ease-in-out infinite'
    : isWarning ? 'bTimerPulse 0.8s ease-in-out infinite'
    : undefined;

  // Outro hat Vorrang vor Pulse — wenn Zeit um, fade+pop statt weiter pulsen.
  // forwards laesst den End-State (opacity 0) erhalten bis Component unmountet.
  const outroAnim = expired ? 'qqTimerOutro 0.85s var(--qq-ease-bounce) forwards' : undefined;

  // 2026-06-23 (Skin): pro Skin eigene Timer-Form (wie /skins-Mockups), gleiche
  // Position/Groesse (sz). Urgency-Farbe bleibt semantisch erhalten. Cozy = Ring.
  // isCozyLook: 'cozy' und 'cozyKino' teilen sich den Look (nur Motion unterscheidet).
  //
  // 2026-08-24: `variant !== 'plain'` ist neu, und dahinter steckt ein Fehler,
  // der die 2a-Zeitanzeige auf der Buehne komplett unwirksam gemacht hat.
  // Wieder derselbe: `isCozyLook()` heisst „Cozy", nicht „nicht die Buehne".
  // Die Buehne laeuft im Quirks-Theme, also ist isCozyLook(skinId) dort FALSCH,
  // also lief dieser Zweig - und er kehrt zurueck, bevor der plain-Zweig
  // darunter je erreicht wird. Ergebnis: die Fragebuehne bat ausdruecklich um
  // `variant="plain"` und bekam trotzdem die Skin-Form.
  //
  // Gemessen am 24.08.2026 auf der Fragefolie: die Zahl stand bei 56px in
  // Cremeweiss (clamp(34px, 4.6cqw, 56px)), darunter „SEK" bei 14px. Gebaut
  // und gemeint war die nackte Zahl bei 96px in der Kategoriefarbe. Das kleine
  // „SEK" war also nur das SYMPTOM, an dem die Grad-Messung haengen blieb -
  // ein Label aus einer Timer-Form, die auf der Buehne nie haette laufen sollen.
  //
  // Ein ausdruecklich angeforderter `variant` schlaegt jetzt die Skin-Form.
  // Die Skin-Formen (Stern, Brutal-Kasten, Mono) gelten weiter fuer `ring`.
  if (!isCozyLook(skinId) && variant !== 'plain') {
    const numFs = isCritical ? 'clamp(40px, 5.2cqw, 64px)' : 'clamp(34px, 4.6cqw, 56px)';
    const numBox = (
      <div style={{ textAlign: 'center', lineHeight: 1, fontFamily: 'var(--qq-font)' }}>
        <div style={{ fontSize: numFs, fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>{secs}</div>
        <div style={{ fontSize: 'clamp(10px, 1cqw, 14px)', fontWeight: 800, letterSpacing: '0.12em' }}>SEK</div>
      </div>
    );
    let inner;
    if (skinId === 'neoBrutal') {
      inner = (
        <div style={{
          width: sz * 0.62, height: sz * 0.62, display: 'grid', placeItems: 'center',
          background: color, color: 'var(--qq-text)', border: '3px solid #16121F',
          boxShadow: '6px 6px 0 #16121F', borderRadius: 8,
        }}>{numBox}</div>
      );
    } else if (skinId === 'softPop') {
      inner = (
        <div style={{ position: 'relative', width: sz * 0.72, height: sz * 0.72, display: 'grid', placeItems: 'center' }}>
          <div style={{
            position: 'absolute', inset: 0, background: 'var(--qq-accent-light)',
            clipPath: 'polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)',

          }} />
          <div style={{ position: 'relative', color: 'var(--qq-card-text)' }}>{numBox}</div>
        </div>
      );
    } else {
      // studioMono: nackte grosse Zahl (editorial)
      inner = <div style={{ color: 'var(--qq-text)' }}>{numBox}</div>;
    }
    return (
      <div style={{
        position: 'relative', width: sz, height: sz, animation: outroAnim ?? pulseAnim,
        pointerEvents: expired ? 'none' : 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {inner}
      </div>
    );
  }

  // 2026-08-22 (Uebergabe 2a, Aenderung 7): nackte Zahl, kein Ring. Der Grad
  // liegt bei 96px (Brief, Abschnitt 10: Zeitanzeige 62–96px) — deutlich
  // groesser als im Ring, weil die Zahl jetzt allein steht. Der Puls bei ≤5s
  // und die Outro-Animation bleiben, sie haengen am Wrapper.
  if (variant === 'plain') {
    return (
      <div style={{
        position: 'relative', minWidth: sz * 0.7, textAlign: 'right',
        animation: outroAnim ?? pulseAnim,
        pointerEvents: expired ? 'none' : 'auto',
        fontWeight: 900, lineHeight: 1,
        fontSize: isCritical ? 'clamp(72px, 8cqw, 112px)' : 'clamp(62px, 6.8cqw, 96px)',
        // 2026-08-22 (Wolf-Entscheidung): die Zahl steht im Ruhezustand in der
        // Kategoriefarbe. Sie ist auf der Buehne die einzige Zeitanzeige neben
        // der Leiste — und die traegt die Kategoriefarbe ohnehin, also sind es
        // nicht zwei Signale, sondern eines in zwei Formen. Ab 10 Sekunden
        // uebernimmt unveraendert die Dringlichkeitsfarbe.
        color: isUrgent ? color : 'var(--qq-stage-accent, var(--qq-text))',
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '-0.02em',
        transition: 'font-size 0.3s ease, color 0.3s ease',
      }}>
        {secs}
      </div>
    );
  }

  return (
    <div style={{
      position: 'relative', width: sz, height: sz,
      animation: outroAnim ?? pulseAnim,
      pointerEvents: expired ? 'none' : 'auto',
    }}>
      {/* 2026-08-22 (Uebergabe 2a): der aeussere Glow-Ring ist entfallen —
          siehe Kommentar an `stroke`. Dringlichkeit traegt jetzt allein die
          Farbe, die Strichstaerke und (ab 5s) der Puls. */}
      {/* SVG ring */}
      <svg width={sz} height={sz}
        style={{ transform: 'rotate(-90deg)', position: 'absolute', inset: 0 }}>
        {/* Background ring — 2026-06-23: Skin-sichtbar via Hairline-Token
            (rgba(246, 239, 230,..) waere auf hellen Skins unsichtbar). */}
        <circle cx={sz / 2} cy={sz / 2} r={radius}
          fill="none" style={{ stroke: 'var(--qq-hairline)' }} strokeWidth={stroke} />
        {/* Progress ring. Die Ruhefarbe bleibt der uebergebene Akzent — 2026-08-22
            hatte ich sie unbeauftragt auf Creme gezogen und wieder
            zurueckgenommen. Diesen Ring sehen nur noch Bluff, OnlyConnect,
            Comeback und CozyGame; auf der Fragebuehne laeuft `variant="plain"`. */}
        <circle cx={sz / 2} cy={sz / 2} r={radius}
          fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 0.1s linear, stroke 0.3s ease' }}
        />
      </svg>
      {/* Number in center — 2026-08-22 (Uebergabe 2a, Aenderung 2): kein
          text-shadow mehr. Die Farbe bleibt wie gehabt der Akzent. */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 900,
        fontSize: isCritical ? 'clamp(56px, 7cqw, 88px)' : 'clamp(48px, 6cqw, 76px)',
        color,
        fontVariantNumeric: 'tabular-nums',
        transition: 'font-size 0.3s ease, color 0.3s ease',
      }}>
        {secs}
      </div>
    </div>
  );
}
