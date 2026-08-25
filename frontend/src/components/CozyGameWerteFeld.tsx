/**
 * CozyGameWerteFeld — die Werte-Eingabe im Steuerpult.
 *
 * 2026-08-25 (Wolf: „bei den meisten cozygames sollte ein wert eingetragen
 * werden koennen ... anhand der werte wird dann auch der sieger entschieden").
 *
 * Zwei Wege, ein Aussehen:
 *   gleichzeitige Spiele → die Teams tippen am Handy, hier laufen die Zahlen
 *     ein und Wolf kann jede korrigieren (`offen` = true).
 *   Reihum-Spiele → Wolf tippt selbst, weil der ganze Raum den Versuch
 *     gesehen hat und eine Selbstauskunft dort Streit erzeugt.
 *
 * Absichtlich KEIN Rang und keine Sortierung in dieser Ansicht: die steht auf
 * der Buehne, und wenn sich die Reihenfolge unter Wolfs Fingern verschiebt,
 * tippt er in das falsche Feld.
 */
import { useEffect, useState } from 'react';

interface TeamLite {
  id: string;
  name: string;
  color: string;
  emoji?: string;
}

export function CozyGameWerteFeld({ teamList, werte, offen, onSet, onFertig }: {
  teamList: TeamLite[];
  werte: Record<string, number | null>;
  offen: boolean;
  onSet: (teamId: string, value: number | null) => void;
  onFertig: () => void;
}) {
  // Eigener Tipp-Zustand pro Feld, damit ein halb getipptes „1" nicht bei
  // jedem Broadcast wieder auf den Serverwert zurueckspringt.
  const [entwurf, setEntwurf] = useState<Record<string, string>>({});

  useEffect(() => {
    // Wenn von aussen ein Wert kommt (Handy), das Feld nachziehen - aber nur,
    // solange Wolf dort gerade nicht selbst tippt.
    setEntwurf(prev => {
      const next = { ...prev };
      for (const t of teamList) {
        if (next[t.id] === undefined) next[t.id] = werte[t.id] == null ? '' : String(werte[t.id]);
      }
      return next;
    });
  }, [teamList, werte]);

  const schicke = (id: string, roh: string) => {
    const s = roh.replace(',', '.').trim();
    if (s === '') { onSet(id, null); return; }
    const n = Number(s);
    if (Number.isFinite(n)) onSet(id, n);
  };

  const gefuellt = teamList.filter(t => (werte[t.id] ?? null) !== null).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
      <div style={{ fontSize: 13, color: '#94a3b8', fontWeight: 800 }}>
        {offen
          ? `Teams tippen am Handy · ${gefuellt}/${teamList.length} da · du kannst korrigieren`
          : `Werte eintragen · ${gefuellt}/${teamList.length}`}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 8 }}>
        {teamList.map(t => (
          <label key={t.id} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 10px', borderRadius: 12,
            background: 'rgba(148,163,184,0.08)',
            borderLeft: `4px solid ${t.color}`,
          }}>
            <span aria-hidden style={{ fontSize: 18 }}>{t.emoji ?? '•'}</span>
            <span style={{
              flex: 1, minWidth: 0, fontSize: 13, fontWeight: 800, color: '#e2e8f0',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }} title={t.name}>{t.name}</span>
            <input
              inputMode="decimal"
              value={entwurf[t.id] ?? ''}
              onChange={e => {
                const v = e.target.value;
                setEntwurf(prev => ({ ...prev, [t.id]: v }));
                schicke(t.id, v);
              }}
              placeholder="—"
              style={{
                width: 72, padding: '5px 8px', borderRadius: 8,
                border: '1px solid rgba(148,163,184,0.35)',
                background: '#0f172a', color: '#f8fafc',
                fontWeight: 900, fontSize: 15, textAlign: 'right',
                fontVariantNumeric: 'tabular-nums',
              }}
            />
          </label>
        ))}
      </div>
      <button
        onClick={onFertig}
        style={{
          alignSelf: 'flex-start', padding: '9px 22px', borderRadius: 12, border: 'none',
          cursor: 'pointer', fontFamily: 'inherit', fontWeight: 900, fontSize: 15,
          color: '#fff', background: 'linear-gradient(135deg, #22C55E, #16A34A)',
        }}
      >
        ▶ Werte bestätigen
      </button>
    </div>
  );
}
