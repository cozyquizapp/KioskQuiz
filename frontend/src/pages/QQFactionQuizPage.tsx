/**
 * QQFactionQuizPage — „Welches Team bist du?"-Reel (/welches-team).
 *
 * 2026-07-06 (Wolf-Idee + Social-Audit): das stärkste Share-/Kommentar-Format
 * („which one are you"). Zeigt die 8 Team-Typen (echte Wappen + Motto) je mit
 * einer „so spielst du"-Zeile → Zuschauer ordnet sich zu, kommentiert sein Team,
 * taggt Freunde. 9:16, Reel-Modus wie /trailer.
 * ⚠️ Wolf: Wort „Team" statt „Fraktion"; KEIN Bezug zu Brett/Feldern-Erobern —
 * die Team-Typen leben im Groß-Modus, der KEIN Spielbrett nutzt (nicht mit dem
 * Standard-CozyQuiz-Brett vermischen).
 * ⚠️ Wolf 2026-07-06: „context"-Szene (GANZ am Ende, Anfang muss catchy sein)
 * stellt klar, dass die 8 Team-Typen nur im Groß-Event-Modus vorkommen — sonst
 * suchen Leute im normalen CozyQuiz vergeblich nach „Team Feierabend wählen".
 * NICHT „statt einzeln" behaupten (bei CozyQuiz spielt man auch in Teams, nur
 * ohne diese 8 Typen).
 */
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { downloadReelSlide, runSlideExport, deliverReelExport, zipStore, downloadBlob } from '../reelCapture';
import { QQ_MEGA_FACTIONS } from '@shared/quarterQuizTypes';
import { crestSrc } from '../cozyArenaCrests';

const PINK = '#ec4899';
const PINK_MID = '#f472b6';
const DISPLAY = 'var(--font-brand)';
const BODY = "'Nunito', 'Inter', system-ui, sans-serif";
const COZY_BG = 'radial-gradient(circle at 50% 0%, #1E2A5A 0%, #0F1530 60%, #0A0E22 100%)';
const cw = (pose: string) => `/avatars/cozywolf/${pose}.png`;

// Wappen-Farbe (aus cozyArenaCrests-Kommentaren) + „so spielst du"-Charakterzeile
// (Wolf-Stimme, KEIN Em-Dash — Kunden-Copy).
const FACTION_META: Record<string, { accent: string; char: string }> = {
  bauchgefuehl:  { accent: '#FB923C', char: 'Du tippst aus dem Bauch und liegst öfter richtig, als alle zugeben.' },
  glueckstreffer:{ accent: '#4ADE80', char: 'Keine Ahnung. Trotzdem die Punkte. Frag lieber nicht wie.' },
  feierabend:    { accent: '#2DD4BF', char: 'Gewinnen? Nett. Aber das kühle Getränk ist wichtiger.' },
  letztesekunde: { accent: '#A78BFA', char: 'Deine Antwort kommt, wenn der Timer schon blinkt. Jedes Mal.' },
  allwissen:     { accent: '#FACC15', char: 'Du kennst die Antwort, bevor die Frage zu Ende gelesen ist.' },
  improvisation: { accent: '#3B82F6', char: 'Kein Plan, aber maximale Überzeugung. Wird schon klappen.' },
  einspruch:     { accent: '#EC4899', char: 'Bei jeder Auflösung: „Moment, das ist total unfair!"' },
  risiko:        { accent: '#EF4444', char: 'Beim Finale wird alles gesetzt. Glorreich oder Totalschaden.' },
};

type Scene = { key: string; dur: number };
const SCENES: Scene[] = [
  { key: 'intro', dur: 3800 },
  ...QQ_MEGA_FACTIONS.map((_, i) => ({ key: `fac-${i}`, dur: 3500 })),
  // Wolf 2026-07-06: Kontext (Groß-Gruppen-Modus) GANZ ans Ende — Anfang muss
  // catchy sein, nicht erklärend. Erklärt kurz vor dem CTA, dass die 8 Team-Typen
  // zum Groß-Event-Modus gehören (sonst suchen Leute im normalen CozyQuiz danach).
  { key: 'context', dur: 4400 },
  { key: 'cta', dur: 4800 },
];

export default function QQFactionQuizPage() {
  // ?slides oeffnet direkt den Slideshow-Modus; ?export=zip|frames = Batch-Export.
  const [sp] = useSearchParams();
  const exportMode = (sp.get('export') === 'zip' || sp.get('export') === 'frames') ? sp.get('export') as 'zip' | 'frames' : null;
  const [scene, setScene] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reel, setReel] = useState(false);
  const [slideshow, setSlideshow] = useState(sp.has('slides') || !!exportMode);
  const big = reel || slideshow; // randloser Vollbild-Frame (Aufnehmen / Abfotografieren)
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

  // HD-Download der aktuellen Folie (Standbild → Anim auf Endzustand gezwungen).
  const frameRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const saveSlide = async () => {
    if (!frameRef.current || saving) return;
    setSaving(true);
    try {
      await downloadReelSlide(frameRef.current, `cozyquiz-welches-team-${scene + 1}.png`);
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
      const files = bytes.map((data, i) => ({ name: `welches-team-${String(i + 1).padStart(2, '0')}.png`, data }));
      downloadBlob(zipStore(files), 'cozyquiz-welches-team-slides.zip');
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
        await deliverReelExport(exportMode, bytes, 'welches-team');
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

  useEffect(() => { document.title = 'CozyQuiz — Welches Team bist du?'; }, []);

  // Auto-Weiterlauf nur wenn nicht pausiert UND nicht im Slideshow-Modus.
  useEffect(() => {
    if (paused || slideshow) return;
    const t = setTimeout(() => setScene(s => (s + 1) % SCENES.length), SCENES[scene].dur);
    return () => clearTimeout(t);
  }, [scene, paused, slideshow]);

  return (
    <div style={{
      minHeight: big ? undefined : '100vh',
      ...(big
        ? { position: 'fixed', inset: 0, zIndex: 9999, background: '#0A0E22', padding: 0, gap: 0 }
        : { background: '#0c0a14', gap: 14, padding: 10 }),
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: BODY,
    }}>
      <style>{KEYFRAMES}</style>

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

        <div key={scene} style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', textAlign: 'center',
          padding: '11cqh 7cqw', zIndex: 5, color: '#fff', animation: 'sceneIn 0.5s ease both',
        }}>
          {renderScene(SCENES[scene].key)}
        </div>

        {paused && !big && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.25)' }}>
            <span style={{ fontSize: '14cqw' }}>▶︎</span>
          </div>
        )}
      </div>

      {!big && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9, maxWidth: 400 }}>
          <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button onClick={() => setReel(true)} style={{
              appearance: 'none', border: 'none', background: PINK, color: '#fff', fontFamily: BODY, fontWeight: 900,
              fontSize: 15, padding: '11px 22px', borderRadius: 999, cursor: 'pointer', boxShadow: '0 8px 24px rgba(236,72,153,0.4)',
            }}>▶ Reel-Modus</button>
            <button onClick={() => { setScene(0); setSlideshow(true); }} style={{
              appearance: 'none', border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.10)', color: '#fff',
              fontFamily: BODY, fontWeight: 900, fontSize: 15, padding: '11px 22px', borderRadius: 999, cursor: 'pointer',
            }}>🖼 Slideshow-Modus</button>
            <button onClick={saveZip} disabled={!!zipProg} style={{
              appearance: 'none', border: '1px solid rgba(255,255,255,0.18)', background: zipProg ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.10)', color: '#fff',
              fontFamily: BODY, fontWeight: 900, fontSize: 15, padding: '11px 22px', borderRadius: 999, cursor: zipProg ? 'default' : 'pointer',
            }}>{zipProg ? `⏳ ${zipProg}` : '⬇ Alle Folien (ZIP)'}</button>
          </div>
          <div style={{ color: '#8a86a0', fontSize: 13, fontWeight: 700, textAlign: 'center', lineHeight: 1.5 }}>
            Tippen = Pause · loopt automatisch (~41&nbsp;s).<br />
            <b style={{ color: '#c9c5da' }}>Reel</b> = am Handy abfilmen · <b style={{ color: '#c9c5da' }}>Slideshow</b> = je Folie durchtippen &amp; screenshotten (fürs Karussell).
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

function renderScene(key: string) {
  if (key === 'intro') {
    return (
      <>
        {/* Kleines CozyWolf-Logo überm Wortmark */}
        <img src={cw('head')} alt="CozyWolf" style={{ width: '20cqw', height: '20cqw', objectFit: 'contain', marginBottom: '1.5cqh', filter: 'drop-shadow(0 0.8cqh 1cqh rgba(0,0,0,0.4))', animation: 'popIn 0.6s var(--eb) both' }} />
        <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '6cqw', color: PINK, letterSpacing: '-0.01em', animation: 'fadeUp 0.5s ease 0.15s both' }}>
          CozyQuiz
        </div>
        <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '13cqw', lineHeight: 1.0, letterSpacing: '-0.02em', marginTop: '2cqh', animation: 'popIn 0.7s var(--eb) 0.3s both' }}>
          Welches<br />Team<br />bist du?
        </div>
        <div style={{ fontWeight: 800, fontSize: '5.2cqw', marginTop: '4cqh', opacity: 0.94, animation: 'fadeUp 0.6s ease 0.5s both' }}>
          Bleib dran, bis <span style={{ color: PINK_MID }}>du</span> dich erkennst.
        </div>
      </>
    );
  }

  if (key === 'context') {
    return (
      <>
        <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '4cqw', letterSpacing: '0.2em', opacity: 0.85, animation: 'fadeUp 0.5s ease both' }}>
          FÜR GROSSE GRUPPEN
        </div>
        {/* Wappen-Cluster (alle 8) → „viele Leute, viele Teams" */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '2cqw', width: '72cqw', margin: '3.5cqh 0' }}>
          {QQ_MEGA_FACTIONS.map((f, i) => (
            <img key={f.slug} src={crestSrc(f.slug)} alt="" style={{ width: '15cqw', height: '15cqw', objectFit: 'contain', filter: 'drop-shadow(0 0.6cqh 0.8cqh rgba(0,0,0,0.45))', animation: `crestPop 0.5s var(--eb) ${0.2 + i * 0.09}s both` }} />
          ))}
        </div>
        <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '7.6cqw', lineHeight: 1.04, animation: 'popIn 0.6s var(--eb) 0.3s both' }}>
          Das ist die<br /><span style={{ color: PINK_MID }}>Cozy Arena</span>.
        </div>
        <div style={{ fontWeight: 800, fontSize: '4.6cqw', marginTop: '3cqh', opacity: 0.92, maxWidth: '82cqw', lineHeight: 1.32, animation: 'fadeUp 0.6s ease 0.6s both' }}>
          Der Groß-Gruppen-Modus vom CozyQuiz. Die acht Team-Typen gibt's bei großen Events.
        </div>
      </>
    );
  }

  if (key === 'cta') {
    return (
      <>
        <div style={{ position: 'relative', width: '38cqw', height: '38cqw', display: 'grid', placeItems: 'center', animation: 'popIn 0.7s var(--eb) both' }}>
          <div style={{ position: 'absolute', width: '84%', height: '84%', borderRadius: '50%', background: `radial-gradient(circle, ${PINK}55, transparent 68%)`, filter: 'blur(6px)' }} />
          <img src={cw('augenauf.troete.jubel')} alt="CozyWolf" style={{ position: 'relative', width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 1.4cqh 1.8cqh rgba(0,0,0,0.45))', animation: 'floatPet 5s ease-in-out infinite' }} />
        </div>
        <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '10cqw', lineHeight: 1.02, marginTop: '3cqh', animation: 'popIn 0.7s var(--eb) 0.2s both' }}>
          Und? Welches<br />Team bist du?
        </div>
        <div style={{ fontWeight: 800, fontSize: '4.8cqw', marginTop: '3cqh', opacity: 0.92, maxWidth: '82cqw', lineHeight: 1.3, animation: 'fadeUp 0.6s ease 0.45s both' }}>
          Kommentier dein Team <span style={{ color: PINK_MID }}>👇</span> und tag jemanden, der genau SO spielt.
        </div>
        <div style={{ marginTop: '4.5cqh', display: 'flex', flexDirection: 'column', gap: '1.4cqh', fontWeight: 800, fontSize: '5cqw', animation: 'fadeUp 0.6s ease 0.7s both' }}>
          <span style={{ color: PINK_MID }}>@cozywolf.events</span>
          <span style={{ opacity: 0.7, fontSize: '3.6cqw' }}>cozywolf.de</span>
        </div>
      </>
    );
  }

  // fac-N
  const idx = Number(key.slice(4));
  const f = QQ_MEGA_FACTIONS[idx];
  if (!f) return null;
  const meta = FACTION_META[f.slug] ?? { accent: PINK, char: '' };
  return (
    <>
      <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '3.8cqw', letterSpacing: '0.2em', opacity: 0.7, animation: 'fadeUp 0.4s ease both' }}>
        TEAM {idx + 1} / 8
      </div>
      {/* Wappen */}
      <div style={{ position: 'relative', width: '46cqw', height: '46cqw', margin: '2.5cqh 0 3cqh', display: 'grid', placeItems: 'center', animation: 'crestPop 0.7s var(--eb) 0.1s both' }}>
        <div style={{ position: 'absolute', width: '90%', height: '90%', borderRadius: '50%', background: `radial-gradient(circle, ${meta.accent}55, transparent 66%)`, filter: 'blur(7px)' }} />
        <img src={crestSrc(f.slug)} alt={f.nameDe} style={{ position: 'relative', width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 1.6cqh 2cqh rgba(0,0,0,0.5))', animation: 'floatPet 5s ease-in-out infinite' }} />
      </div>
      <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '11cqw', lineHeight: 1.0, color: meta.accent, animation: 'popIn 0.6s var(--eb) 0.25s both' }}>
        {f.nameDe}
      </div>
      <div style={{ display: 'inline-block', marginTop: '2cqh', fontWeight: 900, fontSize: '4.6cqw', color: '#fff', background: `${meta.accent}2e`, border: `0.35cqw solid ${meta.accent}`, borderRadius: '99px', padding: '0.5cqh 3cqw', animation: 'fadeUp 0.5s ease 0.45s both' }}>
        „{f.mottoDe}"
      </div>
      <div style={{ fontWeight: 700, fontSize: '4.6cqw', marginTop: '3.5cqh', opacity: 0.94, maxWidth: '80cqw', lineHeight: 1.32, animation: 'fadeUp 0.5s ease 0.35s both' }}>
        {meta.char}
      </div>
    </>
  );
}

const KEYFRAMES = `
  :root { --eb: cubic-bezier(0.2, 1.2, 0.3, 1); }
  @keyframes sceneIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(4cqh); } to { opacity: 1; transform: none; } }
  @keyframes popIn { 0% { opacity: 0; transform: scale(0.7); } 100% { opacity: 1; transform: scale(1); } }
  @keyframes crestPop { 0% { opacity: 0; transform: scale(0.5) rotate(-8deg); } 100% { opacity: 1; transform: none; } }
  @keyframes barFill { from { width: 0%; } to { width: 100%; } }
  @keyframes floatPet { 0%, 100% { transform: translateY(0) rotate(-3deg); } 50% { transform: translateY(-2.5cqh) rotate(3deg); } }
`;
