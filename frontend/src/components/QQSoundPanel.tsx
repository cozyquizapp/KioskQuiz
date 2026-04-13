import { useState, useRef } from 'react';
import { QQSoundConfig, QQ_SOUND_SLOT_LABELS } from '../../../shared/quarterQuizTypes';

/** Derive the backend origin from API_BASE so audio URLs resolve correctly in prod. */
const API_BASE = (() => {
  const envBase = (import.meta as any).env?.VITE_API_BASE as string | undefined;
  if (envBase) return envBase;
  const { protocol, hostname } = window.location;
  const isLocal = hostname === 'localhost' || hostname.startsWith('127.');
  return isLocal ? `${protocol}//${hostname}:4000/api` : `${window.location.origin}/api`;
})();

/** Turn a potentially relative audio URL into an absolute one pointing at the backend. */
function resolveAudioUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  // API_BASE looks like "http://host:port/api" — strip "/api" to get the origin
  const origin = API_BASE.replace(/\/api\/?$/, '');
  return `${origin}${url}`;
}

export function QQSoundPanel({ config, onChange }: {
  config: QQSoundConfig;
  onChange: (cfg: QQSoundConfig) => void;
}) {
  const [uploading, setUploading] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const previewRef = useRef<HTMLAudioElement | null>(null);

  async function handleUpload(slot: keyof QQSoundConfig, file: File) {
    setUploading(slot);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${API_BASE}/upload/question-audio`, { method: 'POST', body: fd });
      if (res.ok) {
        const { audioUrl } = await res.json() as { audioUrl: string };
        onChange({ ...config, [slot]: resolveAudioUrl(audioUrl) });
      } else {
        alert('Upload fehlgeschlagen');
      }
    } finally {
      setUploading(null);
    }
  }

  function togglePreview(slot: keyof QQSoundConfig) {
    const url = config[slot];
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

  function clearSlot(slot: keyof QQSoundConfig) {
    if (previewing === slot) { previewRef.current?.pause(); setPreviewing(null); }
    const next = { ...config };
    delete next[slot];
    onChange(next);
  }

  const slots = Object.keys(QQ_SOUND_SLOT_LABELS) as (keyof QQSoundConfig)[];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.5, marginBottom: 4, padding: '5px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: 6 }}>
        MP3 / OGG / WAV — max. 10 MB. Kein Upload = eingebauter Synth-Sound.
      </div>
      {slots.map(slot => {
        const label = QQ_SOUND_SLOT_LABELS[slot];
        const url = config[slot];
        const isUploading = uploading === slot;
        const isPreviewing = previewing === slot;
        return (
          <div key={slot} style={{
            padding: '7px 10px', borderRadius: 8,
            background: url ? 'rgba(34,197,94,0.07)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${url ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.07)'}`,
          }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: url ? '#86efac' : '#64748b', marginBottom: 4 }}>{label}</div>
            <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              <label style={{
                flex: url ? 0 : 1, padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                background: '#3B82F6', color: '#fff', fontSize: 11, fontWeight: 800,
                textAlign: 'center', opacity: isUploading ? 0.6 : 1,
                whiteSpace: 'nowrap',
              }}>
                {isUploading ? '⏳' : url ? '↑ Ersetzen' : '↑ Hochladen'}
                <input type="file" accept="audio/*" style={{ display: 'none' }}
                  disabled={isUploading}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(slot, f); e.target.value = ''; }} />
              </label>
              {url && (
                <button type="button" onClick={() => togglePreview(slot)} style={{
                  padding: '4px 8px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  background: isPreviewing ? '#F59E0B' : 'rgba(255,255,255,0.08)',
                  color: isPreviewing ? '#000' : '#94a3b8', fontSize: 13, fontWeight: 800,
                  fontFamily: 'inherit',
                }}>
                  {isPreviewing ? '⏹' : '▶'}
                </button>
              )}
              {url && (
                <button type="button" onClick={() => clearSlot(slot)} style={{
                  padding: '4px 8px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  background: 'rgba(239,68,68,0.12)', color: '#f87171', fontSize: 13,
                  fontWeight: 800, fontFamily: 'inherit',
                }}>
                  ✕
                </button>
              )}
            </div>
            {url && (
              <div style={{ fontSize: 9, color: '#334155', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {url.split('/').pop()}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
