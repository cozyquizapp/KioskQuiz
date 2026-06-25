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

// 5 Teams mit echten cozy3d-Game-Avataren + Brett-Farben (wie im Spiel).
const TEAMS = [
  { slug: 'pinguin', color: '#3B82F6' },
  { slug: 'fuchs',   color: PINK },
  { slug: 'koala',   color: '#22C55E' },
  { slug: 'eule',    color: '#A855F7' },
  { slug: 'baer',    color: '#F59E0B' },
];
// Kleines 5×5-Beispiel-Brett (das echte Spielbrett ist 5×5) als Deko-Illustration.
// Zahl = Team-Index (Gebiet/Farbe).
const MINI_GRID = [
  [0, 0, 1, 1, 2],
  [0, 0, 1, 2, 2],
  [0, 3, 1, 1, 2],
  [3, 3, 3, 4, 2],
  [3, 3, 4, 4, 4],
];
// Auf diesen Zellen sitzt der Team-Avatar (je ein „Anker" pro Gebiet).
const AVATAR_CELLS: Record<string, number> = {
  '1-1': 0, '1-2': 1, '1-4': 2, '3-1': 3, '4-3': 4,
};

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
        <div style={{ fontFamily: BODY, color: '#4b475e', fontSize: 14, fontWeight: 700, maxWidth: 460 }}>
          One-Pager „Was ist CozyQuiz?" — direkt als Bild oder PDF herunterladen.
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={downloadPdf}
            disabled={!!busy}
            style={{
              background: `linear-gradient(135deg, ${PINK_MID}, ${PINK} 55%, ${MAGENTA})`,
              color: '#fff', border: 'none', borderRadius: 999, padding: '12px 24px',
              fontFamily: DISPLAY, fontWeight: 800, fontSize: 15.5,
              cursor: busy ? 'wait' : 'pointer', opacity: busy && busy !== 'pdf' ? 0.55 : 1,
              boxShadow: '0 8px 22px rgba(162,18,71,0.32)', whiteSpace: 'nowrap',
            }}
          >{busy === 'pdf' ? '⏳ Erstelle PDF…' : '📄 PDF herunterladen'}</button>
          <button
            onClick={downloadPng}
            disabled={!!busy}
            style={{
              background: '#fff', color: MAGENTA, border: `2px solid ${PINK}`, borderRadius: 999,
              padding: '12px 24px', fontFamily: DISPLAY, fontWeight: 800, fontSize: 15.5,
              cursor: busy ? 'wait' : 'pointer', opacity: busy && busy !== 'png' ? 0.55 : 1,
              whiteSpace: 'nowrap',
            }}
          >{busy === 'png' ? '⏳ Erstelle Bild…' : '🖼️ Als Bild (PNG)'}</button>
        </div>
      </div>

      {/* A4-Poster */}
      <div ref={posterRef} className="qq-about-page" style={{
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

        {/* ── Team-Avatar-Leiste (die echten Game-Tiere + Farben) ── */}
        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16,
          padding: '16px 30px 2px',
        }}>
          {TEAMS.map(t => (
            <div key={t.slug} style={{
              width: 50, height: 50, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.25), rgba(255,255,255,0) 50%), ${t.color}`,
              boxShadow: `0 4px 12px ${t.color}55, inset 0 -6px 12px rgba(0,0,0,0.22)`,
            }}>
              <img src={cozy3dSrc(t.slug)} alt="" draggable={false}
                style={{ width: '86%', height: '86%', objectFit: 'contain', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.3))' }} />
            </div>
          ))}
        </div>

        {/* ── Hook ── */}
        <section style={{ padding: '14px 30px 6px' }}>
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

          {/* Mini-Brett-Illustration mit echten Game-Avataren + Brett-Farben */}
          <div style={{ flexShrink: 0, width: 214, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9, paddingTop: 4 }}>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 5,
              padding: 11, background: '#f4f3f8', borderRadius: 18,
              border: '2px solid #e4e1ee', boxShadow: '0 6px 18px rgba(30,42,90,0.10)',
            }}>
              {MINI_GRID.flat().map((region, i) => {
                const r = Math.floor(i / 5), c = i % 5;
                const team = TEAMS[region];
                const avIdx = AVATAR_CELLS[`${r}-${c}`];
                const hasAv = avIdx !== undefined;
                return (
                  <div key={i} style={{
                    width: 36, height: 36, borderRadius: 9, position: 'relative',
                    background: `linear-gradient(135deg, ${team.color}, ${team.color}cc)`,
                    boxShadow: hasAv
                      ? `inset 0 0 0 2.5px #fff, 0 3px 9px ${team.color}77`
                      : `inset 0 0 0 1.5px ${team.color}`,
                    zIndex: hasAv ? 1 : undefined,
                  }}>
                    {hasAv && (
                      <img src={cozy3dSrc(TEAMS[avIdx].slug)} alt="" draggable={false}
                        style={{
                          position: 'absolute', inset: 0, width: '100%', height: '100%',
                          objectFit: 'contain', padding: 2,
                          filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.38))',
                        }} />
                    )}
                  </div>
                );
              })}
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
