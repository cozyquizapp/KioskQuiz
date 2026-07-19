// ── QQ Setup-Flow (geführter Abend-Start-Wizard) ─────────────────────────────
// 2026-07-19 (Wolf 'Format-Wahl wird zum Wizard, ersetzt das Panel'): Statt aller
// Setup-Einstellungen gleichzeitig in einem Panel führt EIN Wizard Folie für Folie
// durch alles, was ein Quizabend zum Starten braucht — von oben nach unten:
//   1 Format · 2 Look (mit Vorschau) · 3 Fragensatz · 4 Runden & Ablauf
//   5 Timer & Sprache · 6 Extras · 7 Bereit → Cockpit (Teams + Start)
// Die Schritt-Kopfzeile ist klickbar (Tabs) → später ist ein Timer-Tweak 1 Klick,
// nicht 7. Danger-/Wartungs-Sachen (Bestenliste leeren, Custom-Sounds, Bulk) sind
// bewusst in eine „Erweitert"-Klappe verschoben, nicht im Klickpfad.
import { useState, useEffect } from 'react';
import type { QQStateUpdate, QQSoundConfig } from '../../../shared/quarterQuizTypes';
import { QQ_COMEBACK_ENABLED } from '../../../shared/quarterQuizTypes';
import { QQ_COLORS } from '../../../shared/qqColors';
import { AVATAR_SETS } from '../avatarSets';
import { QQ_THEMES } from '../qqTheme';
import { QQSchedulePreview } from '../components/QQSchedulePreview';
import { QQSoundPanel } from '../components/QQSoundPanel';

type SetupDraft = { id: string; title: string; questionCount: number; megaWarnCount?: number };
type Emit = (event: string, payload: any) => Promise<{ ok: boolean; error?: string }>;

interface Props {
  s: QQStateUpdate;
  drafts: SetupDraft[];
  selectedDraftId: string;
  setSelectedDraftId: (v: string) => void;
  phases: 2 | 3 | 4;
  setPhases: (v: 2 | 3 | 4) => void;
  timerInput: number;
  setTimerInput: (v: number) => void;
  localSoundConfig: QQSoundConfig;
  setLocalSoundConfig: (v: QQSoundConfig) => void;
  roomCode: string;
  emit: Emit;
  finishSetup: () => void;
  /** Zurück ins Cockpit ohne Neu-Setup (nur wenn schon eingerichtet). */
  onClose?: () => void;
}

const PINK = QQ_COLORS.brandPink;
const VIOLET = '#A78BFA';

type StepKey = 'format' | 'look' | 'draft' | 'rounds' | 'timing' | 'extras' | 'ready';
const STEPS: { key: StepKey; title: string; emoji: string }[] = [
  { key: 'format', title: 'Format',           emoji: '🎯' },
  { key: 'look',   title: 'Look',             emoji: '🎨' },
  { key: 'draft',  title: 'Fragensatz',       emoji: '📚' },
  { key: 'rounds', title: 'Runden & Ablauf',  emoji: '🎮' },
  { key: 'timing', title: 'Timer & Sprache',  emoji: '⏱' },
  { key: 'extras', title: 'Extras',           emoji: '🎲' },
  { key: 'ready',  title: 'Bereit',           emoji: '✅' },
];

export function QQSetupFlow(props: Props) {
  const {
    s, drafts, selectedDraftId, setSelectedDraftId, phases, setPhases,
    timerInput: _timerInput, setTimerInput, localSoundConfig: _localSoundConfig,
    setLocalSoundConfig, roomCode, emit, finishSetup, onClose,
  } = props;
  void _timerInput; void _localSoundConfig;

  const arena = !!(s as any).largeGroupMode;
  const accent = arena ? VIOLET : PINK;
  const [step, setStep] = useState(0);
  const [advOpen, setAdvOpen] = useState(false);
  const [customSoundsOpen, setCustomSoundsOpen] = useState(false);

  // Venue-Tag (gegen Fragen-Wiederholung am selben Ort)
  const [venue, setVenue] = useState<string>((s as any).venue ?? '');
  const [knownVenues, setKnownVenues] = useState<string[]>([]);
  useEffect(() => {
    fetch('/api/qq/venues').then(r => (r.ok ? r.json() : [])).then(v => { if (Array.isArray(v)) setKnownVenues(v); }).catch(() => {});
  }, []);

  // Custom-Sounds pro Draft (nur in der „Erweitert"-Klappe)
  const qqDraftId = selectedDraftId.startsWith('qq:') ? selectedDraftId.slice(3) : selectedDraftId;
  const [draftSoundConfig, setDraftSoundConfig] = useState<QQSoundConfig>({});
  const [savingSound, setSavingSound] = useState(false);
  useEffect(() => {
    if (!qqDraftId) { setDraftSoundConfig({}); return; }
    let cancelled = false;
    fetch(`/api/qq/drafts/${encodeURIComponent(qqDraftId)}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (cancelled || !d) return;
        setDraftSoundConfig(d.soundConfig ?? {});
        if (typeof d.defaultTimerSec === 'number' && d.defaultTimerSec > 0 && d.defaultTimerSec !== s.timerDurationSec) {
          setTimerInput(d.defaultTimerSec);
          emit('qq:setTimer', { roomCode, durationSec: d.defaultTimerSec });
        }
        const preferredSet = d.theme?.preferredAvatarSetId || (d.theme?.eurovisionMode ? 'esc' : undefined);
        if (!arena && preferredSet && preferredSet !== s.avatarSetId) emit('qq:setAvatarSet', { roomCode, avatarSetId: preferredSet });
        else if (!arena && !preferredSet && s.avatarSetId === 'esc') emit('qq:setAvatarSet', { roomCode, avatarSetId: 'all' });
      })
      .catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qqDraftId]);

  async function persistDraftSoundConfig(cfg: QQSoundConfig) {
    if (!qqDraftId) return;
    setSavingSound(true);
    try {
      const res = await fetch(`/api/qq/drafts/${encodeURIComponent(qqDraftId)}`);
      if (!res.ok) return;
      const draft = await res.json();
      draft.soundConfig = cfg;
      await fetch(`/api/qq/drafts/${encodeURIComponent(qqDraftId)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) });
    } finally { setSavingSound(false); }
  }
  async function applySoundsToAllDrafts() {
    if (!window.confirm(`Diese Sound-Einstellungen auf alle ${drafts.length} Fragensätze übernehmen?`)) return;
    setSavingSound(true);
    try {
      for (const d of drafts) {
        const id = d.id.startsWith('qq:') ? d.id.slice(3) : d.id;
        const res = await fetch(`/api/qq/drafts/${encodeURIComponent(id)}`);
        if (!res.ok) continue;
        const draft = await res.json();
        draft.soundConfig = draftSoundConfig;
        await fetch(`/api/qq/drafts/${encodeURIComponent(id)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) });
      }
      alert('Sounds auf alle Fragensätze übernommen.');
    } finally { setSavingSound(false); }
  }

  // ── Fit-Check (genug Fragen für die gewählte Rundenzahl?) ──
  const selectedDraft = drafts.find(d => d.id === selectedDraftId);
  const fitNeeded = phases * 5;
  const fitOK = selectedDraft ? selectedDraft.questionCount >= fitNeeded : false;
  const fitTruncate = selectedDraft ? selectedDraft.questionCount > fitNeeded : false;

  // ── Style-Tokens (dark cozy) ──
  const fieldLbl: React.CSSProperties = { fontSize: 10, fontWeight: 900, color: '#94A3B8', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 };
  const card: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 18, padding: 20 };
  const segGroup: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 3, padding: 4, borderRadius: 14, background: 'rgba(0,0,0,0.32)', border: '1px solid rgba(226,232,240,0.08)' };
  const segPill = (active: boolean, ac = accent): React.CSSProperties => ({
    padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 900, fontSize: 14, fontFamily: 'inherit',
    background: active ? ac : 'transparent', color: active ? '#14101F' : '#94A3B8',
    boxShadow: active ? `0 2px 10px ${ac}55` : 'none', transition: 'all 0.15s', minWidth: 44,
  });
  const chipToggle = (active: boolean, ac = accent): React.CSSProperties => ({
    padding: '9px 16px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 900, fontSize: 13,
    border: `1.5px solid ${active ? ac : 'rgba(148,163,184,0.22)'}`, background: active ? `${ac}22` : 'rgba(148,163,184,0.05)',
    color: active ? '#fff' : '#94A3B8', boxShadow: active ? `inset 0 0 0 1px ${ac}44` : 'none', transition: 'all 0.15s',
    display: 'inline-flex', alignItems: 'center', gap: 8,
  });

  // ── Navigation ──
  const go = (n: number) => setStep(Math.max(0, Math.min(STEPS.length - 1, n)));
  const next = () => go(step + 1);
  const back = () => go(step - 1);
  const isLast = step === STEPS.length - 1;

  const setFormat = (ar: boolean) => {
    if (arena === ar) return;
    if (s.teams.length > 0 && !window.confirm('Format wechseln? Beigetretene Teams/Bots werden zurückgesetzt.')) return;
    try { window.localStorage.setItem('qqLastFormat', ar ? 'arena' : 'quiz'); } catch { /* ignore */ }
    emit('qq:setQuizOptions', { roomCode, largeGroupMode: ar, nestedTeams: ar, formatSelected: true });
    const cur = (s as any).avatarSetId as string | undefined;
    const nextSet = ar ? 'cozyArena' : 'cozy3d';
    if ((!cur || ['cozy3d', 'cozyArena', 'cozyAnimals', 'all'].includes(cur)) && cur !== nextSet) emit('qq:setAvatarSet', { roomCode, avatarSetId: nextSet });
  };

  // ── Look-Vorschau-Bilder (Arena) ──
  const arenaLookBg = (s as any).arenaBackgrounds !== false;

  // ── Summary-Werte für die Bereit-Folie ──
  const langLabel = s.language === 'en' ? 'English' : s.language === 'both' ? 'DE + EN' : 'Deutsch';
  const lookLabel = arena ? (arenaLookBg ? 'Mit Kolosseum' : 'Schlicht') : (QQ_THEMES[(s.themeId ?? 'cozy') as keyof typeof QQ_THEMES]?.label ?? 'Cozy');

  // ── Start-Voraussetzungen ──
  const issues: string[] = [];
  if (!selectedDraftId) issues.push('Kein Fragensatz gewählt');
  else if (!fitOK) issues.push(`Fragensatz hat ${selectedDraft?.questionCount ?? 0} Fragen — für ${phases} Runden braucht es ${fitNeeded}`);

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 40 }}>
      <style>{`
        @keyframes qqSetupStepIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) { .qq-setup-body { animation: none !important; } }
      `}</style>

      {/* ── Kopf: Sprechblase + klickbare Schritt-Tabs ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', minHeight: 40 }}>
        {onClose && (
          <button onClick={onClose} title="Zurück ins Cockpit"
            style={{ position: 'absolute', left: 0, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 10, border: '1px solid rgba(148,163,184,0.3)', background: 'rgba(148,163,184,0.08)', color: '#cbd5e1', fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            ← Cockpit
          </button>
        )}
        <div style={{ position: 'relative', background: '#fff', color: '#1E2A5A', fontWeight: 900, fontSize: 'clamp(14px, 2vw, 19px)', padding: '7px 18px', borderRadius: 14, boxShadow: `0 12px 30px -8px ${accent}88`, border: `2px solid ${accent}66` }}>
          Bereit für heute Abend? <span style={{ marginLeft: 2 }}>🎬</span>
          <span aria-hidden style={{ position: 'absolute', bottom: -8, left: '50%', width: 14, height: 14, transform: 'translateX(-50%) rotate(45deg)', background: '#fff', borderRight: `2px solid ${accent}66`, borderBottom: `2px solid ${accent}66` }} />
        </div>
      </div>

      {/* Schritt-Tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
        {STEPS.map((st, i) => {
          const active = i === step;
          const done = i < step;
          return (
            <button key={st.key} onClick={() => go(i)} title={st.title}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 900, fontSize: 12,
                border: `1.5px solid ${active ? accent : done ? 'rgba(34,197,94,0.4)' : 'rgba(148,163,184,0.2)'}`,
                background: active ? `${accent}22` : done ? 'rgba(34,197,94,0.10)' : 'rgba(148,163,184,0.05)',
                color: active ? '#fff' : done ? '#86efac' : '#94A3B8', transition: 'all 0.15s',
              }}>
              <span style={{ fontSize: 13 }}>{done ? '✓' : st.emoji}</span>
              <span style={{ fontSize: 10, opacity: 0.7 }}>{i + 1}</span>
              <span>{st.title}</span>
            </button>
          );
        })}
      </div>

      {/* ── Schritt-Inhalt ── */}
      <div className="qq-setup-body" key={step} style={{ animation: 'qqSetupStepIn 0.25s ease-out', display: 'flex', flexDirection: 'column', gap: 16, minHeight: 300 }}>

        {/* 1 FORMAT */}
        {STEPS[step].key === 'format' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ textAlign: 'center', color: '#c7d2e8', fontWeight: 800, fontSize: 14 }}>Wie spielt ihr heute? Das steuert alles Weitere.</div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
              {[
                { ar: false, emoji: '🍺', title: 'CozyQuiz', sub: 'Pub · 3–8 Teams', lines: ['Gitter platzieren', 'Klauen & Stapeln', 'Der Klassiker'], ac: PINK },
                { ar: true, emoji: '🏟️', title: 'CozyArena', sub: 'Event · bis 25 Teams', lines: ['8 Fraktionen', 'Speed-Wertung', 'Bar-Race'], ac: VIOLET },
              ].map(f => {
                const active = arena === f.ar && !!(s as any).formatSelected;
                return (
                  <button key={f.title} onClick={() => { setFormat(f.ar); setTimeout(next, 180); }}
                    style={{
                      flex: '1 1 260px', maxWidth: 360, textAlign: 'left', padding: '18px 22px', borderRadius: 20, cursor: 'pointer', position: 'relative', overflow: 'hidden',
                      border: `2px solid ${f.ac}${active ? '' : '55'}`, fontFamily: 'inherit',
                      background: `linear-gradient(158deg, ${f.ac}30, ${f.ac}10 55%, rgba(15,19,38,0.72))`,
                      color: '#fff', boxShadow: active ? `0 14px 36px -10px ${f.ac}99, inset 0 0 0 1px ${f.ac}55` : '0 10px 26px -12px rgba(0,0,0,0.55)', transition: 'all 0.15s',
                    }}>
                    <div style={{ width: 50, height: 50, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 27, marginBottom: 10, background: `${f.ac}2e`, border: `1.5px solid ${f.ac}66` }}>{f.emoji}</div>
                    <div style={{ fontSize: 22, fontWeight: 900 }}>{f.title}</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: f.ac, marginBottom: 10 }}>{f.sub}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {f.lines.map(l => <span key={l} style={{ fontSize: 13, color: '#d3dcec', fontWeight: 700, display: 'flex', gap: 7, alignItems: 'center' }}><span style={{ color: f.ac, fontWeight: 900 }}>▸</span>{l}</span>)}
                    </div>
                    {active && <div style={{ position: 'absolute', top: 12, right: 12, fontSize: 12, fontWeight: 900, color: '#fff', background: f.ac, borderRadius: 999, padding: '3px 10px' }}>✓ aktiv</div>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 2 LOOK */}
        {STEPS[step].key === 'look' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {arena ? (
              <>
                <div style={{ textAlign: 'center', color: '#c7d2e8', fontWeight: 800, fontSize: 14 }}>Zwei Arena-Looks — volle Kolosseum-Kulisse oder ruhig & schlicht.</div>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {[
                    { on: true, label: 'Mit Kolosseum', desc: 'Volle Kulisse: Hintergründe pro Screen, Wappen, Cinzel-Inschriften.', img: '/arena-bg/arena-main.webp' },
                    { on: false, label: 'Schlicht', desc: 'Ruhiger dunkler Hintergrund ohne Kolosseum-Bilder.', img: '/arena-bg/pre-neutral.webp' },
                  ].map(o => {
                    const active = arenaLookBg === o.on;
                    return (
                      <button key={o.label} onClick={() => { if (!active) emit('qq:setQuizOptions', { roomCode, arenaBackgrounds: o.on }); }}
                        style={{
                          flex: '1 1 300px', maxWidth: 380, cursor: active ? 'default' : 'pointer', fontFamily: 'inherit', textAlign: 'left',
                          borderRadius: 18, overflow: 'hidden', padding: 0, position: 'relative',
                          border: `2.5px solid ${active ? VIOLET : 'rgba(148,163,184,0.25)'}`,
                          boxShadow: active ? `0 14px 36px -10px ${VIOLET}aa` : '0 8px 22px -12px rgba(0,0,0,0.6)', transition: 'all 0.15s', background: '#14101F',
                        }}>
                        <div style={{ position: 'relative', height: 150, background: o.on ? `center/cover no-repeat url(${o.img})` : 'radial-gradient(circle at 50% 30%, #241c3a, #0e0b1a)' }}>
                          {!o.on && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, opacity: 0.5 }}>🌑</div>}
                          {active && <div style={{ position: 'absolute', top: 10, right: 10, fontSize: 12, fontWeight: 900, color: '#fff', background: VIOLET, borderRadius: 999, padding: '3px 11px', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>✓ aktiv</div>}
                        </div>
                        <div style={{ padding: '12px 16px 14px' }}>
                          <div style={{ fontSize: 16, fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>{o.on ? '🏛️' : '🌑'} {o.label}</div>
                          <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 700, marginTop: 4, lineHeight: 1.4 }}>{o.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                <div style={{ textAlign: 'center', color: '#c7d2e8', fontWeight: 800, fontSize: 14 }}>Bühnen-Design & Spieler-Avatare für CozyQuiz.</div>
                <div style={card}>
                  <div style={fieldLbl}>🎨 Bühnen-Design</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
                    {Object.values(QQ_THEMES).map(t => {
                      const TINT: Record<string, string> = { cozy: '#ec4899', studioMono: '#cbd5e1', softPop: '#f472a0', neoBrutal: '#7c3aed' };
                      const tint = TINT[t.id] ?? '#ec4899';
                      const active = (s.themeId ?? 'cozy') === t.id;
                      const DESC: Record<string, string> = { cozy: 'Der Standard (Pink/Navy)', studioMono: 'Editorial, hell — Corporate', softPop: 'Warm, pastellig', neoBrutal: 'Lila, knallig, jung' };
                      return (
                        <button key={t.id} onClick={() => emit('qq:setTheme', { roomCode, themeId: t.id })}
                          style={{
                            textAlign: 'left', padding: '12px 14px', borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit',
                            border: `2px solid ${active ? tint : 'rgba(148,163,184,0.2)'}`, background: active ? `${tint}1e` : 'rgba(0,0,0,0.28)',
                            color: '#fff', boxShadow: active ? `0 0 0 1px ${tint}55, 0 6px 16px -8px ${tint}` : 'none', transition: 'all 0.15s',
                          }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ width: 14, height: 14, borderRadius: 4, background: tint, flexShrink: 0 }} />
                            <span style={{ fontWeight: 900, fontSize: 14 }}>{t.label}</span>
                            {active && <span style={{ marginLeft: 'auto', color: tint, fontSize: 12, fontWeight: 900 }}>✓</span>}
                          </div>
                          <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, marginTop: 5 }}>{DESC[t.id]}</div>
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ marginTop: 16 }}>
                    <div style={fieldLbl}>🧑‍🎨 Avatar-Set</div>
                    <select value={s.avatarSetId ?? 'all'} onChange={e => emit('qq:setAvatarSet', { roomCode, avatarSetId: e.target.value })}
                      style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(148,163,184,0.25)', background: 'rgba(0,0,0,0.32)', color: '#fff', fontFamily: 'inherit', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
                      {AVATAR_SETS.filter(x => x.id !== 'cozyArena').map(set => (
                        <option key={set.id} value={set.id} style={{ background: '#1F1A2E', color: '#fff' }}>{set.leadEmoji}  {set.label}</option>
                      ))}
                    </select>
                    <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700, marginTop: 6 }}>Womit Spieler sich in der Lobby darstellen (Tiere, Themen-Emojis …).</div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* 3 FRAGENSATZ */}
        {STEPS[step].key === 'draft' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={card}>
              <div style={fieldLbl}>📚 Fragensatz {savingSound && <span style={{ color: accent, fontWeight: 700 }}>· speichert…</span>}</div>
              {drafts.length === 0 ? (
                <div style={{ color: '#94A3B8', fontSize: 14, fontStyle: 'italic', padding: '16px 0' }}>Keine Fragensätze gefunden. Im Builder anlegen oder importieren.</div>
              ) : (
                <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                  {drafts.map(d => {
                    const sel = d.id === selectedDraftId;
                    const draftFit = d.questionCount >= phases * 5;
                    return (
                      <button key={d.id} onClick={() => setSelectedDraftId(d.id)}
                        style={{
                          textAlign: 'left', padding: '12px 14px', borderRadius: 16, cursor: 'pointer', fontFamily: 'inherit',
                          border: sel ? `2px solid ${accent}` : '1.5px solid rgba(255,255,255,0.1)',
                          background: sel ? `linear-gradient(180deg, ${accent}20, ${accent}08)` : 'rgba(0,0,0,0.3)',
                          color: '#F1F5F9', boxShadow: sel ? `0 6px 18px -8px ${accent}` : 'none', transition: 'all 0.15s',
                          display: 'flex', flexDirection: 'column', gap: 6,
                        }}>
                        <div style={{ fontSize: 14, fontWeight: 900, lineHeight: 1.2 }}>{d.title}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 11, fontWeight: 700, color: '#94A3B8' }}>
                          <span>{d.questionCount} Fragen</span>
                          <span style={{ opacity: 0.4 }}>·</span>
                          <span style={{ padding: '1px 8px', borderRadius: 999, background: draftFit ? 'rgba(34,197,94,0.14)' : 'rgba(236,72,153,0.14)', border: `1px solid ${draftFit ? 'rgba(34,197,94,0.32)' : 'rgba(236,72,153,0.32)'}`, color: draftFit ? '#86efac' : '#fde68a', fontWeight: 900 }}>
                            {draftFit ? `✓ ${phases} Rd.` : `⚠ ${Math.floor(d.questionCount / 5)} Rd.`}
                          </span>
                          {arena && (d.megaWarnCount ?? 0) > 0 && (
                            <span title={`${d.megaWarnCount} Hot-Potato-Frage(n) werden in CozyArena übersprungen`} style={{ padding: '1px 8px', borderRadius: 999, background: 'rgba(251,146,60,0.14)', border: '1px solid rgba(251,146,60,0.35)', color: '#fdba74', fontWeight: 900 }}>🔥{d.megaWarnCount}</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              {selectedDraft && fitTruncate && (
                <div style={{ marginTop: 10, fontSize: 11, fontWeight: 700, color: '#fde68a', padding: '6px 12px', borderRadius: 8, background: `${accent}18`, border: `1px solid ${accent}40` }}>
                  ℹ Set hat {selectedDraft.questionCount} Fragen — genutzt werden die ersten {fitNeeded} ({phases} Runden × 5)
                </div>
              )}
              {arena && selectedDraft && (selectedDraft.megaWarnCount ?? 0) > 0 && (
                <div style={{ marginTop: 10, fontSize: 12, fontWeight: 800, color: '#fdba74', padding: '7px 11px', borderRadius: 9, background: 'rgba(251,146,60,0.12)', border: '1px solid rgba(251,146,60,0.4)' }}>
                  ⚠️ {selectedDraft.megaWarnCount} Hot-Potato-{(selectedDraft.megaWarnCount ?? 0) === 1 ? 'Frage wird' : 'Fragen werden'} in CozyArena übersprungen (rundenbasiert)
                </div>
              )}
            </div>
            <div style={card}>
              <div style={fieldLbl}>📍 Ort / Event <span style={{ textTransform: 'none', letterSpacing: 0, color: '#64748B', fontWeight: 700 }}>· optional — merkt sich pro Ort, welche Fragen schon liefen</span></div>
              <input list="qq-setup-venues" value={venue} onChange={e => { const v = e.target.value; setVenue(v); emit('qq:setVenue', { roomCode, venue: v }); }}
                placeholder="z. B. Café Sommer, Musterstadt"
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(148,163,184,0.25)', background: 'rgba(15,19,38,0.5)', color: '#e2e8f0', fontFamily: 'inherit', fontSize: 14, fontWeight: 700 }} />
              <datalist id="qq-setup-venues">{knownVenues.map(v => <option key={v} value={v} />)}</datalist>
            </div>
          </div>
        )}

        {/* 4 RUNDEN & ABLAUF */}
        {STEPS[step].key === 'rounds' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <span style={fieldLbl}>🎮 Runden</span>
                <div style={segGroup}>
                  {([2, 3, 4] as const).map(n => {
                    const enough = selectedDraft ? selectedDraft.questionCount >= n * 5 : true;
                    return <button key={n} onClick={() => setPhases(n)} style={{ ...segPill(phases === n), opacity: enough ? 1 : 0.5 }} title={enough ? `${n} Runden` : `Fragensatz reicht nur für ${Math.floor((selectedDraft?.questionCount ?? 0) / 5)} Runden`}>{n}</button>;
                  })}
                </div>
                <span style={{ fontSize: 12, color: fitOK ? '#86efac' : '#fca5a5', fontWeight: 800 }}>
                  {selectedDraft ? (fitOK ? `✓ ${fitNeeded} Fragen im Set` : `⚠ Set hat nur ${selectedDraft.questionCount} — braucht ${fitNeeded}`) : 'Erst Fragensatz wählen'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginTop: 14 }}>
                <span style={fieldLbl}>🔀 Reihenfolge</span>
                <div style={segGroup}>
                  <button onClick={() => emit('qq:setQuizOptions', { roomCode, shuffleQuestionsInRound: true })} style={segPill(s.shuffleQuestionsInRound !== false)}>Zufällig</button>
                  <button onClick={() => emit('qq:setQuizOptions', { roomCode, shuffleQuestionsInRound: false })} style={segPill(s.shuffleQuestionsInRound === false)}>Aus Draft</button>
                </div>
                <span style={{ fontSize: 12, color: '#64748B', fontWeight: 700 }}>{s.shuffleQuestionsInRound !== false ? 'Kategorien werden je Runde gemischt' : 'Reihenfolge wie im Draft'}</span>
              </div>
            </div>
            {selectedDraft && fitOK && <QQSchedulePreview draftId={qqDraftId} phases={phases} />}
          </div>
        )}

        {/* 5 TIMER & SPRACHE */}
        {STEPS[step].key === 'timing' && (
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <span style={fieldLbl}>⏱ Timer</span>
              <div style={segGroup}>
                {[15, 30, 45, 60, 90].map(t => (
                  <button key={t} onClick={() => { setTimerInput(t); emit('qq:setTimer', { roomCode, durationSec: t }); }} style={segPill(s.timerDurationSec === t)}>{t}s</button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginTop: 16 }}>
              <span style={fieldLbl}>🌐 Sprache</span>
              <div style={segGroup}>
                {(['de', 'en', 'both'] as const).map(lang => (
                  <button key={lang} onClick={() => emit('qq:setLanguage', { roomCode, language: lang })} style={{ ...segPill(s.language === lang), display: 'inline-flex', alignItems: 'center', gap: 6 }} title={lang === 'de' ? 'Deutsch' : lang === 'en' ? 'English' : 'Beide im Wechsel'}>
                    <span style={{ fontSize: 17, lineHeight: 1 }}>{lang === 'de' ? '🇩🇪' : lang === 'en' ? '🇬🇧' : '🌐'}</span>
                    {lang === 'de' ? 'Deutsch' : lang === 'en' ? 'English' : 'Beide'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 6 EXTRAS */}
        {STEPS[step].key === 'extras' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={card}>
              <div style={fieldLbl}>🎲 Spielmechanik</div>
              {arena ? (
                <div style={{ fontSize: 13, color: '#b8a5e8', fontWeight: 700, padding: '10px 14px', borderRadius: 10, background: 'rgba(167,139,250,0.10)', border: '1px solid rgba(167,139,250,0.3)' }}>
                  🏟️ In CozyArena sind Wager/Comeback/CozyGames automatisch gesetzt — es läuft die Speed-Wertung mit Bar-Race. Nichts einzustellen.
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button onClick={() => emit('qq:setFinalWagerEnabled', { roomCode, enabled: !s.finalWagerEnabled })} style={chipToggle(!!s.finalWagerEnabled, PINK)} title="Wager-Phase vor der Final-Runde">🪙 Wager</button>
                  {QQ_COMEBACK_ENABLED && (
                    <button onClick={() => emit('qq:setQuizOptions', { roomCode, comebackEnabled: !((s as any).comebackEnabled !== false) })} style={chipToggle((s as any).comebackEnabled !== false, PINK)} title="Letztes Team kann via Mehr-oder-Weniger Felder klauen">🔄 Comeback</button>
                  )}
                  <button onClick={() => emit('qq:setQuizOptions', { roomCode, cozyGamesEnabled: !(s as any).cozyGamesEnabled })} style={chipToggle(!!(s as any).cozyGamesEnabled, PINK)} title="Analoge Mini-Spiele zwischen den Runden">🪅 CozyGames</button>
                </div>
              )}
            </div>
            <div style={card}>
              <div style={fieldLbl}>🔊 Sound</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <button onClick={() => emit('qq:setMusicMuted', { roomCode, muted: !s.musicMuted })} style={chipToggle(!s.musicMuted, QQ_COLORS.green500)}>{s.musicMuted ? '🔇 Musik aus' : '🎵 Musik an'}</button>
                <button onClick={() => emit('qq:setSfxMuted', { roomCode, muted: !s.sfxMuted })} style={chipToggle(!s.sfxMuted, QQ_COLORS.green500)}>{s.sfxMuted ? '🔇 SFX aus' : '🔉 SFX an'}</button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 200px', minWidth: 180 }}>
                  <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 800 }}>Lautstärke</span>
                  <input type="range" min={0} max={100} step={5} value={Math.round((s.volume ?? 0.8) * 100)} onChange={e => emit('qq:setVolume', { roomCode, volume: Number(e.target.value) / 100 })} style={{ flex: 1, accentColor: accent }} />
                  <span style={{ fontSize: 13, color: '#F1F5F9', minWidth: 42, fontWeight: 900, fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{Math.round((s.volume ?? 0.8) * 100)}%</span>
                </div>
              </div>
            </div>

            {/* Erweitert / Wartung (nicht im Klickpfad) */}
            <div style={{ ...card, padding: 0, background: 'rgba(255,255,255,0.02)' }}>
              <button onClick={() => setAdvOpen(v => !v)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', borderRadius: 18, border: 'none', background: 'transparent', color: '#94A3B8', fontFamily: 'inherit', fontWeight: 900, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}>
                <span style={{ display: 'inline-block', transition: 'transform 0.2s', transform: advOpen ? 'rotate(90deg)' : 'none' }}>▶</span>
                ⚙ Erweitert · Custom-Sounds · Comeback-Timer · Wartung
              </button>
              {advOpen && (
                <div style={{ padding: '4px 18px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {QQ_COMEBACK_ENABLED && !arena && (
                    <div>
                      <div style={fieldLbl}>⚡ Comeback „Mehr oder Weniger" — Timer pro Runde</div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', maxWidth: 260 }}>
                        <input type="number" min={3} max={60} value={s.comebackHLTimerSec ?? 20}
                          onChange={e => { const v = Math.max(3, Math.min(60, Number(e.target.value) || 20)); emit('qq:comebackHLTimer', { roomCode, seconds: v }); }}
                          style={{ flex: 1, padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(148,163,184,0.25)', background: 'rgba(0,0,0,0.4)', color: '#F1F5F9', fontSize: 14, fontWeight: 900, fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums' }} />
                        <span style={{ fontSize: 12, fontWeight: 900, color: '#64748B' }}>Sek</span>
                      </div>
                    </div>
                  )}
                  <div>
                    <div style={fieldLbl}>🎵 Custom Sounds pro Slot</div>
                    <button onClick={() => setCustomSoundsOpen(v => !v)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(148,163,184,0.15)', background: 'rgba(226,232,240,0.03)', color: '#94A3B8', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 900, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>Timer-Loop, Korrekt, Falsch, Phase-Intro …</span>
                      <span style={{ fontSize: 10, transition: 'transform 0.2s', transform: customSoundsOpen ? 'rotate(90deg)' : 'none' }}>▶</span>
                    </button>
                    {customSoundsOpen && (
                      <div style={{ marginTop: 10 }}>
                        <QQSoundPanel config={draftSoundConfig} onChange={cfg => { setDraftSoundConfig(cfg); setLocalSoundConfig(cfg); emit('qq:updateSoundConfig', { roomCode, soundConfig: cfg }); persistDraftSoundConfig(cfg); }} />
                        {qqDraftId && (
                          <button onClick={applySoundsToAllDrafts} disabled={savingSound} style={{ marginTop: 8, padding: '7px 14px', borderRadius: 8, cursor: savingSound ? 'wait' : 'pointer', border: `1px solid ${accent}55`, background: `${accent}18`, color: accent, fontSize: 11, fontWeight: 900, fontFamily: 'inherit' }}>📋 Sounds auf alle Fragensätze übernehmen</button>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <div style={fieldLbl}>🗑 Bestenliste (Lobby/Pause)</div>
                    <button onClick={async () => {
                      if (!window.confirm('Wirklich ALLE gespeicherten Spiel-Ergebnisse löschen? Die Bestenliste startet bei 0. Nicht rückgängig zu machen.')) return;
                      try { const r = await fetch('/api/qq/gameresults', { method: 'DELETE' }); const d = await r.json(); alert(d.ok ? `Bestenliste gelöscht: ${d.deleted ?? 0} Einträge entfernt.` : 'Fehler beim Löschen.'); } catch { alert('Netzwerkfehler beim Löschen.'); }
                    }} style={{ padding: '8px 14px', borderRadius: 8, fontFamily: 'inherit', fontWeight: 900, fontSize: 12, cursor: 'pointer', border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.08)', color: '#fca5a5' }}>
                      Bestenliste leeren (Dummy-Daten weg)
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 7 BEREIT */}
        {STEPS[step].key === 'ready' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={card}>
              <div style={fieldLbl}>✅ Übersicht — bereit für den Abend</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
                {[
                  { k: 'Format', v: `${arena ? '🏟️ CozyArena' : '🍺 CozyQuiz'}` },
                  { k: 'Look', v: lookLabel },
                  { k: 'Fragensatz', v: selectedDraft?.title ?? '— keiner —' },
                  { k: 'Runden', v: `${phases} × 5 Fragen` },
                  { k: 'Timer', v: `${s.timerDurationSec ?? 30}s` },
                  { k: 'Sprache', v: langLabel },
                ].map(row => (
                  <div key={row.k} style={{ padding: '10px 12px', borderRadius: 12, background: 'rgba(0,0,0,0.28)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div style={{ fontSize: 10, fontWeight: 900, color: '#64748B', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{row.k}</div>
                    <div style={{ fontSize: 14, fontWeight: 900, color: '#F1F5F9', marginTop: 3 }}>{row.v}</div>
                  </div>
                ))}
              </div>
            </div>

            {issues.length > 0 && (
              <div style={{ padding: '10px 16px', borderRadius: 14, background: 'rgba(236,72,153,0.06)', border: '1px solid rgba(236,72,153,0.25)', fontSize: 12, fontWeight: 700, color: '#fde68a', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', color: PINK }}>Vor dem Start</div>
                {issues.map((iss, i) => <div key={i} style={{ display: 'flex', gap: 6 }}><span style={{ color: PINK }}>•</span>{iss}</div>)}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
              <button onClick={() => { try { window.open(`/beamer?room=${encodeURIComponent(roomCode)}`, 'cozyquiz-beamer')?.focus(); } catch { /* ignore */ } }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 22px', borderRadius: 14, border: '1px solid rgba(236,72,153,0.4)', background: 'rgba(236,72,153,0.10)', color: '#f9d3e6', fontWeight: 900, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}>
                🖥️ Beamer öffnen
              </button>
              <button onClick={finishSetup} disabled={!selectedDraftId}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '15px 40px', borderRadius: 16, border: 'none', cursor: selectedDraftId ? 'pointer' : 'not-allowed', fontFamily: 'inherit', fontWeight: 900, fontSize: 20, color: '#fff', background: selectedDraftId ? 'linear-gradient(135deg, #22C55E, #16A34A)' : 'rgba(255,255,255,0.06)', boxShadow: selectedDraftId ? '0 12px 30px -6px rgba(34,197,94,0.5)' : 'none', opacity: selectedDraftId ? 1 : 0.5 }}>
                ▶ Ins Cockpit
              </button>
            </div>
            <div style={{ textAlign: 'center', fontSize: 12, color: '#64748B', fontWeight: 700 }}>Danach: Teams joinen am Beamer, du startest &amp; moderierst aus dem Cockpit.</div>
          </div>
        )}
      </div>

      {/* ── Fußzeile: Zurück / Weiter ── */}
      {!isLast && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 16 }}>
          <button onClick={back} disabled={step === 0}
            style={{ padding: '11px 20px', borderRadius: 12, border: '1px solid rgba(148,163,184,0.25)', background: 'rgba(148,163,184,0.06)', color: '#cbd5e1', fontWeight: 800, fontSize: 14, cursor: step === 0 ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: step === 0 ? 0.4 : 1 }}>
            ← Zurück
          </button>
          <span style={{ fontSize: 12, color: '#64748B', fontWeight: 800 }}>Schritt {step + 1} von {STEPS.length}</span>
          <button onClick={next}
            style={{ padding: '11px 28px', borderRadius: 12, border: 'none', background: `linear-gradient(135deg, ${accent}, ${arena ? '#7C5CD6' : '#A21247'})`, color: '#fff', fontWeight: 900, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit', boxShadow: `0 8px 22px -8px ${accent}` }}>
            Weiter →
          </button>
        </div>
      )}
    </div>
  );
}

export default QQSetupFlow;
