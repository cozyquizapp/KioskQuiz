import { useEffect, useMemo, useState } from 'react';
import type { CozyGame } from '@shared/cozyGameTypes';
import {
  COZY_GAME_SETTING_LABELS,
  COZY_GAME_NOISE_LABELS,
  COZY_GAME_MATERIAL_TAGS_V1,
} from '@shared/cozyGameTypes';

// 2026-05-17 (Wolf-Feature CozyGames): Setup-Modal im Builder.
// Aktiviert CozyGames pro Quiz + erlaubt Wolf die Spiele-Auswahl (max 8 fürs Rad).
// Material-Tag-Filter hilft beim Eingrenzen ("heute hab ich Stäbchen + Becher dabei").

const COZY_PINK = '#EC4899';
const COZY_MAGENTA = '#A21247';
const MAX_POOL_SIZE = 8;

export interface CozyGamesSetupModalProps {
  initialEnabled: boolean;
  initialPool: string[];                  // Spiel-IDs
  onSave: (enabled: boolean, pool: string[]) => void;
  onClose: () => void;
}

export function CozyGamesSetupModal({ initialEnabled, initialPool, onSave, onClose }: CozyGamesSetupModalProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pool, setPool] = useState<string[]>(initialPool);
  const [games, setGames] = useState<CozyGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/cozygames');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: CozyGame[] = await res.json();
        if (cancelled) return;
        setGames(data.filter(g => !g.archived));
      } catch (err: any) {
        if (!cancelled) setError(err?.message ?? 'Lade-Fehler');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const allTags = useMemo(() => {
    const set = new Set<string>(COZY_GAME_MATERIAL_TAGS_V1);
    for (const g of games) for (const t of g.materialTags) set.add(t);
    return Array.from(set).sort();
  }, [games]);

  const filteredGames = useMemo(() => {
    if (tagFilter.length === 0) return games;
    return games.filter(g => tagFilter.every(t => g.materialTags.includes(t)));
  }, [games, tagFilter]);

  function toggleGame(id: string) {
    const has = pool.includes(id);
    if (has) {
      setPool(pool.filter(x => x !== id));
    } else {
      if (pool.length >= MAX_POOL_SIZE) {
        alert(`Max ${MAX_POOL_SIZE} Spiele fürs Rad — bitte zuerst eines abwählen.`);
        return;
      }
      setPool([...pool, id]);
    }
  }

  function toggleTag(t: string) {
    setTagFilter(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  }

  function randomEight() {
    const shuffled = [...games].sort(() => Math.random() - 0.5);
    setPool(shuffled.slice(0, MAX_POOL_SIZE).map(g => g.id));
  }

  function clearPool() {
    setPool([]);
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        background: '#0F1736',
        color: '#e2e8f0',
        borderRadius: 16,
        padding: '24px 28px',
        maxWidth: 720, width: '100%',
        maxHeight: '85vh', overflowY: 'auto',
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <span style={{ fontSize: 28 }}>🎯</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 900 }}>CozyGames Setup</div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>
              Mini-Spiele nach Runde 1 + als Final-Kategorie-Slot
            </div>
          </div>
        </header>

        {/* Master-Toggle */}
        <label style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 14px',
          background: enabled ? `${COZY_PINK}22` : 'rgba(255,255,255,0.04)',
          border: `1px solid ${enabled ? COZY_PINK : 'rgba(255,255,255,0.10)'}`,
          borderRadius: 12,
          marginBottom: 16,
          cursor: 'pointer',
        }}>
          <input
            type="checkbox"
            checked={enabled}
            onChange={e => setEnabled(e.target.checked)}
            style={{ accentColor: COZY_PINK, width: 18, height: 18 }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 15 }}>CozyGames aktivieren</div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>
              Nach Runde 1 läuft das Glücksrad → ein zufällig gewähltes Mini-Spiel wird gespielt → Sieger setzt 1 Aktion.
            </div>
          </div>
        </label>

        {enabled && (
          <>
            {/* Pool-Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{
                fontSize: 13, fontWeight: 700,
                padding: '6px 12px',
                borderRadius: 999,
                background: pool.length === 0 ? 'rgba(239,68,68,0.2)' : pool.length >= 3 ? 'rgba(34,197,94,0.2)' : `${COZY_PINK}33`,
                color: pool.length === 0 ? '#fca5a5' : pool.length >= 3 ? '#86efac' : '#fce7f3',
              }}>
                {pool.length} / {MAX_POOL_SIZE} im Rad
              </div>
              <div style={{ flex: 1, fontSize: 11, color: '#64748b' }}>
                {pool.length === 0 && '⚠️ Mindestens 1 Spiel auswählen'}
                {pool.length === 1 && '↳ Rad zeigt direkte Reveal-Card statt Spin (≤3 Slices)'}
                {pool.length === 2 && '↳ Rad zeigt direkte Reveal-Card statt Spin (≤3 Slices)'}
                {pool.length === 3 && '↳ Rad zeigt direkte Reveal-Card statt Spin (≤3 Slices)'}
                {pool.length >= 4 && '↳ Vollwertiger Spin'}
              </div>
              <button
                onClick={randomEight}
                style={btnSmall(COZY_PINK)}
                disabled={games.length === 0}
                title="Zufällige 8 Spiele auswählen"
              >🎯 Zufällige 8</button>
              <button
                onClick={clearPool}
                style={btnSmallGhost()}
                disabled={pool.length === 0}
              >Leeren</button>
            </div>

            {/* Material-Tag-Filter */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Material-Filter ({tagFilter.length} aktiv) — was hast du heute dabei?
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {allTags.map(t => {
                  const active = tagFilter.includes(t);
                  return (
                    <button
                      key={t}
                      onClick={() => toggleTag(t)}
                      style={{
                        padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                        border: `1px solid ${active ? COZY_PINK : 'rgba(255,255,255,0.12)'}`,
                        background: active ? `${COZY_PINK}33` : 'transparent',
                        color: active ? '#fff' : '#94a3b8',
                        cursor: 'pointer',
                      }}
                    >{t}</button>
                  );
                })}
                {tagFilter.length > 0 && (
                  <button
                    onClick={() => setTagFilter([])}
                    style={{
                      padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                      border: '1px solid rgba(255,255,255,0.12)',
                      background: 'transparent', color: '#94a3b8', cursor: 'pointer',
                    }}
                  >Filter weg</button>
                )}
              </div>
            </div>

            {/* Liste */}
            {loading && <div style={{ padding: 20, color: '#64748b' }}>Lade Spiele…</div>}
            {error && <div style={{ padding: 12, color: '#fca5a5', fontSize: 13 }}>Fehler: {error}</div>}
            {!loading && filteredGames.length === 0 && (
              <div style={{ padding: 20, color: '#64748b', fontSize: 13 }}>
                Keine Spiele passend zum Filter. Filter anpassen oder weniger Tags wählen.
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: '40vh', overflowY: 'auto' }}>
              {filteredGames.map(g => {
                const selected = pool.includes(g.id);
                return (
                  <button
                    key={g.id}
                    onClick={() => toggleGame(g.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 12px', borderRadius: 10,
                      border: `1px solid ${selected ? COZY_PINK : 'rgba(255,255,255,0.08)'}`,
                      background: selected ? `${COZY_PINK}1a` : 'rgba(255,255,255,0.02)',
                      color: '#e2e8f0', textAlign: 'left', cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => {}}
                      style={{ accentColor: COZY_PINK, pointerEvents: 'none' }}
                    />
                    <span style={{ fontSize: 22, flexShrink: 0 }}>{g.emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{g.name}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <span>{COZY_GAME_SETTING_LABELS[g.setting]?.emoji}</span>
                        <span>{COZY_GAME_NOISE_LABELS[g.noiseLevel]?.emoji}</span>
                        {g.materialTags.length > 0 && (
                          <span>· {g.materialTags.slice(0, 3).join(' · ')}{g.materialTags.length > 3 ? ` +${g.materialTags.length - 3}` : ''}</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={onClose} style={btnSmallGhost()}>Abbrechen</button>
          <button
            onClick={() => {
              if (enabled && pool.length === 0) {
                const ok = window.confirm('Kein Spiel ausgewählt — CozyGames werden bei aktivem Toggle nicht abspielbar sein. Trotzdem speichern?');
                if (!ok) return;
              }
              onSave(enabled, pool);
            }}
            style={{
              padding: '10px 20px', borderRadius: 10, border: 'none',
              background: COZY_PINK, color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer',
              boxShadow: `0 4px 14px ${COZY_PINK}66`,
            }}
          >Speichern</button>
        </div>
      </div>
    </div>
  );
}

function btnSmall(color: string): React.CSSProperties {
  return {
    padding: '6px 12px', borderRadius: 8, border: `1px solid ${color}`,
    background: `${color}22`, color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer',
  };
}

function btnSmallGhost(): React.CSSProperties {
  return {
    padding: '6px 12px', borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'transparent', color: '#94a3b8', fontWeight: 700, fontSize: 12, cursor: 'pointer',
  };
}
