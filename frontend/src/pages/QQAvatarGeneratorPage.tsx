// 2026-05-04 — Team-Avatar-Picker (Lobby-Setup-Style, Mobile-First)
// Wolfs Entwurf als Basis: Name + Emoji + Farbe + Add/Remove-Teams
// in Karten-Optik, Modal-Picker mit Free-Input + Vorschlägen + Kategorien.
// Alle bisherigen Generator-/Picker-Modi entfernt — diese Page IST der Picker.

import { useMemo, useRef, useState, useEffect } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { QQ_AVATARS } from '@shared/quarterQuizTypes';

// ─── Color-Helper (HSL-Roundtrip für Glow-Ableitung) ───────────────────────
function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h, s, l];
}
function hslToHex(h: number, s: number, l: number): string {
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r = l, g = l, b = l;
  if (s !== 0) {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
function adjust(hex: string, opts: { sat?: number; light?: number }): string {
  const [h, s, l] = hexToHsl(hex);
  const newS = Math.max(0, Math.min(1, s + (opts.sat ?? 0)));
  const newL = Math.max(0, Math.min(1, l + (opts.light ?? 0)));
  return hslToHex(h, newS, newL);
}

// ─── 8 Team-Farben aus QQ_AVATARS ─────────────────────────────────────────
type TeamColor = { bg: string; glow: string; label: string };

const TEAM_COLORS: TeamColor[] = QQ_AVATARS.map(av => ({
  bg: av.color,
  glow: adjust(av.color, { sat: +0.05, light: +0.18 }),
  label: av.label,
}));

// ─── Vorschläge ────────────────────────────────────────────────────────────
const SUGGESTED_EMOJIS = [
  '🐻', '🐼', '🦊', '🐨', '🦁', '🐯', '🐸', '🦋',
  '🦄', '🐙', '🦖', '🐲', '🦅', '🦉', '🐺', '🦝',
  '🍕', '⚡', '🌈', '💎', '🔥', '❄️', '🌙', '⭐',
  '🎯', '🚀', '🏆', '💡', '🎲', '🃏', '🧩', '🎮',
];

const EMOJI_CATS: { id: string; label: string; emojis: string[] }[] = [
  { id: 'tiere', label: 'Tiere', emojis: [
    '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵',
    '🐔', '🐧', '🦅', '🦉', '🦇', '🐺', '🐗', '🦄', '🐝', '🦋', '🐢', '🐍', '🦎', '🐙', '🐠',
    '🐬', '🦈', '🐳', '🐊', '🦒', '🦓', '🦛', '🐪', '🦘', '🦔', '🦦', '🦥',
  ]},
  { id: 'gesichter', label: 'Gesichter', emojis: [
    '😀', '😎', '🤓', '🥸', '🤩', '😏', '🤔', '🤨', '😴', '🥶', '🥵', '🤯', '🤠', '🥳', '🤡',
    '🤖', '👽', '👾', '👻', '💀', '😺', '😈', '🥺', '😇', '🤪', '😜', '😋', '🤤',
  ]},
  { id: 'helden', label: 'Charaktere', emojis: [
    '🦸', '🦹', '🧙', '🧚', '🧛', '🧜', '🧝', '🧞', '🧟', '🥷', '🤴', '👸', '🧑‍🚀', '🧑‍🎨',
    '🧑‍🍳', '🧑‍🎤', '🧑‍⚕️', '🧑‍🌾', '🧑‍🏫', '🧑‍🔬', '🧑‍🎓', '🧑‍🚒', '🕵️', '🧑‍✈️',
  ]},
  { id: 'essen', label: 'Essen', emojis: [
    '🍕', '🍔', '🌮', '🍣', '🍩', '🍪', '🥨', '🍰', '🍓', '🍑', '🥑', '🍋', '🌶️', '🥕', '🍄',
    '🥐', '🍿', '🍻', '🥗', '🌭', '🍦', '🥞', '☕', '🧃', '🍇', '🍉', '🍌', '🍍', '🥥', '🍒',
  ]},
  { id: 'sport', label: 'Sport & Spiel', emojis: [
    '⚽', '🏀', '🎾', '🏈', '🎯', '🏆', '🥇', '🎳', '🎲', '🎮', '🕹️', '♟️', '🎭', '🎨', '🎬',
    '🎤', '🎧', '🎸', '🥁', '🎺', '🎻', '🎷', '🪀', '🎢', '🎡', '🎪', '🪄', '🧩',
  ]},
  { id: 'natur', label: 'Natur', emojis: [
    '🌲', '🌳', '🌴', '🌵', '🌾', '🌹', '🌻', '🌷', '🍀', '🍄', '🌙', '⭐', '🌟', '💫', '✨',
    '🌈', '⚡', '🔥', '💧', '🌊', '☀️', '❄️', '☃️', '🌸', '🌺', '🍁', '🍂', '🌍', '🌋', '🏔️',
  ]},
  { id: 'objekte', label: 'Objekte', emojis: [
    '🎩', '👑', '💎', '🔮', '🪐', '🚀', '🛸', '🏰', '🎁', '📚', '🔭', '🧪', '💡', '🗝️', '⚙️',
    '🧲', '🪙', '⚓', '🪁', '🎏', '🛼', '⛵', '🚂', '🛞', '🪩', '📷', '🎞️', '📡', '💾', '🖼️',
  ]},
  { id: 'symbole', label: 'Symbole', emojis: [
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💯', '♥️', '♦️',
    '♣️', '♠️', '☯️', '♻️', '✅', '❌', '❓', '‼️', '♾️', '🆗', '🅰️', '🅱️', '🅾️', '🆎', '🔱',
  ]},
];

// ─── Types ─────────────────────────────────────────────────────────────────
type Team = { name: string; emoji: string; color: TeamColor };

const DEFAULT_TEAMS: Team[] = [
  { name: 'Team Hund',     emoji: QQ_AVATARS[0].emoji, color: TEAM_COLORS[0] },
  { name: 'Team Faultier', emoji: QQ_AVATARS[1].emoji, color: TEAM_COLORS[1] },
  { name: 'Team Pinguin',  emoji: QQ_AVATARS[2].emoji, color: TEAM_COLORS[2] },
  { name: 'Team Koala',    emoji: QQ_AVATARS[3].emoji, color: TEAM_COLORS[3] },
];

// ─── Avatar (runder Glow-Disc mit Emoji) ──────────────────────────────────
function Avatar({
  emoji, color, size = 80, selected = false,
}: { emoji: string; color: TeamColor; size?: number; selected?: boolean }) {
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: `radial-gradient(circle at 35% 35%, ${color.bg}cc, ${color.bg})`,
      border: `3px solid ${selected ? '#fff' : color.bg}`,
      boxShadow: selected
        ? `0 0 0 3px ${color.glow}, 0 0 24px ${color.glow}88`
        : `0 0 12px ${color.bg}66, inset 0 -4px 8px rgba(0,0,0,0.3)`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: size * 0.48,
      lineHeight: 1,
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      flexShrink: 0,
      userSelect: 'none',
    }}>
      {emoji || '?'}
    </div>
  );
}

// ─── TeamCard ──────────────────────────────────────────────────────────────
function TeamCard({
  team, index, onEmojiClick, onNameChange, onColorChange,
}: {
  team: Team;
  index: number;
  onEmojiClick: (i: number) => void;
  onNameChange: (i: number, name: string) => void;
  onColorChange: (i: number, color: TeamColor) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1e1a2e 0%, #2a1f3d 100%)',
      border: `2px solid ${team.color.glow}44`,
      borderRadius: 16,
      padding: 18,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 12,
      boxShadow: `0 4px 20px rgba(0,0,0,0.4), 0 0 0 1px ${team.color.glow}22`,
      transition: 'border-color 0.3s',
    }}>
      {/* Rank Badge */}
      <div style={{
        alignSelf: 'flex-start',
        background: team.color.bg,
        color: '#fff',
        fontSize: 11,
        fontWeight: 800,
        padding: '3px 10px',
        borderRadius: 20,
        letterSpacing: 1,
        boxShadow: `0 2px 8px ${team.color.glow}44`,
      }}>
        TEAM {index + 1}
      </div>

      {/* Avatar mit Edit-Bubble */}
      <button
        type="button"
        onClick={() => onEmojiClick(index)}
        aria-label={`Emoji für Team ${index + 1} ändern`}
        style={{
          position: 'relative',
          background: 'transparent',
          border: 'none',
          padding: 6,
          cursor: 'pointer',
          // garantiert großen Touch-Hitbereich
          minWidth: 96,
          minHeight: 96,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Avatar emoji={team.emoji} color={team.color} size={84} selected />
        <span style={{
          position: 'absolute',
          bottom: 2,
          right: 2,
          width: 30,
          height: 30,
          borderRadius: '50%',
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 15,
          boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
        }}>✏️</span>
      </button>

      {/* Name-Input */}
      <input
        ref={inputRef}
        value={team.name}
        onChange={(e) => onNameChange(index, e.target.value)}
        placeholder="Teamname…"
        maxLength={14}
        // 16px Font verhindert iOS-Auto-Zoom bei Focus
        style={{
          background: 'rgba(255,255,255,0.07)',
          border: `1.5px solid ${team.color.glow}55`,
          borderRadius: 10,
          color: '#fff',
          fontSize: 16,
          fontWeight: 700,
          padding: '10px 12px',
          width: '100%',
          textAlign: 'center',
          outline: 'none',
          boxSizing: 'border-box',
          fontFamily: 'inherit',
          minHeight: 44,
        }}
      />

      {/* Color-Picker */}
      <div style={{
        display: 'flex',
        gap: 8,
        flexWrap: 'wrap',
        justifyContent: 'center',
        // genug Padding für Touch
        padding: '4px 0',
      }}>
        {TEAM_COLORS.map((c, ci) => {
          const active = c.label === team.color.label;
          return (
            <button
              key={ci}
              type="button"
              onClick={() => onColorChange(index, c)}
              aria-label={`Farbe ${c.label}`}
              style={{
                // sichtbarer Dot 22px, Touch-Hitbereich 32px
                width: 32,
                height: 32,
                padding: 0,
                borderRadius: '50%',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{
                display: 'block',
                width: active ? 24 : 22,
                height: active ? 24 : 22,
                borderRadius: '50%',
                background: c.bg,
                border: active ? '2.5px solid #fff' : '2px solid transparent',
                boxShadow: active ? `0 0 8px ${c.glow}` : 'none',
                transition: 'all 0.15s',
              }} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Emoji-Picker-Modal (Bottom-Sheet auf Phone) ──────────────────────────
function EmojiPickerModal({
  forTeamIdx, currentEmoji, accent, onSelect, onClose,
}: {
  forTeamIdx: number;
  currentEmoji: string;
  accent: TeamColor;
  onSelect: (emoji: string) => void;
  onClose: () => void;
}) {
  const [input, setInput] = useState('');
  const [showCats, setShowCats] = useState(false);
  const [activeCat, setActiveCat] = useState(EMOJI_CATS[0].id);
  const cat = EMOJI_CATS.find(c => c.id === activeCat) ?? EMOJI_CATS[0];

  // Body-Scroll-Lock solange Modal offen ist
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const submitInput = () => {
    const trimmed = input.trim();
    if (trimmed) onSelect(trimmed);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'flex-end',         // Bottom-Sheet auf Phone
        justifyContent: 'center',
        zIndex: 100,
        // safe-area unten respektieren
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
      className="qq-avatar-modal-backdrop"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="qq-avatar-modal-content"
        style={{
          background: 'linear-gradient(135deg, #1e1a2e, #2d2040)',
          border: `2px solid ${accent.glow}55`,
          borderRadius: '20px 20px 0 0',
          padding: 22,
          width: '100%',
          maxWidth: 460,
          maxHeight: '88vh',
          overflowY: 'auto',
          boxShadow: `0 -10px 40px rgba(0,0,0,0.7), 0 0 40px ${accent.bg}33`,
          // smooth slide-in
          animation: 'qq-avatar-sheet-in 0.22s cubic-bezier(0.22,1,0.36,1)',
        }}
      >
        {/* Drag-Handle (visuell, kein echter Drag) */}
        <div style={{
          width: 44, height: 4, borderRadius: 4,
          background: 'rgba(255,255,255,0.15)',
          margin: '0 auto 14px',
        }} />

        <h3 style={{
          color: '#fff',
          margin: '0 0 14px',
          textAlign: 'center',
          fontSize: 17,
          fontWeight: 800,
          letterSpacing: 0.5,
        }}>
          Emoji für TEAM {forTeamIdx + 1}
          <span style={{
            display: 'inline-block',
            marginLeft: 8,
            color: accent.glow,
          }}>{currentEmoji}</span>
        </h3>

        {/* Free-Input mit ✓ */}
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <input
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submitInput(); }}
            placeholder="Emoji eintippen oder einfügen…"
            inputMode="text"
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.08)',
              border: `1.5px solid ${accent.glow}55`,
              borderRadius: 12,
              color: '#fff',
              fontSize: 22,
              padding: '14px 56px 14px 18px',
              outline: 'none',
              boxSizing: 'border-box',
              textAlign: 'center',
              fontFamily: 'inherit',
              minHeight: 52,
            }}
          />
          {input && (
            <button
              type="button"
              onClick={submitInput}
              aria-label="Übernehmen"
              style={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                background: accent.bg,
                border: 'none',
                borderRadius: 8,
                color: '#fff',
                padding: '8px 12px',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 800,
                fontFamily: 'inherit',
                minHeight: 36,
              }}
            >✓</button>
          )}
        </div>

        {/* Quick-Picks */}
        <div style={{
          color: '#94a3b8',
          fontSize: 11,
          letterSpacing: 1,
          marginBottom: 8,
          textTransform: 'uppercase',
          fontWeight: 800,
        }}>
          Vorschläge
        </div>
        <div className="qq-avatar-emoji-grid" style={{
          display: 'grid',
          gap: 6,
          marginBottom: 14,
        }}>
          {SUGGESTED_EMOJIS.map((em, i) => (
            <EmojiBtn
              key={i}
              emoji={em}
              accent={accent}
              isCurrent={currentEmoji === em}
              onClick={() => onSelect(em)}
            />
          ))}
        </div>

        {/* Mehr Kategorien (Klappe) */}
        <button
          type="button"
          onClick={() => setShowCats(s => !s)}
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10,
            color: '#cbd5e1',
            padding: '10px 14px',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
            marginBottom: 10,
            minHeight: 44,
          }}
        >
          {showCats ? '▴ Kategorien zuklappen' : '▾ Mehr Emojis · 8 Kategorien'}
        </button>

        {showCats && (
          <>
            <div style={{
              display: 'flex',
              gap: 6,
              flexWrap: 'wrap',
              marginBottom: 10,
            }}>
              {EMOJI_CATS.map(c => {
                const active = c.id === activeCat;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setActiveCat(c.id)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 999,
                      border: `1px solid ${active ? accent.glow : 'rgba(255,255,255,0.10)'}`,
                      background: active ? `${accent.glow}22` : 'rgba(255,255,255,0.03)',
                      color: active ? '#f8fafc' : '#cbd5e1',
                      fontSize: 12,
                      fontWeight: active ? 800 : 600,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      minHeight: 36,
                    }}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
            <div className="qq-avatar-emoji-grid" style={{
              display: 'grid',
              gap: 6,
              marginBottom: 14,
            }}>
              {cat.emojis.map((em, i) => (
                <EmojiBtn
                  key={`${em}-${i}`}
                  emoji={em}
                  accent={accent}
                  isCurrent={currentEmoji === em}
                  onClick={() => onSelect(em)}
                />
              ))}
            </div>
          </>
        )}

        <p style={{
          color: '#64748b',
          fontSize: 12,
          textAlign: 'center',
          margin: '10px 0 14px',
          lineHeight: 1.45,
        }}>
          💡 Auf dem Handy → Globus-Taste auf der Tastatur drücken für Emojis
        </p>

        <button
          type="button"
          onClick={onClose}
          style={{
            display: 'block',
            width: '100%',
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10,
            color: '#cbd5e1',
            padding: 14,
            cursor: 'pointer',
            fontSize: 15,
            fontWeight: 700,
            fontFamily: 'inherit',
            minHeight: 48,
          }}
        >
          Schließen
        </button>
      </div>
    </div>
  );
}

// Re-usable Emoji-Button im Modal-Grid
function EmojiBtn({
  emoji, accent, isCurrent, onClick,
}: { emoji: string; accent: TeamColor; isCurrent: boolean; onClick: () => void }) {
  const baseBg = isCurrent ? `${accent.glow}28` : 'rgba(255,255,255,0.06)';
  const baseBorder = isCurrent ? `2px solid ${accent.glow}` : '1px solid rgba(255,255,255,0.05)';
  const ref = useRef<HTMLButtonElement | null>(null);

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      style={{
        aspectRatio: '1',
        background: baseBg,
        border: baseBorder,
        borderRadius: 10,
        fontSize: 26,
        lineHeight: 1,
        cursor: 'pointer',
        transition: 'background 0.15s, transform 0.15s',
        fontFamily: 'inherit',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        // Touch-Tap-Highlight ausstellen (iOS Safari)
        WebkitTapHighlightColor: 'transparent',
      }}
      onMouseEnter={() => {
        const el = ref.current; if (!el) return;
        el.style.background = `${accent.glow}33`;
        el.style.transform = 'scale(1.12)';
      }}
      onMouseLeave={() => {
        const el = ref.current; if (!el) return;
        el.style.background = baseBg;
        el.style.transform = 'scale(1)';
      }}
    >
      {emoji}
    </button>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────
const QQAvatarGeneratorPage = () => {
  const [teams, setTeams] = useState<Team[]>(DEFAULT_TEAMS);
  const [pickerOpen, setPickerOpen] = useState<number | null>(null);

  const handleEmojiSelect = (emoji: string) => {
    setTeams(t => t.map((team, i) => (i === pickerOpen ? { ...team, emoji } : team)));
    // Picker bleibt offen für „nächstes Team direkt anpassen"-Flow? Nein —
    // im Lobby-Setup ist 1-Tap-1-Auswahl klarer. Schließen.
    setPickerOpen(null);
  };

  const handleNameChange = (index: number, name: string) => {
    setTeams(t => t.map((team, i) => (i === index ? { ...team, name } : team)));
  };

  const handleColorChange = (index: number, color: TeamColor) => {
    setTeams(t => t.map((team, i) => (i === index ? { ...team, color } : team)));
  };

  const addTeam = () => {
    if (teams.length >= 8) return;
    const color = TEAM_COLORS[teams.length % TEAM_COLORS.length];
    const fallback = QQ_AVATARS[teams.length % QQ_AVATARS.length];
    setTeams(t => [...t, {
      name: `Team ${t.length + 1}`,
      emoji: fallback.emoji,
      color,
    }]);
  };

  const removeTeam = () => {
    if (teams.length <= 2) return;
    setTeams(t => t.slice(0, -1));
  };

  const pickerAccent = pickerOpen != null ? teams[pickerOpen].color : TEAM_COLORS[0];
  const pickerEmoji  = pickerOpen != null ? teams[pickerOpen].emoji : '';

  // Memo wrappers in case we want to add Resize-Logik later
  const teamGridStyle = useMemo<CSSProperties>(() => ({
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 16,
    maxWidth: 880,
    margin: '0 auto 28px',
  }), []);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at center, #1a0f2e 0%, #0d0d0d 100%)',
      padding: '20px 14px calc(48px + env(safe-area-inset-bottom, 0px))',
      fontFamily: 'var(--font, system-ui)',
      color: '#e2e8f0',
    }}>
      {/* Inline-CSS für Animations + responsive Emoji-Grid */}
      <style>{`
        @keyframes qq-avatar-sheet-in {
          from { transform: translateY(20px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        .qq-avatar-emoji-grid {
          grid-template-columns: repeat(8, 1fr);
        }
        @media (max-width: 480px) {
          .qq-avatar-emoji-grid { grid-template-columns: repeat(6, 1fr); }
        }
        @media (max-width: 360px) {
          .qq-avatar-emoji-grid { grid-template-columns: repeat(5, 1fr); }
        }
        /* iOS-Tap-Highlight global ausschalten auf dieser Page */
        .qq-avatar-page button { -webkit-tap-highlight-color: transparent; }
      `}</style>

      <div className="qq-avatar-page">
        {/* Top-Bar mit Menü-Link */}
        <div style={{
          maxWidth: 880, margin: '0 auto 8px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <Link to="/alt/menu" style={{
            fontSize: 13, color: '#94a3b8', textDecoration: 'none',
            padding: '8px 14px', borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.04)',
            minHeight: 40, display: 'inline-flex', alignItems: 'center',
          }}>← Menü</Link>
          <span style={{ fontSize: 11, color: '#475569', letterSpacing: 1 }}>
            /testpage · Spielwiese
          </span>
        </div>

        {/* Header */}
        <div style={{ textAlign: 'center', margin: '24px 0 28px' }}>
          <div style={{
            fontSize: 12,
            letterSpacing: 4,
            color: '#c56bff',
            textTransform: 'uppercase',
            marginBottom: 10,
            fontWeight: 800,
          }}>
            ✦ Team Setup ✦
          </div>
          <h1 style={{
            color: '#fff',
            fontSize: 'clamp(24px, 6vw, 40px)',
            margin: 0,
            fontWeight: 900,
            letterSpacing: -0.5,
            textShadow: '0 0 40px #c56bff44',
          }}>
            Wählt eure Avatare
          </h1>
          <p style={{
            color: '#64748b',
            margin: '10px 0 0',
            fontSize: 14,
            lineHeight: 1.5,
          }}>
            Tippt auf den Avatar, um ein Emoji zu wählen
          </p>
        </div>

        {/* Team-Grid */}
        <div style={teamGridStyle}>
          {teams.map((team, i) => (
            <TeamCard
              key={i}
              team={team}
              index={i}
              onEmojiClick={setPickerOpen}
              onNameChange={handleNameChange}
              onColorChange={handleColorChange}
            />
          ))}
        </div>

        {/* Add/Remove */}
        <div style={{
          display: 'flex',
          gap: 12,
          justifyContent: 'center',
          flexWrap: 'wrap',
          marginBottom: 36,
          padding: '0 8px',
        }}>
          <button
            type="button"
            onClick={removeTeam}
            disabled={teams.length <= 2}
            style={{
              flex: '1 1 160px',
              maxWidth: 220,
              background: 'rgba(255,255,255,0.07)',
              border: '1.5px solid rgba(255,255,255,0.12)',
              borderRadius: 12,
              color: teams.length <= 2 ? '#444' : '#fff',
              padding: '12px 18px',
              cursor: teams.length <= 2 ? 'not-allowed' : 'pointer',
              fontSize: 15,
              fontWeight: 700,
              fontFamily: 'inherit',
              minHeight: 48,
              transition: 'all 0.2s',
            }}
          >
            − Team entfernen
          </button>
          <button
            type="button"
            onClick={addTeam}
            disabled={teams.length >= 8}
            style={{
              flex: '1 1 160px',
              maxWidth: 220,
              background: teams.length >= 8
                ? 'rgba(255,255,255,0.05)'
                : 'linear-gradient(135deg, #8e44ad, #c56bff)',
              border: 'none',
              borderRadius: 12,
              color: teams.length >= 8 ? '#444' : '#fff',
              padding: '12px 18px',
              cursor: teams.length >= 8 ? 'not-allowed' : 'pointer',
              fontSize: 15,
              fontWeight: 800,
              fontFamily: 'inherit',
              boxShadow: teams.length < 8 ? '0 4px 16px #8e44ad55' : 'none',
              minHeight: 48,
              transition: 'all 0.2s',
            }}
          >
            + Team hinzufügen
          </button>
        </div>

        {/* Live-Preview */}
        <div style={{
          maxWidth: 880,
          margin: '0 auto',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 16,
          padding: 18,
        }}>
          <div style={{
            color: '#64748b',
            fontSize: 11,
            letterSpacing: 2,
            textTransform: 'uppercase',
            marginBottom: 14,
            textAlign: 'center',
            fontWeight: 800,
          }}>
            Vorschau — so seht ihr im Spiel aus
          </div>
          <div style={{
            display: 'flex',
            gap: 14,
            justifyContent: 'center',
            flexWrap: 'wrap',
            // horizontaler Scroll falls's eng wird
            overflowX: 'auto',
            paddingBottom: 4,
          }}>
            {teams.map((team, i) => (
              <div key={i} style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                minWidth: 64,
              }}>
                <Avatar emoji={team.emoji} color={team.color} size={52} selected />
                <span style={{
                  color: '#e2e8f0',
                  fontSize: 12,
                  fontWeight: 800,
                  maxWidth: 78,
                  textAlign: 'center',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontFamily: 'inherit',
                }}>
                  {team.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Picker-Modal */}
      {pickerOpen !== null && (
        <EmojiPickerModal
          forTeamIdx={pickerOpen}
          currentEmoji={pickerEmoji}
          accent={pickerAccent}
          onSelect={handleEmojiSelect}
          onClose={() => setPickerOpen(null)}
        />
      )}
    </div>
  );
};

export default QQAvatarGeneratorPage;
