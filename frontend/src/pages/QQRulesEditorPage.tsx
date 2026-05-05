/**
 * Regeltext-Editor — Wolf 2026-05-05.
 *
 * Bearbeitet alle Texte aus den Spielregel-Folien, Kategorie-Erklärungen,
 * Bunte-Tüte-Mechaniken und Runden-Hinweisen. Speicherung in localStorage
 * via qqRuleTexts.ts. Beamer-Render-Code zieht sich Texte zur Render-Zeit.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RULE_TEXT_GROUPS,
  RuleLang,
  getRuleOverride,
  setRuleOverride,
  resetRuleText,
  resetAllRuleTexts,
  useRuleOverridesVersion,
} from '../qqRuleTexts';

const DARK_BG = '#0f172a';
const CARD_BG = '#1e293b';
const BORDER = '1px solid rgba(255,255,255,0.07)';
const GREEN = '#22C55E';
const AMBER = '#F59E0B';
const RED = '#EF4444';

function btn(color: string, danger = false): React.CSSProperties {
  return {
    padding: '8px 16px', borderRadius: 10,
    background: danger ? `${color}20` : color,
    color: danger ? color : '#fff',
    border: danger ? `1.5px solid ${color}66` : 'none',
    fontWeight: 800, fontSize: 13, cursor: 'pointer',
    fontFamily: 'inherit',
  };
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  background: '#0b1220', border: '1px solid rgba(255,255,255,0.08)',
  color: '#e2e8f0', fontSize: 14, fontFamily: 'inherit',
  outline: 'none', resize: 'vertical', minHeight: 38,
};

// ─────────────────────────────────────────────────────────────────────────────

type FieldEditorProps = {
  ruleKey: string;
  label: string;
  defaultDe: string;
  defaultEn: string;
  multiline?: boolean;
};

function FieldEditor({ ruleKey, label, defaultDe, defaultEn, multiline }: FieldEditorProps) {
  const version = useRuleOverridesVersion();
  // Track "draft" values so the textarea isn't constantly overwritten by storage.
  const [draftDe, setDraftDe] = useState<string>(() => getRuleOverride(ruleKey, 'de') ?? defaultDe);
  const [draftEn, setDraftEn] = useState<string>(() => getRuleOverride(ruleKey, 'en') ?? defaultEn);

  // Re-sync nur wenn der Override extern (Reset, anderes Tab) geändert wurde
  // UND der User gerade nicht tippt. Wir machen das simpel: bei version-Bump
  // setzen wir die Drafts zurück auf den effektiven Wert.
  useEffect(() => {
    setDraftDe(getRuleOverride(ruleKey, 'de') ?? defaultDe);
    setDraftEn(getRuleOverride(ruleKey, 'en') ?? defaultEn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, ruleKey]);

  const overrideDe = getRuleOverride(ruleKey, 'de');
  const overrideEn = getRuleOverride(ruleKey, 'en');
  const isCustomDe = overrideDe !== undefined && overrideDe !== defaultDe;
  const isCustomEn = overrideEn !== undefined && overrideEn !== defaultEn;
  const isCustom = isCustomDe || isCustomEn;

  function commitDe(v: string) {
    if (v === defaultDe || v.trim() === '') {
      // Override löschen → fällt auf Default zurück
      const map = { de: undefined, en: overrideEn };
      if (map.en === undefined) resetRuleText(ruleKey);
      else setRuleOverride(ruleKey, 'de', '');
    } else {
      setRuleOverride(ruleKey, 'de', v);
    }
  }
  function commitEn(v: string) {
    if (v === defaultEn || v.trim() === '') {
      const map = { de: overrideDe, en: undefined };
      if (map.de === undefined) resetRuleText(ruleKey);
      else setRuleOverride(ruleKey, 'en', '');
    } else {
      setRuleOverride(ruleKey, 'en', v);
    }
  }

  const Tag = (multiline ? 'textarea' : 'input') as 'textarea' | 'input';

  return (
    <div style={{
      padding: 14, borderRadius: 12,
      background: isCustom ? `${AMBER}0d` : '#0b1220',
      border: isCustom ? `1.5px solid ${AMBER}55` : BORDER,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 8, gap: 10,
      }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#cbd5e1' }}>
          {label}
          {isCustom && (
            <span style={{
              marginLeft: 8, fontSize: 10, fontWeight: 900,
              padding: '2px 8px', borderRadius: 999,
              background: `${AMBER}22`, color: AMBER, letterSpacing: '0.06em',
            }}>ANGEPASST</span>
          )}
        </div>
        {isCustom && (
          <button
            type="button"
            onClick={() => resetRuleText(ruleKey)}
            style={{ ...btn(AMBER, true), padding: '4px 10px', fontSize: 11 }}
            title="Auf Standardtext zurücksetzen"
          >↺ Standard</button>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 900, color: '#94a3b8', marginBottom: 4, letterSpacing: '0.08em' }}>DE</div>
          <Tag
            value={draftDe}
            onChange={(e: any) => setDraftDe(e.target.value)}
            onBlur={() => commitDe(draftDe)}
            style={{ ...inputStyle, ...(multiline ? { minHeight: 60 } : {}) } as any}
            rows={multiline ? 2 : undefined}
          />
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 900, color: '#94a3b8', marginBottom: 4, letterSpacing: '0.08em' }}>EN</div>
          <Tag
            value={draftEn}
            onChange={(e: any) => setDraftEn(e.target.value)}
            onBlur={() => commitEn(draftEn)}
            style={{ ...inputStyle, ...(multiline ? { minHeight: 60 } : {}) } as any}
            rows={multiline ? 2 : undefined}
          />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function QQRulesEditorPage() {
  const navigate = useNavigate();
  const version = useRuleOverridesVersion();

  // Stats: wieviele Texte sind angepasst?
  const stats = useMemo(() => {
    let total = 0, custom = 0;
    for (const g of RULE_TEXT_GROUPS) {
      for (const item of g.items) {
        total++;
        const dDe = getRuleOverride(item.key, 'de');
        const dEn = getRuleOverride(item.key, 'en');
        if ((dDe !== undefined && dDe !== item.defaultDe)
         || (dEn !== undefined && dEn !== item.defaultEn)) {
          custom++;
        }
      }
    }
    return { total, custom };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  // Open-Group-State: erste Gruppe ist standardmäßig offen.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => ({
    [RULE_TEXT_GROUPS[0]?.id ?? '']: true,
  }));
  function toggleGroup(id: string) {
    setOpenGroups(g => ({ ...g, [id]: !g[id] }));
  }

  function handleResetAll() {
    if (stats.custom === 0) return;
    const ok = window.confirm(`Wirklich alle ${stats.custom} angepassten Texte auf Standard zurücksetzen?`);
    if (!ok) return;
    resetAllRuleTexts();
  }

  // Export/Import als JSON-Text (Backup-Funktion)
  function handleExport() {
    const map: Record<string, { de?: string; en?: string }> = {};
    for (const g of RULE_TEXT_GROUPS) {
      for (const item of g.items) {
        const dDe = getRuleOverride(item.key, 'de');
        const dEn = getRuleOverride(item.key, 'en');
        if (dDe !== undefined || dEn !== undefined) {
          map[item.key] = {};
          if (dDe !== undefined) map[item.key].de = dDe;
          if (dEn !== undefined) map[item.key].en = dEn;
        }
      }
    }
    const json = JSON.stringify(map, null, 2);
    navigator.clipboard?.writeText(json).then(
      () => alert('Overrides als JSON in die Zwischenablage kopiert.'),
      () => prompt('Overrides als JSON (zum Kopieren):', json)
    );
  }

  function handleImport() {
    const raw = window.prompt('JSON-Backup einfügen (überschreibt alle Overrides):');
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') throw new Error('not an object');
      // Schreiben pro Eintrag
      for (const [key, val] of Object.entries(parsed as Record<string, { de?: string; en?: string }>)) {
        if (val.de) setRuleOverride(key, 'de', val.de);
        if (val.en) setRuleOverride(key, 'en', val.en);
      }
      alert('Import erfolgreich.');
    } catch {
      alert('JSON ungültig — nichts importiert.');
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: DARK_BG, color: '#e2e8f0',
      fontFamily: "'Nunito', system-ui, sans-serif",
      padding: '32px clamp(20px, 4vw, 56px) 80px',
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
              CozyQuiz · Extras
            </div>
            <div style={{ fontSize: 32, fontWeight: 900 }}>📜 Regeltexte anpassen</div>
          </div>
          <button onClick={() => navigate('/menu')} style={btn('#64748B')}>← Hauptmenü</button>
        </div>

        <div style={{ fontSize: 14, color: '#94a3b8', marginBottom: 20, maxWidth: 720, lineHeight: 1.5 }}>
          Hier kannst du alle Texte auf den Spielregel-Folien, Kategorie-Intros und Runden-Hinweisen ändern.
          Änderungen werden automatisch beim Verlassen des Felds gespeichert (kein Speichern-Knopf nötig).
          Speicherung lokal im Browser (kein Backend), gilt für alle Spiele auf diesem Gerät.
        </div>

        {/* Stats + Actions */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
          marginBottom: 24, padding: 14, borderRadius: 12, background: CARD_BG, border: BORDER,
        }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#94a3b8', marginBottom: 2 }}>STATUS</div>
            <div style={{ fontSize: 16, fontWeight: 900 }}>
              {stats.custom === 0
                ? <span style={{ color: '#94a3b8' }}>Alle {stats.total} Texte auf Standard</span>
                : <span style={{ color: AMBER }}>{stats.custom} von {stats.total} angepasst</span>}
            </div>
          </div>
          <button onClick={handleExport} style={btn('#3B82F6')}>⤓ Export (JSON)</button>
          <button onClick={handleImport} style={btn('#3B82F6')}>⤒ Import</button>
          <button
            onClick={handleResetAll}
            style={btn(RED, true)}
            disabled={stats.custom === 0}
          >🗑 Alle zurücksetzen</button>
        </div>

        {/* Gruppen */}
        {RULE_TEXT_GROUPS.map(group => {
          const isOpen = !!openGroups[group.id];
          const groupCustom = group.items.filter(it => {
            const dDe = getRuleOverride(it.key, 'de');
            const dEn = getRuleOverride(it.key, 'en');
            return (dDe !== undefined && dDe !== it.defaultDe) || (dEn !== undefined && dEn !== it.defaultEn);
          }).length;
          return (
            <div key={group.id} style={{ marginBottom: 16, background: CARD_BG, borderRadius: 14, border: BORDER, overflow: 'hidden' }}>
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                style={{
                  width: '100%', padding: '16px 20px',
                  background: 'transparent', border: 'none', color: '#e2e8f0',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                  cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 18, color: AMBER, transition: 'transform 0.2s', display: 'inline-block', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 18, fontWeight: 900 }}>{group.title}</div>
                    {group.description && (
                      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{group.description}</div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  {groupCustom > 0 && (
                    <span style={{
                      padding: '3px 9px', borderRadius: 999,
                      background: `${AMBER}22`, color: AMBER, fontSize: 11, fontWeight: 900,
                    }}>{groupCustom} angepasst</span>
                  )}
                  <span style={{ fontSize: 12, color: '#64748b', fontWeight: 800 }}>
                    {group.items.length}
                  </span>
                </div>
              </button>
              {isOpen && (
                <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {group.items.map(item => (
                    <FieldEditor
                      key={item.key}
                      ruleKey={item.key}
                      label={item.label}
                      defaultDe={item.defaultDe}
                      defaultEn={item.defaultEn}
                      multiline={item.multiline}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <div style={{
          marginTop: 32, padding: 16, borderRadius: 12,
          background: `${GREEN}10`, border: `1px solid ${GREEN}33`,
          fontSize: 13, color: '#86efac', lineHeight: 1.5,
        }}>
          💡 <strong>Tipp:</strong> Texte werden lokal im Browser gespeichert. Wenn du auf einem anderen Gerät moderierst,
          nutze „Export (JSON)" → JSON in die Zwischenablage → auf dem anderen Gerät „Import".
        </div>
      </div>
    </div>
  );
}
