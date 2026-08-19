import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MyQuizzesHub } from '../components/MyQuizzesHub';

type LinkItem = { path: string; label: string; emoji: string; note?: string };

// ─────────────────────────────────────────────────────────────────────────
// Menü nach ABLAUF gruppiert (2026-07-08, Wolf „unübersichtlich"): Live-Abend →
// Bauen & Vorbereiten → Nachher → Marketing → Test & Dev. Die eigentliche
// Startseite (Meine Quizze) steht darüber, jedes Quiz mit eigenen Aktionen.
// ─────────────────────────────────────────────────────────────────────────

// 🎬 Live-Abend — was am Spielabend selbst läuft
const liveLinks: LinkItem[] = [
  { path: '/moderator',   label: 'Moderator',          emoji: '🎛️', note: 'Fragen steuern, Gewinner bestätigen' },
  { path: '/mopo',        label: 'MoPo (mobile Mod)',  emoji: '📲', note: 'iPhone-Version — großer Space-Button + Mod-Facts' },
  { path: '/beamer',      label: 'Beamer',             emoji: '📽️', note: 'Grid live anzeigen' },
  { path: '/qrcode',      label: 'Beitritts-QR',       emoji: '🔳', note: 'QR-Code für Team-Beitritt' },
];

// 🛠 Bauen & Vorbereiten — Quiz erstellen & fürs Event fertigmachen
const buildLinks: LinkItem[] = [
  { path: '/builder',     label: 'CozyBuilder',        emoji: '🏗️', note: 'Fragensätze erstellen & verwalten' },
  { path: '/library',     label: 'CozyLibrary',        emoji: '📚', note: 'Alle Fragen + 📍 Ort-Filter (keine Wiederholung) + wie oft gespielt' },
  { path: '/rules-editor',label: 'Regeltexte',         emoji: '📜', note: 'Spielregel-Folien, Kategorie-Intros, Runden-Hinweise (lokal)' },
  { path: '/cozygames',   label: 'CozyGames-Editor',   emoji: '🎲', note: 'Mini-Spiele-Katalog für analoge CozyGame-Slots' },
  { path: '/host-sheets', label: 'Host-Sheets',        emoji: '🎙️', note: 'Moderator-Spickzettel als PDF drucken' },
];

// 📊 Nachher — nach dem Spiel: Auswertung & Rückmeldungen
const afterLinks: LinkItem[] = [
  { path: '/stats',    label: 'Stats & Recap',      emoji: '📊', note: 'Alle gespielten Spiele + Sieger — klick → Q-by-Q-Recap, Team-Stats, Awards, Funny-Answers' },
  { path: '/feedback', label: 'Feedback-Dashboard', emoji: '📋', note: 'Spieler-Feedback & Bug-Reports' },
];

// 📣 Marketing & Öffentlich
const marketingLinks: LinkItem[] = [
  { path: '/',          label: 'Landing-Page',      emoji: '🏠', note: 'Öffentliche Startseite (play.cozyquiz.app)' },
  { path: '/about',     label: 'Was ist CozyQuiz?', emoji: 'ℹ️', note: 'Marketing-Erklärseite (/about)' },
  { path: '/reels',     label: 'Reels-Hub',         emoji: '📱', note: 'Alle Werbe-Medien an einem Ort: Trailer-Varianten (allgemein/Team/Location/Geburtstag) + Foto-Karussell' },
  { path: '/showroom',  label: 'Showroom',          emoji: '🖼️', note: 'Format-Showcase mit echten Beamer-Views' },
  { path: '/formats',   label: 'Format-Roadmap',    emoji: '🗺️', note: 'Alle Spielformate (live + Konzepte) auf einen Blick' },
];

// 🧪 Test & Dev — Vorschau-Harnesse & Admin (selten, eingeklappt)
const devLinks: LinkItem[] = [
  { path: '/moderator-test',   label: 'Mod-Test-Modus',     emoji: '🧪', note: 'Mod-Page mit Setup-Skip, 5 Bots, Skip-Buttons. Kein DB-Save — schnelles Reveal-Testen.' },
  { path: '/finalreveal-test', label: 'Final-Flow Test',    emoji: '🎬', note: 'Kompletter End-Flow: Bet → Awards → Climb → Finale. Phase-Toggle + Step-Slider.' },
  { path: '/race-finale',      label: 'Race-Finale',        emoji: '🏁', note: 'Turm-Finale-Vorschau (ohne PIN, auch bei Redeploys erreichbar)' },
  { path: '/barrace-test',     label: 'Bar-Race Test',      emoji: '📊', note: 'CozyArena Bar-Race (Mega-Event / Large-Group)' },
  { path: '/thanks-test',      label: 'Thanks-Page Test',   emoji: '🎉', note: 'Thanks-View mit Mock-Daten (DE/EN, 3-8 Teams)' },
  { path: '/bet-test',         label: 'Bet-Page Test',      emoji: '🎰', note: 'Final-Wager-Beamer-View — 3/5/8 Teams' },
  { path: '/hl-test',          label: 'Mehr-oder-Weniger',  emoji: '⚡', note: 'Comeback Higher/Lower — Frage/Reveal-Phasen' },
  { path: '/cozygame-test',    label: 'CozyGame-Wheel Test',emoji: '🪅', note: 'Glücksrad-Spin + alle 5 Sub-Phasen' },
  { path: '/summary-test',     label: 'Summary Test',       emoji: '📊', note: 'Public-Summary-Page nach QR-Scan' },
  { path: '/admin',            label: 'Admin',              emoji: '⚙️', note: 'PIN, Settings, etc.' },
];

// ─────────────────────────────────────────────────────────────────────────
// Link-Helpers
// ─────────────────────────────────────────────────────────────────────────
const isExternal = (path: string) => /^https?:\/\//i.test(path) || path.endsWith('.html');

function LinkCard({ link, accent }: { link: LinkItem; accent: string }) {
  const inner = (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '11px 14px', borderRadius: 12,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        transition: 'background 0.15s, border-color 0.15s',
        cursor: 'pointer',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.background = `${accent}14`;
        (e.currentTarget as HTMLDivElement).style.borderColor = `${accent}44`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)';
        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.08)';
      }}
    >
      <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>{link.emoji}</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: '#f1f5f9', lineHeight: 1.2 }}>{link.label}</div>
        {link.note && (
          <div style={{
            fontSize: 12, color: '#64748b', marginTop: 2,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{link.note}</div>
        )}
      </div>
    </div>
  );

  if (isExternal(link.path)) {
    return <a href={link.path} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>{inner}</a>;
  }
  return <Link to={link.path} style={{ textDecoration: 'none', color: 'inherit' }}>{inner}</Link>;
}

// ─────────────────────────────────────────────────────────────────────────
// Expandable App-Panel
// ─────────────────────────────────────────────────────────────────────────
function AppPanel({
  label, emoji, tagline, accent, links, defaultOpen = false,
}: {
  label: string; emoji: string; tagline: string;
  accent: string; links: LinkItem[]; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{
      borderRadius: 18,
      border: `1px solid ${open ? accent + '40' : 'rgba(255,255,255,0.07)'}`,
      background: open ? `${accent}09` : 'rgba(255,255,255,0.025)',
      overflow: 'hidden',
      transition: 'border-color 0.2s, background 0.2s',
    }}>
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 14,
          padding: '18px 20px', background: 'transparent', border: 'none',
          cursor: 'pointer', textAlign: 'left', color: '#e2e8f0',
        }}
      >
        <div style={{
          width: 48, height: 48, borderRadius: 14, flexShrink: 0,
          background: `${accent}22`, border: `1.5px solid ${accent}44`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
        }}>
          {emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 900, fontSize: 18, color: '#f8fafc', lineHeight: 1.2 }}>{label}</div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{tagline}</div>
        </div>
        <div style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
          background: open ? `${accent}22` : 'rgba(255,255,255,0.06)',
          border: `1px solid ${open ? accent + '44' : 'rgba(255,255,255,0.10)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, color: open ? accent : '#64748b',
          transition: 'all 0.2s',
        }}>
          {open ? '−' : '+'}
        </div>
      </button>
      {open && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 8, padding: '0 16px 16px',
        }}>
          {links.map(link => (
            <LinkCard key={link.path} link={link} accent={accent} />
          ))}
        </div>
      )}
    </div>
  );
}

function MenuTile({
  label, emoji, accent, meta, to, onClick, active = false,
}: {
  label: string; emoji: string; accent: string; meta?: string; to?: string;
  onClick?: () => void; active?: boolean;
}) {
  const content = (
    <>
      <span aria-hidden style={{ fontSize: 28, lineHeight: 1 }}>{emoji}</span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', color: '#fff7fb', fontSize: 15, fontWeight: 900, lineHeight: 1.15 }}>{label}</span>
        {meta && <span style={{ display: 'block', color: '#c5b5c1', fontSize: 12, fontWeight: 700, marginTop: 5 }}>{meta}</span>}
      </span>
    </>
  );
  const style = {
    minHeight: 148, padding: 20, borderRadius: 22, textDecoration: 'none',
    display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-start',
    justifyContent: 'space-between', gap: 14, color: 'inherit', fontFamily: 'inherit',
    background: active ? `${accent}28` : 'rgba(255,255,255,0.055)',
    border: `1px solid ${active ? `${accent}88` : 'rgba(255,255,255,0.11)'}`,
    boxShadow: active ? `inset 0 1px 0 rgba(255,255,255,.18), 0 12px 28px ${accent}20` : 'inset 0 1px 0 rgba(255,255,255,.07)',
    cursor: 'pointer', textAlign: 'left' as const,
  };
  if (to) return <Link to={to} style={style}>{content}</Link>;
  return <button type="button" onClick={onClick} aria-pressed={active} style={{ ...style, width: '100%' }}>{content}</button>;
}

// ─────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────
const MenuPage = () => {
  const [showTools, setShowTools] = useState(false);
  const [showLive, setShowLive] = useState(false);
  const [showQuizzes, setShowQuizzes] = useState(false);
  const [introVisible, setIntroVisible] = useState(() => {
    try {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const previewIntro = new URLSearchParams(window.location.search).has('intro');
      return !reduced && (previewIntro || sessionStorage.getItem('cozywolf-intro-seen') !== '1');
    } catch {
      return false;
    }
  });

  const dismissIntro = () => {
    try { sessionStorage.setItem('cozywolf-intro-seen', '1'); } catch { /* ignore */ }
    setIntroVisible(false);
  };

  useEffect(() => {
    if (!introVisible) return;
    const timer = window.setTimeout(dismissIntro, 2450);
    return () => window.clearTimeout(timer);
  }, [introVisible]);

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'radial-gradient(circle at 18% -12%, #35112f 0%, #160d23 33%, #090b15 76%)',
      color: '#e2e8f0',
      fontFamily: 'var(--font)',
      padding: '0 0 72px',
    }}>
      <style>{`
        .qq-menu-tile { transition: transform .16s ease, border-color .16s ease, background .16s ease; }
        .qq-menu-tile:hover { transform: translateY(-2px); border-color: rgba(251,207,232,.40); }
        .qq-menu-tile:focus-visible { outline: 3px solid #f9a8d4; outline-offset: 3px; }
        .qq-menu-grid { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
        .qq-lounge-tools:focus-visible { outline: 3px solid #f9a8d4; outline-offset: 4px; }
        @keyframes cozyWolfIntroStage {
          0% { opacity: 0; transform: scale(1.09); filter: saturate(.55) brightness(.52); }
          30%, 76% { opacity: .76; transform: scale(1); filter: saturate(1) brightness(.82); }
          100% { opacity: 0; transform: scale(1.02); filter: saturate(1) brightness(.68); }
        }
        @keyframes cozyWolfIntroWolf {
          0%, 13% { opacity: 0; transform: translateY(70px) scale(.72) rotate(-7deg); }
          37% { opacity: 1; transform: translateY(-8px) scale(1.04) rotate(2deg); }
          48%, 76% { opacity: 1; transform: translateY(0) scale(1) rotate(0); }
          100% { opacity: 0; transform: translateY(-20px) scale(.98); }
        }
        @keyframes cozyWolfIntroWord {
          0%, 27% { opacity: 0; transform: translateY(14px); letter-spacing: .08em; }
          47%, 77% { opacity: 1; transform: translateY(0); letter-spacing: -.055em; }
          100% { opacity: 0; transform: translateY(-7px); }
        }
        @keyframes cozyWolfIntroSpark {
          0%, 28% { opacity: 0; transform: scaleX(0); }
          45%, 76% { opacity: 1; transform: scaleX(1); }
          100% { opacity: 0; transform: scaleX(.4); }
        }
        .cozywolf-intro-stage { animation: cozyWolfIntroStage 2.32s cubic-bezier(.22,1,.36,1) both; }
        .cozywolf-intro-wolf { animation: cozyWolfIntroWolf 2.32s cubic-bezier(.22,1,.36,1) both; }
        .cozywolf-intro-word { animation: cozyWolfIntroWord 2.32s cubic-bezier(.22,1,.36,1) both; }
        .cozywolf-intro-spark { animation: cozyWolfIntroSpark 2.32s cubic-bezier(.22,1,.36,1) both; transform-origin: center; }
        @media (prefers-reduced-motion: reduce) {
          .qq-menu-tile { transition: none; }
          .qq-menu-tile:hover { transform: none; }
          .cozywolf-intro-stage, .cozywolf-intro-wolf, .cozywolf-intro-word, .cozywolf-intro-spark { animation: none; }
        }
        @media (max-width: 720px) {
          .qq-menu-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
        }
      `}</style>

      {introVisible && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10000, display: 'grid', placeItems: 'center',
          background: 'radial-gradient(circle at 50% 46%, #3a1238 0%, #130b21 42%, #070810 100%)',
          overflow: 'hidden',
        }}>
          <div className="cozywolf-intro-stage" aria-hidden style={{ position: 'absolute', inset: '-4%', background: "linear-gradient(90deg, rgba(9,6,18,.58), rgba(9,6,18,.10)), url('/images/quiz-lounge-host-bg.png') center / cover" }} />
          <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', display: 'grid', justifyItems: 'center' }}>
            <img className="cozywolf-intro-wolf" src="/avatars/cozywolf/augenauf.mundauf.winken.webp" alt="CozyWolf" style={{ width: 230, height: 230, objectFit: 'contain', filter: 'drop-shadow(0 20px 30px rgba(236,72,153,.42))' }} />
            <div className="cozywolf-intro-word" style={{ color: '#fff7fb', fontSize: 42, fontWeight: 900, letterSpacing: '-.055em', marginTop: -28, textShadow: '0 6px 22px rgba(0,0,0,.46)' }}>CozyWolf</div>
            <div className="cozywolf-intro-spark" aria-hidden style={{ width: 130, height: 2, marginTop: 12, background: 'linear-gradient(90deg, transparent, #ec4899 25%, #f9a8d4 50%, #ec4899 75%, transparent)', boxShadow: '0 0 16px rgba(236,72,153,.8)' }} />
          </div>
          <button type="button" onClick={dismissIntro} style={{ position: 'absolute', right: 22, bottom: 20, padding: '9px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,.18)', background: 'rgba(255,255,255,.05)', color: '#eadbe7', font: 'inherit', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>Überspringen</button>
        </div>
      )}

      {/* Private Host-Shell: bewusst wie ein ruhiges Regiepult, nicht wie eine
          öffentliche Produktseite. */}
      <div style={{
        borderBottom: '1px solid rgba(255,255,255,0.10)',
        padding: '14px clamp(20px, 4vw, 48px)',
        display: 'flex', alignItems: 'center', gap: 18,
        background: 'rgba(8, 6, 17, 0.72)', backdropFilter: 'blur(18px)',
      }}>
        <img
          src="/logo.png"
          alt="CozyQuiz"
          style={{ width: 44, height: 44, borderRadius: 13, objectFit: 'contain', boxShadow: '0 0 0 1px rgba(236,72,153,.30)' }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 900, fontSize: 18, color: '#fff7fb', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
            CozyQuiz
          </div>
          <div style={{ fontSize: 11, color: '#c084a5', marginTop: 3, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 800 }}>
            Menü
          </div>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 11px', borderRadius: 999, background: 'rgba(236,72,153,.10)', border: '1px solid rgba(236,72,153,.27)', color: '#fbcfe8', fontSize: 12, fontWeight: 800 }}>
          <span aria-hidden style={{ width: 7, height: 7, borderRadius: '50%', background: '#ec4899', boxShadow: '0 0 12px #ec4899' }} />
          Regiepult
        </div>
      </div>

      <main id="main" tabIndex={-1} style={{ outline: 'none' }}>
      <section style={{
        maxWidth: 1120, margin: '0 auto', padding: '42px 28px 36px',
      }}>
        <div className="qq-menu-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 18 }}>
          <div className="qq-menu-tile"><MenuTile label="Spielabend" emoji="🎬" accent="#60a5fa" meta="Moderator, Beamer, QR" onClick={() => setShowLive(open => !open)} active={showLive} /></div>
          <div className="qq-menu-tile"><MenuTile label="Meine Quizze" emoji="🎯" accent="#ec4899" meta="Starten & bearbeiten" onClick={() => setShowQuizzes(open => !open)} active={showQuizzes} /></div>
          <div className="qq-menu-tile"><MenuTile label="Neues Quiz" emoji="＋" accent="#ec4899" meta="Fragen anlegen" to="/builder" active /></div>
          <div className="qq-menu-tile"><MenuTile label="Bibliothek" emoji="📚" accent="#f472b6" meta="Fragenpool" to="/library" /></div>
          <div className="qq-menu-tile"><MenuTile label="Regeltexte" emoji="📜" accent="#f472b6" meta="Intros & Hinweise" to="/rules-editor" /></div>
          <div className="qq-menu-tile"><MenuTile label="Host-Sheets" emoji="🎙️" accent="#f472b6" meta="Spickzettel drucken" to="/host-sheets" /></div>
          <div className="qq-menu-tile"><MenuTile label="Rückblick" emoji="📊" accent="#a78bfa" meta="Recaps & Feedback" to="/stats" /></div>
          <div className="qq-menu-tile"><MenuTile label="CozyGames" emoji="🎲" accent="#a78bfa" meta="Mini-Spiele" to="/cozygames" /></div>
          <div className="qq-menu-tile"><MenuTile label="Weitere Werkzeuge" emoji="•••" accent="#64748b" meta="Selten gebraucht" onClick={() => setShowTools(open => !open)} active={showTools} /></div>
        </div>

        {showQuizzes && <div style={{
          padding: '20px', borderRadius: 22,
          background: 'rgba(11, 11, 23, .72)',
          border: '1px solid rgba(255,255,255,.11)', backdropFilter: 'blur(14px)',
        }}>
          <MyQuizzesHub open={showQuizzes} onOpenChange={setShowQuizzes} />
        </div>}

        {showLive && (
          <section aria-label="Spielabend" style={{ marginTop: 16, padding: 20, borderRadius: 22, background: 'rgba(10,16,31,.74)', border: '1px solid rgba(96,165,250,.30)' }}>
            <div style={{ color: '#bfdbfe', fontSize: 13, fontWeight: 900, marginBottom: 14 }}>Spielabend</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 10 }}>
              <div className="qq-menu-tile"><MenuTile label="Moderator" emoji="🎛️" accent="#60a5fa" meta="Show steuern" to="/moderator" active /></div>
              <div className="qq-menu-tile"><MenuTile label="Beamer" emoji="📽️" accent="#60a5fa" meta="Bühne öffnen" to="/beamer" /></div>
              <div className="qq-menu-tile"><MenuTile label="Beitritts-QR" emoji="🔳" accent="#60a5fa" meta="Teams verbinden" to="/qrcode" /></div>
              <div className="qq-menu-tile"><MenuTile label="MoPo" emoji="📲" accent="#60a5fa" meta="Mobile Moderation" to="/mopo" /></div>
            </div>
          </section>
        )}
      </section>

      {showTools && <div style={{
        maxWidth: 1120, margin: '0 auto', padding: '8px 28px 0',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
          <AppPanel
            label="Quizwerkstatt"
            emoji="🛠"
            tagline="Fragen, Regeln, Mini-Spiele und Host-Material pflegen"
            accent="#EC4899"
            links={buildLinks}
          />

          <AppPanel
            label="Vergangene Abende"
            emoji="📊"
            tagline="Auswertung und Rückmeldungen nach dem Spiel"
            accent="#A78BFA"
            links={afterLinks}
          />

          <AppPanel
            label="Öffentliches & Marketing"
            emoji="📣"
            tagline="Landing, Erklärseite, Reels und Formatübersicht"
            accent="#22C55E"
            links={marketingLinks}
          />

          <AppPanel
            label="Entwicklerwerkzeuge"
            emoji="🧪"
            tagline="Test-Harnesse und Administration — selten gebraucht"
            accent="#6B7280"
            links={devLinks}
          />
      </div>}
      </main>
    </div>
  );
};

export default MenuPage;
