// ── QQ Show-Prep-Wizard ──────────────────────────────────────────────────────
// 2026-06-13 (Wolf-Wunsch): Opt-in geführter Vorbereitungs-Flow. Mentalmodell:
// ein Quiz VORAB komplett planen & einrichten → in der Venue nur noch Teams rein
// + „Start" drücken. Der DRAFT ist der persistente Plan (Sprache/Minigames/
// Comeback/Timer-Default leben am Draft). Material & „beachte" werden AUTOMATISCH
// aus dem Quiz-Inhalt abgeleitet (Minigame-materialTags + Audio/Bild-Fragen).
//
// Reihenfolge ist bewusst Pre-Event: Quiz → Material/Druck → Briefing → Optionen
// → Technik → (Bereit). Teams/Bots passieren NICHT hier, sondern erst danach in
// der normalen Ready-View, wenn die Gäste da sind.

import { useState, useEffect, useMemo, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { QQDraft, QQStateUpdate, QQCategory } from '../../../shared/quarterQuizTypes';
import { QQ_COMEBACK_ENABLED } from '../../../shared/quarterQuizTypes';
import type { CozyGame } from '../../../shared/cozyGameTypes';

interface Props {
  roomCode: string;
  state: QQStateUpdate;
  selectedDraftId: string;
  drafts: { id: string; title: string }[];
  emit: (event: string, payload: any) => Promise<{ ok: boolean; error?: string }>;
  onClose: () => void;
  onFinish: () => void;
}

const CATEGORY_LABEL: Record<QQCategory, string> = {
  SCHAETZCHEN: 'Schätzchen 🍯',
  MUCHO: 'Mu-cho 🎵',
  BUNTE_TUETE: 'Bunte Tüte 🎁',
  ZEHN_VON_ZEHN: '10 von 10 🔟',
  CHEESE: 'Cheese 🧀',
};

type StepDef = { key: string; title: string; emoji: string };
// 2026-07-19 (Wolf 'Setup vereinheitlichen'): der fruehere Schritt "Optionen"
// (Timer/Sprache/Comeback) war ein Duplikat der Einstellungen — entfernt.
// "Show planen" ist jetzt reine Vorbereitung (Material/Briefing/Technik).
const STEPS: StepDef[] = [
  { key: 'quiz',     title: 'Quiz wählen',          emoji: '📚' },
  { key: 'material', title: 'Material & Druck',      emoji: '🎒' },
  { key: 'briefing', title: 'Moderations-Briefing',  emoji: '🎤' },
  { key: 'tech',     title: 'Technik-Aufbau',        emoji: '📺' },
  { key: 'ready',    title: 'Bereit',                emoji: '✅' },
];

function rawDraftId(id: string): string {
  return id.startsWith('qq:') ? id.slice(3) : id;
}

// ── Auto-Ableitung: Material + „beachte" aus dem Quiz-Inhalt ──────────────────
interface DerivedPrep {
  hasAudio: boolean;
  imageCount: number;
  games: CozyGame[];
  materials: string[];
  beachte: string[];
  briefing: { category: QQCategory; text: string; hostNote?: string; funFact?: string }[];
  estMinutes: number;
}

function derivePrep(draft: QQDraft | null, catalog: CozyGame[]): DerivedPrep {
  const questions = draft?.questions ?? [];
  const hasAudio = questions.some(
    q => q.category === 'MUCHO' || q.musicMode === 'audioQuestion' || !!(q.musicUrl && q.musicUrl.length),
  );
  const imageCount = questions.filter(q => !!q.image).length;

  const poolIds = (draft?.cozyGamesEnabled && draft?.cozyGamesPool) ? draft.cozyGamesPool : [];
  const games = poolIds
    .map(id => catalog.find(g => g.id === id))
    .filter((g): g is CozyGame => !!g);
  const materials = Array.from(new Set(games.flatMap(g => g.materialTags ?? [])));

  const beachte: string[] = [];
  if (hasAudio) beachte.push('🔊 Musik-/Audio-Fragen dabei — Boxen & Lautstärke vorher testen (auch hinten gut hörbar?).');
  if (imageCount > 0) beachte.push(`🖼️ ${imageCount} Bild-Frage${imageCount === 1 ? '' : 'n'} — Beamer scharf & groß genug, Raum nicht zu hell.`);
  if (games.length > 0) beachte.push(`🎲 ${games.length} Minigame${games.length === 1 ? '' : 's'} — Material bereitlegen (siehe Material-Schritt) & Ablauf kurz durchlesen.`);
  if (QQ_COMEBACK_ENABLED && draft?.comebackEnabled !== false) beachte.push('🔁 Comeback-Runde (Higher/Lower) ist aktiv — vor der Final-Runde eingeplant.');

  const briefing = questions
    .filter(q => (q.hostNote && q.hostNote.trim()) || (q.funFact && q.funFact.trim()))
    .map(q => ({ category: q.category, text: q.text, hostNote: q.hostNote?.trim(), funFact: q.funFact?.trim() }));

  // Grobe Dauer: ~1,5 min/Frage + ~4 min/Minigame.
  const estMinutes = Math.round(questions.length * 1.5 + games.length * 4);

  return { hasAudio, imageCount, games, materials, beachte, briefing, estMinutes };
}

// ── Checkbox-Status pro Draft im localStorage (überlebt Reload/Planung) ───────
function useCheckedSet(draftId: string, ns: string) {
  const key = `qq-prep-${ns}-${draftId}`;
  const [checked, setChecked] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
    } catch { return new Set(); }
  });
  useEffect(() => {
    // Bei Draft-Wechsel neu laden.
    try {
      const raw = localStorage.getItem(key);
      setChecked(raw ? new Set(JSON.parse(raw) as string[]) : new Set());
    } catch { setChecked(new Set()); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const toggle = useCallback((item: string) => {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item); else next.add(item);
      try { localStorage.setItem(key, JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  }, [key]);
  return { checked, toggle };
}

// ── Styles (dark, konsistent zur Mod-Page) ───────────────────────────────────
const C = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(6,8,14,0.92)', zIndex: 9000, display: 'flex', flexDirection: 'column', fontFamily: "'Nunito', sans-serif", color: '#e2e8f0' } as React.CSSProperties,
  card: { maxWidth: 720, width: '100%', margin: '0 auto', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: '0 16px' } as React.CSSProperties,
  body: { flex: 1, overflowY: 'auto', padding: '8px 4px 16px' } as React.CSSProperties,
  h1: { fontSize: 24, fontWeight: 900, margin: '4px 0' } as React.CSSProperties,
  sub: { color: '#94a3b8', fontSize: 14, marginBottom: 12 } as React.CSSProperties,
  pill: (active: boolean) => ({ padding: '8px 14px', borderRadius: 999, border: active ? '2px solid #EC4899' : '1px solid rgba(255,255,255,0.15)', background: active ? 'rgba(236,72,153,0.18)' : 'rgba(255,255,255,0.05)', color: '#e2e8f0', fontWeight: 800, cursor: 'pointer', fontSize: 14 }) as React.CSSProperties,
  block: { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: 16, marginBottom: 12 } as React.CSSProperties,
  primary: { padding: '12px 28px', borderRadius: 12, border: 'none', background: 'linear-gradient(90deg,#EC4899,#A21247)', color: '#fff', fontWeight: 900, fontSize: 16, cursor: 'pointer' } as React.CSSProperties,
  ghost: { padding: '12px 22px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#e2e8f0', fontWeight: 800, fontSize: 15, cursor: 'pointer' } as React.CSSProperties,
};

function CheckRow({ id, label, checked, onToggle }: { id: string; label: React.ReactNode; checked: boolean; onToggle: (id: string) => void }) {
  return (
    <button
      onClick={() => onToggle(id)}
      style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', padding: '11px 14px', marginBottom: 8, borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', background: checked ? 'rgba(34,197,94,0.14)' : 'rgba(255,255,255,0.04)', color: '#e2e8f0', cursor: 'pointer', fontSize: 15 }}
    >
      <span style={{ fontSize: 20, flexShrink: 0 }}>{checked ? '✅' : '⬜'}</span>
      <span style={{ opacity: checked ? 0.7 : 1, textDecoration: checked ? 'line-through' : 'none' }}>{label}</span>
    </button>
  );
}

export default function QQShowPrepWizard({ roomCode, state, selectedDraftId, drafts, emit, onClose, onFinish }: Props) {
  const [stepIdx, setStepIdx] = useState(0);
  const [draft, setDraft] = useState<QQDraft | null>(null);
  const [catalog, setCatalog] = useState<CozyGame[]>([]);
  const [loading, setLoading] = useState(true);
  const draftId = rawDraftId(selectedDraftId);

  // Draft + CozyGames-Katalog laden.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      draftId ? fetch(`/api/qq/drafts/${encodeURIComponent(draftId)}`).then(r => r.ok ? r.json() : null).catch(() => null) : Promise.resolve(null),
      fetch('/api/cozygames').then(r => r.ok ? r.json() : []).catch(() => []),
    ]).then(([d, cat]) => {
      if (cancelled) return;
      setDraft(d);
      setCatalog(Array.isArray(cat) ? cat : []);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [draftId]);

  const prep = useMemo(() => derivePrep(draft, catalog), [draft, catalog]);
  const mat = useCheckedSet(draftId || 'none', 'material');
  const tech = useCheckedSet(draftId || 'none', 'tech');

  // Draft-Patch (GET → merge → PUT), bewahrt andere Felder. Persistiert den Plan.
  const patchDraft = useCallback(async (partial: Partial<QQDraft>) => {
    if (!draftId) return;
    try {
      const res = await fetch(`/api/qq/drafts/${encodeURIComponent(draftId)}`);
      if (!res.ok) return;
      const full = await res.json();
      const merged = { ...full, ...partial };
      await fetch(`/api/qq/drafts/${encodeURIComponent(draftId)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(merged),
      });
      setDraft(merged);
    } catch { /* ignore */ }
  }, [draftId]);

  const step = STEPS[stepIdx];
  const isLast = stepIdx === STEPS.length - 1;

  // Material-Liste (auto-abgeleitet).
  const materialItems = useMemo(() => {
    const items: { id: string; label: React.ReactNode }[] = [];
    items.push({ id: 'host-sheet', label: <>📄 <b>Host-Spickzettel ausdrucken</b> — alle Fragen, Antworten & Notizen (Seite <code>/host-sheets</code>)</> });
    items.push({ id: 'pens', label: <>✏️ Stifte & Zettel für jedes Team bereitlegen</> });
    for (const g of prep.games) {
      const tags = (g.materialTags ?? []).join(', ') || '—';
      items.push({ id: `game-${g.id}`, label: <>{g.emoji} <b>{g.name}</b>: {tags}</> });
    }
    if (prep.hasAudio) items.push({ id: 'audio', label: <>🔊 Musik-Fragen: Boxen angeschlossen & Lautstärke getestet</> });
    if (prep.imageCount > 0) items.push({ id: 'images', label: <>🖼️ Bild-Fragen ({prep.imageCount}): Beamer-Bild scharf & groß</> });
    return items;
  }, [prep]);

  return (
    <div style={C.overlay}>
      <div style={C.card}>
        {/* Header: Step-Pills + Close */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0 6px' }}>
          <div style={{ fontWeight: 900, fontSize: 18 }}>🎬 Show planen</div>
          <button onClick={onClose} style={{ ...C.ghost, padding: '6px 14px' }}>Schließen ✕</button>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          {STEPS.map((s, i) => (
            <button key={s.key} onClick={() => setStepIdx(i)} style={{ ...C.pill(i === stepIdx), padding: '6px 11px', fontSize: 12, opacity: i <= stepIdx ? 1 : 0.5 }}>
              {s.emoji} {s.title}
            </button>
          ))}
        </div>

        <div style={C.body}>
          <div style={C.h1}>{step.emoji} {step.title}</div>

          {loading && <div style={C.sub}>Lade Quiz-Daten…</div>}

          {!loading && step.key === 'quiz' && (
            <>
              <div style={C.sub}>Welches Quiz richtest du ein? Die Auswahl ist der Anker für alles Weitere.</div>
              <div style={C.block}>
                <div style={{ fontWeight: 800, marginBottom: 8 }}>📚 {draft?.title ?? '— kein Quiz gewählt —'}</div>
                {draft && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 14 }}>
                    <div><b>{draft.questions?.length ?? 0}</b> Fragen</div>
                    <div><b>{draft.phases}</b> Phasen · ~<b>{prep.estMinutes}</b> min</div>
                    <div>Sprache: <b>{draft.language}</b></div>
                    <div>Minigames: <b>{prep.games.length}</b>{draft.cozyGamesEnabled ? '' : ' (aus)'}</div>
                  </div>
                )}
              </div>
              {draft && (
                <div style={C.block}>
                  <div style={{ fontWeight: 800, marginBottom: 8 }}>Kategorien-Mix</div>
                  {Object.entries(
                    (draft.questions ?? []).reduce<Record<string, number>>((acc, q) => { acc[q.category] = (acc[q.category] ?? 0) + 1; return acc; }, {}),
                  ).map(([cat, n]) => (
                    <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 14 }}>
                      <span>{CATEGORY_LABEL[cat as QQCategory] ?? cat}</span><span style={{ fontWeight: 800 }}>{n}×</span>
                    </div>
                  ))}
                </div>
              )}
              <div style={C.sub}>Anderes Quiz? Vor dem Wizard im normalen Setup auswählen — der Wizard übernimmt die aktuelle Auswahl.</div>
            </>
          )}

          {!loading && step.key === 'material' && (
            <>
              <div style={C.sub}>Automatisch aus dem Quiz abgeleitet. Hak ab, was bereitliegt — der Stand bleibt gespeichert.</div>
              {materialItems.map(it => (
                <CheckRow key={it.id} id={it.id} label={it.label} checked={mat.checked.has(it.id)} onToggle={mat.toggle} />
              ))}
              {prep.materials.length > 0 && (
                <div style={{ ...C.block, marginTop: 8 }}>
                  <div style={{ fontWeight: 800, marginBottom: 6 }}>🎒 Material-Gesamtliste (alle Minigames)</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {prep.materials.map(m => <span key={m} style={{ ...C.pill(false), cursor: 'default', padding: '5px 11px', fontSize: 13 }}>{m}</span>)}
                  </div>
                </div>
              )}
            </>
          )}

          {!loading && step.key === 'briefing' && (
            <>
              <div style={C.sub}>Vorab durchlesen: deine Notizen, Fun Facts und was es zu beachten gibt.</div>
              {prep.beachte.length > 0 && (
                <div style={{ ...C.block, borderColor: 'rgba(251,191,36,0.4)', background: 'rgba(251,191,36,0.08)' }}>
                  <div style={{ fontWeight: 800, marginBottom: 8 }}>⚠️ Das gibt's zu beachten</div>
                  {prep.beachte.map((b, i) => <div key={i} style={{ padding: '4px 0', fontSize: 14 }}>{b}</div>)}
                </div>
              )}
              {prep.briefing.length === 0 ? (
                <div style={C.sub}>Keine Host-Notizen / Fun Facts in diesem Quiz hinterlegt. (Im Builder pro Frage ergänzbar.)</div>
              ) : (
                prep.briefing.map((b, i) => (
                  <div key={i} style={C.block}>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>{CATEGORY_LABEL[b.category] ?? b.category}</div>
                    <div style={{ fontWeight: 800, marginBottom: 6 }}>{b.text}</div>
                    {b.hostNote && <div style={{ fontSize: 14, marginBottom: 4 }}>📝 {b.hostNote}</div>}
                    {b.funFact && <div style={{ fontSize: 14, color: '#fbbf24' }}>💡 {b.funFact}</div>}
                  </div>
                ))
              )}
            </>
          )}

          {!loading && step.key === 'tech' && (
            <>
              <div style={C.sub}>Beamer aufbauen & Ton testen — am besten bevor die Gäste kommen.</div>
              <div style={C.block}>
                <div style={{ fontWeight: 800, marginBottom: 8 }}>📺 Beamer öffnen</div>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ background: '#fff', padding: 8, borderRadius: 10 }}>
                    <QRCodeSVG value={`${window.location.origin}/beamer?room=${roomCode}`} size={120} bgColor="#ffffff" fgColor="#0D0A06" />
                  </div>
                  <div style={{ fontSize: 14 }}>
                    <div style={{ color: '#94a3b8' }}>Auf dem Beamer-Rechner öffnen:</div>
                    <div style={{ fontWeight: 800, wordBreak: 'break-all' }}>/beamer?room={roomCode}</div>
                  </div>
                </div>
              </div>
              {[
                { id: 'beamer-open', label: '📺 Beamer zeigt die Lobby (Raumcode sichtbar)' },
                { id: 'sound-ok', label: '🔊 Ton läuft (Lobby-Musik hörbar, auch hinten)' },
                { id: 'net-ok', label: '🌐 Internet stabil (Beamer + Mod-Gerät + Team-Handys)' },
              ].map(it => (
                <CheckRow key={it.id} id={it.id} label={it.label} checked={tech.checked.has(it.id)} onToggle={tech.toggle} />
              ))}
            </>
          )}

          {!loading && step.key === 'ready' && (
            <>
              <div style={C.sub}>Vorbereitung steht. Das Letzte passiert erst, wenn die Gäste da sind.</div>
              <div style={{ ...C.block, borderColor: 'rgba(34,197,94,0.4)', background: 'rgba(34,197,94,0.08)' }}>
                <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 10 }}>✅ Geplant & eingerichtet</div>
                <div style={{ fontSize: 14, lineHeight: 1.7 }}>
                  <div>📚 Quiz: <b>{draft?.title ?? '—'}</b> ({draft?.questions?.length ?? 0} Fragen, ~{prep.estMinutes} min)</div>
                  <div>🎒 Material: <b>{mat.checked.size}/{materialItems.length}</b> abgehakt</div>
                  <div>📺 Technik: <b>{tech.checked.size}/3</b> abgehakt</div>
                  <div>⏱️ Timer: <b>{draft?.defaultTimerSec ?? state.timerDurationSec}s</b> · 🌍 {draft?.language}</div>
                </div>
              </div>
              <div style={{ ...C.block, borderColor: 'rgba(236,72,153,0.4)' }}>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>🎤 In der Venue (wenn die Gäste da sind):</div>
                <div style={{ fontSize: 14, lineHeight: 1.7 }}>
                  1. Teams beitreten lassen (Raumcode / QR auf dem Beamer)<br />
                  2. Ggf. Bots ergänzen<br />
                  3. <b>„Spiel starten"</b> drücken — fertig. 🚀
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer: Zurück / Weiter / Fertig */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '12px 0 16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <button style={{ ...C.ghost, opacity: stepIdx === 0 ? 0.4 : 1 }} disabled={stepIdx === 0} onClick={() => setStepIdx(i => Math.max(0, i - 1))}>← Zurück</button>
          {!isLast ? (
            <button style={C.primary} onClick={() => setStepIdx(i => Math.min(STEPS.length - 1, i + 1))}>Weiter →</button>
          ) : (
            <button style={C.primary} onClick={() => { onFinish(); onClose(); }}>Planung fertig ✓</button>
          )}
        </div>
      </div>
    </div>
  );
}
