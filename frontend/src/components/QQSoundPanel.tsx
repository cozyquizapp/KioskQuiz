import { useState, useRef } from 'react';
import {
  QQSoundConfig,
  QQSoundSlot,
  QQ_SOUND_SLOT_LABELS,
  QQ_SOUND_DEFAULT_URLS,
} from '../../../shared/quarterQuizTypes';
import { SYNTH_PRESETS, playSynthPreset } from '../utils/sounds';

/** Derive the backend origin from API_BASE so audio URLs resolve correctly in prod. */
const API_BASE = (() => {
  const envBase = (import.meta as any).env?.VITE_API_BASE as string | undefined;
  if (envBase) return envBase;
  const { protocol, hostname } = window.location;
  const isLocal = hostname === 'localhost' || hostname.startsWith('127.');
  return isLocal ? `${protocol}//${hostname}:4000/api` : `${window.location.origin}/api`;
})();

/** Turn a potentially relative audio URL into an absolute one pointing at the backend. */
function resolveBackendUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const origin = API_BASE.replace(/\/api\/?$/, '');
  return `${origin}${url}`;
}

/** Default-WAVs liegen im Frontend-Public — also relativ zur aktuellen Origin. */
function defaultUrl(slot: QQSoundSlot): string {
  return QQ_SOUND_DEFAULT_URLS[slot];
}

export function QQSoundPanel({ config, onChange }: {
  config: QQSoundConfig;
  onChange: (cfg: QQSoundConfig) => void;
}) {
  const [uploading, setUploading] = useState<QQSoundSlot | null>(null);
  const [previewing, setPreviewing] = useState<QQSoundSlot | null>(null);
  const previewRef = useRef<HTMLAudioElement | null>(null);

  async function handleUpload(slot: QQSoundSlot, file: File) {
    setUploading(slot);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${API_BASE}/upload/question-audio`, { method: 'POST', body: fd });
      if (res.ok) {
        const { audioUrl } = await res.json() as { audioUrl: string };
        onChange({ ...config, [slot]: resolveBackendUrl(audioUrl) });
      } else {
        alert('Upload fehlgeschlagen');
      }
    } finally {
      setUploading(null);
    }
  }

  function togglePreview(slot: QQSoundSlot) {
    if (previewing === slot) {
      previewRef.current?.pause();
      setPreviewing(null);
      return;
    }
    previewRef.current?.pause();

    // Priorität wie im Live-Betrieb: Custom-Upload > Preset-Synth > Default-WAV > classic-Synth.
    const customUrl = config[slot];
    if (typeof customUrl === 'string' && customUrl.length > 0) {
      const el = new Audio(customUrl);
      previewRef.current = el;
      el.onended = () => setPreviewing(null);
      el.play().catch(() => {});
      setPreviewing(slot);
      return;
    }
    const presetKey = config.preset?.[slot];
    const slotPresets = SYNTH_PRESETS[slot];
    if (presetKey && slotPresets?.[presetKey]) {
      playSynthPreset(slot, presetKey);
      setPreviewing(slot);
      window.setTimeout(() => setPreviewing(p => p === slot ? null : p), 1400);
      return;
    }
    const url = defaultUrl(slot);
    if (url && url.length > 0) {
      const el = new Audio(url);
      previewRef.current = el;
      el.onended = () => setPreviewing(null);
      el.play().catch(() => {});
      setPreviewing(slot);
      return;
    }
    if (slotPresets?.classic) {
      playSynthPreset(slot, 'classic');
      setPreviewing(slot);
      window.setTimeout(() => setPreviewing(p => p === slot ? null : p), 1400);
    }
  }

  function setPreset(slot: QQSoundSlot, presetKey: string) {
    const nextPreset = { ...(config.preset ?? {}) };
    if (presetKey) nextPreset[slot] = presetKey;
    else delete nextPreset[slot];
    onChange({ ...config, preset: nextPreset });
  }

  function clearSlot(slot: QQSoundSlot) {
    // "Clear" = Zurück zum Default-Sound (nicht mehr stumm).
    if (previewing === slot) { previewRef.current?.pause(); setPreviewing(null); }
    const next = { ...config };
    delete next[slot];
    onChange(next);
  }

  function toggleEnabled(slot: QQSoundSlot) {
    const current = config.enabled?.[slot] !== false; // default: true
    const nextEnabled = { ...(config.enabled ?? {}), [slot]: !current };
    onChange({ ...config, enabled: nextEnabled });
    if (previewing === slot && current) {
      // gerade wurde stumm geschaltet → Preview stoppen
      previewRef.current?.pause();
      setPreviewing(null);
    }
  }

  const slots = Object.keys(QQ_SOUND_SLOT_LABELS) as QQSoundSlot[];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.5, marginBottom: 4, padding: '5px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: 6 }}>
        Jeder Slot hat einen Default-Sound. Upload ersetzt ihn, 🔇 schaltet ihn stumm.<br/>
        Synth-Preset wählen statt eigener Datei — das Dropdown kommt, wenn kein Upload da ist.<br/>
        MP3 / OGG / WAV — max. 10 MB.
      </div>
      {slots.map(slot => {
        const label = QQ_SOUND_SLOT_LABELS[slot];
        const url = config[slot];
        const hasCustom = typeof url === 'string' && url.length > 0;
        const enabled = config.enabled?.[slot] !== false;
        const isUploading = uploading === slot;
        const isPreviewing = previewing === slot;
        const slotPresets = SYNTH_PRESETS[slot];
        const presetKey = config.preset?.[slot] ?? '';
        const presetActive = !hasCustom && presetKey && slotPresets?.[presetKey];

        // Farben: aus = rot-grau, custom = grün, preset = blau, default = neutral.
        const borderCol =
          !enabled      ? 'rgba(239,68,68,0.25)' :
          hasCustom     ? 'rgba(34,197,94,0.25)' :
          presetActive  ? 'rgba(99,102,241,0.25)' :
                          'rgba(148,163,184,0.18)';
        const bgCol =
          !enabled      ? 'rgba(239,68,68,0.05)' :
          hasCustom     ? 'rgba(34,197,94,0.07)' :
          presetActive  ? 'rgba(99,102,241,0.07)' :
                          'rgba(255,255,255,0.03)';
        const labelCol =
          !enabled      ? '#f87171' :
          hasCustom     ? '#86efac' :
          presetActive  ? '#a5b4fc' :
                          '#94a3b8';

        const statusText = !enabled
          ? '🔇 Stumm'
          : hasCustom
            ? '● Eigener Upload'
            : presetActive
              ? `♪ Synth: ${slotPresets?.[presetKey]?.label ?? presetKey}`
              : '○ Default';

        return (
          <div key={slot} style={{
            padding: '7px 10px', borderRadius: 8,
            background: bgCol, border: `1px solid ${borderCol}`,
            opacity: enabled ? 1 : 0.72,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: labelCol }}>{label}</div>
              <div style={{ fontSize: 9, color: '#475569', fontWeight: 700 }}>{statusText}</div>
            </div>
            {/* 2026-05-01 Konsistenz-Fix: Inline-Styles -> .qm-btn[data-small]
             * damit Sound-Panel-Buttons gleich aussehen wie der Rest des
             * Mod-Panels (Padding 5px 12px, Border-Radius 8px, font-size 12px). */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <label className="qm-btn" data-small="true"
                style={{ ['--qm-btn-color' as string]: '#3B82F6', flex: 1,
                  justifyContent: 'center', cursor: 'pointer',
                  opacity: isUploading ? 0.6 : 1, whiteSpace: 'nowrap' } as React.CSSProperties}>
                {isUploading ? '⏳' : hasCustom ? '↑ Ersetzen' : '↑ Eigene Datei'}
                <input type="file" accept="audio/*" style={{ display: 'none' }}
                  disabled={isUploading}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(slot, f); e.target.value = ''; }} />
              </label>
              <button type="button" className="qm-btn" data-small="true"
                onClick={() => togglePreview(slot)} title="Vorhören"
                disabled={!enabled}
                style={{ ['--qm-btn-color' as string]: isPreviewing ? '#F59E0B' : '#94a3b8',
                  cursor: enabled ? 'pointer' : 'not-allowed',
                  opacity: enabled ? 1 : 0.4 } as React.CSSProperties}>
                {isPreviewing ? '⏹' : '▶'}
              </button>
              <button type="button" className="qm-btn" data-small="true"
                onClick={() => toggleEnabled(slot)}
                title={enabled ? 'Diesen Slot stumm schalten' : 'Wieder aktivieren'}
                style={{ ['--qm-btn-color' as string]: enabled ? '#94a3b8' : '#EF4444' } as React.CSSProperties}>
                {enabled ? '🔊' : '🔇'}
              </button>
              {hasCustom && (
                <button type="button" className="qm-btn" data-small="true"
                  onClick={() => clearSlot(slot)}
                  title="Upload entfernen, Default verwenden"
                  style={{ ['--qm-btn-color' as string]: '#EF4444' } as React.CSSProperties}>
                  ↺
                </button>
              )}
            </div>
            {hasCustom && (
              <div style={{ fontSize: 9, color: '#334155', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {url!.split('/').pop()}
              </div>
            )}
            {slotPresets && !hasCustom && (
              <div style={{ display: 'flex', gap: 5, alignItems: 'center', marginTop: 5 }}>
                <span style={{ fontSize: 10, color: '#64748b', fontWeight: 700, minWidth: 46 }}>Synth:</span>
                <select
                  value={presetKey}
                  disabled={!enabled}
                  onChange={e => setPreset(slot, e.target.value)}
                  style={{
                    flex: 1, padding: '3px 6px', borderRadius: 6,
                    background: 'rgba(15,23,42,0.6)',
                    color: presetActive ? '#c7d2fe' : '#94a3b8',
                    border: '1px solid rgba(148,163,184,0.2)',
                    fontSize: 11, fontWeight: 700, fontFamily: 'inherit',
                    cursor: enabled ? 'pointer' : 'not-allowed',
                  }}
                >
                  <option value="">Default-WAV</option>
                  {Object.entries(slotPresets).map(([key, variant]) => (
                    <option key={key} value={key}>{variant.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
