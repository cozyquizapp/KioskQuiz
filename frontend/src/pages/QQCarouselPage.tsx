/**
 * QQCarouselPage — dedizierte STANDBILD-Karussells fuer Social (/karussell).
 *
 * 2026-07-06 (Wolf): „ich glaube du musst die seiten einzeln bauen." Statt
 * Screenshots aus dem animierten Reel zu ziehen (Trailer-Fragen zeigen immer
 * schon die Antwort, html2canvas-Treue unsicher) → eigene, fuer das Standbild
 * gebaute Slides. Format: 4:5 (1080×1350), Instagram-Foto-Karussell.
 *
 * Design-Regeln fuer EXPORT-Treue (Vorschau == PNG):
 *  - KEIN `filter:` (drop-shadow/blur) auf wichtigem Inhalt — der reelCapture-
 *    onclone strippt Filter (html2canvas 1.4.1 rendert sie unsauber). Tiefe kommt
 *    aus `box-shadow` + Radial-Halos (rendern sauber).
 *  - Reine Verlaeufe/Farben, echte Fonts (fonts.ready), hoher Kontrast.
 *  - Jede Folie ist eine abgeschlossene Karte, die ALLEIN Sinn ergibt.
 *
 * Flagship: „Welches Team bist du?" (Cover · 8 Team-Karten · Kontext · CTA).
 * Export: einzeln (⬇ HD) oder ganzes Karussell als ZIP (reelCapture-Helfer).
 */
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { downloadReelSlide, runSlideExport, deliverReelExport, zipStore, downloadBlob } from '../reelCapture';
import { QQ_MEGA_FACTIONS } from '@shared/quarterQuizTypes';
import { crestSrc } from '../cozyArenaCrests';

const PINK = '#ec4899';
const PINK_MID = '#f472b6';
const DISPLAY = "'Stinger Fit', 'Bricolage Grotesque', 'Inter', 'Nunito', system-ui, sans-serif";
const BODY = "'Nunito', 'Inter', system-ui, sans-serif";
const COZY_BG = 'radial-gradient(circle at 50% 0%, #1E2A5A 0%, #0F1530 58%, #0A0E22 100%)';
const cw = (pose: string) => `/avatars/cozywolf/${pose}.png`;

// 4:5-Export-Zielgroesse (1080×1350). Fest → deterministisch, Export == Vorschau.
const FIXED = { w: 1080, h: 1350 };

// Team-Akzent + „so spielst du"-Charakterzeile (aus dem Reel, 1:1, kein Em-Dash).
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

// Dezente Marken-Zeile unten auf inhaltlichen Karten (jeder Screenshot ist gebrandet).
function BrandTag() {
  return (
    <div style={{
      position: 'absolute', bottom: '3.4cqh', left: 0, right: 0, textAlign: 'center',
      fontFamily: DISPLAY, fontWeight: 800, fontSize: '3cqw', letterSpacing: '0.14em',
      color: 'rgba(255,255,255,0.4)',
    }}>
      COZYQUIZ · @COZYWOLF.EVENTS
    </div>
  );
}

// ── Die Slides (jede = abgeschlossene Karte) ─────────────────────────────────
type SlideFn = () => JSX.Element;

const coverSlide: SlideFn = () => (
  <>
    <img src={cw('head')} alt="CozyWolf" style={{ width: '18cqw', height: '18cqw', objectFit: 'contain', marginBottom: '2cqh', animation: 'popIn 0.6s var(--eb) both' }} />
    <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '5cqw', letterSpacing: '0.06em', color: PINK, animation: 'fadeUp 0.5s ease 0.1s both' }}>
      COZYQUIZ
    </div>
    <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '15cqw', lineHeight: 0.98, letterSpacing: '-0.02em', marginTop: '2.5cqh', animation: 'popIn 0.7s var(--eb) 0.25s both' }}>
      Welches<br />Team<br />bist du?
    </div>
    <div style={{ fontWeight: 800, fontSize: '5.4cqw', marginTop: '4cqh', opacity: 0.94, maxWidth: '80cqw', lineHeight: 1.28, animation: 'fadeUp 0.6s ease 0.45s both' }}>
      Wisch durch die <span style={{ color: PINK_MID }}>8 Typen</span>. Welcher bist du?
    </div>
    <div style={{
      marginTop: '5cqh', display: 'inline-flex', alignItems: 'center', gap: '2cqw',
      fontFamily: DISPLAY, fontWeight: 800, fontSize: '4.4cqw', color: '#fff',
      background: 'rgba(255,255,255,0.10)', border: '0.3cqw solid rgba(255,255,255,0.2)',
      borderRadius: '99px', padding: '1.2cqh 4.5cqw', animation: 'fadeUp 0.6s ease 0.7s both',
    }}>
      Wisch weiter <span style={{ fontSize: '5cqw' }}>→</span>
    </div>
  </>
);

function teamSlide(idx: number): JSX.Element {
  const f = QQ_MEGA_FACTIONS[idx];
  const meta = FACTION_META[f.slug] ?? { accent: PINK, char: '' };
  return (
    <>
      <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '3.6cqw', letterSpacing: '0.2em', opacity: 0.7, animation: 'fadeUp 0.4s ease both' }}>
        TEAM {idx + 1} / 8
      </div>
      {/* Wappen auf Radial-Halo (kein filter → export-treu). PNG ist 500×500 quadratisch,
          darum width + height:auto statt object-fit (html2canvas rendert object-fit falsch
          = schrumpft das Bild → Lücke → wirkt „nicht zentriert"). */}
      <div style={{ position: 'relative', width: '42cqw', height: '42cqw', margin: '2cqh 0 3cqh', animation: 'crestPop 0.7s var(--eb) 0.1s both' }}>
        <div style={{ position: 'absolute', inset: '2%', borderRadius: '50%', background: `radial-gradient(circle, ${meta.accent}66 0%, ${meta.accent}22 45%, transparent 70%)` }} />
        {/* Wappen als background-image statt <img> — html2canvas rendert <img> zu klein
            (0.78×), background-size:contain aber auf volle Containergroesse. */}
        <div role="img" aria-label={f.nameDe} style={{ position: 'absolute', inset: 0, backgroundImage: `url(${crestSrc(f.slug)})`, backgroundSize: 'contain', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', animation: 'floatPet 5s ease-in-out infinite' }} />
      </div>
      {/* Name + Motto in einem Flex-Gap → definierter Abstand, KEINE Überlappung
          (marginTop scheiterte an Descendern + html2canvas-Baseline-Drift). */}
      {/* marginTop statt Flex-gap: html2canvas rendert Margins originalgetreu wie
          der Browser (Flex-`gap` kam im Export groesser raus → Download ≠ Vorschau). */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '10.5cqw', lineHeight: 1.05, color: meta.accent, animation: 'popIn 0.6s var(--eb) 0.25s both' }}>
          {f.nameDe}
        </div>
        {/* line-height:1 + inline-flex-Zentrierung: html2canvas rendert die Text-
            Baseline bei grosser line-height zu tief → Text sass unten. So mittig. */}
        {/* Live: normal zentriert. Nur im Export korrigiert `data-export-nudge` die
            html2canvas-Baseline (die haengt den Text ~1.35cqh zu tief) — siehe reelCapture. */}
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginTop: '4.2cqh', fontWeight: 900, fontSize: '4.5cqw', lineHeight: 1, color: '#fff', background: `${meta.accent}33`, border: `0.35cqw solid ${meta.accent}`, borderRadius: '99px', padding: '1.35cqh 3.5cqw', animation: 'fadeUp 0.5s ease 0.45s both' }}>
          <span data-export-nudge="-1.35cqh" style={{ display: 'inline-block' }}>„{f.mottoDe}"</span>
        </div>
      </div>
      <div style={{ fontWeight: 700, fontSize: '4.4cqw', marginTop: '3.4cqh', opacity: 0.95, maxWidth: '84cqw', lineHeight: 1.34, animation: 'fadeUp 0.5s ease 0.35s both' }}>
        {meta.char}
      </div>
      <BrandTag />
    </>
  );
}

const contextSlide: SlideFn = () => (
  <>
    <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '4cqw', letterSpacing: '0.2em', opacity: 0.85, animation: 'fadeUp 0.5s ease both' }}>
      FÜR GROSSE GRUPPEN
    </div>
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '2cqw', width: '68cqw', margin: '4cqh 0' }}>
      {QQ_MEGA_FACTIONS.map((f, i) => (
        <img key={f.slug} src={crestSrc(f.slug)} alt="" style={{ width: '14cqw', height: '14cqw', objectFit: 'contain', animation: `crestPop 0.5s var(--eb) ${0.2 + i * 0.08}s both` }} />
      ))}
    </div>
    <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '8cqw', lineHeight: 1.04, animation: 'popIn 0.6s var(--eb) 0.3s both' }}>
      Das ist die<br /><span style={{ color: PINK_MID }}>Cozy Arena</span>.
    </div>
    <div style={{ fontWeight: 800, fontSize: '4.8cqw', marginTop: '3.2cqh', opacity: 0.92, maxWidth: '82cqw', lineHeight: 1.34, animation: 'fadeUp 0.6s ease 0.6s both' }}>
      Der Groß-Gruppen-Modus vom CozyQuiz. Die acht Team-Typen gibt's bei großen Events.
    </div>
    <BrandTag />
  </>
);

const ctaSlide: SlideFn = () => (
  <>
    <div style={{ position: 'relative', width: '40cqw', height: '40cqw', display: 'grid', placeItems: 'center', animation: 'popIn 0.7s var(--eb) both' }}>
      <div style={{ position: 'absolute', inset: '6%', borderRadius: '50%', background: `radial-gradient(circle, ${PINK}55 0%, ${PINK}22 45%, transparent 70%)` }} />
      <img src={cw('augenauf.troete.jubel')} alt="CozyWolf" style={{ position: 'relative', width: '100%', height: '100%', objectFit: 'contain', animation: 'floatPet 5s ease-in-out infinite' }} />
    </div>
    <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '11cqw', lineHeight: 1.0, marginTop: '3.5cqh', animation: 'popIn 0.7s var(--eb) 0.2s both' }}>
      Und? Welches<br />Team bist du?
    </div>
    <div style={{ fontWeight: 800, fontSize: '5cqw', marginTop: '3.4cqh', opacity: 0.94, maxWidth: '82cqw', lineHeight: 1.32, animation: 'fadeUp 0.6s ease 0.45s both' }}>
      Kommentier dein Team <span style={{ color: PINK_MID }}>👇</span> und tag jemanden, der genau SO spielt.
    </div>
    <div style={{ marginTop: '5cqh', display: 'flex', flexDirection: 'column', gap: '1.4cqh', fontWeight: 800, fontSize: '5.2cqw', animation: 'fadeUp 0.6s ease 0.7s both' }}>
      <span style={{ color: PINK_MID }}>@cozywolf.events</span>
      <span style={{ opacity: 0.7, fontSize: '3.8cqw' }}>cozywolf.de</span>
    </div>
  </>
);

const SLIDES: SlideFn[] = [
  coverSlide,
  ...QQ_MEGA_FACTIONS.map((_, i) => () => teamSlide(i)),
  contextSlide,
  ctaSlide,
];

const KEYFRAMES = `
  :root { --eb: cubic-bezier(0.2, 1.2, 0.3, 1); }
  @keyframes sceneIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(3cqh); } to { opacity: 1; transform: none; } }
  @keyframes popIn { 0% { opacity: 0; transform: scale(0.75); } 100% { opacity: 1; transform: scale(1); } }
  @keyframes crestPop { 0% { opacity: 0; transform: scale(0.5) rotate(-8deg); } 100% { opacity: 1; transform: none; } }
  @keyframes floatPet { 0%, 100% { transform: translateY(0) rotate(-3deg); } 50% { transform: translateY(-2cqh) rotate(3deg); } }
`;

export default function QQCarouselPage() {
  const [sp] = useSearchParams();
  const exportMode = (sp.get('export') === 'zip' || sp.get('export') === 'frames') ? sp.get('export') as 'zip' | 'frames' : null;

  const [slide, setSlide] = useState(0);
  const [big, setBig] = useState(!!exportMode);
  const [controls, setControls] = useState(true);
  // Waehrend des Exports rendert der Frame offscreen in exakt 1080×1350 px, damit der
  // Browser das Layout in Zielgroesse macht (korrekte cq-Aufloesung) und html2canvas
  // nur fertige Pixel liest → Download == Live-View.
  const [exporting, setExporting] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const hideT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cur = Math.min(slide, SLIDES.length - 1);

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

  const prev = () => { setSlide(s => (s - 1 + SLIDES.length) % SLIDES.length); pokeControls(); };
  const next = () => { setSlide(s => (s + 1) % SLIDES.length); pokeControls(); };

  useEffect(() => { document.title = 'CozyQuiz — Karussell'; }, []);

  // Frame offscreen auf 1080×1350 bringen + Layout/Bilder abwarten, dann fn ausfuehren.
  const withExport = async (fn: () => Promise<void>) => {
    setExporting(true);
    // 2 Frames fuer Re-Layout in Zielgroesse + kurz fuer background-image-Decode.
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    await new Promise((r) => setTimeout(r, 140));
    try { await fn(); } finally { setExporting(false); }
  };

  const [saving, setSaving] = useState(false);
  const saveSlide = async () => {
    if (!frameRef.current || saving) return;
    setSaving(true);
    try {
      await withExport(async () => {
        await downloadReelSlide(frameRef.current!, `cozyquiz-welches-team-karussell-${String(cur + 1).padStart(2, '0')}.png`, 1080, FIXED);
      });
    } catch (e) {
      alert('Ups — der Bild-Export hat nicht geklappt.\n\n' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSaving(false);
    }
  };

  const [zipProg, setZipProg] = useState<string | null>(null);
  const saveZip = async () => {
    if (!frameRef.current || zipProg) return;
    const prevSlide = slide;
    setZipProg('0/' + SLIDES.length);
    try {
      await withExport(async () => {
        const bytes = await runSlideExport({
          frameRef, count: SLIDES.length, setScene: setSlide, fixed: FIXED,
          onProgress: (d, t) => setZipProg(`${d}/${t}`),
        });
        const files = bytes.map((data, i) => ({ name: `welches-team-${String(i + 1).padStart(2, '0')}.png`, data }));
        downloadBlob(zipStore(files), 'cozyquiz-welches-team-karussell.zip');
      });
    } catch (e) {
      alert('Ups — der ZIP-Export hat nicht geklappt.\n\n' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setZipProg(null);
      setSlide(prevSlide);
    }
  };

  // Auto-Export (?export=zip|frames) — fuer kuenftigen /reels-Sammler.
  useEffect(() => {
    if (!exportMode) return;
    let cancelled = false;
    (async () => {
      try {
        await new Promise((r) => setTimeout(r, 700));
        let bytes: Uint8Array[] = [];
        await withExport(async () => { bytes = await runSlideExport({ frameRef, count: SLIDES.length, setScene: setSlide, fixed: FIXED }); });
        if (cancelled) return;
        await deliverReelExport(exportMode, bytes, 'welches-team-karussell');
      } catch (e) {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: 'cozyreel-error', message: String(e) }, window.location.origin);
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

      {/* 4:5-Frame (container-query-Einheiten). */}
      <div ref={frameRef} style={{
        containerType: 'size', overflow: 'hidden', background: COZY_BG, cursor: 'pointer',
        ...(exporting
          // Export: exakt 1080×1350 px, offscreen → Browser-Layout in Zielgroesse.
          ? { position: 'fixed' as const, left: '-99999px', top: '0', width: '1080px', height: '1350px', aspectRatio: 'auto', maxWidth: 'none', maxHeight: 'none', borderRadius: 0, boxShadow: 'none' }
          : big
          ? { position: 'relative' as const, aspectRatio: '4 / 5', width: 'min(100vw, calc(100dvh * 4 / 5))', height: 'auto', maxHeight: '100dvh', borderRadius: 0, boxShadow: 'none' }
          : { position: 'relative' as const, aspectRatio: '4 / 5', height: 'min(90vh, calc(100vw * 5 / 4))', maxWidth: '100vw', borderRadius: 22, boxShadow: '0 24px 70px rgba(0,0,0,0.6)' }),
      }} onClick={() => big ? pokeControls() : undefined}>

        {big && (
          <button data-no-capture onClick={(e) => { e.stopPropagation(); setBig(false); }} aria-label="Vollbild schließen" style={{
            position: 'absolute', top: '2.2cqh', right: '3.5cqw', zIndex: 30,
            width: '8cqw', height: '8cqw', borderRadius: '50%', border: 'none',
            background: 'rgba(0,0,0,0.4)', color: '#fff', fontSize: '4.4cqw', fontWeight: 900,
            cursor: 'pointer', opacity: controls ? 1 : 0, transition: 'opacity 0.4s ease', display: 'grid', placeItems: 'center',
          }}>✕</button>
        )}

        {/* Nav (Zähler + Vor/Zurück + HD) — data-no-capture. */}
        <div data-no-capture style={{ opacity: controls || !big ? 1 : 0, transition: 'opacity 0.4s ease' }}>
          <div style={{ position: 'absolute', top: '2.4cqh', left: '50%', transform: 'translateX(-50%)', zIndex: 30, background: 'rgba(0,0,0,0.45)', color: '#fff', fontWeight: 900, fontSize: '3.2cqw', padding: '0.6cqh 3cqw', borderRadius: 999 }}>
            {cur + 1} / {SLIDES.length}
          </div>
          <div style={{ position: 'absolute', bottom: '2.4cqh', left: 0, right: 0, zIndex: 30, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '2.6cqw' }}>
            <button onClick={(e) => { e.stopPropagation(); prev(); }} style={navBtn}>‹</button>
            <button onClick={(e) => { e.stopPropagation(); saveSlide(); }} style={{ ...navBtn, background: saving ? 'rgba(0,0,0,0.5)' : PINK }}>{saving ? '…' : '⬇ HD'}</button>
            <button onClick={(e) => { e.stopPropagation(); next(); }} style={navBtn}>›</button>
          </div>
        </div>

        {/* Aktive Folie */}
        <div key={cur} style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', textAlign: 'center',
          padding: '9cqh 7cqw', zIndex: 5, color: '#fff', animation: 'sceneIn 0.4s ease both',
        }}>
          {SLIDES[cur]()}
        </div>
      </div>

      {/* Screen-Steuerung (nicht im Vollbild) */}
      {!big && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9, maxWidth: 440 }}>
          <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button onClick={() => setBig(true)} style={{
              appearance: 'none', border: 'none', background: PINK, color: '#fff', fontFamily: BODY, fontWeight: 900,
              fontSize: 15, padding: '11px 22px', borderRadius: 999, cursor: 'pointer', boxShadow: '0 8px 24px rgba(236,72,153,0.4)',
            }}>⛶ Vollbild</button>
            <button onClick={saveSlide} disabled={saving} style={ctrlBtn}>{saving ? '…' : '⬇ Diese Folie (HD)'}</button>
            <button onClick={saveZip} disabled={!!zipProg} style={ctrlBtn}>{zipProg ? `⏳ ${zipProg}` : '⬇ Alle Folien (ZIP)'}</button>
          </div>
          <div style={{ color: '#8a86a0', fontSize: 12.5, fontWeight: 700, textAlign: 'center', lineHeight: 1.5 }}>
            Fürs Insta-Foto-Karussell (4:5, 1080×1350). Mit ‹ › durchklicken · einzeln oder alles als ZIP laden.
          </div>
        </div>
      )}
    </div>
  );
}

const navBtn: React.CSSProperties = {
  appearance: 'none', border: 'none', background: 'rgba(0,0,0,0.5)', color: '#fff',
  fontFamily: BODY, fontWeight: 900, fontSize: '3.6cqw', padding: '1.2cqh 4cqw', borderRadius: 999, cursor: 'pointer',
};
const ctrlBtn: React.CSSProperties = {
  appearance: 'none', border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.10)', color: '#fff',
  fontFamily: BODY, fontWeight: 900, fontSize: 15, padding: '11px 22px', borderRadius: 999, cursor: 'pointer',
};
