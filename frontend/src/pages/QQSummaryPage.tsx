// Public Team-Summary-Seite — Spieler scannen nach dem Spiel den QR-Code
// auf dem Beamer, landen hier, wählen ihr Team, sehen eigene Stats + Feedback-
// Formular + nächste Quiz-Termine.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { teamDisplayName } from '../../../shared/quarterQuizTypes';
import { API_BASE } from '../api';
import { QQEmojiIcon } from '../components/QQIcon';
import { QQTeamAvatar } from '../components/QQTeamAvatar';
import { compareTeamsForRanking } from '../utils/qqTeamRanking';
import { TeamNameLabel } from '../components/TeamNameLabel';
import { AvatarSetProvider } from '../avatarSetContext';

type Lang = 'de' | 'en';

type SummaryTeam = {
  id: string;
  name: string;
  color: string;
  avatarId: string;
  // 2026-05-07: Spieler-gewaehltes Emoji (z.B. 🐙 statt Default-Slot-Emoji).
  emoji?: string;
  score: number;
  totalCells: number;
  largestConnected: number;
  correct: number;
  answered: number;
  jokersEarned: number;
  stealsUsed: number;
};

type Summary = {
  id: string;
  roomCode: string;
  playedAt: number;
  draftTitle: string;
  winner: string | null;
  phases: number;
  /** 2026-05-04 — gewaehltes Avatar-Theme zum Zeitpunkt des Spiels (Phase 2). */
  avatarSetId?: string;
  /** 2026-05-07 — Server-gewuerfelte Slot-Emojis bei 'all'-Set (8 Eintraege). */
  avatarSetEmojis?: string[] | null;
  teams: SummaryTeam[];
  funnyAnswers: Array<{ teamId: string; teamName: string; text: string; questionText: string }>;
  /** 2026-05-09 (Wolf): Final-Brett für Summary-Anzeige.
   *  cellOwners[r][c] = teamId | null. Kompakter Payload. */
  gridSize?: number;
  cellOwners?: Array<Array<string | null>>;
  /** 2026-05-09 (Wolf-Konsistenz): die 3 End-Awards aus dem Spiel — gleiche
   *  Ehrentitel wie der Recap-Strip auf der Thanks-Page. */
  endAwards?: {
    underdog?: string | null;
    meisterklauer?: string | null;
    meisterklauerCount?: number;
    speedy?: string | null;
    speedyAvgMs?: number;
  } | null;
  /** 2026-05-10 (Audit-P2): Eurovision-Mode durchreicht vom Backend, damit
   *  Summary-Page im ESC-Mode Hot-Pink statt Standard-Brand-Pink rendert. */
  eurovisionMode?: boolean;
};

// 2026-05-10 (Audit-P0 Brand-Refresh): brand-themed Farb-Helper analog
// QQBeamerPage.getBrandColors. Sorgt dafür dass Summary die richtige Pink-
// Variante (Standard #EC4899 vs ESC #FF2D7B) zieht statt Amber/Gold.
function summaryBrand(eurovisionMode?: boolean) {
  return eurovisionMode
    ? {
        pink:     '#FF2D7B',
        pinkRgb:  '255,45,123',
        pinkSoft: '#fde6f0',
        magenta:  '#C084FC',
      }
    : {
        pink:     '#EC4899',
        pinkRgb:  '236,72,153',
        pinkSoft: '#FBCFE8',
        magenta:  '#A21247',
      };
}

type UpcomingEvent = {
  id: string;
  date: string;
  time?: string;
  location: string;
  city?: string;
  link?: string;
  note?: string;
};

// ── Translations ───────────────────────────────────────────────────────────────
const T = {
  notFoundTitle: { de: 'Kein Ergebnis gefunden', en: 'No result found' },
  notFoundMsg:   { de: 'Dieses Spiel konnten wir nicht finden. Vielleicht war es zu lange her?',
                   en: 'We couldn\u2019t find this game. Maybe it was too long ago?' },
  gameRunningTitle: { de: 'Quiz l\u00e4uft noch', en: 'Quiz still running' },
  gameRunningMsg:   { de: 'Das Spiel ist noch nicht zu Ende. Scan den QR-Code nochmal am Schluss!',
                      en: 'The game isn\u2019t over yet. Scan the QR code again at the end!' },
  loadError:     { de: 'Oha, da ist was beim Laden schiefgegangen. Versuch es nochmal in ein paar Minuten.',
                   en: 'Oops, something went wrong loading. Try again in a few minutes.' },
  unknownError:  { de: 'Unbekannter Fehler.', en: 'Unknown error.' },
  loading:       { de: 'Lade eure Stats\u2026', en: 'Loading your stats\u2026' },

  whichTeam:     { de: 'Welches Team seid ihr?', en: 'Which team are you?' },
  rankShort:     { de: 'Platz', en: 'Rank' },
  fields:        { de: 'Felder', en: 'fields' },
  pickOther:     { de: '\u21A9 anderes Team w\u00E4hlen', en: '\u21A9 pick another team' },

  yourNumbers:   { de: 'Eure Zahlen', en: 'Your numbers' },
  // 2026-05-07 (Wolf-Bug 'GROESSTES GEBIET 17, FELDER 14 \u2014 kommt doof vor
  // Teilnehmenden'): largestConnected enthaelt Stack-Boni on top des
  // BFS-Maximums (siehe qqRooms.ts updateTerritories). Bei 14 Feldern + 3
  // Stack-Bonus = 17 Score \u2014 als 'Gr\u00F6\u00DFtes Gebiet' missverstaendlich.
  // Label auf 'Punktestand' / 'Score' geaendert \u2014 semantisch ehrlich.
  largestArea:   { de: 'Punktestand', en: 'Score' },
  fieldsTotal:   { de: 'Felder gesamt', en: 'Fields total' },
  correct:       { de: 'Richtig', en: 'Correct' },
  accuracy:      { de: 'Trefferquote', en: 'Accuracy' },
  jokersEarned:  { de: 'Joker verdient', en: 'Jokers earned' },
  stolen:        { de: 'Geklaut', en: 'Stolen' },
  pieces:        { de: 'St\u00FCck', en: 'pcs' },
  fieldsUnit:    { de: 'Felder', en: 'fields' },
  times:         { de: 'mal', en: 'times' },

  yourMoment:    { de: 'Euer Moment', en: 'Your moment' },
  funnyAnswer:   { de: '\uD83D\uDE02 Lustige Antwort', en: '\uD83D\uDE02 Funny answer' },
  question:      { de: 'Frage', en: 'Question' },

  finalStandings:{ de: 'Endstand', en: 'Final standings' },

  // Hero
  champion:      { de: 'Sieger', en: 'Winner' },

  // Place labels
  place:         { de: 'Platz', en: 'place' },

  // Feedback section
  feedbackTitle: { de: 'Feedback', en: 'Feedback' },
  thanksTitle:   { de: 'Danke! Ist angekommen.', en: 'Thanks! It arrived.' },
  thanksBugSub:  { de: 'Ich schau es mir an.', en: 'I\u2019ll look into it.' },
  thanksGenSub:  { de: 'Jeder Eintrag hilft mir, CozyQuiz besser zu machen.',
                   en: 'Every entry helps me make CozyQuiz better.' },

  fbWhatType:    { de: 'Was habt ihr f\u00FCr mich?', en: 'What do you have for me?' },
  fbType_feedback:{ de: 'Feedback', en: 'Feedback' },
  fbType_bug:    { de: 'Bug', en: 'Bug' },
  fbType_idea:   { de: 'Idee', en: 'Idea' },
  fbType_praise: { de: 'Lob', en: 'Praise' },

  fbPlayAgain:   { de: 'Nochmal spielen?', en: 'Play again?' },
  fbPA_yes:      { de: 'Sofort', en: 'Right now' },
  fbPA_maybe:    { de: 'Gerne mal', en: 'Sure, sometime' },
  fbPA_no:       { de: 'Eher nicht', en: 'Probably not' },

  fbFavCat:      { de: 'Lieblingskategorie heute?', en: 'Favorite category today?' },

  fbLength:      { de: 'Wie war die Spielzeit?', en: 'How was the game length?' },
  fbLen_short:   { de: 'Zu kurz', en: 'Too short' },
  fbLen_ok:      { de: 'Genau richtig', en: 'Just right' },
  fbLen_long:    { de: 'Zu lang', en: 'Too long' },

  fbStars:       { de: 'Wie viele Sterne insgesamt?', en: 'How many stars overall?' },

  fbSurprise:    { de: 'Was hat euch am meisten \u00FCberrascht?', en: 'What surprised you most?' },
  fbOptional:    { de: '(optional)', en: '(optional)' },
  fbSurprisePh:  { de: 'z.B. eine Antwort, eine Kategorie, ein Moment\u2026',
                   en: 'e.g. an answer, a category, a moment\u2026' },

  fbMainBug:     { de: 'Was ist schiefgelaufen?', en: 'What went wrong?' },
  fbMainIdea:    { de: 'Eure Idee', en: 'Your idea' },
  fbMainGen:     { de: 'Euer Feedback', en: 'Your feedback' },
  fbPhBug:       { de: 'Was ist passiert? Was hattet ihr gerade gemacht?',
                   en: 'What happened? What were you doing?' },
  fbPhIdea:      { de: 'Was w\u00FCrdet ihr gerne sehen?', en: 'What would you like to see?' },
  fbPhPraise:    { de: 'Was hat euch besonders Spa\u00DF gemacht?', en: 'What did you enjoy most?' },
  fbPhGen:       { de: 'Was fiel euch auf? Alles willkommen.',
                   en: 'What stood out? Anything goes.' },

  fbContact:     { de: 'Kontakt', en: 'Contact' },
  fbContactPh:   { de: 'Mail oder Instagram', en: 'Email or Instagram' },
  fbIntent_response:{ de: '\uD83D\uDCAC Nur falls R\u00FCckfrage', en: '\uD83D\uDCAC Only if you have questions' },
  fbIntent_date:    { de: '\uD83D\uDCC5 Termine bitte', en: '\uD83D\uDCC5 Send me dates' },
  fbIntent_booking: { de: '\uD83C\uDF99\uFE0F Quiz buchen', en: '\uD83C\uDF99\uFE0F Book a quiz' },

  fbErrEmpty:    { de: 'Ein paar Zeilen w\u00E4ren super.', en: 'A few lines would be great.' },
  fbErrServer:   { de: 'Server mochte das Feedback nicht.', en: 'Server didn\u2019t like the feedback.' },
  fbErrSend:     { de: 'Konnte nicht senden.', en: 'Could not send.' },

  fbSubmitting:  { de: 'Sende\u2026', en: 'Sending\u2026' },
  fbReportBug:   { de: '\uD83D\uDC1B Bug melden', en: '\uD83D\uDC1B Report bug' },
  fbSend:        { de: 'Absenden', en: 'Send' },

  // Categories
  cat_SCHAETZCHEN:   { de: 'Sch\u00E4tzchen', en: 'Close Call' },
  cat_MUCHO:         { de: 'Mu-Cho', en: 'Mu-Cho' },
  cat_BUNTE_TUETE:   { de: 'Bunte T\u00FCte', en: 'Mixed Bag' },
  cat_ZEHN_VON_ZEHN: { de: 'All In', en: 'All In' },
  cat_CHEESE:        { de: 'Schau mal!', en: 'Picture This' },

  // Upcoming events
  nextQuizzes:   { de: 'N\u00E4chste Quizze', en: 'Upcoming quizzes' },

  // Partner CTA
  partnerTitle:  { de: 'Quiz bei euch?', en: 'Quiz at your place?' },
  partnerHead:   { de: '\uD83D\uDC3A Ihr wollt CozyQuiz bei euch haben?',
                   en: '\uD83D\uDC3A Want CozyQuiz at your venue?' },
  partnerBody:   { de: 'Ob Kneipe, Event, Geburtstag oder Firmenfeier — ich komme mit Beamer, Stimme und guter Laune. Schreibt mir, ich mach euch ein Angebot.',
                   en: 'Pub, event, birthday or company party — I come with projector, voice and good vibes. Drop me a line, I\u2019ll send an offer.' },
  partnerMail:   { de: '\u2709\uFE0F Mail', en: '\u2709\uFE0F Mail' },
  partnerWeb:    { de: '\uD83C\uDF10 cozywolf.de', en: '\uD83C\uDF10 cozywolf.de' },
  partnerInsta:  { de: '\uD83D\uDCF8 @cozywolf.events', en: '\uD83D\uDCF8 @cozywolf.events' },

  // Footer
  footerBy:      { de: 'COZYQUIZ von', en: 'COZYQUIZ by' },

  // 2026-05-10 (Audit-P1): Web-Share-Button — Acquisition-Hebel im Moment
  // wo Spieler gerade ihre Stats offen haben.
  shareBtn:      { de: '📲 Mit Team teilen', en: '📲 Share with team' },
  shareCopied:   { de: '✓ Link kopiert!', en: '✓ Link copied!' },
  shareTitle:    { de: 'Mein CozyQuiz-Ergebnis', en: 'My CozyQuiz result' },
};

function tr<K extends keyof typeof T>(key: K, lang: Lang): string {
  return T[key][lang];
}

// ── Lang persistence ──────────────────────────────────────────────────────────
function detectInitialLang(): Lang {
  if (typeof window === 'undefined') return 'de';
  const stored = window.localStorage.getItem('qqSummaryLang');
  if (stored === 'de' || stored === 'en') return stored;
  return navigator.language?.toLowerCase().startsWith('de') ? 'de' : 'en';
}

// 2026-05-03 (Wolf-Wunsch): Stamm-Code mit Copy-Button auf Summary-Page.
// teamId hat Format `team-abc123` -> Anzeige `T-ABC123`.
// 2026-05-10 (Audit-P0 Brand-Refresh): Amber/Gold → Brand-Pink (eurovisionMode-aware).
function SummaryStammCode({ teamId, lang, brand }: {
  teamId: string;
  lang: Lang;
  brand: ReturnType<typeof summaryBrand>;
}) {
  const code = `T-${(teamId.replace(/^team-/i, '') || teamId).toUpperCase()}`;
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        const el = document.createElement('textarea');
        el.value = code;
        el.style.position = 'fixed'; el.style.opacity = '0';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }
  return (
    <div style={{
      marginBottom: 18, padding: '14px 16px', borderRadius: 14,
      background: `rgba(${brand.pinkRgb},0.08)`,
      border: `1px solid rgba(${brand.pinkRgb},0.30)`,
      textAlign: 'center',
    }}>
      <div style={{
        fontSize: 11, fontWeight: 900, color: brand.pink,
        letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6,
      }}>
        {lang === 'de' ? '🔖 Dein Stamm-Code' : '🔖 Your regular code'}
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        marginBottom: 6,
      }}>
        <div style={{
          fontSize: 24, fontWeight: 900, color: brand.pinkSoft,
          fontFamily: 'monospace', letterSpacing: 1,
          userSelect: 'all',
        }}>
          {code}
        </div>
        <button
          onClick={copy}
          style={{
            padding: '6px 12px', borderRadius: 8,
            border: `1.5px solid ${copied ? '#22C55E' : brand.pink}66`,
            background: copied ? 'rgba(34,197,94,0.15)' : `rgba(${brand.pinkRgb},0.10)`,
            color: copied ? '#86efac' : brand.pinkSoft,
            fontFamily: 'inherit', fontWeight: 800, fontSize: 12,
            cursor: 'pointer',
          }}
        >
          {copied ? (lang === 'de' ? '✓ Kopiert' : '✓ Copied') : (lang === 'de' ? '📋 Kopieren' : '📋 Copy')}
        </button>
      </div>
      <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.4 }}>
        {lang === 'de'
          ? 'Beim nächsten Quiz auf /team eingeben — deine Sieg-Streak zählt mit.'
          : 'Enter on /team next time — your win streak carries over.'}
      </div>
    </div>
  );
}

// 2026-05-10 (Audit-P1 Acquisition-Hebel): Web-Share-Button. Trigger
// navigator.share API mit Team-Stats; Fallback Clipboard-Copy. Spieler hat
// gerade Stats offen — perfekter Moment fuer "Wir wurden 2. mit 47 Punkten"
// in WhatsApp/Insta-Story.
function ShareButton({ team, place, lang, brand }: {
  team: SummaryTeam;
  place: number;
  lang: Lang;
  brand: ReturnType<typeof summaryBrand>;
}) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== 'undefined' ? window.location.href : '';

  async function share() {
    const text = lang === 'de'
      ? `${team.name} wurde ${place}. mit ${team.largestConnected} Punkten bei CozyQuiz! 🎉`
      : `${team.name} came in ${place} with ${team.largestConnected} points at CozyQuiz! 🎉`;
    try {
      if (navigator.share) {
        await navigator.share({ title: tr('shareTitle', lang), text, url });
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(`${text} ${url}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }
    } catch {
      // User-Cancel ist kein Fehler — silent ok
    }
  }

  return (
    <button
      onClick={share}
      style={{
        marginTop: 8,
        padding: '10px 18px', borderRadius: 999,
        background: `linear-gradient(135deg, ${brand.pink}, ${brand.magenta})`,
        color: '#fff',
        border: '1.5px solid rgba(255,255,255,0.18)',
        boxShadow: `0 6px 18px rgba(${brand.pinkRgb},0.45), inset 0 1px 0 rgba(255,255,255,0.22)`,
        fontFamily: 'inherit', fontWeight: 900, fontSize: 13,
        cursor: 'pointer', letterSpacing: 0.3,
      }}
    >
      {copied ? tr('shareCopied', lang) : tr('shareBtn', lang)}
    </button>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
// 2026-05-10 (Wolf-Wunsch 'summary ins menü'): optionaler `mockSummary`-Prop
// für QQSummaryTestPage. Wenn gesetzt, überspringen wir den REST-Fetch und
// nutzen die Mock-Daten direkt.
// 2026-05-10 (Wolf-Bug 'Link wird beim nächsten Spiel überschrieben'):
// Beide Routen lesen — `/summary/:roomCode` (legacy, jüngstes Spiel) und
// `/summary/by-id/:gameId` (stabil per Spiel). gameId hat Vorrang.
export default function QQSummaryPage({ mockSummary }: { mockSummary?: Summary } = {}) {
  const { roomCode: paramRoomCode, gameId: paramGameId } = useParams<{ roomCode?: string; gameId?: string }>();
  const roomCode = mockSummary?.roomCode ?? paramRoomCode;
  const gameId   = paramGameId;
  const [summary, setSummary] = useState<Summary | null>(mockSummary ?? null);
  const [upcoming, setUpcoming] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(!mockSummary);
  // 2026-05-10 (Audit-P2 lang-stale-closure-Fix): error wird als Translation-
  // Key gespeichert, nicht als gerenderter String. Im Render wird mit dem
  // aktuellen lang uebersetzt — kein Stale-Bug bei Sprach-Switch zur Ladezeit.
  const [errorKey, setErrorKey] = useState<'notFoundMsg' | 'loadError' | 'gameRunningMsg' | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>(detectInitialLang);

  function changeLang(next: Lang) {
    setLang(next);
    try { window.localStorage.setItem('qqSummaryLang', next); } catch {}
  }

  useEffect(() => {
    // Mock-Mode: Fetch komplett überspringen, Summary ist schon im State.
    if (mockSummary) return;
    // by-id-Route hat Vorrang (stabiler Lookup), sonst Fallback auf roomCode.
    const summaryEndpoint = gameId
      ? `${API_BASE}/qq/summary/by-id/${encodeURIComponent(gameId)}`
      : roomCode
        ? `${API_BASE}/qq/summary/${encodeURIComponent(roomCode)}`
        : null;
    if (!summaryEndpoint) return;
    let cancelled = false;
    (async () => {
      try {
        const [sRes, uRes] = await Promise.all([
          fetch(summaryEndpoint),
          fetch(`${API_BASE}/qq/upcoming`).catch(() => null),
        ]);
        if (!sRes.ok) {
          // 2026-05-12 (Wolf-Bug 'summary zeigt falsche teams'): Backend
          // antwortet 409 mit gameRunning=true wenn das aktuelle Spiel
          // noch laeuft (kein stale-data servieren). Eigene Fehlermeldung
          // dafuer, damit Spieler weiss: 'scan nochmal am Ende'.
          if (sRes.status === 409) {
            try {
              const body = await sRes.json();
              if (body?.gameRunning && !cancelled) {
                setErrorKey('gameRunningMsg');
                return;
              }
            } catch { /* fall through */ }
          }
          if (!cancelled) setErrorKey('notFoundMsg');
          return;
        }
        const s: Summary = await sRes.json();
        if (!cancelled) {
          setSummary(s);
          // 2026-05-11 (Wolf-Idee): wenn auf diesem Phone ein qq_teamId im
          // localStorage liegt UND dieses Team ist in der Summary, direkt zur
          // Team-Detail-View springen (= „dein Team zuerst, dann optional alle").
          // Beamer-Geräte ohne lokales Team landen normal beim Team-Picker.
          try {
            const localTeamId = window.localStorage.getItem('qq_teamId');
            if (localTeamId && s.teams.some(t => t.id === localTeamId)) {
              setSelectedTeamId(localTeamId);
            }
          } catch { /* localStorage unzugänglich */ }
        }
        if (uRes && uRes.ok) {
          const u: UpcomingEvent[] = await uRes.json();
          if (!cancelled) setUpcoming(u);
        }
      } catch {
        if (!cancelled) setErrorKey('loadError');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [roomCode, gameId, mockSummary]);

  // Eurovision-Mode-aware Brand-Tokens (Audit-P2). Default null bei Loading.
  const brand = useMemo(() => summaryBrand(summary?.eurovisionMode), [summary?.eurovisionMode]);
  const error = errorKey ? tr(errorKey, lang) : null;

  const selectedTeam = useMemo(
    () => summary?.teams.find(t => t.id === selectedTeamId) ?? null,
    [summary, selectedTeamId]
  );

  const ranking = useMemo(() => {
    if (!summary) return [];
    return [...summary.teams].sort(
      (a, b) => b.largestConnected - a.largestConnected || b.totalCells - a.totalCells || b.score - a.score
    );
  }, [summary]);

  if (loading) {
    return <Shell lang={lang} onLang={changeLang} brand={brand}><Loading lang={lang} /></Shell>;
  }

  if (error || !summary) {
    return (
      <Shell lang={lang} onLang={changeLang} brand={brand}>
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🤷</div>
          <h2 style={{ margin: 0, marginBottom: 8 }}>{tr('notFoundTitle', lang)}</h2>
          <p style={{ color: '#94a3b8' }}>{error ?? tr('unknownError', lang)}</p>
        </div>
      </Shell>
    );
  }

  // Auswahl-Screen
  if (!selectedTeam) {
    // 2026-05-11 (Audit P0): Sieger-Hero als emotionaler Anker statt nur
    // sterilem Team-Picker. Erste Begegnung nach QR-Scan muss feiern, nicht
    // wie Admin-Formular aussehen.
    const winnerTeam = ranking[0];
    return (
      <AvatarSetProvider value={summary.avatarSetId} emojis={summary.avatarSetEmojis ?? undefined}>
      <Shell lang={lang} onLang={changeLang} brand={brand}>
        <WinnerCelebrationHero
          winner={winnerTeam}
          draftTitle={summary.draftTitle}
          playedAt={summary.playedAt}
          lang={lang}
          brand={brand}
        />
        <Section title={tr('whichTeam', lang)}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
            {ranking.map((t, i) => (
                <button key={t.id} onClick={() => setSelectedTeamId(t.id)}
                  style={{
                    padding: 14, borderRadius: 16,
                    background: t.color + '22', border: `2px solid ${t.color}`,
                    cursor: 'pointer', color: '#fff', fontFamily: 'inherit',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  }}>
                  <QQTeamAvatar avatarId={t.avatarId} teamEmoji={t.emoji} size={56} />
                  <div style={{ fontSize: 15, fontWeight: 900 }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: '#cbd5e1' }}>
                    {tr('rankShort', lang)} {i + 1} · {t.largestConnected} {lang === 'de' ? 'Pkt' : 'pts'}
                  </div>
                </button>
              ))}
          </div>
        </Section>
        <FeedbackForm roomCode={summary.roomCode} lang={lang} brand={brand} />
        <PartnerCTA lang={lang} brand={brand} />
        <UpcomingEvents events={upcoming} lang={lang} brand={brand} />
        <Footer />
      </Shell>
      </AvatarSetProvider>
    );
  }

  // Team-Detail-Screen
  const place = ranking.findIndex(t => t.id === selectedTeam.id) + 1;
  const placeLabel = formatPlaceLabel(place, lang);
  const myFunny = summary.funnyAnswers.find(f => f.teamId === selectedTeam.id);
  const accuracy = selectedTeam.answered > 0 ? Math.round((selectedTeam.correct / selectedTeam.answered) * 100) : null;

  return (
    <AvatarSetProvider value={summary.avatarSetId} emojis={summary.avatarSetEmojis ?? undefined}>
    <Shell lang={lang} onLang={changeLang} brand={brand}>
      <div style={{
        background: `linear-gradient(135deg, ${selectedTeam.color}33 0%, rgba(15,23,42,0) 60%)`,
        padding: '28px 20px 22px', borderRadius: 20, marginBottom: 18,
        border: `1px solid ${selectedTeam.color}55`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center',
      }}>
        <div style={{
          width: 112, height: 112,
          boxShadow: `0 10px 30px ${selectedTeam.color}55`,
          borderRadius: '50%',
        }}>
          <QQTeamAvatar avatarId={selectedTeam.avatarId} teamEmoji={selectedTeam.emoji} size={112} />
        </div>
        <div style={{ fontSize: 13, fontWeight: 900, color: brand.pink, letterSpacing: 0.3, textTransform: 'uppercase' }}>
          {placeLabel}
        </div>
        <div style={{ fontSize: 28, fontWeight: 900, color: '#f8fafc' }}>{selectedTeam.name}</div>
        <ShareButton team={selectedTeam} place={place} lang={lang} brand={brand} />
        <button onClick={() => setSelectedTeamId(null)}
          style={{
            marginTop: 6, fontSize: 12, color: '#94a3b8', background: 'transparent',
            border: '1px solid rgba(255,255,255,0.15)', borderRadius: 999,
            padding: '4px 12px', cursor: 'pointer', fontFamily: 'inherit',
          }}>{tr('pickOther', lang)}</button>
      </div>

      {/* 2026-05-03 (Wolf-Wunsch): Stamm-Code auch hier auf der Summary-Seite,
          kopierbar — Spieler kommt oft erst hier nochmal her und kann sich
          den Code ohne Game-Over-Screen merken. */}
      <SummaryStammCode teamId={selectedTeam.id} lang={lang} brand={brand} />

      <Section title={tr('yourNumbers', lang)}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          <Stat staggerIdx={0} label={tr('largestArea', lang)} value={selectedTeam.largestConnected} suffix={lang === 'de' ? 'Punkte' : 'pts'} accent={selectedTeam.color} />
          <Stat staggerIdx={1} label={tr('fieldsTotal', lang)} value={selectedTeam.totalCells} suffix={tr('pieces', lang)} accent={selectedTeam.color} />
          <Stat staggerIdx={2} label={tr('correct', lang)} value={selectedTeam.correct} suffix={`/ ${selectedTeam.answered}`} accent="#22C55E" />
          <Stat staggerIdx={3} label={tr('accuracy', lang)} value={accuracy != null ? `${accuracy}%` : '—'} accent="#22C55E" />
          <Stat staggerIdx={4} label={tr('jokersEarned', lang)} value={selectedTeam.jokersEarned} accent={brand.pink} />
          <Stat staggerIdx={5} label={tr('stolen', lang)} value={selectedTeam.stealsUsed} suffix={tr('times', lang)} accent="#EF4444" />
        </div>
      </Section>

      {/* 2026-05-09 (Wolf): Final-Brett anzeigen — wer hat welche Felder am
          Ende. Cells nach team.color gefärbt, Top-Team-Cluster pulsiert. */}
      {summary.cellOwners && summary.gridSize && summary.gridSize > 0 && (
        <SummaryBoard
          gridSize={summary.gridSize}
          cellOwners={summary.cellOwners}
          teams={summary.teams}
          lang={lang}
        />
      )}

      {/* H3 Superlatives: narrative End-Game-Titel */}
      <Superlatives teams={summary.teams} selectedId={selectedTeam.id} lang={lang} endAwards={summary.endAwards ?? null} brand={brand} />

      {myFunny && (
        <Section title={tr('yourMoment', lang)}>
          <div style={{
            background: `rgba(${brand.pinkRgb},0.08)`,
            border: `1px solid rgba(${brand.pinkRgb},0.30)`,
            borderRadius: 12, padding: '12px 14px',
          }}>
            <div style={{ fontSize: 11, color: brand.pink, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 4 }}>
              {tr('funnyAnswer', lang)}
            </div>
            <div style={{ fontSize: 14, color: '#f8fafc', fontWeight: 700, marginBottom: 4 }}>
              „{myFunny.text}"
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>
              {tr('question', lang)}: {myFunny.questionText}
            </div>
          </div>
        </Section>
      )}

      <Section title={tr('finalStandings', lang)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {ranking.map((t, i) => {
            const isMe = t.id === selectedTeam.id;
            return (
              <div key={t.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px', borderRadius: 10,
                background: isMe ? t.color + '22' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isMe ? t.color : 'rgba(255,255,255,0.06)'}`,
              }}>
                <span style={{ fontSize: 12, fontWeight: 900, color: '#94a3b8', width: 22 }}>{i + 1}.</span>
                <QQTeamAvatar avatarId={t.avatarId} teamEmoji={t.emoji} size={28} />
                <span style={{ flex: 1, fontSize: 14, fontWeight: 800, color: isMe ? t.color : '#e2e8f0' }}>{teamDisplayName(t.name, true)}</span>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>
                  {t.largestConnected} <span style={{ fontSize: 10 }}>{lang === 'de' ? 'Pkt' : 'pts'}</span>
                </span>
              </div>
            );
          })}
        </div>
      </Section>

      <FeedbackForm roomCode={summary.roomCode} teamName={selectedTeam.name} lang={lang} brand={brand} />
      <PartnerCTA lang={lang} brand={brand} />
      <UpcomingEvents events={upcoming} lang={lang} brand={brand} />
      <Footer />
    </Shell>
    </AvatarSetProvider>
  );
}

function formatPlaceLabel(place: number, lang: Lang): string {
  // Unicode-Emoji statt JSX-Komponente — innerhalb eines Template-Strings wuerde
  // <QQEmojiIcon> sonst zu „[object Object]" stringifiziert.
  const medal = place === 1 ? '🥇' : place === 2 ? '🥈' : place === 3 ? '🥉' : '🎖️';
  if (lang === 'de') return `${medal} ${place}. Platz`;
  const ord = place === 1 ? '1st' : place === 2 ? '2nd' : place === 3 ? '3rd' : `${place}th`;
  return `${medal} ${ord} place`;
}

// ── Helpers & Subcomponents ───────────────────────────────────────────────────

function Shell({ children, lang, onLang, brand }: {
  children: React.ReactNode;
  lang: Lang;
  onLang: (l: Lang) => void;
  brand: ReturnType<typeof summaryBrand>;
}) {
  return (
    <div style={{
      minHeight: '100vh',
      // 2026-05-08 (Aurora-Vivid-Refresh): Brand-Pink-Mesh statt blau-grauem
      // Slate. 2026-05-10: brand.pinkRgb statt hardcoded fuer ESC-Awareness.
      background:
        `radial-gradient(ellipse at 22% 28%, rgba(${brand.pinkRgb},0.20) 0%, transparent 55%),` +
        'radial-gradient(ellipse at 78% 72%, rgba(30,42,90,0.24) 0%, transparent 55%),' +
        'linear-gradient(180deg, #14101F 0%, #0A0814 100%)',
      color: '#e2e8f0',
      fontFamily: "'Bricolage Grotesque', 'Inter', 'Nunito', system-ui, sans-serif",
      padding: '20px 16px 40px',
    }}>
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        <TopBar lang={lang} onLang={onLang} brand={brand} />
        {children}
      </div>
    </div>
  );
}

// 2026-05-09 v2 (Wolf): klickbarer Instagram-Pill oben links + LangToggle
// rechts in einer Top-Bar. Brand-Gradient (Pink → Lila → Orange) wie das
// Instagram-Logo, kompakt mit 📸 + @cozywolf.events Handle.
function TopBar({ lang, onLang, brand }: {
  lang: Lang;
  onLang: (l: Lang) => void;
  brand: ReturnType<typeof summaryBrand>;
}) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      marginBottom: 12, gap: 12, flexWrap: 'wrap',
    }}>
      <a
        href="https://instagram.com/cozywolf.events"
        target="_blank"
        rel="noreferrer"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '6px 14px', borderRadius: 999,
          background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
          color: '#fff', textDecoration: 'none',
          fontSize: 12, fontWeight: 900, fontFamily: 'inherit',
          letterSpacing: 0.3,
          boxShadow: '0 4px 14px rgba(220,39,67,0.45), 0 0 18px rgba(188,24,136,0.4)',
          border: '1px solid rgba(255,255,255,0.18)',
        }}
        title="@cozywolf.events auf Instagram"
      >
        <span style={{ fontSize: 16, lineHeight: 1 }}>📸</span>
        @cozywolf.events
      </a>
      <div style={{
        display: 'inline-flex', borderRadius: 999,
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
        padding: 2,
      }}>
        {(['de', 'en'] as const).map(l => {
          const active = lang === l;
          return (
            <button key={l} type="button" onClick={() => onLang(l)}
              style={{
                padding: '4px 12px', borderRadius: 999,
                fontSize: 11, fontWeight: 900, fontFamily: 'inherit',
                background: active ? brand.pink : 'transparent',
                color: active ? '#0A0814' : '#94a3b8',
                border: 'none', cursor: 'pointer',
                letterSpacing: 0.4,
              }}>{l.toUpperCase()}</button>
          );
        })}
      </div>
    </div>
  );
}

// ── WinnerCelebrationHero — emotionaler Anker für die Auswahl-View ──────────
// 2026-05-11 (Audit P0): Sieger groß mit Avatar + Crown + Glow statt nur
// einem 14px-Pink-Text-Hinweis. Erste Begegnung nach QR-Scan = Wow-Moment.
function WinnerCelebrationHero({ winner, draftTitle, playedAt, lang, brand }: {
  winner: SummaryTeam | undefined;
  draftTitle: string;
  playedAt: number;
  lang: Lang;
  brand: ReturnType<typeof summaryBrand>;
}) {
  const locale = lang === 'de' ? 'de-DE' : 'en-GB';
  const date = new Date(playedAt).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
  if (!winner) {
    return <Hero draftTitle={draftTitle} winner={null} playedAt={playedAt} lang={lang} brand={brand} />;
  }
  return (
    <div style={{
      position: 'relative',
      padding: '32px 20px 26px', borderRadius: 22, marginBottom: 18, textAlign: 'center',
      background: `radial-gradient(ellipse at top, ${winner.color}26 0%, rgba(15,23,42,0) 65%), linear-gradient(180deg, rgba(15,23,42,0.4), rgba(15,23,42,0))`,
      border: `1.5px solid ${winner.color}55`,
      boxShadow: `0 12px 32px ${winner.color}33, inset 0 1px 0 rgba(255,255,255,0.04)`,
      overflow: 'hidden',
    }}>
      {/* Eyebrow */}
      <div style={{ fontSize: 11, letterSpacing: 0.3, color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>
        CozyQuiz · {date}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#cbd5e1', marginTop: 2 }}>{draftTitle}</div>

      {/* Sieger-Hero */}
      <div style={{ position: 'relative', display: 'inline-block', marginTop: 18 }}>
        {/* Crown über Avatar */}
        <span aria-hidden style={{
          position: 'absolute', top: -32, left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 44, lineHeight: 1, pointerEvents: 'none',
          filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5)) drop-shadow(0 0 16px rgba(251,191,36,0.7))',
          animation: 'qqWinnerCrownBob 2.4s ease-in-out infinite',
          zIndex: 2,
        }}>👑</span>
        {/* Avatar-Disc mit Pulse */}
        <div style={{
          width: 120, height: 120, borderRadius: '50%',
          background: winner.color,
          border: `4px solid ${winner.color}`,
          boxShadow: `0 0 40px ${winner.color}88, 0 0 0 6px ${winner.color}22`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'qqWinnerGlow 3.2s ease-in-out infinite',
        }}>
          <QQTeamAvatar avatarId={winner.avatarId} teamEmoji={winner.emoji} size={108} />
        </div>
      </div>

      <div style={{
        marginTop: 14, fontSize: 12, fontWeight: 900,
        color: '#FBBF24', letterSpacing: '0.18em', textTransform: 'uppercase',
        textShadow: '0 0 12px rgba(251,191,36,0.6)',
      }}>
        🏆 {tr('champion', lang)}
      </div>
      <div style={{
        marginTop: 4, fontSize: 26, fontWeight: 900, color: winner.color,
        letterSpacing: '-0.01em',
        textShadow: `0 0 20px ${winner.color}55, 0 2px 6px rgba(0,0,0,0.5)`,
        wordBreak: 'break-word',
      }}>
        {winner.name}
      </div>
      <div style={{ marginTop: 4, fontSize: 12, color: '#94a3b8', fontWeight: 700 }}>
        {winner.largestConnected} {lang === 'de' ? 'Punkte · größtes Gebiet' : 'pts · largest area'}
      </div>

      <style>{`
        @keyframes qqWinnerCrownBob {
          0%, 100% { transform: translateX(-50%) translateY(0) rotate(-3deg); }
          50%      { transform: translateX(-50%) translateY(-4px) rotate(3deg); }
        }
        @keyframes qqWinnerGlow {
          0%, 100% { box-shadow: 0 0 32px ${winner.color}77, 0 0 0 6px ${winner.color}22; }
          50%      { box-shadow: 0 0 48px ${winner.color}cc, 0 0 0 8px ${winner.color}33; }
        }
      `}</style>
    </div>
  );
}

function Hero({ draftTitle, winner, playedAt, lang, brand }: {
  draftTitle: string; winner: string | null; playedAt: number; lang: Lang;
  brand: ReturnType<typeof summaryBrand>;
}) {
  const locale = lang === 'de' ? 'de-DE' : 'en-GB';
  const date = new Date(playedAt).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
  return (
    <div style={{
      padding: '24px 20px', borderRadius: 20, marginBottom: 18, textAlign: 'center',
      background: `radial-gradient(ellipse at top, rgba(${brand.pinkRgb},0.15), transparent 70%)`,
      border: `1px solid rgba(${brand.pinkRgb},0.20)`,
    }}>
      <div style={{ fontSize: 11, letterSpacing: 0.3, color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>
        CozyQuiz · {date}
      </div>
      <div style={{ fontSize: 22, fontWeight: 900, color: '#f8fafc', marginTop: 4 }}>{draftTitle}</div>
      {winner && (
        <div style={{ marginTop: 10, fontSize: 14, color: brand.pink, fontWeight: 800 }}>
          <QQEmojiIcon emoji="🏆"/> {tr('champion', lang)}: {winner}
        </div>
      )}
    </div>
  );
}

// 2026-05-09 (Wolf): Final-Brett-Renderer für die Summary-Seite. Zeigt das
// Endbrett mit Team-Color-Cells. Top-Team (höchster largestConnected) hat
// zusätzlichen Pulse. Klein genug damit's auf dem Phone scrollbar bleibt.
function SummaryBoard({ gridSize, cellOwners, teams, lang }: {
  gridSize: number;
  cellOwners: Array<Array<string | null>>;
  teams: SummaryTeam[];
  lang: Lang;
}) {
  const topTeam = [...teams].sort(compareTeamsForRanking)[0];
  // Cell-Größe für Mobile-First (kompakt)
  const maxBoardWidth = 320; // px
  const cellSize = Math.floor(maxBoardWidth / gridSize) - 4;
  return (
    <Section title={lang === 'de' ? 'Endbrett' : 'Final board'}>
      <style>{`
        @keyframes summaryBoardPulse {
          0%, 100% { box-shadow: inset 0 0 0 1px rgba(255,255,255,0.18); }
          50%      { box-shadow: inset 0 0 0 1px rgba(255,255,255,0.18), 0 0 12px var(--c-color); }
        }
      `}</style>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
        padding: '12px 8px',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${gridSize}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${gridSize}, ${cellSize}px)`,
          gap: 4,
        }}>
          {cellOwners.map((row, r) => row.map((ownerId, c) => {
            if (!ownerId) {
              return (
                <div key={`${r}-${c}`} style={{
                  width: cellSize, height: cellSize, borderRadius: 4,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }} />
              );
            }
            const owner = teams.find(t => t.id === ownerId);
            if (!owner) return null;
            const isTop = topTeam?.id === owner.id;
            return (
              <div key={`${r}-${c}`} style={{
                width: cellSize, height: cellSize, borderRadius: 4,
                background: `linear-gradient(135deg, ${owner.color}, ${owner.color}cc)`,
                border: `1.5px solid ${owner.color}`,
                ['--c-color' as any]: `${owner.color}88`,
                animation: isTop ? 'summaryBoardPulse 2.4s ease-in-out infinite' : undefined,
                opacity: isTop ? 1 : 0.7,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {owner.emoji && cellSize >= 24 && (
                  <span style={{ fontSize: cellSize * 0.5, lineHeight: 1 }}>{owner.emoji}</span>
                )}
              </div>
            );
          }))}
        </div>
        {/* Mini-Legende: Top-Team highlighten */}
        {topTeam && (
          <div style={{
            fontSize: 12, color: '#94a3b8', fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{
              display: 'inline-block', width: 10, height: 10, borderRadius: 3,
              background: topTeam.color,
            }} />
            {lang === 'de' ? 'Größtes Gebiet' : 'Largest area'}: <b style={{ color: topTeam.color }}>{topTeam.name}</b> ({topTeam.largestConnected})
          </div>
        )}
      </div>
    </Section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 20 }}>
      <h3 style={{ fontSize: 13, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.3, margin: '0 0 10px', fontWeight: 900 }}>
        {title}
      </h3>
      {children}
    </section>
  );
}

// B3 Count-Up Hook: zaehlt von 0 auf targetValue in ~700ms mit ease-out.
// Akzeptiert nur nummerische Werte. Bei String-Values (z.B. '—') wird
// direkt gerendert, kein Count-Up. Prozent-Strings werden gesondert behandelt.
//
// 2026-05-10 (Audit-P1 RAF-Leak-Fix): animateTo gibt jetzt eine Cleanup-
// Funktion zurueck. useEffect ruft sie beim Re-Run/Unmount auf — vorher liefen
// alte RAF-Loops weiter und ueberschrieben den display-State (Zahlen-Glitches
// bei Team-Wechsel/Sprache-Switch).
function useCountUp(finalValue: number | string, durationMs = 720, delayMs = 0): string {
  const [display, setDisplay] = useState<string>(() => {
    if (typeof finalValue === 'string') return finalValue;
    return '0';
  });
  // 2026-05-11 (Audit P0): nur einmal pro Mount animieren. Vorher startete
  // jedes Re-Render (z.B. bei Sprache-Wechsel) die Animation von 0 → Stats
  // sprangen visuell zurück. Mit hasAnimated-Ref triggert die Anim nur beim
  // ersten Mount mit gültigem Wert. Plus delayMs für Stagger (i * 80ms).
  const hasAnimatedRef = useRef(false);
  useEffect(() => {
    if (hasAnimatedRef.current) {
      // Bereits animiert → direkt finalValue setzen ohne Re-Animation
      setDisplay(typeof finalValue === 'string' ? finalValue : String(finalValue));
      return;
    }
    hasAnimatedRef.current = true;
    const startTimer = window.setTimeout(() => {
      if (typeof finalValue === 'string') {
        const pctMatch = finalValue.match(/^(-?\d+(?:\.\d+)?)%$/);
        if (pctMatch) {
          const target = Number(pctMatch[1]);
          animateTo(target, (v) => setDisplay(`${Math.round(v)}%`), durationMs);
        } else {
          setDisplay(finalValue);
        }
        return;
      }
      const target = finalValue;
      animateTo(target, (v) => setDisplay(String(Math.round(v))), durationMs);
    }, delayMs);
    return () => window.clearTimeout(startTimer);
  }, [finalValue, durationMs, delayMs]);
  return display;
}

function animateTo(target: number, onTick: (v: number) => void, durationMs: number): () => void {
  const start = performance.now();
  const ease = (t: number) => 1 - Math.pow(1 - t, 3); // ease-out-cubic
  let rafId = 0;
  let cancelled = false;
  const tick = (now: number) => {
    if (cancelled) return;
    const elapsed = now - start;
    const t = Math.min(1, elapsed / durationMs);
    const eased = ease(t);
    // Leichter Overshoot in den letzten 15% fuer Snap-Gefuehl
    const overshoot = t > 0.85 ? Math.sin((t - 0.85) / 0.15 * Math.PI) * 0.04 : 0;
    onTick(target * (eased + overshoot));
    if (t < 1) rafId = requestAnimationFrame(tick);
    else onTick(target);
  };
  rafId = requestAnimationFrame(tick);
  return () => {
    cancelled = true;
    if (rafId) cancelAnimationFrame(rafId);
  };
}

function Stat({ label, value, suffix, accent, staggerIdx = 0 }: { label: string; value: number | string; suffix?: string; accent: string; staggerIdx?: number }) {
  // 2026-05-11 (Audit P0): Stagger 80ms pro Stat-Index, statt alle 6 Stats
  // synchron bei 0 starten zu lassen. Eleganter Reveal.
  const animated = useCountUp(value, 720, staggerIdx * 80);
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 12, padding: '10px 12px',
    }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.3 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color: accent, lineHeight: 1.1, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
        {animated} {suffix && <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>{suffix}</span>}
      </div>
    </div>
  );
}

// H3 Superlatives → 3 End-Awards (Underdog/Meisterklauer/Speedy) — Wolf-
// Konsistenz 2026-05-09: gleiche Ehrentitel wie der Recap-Strip auf der
// Thanks-Page. Backend übergibt endAwards (mit Team-IDs + Bonus-Daten).
// Vorher: 4 abgeleitete Titel (Meister-Klauer, Trefferkönig, Joker-Jäger,
// Territorium-König) — durch die 3 neuen ersetzt.
function Superlatives({ teams, selectedId, lang, endAwards, brand }: {
  teams: SummaryTeam[]; selectedId: string; lang: Lang;
  endAwards: Summary['endAwards'];
  brand: ReturnType<typeof summaryBrand>;
}) {
  if (teams.length < 2 || !endAwards) return null;

  type SuperTitle = {
    emoji: string;
    titleDe: string; titleEn: string;
    descDe: string; descEn: string;
    winner: SummaryTeam;
    metric: string;
    accent: string;
  };
  const titles: SuperTitle[] = [];

  // 🐢 Underdog-Trostpreis — Anti-Shaming-Fix (2026-05-10):
  // Vorher: descDe='Niedrigster Score' + metric='${team.score} Punkte' →
  // exponierte den niedrigsten Score namentlich. Verstößt gegen
  // feedback_no_public_shaming: keine öffentliche Bloßstellung von Teams.
  // Jetzt: warme Trostpreis-Beschreibung, keine Zahl.
  if (endAwards.underdog) {
    const team = teams.find(t => t.id === endAwards.underdog);
    if (team) {
      titles.push({
        emoji: '🐢',
        titleDe: 'Underdog', titleEn: 'Underdog',
        descDe: 'Trostpreis fürs Mitspielen', descEn: 'Consolation prize',
        winner: team,
        metric: lang === 'de' ? '🏅 Mit Herz dabei' : '🏅 Heart of the game',
        accent: '#10B981',
      });
    }
  }

  // 🦝 Meisterklauer — meiste Klau-Aktionen
  if (endAwards.meisterklauer) {
    const team = teams.find(t => t.id === endAwards.meisterklauer);
    if (team) {
      const count = endAwards.meisterklauerCount ?? team.stealsUsed;
      titles.push({
        emoji: '🦝',
        titleDe: 'Meisterklauer', titleEn: 'Master Stealer',
        descDe: 'Meiste Klau-Aktionen', descEn: 'Most steals',
        winner: team,
        metric: `${count}× ${lang === 'de' ? 'geklaut' : 'stolen'}`,
        accent: '#A855F7',
      });
    }
  }

  // ⚡ Speedy Gonzales — am öftesten als Erster (mit korrekter Antwort).
  // 2026-05-23 (Wolf-Live-Test #N): Vorher avg(reaction-time), jetzt count-
  // basiert. Fallback auf avgMs-Display fuer alte Spiele ohne firstCount.
  if (endAwards.speedy) {
    const team = teams.find(t => t.id === endAwards.speedy);
    if (team) {
      const firstCount = (endAwards as any).speedyFirstCount ?? null;
      const avgMs = endAwards.speedyAvgMs ?? null;
      const metric = firstCount != null && firstCount > 0
        ? (lang === 'de' ? `${firstCount}× zuerst` : `${firstCount}× first`)
        : avgMs != null
          ? `Ø ${(avgMs / 1000).toFixed(1)}s`
          : (lang === 'de' ? 'Schnellste Antworten' : 'Fastest answers');
      titles.push({
        emoji: '⚡',
        titleDe: 'Speedy Gonzales', titleEn: 'Speedy Gonzales',
        descDe: 'Am öftesten als Erste:r', descEn: 'Most often first',
        winner: team,
        metric,
        accent: '#F472B6',
      });
    }
  }

  if (titles.length === 0) return null;

  const sectionTitle = lang === 'de' ? 'Ehrentitel' : 'Honors';
  return (
    <Section title={sectionTitle}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
        {titles.map((title, i) => {
          const isMe = title.winner.id === selectedId;
          return (
            <div key={`${title.titleDe}-${i}`} style={{
              padding: '12px 14px', borderRadius: 14,
              background: `linear-gradient(135deg, ${title.accent}22, ${title.accent}08)`,
              border: `1.5px solid ${title.accent}66`,
              boxShadow: `0 4px 14px ${title.accent}22`,
              display: 'flex', flexDirection: 'column', gap: 8,
              position: 'relative',
            }}>
              {isMe && (
                <span style={{
                  position: 'absolute', top: -8, right: -8,
                  padding: '2px 8px', borderRadius: 999,
                  background: brand.pink, color: '#0A0814',
                  fontSize: 10, fontWeight: 900, letterSpacing: 0.3,
                  boxShadow: `0 2px 6px rgba(0,0,0,0.4), 0 0 12px rgba(${brand.pinkRgb},0.6)`,
                }}>{lang === 'de' ? 'DAS SEID IHR' : "THAT'S YOU"}</span>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 22, lineHeight: 1 }}><QQEmojiIcon emoji={title.emoji}/></span>
                <span style={{
                  fontSize: 12, fontWeight: 900, color: title.accent,
                  letterSpacing: 0.4, textTransform: 'uppercase',
                }}>{lang === 'de' ? title.titleDe : title.titleEn}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <QQTeamAvatar avatarId={title.winner.avatarId} teamEmoji={(title.winner as any).emoji} size={38} />
                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1, minWidth: 0 }}>
                  <TeamNameLabel
                    name={title.winner.name}
                    maxLines={1}
                    shrinkAfter={14}
                    fontSize={14}
                    color={title.winner.color}
                    fontWeight={900}
                  />
                  <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>
                    {lang === 'de' ? title.descDe : title.descEn}
                  </span>
                </div>
              </div>
              <div style={{
                fontSize: 13, fontWeight: 900, color: '#e2e8f0',
                padding: '3px 8px', borderRadius: 6,
                background: 'rgba(0,0,0,0.3)',
                alignSelf: 'flex-start',
              }}>{title.metric}</div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

function Loading({ lang }: { lang: Lang }) {
  // 2026-05-11 (Audit P0): Skeleton statt Spinner. Vorher leerer 🎲 +
  // 'Lade eure Stats…' wirkte bei Coolify-Cold-Start (~2-3s DB-Reconnect)
  // wie '404 nicht gefunden'. Jetzt: gefakter Layout-Frame mit Pulse-Anim
  // → User sieht 'da kommt was', kein Vertrauens-Knick.
  return (
    <>
      {/* Hero-Skeleton */}
      <div style={{
        padding: '24px 20px', borderRadius: 20, marginBottom: 18, textAlign: 'center',
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
        animation: 'qqSkPulse 1.4s ease-in-out infinite',
      }}>
        <div style={{ width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', margin: '0 auto 12px' }} />
        <div style={{ width: '40%', height: 16, borderRadius: 6, background: 'rgba(255,255,255,0.06)', margin: '6px auto' }} />
        <div style={{ width: '60%', height: 24, borderRadius: 6, background: 'rgba(255,255,255,0.08)', margin: '6px auto' }} />
      </div>
      {/* Stats-Skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 18 }}>
        {[0, 1, 2, 3, 4, 5].map(i => (
          <div key={i} style={{
            height: 64, borderRadius: 12,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.06)',
            animation: `qqSkPulse 1.4s ease-in-out ${i * 0.1}s infinite`,
          }} />
        ))}
      </div>
      <div style={{ textAlign: 'center', color: '#475569', fontSize: 13, fontWeight: 700 }}>
        {tr('loading', lang)}
      </div>
      <style>{`
        @keyframes qqSkPulse {
          0%, 100% { opacity: 0.55; }
          50%      { opacity: 0.95; }
        }
      `}</style>
    </>
  );
}

type FeedbackType = 'feedback' | 'bug' | 'idea' | 'praise';
type PlayAgain = 'yes' | 'maybe' | 'no';
type LengthFeel = 'short' | 'ok' | 'long';
type ContactIntent = 'date' | 'booking' | 'response';

const TYPE_OPTIONS: Array<{ id: FeedbackType; emoji: string; labelKey: keyof typeof T; color: string }> = [
  { id: 'feedback', emoji: '💬', labelKey: 'fbType_feedback', color: '#60a5fa' },
  { id: 'bug',      emoji: '🐛', labelKey: 'fbType_bug',      color: '#f87171' },
  { id: 'idea',     emoji: '💡', labelKey: 'fbType_idea',     color: '#fbbf24' },
  { id: 'praise',   emoji: '❤️', labelKey: 'fbType_praise',   color: '#f0abfc' },
];

const CATEGORY_OPTIONS: Array<{ id: string; emoji: string; labelKey: keyof typeof T }> = [
  { id: 'SCHAETZCHEN',   emoji: '🎯', labelKey: 'cat_SCHAETZCHEN' },
  { id: 'MUCHO',         emoji: '🅰️', labelKey: 'cat_MUCHO' },
  { id: 'BUNTE_TUETE',   emoji: '🎁', labelKey: 'cat_BUNTE_TUETE' },
  { id: 'ZEHN_VON_ZEHN', emoji: '🎰', labelKey: 'cat_ZEHN_VON_ZEHN' },
  { id: 'CHEESE',        emoji: '📸', labelKey: 'cat_CHEESE' },
];

function FeedbackForm({ roomCode, teamName, lang, brand }: {
  roomCode: string; teamName?: string; lang: Lang;
  brand: ReturnType<typeof summaryBrand>;
}) {
  void brand; // 2026-05-10: brand-prop fuer zukuenftige FeedbackForm-Akzent-Tweaks
            // (Submit-Button etc.). Aktuell rein neutral.
  const [type, setType] = useState<FeedbackType>('feedback');
  const [playAgain, setPlayAgain] = useState<PlayAgain | null>(null);
  const [favoriteCategory, setFavoriteCategory] = useState<string | null>(null);
  const [lengthFeel, setLengthFeel] = useState<LengthFeel | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [surprise, setSurprise] = useState('');
  const [text, setText] = useState('');
  const [contact, setContact] = useState('');
  const [contactIntent, setContactIntent] = useState<ContactIntent[]>([]);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const toggleIntent = (i: ContactIntent) => {
    setContactIntent(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);
  };

  const textPlaceholder = type === 'bug'
    ? tr('fbPhBug', lang)
    : type === 'idea'
      ? tr('fbPhIdea', lang)
      : type === 'praise'
        ? tr('fbPhPraise', lang)
        : tr('fbPhGen', lang);

  async function submit() {
    // 2026-05-11 (Audit P0-3 Light): Pflicht-Text aufgeweicht. Bei Praise
    // oder Rating ≥ 4 reicht ein Quick-Submit ohne Freitext — die Sterne
    // sind die Aussage. Bug/Idee/negativ-Feedback brauchen weiterhin Text.
    const allowEmpty = type === 'praise' || (rating !== null && rating >= 4);
    if (!text.trim() && !allowEmpty) { setErr(tr('fbErrEmpty', lang)); return; }
    setSending(true); setErr(null);
    try {
      const res = await fetch(`${API_BASE}/qq/feedback`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode, teamName, rating, text, contact,
          type, playAgain, favoriteCategory, lengthFeel,
          surprise: surprise.trim() || null,
          contactIntent: contactIntent.length ? contactIntent : null,
        }),
      });
      if (!res.ok) throw new Error(tr('fbErrServer', lang));
      setSent(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : tr('fbErrSend', lang));
    } finally { setSending(false); }
  }

  if (sent) {
    return (
      <Section title={tr('feedbackTitle', lang)}>
        <div style={{
          background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)',
          borderRadius: 12, padding: '16px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 32, marginBottom: 6 }}><QQEmojiIcon emoji="🎉"/></div>
          <div style={{ fontSize: 15, fontWeight: 900, color: '#86efac', marginBottom: 4 }}>
            {tr('thanksTitle', lang)}
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>
            {type === 'bug' ? tr('thanksBugSub', lang) : tr('thanksGenSub', lang)}
          </div>
        </div>
      </Section>
    );
  }

  return (
    <Section title={tr('feedbackTitle', lang)}>
      <div style={{
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 14,
      }}>

        {/* 1. Typ-Chips */}
        <div>
          <Caption>{tr('fbWhatType', lang)}</Caption>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {TYPE_OPTIONS.map(opt => {
              const active = type === opt.id;
              return (
                <button key={opt.id} type="button" onClick={() => setType(opt.id)}
                  style={{
                    padding: '10px 4px', borderRadius: 10,
                    background: active ? `${opt.color}22` : 'rgba(255,255,255,0.04)',
                    border: `1.5px solid ${active ? opt.color : 'rgba(255,255,255,0.08)'}`,
                    color: active ? opt.color : '#cbd5e1',
                    fontFamily: 'inherit', fontWeight: 800, fontSize: 11,
                    cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                  }}>
                  <span style={{ fontSize: 20, lineHeight: 1 }}><QQEmojiIcon emoji={opt.emoji}/></span>
                  <span>{tr(opt.labelKey, lang)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Nochmal spielen? (nicht bei Bug) */}
        {type !== 'bug' && (
          <div>
            <Caption>{tr('fbPlayAgain', lang)}</Caption>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {([
                { id: 'yes',   emoji: '😍', labelKey: 'fbPA_yes' as const },
                { id: 'maybe', emoji: '👍', labelKey: 'fbPA_maybe' as const },
                { id: 'no',    emoji: '😐', labelKey: 'fbPA_no' as const },
              ] as Array<{ id: PlayAgain; emoji: string; labelKey: keyof typeof T }>).map(opt => {
                const active = playAgain === opt.id;
                return (
                  <button key={opt.id} type="button"
                    onClick={() => setPlayAgain(active ? null : opt.id)}
                    style={{
                      padding: '8px 4px', borderRadius: 10,
                      background: active ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.04)',
                      border: `1.5px solid ${active ? 'rgba(251,191,36,0.5)' : 'rgba(255,255,255,0.08)'}`,
                      color: active ? '#fbbf24' : '#cbd5e1',
                      fontFamily: 'inherit', fontWeight: 800, fontSize: 11,
                      cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                    }}>
                    <span style={{ fontSize: 18, lineHeight: 1 }}><QQEmojiIcon emoji={opt.emoji}/></span>
                    <span>{tr(opt.labelKey, lang)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. Kategorie-Favorit (nicht bei Bug) */}
        {type !== 'bug' && (
          <div>
            <Caption>{tr('fbFavCat', lang)}</Caption>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {CATEGORY_OPTIONS.map(opt => {
                const active = favoriteCategory === opt.id;
                return (
                  <button key={opt.id} type="button"
                    onClick={() => setFavoriteCategory(active ? null : opt.id)}
                    style={{
                      flex: '1 1 calc(33% - 4px)', minWidth: 0,
                      padding: '8px 6px', borderRadius: 999,
                      background: active ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.04)',
                      border: `1.5px solid ${active ? 'rgba(99,102,241,0.55)' : 'rgba(255,255,255,0.08)'}`,
                      color: active ? '#a5b4fc' : '#cbd5e1',
                      fontFamily: 'inherit', fontWeight: 800, fontSize: 11,
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                      whiteSpace: 'nowrap',
                    }}>
                    <span><QQEmojiIcon emoji={opt.emoji}/></span>
                    <span>{tr(opt.labelKey, lang)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. Spiel-Länge (nicht bei Bug) */}
        {type !== 'bug' && (
          <div>
            <Caption>{tr('fbLength', lang)}</Caption>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {([
                { id: 'short', emoji: '⏱️', labelKey: 'fbLen_short' as const },
                { id: 'ok',    emoji: '✅', labelKey: 'fbLen_ok' as const },
                { id: 'long',  emoji: '💤', labelKey: 'fbLen_long' as const },
              ] as Array<{ id: LengthFeel; emoji: string; labelKey: keyof typeof T }>).map(opt => {
                const active = lengthFeel === opt.id;
                return (
                  <button key={opt.id} type="button"
                    onClick={() => setLengthFeel(active ? null : opt.id)}
                    style={{
                      padding: '8px 4px', borderRadius: 10,
                      background: active ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.04)',
                      border: `1.5px solid ${active ? 'rgba(34,197,94,0.45)' : 'rgba(255,255,255,0.08)'}`,
                      color: active ? '#86efac' : '#cbd5e1',
                      fontFamily: 'inherit', fontWeight: 800, fontSize: 11,
                      cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                    }}>
                    <span style={{ fontSize: 16, lineHeight: 1 }}><QQEmojiIcon emoji={opt.emoji}/></span>
                    <span>{tr(opt.labelKey, lang)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. Rating (nicht bei Bug/Idea — bei reinem Feature-Wunsch wenig sinnvoll) */}
        {(type === 'feedback' || type === 'praise') && (
          <div>
            <Caption>{tr('fbStars', lang)}</Caption>
            <div style={{ display: 'flex', gap: 4 }}>
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} type="button" onClick={() => setRating(rating === n ? null : n)}
                  style={{
                    flex: 1, padding: '10px 0', borderRadius: 8,
                    background: rating && rating >= n ? '#fbbf24' : 'rgba(255,255,255,0.06)',
                    color: rating && rating >= n ? '#1e293b' : '#94a3b8',
                    border: 'none', cursor: 'pointer', fontSize: 20, fontFamily: 'inherit',
                  }}>★</button>
              ))}
            </div>
          </div>
        )}

        {/* 6. Überraschung (nicht bei Bug) */}
        {type !== 'bug' && (
          <div>
            <Caption>{tr('fbSurprise', lang)} <span style={{ color: '#64748b', fontWeight: 700 }}>{tr('fbOptional', lang)}</span></Caption>
            <input value={surprise} onChange={e => setSurprise(e.target.value)} maxLength={500}
              placeholder={tr('fbSurprisePh', lang)}
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, padding: '8px 10px', color: '#e2e8f0',
                fontSize: 13, fontFamily: 'inherit',
              }} />
          </div>
        )}

        {/* 7. Haupttext — Pflicht */}
        <div>
          <Caption>{type === 'bug' ? tr('fbMainBug', lang) : type === 'idea' ? tr('fbMainIdea', lang) : tr('fbMainGen', lang)}</Caption>
          <textarea value={text} onChange={e => setText(e.target.value)} rows={3} maxLength={2000}
            placeholder={textPlaceholder}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8, padding: '10px 12px', color: '#e2e8f0',
              fontSize: 14, fontFamily: 'inherit', resize: 'vertical',
            }} />
        </div>

        {/* 8. Kontakt + Intent */}
        <div>
          <Caption>{tr('fbContact', lang)} <span style={{ color: '#64748b', fontWeight: 700 }}>{tr('fbOptional', lang)}</span></Caption>
          <input value={contact} onChange={e => setContact(e.target.value)} maxLength={200}
            placeholder={tr('fbContactPh', lang)}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8, padding: '8px 10px', color: '#e2e8f0',
              fontSize: 13, fontFamily: 'inherit',
            }} />
          {contact.trim() && (
            <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {([
                { id: 'response', labelKey: 'fbIntent_response' as const },
                { id: 'date',     labelKey: 'fbIntent_date' as const },
                { id: 'booking',  labelKey: 'fbIntent_booking' as const },
              ] as Array<{ id: ContactIntent; labelKey: keyof typeof T }>).map(opt => {
                const active = contactIntent.includes(opt.id);
                return (
                  <button key={opt.id} type="button" onClick={() => toggleIntent(opt.id)}
                    style={{
                      padding: '5px 10px', borderRadius: 999,
                      background: active ? 'rgba(236,72,153,0.18)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${active ? 'rgba(236,72,153,0.5)' : 'rgba(255,255,255,0.1)'}`,
                      color: active ? '#f0abfc' : '#94a3b8',
                      fontFamily: 'inherit', fontWeight: 700, fontSize: 11,
                      cursor: 'pointer',
                    }}>
                    {tr(opt.labelKey, lang)}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {err && <div style={{ fontSize: 12, color: '#fca5a5' }}>⚠️ {err}</div>}

        <button type="button" onClick={submit} disabled={sending}
          style={{
            width: '100%', padding: '12px',
            background: type === 'bug' ? '#EF4444' : '#22C55E',
            color: type === 'bug' ? '#fff' : '#0f172a', fontWeight: 900,
            border: 'none', borderRadius: 10, fontSize: 15, fontFamily: 'inherit',
            cursor: sending ? 'default' : 'pointer', opacity: sending ? 0.6 : 1,
          }}>
          {sending ? tr('fbSubmitting', lang) : type === 'bug' ? tr('fbReportBug', lang) : tr('fbSend', lang)}
        </button>
      </div>
    </Section>
  );
}

function Caption({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', letterSpacing: 0.3,
      textTransform: 'uppercase', marginBottom: 6 }}>
      {children}
    </div>
  );
}

function UpcomingEvents({ events, lang, brand }: {
  events: UpcomingEvent[]; lang: Lang;
  brand: ReturnType<typeof summaryBrand>;
}) {
  if (!events.length) return null;
  const locale = lang === 'de' ? 'de-DE' : 'en-GB';
  return (
    <Section title={tr('nextQuizzes', lang)}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {events.map(e => {
          const d = e.date ? new Date(e.date).toLocaleDateString(locale, { weekday: 'short', day: '2-digit', month: '2-digit' }) : '';
          return (
            <a key={e.id} href={e.link || '#'}
              onClick={ev => { if (!e.link) ev.preventDefault(); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', borderRadius: 12,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#e2e8f0', textDecoration: 'none',
              }}>
              <div style={{
                width: 52, textAlign: 'center',
                fontSize: 12, fontWeight: 900, color: brand.pink,
                lineHeight: 1.2,
              }}>{d}{e.time && <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{e.time}</div>}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 900 }}>{e.location}</div>
                {(e.city || e.note) && (
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>
                    {[e.city, e.note].filter(Boolean).join(' · ')}
                  </div>
                )}
              </div>
              {e.link && <div style={{ fontSize: 16, color: '#94a3b8' }}>→</div>}
            </a>
          );
        })}
      </div>
    </Section>
  );
}

function PartnerCTA({ lang, brand }: {
  lang: Lang;
  brand: ReturnType<typeof summaryBrand>;
}) {
  return (
    <Section title={tr('partnerTitle', lang)}>
      <div style={{
        background: `linear-gradient(135deg, rgba(${brand.pinkRgb},0.18), rgba(${brand.pinkRgb},0.06))`,
        border: `1px solid rgba(${brand.pinkRgb},0.35)`,
        borderRadius: 14, padding: '16px 16px 14px',
      }}>
        <div style={{ fontSize: 15, fontWeight: 900, color: brand.pink, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
          {tr('partnerHead', lang)}
        </div>
        <div style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 12 }}>
          {tr('partnerBody', lang)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <a href="mailto:hallo@cozywolf.de" style={ctaButton(brand.pink, '#0A0814')}>
            {tr('partnerMail', lang)}
          </a>
          <a href="https://cozywolf.de" target="_blank" rel="noreferrer" style={ctaButton(`rgba(${brand.pinkRgb},0.15)`, brand.pink, `rgba(${brand.pinkRgb},0.40)`)}>
            {tr('partnerWeb', lang)}
          </a>
          <a href="https://instagram.com/cozywolf.events" target="_blank" rel="noreferrer" style={{ ...ctaButton(`rgba(${brand.pinkRgb},0.15)`, brand.pinkSoft, `rgba(${brand.pinkRgb},0.40)`), gridColumn: '1 / -1' }}>
            {tr('partnerInsta', lang)}
          </a>
        </div>
      </div>
    </Section>
  );
}

function ctaButton(bg: string, color: string, border?: string): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: '10px 12px', borderRadius: 10,
    background: bg, color,
    fontSize: 13, fontWeight: 900, fontFamily: 'inherit',
    textDecoration: 'none',
    border: border ? `1px solid ${border}` : 'none',
  };
}

function Footer() {
  const linkStyle: React.CSSProperties = { color: '#94a3b8', textDecoration: 'none' };
  return (
    <div style={{
      marginTop: 28, paddingTop: 18,
      borderTop: '1px solid rgba(255,255,255,0.06)',
      textAlign: 'center', fontSize: 11, color: '#64748b',
    }}>
      <div>CozyQuiz by <b style={{ color: '#94a3b8' }}>cozywolf</b></div>
      <div style={{ marginTop: 4, display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
        <a href="https://play.cozyquiz.app" style={linkStyle}>play.cozyquiz.app</a>
        <span style={{ opacity: 0.4 }}>·</span>
        <a href="https://cozywolf.de" target="_blank" rel="noreferrer" style={linkStyle}>cozywolf.de</a>
        <span style={{ opacity: 0.4 }}>·</span>
        <a href="/impressum" style={linkStyle}>Impressum</a>
        <span style={{ opacity: 0.4 }}>·</span>
        <a href="/datenschutz" style={linkStyle}>Datenschutz</a>
      </div>
    </div>
  );
}
