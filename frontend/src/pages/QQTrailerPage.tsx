/**
 * QQTrailerPage — animierte Werbe-Reels im 9:16-Hochformat, CozyWolf-Marke.
 *
 * 2026-06-25 (Wolf): kurzer Erklär-Trailer der Bock macht — autoplay + loop,
 * gecaptionte Motion-Sequenz mit den echten cozy3d-Game-Avataren. Inhalt 1:1
 * aus den echten Spielregeln, nichts Erfundenes. Zum Live-Herzeigen ODER als
 * Bildschirmaufnahme fürs Reel (@cozywolf.events).
 *
 * 2026-07-06 (Wolf): NISCHEN-VARIANTEN. Der /trailer läuft super (1700+ Views),
 * jetzt zielgruppen-spitze Reels. WICHTIG (Wolf): die Titel-/Startframes dürfen
 * NICHT alle gleich aussehen — sonst stuft TikTok es als Werbung/Spam ein. Also
 * hat JEDE Nische einen eigenen Hook-Screen (andere Komposition + erster Frame +
 * Farb-Zweitton + Deko) und ein eigenes CTA; der erklärende Mittelteil
 * (Erobern/Brett) wird geteilt, teils in anderer Reihenfolge.
 *
 * Routen (öffentlich):
 *   /trailer                 — allgemein (unverändert)
 *   /trailer/team            — Teamevent/Firmen (voll)     · /trailer/team-kurz
 *   /trailer/location        — Café/Pub/Bar (voll)         · /trailer/location-kurz
 *   /trailer/geburtstag      — Geburtstag/Privat (voll)    · /trailer/geburtstag-kurz
 */
import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { QQ_TEAM_PALETTE } from '@shared/quarterQuizTypes';
import { downloadReelSlide, runSlideExport, deliverReelExport, zipStore, downloadBlob } from '../reelCapture';

const PINK = '#ec4899';
const PINK_MID = '#f472b6';
const MAGENTA = '#a21247';
// Marken-Font wie die App-Hero-Titel (Lobby/Paused): Stinger Fit zuerst,
// Bricolage/Inter/Nunito als Fallback (Stinger-Fit-unicode-range lässt Ziffern
// bewusst auf den Fallback → identisch zur App).
const DISPLAY = 'var(--font-brand)';
const BODY = "'Nunito', 'Inter', system-ui, sans-serif";

// Cozy-Bühnen-BG (1:1 aus dem Cozy-Theme, qqTheme.ts COZY.surface.pageBg).
const COZY_BG = 'radial-gradient(circle at 50% 0%, #1E2A5A 0%, #0F1530 60%, #0A0E22 100%)';

const cz = (slug: string) => `/avatars/cozy3d/${slug}.png`;
// 2026-07-05 (Wolf): eigene App-Icons statt Microsoft-Fluent-Emojis + CozyWolf-
// Maskottchen als Gastgeber (vorher kam der Wolf gar nicht vor).
const icon = (name: string) => `/icons/${name}.png`;
const cw = (pose: string) => `/avatars/cozywolf/${pose}.png`;

// 5 Teams = die echten Default-Avatare mit den echten App-Farben (QQ_TEAM_PALETTE).
const TEAMS = [
  { slug: 'hund',     color: QQ_TEAM_PALETTE[0] }, // #FA507F
  { slug: 'faultier', color: QQ_TEAM_PALETTE[1] }, // #9DCB2F
  { slug: 'pinguin',  color: QQ_TEAM_PALETTE[2] }, // #266FD3
  { slug: 'koala',    color: QQ_TEAM_PALETTE[3] }, // #9A65D5
  { slug: 'giraffe',  color: QQ_TEAM_PALETTE[4] }, // #FEC814
];
const HERO = { slug: 'fuchs', color: QQ_TEAM_PALETTE[0] };
// 5×5-Gebiete (Team-Index je Zelle) — jede Zelle trägt den Team-Avatar (wie im echten Brett).
const MINI_GRID = [
  [0, 0, 1, 1, 2],
  [0, 0, 1, 2, 2],
  [0, 3, 1, 1, 2],
  [3, 3, 3, 4, 2],
  [3, 3, 4, 4, 4],
];

const CATEGORIES = [
  { icon: 'cat-schaetzchen',  name: 'Schätzchen', desc: 'Am nächsten dran' },
  { icon: 'cat-mucho',        name: 'Mu-Cho', desc: 'Tempo entscheidet' },
  { icon: 'cat-zehn-von-zehn', name: '10 von 10', desc: '10 Punkte, 3 Antworten' },
  { icon: 'cat-cheese',       name: 'Schau mal!', desc: 'Erkennt das Bild' },
  { icon: 'cat-bunte-tuete',  name: 'Bunte Tüte', desc: 'Überraschungs-Format' },
];

const TWISTS = [
  { img: icon('action-steal'),      text: 'Felder klauen' },
  { img: '/images/jokers/wolf.png', text: 'Joker: der CozyWolf' },  // App-Joker = Wolf, nicht Stern
  { img: icon('award-underdog'),    text: 'Comeback fürs letzte Team' },
];

type Scene = { key: string; dur: number };

// ── Nischen-Varianten ────────────────────────────────────────────────────────
// Jede Nische: eigener Hook-Screen (Key 'hook-*') + eigenes CTA (Key 'cta-*') +
// eigener Zweitton/Deko/BG-Tint → unterschiedliche Startframes (kein Werbe-Flag).
// Body-Szenen (conquer/board/cats/twists/bets) werden geteilt, teils umsortiert.
type DecoItem = { name: string; x: number; y: number; s: number; d: number };
type VariantCfg = {
  title: string;          // document.title
  full: Scene[];
  kurz: Scene[];
  bgTint: string | null;  // subtiler Overlay-Radiant für Startframe-Unterschied
  deco: DecoItem[];       // schwebende Hintergrund-Icons (Position/Set variiert)
};

const DECO_GENERAL: DecoItem[] = [
  { name: 'cat-schaetzchen',  x: 8,  y: 15, s: 13, d: 0 },
  { name: 'cat-mucho',        x: 82, y: 21, s: 11, d: 1.1 },
  { name: 'cat-cheese',       x: 13, y: 79, s: 12, d: 0.6 },
  { name: 'cat-bunte-tuete',  x: 84, y: 74, s: 13, d: 1.8 },
  { name: 'cat-zehn-von-zehn', x: 80, y: 47, s: 10, d: 2.5 },
];
const DECO_TEAM: DecoItem[] = [
  { name: 'action-steal',     x: 80, y: 14, s: 12, d: 0.3 },
  { name: 'cat-mucho',        x: 9,  y: 24, s: 11, d: 1.4 },
  { name: 'award-underdog',   x: 84, y: 72, s: 12, d: 0.9 },
  { name: 'cat-zehn-von-zehn', x: 11, y: 78, s: 11, d: 2.1 },
];
const DECO_LOCATION: DecoItem[] = [
  { name: 'cat-cheese',       x: 10, y: 18, s: 12, d: 0.5 },
  { name: 'cat-bunte-tuete',  x: 83, y: 26, s: 12, d: 1.7 },
  { name: 'cat-schaetzchen',  x: 84, y: 70, s: 11, d: 1.0 },
  { name: 'cat-mucho',        x: 12, y: 74, s: 12, d: 2.3 },
];
const DECO_BDAY: DecoItem[] = [
  { name: 'cat-bunte-tuete',  x: 9,  y: 14, s: 14, d: 0.2 },
  { name: 'cat-schaetzchen',  x: 83, y: 20, s: 12, d: 1.2 },
  { name: 'cat-cheese',       x: 85, y: 73, s: 12, d: 0.7 },
  { name: 'cat-mucho',        x: 11, y: 80, s: 12, d: 1.9 },
];
// Ambient-Deko laeuft auf ALLEN Slides — bewusst aus TikToks rechter Aktions-
// Leiste (x>82 ab Mitte) + unterer Caption (y>74) heraus positioniert.
const DECO_TESTTEAM: DecoItem[] = [
  { name: 'cat-mucho',        x: 10, y: 14, s: 11, d: 0.4 },
  { name: 'cat-schaetzchen',  x: 78, y: 12, s: 11, d: 1.5 },
  { name: 'award-underdog',   x: 9,  y: 62, s: 11, d: 1.0 },
  { name: 'cat-cheese',       x: 72, y: 66, s: 11, d: 2.2 },
];

// Wolf 2026-07-06: FUN zuerst (Fragen + Minispiele = der Hook), Gebiet-Taktik
// erst spaet als „obendrauf". „Erobert euer Gebiet" ist NICHT der Aufmacher.
// Wolf 2026-07-06 (2. Runde): Nischen dürfen sich nicht mehr denselben Mittelteil
// teilen. Jede Nische = echter Frage-Moment (anderer Kategorie-Typ) + eigener
// Gefühls-Bogen. Body-Bausteine hier, /trailer general bleibt unverändert.
// SMM-Audit: Szenen endeten 1,5–3,8s nach dem letzten Text (toter Hold auf Mute
// = Abbruch). Dauern gestrafft + Reveals früher (siehe QMucho/QOlder/QSchaetz).
const B = { fun: 4200, cats: 4600, minigames: 4300, board: 4400, qTeam: 4600, qLoc: 4600, qBday: 4800, steal: 4200, fill: 4000, win: 4000 };
const VARIANTS: Record<string, VariantCfg> = {
  general: {
    title: 'CozyQuiz — Trailer',
    full: [
      { key: 'title', dur: 3800 }, { key: 'fun', dur: B.fun }, { key: 'cats', dur: B.cats },
      { key: 'minigames', dur: B.minigames }, { key: 'board', dur: B.board }, { key: 'cta', dur: 4400 },
    ],
    kurz: [
      { key: 'title', dur: 3400 }, { key: 'fun', dur: B.fun }, { key: 'minigames', dur: B.minigames }, { key: 'cta', dur: 4200 },
    ],
    bgTint: null, deco: DECO_GENERAL,
  },
  team: {
    title: 'CozyQuiz — Teamevent-Reel',
    // TEAM = Rivalität: echte Mu-Cho (Wettrennen) → Felder klauen → Brett.
    full: [
      { key: 'hook-team', dur: 4400 }, { key: 'q-team', dur: B.qTeam }, { key: 'steal', dur: B.steal },
      { key: 'board', dur: B.board }, { key: 'cta-team', dur: 4400 },
    ],
    kurz: [
      { key: 'hook-team', dur: 4400 }, { key: 'q-team', dur: B.qTeam }, { key: 'cta-team', dur: 4200 },
    ],
    bgTint: 'radial-gradient(120% 80% at 78% 8%, rgba(38,111,211,0.16), transparent 60%)',
    deco: DECO_TEAM,
  },
  location: {
    title: 'CozyQuiz — Location-Reel',
    // LOCATION = toter Abend wird voll: echtes „Schau mal!"-Bild → Bunte Tüte → Bude füllt sich.
    full: [
      { key: 'hook-location', dur: 4400 }, { key: 'q-location', dur: B.qLoc }, { key: 'minigames', dur: B.minigames },
      { key: 'fill', dur: B.fill }, { key: 'cta-location', dur: 4400 },
    ],
    kurz: [
      { key: 'hook-location', dur: 4400 }, { key: 'q-location', dur: B.qLoc }, { key: 'cta-location', dur: 4200 },
    ],
    bgTint: 'radial-gradient(120% 80% at 22% 10%, rgba(162,18,71,0.20), transparent 62%)',
    deco: DECO_LOCATION,
  },
  geburtstag: {
    title: 'CozyQuiz — Geburtstags-Reel',
    // BDAY = Chaos + persönlich: Schätzchen übers Geburtstagskind → Bunte Tüte → Sieg + Konfetti.
    full: [
      { key: 'hook-bday', dur: 4400 }, { key: 'q-bday', dur: B.qBday }, { key: 'minigames', dur: B.minigames },
      { key: 'win', dur: B.win }, { key: 'cta-bday', dur: 4400 },
    ],
    kurz: [
      { key: 'hook-bday', dur: 4400 }, { key: 'q-bday', dur: B.qBday }, { key: 'cta-bday', dur: 4200 },
    ],
    bgTint: 'radial-gradient(110% 70% at 50% 4%, rgba(236,72,153,0.18), transparent 58%)',
    deco: DECO_BDAY,
  },
  testteam: {
    title: 'CozyQuiz — Test-Team-Aufruf',
    // TEST-TEAM = persoenliche Gruender-Bitte (kein Hochglanz-Verkauf): Wolf-Ask
    // Hook → kurzer Blick aufs Erlebnis (fun/minigames) → Angebot + /testen-CTA.
    full: [
      { key: 'bock-testteam', dur: B.fun }, { key: 'hook-testteam', dur: 4800 },
      { key: 'facts-testteam', dur: 5000 }, { key: 'frage-testteam', dur: B.qTeam },
      { key: 'erobern-testteam', dur: 4800 }, { key: 'cta-testteam', dur: 5200 },
    ],
    kurz: [
      { key: 'bock-testteam', dur: B.fun }, { key: 'frage-testteam', dur: B.qTeam }, { key: 'cta-testteam', dur: 5000 },
    ],
    bgTint: 'radial-gradient(120% 78% at 26% 6%, rgba(236,72,153,0.20), transparent 60%)',
    deco: DECO_TESTTEAM,
  },
};

/** Route-Param → {cfg, scenes}. 'team-kurz' → Nische team, Format kurz. */
function resolveVariant(param?: string): { cfg: VariantCfg; scenes: Scene[] } {
  const raw = (param ?? '').toLowerCase();
  const kurz = raw.endsWith('-kurz');
  const niche = kurz ? raw.slice(0, -'-kurz'.length) : raw;
  const cfg = VARIANTS[niche] ?? VARIANTS.general;
  return { cfg, scenes: kurz ? cfg.kurz : cfg.full };
}

export default function QQTrailerPage() {
  const { variant } = useParams();
  const { cfg, scenes } = resolveVariant(variant);
  // ?slides oeffnet direkt den Slideshow-Modus; ?export=zip|frames faehrt den
  // automatischen Batch-Export (ganzes Reel als ZIP bzw. Frames an /reels-Sammler).
  const [sp] = useSearchParams();
  const slidesDeepLink = sp.has('slides');
  const exportMode = (sp.get('export') === 'zip' || sp.get('export') === 'frames') ? sp.get('export') as 'zip' | 'frames' : null;
  const slug = variant ?? 'allgemein';

  const [scene, setScene] = useState(0);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  pausedRef.current = paused;
  const frameRef = useRef<HTMLDivElement>(null);
  // 2026-07-05 (Wolf 'Vollbild ist weird / croppt nicht sauber fuer IG'):
  // Reel-Modus = randlos-fuellendes exaktes 9:16 (kein Rahmen/Rand/Schatten),
  // vertikal zentriert. Der Handy-Screen-Record croppt dann sauber auf 9:16.
  const [reel, setReel] = useState(false);
  const [slideshow, setSlideshow] = useState(slidesDeepLink || !!exportMode);
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
  const prevSlide = () => { setScene(s => (s - 1 + scenes.length) % scenes.length); pokeControls(); };
  const nextSlide = () => { setScene(s => (s + 1) % scenes.length); pokeControls(); };

  useEffect(() => { document.title = cfg.title; }, [cfg.title]);
  // Variant-Wechsel → zurück auf Szene 0 (falls Route ohne Remount wechselt).
  useEffect(() => { setScene(0); }, [variant]);

  // Szenen-Stepper: nach Ablauf der Szenen-Dauer zur nächsten (Loop). Pausierbar;
  // im Slideshow-Modus manuell (kein Auto-Weiterlauf).
  useEffect(() => {
    if (paused || slideshow) return;
    const safe = Math.min(scene, scenes.length - 1);
    const t = setTimeout(() => setScene(s => (s + 1) % scenes.length), scenes[safe].dur);
    return () => clearTimeout(t);
  }, [scene, paused, scenes, slideshow]);

  const cur = Math.min(scene, scenes.length - 1);
  const totalSec = Math.round(scenes.reduce((a, s) => a + s.dur, 0) / 1000);

  // HD-Download der aktuellen Folie (Standbild → Anim auf Endzustand gezwungen).
  const [saving, setSaving] = useState(false);
  const saveSlide = async () => {
    if (!frameRef.current || saving) return;
    setSaving(true);
    try {
      await downloadReelSlide(frameRef.current, `cozyquiz-${variant ?? 'allgemein'}-${cur + 1}.png`);
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
    setZipProg('0/' + scenes.length);
    try {
      await new Promise((r) => setTimeout(r, 80));
      const bytes = await runSlideExport({
        frameRef, count: scenes.length, setScene,
        onProgress: (d, t) => setZipProg(`${d}/${t}`),
      });
      const files = bytes.map((data, i) => ({ name: `${slug}-${String(i + 1).padStart(2, '0')}.png`, data }));
      downloadBlob(zipStore(files), `cozyquiz-${slug}-slides.zip`);
    } catch (e) {
      console.error('ZIP-Export fehlgeschlagen', e);
      alert('Ups — der ZIP-Export hat nicht geklappt.\n\n' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setZipProg(null);
      setScene(prev);
    }
  };

  // ── HD-Video-Aufnahme (Wolf 2026-07-09): ein Klick → crisper Reel-Clip, kein
  //    Handy-Screen-Record + kein KI-Upscaling mehr. Nutzt getDisplayMedia
  //    (Tab teilen) + MediaRecorder mit hoher Bitrate, nimmt genau EINEN
  //    Durchlauf auf und laedt die Datei runter. recNonce erzwingt beim Start
  //    einen frischen Mount von Szene 0 (Entrance-Animation ab Frame 1). ──
  const [recNonce, setRecNonce] = useState(0);
  const [recording, setRecording] = useState(false);
  const recordHd = async () => {
    if (recording) return;
    const md = navigator.mediaDevices as MediaDevices & { getDisplayMedia?: (c: MediaStreamConstraints) => Promise<MediaStream> };
    if (!md?.getDisplayMedia || typeof MediaRecorder === 'undefined') {
      alert('Dein Browser kann keine Tab-Aufnahme. Nutze Chrome oder Edge am Desktop.');
      return;
    }
    // Ganzseiten-Vollbild (versteckt Browser-Leisten → maximale Aufloesung).
    // Fire-and-forget, nutzt die Klick-Geste; getDisplayMedia folgt synchron.
    try { void document.documentElement.requestFullscreen?.().catch(() => {}); } catch { /* ignore */ }
    const exitFs = () => { try { if (document.fullscreenElement) void document.exitFullscreen?.(); } catch { /* ignore */ } };
    let stream: MediaStream;
    try {
      // preferCurrentTab: der Picker waehlt den AKTUELLEN Tab vor → nur noch
      // „Teilen" klicken (kein „welchen Tab?"-Raten mehr). selfBrowserSurface:
      // 'include' erlaubt das Teilen des eigenen Tabs.
      stream = await md.getDisplayMedia({
        video: { frameRate: 30 } as MediaTrackConstraints, audio: false,
        preferCurrentTab: true, selfBrowserSurface: 'include',
      } as MediaStreamConstraints & Record<string, unknown>);
    } catch {
      exitFs();
      return; // User hat abgebrochen
    }
    // WebM (VP9) zuerst: robustestes MediaRecorder-Format. Der aus dem Browser
    // erzeugte fragmentierte MP4 laesst sich vom Windows-Standard-Player nicht
    // oeffnen (0x80004005) — WebM importiert CapCut/Chrome/VLC sauber.
    const types = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4;codecs=h264'];
    const mimeType = types.find(t => MediaRecorder.isTypeSupported?.(t)) ?? '';
    const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
    const rec = new MediaRecorder(stream, { mimeType: mimeType || undefined, videoBitsPerSecond: 12_000_000 });
    const chunks: BlobPart[] = [];
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    rec.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      downloadBlob(new Blob(chunks, { type: mimeType || 'video/webm' }), `cozyquiz-${slug}-hd.${ext}`);
      exitFs();
      setRecording(false);
      setReel(false);
      setControls(true);
    };
    // Sauberes Vollbild-9:16, keine Bedienelemente im Bild.
    setSlideshow(false);
    setReel(true);
    setPaused(false);
    setScene(0);
    setControls(false);
    setRecording(true);
    const totalMs = scenes.reduce((a, s) => a + s.dur, 0);
    const vtrack = stream.getVideoTracks()[0];
    // User beendet die Freigabe selbst → sauber stoppen.
    vtrack.addEventListener('ended', () => { if (rec.state !== 'inactive') rec.stop(); });
    await new Promise((r) => setTimeout(r, 500)); // Reel-Modus + Fonts + Szene 0 mounten lassen
    // Region Capture: exakt auf den 9:16-Frame zuschneiden → keine dunklen
    // Raender, kein manuelles Croppen (Chromium 104+, sonst wird ignoriert).
    try {
      const w = window as unknown as { CropTarget?: { fromElement(el: Element): Promise<unknown> } };
      const t = vtrack as MediaStreamTrack & { cropTo?: (target: unknown) => Promise<void> };
      if (w.CropTarget?.fromElement && t.cropTo && frameRef.current) {
        await t.cropTo(await w.CropTarget.fromElement(frameRef.current));
      }
    } catch { /* Region Capture optional */ }
    rec.start();
    setRecNonce((n) => n + 1); // Szene 0 frisch remounten → Aufnahme ab Frame 1
    setTimeout(() => { if (rec.state !== 'inactive') rec.stop(); }, totalMs + 600);
  };

  // Auto-Export-Modus (?export=zip|frames): einmalig durchsteppen + ausliefern.
  useEffect(() => {
    if (!exportMode) return;
    let cancelled = false;
    (async () => {
      try {
        await new Promise((r) => setTimeout(r, 700)); // kalter iframe-Start: App + erste Avatare laden lassen
        const bytes = await runSlideExport({ frameRef, count: scenes.length, setScene });
        if (cancelled) return;
        await deliverReelExport(exportMode, bytes, slug);
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
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: BODY,
    }}>
      <style>{KEYFRAMES}</style>

      {/* 9:16-Frame (container-query-Einheiten → alles skaliert mit).
          Reel-Modus: exaktes 9:16, groesstmoeglich, randlos + zentriert. */}
      <div ref={frameRef} style={{
        position: 'relative', aspectRatio: '9 / 16', containerType: 'size',
        overflow: 'hidden', background: COZY_BG, cursor: 'pointer',
        ...(big
          ? { width: 'min(100vw, calc(100dvh * 9 / 16))', height: 'auto', maxHeight: '100dvh', borderRadius: 0, boxShadow: 'none' }
          : { height: 'min(94vh, calc(100vw * 16 / 9))', maxWidth: '100vw', borderRadius: 22, boxShadow: '0 24px 70px rgba(0,0,0,0.6)' }),
      }} onClick={() => { if (recording) return; big ? pokeControls() : setPaused(p => !p); }}>
        {/* Nischen-BG-Tint (subtiler Farbstich → unterschiedlicher Startframe) */}
        {cfg.bgTint && <div aria-hidden style={{ position: 'absolute', inset: 0, background: cfg.bgTint, zIndex: 0, pointerEvents: 'none' }} />}
        {/* Waehrend der HD-Aufnahme KEINE Bedienelemente rendern — getDisplayMedia
            filmt alles Sichtbare (data-no-capture wirkt nur beim Bild-Export). */}
        {big && !recording && (
          <button
            data-no-capture
            onClick={(e) => { e.stopPropagation(); exitBig(); }}
            aria-label="Vollbild schließen"
            style={{
              position: 'absolute', top: '2.5cqh', right: '3.5cqw', zIndex: 30,
              width: '9cqw', height: '9cqw', borderRadius: '50%', border: 'none',
              background: 'rgba(0,0,0,0.4)', color: '#fff', fontSize: '5cqw', fontWeight: 900,
              cursor: 'pointer', opacity: controls ? 1 : 0, transition: 'opacity 0.4s ease',
              display: 'grid', placeItems: 'center',
            }}
          >✕</button>
        )}
        {/* Slideshow-Nav (Zähler + Vor/Zurück + HD-Download) — traegt data-no-capture,
            wird also beim Bild-Export entfernt und faded fuer saubere Screenshots aus. */}
        {slideshow && (
          <div data-no-capture style={{ opacity: controls ? 1 : 0, transition: 'opacity 0.4s ease', pointerEvents: controls ? 'auto' : 'none' }}>
            <div style={{ position: 'absolute', top: '2.8cqh', left: '50%', transform: 'translateX(-50%)', zIndex: 30, background: 'rgba(0,0,0,0.45)', color: '#fff', fontWeight: 900, fontSize: '3.4cqw', padding: '0.6cqh 3cqw', borderRadius: 999 }}>
              {cur + 1} / {scenes.length}
            </div>
            <div style={{ position: 'absolute', bottom: '3cqh', left: 0, right: 0, zIndex: 30, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '3cqw' }}>
              <button onClick={(e) => { e.stopPropagation(); prevSlide(); }} style={slideBtn}>‹</button>
              <button onClick={(e) => { e.stopPropagation(); saveSlide(); }} style={{ ...slideBtn, background: saving ? 'rgba(0,0,0,0.5)' : PINK }}>{saving ? '…' : '⬇ HD'}</button>
              <button onClick={(e) => { e.stopPropagation(); nextSlide(); }} style={slideBtn}>›</button>
            </div>
          </div>
        )}
        {/* Kein Stories-Fortschrittsbalken (Wolf): TikTok/Insta legen ihre eigene
            Leiste drüber, und in der Vorschau stört er nur. */}

        {/* Hintergrund-Deko: schwebende Kategorie-/Aktions-Icons (pro Nische variiert) */}
        <FloatingIcons items={cfg.deco} />

        {/* Aktive Szene (key → Remount triggert Entrance-Animationen).
            2026-07-09 (Wolf): TikTok-Safe-Zone — mehr Bottom-Padding hebt den
            zentrierten Inhalt nach oben, weg von der Caption-/Musik-Leiste unten.
            Rechte Aktions-Leiste (Like/Kommentar) wird pro Szene beruecksichtigt
            (schmalere Reihen, nichts Wichtiges an der rechten Kante). */}
        <div key={`${cur}-${recNonce}`} style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', textAlign: 'center',
          padding: '10cqh 7cqw 16cqh', zIndex: 5, color: '#fff',
          animation: 'sceneEnter 0.62s cubic-bezier(0.22, 1, 0.36, 1) both',
        }}>
          {renderScene(scenes[cur].key)}
        </div>

        {paused && !big && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.25)' }}>
            <span style={{ fontSize: '14cqw' }}>▶︎</span>
          </div>
        )}
      </div>

      {/* Screen-only Hinweis (nur ausserhalb der Vollbild-Modi) */}
      {!big && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9, maxWidth: 400 }}>
          <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button onClick={() => setReel(true)} style={{
              appearance: 'none', border: 'none', background: PINK,
              color: '#fff', fontFamily: BODY, fontWeight: 900, fontSize: 15, padding: '11px 22px',
              borderRadius: 999, cursor: 'pointer', boxShadow: '0 8px 24px rgba(236,72,153,0.4)',
            }}>▶ Reel-Modus</button>
            <button onClick={() => { setScene(0); setSlideshow(true); }} style={{
              appearance: 'none', border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.10)', color: '#fff',
              fontFamily: BODY, fontWeight: 900, fontSize: 15, padding: '11px 22px', borderRadius: 999, cursor: 'pointer',
            }}>🖼 Slideshow-Modus</button>
            <button onClick={recordHd} disabled={recording} style={{
              appearance: 'none', border: 'none', background: recording ? 'rgba(236,72,153,0.35)' : '#0EA5E9',
              color: '#fff', fontFamily: BODY, fontWeight: 900, fontSize: 15, padding: '11px 22px',
              borderRadius: 999, cursor: recording ? 'default' : 'pointer', boxShadow: recording ? 'none' : '0 8px 24px rgba(14,165,233,0.4)',
            }}>{recording ? `⏺ Aufnahme läuft … (~${totalSec}s)` : '⬇ Video aufnehmen (HD)'}</button>
            <button onClick={saveZip} disabled={!!zipProg} style={{
              appearance: 'none', border: '1px solid rgba(255,255,255,0.18)', background: zipProg ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.10)', color: '#fff',
              fontFamily: BODY, fontWeight: 900, fontSize: 15, padding: '11px 22px', borderRadius: 999, cursor: zipProg ? 'default' : 'pointer',
            }}>{zipProg ? `⏳ ${zipProg}` : '⬇ Alle Folien (ZIP)'}</button>
          </div>
          <div style={{ color: '#8a86a0', fontSize: 13, fontWeight: 700, textAlign: 'center', lineHeight: 1.5 }}>
            Tippen = Pause · loopt automatisch (~{totalSec}&nbsp;s).<br />
            <b style={{ color: '#7dd3fc' }}>⬇ Video (HD)</b> = Klick → „<b>Teilen</b>" → Reel läuft einmal durch → 9:16-Datei (<b>.webm</b>) lädt automatisch. <b>In CapCut importieren</b> (dort Sound drauf) oder in Chrome/VLC ansehen — der Windows-Standard-Player kann WebM nicht.<br />
            <b style={{ color: '#c9c5da' }}>Reel</b> = am PC abfilmen · <b style={{ color: '#c9c5da' }}>Slideshow</b> = je Folie durchtippen &amp; screenshotten (fürs Karussell).
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

// ── Szenen-Renderer ──────────────────────────────────────────────────────────
function renderScene(key: string) {
  switch (key) {
    // ── Nischen-Hooks (jeder optisch eigenständig — anderer erster Frame) ──
    case 'hook-team':      return <HookTeam />;
    case 'hook-location':  return <HookLocation />;
    case 'hook-bday':      return <HookBday />;
    case 'hook-testteam':  return <HookTestteam />;
    case 'bock-testteam':  return <BockTestteam />;
    case 'frage-testteam': return <FrageTestteam />;
    case 'erobern-testteam': return <ErobernTestteam />;
    case 'facts-testteam': return <FactsTestteam />;
    case 'cta-testteam':   return <CtaTestteam />;
    case 'cta-team':       return <CtaBlock heading={<>Holt's zu<br />euch ins Team.</>} sub="Büro oder Location. Ich bring Beamer, Quiz und beste Stimmung mit." commentPrompt={<>Welches Team wärt ihr? <span style={{ color: PINK_MID }}>👇</span></>} />;
    case 'cta-location':   return <CtaBlock heading={<>Platz für<br />einen Beamer?</>} sub="Ein Stück freie Wand reicht. Beamer, Stimme und gute Laune bring ich mit." commentPrompt={<>Kennst du so eine Bar? <span style={{ color: PINK_MID }}>👇</span><br />Taggt sie.</>} />;
    case 'cta-bday':       return <CtaBlock heading={<>Feiert mal<br />richtig.</>} sub="Sogar mit eigenen Fragen über das Geburtstagskind." commentPrompt={<>Wer hat bald Geburtstag? <span style={{ color: PINK_MID }}>👇</span><br />Taggt die Person.</>} />;

    // ── Echte Frage-Momente (je Nische anderer Kategorie-Typ) ──
    case 'q-team':         return <QMucho />;
    case 'q-location':     return <QOlder />;
    case 'q-bday':         return <QSchaetz />;
    // ── Nischen-Gefühls-Beats ──
    case 'steal':          return <StealBeat />;
    case 'fill':           return <FillBeat />;
    case 'win':            return <WinBeat />;

    // ── FUN zuerst: das eigentliche Erlebnis (Wolf-Feedback) ──
    case 'fun':
      return (
        <>
          <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '9cqw', lineHeight: 1.04, animation: 'fadeUp 0.6s ease both' }}>
            Quizfragen,<br />die Bock machen
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '3cqw', margin: '6.5cqh 0 5cqh' }}>
            {[{ t: 0, e: '😂', d: 0 }, { t: 2, e: '🎉', d: 0.5 }, { t: 4, e: '🔥', d: 1.0 }].map((p, i) => (
              <div key={i} style={{ position: 'relative', animation: `fadeUp 0.5s var(--eb) ${0.3 + i * 0.18}s both` }}>
                <span style={{ position: 'absolute', top: '-5cqh', left: '50%', transform: 'translateX(-50%)', fontSize: '6cqw', animation: `floatPet 3.4s ease-in-out ${p.d}s infinite` }}>{p.e}</span>
                <PetDisc slug={TEAMS[p.t].slug} color={TEAMS[p.t].color} sizeCqw={19} anim="floatPet 4.4s ease-in-out infinite" />
              </div>
            ))}
          </div>
          <div style={{ fontWeight: 800, fontSize: '5.6cqw', opacity: 0.96, lineHeight: 1.2, animation: 'fadeUp 0.6s ease 0.7s both' }}>
            Zusammen mit <span style={{ color: PINK_MID }}>deinen Freunden</span>.
          </div>
        </>
      );

    // ── Bunte Tüte: die Quiz-Kategorie mit wechselnden Ueberraschungs-Minispielen
    // (Wolf: das ist NICHT „Cozygames" — die sind analog. Und Bluff ist deaktiviert). ──
    case 'minigames':
      return (
        <>
          <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '7.6cqw', lineHeight: 1.05, marginBottom: '5cqh', animation: 'fadeUp 0.5s ease both' }}>
            Und die<br />Bunte Tüte 🎁
          </div>
          {/* Wolf: Modi NICHT verraten — es sind Überraschungen. ?-Boxen statt Namen. */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '4.5cqw', margin: '1cqh 0 5cqh' }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ animation: `popIn 0.5s var(--eb) ${0.3 + i * 0.22}s both` }}>
                <div style={{
                  width: '21cqw', height: '21cqw', borderRadius: '4.5cqw',
                  background: 'rgba(255,255,255,0.10)', border: '0.5cqw dashed rgba(255,255,255,0.4)',
                  display: 'grid', placeItems: 'center', fontFamily: DISPLAY, fontWeight: 800,
                  fontSize: '12cqw', color: PINK_MID,
                  animation: `floatPet ${3.6 + i * 0.4}s ease-in-out ${0.9 + i * 0.2}s infinite`,
                }}>?</div>
              </div>
            ))}
          </div>
          <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '6.2cqw', lineHeight: 1.1, animation: 'popIn 0.6s var(--eb) 0.95s both' }}>
            Jede Runde eine<br />neue Überraschung.
          </div>
          <div style={{ fontWeight: 800, fontSize: '4.8cqw', opacity: 0.92, marginTop: '3cqh', animation: 'fadeUp 0.6s ease 1.35s both' }}>
            Du weißt nie, <span style={{ color: PINK_MID }}>was kommt</span>.
          </div>
        </>
      );

    case 'title':
      return (
        <>
          <WolfMascot pose="augenauf.mundauf.winken" sizeCqw={42} anim="popIn 0.7s var(--eb) both" />
          <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '4cqw', letterSpacing: '0.3em', opacity: 0.9, marginTop: '4cqh', animation: 'fadeUp 0.6s ease 0.15s both' }}>
            DAS LIVE-QUIZ FÜR TEAMS
          </div>
          <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '15cqw', lineHeight: 0.95, letterSpacing: '-0.02em', marginTop: '1cqh', animation: 'popIn 0.7s var(--eb) 0.2s both' }}>
            CozyQuiz
          </div>
          <div style={{ fontWeight: 800, fontSize: '5.4cqw', marginTop: '3cqh', opacity: 0.96, animation: 'fadeUp 0.6s ease 0.45s both' }}>
            Pub-Quiz trifft <span style={{ color: '#fff', background: PINK, borderRadius: 8, padding: '0.2em 0.4em' }}>Strategiespiel</span>
          </div>
        </>
      );

    case 'conquer':
      return (
        <>
          <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '8.5cqw', lineHeight: 1.05, animation: 'fadeUp 0.6s ease both' }}>
            Jede richtige Antwort…
          </div>
          {/* Eine Zelle + Avatar ploppt drauf */}
          <div style={{ position: 'relative', width: '34cqw', height: '34cqw', margin: '5cqh 0', animation: 'fadeUp 0.6s ease 0.3s both' }}>
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '4cqw',
              background: `linear-gradient(135deg, ${HERO.color}, ${HERO.color}cc)`,
              boxShadow: `0 0 0 0.8cqw rgba(255,255,255,0.85), 0 1.5cqh 4cqh ${HERO.color}88`,
              animation: 'cellPulse 1.6s ease 0.9s infinite',
            }} />
            <img src={cz(HERO.slug)} alt="" style={{
              position: 'absolute', inset: '8%', width: '84%', height: '84%', objectFit: 'contain',
              filter: 'drop-shadow(0 0.6cqh 0.8cqh rgba(0,0,0,0.4))',
              animation: 'dropIn 0.7s var(--eb) 0.75s both',
            }} />
          </div>
          <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '8.5cqw', lineHeight: 1.05, color: PINK_MID, animation: 'popIn 0.7s var(--eb) 0.95s both' }}>
            …erobert ein Feld.
          </div>
        </>
      );

    case 'board':
      return (
        <>
          <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '7cqw', marginBottom: '3.5cqh', animation: 'fadeUp 0.5s ease both' }}>
            Und obendrauf:<br />ein bisschen Taktik
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1.4cqw',
            padding: '2.4cqw', background: 'rgba(255,255,255,0.06)', borderRadius: '4cqw',
            width: '74cqw',
          }}>
            {MINI_GRID.flat().map((region, i) => {
              const team = TEAMS[region];
              return (
                <div key={i} style={{
                  aspectRatio: '1', borderRadius: '2cqw', position: 'relative',
                  background: `linear-gradient(135deg, ${team.color}, ${team.color}cc)`,
                  boxShadow: 'inset 0 0 0 0.3cqw rgba(255,255,255,0.28)',
                  animation: `cellIn 0.4s var(--eb) ${0.2 + i * 0.045}s both`,
                }}>
                  <img src={cz(team.slug)} alt="" style={{
                    position: 'absolute', inset: '8%', width: '84%', height: '84%', objectFit: 'contain',
                    filter: 'drop-shadow(0 0.3cqh 0.4cqh rgba(0,0,0,0.42))',
                  }} />
                </div>
              );
            })}
          </div>
          <div style={{ fontWeight: 800, fontSize: '5.6cqw', marginTop: '4cqh', animation: 'fadeUp 0.6s ease 1.4s both' }}>
            Größtes zusammenhängendes<br />Gebiet <span style={{ color: PINK_MID }}>gewinnt.</span>
          </div>
        </>
      );

    case 'cats':
      return (
        <>
          <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '7cqw', marginBottom: '4cqh', animation: 'fadeUp 0.5s ease both' }}>
            5 Kategorien,<br />nie langweilig
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2cqh', width: '82cqw' }}>
            {CATEGORIES.map((c, i) => (
              <div key={c.name} style={{
                display: 'flex', alignItems: 'center', gap: '3.5cqw',
                background: 'rgba(255,255,255,0.10)', borderRadius: '3cqw', padding: '2.2cqh 4cqw',
                animation: `slideIn 0.5s var(--eb) ${0.25 + i * 0.28}s both`,
              }}>
                <img src={icon(c.icon)} alt="" style={{ width: '11cqw', height: '11cqw', objectFit: 'contain', flexShrink: 0, filter: 'drop-shadow(0 0.4cqh 0.6cqh rgba(0,0,0,0.35))' }} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '5.6cqw', lineHeight: 1 }}>{c.name}</div>
                  <div style={{ fontSize: '4cqw', opacity: 0.82 }}>{c.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      );

    case 'twists':
      return (
        <>
          <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '7cqw', marginBottom: '5cqh', animation: 'fadeUp 0.5s ease both' }}>
            Und dann wird's<br />taktisch
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3.5cqh', width: '82cqw' }}>
            {TWISTS.map((t, i) => (
              <div key={t.text} style={{
                display: 'flex', alignItems: 'center', gap: '4cqw',
                animation: `slideIn 0.5s var(--eb) ${0.3 + i * 0.55}s both`,
              }}>
                <img src={t.img} alt="" style={{ width: '13cqw', height: '13cqw', objectFit: 'contain', flexShrink: 0, filter: 'drop-shadow(0 0.5cqh 0.7cqh rgba(0,0,0,0.4))' }} />
                <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '6.6cqw', textAlign: 'left', lineHeight: 1.05 }}>{t.text}</span>
              </div>
            ))}
          </div>
        </>
      );

    case 'bets':
      return (
        <>
          <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '4cqw', letterSpacing: '0.28em', opacity: 0.85, animation: 'fadeUp 0.5s ease both' }}>
            DAS GROSSE FINALE
          </div>
          <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '13cqw', lineHeight: 1, marginTop: '0.5cqh', animation: 'popIn 0.7s var(--eb) 0.15s both' }}>
            Final-Bets
          </div>
          {/* Tipp: Team A → Team B */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4cqw', margin: '5cqh 0', animation: 'fadeUp 0.6s ease 0.35s both' }}>
            <PetDisc slug={TEAMS[2].slug} color={TEAMS[2].color} sizeCqw={20} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5cqh' }}>
              <span style={{ fontSize: '3.4cqw', fontWeight: 900, letterSpacing: '0.15em', opacity: 0.85 }}>TIPPT AUF</span>
              <img src={icon('fx-target')} alt="" style={{ width: '11cqw', height: '11cqw', objectFit: 'contain', animation: 'cellPulse 1.4s ease 0.6s infinite', filter: 'drop-shadow(0 0.4cqh 0.6cqh rgba(0,0,0,0.35))' }} />
            </div>
            <PetDisc slug={TEAMS[4].slug} color={TEAMS[4].color} sizeCqw={20} />
          </div>
          <div style={{ fontWeight: 800, fontSize: '5.2cqw', opacity: 0.96, animation: 'fadeUp 0.6s ease 0.6s both' }}>
            Liegt euer Tipp vorn → <span style={{ color: PINK_MID }}>Bonus-Punkte.</span>
          </div>
        </>
      );

    case 'cta':
      return <CtaBlock heading={<>Bock auf ein<br />CozyQuiz?</>} sub="Für Bar · Café · Firmenfeier · Event" tightSub commentPrompt={<>Wärt ihr dabei? <span style={{ color: PINK_MID }}>👇</span></>} />;

    default:
      return null;
  }
}

// ── Nischen-Hooks (bewusst unterschiedliche Kompositionen & erste Frames) ─────

// TEAM: Hook mit dem CozyWolf als Payoff (Wolf-Feedback: kein Tier-vs-Tier).
function HookTeam() {
  return (
    <>
      <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '3.8cqw', letterSpacing: '0.22em', opacity: 0.85, animation: 'fadeUp 0.4s ease both' }}>
        FÜRS NÄCHSTE TEAM-EVENT
      </div>
      <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '9.5cqw', lineHeight: 1.02, marginTop: '1.5cqh', animation: 'popIn 0.6s var(--eb) both' }}>
        Bevor ihr <span style={{ color: PINK_MID }}>wieder</span><br />bowlen geht…
      </div>
      <div style={{ margin: '4cqh 0 3cqh' }}>
        <WolfMascot pose="augenauf.mundauf.winken" sizeCqw={38} anim="popIn 0.7s var(--eb) 0.5s both" />
      </div>
      <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '7.6cqw', lineHeight: 1.05, animation: 'fadeUp 0.6s ease 0.9s both' }}>
        …macht ein <span style={{ color: '#fff', background: PINK, borderRadius: 8, padding: '0.08em 0.3em' }}>CozyQuiz</span>.
      </div>
      <div style={{ fontWeight: 800, fontSize: '4.4cqw', opacity: 0.82, marginTop: '2.5cqh', animation: 'fadeUp 0.6s ease 1.2s both' }}>
        Team gegen Team, live moderiert.
      </div>
    </>
  );
}

// LOCATION: der CozyWolf (Gastgeber) schlägt per Sprechblase direkt einen
// Quizabend vor (Wolf-Idee) — warm, on-brand, glasklare Botschaft. Kein
// App-Screen im Hook; das Quiz zeigt die nächste Szene.
function HookLocation() {
  return (
    <>
      <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '3.8cqw', letterSpacing: '0.24em', opacity: 0.85, animation: 'fadeUp 0.4s ease both' }}>
        CAFÉ · PUB · BAR
      </div>
      <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '9cqw', lineHeight: 1.0, marginTop: '1.5cqh', animation: 'popIn 0.6s var(--eb) both' }}>
        Dienstag.<br />19 Uhr.<br /><span style={{ color: PINK_MID }}>Leer?</span>
      </div>
      {/* CozyWolf schlägt den Quizabend vor (Sprechblase zeigt auf den Wolf) */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '5.5cqh 0 1cqh' }}>
        <div style={{
          position: 'relative', background: '#fff', color: '#1E2A5A', borderRadius: '4cqw',
          padding: '2.6cqh 5.5cqw', maxWidth: '82cqw', boxShadow: '0 1.4cqh 3.2cqh rgba(0,0,0,0.4)',
          animation: 'popIn 0.5s var(--eb) 0.7s both',
        }}>
          <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '6.4cqw', lineHeight: 1.08 }}>
            Wie wär's mit einem<br /><span style={{ color: PINK }}>Quizabend?</span>
          </div>
          {/* Blasen-Spitze zeigt nach unten auf den Wolf */}
          <div style={{ position: 'absolute', bottom: '-2.6cqh', left: '38%', width: 0, height: 0, borderLeft: '2.6cqw solid transparent', borderRight: '2.6cqw solid transparent', borderTop: '2.8cqh solid #fff' }} />
        </div>
        <div style={{ marginTop: '2.8cqh' }}>
          <WolfMascot pose="augenauf.mundauf.winken" sizeCqw={34} anim="popIn 0.6s var(--eb) 0.95s both" />
        </div>
      </div>
      <div style={{ fontWeight: 800, fontSize: '4.6cqw', opacity: 0.85, marginTop: '1.5cqh', animation: 'fadeUp 0.6s ease 1.3s both' }}>
        Ich bring alles mit. Ihr kriegt den vollen Laden.
      </div>
    </>
  );
}

// GEBURTSTAG: Party — Konfetti + Torte, jubelndes Maskottchen zwischen Gästen.
function HookBday() {
  return (
    <>
      <Confetti />
      <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '10.5cqw', lineHeight: 1, animation: 'popIn 0.6s var(--eb) both' }}>
        <span style={{ fontSize: '11cqw' }}>🎂</span><br />Runder<br />Geburtstag?
      </div>
      <div style={{ margin: '5cqh 0 4cqh', animation: 'fadeUp 0.6s ease 0.4s both' }}>
        <WolfMascot pose="augenauf.troete.jubel" sizeCqw={36} anim="popIn 0.6s var(--eb) 0.5s both" />
      </div>
      <div style={{ fontWeight: 800, fontSize: '6cqw', lineHeight: 1.1, opacity: 0.98, animation: 'fadeUp 0.6s ease 1.1s both' }}>
        Keine Lust auf<br />Stehparty mit Chips?
      </div>
    </>
  );
}

// TEST-TEAM: persoenliche Gruender-Bitte (Wolf 2026-07-09). Bewusst KEIN
// Hochglanz-Hook wie die Nischen — nahbar, Ich-Form, echtes Gesicht (Johannes,
// rundes Portrait wie auf der Website) statt Maskottchen. Authentizitaet
// schlaegt Politur bei einer „helft mir testen"-Ansprache.
function HookTestteam() {
  return (
    <>
      <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '3.8cqw', letterSpacing: '0.2em', opacity: 0.85, animation: 'fadeUp 0.4s ease both' }}>
        📍 HAMBURG · TEST-TEAM GESUCHT
      </div>
      <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '7.4cqw', lineHeight: 1.05, marginTop: '1.2cqh', animation: 'popIn 0.6s var(--eb) both' }}>
        Ich hab ein Quiz gebaut:<br />halb Pub-Quiz,<br />halb <span style={{ color: PINK_MID }}>Strategiespiel</span>.
      </div>
      {/* Echtes Gesicht: Johannes' rundes Portrait (dasselbe wie auf cozywolf.de). */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.2cqh', margin: '3cqh 0 2.4cqh' }}>
        <img src="/images/Johannes.jpeg" alt="Johannes" style={{
          // Lockeres Foto (Cap/Daumen hoch). objectPosition auf den Kopf: das
          // Motiv ist hochkant, Gesicht im oberen Drittel → Kopf sitzt mittig
          // im Kreis, Daumen-Hand wird unten weggeschnitten.
          width: '32cqw', height: '32cqw', borderRadius: '50%', objectFit: 'cover', objectPosition: 'center 14%',
          border: '0.8cqw solid rgba(236,72,153,0.85)',
          boxShadow: '0 1.4cqh 3.4cqh rgba(0,0,0,0.45), 0 0 4cqw rgba(236,72,153,0.4)',
          animation: 'popIn 0.7s var(--eb) 0.5s both',
        }} />
        <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '4.2cqw', opacity: 0.92, animation: 'fadeUp 0.6s ease 0.75s both' }}>
          <span style={{ color: PINK_MID }}>Johannes</span>
        </div>
      </div>
      <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '7.4cqw', lineHeight: 1.05, animation: 'fadeUp 0.6s ease 0.9s both' }}>
        Jetzt brauch ich<br /><span style={{ color: '#fff', background: PINK, borderRadius: 8, padding: '0.08em 0.3em' }}>euch</span>.
      </div>
    </>
  );
}

// TEST-TEAM-BOCK: der Scroll-Stopper (Wolf 2026-07-09, „Bold-Text-Hook") — als
// erstes Frame muss „kostenlos" sofort knallen. Text-getrieben: die Frage, das
// riesige pinke Highlight-Wort KOSTENLOSEN (leicht gekippt + Glow), Konfetti.
// Kein Avatar-Clutter (bewusste Wahl gegen die 3 Pet-Discs).
function BockTestteam() {
  return (
    <>
      <Confetti />
      {/* Floating Kategorie-Emojis — nur im OBEREN + UNTEREN Band (nicht auf
          Texthoehe, der Text fuellt die Mitte breit aus) und raus aus TikToks
          rechter Aktions-Leiste (x>82) + unterer Caption (y>76). Wolf 2026-07-09. */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: -1, pointerEvents: 'none' }}>
        {[
          { n: 'cat-schaetzchen',   x: 13, y: 12, s: 14, d: 0 },
          { n: 'cat-cheese',        x: 33, y: 21, s: 11, d: 1.4 },
          { n: 'cat-mucho',         x: 78, y: 12, s: 13, d: 0.8 },
          { n: 'cat-bunte-tuete',   x: 16, y: 75, s: 13, d: 0.4 },
          { n: 'cat-zehn-von-zehn', x: 70, y: 74, s: 12, d: 1.9 },
        ].map((p, i) => (
          // Aussen: positionieren + zentrieren + einblenden (Opacity).
          // Innen: floaten (Transform) — getrennt, damit das Zentrieren nicht
          // von der Float-Animation ueberschrieben wird.
          <div key={i} style={{
            position: 'absolute', left: `${p.x}%`, top: `${p.y}%`, transform: 'translate(-50%, -50%)',
            animation: `sceneIn 0.6s ease ${0.2 + i * 0.1}s both`,
          }}>
            <img src={icon(p.n)} alt="" style={{
              display: 'block', width: `${p.s}cqw`, height: `${p.s}cqw`, objectFit: 'contain',
              animation: `floatPet ${3.6 + i * 0.4}s ease-in-out ${p.d}s infinite`,
              filter: 'drop-shadow(0 0.6cqh 1cqh rgba(0,0,0,0.35))',
            }} />
          </div>
        ))}
      </div>
      <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '11.5cqw', lineHeight: 1.03, letterSpacing: '-0.01em', animation: 'fadeUp 0.5s ease both' }}>
        Bock auf einen<br /><span style={{ color: PINK_MID }}>kostenlosen</span><br />Quizabend
      </div>
      <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '6.8cqw', lineHeight: 1.05, marginTop: '2.4cqh', animation: 'fadeUp 0.6s ease 0.5s both' }}>
        mit deinen <span style={{ color: PINK_MID }}>Freunden?</span>
      </div>
    </>
  );
}

// TEST-TEAM-FRAGE: Schritt 1 des Loops — „es ist ein Quiz". Echte Frage, 4
// Antworten. 2026-07-09 (SM-Profi): Antwort BEWUSST NICHT aufloesen → der
// Viewer soll seinen Tipp kommentieren (Kommentar-Motor > Tag-Bait fuer kalte
// Reichweite). Kontraintuitiv (Dublin) = Neugier + Bauchgefuehl-Bait.
function FrageTestteam() {
  const opts = ['Paris', 'London', 'Berlin', 'Dublin'];
  return (
    <>
      <QBadge iconName="cat-mucho" label="Rate mit!" />
      <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '6.6cqw', lineHeight: 1.08, margin: '3cqh 0 3.5cqh', animation: 'fadeUp 0.5s ease 0.15s both' }}>
        Welche Stadt liegt<br />am nördlichsten?
      </div>
      {/* Reihen schmaler (74cqw) → nichts unter TikToks Like/Kommentar-Leiste.
          Keine Aufloesung — der Tipp gehoert in die Kommentare. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.8cqh', width: '74cqw' }}>
        {opts.map((o, i) => (
          <div key={o} style={{
            display: 'flex', alignItems: 'center', gap: '3cqw',
            background: 'rgba(255,255,255,0.10)', borderRadius: '2.6cqw', padding: '1.9cqh 4cqw',
            fontWeight: 800, fontSize: '5.2cqw', textAlign: 'left',
            animation: `slideIn 0.4s var(--eb) ${0.3 + i * 0.16}s both`,
          }}>
            <span style={{ fontFamily: DISPLAY, opacity: 0.7, width: '5cqw', flexShrink: 0 }}>{'ABCD'[i]}</span>
            <span>{o}</span>
          </div>
        ))}
      </div>
      <div style={{ fontWeight: 800, fontSize: '5cqw', marginTop: '3.4cqh', lineHeight: 1.2, animation: 'fadeUp 0.6s ease 1.5s both' }}>
        Die meisten tippen falsch.
      </div>
      <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '6.4cqw', marginTop: '1.6cqh', animation: 'fadeUp 0.6s ease 1.8s both' }}>
        Dein Tipp? <span style={{ color: PINK_MID }}>👇</span>
      </div>
    </>
  );
}

// TEST-TEAM-EROBERN: Schritt 2 des Loops (Wolf 2026-07-09) — die Frage laeuft
// als eigene Szene davor, HIER nur die einzigartige Pointe: richtige Antwort →
// ein Feld wird erobert → groesstes Gebiet gewinnt. Ein Gedanke pro Slide, damit
// es auch versteht, wer die App nicht kennt. Das Mittelfeld popt spaet in
// Team-Farbe rein (der sichtbare Eroberungs-Moment).
function ErobernTestteam() {
  const conquerIdx = 12; // Mitte des 5x5-Bretts
  return (
    <>
      <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '6.6cqw', lineHeight: 1.1, marginBottom: '4.5cqh', animation: 'fadeUp 0.5s ease both' }}>
        Richtig geantwortet?<br /><span style={{ color: PINK_MID }}>Ein Feld gehört euch.</span>
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1.4cqw',
        padding: '2.4cqw', background: 'rgba(255,255,255,0.06)', borderRadius: '4cqw',
        width: '66cqw',
      }}>
        {MINI_GRID.flat().map((region, i) => {
          const team = TEAMS[region];
          const isNew = i === conquerIdx;
          return (
            <div key={i} style={{
              aspectRatio: '1', borderRadius: '2cqw', position: 'relative', overflow: 'hidden',
              background: isNew ? 'rgba(255,255,255,0.08)' : `linear-gradient(135deg, ${team.color}, ${team.color}cc)`,
              boxShadow: isNew ? 'inset 0 0 0 0.4cqw rgba(236,72,153,0.55)' : 'inset 0 0 0 0.3cqw rgba(255,255,255,0.28)',
              animation: isNew ? undefined : `cellIn 0.4s var(--eb) ${0.2 + i * 0.03}s both`,
            }}>
              {!isNew && (
                <img src={cz(team.slug)} alt="" style={{ position: 'absolute', inset: '8%', width: '84%', height: '84%', objectFit: 'contain', filter: 'drop-shadow(0 0.3cqh 0.4cqh rgba(0,0,0,0.42))' }} />
              )}
              {isNew && (
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: '2cqw',
                  background: `linear-gradient(135deg, ${team.color}, ${team.color}cc)`,
                  boxShadow: 'inset 0 0 0 0.4cqw rgba(255,255,255,0.5)',
                  opacity: 0, animation: 'popIn 0.6s var(--eb) 1.5s both',
                }}>
                  <img src={cz(team.slug)} alt="" style={{ position: 'absolute', inset: '8%', width: '84%', height: '84%', objectFit: 'contain' }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ fontWeight: 800, fontSize: '5.6cqw', marginTop: '4.5cqh', animation: 'fadeUp 0.6s ease 2.0s both' }}>
        Größtes Gebiet <span style={{ color: PINK_MID }}>gewinnt.</span>
      </div>
    </>
  );
}

// TEST-TEAM-FAKTEN: was ihr mitbringt (ersetzt die „Bunte Tuete"-Szene, Wolf
// 2026-07-09). Klare Voraussetzungen filtern die Anfragen vor.
function FactsTestteam() {
  // Wolfs Soft-3D-Icons aus der Landing (public/assets/icon-*.webp).
  const facts = [
    { icon: 'aufbau',   text: 'Platz für einen Beamer' },
    { icon: 'dauer',    text: '90–120 Minuten Zeit' },
    { icon: 'team',     text: 'Mindestens 9 Leute' },
    { icon: 'standort', text: 'Im Raum Hamburg' },
  ];
  return (
    <>
      <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '3.8cqw', letterSpacing: '0.2em', opacity: 0.85, animation: 'fadeUp 0.4s ease both' }}>
        DAS BRAUCHT IHR
      </div>
      <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '7.8cqw', lineHeight: 1.04, marginTop: '1.2cqh', animation: 'popIn 0.6s var(--eb) both' }}>
        Passt das bei <span style={{ color: PINK_MID }}>euch?</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2cqh', margin: '4cqh 0 2.6cqh', width: '76cqw' }}>
        {facts.map((f, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: '4cqw',
            background: 'rgba(255,255,255,0.06)', border: '0.3cqh solid rgba(255,255,255,0.14)',
            borderRadius: '3.5cqw', padding: '1.9cqh 4.5cqw',
            animation: `fadeUp 0.5s var(--eb) ${0.25 + i * 0.16}s both`,
          }}>
            <img src={`/assets/icon-${f.icon}.webp`} alt="" style={{ width: '12.5cqw', height: '12.5cqw', objectFit: 'contain', flexShrink: 0 }} />
            <span style={{ fontWeight: 800, fontSize: '5.2cqw', textAlign: 'left', lineHeight: 1.15 }}>{f.text}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2cqh', marginTop: '0.5cqh' }}>
        <div style={{ fontWeight: 800, fontSize: '4.2cqw', opacity: 0.9, lineHeight: 1.2, animation: 'fadeUp 0.6s ease 1.1s both' }}>
          Im Büro, Vereinsraum oder bei euch. <span style={{ color: PINK_MID }}>Ihr wählt.</span>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '2cqw', fontWeight: 800, fontSize: '4cqw', opacity: 0.82, animation: 'fadeUp 0.6s ease 1.25s both' }}>
          <img src="/assets/icon-handy.webp" alt="" style={{ width: '7cqw', height: '7cqw', objectFit: 'contain' }} />
          Jede:r ein Handy · WLAN reicht
        </div>
      </div>
    </>
  );
}

// TEST-TEAM-CTA: 2026-07-09 (SM-Profi) — Scam-Barriere senken (warum gratis =
// Beta, kein Haken) + EINE klare Aktion (Freunde markieren) statt zweier
// konkurrierender Asks. Link nur noch als kleine Info-Zeile, nicht als zweiter
// fetter CTA.
function CtaTestteam() {
  return (
    <>
      <WolfMascot pose="augenauf.troete.jubel" sizeCqw={22} anim="popIn 0.7s var(--eb) both" />
      <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '9cqw', lineHeight: 1.02, marginTop: '2.2cqh', animation: 'popIn 0.7s var(--eb) 0.2s both' }}>
        Euer Abend<br />geht <span style={{ color: PINK_MID }}>aufs Haus.</span>
      </div>
      {/* Trust: erklaert WARUM gratis → killt den Scam-/MLM-Verdacht */}
      <div style={{ fontWeight: 800, fontSize: '4.4cqw', marginTop: '2cqh', opacity: 0.9, maxWidth: '82cqw', lineHeight: 1.32, animation: 'fadeUp 0.6s ease 0.4s both' }}>
        Ihr testet mein Quiz, bevor die ersten Events es buchen. <span style={{ color: PINK_MID }}>Kein Haken.</span>
      </div>
      {/* EINE Aktion: Freunde markieren (treibt Reichweite via Tag-Shares) */}
      <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '5.8cqw', marginTop: '3.2cqh', lineHeight: 1.15, animation: 'fadeUp 0.6s ease 0.6s both' }}>
        Markiert die Freunde, mit<br />denen ihr spielen wollt <span>👇</span>
      </div>
      <div style={{ fontWeight: 800, fontSize: '4cqw', opacity: 0.78, marginTop: '2.6cqh', animation: 'fadeUp 0.6s ease 0.8s both' }}>
        Alles zum Testen: cozywolf.de/testen
      </div>
    </>
  );
}

// ── Bausteine ────────────────────────────────────────────────────────────────

// Gemeinsamer CTA-Block (pro Nische anderer heading/sub) — CozyWolf jubelt,
// Kontakt bleibt konstant (cozywolf.de + @cozywolf.events).
function CtaBlock({ heading, sub, tightSub, commentPrompt }: { heading: React.ReactNode; sub: string; tightSub?: boolean; commentPrompt?: React.ReactNode }) {
  return (
    <>
      <WolfMascot pose="augenauf.troete.jubel" sizeCqw={34} anim="popIn 0.7s var(--eb) both" />
      <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '10cqw', lineHeight: 1.02, marginTop: '3cqh', animation: 'popIn 0.7s var(--eb) 0.2s both' }}>
        {heading}
      </div>
      <div style={{ fontWeight: 800, fontSize: tightSub ? '4.6cqw' : '4.8cqw', marginTop: '2.6cqh', opacity: 0.9, maxWidth: '80cqw', lineHeight: 1.3, animation: 'fadeUp 0.6s ease 0.45s both' }}>
        {sub}
      </div>
      {/* Kommentar-Trigger (SMM-Audit: Reels fragen den Zuschauer fast nie was). */}
      {commentPrompt && (
        <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '5.2cqw', marginTop: '3cqh', lineHeight: 1.15, animation: 'fadeUp 0.6s ease 0.6s both' }}>
          {commentPrompt}
        </div>
      )}
      <div style={{ marginTop: '3.5cqh', display: 'flex', flexDirection: 'column', gap: '1.6cqh', fontWeight: 800, fontSize: '4.6cqw', animation: 'fadeUp 0.6s ease 0.75s both' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2.4cqw', justifyContent: 'center', color: PINK_MID }}>
          <img src={cw('head')} alt="" style={{ width: '6cqw', height: '6cqw', objectFit: 'contain' }} />@cozywolf.events
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2.4cqw', justifyContent: 'center', opacity: 0.7, fontSize: '3.8cqw' }}>
          <img src={icon('fx-globe')} alt="" style={{ width: '5cqw', height: '5cqw', objectFit: 'contain' }} />cozywolf.de
        </span>
      </div>
    </>
  );
}

// Kategorie-Badge über den echten Frage-Szenen (macht klar: das ist eine echte Runde).
function QBadge({ iconName, label }: { iconName: string; label: string }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '2cqw',
      background: 'rgba(255,255,255,0.12)', borderRadius: '99px', padding: '1cqh 3.6cqw',
      fontFamily: DISPLAY, fontWeight: 800, fontSize: '3.6cqw', letterSpacing: '0.03em',
      animation: 'fadeUp 0.5s ease both',
    }}>
      <img src={icon(iconName)} alt="" style={{ width: '6cqw', height: '6cqw', objectFit: 'contain' }} />
      {label}
    </div>
  );
}

// TEAM-Frage: echte Mu-Cho — 4 Optionen, die richtige leuchtet spät grün auf.
function QMucho() {
  // Kontraintuitiv (guter Kommentar-Bait): die meisten tippen Berlin/London,
  // richtig ist Dublin (53,3°N > Berlin 52,5° > London 51,5° > Paris 48,9°).
  const opts = ['Paris', 'London', 'Berlin', 'Dublin'];
  const correct = 3;
  return (
    <>
      <QBadge iconName="cat-mucho" label="Mu-Cho · Tempo zählt" />
      <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '6.6cqw', lineHeight: 1.08, margin: '3cqh 0 3.5cqh', animation: 'fadeUp 0.5s ease 0.15s both' }}>
        Welche Stadt liegt<br />am nördlichsten?
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.8cqh', width: '80cqw' }}>
        {opts.map((o, i) => (
          <div key={o} style={{
            display: 'flex', alignItems: 'center', gap: '3cqw',
            background: 'rgba(255,255,255,0.10)', borderRadius: '2.6cqw', padding: '1.9cqh 4cqw',
            fontWeight: 800, fontSize: '5.2cqw', textAlign: 'left',
            animation: i === correct
              ? `slideIn 0.4s var(--eb) ${0.3 + i * 0.16}s both, revealCorrect 0.5s ease 2.0s both`
              : `slideIn 0.4s var(--eb) ${0.3 + i * 0.16}s both`,
          }}>
            <span style={{ fontFamily: DISPLAY, opacity: 0.7, width: '5cqw', flexShrink: 0 }}>{'ABCD'[i]}</span>
            <span>{o}</span>
            {i === correct && <span style={{ marginLeft: 'auto', fontSize: '5cqw', opacity: 0, animation: 'popIn 0.4s var(--eb) 2.15s both' }}>✓</span>}
          </div>
        ))}
      </div>
      <div style={{ fontWeight: 800, fontSize: '4.9cqw', marginTop: '4cqh', lineHeight: 1.25, animation: 'fadeUp 0.6s ease 2.5s both' }}>
        Jede richtige Antwort: <span style={{ color: PINK_MID }}>ein Feld</span>.<br />Die Schnellsten wählen zuerst.
      </div>
    </>
  );
}

// LOCATION-Frage: kontraintuitive Mu-Cho (Wolf-Wahl). Fast alle tippen falsch →
// verblüffende Auflösung = Kommentar-Bait. Richtige Option (B) leuchtet spät grün.
function QOlder() {
  const opts = [{ k: 'A', l: 'Die Pyramiden' }, { k: 'B', l: 'Die Mammuts' }];
  const correct = 1;
  return (
    <>
      <QBadge iconName="cat-mucho" label="Mu-Cho · was stimmt?" />
      <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '8cqw', lineHeight: 1.06, margin: '3cqh 0 4.5cqh', animation: 'fadeUp 0.5s ease 0.15s both' }}>
        Was ist älter?
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2.6cqh', width: '80cqw' }}>
        {opts.map((o, i) => (
          <div key={o.k} style={{
            display: 'flex', alignItems: 'center', gap: '3cqw',
            background: 'rgba(255,255,255,0.10)', borderRadius: '2.6cqw', padding: '2.5cqh 4cqw',
            fontWeight: 800, fontSize: '5.8cqw', textAlign: 'left',
            animation: i === correct
              ? `slideIn 0.4s var(--eb) ${0.3 + i * 0.2}s both, revealCorrect 0.5s ease 1.9s both`
              : `slideIn 0.4s var(--eb) ${0.3 + i * 0.2}s both`,
          }}>
            <span style={{ fontFamily: DISPLAY, opacity: 0.7, width: '5cqw', flexShrink: 0 }}>{o.k}</span>
            <span>{o.l}</span>
            {i === correct && <span style={{ marginLeft: 'auto', fontSize: '5cqw', opacity: 0, animation: 'popIn 0.4s var(--eb) 2.05s both' }}>✓</span>}
          </div>
        ))}
      </div>
      <div style={{ fontWeight: 800, fontSize: '4.6cqw', marginTop: '4.5cqh', lineHeight: 1.25, animation: 'fadeUp 0.6s ease 2.4s both' }}>
        Mammuts lebten noch, als die<br />Pyramiden schon <span style={{ color: PINK_MID }}>standen</span>.
      </div>
    </>
  );
}

// BDAY-Frage: Schätzchen übers Geburtstagskind (Wolf-Wahl: Reisen) — zwei
// Team-Tipps, Auflösung spät. „Lena" = Platzhalter fürs Geburtstagskind.
function QSchaetz() {
  const guesses = [
    { v: '9', name: 'Team Tanten', slug: TEAMS[0].slug, color: TEAMS[0].color, d: 0.6 },
    { v: '17', name: 'Team Freunde', slug: TEAMS[2].slug, color: TEAMS[2].color, d: 0.95 },
  ];
  return (
    <>
      <QBadge iconName="cat-schaetzchen" label="Schätzchen · eigene Frage" />
      <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '6.4cqw', lineHeight: 1.08, margin: '3cqh 0 2cqh', animation: 'fadeUp 0.5s ease 0.15s both' }}>
        In wie vielen Ländern<br />war Lena schon?
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '6cqw', margin: '1cqh 0 3cqh' }}>
        {guesses.map((g, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.7cqh', animation: `fadeUp 0.5s var(--eb) ${g.d}s both` }}>
            <PetDisc slug={g.slug} color={g.color} sizeCqw={15} />
            <span style={{ fontWeight: 800, fontSize: '3.2cqw', opacity: 0.85, whiteSpace: 'nowrap' }}>{g.name}</span>
            <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '6cqw', opacity: 0.9 }}>{g.v}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '2.4cqw', animation: 'popIn 0.6s var(--eb) 2.2s both' }}>
        <span style={{ fontWeight: 800, fontSize: '4.4cqw', opacity: 0.8 }}>Richtig:</span>
        <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '13cqw', color: PINK_MID, lineHeight: 1 }}>14</span>
      </div>
      <div style={{ fontWeight: 800, fontSize: '4.8cqw', marginTop: '3cqh', animation: 'fadeUp 0.6s ease 2.7s both' }}>
        Am nächsten dran <span style={{ color: PINK_MID }}>gewinnt</span>.
      </div>
    </>
  );
}

// TEAM-Beat: ein Feld kippt von der Gegner-Farbe in die eigene.
function StealBeat() {
  return (
    <>
      <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '8cqw', lineHeight: 1.05, marginBottom: '5cqh', animation: 'fadeUp 0.5s ease both' }}>
        Und dann…<br /><span style={{ color: PINK_MID }}>Felder klauen.</span>
      </div>
      <div style={{ position: 'relative', width: '34cqw', height: '34cqw', margin: '2cqh 0 6cqh' }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '4cqw', background: `linear-gradient(135deg, ${TEAMS[2].color}, ${TEAMS[2].color}cc)`, animation: 'stealOut 0.5s ease 1.7s both' }} />
        <img src={cz(TEAMS[2].slug)} alt="" style={{ position: 'absolute', inset: '10%', width: '80%', height: '80%', objectFit: 'contain', animation: 'stealOut 0.5s ease 1.7s both' }} />
        <div style={{ position: 'absolute', inset: 0, borderRadius: '4cqw', background: `linear-gradient(135deg, ${TEAMS[0].color}, ${TEAMS[0].color}cc)`, boxShadow: `0 0 0 0.7cqw rgba(255,255,255,0.85), 0 1.5cqh 4cqh ${TEAMS[0].color}88`, opacity: 0, animation: 'stealIn 0.55s var(--eb) 1.85s both' }} />
        <img src={cz(TEAMS[0].slug)} alt="" style={{ position: 'absolute', inset: '10%', width: '80%', height: '80%', objectFit: 'contain', opacity: 0, animation: 'stealIn 0.55s var(--eb) 1.95s both' }} />
        <img src={icon('action-steal')} alt="" style={{ position: 'absolute', top: '-9cqh', right: '-7cqw', width: '17cqw', height: '17cqw', objectFit: 'contain', filter: 'drop-shadow(0 0.5cqh 0.8cqh rgba(0,0,0,0.4))', animation: 'popIn 0.5s var(--eb) 1.2s both' }} />
      </div>
      <div style={{ fontWeight: 800, fontSize: '5.4cqw', animation: 'fadeUp 0.6s ease 2.5s both' }}>
        Ihr Feld. Jetzt <span style={{ color: PINK_MID }}>euer</span> Feld.
      </div>
    </>
  );
}

// LOCATION-Beat: „volle Bude". Wolf: Personen-Emojis gehen nicht — das Fluent-Set
// rendert alle gleich gelb, ohne Hauttöne, also NIE divers. Statt Menschen die
// KNEIPEN-ATMOSPHÄRE zeigen (Gläser, Anstoßen, Gelächter, Musik) = „hier ist was los".
function FillBeat() {
  const buzz = [
    { e: '🍻', s: 12 }, { e: '🎉', s: 10 }, { e: '💬', s: 9 }, { e: '🥂', s: 12 },
    { e: '🎶', s: 9 }, { e: '🍷', s: 10 }, { e: '😂', s: 10 }, { e: '🗣️', s: 9 },
    { e: '🍺', s: 12 }, { e: '✨', s: 8 }, { e: '💬', s: 8 }, { e: '🎊', s: 10 },
  ];
  return (
    <>
      <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '7.6cqw', lineHeight: 1.05, marginBottom: '5.5cqh', animation: 'fadeUp 0.5s ease both' }}>
        Und plötzlich ist<br />die Bude <span style={{ color: PINK_MID }}>voll.</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: '2.4cqw', width: '80cqw' }}>
        {buzz.map((b, i) => (
          <span key={i} style={{ fontSize: `${b.s}cqw`, lineHeight: 1, animation: `popIn 0.42s var(--eb) ${0.25 + i * 0.08}s both` }}>{b.e}</span>
        ))}
      </div>
      <div style={{ fontWeight: 800, fontSize: '5.4cqw', marginTop: '6cqh', animation: 'fadeUp 0.6s ease 1.7s both' }}>
        Dienstag ist das <span style={{ color: PINK_MID }}>neue Wochenende</span>.
      </div>
    </>
  );
}

// BDAY-Beat: ein Team gewinnt, Krone + Konfetti.
function WinBeat() {
  return (
    <>
      <Confetti />
      <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '7.6cqw', lineHeight: 1.05, marginBottom: '4cqh', animation: 'fadeUp 0.5s ease both' }}>
        Am Ende gewinnt<br />ein Team.
      </div>
      {/* Krone sitzt AUF dem Kopf (leicht überlappend), nicht schwebend darüber.
          Zentrierung über Flex-Wrapper, damit das Wackeln (crownBob) den Mittelpunkt
          nicht verschiebt. */}
      <div style={{ position: 'relative', marginTop: '6cqh', animation: 'popIn 0.7s var(--eb) 0.4s both' }}>
        <div style={{ position: 'absolute', top: '-3cqh', left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 2, pointerEvents: 'none' }}>
          <span style={{ fontSize: '11cqw', animation: 'crownBob 3.4s ease-in-out infinite', filter: 'drop-shadow(0 0.4cqh 0.5cqh rgba(0,0,0,0.4))' }}>👑</span>
        </div>
        <PetDisc slug={TEAMS[4].slug} color={TEAMS[4].color} sizeCqw={32} />
      </div>
      <div style={{ fontWeight: 800, fontSize: '5.6cqw', marginTop: '6cqh', animation: 'fadeUp 0.6s ease 1s both' }}>
        Aber <span style={{ color: PINK_MID }}>Spaß</span> hatten alle.
      </div>
    </>
  );
}

function PetDisc({ slug, color, sizeCqw, anim }: { slug: string; color: string; sizeCqw: number; anim?: string }) {
  return (
    <div style={{
      width: `${sizeCqw}cqw`, height: `${sizeCqw}cqw`, borderRadius: '50%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.3), rgba(255,255,255,0) 52%), ${color}`,
      boxShadow: `0 1.5cqh 4cqh ${color}66, inset 0 -1.4cqh 2.6cqh rgba(0,0,0,0.25)`,
      animation: anim,
    }}>
      <img src={cz(slug)} alt="" style={{ width: '84%', height: '84%', objectFit: 'contain', filter: 'drop-shadow(0 0.5cqh 0.6cqh rgba(0,0,0,0.35))' }} />
    </div>
  );
}

// CozyWolf-Maskottchen (Gastgeber) — freistehend mit Pink-Glow, kein Team-Disc.
function WolfMascot({ pose, sizeCqw, anim }: { pose: string; sizeCqw: number; anim?: string }) {
  return (
    <div style={{ position: 'relative', width: `${sizeCqw}cqw`, height: `${sizeCqw}cqw`, display: 'grid', placeItems: 'center', animation: anim }}>
      <div style={{ position: 'absolute', width: '84%', height: '84%', borderRadius: '50%', background: `radial-gradient(circle, ${PINK}55, transparent 68%)`, filter: 'blur(6px)' }} />
      <img src={cw(pose)} alt="CozyWolf" style={{ position: 'relative', width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 1.4cqh 1.8cqh rgba(0,0,0,0.45))', animation: 'floatPet 5s ease-in-out infinite' }} />
    </div>
  );
}

// Konfetti-Burst (nur Geburtstags-Hook) — leichte fallende Farbpunkte.
function Confetti() {
  const bits = [
    { x: 14, c: PINK, d: 0 }, { x: 28, c: '#FEC814', d: 0.3 }, { x: 42, c: '#266FD3', d: 0.6 },
    { x: 58, c: '#9DCB2F', d: 0.15 }, { x: 72, c: '#9A65D5', d: 0.5 }, { x: 86, c: PINK_MID, d: 0.8 },
    { x: 20, c: '#9DCB2F', d: 1.0 }, { x: 50, c: '#FEC814', d: 1.3 }, { x: 80, c: '#266FD3', d: 1.1 },
  ];
  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 2 }}>
      {bits.map((b, i) => (
        <span key={i} style={{
          position: 'absolute', left: `${b.x}cqw`, top: '-4cqh',
          width: '2.2cqw', height: '2.8cqw', borderRadius: '0.4cqw', background: b.c,
          animation: `confetti 2.6s linear ${b.d}s infinite`,
        }} />
      ))}
    </div>
  );
}

// Dezent schwebende Icons im Hintergrund (Deko) — Set/Positionen pro Nische
// variiert, damit die Startframes sich unterscheiden.
function FloatingIcons({ items }: { items: DecoItem[] }) {
  return (
    <>
      {items.map(p => (
        <img key={p.name} src={icon(p.name)} alt="" aria-hidden style={{
          position: 'absolute', left: `${p.x}cqw`, top: `${p.y}cqh`,
          width: `${p.s}cqw`, height: `${p.s}cqw`, objectFit: 'contain',
          opacity: 0.18, filter: 'drop-shadow(0 0.4cqh 0.6cqh rgba(0,0,0,0.4))',
          animation: `floatPet 6s ease-in-out ${p.d}s infinite`, zIndex: 1, pointerEvents: 'none',
        }} />
      ))}
    </>
  );
}

const KEYFRAMES = `
  :root { --eb: cubic-bezier(0.2, 1.2, 0.3, 1); }
  @keyframes sceneIn { from { opacity: 0; } to { opacity: 1; } }
  /* 2026-Trend „Soft-Zoom + Blur": neue Slide kommt aus leichter Vergroesserung
     + weichem Blur scharf rein (premium Tiefe statt flachem Fade). */
  @keyframes sceneEnter {
    0%   { opacity: 0; transform: scale(1.07); filter: blur(11px); }
    50%  { opacity: 1; }
    100% { opacity: 1; transform: scale(1); filter: blur(0); }
  }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(4cqh); } to { opacity: 1; transform: none; } }
  @keyframes popIn { 0% { opacity: 0; transform: scale(0.7); } 100% { opacity: 1; transform: scale(1); } }
  @keyframes slideIn { from { opacity: 0; transform: translateX(-6cqw); } to { opacity: 1; transform: none; } }
  @keyframes dropIn { 0% { opacity: 0; transform: translateY(-8cqh) scale(0.6); } 100% { opacity: 1; transform: none; } }
  @keyframes cellIn { 0% { opacity: 0; transform: scale(0.3); } 100% { opacity: 1; transform: scale(1); } }
  @keyframes cellPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
  @keyframes barFill { from { width: 0%; } to { width: 100%; } }
  @keyframes floatPet { 0%, 100% { transform: translateY(0) rotate(-4deg); } 50% { transform: translateY(-3cqh) rotate(4deg); } }
  @keyframes clashL { 0% { opacity: 0; transform: translateX(-12cqw); } 70% { transform: translateX(1.5cqw); } 100% { opacity: 1; transform: none; } }
  @keyframes clashR { 0% { opacity: 0; transform: translateX(12cqw); } 70% { transform: translateX(-1.5cqw); } 100% { opacity: 1; transform: none; } }
  @keyframes confetti { 0% { opacity: 0; transform: translateY(0) rotate(0deg); } 10% { opacity: 1; } 100% { opacity: 0.9; transform: translateY(150cqh) rotate(340deg); } }
  @keyframes revealCorrect { to { background: linear-gradient(135deg, #16a34a, #22c55e); box-shadow: 0 0 0 0.4cqw rgba(255,255,255,0.45), 0 1cqh 3cqh rgba(34,197,94,0.5); } }
  @keyframes stealOut { to { opacity: 0; transform: scale(0.65); } }
  @keyframes stealIn { from { opacity: 0; transform: scale(0.5); } to { opacity: 1; transform: none; } }
  @keyframes crownBob { 0%, 100% { transform: rotate(-8deg) translateY(0); } 50% { transform: rotate(-8deg) translateY(-1.4cqh); } }
`;
