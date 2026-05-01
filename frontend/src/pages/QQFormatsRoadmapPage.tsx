import { Link } from 'react-router-dom';

/**
 * CozyWolf — Format-Roadmap / Vision-Page
 *
 * Sammelt ALLE Spielformat-Ideen mit Status (live / pitch / idea).
 * AKTUELLER FOKUS: CozyQuiz (Standard) zu 100% fertigstellen.
 * Alle weiteren Formate sind Konzepte — bauen erst on demand.
 */

type Status = 'live' | 'pitch' | 'idea';

type Format = {
  id: string;
  emoji: string;
  name: string;
  status: Status;
  tagline: string;
  capacity: string;
  bestFor: string;
  devEffort: string;
  description: string;
  mechanics: string[];
  link?: string;
  accent: string;
};

const FORMATS: Format[] = [
  {
    id: 'standard',
    emoji: '🎯',
    name: 'CozyQuiz Standard',
    status: 'live',
    tagline: 'Das Herzstück — klassisches Team-Quiz mit Grid',
    capacity: '4–6 Teams × max 4 Pers · bis ~24 Spieler',
    bestFor: 'Pub/Kiosk · kleine Geburtstage · Workshops',
    devEffort: '✓ Live im Einsatz',
    description:
      'Das produktive Format. Teams beantworten Fragen, claimen Felder im Grid, sammeln Punkte. Mit Kategorien, Mini-Games (Bluff, Imposter, Connections, Higher-Lower) und WOW-Features.',
    mechanics: [
      'Grid-Claim mit Steal-Mechanik',
      'Mehrere Frage-Kategorien (MUCHO, BUNTE_TUETE, ZvZ, Connections)',
      'Mini-Games als Spezial-Subs',
      'Comeback-Mechanik (Higher/Lower)',
      'Soundscape, Reactions, Replay-Modus',
    ],
    link: '/moderator',
    accent: '#3B82F6',
  },
  {
    id: 'tisch',
    emoji: '🪑',
    name: 'Tisch-Quiz',
    status: 'idea',
    tagline: 'Hochzeits-natives Format mit Sitzplan als Spielbrett',
    capacity: '8–15 Tische × max 4 Pers · 32–60 Spieler',
    bestFor: 'Hochzeit · Familienfeier · große Geburtstage',
    devEffort: '~1 Woche',
    description:
      'Jeder Hochzeitstisch ist ein Team („Tisch 7: Familie Müller"). Der Sitzplan wird zum visuellen Spielbrett auf dem Beamer. Tische bekommen Punkte → wachsen, leuchten, kriegen Kronen. Brautpaar-Story am Ende: „Tisch der Trauzeugen hat gewonnen!"',
    mechanics: [
      'Sitzplan als Beamer-Spielbrett',
      'Tische als soziale Einheit (statt zufällige Teams)',
      'Branded Lobby mit Brautpaar-Foto',
      'Tisch-Krone für Sieger',
      'Optional: Wedding-Question-Pack („wer kennt Brautpaar besser?")',
    ],
    accent: '#EC4899',
  },
  {
    id: 'turnier',
    emoji: '🏆',
    name: 'Turnier-Bracket',
    status: 'idea',
    tagline: 'Double-Elimination-Bracket — auch Loser bleiben dabei',
    capacity: '4–8 parallele Matches · 50–128 Spieler',
    bestFor: 'Corporate · Schul-Klassen-Battle · Junggesell:innenabschied',
    devEffort: '~1.5 Wochen',
    description:
      'Mehrere Grids laufen parallel als Bracket. Double-Elimination-Format aus Esports — wer verliert, fällt nicht raus, sondern spielt um Plätze 3–8 weiter. Synchron moderiert: Wolf gibt eine Frage zentral vor, alle Matches beantworten gleichzeitig.',
    mechanics: [
      'Winner-Bracket + Loser-Bracket',
      'Synchron-Modus (1 Moderator reicht)',
      'Beamer: aktive Frage + Bracket-Übersicht (Split)',
      'Spiele um niedrige Plätze garantieren Engagement bis Ende',
      'Esports-Vibe für kompetitive Crews',
    ],
    accent: '#A855F7',
  },
  {
    id: 'coins',
    emoji: '🪙',
    name: 'CozyCoins + Real-Life',
    status: 'idea',
    tagline: 'Real-Life-Warm-up + Coin-Bidding im Quiz · bewährtes Format',
    capacity: '8–15 Tische × 4 Pers · 32–60 Spieler',
    bestFor: 'Corporate (Premium-Angebot) · Hochzeit mit aktiver Crew',
    devEffort: '~2 Wochen (inkl. Stations-Guide-PDF)',
    description:
      'Pre-Quiz-Phase: 4–6 Real-Life-Stationen (Kistenstapeln, Schätzen, Cornhole, Memory, Schlachtruf-Battle, Foto-Challenge) → Tische erspielen Coins. Quiz-Phase: Coins als Bidding-Währung, Power-ups kaufbar (Joker, Steal, Hint, Extra-Zeit). Wolf hat das Format bei Corporate-Quiz schon erfolgreich erprobt.',
    mechanics: [
      'Real-Life-Stationen als Warm-up (30–45 Min)',
      'Coins als Quiz-Währung',
      'Bidding pro Frage („wie sicher bin ich?")',
      'Power-up-Shop (Joker 30, Hint 20, Steal 50, Zeit 15)',
      'Beamer: wachsende Coin-Stapel pro Tisch',
    ],
    accent: '#F59E0B',
  },
  {
    id: 'garden',
    emoji: '🌱',
    name: 'Garden Mass-Mode',
    status: 'pitch',
    tagline: 'Pixel-Floodfill für 100+ Personen · Festival-tauglich',
    capacity: '10 Farb-Teams × ∞ Pers · 60–500+ Spieler',
    bestFor: 'Festival · Großveranstaltung · Premium-Corporate-Event',
    devEffort: '~5–7 Tage',
    description:
      'Pixel-Karte mit Floodfill-Wachstum. 10 Farb-Teams (Blau, Grün, Gelb, Lila, …). Jede richtige Antwort = Pixel wachsen. Steal-Mechanik wenn Pixel sich berühren. Endgame ab 92% Fülle. Walkthrough-Pitch-Page schon live mit allen Specials (Sun-Zone, Saisons, Spotlight, Schrumpfen).',
    mechanics: [
      'Pixel-Floodfill statt diskreter Felder',
      'Adaptive Map-Size (klein/mittel/groß)',
      'Sun-Zone als wandernder Bonus',
      '4 Saisons mit Catch-up-Mechanik',
      'Steal als Kernmechanik',
      'Endgame bei 92% Fülle',
    ],
    link: '/garden-pitch',
    accent: '#10B981',
  },
  {
    id: 'schule',
    emoji: '🎓',
    name: 'Schul-Modus',
    status: 'idea',
    tagline: 'Klasse vs. Klasse · Wolfs Fachgebiet',
    capacity: '2–6 Klassen · 40–150 Schüler:innen',
    bestFor: 'Schul-Klassen-Battle · AG · Projekttag · Hort',
    devEffort: '~2–4 Wochen (eigenes Frontend evtl. nötig)',
    description:
      'Lehrkraft als Moderator, Klassen als Teams. Schul-Inhalte (Mathe, Sachkunde, Bio) als Frage-Pool. Möglicherweise eigene App-Variante mit altersgerechtem Design. Wolf als Kindheitspädagoge mit Vertrauensvorschuss. Bürokratie-Hürden machen es zur Geduld-Übung.',
    mechanics: [
      'Lehrkraft-Moderator-Modus',
      'Schulfach-Question-Packs (Mathe, Bio, Geschichte, …)',
      'Klassen statt Teams als Einheit',
      'Optional: Lehrer-vs-Schüler-Spezial-Modus',
      'Altersgerechtes Design (evtl. eigene Branding-Variante)',
    ],
    accent: '#06B6D4',
  },
];

const MARKET_PRIO = [
  { num: 1, label: 'Pub / Kiosk', color: '#3B82F6', detail: 'Standard reicht · jetzt akquirieren' },
  { num: 2, label: 'Corporate', color: '#A855F7', detail: '2 erfolgreiche Refs · CozyCoins als Premium' },
  { num: 3, label: 'Events / Hochzeiten', color: '#EC4899', detail: 'Tisch-Quiz nötig · saisonal Mai–Sept' },
  { num: 4, label: 'Schule', color: '#06B6D4', detail: 'Langfristig · Wolfs Fachgebiet' },
];

const STATUS_META: Record<Status, { label: string; color: string; bg: string }> = {
  live:  { label: '✓ Live im Einsatz', color: '#86EFAC', bg: 'rgba(34,197,94,0.15)' },
  pitch: { label: '🎨 Pitch-Demo verfügbar', color: '#C4B5FD', bg: 'rgba(168,85,247,0.15)' },
  idea:  { label: '💭 Konzept · Backlog', color: '#FCD34D', bg: 'rgba(245,158,11,0.12)' },
};

export default function QQFormatsRoadmapPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at top, #1A1330 0%, #060A12 70%)',
      color: '#F1F5F9',
      fontFamily: 'Nunito, system-ui, sans-serif',
      padding: '40px 20px 80px',
    }}>
      <style>{`
        @keyframes formatFadeIn { from { opacity:0; transform: translateY(20px); } to { opacity:1; transform: translateY(0); } }
      `}</style>

      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 32, animation: 'formatFadeIn 0.6s ease both' }}>
          <div style={{
            display: 'inline-block', padding: '6px 18px', borderRadius: 999,
            background: 'rgba(168,85,247,0.18)', border: '1.5px solid rgba(168,85,247,0.4)',
            fontSize: 13, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase',
            color: '#C4B5FD', marginBottom: 14,
          }}>
            🗺️ Format-Roadmap · Vision-Page
          </div>
          <h1 style={{
            fontSize: 'clamp(36px, 5vw, 64px)', fontWeight: 900, margin: '0 0 10px',
            background: 'linear-gradient(135deg, #C4B5FD, #DDD6FE, #A78BFA)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.02em',
          }}>
            CozyWolf · Spielformate
          </h1>
          <p style={{
            fontSize: 'clamp(15px, 1.5vw, 19px)', color: '#94A3B8', margin: '0 auto', maxWidth: 720,
            lineHeight: 1.5,
          }}>
            Alle aktuellen + geplanten Spielmodi auf einen Blick. Mit Capacity, Zielgruppe,
            Mechaniken und Status.
          </p>
        </div>

        {/* Fokus-Banner */}
        <div style={{
          marginBottom: 28, padding: '20px 24px', borderRadius: 18,
          background: 'linear-gradient(135deg, rgba(59,130,246,0.18), rgba(59,130,246,0.06))',
          border: '2px solid rgba(59,130,246,0.45)',
          animation: 'formatFadeIn 0.6s ease 0.1s both',
        }}>
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap',
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14, flexShrink: 0,
              background: 'rgba(59,130,246,0.30)', border: '1.5px solid rgba(59,130,246,0.55)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
            }}>
              🎯
            </div>
            <div style={{ flex: 1, minWidth: 240 }}>
              <div style={{
                fontSize: 12, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase',
                color: '#93C5FD', marginBottom: 6,
              }}>
                Aktueller Fokus · Stand 2026-05-01
              </div>
              <div style={{
                fontSize: 'clamp(18px, 2vw, 24px)', fontWeight: 900, color: '#F8FAFC', marginBottom: 6,
                letterSpacing: '-0.01em',
              }}>
                CozyQuiz Standard zu 100% fertigstellen
              </div>
              <div style={{ fontSize: 14, color: '#CBD5E1', lineHeight: 1.5 }}>
                Alle weiteren Formate (Tisch-Quiz, Turnier, CozyCoins, Garden, Schule) sind
                Konzepte und werden <b style={{ color: '#FDE68A' }}>erst on demand gebaut</b> —
                wenn ein konkreter Auftrag aus Prio 2/3 reinkommt. Bis dahin: Backlog.
              </div>
            </div>
          </div>
        </div>

        {/* Markt-Reihenfolge */}
        <div style={{ marginBottom: 36, animation: 'formatFadeIn 0.6s ease 0.15s both' }}>
          <h2 style={{
            fontSize: 'clamp(20px, 2vw, 28px)', fontWeight: 900,
            margin: '0 0 14px', color: '#F1F5F9', letterSpacing: '-0.01em',
          }}>📈 Markt-Reihenfolge</h2>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10,
          }}>
            {MARKET_PRIO.map(p => (
              <div key={p.num} style={{
                padding: '14px 16px', borderRadius: 14,
                background: `${p.color}10`, border: `1.5px solid ${p.color}40`,
              }}>
                <div style={{
                  fontSize: 11, fontWeight: 900, letterSpacing: '0.16em', textTransform: 'uppercase',
                  color: p.color, marginBottom: 4,
                }}>Prio {p.num}</div>
                <div style={{ fontSize: 17, fontWeight: 900, color: '#F1F5F9', marginBottom: 3 }}>
                  {p.label}
                </div>
                <div style={{ fontSize: 12, color: '#94A3B8', lineHeight: 1.4 }}>{p.detail}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Format-Cards */}
        <div style={{ marginBottom: 36 }}>
          <h2 style={{
            fontSize: 'clamp(20px, 2vw, 28px)', fontWeight: 900,
            margin: '0 0 14px', color: '#F1F5F9', letterSpacing: '-0.01em',
          }}>🎮 Alle Spielformate</h2>
          <div style={{ display: 'grid', gap: 14 }}>
            {FORMATS.map((f, i) => (
              <FormatCard key={f.id} format={f} delay={`${0.2 + i * 0.05}s`} />
            ))}
          </div>
        </div>

        {/* Capacity-Tabelle */}
        <div style={{ marginBottom: 36, animation: 'formatFadeIn 0.6s ease 0.55s both' }}>
          <h2 style={{
            fontSize: 'clamp(20px, 2vw, 28px)', fontWeight: 900,
            margin: '0 0 14px', color: '#F1F5F9', letterSpacing: '-0.01em',
          }}>📊 Capacity-Vergleich</h2>
          <div style={{
            background: 'rgba(255,255,255,0.03)', borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <th style={thStyle}>Format</th>
                  <th style={thStyle}>Spielerzahl</th>
                  <th style={thStyle}>Optimal für</th>
                  <th style={thStyle}>Status</th>
                </tr>
              </thead>
              <tbody>
                {FORMATS.map(f => (
                  <tr key={f.id} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <td style={tdStyle}>
                      <span style={{ fontSize: 18, marginRight: 8 }}>{f.emoji}</span>
                      <b style={{ color: '#F1F5F9' }}>{f.name}</b>
                    </td>
                    <td style={tdStyle}>{f.capacity}</td>
                    <td style={tdStyle}>{f.bestFor}</td>
                    <td style={tdStyle}>
                      <span style={{
                        padding: '3px 10px', borderRadius: 999,
                        background: STATUS_META[f.status].bg,
                        color: STATUS_META[f.status].color,
                        fontSize: 11, fontWeight: 800, letterSpacing: '0.06em',
                      }}>{STATUS_META[f.status].label}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          marginTop: 40, padding: '24px 32px', borderRadius: 20,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          textAlign: 'center', animation: 'formatFadeIn 0.6s ease 0.6s both',
        }}>
          <div style={{
            fontSize: 14, fontWeight: 800, letterSpacing: '0.16em',
            color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8,
          }}>
            Nächste Schritte
          </div>
          <div style={{ fontSize: 16, color: '#cbd5e1', lineHeight: 1.6, maxWidth: 720, margin: '0 auto' }}>
            Pub-Akquise startet · 2 Corporate-Cases dokumentieren · Standard-Quiz weiter polishen.{' '}
            <b style={{ color: '#FDE68A' }}>Erst wenn das läuft</b>, kommt Format Nummer 2.
          </div>
        </div>
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '12px 16px', textAlign: 'left',
  fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase',
  color: '#94A3B8',
};
const tdStyle: React.CSSProperties = {
  padding: '12px 16px', fontSize: 13, color: '#CBD5E1', verticalAlign: 'top',
};

function FormatCard({ format, delay }: { format: Format; delay: string }) {
  const meta = STATUS_META[format.status];
  return (
    <div style={{
      borderRadius: 18,
      background: 'rgba(255,255,255,0.03)',
      border: `1.5px solid ${format.accent}30`,
      overflow: 'hidden',
      animation: `formatFadeIn 0.6s ease ${delay} both`,
    }}>
      <div style={{
        padding: '18px 22px',
        background: `linear-gradient(90deg, ${format.accent}18, transparent)`,
        borderBottom: `1px solid ${format.accent}25`,
        display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap',
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14, flexShrink: 0,
          background: `${format.accent}28`, border: `1.5px solid ${format.accent}55`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
        }}>
          {format.emoji}
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
            <h3 style={{
              fontSize: 'clamp(20px, 2vw, 26px)', fontWeight: 900, color: '#F8FAFC',
              margin: 0, letterSpacing: '-0.01em',
            }}>{format.name}</h3>
            <span style={{
              padding: '3px 10px', borderRadius: 999,
              background: meta.bg, color: meta.color,
              fontSize: 11, fontWeight: 800, letterSpacing: '0.06em',
            }}>{meta.label}</span>
          </div>
          <div style={{ fontSize: 14, color: '#CBD5E1', lineHeight: 1.45 }}>{format.tagline}</div>
        </div>
        {format.link && (
          <Link
            to={format.link}
            style={{
              padding: '10px 18px', borderRadius: 12,
              background: `${format.accent}25`, border: `1.5px solid ${format.accent}55`,
              color: format.accent, fontSize: 13, fontWeight: 800,
              letterSpacing: '0.06em', textDecoration: 'none', alignSelf: 'center',
              flexShrink: 0,
            }}
          >
            → {format.status === 'live' ? 'Öffnen' : 'Pitch ansehen'}
          </Link>
        )}
      </div>

      <div style={{
        padding: '16px 22px',
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10,
        background: 'rgba(0,0,0,0.18)',
      }}>
        <Stat label="Capacity"      value={format.capacity}  accent={format.accent} />
        <Stat label="Optimal für"   value={format.bestFor}   accent={format.accent} />
        <Stat label="Dev-Aufwand"   value={format.devEffort} accent={format.accent} />
      </div>

      <div style={{ padding: '16px 22px 18px' }}>
        <div style={{ fontSize: 14, color: '#CBD5E1', lineHeight: 1.55, marginBottom: 12 }}>
          {format.description}
        </div>
        <div style={{
          fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase',
          color: '#94A3B8', marginBottom: 8,
        }}>
          Mechaniken
        </div>
        <ul style={{
          listStyle: 'none', padding: 0, margin: 0,
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 4,
        }}>
          {format.mechanics.map((m, i) => (
            <li key={i} style={{
              fontSize: 13, color: '#CBD5E1', lineHeight: 1.5,
              paddingLeft: 16, position: 'relative',
            }}>
              <span style={{ position: 'absolute', left: 0, color: format.accent, fontWeight: 900 }}>•</span>
              {m}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div>
      <div style={{
        fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase',
        color: accent, marginBottom: 3,
      }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#F1F5F9', lineHeight: 1.4 }}>{value}</div>
    </div>
  );
}
