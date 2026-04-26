// QQ Gouache Lab — Stilstudie: Wie würde CozyQuiz im
// Aquarell-/Gouache-/Kinderbuch-Illustrations-Stil aussehen?
//
// Diese Page nutzt die wiederverwendbare gouache-Library unter
// `src/gouache/`. Alle Painted-Components (Balloon, Hills, Avatar, Card)
// sind dort gemeinsam mit den Design-Tokens — wenn du sie hier siehst,
// kannst du sie 1:1 in echten Game-Pages (Beamer/Team/Moderator-
// Gouache-Variante) wiederverwenden.

import * as React from 'react';
import { QQ_AVATARS } from '@shared/quarterQuizTypes';
import {
  PALETTE, F_HAND, F_BODY, PAPER_BG,
  GouacheFilters, PaintedKeyframes, usePaintFonts,
  PaperCard, SectionLabel,
  PaintedAvatar, PaintedAvatarMini,
  PaintedBalloon, PaintedMoon, PaintedHills, PaintedStars, PaintedBird,
} from '../gouache';

// ── Sections ────────────────────────────────────────────────────────────────

function HeaderSection() {
  return (
    <div style={{ textAlign: 'center', marginBottom: 56 }}>
      <div style={{
        fontFamily: F_BODY, fontSize: 13, letterSpacing: '0.18em',
        color: PALETTE.terracotta, fontWeight: 600,
        textTransform: 'uppercase', marginBottom: 12,
      }}>
        Design-Studie · Aquarell &amp; Gouache
      </div>
      <h1 style={{
        fontFamily: F_HAND, fontSize: 'clamp(48px, 7vw, 92px)',
        color: PALETTE.inkDeep, margin: 0, fontWeight: 700, lineHeight: 1.05,
        letterSpacing: '-0.01em',
      }}>
        Wie sähe CozyQuiz<br/>im Bilderbuch-Stil aus?
      </h1>
      <div style={{
        fontFamily: F_BODY, fontSize: 17, color: PALETTE.charcoal,
        marginTop: 22, maxWidth: 720, margin: '22px auto 0', lineHeight: 1.6,
        fontStyle: 'italic',
      }}>
        Eine Stilstudie zur poetisch-malerischen Variante: gedämpfte Farben,
        Papier-Textur, Aquarell-Wäschen, handgeschriebene Typografie. Die
        bestehenden Avatare zeigen wir hier mit CSS-Filter angedeutet — für
        die echte App müssten sie neu illustriert werden (AI-Image-to-Image
        oder Custom-Art).
      </div>
      <div style={{
        marginTop: 18, padding: '10px 18px', borderRadius: 999,
        background: `${PALETTE.sage}26`, border: `1.5px dashed ${PALETTE.sage}`,
        fontFamily: F_BODY, fontSize: 13, color: PALETTE.inkDeep,
        display: 'inline-block', fontStyle: 'italic',
      }}>
        Parallel-Modus: alter Stil bleibt unangetastet · neue Pages laufen
        unter <code>/...-gouache</code> oder eigenen Routes
      </div>
    </div>
  );
}

function PaletteSection() {
  const swatches: Array<{ name: string; hex: string; role: string }> = [
    { name: 'Tinte tief',   hex: PALETTE.inkDeep,    role: 'Nachthimmel · Textfarbe' },
    { name: 'Tinte sanft',  hex: PALETTE.inkSoft,    role: 'Mittlere Schatten' },
    { name: 'Salbei',       hex: PALETTE.sage,       role: 'Hügel · Beruhigung' },
    { name: 'Salbei hell',  hex: PALETTE.sageLight,  role: 'Wash · Akzent' },
    { name: 'Cremeweiß',    hex: PALETTE.cream,      role: 'Papier · Cards' },
    { name: 'Terracotta',   hex: PALETTE.terracotta, role: 'CTA · Akzent warm' },
    { name: 'Ocker',        hex: PALETTE.ochre,      role: 'Mond · Sterne' },
    { name: 'Holzkohle',    hex: PALETTE.charcoal,   role: 'Pinselkonturen' },
  ];
  return (
    <PaperCard washColor={PALETTE.paper} padding={36} style={{ marginBottom: 40 }}>
      <SectionLabel n="01" title="Farb­palette" sub="Gedämpfte Erdtöne, harmonisch komponiert" />
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 20, marginTop: 24,
      }}>
        {swatches.map(sw => (
          <div key={sw.hex} style={{ textAlign: 'center' }}>
            <div style={{
              width: 86, height: 86, margin: '0 auto', borderRadius: '50%',
              background: sw.hex,
              boxShadow: '0 8px 18px rgba(31,58,95,0.18), inset 0 -8px 14px rgba(0,0,0,0.1)',
              filter: 'url(#paintFrame)',
            }} />
            <div style={{ fontFamily: F_HAND, fontSize: 24, color: PALETTE.inkDeep, marginTop: 10 }}>
              {sw.name}
            </div>
            <div style={{ fontFamily: F_BODY, fontSize: 12, color: PALETTE.charcoal, opacity: 0.7, marginTop: 2 }}>
              {sw.hex}
            </div>
            <div style={{ fontFamily: F_BODY, fontSize: 11, color: PALETTE.inkSoft, marginTop: 4, fontStyle: 'italic' }}>
              {sw.role}
            </div>
          </div>
        ))}
      </div>
    </PaperCard>
  );
}

function TypographySection() {
  return (
    <PaperCard washColor={PALETTE.cream} padding={36} style={{ marginBottom: 40 }}>
      <SectionLabel n="02" title="Typografie" sub="Handgeschrieben + warmer Serif" />
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginTop: 28,
      }}>
        <div>
          <div style={{ fontFamily: F_BODY, fontSize: 11, color: PALETTE.terracotta, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 8 }}>
            Heading · Caveat
          </div>
          <div style={{ fontFamily: F_HAND, fontSize: 64, color: PALETTE.inkDeep, lineHeight: 1, fontWeight: 700 }}>
            Wie viele Sterne?
          </div>
          <div style={{ fontFamily: F_HAND, fontSize: 36, color: PALETTE.sage, marginTop: 14 }}>
            Schätzt mit dem Herzen.
          </div>
        </div>
        <div>
          <div style={{ fontFamily: F_BODY, fontSize: 11, color: PALETTE.terracotta, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 8 }}>
            Body · Lora
          </div>
          <div style={{ fontFamily: F_BODY, fontSize: 18, color: PALETTE.charcoal, lineHeight: 1.65 }}>
            Antworten sind oft nur ein leiser Anfang. Manchmal liegt der
            schönste Moment des Quiz darin, gemeinsam zu staunen — über das,
            was nahe und das, was fern ist.
          </div>
          <div style={{ fontFamily: F_BODY, fontSize: 14, color: PALETTE.inkSoft, marginTop: 12, fontStyle: 'italic' }}>
            Caveat 700 · 64px Heading<br/>
            Lora 400 · 18px Body · 1.65 line-height
          </div>
        </div>
      </div>
    </PaperCard>
  );
}

// ── Mockup: Beamer Welcome ──────────────────────────────────────────────────
function BeamerWelcomeMockup() {
  return (
    <PaperCard washColor={PALETTE.paper} padding={32} style={{ marginBottom: 40 }}>
      <SectionLabel n="03" title="Beamer · Welcome" sub="Atmosphärischer Einstieg" />
      <div style={{
        marginTop: 28, position: 'relative', borderRadius: 14, overflow: 'hidden',
        aspectRatio: '16/9', maxWidth: 1200,
        background: `linear-gradient(180deg, ${PALETTE.inkDeep} 0%, ${PALETTE.inkSoft} 60%, ${PALETTE.sage} 100%)`,
      }}>
        <PaintedStars count={28} />
        <div style={{ position: 'absolute', top: 32, right: 60 }}>
          <PaintedMoon size={64} />
        </div>
        <PaintedBird x="22%" y="18%" size={28} />
        <PaintedBird x="64%" y="24%" size={22} />
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
          <PaintedHills width={1200} height={180} />
        </div>
        <div style={{ position: 'absolute', left: '14%', top: '32%' }}>
          <PaintedBalloon color={PALETTE.terracotta} size={68} />
        </div>
        <div style={{ position: 'absolute', right: '20%', top: '46%' }}>
          <PaintedBalloon color={PALETTE.ochre} size={56} />
        </div>
        <div style={{ position: 'absolute', left: '42%', top: '54%' }}>
          <PaintedBalloon color={PALETTE.sageLight} size={44} />
        </div>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          textAlign: 'center', padding: '0 40px', zIndex: 5,
        }}>
          <div style={{
            fontFamily: F_BODY, fontSize: 14, letterSpacing: '0.32em',
            color: PALETTE.cream, opacity: 0.82,
            textTransform: 'uppercase', marginBottom: 14,
          }}>
            Ein Quiz-Abend
          </div>
          <div style={{
            fontFamily: F_HAND, fontSize: 'clamp(48px, 6vw, 100px)',
            color: PALETTE.cream, lineHeight: 1, fontWeight: 700,
            textShadow: '0 4px 16px rgba(0,0,0,0.4)',
          }}>
            CozyQuiz
          </div>
          <div style={{
            fontFamily: F_HAND, fontSize: 'clamp(22px, 2.4vw, 38px)',
            color: PALETTE.sageLight, marginTop: 14,
            fontStyle: 'italic', opacity: 0.92,
          }}>
            Beim Schein der Laternen
          </div>
          <div style={{
            marginTop: 36,
            background: PALETTE.terracotta, color: PALETTE.cream,
            fontFamily: F_HAND, fontSize: 30, fontWeight: 700,
            padding: '12px 44px', borderRadius: 999,
            boxShadow: '0 8px 22px rgba(224,122,95,0.4), inset 0 -3px 0 rgba(0,0,0,0.12)',
            filter: 'url(#paintFrame)',
            letterSpacing: '0.02em',
          }}>
            Spiel beginnen
          </div>
        </div>
      </div>
      <div style={{ fontFamily: F_BODY, fontSize: 14, color: PALETTE.inkSoft, marginTop: 14, fontStyle: 'italic', textAlign: 'center' }}>
        Aquarell-Verlauf · gemalte Hügel · schwebende Heißluftballons in Teamfarbe · handgeschriebener Titel
      </div>
    </PaperCard>
  );
}

// ── Mockup: Beamer Question (Schätzchen) ───────────────────────────────────
function BeamerQuestionMockup() {
  return (
    <PaperCard washColor={PALETTE.paper} padding={32} style={{ marginBottom: 40 }}>
      <SectionLabel n="04" title="Beamer · Frage" sub="Klare Bühne, malerischer Rahmen" />
      <div style={{
        marginTop: 28, position: 'relative', borderRadius: 14, overflow: 'hidden',
        aspectRatio: '16/9', maxWidth: 1200,
        background: `radial-gradient(ellipse at 50% 30%, ${PALETTE.cream} 0%, ${PALETTE.paper} 100%)`,
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/><feColorMatrix values='0 0 0 0 0.4  0 0 0 0 0.32  0 0 0 0 0.18  0 0 0 0.08 0'/></filter><rect width='200' height='200' filter='url(%23n)'/></svg>")`,
          mixBlendMode: 'multiply',
        }} />
        <div style={{
          position: 'absolute', top: 24, left: 32, right: 32,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{
            fontFamily: F_BODY, fontSize: 12, letterSpacing: '0.22em',
            color: PALETTE.terracotta, fontWeight: 700, textTransform: 'uppercase',
          }}>
            🎯 Schätzchen · Frage 3 von 5
          </div>
          <div style={{ fontFamily: F_HAND, fontSize: 32, color: PALETTE.inkDeep }}>
            00:24
          </div>
        </div>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '0 60px',
        }}>
          <div style={{
            fontFamily: F_HAND, fontSize: 'clamp(36px, 4.4vw, 70px)',
            color: PALETTE.inkDeep, textAlign: 'center', lineHeight: 1.1,
            fontWeight: 700, maxWidth: 900,
          }}>
            Wie schnell kann<br/>
            ein Gepard maximal<br/>
            laufen?
          </div>
          <div style={{
            fontFamily: F_BODY, fontSize: 18, color: PALETTE.inkSoft,
            marginTop: 18, fontStyle: 'italic',
          }}>
            in Kilometern pro Stunde
          </div>
          <div style={{
            marginTop: 48, display: 'flex', gap: 14, alignItems: 'center',
            background: `${PALETTE.cream}c0`,
            padding: '14px 24px', borderRadius: 999,
            border: `1.5px dashed ${PALETTE.sage}`,
          }}>
            <div style={{ fontFamily: F_BODY, fontSize: 14, color: PALETTE.sage, fontWeight: 600 }}>
              5 von 8 haben geschätzt
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {QQ_AVATARS.slice(0, 8).map((a, i) => (
                <PaintedAvatarMini key={a.id} slug={a.slug} answered={i < 5} />
              ))}
            </div>
          </div>
        </div>
        <PaintedBird x="8%" y="16%" size={20} />
        <PaintedBird x="88%" y="22%" size={26} />
      </div>
    </PaperCard>
  );
}

// ── Mockup: Beamer Reveal (Schätzchen) ─────────────────────────────────────
function BeamerRevealMockup() {
  return (
    <PaperCard washColor={PALETTE.paper} padding={32} style={{ marginBottom: 40 }}>
      <SectionLabel n="05" title="Beamer · Auflösung" sub="Lösung oben · Sieger unten · Aquarell-Wash" />
      <div style={{
        marginTop: 28, position: 'relative', borderRadius: 14, overflow: 'hidden',
        aspectRatio: '16/9', maxWidth: 1200,
        background: `linear-gradient(180deg, ${PALETTE.inkSoft} 0%, ${PALETTE.sage} 60%, ${PALETTE.sageLight} 100%)`,
      }}>
        <PaintedStars count={14} />
        <div style={{ position: 'absolute', inset: 0, padding: '40px 60px', display: 'flex', gap: 32 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 22 }}>
            <div style={{
              flex: 1,
              background: `${PALETTE.cream}f0`,
              borderRadius: 18,
              padding: '22px 28px',
              boxShadow: '0 12px 28px rgba(31,58,95,0.25)',
              filter: 'url(#paintFrame)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ fontFamily: F_BODY, fontSize: 12, letterSpacing: '0.22em', color: PALETTE.sage, fontWeight: 700, textTransform: 'uppercase' }}>
                Lösung
              </div>
              <div style={{ fontFamily: F_HAND, fontSize: 'clamp(80px, 11vw, 180px)', color: PALETTE.inkDeep, lineHeight: 1, fontWeight: 700 }}>
                112
              </div>
              <div style={{ fontFamily: F_BODY, fontSize: 16, color: PALETTE.inkSoft, fontStyle: 'italic' }}>
                km/h
              </div>
            </div>
            <div style={{
              flex: 1,
              background: `${PALETTE.terracotta}26`,
              border: `2.5px solid ${PALETTE.terracotta}`,
              borderRadius: 18,
              padding: '22px 28px',
              filter: 'url(#paintFrame)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 8,
            }}>
              <div style={{ fontFamily: F_HAND, fontSize: 22, color: PALETTE.terracotta }}>
                Am nächsten dran
              </div>
              <div style={{ fontFamily: F_HAND, fontSize: 'clamp(60px, 9vw, 140px)', color: PALETTE.terracotta, lineHeight: 1, fontWeight: 700 }}>
                111
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 4 }}>
                <PaintedAvatarMini slug="waschbaer" answered={true} />
                <span style={{ fontFamily: F_HAND, fontSize: 28, color: PALETTE.inkDeep }}>Robin</span>
                <span style={{ fontFamily: F_BODY, fontSize: 12, color: PALETTE.terracotta, padding: '3px 10px', borderRadius: 999, background: `${PALETTE.terracotta}22`, fontWeight: 700 }}>
                  Δ 1 · in Range
                </span>
              </div>
            </div>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
            {[
              { rank: 1, name: 'Till',   slug: 'shiba',     val: 112, delta: 0, hit: true },
              { rank: 2, name: 'Robin',  slug: 'waschbaer', val: 111, delta: 1, hit: true },
              { rank: 3, name: 'Harald', slug: 'koala',     val: 110, delta: 2, hit: false },
              { rank: 4, name: 'Maria',  slug: 'pinguin',   val: 114, delta: 2, hit: false },
              { rank: 5, name: 'Sonja',  slug: 'giraffe',   val: 117, delta: 5, hit: false },
            ].map(r => (
              <div key={r.rank} style={{
                display: 'grid', gridTemplateColumns: 'auto auto 1fr auto',
                alignItems: 'center', gap: 14,
                padding: '8px 16px', borderRadius: 12,
                background: `${PALETTE.cream}c0`,
                border: r.hit ? `2px solid ${PALETTE.terracotta}` : `1px solid ${PALETTE.inkSoft}33`,
              }}>
                <div style={{
                  fontFamily: F_HAND, fontSize: 30, color: r.rank === 1 ? PALETTE.terracotta : PALETTE.inkDeep,
                  fontWeight: 700, minWidth: 36, textAlign: 'center',
                }}>#{r.rank}</div>
                <PaintedAvatarMini slug={r.slug} answered={true} />
                <div style={{ fontFamily: F_HAND, fontSize: 24, color: PALETTE.inkDeep }}>{r.name}</div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <div style={{ fontFamily: F_HAND, fontSize: 22, color: PALETTE.inkDeep }}>{r.val}</div>
                  <div style={{ fontFamily: F_BODY, fontSize: 11, color: PALETTE.inkSoft }}>Δ {r.delta}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PaperCard>
  );
}

// ── Mockup: Grid + Score ──────────────────────────────────────────────────
function GridMockup() {
  const grid: Array<Array<{ owner: string | null; joker?: boolean; stack?: boolean }>> = [
    [{ owner: 'fox' }, { owner: null }, { owner: 'frog' }, { owner: 'frog' }, { owner: null }],
    [{ owner: 'fox' }, { owner: 'cat' }, { owner: null }, { owner: 'frog', stack: true }, { owner: 'panda' }],
    [{ owner: null }, { owner: 'cat' }, { owner: 'unicorn', joker: true }, { owner: 'unicorn' }, { owner: 'panda' }],
    [{ owner: 'cow' }, { owner: null }, { owner: 'unicorn' }, { owner: null }, { owner: 'rabbit' }],
    [{ owner: 'cow' }, { owner: 'cow' }, { owner: null }, { owner: 'rabbit' }, { owner: 'rabbit' }],
  ];
  const colorOf = (id: string | null) => {
    if (!id) return PALETTE.cream;
    const a = QQ_AVATARS.find(x => x.id === id);
    return a?.color ?? PALETTE.cream;
  };
  const slugOf = (id: string | null) => {
    if (!id) return null;
    const a = QQ_AVATARS.find(x => x.id === id);
    return a?.slug ?? null;
  };

  return (
    <PaperCard washColor={PALETTE.paper} padding={32} style={{ marginBottom: 40 }}>
      <SectionLabel n="06" title="Spielfeld · 5×5" sub="Bemalte Aquarell-Felder mit Tier-Symbolen" />
      <div style={{
        marginTop: 28, position: 'relative', borderRadius: 14, overflow: 'hidden',
        background: `linear-gradient(180deg, ${PALETTE.inkSoft} 0%, ${PALETTE.sage} 100%)`,
        padding: '40px 60px',
        display: 'flex', gap: 40, alignItems: 'center',
      }}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 10, padding: 14,
          background: `${PALETTE.paper}c0`,
          borderRadius: 14,
          filter: 'url(#paintFrame)',
          boxShadow: '0 14px 38px rgba(31,58,95,0.3)',
          flex: '0 0 auto',
        }}>
          {grid.flatMap((row, r) => row.map((cell, c) => {
            const color = colorOf(cell.owner);
            const slug = slugOf(cell.owner);
            const tilt = ((r * 7 + c * 13) % 7 - 3) * 0.6;
            return (
              <div key={`${r}-${c}`} style={{
                width: 78, height: 78, borderRadius: 10,
                background: cell.owner
                  ? `radial-gradient(circle at 30% 30%, ${color}cc, ${color}99 60%, ${color}66 100%)`
                  : `${PALETTE.cream}aa`,
                border: cell.owner ? `1.5px solid ${color}` : `1.5px dashed ${PALETTE.inkSoft}55`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative',
                transform: `rotate(${tilt}deg)`,
                boxShadow: cell.owner ? `0 4px 12px ${color}55, inset 0 -3px 6px rgba(0,0,0,0.1)` : 'none',
              }}>
                {slug && (
                  <div style={{
                    width: 50, height: 50, borderRadius: '50%',
                    backgroundImage: `url(/avatars/cozy-cast/avatar-${slug}.png)`,
                    backgroundSize: 'cover', backgroundPosition: 'center',
                    filter: 'url(#avatarGouache)',
                  }} />
                )}
                {cell.joker && (
                  <div style={{
                    position: 'absolute', top: -6, right: -6,
                    width: 22, height: 22, borderRadius: '50%',
                    background: PALETTE.ochre,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, color: PALETTE.cream,
                    boxShadow: `0 0 12px ${PALETTE.ochre}99`,
                  }}>★</div>
                )}
                {cell.stack && (
                  <div style={{
                    position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)',
                    fontFamily: F_HAND, fontSize: 14, color: PALETTE.cream,
                    background: PALETTE.charcoal, padding: '0 6px', borderRadius: 4,
                  }}>×2</div>
                )}
              </div>
            );
          }))}
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontFamily: F_HAND, fontSize: 36, color: PALETTE.cream, marginBottom: 6 }}>
            Stand
          </div>
          {[
            { rank: 1, name: 'Sonja',   slug: 'giraffe',   pts: 8, max: true },
            { rank: 2, name: 'Robin',   slug: 'waschbaer', pts: 7 },
            { rank: 3, name: 'Harald',  slug: 'koala',     pts: 7 },
            { rank: 4, name: 'Maria',   slug: 'pinguin',   pts: 5 },
          ].map(t => (
            <div key={t.rank} style={{
              display: 'grid', gridTemplateColumns: 'auto auto 1fr auto',
              alignItems: 'center', gap: 12, padding: '8px 14px', borderRadius: 12,
              background: t.max ? `${PALETTE.terracotta}33` : `${PALETTE.cream}c0`,
              border: t.max ? `2px solid ${PALETTE.terracotta}` : 'none',
              filter: 'url(#watercolorEdge)',
            }}>
              <div style={{ fontFamily: F_HAND, fontSize: 26, color: t.max ? PALETTE.terracotta : PALETTE.inkDeep, fontWeight: 700, minWidth: 30 }}>
                {t.max ? '🏆' : `#${t.rank}`}
              </div>
              <PaintedAvatarMini slug={t.slug} answered={true} />
              <div style={{ fontFamily: F_HAND, fontSize: 22, color: PALETTE.inkDeep }}>{t.name}</div>
              <div style={{ fontFamily: F_HAND, fontSize: 24, color: PALETTE.inkDeep, fontWeight: 700 }}>
                {t.pts}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ fontFamily: F_BODY, fontSize: 14, color: PALETTE.inkSoft, marginTop: 14, fontStyle: 'italic', textAlign: 'center' }}>
        Felder leicht verdreht (rotation ±3°) für hand-gelegtes Look · Joker = goldener Stern · Stapel = handgeschriebenes ×2
      </div>
    </PaperCard>
  );
}

// ── Mockup: Team-Seite (Phone) ─────────────────────────────────────────────
function PhoneFrame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      width: 280, height: 540,
      background: PALETTE.cream,
      border: `8px solid ${PALETTE.charcoal}`,
      borderRadius: 38,
      overflow: 'hidden',
      position: 'relative',
      boxShadow: '0 18px 44px rgba(31,58,95,0.25)',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        background: PALETTE.cream,
        padding: '14px 18px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: `1px dashed ${PALETTE.inkSoft}33`,
      }}>
        <div style={{ fontFamily: F_HAND, fontSize: 18, color: PALETTE.inkDeep, fontWeight: 700 }}>{title}</div>
        <div style={{ fontFamily: F_BODY, fontSize: 11, color: PALETTE.inkSoft }}>CozyQuiz</div>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>{children}</div>
    </div>
  );
}

function TeamPageMockup() {
  return (
    <PaperCard washColor={PALETTE.paper} padding={32} style={{ marginBottom: 40 }}>
      <SectionLabel n="07" title="Team · Handy" sub="Sanfte Cards, organische Buttons" />
      <div style={{ display: 'flex', gap: 32, justifyContent: 'center', marginTop: 28, flexWrap: 'wrap' }}>
        <PhoneFrame title="Frage 3 / 10">
          <div style={{ padding: '22px 18px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ fontFamily: F_BODY, fontSize: 11, letterSpacing: '0.18em', color: PALETTE.terracotta, textTransform: 'uppercase', fontWeight: 700 }}>
              🅰️ Mucho · 4 Optionen
            </div>
            <div style={{ fontFamily: F_HAND, fontSize: 28, color: PALETTE.inkDeep, lineHeight: 1.15, fontWeight: 700 }}>
              Welcher Planet ist der Sonne am nächsten?
            </div>
            {['Merkur', 'Venus', 'Mars', 'Jupiter'].map((opt, i) => (
              <div key={opt} style={{
                padding: '12px 18px', borderRadius: 14,
                background: i === 0 ? `${PALETTE.sage}44` : `${PALETTE.cream}`,
                border: i === 0 ? `2px solid ${PALETTE.sage}` : `1.5px solid ${PALETTE.inkSoft}33`,
                fontFamily: F_BODY, fontSize: 16, color: PALETTE.inkDeep,
                display: 'flex', alignItems: 'center', gap: 12,
                filter: 'url(#watercolorEdge)',
              }}>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%',
                  border: `2px solid ${i === 0 ? PALETTE.sage : PALETTE.inkSoft}55`,
                  background: i === 0 ? PALETTE.sage : 'transparent',
                  flexShrink: 0,
                }} />
                {opt}
              </div>
            ))}
          </div>
        </PhoneFrame>
        <PhoneFrame title="Richtig!">
          <div style={{
            padding: '40px 22px', display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 18,
            background: `radial-gradient(circle at 50% 35%, ${PALETTE.sageLight}66 0%, transparent 60%)`,
            minHeight: '100%',
          }}>
            <div style={{
              width: 78, height: 78, borderRadius: '50%',
              background: PALETTE.cream, border: `3px solid ${PALETTE.sage}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 36, color: PALETTE.sage,
              filter: 'url(#paintFrame)',
            }}>✓</div>
            <div style={{ fontFamily: F_HAND, fontSize: 56, color: PALETTE.sage, lineHeight: 1, fontWeight: 700 }}>
              Richtig!
            </div>
            <div style={{ fontFamily: F_BODY, fontSize: 15, color: PALETTE.inkSoft, fontStyle: 'italic', textAlign: 'center' }}>
              Sehr gut, weiter so.
            </div>
            <div style={{ flex: 1 }} />
            <div style={{
              background: PALETTE.terracotta, color: PALETTE.cream,
              fontFamily: F_HAND, fontSize: 22, fontWeight: 700,
              padding: '10px 36px', borderRadius: 999,
              filter: 'url(#paintFrame)',
              boxShadow: `0 6px 16px ${PALETTE.terracotta}66`,
            }}>
              Weiter
            </div>
          </div>
        </PhoneFrame>
        <PhoneFrame title="Spielende">
          <div style={{
            padding: '36px 22px', display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 14, minHeight: '100%',
            background: `linear-gradient(180deg, ${PALETTE.cream} 0%, ${PALETTE.paper} 100%)`,
          }}>
            <div style={{ fontFamily: F_HAND, fontSize: 50, color: PALETTE.inkDeep, lineHeight: 1, fontWeight: 700, textAlign: 'center' }}>
              Du hast<br/>7 von 10
            </div>
            <div style={{
              width: '60%', height: 2, background: PALETTE.terracotta,
              filter: 'url(#watercolorEdge)', marginTop: -4,
            }} />
            <div style={{ fontFamily: F_BODY, fontSize: 14, color: PALETTE.inkSoft, fontStyle: 'italic', marginTop: 4 }}>
              Gar nicht schlecht.
            </div>
            <div style={{ marginTop: 14 }}>
              <PaintedAvatar slug="pinguin" size={80} color={PALETTE.terracotta} />
            </div>
            <div style={{ flex: 1 }} />
            <div style={{
              background: PALETTE.terracotta, color: PALETTE.cream,
              fontFamily: F_HAND, fontSize: 22, fontWeight: 700,
              padding: '10px 36px', borderRadius: 999, marginBottom: 10,
              boxShadow: `0 6px 16px ${PALETTE.terracotta}66`,
            }}>
              Nochmal spielen
            </div>
            <div style={{
              border: `1.5px solid ${PALETTE.inkDeep}`,
              color: PALETTE.inkDeep,
              fontFamily: F_HAND, fontSize: 20,
              padding: '8px 30px', borderRadius: 999,
            }}>
              Zur Startseite
            </div>
          </div>
        </PhoneFrame>
      </div>
    </PaperCard>
  );
}

// ── Mockup: Spielende (Beamer) ─────────────────────────────────────────────
function GameOverMockup() {
  return (
    <PaperCard washColor={PALETTE.paper} padding={32} style={{ marginBottom: 40 }}>
      <SectionLabel n="08" title="Beamer · Spielende" sub="Stiller Triumph, kein Konfetti-Feuerwerk" />
      <div style={{
        marginTop: 28, position: 'relative', borderRadius: 14, overflow: 'hidden',
        aspectRatio: '16/9', maxWidth: 1200,
        background: `linear-gradient(180deg, ${PALETTE.inkDeep} 0%, ${PALETTE.inkSoft} 50%, ${PALETTE.sage} 100%)`,
      }}>
        <PaintedStars count={32} />
        <div style={{ position: 'absolute', top: 28, right: 60 }}>
          <PaintedMoon size={70} />
        </div>
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
          <PaintedHills width={1200} height={140} />
        </div>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '0 60px',
        }}>
          <div style={{
            fontFamily: F_BODY, fontSize: 13, letterSpacing: '0.32em',
            color: PALETTE.cream, opacity: 0.78,
            textTransform: 'uppercase', marginBottom: 14,
          }}>
            Spielende · Sieger­team
          </div>
          <PaintedAvatar slug="giraffe" size={132} color={PALETTE.cream} />
          <div style={{
            fontFamily: F_HAND, fontSize: 'clamp(56px, 7vw, 110px)',
            color: PALETTE.cream, lineHeight: 1, fontWeight: 700, marginTop: 22,
            textShadow: '0 4px 16px rgba(0,0,0,0.4)',
          }}>
            Sonja
          </div>
          <div style={{
            fontFamily: F_HAND, fontSize: 'clamp(22px, 2.6vw, 38px)',
            color: PALETTE.sageLight, marginTop: 6,
            fontStyle: 'italic',
          }}>
            8 verbundene Felder
          </div>
          <div style={{
            marginTop: 36, display: 'flex', gap: 14, alignItems: 'center',
            background: `${PALETTE.cream}d0`,
            padding: '12px 24px', borderRadius: 999,
            filter: 'url(#paintFrame)',
          }}>
            {[
              { name: 'Anna',   slug: 'faultier',  pts: 7, medal: '🥈' },
              { name: 'Jule',   slug: 'capybara',  pts: 7, medal: '🥉' },
              { name: 'Harald', slug: 'koala',     pts: 7, medal: '#4' },
              { name: 'Robin',  slug: 'waschbaer', pts: 6, medal: '#5' },
            ].map(t => (
              <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontFamily: F_HAND, fontSize: 18, color: PALETTE.inkDeep }}>{t.medal}</span>
                <PaintedAvatarMini slug={t.slug} answered={true} />
                <span style={{ fontFamily: F_HAND, fontSize: 20, color: PALETTE.inkDeep }}>{t.name}</span>
                <span style={{ fontFamily: F_BODY, fontSize: 13, color: PALETTE.inkSoft }}>· {t.pts}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PaperCard>
  );
}

// ── Mockup: Avatar-Stilstudie ──────────────────────────────────────────────
function AvatarStudyMockup() {
  return (
    <PaperCard washColor={PALETTE.cream} padding={36} style={{ marginBottom: 40 }}>
      <SectionLabel n="09" title="Avatare · Stilstudie" sub="CSS-Filter-Andeutung — echte Version: AI-Image-to-Image oder Custom-Art" />
      <div style={{
        marginTop: 28,
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 20,
      }}>
        {QQ_AVATARS.map(a => (
          <div key={a.id} style={{ textAlign: 'center' }}>
            <div style={{
              position: 'relative', width: 140, height: 140, margin: '0 auto',
            }}>
              <div style={{
                position: 'absolute', inset: -8,
                borderRadius: '50%',
                background: `radial-gradient(circle, ${a.color}44 0%, transparent 70%)`,
                filter: 'url(#paintFrame)',
              }} />
              <PaintedAvatar slug={a.slug} size={140} color={a.color} />
            </div>
            <div style={{ fontFamily: F_HAND, fontSize: 28, color: PALETTE.inkDeep, marginTop: 10, fontWeight: 700 }}>
              {a.label}
            </div>
            <div style={{ fontFamily: F_BODY, fontSize: 12, color: PALETTE.inkSoft, fontStyle: 'italic', marginTop: 2 }}>
              Teamfarbe {a.color}
            </div>
          </div>
        ))}
      </div>
      <div style={{
        marginTop: 32, padding: '16px 20px', borderRadius: 12,
        background: `${PALETTE.terracotta}1a`,
        border: `1.5px dashed ${PALETTE.terracotta}`,
        fontFamily: F_BODY, fontSize: 14, color: PALETTE.charcoal, lineHeight: 1.6,
      }}>
        <strong style={{ fontFamily: F_HAND, fontSize: 22, color: PALETTE.terracotta, fontWeight: 700, display: 'block', marginBottom: 4 }}>
          Hinweis zur echten Umsetzung
        </strong>
        Diese Avatare sind die bestehenden cozy-cast PNGs mit CSS-Color-Matrix-Filter
        (gedämpfte Saturation + warmer Sepia) und einem hand-gemalten Frame —
        nur eine <em>Andeutung</em> des Aquarell-Looks. Für das echte Quiz im Bilderbuch-Stil
        müssten die 8 Avatare neu illustriert werden:
        <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
          <li><strong>Schnell &amp; günstig:</strong> Midjourney/DALL-E mit Image-to-Image-Modus, Prompt
            wie „watercolor children's book illustration of a fox in a hoodie, soft warm palette, paper texture"</li>
          <li><strong>Hochwertig:</strong> Custom-Art von einer Illustrator:in im Stil deines Beispiel-Screenshots</li>
        </ul>
      </div>
    </PaperCard>
  );
}

// ── Team-Farben sanft ──────────────────────────────────────────────────────
// Vergleich: aktuelle saturierte Team-Farben vs sanftere Gouache-Variante.
// Prinzip: 15-20% Saturation runter, 5-10% Lightness rauf — bleibt distinkt
// aber atmet ruhiger. Hoodie-Pairings funktionieren weiter, der Kontrast
// wird sogar stimmiger (weniger Schreierisches dazwischen).
// Soft Team-Farben = exakter Hoodie-Hex aus den gemalten Aquarell-Avataren.
// Quelle: avatar-{slug}.png in public/avatars/gouache, Hoodie-Sample
// (Region 85-97% Höhe, Average-RGB ohne Highlight/Shadow-Pixel).
const TEAM_COLOR_SOFT: Array<{
  slug: string; label: string; oldHex: string; softHex: string; softName: string;
}> = [
  { slug: 'shiba',     label: 'Hund (Shiba)', oldHex: '#FA507F', softHex: '#9D9387', softName: 'Stone Grey' },
  { slug: 'faultier',  label: 'Faultier',     oldHex: '#9DCB2F', softHex: '#B79EAC', softName: 'Lavender' },
  { slug: 'pinguin',   label: 'Pinguin',      oldHex: '#266FD3', softHex: '#E99E9D', softName: 'Dusty Rose' },
  { slug: 'koala',     label: 'Koala',        oldHex: '#9A65D5', softHex: '#F35357', softName: 'Coral Red' },
  { slug: 'giraffe',   label: 'Giraffe',      oldHex: '#FEC814', softHex: '#9EA7C8', softName: 'Periwinkel Blue' },
  { slug: 'waschbaer', label: 'Waschbär',     oldHex: '#68B4A5', softHex: '#E9BF53', softName: 'Mustard Yellow' },
  { slug: 'kuh',       label: 'Kuh',          oldHex: '#FF751F', softHex: '#D26631', softName: 'Burnt Orange' },
  { slug: 'capybara',  label: 'Capybara',     oldHex: '#F84326', softHex: '#B4B677', softName: 'Sage Olive' },
];

function SoftTeamColorsSection() {
  return (
    <PaperCard washColor={PALETTE.cream} padding={36} style={{ marginBottom: 40 }}>
      <SectionLabel n="10" title="Sanfte Team-Farben" sub="Bestehende Hues — nur etwas weniger saturiert" />

      <div style={{
        marginTop: 24, padding: '14px 18px', borderRadius: 10,
        background: `${PALETTE.terracotta}1a`, border: `1.5px solid ${PALETTE.terracotta}55`,
        fontFamily: F_BODY, fontSize: 14, color: PALETTE.charcoal, lineHeight: 1.55,
      }}>
        <strong style={{ fontFamily: F_HAND, fontSize: 22, color: PALETTE.terracotta, fontWeight: 700, display: 'block', marginBottom: 4 }}>
          Sanftungs-Prinzip
        </strong>
        Die 8 Team-Hues bleiben — Pink ist Pink, Blau ist Blau, alle Teams bleiben sofort
        unterscheidbar. Aber: ~15-20% Saturation runter, ~5-10% Lightness rauf, leicht
        wärmerer Bias bei den kalten Tönen. Effekt: weniger Plakat-Knall, mehr Aquarell-
        Atem. Die Avatare poppen trotzdem klar wegen der Hoodie-Komplementäre.
      </div>

      {/* Side-by-side Swatches: Alt vs Sanft */}
      <div style={{
        marginTop: 28, display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16,
      }}>
        {TEAM_COLOR_SOFT.map(t => (
          <div key={t.slug} style={{
            padding: 14, borderRadius: 14,
            background: `${PALETTE.paper}aa`,
            border: `1.5px solid ${PALETTE.charcoal}22`,
            filter: 'url(#watercolorEdge)',
          }}>
            <div style={{ fontFamily: F_HAND, fontSize: 22, color: PALETTE.inkDeep, fontWeight: 700, marginBottom: 8 }}>
              {t.label}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{
                  height: 56, borderRadius: 10,
                  background: `radial-gradient(circle at 30% 30%, ${t.oldHex}cc, ${t.oldHex}99 60%, ${t.oldHex}66 100%)`,
                  border: `1.5px solid ${t.oldHex}`,
                  marginBottom: 4,
                }} />
                <div style={{ fontFamily: 'monospace', fontSize: 10, color: PALETTE.inkSoft, textAlign: 'center' }}>
                  Alt {t.oldHex}
                </div>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: F_HAND, fontSize: 26, color: PALETTE.terracotta, fontWeight: 700, padding: '0 4px',
              }}>→</div>
              <div style={{ flex: 1 }}>
                <div style={{
                  height: 56, borderRadius: 10,
                  background: `radial-gradient(circle at 30% 30%, ${t.softHex}cc, ${t.softHex}99 60%, ${t.softHex}66 100%)`,
                  border: `1.5px solid ${t.softHex}`,
                  boxShadow: `0 4px 10px ${t.softHex}33`,
                  marginBottom: 4,
                }} />
                <div style={{ fontFamily: 'monospace', fontSize: 10, color: PALETTE.inkDeep, fontWeight: 700, textAlign: 'center' }}>
                  Sanft {t.softHex}
                </div>
              </div>
            </div>
            <div style={{ fontFamily: F_BODY, fontSize: 11, color: PALETTE.terracotta, fontStyle: 'italic', marginTop: 6, textAlign: 'center' }}>
              {t.softName}
            </div>
          </div>
        ))}
      </div>

      {/* Demo-Grid mit den sanften Farben — exakt wie der echte In-Game-Grid */}
      <div style={{ marginTop: 32 }}>
        <div style={{ fontFamily: F_HAND, fontSize: 24, color: PALETTE.inkDeep, fontWeight: 700, marginBottom: 12 }}>
          Demo-Grid mit sanften Farben
        </div>
        <SoftGridDemo />
      </div>

      {/* Direkter Hex-Block zum Kopieren */}
      <div style={{
        marginTop: 28, padding: '16px 20px', borderRadius: 10,
        background: PALETTE.inkDeep, color: PALETTE.cream,
        fontFamily: 'monospace', fontSize: 13, lineHeight: 1.7,
      }}>
        <div style={{ fontFamily: F_HAND, fontSize: 22, color: PALETTE.cream, fontWeight: 700, marginBottom: 8 }}>
          Zum Kopieren · QQ_AVATARS color-Field
        </div>
        {TEAM_COLOR_SOFT.map(t => (
          <div key={t.slug}>
            <span style={{ color: PALETTE.sageLight }}>{t.slug.padEnd(11)}</span>
            <span style={{ color: PALETTE.cream }}>color: '</span>
            <span style={{ color: PALETTE.terracotta, fontWeight: 700 }}>{t.softHex}</span>
            <span style={{ color: PALETTE.cream }}>',</span>
            <span style={{ color: PALETTE.inkSoft, marginLeft: 12 }}>// {t.softName}</span>
          </div>
        ))}
      </div>
    </PaperCard>
  );
}

// 5x5 Demo-Grid — gleicher Look wie der echte In-Game-Grid, mit sanften Farben
function SoftGridDemo() {
  const grid: Array<Array<{ slug: string | null; joker?: boolean; stack?: boolean }>> = [
    [{ slug: 'shiba' }, { slug: null }, { slug: 'faultier' }, { slug: 'faultier' }, { slug: null }],
    [{ slug: 'shiba' }, { slug: 'capybara' }, { slug: null }, { slug: 'faultier', stack: true }, { slug: 'pinguin' }],
    [{ slug: null }, { slug: 'capybara' }, { slug: 'giraffe', joker: true }, { slug: 'giraffe' }, { slug: 'pinguin' }],
    [{ slug: 'kuh' }, { slug: null }, { slug: 'giraffe' }, { slug: null }, { slug: 'koala' }],
    [{ slug: 'kuh' }, { slug: 'kuh' }, { slug: null }, { slug: 'koala' }, { slug: 'koala' }],
  ];
  const colorOf = (slug: string | null) => {
    if (!slug) return null;
    return TEAM_COLOR_SOFT.find(t => t.slug === slug)?.softHex ?? null;
  };

  return (
    <div style={{
      maxWidth: 600, margin: '0 auto',
      padding: 16, borderRadius: 18,
      background: `linear-gradient(180deg, ${PALETTE.inkSoft}88 0%, ${PALETTE.sage}88 100%)`,
      filter: 'url(#paintFrame)',
      boxShadow: '0 14px 38px rgba(31,58,95,0.3)',
    }}>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8,
      }}>
        {grid.flatMap((row, r) => row.map((cell, c) => {
          const color = colorOf(cell.slug);
          const tilt = ((r * 7 + c * 13) % 7 - 3) * 0.5;
          return (
            <div key={`${r}-${c}`} style={{
              aspectRatio: '1', borderRadius: 12,
              background: color
                ? `radial-gradient(circle at 30% 30%, ${color}cc, ${color}99 60%, ${color}66 100%)`
                : `${PALETTE.cream}99`,
              border: color ? `1.5px solid ${color}` : `1.5px dashed ${PALETTE.inkSoft}55`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative',
              transform: `rotate(${tilt}deg)`,
              boxShadow: color ? `0 4px 12px ${color}55, inset 0 -3px 6px rgba(0,0,0,0.08)` : 'none',
            }}>
              {cell.slug && (
                <div style={{
                  width: '70%', height: '70%', borderRadius: '50%',
                  backgroundImage: `url(/avatars/cozy-cast/avatar-${cell.slug}.png)`,
                  backgroundSize: 'cover', backgroundPosition: 'center',
                  filter: 'url(#avatarGouache)',
                }} />
              )}
              {cell.joker && (
                <div style={{
                  position: 'absolute', top: -6, right: -6,
                  width: 22, height: 22, borderRadius: '50%',
                  background: PALETTE.ochre,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, color: PALETTE.cream,
                  boxShadow: `0 0 12px ${PALETTE.ochre}99`,
                }}>★</div>
              )}
              {cell.stack && (
                <div style={{
                  position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)',
                  fontFamily: F_HAND, fontSize: 14, color: PALETTE.cream,
                  background: PALETTE.charcoal, padding: '0 6px', borderRadius: 4,
                }}>×2</div>
              )}
            </div>
          );
        }))}
      </div>
    </div>
  );
}

// ── Hoodie-Empfehlungen ────────────────────────────────────────────────────
// Konkrete Hex-Pairings fuer die neuen Avatare im Gouache-Stil. Die
// Hoodie-Farbe ist KOMPLEMENTÄR zur Team-Farbe, alle 8 stammen aus der
// gleichen Gouache-Palette → kohärentes Set, jeder Avatar pop't auf seinem
// eigenen Feld klar raus statt zu verschmelzen.
// Final 8 Hoodie-Pairings (2026-04-26): keine Doppelungen, alle aus dem
// gemittelten Aquarell-Sat-Bereich, Pink + Stone-Grey als neue Akzente.
// Reihenfolge: zuerst die 6 vom User validierten Farben, dann die 2 NEUen.
// Hoodie-Pairings — final 2026-04-26 nach Avatar-Lieferung:
// Hoodie = Team-Farbe (eine Identität pro Team). Werte exakt aus den
// avatar-{slug}.png Hoodies extrahiert.
const HOODIE_PAIRINGS: Array<{
  slug: string; label: string; teamColor: string;
  hoodieColor: string; hoodieName: string; reason: string;
}> = [
  { slug: 'capybara',  label: 'Capybara',     teamColor: '#B4B677', hoodieColor: '#B4B677', hoodieName: 'Sage Olive',       reason: 'Hoodie + Cell verschmelzen → braunes Capybara-Gesicht pop\'t' },
  { slug: 'giraffe',   label: 'Giraffe',      teamColor: '#9EA7C8', hoodieColor: '#9EA7C8', hoodieName: 'Periwinkel Blue',  reason: 'Hoodie + Cell verschmelzen → orange-gelber Giraffenhals pop\'t' },
  { slug: 'koala',     label: 'Koala',        teamColor: '#F35357', hoodieColor: '#F35357', hoodieName: 'Coral Red',        reason: 'Hoodie + Cell verschmelzen → graues Koala-Gesicht pop\'t' },
  { slug: 'waschbaer', label: 'Waschbär',     teamColor: '#E9BF53', hoodieColor: '#E9BF53', hoodieName: 'Mustard Yellow',   reason: 'Hoodie + Cell verschmelzen → schwarz-weiße Maske pop\'t' },
  { slug: 'faultier',  label: 'Faultier',     teamColor: '#B79EAC', hoodieColor: '#B79EAC', hoodieName: 'Lavender',         reason: 'Hoodie + Cell verschmelzen → braunes Faultier-Gesicht pop\'t' },
  { slug: 'shiba',     label: 'Hund (Shiba)', teamColor: '#9D9387', hoodieColor: '#9D9387', hoodieName: 'Stone Grey',       reason: 'Hoodie + Cell verschmelzen → goldenes Retriever-Gesicht pop\'t' },
  { slug: 'pinguin',   label: 'Pinguin',      teamColor: '#E99E9D', hoodieColor: '#E99E9D', hoodieName: 'Dusty Rose',       reason: 'Hoodie + Cell verschmelzen → schwarz-weißer Pinguin pop\'t' },
  { slug: 'kuh',       label: 'Kuh',          teamColor: '#D26631', hoodieColor: '#D26631', hoodieName: 'Burnt Orange',     reason: 'Hoodie + Cell verschmelzen → gefleckte Kuh pop\'t' },
];

// Erweiterte Hoodie-Palette — 12 Optionen für Variationen oder zukünftige
// Avatare. Aus dieser Box ziehen wir die finalen 8 oben.
const HOODIE_PALETTE_OPTIONS: Array<{ name: string; hex: string; family: 'cool' | 'warm' | 'neutral' }> = [
  { name: 'Sage green',        hex: '#7A9E7E', family: 'cool' },
  { name: 'Mint teal',         hex: '#88B5AB', family: 'cool' },
  { name: 'Pale sage',         hex: '#B8CDB1', family: 'cool' },
  { name: 'Lavendel',          hex: '#B393D1', family: 'cool' },
  { name: 'Dusty blue',        hex: '#5B85C2', family: 'cool' },
  { name: 'Terracotta',        hex: '#E07A5F', family: 'warm' },
  { name: 'Mustard Ocker',     hex: '#D9A05B', family: 'warm' },
  { name: 'Dusty Rose',        hex: '#CA8FA4', family: 'warm' },
  { name: 'Burnt Sienna',      hex: '#C2785A', family: 'warm' },
  { name: 'Cream / Off-white', hex: '#F2EAD3', family: 'neutral' },
  { name: 'Stone Grey',        hex: '#A89B8E', family: 'neutral' },
  { name: 'Charcoal',          hex: '#2D2A26', family: 'neutral' },
];

// ── Erweiterte Hoodie-Palette ──────────────────────────────────────────────
// 12 Aquarell-Hoodie-Farben gruppiert nach Familie. Aus dieser Box werden
// die finalen 8 Pairings gezogen — falls du ein Pairing tauschen willst,
// hier sind alle Alternativen.
function HoodiePaletteOptionsSection() {
  const groups: Array<{ family: 'cool' | 'warm' | 'neutral'; label: string }> = [
    { family: 'cool',    label: 'Kühle Töne' },
    { family: 'warm',    label: 'Warme Töne' },
    { family: 'neutral', label: 'Neutrale' },
  ];
  return (
    <PaperCard washColor={PALETTE.paper} padding={36} style={{ marginBottom: 40 }}>
      <SectionLabel n="11" title="Erweiterte Hoodie-Palette" sub="12 Aquarell-Töne — daraus werden die finalen 8 gezogen" />
      <div style={{
        marginTop: 28, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20,
      }}>
        {groups.map(g => {
          const colors = HOODIE_PALETTE_OPTIONS.filter(c => c.family === g.family);
          return (
            <div key={g.family}>
              <div style={{
                fontFamily: F_BODY, fontSize: 11, letterSpacing: '0.18em', color: PALETTE.terracotta,
                fontWeight: 700, textTransform: 'uppercase', marginBottom: 10,
              }}>
                {g.label}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {colors.map(c => (
                  <div key={c.hex} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '6px 10px', borderRadius: 10,
                    background: `${PALETTE.cream}88`,
                    border: `1px solid ${PALETTE.charcoal}22`,
                  }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: '50%',
                      background: c.hex,
                      border: `2px solid ${PALETTE.cream}`,
                      boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                      flexShrink: 0,
                      filter: 'url(#paintFrame)',
                    }} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontFamily: F_HAND, fontSize: 18, color: PALETTE.inkDeep, fontWeight: 700, lineHeight: 1 }}>
                        {c.name}
                      </div>
                      <div style={{ fontFamily: 'monospace', fontSize: 11, color: PALETTE.inkSoft, marginTop: 2 }}>
                        {c.hex}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{
        marginTop: 24, padding: '12px 16px', borderRadius: 10,
        background: `${PALETTE.sage}1f`, border: `1.5px solid ${PALETTE.sage}55`,
        fontFamily: F_BODY, fontSize: 13, color: PALETTE.charcoal, lineHeight: 1.55,
      }}>
        <strong style={{ fontFamily: F_HAND, fontSize: 18, color: PALETTE.sage, fontWeight: 700 }}>
          Faustregel
        </strong>
        : Avatare in 8 distinkten Hoodies — nimm aus jeder Familie 2-3 Töne, dann
        sind alle 8 mutuell unterscheidbar. Vermeide ähnlich-helle Töne nebeneinander
        (z.B. Sage + Mint + Pale sage zusammen wird zu „grün" verschmolzen).
      </div>
    </PaperCard>
  );
}

// ── Avatar-Loading-Status ─────────────────────────────────────────────────
// Live-Check: für jedes der 8 erwarteten Gouache-Avatare versuchen wir's
// zu laden. Erscheint im UI als ✓ (vorhanden) oder ⧖ (fehlt). Wenn der
// User jetzt eine PNG in public/avatars/gouache/ legt → bei Page-Refresh
// switcht der Status auf ✓ und das Avatar wird überall in der App benutzt.
function AvatarLoadingStatusSection() {
  const [statuses, setStatuses] = React.useState<Record<string, 'loading' | 'present' | 'missing'>>(() =>
    Object.fromEntries(QQ_AVATARS.map(a => [a.id, 'loading' as const]))
  );

  React.useEffect(() => {
    const checkAll = () => {
      QQ_AVATARS.forEach(a => {
        const img = new Image();
        img.onload  = () => setStatuses(prev => ({ ...prev, [a.id]: 'present' }));
        img.onerror = () => setStatuses(prev => ({ ...prev, [a.id]: 'missing' }));
        img.src = `/avatars/gouache/avatar-${a.slug}.png?t=${Date.now()}`;
      });
    };
    checkAll();
    const interval = setInterval(checkAll, 4000);
    return () => clearInterval(interval);
  }, []);

  const presentCount = Object.values(statuses).filter(s => s === 'present').length;

  return (
    <PaperCard washColor={PALETTE.cream} padding={36} style={{ marginBottom: 40 }}>
      <SectionLabel n="12" title="Avatar-Loading-Status" sub="Live-Check der Gouache-Bilder im public/-Ordner" />

      <div style={{
        marginTop: 24, padding: '14px 18px', borderRadius: 10,
        background: presentCount === 8 ? `${PALETTE.sage}26` : `${PALETTE.terracotta}1a`,
        border: `1.5px solid ${presentCount === 8 ? PALETTE.sage : PALETTE.terracotta}66`,
        fontFamily: F_BODY, fontSize: 14, color: PALETTE.charcoal, lineHeight: 1.55,
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <div style={{ fontFamily: F_HAND, fontSize: 36, color: PALETTE.inkDeep, fontWeight: 700, lineHeight: 1, flexShrink: 0 }}>
          {presentCount} <span style={{ color: PALETTE.inkSoft, fontSize: 22 }}>/ 8</span>
        </div>
        <div style={{ flex: 1 }}>
          {presentCount === 0 && (
            <>
              <strong style={{ fontFamily: F_HAND, fontSize: 22, color: PALETTE.terracotta, display: 'block' }}>
                Noch keine Gouache-Bilder vorhanden
              </strong>
              Die App zeigt aktuell überall die <em>cozy-cast</em>-Variante.
              Sobald du eine Datei in <code style={{ background: PALETTE.paper, padding: '0 6px', borderRadius: 4 }}>frontend/public/avatars/gouache/</code> ablegst,
              wird sie automatisch hier und in allen Gouache-Pages verwendet.
            </>
          )}
          {presentCount > 0 && presentCount < 8 && (
            <>
              <strong style={{ fontFamily: F_HAND, fontSize: 22, color: PALETTE.terracotta, display: 'block' }}>
                {presentCount} von 8 da — fehlen noch {8 - presentCount}
              </strong>
              Vorhandene Avatare werden direkt benutzt, fehlende fallen auf cozy-cast zurück.
              Refresh dieser Page nach jedem Drop, dann switcht der Status.
            </>
          )}
          {presentCount === 8 && (
            <>
              <strong style={{ fontFamily: F_HAND, fontSize: 22, color: PALETTE.sage, display: 'block' }}>
                Alle 8 Gouache-Avatare sind da! 🎉
              </strong>
              Das Quiz wird in jeder Gouache-Page nun ausschließlich die neuen Bilder zeigen.
            </>
          )}
        </div>
      </div>

      {/* Status-Grid: 8 Slots mit Avatar-Vorschau */}
      <div style={{
        marginTop: 24, display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16,
      }}>
        {QQ_AVATARS.map(a => {
          const status = statuses[a.id];
          const present = status === 'present';
          return (
            <div key={a.id} style={{
              padding: 14, borderRadius: 14,
              background: present ? `${PALETTE.sage}1a` : `${PALETTE.paper}aa`,
              border: `2px solid ${present ? PALETTE.sage : PALETTE.charcoal + '22'}`,
              filter: 'url(#watercolorEdge)',
              textAlign: 'center',
            }}>
              <div style={{ position: 'relative', width: 96, height: 96, margin: '0 auto' }}>
                <div style={{
                  width: '100%', height: '100%', borderRadius: '50%',
                  border: `3px solid ${a.color}`,
                  background: PALETTE.cream,
                  backgroundImage: present
                    ? `url(/avatars/gouache/avatar-${a.slug}.png)`
                    : `url(/avatars/cozy-cast/avatar-${a.slug}.png)`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  filter: present ? undefined : 'url(#avatarGouache) opacity(0.55)',
                }} />
                <div style={{
                  position: 'absolute', top: -4, right: -4,
                  width: 28, height: 28, borderRadius: '50%',
                  background: present ? PALETTE.sage : PALETTE.terracotta,
                  color: PALETTE.cream,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, fontWeight: 700, fontFamily: F_BODY,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                }}>
                  {present ? '✓' : '⧖'}
                </div>
              </div>
              <div style={{ fontFamily: F_HAND, fontSize: 22, color: PALETTE.inkDeep, fontWeight: 700, marginTop: 8 }}>
                {a.label}
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: 10, color: PALETTE.inkSoft, marginTop: 2 }}>
                avatar-{a.slug}.png
              </div>
              <div style={{
                fontFamily: F_BODY, fontSize: 10, color: present ? PALETTE.sage : PALETTE.terracotta,
                fontWeight: 700, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.08em',
              }}>
                {present ? 'gouache live' : 'fallback cozy-cast'}
              </div>
            </div>
          );
        })}
      </div>
    </PaperCard>
  );
}

function HoodieRecommendationSection() {
  return (
    <PaperCard washColor={PALETTE.cream} padding={36} style={{ marginBottom: 40 }}>
      <SectionLabel n="13" title="Hoodie-Farben" sub="Final 8 · Team-Farbe ist das Feld · Hoodie ist der Avatar-Pop dagegen" />

      <div style={{
        marginTop: 24, padding: '14px 18px', borderRadius: 10,
        background: `${PALETTE.sage}1f`, border: `1.5px solid ${PALETTE.sage}55`,
        fontFamily: F_BODY, fontSize: 14, color: PALETTE.charcoal, lineHeight: 1.55,
      }}>
        <strong style={{ fontFamily: F_HAND, fontSize: 22, color: PALETTE.sage, fontWeight: 700, display: 'block', marginBottom: 4 }}>
          Prinzip
        </strong>
        Der <em>Cell-Color</em> auf dem Grid ist die saturierte Team-Farbe — die bleibt, weil das Spiel
        damit funktioniert (8 Teams müssen visuell trennbar sein). Der <em>Hoodie</em> sollte komplementär
        zur Team-Farbe sein, sonst verschwindet der Avatar auf seinem eigenen Feld. Alle 8 Hoodie-Farben
        stammen aus der Gouache-Palette → die Avatare sehen als Set kohärent aus.
      </div>

      {/* Pairing-Cards: Team-Color + Hoodie-Color + Demo-Avatar auf Feld */}
      <div style={{
        marginTop: 28, display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16,
      }}>
        {HOODIE_PAIRINGS.map(p => (
          <div key={p.slug} style={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr',
            gap: 14,
            padding: 14, borderRadius: 14,
            background: `${PALETTE.paper}aa`,
            border: `1.5px solid ${PALETTE.charcoal}22`,
            filter: 'url(#watercolorEdge)',
          }}>
            {/* Demo-Cell: Avatar auf Team-Color-Feld (so wie's auf dem Grid aussieht) */}
            <div style={{
              width: 96, height: 96, borderRadius: 14,
              background: `radial-gradient(circle at 30% 30%, ${p.teamColor}cc, ${p.teamColor}99 60%, ${p.teamColor}66 100%)`,
              border: `2px solid ${p.teamColor}`,
              boxShadow: `0 4px 12px ${p.teamColor}55, inset 0 -3px 6px rgba(0,0,0,0.1)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {/* Mini-Hoodie-Repräsentation: Kreis im Hoodie-Color, Tier-Emoji obendrauf */}
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: p.hoodieColor,
                border: `2.5px solid ${PALETTE.cream}`,
                boxShadow: `0 4px 10px rgba(0,0,0,0.25)`,
                position: 'relative', overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute', inset: 0,
                  backgroundImage: `url(/avatars/cozy-cast/avatar-${p.slug}.png)`,
                  backgroundSize: '125% 125%',
                  backgroundPosition: 'center 15%',
                  filter: 'url(#avatarGouache)',
                  mixBlendMode: 'multiply',
                  opacity: 0.7,
                }} />
              </div>
            </div>

            {/* Info-Spalte */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
              <div style={{
                fontFamily: F_HAND, fontSize: 26, color: PALETTE.inkDeep, fontWeight: 700, lineHeight: 1,
              }}>
                {p.label}
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 }}>
                <span style={{
                  width: 14, height: 14, borderRadius: 4, background: p.teamColor,
                  border: `1px solid ${PALETTE.charcoal}33`,
                }} />
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: PALETTE.inkSoft }}>
                  Feld {p.teamColor}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{
                  width: 14, height: 14, borderRadius: 4, background: p.hoodieColor,
                  border: `1px solid ${PALETTE.charcoal}33`,
                }} />
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: PALETTE.inkDeep, fontWeight: 700 }}>
                  Hoodie {p.hoodieColor}
                </span>
                <span style={{ fontFamily: F_BODY, fontSize: 11, color: PALETTE.terracotta, fontStyle: 'italic' }}>
                  · {p.hoodieName}
                </span>
              </div>
              <div style={{ fontFamily: F_BODY, fontSize: 12, color: PALETTE.charcoal, opacity: 0.78, marginTop: 4, lineHeight: 1.4 }}>
                {p.reason}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Test-Strip: alle 8 Hoodies nebeneinander auf einem Demo-Grid-Streifen */}
      <div style={{ marginTop: 32 }}>
        <div style={{ fontFamily: F_HAND, fontSize: 22, color: PALETTE.inkDeep, fontWeight: 700, marginBottom: 10 }}>
          Test: Alle 8 Hoodies auf ihrem Team-Feld
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6,
          padding: 12, borderRadius: 12,
          background: `${PALETTE.inkSoft}33`,
          border: `1.5px solid ${PALETTE.inkSoft}55`,
        }}>
          {HOODIE_PAIRINGS.map(p => (
            <div key={p.slug} style={{
              aspectRatio: '1', borderRadius: 8,
              background: `radial-gradient(circle at 30% 30%, ${p.teamColor}cc, ${p.teamColor}99 60%, ${p.teamColor}66 100%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `1.5px solid ${p.teamColor}`,
            }}>
              <div style={{
                width: '70%', height: '70%', borderRadius: '50%',
                background: p.hoodieColor,
                border: `2px solid ${PALETTE.cream}`,
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
              }} />
            </div>
          ))}
        </div>
        <div style={{ fontFamily: F_BODY, fontSize: 12, color: PALETTE.inkSoft, marginTop: 8, fontStyle: 'italic', textAlign: 'center' }}>
          Jeder Hoodie pop't klar gegen sein Feld — keine Verschmelzung, alle 8 distinkt
        </div>
      </div>

      {/* Cross-Test: Hoodie auf FREMDEN Feldern (für Klau-Phase / Zwischenbild) */}
      <div style={{ marginTop: 28 }}>
        <div style={{ fontFamily: F_HAND, fontSize: 22, color: PALETTE.inkDeep, fontWeight: 700, marginBottom: 10 }}>
          Cross-Check: Hoodie auf fremden Feldern (Klau-Phase)
        </div>
        <div style={{ overflow: 'auto' }}>
          <table style={{ borderCollapse: 'separate', borderSpacing: 4, fontFamily: F_BODY, fontSize: 11, color: PALETTE.charcoal }}>
            <thead>
              <tr>
                <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 700, fontFamily: F_HAND, fontSize: 14, color: PALETTE.inkDeep }}>
                  Hoodie ↓ / Feld →
                </th>
                {HOODIE_PAIRINGS.map(p => (
                  <th key={p.slug} style={{
                    width: 36, height: 24, padding: 0,
                    background: p.teamColor, borderRadius: 4,
                    fontSize: 9, color: '#fff', fontWeight: 700, textAlign: 'center',
                  }}>
                    {p.label.split(' ')[0].slice(0, 4)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HOODIE_PAIRINGS.map(h => (
                <tr key={h.slug}>
                  <td style={{ padding: '4px 8px', fontFamily: F_HAND, fontSize: 14, fontWeight: 700, color: PALETTE.inkDeep, whiteSpace: 'nowrap' }}>
                    {h.label.split(' ')[0]} <span style={{ fontFamily: 'monospace', fontSize: 9, color: PALETTE.inkSoft }}>{h.hoodieColor}</span>
                  </td>
                  {HOODIE_PAIRINGS.map(c => (
                    <td key={c.slug} style={{
                      width: 36, height: 36, padding: 0, borderRadius: 4,
                      background: c.teamColor,
                    }}>
                      <div style={{
                        width: '100%', height: '100%', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <div style={{
                          width: 22, height: 22, borderRadius: '50%',
                          background: h.hoodieColor,
                          border: `1.5px solid ${PALETTE.cream}`,
                          boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                        }} />
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ fontFamily: F_BODY, fontSize: 12, color: PALETTE.inkSoft, marginTop: 8, fontStyle: 'italic' }}>
          Diagonale = eigenes Feld (sollte am stärksten poppen). Andere Zellen = Klau-Szenarien.
          Falls du irgendwo eine Verschmelzung siehst, ist das Pairing zu nah — sag Bescheid.
        </div>
      </div>
    </PaperCard>
  );
}

// ── Verdict-Section ────────────────────────────────────────────────────────
function VerdictSection() {
  return (
    <PaperCard washColor={PALETTE.cream} padding={36} style={{ marginBottom: 40 }}>
      <SectionLabel n="14" title="Ehrliches Verdict" sub="Was geht, was wird haarig, was sollte hybrid bleiben" />
      <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
        <VerdictCard
          icon="✓"
          color={PALETTE.sage}
          title="Sofort machbar"
          items={[
            'Komplette Farbpalette + Tokens',
            'Paper-Grain via SVG-Filter',
            'Caveat / Lora als Fonts',
            'Wobble-Borders auf Cards',
            'Aquarell-Wash-Backgrounds',
            'Soft-Pill-Buttons',
            'Hand-gemalte Hügel/Mond/Vögel als SVG',
          ]}
        />
        <VerdictCard
          icon="!"
          color={PALETTE.ochre}
          title="Braucht Custom-Art"
          items={[
            '8 Avatare neu illustrieren',
            'Hero-Illustrationen pro Game-Phase',
            'Kategorie-Header-Illustrationen',
            'Gemalte Hot-Air-Balloon-Asset (statt Three.js)',
            'Wenn DIY: Midjourney/DALL-E in 2-3h erledigt',
          ]}
        />
        <VerdictCard
          icon="✕"
          color={PALETTE.terracotta}
          title="Hybrid behalten"
          items={[
            '3D-Grid (Three.js → scharf, nicht malerisch)',
            'Slam-Down + Comeback-Animations',
            'Moderator-Page mit Buttons-Density',
            'Score-Bar Live-Updates',
          ]}
        />
      </div>
    </PaperCard>
  );
}

function VerdictCard({ icon, color, title, items }: { icon: string; color: string; title: string; items: string[] }) {
  return (
    <div style={{
      padding: 20, borderRadius: 14,
      background: `${color}12`,
      border: `2px solid ${color}66`,
      filter: 'url(#watercolorEdge)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: color, color: PALETTE.cream,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, fontWeight: 700, fontFamily: F_BODY,
        }}>{icon}</div>
        <div style={{ fontFamily: F_HAND, fontSize: 28, color, fontWeight: 700 }}>{title}</div>
      </div>
      <ul style={{ margin: 0, paddingLeft: 20, fontFamily: F_BODY, fontSize: 14, color: PALETTE.charcoal, lineHeight: 1.65 }}>
        {items.map((it, i) => <li key={i}>{it}</li>)}
      </ul>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function QQGouachePage() {
  const fontsReady = usePaintFonts();

  return (
    <div style={{
      minHeight: '100vh',
      background: PALETTE.paper,
      backgroundImage: PAPER_BG,
      padding: '48px 28px 80px',
      fontFamily: F_BODY,
      opacity: fontsReady ? 1 : 0.95,
      transition: 'opacity 0.4s ease',
    }}>
      <PaintedKeyframes />
      <GouacheFilters />

      <div style={{ maxWidth: 1320, margin: '0 auto' }}>
        <HeaderSection />
        <PaletteSection />
        <TypographySection />
        <BeamerWelcomeMockup />
        <BeamerQuestionMockup />
        <BeamerRevealMockup />
        <GridMockup />
        <TeamPageMockup />
        <GameOverMockup />
        <AvatarStudyMockup />
        <SoftTeamColorsSection />
        <HoodiePaletteOptionsSection />
        <AvatarLoadingStatusSection />
        <HoodieRecommendationSection />
        <VerdictSection />

        <div style={{
          textAlign: 'center', marginTop: 40,
          fontFamily: F_HAND, fontSize: 28, color: PALETTE.inkDeep,
        }}>
          <span style={{ fontStyle: 'italic' }}>— gemalt mit Code —</span>
        </div>
      </div>
    </div>
  );
}
