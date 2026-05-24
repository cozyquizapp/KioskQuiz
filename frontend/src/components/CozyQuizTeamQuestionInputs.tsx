/**
 * CozyQuizTeamQuestionInputs — callback-basierte Inputs pro Question-Type.
 *
 * Self-contained: bekommen `onSubmit: (value: string) => void` als Prop —
 * KEIN direktes emit/roomCode/myTeamId-Handling (das macht der AnswerInput-
 * Router in QQTeamPage). Alle locken sich bei Timer-Ablauf via useExpiry
 * und feuern Auto-Submit mit dem letzten valid value.
 *
 * Components:
 * - TextInput — Schaetzchen + Picture This fallback (text/numeric)
 * - MuchoInput — A/B/C/D Multiple-Choice mit Pop-Animation
 * - AllInInput — 1/2/3 Distribution-Buttons (POOL = 10 Punkte)
 * - Top5Input — 5 freie Antwort-Slots (Reihenfolge egal)
 * - FixItInput — sortable list mit ▲▼-Buttons (kein dnd-kit)
 *
 * Extrahiert aus QQTeamPage.tsx 2026-05-13 (Refactor Phase 2.1).
 */
import { useEffect, useRef, useState } from 'react';
import { useExpiry } from '../hooks/useExpiry';
import { StandardInput, SubmitBtn } from './CozyQuizTeamInputs';
import { qqCapOption } from '../cozyQuizShared';

// ── Text input (Schaetzchen + Picture This fallback) ──────────────────────────
export function TextInput({ catColor, onSubmit, placeholder, numeric, integerOnly, lang = 'de', timerEndsAt }: {
  catColor: string; onSubmit: (v: string) => void; placeholder?: string; numeric?: boolean; integerOnly?: boolean; lang?: 'de' | 'en'; timerEndsAt?: number | null;
}) {
  const [val, setVal] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { setTimeout(() => ref.current?.focus({ preventScroll: true }), 120); }, []);
  // 2026-05-23 (Mobile-Audit #8): Android-Keyboards lassen Dezimalpunkte durch
  // auch wenn type=number+inputMode=numeric. Bei Jahres-Fragen schickte ein
  // versehentlicher Tipp (z.B. „1989.") nicht parsbar ans Backend → silent
  // fail. Inline-Sanitize: Buchstaben weg, Komma → Punkt, bei integerOnly
  // (Jahres-Modus) zusätzlich Dezimalpunkt weg.
  const handleChange = (raw: string) => {
    if (!numeric) { setVal(raw); return; }
    // Komma als Dezimaltrenner (DE-Tastatur) → Punkt für Backend-Parsing
    let cleaned = raw.replace(/,/g, '.');
    // Erlaubt: 0-9, optional führendes -, ein Punkt für Dezimal
    if (integerOnly) {
      cleaned = cleaned.replace(/[^0-9-]/g, '');
    } else {
      cleaned = cleaned.replace(/[^0-9.\-]/g, '');
      // Nur einen Dezimalpunkt erlauben
      const firstDot = cleaned.indexOf('.');
      if (firstDot !== -1) {
        cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
      }
    }
    // Minus nur am Anfang
    if (cleaned.includes('-')) {
      cleaned = (cleaned.startsWith('-') ? '-' : '') + cleaned.replace(/-/g, '');
    }
    setVal(cleaned);
  };
  // B7: Bei Timer-Ende Auto-Submit (falls Text vorhanden) + Button-Lock.
  const expired = useExpiry(timerEndsAt ?? null);
  const valRef = useRef(val); valRef.current = val;
  const firedRef = useRef(false);
  useEffect(() => {
    if (expired && !firedRef.current) {
      firedRef.current = true;
      const v = valRef.current;
      if (v.trim()) onSubmit(v);
    }
  }, [expired, onSubmit]);
  const defaultPlaceholder = lang === 'de' ? 'Antwort eingeben…' : 'Enter answer…';
  return (
    <div style={{ marginTop: 4 }}>
      <StandardInput
        ref={ref}
        value={val}
        onChange={handleChange}
        onEnter={() => val.trim() && onSubmit(val)}
        catColor={catColor}
        type={numeric ? 'number' : 'text'}
        inputMode={numeric ? (integerOnly ? 'numeric' : 'decimal') : 'text'}
        pattern={numeric ? (integerOnly ? '[0-9]*' : '[0-9.]*') : undefined}
        placeholder={placeholder ?? defaultPlaceholder}
        ariaLabel={placeholder ?? (lang === 'de' ? 'Antwort eingeben' : 'Enter your answer')}
        disabled={expired}
      />
      <SubmitBtn onSubmit={() => onSubmit(val)} canSubmit={!expired && !!val.trim()} submitted={false} catColor={catColor} />
    </div>
  );
}

// ── Mu-Cho: A/B/C/D buttons ───────────────────────────────────────────────────
const MUCHO_COLORS = ['#3B82F6','#22C55E','#EF4444','#F97316'];
// 2026-05-09 (Wolf): A/B/C/D als Negative-Squared-Latin-Emojis statt Plain-Text.
// 2026-05-09 v2 (Wolf): zurueck auf Plain Text — die OS-Emoji-Versions
// 🅰🅱🅲🅳 wurden als blaue Squares gerendert, doppeln den existing Box-Look.
const MUCHO_LABELS = ['A','B','C','D'];

export function MuchoInput({ question: q, catColor, onSubmit, lang, timerEndsAt }: { question: any; catColor: string; onSubmit: (v: string) => void; lang: 'de' | 'en'; timerEndsAt?: number | null }) {
  const [selected, setSelected] = useState<number | null>(null);
  const opts: string[] = q.options ?? [];
  const optsEn: string[] = q.optionsEn ?? [];

  // B7: Auto-Submit on Timer-End wenn etwas ausgewaehlt; Buttons hart sperren.
  const expired = useExpiry(timerEndsAt ?? null);
  const selRef = useRef(selected); selRef.current = selected;
  const firedRef = useRef(false);
  useEffect(() => {
    if (expired && !firedRef.current) {
      firedRef.current = true;
      const s = selRef.current;
      if (s !== null) onSubmit(String(s));
    }
  }, [expired, onSubmit]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
      {opts.map((opt: string, i: number) => {
        const color = MUCHO_COLORS[i] ?? catColor;
        const isSelected = selected === i;
        const label = qqCapOption(lang === 'en' && optsEn[i] ? optsEn[i] : opt);
        return (
          <button
            key={i}
            disabled={expired}
            onClick={() => !expired && setSelected(i)}
            aria-label={`${MUCHO_LABELS[i]}: ${label}`}
            aria-pressed={isSelected}
            style={{
              display: 'flex', alignItems: 'center', gap: 0,
              borderRadius: 16, overflow: 'hidden', border: 'none', cursor: 'pointer',
              background: isSelected ? `${color}30` : 'rgba(255,255,255,0.04)',
              boxShadow: isSelected ? `0 4px 0 ${color}55` : '0 3px 0 rgba(0,0,0,0.4)',
              transform: isSelected ? 'translateY(-2px)' : 'none',
              transition: 'all 0.15s var(--qq-ease-bounce)',
              animation: `tcoptIn 0.4s var(--qq-ease-bounce) ${i * 0.07}s both`,
              outline: isSelected ? `2px solid ${color}` : `1px solid ${color}33`,
            }}
          >
            {/* Letter badge */}
            <div style={{
              width: 48, height: 52, flexShrink: 0,
              background: isSelected ? color : `${color}22`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 900, color: isSelected ? '#fff' : color,
              borderRight: `1px solid ${color}44`,
              transition: 'all 0.15s',
            }}>
              {isSelected ? '✓' : MUCHO_LABELS[i]}
            </div>
            {/* Option text */}
            <div style={{
              flex: 1, padding: '14px 16px', textAlign: 'left',
              fontSize: 'clamp(15px,4vw,18px)', fontWeight: 700,
              color: isSelected ? '#fff' : '#CBD5E1', fontFamily: 'inherit',
            }}>
              {label}
            </div>
          </button>
        );
      })}
      <SubmitBtn
        onSubmit={() => selected !== null && onSubmit(String(selected))}
        canSubmit={!expired && selected !== null}
        submitted={false}
        catColor={catColor}
      />
    </div>
  );
}

// ── All In: 1/2/3 betting ─────────────────────────────────────────────────────
const ALLIN_COLORS = ['#3B82F6','#22C55E','#EF4444'];
const ALLIN_POOL = 10;

export function AllInInput({ question: q, catColor, onSubmit, lang, timerEndsAt }: { question: any; catColor: string; onSubmit: (v: string) => void; lang: 'de' | 'en'; timerEndsAt?: number | null }) {
  const opts: string[] = q.options ?? [];
  const optsEn: string[] = q.optionsEn ?? [];
  // Bets-Array flexibel zur Options-Anzahl (frueher hardcoded 3 → brach bei Ja/Nein-Fragen)
  const [bets, setBets] = useState(() => new Array(Math.max(opts.length, 2)).fill(0));
  const remaining = ALLIN_POOL - bets.reduce((a, b) => a + b, 0);

  // B7: Auto-Submit on Timer-End. ZvZ braucht aber nur eingegebene Punkte
  // (auch unvollstaendig), damit nichts verloren geht. Backend akzeptiert
  // beliebige Verteilung als String "n,n,n".
  const expired = useExpiry(timerEndsAt ?? null);
  const betsRef = useRef(bets); betsRef.current = bets;
  const firedRef = useRef(false);
  useEffect(() => {
    if (expired && !firedRef.current) {
      firedRef.current = true;
      const b = betsRef.current;
      if (b.some(v => v > 0)) onSubmit(b.join(','));
    }
  }, [expired, onSubmit]);

  function updateBet(i: number, delta: number) {
    if (expired) return;
    setBets(prev => {
      const next = [...prev];
      const newVal = Math.max(0, Math.min(prev[i] + delta, prev[i] + remaining + (delta < 0 ? 0 : 0)));
      if (delta > 0 && remaining <= 0) return prev;
      next[i] = newVal;
      return next;
    });
  }

  const pillColor = remaining === 0 ? '#22C55E' : remaining < ALLIN_POOL ? '#EC4899' : '#475569';
  const distributeLabel = lang === 'de' ? 'Punkte verteilen' : 'Distribute points';
  const submitLabel = lang === 'de' ? 'Abgeben' : 'Submit';
  const leftLabel = lang === 'de' ? `Noch {n} Punkte verteilen` : `{n} points left to distribute`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
      {/* Remaining */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
        <span style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>{distributeLabel}</span>
        <div style={{
          padding: '3px 12px', borderRadius: 999, fontSize: 13, fontWeight: 900,
          background: `${pillColor}22`, border: `1px solid ${pillColor}55`, color: pillColor,
          animation: remaining === 0 ? 'tcsuccess 0.45s var(--qq-ease-bounce) both' : undefined,
          transition: 'all 0.2s',
        }}>
          {remaining} {lang === 'en' ? 'left' : 'übrig'}
        </div>
      </div>

      {opts.map((opt: string, i: number) => {
        const color = ALLIN_COLORS[i] ?? catColor;
        const label = qqCapOption(lang === 'en' && optsEn[i] ? optsEn[i] : opt);
        const pts = bets[i];
        return (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '1fr auto auto auto',
            alignItems: 'center', gap: 8,
            padding: '10px 14px', borderRadius: 16,
            background: pts > 0 ? `${color}12` : 'rgba(255,255,255,0.04)',
            border: `2px solid ${pts > 0 ? color + '55' : 'rgba(255,255,255,0.08)'}`,
            transition: 'all 0.15s',
            borderLeft: `4px solid ${color}`,
            animation: `tcoptIn 0.4s var(--qq-ease-bounce) ${i * 0.07}s both`,
          }}>
            <div style={{ fontSize: 'clamp(14px,3.5vw,17px)', fontWeight: 700, color: pts > 0 ? '#F1F5F9' : '#64748b' }}>
              {/* 2026-05-09 v2 (Wolf): zurueck auf Plain Number — Keycap-
                  Emojis 1️⃣2️⃣3️⃣ wurden als blaue OS-Squares gerendert. */}
              <span style={{ fontSize: 13, fontWeight: 900, color, marginRight: 6 }}>{i + 1}</span>
              {label}
            </div>
            {/* − */}
            <button onClick={() => updateBet(i, -1)} disabled={pts <= 0} style={{
              width: 48, height: 48, borderRadius: 16, border: `1px solid ${pts > 0 ? color + '55' : 'rgba(255,255,255,0.1)'}`,
              background: pts > 0 ? `${color}18` : 'transparent', color: pts > 0 ? color : '#334155',
              cursor: pts > 0 ? 'pointer' : 'default', fontFamily: 'inherit', fontSize: 22, fontWeight: 900,
            }}>−</button>
            {/* Points */}
            <div style={{ width: 32, textAlign: 'center', fontWeight: 900, fontSize: 18, color: pts > 0 ? color : '#475569', fontVariantNumeric: 'tabular-nums' }}>
              {pts}
            </div>
            {/* + */}
            <button onClick={() => updateBet(i, 1)} disabled={remaining <= 0} style={{
              width: 48, height: 48, borderRadius: 16, border: `1px solid ${remaining > 0 ? color + '55' : 'rgba(255,255,255,0.1)'}`,
              background: remaining > 0 ? `${color}18` : 'transparent', color: remaining > 0 ? color : '#334155',
              cursor: remaining > 0 ? 'pointer' : 'default', fontFamily: 'inherit', fontSize: 22, fontWeight: 900,
            }}>+</button>
          </div>
        );
      })}
      <SubmitBtn
        onSubmit={() => onSubmit(bets.join(','))}
        canSubmit={!expired && remaining === 0}
        submitted={false}
        catColor={catColor}
        label={remaining === 0 ? submitLabel : leftLabel.replace('{n}', String(remaining))}
      />
    </div>
  );
}

// ── Top 5 ─────────────────────────────────────────────────────────────────────
export function Top5Input({ catColor, onSubmit, lang, timerEndsAt }: { catColor: string; onSubmit: (v: string) => void; lang: 'de' | 'en'; timerEndsAt?: number | null }) {
  const [vals, setVals] = useState(['','','','','']);
  const filled = vals.filter(v => v.trim()).length;

  // B7: Auto-Submit on Timer-End mit den bisher ausgefuellten Feldern.
  const expired = useExpiry(timerEndsAt ?? null);
  const valsRef = useRef(vals); valsRef.current = vals;
  const firedRef = useRef(false);
  useEffect(() => {
    if (expired && !firedRef.current) {
      firedRef.current = true;
      const filtered = valsRef.current.filter(v => v.trim());
      if (filtered.length >= 1) onSubmit(filtered.join('|'));
    }
  }, [expired, onSubmit]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 4 }}>
      <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700, marginBottom: 2 }}>
        {lang === 'en' ? 'Enter up to 5 answers (order doesn\'t matter)' : 'Bis zu 5 Antworten eingeben (Reihenfolge egal)'}
      </div>
      {vals.map((v, i) => (
        <div key={i} style={{
          display: 'flex', gap: 8, alignItems: 'center',
          animation: `tcoptIn 0.4s var(--qq-ease-bounce) ${i * 0.07}s both`,
        }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: `${catColor}22`, border: `1px solid ${catColor}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: catColor, flexShrink: 0 }}>{i+1}</div>
          <div style={{ flex: 1 }}>
            <StandardInput
              value={v}
              onChange={(nv) => { const a = [...vals]; a[i] = nv; setVals(a); }}
              catColor={catColor}
              placeholder={lang === 'en' ? `Answer ${i+1}…` : `Antwort ${i+1}…`}
              disabled={expired}
              maxLength={80}
            />
          </div>
        </div>
      ))}
      <SubmitBtn onSubmit={() => onSubmit(vals.filter(v=>v.trim()).join('|'))} canSubmit={!expired && filled >= 1} submitted={false} catColor={catColor} />
    </div>
  );
}

// ── Fix It: sortable list (no dnd-kit dep, manual reorder via buttons) ─────────
export function FixItInput({ question: q, catColor, onSubmit, lang, timerEndsAt }: { question: any; catColor: string; onSubmit: (v: string) => void; lang: 'de' | 'en'; timerEndsAt?: number | null }) {
  const bt = q.bunteTuete;
  const srcItems: string[] = (lang === 'en' && bt?.itemsEn?.some((s:string)=>s) ? bt.itemsEn : bt?.items) ?? [];
  // Shuffle on mount for challenge
  const [items, setItems] = useState(() => [...srcItems].sort(() => Math.random() - 0.5));
  const criteria = lang === 'en' ? (bt?.criteriaEn || bt?.criteria) : bt?.criteria;

  // B7: Auto-Submit on Timer-End mit aktueller Reihenfolge.
  const expired = useExpiry(timerEndsAt ?? null);
  const itemsRef = useRef(items); itemsRef.current = items;
  const firedRef = useRef(false);
  useEffect(() => {
    if (expired && !firedRef.current) {
      firedRef.current = true;
      const it = itemsRef.current;
      if (it.length > 0) onSubmit(it.join('|'));
    }
  }, [expired, onSubmit]);

  function move(i: number, dir: -1 | 1) {
    if (expired) return;
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    setItems(next);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
      {criteria && (
        <div style={{ fontSize: 12, color: catColor, fontWeight: 900, textAlign: 'center', padding: '4px 10px', borderRadius: 8, background: `${catColor}12`, border: `1px solid ${catColor}33` }}>
          🔀 {criteria}
        </div>
      )}
      <div style={{ fontSize: 12, color: '#64748b', textAlign: 'center' }}>
        {lang === 'en' ? 'Tap ▲▼ to reorder' : '▲▼ zum Sortieren tippen'}
      </div>
      {items.map((item, i) => (
        <div key={item + i} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 10px', borderRadius: 16,
          background: 'rgba(26,32,53,0.9)', border: `1px solid ${catColor}22`,
          animation: `tcoptIn 0.4s var(--qq-ease-bounce) ${i * 0.07}s both`,
        }}>
          <div style={{ width: 24, height: 24, borderRadius: 7, flexShrink: 0, background: `${catColor}22`, border: `1px solid ${catColor}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, color: catColor }}>
            {i + 1}
          </div>
          <div style={{ flex: 1, fontSize: 'clamp(13px,3.4vw,15px)', fontWeight: 700, color: '#F1F5F9', lineHeight: 1.25 }}>{item}</div>
          {/* 2026-05-02 (App-Designer-Audit P1): Touch-Targets unter 44px sind
              fuer Daumen-Bedienung zu klein — Sortier-Pfeile auf 44x40, mit
              klarem Gap, damit der Trefferbereich nicht ueberlappt. */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button onClick={() => move(i, -1)} disabled={i === 0} style={{ width: 44, height: 40, borderRadius: 8, border: `1.5px solid ${i > 0 ? catColor+'66' : 'rgba(255,255,255,0.06)'}`, background: i > 0 ? `${catColor}10` : 'transparent', color: i > 0 ? catColor : '#334155', cursor: i > 0 ? 'pointer' : 'default', fontSize: 16, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit', fontWeight: 900 }}>▲</button>
            <button onClick={() => move(i, 1)} disabled={i === items.length - 1} style={{ width: 44, height: 40, borderRadius: 8, border: `1.5px solid ${i < items.length-1 ? catColor+'66' : 'rgba(255,255,255,0.06)'}`, background: i < items.length-1 ? `${catColor}10` : 'transparent', color: i < items.length-1 ? catColor : '#334155', cursor: i < items.length-1 ? 'pointer' : 'default', fontSize: 16, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit', fontWeight: 900 }}>▼</button>
          </div>
        </div>
      ))}
      <SubmitBtn onSubmit={() => onSubmit(items.join('|'))} canSubmit={!expired && items.length > 0} submitted={false} catColor={catColor} />
    </div>
  );
}
