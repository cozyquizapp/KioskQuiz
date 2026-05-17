import { useState } from 'react';

// 2026-05-17 (P1 #3): Mod-UI für CozyGame-WINNER_SELECT mit Multi-Select.
// Wolf-Spec: bei Tie bekommen beide Sieger eine Aktion. Pro Klick wird ein
// Team toggle-ausgewählt, "Bestätigen" sendet alle markierten IDs. Plus
// "🪅 Random" für Solo-/Bot-Tests.

interface TeamLite {
  id: string;
  name: string;
  color: string;
  emoji?: string;
}

export function CozyGameWinnerPicker({ teamList, onSelect }: {
  teamList: TeamLite[];
  onSelect: (teamIds: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);

  function toggleTeam(id: string) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function handleConfirm() {
    if (selected.length === 0) return;
    onSelect(selected);
    setSelected([]);
  }

  function handleRandom() {
    if (teamList.length === 0) return;
    const winner = teamList[Math.floor(Math.random() * teamList.length)];
    onSelect([winner.id]);
    setSelected([]);
  }

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
      <span style={{ fontSize: 13, color: '#94a3b8', marginRight: 6 }}>
        Sieger {selected.length > 0 ? `(${selected.length})` : '(Tie: mehrere wählbar)'}:
      </span>
      {teamList.map(t => {
        const isSel = selected.includes(t.id);
        return (
          <button
            key={t.id}
            onClick={() => toggleTeam(t.id)}
            style={{
              padding: '6px 12px', borderRadius: 8,
              border: `2px solid ${t.color}`,
              background: isSel ? t.color : `${t.color}22`,
              color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
              boxShadow: isSel ? `0 0 12px ${t.color}aa` : 'none',
              transition: 'all 0.15s',
            }}
          >
            {isSel ? '✓ ' : ''}{t.emoji ?? '🪅'} {t.name}
          </button>
        );
      })}
      <button
        onClick={handleConfirm}
        disabled={selected.length === 0}
        style={{
          padding: '6px 14px', borderRadius: 8, border: 'none',
          background: selected.length > 0 ? '#22C55E' : 'rgba(255,255,255,0.06)',
          color: '#fff', fontWeight: 800, fontSize: 13,
          cursor: selected.length > 0 ? 'pointer' : 'not-allowed',
          opacity: selected.length > 0 ? 1 : 0.5,
          marginLeft: 8,
        }}
      >▶ Bestätigen</button>
      <button
        onClick={handleRandom}
        style={{
          padding: '6px 12px', borderRadius: 8,
          border: '2px dashed rgba(255,255,255,0.25)',
          background: 'rgba(255,255,255,0.04)',
          color: '#94a3b8', fontWeight: 700, fontSize: 13, cursor: 'pointer',
        }}
        title="Random-Sieger für Solo-/Bot-Test"
      >🪅 Random</button>
    </div>
  );
}
