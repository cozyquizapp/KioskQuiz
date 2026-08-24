/**
 * CozyQuizLobbyView — Pre-Game Lobby mit QR-Code, joined Teams, Wolf-Greeter.
 *
 * Zeigt: zentraler QR-Code (mobile join), Team-Cards (joined Teams), Wolf
 * winkt top-right + welcomed new joins. Brand-Pink/Eurovision-Mode-aware.
 *
 * Extrahiert aus QQBeamerPage.tsx 2026-05-13 (Refactor Phase 5).
 * Mit-extrahiert: WolfLobbyGreeter (lokaler Helper, nur in LobbyView).
 * 7 externe Importer — Re-Export bleibt.
 */
import { useState, useEffect, useRef, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { QQStateUpdate } from '../../../shared/quarterQuizTypes';
import { QQ_AVATARS, qqMegaFactionName, qqMegaFactionSlug, qqMegaFactionMotto } from '../../../shared/quarterQuizTypes';
import { FactionCrest } from './QQFactionCrest';
import { useLangFlip, COZY_CARD_BG, qqPlural } from '../cozyQuizShared';
import { Fireflies, EurovisionHearts } from './CozyQuizAmbient';
import { QQTeamAvatar } from './QQTeamAvatar';
import { isQuirkTileSet } from '../quirks2Avatars';
import { QQIcon } from './QQIcon';
import { wakeTeamAvatar } from '../avatarAwake';
import { AnimatedCozyWolf, ArenaMageWolf, SpeechBubble, type Slogan } from '../pages/QQBeamerPage';
import { isThemed, getActiveThemeId, QUIRKS_THEME_ID } from '../qqTheme';
import { ArenaMainVideo } from './ArenaBeamerBg';

/**
 * Die Buehne beim Namen nennen, 2026-08-24.
 *
 * Bis heute kannte diese Datei die Buehne nicht. Sie lief ueber Flaechen-Tokens
 * und `isThemed()`, und das sah auch weitgehend richtig aus - aber `isThemed()`
 * heisst „nicht Cozy" und gilt fuer vier Skins zugleich. Wer darueber eine
 * Ausnahme fuer die Buehne bauen will, baut sie fuer alle vier. Die Folge war
 * nicht, dass hier etwas falsch aussah, sondern dass hier nichts ABSICHTLICH
 * richtig sein konnte: jede Regel des Briefs war nur so lange erfuellt, wie sie
 * zufaellig mit dem Skin-Standard zusammenfiel.
 */
const istBuehneG = () => getActiveThemeId() === QUIRKS_THEME_ID;

// 2026-08-23: NICHT gerendert (Wolf: „wir nehmen den wolf hier raus!").
// Der Bauplan bleibt bewusst stehen; Wiedereinbau ist der auskommentierte
// Block in LobbyView. Deshalb hier eslint stumm statt die Datei zu leeren.
// WolfLobbyGreeter — kleiner Wolf top-right in der Lobby, winkt hereinkommende
// Teams herein. Idle: 'QR-Code scannen!' / 'Genau den da!' / etc. Wenn Parent
// `welcomedTeamName` setzt (kommt von welcomeTeamId in LobbyView, ~3.2s aktiv
// nach Team-Join), uebernimmt 'Hallo {teamName}!' bis zum Timeout, dann zurueck
// zur Idle-Rotation.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function WolfLobbyGreeter({ lang, welcomedTeamName, eurovisionMode, arena }: {
  lang: 'de' | 'en';
  welcomedTeamName: string | null;
  /** 2026-05-07 (Wolf-ESC): wenn true, Wolf haelt EU-Flagge statt Daumen hoch. */
  eurovisionMode?: boolean;
  /** 2026-07-15: CozyArena → Magier-Wolf (ArenaMageWolf) statt AnimatedCozyWolf. */
  arena?: boolean;
}) {
  // 2026-05-07 v8 (Wolf 'gib dem wolf ein paar eurovision sprueche'): im
  // ESC-Mode Slogan-Pool gegen Eurovision-Phrasen tauschen — Bonsoir-Vibe,
  // ESC-Insider, "12 points"-Witz. Mund-Counts ungefaehr nach Silben gesetzt
  // damit der Mund-Flap-Loop synchron mit dem Speak-Timing laeuft.
  const idleSlogans: Slogan[] = eurovisionMode
    ? (lang === 'de'
        ? [
            { text: 'Bonsoir Europe!', mouths: 4 },
            // 2026-05-07 v9 (Wolf 'griechen, polen, russen sind dabei'):
            // multilinguale Begruessungen als Easter-Egg im Idle-Pool.
            { text: 'Γεια σας!', mouths: 3 },        // EL: 'Hallo zusammen'
            { text: 'Witajcie!', mouths: 3 },        // PL: 'Willkommen'
            { text: 'Добро пожаловать!', mouths: 5 }, // RU: 'Willkommen'
            { text: 'Mit dem Handy joinen', mouths: 4 },
            { text: 'Welches Land seid ihr?', mouths: 5 },
            { text: 'Wer holt heute 12 Punkte?', mouths: 6 },
            { text: 'Lasst die Show beginnen!', mouths: 5 },
          ]
        : [
            { text: 'Good evening Europe!', mouths: 5 },
            { text: 'Γεια σας!', mouths: 3 },        // EL
            { text: 'Witajcie!', mouths: 3 },        // PL
            { text: 'Добро пожаловать!', mouths: 5 }, // RU
            { text: 'Phone out, scan, join!', mouths: 4 },
            { text: 'Which country are you?', mouths: 5 },
            { text: 'Who scores douze points?', mouths: 5 },
            { text: 'Let the show begin!', mouths: 4 },
          ])
    : (lang === 'de'
        ? [
            // 2026-06-28 (Beamer-Review): Wolf-Copy „Scannt euch rein!" als
            // Leit-Begrüßung zuerst.
            { text: 'Scannt euch rein!', mouths: 4 },
            { text: 'QR-Code scannen!', mouths: 4 },
            { text: 'Genau den da!', mouths: 3 },
            { text: 'Bereit zu joinen?', mouths: 4 },
            { text: 'Mit dem Handy joinen', mouths: 4 },
            { text: 'Jeder kann mitspielen', mouths: 5 },
          ]
        : [
            { text: 'Scan to join!', mouths: 3 },
            { text: 'Scan the QR!', mouths: 3 },
            { text: 'That one over there!', mouths: 4 },
            { text: 'Ready to join?', mouths: 3 },
            { text: 'Phone out, scan, go!', mouths: 4 },
            { text: 'Anyone can play', mouths: 4 },
          ]);

  const [idleIdx, setIdleIdx] = useState(0);

  // 2026-05-07 v9 (Wolf 'wir haben griechen polen russen, wolf soll auf den
  // sprachen begruessen'): im ESC-Mode rotiert das Team-Join-Welcome
  // zufaellig durch DE/EN/EL/PL/RU. useMemo auf welcomedTeamName, damit
  // dasselbe Team beim selben Join nicht zwischen Sprachen flippt.
  const ESC_GREETINGS = useMemo<Array<(name: string) => string>>(() => [
    (n) => `Hallo ${n}!`,        // DE
    (n) => `Hello ${n}!`,        // EN
    (n) => `Γεια ${n}!`,         // EL — Griechisch
    (n) => `Cześć ${n}!`,        // PL — Polnisch
    (n) => `Привет ${n}!`,       // RU — Russisch
  ], []);
  const escWelcomeText = useMemo(() => {
    if (!welcomedTeamName || !eurovisionMode) return null;
    const fn = ESC_GREETINGS[Math.floor(Math.random() * ESC_GREETINGS.length)];
    return fn(welcomedTeamName);
  }, [welcomedTeamName, eurovisionMode, ESC_GREETINGS]);

  // Welcome-Slogan ueberschreibt idle wenn ein neues Team joint
  const welcomeSlogan: Slogan | null = welcomedTeamName
    ? {
        text: escWelcomeText
          ?? (lang === 'de' ? `Hallo ${welcomedTeamName}!` : `Hello ${welcomedTeamName}!`),
        mouths: Math.min(7, Math.max(3, Math.ceil(welcomedTeamName.length / 3) + 1)),
      }
    : null;

  const isWelcoming = welcomeSlogan !== null;
  // 2026-05-07 v14 (Bug-Fix Mod-Page-Crash 'Cannot read mouths'): Wenn der
  // Slogan-Pool zwischen ESC (8) und Cozy (5) wechselt, kann idleIdx fuer
  // den neuen Pool out-of-bounds sein → undefined → .mouths-Crash. Safe-Index
  // mit Modulo + Fallback auf Index 0.
  const slogan = welcomeSlogan
    ?? idleSlogans[idleIdx % Math.max(1, idleSlogans.length)]
    ?? idleSlogans[0]
    ?? { text: '', mouths: 2 };

  const speakMs = Math.min(4500, Math.max(1300, slogan.mouths * 440));
  const enterMs = 200;
  const exitMs = 400;
  const gapMs = 600;
  const totalMs = enterMs + speakMs + exitMs + gapMs;

  // Idle-Cycle nur wenn nicht im Welcome-Modus (Welcome bleibt bis Parent
  // welcomedTeamName auf null setzt — ~3.2s nach Join)
  useEffect(() => {
    if (isWelcoming) return;
    const id = window.setTimeout(() => {
      setIdleIdx(p => (p + 1) % idleSlogans.length);
    }, totalMs);
    return () => window.clearTimeout(id);
  }, [idleIdx, totalMs, idleSlogans.length, isWelcoming]);

  // Bubble-Key fuer Re-Mount + Mund-Sync. Bei Welcome team-name-basiert,
  // sonst idx-basiert.
  const bubbleKey = isWelcoming ? `welcome-${welcomedTeamName}` : `idle-${idleIdx}`;

  // Speaking-Gate fuer Wolf-Mund-Flap
  const [speakingNow, setSpeakingNow] = useState(false);
  useEffect(() => {
    setSpeakingNow(false);
    const t1 = window.setTimeout(() => setSpeakingNow(true), enterMs);
    const t2 = window.setTimeout(() => setSpeakingNow(false), enterMs + speakMs);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
  }, [bubbleKey, enterMs, speakMs]);

  return (
    // 2026-05-07 v20 (Wolf 'pack ihn wieder rechts hoch ... achte darauf
    // dass der wolf nicht springt wenn er was neues sagt'): top-right
    // anchor (Aufrufer). Anti-Jumping via fixe min-Hoehe am Bubble-
    // Container + alignItems:flex-end — Bubble pinned an die Unterkante
    // des 130px-Slots, Hoehe variabel innerhalb des Slots. Wolf darunter
    // sitzt damit auf konstanter Hoehe egal wie lang der Slogan ist.
    // Sehr lange Slogans (>130px) wuerden den Slot ueberschreiten und
    // Wolf einmalig schieben — kommt aber bei den aktuellen Idle/Welcome-
    // Slogans nicht vor (max ~110px gemessen).
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
      gap: 14, pointerEvents: 'none',
    }}>
      <div style={{
        minHeight: 130,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'flex-end',
      }}>
        <SpeechBubble
          text={slogan.text}
          bubbleKey={bubbleKey}
          enterMs={enterMs}
          speakMs={speakMs}
          exitMs={exitMs}
          tailSide="left"
          eurovisionMode={eurovisionMode}
          size="lg"
        />
      </div>
      {arena ? (
        // Arena: Magier-Wolf. Beim Team-Willkommen die grosse cheer-Pose als
        // Reaktion (statt hi), sonst normaler Sprech-Flap. mirror analog Daumen-Wolf.
        <ArenaMageWolf
          widthCss="clamp(140px, 13cqw, 200px)"
          speaking={speakingNow}
          cheer={isWelcoming}
          mirror
        />
      ) : (
        <AnimatedCozyWolf
          widthCss="clamp(140px, 13cqw, 200px)"
          mode={eurovisionMode ? 'flagge' : 'daumen'}
          speaking={speakingNow}
          wink={!eurovisionMode && isWelcoming}
          mirror
        />
      )}
    </div>
  );
}
/**
 * Freie Plaetze in der Lobby.
 *
 * 2026-08-23. Ein normaler Raum hat genau acht Team-Slots: QQ_AVATARS zaehlt
 * acht, und das Backend deckelt `/dev/fillTeams` ausserhalb des Gross-Modus
 * ebenfalls bei acht. Der Wert steht deshalb hier neben der Ansicht, die ihn
 * zeichnet, und nicht als blanke 8 mitten im JSX.
 */
const LOBBY_SLOTS = 8;

export function LobbyView({ state: s }: { state: QQStateUpdate }) {
  // Cozy Quirks: die eckige Farb-Kachel IST der Avatar → in der Teamkarte füllt
  // sie bündig die volle Höhe links, der farbige Card-Akzent entfällt (Wolf).
  const quirkSet = isQuirkTileSet(s.avatarSetId);
  const istBuehne = istBuehneG();
  const cardBg = s.theme?.cardBg ?? COZY_CARD_BG;
  const fontFam = isThemed()
    ? 'var(--qq-font)'
    : s.theme?.fontFamily ? `'${s.theme.fontFamily}', 'Bricolage Grotesque', 'Inter', 'Nunito', system-ui, sans-serif` : "'Bricolage Grotesque', 'Inter', 'Nunito', system-ui, sans-serif";
  const joinUrl = `${window.location.origin}/team`;
  // 2026-05-07 (Wolf-Bug 'trotz only GB englisch im moderator werden einige
  // texte in der lobby nicht uebersetzt'): vorher lokaler de-State mit 8s-
  // Auto-Toggle der s.language komplett ignoriert hat. Jetzt useLangFlip
  // wie ueberall sonst — sticky bei DE/EN, flippt nur in 'both' (12s).
  const lang = useLangFlip(s.language);
  const de = lang === 'de';

  // F1 Team-Join-Wave: tracke frisch dazugekommene Teams, Card bekommt
  // zusaetzlich zur Entry-Animation einen Wink-Shake + Glow-Burst.
  const prevTeamIdsRef = useRef<Set<string>>(new Set());
  // „seen" = schon mal in dieser Lobby-Session gemountet. Verhindert dass
  // beim Wave-Ende die teamCardIn-Animation erneut feuert (sonst flackert
  // die Karte: einblenden → kurz weg → wieder da).
  const seenTeamIdsRef = useRef<Set<string>>(new Set());
  const [waveIds, setWaveIds] = useState<Set<string>>(new Set());
  // Welcome-Banner: zeigt 'Willkommen, {Team}!' kurz prominent in der Mitte
  // wenn ein neues Team joint (User-Wunsch 2026-04-28). Banner overlayt — Lobby
  // bleibt im Hintergrund sichtbar.
  const [welcomeTeamId, setWelcomeTeamId] = useState<string | null>(null);
  const welcomeTimerRef = useRef<number | null>(null);
  useEffect(() => {
    const curIds = new Set(s.teams.map(t => t.id));
    const prev = prevTeamIdsRef.current;
    const newJoins: string[] = [];
    for (const id of curIds) if (!prev.has(id)) newJoins.push(id);
    prevTeamIdsRef.current = curIds;
    if (newJoins.length > 0 && prev.size > 0) {
      // Augen-„Hallo": neu gejointe Tiere machen kurz die Augen auf.
      for (const id of newJoins) wakeTeamAvatar(id, 3200);
      // Nur als „wave" markieren wenn Lobby schon bestand (sonst sind alle
      // initialen Teams „neu" und der Glow-Burst waere ueberfluessig).
      setWaveIds(new Set(newJoins));
      setTimeout(() => setWaveIds(new Set()), 1400);
      // Welcome-Banner für den letzten neuen Join (bei Mehrfach-Join nur einer
      // sichtbar, sonst stapelt sich's). Re-trigger durch clearTimeout möglich.
      const lastJoin = newJoins[newJoins.length - 1];
      setWelcomeTeamId(lastJoin);
      if (welcomeTimerRef.current) window.clearTimeout(welcomeTimerRef.current);
      welcomeTimerRef.current = window.setTimeout(() => setWelcomeTeamId(null), 3200);
    }
  }, [s.teams]);
  useEffect(() => () => { if (welcomeTimerRef.current) window.clearTimeout(welcomeTimerRef.current); }, []);
  const welcomedTeam = welcomeTeamId ? s.teams.find(t => t.id === welcomeTeamId) : null;
  // Nach jedem Render alle aktuellen Teams als „seen" markieren — fortan
  // bekommen sie KEIN teamCardIn mehr (würde sonst beim Wave-End-Re-Render
  // erneut feuern).
  useEffect(() => {
    for (const t of s.teams) seenTeamIdsRef.current.add(t.id);
  }, [s.teams]);

  // Dynamic status text
  const teamCount = s.teams.length;
  // 2026-07-01: Groß-Modus / viele Teams → dichtes Multi-Spalten-Grid mit
  // kompakten Chips (25 Teams passen nicht in 2 Spalten; Beamer scrollt nie).
  const veryMany = (s as any).largeGroupMode || teamCount > 12;
  // 2026-07-01 (Wolf Idee 2): Genestet → Sub-Teams teilen sich einen avatarId
  // (= Eltern-Team). In der Lobby als 8 Eltern-Karten mit „X/3 Sub-Teams"
  // gruppieren, sonst sähen 3 gleiche Avatare wie ein Bug aus.
  const nested = !!(s as any).nestedTeams;
  // AUSSER-WERTUNG-ANFANG: CozyArena-Gruppierung, nur bei nestedTeams
  const nestedGroups = useMemo(() => {
    if (!nested) return [] as Array<{ avatarId: string; emoji?: string; color: string; label: string; subs: typeof s.teams }>;
    const byAvatar = new Map<string, { avatarId: string; emoji?: string; color: string; label: string; subs: typeof s.teams }>();
    for (const t of s.teams) {
      let g = byAvatar.get(t.avatarId);
      if (!g) {
        const meta = QQ_AVATARS.find(a => a.id === t.avatarId);
        // Mega Event: Faktions-Name + Faktions-Tier (slug); Fallback Default-Avatar.
        g = {
          avatarId: t.avatarId,
          emoji: qqMegaFactionSlug(t.avatarId) ?? t.emoji,
          color: t.color,
          label: qqMegaFactionName(t.avatarId, de ? 'de' : 'en') || (meta ? (de ? meta.label : meta.labelEn) : t.name),
          subs: [],
        };
        byAvatar.set(t.avatarId, g);
      }
      g.subs.push(t);
    }
    return [...byAvatar.values()];
  }, [nested, s.teams, de]);
  // AUSSER-WERTUNG-ENDE (CozyArena-Gruppierung)

  // QR size responsive to viewport height (avoid clipping on laptops)
  // Arena/viele Teams: linke Spalte traegt eine Extra-Pill ("Ein Handy pro Gruppe")
  // + CozyWolf-Branding und der grosse COZYARENA-Header frisst oben Hoehe → das
  // fixe 420px-QR liess die unterste Pill unten aus overflow:hidden rausclippen.
  // Kleineres QR im nested/veryMany-Modus, damit die ganze Spalte reinpasst.
  // 2026-08-23: nur noch ein DECKEL, keine Vorgabe. Die tatsaechliche Groesse
  // kommt aus der Rasterzeile, also aus der Hoehe des Kachelblocks (Wolf:
  // „qr code + teams als ein element"). Der Deckel war mit 420 px zu niedrig,
  // seit die Kacheln groesser sind und acht Plaetze immer stehen — er haette
  // die Gleichheit der beiden Bloecke wieder gebrochen.
  const qrSize = (nested || veryMany) ? 'min(40cqh, 400px)' : 'min(66cqh, 640px)';

  // 2026-05-07 (Wolf-Sidequest): pro-Draft optionales Lobby-BG-Bild — wird
  // hinter den Standard-Glow-Layer gelegt, damit das Bild dezent durchscheint
  // ohne dass die UI darunter unlesbar wird. Kein BG-URL = Standard bleibt.
  // 2026-07-13 (Wolf Arena-Background-Set): im Arena-Modus (ohne aktiven Skin und
  // ohne explizites Theme-BG) das neue Kolosseum-Bild als Lobby-Hintergrund.
  // 2026-07-14 (Wolf): Moderator-Toggle „Arena-Backgrounds" respektieren →
  // aus = schlichter Default-Lobby-BG (kein Kolosseum-Video).
  const arenaLobbyBg = (s as any).largeGroupMode && (s as any).arenaBackgrounds !== false && !isThemed() && !s.theme?.lobbyBackgroundUrl
    ? '/arena-bg/arena-main.webp' : undefined;
  // 2026-07-13 (Wolf-Feedback Lobby-Proof): über dem Arena-Bild brauchen die
  // Team-/Fraktions-„Fenster" mehr Deckung → dunkles Glas statt 4%-Weiss.
  // 2026-07-14 (Wolf: „Team-Felder weniger transparent"): solidere Cards → besser lesbar.
  const arenaCardBg = arenaLobbyBg ? 'rgba(10,8,18,0.82)' : undefined;
  // 2026-07-14 (Wolf: „hinter dem Video ist noch das BG-Bild zu sehen"): im
  // Arena-Modus KEIN statisches WebP mehr unter dem Video — das Video (ArenaMainVideo,
  // mit eigenem WebP-Poster) trägt den BG allein. Die WebP-Bild-Ebene bleibt nur
  // für Custom-Theme-Draft-BGs (nicht-Arena).
  const lobbyBgUrl = s.theme?.lobbyBackgroundUrl;

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      // 2026-05-12 (Wolf 'safe-margin sollte ja im ganzen quiz drin sein'):
      // padding-vertikal jetzt floor auf var(--qq-safe-margin). horiz bleibt
      // groesser (Cards in der Lobby brauchen mehr Atem).
      // 2026-07-13 (Wolf: „text nach oben"): im Arena-BG-Modus kleineres Top-
      // Padding → Wortmarke rueckt hoch in die obere Arena-Zone.
      padding: arenaLobbyBg
        ? 'clamp(6px, 0.8cqh, 14px) clamp(24px, 3cqw, 56px) max(var(--qq-safe-margin), clamp(16px, 2.5cqh, 32px))'
        : 'max(var(--qq-safe-margin), clamp(16px, 2.5cqh, 32px)) clamp(24px, 3cqw, 56px)',
      position: 'relative', overflow: 'hidden',
      gap: 'clamp(10px, 1.5cqh, 20px)',
      minHeight: 0,
      // Cozy-warmer Hintergrund (User-Wunsch 2026-04-28: nicht so schwarz, an
      // Setup-Look angleichen). Doppelter Radial-Gradient: oben-mitte amber-Glow,
      // unten-rechts indigo-Glow auf #0A0814-Base — exakt wie QQModeratorPage.
      // 2026-06-24 (Skin): aktiver Skin → flacher Skin-BG statt Pink-Glow-Dunkel.
      background: isThemed()
        ? 'var(--qq-bg)'
        : 'radial-gradient(ellipse at 50% -10%, rgba(var(--qq-stage-brand-rgb), 0.10), transparent 55%), ' +
        'radial-gradient(ellipse at 85% 110%, rgba(99,102,241,0.08), transparent 55%), ' +
        'radial-gradient(ellipse at 15% 80%, rgba(244,114,182,0.05), transparent 50%), ' +
        '#120F18',
    }}>
      {lobbyBgUrl && (
        <div
          aria-hidden
          style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${lobbyBgUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            // 2026-05-07 (Wolf 'sehe BG nicht'): mixBlendMode screen + 0.55
            // hat ESC-Buehnenbild fast komplett geschluckt (Screen-Mode laesst
            // nur helle Pixel durch). Switch auf normal-Blend mit 0.7 — BG
            // wird klar sichtbar, Content sitzt mit eigenem Card-BG drueber.
            // 2026-07-13 (Wolf: „hintergrund transparenter", 2 Runden): 0.92 →
            // 0.6 → 0.5. Bild nur noch Andeutung, opake Cards tragen den Screen.
            opacity: 0.7,
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
      )}
      {/* 2026-07-14 (Wolf): arena-main als Ambient-Loop-Video (Fackeln/Fahnen).
          Liegt ueber dem WebP (= Poster/Fallback + reduced-motion) und unter dem
          Scrim. Gleiche Deckung wie das statische Bild, damit der Kontrast der
          getunten Lobby erhalten bleibt. */}
      {arenaLobbyBg && <ArenaMainVideo opacity={0.4} />}
      {/* 2026-07-13 (Wolf Arena-BG, color-contrast): Scrim zwischen Kolosseum und
          Inhalt. Dunkelt Ober-/Unterband (Wortmarke + untere Zeilen) + eine
          Vignette, Mitte bleibt hell → Kunst sichtbar, Text lesbar. Nur Arena. */}
      {arenaLobbyBg && (
        <div aria-hidden style={{
          position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
          background:
            'linear-gradient(180deg, rgba(8,6,16,0.42) 0%, rgba(8,6,16,0.06) 24%, ' +
            'rgba(8,6,16,0.06) 66%, rgba(8,6,16,0.46) 100%), ' +
            'radial-gradient(ellipse at 50% 44%, transparent 42%, rgba(8,6,16,0.30) 100%)',
        }} />
      )}
      <Fireflies />
      {s.theme?.eurovisionMode && <EurovisionHearts />}

      {/* Wolf-Lobby-Greeter top-right — winkt + reagiert auf Team-Joins
          mit 'Hallo {teamName}!'. Idle: 'QR-Code scannen!' / etc.
          2026-05-07 (Wolf 'Wolf mit dem daumen hoch oben rechts, wenn ein
          team sich einloggt sowas wie oh hallo team x').
          2026-05-07 v20 (Wolf 'pack ihn wieder rechts hoch, mach cozyquiz
          auf lobby kleiner und verschieb cozyquiz x und eurovision mehr in
          die mitte'): zurueck zu top-right. Anti-Jumping geloest via
          absolute-positionierter Bubble innerhalb des Greeters (siehe
          WolfLobbyGreeter return) — Bubble waechst nach oben weg vom Wolf
          ohne den Wolf zu verschieben. */}
      {/* 2026-07-01 (Wolf Mega-Event): bei vielen Teams füllt das Grid die
          Fläche bis oben rechts → Wolf-Greeter würde die erste Karten-Reihe
          überlappen. Im Groß-Modus daher ausgeblendet. */}
      {/* 2026-08-23 (Wolf: „aber der wolf sagt unterschiedliche dinge, weisst
          du was, wir nehmen den wolf hier raus!"): Greeter ist aus der Lobby
          raus. Er rotierte sechs Slogans, die alle dasselbe sagten wie der
          QR-Block darunter („Scannt euch rein", „QR-Code scannen", „Mit dem
          Handy joinen") — also genau die Wiederholung aus Regel null, nur
          jedes Mal anders formuliert, was die Wiederholung nicht kleiner
          macht, sondern unruhiger.
          Passt zu Wolfs Trennung Marke != Produkt: der Wolf begruesst und
          verabschiedet, er kommentiert nicht die Bedienung.
          `WolfLobbyGreeter` bleibt als Komponente stehen — die Slogan-Listen
          und das Anti-Sprung-Layout sind Arbeit, die man nicht wegwirft, wenn
          die Entscheidung noch frisch ist. Wiedereinbau = dieser Block. */}

      {/* Welcome-Team-Banner — overlayt zentral wenn neues Team joint.
          B8 (2026-04-29): User-Wunsch 'noch groesser, mittig'. top:50%,
          Avatar + Title-Schrift deutlich vergroessert. */}
      {welcomedTeam && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 50,
          padding: 'clamp(32px, 4cqh, 60px) clamp(56px, 7cqw, 120px)',
          borderRadius: isThemed() ? 'var(--qq-card-radius)' : 24,
          background: 'linear-gradient(180deg, rgba(26,19,12,0.96), rgba(15,12,9,0.98))',
          // 2026-08-24 (2a): auf der Buehne traegt die Teamfarbe die MARKE
          // links, und die ist hier bis 200px gross. Ein zweiter Traeger als
          // 4px-Rand plus ein dritter als 80px-Hof sagen dasselbe noch zweimal,
          // und der Hof weicht auf Projektionsabstand nur die Kante auf.
          border: istBuehne ? '1.5px solid var(--qq-hairline)' : `4px solid ${welcomedTeam.color}`,
          boxShadow: istBuehne ? 'none' : `0 0 80px ${welcomedTeam.color}aa`,
          animation: 'qqWelcomeBanner 3.2s var(--qq-ease-out-cubic) both',
          pointerEvents: 'none',
          display: 'flex', alignItems: 'center', gap: 'clamp(24px, 3cqw, 44px)',
          maxWidth: '90cqw',
        }}>
          <QQTeamAvatar avatarId={welcomedTeam.avatarId} teamEmoji={welcomedTeam.emoji} teamId={welcomedTeam.id} size={'clamp(120px, 14cqw, 200px)'} style={{
            boxShadow: istBuehne ? 'none' : `0 0 32px ${welcomedTeam.color}aa`,
            flexShrink: 0,
          }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
            <div style={{
              fontSize: istBuehne ? 'clamp(24px, 2.2cqw, 32px)' : 'clamp(18px, 1.8cqw, 26px)', fontWeight: 900,
              color: istBuehne ? 'var(--qq-text-muted)' : welcomedTeam.color,
              letterSpacing: '0.22em', textTransform: 'uppercase',
              textShadow: istBuehne ? 'none' : `0 0 18px ${welcomedTeam.color}88`,
            }}>
              {de ? 'Willkommen' : 'Welcome'}
            </div>
            {/* 2026-07-08 (Wolf-Livetest 'Join-Message schneidet lange Namen ab'):
                statt hartem nowrap+ellipsis darf der Name jetzt auf 2 Zeilen
                umbrechen (kleinere Max-Größe), lange Team-Namen bleiben lesbar. */}
            <div style={{
              // 2026-07-19 (Kolosseum-Font-Sweep): im Kolosseum Garamond statt
              // Bricolage, sonst faellt die Join-Message aus dem Arena-Font-System.
              // Bewusst NICHT Cinzel — das hier ist ein Team-Name (user-generated,
              // darf auf 2 Zeilen brechen), Cinzel gilt nur kurzen Hero-Worten.
              fontFamily: arenaLobbyBg ? 'var(--font-arena-body)' : fontFam,
              fontSize: 'clamp(40px, 5.6cqw, 92px)', fontWeight: 900,
              color: istBuehne ? 'var(--qq-text)' : '#FFEFC9', lineHeight: 1.04,
              letterSpacing: '-0.005em',
              overflowWrap: 'anywhere', wordBreak: 'break-word',
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
              maxWidth: '70cqw',
              textShadow: istBuehne ? 'none' : `0 0 36px ${welcomedTeam.color}88`,
            }}>
              {welcomedTeam.name}!
            </div>
          </div>
        </div>
      )}

      {/* ── Top: CozyQuiz-Wordmark als prominenter Page-Titel.
          2026-05-06 (Wolf 'bisschen glow weg, wave-effekt rein, sah nicht
          aus wie sonst texte in der app'): Multi-Layer-Goldglow (4 Schichten
          + Breath-Drop-Shadow auf outer wrapper) reduziert auf eine subtile
          Layer + Depth-Shadow — Sprache jetzt analog Rules-/Cat-Title.
          Continuous qqCatNameWave (-10px translateY) per Buchstabe mit
          Stagger 80ms, startet nach der Entry-Cascade (delay 0.95s + i*0.08). */}
      {/* 2026-05-07 v3 (Wolf 'der Effekt ist rechteckig, sieht abgehakt aus'):
          Wrapper hatte 2 parallel laufende Animationen (phasePop + Entry),
          beide haben das rechteckige Wordmark-Bbox skaliert → der text-shadow-
          Halo skalierte mit, was als rechteckiger 'Showlight' wahrnehmbar war.
          phasePop raus, nur qqLobbyWordmarkEntry mit reinem Fade. Plus
          radialer Glow-BG hinter dem Wort fuer Atmosphaere ohne rechteckige
          Form-Sichtbarkeit. */}
      <div style={{
        textAlign: 'center', position: 'relative', zIndex: 5, flexShrink: 0,
        animation: 'qqLobbyWordmarkEntry 0.85s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both',
        paddingTop: 'clamp(6px, 1cqh, 14px)',
      }}>
        {/* Radialer Glow-Backdrop hinter dem Wordmark — runde Form, kein
            rechteckiges Halo. Atmend-langsam pulsierend. */}
        <div aria-hidden style={{
          position: 'absolute',
          left: '50%', top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'clamp(420px, 60cqw, 900px)',
          height: 'clamp(180px, 26cqh, 320px)',
          // 2026-05-07 v17 (Wolf 'das gleiche hier in die lobby cozyquiz x
          // eurovision'): Backdrop-Tint folgt dem Theme — Pink in ESC-Mode,
          // Gold sonst. Standard-CozyQuiz-Mode unveraendert.
          background: s.theme?.eurovisionMode
            ? 'radial-gradient(ellipse at center, rgba(255,45,123,0.18) 0%, rgba(255,45,123,0.06) 45%, transparent 70%)'
            : isThemed()
              ? 'radial-gradient(ellipse at center, rgba(var(--qq-accent-rgb),0.18) 0%, rgba(var(--qq-accent-rgb),0.06) 45%, transparent 70%)'
              : 'radial-gradient(ellipse at center, rgba(var(--qq-stage-brand-rgb), 0.18) 0%, rgba(var(--qq-stage-brand-rgb), 0.06) 45%, transparent 70%)',
          filter: 'blur(20px)',
          pointerEvents: 'none',
          zIndex: -1,
          animation: 'qqLobbyTitleGlow 6s ease-in-out infinite',
        }} />
        <style>{`
          .cq-wordmark {
            font-weight: 900;
            line-height: 1;
            letter-spacing: -0.02em;
            color: var(--qq-accent);
            display: inline-block;
            position: relative;
          }
          .cq-wordmark > span {
            display: inline-block;
            will-change: transform, opacity;
          }
          @keyframes qqLobbyWordmarkEntry {
            0%   { opacity: 0; transform: translateY(8px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          @keyframes qqLobbyTitleGlow {
            0%, 100% { opacity: 0.55; transform: translate(-50%, -50%) scale(0.96); }
            50%      { opacity: 0.85; transform: translate(-50%, -50%) scale(1.04); }
          }
        `}</style>
        {/* 2026-05-07 (Wolf-Sidequest): Pro-Draft Welcome-Text-Override.
            Wenn theme.welcomeText gesetzt ist, ersetzt es 'CozyQuiz' im Wordmark.
            ESC-Quiz nutzt das fuer 'Bonsoir Europe' o.ae. */}
        {(() => {
          const customWelcome = de
            ? (s.theme?.welcomeText?.de ?? '')
            : (s.theme?.welcomeText?.en ?? '');

          // 2026-05-07 v17 (Wolf 'das gleiche hier oben hin wie auf der setup
          // page, schoen das genau gleiche hier in die lobby COZYQUIZ x
          // Eurovision'): Im ESC-Mode mit Logo IMMER den Stinger rendern —
          // [COZYQUIZ Stinger Fit] × [Eurovision-Logo] mit X-Shine + Hover-
          // Float, identisch zu Welcome/PreGame.
          // 2026-05-07 v18 (Wolf-Bug 'sprachwechsel laesst die Seite huepfen,
          // französisch etc'): customWelcome-Guard entfernt. Vorher hat das
          // Theme-welcomeText ('Bonsoir Europe' DE / 'Good evening Europe' EN)
          // die Stinger-Renderung blockiert und das Wordmark zwischen
          // unterschiedlich langen Texten (14 vs 19 Zeichen) flippen lassen —
          // bei jedem Lang-Flip ein vertikaler Layout-Hop weil fontSize-Tier
          // wechselt. Stinger hat fixe Width unabhaengig von Sprache.
          // Standard-CozyQuiz-Mode bleibt komplett unangetastet.
          if (s.theme?.eurovisionMode && s.theme?.logoUrl) {
            return (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'clamp(18px, 2.2cqw, 40px)',
              }}>
                {/* CozyQuiz-Wordmark im Stinger-Fit-Font, hover-floatend.
                    2026-05-07 v20 (Wolf 'mach cozyquiz auf lobby kleiner und
                    verschieb cozyquiz x und eurovision mehr in die mitte'):
                    7cqw/108 -> 5.2cqw/82 (-24 %). Schmalerer Stinger sitzt
                    entspannt im viewport-Center ohne dem Top-Right-Wolf in
                    die Quere zu kommen — und wirkt visuell mittiger. */}
                <span style={{
                  fontFamily: 'var(--font-brand)',
                  fontSize: 'clamp(38px, 5.2cqw, 82px)',
                  fontWeight: 400,
                  letterSpacing: '0.04em',
                  color: '#FF2D7B',
                  // 2026-05-13 Kontrast-Audit: Pink-Glow weg, Dark-Halo + dezente
                  // Outline (Stinger Fit weight 400 verliert sonst auf Pink-BG).

                  WebkitTextStroke: '1px rgba(0,0,0,0.4)',
                  lineHeight: 0.96,
                  animation: 'qqStingerHover 4.2s ease-in-out 0.6s infinite',
                }}>COZYQUIZ</span>
                {/* X mit qqStingerXShine (Tilt + Multi-Layer-Glow). height:1em
                    fixiert die vertikale Mittellage.
                    2026-05-07 v19 (Wolf 'jetzt ist das x doch noch weniger
                    mittig'): top:-0.08em von v18 wieder raus, stattdessen
                    COZYQUIZ + Logo geshrinkt (siehe oben) — dadurch wirkt X
                    proportional dominanter + natuerlicher mittig. */}
                {/* 2026-05-07 v20: matched zu COZYQUIZ-Shrink (-24 %). */}
                <span aria-hidden style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "'Bricolage Grotesque', 'Inter', 'Nunito', system-ui, sans-serif",
                  fontWeight: 900,
                  fontSize: 'clamp(28px, 4cqw, 62px)',
                  lineHeight: 1,
                  height: '1em',
                  color: '#fde6f0',

                  animation: 'qqStingerXShine 3.5s ease-in-out 0.6s infinite',
                }}>×</span>
                {/* Eurovision-Logo — Hoehe so dimensioniert dass die sichtbaren
                    'Eurovision Song Contest'-Letters optisch ungefaehr gleich
                    gross sind wie das CozyQuiz-Wordmark. */}
                <span style={{
                  display: 'inline-flex', alignItems: 'center',
                  animation: 'qqStingerHover 4.2s ease-in-out 0.6s infinite',
                }}>
                  <img
                    src={s.theme.logoUrl}
                    alt="Eurovision Song Contest"
                    draggable={false}
                    style={{
                      // 2026-05-07 v20: matched zu COZYQUIZ-Shrink (-24 %),
                      // 11cqh/166 -> 8.5cqh/126.
                      height: 'clamp(60px, 8.5cqh, 126px)',
                      width: 'auto',
                      // 2026-08-24 (2a): kein Hof. Das Kundenlogo steht auf
                      // dunklem Grund und braucht keinen, und der Hof lief in
                      // `--qq-stage-brand` - also in der Farbe, die auf der
                      // Buehne „unter zehn Sekunden" heisst. Ein Signalton als
                      // Dekoration am Logo ist genau die Verwaesserung, gegen
                      // die der Brief die vier Farben festgelegt hat.
                      filter: istBuehne ? 'none' : 'drop-shadow(0 0 24px rgba(var(--qq-stage-brand-rgb), 0.6))',
                    }}
                  />
                </span>
              </div>
            );
          }

          // 2026-07-04 (Wolf 'nur in der CozyArena, NICHT im Cozy Quiz'):
          // Wortmarke = 'COZYARENA' NUR wenn largeGroupMode an ist; normaler
          // Cozy-Quiz-Modus bleibt 'COZYQUIZ'. Per-Draft-welcomeText-Override
          // (customWelcome) gewinnt weiterhin ueber beides.
          const wordmark = customWelcome.length > 0
            ? customWelcome
            : ((s as any).largeGroupMode ? 'COZYARENA' : 'COZYQUIZ');
          // Stagger reduziert sich proportional bei langen Texten damit Wave
          // nicht ueber 4s laeuft.
          const stagger = Math.max(0.03, 0.07 * (8 / Math.max(wordmark.length, 8)));
          // 2026-07-08 (Wolf 3D-Icons): Im CozyArena-Modus das neue 3D-Arena-
          // Kolosseum als Hero ueber die Wortmarke (nur ohne Custom-Welcome).
          // 2026-07-13 (Wolf: „arena symbol oben raus"): kein fx-arena-Hero, wenn
          // das Arena-Kolosseum ohnehin als Hintergrund liegt (redundant).
          const showArenaHero = (s as any).largeGroupMode && customWelcome.length === 0 && !arenaLobbyBg;
          return (
            <>
            {showArenaHero && (
              <QQIcon
                slug="fx-arena"
                size="clamp(96px, 15cqw, 220px)"
                alt="CozyArena"
                style={{
                  display: 'block', margin: '0 auto clamp(2px, 0.8cqh, 12px)',

                  animation: 'qqStingerHover 4.2s ease-in-out 0.4s infinite',
                }}
              />
            )}
            <div
              className="cq-wordmark"
              style={{
                // 2026-05-08 (Wolf-Wunsch 'logo text in standard wie eurovision'):
                // Stinger Fit als Wordmark-Font auch fuer Standard-Drafts.
                // Eurovision behaelt Hot-Pink (#FF2D7B), Standard nutzt Brand-
                // Pink (#EC4899). Wave-Animation pro Buchstabe bleibt erhalten.
                fontFamily: 'var(--font-brand)',
                fontWeight: 400,
                letterSpacing: '0.04em',
                fontSize: wordmark.length > 14 ? 'clamp(40px, 6.5cqw, 100px)' : 'clamp(56px, 9cqw, 140px)',
                // Skin: Wortmark-Farbe folgt dem Skin (--qq-title), Font/Groesse
                // bleiben = Wiedererkennung. ESC behaelt Hot-Pink.
                color: s.theme?.eurovisionMode ? '#FF2D7B' : isThemed() ? 'var(--qq-title)' : 'var(--qq-stage-brand)',
                // 2026-05-13 Kontrast-Audit ESC: Pink-Glow weg ueber 5.png-BG.
                textShadow: s.theme?.eurovisionMode
                  ? 'none'
                  : isThemed()
                    ? 'none'
                    : '0 0 32px rgba(var(--qq-stage-brand-rgb), 0.40)',
              }}
              aria-label={wordmark}
            >
              {Array.from(wordmark).map((ch, i) => (
                <span
                  key={i}
                  style={{
                    animation: `qqCatNameWave 2.6s ease-in-out ${0.85 + i * stagger}s infinite`,
                    whiteSpace: ch === ' ' ? 'pre' : undefined,
                  }}
                >{ch}</span>
              ))}
            </div>
            </>
          );
        })()}
      </div>

      {/* ── Center: 2-column layout — QR left, Teams right.
          Symmetrische Ränder: QR bündig links, Teams-Grid bündig rechts,
          gleicher Abstand zum Viewport-Rand auf beiden Seiten. ── */}
      <div style={{
        flex: 1, display: 'grid',
        // 2026-08-23 (Wolf: „es saehe besser aus wenn der qr code die gleiche
        // hoehe hat und auf der gleichen position sitzt wie 4 teams hoch sind
        // im layout ... generell wenn qr code + teams als ein element gelesen
        // werden").
        // Vorher waren es ZWEI Spalten, jede mit eigenem Inhaltsstapel. Die
        // Zeilenhoehe war damit das Maximum aus beiden Stapeln, und der QR
        // bekam davon ab, was Beschriftung und Marken-Pille uebrig liessen —
        // er stand also zufaellig zum Kachelblock.
        // Jetzt ein Raster mit DREI Zeilen, und alle Bausteine sitzen als
        // eigene Kinder darin:
        //   Zeile 1, Spalte 2  Kopfzeile „Angemeldete Teams"
        //   Zeile 2, Spalte 1  QR   ] diese Zeile ist genau so hoch
        //   Zeile 2, Spalte 2  Kacheln ] wie der Kachelblock
        //   Zeile 3, Spalte 1  Beschriftung, Link, Marke
        // Weil Zeile 2 ihre Hoehe vom Kachelblock bekommt und der QR sie ganz
        // einnimmt, stehen Ober- und Unterkante beider Bloecke exakt aufeinander.
        // Spalte 2 darf schrumpfen (minmax(0, auto)), sonst schiebt ein sehr
        // langer Teamname das ganze Element ueber den Buehnenrand. Der Name
        // kuerzt dann mit Auslassungspunkten, wie er es schon immer tut.
        gridTemplateColumns: 'auto minmax(0, auto)',
        // Alle drei Zeilen `auto`: Zeile 2 ist damit exakt so hoch wie ihr
        // Inhalt, also wie der Kachelblock. Mit `1fr` waere sie auf den
        // uebrigen Platz gedehnt worden und der QR mit ihr.
        // Zeile 3 haelt ihre Hoehe frei, auch wenn nichts drinsteht: die
        // Statuszeile verschwindet beim zweiten Team, und ohne diese Reserve
        // ruckte das ganze Element in dem Moment um 18 px nach oben (gemessen:
        // Oberkante 362 bei null Teams, 380 bei acht).
        gridTemplateRows: 'auto auto minmax(clamp(30px, 3.4cqh, 46px), auto)',
        alignItems: 'stretch',
        justifyContent: 'center',
        alignContent: 'center',
        columnGap: 'clamp(24px, 3cqw, 48px)',
        rowGap: 'clamp(8px, 1.2cqh, 16px)',
        position: 'relative', zIndex: 5,
        width: '100%',
        padding: '0 clamp(24px, 4cqw, 80px)',
        minHeight: 0,
      }}>
        {/* Left: QR Code
            2026-08-23 (Wolf: „es saehe besser aus wenn der qr code die gleiche
            hoehe hat und auf der gleichen position sitzt wie 4 teams hoch sind
            im layout ... generell wenn qr code + teams als ein element gelesen
            werden").
            Vorher war der QR auf eine feste Groesse geklemmt (min(44cqh,420px))
            und die Spalte zentrierte ihn in der Zeile. Kachelblock und QR
            standen damit zufaellig zueinander, und oben rechts blieb Luft
            uebrig. Jetzt streckt sich die Spalte auf die Zeilenhoehe und der
            QR nimmt sie ganz ein (aspect-ratio 1 haelt ihn quadratisch), also
            steht seine Oberkante auf der Oberkante des Kachelblocks und seine
            Unterkante auf dessen Unterkante. `maxHeight` bleibt als Deckel, damit
            er bei wenigen Teams nicht ins Absurde waechst. */}
        <div style={{
          gridColumn: 1, gridRow: 2,
          background: '#ffffff', borderRadius: isThemed() ? 'var(--qq-card-radius)' : 24, padding: 'clamp(14px, 2cqh, 24px)',
          // C5 „Scan-me"-Breath: sanftes gruenes Box-Shadow-Puls signalisiert Interaktivitaet.
          // 2026-08-24 (2a): der QR ist eine weisse Flaeche auf dunklem Grund,
          // das ist der hoechste Kontrast der ganzen Folie. Er braucht keinen
          // Hof, um aufzufallen, und `qrGlow` atmete genau so einen. Der
          // Einzugs-Pop bleibt.
          animation: istBuehne
            ? 'phasePop 0.6s var(--qq-ease-bounce) 0.3s both'
            : 'qrScanBreath 3s ease-in-out infinite, qrGlow 3s ease-in-out infinite, phasePop 0.6s var(--qq-ease-bounce) 0.3s both',
          boxShadow: istBuehne ? 'none' : '0 0 50px rgba(246, 239, 230,0.1)',
          // 2026-08-23: der QR darf KEINE eigene Groesse mitbringen, sonst
          // bestimmt er die Zeilenhoehe statt sie zu uebernehmen. `width: 0` +
          // `minWidth: 100%`… waere ein Trick; sauberer ist: Hoehe von der
          // Zeile (`height: 100%`), Breite aus dem Seitenverhaeltnis, und der
          // Deckel NUR auf der Hoehe. Mit einem Deckel auf der Breite haette
          // er eine intrinsische Groesse und wuerde die Zeile aufziehen —
          // genau das ist beim ersten Versuch passiert (QR 467 px hoch neben
          // einem 337 px hohen Kachelblock).
          aspectRatio: '1', minHeight: 0, height: '100%', width: 'auto',
          maxHeight: qrSize,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          alignSelf: 'center', justifySelf: 'center',
        }}>
          <QRCodeSVG value={joinUrl} size={256} bgColor="#F6EFE6" fgColor="#120F18" level="M"
            style={{ width: '100%', height: '100%' }} />
        </div>

        {/* Zeile 1, Spalte 1: die Ueberschrift des QR — in derselben Zeile und
            derselben Groesse wie „Angemeldete Teams" rechts.
            2026-08-23 (Wolf: „wenn du scannen und mitspielen hoch machst ueber
            den qr code und gleich gross wie angemeldete teams, dann kannst du
            qr code und teams noch besser zentrieren"). Genau so: beide Spalten
            haben jetzt dieselbe Kopfzeile, darunter beide denselben Block. Das
            Element ist damit symmetrisch statt „QR mit Bildunterschrift neben
            Tabelle mit Ueberschrift". */}
        <div style={{
          gridColumn: 1, gridRow: 1,
          // 2026-08-24, gemessen auf der Buehne: beide Kopfzeilen standen bei
          // 20px, die Zaehler-Plakette bei 24px. Der Brief nennt rund 26px als
          // kleinsten sinnvollen Grad, und das hier ist die ERSTE Folie des
          // Abends - die Zeile ueber dem QR ist die Aufforderung, ohne die
          // niemand mitspielt. Platz ist reichlich: unterhalb der Kacheln lagen
          // rund 190px leere Buehne.
          fontSize: istBuehne ? 'clamp(22px, 2.1cqw, 30px)' : 'clamp(14px, 1.5cqw, 20px)', fontWeight: 900,
          color: 'var(--qq-text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase',
          textAlign: 'center', alignSelf: 'end',
        }}>
          {de ? 'Scannen & mitspielen' : 'Scan & join'}
        </div>

        {/* Zeile 3, Spalte 1: der Beitritts-Link, aber nur auf Zuruf.
            2026-08-23 (Wolf: „wie oft kommt es vor dass ein handy in der
            heutigen zeit keinen qr code lesen kann? brauchen wir den link
            wirklich als fallback? wie waere dann ein button nur in dem state im
            moderator"). Der Link stand dauerhaft an der Wand fuer den einen
            Gast, dessen Kamera-App gesperrt ist. Jetzt legt Wolf ihn auf, wenn
            jemand fragt (Steuerpult, Knopf „Link an").
            Die Marken-Pille „praesentiert von CozyWolf" ist hier ersatzlos raus:
            die Wortmarke COZYQUIZ steht schon gross darueber, das war eine
            zweite Marke in derselben Ansicht. Sie gehoert auf Willkommen und
            Danke, wo der Wolf Absender ist. */}
        {s.showJoinLink && (
          <div style={{
            gridColumn: 1, gridRow: 3,
            justifySelf: 'center', alignSelf: 'start',
            fontSize: 'clamp(15px, 1.6cqw, 22px)', color: 'var(--qq-text-muted)', fontFamily: 'monospace',
            background: cardBg, padding: '8px 20px', borderRadius: 'var(--qq-pill-radius)',
            border: '1px solid var(--qq-hairline)',
            animation: 'phasePop 0.4s var(--qq-ease-bounce) both',
          }}>
            {joinUrl.replace('https://', '').replace('http://', '')}
          </div>
        )}

        {/* AUSSER-WERTUNG-ANFANG: CozyArena-Hinweis, nur im Arena-Modus */}
        {/* Arena/nested (2026-07-11): eine Gruppe teilt sich EIN Handy → sonst
            loggen sich 40 Einzelpersonen ein. Nur im nested-Modus, bilingual.
            2026-08-23: sitzt jetzt in Zeile 3 unter dem QR (wo vorher der Link
            stand). Das ist echte Ansage an den Raum, nicht Marke, und muss
            deshalb bleiben. */}
        {nested && !s.showJoinLink && (
          <div style={{
            gridColumn: 1, gridRow: 3,
            justifySelf: 'center', alignSelf: 'start',
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '8px 20px', borderRadius: 'var(--qq-pill-radius)',
            background: isThemed() ? 'var(--qq-surface)' : 'rgba(246, 239, 230,0.06)',
            border: '1.5px solid var(--qq-hairline)',
            fontSize: 'clamp(15px, 1.5cqw, 20px)', fontWeight: 800, color: 'var(--qq-text)',
          }}>
            <span aria-hidden style={{ fontSize: '1.2em' }}>👥</span>
            {de ? 'Ein Handy pro Gruppe' : 'One phone per group'}
          </div>
        )}
        {/* AUSSER-WERTUNG-ENDE (CozyArena-Hinweis) */}

        {/* Right: Teams + status. Kopfzeile sitzt in Zeile 1, damit sie die
            Hoehe von Zeile 2 nicht mitbestimmt — sonst waere der QR genau um
            die Kopfzeile kuerzer als der Kachelblock. */}
        {/* `display: contents` loest diese Huelle auf: ihre drei Kinder werden
            selbst zu Zellen des Aussenrasters und landen per Auto-Platzierung
            in Spalte 2, Zeilen 1 bis 3. Nur so bestimmt der Kachelblock allein
            die Hoehe von Zeile 2 — und damit die Hoehe des QR daneben. */}
        <div style={{ display: 'contents' }}>
          {/* 2026-06-28 (Beamer-Review): einmaliger Count als Pink-Chip; tickt
              per key-Remount bei jedem neuen Team (Count-Tick). */}
          <div style={{
            gridColumn: 2,
            // Grad wie die Kopfzeile links, siehe dort.
            fontSize: istBuehne ? 'clamp(22px, 2.1cqw, 30px)' : 'clamp(14px, 1.5cqw, 20px)', fontWeight: 900,
            color: 'var(--qq-text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase',
            // 2026-07-13 (Wolf: „joined-Zaehler aus der Mitte"): im Arena-BG-Modus
            // links ausgerichtet, damit er nicht mittig ueberm Arena-Tor schwebt.
            display: 'flex', alignItems: 'center',
            justifyContent: arenaLobbyBg ? 'flex-start' : 'center', gap: 12,
            // 2026-07-14 (Wolf „joined teams nicht gut erkennbar"): auf der Arena-Kunst
            // als solider dunkler Chip → klar lesbar, kompakt links.
            ...(arenaLobbyBg ? {
              alignSelf: 'flex-start', width: 'auto',
              background: 'rgba(8,6,16,0.72)', padding: '6px 16px', borderRadius: 999,
              border: '1px solid rgba(246, 239, 230,0.12)', color: 'rgba(232,236,244,0.95)',

            } : {}),
          }}>
            <span style={{ opacity: arenaLobbyBg ? 0.95 : 0.7 }}>{de ? 'Angemeldete Teams' : 'Joined Teams'}</span>
            <span key={teamCount} style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              minWidth: istBuehne ? 'clamp(36px, 3cqw, 50px)' : 'clamp(28px, 2.4cqw, 42px)',
              height: istBuehne ? 'clamp(36px, 3cqw, 50px)' : 'clamp(28px, 2.4cqw, 42px)',
              padding: '0 clamp(6px, 0.7cqw, 12px)', borderRadius: 11,
              background: isThemed() ? 'var(--qq-accent)' : 'var(--qq-stage-brand)',
              // 2026-08-23, gemessen: 1.02:1. Auf der Creme-Buehne ist
              // `--qq-accent` selbst CREME (bewusst farblos-warm, damit Farbe
              // Bedeutung bleibt) — die Plakette war also creme auf creme und
              // die Zahl schlicht unsichtbar. Der Zweig war fuer Skins mit
              // BUNTEM Akzent geschrieben.
              // Auf einer gefuellten Flaeche traegt der Text den Grund, nicht
              // die Tinte. `#1a0a14` liest auf Creme wie auf Pink (gemessen
              // 5.4:1 auf #EC4899), also brauchen beide Zweige denselben Wert.
              color: '#1a0a14',
              fontSize: istBuehne ? 'clamp(22px, 2.1cqw, 30px)' : 'clamp(16px, 1.7cqw, 24px)',
              fontVariantNumeric: 'tabular-nums',
              animation: 'qqCountTick 0.4s cubic-bezier(0.34,1.56,0.64,1)',
            }}>{teamCount}</span>
          </div>

          {/* 2026-08-23, ERSATZLOS GESTRICHEN und deshalb hier vermerkt: bei
              null Teams stand hier ein eigener Kasten mit gestricheltem Rand,
              einem wackelnden Pfeil nach links und „Scannt den QR-Code! / Eure
              Teams erscheinen hier."
              Er faellt weg, weil die acht leeren Plaetze jetzt von Anfang an
              stehen und dasselbe zeigen, nur ohne Worte — die Teams erscheinen
              sichtbar DORT. Dazu sagte der Kasten zum dritten Mal auf derselben
              Folie „scannt den Code": die Ueberschrift ueber dem QR sagt es,
              die Statuszeile darunter sagt es.
              Und er war eine eigene Flaeche mit eigenem Rahmen, die es nur in
              diesem einen Zustand gab — der Block waere also beim ersten
              Beitritt komplett umgesprungen.
              Wiederherstellen: dieser Zweig lag im Git-Stand vor diesem Commit.
              (Der Zustand „niemand da" bleibt beschriftet, ueber die
              Statuszeile „Scannt den Code um beizutreten".) */}
          {nested ? (
          /* AUSSER-WERTUNG-ANFANG: CozyArena-Fraktionskarten, nur im Arena-Modus */

            /* 2026-07-01 (Idee 2): Eltern-Karten. Jede zeigt Avatar + Label +
               „X/3"-Pill + kleine Sub-Team-Namen-Chips. */
            <div style={{
              gridColumn: 2,
              display: 'grid',
              // 2026-07-03 (Wolf): 2 Spalten × 4 Reihen (statt 4×2) — größere,
              // breitere Karten, Namen sitzen mit viel Luft, Wappen prominenter.
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 'clamp(10px, 1.2cqw, 18px)',
            }}>
              {nestedGroups.map((g, i) => (
                <div key={g.avatarId} style={{
                  padding: 'clamp(12px, 1.4cqh, 18px) clamp(14px, 1.5cqw, 20px)',
                  borderRadius: isThemed() ? 'var(--qq-card-radius)' : 20,
                  background: isThemed() ? cardBg : (arenaCardBg ?? 'rgba(246, 239, 230,0.04)'),
                  border: isThemed() ? 'var(--qq-card-border)' : '1px solid rgba(246, 239, 230,0.09)',
                  borderLeft: `4px solid ${g.color}`,

                  display: 'flex', alignItems: 'center', gap: 'clamp(12px, 1.3cqw, 18px)',
                  minWidth: 0, position: 'relative', minHeight: 'clamp(76px, 8.2cqh, 104px)',
                  animation: `teamCardIn 0.5s var(--qq-ease-bounce) ${0.35 + i * 0.06}s both`,
                }}>
                  {/* Count-Pill oben rechts — reine Handy-Zahl der Fraktion. KEIN
                      „/3" mehr: der Soft-Cap ist dynamisch (bis 5 pro Fraktion bei
                      40 Teams), ein festes „/3" würde bei Überfüllung lügen
                      (Live-Event-Fix 2026-07-10). */}
                  <span style={{
                    position: 'absolute', top: 'clamp(8px, 1cqh, 12px)', right: 'clamp(10px, 1.1cqw, 14px)',
                    padding: '2px 9px', borderRadius: 999,
                    background: `${g.color}22`, border: `1px solid ${g.color}66`,
                    color: g.color, fontWeight: 900, fontSize: 'clamp(11px, 1.1cqw, 15px)',
                    fontVariantNumeric: 'tabular-nums',
                  }}>{g.subs.length}</span>
                  <FactionCrest avatarId={g.avatarId} width={'clamp(48px, 5cqw, 68px)'} style={{ flexShrink: 0 }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{
                      // 2026-07-04 (Wolf 'Lobby-Namen vom Sofa schwer lesbar'): +~20%.
                      fontWeight: 900, fontSize: 'clamp(19px, 2cqw, 28px)',
                      color: isThemed() ? 'var(--qq-card-text)' : 'var(--qq-text)',
                      // Konzept-Namen sind kurz + bekannt → KEINE Silbentrennung
                      // (kein QQ_TEAM_NAME_WRAP). Umbruch nur an Leerzeichen; die
                      // erste Zeile hält Abstand zur „X/3"-Pill (paddingRight).
                      lineHeight: 1.12, whiteSpace: 'normal', wordBreak: 'normal',
                      overflowWrap: 'break-word', hyphens: 'none', WebkitHyphens: 'none',
                      paddingRight: 'clamp(30px, 3.2cqw, 44px)',
                    }} title={g.label}>{g.label}</div>
                    {/* Fraktions-Motto (Cozy Universe) */}
                    <div style={{
                      fontSize: 'clamp(11px, 1.1cqw, 14px)', fontWeight: 700, fontStyle: 'italic',
                      color: 'var(--qq-text-muted)', marginTop: 3, lineHeight: 1.15,
                    }}>„{qqMegaFactionMotto(g.avatarId, de ? 'de' : 'en')}"</div>
                    {/* Faction-Modell (Wolf 2026-07-02): KEINE Sub-Team-Namen auf
                        dem Beamer — nur anonyme Handy-Dots (verbunden = gefüllt).
                        Die Sub-Team-Identität lebt auf dem eigenen /team-Handy. */}
                    <div style={{ marginTop: 7, display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                      {g.subs.map(st => (
                        <span key={st.id} style={{
                          width: 'clamp(10px, 1cqw, 14px)', height: 'clamp(10px, 1cqw, 14px)', borderRadius: '50%',
                          background: st.connected ? g.color : 'transparent',
                          border: `2px solid ${st.connected ? g.color : 'rgba(246, 239, 230,0.3)'}`,
                          boxShadow: st.connected ? `0 0 8px ${g.color}88` : 'none',
                        }} />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          /* AUSSER-WERTUNG-ENDE (CozyArena-Fraktionskarten) */
          ) : (
            <div style={{
              gridColumn: 2,
              display: 'grid',
              // Standard 2-spaltig; Groß-Modus/viele Teams → auto-fill dichte
              // Chips (25 Teams passen so in ~4-5 Spalten ohne Scroll).
              // 2026-08-23 (Wolf: „joined teams und all set here we go, wirkt
              // nicht mittig"). Gemessen: die Spalte lief von 591 bis 1637,
              // Mitte 1114 — Kopf- und Fusszeile sassen also exakt mittig auf
              // ihrer KISTE. Die Tinte der Karten endete aber schon bei ~1480,
              // weil die Karten auf volle Spaltenbreite gedehnt waren und ihr
              // Inhalt sie nicht fuellt. Optische Mitte ~1037, also rund 77 px
              // Versatz. Das Auge zentriert auf die Tinte, nicht auf die Kiste.
              // `width: max-content` laesst das Gitter nur so breit werden wie
              // sein Inhalt; die 1fr-Spalten bleiben dabei gleich breit (beide
              // so breit wie die breiteste Karte). Damit fallen Kiste und Tinte
              // zusammen und alle drei Zeilen stehen auf derselben Mitte.
              // 2026-08-23, zweiter Anlauf. `width: max-content` hat die Kiste
              // an die Tinte gebunden und damit das Zentrierungsproblem
              // geloest — aber die Tinte haengt an den TEAMNAMEN. Bei null
              // Teams war der Block schmal, mit jedem Beitritt wuchs er, und
              // der QR daneben wanderte mit. Ein Element, das waehrend des
              // Einloggens ueber die Wand rutscht, ist schlimmer als ein
              // Element, das ein paar Pixel Luft rechts hat.
              // Feste Spaltenbreite statt max-content: der Block ist damit von
              // null bis acht Teams gleich breit und gleich hoch, und Kopfzeile
              // wie Statuszeile sitzen ueber derselben Mitte. Zu lange Namen
              // kuerzen mit Auslassungspunkten, wie sie es schon immer tun.
              marginInline: 'auto',
              gridTemplateColumns: veryMany
                ? 'repeat(auto-fill, minmax(clamp(150px, 15cqw, 210px), 1fr))'
                : 'repeat(2, clamp(300px, 26cqw, 470px))',
              // 2026-08-23 (Wolf: „nutze den raum und machs vom spacing gerne
              // nicht zu klein"): der Abstand war auf 10 px festgenagelt,
              // sobald mehr als sechs Teams da waren — also genau dann, wenn
              // die Buehne am vollsten aussieht und Luft am meisten hilft.
              gap: veryMany ? 'clamp(6px, 0.7cqw, 10px)' : 'clamp(14px, 1.8cqh, 30px)',
            }}>
              {/* 2026-08-23 (Wolf: leere Plaetze zeigen, „ja"): ein normaler
                  Raum hat genau acht Slots (QQ_AVATARS, Backend deckelt bei
                  acht ausserhalb des Gross-Modus). Die freien werden als dünn
                  umrissene Kachel ohne Text mitgezeichnet.
                  Der Gewinn ist nicht nur „noch Platz frei": der Block hat
                  damit von der ersten Sekunde an DIESELBE Hoehe. Vorher wuchs
                  er bei jedem Beitritt, und weil der QR daneben an dieser Hoehe
                  haengt, sprang die halbe Seite mit. */}
              {[...s.teams, ...Array.from({ length: Math.max(0, LOBBY_SLOTS - teamCount) }, () => null)].map((t, i) => {
                const compact = teamCount > 6;
                if (!t) {
                  return (
                    // 2026-08-23: die Deckkraft steckt IM Randwert, nicht in
                    // einem opacity-Deckel darueber. Erster Versuch war
                    // `opacity: 0.16` auf `var(--qq-hairline)` — und die
                    // Haarlinie hat selbst nur 0.10 Alpha, macht 0.016. Der
                    // Platzhalter war im Bild schlicht nicht vorhanden.
                    // Jetzt gemessen: 0.14 Creme auf dem Grund #120F18 ergibt
                    // rund 2.6:1. Sichtbar, ohne mit den belegten Plaetzen um
                    // Aufmerksamkeit zu streiten.
                    <div key={`slot-${i}`} aria-hidden style={{
                      display: 'flex', alignItems: 'center',
                      gap: 'clamp(8px, 1cqw, 14px)',
                    }}>
                      <div style={{
                        height: veryMany
                          ? 'clamp(38px, 3.6cqw, 52px)'
                          : 'clamp(72px, 6.2cqw, 96px)',
                        aspectRatio: '1', flexShrink: 0,
                        borderRadius: 'var(--qq-team-mark-radius, 16%)',
                        // 2026-08-24 (2a): keine gestrichelten Raender. Ein
                        // leerer Platz ist auf der Buehne eine ruhige Flaeche,
                        // kein Bauzaun.
                        border: istBuehne ? '1.5px solid var(--qq-hairline)' : '2px dashed rgba(246, 239, 230, 0.14)',
                        background: istBuehne ? 'rgba(246,239,230,0.03)' : undefined,
                      }} />
                    </div>
                  );
                }
                const isFreshJoin = waveIds.has(t.id);
                // Schon mal gerendert? Dann KEINE Entry-Animation mehr feuern,
                // sonst flackert die Karte beim Wave-End (Animation-Property
                // wechselt von teamJoinWave → teamCardIn → opacity:0-Frame).
                const wasSeen = seenTeamIdsRef.current.has(t.id);
                const cardPadding = veryMany
                  ? 'clamp(8px, 1cqh, 12px) clamp(10px, 1.1cqw, 15px)'
                  : compact
                    ? 'clamp(16px, 2cqh, 24px) clamp(20px, 2.2cqw, 28px)'
                    : 'clamp(18px, 2.2cqh, 26px) clamp(22px, 2.4cqw, 30px)';
                return (
                  <div key={t.id} style={{
                    // Quirks: Kachel bündig links über die volle Höhe → Card-Padding
                    // wandert in die Text-Spalte, Card clippt die Kachel-Ecken.
                    padding: quirkSet ? 0 : cardPadding,
                    overflow: quirkSet ? 'hidden' : undefined,
                    borderRadius: isThemed() ? 'var(--qq-card-radius)' : (compact ? 18 : 22),
                    // 2026-06-28 (Beamer-Review): einheitliche, ruhige Karte mit
                    // 4px-Farb-Akzent LINKS statt voll-bunter Rahmen. Team-Farbe
                    // lebt nur noch im Akzent + Avatar-Disc → weniger Color-Noise,
                    // Namen lesen sich auf neutralem BG besser.
                    // Quirks (2026-07-29, Wolf 'ausfüllend machen ohne den bg'): die
                    // farbige Kachel trägt die Identität voll → dunkle Zeilen-Karte
                    // (bg/border/shadow) weg, Kachel + Name schweben auf dem Seiten-BG.
                    // Rund-Disc-Sets behalten die Karte (Struktur/Gruppierung).
                    background: quirkSet ? 'transparent' : (isThemed() ? cardBg : (arenaCardBg ?? 'rgba(246, 239, 230,0.04)')),
                    border: quirkSet ? 'none' : (isThemed() ? 'var(--qq-card-border)' : '1px solid rgba(246, 239, 230,0.09)'),
                    // 2026-07-01 (Wolf Mega-Event): bei vielen Teams wiederholen sich
                    // die 8 Slot-Farben → Farb-Border wäre Noise. Neutral, nur der
                    // Avatar trägt die Identität.
                    // Quirks tragen die Farbe in der Kachel → kein farbiger Akzent.
                    borderLeft: quirkSet
                      ? 'none'
                      : (veryMany
                        ? (isThemed() ? 'var(--qq-card-border)' : '1px solid rgba(246, 239, 230,0.09)')
                        : `4px solid ${t.color}`),
                    boxShadow: quirkSet ? 'none' : 'none',
                    // --gc: Glow-Farbe für den Join-Pop-Flash (Beamer-Review-Spec).
                    ['--gc' as string]: `${t.color}99`,
                    display: 'flex', alignItems: 'center',
                    gap: quirkSet ? 0 : (veryMany ? 'clamp(8px, 0.9cqw, 12px)' : compact ? 'clamp(14px, 1.5cqw, 20px)' : 'clamp(14px, 1.6cqw, 20px)'),
                    // Join-Feedback: frische Teams poppen rein (scale .82→1.04→1 +
                    // Glow-Flash, 0.52s). Bereits gesehene Teams: keine Animation
                    // (sonst Flacker beim Re-Render). Erst-Render: sanfter Stagger.
                    animation: isFreshJoin
                      ? 'qqLobbyJoinPop 0.52s cubic-bezier(0.34,1.56,0.64,1) both'
                      : wasSeen
                        ? undefined
                        : `teamCardIn 0.5s var(--qq-ease-bounce) ${0.4 + i * 0.06}s both`,
                    transition: 'box-shadow 0.6s ease, border-color 0.6s ease',
                    minWidth: 0,
                    position: 'relative',
                  }}>
                    {quirkSet ? (
                      // Kachel füllt die volle Kartenhöhe bündig links (kein Padding).
                      //
                      // 2026-08-23, REGRESSION gefixt. Vorher stand hier nur
                      // `alignSelf: 'stretch'` + `aspectRatio: 1` ohne Hoehe.
                      // Das funktioniert nur, solange die Avatar-Komponente
                      // KEINE eigene Breite mitbringt: bei cozyQuirks liegt das
                      // Bild `position: absolute; inset: 0` und traegt damit
                      // 0 px zur max-content-Breite bei, also loest
                      // `aspect-ratio` die Breite aus der gestreckten Hoehe.
                      // Der CozyQuiz-Standardsatz rendert aber ueber
                      // ImageAvatar mit einem normalen <img> — und dessen
                      // INTRINSISCHE Groesse ist 512 x 512. Gemessen im
                      // Browser: Kachel 512 x 512 in einer 518 px breiten
                      // Karte, Textspalte auf 56 px gequetscht, das Gitter
                      // 2078 px hoch in einer 990 px hohen Buehne.
                      // Ursache war meine Aenderung an `isQuirkTileSet` vom
                      // 2026-08-22 (e1a05215), die den Standardsatz in diesen
                      // Zweig geholt hat, ohne dass ich die Lobby danach im
                      // Bild geprueft habe.
                      // Eine definite Hoehe macht `stretch` wirkungslos (es
                      // greift nur bei auto) und `aspect-ratio` loest die
                      // Breite verlaesslich aus ihr. Die Karte ist damit so
                      // hoch wie die Kachel, die Kachel sitzt weiter buendig
                      // links, und kein Bild kann mehr seine Rohgroesse
                      // durchdruecken.
                      <div style={{
                        // 2026-08-23, zweiter Anlauf. Der gruene Ring aus dem
                        // Quiz ist hier wieder RAUS, und zwar aus einem
                        // gemessenen Grund, nicht aus Geschmack:
                        // `connected` wird im Backend beim Anlegen des Teams
                        // auf true gesetzt (qqRooms.ts, qqAddTeam), und ein
                        // Team taucht in der Lobby erst auf, NACHDEM es Name
                        // und Avatar gewaehlt hat. Ein sichtbares Team ist also
                        // immer verbunden. Der Ring waere bei jedem Team vom
                        // ersten Bild an gruen und ginge nur bei einem
                        // Wlan-Abriss aus — ein Zustand mit genau einem Wert
                        // ist kein Zustand, sondern Dekoration (Regel 5).
                        // Es gibt im /team auch keinen „Ich bin bereit"-Knopf,
                        // der ihm eine zweite Bedeutung geben koennte.
                        // Was BLEIBT, ist die Gegenrichtung: ein Handy, das
                        // rausfliegt, wird blass und grau. Das ist selten und
                        // sagt deshalb etwas.
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                        opacity: t.connected ? 1 : 0.45,
                        filter: t.connected ? 'none' : 'grayscale(1)',
                        transition: 'opacity 0.45s ease, filter 0.45s ease',
                        // 2026-08-23: NICHT mehr von `compact` (also von der
                        // Teamzahl) abhaengig. Sonst schrumpfen ab dem siebten
                        // Team alle Kacheln, der Block wird niedriger und der
                        // QR daneben springt mit — genau das, was die festen
                        // Slots verhindern sollen.
                        // Deckel 96 statt 104: das Element aus QR + Kachelblock
                        // ist so breit wie die Buehne hergibt. Bei 104 mass es
                        // 1634 px gegen 1620 px verfuegbare Breite und rutschte
                        // 7 px in den Sicherheitsrand. Gemessen mit 96: 1602.
                        height: veryMany
                          ? 'clamp(38px, 3.6cqw, 52px)'
                          : 'clamp(72px, 6.2cqw, 96px)',
                        boxSizing: 'content-box',
                        aspectRatio: '1',
                        marginLeft: quirkSet ? 'clamp(8px, 1cqw, 14px)' : 0,
                      }}>
                        <QQTeamAvatar avatarId={t.avatarId} teamEmoji={t.emoji} teamId={t.id} size="100%" />
                      </div>
                    ) : (
                      <QQTeamAvatar avatarId={t.avatarId} teamEmoji={t.emoji} teamId={t.id} size={veryMany ? 'clamp(38px, 3.6cqw, 52px)' : compact ? 'clamp(56px, 5.4cqw, 76px)' : 'clamp(64px, 6cqw, 88px)'} style={{ flexShrink: 0 }} />
                    )}
                    {/* 2026-06-28 (Beamer-Review 'kein Emoji'): Wink-Hand 👋 raus —
                        das Join-Feedback trägt jetzt der Card-Pop + Glow-Flash. */}
                    <div style={{ minWidth: 0, flex: 1, padding: quirkSet ? cardPadding : undefined }}>
                      <div style={{
                        fontWeight: 900,
                        // 2026-05-12 (Wolf 'teamnamen die mit einem buchstaben
                        // in die 2. reihe gehen vermeiden'): EINZEILIG mit
                        // Ellipsis statt 2-Zeilen-Wrap. Lange Namen werden
                        // entweder bei >16 chars kleiner geschrieben oder am
                        // Ende mit „…" abgeschnitten. Vermeidet die haessliche
                        // 1-Buchstaben-Umbruch-Situation. Font fuer lange
                        // Namen wieder etwas hochgezogen (16-24 → 17-25) damit
                        // die Karten gleichmaessiger gross wirken.
                        // 2026-07-04 (Wolf 'Lobby-Namen vom Sofa schwer lesbar'):
                        // alle Stufen ~+15-20% fuer Beamer/TV-Distanz.
                        fontSize: veryMany
                          ? (t.name.length > 14 ? 'clamp(15px, 1.5cqw, 20px)' : 'clamp(17px, 1.7cqw, 23px)')
                          : t.name.length > 16
                            ? (compact ? 'clamp(18px, 1.85cqw, 25px)' : 'clamp(19px, 2cqw, 28px)')
                            : (compact ? 'clamp(20px, 2.1cqw, 29px)' : 'clamp(22px, 2.3cqw, 33px)'),
                        // 2026-06-28 (Beamer-Review): Team-Name weiß statt Team-Farbe
                        // (Lesbarkeit; Farbe lebt im Card-Akzent + Avatar).
                        color: isThemed() ? 'var(--qq-card-text)' : 'var(--qq-text)',
                        lineHeight: 1.15,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }} title={t.name}>
                        {t.name}
                      </div>
                      {/* 2026-08-23: „● bereit" / „○ offline" ist raus. Der
                          gruene Rahmen um die Kachel sagt dasselbe, und Regel
                          null verlangt, den Zustand zu ZEIGEN statt ihn zu
                          beschriften. Bei acht Teams standen hier acht Mal
                          dieselben sechs Buchstaben. */}
                      {/* 2026-05-06 (Wolf 'in der Lobby anzeigen wenn Team mit
                          Code eingeloggt ist zum X. Mal dabei, willkommen
                          zurueck'): Stamm-Code-Returner-Hint. gamesPlayed wird
                          von Backend async via getQQRegularTeam populiert
                          nach qq:joinTeam. */}
                      {!veryMany && (t.gamesPlayed ?? 0) > 0 && (
                        <div style={{
                          marginTop: 4,
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '3px 10px', borderRadius: 'var(--qq-pill-radius)',
                          // 2026-08-24 (2a): Teamfarbe lebt auf der Kachel, nicht
                          // in der Schrift - und die Kachel steht direkt daneben.
                          // Der Grad lag bei 14 bis 16px, also unter dem Boden.
                          background: istBuehne ? 'rgba(246,239,230,0.05)' : `${t.color}1c`,
                          border: istBuehne ? '1.5px solid var(--qq-hairline)' : `1px solid ${t.color}55`,
                          fontSize: istBuehne
                            ? (compact ? 'clamp(20px, 1.9cqw, 26px)' : 'clamp(22px, 2cqw, 28px)')
                            : (compact ? 'clamp(11px, 1cqw, 14px)' : 'clamp(12px, 1.1cqw, 16px)'),
                          fontWeight: 800,
                          color: istBuehne ? 'var(--qq-text-muted)' : t.color,
                          maxWidth: '100%',
                          animation: 'qqPauseEyebrowFloat 4s ease-in-out infinite',
                        }} title={de
                          ? `${qqPlural(t.gamesPlayed ?? 0, 'Spiel', 'Spiele')} · ${qqPlural(t.wins ?? 0, 'Sieg', 'Siege')}`
                          : `${qqPlural(t.gamesPlayed ?? 0, 'game', 'games')} · ${qqPlural(t.wins ?? 0, 'win', 'wins')}`}>
                          {/* 2026-06-28 (Beamer-Review 'kein Emoji'): 👋 raus. */}
                          {de
                            ? `Willkommen zurück: ${t.gamesPlayed}. Mal dabei`
                            : `Welcome back: visit #${t.gamesPlayed}`}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Dynamic status — 2026-06-28 (Beamer-Review): kein Emoji, KEINE
              zweite Zahl (der Count lebt einmalig im „Angemeldete Teams"-Header).
              Stattdessen grüner Puls-Punkt + Readiness-Text wenn genug Teams da. */}
          {/* 2026-08-23 (Wolf: „alle bereit kann hier eigentlich auch raus, das
              braeuchte ich wenn dann in moderator"): die Zeile erscheint nur
              noch, solange etwas FEHLT. „Alle bereit" und „Gleich geht's los"
              sind weg — bei acht Kacheln auf der Wand sagt die Zeile nichts,
              was das Bild nicht schon sagt, und sie war die dritte gruene
              Sache auf derselben Folie.
              Der pulsende 11-px-Punkt davor faellt damit auch weg: rund
              (Regel 4), knapp ueber der Groessengrenze (Regel 7) und rein
              schmueckend (Regel 5).
              Der Gegenwert fuer Wolf gehoert ins Steuerpult, nicht auf die
              Buehne — dort will er wissen, ob alle verbunden sind, das
              Publikum nicht. */}
          {teamCount < 2 && (
            <div style={{
              gridColumn: 2,
              fontSize: 'clamp(16px, 1.8cqw, 24px)', fontWeight: 900, textAlign: 'center',
              color: isThemed() ? 'var(--qq-accent)' : 'var(--qq-stage-brand)',
            }}>
              {teamCount === 0
                ? (de ? 'Scannt den Code um beizutreten' : 'Scan to join')
                : (de ? 'Noch 1 Team fehlt!' : '1 more team needed!')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
