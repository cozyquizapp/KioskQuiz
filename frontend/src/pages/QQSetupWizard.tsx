/**
 * QQSetupWizard — geführtes, chronologisches Mod-Setup (Wolf 2026-07-02).
 *
 * Overlay über der Lobby-Setup-Ansicht. Führt Schritt für Schritt durch:
 *   1 Gruppengröße (Normal / Mega Event)  2 Runden  3 Sprache
 *   4 Add-ons (im Mega Event grid-basierte automatisch aus)  5 Draft
 *   6 Theme  7 Fertig
 *
 * Alle Einstellungen werden LIVE über dieselben Kanäle gesetzt, die auch die
 * Quick-Pills nutzen (emit qq:setQuizOptions/setLanguage/setTheme/…, setPhases,
 * setSelectedDraftId) — kein separater Speicher-Schritt, nichts am bestehenden
 * Start-Flow verändert. Der Wizard ist nur eine geführte Hülle drumherum.
 */
import { useState } from 'react';
import { QQ_THEMES } from '../qqTheme';

type EmitFn = (event: string, payload: unknown) => Promise<{ ok: boolean; error?: string }>;

interface DraftSummary { id: string; title: string; questionCount: number; phases?: number }

interface Props {
  roomCode: string;
  s: any; // room state
  emit: EmitFn;
  phases: 2 | 3 | 4;
  setPhases: (n: 2 | 3 | 4) => void;
  selectedDraftId: string | null;
  setSelectedDraftId: (id: string) => void;
  drafts: DraftSummary[];
  onClose: () => void;
  /** Setup abschließen (setSetupDone) → Teams können beitreten. Letzter Schritt. */
  finishSetup?: () => void;
}

const STEPS = [
  { key: 'group', emoji: '👥', title: 'Gruppengröße' },
  { key: 'rounds', emoji: '🎮', title: 'Runden' },
  { key: 'lang', emoji: '🌐', title: 'Sprache' },
  { key: 'addons', emoji: '🧩', title: 'Add-ons' },
  { key: 'draft', emoji: '📋', title: 'Fragensatz' },
  { key: 'theme', emoji: '🎨', title: 'Design' },
  { key: 'done', emoji: '✅', title: 'Bereit' },
] as const;

const ACCENT = '#EC4899';
const VIOLET = '#A78BFA';

export function QQSetupWizard({ roomCode, s, emit, phases, setPhases, selectedDraftId, setSelectedDraftId, drafts, onClose, finishSetup }: Props) {
  const [step, setStep] = useState(0);
  const mega = !!s?.largeGroupMode;

  // ── Setter (live, wie die Quick-Pills) ────────────────────────────────────
  const setMega = (on: boolean) => {
    emit('qq:setQuizOptions', { roomCode, largeGroupMode: on, nestedTeams: on });
    if (on) {
      // Mega Event: grid-basierte Add-ons hart aus (Backend erzwingt es beim
      // Start ohnehin — hier für einen sauberen, konsistenten UI-Zustand).
      emit('qq:setQuizOptions', { roomCode, comebackEnabled: false, cozyGamesEnabled: false });
      emit('qq:setFinalWagerEnabled', { roomCode, enabled: false });
    }
  };
  const setLang = (lang: 'de' | 'en' | 'both') => emit('qq:setLanguage', { roomCode, language: lang });
  const setTheme = (themeId: string) => emit('qq:setTheme', { roomCode, themeId });
  const setComeback = (on: boolean) => emit('qq:setQuizOptions', { roomCode, comebackEnabled: on });
  const setCozy = (on: boolean) => emit('qq:setQuizOptions', { roomCode, cozyGamesEnabled: on });
  const setWager = (on: boolean) => emit('qq:setFinalWagerEnabled', { roomCode, enabled: on });

  const selDraft = drafts.find(d => d.id === selectedDraftId) ?? null;
  const draftMax = selDraft ? (selDraft.phases ?? (selDraft.questionCount >= 20 ? 4 : selDraft.questionCount >= 15 ? 3 : 2)) : 4;

  const cur = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div style={ov.backdrop} onClick={onClose}>
      <div style={ov.panel} onClick={e => e.stopPropagation()}>
        {/* Kopf: Fortschritt */}
        <div style={ov.head}>
          <div style={ov.stepDots}>
            {STEPS.map((st, i) => (
              <div key={st.key} style={{
                ...ov.dot,
                background: i === step ? ACCENT : i < step ? '#22C55E' : 'rgba(255,255,255,0.14)',
                width: i === step ? 26 : 10,
              }} title={st.title} />
            ))}
          </div>
          <button onClick={onClose} style={ov.closeX} title="Zum Schnell-Setup (Pills)">✕</button>
        </div>

        <div style={ov.stepTitle}>
          <span style={{ fontSize: 30 }}>{cur.emoji}</span>
          <span>{step + 1}. {cur.title}</span>
        </div>

        {/* ── Schritt-Inhalt ──────────────────────────────────────────────── */}
        <div style={ov.body}>
          {cur.key === 'group' && (
            <div style={ov.cardRow}>
              <BigCard
                active={!mega}
                accent={ACCENT}
                onClick={() => setMega(false)}
                title="Normal"
                sub="bis 8 Teams · Grid, Klauen & Stapeln"
                note="Das klassische CozyQuiz-Erlebnis."
              />
              <BigCard
                active={mega}
                accent={VIOLET}
                onClick={() => setMega(true)}
                title="Mega Event"
                sub="8 Farben × bis 3 Handys · bis 72 Personen"
                note="Bar-Race statt Grid. Grid-Add-ons werden automatisch deaktiviert."
              />
            </div>
          )}

          {cur.key === 'rounds' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <div style={{ display: 'flex', gap: 14 }}>
                {([2, 3, 4] as const).map(n => {
                  const tooBig = selDraft ? n > draftMax : false;
                  return (
                    <button key={n} disabled={tooBig}
                      onClick={() => setPhases(n)}
                      style={{ ...ov.roundBtn, ...(phases === n ? ov.roundBtnActive : {}), opacity: tooBig ? 0.3 : 1, cursor: tooBig ? 'not-allowed' : 'pointer' }}>
                      {n}
                    </button>
                  );
                })}
              </div>
              <div style={ov.hint}>
                {selDraft
                  ? `„${selDraft.title}" reicht für max. ${draftMax} Runden (${selDraft.questionCount} Fragen).`
                  : 'Wähle gleich noch einen Fragensatz — die max. Rundenzahl richtet sich danach.'}
              </div>
            </div>
          )}

          {cur.key === 'lang' && (
            <div style={ov.cardRow}>
              {(['de', 'en', 'both'] as const).map(lang => (
                <BigCard key={lang}
                  active={s?.language === lang}
                  accent={ACCENT}
                  onClick={() => setLang(lang)}
                  title={lang === 'de' ? '🇩🇪 Deutsch' : lang === 'en' ? '🇬🇧 English' : '🌐 Beide'}
                  sub={lang === 'both' ? 'im Wechsel' : ''}
                />
              ))}
            </div>
          )}

          {cur.key === 'addons' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 560 }}>
              {mega && (
                <div style={ov.megaNote}>
                  Im Mega Event laufen Comeback, Final-Tipp & CozyGames nicht (grid-basiert) — automatisch aus.
                </div>
              )}
              <ToggleRow label="🔄 Comeback" desc="Letztes Team klaut via Mehr-oder-Weniger"
                on={!mega && (s?.comebackEnabled !== false)} disabled={mega}
                onToggle={v => setComeback(v)} />
              <ToggleRow label="🪙 Final-Tipp" desc="Wett-Phase vor der Final-Runde"
                on={!mega && !!s?.finalWagerEnabled} disabled={mega}
                onToggle={v => setWager(v)} />
              <ToggleRow label="🪅 CozyGames" desc="Analoge Mini-Spiele zwischen Runden"
                on={!mega && !!s?.cozyGamesEnabled} disabled={mega}
                onToggle={v => setCozy(v)} />
            </div>
          )}

          {cur.key === 'draft' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 620 }}>
              {mega && (
                <div style={ov.megaNote}>
                  Tipp: Hot-Potato-Fragen laufen im Mega Event als normale Fragen. Für den saubersten Ablauf einen Draft ohne Hot Potato wählen.
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10, maxHeight: 320, overflowY: 'auto' }}>
                {drafts.length === 0 && <div style={ov.hint}>Keine Fragensätze gefunden.</div>}
                {drafts.map(d => {
                  const sel = d.id === selectedDraftId;
                  const fit = d.questionCount >= phases * 5;
                  return (
                    <button key={d.id} onClick={() => setSelectedDraftId(d.id)}
                      style={{ ...ov.draftCard, ...(sel ? ov.draftCardActive : {}) }}>
                      <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 4 }}>{d.title}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, opacity: 0.75 }}>
                        <span>{d.questionCount} Fragen</span>
                        <span style={{ color: fit ? '#22C55E' : '#F59E0B', fontWeight: 800 }}>
                          {fit ? `✓ ${phases} Rd.` : `⚠ max ${Math.floor(d.questionCount / 5)} Rd.`}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {cur.key === 'theme' && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', maxWidth: 620 }}>
              {Object.values(QQ_THEMES).map((t: any) => (
                <button key={t.id} onClick={() => setTheme(t.id)}
                  style={{ ...ov.themeCard, ...((s?.themeId ?? 'cozy') === t.id ? ov.themeCardActive : {}) }}>
                  {t.label}
                </button>
              ))}
            </div>
          )}

          {cur.key === 'done' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 460 }}>
              <SummaryRow label="Modus" value={mega ? '👥 Mega Event (8×3, Bar-Race)' : 'Normal (Grid)'} />
              <SummaryRow label="Runden" value={String(phases)} />
              <SummaryRow label="Sprache" value={s?.language === 'de' ? 'Deutsch' : s?.language === 'en' ? 'English' : 'Beide'} />
              <SummaryRow label="Fragensatz" value={selDraft?.title ?? '— noch keiner gewählt —'} />
              <SummaryRow label="Add-ons" value={mega ? 'keine (Mega Event)' : [
                (s?.comebackEnabled !== false) ? 'Comeback' : null,
                s?.finalWagerEnabled ? 'Final-Tipp' : null,
                s?.cozyGamesEnabled ? 'CozyGames' : null,
              ].filter(Boolean).join(', ') || 'keine'} />
              <SummaryRow label="Design" value={(Object.values(QQ_THEMES).find((t: any) => t.id === (s?.themeId ?? 'cozy')) as any)?.label ?? 'Cozy'} />
              <div style={{ ...ov.hint, marginTop: 6 }}>
                Alles gesetzt. „Setup abschließen" → die Teams können beitreten, dann startest du wie gewohnt.
              </div>
            </div>
          )}
        </div>

        {/* Fuß: Navigation */}
        <div style={ov.foot}>
          <button onClick={() => setStep(s2 => Math.max(0, s2 - 1))}
            disabled={step === 0}
            style={{ ...ov.navBtn, opacity: step === 0 ? 0.35 : 1, cursor: step === 0 ? 'default' : 'pointer' }}>
            ← Zurück
          </button>
          {isLast ? (
            <button onClick={() => { finishSetup?.(); onClose(); }} style={{ ...ov.navBtn, ...ov.navPrimary }}>Setup abschließen →</button>
          ) : (
            <button onClick={() => setStep(s2 => Math.min(STEPS.length - 1, s2 + 1))}
              style={{ ...ov.navBtn, ...ov.navPrimary }}>Weiter →</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-Komponenten ──────────────────────────────────────────────────────────
function BigCard({ active, accent, onClick, title, sub, note }: {
  active: boolean; accent: string; onClick: () => void; title: string; sub?: string; note?: string;
}) {
  return (
    <button onClick={onClick} style={{
      flex: 1, minWidth: 180, padding: '22px 20px', borderRadius: 18, cursor: 'pointer',
      textAlign: 'left', color: '#fff', fontFamily: 'inherit',
      background: active ? `linear-gradient(160deg, ${accent}44, ${accent}18)` : 'rgba(255,255,255,0.04)',
      border: active ? `2px solid ${accent}` : '2px solid rgba(255,255,255,0.09)',
      boxShadow: active ? `0 0 26px ${accent}55` : 'none', transition: 'all 0.15s',
    }}>
      <div style={{ fontSize: 22, fontWeight: 900, marginBottom: sub ? 4 : 0 }}>{title}</div>
      {sub && <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.8 }}>{sub}</div>}
      {note && <div style={{ fontSize: 12, opacity: 0.55, marginTop: 8, lineHeight: 1.3 }}>{note}</div>}
    </button>
  );
}

function ToggleRow({ label, desc, on, disabled, onToggle }: {
  label: string; desc: string; on: boolean; disabled?: boolean; onToggle: (v: boolean) => void;
}) {
  return (
    <button onClick={() => !disabled && onToggle(!on)} disabled={disabled}
      style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderRadius: 14,
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
        cursor: disabled ? 'not-allowed' : 'pointer', color: '#fff', fontFamily: 'inherit',
        opacity: disabled ? 0.4 : 1, textAlign: 'left', width: '100%',
      }}>
      <div style={{
        width: 46, height: 27, borderRadius: 999, flexShrink: 0, position: 'relative',
        background: on ? '#22C55E' : 'rgba(255,255,255,0.16)', transition: 'background 0.2s',
      }}>
        <div style={{
          position: 'absolute', top: 3, left: on ? 22 : 3, width: 21, height: 21, borderRadius: '50%',
          background: '#fff', transition: 'left 0.2s',
        }} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 900, fontSize: 15 }}>{label}</div>
        <div style={{ fontSize: 12, opacity: 0.6 }}>{desc}</div>
      </div>
    </button>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.04)' }}>
      <span style={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.55 }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 800, color: '#fff', textAlign: 'right' }}>{value}</span>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const ov: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(5,4,10,0.72)',
    backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  panel: {
    width: 'min(760px, 96vw)', maxHeight: '92vh', display: 'flex', flexDirection: 'column',
    background: 'radial-gradient(ellipse at 50% -10%, rgba(236,72,153,0.14), transparent 55%), #12101c',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24,
    boxShadow: '0 24px 80px rgba(0,0,0,0.7)', color: '#f4f6ff', fontFamily: "'Nunito', system-ui, sans-serif",
    padding: '20px 26px 22px',
  },
  head: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 },
  stepDots: { display: 'flex', alignItems: 'center', gap: 7, flex: 1 },
  dot: { height: 10, borderRadius: 999, transition: 'all 0.25s' },
  closeX: { background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 20, cursor: 'pointer', fontWeight: 900 },
  stepTitle: { display: 'flex', alignItems: 'center', gap: 12, fontSize: 26, fontWeight: 900, marginBottom: 18 },
  body: { flex: 1, minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', overflowY: 'auto' },
  cardRow: { display: 'flex', gap: 14, width: '100%', flexWrap: 'wrap', justifyContent: 'center' },
  hint: { fontSize: 13, opacity: 0.6, textAlign: 'center', lineHeight: 1.4, maxWidth: 480 },
  megaNote: {
    fontSize: 13, fontWeight: 700, color: '#ddd', padding: '10px 14px', borderRadius: 12,
    background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.35)', lineHeight: 1.4,
  },
  roundBtn: {
    width: 72, height: 72, borderRadius: 18, fontSize: 30, fontWeight: 900, fontFamily: 'inherit',
    background: 'rgba(255,255,255,0.05)', border: '2px solid rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer',
  },
  roundBtnActive: { background: `linear-gradient(160deg, ${ACCENT}55, ${ACCENT}22)`, border: `2px solid ${ACCENT}`, boxShadow: `0 0 24px ${ACCENT}55` },
  draftCard: {
    padding: '12px 14px', borderRadius: 12, textAlign: 'left', cursor: 'pointer', color: '#fff', fontFamily: 'inherit',
    background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.09)',
  },
  draftCardActive: { background: `linear-gradient(160deg, ${ACCENT}33, ${ACCENT}12)`, border: `1.5px solid ${ACCENT}`, boxShadow: `0 0 18px ${ACCENT}44` },
  themeCard: {
    padding: '14px 22px', borderRadius: 14, fontSize: 16, fontWeight: 900, cursor: 'pointer', color: '#fff', fontFamily: 'inherit',
    background: 'rgba(255,255,255,0.05)', border: '2px solid rgba(255,255,255,0.1)',
  },
  themeCardActive: { background: `linear-gradient(160deg, ${ACCENT}44, ${ACCENT}18)`, border: `2px solid ${ACCENT}`, boxShadow: `0 0 24px ${ACCENT}55` },
  foot: { display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 18 },
  navBtn: {
    padding: '11px 24px', borderRadius: 12, fontSize: 15, fontWeight: 900, fontFamily: 'inherit',
    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff',
  },
  navPrimary: { background: ACCENT, color: '#1a0a14', border: 'none', boxShadow: `0 4px 18px ${ACCENT}66` },
};
