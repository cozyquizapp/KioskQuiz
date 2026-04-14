import { useState, useRef } from 'react';
import {
  QQSoundConfig,
  QQSoundSlot,
  QQ_SOUND_SLOT_LABELS,
  QQ_SOUND_DEFAULT_URLS,
} from '../../../shared/quarterQuizTypes';

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
    // Preview spielt entweder Custom-Upload oder Default-WAV.
    const url = config[slot] ?? defaultUrl(slot);
    if (!url) return;
    if (previewing === slot) {
      previewRef.current?.pause();
      setPreviewing(null);
      return;
    }
    previewRef.current?.pause();
    const el = new Audio(url);
    previewRef.current = el;
    el.onended = () => setPreviewing(null);
    el.play().catch(() => {});
    setPreviewing(slot);
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
        MP3 / OGG / WAV — max. 10 MB.
      </div>
      {slots.map(slot => {
        const label = QQ_SOUND_SLOT_LABELS[slot];
        const url = config[slot];
        const hasCustom = typeof url === 'string' && url.length > 0;
        const enabled = config.enabled?.[slot] !== false;
        const isUploading = uploading === slot;
        const isPreviewing = previewing === slot;

        // Farben: aus = rot-grau, custom = grün, default = neutral.
        const borderCol =
          !enabled    ? 'rgba(239,68,68,0.25)' :
          hasCustom   ? 'rgba(34,197,94,0.25)' :
                        'rgba(148,163,184,0.18)';
        const bgCol =
          !enabled    ? 'rgba(239,68,68,0.05)' :
          hasCustom   ? 'rgba(34,197,94,0.07)' :
                        'rgba(255,255,255,0.03)';
        const labelCol =
          !enabled    ? '#f87171' :
          hasCustom   ? '#86efac' :
                        '#94a3b8';

        const statusText = !enabled
          ? '🔇 Stumm'
          : hasCustom
            ? '● Eigener Upload'
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
            <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              <label style={{
                flex: 1, padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                background: '#3B82F6', color: '#fff', fontSize: 11, fontWeight: 800,
                textAlign: 'center', opacity: isUploading ? 0.6 : 1,
                whiteSpace: 'nowrap',
              }}>
                {isUploading ? '⏳' : hasCustom ? '↑ Ersetzen' : '↑ Eigene Datei'}
                <input type="file" accept="audio/*" style={{ display: 'none' }}
                  disabled={isUploading}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(slot, f); e.target.value = ''; }} />
              </label>
              <button type="button" onClick={() => togglePreview(slot)} title="Vorhören"
                disabled={!enabled}
                style={{
                  padding: '4px 8px', borderRadius: 6, border: 'none',
                  cursor: enabled ? 'pointer' : 'not-allowed',
                  background: isPreviewing ? '#F59E0B' : 'rgba(255,255,255,0.08)',
                  color: isPreviewing ? '#000' : '#94a3b8', fontSize: 13, fontWeight: 800,
                  fontFamily: 'inherit', opacity: enabled ? 1 : 0.4,
                }}>
                {isPreviewing ? '⏹' : '▶'}
              </button>
              <button type="button" onClick={() => toggleEnabled(slot)}
                title={enabled ? 'Diesen Slot stumm schalten' : 'Wieder aktivieren'}
                style={{
                  padding: '4px 8px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  background: enabled ? 'rgba(255,255,255,0.08)' : 'rgba(239,68,68,0.18)',
                  color: enabled ? '#94a3b8' : '#f87171',
                  fontSize: 13, fontWeight: 800, fontFamily: 'inherit',
                }}>
                {enabled ? '🔊' : '🔇'}
              </button>
              {hasCustom && (
                <button type="button" onClick={() => clearSlot(slot)}
                  title="Upload entfernen, Default verwenden"
                  style={{
                    padding: '4px 8px', borderRadius: 6, border: 'none', cursor: 'pointer',
                    background: 'rgba(239,68,68,0.12)', color: '#f87171', fontSize: 13,
                    fontWeight: 800, fontFamily: 'inherit',
                  }}>
                  ↺
                </button>
              )}
            </div>
            {hasCustom && (
              <div style={{ fontSize: 9, color: '#334155', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {url!.split('/').pop()}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
