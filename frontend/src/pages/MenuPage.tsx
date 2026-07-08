import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MyQuizzesHub } from '../components/MyQuizzesHub';

type LinkItem = { path: string; label: string; emoji: string; note?: string };

// ─────────────────────────────────────────────────────────────────────────
// CozyQuiz — Live-Spiel-Elemente (alles was an einem Quiz-Abend gebraucht wird)
// ─────────────────────────────────────────────────────────────────────────
const cozyQuizLinks: LinkItem[] = [
  { path: '/moderator',   label: 'Moderator',          emoji: '🎛️', note: 'Fragen steuern, Gewinner bestätigen' },
  { path: '/mopo',        label: 'MoPo (mobile Mod)',  emoji: '📲', note: 'iPhone-Version — großer Space-Button + Mod-Facts' },
  { path: '/beamer',      label: 'Beamer',             emoji: '📽️', note: 'Grid live anzeigen' },
  { path: '/team',        label: 'Team',               emoji: '📱', note: 'Antworten eingeben & Felder wählen' },
  { path: '/builder',     label: 'CozyBuilder',        emoji: '🏗️', note: 'Fragensätze erstellen & verwalten' },
  { path: '/library',     label: 'CozyLibrary',        emoji: '📚', note: 'Alle Fragen + Topic-Filter + wie oft schon gespielt' },
  { path: '/cozygames',   label: 'CozyGames-Editor',   emoji: '🎲', note: 'Mini-Spiele-Katalog für analoge CozyGame-Slots im Quiz' },
  { path: '/host-sheets', label: 'Host-Sheets',        emoji: '🎙️', note: 'Moderator-Spickzettel als PDF drucken' },
  { path: '/feedback',    label: 'Feedback-Dashboard', emoji: '📋', note: 'Spieler-Feedback & Bug-Reports' },
  { path: '/recap',       label: 'Recap-Übersicht',    emoji: '📊', note: 'Alle gespielten Quizze auf einen Blick — klick auf Spiel → Q-by-Q-History, Team-Stats, Awards, Funny-Answers' },
];

// ─────────────────────────────────────────────────────────────────────────
// CozyQuiz Test-Pages — Standalone-Vorschauen einzelner Quiz-Slides ohne ein
// echtes Spiel durchzuziehen. Mit Toggle-Toolbars für Sprache/Teams/Awards.
// ─────────────────────────────────────────────────────────────────────────
const cozyQuizTestLinks: LinkItem[] = [
  { path: '/thanks-test',      label: 'Thanks-Page Test',   emoji: '🎉', note: 'Standalone-Vorschau der Thanks-View mit Mock-Daten (DE/EN, 3-8 Teams, Award-Sets)' },
  { path: '/finalreveal-test', label: 'Final-Flow Test',    emoji: '🎬', note: 'Kompletter End-Flow: Bet-Intro → Bet-Active → Awards-Reveal (Split+Tabelle) → Bet-Cards (Climb) → Eurovision-Finale. Phase-Toggle + Step-Slider.' },
  { path: '/moderator-test',   label: 'Mod-Test-Modus',     emoji: '🧪', note: 'Mod-Page mit Setup-Skip, 5 Bots auto-gespawnt, Skip-Buttons (→ Runde 2/3/4, FinalBet, FinalReveal). Kein DB-Save. Für schnelles Reveal-Choreo-Testen.' },
  { path: '/bet-test',         label: 'Bet-Page Test',      emoji: '🎰', note: 'Final-Wager-Beamer-View — 3/5/8 Teams, Submit-Count Slider, Sprache' },
  { path: '/hl-test',          label: 'Mehr-oder-Weniger',  emoji: '⚡', note: 'Comeback Higher/Lower — 1-5 Teams, Frage/Reveal-Phasen, Higher/Lower-Choice, 4 Pair-Beispiele' },
  { path: '/cozygame-test',    label: 'CozyGame-Wheel Test',emoji: '🪅', note: 'Standalone-Test: Glücksrad-Spin + alle 5 Sub-Phasen, Slice-Slider 3-8, Auto-Demo-Button' },
  { path: '/summary-test',     label: 'Summary Test',       emoji: '📊', note: 'Public-Summary-Page nach QR-Scan — 3/5/8 Teams, Awards, ESC-Mode-Toggle' },
];

// ─────────────────────────────────────────────────────────────────────────
// Marketing & Öffentlich — Seiten, die auch ohne Login/Spiel erreichbar sind
// ─────────────────────────────────────────────────────────────────────────
const marketingLinks: LinkItem[] = [
  { path: '/',         label: 'Landing-Page',      emoji: '🏠', note: 'Öffentliche Startseite (play.cozyquiz.app)' },
  { path: '/about',    label: 'Was ist CozyQuiz?', emoji: 'ℹ️', note: 'Marketing-Erklärseite (/about)' },
  { path: '/reels',    label: 'Reels-Hub',         emoji: '📱', note: 'Alle Werbe-Reels + Bilder-Slideshow-Deep-Links (Foto-Karussell fürs Durchtippen & Screenshotten)' },
  { path: '/karussell', label: 'Foto-Karussell',   emoji: '🎠', note: 'Dedizierte 4:5-Standbild-Slides (welches-team): einzeln als HD-PNG oder alles als ZIP — für Insta-Foto-Karussells' },
  { path: '/trailer',  label: 'Trailer',           emoji: '🎬', note: 'Showreel / Trailer-Seite' },
  { path: '/showroom', label: 'Showroom',          emoji: '🖼️', note: 'Format-Showcase' },
];

// ─────────────────────────────────────────────────────────────────────────
// Extras — Tools, Admin, Stats (verbliebene Editoren)
// ─────────────────────────────────────────────────────────────────────────
const extrasLinks: LinkItem[] = [
  { path: '/formats',             label: 'Format-Roadmap',     emoji: '🗺️', note: 'Alle Spielformate (live + Konzepte) auf einen Blick' },
  { path: '/slides',              label: 'Slide-Editor',       emoji: '🎨', note: 'Custom Slides pro Frage gestalten — bestehende Drafts editieren' },
  { path: '/rules-editor',        label: 'Regeltexte',         emoji: '📜', note: 'Spielregel-Folien, Kategorie-Intros, Runden-Hinweise anpassen (lokal)' },
  { path: '/admin',               label: 'Admin',              emoji: '⚙️', note: 'PIN, Settings, etc.' },
  { path: '/stats',           label: 'Stats & Leaderboard', emoji: '📈', note: 'AllTime-Stats, Frage-Verteilungen, Funny-Answers (Recap = pro Spiel, oben verlinkt)' },
  { path: '/qrcode',          label: 'Beitritts-QR',       emoji: '🔳', note: 'QR-Code für Team-Beitritt' },
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

// ─────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────
const MenuPage = () => {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      color: '#e2e8f0',
      fontFamily: 'var(--font)',
      padding: '0 0 60px',
    }}>
      {/* Hero header */}
      <div style={{
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '28px 32px 24px',
        display: 'flex', alignItems: 'center', gap: 18,
      }}>
        <img
          src="/logo.png"
          alt="Logo"
          style={{ width: 52, height: 52, borderRadius: 14, objectFit: 'contain' }}
        />
        <div>
          <div style={{ fontWeight: 900, fontSize: 22, color: '#f8fafc', lineHeight: 1.1 }}>
            Cozy Kiosk Quiz
          </div>
          <div style={{ fontSize: 12, color: '#475569', marginTop: 3, letterSpacing: '0.04em' }}>
            a cozy wolf production
          </div>
        </div>
      </div>

      {/* Startseite: Meine Quizze (Draft-zentriert) */}
      <div style={{
        maxWidth: 820, margin: '0 auto', padding: '28px 24px 8px',
      }}>
        <MyQuizzesHub />
      </div>

      {/* Werkzeuge & mehr — sekundär, eingeklappt */}
      <div style={{
        maxWidth: 820, margin: '0 auto', padding: '16px 24px 0',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        <div style={{
          fontSize: 11, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase',
          color: '#475569', margin: '8px 2px 2px',
        }}>Werkzeuge & mehr</div>
        <AppPanel
          label="COZYQUIZ"
          emoji="🗺️"
          tagline="Live-Spiel — Moderator, Beamer, Team, Builder"
          accent="#3B82F6"
          links={cozyQuizLinks}
        />

        <AppPanel
          label="COZYQUIZ · Test-Pages"
          emoji="🧪"
          tagline="Standalone-Vorschauen einzelner Quiz-Slides — Thanks, Treppchen, Summary, Avatar-Picker"
          accent="#EC4899"
          links={cozyQuizTestLinks}
        />

        <AppPanel
          label="Marketing & Öffentlich"
          emoji="🌐"
          tagline="Landing, About, Trailer, Showroom, Skins — auch ohne Spiel erreichbar"
          accent="#22C55E"
          links={marketingLinks}
        />

        <AppPanel
          label="Extras"
          emoji="🧰"
          tagline="Tools, Editoren, Admin, Stats"
          accent="#6B7280"
          links={extrasLinks}
        />
      </div>
    </div>
  );
};

export default MenuPage;
