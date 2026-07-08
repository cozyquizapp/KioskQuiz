// 2026-07-08 (Wolf-Wunsch „alles Sinnvolle besser verknuepfen"): Draft-zentrierte
// Startseite. Statt Tools in einem flachen Menue zu suchen, sieht Wolf seine
// Quizze und haengt jede Aktion direkt ans jeweilige Quiz:
//   ▶ Starten (Moderator, Draft vorgewaehlt) · 🧭 Vorbereiten · ✏ Bearbeiten
//   (Builder) · 📄 Host-Sheet.
// Alle Aktionen zeigen auf reale, funktionierende Ziele (Deep-Links mit ?draft=).
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { exportHostCheatsheet } from '../pages/qqHostCheatsheet';

type DraftSummary = {
  id: string;
  title: string;
  // Die Listen-API /api/qq/drafts liefert das volle questions-Array (kein
  // questionCount-Feld) — 2026-07-08 Fix: Anzahl daraus ableiten, sonst zeigten
  // ALLE Karten faelschlich „0 Fragen" (wirkten leer).
  questions?: unknown[];
  questionCount?: number;
  updatedAt?: number;
  language?: string;
};

const PINK = '#EC4899';

// Bekannte Demo-/Vorlagen-Packs — dezent als „Demo" markieren, damit Wolf seine
// echten Abende auf einen Blick von den Beispiel-Sets unterscheidet.
const DEMO_PREFIXES = ['qq-vol-', 'qq-sample-', 'qq-esc', 'qq-eurovision', 'qq-pitch', 'qq-demo'];
const isDemo = (id: string) => DEMO_PREFIXES.some(p => id.startsWith(p));

function relTime(ts?: number): string {
  if (!ts) return '';
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return 'gerade bearbeitet';
  if (s < 3600) return `vor ${Math.floor(s / 60)} min`;
  if (s < 86400) return `vor ${Math.floor(s / 3600)} h`;
  return `vor ${Math.floor(s / 86400)} Tagen`;
}

export function MyQuizzesHub() {
  const [drafts, setDrafts] = useState<DraftSummary[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/qq/drafts')
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(data => { if (!cancelled) setDrafts(Array.isArray(data) ? data : []); })
      .catch(() => { if (!cancelled) { setError(true); setDrafts([]); } });
    return () => { cancelled = true; };
  }, []);

  // Eigene Abende zuerst (nach letzter Bearbeitung), Demo-Packs danach.
  const sorted = (drafts ?? []).slice().sort((a, b) => {
    const ad = isDemo(a.id) ? 1 : 0, bd = isDemo(b.id) ? 1 : 0;
    if (ad !== bd) return ad - bd;
    return (b.updatedAt ?? 0) - (a.updatedAt ?? 0);
  });

  return (
    <div>
      {/* Kopfzeile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{
          width: 44, height: 44, borderRadius: 13, flexShrink: 0,
          background: `${PINK}22`, border: `1.5px solid ${PINK}55`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
        }}>🎯</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 900, fontSize: 20, color: '#f8fafc', lineHeight: 1.15 }}>Meine Quizze</div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
            Jedes Quiz mit allem drum dran — bauen, planen, starten.
          </div>
        </div>
        <Link to="/builder" style={{
          textDecoration: 'none',
          display: 'inline-flex', alignItems: 'center', gap: 7,
          padding: '10px 16px', borderRadius: 12,
          background: `linear-gradient(135deg, ${PINK}, #A21247)`, color: '#fff',
          fontWeight: 900, fontSize: 14, whiteSpace: 'nowrap',
          boxShadow: `0 6px 18px ${PINK}33`,
        }}>+ Neues Quiz</Link>
      </div>

      {/* Live-Abend-Schnellzugriff */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        <QuickLink to="/beamer" emoji="📽️" label="Beamer öffnen" />
        <QuickLink to="/qrcode" emoji="🔳" label="Team-Beitritts-QR" />
        <QuickLink to="/team" emoji="📱" label="Team-Ansicht" />
      </div>

      {/* Draft-Karten */}
      {drafts === null ? (
        <div style={{ padding: '28px 0', textAlign: 'center', color: '#64748b', fontSize: 14 }}>Lädt…</div>
      ) : sorted.length === 0 ? (
        <div style={{
          padding: '24px', borderRadius: 16, textAlign: 'center',
          background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.12)',
          color: '#94a3b8', fontSize: 14,
        }}>
          {error ? 'Konnte Quizze nicht laden (Backend offline?).' : 'Noch keine Quizze — leg mit „+ Neues Quiz" los.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {sorted.map(d => <QuizCard key={d.id} draft={d} />)}
        </div>
      )}
    </div>
  );
}

function QuickLink({ to, emoji, label }: { to: string; emoji: string; label: string }) {
  return (
    <Link to={to} style={{
      textDecoration: 'none', color: '#cbd5e1',
      display: 'inline-flex', alignItems: 'center', gap: 8,
      padding: '8px 13px', borderRadius: 10,
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
      fontSize: 13, fontWeight: 700,
    }}>
      <span style={{ fontSize: 16 }}>{emoji}</span>{label}
    </Link>
  );
}

function QuizCard({ draft }: { draft: DraftSummary }) {
  const demo = isDemo(draft.id);
  const count = draft.questions?.length ?? draft.questionCount ?? 0;
  const [printing, setPrinting] = useState(false);
  // Host-Sheet direkt aus der Karte: vollen Draft ziehen → PDF/Print. Spart den
  // Umweg über die /host-sheets-Liste.
  const printSheet = async () => {
    if (printing) return;
    setPrinting(true);
    try {
      const r = await fetch(`/api/qq/drafts/${draft.id}`);
      if (r.ok) { const full = await r.json(); await exportHostCheatsheet(full); }
    } catch { /* ignore */ }
    setPrinting(false);
  };
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 12,
      padding: 16, borderRadius: 18,
      background: 'rgba(255,255,255,0.035)',
      border: '1px solid rgba(255,255,255,0.09)',
    }}>
      {/* Titelzeile */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: 900, fontSize: 16, color: '#f1f5f9', lineHeight: 1.25,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{draft.title || 'Ohne Titel'}</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>
            {count} {count === 1 ? 'Frage' : 'Fragen'}
            {draft.updatedAt ? ` · ${relTime(draft.updatedAt)}` : ''}
          </div>
        </div>
        {demo && (
          <span style={{
            flexShrink: 0, fontSize: 10, fontWeight: 900, letterSpacing: '0.06em',
            color: '#94a3b8', background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.10)', padding: '3px 8px', borderRadius: 999,
          }}>DEMO</span>
        )}
      </div>

      {/* Aktionen */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
        <CardAction to={`/moderator?draft=${draft.id}`} emoji="▶" label="Starten" primary />
        <CardAction to={`/vorbereiten?draft=${draft.id}`} emoji="🧭" label="Vorbereiten" />
        <CardAction to={`/builder?draft=${draft.id}`} emoji="✏️" label="Bearbeiten" />
        <button onClick={printSheet} disabled={printing} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '8px 12px', borderRadius: 10,
          fontSize: 13, fontWeight: 800, whiteSpace: 'nowrap', fontFamily: 'inherit',
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)',
          color: '#cbd5e1', cursor: printing ? 'default' : 'pointer', opacity: printing ? 0.6 : 1,
        }}>
          <span>📄</span>{printing ? '…' : 'Host-Sheet'}
        </button>
      </div>
    </div>
  );
}

function CardAction({ to, emoji, label, primary }: { to: string; emoji: string; label: string; primary?: boolean }) {
  return (
    <Link to={to} style={{
      textDecoration: 'none',
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '8px 12px', borderRadius: 10,
      fontSize: 13, fontWeight: 800, whiteSpace: 'nowrap',
      ...(primary
        ? { background: `linear-gradient(135deg, ${PINK}, #A21247)`, color: '#fff', boxShadow: `0 4px 12px ${PINK}33` }
        : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', color: '#cbd5e1' }),
    }}>
      <span>{emoji}</span>{label}
    </Link>
  );
}

export default MyQuizzesHub;
