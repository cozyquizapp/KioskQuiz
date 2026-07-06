/**
 * QQClipPage — Schätzfrage-Clip-Generator fürs tägliche TikTok/Reel (/clip).
 *
 * 2026-07-06 (Wolf): Reichweiten-Motor für Social. Reine SCHÄTZfrage (kein A/B/C
 * — Wolf: „bei schätzen brauchst du kein a,b,c"): Frage → Countdown → Reveal.
 * Der Reiz + die Reichweite kommen daraus, dass Leute ihre Schätzung KOMMENTIEREN.
 * 9:16, Reel-Modus wie /trailer (randlos → Handy-Screen-Record → TikTok).
 *
 * Content: Start-Fundus aus dem Stechen-Pool (QQ_TIEBREAKER_POOL) + eigene Frage
 * eintippbar (für lokale/aktuelle Fragen) oder via URL: /clip?q=…&a=…&unit=…&fact=…
 */
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { downloadReelSlide, runSlideExport, deliverReelExport, zipStore, downloadBlob } from '../reelCapture';
import { QQ_TIEBREAKER_POOL } from '@shared/quarterQuizTypes';

const PINK = '#ec4899';
const PINK_MID = '#f472b6';
const DISPLAY = "'Stinger Fit', 'Bricolage Grotesque', 'Inter', 'Nunito', system-ui, sans-serif";
const BODY = "'Nunito', 'Inter', system-ui, sans-serif";
const COZY_BG = 'radial-gradient(circle at 50% 0%, #1E2A5A 0%, #0F1530 60%, #0A0E22 100%)';
const cw = (pose: string) => `/avatars/cozywolf/${pose}.png`;

type ClipQ = { q: string; a: number; unit?: string; fact?: string; visual?: 'eu-flag' | 'octopus' };

// Fun-Facts zu den Stechen-Fragen (macht das Reveal teilbar). Key = target.
const FACTS: Record<number, string> = {
  12: 'Die 12 steht für Vollkommenheit, nicht für die Zahl der Länder.',
  1989: 'Am 9. November 1989, ausgelöst durch eine Panne auf einer Pressekonferenz.',
  206: 'Babys starten mit rund 300, viele wachsen später zusammen.',
  88: '52 weiße und 36 schwarze Tasten.',
  54: 'Der flächenmäßig zweitgrößte Kontinent.',
  64: '32 helle und 32 dunkle Felder.',
  86400: '60 × 60 × 24, merk dir das für die nächste Party.',
  330: 'Bei Hitze wächst er um bis zu 15 cm.',
  3: 'Zwei pumpen zu den Kiemen, eins durch den Körper.',
  32: 'Inklusive der vier Weisheitszähne.',
  13: 'Für die 13 Gründerstaaten, die 50 Sterne stehen für die Bundesstaaten.',
  90: 'Zweimal 45 Minuten, plus Nachspielzeit.',
  8: 'Seit Pluto 2006 zum Zwergplaneten wurde.',
  26: 'Von A bis Z, die Umlaute zählen nicht extra.',
  5: 'Die fünf Ringe stehen für die fünf Kontinente.',
};

// SMM-Audit: der Fundus ist als Stechen-Tiebreaker gebaut (bekannte Fakten), nicht
// als Schätz-Bait. Für /clip die besten Aha-Fragen (niemand weiß es genau → man
// kommentiert seinen Tipp) ZUERST, Schulwissen (8 Planeten, 26 Buchstaben … jeder
// weiß es → kein Kommentar-Anreiz) ans Ende. Sortiert nach Zielwert.
const CLIP_STRONG = [3, 86400, 206, 12, 330, 88, 90, 54];
const CLIP_WEAK = [8, 26, 5, 64, 1989];
const clipRank = (t: number) => {
  const s = CLIP_STRONG.indexOf(t); if (s >= 0) return s;
  const w = CLIP_WEAK.indexOf(t); if (w >= 0) return 900 + w;
  return 500;
};
const POOL: ClipQ[] = QQ_TIEBREAKER_POOL
  .map(e => ({
    q: e.promptDe,
    a: e.target,
    unit: (e as any).unitDe ?? undefined,
    fact: FACTS[e.target],
    // Spezial-Reveal: EU-Flagge nachbauen (SVG, 12 goldene Sterne im Kreis).
    visual: e.promptDe.includes('Flagge der EU') ? ('eu-flag' as const)
      : e.promptDe.includes('Oktopus') ? ('octopus' as const)
      : undefined,
  }))
  .sort((a, b) => clipRank(a.a) - clipRank(b.a));

type Scene = { key: 'ask' | 'reveal' | 'cta'; dur: number };
const SCENES: Scene[] = [
  // ask-Dauer = Countdown (4s) + kleiner Puffer. SMM-Audit: 5s war zu lang für
  // Kaltverkehr (Ring lief leer, Retention brach); 4s = snappy + noch lesbar.
  { key: 'ask',    dur: 4600 },
  { key: 'reveal', dur: 5200 },
  { key: 'cta',    dur: 4200 },
];

const fmt = (n: number) => n.toLocaleString('de-DE');

export default function QQClipPage() {
  const [params] = useSearchParams();
  // Eigene Frage via URL? (?q=…&a=…&unit=…&fact=…)
  const urlQ = params.get('q');
  const urlA = params.get('a');
  const urlQuestion: ClipQ | null = urlQ && urlA && !Number.isNaN(Number(urlA))
    ? { q: urlQ, a: Number(urlA), unit: params.get('unit') ?? undefined, fact: params.get('fact') ?? undefined }
    : null;

  const [custom, setCustom] = useState<ClipQ | null>(null);
  const [qIndex, setQIndex] = useState(0);
  const active: ClipQ = custom ?? urlQuestion ?? POOL[qIndex % POOL.length];

  const [scene, setScene] = useState(0);
  const [paused, setPaused] = useState(false);
  const [count, setCount] = useState(4);
  const [reel, setReel] = useState(false);
  // ?slides oeffnet direkt den Slideshow-Modus; ?export=zip|frames = Batch-Export.
  const exportMode = (params.get('export') === 'zip' || params.get('export') === 'frames') ? params.get('export') as 'zip' | 'frames' : null;
  const [slideshow, setSlideshow] = useState(params.has('slides') || !!exportMode);
  const big = reel || slideshow;
  const [controls, setControls] = useState(true);
  const hideT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pokeControls = () => {
    setControls(true);
    if (hideT.current) clearTimeout(hideT.current);
    hideT.current = setTimeout(() => setControls(false), 3000);
  };
  useEffect(() => {
    if (big) pokeControls();
    else if (hideT.current) clearTimeout(hideT.current);
    return () => { if (hideT.current) clearTimeout(hideT.current); };
  }, [big]);
  const exitBig = () => { setReel(false); setSlideshow(false); };
  const prevSlide = () => { setScene(s => (s - 1 + SCENES.length) % SCENES.length); pokeControls(); };
  const nextSlide = () => { setScene(s => (s + 1) % SCENES.length); pokeControls(); };

  useEffect(() => { document.title = 'CozyQuiz — Schätzfrage-Clip'; }, []);

  // Szenen-Stepper (Loop, pausierbar; im Slideshow-Modus manuell).
  useEffect(() => {
    if (paused || slideshow) return;
    const t = setTimeout(() => setScene(s => (s + 1) % SCENES.length), SCENES[scene].dur);
    return () => clearTimeout(t);
  }, [scene, paused, slideshow]);

  // Countdown 5→0 während der Frage-Szene.
  useEffect(() => {
    if (SCENES[scene].key !== 'ask' || paused) return;
    setCount(4);
    const iv = setInterval(() => setCount(c => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(iv);
  }, [scene, paused, qIndex, custom]);

  const nextQuestion = () => { setCustom(null); setQIndex(i => i + 1); setScene(0); };

  // HD-Download der aktuellen Folie (Standbild → Anim auf Endzustand gezwungen).
  const frameRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const saveSlide = async () => {
    if (!frameRef.current || saving) return;
    setSaving(true);
    try {
      await downloadReelSlide(frameRef.current, `cozyquiz-clip-${scene + 1}.png`);
    } catch (e) {
      console.error('Slide-Export fehlgeschlagen', e);
      alert('Ups — der Bild-Export hat nicht geklappt.\n\n' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSaving(false);
    }
  };

  // Ganzes Reel als ZIP (alle Folien als einzelne HD-PNGs).
  const [zipProg, setZipProg] = useState<string | null>(null);
  const saveZip = async () => {
    if (!frameRef.current || zipProg) return;
    const prev = scene;
    setSlideshow(true);
    setZipProg('0/' + SCENES.length);
    try {
      await new Promise((r) => setTimeout(r, 80));
      const bytes = await runSlideExport({
        frameRef, count: SCENES.length, setScene,
        onProgress: (d, t) => setZipProg(`${d}/${t}`),
      });
      const files = bytes.map((data, i) => ({ name: `clip-${String(i + 1).padStart(2, '0')}.png`, data }));
      downloadBlob(zipStore(files), 'cozyquiz-clip-slides.zip');
    } catch (e) {
      console.error('ZIP-Export fehlgeschlagen', e);
      alert('Ups — der ZIP-Export hat nicht geklappt.\n\n' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setZipProg(null);
      setScene(prev);
    }
  };

  // Auto-Export-Modus (?export=zip|frames).
  useEffect(() => {
    if (!exportMode) return;
    let cancelled = false;
    (async () => {
      try {
        await new Promise((r) => setTimeout(r, 700)); // kalter iframe-Start: App + erste Avatare laden lassen
        const bytes = await runSlideExport({ frameRef, count: SCENES.length, setScene });
        if (cancelled) return;
        await deliverReelExport(exportMode, bytes, 'clip');
      } catch (e) {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: 'cozyreel-error', message: String(e) }, window.location.origin);
        } else {
          console.error('Auto-Export fehlgeschlagen', e);
        }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{
      minHeight: big ? undefined : '100vh',
      ...(big
        ? { position: 'fixed', inset: 0, zIndex: 9999, background: '#0A0E22', padding: 0, gap: 0 }
        : { background: '#0c0a14', gap: 14, padding: 10 }),
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: BODY,
    }}>
      <style>{KEYFRAMES}</style>

      {/* 9:16-Frame */}
      <div ref={frameRef} style={{
        position: 'relative', aspectRatio: '9 / 16', containerType: 'size',
        overflow: 'hidden', background: COZY_BG, cursor: 'pointer',
        ...(big
          ? { width: 'min(100vw, calc(100dvh * 9 / 16))', height: 'auto', maxHeight: '100dvh', borderRadius: 0, boxShadow: 'none' }
          : { height: 'min(94vh, calc(100vw * 16 / 9))', maxWidth: '100vw', borderRadius: 22, boxShadow: '0 24px 70px rgba(0,0,0,0.6)' }),
      }} onClick={() => big ? pokeControls() : setPaused(p => !p)}>

        {big && (
          <button data-no-capture onClick={(e) => { e.stopPropagation(); exitBig(); }} aria-label="Vollbild schließen" style={{
            position: 'absolute', top: '2.5cqh', right: '3.5cqw', zIndex: 30,
            width: '9cqw', height: '9cqw', borderRadius: '50%', border: 'none',
            background: 'rgba(0,0,0,0.4)', color: '#fff', fontSize: '5cqw', fontWeight: 900,
            cursor: 'pointer', opacity: controls ? 1 : 0, transition: 'opacity 0.4s ease', display: 'grid', placeItems: 'center',
          }}>✕</button>
        )}

        {/* Slideshow-Nav (Zähler + Vor/Zurück + HD-Download) — traegt data-no-capture. */}
        {slideshow && (
          <div data-no-capture style={{ opacity: controls ? 1 : 0, transition: 'opacity 0.4s ease', pointerEvents: controls ? 'auto' : 'none' }}>
            <div style={{ position: 'absolute', top: '2.8cqh', left: '50%', transform: 'translateX(-50%)', zIndex: 30, background: 'rgba(0,0,0,0.45)', color: '#fff', fontWeight: 900, fontSize: '3.4cqw', padding: '0.6cqh 3cqw', borderRadius: 999 }}>
              {scene + 1} / {SCENES.length}
            </div>
            <div style={{ position: 'absolute', bottom: '3cqh', left: 0, right: 0, zIndex: 30, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '3cqw' }}>
              <button onClick={(e) => { e.stopPropagation(); prevSlide(); }} style={slideBtn}>‹</button>
              <button onClick={(e) => { e.stopPropagation(); saveSlide(); }} style={{ ...slideBtn, background: saving ? 'rgba(0,0,0,0.5)' : PINK }}>{saving ? '…' : '⬇ HD'}</button>
              <button onClick={(e) => { e.stopPropagation(); nextSlide(); }} style={slideBtn}>›</button>
            </div>
          </div>
        )}

        {/* Kein Fortschrittsbalken (Wolf): TikTok/Insta legen ihre eigene drüber. */}

        {/* Szene */}
        <div key={`${scene}-${qIndex}-${custom ? 'c' : 'p'}`} style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', textAlign: 'center',
          padding: '11cqh 7cqw', zIndex: 5, color: '#fff', animation: 'sceneIn 0.5s ease both',
        }}>
          {SCENES[scene].key === 'ask' && (
            <>
              <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '4.6cqw', letterSpacing: '0.22em', opacity: 0.85, animation: 'fadeUp 0.5s ease both' }}>
                SCHÄTZ MAL 🤔
              </div>
              <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '8.4cqw', lineHeight: 1.12, marginTop: '2.5cqh', animation: 'popIn 0.6s var(--eb) both' }}>
                {active.q}
              </div>
              {/* Countdown-Ring im Quiz-Timer-Stil (Brand-konsistent): laeuft
                  ab statt zu drehen; Pink -> Orange -> Rot wie der Beamer-Timer.
                  Bei 0 zeigt der Ring das Symbol der Frage (Wolf): Oktopus-Frage =
                  Wolfs eigener cozy3d-Oktopus statt des generischen Timer-Emojis. */}
              <div style={{ margin: '6cqh 0 4cqh', animation: 'popIn 0.5s var(--eb) 0.35s both' }}>
                <CountdownRing
                  seconds={4}
                  count={count}
                  endContent={active.visual === 'octopus'
                    ? <img src="/avatars/cozy3d/oktopus.png" alt="" style={{ width: '22cqw', height: '22cqw', objectFit: 'contain' }} />
                    : undefined}
                />
              </div>
              <div style={{ fontWeight: 800, fontSize: '5.2cqw', opacity: 0.96, animation: 'fadeUp 0.6s ease 0.6s both' }}>
                Kommentier deine Schätzung <span style={{ color: PINK_MID }}>👇</span>
              </div>
            </>
          )}

          {SCENES[scene].key === 'reveal' && (
            <>
              <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '4.6cqw', letterSpacing: '0.22em', opacity: 0.85, animation: 'fadeUp 0.5s ease both' }}>
                DIE ANTWORT
              </div>
              {active.visual === 'eu-flag' ? (
                <>
                  <div style={{ margin: '3cqh 0 2.5cqh', animation: 'popIn 0.6s var(--eb) 0.1s both' }}><EuFlag /></div>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '2cqw', animation: 'fadeUp 0.5s ease 0.95s both' }}>
                    <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '15cqw', lineHeight: 1, color: '#fff', textShadow: `0 0 8cqw ${PINK}66` }}>{fmt(active.a)}</span>
                    <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '6.5cqw', color: PINK_MID }}>Sterne</span>
                  </div>
                </>
              ) : active.visual === 'octopus' ? (
                <>
                  {/* Wolfs eigener cozy3d-Oktopus + 3 anatomische Herzen (kein rotes ❤️). */}
                  <img src="/avatars/cozy3d/oktopus.png" alt="" style={{ width: '40cqw', height: '40cqw', objectFit: 'contain', margin: '1cqh 0', filter: 'drop-shadow(0 1.4cqh 1.8cqh rgba(0,0,0,0.45))', animation: 'popIn 0.6s var(--eb) 0.1s both' }} />
                  <div style={{ display: 'flex', gap: '3.5cqw', margin: '1cqh 0 2cqh' }}>
                    {[0, 1, 2].map(i => (
                      <span key={i} style={{ fontSize: '13cqw', lineHeight: 1, animation: `popIn 0.45s var(--eb) ${0.6 + i * 0.2}s both` }}>🫀</span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '2cqw', animation: 'fadeUp 0.5s ease 1.3s both' }}>
                    <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '15cqw', lineHeight: 1, color: '#fff', textShadow: `0 0 8cqw ${PINK}66` }}>{fmt(active.a)}</span>
                    <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '6.5cqw', color: PINK_MID }}>Herzen</span>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '2cqw', marginTop: '2cqh', animation: 'popIn 0.7s var(--eb) 0.1s both' }}>
                  <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '22cqw', lineHeight: 1, color: '#fff', textShadow: `0 0 10cqw ${PINK}66` }}>{fmt(active.a)}</span>
                  {active.unit && <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '8cqw', color: PINK_MID }}>{active.unit}</span>}
                </div>
              )}
              {active.fact && (
                <div style={{
                  marginTop: '6cqh', maxWidth: '82cqw', background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.14)', borderRadius: '3.5cqw', padding: '3cqh 5cqw',
                  fontSize: '4.8cqw', fontWeight: 700, lineHeight: 1.35, animation: 'fadeUp 0.6s ease 0.5s both',
                }}>
                  <span style={{ color: PINK_MID, fontWeight: 900 }}>Fun Fact: </span>{active.fact}
                </div>
              )}
            </>
          )}

          {SCENES[scene].key === 'cta' && (
            <>
              <div style={{ position: 'relative', width: '38cqw', height: '38cqw', display: 'grid', placeItems: 'center', animation: 'popIn 0.7s var(--eb) both' }}>
                <div style={{ position: 'absolute', width: '84%', height: '84%', borderRadius: '50%', background: `radial-gradient(circle, ${PINK}55, transparent 68%)`, filter: 'blur(6px)' }} />
                <img src={cw('augenauf.troete.jubel')} alt="CozyWolf" style={{ position: 'relative', width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 1.4cqh 1.8cqh rgba(0,0,0,0.45))', animation: 'floatPet 5s ease-in-out infinite' }} />
              </div>
              <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '9.5cqw', lineHeight: 1.02, marginTop: '3cqh', animation: 'popIn 0.7s var(--eb) 0.2s both' }}>
                Lagst du drüber<br />oder drunter?
              </div>
              <div style={{ fontWeight: 800, fontSize: '4.8cqw', marginTop: '3cqh', opacity: 0.92, maxWidth: '80cqw', lineHeight: 1.3, animation: 'fadeUp 0.6s ease 0.45s both' }}>
                Kommentier's <span style={{ color: PINK_MID }}>👇</span> Und folg für die tägliche Schätzfrage.
              </div>
              <div style={{ marginTop: '4.5cqh', display: 'flex', flexDirection: 'column', gap: '1.6cqh', fontWeight: 800, fontSize: '5cqw', animation: 'fadeUp 0.6s ease 0.7s both' }}>
                <span style={{ color: PINK_MID }}>@cozywolf.events</span>
                <span style={{ opacity: 0.92 }}>cozywolf.de</span>
              </div>
            </>
          )}
        </div>

        {paused && !big && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.25)' }}>
            <span style={{ fontSize: '14cqw' }}>▶︎</span>
          </div>
        )}
      </div>

      {/* Screen-only Steuerung */}
      {!big && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 11, maxWidth: 440, width: '100%' }}>
          <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button onClick={nextQuestion} style={btn('rgba(255,255,255,0.10)', '#fff', '1px solid rgba(255,255,255,0.18)')}>
              🎲 Nächste Frage
            </button>
            <button onClick={() => setReel(true)} style={btn(PINK, '#fff')}>
              ▶ Reel-Modus
            </button>
            <button onClick={() => { setScene(0); setSlideshow(true); }} style={btn('rgba(255,255,255,0.10)', '#fff', '1px solid rgba(255,255,255,0.18)')}>
              🖼 Slideshow
            </button>
            <button onClick={saveZip} disabled={!!zipProg} style={btn('rgba(255,255,255,0.10)', '#fff', '1px solid rgba(255,255,255,0.18)')}>
              {zipProg ? `⏳ ${zipProg}` : '⬇ Alle Folien (ZIP)'}
            </button>
          </div>

          <CustomForm onApply={(q) => { setCustom(q); setScene(0); }} />

          <div style={{ color: '#8a86a0', fontSize: 12.5, fontWeight: 700, textAlign: 'center', lineHeight: 1.5 }}>
            Tippen aufs Bild = Pause · loopt automatisch (~16&nbsp;s).<br />
            <b style={{ color: '#c9c5da' }}>Reel</b> = abfilmen · <b style={{ color: '#c9c5da' }}>Slideshow</b> = Frage → Antwort → Follow als Karussell (durchtippen &amp; screenshotten).
          </div>
        </div>
      )}
    </div>
  );
}

const slideBtn: React.CSSProperties = {
  appearance: 'none', border: 'none', background: 'rgba(0,0,0,0.5)', color: '#fff',
  fontFamily: BODY, fontWeight: 900, fontSize: '3.8cqw', padding: '1.4cqh 5cqw', borderRadius: 999, cursor: 'pointer',
};

function btn(bg: string, color: string, border = 'none'): React.CSSProperties {
  return {
    appearance: 'none', border, background: bg, color, fontFamily: BODY, fontWeight: 900, fontSize: 14.5,
    padding: '10px 18px', borderRadius: 999, cursor: 'pointer',
    boxShadow: bg === PINK ? '0 8px 22px rgba(236,72,153,0.4)' : 'none',
  };
}

// Eigene Schätzfrage eintippen (für lokale/aktuelle Themen).
function CustomForm({ onApply }: { onApply: (q: ClipQ) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [a, setA] = useState('');
  const [unit, setUnit] = useState('');
  const [fact, setFact] = useState('');
  const inp: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.06)',
    color: '#e2e8f0', fontFamily: BODY, fontSize: 14, outline: 'none',
  };
  if (!open) {
    return <button onClick={() => setOpen(true)} style={{ ...btn('transparent', '#a9a6c4', '1px dashed rgba(255,255,255,0.22)'), fontSize: 13 }}>✏️ Eigene Frage eintippen</button>;
  }
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 14, padding: 14 }}>
      <input style={inp} placeholder="Frage (z.B. Wie viele Einwohner hat Köln?)" value={q} onChange={e => setQ(e.target.value)} />
      <div style={{ display: 'flex', gap: 8 }}>
        <input style={{ ...inp, flex: 2 }} inputMode="numeric" placeholder="Antwort (Zahl)" value={a} onChange={e => setA(e.target.value)} />
        <input style={{ ...inp, flex: 1 }} placeholder="Einheit" value={unit} onChange={e => setUnit(e.target.value)} />
      </div>
      <input style={inp} placeholder="Fun Fact (optional)" value={fact} onChange={e => setFact(e.target.value)} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => { const n = Number(a.replace(/\./g, '').replace(',', '.')); if (q.trim() && !Number.isNaN(n)) onApply({ q: q.trim(), a: n, unit: unit.trim() || undefined, fact: fact.trim() || undefined }); }}
          style={{ ...btn(PINK, '#fff'), flex: 1, fontSize: 14 }}
        >▶ Diesen Clip zeigen</button>
        <button onClick={() => setOpen(false)} style={{ ...btn('rgba(255,255,255,0.10)', '#fff', '1px solid rgba(255,255,255,0.18)'), fontSize: 14 }}>Zu</button>
      </div>
    </div>
  );
}

// Ablaufender Ring-Timer im Look des Beamer-Timers (CozyQuizBeamerTimer): SVG-Ring
// schrumpft von voll → leer über `seconds`; Farbe Pink → Orange → Rot je Restzeit.
function CountdownRing({ seconds, count, endContent }: { seconds: number; count: number; endContent?: React.ReactNode }) {
  const R = 80, STROKE = 9, C = 2 * Math.PI * R;
  const [go, setGo] = useState(false);
  useEffect(() => { const t = setTimeout(() => setGo(true), 40); return () => clearTimeout(t); }, []);
  const color = count <= 1 ? '#EF4444' : count <= 2 ? '#F97316' : PINK;
  return (
    <div style={{ position: 'relative', width: '38cqw', height: '38cqw' }}>
      <svg viewBox="0 0 200 200" width="100%" height="100%" style={{ transform: 'rotate(-90deg)', position: 'absolute', inset: 0 }}>
        <circle cx="100" cy="100" r={R} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth={STROKE} />
        <circle cx="100" cy="100" r={R} fill="none" stroke={color} strokeWidth={STROKE} strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={go ? C : 0}
          style={{ transition: `stroke-dashoffset ${seconds}s linear, stroke 0.3s ease`, filter: `drop-shadow(0 0 2cqw ${color}aa)` }} />
      </svg>
      <div key={count} style={{
        position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
        fontFamily: DISPLAY, fontWeight: 800, fontSize: '16cqw', color,
        fontVariantNumeric: 'tabular-nums', textShadow: `0 0 3cqw ${color}88`, animation: 'countPop 0.6s var(--eb)',
      }}>
        {/* Bei 0 das Frage-Symbol (z.B. Oktopus) statt des generischen ⏰. */}
        {count > 0 ? count : (endContent ?? '⏰')}
      </div>
    </div>
  );
}

// EU-Flagge als echte SVG: flache goldene 5-Zack-Sterne (aufrecht, EU-Gold #FFCC00)
// exakt im Kreis (Radius = 1/3 der Flaggenhöhe, EU-Spec) auf EU-Blau #003399.
// Emoji-Sterne wurden nie ein sauberer Ring → SVG-Polygone sind crisp + gleichmäßig.
function EuFlag() {
  const W = 300, H = 200, cx = W / 2, cy = H / 2;
  const ring = H / 3;               // Sternkreis-Radius = 1/3 Höhe (EU-Spec)
  const Ro = 15, Ri = Ro * 0.382;   // Stern: Außen-/Innenradius (5-Zack)
  const starPoints = (scx: number, scy: number) => {
    const pts: string[] = [];
    for (let k = 0; k < 10; k++) {
      const ang = (-90 + k * 36) * Math.PI / 180;   // Spitze zeigt nach oben
      const rad = k % 2 === 0 ? Ro : Ri;
      pts.push(`${(scx + rad * Math.cos(ang)).toFixed(1)},${(scy + rad * Math.sin(ang)).toFixed(1)}`);
    }
    return pts.join(' ');
  };
  const stars = Array.from({ length: 12 }, (_, i) => {
    const a = (i * 30) * Math.PI / 180;
    return { x: cx + ring * Math.sin(a), y: cy - ring * Math.cos(a), i };
  });
  return (
    <div style={{ width: '62cqw', aspectRatio: '3 / 2', borderRadius: '2.5cqw', overflow: 'hidden', border: '0.4cqw solid rgba(255,255,255,0.18)', boxShadow: '0 2cqh 6cqh rgba(0,0,0,0.5)' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{ display: 'block' }}>
        <rect width={W} height={H} fill="#003399" />
        {stars.map(s => (
          <polygon
            key={s.i}
            points={starPoints(s.x, s.y)}
            fill="#FFCC00"
            style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: `starPop 0.4s var(--eb) ${0.2 + s.i * 0.06}s both` }}
          />
        ))}
      </svg>
    </div>
  );
}

const KEYFRAMES = `
  :root { --eb: cubic-bezier(0.2, 1.2, 0.3, 1); }
  @keyframes sceneIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(4cqh); } to { opacity: 1; transform: none; } }
  @keyframes popIn { 0% { opacity: 0; transform: scale(0.7); } 100% { opacity: 1; transform: scale(1); } }
  @keyframes countPop { 0% { opacity: 0; transform: scale(1.6); } 45% { opacity: 1; transform: scale(1); } 100% { opacity: 1; } }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes barFill { from { width: 0%; } to { width: 100%; } }
  @keyframes floatPet { 0%, 100% { transform: translateY(0) rotate(-4deg); } 50% { transform: translateY(-3cqh) rotate(4deg); } }
  @keyframes starPop { from { opacity: 0; transform: scale(0.2); } to { opacity: 1; transform: scale(1); } }
`;
