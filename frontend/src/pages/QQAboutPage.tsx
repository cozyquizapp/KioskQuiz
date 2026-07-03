/**
 * QQAboutPage — öffentlicher Werbe-One-Pager „Was ist CozyQuiz?".
 *
 * 2026-06-25 (Wolf): Eine A4-Seite, die in CozyWolf-Marke zusammenfasst, was das
 * Quiz ist und wie es funktioniert — zum Aushängen, Mailen oder als PDF-Anhang.
 * Inhalt ist 1:1 aus den echten Spielregeln (qqRuleTexts.ts) abgeleitet, NICHTS
 * Erfundenes. Export: Browser-Druck → „Als PDF speichern" (A4-exakt via @page,
 * print-color-adjust:exact für die Brand-Flächen). Route /about, nicht PIN-gegated.
 */
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { cozy3dSrc } from '../cozy3dAvatars';
import { QQ_TEAM_PALETTE } from '@shared/quarterQuizTypes';

const PINK = '#ec4899';
const PINK_MID = '#f472b6';
const PINK_SOFT = '#fbcfe8';
const MAGENTA = '#a21247';
const NAVY = '#1E2A5A';
const INK = '#1b1830';
// Cozy-Poster-Warmtoene (2026-07-04): cremiges „Papier" + warme Karten/Schatten
// statt flachem Weiss — Board-Game-Box-Gefuehl. Marke bleibt Pink/Magenta/Navy,
// die Waerme kommt aus dem Creme-Grund (NICHT aus Amber/Gold — Brand-Regel).
const CREAM = '#FAF3E7';
const CREAM_DEEP = '#F3E9D6';
const CARD = '#FFFFFF';
const WARM_SHADOW = 'rgba(120, 78, 52, 0.13)';
const INK_SOFT = '#544e63';

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
  { n: '4', title: 'Comeback & Final-Bets', text: 'Das letzte Team bekommt eine Aufhol-Chance. Im Finale tippt jedes Team auf ein Team — pro gewonnene Final-Kategorie eures Tipps gibt es Bonus-Punkte.' },
];

const SELLING = [
  { emoji: '🧠', text: 'Wissen, Schätzen & Bauchgefühl — für jede Stärke eine Kategorie.' },
  { emoji: '♟️', text: 'Strategie zählt: nicht nur richtig antworten, sondern clever setzen.' },
  { emoji: '🔄', text: 'Niemand ist raus: die Comeback-Mechanik hält es bis zum Schluss spannend.' },
  { emoji: '🐺', text: 'Moderiert & locker: kein Googeln, kein Vorwissen-Stress — Spaß vor Punkten.' },
];

// 5 Teams = echte Default-cozy3d-Avatare mit den echten App-Farben (QQ_TEAM_PALETTE
// spiegelt seit 2026-07-04 QQ_AVATARS[].color).
const TEAMS = [
  { slug: 'hund',     color: QQ_TEAM_PALETTE[0] }, // #F97316 fox/shiba
  { slug: 'faultier', color: QQ_TEAM_PALETTE[1] }, // #22C55E frog/faultier
  { slug: 'pinguin',  color: QQ_TEAM_PALETTE[2] }, // #14B8A6 panda/pinguin
  { slug: 'koala',    color: QQ_TEAM_PALETTE[3] }, // #A855F7 rabbit/koala
  { slug: 'giraffe',  color: QQ_TEAM_PALETTE[4] }, // #FACC15 unicorn/giraffe
];
// Kleines 5×5-Beispiel-Brett (das echte Spielbrett ist 5×5). Zahl = Team-Index;
// JEDE Zelle trägt den Team-Avatar (wie im echten Brett).
const MINI_GRID = [
  [0, 0, 1, 1, 2],
  [0, 0, 1, 2, 2],
  [0, 3, 1, 1, 2],
  [3, 3, 3, 4, 2],
  [3, 3, 4, 4, 4],
];

export default function QQAboutPage() {
  const posterRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<null | 'png' | 'pdf'>(null);

  useEffect(() => {
    document.title = 'CozyQuiz — Was ist das?';
  }, []);

  // Poster → Canvas (hochauflösend). Wartet auf geladene Fonts/Bilder, damit
  // der Export nicht mit Fallback-Schrift oder fehlenden Avataren rendert.
  async function renderCanvas(): Promise<HTMLCanvasElement> {
    const node = posterRef.current!;
    try { if ((document as any).fonts?.ready) await (document as any).fonts.ready; } catch { /* ignore */ }
    const html2canvas = (await import('html2canvas')).default;
    return html2canvas(node, {
      scale: Math.min(3, (window.devicePixelRatio || 1) * 2),
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
      windowWidth: node.scrollWidth,
      windowHeight: node.scrollHeight,
    });
  }

  function triggerDownload(dataUrl: string, filename: string) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function downloadPng() {
    if (busy) return;
    setBusy('png');
    try {
      const canvas = await renderCanvas();
      triggerDownload(canvas.toDataURL('image/png'), 'CozyQuiz.png');
    } catch (e) {
      console.error('PNG-Export fehlgeschlagen', e);
      alert('Ups — der Bild-Export hat nicht geklappt. Bitte nochmal versuchen.');
    } finally {
      setBusy(null);
    }
  }

  async function downloadPdf() {
    if (busy) return;
    setBusy('pdf');
    try {
      const canvas = await renderCanvas();
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = 210, pageH = 297;
      const ratio = canvas.width / canvas.height;
      let w = pageW, h = pageW / ratio;
      if (h > pageH) { h = pageH; w = pageH * ratio; }
      const x = (pageW - w) / 2, y = (pageH - h) / 2;
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', x, y, w, h, undefined, 'FAST');
      pdf.save('CozyQuiz.pdf');
    } catch (e) {
      console.error('PDF-Export fehlgeschlagen', e);
      alert('Ups — der PDF-Export hat nicht geklappt. Bitte nochmal versuchen.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#e7ded0', padding: '24px 16px 60px', fontFamily: BODY }}>
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

      {/* Screen-only Toolbar — bewusst dezent (kleine Export-Buttons oben rechts),
          damit ein geteilter Link „nur" das Poster zeigt, nicht die Werkzeuge. */}
      <div className="qq-about-screen-only" style={{
        maxWidth: '210mm', margin: '0 auto 10px', display: 'flex', gap: 8,
        alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap',
      }}>
        <button
          onClick={downloadPdf}
          disabled={!!busy}
          title="Als PDF herunterladen"
          style={{
            background: 'rgba(255,255,255,0.85)', color: MAGENTA, border: '1px solid rgba(162,18,71,0.22)',
            borderRadius: 999, padding: '7px 15px', fontFamily: BODY, fontWeight: 700, fontSize: 13,
            cursor: busy ? 'wait' : 'pointer', opacity: busy && busy !== 'pdf' ? 0.5 : 0.92, whiteSpace: 'nowrap',
          }}
        >{busy === 'pdf' ? '⏳ PDF…' : '📄 PDF'}</button>
        <button
          onClick={downloadPng}
          disabled={!!busy}
          title="Als Bild (PNG) herunterladen"
          style={{
            background: 'rgba(255,255,255,0.85)', color: MAGENTA, border: '1px solid rgba(162,18,71,0.22)',
            borderRadius: 999, padding: '7px 15px', fontFamily: BODY, fontWeight: 700, fontSize: 13,
            cursor: busy ? 'wait' : 'pointer', opacity: busy && busy !== 'png' ? 0.5 : 0.92, whiteSpace: 'nowrap',
          }}
        >{busy === 'png' ? '⏳ Bild…' : '🖼️ Bild'}</button>
      </div>

      {/* A4-Poster */}
      <div ref={posterRef} className="qq-about-page" style={{
        width: '210mm', minHeight: '297mm', margin: '0 auto',
        background: CREAM,
        // warmer Papier-Grund: zwei sehr subtile Licht-Radials (kein flaches Weiss)
        backgroundImage: `radial-gradient(120% 80% at 6% 0%, rgba(255,255,255,0.75), rgba(255,255,255,0) 46%), radial-gradient(90% 70% at 100% 102%, ${PINK_SOFT}33, rgba(255,255,255,0) 55%)`,
        boxShadow: `0 22px 60px ${WARM_SHADOW}`, overflow: 'hidden',
        display: 'flex', flexDirection: 'column', color: INK,
        boxSizing: 'border-box',
      }}>
        {/* ── Header-Band (Wolf spricht = Logo) ── */}
        <header style={{
          background: `radial-gradient(130% 155% at 18% -30%, ${PINK_MID} 0%, ${PINK} 44%, ${MAGENTA} 100%)`,
          color: '#fff', padding: '30px 34px 34px', position: 'relative',
          display: 'flex', alignItems: 'center', gap: 26,
          borderRadius: '0 0 44px 44px', boxShadow: `0 12px 28px ${PINK}44`,
        }}>
          {/* Wolf (cozywolf-PNG ist selbst ein rundes Badge → KEIN Extra-Ring,
              sonst Doppel-Ring; nur weicher Schatten für Tiefe) + Sprechblase */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              width: 138, height: 138,
              display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
              filter: 'drop-shadow(0 12px 22px rgba(0,0,0,0.30))',
            }}>
              <img src="/avatars/cozywolf/augenauf.mundauf.winken.png" alt="CozyWolf"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }} draggable={false} />
            </div>
            <div style={{
              position: 'absolute', top: -8, right: -26,
              background: '#fff', color: MAGENTA, fontFamily: DISPLAY, fontWeight: 800,
              fontSize: 13.5, padding: '5px 13px', borderRadius: 14,
              boxShadow: '0 6px 15px rgba(0,0,0,0.2)', whiteSpace: 'nowrap',
            }}>Hallo! 🐺</div>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 13, letterSpacing: '0.24em', opacity: 0.94, textTransform: 'uppercase' }}>
              Live-Team-Quiz zum Wohlfühlen
            </div>
            <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 66, lineHeight: 0.96, letterSpacing: '-0.015em', marginTop: 4, textShadow: '0 3px 12px rgba(0,0,0,0.18)' }}>
              CozyQuiz
            </div>
            <div style={{ fontFamily: BODY, fontWeight: 800, fontSize: 19, marginTop: 10, opacity: 0.98 }}>
              Das Quiz, bei dem ihr euch das Spielbrett <span style={{ background: 'rgba(255,255,255,0.24)', borderRadius: 7, padding: '1px 9px' }}>erobert</span>.
            </div>
          </div>
        </header>

        {/* ── Team-Avatar-Leiste (echte Game-Tiere + Farben) auf warmer Pill ── */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '22px 30px 2px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 15,
            background: CARD, borderRadius: 999, padding: '11px 22px',
            boxShadow: `0 10px 22px ${WARM_SHADOW}`, border: `2px solid ${CREAM_DEEP}`,
          }}>
            {TEAMS.map(t => (
              <div key={t.slug} style={{
                width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.28), rgba(255,255,255,0) 52%), ${t.color}`,
                boxShadow: `0 4px 12px ${t.color}55, inset 0 -6px 12px rgba(0,0,0,0.22)`,
              }}>
                <img src={cozy3dSrc(t.slug)} alt="" draggable={false}
                  style={{ width: '86%', height: '86%', objectFit: 'contain', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.3))' }} />
              </div>
            ))}
          </div>
        </div>

        {/* ── Hook ── */}
        <section style={{ padding: '16px 34px 6px' }}>
          <div style={{
            background: CARD, borderRadius: 18, padding: '16px 20px',
            boxShadow: `0 8px 20px ${WARM_SHADOW}`, borderLeft: `6px solid ${PINK}`,
          }}>
            <p style={{ margin: 0, fontSize: 16.5, lineHeight: 1.5, color: '#33304a', fontWeight: 600 }}>
              Ein <b>moderiertes Quiz für Teams</b> — gespielt auf der großen Leinwand, beantwortet per Handy.
              Aber kein gewöhnliches Pub-Quiz: <b style={{ color: MAGENTA }}>Jede richtige Antwort erobert euch ein Feld
              auf dem Spielbrett.</b> Wer am Ende das größte zusammenhängende Gebiet hält, gewinnt.
            </p>
          </div>
        </section>

        {/* ── So funktioniert's + Mini-Brett ── */}
        <section style={{ padding: '16px 34px 4px', display: 'flex', gap: 20, alignItems: 'stretch' }}>
          <div style={{ flex: 1, minWidth: 0, background: CARD, borderRadius: 18, padding: '16px 18px', boxShadow: `0 8px 20px ${WARM_SHADOW}` }}>
            <h2 style={sectionTitle()}>So funktioniert's</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {STEPS.map(s => (
                <div key={s.n} style={{ display: 'flex', gap: 13, alignItems: 'flex-start' }}>
                  <div style={{
                    flexShrink: 0, width: 36, height: 36, borderRadius: 12,
                    background: `linear-gradient(135deg, ${PINK}, ${MAGENTA})`, color: '#fff',
                    fontFamily: DISPLAY, fontWeight: 800, fontSize: 19,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: `0 4px 10px ${PINK}55`,
                  }}>{s.n}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 16.5, color: NAVY }}>{s.title}</div>
                    <div style={{ fontSize: 14.5, lineHeight: 1.42, color: INK_SOFT }}>{s.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mini-Brett im warmen „Board-Box"-Rahmen mit echten Game-Avataren */}
          <div style={{
            flexShrink: 0, width: 224, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
            background: CARD, borderRadius: 18, padding: '16px 12px', boxShadow: `0 8px 20px ${WARM_SHADOW}`,
          }}>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 5,
              padding: 12, background: CREAM_DEEP, borderRadius: 16,
              border: `3px solid ${NAVY}`, boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.12)',
            }}>
              {MINI_GRID.flat().map((region, i) => {
                const team = TEAMS[region];
                return (
                  <div key={i} style={{
                    width: 36, height: 36, borderRadius: 9, position: 'relative',
                    background: `linear-gradient(135deg, ${team.color}, ${team.color}cc)`,
                    boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,0.34)',
                  }}>
                    <img src={cozy3dSrc(team.slug)} alt="" draggable={false}
                      style={{
                        position: 'absolute', inset: 0, width: '100%', height: '100%',
                        objectFit: 'contain', padding: 3,
                        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.42))',
                      }} />
                  </div>
                );
              })}
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: NAVY, textAlign: 'center', lineHeight: 1.3 }}>
              5×5-Spielbrett — jedes Team<br />kämpft um sein Gebiet
            </div>
          </div>
        </section>

        {/* ── 5 Kategorien (Sticker-Kacheln) ── */}
        <section style={{ padding: '16px 34px 4px' }}>
          <h2 style={sectionTitle()}>5 Kategorien pro Runde</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {CATEGORIES.map((c, i) => (
              <div key={c.name} style={{
                display: 'flex', gap: 12, alignItems: 'center', padding: '11px 14px',
                borderRadius: 15, background: CARD, boxShadow: `0 6px 16px ${WARM_SHADOW}`,
                border: `2px solid ${CREAM_DEEP}`,
                gridColumn: i === 4 ? '1 / -1' : undefined,
              }}>
                <span style={{
                  flexShrink: 0, width: 46, height: 46, borderRadius: '50%',
                  background: `radial-gradient(circle at 34% 30%, #fff, ${PINK_SOFT}88)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 25, lineHeight: 1,
                  boxShadow: `inset 0 0 0 2px ${PINK_SOFT}`,
                }}>{c.emoji}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 15.5, color: MAGENTA }}>{c.name}</div>
                  <div style={{ fontSize: 13.5, lineHeight: 1.35, color: INK_SOFT }}>{c.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Warum es Spaß macht ── */}
        <section style={{ padding: '16px 34px 8px' }}>
          <h2 style={sectionTitle()}>Warum es Spaß macht</h2>
          <div style={{
            background: CARD, borderRadius: 18, padding: '15px 18px', boxShadow: `0 8px 20px ${WARM_SHADOW}`,
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 22px',
          }}>
            {SELLING.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 20, lineHeight: 1.2, flexShrink: 0 }}>{s.emoji}</span>
                <span style={{ fontSize: 14, lineHeight: 1.4, color: '#3b3853', fontWeight: 600 }}>{s.text}</span>
              </div>
            ))}
          </div>
        </section>

        <div style={{ flex: 1, minHeight: 12 }} />

        {/* ── CTA-Footer-Band (Wolf lugt hervor) ── */}
        <footer style={{
          marginTop: 16, background: `linear-gradient(115deg, ${NAVY} 0%, #243472 100%)`, color: '#fff',
          padding: '22px 34px 24px', borderRadius: '40px 40px 0 0', position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
            <div style={{
              width: 72, height: 72, flexShrink: 0,
              display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
              filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.35))',
            }}>
              <img src="/avatars/cozywolf/augenauf.mundauf.daumen.png" alt="" draggable={false}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div>
              <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 27, lineHeight: 1.04 }}>
                Bock auf ein CozyQuiz?
              </div>
              <div style={{ fontSize: 14.5, opacity: 0.86, marginTop: 5, fontWeight: 600 }}>
                Für Bar, Café, Firmenfeier, Geburtstag oder Vereins-Event.
              </div>
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
