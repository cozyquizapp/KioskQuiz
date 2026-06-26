// QQDemoShowcase — synchrone Beamer + Handy-Demo für die Landing (Wolf 2026-06-26).
// Zeigt „so läuft eine Runde" auf dem großen Screen UND dem eigenen Handy,
// im echten Quiz-Design, aber mit gescripteten Mock-/Bot-Daten (kein Backend).
// Ein Beat-Timer schaltet beide Geräte synchron durch 4 Szenen + loopt.
import { useEffect, useState, type CSSProperties } from 'react';
import { cozy3dSrc } from '../cozy3dAvatars';
import { QQ_TEAM_PALETTE } from '../../../shared/quarterQuizTypes';

const COZY_BG = 'radial-gradient(circle at 50% 0%, #1E2A5A 0%, #0F1530 60%, #0A0E22 100%)';
const MUCHO = { accent: '#60A5FA', badge: 'linear-gradient(135deg,#1E3A8A,#2563EB)', glow: 'rgba(37,99,235,0.45)' };

const TEAMS = [
  { name: 'Füchse', slug: 'fuchs', color: QQ_TEAM_PALETTE[0] },
  { name: 'Eulen',  slug: 'eule',  color: QQ_TEAM_PALETTE[2] },
  { name: 'Katzen', slug: 'katze', color: QQ_TEAM_PALETTE[4] },
  { name: 'Bären',  slug: 'baer',  color: QQ_TEAM_PALETTE[3] },
];
const ME = TEAMS[0];
const OPTIONS = ['Hamburg', 'Venedig', 'Amsterdam', 'Berlin'];
const CORRECT = 0;
const QUESTION = 'Welche Stadt hat die meisten Brücken?';

const N_BEATS = 4;
const BEAT_MS = 5200;

// 5×5-Mock-Brett: Owner-Index je Zelle (-1 = leer). Cluster pro Team.
const BOARD: number[][] = [
  [0, 0, -1, 1, 1],
  [0, 0, -1, 1, -1],
  [-1, -1, 2, -1, 3],
  [2, 2, 2, 3, 3],
  [-1, 2, -1, 3, -1],
];

const Avatar = ({ slug, size, ring }: { slug: string; size: number | string; ring?: string }) => (
  <span style={{
    width: size, height: size, borderRadius: '50%', flexShrink: 0, display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    background: ring ? `radial-gradient(circle at 50% 35%, ${ring}, ${ring}cc)` : 'transparent',
    boxShadow: ring ? `0 2px 10px ${ring}66` : 'none',
  }}>
    <img src={cozy3dSrc(slug)} alt="" draggable={false}
      style={{ width: '88%', height: '88%', objectFit: 'contain', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.35))' }} />
  </span>
);

export function QQDemoShowcase() {
  const [beat, setBeat] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setBeat(b => (b + 1) % N_BEATS), BEAT_MS);
    return () => clearInterval(t);
  }, [paused]);

  return (
    <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, width: '100%' }}>
      <div style={{ fontSize: 'clamp(15px, 1.9vw, 19px)', color: '#cbd5e1', fontWeight: 700, textAlign: 'center' }}>
        👀 So läuft eine Runde — großer Screen <span style={{ color: '#64748b' }}>+</span> dein Handy
      </div>

      <div
        onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
        style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(16px, 3vw, 36px)', justifyContent: 'center', alignItems: 'center', width: '100%' }}
      >
        {/* ── Beamer / TV (16:9) ── */}
        <figure style={{ margin: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 'min(90vw, 540px)', aspectRatio: '16 / 9', borderRadius: 16, overflow: 'hidden',
            background: COZY_BG, border: '3px solid #11162b',
            boxShadow: '0 24px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05) inset',
            position: 'relative', containerType: 'size',
          }}>
            <BeamerScene beat={beat} />
          </div>
          <figcaption style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700 }}>📺 Beamer / TV</figcaption>
        </figure>

        {/* ── Handy (9:16) ── */}
        <figure style={{ margin: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{
            height: 'min(58vh, 312px)', aspectRatio: '9 / 16', borderRadius: 30, padding: 7,
            background: 'linear-gradient(160deg,#1b2030,#0b0e18)', border: '2px solid rgba(255,255,255,0.10)',
            boxShadow: '0 24px 60px rgba(0,0,0,0.55)', position: 'relative',
          }}>
            <div style={{ width: '100%', height: '100%', borderRadius: 24, overflow: 'hidden', background: COZY_BG, position: 'relative', containerType: 'size' }}>
              <PhoneScene beat={beat} />
            </div>
          </div>
          <figcaption style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700 }}>📱 Dein Handy</figcaption>
        </figure>
      </div>

      {/* Beat-Punkte */}
      <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
        {Array.from({ length: N_BEATS }).map((_, i) => (
          <button key={i} aria-label={`Szene ${i + 1}`} onClick={() => setBeat(i)} style={{
            width: i === beat ? 22 : 8, height: 8, borderRadius: 99, border: 0, cursor: 'pointer',
            background: i === beat ? '#F59E0B' : 'rgba(148,163,184,0.4)', transition: 'all 0.3s ease', padding: 0,
          }} />
        ))}
      </div>
    </section>
  );
}

// ── Beamer-Szenen ───────────────────────────────────────────────────────────
function BeamerScene({ beat }: { beat: number }) {
  const pad: CSSProperties = { position: 'absolute', inset: 0, padding: '5%', display: 'flex', flexDirection: 'column', color: '#fff', fontFamily: "'Bricolage Grotesque','Inter',sans-serif" };
  if (beat === 0) {
    return (
      <div key="b0" style={{ ...pad, alignItems: 'center', justifyContent: 'center', gap: '4%', animation: 'demoIn 0.5s ease both' }}>
        <div style={{ fontSize: 'clamp(16px,3.6cqw,30px)', fontWeight: 900 }}>Willkommen bei <span style={{ color: '#F59E0B' }}>CozyQuiz</span></div>
        <div style={{ fontSize: 'clamp(9px,1.9cqw,14px)', color: '#cbd5e1', fontWeight: 600 }}>Scannt den QR-Code mit dem Handy</div>
        <div style={{ display: 'flex', gap: '3%', marginTop: '2%' }}>
          {TEAMS.map((t, i) => (
            <div key={t.slug} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, animation: `demoPop 0.45s var(--qq-ease-bounce, cubic-bezier(0.2,1.2,0.3,1)) ${0.1 + i * 0.12}s both` }}>
              <Avatar slug={t.slug} size="clamp(34px,7cqw,58px)" ring={t.color} />
              <span style={{ fontSize: 'clamp(8px,1.5cqw,12px)', fontWeight: 800 }}>{t.name}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (beat === 1) {
    return (
      <div key="b1" style={{ ...pad, gap: '3%', animation: 'demoIn 0.5s ease both' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ padding: '4px 12px', borderRadius: 99, background: MUCHO.badge, fontWeight: 900, fontSize: 'clamp(9px,1.8cqw,14px)', boxShadow: `0 0 18px ${MUCHO.glow}` }}>Mu-Cho</span>
          <span style={{ marginLeft: 'auto', fontSize: 'clamp(13px,2.6cqw,22px)', fontWeight: 900, color: MUCHO.accent }}>0:08</span>
        </div>
        <div style={{ fontSize: 'clamp(13px,2.7cqw,22px)', fontWeight: 800, lineHeight: 1.15 }}>{QUESTION}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3%', marginTop: 'auto' }}>
          {OPTIONS.map((o, i) => (
            <div key={o} style={{
              padding: '6% 4%', borderRadius: 12, fontWeight: 800, fontSize: 'clamp(9px,1.9cqw,15px)',
              background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.12)',
              animation: `demoPop 0.4s ease ${0.08 * i}s both`,
            }}>{String.fromCharCode(65 + i)} · {o}</div>
          ))}
        </div>
      </div>
    );
  }
  if (beat === 2) {
    return (
      <div key="b2" style={{ ...pad, flexDirection: 'row', gap: '5%', alignItems: 'center', animation: 'demoIn 0.5s ease both' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6%' }}>
          <div style={{ fontSize: 'clamp(14px,2.8cqw,24px)', fontWeight: 900, color: '#34D399' }}>✓ Richtig!</div>
          <div style={{ fontSize: 'clamp(11px,2.2cqw,18px)', fontWeight: 800 }}>Hamburg<span style={{ color: '#94a3b8', fontWeight: 600 }}> — über 2 500 Brücken</span></div>
          <div style={{ fontSize: 'clamp(8px,1.7cqw,13px)', color: '#cbd5e1', fontWeight: 600 }}>Richtige Teams erobern ein Feld →</div>
        </div>
        <MiniBoard reveal />
      </div>
    );
  }
  return (
    <div key="b3" style={{ ...pad, alignItems: 'center', justifyContent: 'center', gap: '3%', animation: 'demoIn 0.5s ease both' }}>
      <div style={{ fontSize: 'clamp(22px,5cqw,44px)' }}>🏆</div>
      <div style={{ position: 'relative' }}>
        <span aria-hidden style={{ position: 'absolute', top: '-46%', left: '50%', transform: 'translateX(-50%)', fontSize: 'clamp(16px,3.4cqw,28px)' }}>👑</span>
        <Avatar slug={ME.slug} size="clamp(44px,9cqw,76px)" ring={ME.color} />
      </div>
      <div style={{ fontSize: 'clamp(13px,2.6cqw,22px)', fontWeight: 900 }}>Sieger: {ME.name}</div>
    </div>
  );
}

// ── Handy-Szenen (aus Sicht „meines" Teams) ─────────────────────────────────
function PhoneScene({ beat }: { beat: number }) {
  const wrap: CSSProperties = { position: 'absolute', inset: 0, padding: '8% 7%', display: 'flex', flexDirection: 'column', color: '#fff', fontFamily: "'Nunito','Inter',sans-serif" };
  if (beat === 0) {
    return (
      <div key="p0" style={{ ...wrap, alignItems: 'center', justifyContent: 'center', gap: '5%', animation: 'demoIn 0.5s ease both' }}>
        <Avatar slug={ME.slug} size="44%" ring={ME.color} />
        <div style={{ fontSize: 'clamp(13px,5.5cqw,18px)', fontWeight: 900 }}>Du bist dabei!</div>
        <div style={{ fontSize: 'clamp(10px,4cqw,13px)', color: '#cbd5e1', fontWeight: 700 }}>Team {ME.name}</div>
      </div>
    );
  }
  if (beat === 1) {
    return (
      <div key="p1" style={{ ...wrap, gap: '4%', animation: 'demoIn 0.5s ease both' }}>
        <div style={{ fontSize: 'clamp(10px,4.2cqw,14px)', fontWeight: 800, color: MUCHO.accent }}>Mu-Cho · tippt eure Antwort</div>
        <div style={{ fontSize: 'clamp(11px,4.6cqw,15px)', fontWeight: 800, lineHeight: 1.2 }}>{QUESTION}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4%', marginTop: '2%' }}>
          {OPTIONS.map((o, i) => {
            const sel = i === CORRECT;
            return (
              <div key={o} style={{
                padding: '11% 8%', borderRadius: 12, fontWeight: 800, fontSize: 'clamp(10px,4.2cqw,14px)',
                background: sel ? `${ME.color}33` : 'rgba(255,255,255,0.06)',
                border: `2px solid ${sel ? ME.color : 'rgba(255,255,255,0.12)'}`,
                boxShadow: sel ? `0 0 16px ${ME.color}55` : 'none',
              }}>{String.fromCharCode(65 + i)} · {o}</div>
            );
          })}
        </div>
      </div>
    );
  }
  if (beat === 2) {
    return (
      <div key="p2" style={{ ...wrap, alignItems: 'center', justifyContent: 'center', gap: '6%', animation: 'demoIn 0.5s ease both' }}>
        <div style={{ width: '46%', aspectRatio: '1', borderRadius: '50%', background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'clamp(22px,11cqw,40px)', boxShadow: '0 0 30px rgba(34,197,94,0.5)', animation: 'demoPop 0.5s var(--qq-ease-bounce, cubic-bezier(0.2,1.2,0.3,1)) both' }}>✓</div>
        <div style={{ fontSize: 'clamp(12px,5cqw,16px)', fontWeight: 900 }}>Richtig!</div>
        <div style={{ fontSize: 'clamp(10px,4cqw,13px)', color: '#cbd5e1', fontWeight: 700 }}>+1 Feld auf dem Brett</div>
      </div>
    );
  }
  return (
    <div key="p3" style={{ ...wrap, alignItems: 'center', justifyContent: 'center', gap: '5%', animation: 'demoIn 0.5s ease both' }}>
      <div style={{ fontSize: 'clamp(28px,13cqw,48px)' }}>🏆</div>
      <div style={{ fontSize: 'clamp(13px,5.5cqw,18px)', fontWeight: 900 }}>Stark gespielt!</div>
      <div style={{ fontSize: 'clamp(11px,4.4cqw,14px)', color: ME.color, fontWeight: 900 }}>Platz 1 · {ME.name}</div>
    </div>
  );
}

// Faithful Mini-Brett (5×5, Team-Farben + Avatare auf eroberten Feldern).
function MiniBoard({ reveal }: { reveal?: boolean }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '3%', width: '46%', aspectRatio: '1' }}>
      {BOARD.flat().map((owner, idx) => {
        const t = owner >= 0 ? TEAMS[owner] : null;
        return (
          <div key={idx} style={{
            borderRadius: 5, aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: t ? t.color : 'rgba(255,255,255,0.05)',
            border: t ? `1px solid ${t.color}` : '1px solid rgba(255,255,255,0.08)',
            boxShadow: t ? `0 0 8px ${t.color}55` : 'none',
            animation: reveal ? `demoPop 0.4s ease ${0.03 * idx}s both` : undefined,
          }}>
            {t && <img src={cozy3dSrc(t.slug)} alt="" draggable={false} style={{ width: '82%', height: '82%', objectFit: 'contain' }} />}
          </div>
        );
      })}
    </div>
  );
}
