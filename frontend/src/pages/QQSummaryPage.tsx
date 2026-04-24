// Public Team-Summary-Seite — Spieler scannen nach dem Spiel den QR-Code
// auf dem Beamer, landen hier, wählen ihr Team, sehen eigene Stats + Feedback-
// Formular + nächste Quiz-Termine.

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { qqGetAvatar } from '../../../shared/quarterQuizTypes';
import { API_BASE } from '../api';
import { QQEmojiIcon } from '../components/QQIcon';

type Lang = 'de' | 'en';

type SummaryTeam = {
  id: string;
  name: string;
  color: string;
  avatarId: string;
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
  teams: SummaryTeam[];
  funnyAnswers: Array<{ teamId: string; teamName: string; text: string; questionText: string }>;
};

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
  loadError:     { de: 'Oha, da ist was beim Laden schiefgegangen. Versuch es nochmal in ein paar Minuten.',
                   en: 'Oops, something went wrong loading. Try again in a few minutes.' },
  unknownError:  { de: 'Unbekannter Fehler.', en: 'Unknown error.' },
  loading:       { de: 'Lade eure Stats\u2026', en: 'Loading your stats\u2026' },

  whichTeam:     { de: 'Welches Team seid ihr?', en: 'Which team are you?' },
  rankShort:     { de: 'Platz', en: 'Rank' },
  fields:        { de: 'Felder', en: 'fields' },
  pickOther:     { de: '\u21A9 anderes Team w\u00E4hlen', en: '\u21A9 pick another team' },

  yourNumbers:   { de: 'Eure Zahlen', en: 'Your numbers' },
  largestArea:   { de: 'Gr\u00F6\u00DFtes Gebiet', en: 'Largest area' },
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
  cat_CHEESE:        { de: 'Picture This', en: 'Picture This' },

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
  footerBy:      { de: 'CozyQuiz von', en: 'CozyQuiz by' },
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

// ── Main ───────────────────────────────────────────────────────────────────────
export default function QQSummaryPage() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [upcoming, setUpcoming] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>(detectInitialLang);

  function changeLang(next: Lang) {
    setLang(next);
    try { window.localStorage.setItem('qqSummaryLang', next); } catch {}
  }

  useEffect(() => {
    if (!roomCode) return;
    let cancelled = false;
    (async () => {
      try {
        const [sRes, uRes] = await Promise.all([
          fetch(`${API_BASE}/qq/summary/${encodeURIComponent(roomCode)}`),
          fetch(`${API_BASE}/qq/upcoming`).catch(() => null),
        ]);
        if (!sRes.ok) {
          if (!cancelled) setError(tr('notFoundMsg', lang));
          return;
        }
        const s: Summary = await sRes.json();
        if (!cancelled) setSummary(s);
        if (uRes && uRes.ok) {
          const u: UpcomingEvent[] = await uRes.json();
          if (!cancelled) setUpcoming(u);
        }
      } catch {
        if (!cancelled) setError(tr('loadError', lang));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode]);

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
    return <Shell lang={lang} onLang={changeLang}><Loading lang={lang} /></Shell>;
  }

  if (error || !summary) {
    return (
      <Shell lang={lang} onLang={changeLang}>
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
    return (
      <Shell lang={lang} onLang={changeLang}>
        <Hero draftTitle={summary.draftTitle} winner={summary.winner} playedAt={summary.playedAt} lang={lang} />
        <Section title={tr('whichTeam', lang)}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
            {ranking.map((t, i) => {
              const av = qqGetAvatar(t.avatarId);
              return (
                <button key={t.id} onClick={() => setSelectedTeamId(t.id)}
                  style={{
                    padding: 14, borderRadius: 16,
                    background: t.color + '22', border: `2px solid ${t.color}`,
                    cursor: 'pointer', color: '#fff', fontFamily: 'inherit',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  }}>
                  <img src={av.image} alt={av.label} style={{
                    width: 56, height: 56, borderRadius: '50%',
                    objectFit: 'cover',
                    background: t.color, padding: 2,
                  }} />
                  <div style={{ fontSize: 15, fontWeight: 900 }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: '#cbd5e1' }}>
                    {tr('rankShort', lang)} {i + 1} · {t.largestConnected} {tr('fields', lang)}
                  </div>
                </button>
              );
            })}
          </div>
        </Section>
        <FeedbackForm roomCode={summary.roomCode} lang={lang} />
        <PartnerCTA lang={lang} />
        <UpcomingEvents events={upcoming} lang={lang} />
        <Footer />
      </Shell>
    );
  }

  // Team-Detail-Screen
  const place = ranking.findIndex(t => t.id === selectedTeam.id) + 1;
  const av = qqGetAvatar(selectedTeam.avatarId);
  const placeLabel = formatPlaceLabel(place, lang);
  const myFunny = summary.funnyAnswers.find(f => f.teamId === selectedTeam.id);
  const accuracy = selectedTeam.answered > 0 ? Math.round((selectedTeam.correct / selectedTeam.answered) * 100) : null;

  return (
    <Shell lang={lang} onLang={changeLang}>
      <div style={{
        background: `linear-gradient(135deg, ${selectedTeam.color}33 0%, rgba(15,23,42,0) 60%)`,
        padding: '28px 20px 22px', borderRadius: 20, marginBottom: 18,
        border: `1px solid ${selectedTeam.color}55`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center',
      }}>
        <div style={{
          width: 112, height: 112, borderRadius: '50%',
          background: selectedTeam.color,
          border: '4px solid #fff',
          boxShadow: `0 10px 30px ${selectedTeam.color}66`,
          overflow: 'hidden',
        }}>
          <img src={av.image} alt={av.label} style={{
            width: '100%', height: '100%', objectFit: 'cover', display: 'block',
          }} />
        </div>
        <div style={{ fontSize: 13, fontWeight: 900, color: '#fbbf24', letterSpacing: 0.3, textTransform: 'uppercase' }}>
          {placeLabel}
        </div>
        <div style={{ fontSize: 28, fontWeight: 900, color: '#f8fafc' }}>{selectedTeam.name}</div>
        <button onClick={() => setSelectedTeamId(null)}
          style={{
            marginTop: 6, fontSize: 12, color: '#94a3b8', background: 'transparent',
            border: '1px solid rgba(255,255,255,0.15)', borderRadius: 999,
            padding: '4px 12px', cursor: 'pointer', fontFamily: 'inherit',
          }}>{tr('pickOther', lang)}</button>
      </div>

      <Section title={tr('yourNumbers', lang)}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          <Stat label={tr('largestArea', lang)} value={selectedTeam.largestConnected} suffix={tr('fieldsUnit', lang)} accent={selectedTeam.color} />
          <Stat label={tr('fieldsTotal', lang)} value={selectedTeam.totalCells} suffix={tr('pieces', lang)} accent={selectedTeam.color} />
          <Stat label={tr('correct', lang)} value={selectedTeam.correct} suffix={`/ ${selectedTeam.answered}`} accent="#22C55E" />
          <Stat label={tr('accuracy', lang)} value={accuracy != null ? `${accuracy}%` : '—'} accent="#22C55E" />
          <Stat label={tr('jokersEarned', lang)} value={selectedTeam.jokersEarned} accent="#EAB308" />
          <Stat label={tr('stolen', lang)} value={selectedTeam.stealsUsed} suffix={tr('times', lang)} accent="#EF4444" />
        </div>
      </Section>

      {/* H3 Superlatives: narrative End-Game-Titel */}
      <Superlatives teams={summary.teams} selectedId={selectedTeam.id} lang={lang} />

      {myFunny && (
        <Section title={tr('yourMoment', lang)}>
          <div style={{
            background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)',
            borderRadius: 12, padding: '12px 14px',
          }}>
            <div style={{ fontSize: 11, color: '#fbbf24', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 4 }}>
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
            const tAv = qqGetAvatar(t.avatarId);
            const isMe = t.id === selectedTeam.id;
            return (
              <div key={t.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px', borderRadius: 10,
                background: isMe ? t.color + '22' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isMe ? t.color : 'rgba(255,255,255,0.06)'}`,
              }}>
                <span style={{ fontSize: 12, fontWeight: 900, color: '#94a3b8', width: 22 }}>{i + 1}.</span>
                <img src={tAv.image} alt={tAv.label} style={{
                  width: 28, height: 28, borderRadius: '50%', objectFit: 'cover',
                  background: t.color, padding: 1,
                }} />
                <span style={{ flex: 1, fontSize: 14, fontWeight: 800, color: isMe ? t.color : '#e2e8f0' }}>{t.name}</span>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>
                  {t.largestConnected} <span style={{ fontSize: 10 }}>{tr('fields', lang)}</span>
                </span>
              </div>
            );
          })}
        </div>
      </Section>

      <FeedbackForm roomCode={summary.roomCode} teamName={selectedTeam.name} lang={lang} />
      <PartnerCTA lang={lang} />
      <UpcomingEvents events={upcoming} lang={lang} />
      <Footer />
    </Shell>
  );
}

function formatPlaceLabel(place: number, lang: Lang): string {
  if (lang === 'de') {
    const medal = place === 1 ? <QQEmojiIcon emoji="🥇"/> : place === 2 ? <QQEmojiIcon emoji="🥈"/> : place === 3 ? <QQEmojiIcon emoji="🥉"/> : '🎖️';
    return `${medal} ${place}. Platz`;
  }
  const medal = place === 1 ? <QQEmojiIcon emoji="🥇"/> : place === 2 ? <QQEmojiIcon emoji="🥈"/> : place === 3 ? <QQEmojiIcon emoji="🥉"/> : '🎖️';
  const ord = place === 1 ? '1st' : place === 2 ? '2nd' : place === 3 ? '3rd' : `${place}th`;
  return `${medal} ${ord} place`;
}

// ── Helpers & Subcomponents ───────────────────────────────────────────────────

function Shell({ children, lang, onLang }: { children: React.ReactNode; lang: Lang; onLang: (l: Lang) => void }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0b0f1e 0%, #0f172a 100%)',
      color: '#e2e8f0',
      fontFamily: "'Nunito', system-ui, sans-serif",
      padding: '20px 16px 40px',
    }}>
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        <LangToggle lang={lang} onLang={onLang} />
        {children}
      </div>
    </div>
  );
}

function LangToggle({ lang, onLang }: { lang: Lang; onLang: (l: Lang) => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
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
                background: active ? '#fbbf24' : 'transparent',
                color: active ? '#1e293b' : '#94a3b8',
                border: 'none', cursor: 'pointer',
                letterSpacing: 0.4,
              }}>{l.toUpperCase()}</button>
          );
        })}
      </div>
    </div>
  );
}

function Hero({ draftTitle, winner, playedAt, lang }: { draftTitle: string; winner: string | null; playedAt: number; lang: Lang }) {
  const locale = lang === 'de' ? 'de-DE' : 'en-GB';
  const date = new Date(playedAt).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
  return (
    <div style={{
      padding: '24px 20px', borderRadius: 20, marginBottom: 18, textAlign: 'center',
      background: 'radial-gradient(ellipse at top, rgba(251,191,36,0.15), transparent 70%)',
      border: '1px solid rgba(251,191,36,0.2)',
    }}>
      <div style={{ fontSize: 11, letterSpacing: 0.3, color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>
        CozyQuiz · {date}
      </div>
      <div style={{ fontSize: 22, fontWeight: 900, color: '#f8fafc', marginTop: 4 }}>{draftTitle}</div>
      {winner && (
        <div style={{ marginTop: 10, fontSize: 14, color: '#fbbf24', fontWeight: 800 }}>
          <QQEmojiIcon emoji="🏆"/> {tr('champion', lang)}: {winner}
        </div>
      )}
    </div>
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
function useCountUp(finalValue: number | string, durationMs = 720): string {
  const [display, setDisplay] = useState<string>(() => {
    if (typeof finalValue === 'string') return finalValue;
    return '0';
  });
  useEffect(() => {
    if (typeof finalValue === 'string') {
      // Prozent-String wie "53%" → anzaehlen auf Zahl, dann % anhaengen
      const pctMatch = finalValue.match(/^(-?\d+(?:\.\d+)?)%$/);
      if (pctMatch) {
        const target = Number(pctMatch[1]);
        animateTo(target, (v) => setDisplay(`${Math.round(v)}%`), durationMs);
        return;
      }
      setDisplay(finalValue);
      return;
    }
    const target = finalValue;
    animateTo(target, (v) => setDisplay(String(Math.round(v))), durationMs);
  }, [finalValue, durationMs]);
  return display;
}

function animateTo(target: number, onTick: (v: number) => void, durationMs: number): void {
  const start = performance.now();
  const ease = (t: number) => 1 - Math.pow(1 - t, 3); // ease-out-cubic
  let rafId = 0;
  const tick = (now: number) => {
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
  // Cleanup falls neuer Effect triggered
  // (React behandelt das automatisch via useEffect-Cleanup)
  return undefined as unknown as void;
}

function Stat({ label, value, suffix, accent }: { label: string; value: number | string; suffix?: string; accent: string }) {
  const animated = useCountUp(value);
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

// H3 Superlatives: leitet narrative Titel aus den Team-Stats ab.
// Max 4 werden angezeigt, nur wenn sie Sinn machen (>0-Werte / eindeutig).
function Superlatives({ teams, selectedId, lang }: {
  teams: SummaryTeam[]; selectedId: string; lang: Lang;
}) {
  if (teams.length < 2) return null;

  type SuperTitle = {
    emoji: string;
    titleDe: string; titleEn: string;
    descDe: string; descEn: string;
    winner: SummaryTeam;
    metric: string; // e.g. "6 Klaus"
    accent: string;
  };
  const titles: SuperTitle[] = [];

  // Meister-Klauer
  const stealsSorted = [...teams].sort((a, b) => b.stealsUsed - a.stealsUsed);
  if (stealsSorted[0].stealsUsed >= 2 && stealsSorted[0].stealsUsed > stealsSorted[1].stealsUsed) {
    titles.push({
      emoji: '⚡',
      titleDe: 'Meister-Klauer', titleEn: 'Master Thief',
      descDe: 'meiste Klaus im Spiel', descEn: 'most steals overall',
      winner: stealsSorted[0],
      metric: `${stealsSorted[0].stealsUsed}× ${lang === 'de' ? 'geklaut' : 'stolen'}`,
      accent: '#EF4444',
    });
  }
  // Trefferkönig
  const withAccuracy = teams
    .filter(t => t.answered >= 5)
    .map(t => ({ t, acc: t.correct / t.answered }));
  if (withAccuracy.length > 0) {
    withAccuracy.sort((a, b) => b.acc - a.acc);
    const top = withAccuracy[0];
    if (top.acc >= 0.6) {
      titles.push({
        emoji: '🎯',
        titleDe: 'Trefferkönig', titleEn: 'Accuracy King',
        descDe: 'beste Trefferquote', descEn: 'highest accuracy',
        winner: top.t,
        metric: `${Math.round(top.acc * 100)}%`,
        accent: '#22C55E',
      });
    }
  }
  // Joker-Jäger
  const jokerSorted = [...teams].sort((a, b) => b.jokersEarned - a.jokersEarned);
  if (jokerSorted[0].jokersEarned >= 1 && jokerSorted[0].jokersEarned > (jokerSorted[1]?.jokersEarned ?? 0)) {
    titles.push({
      emoji: '⭐',
      titleDe: 'Joker-Jäger', titleEn: 'Joker Hunter',
      descDe: 'meiste Joker verdient', descEn: 'most jokers earned',
      winner: jokerSorted[0],
      metric: `${jokerSorted[0].jokersEarned} ⭐`,
      accent: '#F59E0B',
    });
  }
  // Territorium-König (Sieger mit dem größten zusammenhängenden Gebiet)
  const largestSorted = [...teams].sort((a, b) => b.largestConnected - a.largestConnected);
  if (largestSorted[0].largestConnected >= 3) {
    titles.push({
      emoji: '🏆',
      titleDe: 'Territorium-König', titleEn: 'Territory King',
      descDe: 'größtes Cluster', descEn: 'biggest cluster',
      winner: largestSorted[0],
      metric: `${largestSorted[0].largestConnected} ${lang === 'de' ? 'Felder' : 'fields'}`,
      accent: '#3B82F6',
    });
  }

  if (titles.length === 0) return null;

  const sectionTitle = lang === 'de' ? 'Ehrentitel' : 'Honors';
  return (
    <Section title={sectionTitle}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
        {titles.map((title, i) => {
          const av = qqGetAvatar(title.winner.avatarId);
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
                  background: '#FDE047', color: '#1c1304',
                  fontSize: 10, fontWeight: 900, letterSpacing: 0.3,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
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
                <img src={av.image} alt={av.label} style={{
                  width: 38, height: 38, borderRadius: '50%',
                  objectFit: 'cover', background: title.winner.color, padding: 2,
                }} />
                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1, minWidth: 0 }}>
                  <span style={{
                    fontSize: 14, fontWeight: 900, color: title.winner.color,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{title.winner.name}</span>
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
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🎲</div>
      <div style={{ color: '#94a3b8' }}>{tr('loading', lang)}</div>
    </div>
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

function FeedbackForm({ roomCode, teamName, lang }: { roomCode: string; teamName?: string; lang: Lang }) {
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
    if (!text.trim()) { setErr(tr('fbErrEmpty', lang)); return; }
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

function UpcomingEvents({ events, lang }: { events: UpcomingEvent[]; lang: Lang }) {
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
                fontSize: 12, fontWeight: 900, color: '#fbbf24',
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

function PartnerCTA({ lang }: { lang: Lang }) {
  return (
    <Section title={tr('partnerTitle', lang)}>
      <div style={{
        background: 'linear-gradient(135deg, rgba(251,191,36,0.12), rgba(236,72,153,0.08))',
        border: '1px solid rgba(251,191,36,0.3)',
        borderRadius: 14, padding: '16px 16px 14px',
      }}>
        <div style={{ fontSize: 15, fontWeight: 900, color: '#fbbf24', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
          {tr('partnerHead', lang)}
        </div>
        <div style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 12 }}>
          {tr('partnerBody', lang)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <a href="mailto:hallo@cozywolf.de" style={ctaButton('#fbbf24', '#1e293b')}>
            {tr('partnerMail', lang)}
          </a>
          <a href="https://cozywolf.de" target="_blank" rel="noreferrer" style={ctaButton('rgba(251,191,36,0.15)', '#fbbf24', 'rgba(251,191,36,0.4)')}>
            {tr('partnerWeb', lang)}
          </a>
          <a href="https://instagram.com/cozywolf.events" target="_blank" rel="noreferrer" style={{ ...ctaButton('rgba(236,72,153,0.15)', '#f0abfc', 'rgba(236,72,153,0.4)'), gridColumn: '1 / -1' }}>
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
  return (
    <div style={{
      marginTop: 28, paddingTop: 18,
      borderTop: '1px solid rgba(255,255,255,0.06)',
      textAlign: 'center', fontSize: 11, color: '#64748b',
    }}>
      <div>CozyQuiz by <b style={{ color: '#94a3b8' }}>cozywolf</b></div>
      <div style={{ marginTop: 4, display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
        <a href="https://play.cozyquiz.app" style={{ color: '#94a3b8', textDecoration: 'none' }}>play.cozyquiz.app</a>
        <span style={{ opacity: 0.4 }}>·</span>
        <a href="https://cozywolf.de" target="_blank" rel="noreferrer" style={{ color: '#94a3b8', textDecoration: 'none' }}>cozywolf.de</a>
      </div>
    </div>
  );
}
