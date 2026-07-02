// QQSchedulePreview — Runden-Vorschau (welche Kategorien in welcher Runde).
// 2026-07-02 aus QQModeratorPage.SetupView ausgelagert, damit der Setup-Wizard
// (QQSetupWizard) sie ohne Zirkular-Import mitnutzen kann.
import { useState, useEffect } from 'react';
import { QQ_COLORS } from '../../../shared/qqColors';

export function QQSchedulePreview({ draftId, phases }: { draftId: string; phases: 2 | 3 | 4 }) {
  const [questions, setQuestions] = useState<any[] | null>(null);
  useEffect(() => {
    if (!draftId) return;
    let cancelled = false;
    fetch(`/api/qq/drafts/${encodeURIComponent(draftId)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (!cancelled && d?.questions) setQuestions(d.questions); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [draftId]);
  if (!questions) return null;
  // Pro Phase 1..N die Fragen extrahieren
  const byPhase: Record<number, any[]> = {};
  for (const q of questions) {
    const p = q.phaseIndex;
    if (p < 1 || p > phases) continue;
    if (!byPhase[p]) byPhase[p] = [];
    byPhase[p].push(q);
  }
  const CAT_EMOJI: Record<string, string> = {
    SCHAETZCHEN: '🎯', MUCHO: '🅰️', BUNTE_TUETE: '🎁',
    ZEHN_VON_ZEHN: '🎰', CHEESE: '📸',
  };
  const SUB_EMOJI: Record<string, string> = {
    onlyConnect: '🧩', bluff: '🎭', hotPotato: '🔥',
    top5: '🏆', oneOfEight: '🕵️', order: '📋', map: '🗺️',
  };
  return (
    <div style={{
      padding: '14px 18px', borderRadius: 16,
      background: 'linear-gradient(180deg, rgba(255,235,200,0.04), rgba(255,235,200,0.012))',
      border: '1px solid rgba(255,220,180,0.10)',
      boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
    }}>
      <div style={{
        fontSize: 11, fontWeight: 900, color: '#6b6555',
        letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10,
      }}>🗺 Schedule-Vorschau</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {Array.from({ length: phases }, (_, i) => i + 1).map(p => {
          const entries = byPhase[p] ?? [];
          return (
            <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                fontSize: 11, fontWeight: 900, color: QQ_COLORS.yellow300,
                minWidth: 70, letterSpacing: '0.04em',
              }}>Runde {p}</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {entries.map((q, i) => {
                  const isBT = q.category === 'BUNTE_TUETE';
                  const sub = isBT ? q.bunteTuete?.kind : null;
                  const emoji = isBT && sub ? (SUB_EMOJI[sub] ?? '🎁') : (CAT_EMOJI[q.category] ?? '?');
                  const tip = isBT && sub
                    ? `${q.category} (${sub})`
                    : q.category;
                  return (
                    <span key={i} title={tip} style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: 28, height: 28, borderRadius: 8,
                      background: 'rgba(255,235,200,0.06)',
                      border: '1px solid rgba(255,220,180,0.14)',
                      fontSize: 16,
                    }}>{emoji}</span>
                  );
                })}
                {entries.length === 0 && (
                  <span style={{ fontSize: 11, color: '#6b6555', fontStyle: 'italic' }}>— keine Fragen —</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
