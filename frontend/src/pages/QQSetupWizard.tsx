/**
 * QQSetupWizard — geführtes, chronologisches Mod-Setup (Wolf 2026-07-02).
 *
 * DAS Haupt-Setup („ich will den wizard als main setup, dafür muss aber alles
 * rein"). Führt Schritt für Schritt durch ALLE Einstellungen, die sonst im
 * Pill-/Advanced-Setup verstreut sind:
 *   1 Gruppengröße (Normal / Mega Event)
 *   2 Runden & Timer
 *   3 Sprache & Avatar-Set
 *   4 Add-ons (Comeback / Final-Tipp / CozyGames) + Reihenfolge + Comeback-Timer
 *   5 Fragensatz (+ Schedule-Vorschau)
 *   6 Design (Theme)
 *   7 Sound (Musik / SFX / Lautstärke / Custom-Sounds / Wartung)
 *   8 Fertig (Zusammenfassung)
 *
 * Alle Einstellungen werden LIVE über dieselben Kanäle gesetzt, die auch die
 * Quick-Pills nutzen (emit qq:setQuizOptions/setLanguage/setTheme/setTimer/…,
 * setPhases, setSelectedDraftId) — kein separater Speicher-Schritt, nichts am
 * bestehenden Start-Flow verändert. Der Wizard ist nur eine geführte Hülle.
 */
import { useState, useEffect } from 'react';
import { QQ_THEMES } from '../qqTheme';
import { AVATAR_SETS } from '../avatarSets';
import { QQSoundPanel } from '../components/QQSoundPanel';
import { QQSchedulePreview } from '../components/QQSchedulePreview';
import type { QQSoundConfig } from '../../../shared/quarterQuizTypes';

type EmitFn = (event: string, payload: unknown) => Promise<{ ok: boolean; error?: string }>;

interface DraftSummary { id: string; title: string; questionCount: number; phases?: number; megaWarnCount?: number }

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
  /** Timer-Eingabe im Parent spiegeln (LobbyView-Anzeige). */
  setTimerInput?: (sec: number) => void;
  /** Lokale SoundConfig im Parent spiegeln (Live-Preview). */
  setLocalSoundConfig?: (cfg: QQSoundConfig) => void;
}

const STEPS = [
  { key: 'group', emoji: '👥', title: 'Gruppengröße' },
  { key: 'rounds', emoji: '🎮', title: 'Runden & Timer' },
  { key: 'lang', emoji: '🌐', title: 'Sprache & Avatare' },
  { key: 'addons', emoji: '🧩', title: 'Add-ons' },
  { key: 'draft', emoji: '📋', title: 'Fragensatz' },
  { key: 'theme', emoji: '🎨', title: 'Design' },
  { key: 'sound', emoji: '🔊', title: 'Sound' },
  { key: 'done', emoji: '✅', title: 'Bereit' },
] as const;

const ACCENT = '#EC4899';
const VIOLET = '#A78BFA';
const TIMERS = [15, 30, 45, 60, 90] as const;

export function QQSetupWizard({ roomCode, s, emit, phases, setPhases, selectedDraftId, setSelectedDraftId, drafts, onClose, finishSetup, setTimerInput, setLocalSoundConfig }: Props) {
  const [step, setStep] = useState(0);
  const mega = !!s?.largeGroupMode;

  // ── Setter (live, wie die Quick-Pills) ────────────────────────────────────
  const setMega = (on: boolean) => {
    // formatSelected: true → Beamer verlässt den neutralen Welcome und zeigt die
    // format-spezifische Pre-Game-Ansicht (Cozy-Grid-Regeln bzw. Mega-Faktionen).
    emit('qq:setQuizOptions', { roomCode, largeGroupMode: on, nestedTeams: on, formatSelected: true });
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
  const setTimer = (sec: number) => { emit('qq:setTimer', { roomCode, durationSec: sec }); setTimerInput?.(sec); };
  const setAvatarSet = (id: string) => emit('qq:setAvatarSet', { roomCode, avatarSetId: id });
  const setShuffle = (on: boolean) => emit('qq:setQuizOptions', { roomCode, shuffleQuestionsInRound: on });
  const setComebackTimer = (sec: number) => emit('qq:comebackHLTimer', { roomCode, seconds: sec });

  const selDraft = drafts.find(d => d.id === selectedDraftId) ?? null;
  const draftMax = selDraft ? (selDraft.phases ?? (selDraft.questionCount >= 20 ? 4 : selDraft.questionCount >= 15 ? 3 : 2)) : 4;
  const qqDraftId = selectedDraftId ? (selectedDraftId.startsWith('qq:') ? selectedDraftId.slice(3) : selectedDraftId) : '';
  const fitOK = selDraft ? selDraft.questionCount >= phases * 5 : false;

  // ── Custom-Sounds pro Draft (fetch + persist) ─────────────────────────────
  const [draftSoundConfig, setDraftSoundConfig] = useState<QQSoundConfig>({});
  const [customSoundsOpen, setCustomSoundsOpen] = useState(false);
  const [maintOpen, setMaintOpen] = useState(false);
  // Mega Event: Hot-Potato-Drafts standardmäßig ausblenden (Wolf-Wunsch:
  // „drafts mit nicht passenden kategorien automatisch aussortieren").
  const [showUnsuitable, setShowUnsuitable] = useState(false);
  const [savingSound, setSavingSound] = useState(false);
  useEffect(() => {
    if (!qqDraftId) { setDraftSoundConfig({}); return; }
    let cancelled = false;
    fetch(`/api/qq/drafts/${encodeURIComponent(qqDraftId)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (!cancelled && d) setDraftSoundConfig(d.soundConfig ?? {}); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [qqDraftId]);
  async function persistDraftSoundConfig(cfg: QQSoundConfig) {
    if (!qqDraftId) return;
    setSavingSound(true);
    try {
      const res = await fetch(`/api/qq/drafts/${encodeURIComponent(qqDraftId)}`);
      if (!res.ok) return;
      const draft = await res.json();
      draft.soundConfig = cfg;
      await fetch(`/api/qq/drafts/${encodeURIComponent(qqDraftId)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft),
      });
    } finally { setSavingSound(false); }
  }
  async function clearLeaderboard() {
    if (!window.confirm('Wirklich ALLE gespeicherten Spiel-Ergebnisse löschen? Die Bestenliste startet bei 0. Nicht rückgängig zu machen.')) return;
    try {
      const r = await fetch('/api/qq/gameresults', { method: 'DELETE' });
      const d = await r.json();
      alert(d.ok ? `Bestenliste geleert: ${d.deleted ?? 0} Einträge entfernt.` : 'Fehler beim Löschen.');
    } catch { alert('Netzwerkfehler beim Löschen.'); }
  }

  const cur = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const activeAvatarId = s?.avatarSetId ?? 'all';

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
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, width: '100%' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <div style={ov.fieldCap}>🎮 Runden</div>
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

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <div style={ov.fieldCap}>⏱ Timer pro Frage</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {TIMERS.map(t => (
                    <button key={t} onClick={() => setTimer(t)}
                      style={{ ...ov.timerBtn, ...(s?.timerDurationSec === t ? ov.timerBtnActive : {}) }}>
                      {t}s
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {cur.key === 'lang' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, width: '100%' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: '100%' }}>
                <div style={ov.fieldCap}>🌐 Sprache</div>
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
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, width: '100%', maxWidth: 420 }}>
                <div style={ov.fieldCap}>🧑‍🎨 Avatar-Set</div>
                <select value={activeAvatarId}
                  onChange={e => setAvatarSet(e.target.value)}
                  style={ov.select}>
                  {AVATAR_SETS.map(set => (
                    <option key={set.id} value={set.id} style={{ background: '#1f1610', color: '#fff' }}>
                      {set.leadEmoji}  {set.label}
                    </option>
                  ))}
                </select>
                <div style={ov.hint}>Bestimmt, aus welchen Avataren die Spieler wählen.</div>
              </div>
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

              {/* Comeback-Timer — nur relevant wenn Comeback aktiv */}
              {!mega && (s?.comebackEnabled !== false) && (
                <div style={ov.subField}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 900 }}>⚡ Comeback-Timer</span>
                    <input type="number" min={3} max={60}
                      value={s?.comebackHLTimerSec ?? 20}
                      onChange={e => setComebackTimer(Math.max(3, Math.min(60, Number(e.target.value) || 20)))}
                      style={ov.numInput} />
                    <span style={{ fontSize: 12, fontWeight: 900, opacity: 0.6 }}>Sek</span>
                  </div>
                  <div style={{ ...ov.hint, textAlign: 'left' }}>Zeit pro Mehr-oder-Weniger-Runde (3–60 s).</div>
                </div>
              )}

              {/* Reihenfolge */}
              <div style={ov.subField}>
                <div style={{ fontSize: 13, fontWeight: 900, marginBottom: 8 }}>🔀 Reihenfolge der Fragen</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setShuffle(true)}
                    style={{ ...ov.segBtn, ...(s?.shuffleQuestionsInRound !== false ? ov.segBtnActive : {}) }}>Zufällig</button>
                  <button onClick={() => setShuffle(false)}
                    style={{ ...ov.segBtn, ...(s?.shuffleQuestionsInRound === false ? ov.segBtnActive : {}) }}>Aus Draft</button>
                </div>
                <div style={{ ...ov.hint, textAlign: 'left', marginTop: 6 }}>
                  {s?.shuffleQuestionsInRound !== false ? 'Kategorien werden pro Runde gemischt.' : 'Reihenfolge exakt wie im Draft.'}
                </div>
              </div>
            </div>
          )}

          {cur.key === 'draft' && (() => {
            // Mega Event: „unpassende" Drafts = enthalten Hot Potato (rundenbasiert).
            const isUnsuitable = (d: DraftSummary) => mega && (d.megaWarnCount ?? 0) > 0;
            const hiddenCount = mega && !showUnsuitable
              ? drafts.filter(d => isUnsuitable(d) && d.id !== selectedDraftId).length
              : 0;
            // Ausgeblendet werden unpassende Drafts — aber nie der aktuell gewählte.
            const visible = (mega && !showUnsuitable)
              ? drafts.filter(d => !isUnsuitable(d) || d.id === selectedDraftId)
              : drafts;
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 640 }}>
                {mega && (
                  <div style={ov.megaNote}>
                    Mega Event: Drafts mit <strong>Hot Potato</strong> (rundenbasiert) sind {showUnsuitable ? 'eingeblendet' : 'automatisch ausgeblendet'} — für den saubersten Ablauf einen Draft ohne wählen.
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10, maxHeight: 240, overflowY: 'auto' }}>
                  {drafts.length === 0 && <div style={ov.hint}>Keine Fragensätze gefunden.</div>}
                  {visible.length === 0 && drafts.length > 0 && (
                    <div style={ov.hint}>Kein Mega-tauglicher Fragensatz — blende die Hot-Potato-Sätze unten ein.</div>
                  )}
                  {visible.map(d => {
                    const sel = d.id === selectedDraftId;
                    const fit = d.questionCount >= phases * 5;
                    const warn = isUnsuitable(d);
                    return (
                      <button key={d.id} onClick={() => setSelectedDraftId(d.id)}
                        style={{ ...ov.draftCard, ...(sel ? ov.draftCardActive : {}), ...(warn ? { border: '1.5px solid rgba(245,158,11,0.6)' } : {}) }}>
                        <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 4 }}>{d.title}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, opacity: 0.75 }}>
                          <span>{d.questionCount} Fragen</span>
                          <span style={{ color: fit ? '#22C55E' : '#F59E0B', fontWeight: 800 }}>
                            {fit ? `✓ ${phases} Rd.` : `⚠ max ${Math.floor(d.questionCount / 5)} Rd.`}
                          </span>
                        </div>
                        {warn && (
                          <div style={{ marginTop: 6, fontSize: 11, fontWeight: 800, color: '#F59E0B' }}>
                            🥔 {d.megaWarnCount}× Hot Potato — nicht ideal für Mega
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                {mega && (hiddenCount > 0 || showUnsuitable) && (
                  <button onClick={() => setShowUnsuitable(v => !v)}
                    style={{ ...ov.collapseBtn, justifyContent: 'center', gap: 8 }}>
                    {showUnsuitable
                      ? '✓ Nur Mega-taugliche zeigen'
                      : `⚠ ${hiddenCount} Hot-Potato-Satz${hiddenCount === 1 ? '' : 'e'} ausgeblendet — trotzdem zeigen`}
                  </button>
                )}
                {selDraft && fitOK && <QQSchedulePreview draftId={qqDraftId} phases={phases} />}
              </div>
            );
          })()}

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

          {cur.key === 'sound' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%', maxWidth: 520 }}>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button onClick={() => emit('qq:setMusicMuted', { roomCode, muted: !s?.musicMuted })}
                  style={{ ...ov.soundBtn, ...(!s?.musicMuted ? ov.soundBtnActive : {}) }}>
                  {s?.musicMuted ? '🔇 Musik aus' : '🎵 Musik an'}
                </button>
                <button onClick={() => emit('qq:setSfxMuted', { roomCode, muted: !s?.sfxMuted })}
                  style={{ ...ov.soundBtn, ...(!s?.sfxMuted ? ov.soundBtnActive : {}) }}>
                  {s?.sfxMuted ? '🔇 SFX aus' : '🔉 SFX an'}
                </button>
              </div>

              <div>
                <div style={ov.fieldCap}>🔊 Gesamt-Lautstärke</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                  <input type="range" min={0} max={100} step={5}
                    value={Math.round((s?.volume ?? 0.8) * 100)}
                    onChange={e => emit('qq:setVolume', { roomCode, volume: Number(e.target.value) / 100 })}
                    style={{ flex: 1, accentColor: ACCENT }} />
                  <span style={{ fontSize: 14, fontWeight: 900, minWidth: 44, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {Math.round((s?.volume ?? 0.8) * 100)}%
                  </span>
                </div>
              </div>

              {/* Custom-Sounds pro Slot (per Draft) */}
              <div>
                <button onClick={() => setCustomSoundsOpen(v => !v)} style={ov.collapseBtn}>
                  <span>🎵 Custom-Sounds pro Slot {savingSound && <span style={{ opacity: 0.6, fontWeight: 700 }}>· speichert…</span>}</span>
                  <span style={{ transition: 'transform 0.2s', transform: customSoundsOpen ? 'rotate(90deg)' : 'none' }}>▶</span>
                </button>
                {customSoundsOpen && (
                  qqDraftId ? (
                    <div style={{ marginTop: 10 }}>
                      <QQSoundPanel config={draftSoundConfig} onChange={cfg => {
                        setDraftSoundConfig(cfg);
                        setLocalSoundConfig?.(cfg);
                        emit('qq:updateSoundConfig', { roomCode, soundConfig: cfg });
                        persistDraftSoundConfig(cfg);
                      }} />
                    </div>
                  ) : <div style={{ ...ov.hint, textAlign: 'left', marginTop: 8 }}>Erst einen Fragensatz wählen (Schritt 5) — Custom-Sounds werden pro Draft gespeichert.</div>
                )}
              </div>

              {/* Wartung */}
              <div>
                <button onClick={() => setMaintOpen(v => !v)} style={ov.collapseBtn}>
                  <span>🧹 Wartung (selten)</span>
                  <span style={{ transition: 'transform 0.2s', transform: maintOpen ? 'rotate(90deg)' : 'none' }}>▶</span>
                </button>
                {maintOpen && (
                  <div style={{ marginTop: 10 }}>
                    <button onClick={clearLeaderboard} style={ov.dangerBtn}>🗑 Bestenliste leeren (Dummy-Daten weg)</button>
                    <div style={{ ...ov.hint, textAlign: 'left', marginTop: 6 }}>Löscht ALLE gespeicherten Spiele → Lobby-/Pause-Rotation startet bei 0.</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {cur.key === 'done' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 460 }}>
              <SummaryRow label="Modus" value={mega ? '👥 Mega Event (8×3, Bar-Race)' : 'Normal (Grid)'} />
              <SummaryRow label="Runden · Timer" value={`${phases} Runden · ${s?.timerDurationSec ?? 30}s`} />
              <SummaryRow label="Sprache" value={s?.language === 'de' ? 'Deutsch' : s?.language === 'en' ? 'English' : 'Beide'} />
              <SummaryRow label="Avatar-Set" value={(AVATAR_SETS.find(a => a.id === activeAvatarId)?.label) ?? 'Standard'} />
              <SummaryRow label="Fragensatz" value={selDraft?.title ?? '— noch keiner gewählt —'} />
              <SummaryRow label="Add-ons" value={mega ? 'keine (Mega Event)' : [
                (s?.comebackEnabled !== false) ? 'Comeback' : null,
                s?.finalWagerEnabled ? 'Final-Tipp' : null,
                s?.cozyGamesEnabled ? 'CozyGames' : null,
              ].filter(Boolean).join(', ') || 'keine'} />
              <SummaryRow label="Design" value={(Object.values(QQ_THEMES).find((t: any) => t.id === (s?.themeId ?? 'cozy')) as any)?.label ?? 'Cozy'} />
              <SummaryRow label="Sound" value={[s?.musicMuted ? 'Musik aus' : 'Musik an', s?.sfxMuted ? 'SFX aus' : 'SFX an', `${Math.round((s?.volume ?? 0.8) * 100)}%`].join(' · ')} />
              {!selDraft && <div style={{ ...ov.hint, marginTop: 6, color: '#F59E0B' }}>Noch kein Fragensatz gewählt — zurück zu Schritt 5.</div>}
              {mega && selDraft && (selDraft.megaWarnCount ?? 0) > 0 && (
                <div style={{ ...ov.hint, marginTop: 6, color: '#F59E0B' }}>
                  🥔 „{selDraft.title}" enthält {selDraft.megaWarnCount}× Hot Potato — läuft im Mega Event als normale Frage (nicht ideal).
                </div>
              )}
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
            <button onClick={() => { finishSetup?.(); onClose(); }}
              disabled={!selDraft}
              style={{ ...ov.navBtn, ...ov.navPrimary, opacity: selDraft ? 1 : 0.4, cursor: selDraft ? 'pointer' : 'not-allowed' }}>
              Setup abschließen →
            </button>
          ) : (
            <button onClick={() => {
                // Schritt 0 verlassen ohne expliziten Klick = Default-Format (Normal)
                // akzeptiert → Beamer verlässt den neutralen Welcome.
                if (step === 0 && !s?.formatSelected) {
                  emit('qq:setQuizOptions', { roomCode, largeGroupMode: mega, nestedTeams: mega, formatSelected: true });
                }
                setStep(s2 => Math.min(STEPS.length - 1, s2 + 1));
              }}
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
  fieldCap: { fontSize: 11, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.55 },
  megaNote: {
    fontSize: 13, fontWeight: 700, color: '#ddd', padding: '10px 14px', borderRadius: 12,
    background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.35)', lineHeight: 1.4,
  },
  subField: {
    padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
  },
  roundBtn: {
    width: 72, height: 72, borderRadius: 18, fontSize: 30, fontWeight: 900, fontFamily: 'inherit',
    background: 'rgba(255,255,255,0.05)', border: '2px solid rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer',
  },
  roundBtnActive: { background: `linear-gradient(160deg, ${ACCENT}55, ${ACCENT}22)`, border: `2px solid ${ACCENT}`, boxShadow: `0 0 24px ${ACCENT}55` },
  timerBtn: {
    padding: '10px 16px', borderRadius: 12, fontSize: 16, fontWeight: 900, fontFamily: 'inherit',
    background: 'rgba(255,255,255,0.05)', border: '2px solid rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer',
  },
  timerBtnActive: { background: `linear-gradient(160deg, ${ACCENT}44, ${ACCENT}18)`, border: `2px solid ${ACCENT}`, boxShadow: `0 0 18px ${ACCENT}44` },
  select: {
    width: '100%', padding: '10px 14px', borderRadius: 12, border: '1.5px solid rgba(255,255,255,0.14)',
    background: 'rgba(0,0,0,0.32)', color: '#fff', fontWeight: 900, fontSize: 14, fontFamily: 'inherit', cursor: 'pointer',
  },
  numInput: {
    width: 70, padding: '8px 10px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.16)',
    background: 'rgba(0,0,0,0.4)', color: '#fff', fontSize: 14, fontWeight: 900, fontFamily: 'inherit',
    fontVariantNumeric: 'tabular-nums', textAlign: 'center',
  },
  segBtn: {
    flex: 1, padding: '10px 14px', borderRadius: 10, fontSize: 14, fontWeight: 900, fontFamily: 'inherit',
    background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer',
  },
  segBtnActive: { background: `linear-gradient(160deg, ${VIOLET}44, ${VIOLET}18)`, border: `1.5px solid ${VIOLET}`, color: '#fff' },
  soundBtn: {
    padding: '12px 20px', borderRadius: 14, fontSize: 15, fontWeight: 900, fontFamily: 'inherit',
    background: 'rgba(255,255,255,0.05)', border: '2px solid rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer',
  },
  soundBtnActive: { background: 'linear-gradient(160deg, rgba(34,197,94,0.3), rgba(34,197,94,0.1))', border: '2px solid #22C55E' },
  collapseBtn: {
    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '11px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontFamily: 'inherit', fontWeight: 900, fontSize: 13, cursor: 'pointer',
  },
  dangerBtn: {
    padding: '10px 16px', borderRadius: 10, fontFamily: 'inherit', fontWeight: 900, fontSize: 13, cursor: 'pointer',
    border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.1)', color: '#fca5a5',
  },
  themeCard: {
    padding: '14px 22px', borderRadius: 14, fontSize: 16, fontWeight: 900, cursor: 'pointer', color: '#fff', fontFamily: 'inherit',
    background: 'rgba(255,255,255,0.05)', border: '2px solid rgba(255,255,255,0.1)',
  },
  themeCardActive: { background: `linear-gradient(160deg, ${ACCENT}44, ${ACCENT}18)`, border: `2px solid ${ACCENT}`, boxShadow: `0 0 24px ${ACCENT}55` },
  draftCard: {
    padding: '12px 14px', borderRadius: 12, textAlign: 'left', cursor: 'pointer', color: '#fff', fontFamily: 'inherit',
    background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.09)',
  },
  draftCardActive: { background: `linear-gradient(160deg, ${ACCENT}33, ${ACCENT}12)`, border: `1.5px solid ${ACCENT}`, boxShadow: `0 0 18px ${ACCENT}44` },
  foot: { display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 18 },
  navBtn: {
    padding: '11px 24px', borderRadius: 12, fontSize: 15, fontWeight: 900, fontFamily: 'inherit',
    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff',
  },
  navPrimary: { background: ACCENT, color: '#1a0a14', border: 'none', boxShadow: `0 4px 18px ${ACCENT}66` },
};
