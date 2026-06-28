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
import { useLangFlip, COZY_CARD_BG } from '../cozyQuizShared';
import { Fireflies, EurovisionHearts } from './CozyQuizAmbient';
import { QQTeamAvatar } from './QQTeamAvatar';
import { wakeTeamAvatar } from '../avatarAwake';
import { AnimatedCozyWolf, SpeechBubble, type Slogan } from '../pages/QQBeamerPage';
import { isThemed } from '../qqTheme';

// WolfLobbyGreeter — kleiner Wolf top-right in der Lobby, winkt hereinkommende
// Teams herein. Idle: 'QR-Code scannen!' / 'Genau den da!' / etc. Wenn Parent
// `welcomedTeamName` setzt (kommt von welcomeTeamId in LobbyView, ~3.2s aktiv
// nach Team-Join), uebernimmt 'Hallo {teamName}!' bis zum Timeout, dann zurueck
// zur Idle-Rotation.
function WolfLobbyGreeter({ lang, welcomedTeamName, eurovisionMode }: {
  lang: 'de' | 'en';
  welcomedTeamName: string | null;
  /** 2026-05-07 (Wolf-ESC): wenn true, Wolf haelt EU-Flagge statt Daumen hoch. */
  eurovisionMode?: boolean;
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
      <AnimatedCozyWolf
        widthCss="clamp(140px, 13cqw, 200px)"
        mode={eurovisionMode ? 'flagge' : 'daumen'}
        speaking={speakingNow}
        wink={!eurovisionMode && isWelcoming}
        mirror
      />
    </div>
  );
}
export function LobbyView({ state: s }: { state: QQStateUpdate }) {
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
  const connectedCount = s.teams.filter(t => t.connected).length;

  // QR size responsive to viewport height (avoid clipping on laptops)
  const qrSize = 'min(44cqh, 420px)';

  // 2026-05-07 (Wolf-Sidequest): pro-Draft optionales Lobby-BG-Bild — wird
  // hinter den Standard-Glow-Layer gelegt, damit das Bild dezent durchscheint
  // ohne dass die UI darunter unlesbar wird. Kein BG-URL = Standard bleibt.
  const lobbyBgUrl = s.theme?.lobbyBackgroundUrl;

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      // 2026-05-12 (Wolf 'safe-margin sollte ja im ganzen quiz drin sein'):
      // padding-vertikal jetzt floor auf var(--qq-safe-margin). horiz bleibt
      // groesser (Cards in der Lobby brauchen mehr Atem).
      padding: 'max(var(--qq-safe-margin), clamp(16px, 2.5cqh, 32px)) clamp(24px, 3cqw, 56px)',
      position: 'relative', overflow: 'hidden',
      gap: 'clamp(10px, 1.5cqh, 20px)',
      minHeight: 0,
      // Cozy-warmer Hintergrund (User-Wunsch 2026-04-28: nicht so schwarz, an
      // Setup-Look angleichen). Doppelter Radial-Gradient: oben-mitte amber-Glow,
      // unten-rechts indigo-Glow auf #0A0814-Base — exakt wie QQModeratorPage.
      // 2026-06-24 (Skin): aktiver Skin → flacher Skin-BG statt Pink-Glow-Dunkel.
      background: isThemed()
        ? 'var(--qq-bg)'
        : 'radial-gradient(ellipse at 50% -10%, rgba(236,72,153,0.10), transparent 55%), ' +
        'radial-gradient(ellipse at 85% 110%, rgba(99,102,241,0.08), transparent 55%), ' +
        'radial-gradient(ellipse at 15% 80%, rgba(244,114,182,0.05), transparent 50%), ' +
        '#0A0814',
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
            opacity: 0.7,
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
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
      <div style={{
        position: 'absolute',
        right: 'clamp(20px, 2.5cqw, 48px)',
        top: 'clamp(16px, 2.5cqh, 32px)',
        zIndex: 7,
        pointerEvents: 'none',
        animation: 'panelSlideIn 0.7s var(--qq-ease-bounce) 0.5s both',
      }}>
        <WolfLobbyGreeter
          lang={de ? 'de' : 'en'}
          welcomedTeamName={welcomedTeam?.name ?? null}
          eurovisionMode={s.theme?.eurovisionMode}
        />
      </div>

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
          border: `4px solid ${welcomedTeam.color}`,
          boxShadow: `0 0 80px ${welcomedTeam.color}aa, 0 18px 60px rgba(0,0,0,0.7)`,
          animation: 'qqWelcomeBanner 3.2s var(--qq-ease-out-cubic) both',
          pointerEvents: 'none',
          display: 'flex', alignItems: 'center', gap: 'clamp(24px, 3cqw, 44px)',
          maxWidth: '90cqw',
        }}>
          <QQTeamAvatar avatarId={welcomedTeam.avatarId} teamEmoji={welcomedTeam.emoji} teamId={welcomedTeam.id} size={'clamp(120px, 14cqw, 200px)'} style={{
            boxShadow: `0 0 32px ${welcomedTeam.color}aa`,
            flexShrink: 0,
          }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
            <div style={{
              fontSize: 'clamp(18px, 1.8cqw, 26px)', fontWeight: 900,
              color: welcomedTeam.color, letterSpacing: '0.22em', textTransform: 'uppercase',
              textShadow: `0 0 18px ${welcomedTeam.color}88`,
            }}>
              {de ? 'Willkommen' : 'Welcome'}
            </div>
            <div style={{
              fontFamily: fontFam,
              fontSize: 'clamp(56px, 7cqw, 120px)', fontWeight: 900,
              color: '#FFEFC9', lineHeight: 1.02,
              letterSpacing: '-0.005em',
              whiteSpace: 'nowrap',
              overflow: 'hidden', textOverflow: 'ellipsis',
              maxWidth: '70cqw',
              textShadow: `0 0 36px ${welcomedTeam.color}88`,
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
              : 'radial-gradient(ellipse at center, rgba(236,72,153,0.18) 0%, rgba(236,72,153,0.06) 45%, transparent 70%)',
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
            color: #EC4899;
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
                  fontFamily: "'Stinger Fit', 'Bricolage Grotesque', 'Inter', 'Nunito', system-ui, sans-serif",
                  fontSize: 'clamp(38px, 5.2cqw, 82px)',
                  fontWeight: 400,
                  letterSpacing: '0.04em',
                  color: '#FF2D7B',
                  // 2026-05-13 Kontrast-Audit: Pink-Glow weg, Dark-Halo + dezente
                  // Outline (Stinger Fit weight 400 verliert sonst auf Pink-BG).
                  textShadow: '0 4px 22px rgba(0,0,0,0.8), 0 2px 8px rgba(0,0,0,0.7)',
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
                  textShadow: '0 2px 10px rgba(0,0,0,0.5)',
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
                      filter: 'drop-shadow(0 0 24px rgba(236,72,153,0.6)) drop-shadow(0 4px 12px rgba(0,0,0,0.55))',
                    }}
                  />
                </span>
              </div>
            );
          }

          const wordmark = customWelcome.length > 0 ? customWelcome : 'COZYQUIZ';
          // Stagger reduziert sich proportional bei langen Texten damit Wave
          // nicht ueber 4s laeuft.
          const stagger = Math.max(0.03, 0.07 * (8 / Math.max(wordmark.length, 8)));
          return (
            <div
              className="cq-wordmark"
              style={{
                // 2026-05-08 (Wolf-Wunsch 'logo text in standard wie eurovision'):
                // Stinger Fit als Wordmark-Font auch fuer Standard-Drafts.
                // Eurovision behaelt Hot-Pink (#FF2D7B), Standard nutzt Brand-
                // Pink (#EC4899). Wave-Animation pro Buchstabe bleibt erhalten.
                fontFamily: "'Stinger Fit', 'Bricolage Grotesque', 'Inter', 'Nunito', system-ui, sans-serif",
                fontWeight: 400,
                letterSpacing: '0.04em',
                fontSize: wordmark.length > 14 ? 'clamp(40px, 6.5cqw, 100px)' : 'clamp(56px, 9cqw, 140px)',
                // Skin: Wortmark-Farbe folgt dem Skin (--qq-title), Font/Groesse
                // bleiben = Wiedererkennung. ESC behaelt Hot-Pink.
                color: s.theme?.eurovisionMode ? '#FF2D7B' : isThemed() ? 'var(--qq-title)' : '#EC4899',
                // 2026-05-13 Kontrast-Audit ESC: Pink-Glow weg ueber 5.png-BG.
                textShadow: s.theme?.eurovisionMode
                  ? '0 4px 22px rgba(0,0,0,0.8), 0 2px 8px rgba(0,0,0,0.7)'
                  : isThemed()
                    ? 'none'
                    : '0 3px 18px rgba(0,0,0,0.65), 0 0 32px rgba(236,72,153,0.40)',
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
          );
        })()}
      </div>

      {/* ── Center: 2-column layout — QR left, Teams right.
          Symmetrische Ränder: QR bündig links, Teams-Grid bündig rechts,
          gleicher Abstand zum Viewport-Rand auf beiden Seiten. ── */}
      <div style={{
        flex: 1, display: 'grid',
        gridTemplateColumns: 'auto 1fr',
        alignItems: 'center',
        columnGap: 'clamp(24px, 3cqw, 48px)',
        position: 'relative', zIndex: 5,
        width: '100%',
        padding: '0 clamp(24px, 4cqw, 80px)',
        minHeight: 0,
      }}>
        {/* Left: QR Code */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'clamp(10px, 1.5cqh, 18px)',
          flexShrink: 0, justifySelf: 'start',
          animation: 'phasePop 0.6s var(--qq-ease-bounce) 0.3s both',
        }}>
          <div style={{
            background: '#ffffff', borderRadius: isThemed() ? 'var(--qq-card-radius)' : 24, padding: 'clamp(14px, 2cqh, 24px)',
            // C5 „Scan-me"-Breath: sanftes gruenes Box-Shadow-Puls signalisiert Interaktivitaet.
            animation: 'qrScanBreath 3s ease-in-out infinite, qrGlow 3s ease-in-out infinite',
            boxShadow: '0 16px 64px rgba(0,0,0,0.5), 0 0 50px rgba(255,255,255,0.1)',
            width: qrSize, height: qrSize, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <QRCodeSVG value={joinUrl} size={256} bgColor="#ffffff" fgColor="#0A0814" level="M"
              style={{ width: '100%', height: '100%' }} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: 'clamp(18px, 2cqw, 28px)', color: 'var(--qq-card-text)', fontWeight: 900, marginBottom: 4,
            }}>
              {de ? 'Scannen & mitspielen!' : 'Scan & join!'}
            </div>
            <div style={{
              fontSize: 'clamp(13px, 1.4cqw, 18px)', color: 'var(--qq-text-muted)', fontFamily: 'monospace',
              background: cardBg, padding: '6px 16px', borderRadius: 'var(--qq-pill-radius)',
              border: '1px solid var(--qq-hairline)',
              display: 'inline-block',
            }}>
              {joinUrl.replace('https://', '').replace('http://', '')}
            </div>
          </div>
          {/* CozyWolf Branding — prominent unterhalb des QR-Codes */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 18px', borderRadius: 'var(--qq-pill-radius)',
            background: isThemed() ? 'var(--qq-surface)' : 'linear-gradient(135deg, rgba(236,72,153,0.16), rgba(236,72,153,0.10))',
            border: isThemed() ? '1.5px solid var(--qq-hairline)' : '1.5px solid rgba(236,72,153,0.35)',
            boxShadow: isThemed() ? 'none' : '0 4px 18px rgba(0,0,0,0.35), 0 0 18px rgba(236,72,153,0.12)',
          }}>
            <img
              src="/logo.png"
              alt=""
              style={{ width: 28, height: 28, objectFit: 'contain', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))' }}
            />
            <span style={{
              fontSize: 'clamp(12px, 1.1cqw, 15px)', fontWeight: 900,
              color: isThemed() ? 'var(--qq-text-muted)' : '#cbd5e1', letterSpacing: '0.04em',
            }}>
              {de ? 'präsentiert von' : 'presented by'}
            </span>
            <span style={{
              fontSize: 'clamp(14px, 1.4cqw, 18px)', fontWeight: 900,
              color: isThemed() ? 'var(--qq-accent)' : '#EC4899', letterSpacing: '0.04em',
              textShadow: isThemed() ? 'none' : '0 1px 2px rgba(0,0,0,0.6)',
            }}>
              CozyWolf
            </span>
          </div>
        </div>

        {/* Right: Teams + status — nimmt verfügbare Breite voll aus */}
        <div style={{
          minWidth: 0, width: '100%',
          display: 'flex', flexDirection: 'column', gap: 'clamp(10px, 1.5cqh, 18px)',
          alignItems: 'stretch', justifyContent: 'center',
        }}>
          {/* 2026-06-28 (Beamer-Review): einmaliger Count als Pink-Chip; tickt
              per key-Remount bei jedem neuen Team (Count-Tick). */}
          <div style={{
            fontSize: 'clamp(14px, 1.5cqw, 20px)', fontWeight: 900,
            color: 'var(--qq-text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
          }}>
            <span style={{ opacity: 0.7 }}>{de ? 'Angemeldete Teams' : 'Joined Teams'}</span>
            <span key={teamCount} style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              minWidth: 'clamp(28px, 2.4cqw, 42px)', height: 'clamp(28px, 2.4cqw, 42px)',
              padding: '0 clamp(6px, 0.7cqw, 12px)', borderRadius: 11,
              background: isThemed() ? 'var(--qq-accent)' : '#EC4899',
              color: isThemed() ? '#ffffff' : '#1a0a14',
              fontSize: 'clamp(16px, 1.7cqw, 24px)', fontVariantNumeric: 'tabular-nums',
              animation: 'qqCountTick 0.4s cubic-bezier(0.34,1.56,0.64,1)',
            }}>{teamCount}</span>
          </div>

          {teamCount === 0 ? (
            // Empty-State: prominenter Hinweis mit wackelndem Pfeil zum QR-Code links.
            // Loest 'Beamer-Lobby zeigt bei 0 Teams nichts Auffaelliges' aus dem
            // UI-Polish-Audit (C1). Pfeil ist Marken-Gold, damit er als Akzent zwischen
            // QR (links) und kommendem Team-Grid (rechts) ueber dem Slate-Hintergrund
            // klar liest.
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 'clamp(14px, 2cqw, 26px)',
              padding: 'clamp(28px, 4cqh, 56px) clamp(20px, 3cqw, 40px)',
              border: '2px dashed rgba(var(--qq-accent-rgb),0.4)', borderRadius: isThemed() ? 'var(--qq-card-radius)' : 16,
              background: 'linear-gradient(135deg, rgba(var(--qq-accent-rgb),0.06), rgba(var(--qq-accent-rgb),0.04))',
              boxShadow: '0 0 40px rgba(var(--qq-accent-rgb),0.12)',
            }}>
              {/* 2026-06-28 (Beamer-Review 'kein Emoji'): OS-Hand 👈 → schlichter
                  Marken-Pfeil in Akzentfarbe (zeigt zum QR links). */}
              <span style={{
                fontSize: 'clamp(40px, 5.4cqw, 72px)', lineHeight: 1, fontWeight: 900,
                color: isThemed() ? 'var(--qq-accent)' : '#EC4899',
                animation: 'qqEmptyArrowNudge 1.6s ease-in-out infinite',
                display: 'inline-block', flexShrink: 0,
              }} aria-hidden>←</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, textAlign: 'center' }}>
                <span style={{
                  fontSize: 'clamp(20px, 2.4cqw, 32px)', fontWeight: 900,
                  // 2026-06-24 (Lesbarkeit): CTA-Text auf Seiten-BG → var(--qq-text)
                  // (sonst Akzent-blau auf Lila bei Neo-Brutal). Box-Tint = Akzent.
                  color: isThemed() ? 'var(--qq-title)' : '#EC4899', letterSpacing: '0.02em',
                  textShadow: isThemed() ? 'none' : '0 2px 12px rgba(236,72,153,0.3)',
                  animation: 'lobbyPulse 2.5s ease-in-out infinite',
                }}>
                  {de ? 'Scannt den QR-Code!' : 'Scan the QR code!'}
                </span>
                <span style={{
                  fontSize: 'clamp(14px, 1.5cqw, 20px)', fontWeight: 700,
                  color: 'var(--qq-text-muted)', letterSpacing: '0.06em',
                }}>
                  {de ? 'Eure Teams erscheinen hier.' : 'Teams appear here.'}
                </span>
              </div>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              // Immer 2-spaltig: 1-2 Teams = 2 Spalten (eine Zeile), 3-4 = 2×2,
              // 5-8 = 2×3 / 2×4. Hält Karten schön breit statt quetschig-schmal.
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              // 2026-05-10 (Spacing-Audit P2): Compact-Gap von 6 auf 10 bumpt —
              // bei 7-8 Teams verschmolzen die Cards auf 8 m Beamer-Distanz
              // optisch zu einem Block. 10 px hält sichtbare Atmung ohne dass
              // die Cards merklich schmaler werden.
              gap: teamCount > 6 ? 10 : 'clamp(8px, 1.2cqw, 14px)',
            }}>
              {s.teams.map((t, i) => {
                const compact = teamCount > 6;
                const isFreshJoin = waveIds.has(t.id);
                // Schon mal gerendert? Dann KEINE Entry-Animation mehr feuern,
                // sonst flackert die Karte beim Wave-End (Animation-Property
                // wechselt von teamJoinWave → teamCardIn → opacity:0-Frame).
                const wasSeen = seenTeamIdsRef.current.has(t.id);
                return (
                  <div key={t.id} style={{
                    padding: compact
                      ? 'clamp(16px, 2cqh, 24px) clamp(20px, 2.2cqw, 28px)'
                      : 'clamp(18px, 2.2cqh, 26px) clamp(22px, 2.4cqw, 30px)',
                    borderRadius: isThemed() ? 'var(--qq-card-radius)' : (compact ? 18 : 22),
                    // 2026-06-28 (Beamer-Review): einheitliche, ruhige Karte mit
                    // 4px-Farb-Akzent LINKS statt voll-bunter Rahmen. Team-Farbe
                    // lebt nur noch im Akzent + Avatar-Disc → weniger Color-Noise,
                    // Namen lesen sich auf neutralem BG besser.
                    background: isThemed() ? cardBg : 'rgba(255,255,255,0.04)',
                    border: isThemed() ? 'var(--qq-card-border)' : '1px solid rgba(255,255,255,0.09)',
                    borderLeft: `4px solid ${t.color}`,
                    boxShadow: '0 8px 22px rgba(0,0,0,0.28)',
                    // --gc: Glow-Farbe für den Join-Pop-Flash (Beamer-Review-Spec).
                    ['--gc' as string]: `${t.color}99`,
                    display: 'flex', alignItems: 'center',
                    gap: compact ? 'clamp(14px, 1.5cqw, 20px)' : 'clamp(14px, 1.6cqw, 20px)',
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
                    <QQTeamAvatar avatarId={t.avatarId} teamEmoji={t.emoji} teamId={t.id} size={compact ? 'clamp(56px, 5.4cqw, 76px)' : 'clamp(64px, 6cqw, 88px)'} style={{ flexShrink: 0 }} />
                    {/* 2026-06-28 (Beamer-Review 'kein Emoji'): Wink-Hand 👋 raus —
                        das Join-Feedback trägt jetzt der Card-Pop + Glow-Flash. */}
                    <div style={{ minWidth: 0, flex: 1 }}>
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
                        fontSize: t.name.length > 16
                          ? (compact ? 'clamp(16px, 1.65cqw, 22px)' : 'clamp(17px, 1.8cqw, 25px)')
                          : (compact ? 'clamp(18px, 1.9cqw, 26px)' : 'clamp(20px, 2.1cqw, 30px)'),
                        // 2026-06-28 (Beamer-Review): Team-Name weiß statt Team-Farbe
                        // (Lesbarkeit; Farbe lebt im Card-Akzent + Avatar).
                        color: isThemed() ? 'var(--qq-card-text)' : '#ffffff',
                        lineHeight: 1.15,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }} title={t.name}>
                        {t.name}
                      </div>
                      <div style={{
                        fontSize: compact ? 'clamp(13px, 1.2cqw, 16px)' : 'clamp(13px, 1.25cqw, 17px)',
                        fontWeight: 700, color: t.connected ? '#22C55E' : '#94a3b866',
                        marginTop: 4,
                      }}>
                        {t.connected ? (de ? '● bereit' : '● ready') : '○ offline'}
                      </div>
                      {/* 2026-05-06 (Wolf 'in der Lobby anzeigen wenn Team mit
                          Code eingeloggt ist zum X. Mal dabei, willkommen
                          zurueck'): Stamm-Code-Returner-Hint. gamesPlayed wird
                          von Backend async via getQQRegularTeam populiert
                          nach qq:joinTeam. */}
                      {(t.gamesPlayed ?? 0) > 0 && (
                        <div style={{
                          marginTop: 4,
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '3px 10px', borderRadius: 'var(--qq-pill-radius)',
                          background: `${t.color}1c`,
                          border: `1px solid ${t.color}55`,
                          fontSize: compact ? 'clamp(11px, 1cqw, 14px)' : 'clamp(12px, 1.1cqw, 16px)',
                          fontWeight: 800,
                          color: t.color,
                          maxWidth: '100%',
                          animation: 'qqPauseEyebrowFloat 4s ease-in-out infinite',
                        }} title={de
                          ? `${t.gamesPlayed} Spiele · ${t.wins ?? 0} Siege`
                          : `${t.gamesPlayed} games · ${t.wins ?? 0} wins`}>
                          {/* 2026-06-28 (Beamer-Review 'kein Emoji'): 👋 raus. */}
                          {de
                            ? `Willkommen zurück — ${t.gamesPlayed}. Mal dabei`
                            : `Welcome back — visit #${t.gamesPlayed}`}
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
          <div style={{
            fontSize: 'clamp(16px, 1.8cqw, 24px)', fontWeight: 900, textAlign: 'center',
            color: teamCount < 2 ? (isThemed() ? 'var(--qq-accent)' : '#EC4899') : '#22C55E',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            animation: teamCount >= 2 ? 'lobbyPulse 2.5s ease-in-out infinite' : undefined,
          }}>
            {teamCount >= 2 && (
              <span style={{
                width: 11, height: 11, borderRadius: '50%', flexShrink: 0,
                background: '#22C55E', boxShadow: '0 0 9px #22C55E',
                animation: 'qqTreePulse 1.6s ease-in-out infinite',
              }} />
            )}
            {teamCount === 0
              ? (de ? 'Scannt den Code um beizutreten' : 'Scan to join')
              : teamCount < 2
                ? (de ? 'Noch 1 Team fehlt!' : '1 more team needed!')
                : connectedCount === teamCount
                  ? (de ? "Alle bereit · gleich geht's los!" : "All set · here we go!")
                  : (de ? "Gleich geht's los!" : 'Almost ready!')}
          </div>
        </div>
      </div>
    </div>
  );
}
