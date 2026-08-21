import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MyQuizzesHub } from '../components/MyQuizzesHub';

type Item = { path: string; label: string; icon: string; note: string };
const live: Item[] = [
  { path: '/moderator', label: 'Moderator', icon: '🎙️', note: 'Den Abend steuern' },
  { path: '/beamer', label: 'Beamer', icon: '📽️', note: 'Die Bühne öffnen' },
  { path: '/qrcode', label: 'Beitritts-QR', icon: '🔳', note: 'Teams verbinden' },
  { path: '/mopo', label: 'MoPo', icon: '📱', note: 'Mobile Moderation' },
];
const review: Item[] = [
  { path: '/stats', label: 'Spiele & Recaps', icon: '📊', note: 'Vergangene Abende auswerten' },
  { path: '/feedback', label: 'Feedback', icon: '📋', note: 'Rückmeldungen sichten' },
];
function Card({ item, accent = '#f9a8d4', primary = false }: { item: Item; accent?: string; primary?: boolean }) {
  return <Link className="qq-menu-card" to={item.path} style={{
    minHeight: 118, padding: 18, borderRadius: 20, textDecoration: 'none', color: 'inherit',
    display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 12,
    background: primary ? `${accent}28` : 'rgba(255,255,255,.055)', border: `1px solid ${primary ? `${accent}88` : 'rgba(255,255,255,.11)'}`,
  }}><span aria-hidden style={{ fontSize: 25 }}>{item.icon}</span><span><strong style={{ display: 'block', color: '#fff7fb', fontSize: 15 }}>{item.label}</strong><small style={{ display: 'block', color: '#c5b5c1', fontWeight: 700, marginTop: 5 }}>{item.note}</small></span></Link>;
}

function Intro({ onDismiss }: { onDismiss: () => void }) {
  return <div className="qq-intro"><div className="qq-intro-bg" /><div className="qq-intro-content"><img src="/avatars/cozywolf/augenauf.mundauf.winken.webp" alt="CozyWolf" /><strong>CozyWolf</strong></div><button type="button" onClick={onDismiss}>Überspringen</button></div>;
}

export default function MenuPage() {
  const { pathname } = useLocation();
  const section = pathname.split('/')[2];
  const [intro, setIntro] = useState(() => {
    try { return !window.matchMedia('(prefers-reduced-motion: reduce)').matches && (new URLSearchParams(window.location.search).has('intro') || sessionStorage.getItem('cozywolf-intro-seen') !== '1'); } catch { return false; }
  });
  const dismiss = () => { try { sessionStorage.setItem('cozywolf-intro-seen', '1'); } catch { /* ignore */ } setIntro(false); };
  useEffect(() => { if (!intro) return; const timer = window.setTimeout(dismiss, 2450); return () => window.clearTimeout(timer); }, [intro]);
  const mainCards: Array<Item & { accent: string; primary?: boolean }> = [
    { path: '/menu/spielabend', label: 'Spielabend', icon: '🎬', note: 'Moderator, Beamer, QR', accent: '#60a5fa' },
    { path: '/menu/quizze', label: 'Meine Quizze', icon: '🎯', note: 'Starten und bearbeiten', accent: '#ec4899', primary: true },
    { path: '/builder', label: 'Neues Quiz', icon: '＋', note: 'Fragen anlegen', accent: '#ec4899', primary: true },
    { path: '/library', label: 'Bibliothek', icon: '📚', note: 'Fragenpool', accent: '#f472b6' },
    { path: '/cozygames', label: 'CozyGames', icon: '🎲', note: 'Mini-Spiele verwalten', accent: '#f472b6' },
    { path: '/host-sheets', label: 'Host-Sheets', icon: '🎙️', note: 'Spickzettel drucken', accent: '#f472b6' },
    { path: '/menu/rueckblick', label: 'Rückblick', icon: '📊', note: 'Recaps und Feedback', accent: '#a78bfa' },
    { path: '/moderator-test', label: 'Moderator-Test', icon: '🧪', note: 'Ablauf und Design testen', accent: '#a78bfa' },
  ];
  const sectionMeta: Record<string, { title: string; description: string; items: Item[] }> = {
    spielabend: { title: 'Spielabend', description: 'Öffne genau die Ansicht, die du für den laufenden Abend brauchst.', items: live },
    rueckblick: { title: 'Rückblick', description: 'Spiele, Detail-Recaps und Rückmeldungen an einem Ort.', items: review },
  };
  const activeSection = section ? sectionMeta[section] : undefined;
  return <div className="qq-menu-page">
    <style>{`
      .qq-menu-page{min-height:100dvh;background:radial-gradient(circle at 18% -12%,#35112f 0%,#160d23 33%,#090b15 76%);color:#e2e8f0;font-family:var(--font)}
      .qq-menu-head{display:flex;align-items:center;gap:16px;padding:14px clamp(20px,4vw,48px);border-bottom:1px solid rgba(255,255,255,.1);background:rgba(8,6,17,.72);backdrop-filter:blur(18px)}
      .qq-menu-head img{width:44px;height:44px;border-radius:13px;object-fit:contain}.qq-menu-head strong{display:block;color:#fff7fb;font-size:18px}.qq-menu-head small{color:#c084a5;font-weight:800;letter-spacing:.12em;text-transform:uppercase}
      .qq-menu-main{max-width:1120px;margin:0 auto;padding:42px 28px 72px;outline:none}.qq-menu-main h1{margin:0 0 8px;color:#fff7fb;font-size:28px}.qq-menu-main>p{margin:0 0 24px;color:#c5b5c1;font-size:15px;font-weight:700}
      .qq-menu-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}.qq-menu-link-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px}
      @media(min-width:721px){.qq-menu-main>.qq-menu-grid{min-height:clamp(430px,calc(100dvh - 210px),620px);grid-auto-rows:minmax(0,1fr)}.qq-menu-main>.qq-menu-grid .qq-menu-card{min-height:0!important}}
      .qq-menu-card{transition:transform .16s ease,border-color .16s ease,background .16s ease}.qq-menu-card:hover{transform:translateY(-2px);border-color:rgba(251,207,232,.48)!important;background:rgba(255,255,255,.075)!important}.qq-menu-card:active{transform:scale(.98)}
      .qq-menu-card:focus-visible,.qq-menu-back:focus-visible,.qq-intro button:focus-visible{outline:3px solid #f9a8d4;outline-offset:3px}
      .qq-menu-back{display:inline-flex;margin-bottom:24px;padding:10px 13px;border-radius:11px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);color:#fce7f3;font-size:14px;font-weight:900;text-decoration:none}
      .qq-intro{position:fixed;inset:0;z-index:10000;display:grid;place-items:center;background:#130b21;overflow:hidden}.qq-intro-bg{position:absolute;inset:-4%;background:linear-gradient(90deg,rgba(9,6,18,.58),rgba(9,6,18,.10)),url('/images/quiz-lounge-host-bg.png') center/cover;animation:qqintro 2.32s both}.qq-intro-content{position:relative;display:grid;justify-items:center}.qq-intro-content img{width:230px;height:230px;object-fit:contain;filter:drop-shadow(0 20px 30px rgba(236,72,153,.42));animation:qqwolf 2.32s both}.qq-intro-content strong{margin-top:-28px;color:#fff7fb;font-size:42px;animation:qqword 2.32s both}.qq-intro button{position:absolute;right:22px;bottom:20px;padding:9px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.05);color:#eadbe7;font:inherit;font-size:12px;font-weight:800;cursor:pointer}
      @keyframes qqintro{0%{opacity:0;transform:scale(1.09)}30%,76%{opacity:.76;transform:scale(1)}100%{opacity:0;transform:scale(1.02)}}@keyframes qqwolf{0%,13%{opacity:0;transform:translateY(70px) scale(.72)}37%{opacity:1;transform:translateY(-8px) scale(1.04)}48%,76%{opacity:1;transform:translateY(0) scale(1)}100%{opacity:0;transform:translateY(-20px) scale(.98)}}@keyframes qqword{0%,27%{opacity:0;transform:translateY(14px)}47%,77%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-7px)}}
      @media(max-width:720px){.qq-menu-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:460px){.qq-menu-grid{grid-template-columns:1fr}}@media(prefers-reduced-motion:reduce){.qq-menu-card{transition:none}.qq-menu-card:hover{transform:none}.qq-intro-bg,.qq-intro-content img,.qq-intro-content strong{animation:none}}@media(forced-colors:active){.qq-menu-card,.qq-menu-back,.qq-intro button{border:2px solid ButtonText}}
    `}</style>
    {intro && <Intro onDismiss={dismiss} />}
    <header className="qq-menu-head"><img src="/logo.png" alt="CozyQuiz" /><div><strong>CozyQuiz</strong><small>Regiepult</small></div></header>
    <main id="main" tabIndex={-1} className="qq-menu-main">
      {section ? <><Link to="/" className="qq-menu-back">← Zum Menü</Link>{section === 'quizze' ? <MyQuizzesHub standalone /> : activeSection ? <><h1>{activeSection.title}</h1><p>{activeSection.description}</p><div className={section === 'spielabend' ? 'qq-menu-grid' : 'qq-menu-link-grid'}>{activeSection.items.map(item => <Card key={item.path} item={item} accent={section === 'spielabend' ? '#60a5fa' : undefined} primary={item.path === '/moderator'} />)}</div></> : <><h1>Menü</h1><p>Dieser Bereich existiert nicht.</p></>}</> : <div className="qq-menu-grid">{mainCards.map(item => <Card key={item.path} item={item} accent={item.accent} primary={item.primary} />)}</div>}
    </main>
  </div>;
}
