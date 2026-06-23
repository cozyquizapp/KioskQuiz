// 2026-06-23 — Skin-Vorschau (/skins): 5 moderne Design-Richtungen als echt
// gerenderte Frage-Screens zum Durchschalten. Reines Brainstorm-/Design-Tool,
// unabhaengig von der Live-App. Jeder Skin = eigene Design-Sprache
// (Schrift · Flaeche · Hintergrund · Akzent · Option-Stil · Timer · Deko).
import { QRCodeSVG } from 'qrcode.react';
import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';

type OptionStyle = 'glass' | 'editorial' | 'soft' | 'neon' | 'pop' | 'brutal';
type TimerStyle = 'ring' | 'plain' | 'starburst' | 'brutal';

type Skin = {
  id: string;
  name: string;
  tagline: string;
  bestFor: string;
  // Typo
  font: string;
  titleWeight: number;
  titleSerif?: boolean;
  upper?: boolean;       // Titel/Optionen in GROSSBUCHSTABEN
  titleCard?: boolean;   // Frage-Titel in einer weissen Karte (statt frei)
  // Farben
  bg: string;
  text: string;
  muted: string;
  accent: string;        // Hauptakzent (Badges, Highlight)
  accent2: string;       // 2. Akzent / Gradient-Ende
  // Card / Option
  cardBg: string;
  cardBorder: string;
  cardRadius: number;
  cardShadow: string;
  cardBlur?: string;
  optionStyle: OptionStyle;
  timerStyle: TimerStyle;
  // optionale Pop-Farben (eine pro Antwort)
  popColors?: [string, string, string, string];
  // Deko-Layer (absolute Elemente)
  deco?: 'tri' | 'corners' | 'confetti' | 'glow' | 'none';
  chrome: 'light' | 'dark'; // fuer QR-Kontrast etc.
};

const SKINS: Skin[] = [
  {
    id: 'mono', name: 'Studio Mono', tagline: 'Editorial · scharf · markenneutral',
    bestFor: 'Tech-Firmen · gebrandete Events (Akzent = Kundenfarbe)',
    font: "'Bricolage Grotesque', 'Inter', sans-serif", titleWeight: 800,
    bg: '#F3F2EC',
    text: '#0B0B0B', muted: '#6B6B66',
    accent: '#111111', accent2: '#C9F227',
    cardBg: '#FFFFFF', cardBorder: '2px solid #111111',
    cardRadius: 4, cardShadow: '6px 6px 0 #111111',
    optionStyle: 'editorial', timerStyle: 'plain', deco: 'none', chrome: 'light',
  },
  {
    id: 'pop', name: 'Soft Pop', tagline: 'Verspielt · bunt · zugänglich',
    bestFor: 'Team-Building · Schule · Familie',
    font: "'Nunito', system-ui, sans-serif", titleWeight: 900,
    bg: 'radial-gradient(120% 90% at 50% -10%, #EFE7FF 0%, #E6DBFF 60%, #DCCBFF 100%)',
    text: '#2D2A55', muted: '#7A75A0',
    accent: '#3B2E7E', accent2: '#FBBF24',
    cardBg: '#FFFFFF', cardBorder: 'none',
    cardRadius: 26, cardShadow: '0 8px 0 rgba(59,46,126,0.14)',
    optionStyle: 'pop', timerStyle: 'starburst', deco: 'confetti', chrome: 'light',
    popColors: ['#FBBF24', '#F472A0', '#34D399', '#60A5FA'],
  },
  {
    id: 'brutal', name: 'Neo-Brutalism', tagline: 'Modern · bold · verspielt-kantig',
    bestFor: 'Moderne Brands · Tech · junge Events',
    font: "'Nunito', system-ui, sans-serif", titleWeight: 900, titleCard: true,
    bg: 'linear-gradient(155deg, #9B6DFF 0%, #7C3AED 55%, #6D28D9 100%)',
    text: '#FFFFFF', muted: 'rgba(255,255,255,0.78)',
    accent: '#FDE047', accent2: '#FB7185',
    cardBg: '#FFFFFF', cardBorder: '3px solid #16121F',
    cardRadius: 18, cardShadow: '6px 6px 0 #16121F',
    optionStyle: 'brutal', timerStyle: 'brutal', deco: 'confetti', chrome: 'light',
    popColors: ['#FDE047', '#FDA4AF', '#A7F3D0', '#BFDBFE'],
  },
];

const OPTIONS = [
  { letter: 'A', text: 'Sydney' },
  { letter: 'B', text: 'Melbourne' },
  { letter: 'C', text: 'Canberra' },
  { letter: 'D', text: 'Perth' },
];
const CORRECT = 2; // Canberra hervorgehoben

const DESIGN_W = 1180;
const DESIGN_H = 664;

function QuestionPreview({ skin }: { skin: Skin }) {
  const isPop = skin.optionStyle === 'pop';
  const isNeon = skin.optionStyle === 'neon';
  const isEditorial = skin.optionStyle === 'editorial';
  const isGlass = skin.optionStyle === 'glass';
  const isBrutal = skin.optionStyle === 'brutal';

  const letterBadge = (i: number, on: boolean): CSSProperties => {
    if (isBrutal) return {
      background: '#16121F', color: '#fff',
      width: 46, height: 46, borderRadius: '50%', border: '3px solid #16121F',
      display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 22, flexShrink: 0,
    };
    if (isPop) return {
      background: skin.accent, color: '#fff',
      width: 46, height: 46, borderRadius: '50%',
      display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 22, flexShrink: 0,
    };
    if (isEditorial) return {
      background: on ? skin.accent2 : 'transparent', color: '#111',
      width: 40, height: 40, borderRadius: 3, border: '2px solid #111',
      display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 20, flexShrink: 0,
    };
    // glass / neon / soft → gefärbter Buchstabe
    return {
      color: on ? '#fff' : skin.accent,
      width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
      display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 24,
      background: on
        ? `linear-gradient(135deg, ${skin.accent}, ${skin.accent2})`
        : (isNeon ? 'rgba(34,211,238,0.10)' : 'rgba(255,255,255,0.06)'),
      boxShadow: on ? `0 0 16px ${skin.accent}88` : 'none',
    };
  };

  const optionCard = (i: number, on: boolean): CSSProperties => {
    const base: CSSProperties = {
      display: 'flex', alignItems: 'center', gap: 16, padding: '0 22px',
      height: 78, color: skin.text, fontWeight: isPop ? 900 : 700, fontSize: 25,
    };
    if (isBrutal) {
      const c = skin.popColors![i];
      return { ...base, background: on ? skin.accent : c, color: '#16121F',
        border: skin.cardBorder, borderRadius: skin.cardRadius,
        boxShadow: skin.cardShadow, fontWeight: 800 };
    }
    if (isPop) {
      const c = skin.popColors![i];
      return { ...base, background: c, borderRadius: skin.cardRadius,
        boxShadow: '0 7px 0 rgba(0,0,0,0.12)', color: '#23204A' };
    }
    if (isEditorial) {
      return { ...base, background: on ? '#fff' : '#FBFBF8',
        border: skin.cardBorder, borderRadius: skin.cardRadius,
        boxShadow: on ? skin.cardShadow : '3px 3px 0 #111' };
    }
    if (isNeon) {
      return { ...base, background: skin.cardBg, borderRadius: skin.cardRadius,
        border: on ? `1.5px solid ${skin.accent}` : skin.cardBorder,
        boxShadow: on ? `0 0 26px ${skin.accent}88, inset 0 0 14px ${skin.accent}33` : skin.cardShadow };
    }
    // glass / soft
    return { ...base, background: skin.cardBg, borderRadius: skin.cardRadius,
      border: on ? `1.5px solid ${skin.accent}` : skin.cardBorder,
      backdropFilter: skin.cardBlur, WebkitBackdropFilter: skin.cardBlur,
      boxShadow: on ? `0 0 0 1px ${skin.accent}55, ${skin.cardShadow}` : skin.cardShadow };
  };

  return (
    <div style={{
      width: DESIGN_W, height: DESIGN_H, position: 'relative', overflow: 'hidden',
      background: skin.bg, color: skin.text, fontFamily: skin.font,
      borderRadius: 22, padding: '34px 40px',
      display: 'flex', flexDirection: 'column',
    }}>
      <DecoLayer skin={skin} />

      {/* Kopfzeile: Frage-Counter · Brand · (Platz) */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative', zIndex: 2 }}>
        <div style={{ lineHeight: 1 }}>
          <div style={{ fontSize: 13, letterSpacing: '0.18em', color: skin.muted, fontWeight: 800 }}>FRAGE</div>
          <div style={{ fontSize: 34, fontWeight: 900, color: skin.accent }}>7<span style={{ color: skin.muted, fontSize: 22 }}>/20</span></div>
        </div>
        <div style={{
          fontSize: 15, letterSpacing: '0.34em', fontWeight: 800, color: skin.muted,
          textTransform: 'uppercase', marginTop: 6,
        }}>
          {skin.titleSerif ? '— CozyQuiz —' : 'CozyQuiz'}
        </div>
        <div style={{ width: 64 }} />
      </div>

      {/* Frage-Titel */}
      <div style={{
        position: 'relative', zIndex: 2, textAlign: 'center', margin: '14px 0 22px',
        ...(skin.titleCard ? {
          background: '#fff', borderRadius: skin.cardRadius, padding: '16px 30px',
          border: skin.cardBorder, boxShadow: skin.cardShadow,
          alignSelf: 'center', maxWidth: '80%',
        } : {}),
      }}>
        <div style={{
          fontSize: 38, fontWeight: skin.titleWeight, lineHeight: 1.15,
          color: skin.titleCard ? '#1F1B2E' : undefined,
          fontFamily: skin.titleSerif ? "'Georgia', 'Times New Roman', serif" : skin.font,
          textTransform: skin.upper ? 'uppercase' : undefined,
        }}>
          Welche Stadt ist die Hauptstadt von Australien?
        </div>
      </div>

      {/* Hauptbereich: QR · Optionen · Timer */}
      <div style={{ position: 'relative', zIndex: 2, flex: 1, display: 'flex', gap: 26, alignItems: 'center' }}>
        {/* QR / Join */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: 168, flexShrink: 0 }}>
          <div style={{ padding: 8, background: '#fff', borderRadius: 12, boxShadow: skin.cardShadow }}>
            <QRCodeSVG value="https://play.cozyquiz.app" size={104} bgColor="#ffffff" fgColor="#111111" />
          </div>
          <div style={{ fontSize: 13, fontWeight: 800, color: skin.muted }}>Scanne & mach mit</div>
          <div style={{
            fontSize: 14, fontWeight: 900,
            color: skin.id === 'brutal' ? '#16121F' : (skin.chrome === 'light' ? skin.text : '#fff'),
            background: skin.accent, padding: '4px 14px', borderRadius: 999,
          }}>PIN 4827</div>
        </div>

        {/* Optionen 2×2 */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {OPTIONS.map((o, i) => {
            const on = i === CORRECT;
            return (
              <div key={o.letter} style={optionCard(i, on)}>
                <div style={letterBadge(i, on)}>{o.letter}</div>
                <span>{o.text}</span>
              </div>
            );
          })}
        </div>

        {/* Timer */}
        <div style={{ width: 150, flexShrink: 0, display: 'grid', placeItems: 'center' }}>
          <TimerWidget skin={skin} />
        </div>
      </div>
    </div>
  );
}

function TimerWidget({ skin }: { skin: Skin }) {
  if (skin.timerStyle === 'brutal') {
    return (
      <div style={{
        width: 124, height: 124, borderRadius: '50%', display: 'grid', placeItems: 'center',
        background: skin.accent, color: '#16121F', border: '3px solid #16121F',
        boxShadow: '6px 6px 0 #16121F', fontFamily: skin.font,
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 46, fontWeight: 900, lineHeight: 1 }}>18</div>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em' }}>SEK</div>
        </div>
      </div>
    );
  }
  if (skin.timerStyle === 'starburst') {
    return (
      <div style={{ position: 'relative', width: 130, height: 130, display: 'grid', placeItems: 'center' }}>
        <div style={{
          position: 'absolute', inset: 0, background: skin.accent2,
          clipPath: 'polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)',
          filter: 'drop-shadow(0 6px 0 rgba(0,0,0,0.12))',
        }} />
        <div style={{ position: 'relative', textAlign: 'center', color: '#2D2A55' }}>
          <div style={{ fontSize: 40, fontWeight: 900, lineHeight: 1 }}>18</div>
          <div style={{ fontSize: 11, fontWeight: 800 }}>SEK</div>
        </div>
      </div>
    );
  }
  if (skin.timerStyle === 'plain') {
    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 72, fontWeight: 900, lineHeight: 1, color: skin.text }}>18</div>
        <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '0.2em', color: skin.muted }}>SEKUNDEN</div>
      </div>
    );
  }
  // ring
  return (
    <div style={{
      width: 128, height: 128, borderRadius: '50%', display: 'grid', placeItems: 'center',
      background: `conic-gradient(${skin.accent} 0% 70%, ${skin.muted}33 70% 100%)`,
      boxShadow: `0 0 26px ${skin.accent}55`,
    }}>
      <div style={{
        width: 104, height: 104, borderRadius: '50%', display: 'grid', placeItems: 'center',
        background: skin.chrome === 'light' ? 'rgba(255,255,255,0.85)' : '#0c1024',
        textAlign: 'center',
      }}>
        <div>
          <div style={{ fontSize: 38, fontWeight: 900, lineHeight: 1, color: skin.text }}>18</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: skin.muted }}>Sek.</div>
        </div>
      </div>
    </div>
  );
}

function DecoLayer({ skin }: { skin: Skin }) {
  if (skin.deco === 'tri') {
    return (
      <>
        {[[88, 8, 18], [70, 78, 12], [12, 60, 14]].map(([x, y, s], i) => (
          <div key={i} style={{
            position: 'absolute', left: `${x}%`, top: `${y}%`, width: 0, height: 0,
            borderLeft: `${s}px solid transparent`, borderRight: `${s}px solid transparent`,
            borderBottom: `${s * 1.6}px solid ${i % 2 ? skin.accent2 : skin.accent}`,
            opacity: 0.5, transform: `rotate(${i * 40}deg)`, zIndex: 1,
          }} />
        ))}
      </>
    );
  }
  if (skin.deco === 'confetti') {
    const bits = [['8%', '20%', '#FBBF24'], ['90%', '16%', '#F472A0'], ['86%', '74%', '#34D399'], ['10%', '78%', '#60A5FA']];
    return (
      <>
        {bits.map(([x, y, c], i) => (
          <div key={i} style={{
            position: 'absolute', left: x, top: y, width: 26, height: 10, borderRadius: 6,
            background: c as string, transform: `rotate(${i * 35}deg)`, opacity: 0.8, zIndex: 1,
          }} />
        ))}
      </>
    );
  }
  if (skin.deco === 'glow') {
    return (
      <div style={{
        position: 'absolute', top: -120, right: -80, width: 380, height: 380, borderRadius: '50%',
        background: `radial-gradient(circle, ${skin.accent2}33 0%, transparent 70%)`, zIndex: 0,
      }} />
    );
  }
  return null;
}

export default function QQSkinsPage() {
  const [idx, setIdx] = useState(0);
  const skin = SKINS[idx];
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      const s = Math.min(w / DESIGN_W, 1);
      setScale(s);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div style={{
      minHeight: '100dvh', background: '#0A0814',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: 'max(16px, env(safe-area-inset-top)) 12px 28px',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {/* Skin-Umschalter */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 16, maxWidth: 760 }}>
        {SKINS.map((s, i) => {
          const on = i === idx;
          return (
            <button key={s.id} onClick={() => setIdx(i)} style={{
              padding: '8px 16px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit',
              fontSize: 13, fontWeight: 800, border: 'none',
              background: on ? '#fff' : 'rgba(255,255,255,0.08)',
              color: on ? '#0A0814' : 'rgba(255,255,255,0.7)',
              boxShadow: on ? '0 4px 16px rgba(255,255,255,0.2)' : 'none',
              transition: 'all 0.2s',
            }}>{s.name}</button>
          );
        })}
      </div>

      {/* Skin-Info */}
      <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.85)', marginBottom: 14, maxWidth: 720 }}>
        <div style={{ fontSize: 19, fontWeight: 900 }}>{skin.name}</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>{skin.tagline}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>Gut für: {skin.bestFor}</div>
      </div>

      {/* Skalierte Bühne */}
      <div ref={wrapRef} style={{ width: 'min(96vw, 1180px)', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: DESIGN_W * scale, height: DESIGN_H * scale, position: 'relative' }}>
          <div style={{
            width: DESIGN_W, height: DESIGN_H, transform: `scale(${scale})`, transformOrigin: 'top left',
            position: 'absolute', top: 0, left: 0,
          }}>
            <QuestionPreview skin={skin} />
          </div>
        </div>
      </div>

      <div style={{ marginTop: 18, fontSize: 12, color: 'rgba(255,255,255,0.35)', textAlign: 'center' }}>
        Vorschau · zum Brainstormen · noch nicht in der Live-App
      </div>
    </div>
  );
}
