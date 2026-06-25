/**
 * QQAboutPage — öffentlicher Werbe-One-Pager „Was ist CozyQuiz?".
 *
 * 2026-06-25 (Wolf): Eine A4-Seite, die in CozyWolf-Marke zusammenfasst, was das
 * Quiz ist und wie es funktioniert — zum Aushängen, Mailen oder als PDF-Anhang.
 * Inhalt ist 1:1 aus den echten Spielregeln (qqRuleTexts.ts) abgeleitet, NICHTS
 * Erfundenes. Export: Browser-Druck → „Als PDF speichern" (A4-exakt via @page,
 * print-color-adjust:exact für die Brand-Flächen). Route /about, nicht PIN-gegated.
 */
import { useEffect } from 'react';
import type { CSSProperties } from 'react';

const PINK = '#ec4899';
const PINK_MID = '#f472b6';
const PINK_SOFT = '#fbcfe8';
const MAGENTA = '#a21247';
const NAVY = '#1E2A5A';
const INK = '#1b1830';

const DISPLAY = "'Bricolage Grotesque', 'Inter', system-ui, sans-serif";
const BODY = "'Nunito', 'Inter', system-ui, sans-serif";

// Echte Kategorien (qqRuleTexts.ts cat.*.explain + bunte-sub).
const CATEGORIES = [
  { emoji: '🎯', name: 'Schätzchen', desc: 'Wer schätzt am nächsten dran?' },
  { emoji: '🔤', name: 'Mu-Cho', desc: 'Die richtige Antwort — Tempo entscheidet.' },
  { emoji: '📊', name: '10 von 10', desc: 'Verteilt 10 Punkte auf 3 Antworten.' },
  { emoji: '📸', name: 'Schau mal!', desc: 'Erkennt das Bild.' },
  { emoji: '🎁', name: 'Bunte Tüte', desc: 'Jede Runde ein Überraschungs-Format: Bluff, Heiße Kartoffel, CozyGuessr & mehr.' },
];

// 4 Schritte — abgeleitet aus rules.slide1/2/4, round.2/3, slide7, slide8.
const STEPS = [
  { n: '1', title: 'Team & Handy', text: 'Bildet Teams und tretet per Handy bei. Gespielt wird auf der großen Leinwand.' },
  { n: '2', title: 'Antworten & erobern', text: '4 Runden, 5 Kategorien pro Runde. Richtig — und schnell — geantwortet, und ihr setzt ein Feld aufs Spielbrett.' },
  { n: '3', title: 'Verbinden & tricksen', text: 'Felder clever verbinden gibt Joker-Bonus. Ab Runde 2 dürft ihr Felder klauen, ab Runde 3 dauerhaft sichern.' },
  { n: '4', title: 'Comeback & Finale', text: 'Das letzte Team bekommt eine Aufhol-Chance. Im großen Finale entscheiden versteckte Gruppen über die letzten Punkte.' },
];

const SELLING = [
  { emoji: '🧠', text: 'Wissen, Schätzen & Bauchgefühl — für jede Stärke eine Kategorie.' },
  { emoji: '♟️', text: 'Strategie zählt: nicht nur richtig antworten, sondern clever setzen.' },
  { emoji: '🔄', text: 'Niemand ist raus: die Comeback-Mechanik hält es bis zum Schluss spannend.' },
  { emoji: '🐺', text: 'Moderiert & locker: kein Googeln, kein Vorwissen-Stress — Spaß vor Punkten.' },
];

// Kleines 5×5-Beispiel-Brett (das echte Spielbrett ist 5×5) als Deko-Illustration.
const MINI_GRID = [
  [0, 0, 1, 1, 2],
  [0, 0, 1, 2, 2],
  [0, 3, 1, 1, 2],
  [3, 3, 3, 4, 2],
  [3, 3, 4, 4, 4],
];
const GRID_COLORS = ['#3B82F6', PINK, '#22C55E', '#A855F7', '#F59E0B'];

export default function QQAboutPage() {
  useEffect(() => {
    document.title = 'CozyQuiz — Was ist das?';
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#e9e7ef', padding: '24px 16px 60px', fontFamily: BODY }}>
      <style>{`
        @page { size: A4 portrait; margin: 0; }
        @media print {
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
          .qq-about-screen-only { display: none !important; }
          .qq-about-page { box-shadow: none !important; margin: 0 !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
        .qq-about-page { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      `}</style>

      {/* Screen-only Toolbar */}
      <div className="qq-about-screen-only" style={{
        maxWidth: '210mm', margin: '0 auto 18px', display: 'flex', gap: 12,
        alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap',
      }}>
        <div style={{ fontFamily: BODY, color: '#4b475e', fontSize: 14, fontWeight: 700, maxWidth: 520 }}>
          One-Pager „Was ist CozyQuiz?" · Tipp: <b>„Als PDF speichern"</b> klicken (im Druckdialog Ziel = PDF).
          Für ein JPG einfach die Seite screenshotten oder das PDF exportieren.
        </div>
        <button
          onClick={() => window.print()}
          style={{
            background: `linear-gradient(135deg, ${PINK_MID}, ${PINK} 55%, ${MAGENTA})`,
            color: '#fff', border: 'none', borderRadius: 999, padding: '12px 26px',
            fontFamily: DISPLAY, fontWeight: 800, fontSize: 16, cursor: 'pointer',
            boxShadow: '0 8px 22px rgba(162,18,71,0.32)', whiteSpace: 'nowrap',
          }}
        >📄 Als PDF speichern</button>
      </div>

      {/* A4-Poster */}
      <div className="qq-about-page" style={{
        width: '210mm', minHeight: '297mm', margin: '0 auto', background: '#fff',
        boxShadow: '0 16px 50px rgba(30,42,90,0.22)', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', color: INK,
        boxSizing: 'border-box',
      }}>
        {/* ── Header-Band ── */}
        <header style={{
          background: `radial-gradient(120% 140% at 15% -20%, ${PINK_MID} 0%, ${PINK} 42%, ${MAGENTA} 100%)`,
          color: '#fff', padding: '26px 30px 24px', position: 'relative',
          display: 'flex', alignItems: 'center', gap: 22,
        }}>
          <div style={{
            width: 118, height: 118, borderRadius: '50%', flexShrink: 0,
            background: 'rgba(255,255,255,0.16)', border: '3px solid rgba(255,255,255,0.55)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center', overflow: 'hidden',
            boxShadow: '0 8px 20px rgba(0,0,0,0.18)',
          }}>
            <img src="/avatars/cozywolf/augenauf.mundauf.winken.png" alt="CozyWolf"
              style={{ width: '94%', height: '94%', objectFit: 'contain' }} draggable={false} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 13, letterSpacing: '0.22em', opacity: 0.92, textTransform: 'uppercase' }}>
              Live-Team-Quiz
            </div>
            <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 62, lineHeight: 0.98, letterSpacing: '-0.01em', marginTop: 2 }}>
              CozyQuiz
            </div>
            <div style={{ fontFamily: BODY, fontWeight: 800, fontSize: 19, marginTop: 8, opacity: 0.97 }}>
              Das Quiz, bei dem ihr euch das Spielbrett <span style={{ background: 'rgba(255,255,255,0.22)', borderRadius: 6, padding: '1px 8px' }}>erobert</span>.
            </div>
          </div>
        </header>

        {/* ── Hook ── */}
        <section style={{ padding: '22px 30px 6px' }}>
          <p style={{ margin: 0, fontSize: 16.5, lineHeight: 1.5, color: '#33304a', fontWeight: 600 }}>
            Ein <b>moderiertes Quiz für Teams</b> — gespielt auf der großen Leinwand, beantwortet per Handy.
            Aber kein gewöhnliches Pub-Quiz: <b style={{ color: MAGENTA }}>Jede richtige Antwort erobert euch ein Feld
            auf dem Spielbrett.</b> Wer am Ende das größte zusammenhängende Gebiet hält, gewinnt.
          </p>
        </section>

        {/* ── So funktioniert's + Mini-Brett ── */}
        <section style={{ padding: '14px 30px 4px', display: 'flex', gap: 22 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={sectionTitle()}>So funktioniert's</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {STEPS.map(s => (
                <div key={s.n} style={{ display: 'flex', gap: 13, alignItems: 'flex-start' }}>
                  <div style={{
                    flexShrink: 0, width: 34, height: 34, borderRadius: 10,
                    background: NAVY, color: '#fff', fontFamily: DISPLAY, fontWeight: 800,
                    fontSize: 19, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{s.n}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 16.5, color: NAVY }}>{s.title}</div>
                    <div style={{ fontSize: 14.5, lineHeight: 1.42, color: '#45415c' }}>{s.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mini-Brett-Illustration */}
          <div style={{ flexShrink: 0, width: 196, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, paddingTop: 6 }}>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4,
              padding: 10, background: '#f4f3f8', borderRadius: 16, border: '2px solid #e4e1ee',
            }}>
              {MINI_GRID.flat().map((c, i) => (
                <div key={i} style={{
                  width: 30, height: 30, borderRadius: 7,
                  background: `linear-gradient(135deg, ${GRID_COLORS[c]}, ${GRID_COLORS[c]}cc)`,
                  boxShadow: `inset 0 0 0 1.5px ${GRID_COLORS[c]}`,
                }} />
              ))}
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: '#6b6786', textAlign: 'center', lineHeight: 1.3 }}>
              5×5-Spielbrett — jedes Team<br />kämpft um sein Gebiet
            </div>
          </div>
        </section>

        {/* ── 5 Kategorien ── */}
        <section style={{ padding: '14px 30px 4px' }}>
          <h2 style={sectionTitle()}>5 Kategorien pro Runde</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
            {CATEGORIES.map((c, i) => (
              <div key={c.name} style={{
                display: 'flex', gap: 11, alignItems: 'center', padding: '10px 13px',
                borderRadius: 13, background: PINK_SOFT + '55', border: `1.5px solid ${PINK_SOFT}`,
                gridColumn: i === 4 ? '1 / -1' : undefined,
              }}>
                <span style={{ fontSize: 27, lineHeight: 1, flexShrink: 0 }}>{c.emoji}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 15.5, color: MAGENTA }}>{c.name}</div>
                  <div style={{ fontSize: 13.5, lineHeight: 1.35, color: '#45415c' }}>{c.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Warum es Spaß macht ── */}
        <section style={{ padding: '14px 30px 6px' }}>
          <h2 style={sectionTitle()}>Warum es Spaß macht</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px 22px' }}>
            {SELLING.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 19, lineHeight: 1.2, flexShrink: 0 }}>{s.emoji}</span>
                <span style={{ fontSize: 14, lineHeight: 1.4, color: '#3b3853', fontWeight: 600 }}>{s.text}</span>
              </div>
            ))}
          </div>
        </section>

        <div style={{ flex: 1 }} />

        {/* ── CTA-Footer-Band ── */}
        <footer style={{
          marginTop: 14, background: NAVY, color: '#fff', padding: '20px 30px 22px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap',
        }}>
          <div>
            <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 26, lineHeight: 1.04 }}>
              Bock auf ein CozyQuiz?
            </div>
            <div style={{ fontSize: 14.5, opacity: 0.85, marginTop: 4, fontWeight: 600 }}>
              Für Bar, Café, Firmenfeier, Geburtstag oder Vereins-Event.
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 14.5, fontWeight: 700, textAlign: 'right' }}>
            <span>✉️ hallo@cozywolf.de</span>
            <span>🌐 cozywolf.de</span>
            <span style={{ color: PINK_MID }}>📸 @cozywolf.events</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

function sectionTitle(): CSSProperties {
  return {
    fontFamily: DISPLAY, fontWeight: 800, fontSize: 13, letterSpacing: '0.14em',
    textTransform: 'uppercase', color: PINK, margin: '0 0 11px',
    display: 'inline-block', borderBottom: `3px solid ${PINK_SOFT}`, paddingBottom: 4,
  };
}
