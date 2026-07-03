/**
 * CozyQuizTeamBottomSheet — iOS-style Settings-Sheet fuer die /team-Phone-View.
 *
 * Sliding-Up-Sheet das via Hamburger/Punkte-Icon im Header geoeffnet wird.
 * Zeigt Live-Stats (Rang, Cells, Phase) + Joker-Bestand + Sprach-Switch +
 * Sound-Toggle + Quiz-Verlassen-Button + Hilfe-Toggle.
 *
 * Swipe-down-to-close mit Velocity-Threshold (>120px ODER >0.5 px/ms). Touch-
 * Drag am Drag-Handle + Header-Hotspot, Body bleibt scrollbar.
 *
 * Extrahiert aus QQTeamPage.tsx 2026-05-13 (Refactor Phase 3.4).
 */
import React from 'react';
import type { QQStateUpdate } from '../../../shared/quarterQuizTypes';
import { JokerIcon } from './JokerIcon';
import { HelpModal } from './CozyQuizTeamOverlays';

export function TeamBottomSheetMenu({
  lang, setLang, onClose, onLeaveRequest,
  jokersAvailable, jokersTotal, eurovisionMode,
  state, myTeamId,
}: {
  lang: 'de' | 'en';
  setLang: (l: 'de' | 'en') => void;
  onClose: () => void;
  onLeaveRequest: () => void;
  jokersAvailable: number;
  jokersTotal: number;
  eurovisionMode: boolean;
  state: QQStateUpdate;
  myTeamId: string;
}) {
  const [helpOpen, setHelpOpen] = React.useState(false);
  const myTeam = state.teams.find(t => t.id === myTeamId);
  const myColor = myTeam?.color ?? '#EC4899';
  const largeMode = !!(state as any).largeGroupMode;

  // 2026-05-11 (Wolf-Wunsch 'swipe-down zum Schließen wie iOS Bottom Sheet'):
  // Drag-Handle bekommt touch-gesture. Sheet bewegt sich mit dem Finger nach
  // unten, schließt bei threshold (>120px ODER velocity >0.5 px/ms) — sonst
  // snap-back via CSS-transition.
  // Touch-Handler werden auch auf den Header-Bereich (über STATS) gelegt, damit
  // Wolf intuitiv überall im oberen Drittel runter-swipen kann. Body bleibt
  // scrollbar via overflow:auto, der Drag greift nur am oberen Hotspot.
  const [dragY, setDragY] = React.useState(0);
  const dragStateRef = React.useRef<{ startY: number; startT: number; dy: number } | null>(null);
  const handleDragStart = (clientY: number) => {
    dragStateRef.current = { startY: clientY, startT: Date.now(), dy: 0 };
  };
  const handleDragMove = (clientY: number) => {
    if (!dragStateRef.current) return;
    const delta = clientY - dragStateRef.current.startY;
    const dy = Math.max(0, delta);  // nur nach unten ziehen
    dragStateRef.current.dy = dy;
    setDragY(dy);
  };
  const handleDragEnd = () => {
    if (!dragStateRef.current) return;
    const { startT, dy } = dragStateRef.current;
    const duration = Math.max(1, Date.now() - startT);
    const velocity = dy / duration;
    const shouldClose = dy > 120 || velocity > 0.5;
    dragStateRef.current = null;
    if (shouldClose) {
      // Visuell die letzten Pixel runterrutschen lassen während onClose feuert
      setDragY(window.innerHeight);
      window.setTimeout(() => { setDragY(0); onClose(); }, 180);
    } else {
      setDragY(0);
    }
  };
  const dragHandleProps = {
    onTouchStart: (e: React.TouchEvent) => handleDragStart(e.touches[0].clientY),
    onTouchMove:  (e: React.TouchEvent) => handleDragMove(e.touches[0].clientY),
    onTouchEnd:   handleDragEnd,
    onTouchCancel: handleDragEnd,
    // Pointer-Events für Desktop-Test (Drag mit Maus)
    onPointerDown: (e: React.PointerEvent) => {
      if (e.pointerType === 'touch') return;  // touch wird oben behandelt
      handleDragStart(e.clientY);
      (e.target as Element).setPointerCapture?.(e.pointerId);
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (e.pointerType === 'touch' || !dragStateRef.current) return;
      handleDragMove(e.clientY);
    },
    onPointerUp:    (e: React.PointerEvent) => { if (e.pointerType !== 'touch') handleDragEnd(); },
    onPointerCancel:(e: React.PointerEvent) => { if (e.pointerType !== 'touch') handleDragEnd(); },
  };
  // Compute live stats
  const totalPhases = state.totalPhases ?? 4;
  const currentPhase = (state.gamePhaseIndex ?? 0) + 1;
  const teamScores = state.teams.map(t => {
    let count = 0;
    for (let r = 0; r < state.gridSize; r++) {
      for (let c = 0; c < state.gridSize; c++) {
        if (state.grid[r]?.[c]?.ownerId === t.id) count++;
      }
    }
    return { id: t.id, name: t.name, count };
  }).sort((a, b) => b.count - a.count);
  const myPosition = teamScores.findIndex(t => t.id === myTeamId) + 1;
  const myCellsCount = teamScores.find(t => t.id === myTeamId)?.count ?? 0;
  const totalTeams = state.teams.length;
  // 2026-07-04 (Arena-Audit): in Cozy Arena hat ein Sub-Team keine Grid-Zellen.
  // Fraktions-Punkte (Summe je avatarId) + Fraktions-Rang statt Sub-Team-Werte.
  let myFactionPoints = 0, myFactionRank = 0;
  if (largeMode && myTeam) {
    const byFaction = new Map<string, number>();
    for (const t of state.teams) byFaction.set(t.avatarId, (byFaction.get(t.avatarId) ?? 0) + (t.largestConnected ?? 0));
    myFactionPoints = byFaction.get(myTeam.avatarId) ?? 0;
    myFactionRank = [...byFaction.values()].filter(v => v > myFactionPoints).length + 1;
  }
  const itemBase: React.CSSProperties = {
    width: '100%',
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '14px 16px',
    borderRadius: 16,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#F1F5F9',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: 15, fontWeight: 700,
    textAlign: 'left',
    transition: 'background 0.15s, transform 0.12s',
  };
  return (
    <>
      <div
        onClick={onClose}
        aria-hidden
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          zIndex: 998,
          animation: 'tcMenuBackdrop 0.22s ease both',
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={lang === 'de' ? 'Menü' : 'Menu'}
        style={{
          position: 'fixed', left: 0, right: 0, bottom: 0,
          paddingBottom: 'max(20px, calc(env(safe-area-inset-bottom) + 8px))',
          paddingLeft: 18, paddingRight: 18, paddingTop: 0,
          borderTopLeftRadius: 28, borderTopRightRadius: 28,
          background: 'rgba(20, 16, 31, 0.85)',
          backdropFilter: 'blur(28px) saturate(180%)',
          WebkitBackdropFilter: 'blur(28px) saturate(180%)',
          borderTop: '1px solid rgba(236,72,153,0.32)',
          boxShadow: '0 -16px 48px rgba(0,0,0,0.55)',
          zIndex: 999,
          animation: dragY === 0 ? 'tcMenuSlideUp 0.32s cubic-bezier(0.32, 0.72, 0, 1) both' : 'none',
          maxHeight: '85vh',
          overflowY: 'auto',
          // 2026-05-11 (Wolf): Sheet bewegt sich beim Drag mit Finger; snap-back
          // wenn losgelassen ohne threshold zu erreichen.
          transform: `translateY(${dragY}px)`,
          transition: dragStateRef.current ? 'none' : 'transform 0.22s cubic-bezier(0.32, 0.72, 0, 1)',
          touchAction: 'pan-y',
        }}
      >
        {/* Drag-Handle + Header-Hotspot — swipe-down schließt das Menü.
            2026-05-11 (Wolf): X-Button entfernt, Handle ist jetzt die einzige
            Schließ-Geste (Tap ODER Swipe-down). Plus expliziter Header-Bereich
            darunter ist auch drag-fähig — so kann Wolf intuitiv im ganzen
            oberen Drittel runterswipen. */}
        <div
          {...dragHandleProps}
          onClick={(e) => {
            // Tap-on-Handle schließt (wenn nicht gerade dragging)
            if (!dragStateRef.current && dragY === 0) onClose();
            e.stopPropagation();
          }}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            paddingTop: 12, paddingBottom: 4,
            cursor: 'grab', touchAction: 'none',
            userSelect: 'none', WebkitUserSelect: 'none',
          }}
        >
          <span aria-label={lang === 'de' ? 'Menü schließen (ziehen oder tippen)' : 'Close menu (drag or tap)'}
            style={{
              display: 'inline-block',
              width: 44, height: 5,
              background: dragY > 0 ? 'rgba(236,72,153,0.85)' : 'rgba(255,255,255,0.32)',
              borderRadius: 999,
              transition: 'background 0.15s',
            }} />
        </div>

        {/* Header-Row: Title links — kein X-Button mehr, Swipe-Handle reicht. */}
        <div
          {...dragHandleProps}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 12, padding: '6px 4px 4px',
            touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none',
            cursor: 'grab',
          }}
        >
          <div style={{
            fontSize: 12, fontWeight: 900, color: '#94A3B8',
            textTransform: 'uppercase', letterSpacing: '0.12em',
          }}>
            {lang === 'de' ? 'Menü' : 'Menu'}
          </div>
          <div style={{
            fontSize: 10, fontWeight: 700, color: '#64748b',
            letterSpacing: '0.08em',
          }}>
            {lang === 'de' ? '↓ runterziehen zum schließen' : '↓ swipe down to close'}
          </div>
        </div>

        {/* STATS-Row — Phase, Position, Zellen kompakt */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
          marginBottom: 12,
        }}>
          {[
            {
              label: lang === 'de' ? 'Phase' : 'Phase',
              value: `${currentPhase}/${totalPhases}`,
              accent: '#EC4899',
            },
            {
              label: lang === 'de' ? 'Position' : 'Position',
              value: largeMode
                ? (myFactionRank > 0 ? `#${myFactionRank}` : '–')
                : (totalTeams > 0 ? `#${myPosition}` : '–'),
              accent: myColor,
            },
            largeMode
              ? {
                  label: lang === 'de' ? 'Punkte' : 'Points',
                  value: String(myFactionPoints),
                  accent: '#22C55E',
                }
              : {
                  label: lang === 'de' ? 'Zellen' : 'Cells',
                  value: String(myCellsCount),
                  accent: '#22C55E',
                },
          ].map((stat) => (
            <div key={stat.label} style={{
              padding: '10px 8px', borderRadius: 14,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              textAlign: 'center',
            }}>
              <div style={{
                fontSize: 10, fontWeight: 900, color: '#94A3B8',
                textTransform: 'uppercase', letterSpacing: '0.08em',
                marginBottom: 4,
              }}>{stat.label}</div>
              <div style={{
                fontSize: 19, fontWeight: 900, color: stat.accent,
                letterSpacing: '-0.02em', lineHeight: 1,
              }}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* MEIN BRETT — Mini-Grid mit eigenen Zellen highlighted.
            Arena-Audit 2026-07-04: in Cozy Arena kein Brett (gridSize bleibt
            backend-seitig ≠ 0, daher explizit auf !largeMode gaten). */}
        {!largeMode && state.gridSize > 0 && (
          <div style={{
            padding: '12px 12px 14px',
            borderRadius: 14,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            marginBottom: 12,
          }}>
            <div style={{
              fontSize: 11, fontWeight: 900, color: '#94A3B8',
              textTransform: 'uppercase', letterSpacing: '0.08em',
              marginBottom: 8, display: 'flex', justifyContent: 'space-between',
            }}>
              <span>{lang === 'de' ? 'Mein Brett' : 'My board'}</span>
              <span style={{ color: myColor, fontWeight: 900 }}>{myCellsCount}× <span style={{ opacity: 0.7 }}>{lang === 'de' ? 'mein' : 'mine'}</span></span>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${state.gridSize}, 1fr)`,
              gap: 3,
              maxWidth: 220, margin: '0 auto',
            }}>
              {Array.from({ length: state.gridSize }).flatMap((_, r) =>
                Array.from({ length: state.gridSize }).map((__, c) => {
                  const cell = state.grid[r]?.[c];
                  const isMine = cell?.ownerId === myTeamId;
                  const ownerTeam = cell?.ownerId ? state.teams.find(t => t.id === cell.ownerId) : null;
                  const ownerColor = ownerTeam?.color ?? null;
                  const ownerEmoji = ownerTeam?.emoji ?? null;
                  const isStacked = !!cell?.stuck;
                  const isShielded = !!cell?.shielded;
                  return (
                    <div
                      key={`${r}-${c}`}
                      style={{
                        // Solid backgrounds (statt glassy) — Lesbarkeit > Style
                        // bei kleinen Grid-Cells. Matcht /beamer-Grid-Logic.
                        aspectRatio: '1 / 1',
                        borderRadius: 4,
                        background: isMine
                          ? myColor
                          : ownerColor
                            ? ownerColor
                            : '#1a1424',
                        border: isMine
                          ? `1.5px solid ${myColor}`
                          : ownerColor
                            ? `1px solid ${ownerColor}`
                            : '1px solid rgba(255,255,255,0.10)',
                        boxShadow: isMine ? `0 0 6px ${myColor}88` : 'none',
                        position: 'relative',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        overflow: 'hidden',
                      }}
                    >
                      {/* Owner-Emoji als Identifier (Farbschwäche-tauglich) */}
                      {ownerEmoji && (
                        <span style={{
                          fontSize: 12, lineHeight: 1,
                          opacity: isMine ? 0.95 : 0.75,
                          filter: isMine ? 'drop-shadow(0 0 2px rgba(0,0,0,0.5))' : 'none',
                        }}>{ownerEmoji}</span>
                      )}
                      {/* Stacked/Shielded-Marker als kleines Overlay top-right */}
                      {isMine && isStacked && (
                        <span style={{
                          position: 'absolute', top: 0, right: 1,
                          fontSize: 8, color: '#fff', lineHeight: 1,
                          textShadow: '0 0 3px rgba(0,0,0,0.8)',
                        }}>★</span>
                      )}
                      {isMine && isShielded && !isStacked && (
                        <span style={{
                          position: 'absolute', top: 0, right: 1,
                          fontSize: 7, color: '#fff', lineHeight: 1,
                          textShadow: '0 0 3px rgba(0,0,0,0.8)',
                        }}>🛡</span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Sprache */}
        <button
          onClick={() => {
            setLang(lang === 'de' ? 'en' : 'de');
            if (navigator.vibrate) navigator.vibrate(8);
          }}
          style={{ ...itemBase, marginBottom: 10 }}
          onTouchStart={(e) => { e.currentTarget.style.transform = 'scale(0.98)'; }}
          onTouchEnd={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          <span style={{ fontSize: 26, lineHeight: 1 }}>{lang === 'de' ? '🇩🇪' : '🇬🇧'}</span>
          <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 15, fontWeight: 800 }}>
              {lang === 'de' ? 'Sprache · Deutsch' : 'Language · English'}
            </span>
            <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600 }}>
              {lang === 'de' ? 'Tippen zum Wechseln auf Englisch' : 'Tap to switch to German'}
            </span>
          </span>
          <span style={{
            fontSize: 11, fontWeight: 900, color: '#EC4899',
            padding: '4px 10px', borderRadius: 999,
            background: 'rgba(236,72,153,0.12)',
            border: '1px solid rgba(236,72,153,0.35)',
            letterSpacing: 0.4,
          }}>
            {lang === 'de' ? 'EN' : 'DE'}
          </span>
        </button>

        {/* Joker-Counter — read-only Info, nicht klickbar.
            2026-07-03 (Wolf-Audit): In Cozy Arena gibt es keine Joker → jokersTotal=0
            wird durchgereicht, dann Sektion komplett ausblenden (kein „0 von 0"). */}
        {jokersTotal > 0 && (
        <div style={{
          ...itemBase,
          cursor: 'default',
          marginBottom: 10,
          background: 'rgba(255,255,255,0.02)',
        }}>
          <span style={{ display: 'inline-flex', gap: 4 }}>
            {Array.from({ length: jokersTotal }).map((_, i) => {
              const used = i >= jokersAvailable;
              return (
                <JokerIcon
                  key={i}
                  i={i}
                  size={26}
                  eurovisionMode={eurovisionMode}
                  alt=""
                  style={{
                    width: 26, height: 26,
                    opacity: used ? 0.32 : 1,
                    filter: used ? 'grayscale(1) brightness(0.7)' : undefined,
                  }}
                />
              );
            })}
          </span>
          <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 15, fontWeight: 800 }}>
              {lang === 'de' ? 'Joker' : 'Jokers'}
            </span>
            <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600 }}>
              {lang === 'de'
                ? `${jokersAvailable} von ${jokersTotal} verfügbar`
                : `${jokersAvailable} of ${jokersTotal} available`}
            </span>
          </span>
        </div>
        )}

        {/* Hilfe / Kurz-Regeln */}
        <button
          onClick={() => { setHelpOpen(true); if (navigator.vibrate) navigator.vibrate(8); }}
          style={{ ...itemBase, marginBottom: 10 }}
          onTouchStart={(e) => { e.currentTarget.style.transform = 'scale(0.98)'; }}
          onTouchEnd={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          <span style={{ fontSize: 22, lineHeight: 1 }}>❓</span>
          <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 15, fontWeight: 800 }}>
              {lang === 'de' ? 'Hilfe · Kurz-Regeln' : 'Help · Quick rules'}
            </span>
            <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600 }}>
              {lang === 'de' ? 'Wie spielt man CozyQuiz?' : 'How to play CozyQuiz'}
            </span>
          </span>
        </button>

        {/* Quiz verlassen */}
        <button
          onClick={() => { onLeaveRequest(); if (navigator.vibrate) navigator.vibrate(12); }}
          style={{
            ...itemBase,
            background: 'rgba(239,68,68,0.10)',
            border: '1px solid rgba(239,68,68,0.30)',
            color: '#FCA5A5',
            marginBottom: 14,
          }}
          onTouchStart={(e) => { e.currentTarget.style.transform = 'scale(0.98)'; }}
          onTouchEnd={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          <span style={{ fontSize: 22, lineHeight: 1 }}>🚪</span>
          <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 15, fontWeight: 800 }}>
              {lang === 'de' ? 'Quiz verlassen' : 'Leave quiz'}
            </span>
            <span style={{ fontSize: 12, color: 'rgba(252,165,165,0.7)', fontWeight: 600 }}>
              {lang === 'de'
                ? 'Team-Identität wird zurückgesetzt'
                : 'Team identity will be reset'}
            </span>
          </span>
        </button>

        {/* Schliessen */}
        <button
          onClick={onClose}
          style={{
            ...itemBase,
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            color: '#94A3B8',
            fontSize: 14,
            fontWeight: 800,
            padding: '12px 16px',
          }}
        >
          {lang === 'de' ? 'Schließen' : 'Close'}
        </button>
      </div>

      {/* Hilfe-Overlay (innerhalb des Menüs gerendert, schliesst sich separat) */}
      {helpOpen && <HelpModal lang={lang} onClose={() => setHelpOpen(false)} largeMode={largeMode} />}
    </>
  );
}
