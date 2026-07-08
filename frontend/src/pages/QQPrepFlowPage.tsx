// 2026-07-08 (Wolf-Wunsch „gefuehrter Fahrplan statt Tools verschmelzen"):
// Pro-Quiz-Vorbereitungs-Ablauf. KEIN Wizard-Zwang — jeder Schritt oeffnet nur
// das jeweils passende (frei editierbare) Tool per Deep-Link und zeigt Fortschritt.
// Erreichbar aus „Meine Quizze" → 🧭 Vorbereiten.
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { QQDraft } from '../../../shared/quarterQuizTypes';

const PINK = '#EC4899';

type StepStatus = 'done' | 'partial' | 'todo' | 'optional';

export default function QQPrepFlowPage() {
  const [params] = useSearchParams();
  const draftId = params.get('draft') ?? '';
  const [draft, setDraft] = useState<QQDraft | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');

  useEffect(() => {
    if (!draftId) { setState('error'); return; }
    let cancelled = false;
    fetch(`/api/qq/drafts/${draftId}`)
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(d => { if (!cancelled) { setDraft(d); setState('ok'); } })
      .catch(() => { if (!cancelled) setState('error'); });
    return () => { cancelled = true; };
  }, [draftId]);

  const questions = draft?.questions ?? [];
  const total = questions.length;
  const filled = questions.filter(q => (q.text ?? '').trim().length > 0).length;
  const withAnswer = questions.filter(q => (q.answer ?? '').trim().length > 0).length;
  const cozyOn = !!draft?.cozyGamesEnabled;
  const cozyPool = draft?.cozyGamesPool?.length ?? 0;

  const questionsDone = total > 0 && filled === total && withAnswer === total;

  const steps: Array<{
    n: number; emoji: string; title: string; desc: string;
    status: StepStatus; statusLabel: string; to: string; cta: string;
  }> = [
    {
      n: 1, emoji: '📝', title: 'Fragen schreiben',
      desc: 'Der Builder — hier entstehen alle Fragen & Antworten deines Quiz.',
      status: total === 0 ? 'todo' : questionsDone ? 'done' : 'partial',
      statusLabel: total === 0 ? 'noch leer' : `${filled}/${total} Fragen · ${withAnswer}/${total} mit Antwort`,
      to: `/builder?draft=${draftId}`, cta: 'Builder öffnen',
    },
    {
      n: 2, emoji: '📚', title: 'Aus dem Pool auffüllen',
      desc: 'Fehlt dir Material? Zieh Fragen aus der Library — mit 📍 Ort-Filter für Stammorte, damit sich nichts wiederholt.',
      status: 'optional',
      statusLabel: 'optional',
      to: '/library', cta: 'Library öffnen',
    },
    {
      n: 3, emoji: '🎲', title: 'CozyGames',
      desc: 'Analoge Mini-Spiele als Auflockerungs-Slots. Katalog pflegen & im Builder aktivieren.',
      status: cozyOn ? 'done' : 'optional',
      statusLabel: cozyOn ? `aktiviert · ${cozyPool} im Pool` : 'optional',
      to: '/cozygames', cta: 'CozyGames öffnen',
    },
    {
      n: 4, emoji: '📜', title: 'Regeltexte & Intros',
      desc: 'Spielregel-Folien, Kategorie-Intros und Runden-Hinweise für den Beamer anpassen (lokal pro Gerät gespeichert).',
      status: 'optional',
      statusLabel: 'optional',
      to: '/rules-editor', cta: 'Regeltexte öffnen',
    },
    {
      n: 5, emoji: '🎬', title: 'Show planen',
      desc: 'Pre-Show-Checkliste: Material, Technik, Briefing & grobe Laufzeit — automatisch aus dem Quiz abgeleitet.',
      status: 'optional',
      statusLabel: 'optional',
      to: `/moderator?draft=${draftId}&plan=1`, cta: 'Show-Planer öffnen',
    },
    {
      n: 6, emoji: '📄', title: 'Host-Sheet drucken',
      desc: 'Dein Moderator-Spickzettel als PDF — Fragen, Antworten, Fun-Facts.',
      status: questionsDone ? 'todo' : 'optional',
      statusLabel: questionsDone ? 'bereit zum Drucken' : 'erst Fragen fertig',
      to: '/host-sheets', cta: 'Host-Sheets öffnen',
    },
  ];

  const dotColor: Record<StepStatus, string> = {
    done: '#22C55E', partial: '#F59E0B', todo: PINK, optional: '#64748b',
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: '#e2e8f0', fontFamily: 'var(--font)', padding: '0 0 80px' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '22px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <Link to="/menu" style={{ textDecoration: 'none', color: '#94a3b8', fontSize: 20 }}>←</Link>
        <div>
          <div style={{ fontWeight: 900, fontSize: 20, color: '#f8fafc', lineHeight: 1.1 }}>🧭 Quiz vorbereiten</div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
            {state === 'ok' && draft ? draft.title : 'Fahrplan bis zum fertigen Abend'}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px' }}>
        {state === 'loading' && <div style={{ color: '#64748b', textAlign: 'center', padding: 40 }}>Lädt…</div>}
        {state === 'error' && (
          <div style={{ padding: 20, borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.12)', color: '#94a3b8', textAlign: 'center' }}>
            Kein Quiz gewählt oder Backend offline. Zurück zu <Link to="/menu" style={{ color: PINK }}>Meine Quizze</Link>.
          </div>
        )}
        {state === 'ok' && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {steps.map(step => (
                <div key={step.n} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: 16, borderRadius: 16,
                  background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.09)',
                }}>
                  <div style={{
                    width: 40, height: 40, flexShrink: 0, borderRadius: 12,
                    background: `${dotColor[step.status]}22`, border: `1.5px solid ${dotColor[step.status]}66`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                  }}>{step.emoji}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 900, fontSize: 15.5, color: '#f1f5f9' }}>{step.n}. {step.title}</span>
                      <span style={{
                        fontSize: 10.5, fontWeight: 900, letterSpacing: '0.04em',
                        color: dotColor[step.status], background: `${dotColor[step.status]}18`,
                        border: `1px solid ${dotColor[step.status]}44`, padding: '2px 8px', borderRadius: 999,
                      }}>{step.statusLabel}</span>
                    </div>
                    <div style={{ fontSize: 12.5, color: '#94a3b8', marginTop: 4, lineHeight: 1.45 }}>{step.desc}</div>
                  </div>
                  <Link to={step.to} style={{
                    textDecoration: 'none', flexShrink: 0, whiteSpace: 'nowrap',
                    padding: '9px 14px', borderRadius: 10,
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                    color: '#e2e8f0', fontSize: 13, fontWeight: 800,
                  }}>{step.cta} →</Link>
                </div>
              ))}
            </div>

            {/* Abschluss: Starten */}
            <div style={{
              marginTop: 20, padding: 18, borderRadius: 16, textAlign: 'center',
              background: questionsDone ? `linear-gradient(135deg, ${PINK}18, #A2124718)` : 'rgba(255,255,255,0.03)',
              border: `1px solid ${questionsDone ? PINK + '44' : 'rgba(255,255,255,0.09)'}`,
            }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: questionsDone ? '#f8fafc' : '#94a3b8', marginBottom: 10 }}>
                {questionsDone ? '🎉 Alles bereit — auf zum Abend!' : 'Fast fertig — die Fragen brauchen noch etwas Liebe.'}
              </div>
              <Link to={`/moderator?draft=${draftId}`} style={{
                textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '12px 22px', borderRadius: 12,
                background: `linear-gradient(135deg, ${PINK}, #A21247)`, color: '#fff',
                fontWeight: 900, fontSize: 15, boxShadow: `0 6px 18px ${PINK}33`,
              }}>▶ Quiz starten</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
