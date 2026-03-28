import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  AnyQuestion,
  MultipleChoiceQuestion,
  SortItemsQuestion,
  Language,
  StateUpdatePayload,
  CozyGameState,
  Team,
  BlitzState,
  BunteTuetePayload,
  RundlaufState,
  BettingQuestion
} from '@shared/quizTypes';
import {
  fetchCurrentQuestion,
  joinRoom,
  submitAnswer,
  fetchLanguage,
} from '../api';
import { connectToRoom, SOCKET_URL } from '../socket';
import { categoryColors } from '../categoryColors';
import { categoryLabels } from '../categoryLabels';
import { PrimaryButton, Pill } from '../components/uiPrimitives';
import { SyncStatePayload } from '@shared/quizTypes';
import { CountUpNumber } from '../components/CountUpNumber';
import { SkeletonCard, PulseIndicator } from '../components/AnimatedComponents';
import { AVATARS } from '../config/avatars';
import type { AvatarOption } from '../config/avatars';
import { getAvatarSize } from '../config/avatarSizes';
import { useWindowWidth } from '../hooks/useWindowWidth';
import { hasStateBasedRendering, getAvatarStatePath, type AvatarState } from '../config/avatarStates';
import { useAvatarIdleScheduler } from '../hooks/useAvatarIdleScheduler';
import { useAvatarSequenceRunner } from '../hooks/useAvatarSequenceRunner';
import { useAvatarPreload } from '../hooks/useAvatarPreload';
import {
  pageStyleTeam,
  contentShell,
  footerLogo,
  hourglassStyle,
  headerBarTeam,
  pillSmall,
  logoBadge,
  heroCard,
  heroIcon,
  eyebrow,
  metaRow,
  metaChip,
  glassCard,
  heading,
  mutedText,
  softDivider,
  inputStyle,
  primaryButton,
  choiceButton,
  progressOuter,
  progressInner,
  progressKnob,
  questionShell,
  gradientHalo,
  questionHeader,
  categoryChip,
  connectionPill,
  timerPill,
  questionStyleTeam
} from './teamStyles';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import ParticleCanvas from '../components/ParticleCanvas';
import MapErrorBoundary from '../components/MapErrorBoundary';

// Fix Leaflet default marker icon (webpack asset issue)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function MapClickHandler({ onPin }: { onPin: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPin(e.latlng.lat, e.latlng.lng) });
  return null;
}

function BunteMapPicker({
  pin, onChange, disabled
}: {
  pin: { lat: number; lng: number } | null;
  onChange: (p: { lat: number; lng: number }) => void;
  disabled: boolean;
}) {
  return (
    <div style={{ marginTop: 8, borderRadius: 14, overflow: 'hidden', border: '2px solid rgba(240,95,178,0.3)', boxShadow: '0 4px 0 rgba(0,0,0,0.4)' }}>
      <MapErrorBoundary>
      <MapContainer
        center={[20, 0]}
        zoom={2}
        style={{ height: 260, width: '100%', cursor: disabled ? 'not-allowed' : 'crosshair' }}
        zoomControl={true}
        scrollWheelZoom={false}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
        {!disabled && <MapClickHandler onPin={(lat, lng) => onChange({ lat, lng })} />}
        {pin && <Marker position={[pin.lat, pin.lng]} />}
      </MapContainer>
      </MapErrorBoundary>
      {pin ? (
        <div style={{ padding: '6px 12px', background: 'rgba(20,30,60,0.9)', color: '#94a3b8', fontSize: 12, textAlign: 'center' }}>
          📍 {pin.lat.toFixed(3)}, {pin.lng.toFixed(3)}
        </div>
      ) : (
        <div style={{ padding: '6px 12px', background: 'rgba(20,30,60,0.9)', color: '#64748b', fontSize: 12, textAlign: 'center' }}>
          Karte antippen um Pin zu setzen
        </div>
      )}
    </div>
  );
}

// ── Drag & Drop für Ordnen ───────────────────────────────────────────────────
function SortableItem({ id, label, index, disabled }: { id: string; label: string; index: number; disabled: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '13px 16px',
        borderRadius: 14,
        background: isDragging ? 'rgba(148,45,89,0.18)' : 'rgba(26,32,53,0.92)',
        border: isDragging ? '2px solid rgba(148,45,89,0.5)' : '2px solid rgba(148,163,184,0.18)',
        boxShadow: isDragging ? '0 8px 28px rgba(0,0,0,0.55)' : '0 2px 8px rgba(0,0,0,0.3)',
        cursor: disabled ? 'not-allowed' : 'grab',
        opacity: disabled ? 0.5 : 1,
        touchAction: 'none',
        userSelect: 'none',
        zIndex: isDragging ? 50 : 'auto',
      }}
    >
      <span style={{
        minWidth: 28, height: 28, borderRadius: 8,
        background: 'rgba(148,45,89,0.2)', border: '1.5px solid rgba(148,45,89,0.4)',
        color: '#f9a8d4', fontWeight: 900, fontSize: 14,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>{index + 1}</span>
      <span style={{ flex: 1, color: '#f1f5f9', fontWeight: 700, fontSize: 'clamp(14px, 4vw, 17px)', lineHeight: 1.3 }}>{label}</span>
      <span style={{ color: '#475569', fontSize: 18, flexShrink: 0 }}>⠿</span>
    </div>
  );
}

function BunteOrderDnD({
  items,
  order,
  onChange,
  disabled,
}: {
  items: Array<{ id: string; label: string }>;
  order: string[];
  onChange: (newOrder: string[]) => void;
  disabled: boolean;
}) {
  // Build sorted list: ordered items first, then remaining unplaced at bottom
  const sorted = order.length === items.length
    ? order
    : items.map((i) => i.id); // fallback: original order

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = sorted.indexOf(String(active.id));
    const newIdx = sorted.indexOf(String(over.id));
    onChange(arrayMove(sorted, oldIdx, newIdx));
  };

  const labelById = new Map(items.map((i) => [i.id, i.label]));

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={sorted} strategy={verticalListSortingStrategy}>
        <div style={{ display: 'grid', gap: 8 }}>
          {sorted.map((id, idx) => (
            <SortableItem
              key={id}
              id={id}
              label={labelById.get(id) ?? id}
              index={idx}
              disabled={disabled}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

// ── Drum-Wheel UI für oneOfEight ──────────────────────────────────────────────
// Zeigt nur noch verfügbare Aussagen. Aktuelle Aussage zentriert + voll sichtbar,
// Vorgänger/Nachfolger oben/unten geblurrt als Vorschau. Wischen oder Pfeil-Tippen
// zum Navigieren. "Wählen" bestätigt die mittlere Aussage direkt.
const SLOT_H = 110; // px pro Drum-Slot

function OneOfEightWheel({
  statements,
  usedIds,
  onConfirm,
  canAnswer,
}: {
  statements: Array<{ id: string; text: string }>;
  usedIds: Set<string>;
  onConfirm: (id: string) => void;
  canAnswer: boolean;
}) {
  const remaining = statements.filter((s) => !usedIds.has(String(s.id).toLowerCase()));
  const [idx, setIdx] = useState(0);
  const touchStartY = useRef<number | null>(null);

  // Clamp idx when remaining shrinks (after a pick)
  const prevLen = useRef(remaining.length);
  useEffect(() => {
    if (remaining.length !== prevLen.current) {
      prevLen.current = remaining.length;
      setIdx((i) => Math.min(i, Math.max(0, remaining.length - 1)));
    }
  }, [remaining.length]);

  if (!remaining.length) return null;

  const canUp = idx > 0;
  const canDown = idx < remaining.length - 1;
  const current = remaining[idx];
  const prev = remaining[idx - 1] ?? null;
  const next = remaining[idx + 1] ?? null;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault(); // prevent page scroll while swiping wheel
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const delta = touchStartY.current - e.changedTouches[0].clientY;
    touchStartY.current = null;
    if (delta > 30 && canDown) setIdx((i) => i + 1);
    else if (delta < -30 && canUp) setIdx((i) => i - 1);
  };

  const slotStyle = (blurred: boolean, clickable: boolean): React.CSSProperties => ({
    height: SLOT_H,
    display: 'flex',
    alignItems: 'center',
    padding: '0 16px',
    cursor: clickable ? 'pointer' : 'default',
    userSelect: 'none',
    filter: blurred ? 'blur(2.5px)' : 'none',
    opacity: blurred ? 0.35 : 1,
    transition: 'opacity 0.2s, filter 0.2s',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Drum */}
      <div
        style={{
          position: 'relative',
          height: SLOT_H * 3,
          borderRadius: 16,
          background: 'rgba(10,15,35,0.97)',
          border: '1.5px solid rgba(148,163,184,0.18)',
          overflow: 'hidden',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Prev (top, blurred) */}
        <div style={slotStyle(true, canUp)} onClick={() => canUp && setIdx((i) => i - 1)}>
          {prev && (
            <span style={{ fontSize: 'clamp(13px,3.5vw,16px)', color: '#cbd5e1', lineHeight: 1.35, fontWeight: 600, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {prev.text}
            </span>
          )}
        </div>

        {/* Center (selected) */}
        <div style={{
          height: SLOT_H,
          display: 'flex',
          alignItems: 'center',
          padding: '0 40px 0 16px',
          background: 'rgba(148,45,89,0.18)',
          borderTop: '1.5px solid rgba(148,45,89,0.5)',
          borderBottom: '1.5px solid rgba(148,45,89,0.5)',
        }}>
          <span style={{ fontSize: 'clamp(15px,4.2vw,19px)', fontWeight: 800, color: '#ffe4f2', lineHeight: 1.35 }}>
            {current.text}
          </span>
        </div>

        {/* Next (bottom, blurred) */}
        <div style={slotStyle(true, canDown)} onClick={() => canDown && setIdx((i) => i + 1)}>
          {next && (
            <span style={{ fontSize: 'clamp(13px,3.5vw,16px)', color: '#cbd5e1', lineHeight: 1.35, fontWeight: 600, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {next.text}
            </span>
          )}
        </div>

        {/* Arrow buttons */}
        {canUp && (
          <button
            onClick={() => setIdx((i) => i - 1)}
            style={{ position: 'absolute', top: 6, right: 10, background: 'none', border: 'none', color: '#64748b', fontSize: 18, cursor: 'pointer', padding: 4, lineHeight: 1 }}
            aria-label="Vorherige"
          >▲</button>
        )}
        {canDown && (
          <button
            onClick={() => setIdx((i) => i + 1)}
            style={{ position: 'absolute', bottom: 6, right: 10, background: 'none', border: 'none', color: '#64748b', fontSize: 18, cursor: 'pointer', padding: 4, lineHeight: 1 }}
            aria-label="Nächste"
          >▼</button>
        )}
      </div>

      {/* Counter */}
      <div style={{ textAlign: 'center', color: '#475569', fontSize: 12, fontWeight: 700 }}>
        {idx + 1} / {remaining.length}
      </div>

      {/* Confirm */}
      <button
        disabled={!canAnswer}
        onClick={() => canAnswer && onConfirm(current.id)}
        style={{
          padding: '14px',
          borderRadius: 16,
          background: canAnswer
            ? 'linear-gradient(135deg, rgba(148,45,89,0.85), rgba(177,10,108,0.75))'
            : 'rgba(148,163,184,0.07)',
          border: `2px solid ${canAnswer ? 'rgba(148,45,89,0.6)' : 'rgba(148,163,184,0.15)'}`,
          color: canAnswer ? '#fff' : '#475569',
          fontWeight: 800,
          fontSize: 16,
          cursor: canAnswer ? 'pointer' : 'not-allowed',
          transition: 'all 0.2s',
          boxShadow: canAnswer ? '0 4px 0 rgba(0,0,0,0.35)' : 'none',
        }}
      >
        Wählen
      </button>
    </div>
  );
}

type Phase = 'notJoined' | 'waitingForQuestion' | 'intro' | 'answering' | 'waitingForResult' | 'showResult';

type OfflineBarProps = {
  disconnected: boolean;
  language: Language;
  onReconnect: () => void;
};

function OfflineBar({ disconnected, language, onReconnect }: OfflineBarProps) {
  if (!disconnected) return null;
  return (
    <div
      style={{
        position: 'fixed',
        top: 'calc(8px + env(safe-area-inset-top))',
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '8px 12px',
        borderRadius: 12,
        background: 'rgba(239, 68, 68, 0.15)',
        border: '1px solid rgba(252, 165, 165, 0.4)',
        color: '#fca5a5',
        fontWeight: 700,
        zIndex: 40,
        display: 'flex',
        alignItems: 'center',
        gap: 10
      }}
    >
      {language === 'de' ? 'Offline - bitte erneut verbinden' : 'Offline - please reconnect'}
      <button
        style={{
          padding: '6px 10px',
          borderRadius: 10,
          border: '1px solid rgba(252, 165, 165, 0.4)',
          background: 'rgba(239, 68, 68, 0.25)',
          color: '#fca5a5',
          fontWeight: 700,
          cursor: 'pointer'
        }}
        onClick={onReconnect}
      >
        {language === 'de' ? 'Neu verbinden' : 'Reconnect'}
      </button>
    </div>
  );
}

interface TeamViewProps {
  roomCode: string;
  rejoinTrigger?: number;
  suppressAutoRejoin?: boolean;
}

const COPY = {
  de: {
    send: 'Antwort senden',
    waiting: 'Antwort eingeloggt! Bitte warten...',
    waitingSoon: 'Quiz startet gleich ...',
    waitingStart: 'Warte auf Quizstart ...',
    waitingJoin: 'Bitte beitreten, dann geht es gleich los.',
    waitingAdmin: 'Warte auf Admin ...',
    joinWelcome: 'Willkommen beim Cozy Kiosk Quiz',
    joinHint: "Gib deinen Teamnamen ein, bestätige und dann geht's los.",
    timerActiveLabel: 'Timer aktiv',
    timerDoneLabel: 'Zeit vorbei',
    evaluating: 'Wir prüfen alle Antworten ...',
    readyOn: 'Wir sind bereit',
    readyOff: 'Wir sind noch nicht bereit',
    joinTitle: 'Team beitreten',
    joinPlaceholder: 'Teamname',
    joinButton: 'Beitreten',
    avatarTitle: 'Avatar wählen',
    avatarHint: 'Tippe eine Figur an',
    avatarRandom: 'Zufall',
    waitingMsg: 'Bitte wartet auf die nächste Frage ...',
    tfTrue: 'Wahr',
    tfFalse: 'Falsch',
    inputNumber: (unit?: string) => (unit ? `Zahl (${unit}) eingeben` : 'Zahl eingeben'),
    inputOrder: 'Reihenfolge eingeben',
    inputAnswer: 'Antwort eingeben',
    timeLeft: (s: number) => `${s}s verbleibend`,
    resultTitle: (correct: boolean | null) =>
      correct === null ? 'Ergebnis' : correct ? 'Richtig!' : 'Leider falsch',
    loginError: 'Bitte zuerst beitreten.',
    kicked: 'Du wurdest vom Admin entfernt. Bitte neu beitreten.',
    estimateBest: 'Ihr wart am nächsten dran!',
    estimateWorse: 'Leider war ein anderes Team näher dran.',
    answerCorrect: 'Richtig beantwortet!',
    answerWrong: 'Leider falsch.',
    betWin: 'Richtig! Ihr hattet die meisten Punkte auf der richtigen Antwort.',
    betLose: 'Ein anderes Team hatte mehr Punkte auf der richtigen Antwort.',
    top5Win: 'Richtig! Ihr hattet die meisten Top-5 Treffer.',
    top5Lose: 'Ein anderes Team wusste mehr Top-5 Treffer.',
    betHint: (pool: number) => `Verteile genau ${pool} Punkte auf A/B/C.`,
    betRemaining: (remaining: number) =>
      remaining === 0 ? 'Alle Punkte verteilt.' : `${remaining} Punkt(e) übrig.`,
    betInvalid: 'Bitte genau 10 Punkte verteilen.',
    answersLocked: 'Antworten sind gesperrt.',
    answerSent: 'Antwort gesendet',
    dupAnswer: 'Doppelte Antwort.',
    invalidAnswer: 'Ungültige Eingabe.',
    sendError: 'Antwort konnte nicht gesendet werden.',
    minOneAnswer: 'Mindestens eine Antwort eingeben.',
    enterAnswer: 'Bitte Antwort eingeben.',
    chooseOption: 'Bitte eine Option wählen.',
    top5Hint: 'Bis zu 5 Antworten, Reihenfolge egal.',
    answerPlaceholder: 'Antwort',
    yourAnswer: 'Eure Antwort:',
    correctAnswer: 'Richtige Antwort'
  },
  en: {
    send: 'Submit answer',
    waiting: 'Answer submitted! Please wait...',
    waitingSoon: 'Quiz starting soon ...',
    waitingStart: 'Waiting for quiz start ...',
    waitingJoin: 'Please join to get started.',
    waitingAdmin: 'Waiting for host ...',
    joinWelcome: 'Welcome to Cozy Kiosk Quiz',
    joinHint: 'Enter your team name, confirm, and off you go.',
    timerActiveLabel: 'Timer active',
    timerDoneLabel: 'Time is up',
    evaluating: 'We are checking all answers ...',
    readyOn: 'We are ready',
    readyOff: 'We are not ready yet',
    joinTitle: 'Join team',
    joinPlaceholder: 'Team name',
    joinButton: 'Join',
    avatarTitle: 'Choose avatar',
    avatarHint: 'Tap a character',
    avatarRandom: 'Random',
    waitingMsg: 'Please wait for the next question ...',
    tfTrue: 'True',
    tfFalse: 'False',
    inputNumber: (unit?: string) => (unit ? `Enter number (${unit})` : 'Enter number'),
    inputOrder: 'Enter order',
    inputAnswer: 'Enter answer',
    timeLeft: (s: number) => `${s}s remaining`,
    resultTitle: (correct: boolean | null) =>
      correct === null ? 'Result' : correct ? 'Correct!' : 'Incorrect',
    estimateBest: 'You were the closest!',
    estimateWorse: 'Another team was closer, unfortunately.',
    answerCorrect: 'Correct answer!',
    answerWrong: 'Incorrect.',
    betWin: 'Correct! You placed the most points on the right answer.',
    betLose: 'Another team placed more points on the right answer.',
    top5Win: 'Correct! You had the most Top-5 hits.',
    top5Lose: 'Another team had more Top-5 hits.',
    betHint: (pool: number) => `Spread exactly ${pool} points across A/B/C.`,
    betRemaining: (remaining: number) =>
      remaining === 0 ? 'All points allocated.' : `${remaining} point(s) left.`,
    betInvalid: 'Please allocate the full 10 points.',
    loginError: 'Please join first.',
    kicked: 'You were removed by the admin. Please rejoin.',
    answersLocked: 'Answers are locked.',
    answerSent: 'Answer sent',
    dupAnswer: 'Duplicate answer.',
    invalidAnswer: 'Invalid input.',
    sendError: 'Answer could not be submitted.',
    minOneAnswer: 'Enter at least one answer.',
    enterAnswer: 'Please enter an answer.',
    chooseOption: 'Please choose an option.',
    top5Hint: 'Up to 5 answers, order irrelevant.',
    answerPlaceholder: 'Answer',
    yourAnswer: 'Your answer:',
    correctAnswer: 'Correct answer'
  }
} as const;

// Feedback only makes sense for questions with numeric proximity (estimate / precision variants)
const isClosenessQuestion = (q: AnyQuestion | null) => {
  if (!q) return false;
  if (q.mechanic === 'estimate') return true;
  const bunte = (q as any)?.bunteTuete;
  if (bunte && bunte.kind === 'precision') return true;
  const mixedType = (q as any)?.mixedMechanic;
  if (mixedType === 'praezise-antwort') return true;
  return false;
};

const getAvatarById = (avatarId?: string) => AVATARS.find((a) => a.id === avatarId) || AVATARS[0];

const AvatarMedia: React.FC<{ avatar: AvatarOption; style?: React.CSSProperties; alt?: string; mood?: 'idle' | 'happy' | 'sad'; enableWalking?: boolean; onTap?: boolean; igelState?: AvatarState }> = React.memo(({ avatar, style, alt, mood = 'idle', enableWalking = false, onTap = false, igelState = 'walking' }) => {
  const [currentMood, setCurrentMood] = useState(mood);
  const [currentIgelState, setCurrentIgelState] = useState(igelState);
  const [walkFrame, setWalkFrame] = useState<1 | 2>(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasStates = hasStateBasedRendering(avatar.id);

  useEffect(() => {
    setCurrentMood(mood);
    
    // Reset to idle after celebration or sadness
    if (mood !== 'idle') {
      const timer = setTimeout(() => {
        setCurrentMood('idle');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [mood]);

  // 🎯 CRITICAL: Sync igelState prop to local state
  useEffect(() => {
    setCurrentIgelState(igelState);
  }, [igelState]);

  useEffect(() => {
    if (!hasStates || currentIgelState !== 'walking') {
      setWalkFrame(1);
      return;
    }
    const frame1Ms = 340;
    const frame2Ms = 240;
    let timer = 0;
    const tick = (nextFrame: 1 | 2) => {
      setWalkFrame(nextFrame);
      const delay = nextFrame === 1 ? frame1Ms : frame2Ms;
      timer = window.setTimeout(() => tick(nextFrame === 1 ? 2 : 1), delay);
    };
    tick(1);
    return () => window.clearTimeout(timer);
  }, [hasStates, currentIgelState]);

  const getAnimationClass = () => {
    if (hasStates) return enableWalking && currentIgelState === 'walking' ? 'animal-bounce' : '';
    if (onTap) return 'animal-tap';
    switch (currentMood) {
      case 'happy':
        return 'animal-celebrate';
      case 'sad':
        return 'animal-sad';
      default:
        return enableWalking ? 'animal-bounce' : '';
    }
  };

  const currentStatePath = hasStates ? getAvatarStatePath(avatar.id, currentIgelState, walkFrame) : null;


  // For SVG animals
  if (!avatar.isVideo) {
    const imgSrc = currentStatePath || avatar.svg || avatar.dataUri;
    const shouldShowWalking = hasStates && enableWalking && currentIgelState === 'walking';
    const animationClass = shouldShowWalking ? 'animal-bounce' : '';
    
    // Build meaningful alt text for screen readers based on avatar state
    const moodLabel = currentMood === 'happy' ? ' (happy)' : currentMood === 'sad' ? ' (sad)' : '';
    const stateLabel = hasStates && currentIgelState !== 'walking' ? ` (${currentIgelState})` : '';
    const altText = `${avatar.name}${stateLabel}${moodLabel}`;
    
    return (
      <div 
        ref={containerRef}
        className={`animated-animal ${animationClass}`}
        style={{
          width: style?.width || '100%',
          height: style?.height || '100%',
          display: 'inline-block',
          position: hasStates && enableWalking ? 'absolute' : 'relative',
          bottom: hasStates && enableWalking ? 0 : 'auto',
          transformOrigin: 'bottom center',
          opacity: 1,
          // Smooth transitions between avatar states
          transition: hasStates ? 'all 0.15s ease-in-out' : 'none',
          ...style
        }}
      >
        <img 
          src={imgSrc} 
          alt={altText}
          title={altText}
          role="presentation"
          style={{
            ...style,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            filter: currentMood === 'sad' ? 'grayscale(0.3) brightness(0.8)' : 'none',
            display: 'block',
            // Smooth state transitions
            transition: hasStates ? 'opacity 0.15s ease-in-out' : 'none'
          }}
        />
      </div>
    );
  }

  // Legacy video support (if needed)
  return <img src={avatar.dataUri} alt={alt || avatar.name} style={style} />;
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if avatar ID or key props changed
  return (
    prevProps.avatar.id === nextProps.avatar.id &&
    prevProps.mood === nextProps.mood &&
    prevProps.igelState === nextProps.igelState &&
    prevProps.onTap === nextProps.onTap &&
    prevProps.enableWalking === nextProps.enableWalking
  );
});

function TeamView({ roomCode, rejoinTrigger, suppressAutoRejoin }: TeamViewProps) {
  const teamMarker = 'teamview-marker-2026-01-02b';
  if (typeof window !== 'undefined') {
    const win = window as unknown as { __TEAMVIEW_RENDERED?: boolean; __TEAMVIEW_RENDER_COUNT?: number };
    win.__TEAMVIEW_RENDERED = true;
    win.__TEAMVIEW_RENDER_COUNT = (win.__TEAMVIEW_RENDER_COUNT ?? 0) + 1;
    (win as any).__TEAMVIEW_MARKER = teamMarker;
  }
  
  // Get window width with caching (debounced)
  const windowWidth = useWindowWidth();
  const isMobileSize = windowWidth < 480;
  const isTabletSize = windowWidth < 768;
  
  const [teamName, setTeamName] = useState('');
  const [avatarId, setAvatarId] = useState(() => AVATARS[0]?.id || '');
  const [avatarCarouselIndex, setAvatarCarouselIndex] = useState(() => 0);
  
  const [joinPending, setJoinPending] = useState(false);
  const [teamId, setTeamId] = useState<string | null>(() => {
    // Initialize from localStorage to prevent flash of join screen
    if (typeof window !== 'undefined' && roomCode) {
      return localStorage.getItem(`team:${roomCode}:id`) || null;
    }
    return null;
  });
  const [question, setQuestion] = useState<AnyQuestion | null>(null);
  const [questionMeta, setQuestionMeta] = useState<any | null>(null);
  const [answer, setAnswer] = useState<any>('');
  const [bettingPoints, setBettingPoints] = useState<[number, number, number]>([0, 0, 0]);
  const [bunteTop5Order, setBunteTop5Order] = useState<string[]>([]);
  const [buntePrecisionText, setBuntePrecisionText] = useState('');
  const [bunteOneChoice, setBunteOneChoice] = useState('');
  const [bunteOrderSelection, setBunteOrderSelection] = useState<string[]>([]);
  const [bunteOrderCriteria, setBunteOrderCriteria] = useState<string | null>(null);
  const [bunterMapPin, setBunterMapPin] = useState<{ lat: number; lng: number } | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null);
  const [phase, setPhase] = useState<Phase>('notJoined');
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [resultCorrect, setResultCorrect] = useState<boolean | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [timerEndsAt, setTimerEndsAt] = useState<number | null>(null);
  const [timerDuration, setTimerDuration] = useState<number>(30);
  const [transitioning, setTransitioning] = useState(false);
  const [timerTick, setTimerTick] = useState(0);
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('teamLanguage');
    const lang = saved === 'de' || saved === 'en' || saved === 'both' ? (saved as Language) : 'de';
    // Team-View soll nur einsprachig sein, nicht 'both'
    return lang === 'both' ? 'de' : lang;
  });

  // Helper-Funktionen für Message
  const showError = (text: string) => setMessage({ text, type: 'error' });
  const showSuccess = (text: string) => setMessage({ text, type: 'success' });
  const clearMessage = () => setMessage(null);
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [allowReadyToggle, setAllowReadyToggle] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [socketError, setSocketError] = useState<string | null>(null);
  const [hasStateUpdate, setHasStateUpdate] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [solution, setSolution] = useState<string | null>(null);
  const [isFinal, setIsFinal] = useState(false);
  const [resultPoints, setResultPoints] = useState<number | null>(null);
  const [resultDetail, setResultDetail] = useState<string | null>(null);
  const [resultDeviation, setResultDeviation] = useState<number | null>(null);
  const [feedbackAnimation, setFeedbackAnimation] = useState<'success' | 'error' | null>(null);
  const [gameState, setGameState] = useState<CozyGameState>('LOBBY');
  const [scoreboard, setScoreboard] = useState<StateUpdatePayload['scores']>([]);
  const [teamStatus, setTeamStatus] = useState<StateUpdatePayload['teamStatus']>([]);
  const [blitzState, setBlitzState] = useState<BlitzState | null>(null);
  const [rundlaufState, setRundlaufState] = useState<RundlaufState | null>(null);
  const [oneOfEightState, setOneOfEightState] = useState<StateUpdatePayload['oneOfEight'] | null>(null);
  const [avatarsEnabled, setAvatarsEnabled] = useState(false);
  const [blitzAnswers, setBlitzAnswers] = useState<string[]>(['', '', '', '', '']);
  const [blitzSubmitted, setBlitzSubmitted] = useState(false);
  const [blitzSelectionBusy, setBlitzSelectionBusy] = useState(false);
  const [expandedBlitzItem, setExpandedBlitzItem] = useState<number>(0); // current item index on mobile
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [rundlaufInput, setRundlaufInput] = useState('');
  const [rundlaufSubmitting, setRundlaufSubmitting] = useState(false);
  const [rundlaufError, setRundlaufError] = useState<string | null>(null);
  const [usedAvatarIds, setUsedAvatarIds] = useState<Set<string>>(new Set());
  const [avatarMood, setAvatarMood] = useState<'idle' | 'happy' | 'sad'>('idle');
  const [avatarTapped, setAvatarTapped] = useState(false);
  const [igelState, setIgelState] = useState<AvatarState>('walking');
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  // PWA install prompt
  const [pwaPrompt, setPwaPrompt] = useState<any>(null);
  const [showPwaBanner, setShowPwaBanner] = useState(false);
  const pwaPromptRef = useRef<any>(null);

  useEffect(() => {
    if (localStorage.getItem('pwa-install-dismissed')) return;
    const handler = (e: Event) => {
      e.preventDefault();
      pwaPromptRef.current = e;
      setPwaPrompt(e);
      setShowPwaBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handlePwaInstall = async () => {
    const prompt = pwaPromptRef.current;
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted' || outcome === 'dismissed') {
      localStorage.setItem('pwa-install-dismissed', '1');
      setShowPwaBanner(false);
      setPwaPrompt(null);
      pwaPromptRef.current = null;
    }
  };

  const handlePwaDismiss = () => {
    localStorage.setItem('pwa-install-dismissed', '1');
    setShowPwaBanner(false);
    setPwaPrompt(null);
    pwaPromptRef.current = null;
  };

  // Derived turn-state — declared early so effects below can reference them
  const isOneOfEightQuestion = question?.type === 'BUNTE_TUETE' && (question as any)?.bunteTuete?.kind === 'oneOfEight';
  const isOneOfEightActiveTurn = isOneOfEightQuestion && oneOfEightState?.activeTeamId === teamId && !oneOfEightState?.finished;

  // Filter out avatars already chosen by other teams
  const availableAvatars = useMemo(() => {
    if (!teamStatus || teamStatus.length === 0) return AVATARS;
    const usedIds = teamStatus
      .filter(t => t.id !== teamId) // Exclude own team
      .map(t => t.avatarId)
      .filter(Boolean);
    return AVATARS.filter(a => !usedIds.includes(a.id));
  }, [teamStatus, teamId]);

  // Keep carousel index aligned with the selected avatar when availability changes.
  useEffect(() => {
    if (!avatarId || availableAvatars.length === 0) return;
    const nextIndex = availableAvatars.findIndex(a => a.id === avatarId);
    if (nextIndex >= 0 && nextIndex !== avatarCarouselIndex) {
      setAvatarCarouselIndex(nextIndex);
    }
  }, [availableAvatars, avatarId, avatarCarouselIndex]);
  
  // Sync carousel index when avatar changes (only if avatar was taken, not on manual selection)
  useEffect(() => {
    // Only force back to position 0 if current avatar was taken by another team
    if (avatarId && !availableAvatars.find(a => a.id === avatarId) && availableAvatars.length > 0) {
      // Current avatar was taken, need to pick a new one and reset carousel
      setAvatarId(availableAvatars[0].id);
      setAvatarCarouselIndex(0);
    }
    // Don't auto-sync carousel index on avatarId changes - user should stay in carousel position
  }, [avatarId, availableAvatars]);
  
  const questionRef = useRef<AnyQuestion | null>(null);
  const savedIdRef = useRef<string | null>(null);
  const answerSubmittedRef = useRef(false);
  const languageRef = useRef(language);
  useEffect(() => { languageRef.current = language; }, [language]);
  const lastQuestionIdRef = useRef<string | null>(null);
  const lastRejoinTriggerRef = useRef<number | null>(null);

  const socketRef = useRef<ReturnType<typeof connectToRoom> | null>(null);
  const intervalRef = useRef<number | null>(null);
  const recoveringRef = useRef(false);
  const blitzInputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const avatarStateRef = useRef<AvatarState>('walking');
  const avatarSequenceRef = useRef<ReturnType<typeof useAvatarSequenceRunner> | null>(null);
  const idleSchedulerRef = useRef<ReturnType<typeof useAvatarIdleScheduler> | null>(null);
  const pageRootRef = useRef<HTMLDivElement>(null);
  const [reconnectKey, setReconnectKey] = useState(0);
  
  const storageKey = useCallback((suffix: string) => {
    return `team:${roomCode}:${suffix}`;
  }, [roomCode]);
  useEffect(() => {
    answerSubmittedRef.current = answerSubmitted;
  }, [answerSubmitted]);

  useEffect(() => {
    avatarStateRef.current = igelState;
  }, [igelState]);

  useEffect(() => {
    if (gameState === 'Q_ACTIVE') {
      setPhase(answerSubmittedRef.current ? 'waitingForResult' : 'answering');
    } else if (gameState === 'QUESTION_INTRO') {
      setPhase('intro');
    } else if (gameState === 'Q_LOCKED') {
      setPhase('waitingForResult');
    } else if (gameState === 'Q_REVEAL') {
      setPhase('showResult');
    } else if (teamId) {
      setPhase('waitingForQuestion');
    } else {
      setPhase('notJoined');
    }
    // Scroll to top on every game state change (scroll the root div, not window)
    if (pageRootRef.current) { pageRootRef.current.scrollTop = 0; }
  }, [gameState, teamId]);

  useEffect(() => {
    if (!teamId) return;
    const activeId = rundlaufState?.activeTeamId ?? null;
    const attempt = rundlaufState?.lastAttempt ?? null;
    if (activeId !== teamId) {
      setRundlaufSubmitting(false);
      setRundlaufError(null);
      setRundlaufInput('');
      return;
    }
    if (attempt && attempt.teamId === teamId) {
      if (attempt.verdict === 'ok') {
        setRundlaufInput('');
        setRundlaufError(null);
      }
      if (attempt.verdict === 'dup') {
        setRundlaufError(language === 'de' ? 'Doppelte Antwort.' : 'Duplicate answer.');
      }
      if (attempt.verdict === 'invalid') {
        setRundlaufError(language === 'de' ? 'Ungueltig.' : 'Invalid.');
      }
    }
  }, [rundlaufState?.activeTeamId, rundlaufState?.lastAttempt?.id, teamId, language]);

  useEffect(() => {
    if (!question || question.type !== 'BUNTE_TUETE' || !question.bunteTuete) {
      setBunteTop5Order([]);
      setBunteOrderSelection([]);
      return;
    }
    const payload = question.bunteTuete as BunteTuetePayload;
    if (payload.kind === 'top5') {
      setBunteTop5Order(Array(5).fill(''));
    }
    if (payload.kind === 'order') {
      setBunteOrderSelection((prev) =>
        prev.length === payload.items.length ? prev : Array(payload.items.length).fill('')
      );
      setBunteOrderCriteria(payload.defaultCriteriaId ?? payload.criteriaOptions?.[0]?.id ?? null);
    }
  }, [question?.id]);

  // Reset oneOfEight selection when it becomes this team's turn again
  useEffect(() => {
    if (isOneOfEightActiveTurn) {
      setBunteOneChoice('');
    }
  }, [isOneOfEightActiveTurn]);

  // inject animations once
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const id = 'teamview-anim-style';
    if (!document.getElementById(id)) {
      const style = document.createElement('style');
      style.id = id;
      style.innerHTML = `
      @keyframes hourglass-wiggle {
        0% { transform: translateY(0) rotate(-4deg); }
        50% { transform: translateY(-4px) rotate(0deg); }
        100% { transform: translateY(0) rotate(4deg); }
      }
      @keyframes sendPulse {
        0% { box-shadow: 0 12px 26px rgba(0,0,0,0.25); transform: translateY(0) scale(1); }
        50% { box-shadow: 0 16px 38px rgba(0,0,0,0.35), 0 0 0 6px rgba(255,255,255,0.08); transform: translateY(-2px) scale(1.01); }
        100% { box-shadow: 0 12px 26px rgba(0,0,0,0.25); transform: translateY(0) scale(1); }
      }
      @keyframes timeup-pulse {
        0% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); }
        100% { box-shadow: 0 0 0 14px rgba(239,68,68,0); }
      }`;
      document.head.appendChild(style);
    }
  }, []);

  const handleJoin = useCallback(async (useSavedId = false) => {
    if (joinPending) return;
    const selectedAvatarId = availableAvatars[avatarCarouselIndex]?.id || avatarId;
    setJoinPending(true);
    try {
      const cleanName = teamName.trim();
      if (!cleanName) {
        showError(language === 'de' ? 'Teamname fehlt.' : 'Team name required.');
        setJoinPending(false);
        return;
      }
      if (!roomCode) {
        showError(language === 'de' ? 'Roomcode fehlt.' : 'Room code missing.');
        setJoinPending(false);
        return;
      }
      if (selectedAvatarId && selectedAvatarId !== avatarId) {
        setAvatarId(selectedAvatarId);
        if (roomCode) localStorage.setItem(storageKey('avatar'), selectedAvatarId);
      }
      const socket = socketRef.current;
      const payload = await new Promise<{ team: Team }>((resolve, reject) => {
        if (!socket) {
          joinRoom(
            roomCode,
            cleanName,
            useSavedId ? savedIdRef.current ?? undefined : undefined,
            selectedAvatarId
          )
            .then((res) => resolve(res))
            .catch(reject);
          return;
        }
        socket.emit(
          'team:join',
          {
            roomCode,
            teamName: cleanName,
            teamId: useSavedId ? savedIdRef.current ?? undefined : undefined,
            avatarId: selectedAvatarId,
            color: 'var(--color-primary)'
          },
          (resp?: { ok: boolean; error?: string; team?: Team }) => {
            if (!resp?.ok || !resp?.team) {
              reject(new Error(resp?.error || 'Beitritt fehlgeschlagen'));
            } else {
              // Haptic feedback on successful join
              if ('vibrate' in navigator) {
                navigator.vibrate(50);
              }
              resolve({ team: resp.team });
            }
          }
        );
      });
      const data = payload;
      setTeamId(data.team.id);
      // Celebrate joining!
      setAvatarMood('happy');
      localStorage.setItem(storageKey('name'), cleanName);
      localStorage.setItem(storageKey('id'), data.team.id);
      if (data.team.avatarId || selectedAvatarId) {
        const chosen = data.team.avatarId || selectedAvatarId;
        setAvatarId(chosen);
        localStorage.setItem(storageKey('avatar'), chosen);
      }
      savedIdRef.current = data.team.id;
      try {
        const langRes = await fetchLanguage(roomCode);
        if (langRes?.language) {
          // Team-View soll nur einsprachig sein, nicht 'both'
          const singleLang = langRes.language === 'both' ? 'de' : langRes.language;
          setLanguageState(singleLang);
          localStorage.setItem('teamLanguage', singleLang);
        }
      } catch {
        // ignore
      }
      await loadQuestion();
      clearMessage();
    } catch (error) {
      showError(
        language === 'de'
          ? `Beitritt fehlgeschlagen (${SOCKET_URL}). Bitte Raumcode/Verbindung prüfen.`
          : `Join failed (${SOCKET_URL}). Please check room code/connection.`
      );
    } finally {
      setJoinPending(false);
    }
  }, [joinPending, teamName, roomCode, avatarId, avatarCarouselIndex, availableAvatars, language, showError, clearMessage, setJoinPending, setTeamId, setAvatarMood, setAvatarId, storageKey, socketRef, setLanguageState]);

  // Load persisted team (for reconnects)
  useEffect(() => {
    const savedName = localStorage.getItem(storageKey('name'));
    const savedId = localStorage.getItem(storageKey('id'));
    const savedAvatar = localStorage.getItem(storageKey('avatar'));
    if (savedName) setTeamName(savedName);
    if (savedId) {
      savedIdRef.current = savedId;
      // Auto-rejoin if we have saved ID but no active teamId
      // BUT: don't auto-rejoin if suppressAutoRejoin is true (modal is controlling it)
      if (!teamId && savedName && roomCode && !suppressAutoRejoin) {
        handleJoin(true);
      }
    }
    if (savedAvatar) setAvatarId(savedAvatar);
  }, [roomCode, teamId, handleJoin, storageKey, suppressAutoRejoin]);

  // Explicit rejoin trigger from parent (e.g., when user clicks "Zurück zu Team")
  useEffect(() => {
    if (rejoinTrigger && rejoinTrigger > 0) {
      if (lastRejoinTriggerRef.current === rejoinTrigger) return;
      lastRejoinTriggerRef.current = rejoinTrigger;
      const savedName = localStorage.getItem(storageKey('name'));
      const savedId = localStorage.getItem(storageKey('id'));
      if (savedId && savedName && roomCode) {
        handleJoin(true);
      }
    }
  }, [rejoinTrigger, roomCode, handleJoin, storageKey, phase, teamId]);

  useEffect(() => {
    if (!AVATARS.some((avatar) => avatar.id === avatarId)) {
      setAvatarId(AVATARS[0]?.id || '');
    }
  }, [avatarId]);

  // Detect mobile vs desktop for responsive Blitz input
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const t = <K extends keyof (typeof COPY)['de']>(key: K) => {
    const deVal = COPY.de[key];
    const enVal = COPY.en[key];
    if (language === 'both') {
      if (typeof deVal === 'function' && typeof enVal === 'function') {
        const deFn = deVal as (...args: any[]) => string;
        const enFn = enVal as (...args: any[]) => string;
        return ((...args: any[]) => `${deFn(...args)} / ${enFn(...args)}`) as any;
      }
      if (typeof deVal === 'string' && typeof enVal === 'string') {
        return `${deVal} / ${enVal}` as any;
      }
    }
    const langKey = language as keyof typeof COPY;
    return COPY[langKey]?.[key] ?? COPY.de[key];
  }
  function inlineCopy(de: string, en: string) {
    if (language === 'en') return en;
    if (language === 'both') return `${de} / ${en}`;
    return de;
  }
  const getResultMessage = (entry: any, q: AnyQuestion | null) => {
    if (!entry || !q) return null;
    const isCorrect = entry.isCorrect === true;
    const dev = entry?.deviation;
    const bestDev = entry?.bestDeviation;
    if (
      isClosenessQuestion(q) &&
      typeof dev === 'number' &&
      typeof bestDev === 'number' &&
      Number.isFinite(dev) &&
      Number.isFinite(bestDev)
    ) {
      return dev === bestDev ? t('estimateBest') : t('estimateWorse');
    }
    const qAny = q as any;
    if (qAny?.mechanic === 'betting') {
      return isCorrect ? t('betWin') : t('betLose');
    }
    if (qAny?.bunteTuete?.kind === 'top5') {
      return isCorrect ? t('top5Win') : t('top5Lose');
    }
    if (qAny?.bunteTuete?.kind === 'map') {
      const distKm = (typeof entry?.tieBreaker?.primary === 'number') ? -entry.tieBreaker.primary : null;
      const fmtDist = distKm != null
        ? (distKm < 10 ? `${Math.round(distKm * 10) / 10} km` : distKm < 1000 ? `${Math.round(distKm)} km` : `${(distKm / 1000).toFixed(1).replace('.', ',')} Tsd. km`)
        : null;
      return isCorrect
        ? inlineCopy('Ihr wart am nächsten dran! 🥇', 'You were the closest! 🥇')
        : inlineCopy(
            fmtDist ? `Ihr wart leider ${fmtDist} entfernt.` : 'Ihr wart leider etwas weiter weg.',
            fmtDist ? `You were ${fmtDist} away.` : 'Another team was a bit closer.'
          );
    }
    return isCorrect ? t('answerCorrect') : t('answerWrong');
  };
  const scoreboardLookup = useMemo(() => {
    const map: Record<string, { name: string; score: number }> = {};
    scoreboard.forEach((entry) => {
      map[entry.id] = { name: entry.name, score: entry.score ?? 0 };
    });
    return map;
  }, [scoreboard]);
  const sortedScoreboard = useMemo(
    () => [...scoreboard].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)),
    [scoreboard]
  );
  const blitzCountdown = useMemo(() => {
    if (!blitzState?.deadline) return null;
    return Math.max(0, Math.ceil((blitzState.deadline - Date.now()) / 1000));
  }, [blitzState?.deadline, timerTick]);
  const teamCount = useMemo(() => {
    const scoreCount = scoreboard.length;
    if (scoreCount) return scoreCount;
    return blitzState?.submissions?.length ?? 0;
  }, [scoreboard, blitzState?.submissions?.length]);
  const blitzItems = blitzState?.items ?? [];
  const totalBlitzItems = blitzItems.length || 5;
  const activeBlitzItemIndex = useMemo(() => {
    if (!totalBlitzItems) return 0;
    const rawIndex = blitzState?.itemIndex ?? 0;
    return Math.min(totalBlitzItems - 1, Math.max(0, rawIndex));
  }, [blitzState?.itemIndex, totalBlitzItems]);
  const blitzItemCountdown = useMemo(() => {
    if (!blitzState?.itemDeadline) return null;
    return Math.max(0, Math.ceil((blitzState.itemDeadline - Date.now()) / 1000));
  }, [blitzState?.itemDeadline, timerTick]);
  const isBlitzPlaying =
    gameState === 'BLITZ_PLAYING' || (gameState === 'BLITZ' && blitzState?.phase === 'PLAYING');
  const isRundlaufActiveTurn = gameState === 'RUNDLAUF_PLAY' && rundlaufState?.activeTeamId === teamId;
  const rundlaufCountdown = useMemo(() => {
    if (!rundlaufState?.deadline) return null;
    return Math.max(0, Math.ceil((rundlaufState.deadline - Date.now()) / 1000));
  }, [rundlaufState?.deadline, timerTick]);

  useEffect(() => {
    if (!teamId) return;
    setBlitzSubmitted(Boolean(blitzState?.submissions?.includes(teamId)));
    if (!isBlitzPlaying) {
      setBlitzAnswers(['', '', '', '', '']);
    }
  }, [teamId, blitzState, isBlitzPlaying]);

  useEffect(() => {
    if (blitzState?.phase !== 'BANNING') {
      setBlitzSelectionBusy(false);
      return;
    }
    if (blitzState?.pinnedTheme) {
      setBlitzSelectionBusy(false);
      return;
    }
  }, [blitzState?.phase, blitzState?.pinnedTheme?.id, blitzState?.bans]);

  useEffect(() => {
    if (!isBlitzPlaying) return;
    if (blitzSubmitted) return;
    const ref = blitzInputsRef.current[activeBlitzItemIndex];
    if (ref && document.activeElement !== ref) {
      ref.focus({ preventScroll: true });
      if (typeof ref.select === 'function') {
        ref.select();
      }
    }
  }, [isBlitzPlaying, blitzSubmitted, activeBlitzItemIndex]);

  function handleReconnect() {
    setConnectionStatus('connecting');
    setReconnectKey((v) => v + 1);
  }

  // Broadcast avatar state change to beamer
  const broadcastAvatarState = useCallback((state: AvatarState) => {
    if (!teamId || !socketRef.current) {
      return;
    }
    socketRef.current.emit('team:avatarState', {
      roomCode,
      teamId,
      state
    });
  }, [teamId, roomCode]);

  // Auto-preload avatar states
  const { isPreloaded: avatarPreloaded, preloadError: avatarPreloadError } = useAvatarPreload(avatarId);
  
  // Log preload errors
  useEffect(() => {
    if (avatarPreloadError) {
      console.error('❌ Avatar preload error:', avatarPreloadError);
    }
  }, [avatarPreloadError]);

  // Avatar sequence runner (for tap gestures, results, etc.)
  const avatarSequence = useAvatarSequenceRunner({
    onStateChange: (state) => {
      setIgelState(state);
      broadcastAvatarState(state);
    },
    onSequenceComplete: () => {
      // Use ref to avoid circular dependency
      idleSchedulerRef.current?.scheduleIdleCycle();
    }
  });
  
  // Store in ref immediately (not in useEffect)
  avatarSequenceRef.current = avatarSequence;

  // Avatar idle scheduler (periodic pauses)
  const idleScheduler = useAvatarIdleScheduler(
    Boolean(teamId && avatarId && hasStateBasedRendering(avatarId)),
    {
      minDelay: 2,
      maxDelay: 6,
      minDuration: 0.8,
      maxDuration: 1.4,
      debug: true
    },
    {
      onStateChange: (state) => {
        setIgelState(state);
        broadcastAvatarState(state);
      },
      getCurrentState: () => avatarStateRef.current,
      isSequenceActive: () => avatarSequenceRef.current?.isSequenceActive?.() ?? false
    }
  );
  
  // Store in ref immediately (not in useEffect)
  idleSchedulerRef.current = idleScheduler;

  // Wrapper function for backward compatibility
  const runAvatarSequence = useCallback(
    (steps: Array<{ state: AvatarState; duration: number }>, avatarOverrideId?: string) => {
      const activeAvatarId = avatarOverrideId || avatarId;
      if (!activeAvatarId || !hasStateBasedRendering(activeAvatarId)) {
        return false;
      }

      idleSchedulerRef.current?.clearTimers();
      const result = avatarSequenceRef.current?.runSequence(steps);
      return result;
    },
    [avatarId]
  );

  // Initialize avatar: start walking and schedule idle cycles
  useEffect(() => {
    if (!teamId || !avatarId || !hasStateBasedRendering(avatarId)) return;
    
    setIgelState('walking');
    broadcastAvatarState('walking');
    idleSchedulerRef.current?.clearTimers();
    idleSchedulerRef.current?.scheduleIdleCycle();
    
    return () => {
      idleSchedulerRef.current?.clearTimers();
      avatarSequenceRef.current?.cancel();
    };
  }, [teamId, avatarId, broadcastAvatarState]);

  function updateLanguage(lang: Language) {
    // Team-View soll nur einsprachig sein, nicht 'both'
    // Sprachänderung ist lokal — kein API-Call, damit der Beamer unberührt bleibt
    const singleLang = lang === 'both' ? 'de' : lang;
    setLanguageState(singleLang);
    localStorage.setItem('teamLanguage', singleLang);
  }

  // Socket connection & live updates
  useEffect(() => {
    const socket = connectToRoom(roomCode);
    socketRef.current = socket;
    setConnectionStatus('connecting');

    const silentRejoinStoredTeam = () => {
      const savedName = localStorage.getItem(storageKey('name'));
      const savedId = localStorage.getItem(storageKey('id'));
      const savedAvatar = localStorage.getItem(storageKey('avatar'));
      if (!savedName || !savedId) return;
      socket.emit(
        'team:join',
        { roomCode, teamName: savedName, teamId: savedId, avatarId: savedAvatar || undefined },
        (resp?: { ok?: boolean; team?: Team; error?: string }) => {
          if (resp?.ok && resp?.team?.id) {
            setTeamId(resp.team.id);
            setPhase('waitingForQuestion');
            setSocketError(null);
            setConnectionStatus('connected');
            return;
          }
          if (resp?.error) {
            const msg = String(resp.error).toLowerCase();
            if (msg.includes('team unbekannt') || msg.includes('team unknown')) {
              localStorage.removeItem(storageKey('id'));
              savedIdRef.current = null;
              setTeamId(null);
              setPhase('notJoined');
            }
          }
        }
      );
    };

    socket.on('connect', () => {
      setConnectionStatus('connected');
      setSocketError(null);
      setToast(null);
      silentRejoinStoredTeam();
    });
    socket.on('disconnect', () => setConnectionStatus('disconnected'));
    socket.on('connect_error', (err) => {
      setSocketError(err?.message || 'Socket error');
      setConnectionStatus('disconnected');
    });
    socket.io?.on?.('reconnect_attempt', () => setConnectionStatus('connecting'));

    socket.on('syncState', (payload: SyncStatePayload) => {
      setHasStateUpdate(true);
      const hasTeam = Boolean(teamId);
      if (!hasTeam) {
        setQuestion(null);
        setQuestionMeta(null);
        setPhase('notJoined');
        setAllowReadyToggle(true);
        setAnswerSubmitted(false);
        setEvaluating(false);
        setTimerEndsAt(null);
        return;
      }
      // Language wird lokal im Team gemanagt, nicht vom Server überschrieben
      if (payload.question) {
        resetInputs();
        setQuestion(payload.question);
        setQuestionMeta(payload.questionMeta);
        setPhase(
          payload.questionPhase === 'revealed'
            ? 'showResult'
            : payload.questionPhase === 'evaluated'
            ? 'waitingForResult'
            : 'answering'
        );
        setAllowReadyToggle(false);
        setAnswerSubmitted(false);
        setResultMessage(null);
        setResultCorrect(null);
        setSolution(null);
        setIsFinal(false);
      } else {
        resetInputs();
        setQuestion(null);
        setQuestionMeta(null);
        setPhase(teamId ? 'waitingForQuestion' : 'notJoined');
        setAllowReadyToggle(true);
      }
      setTimerEndsAt(payload.timerEndsAt ?? null);
      if (payload.timerEndsAt) {
        const remaining = Math.max(0, Math.ceil((payload.timerEndsAt - Date.now()) / 1000));
        setTimerDuration(remaining || 30);
      }
    });

    socket.on('team:show-question', ({ question: q }) => {
      if (!teamId) return;
      resetInputs();
      setQuestion(q);
      setPhase('answering');
      setAllowReadyToggle(false);
      setAnswerSubmitted(false);
      setResultMessage(null);
      setResultCorrect(null);
    });

    socket.on('timerStarted', ({ endsAt }) => {
      setTimerEndsAt(endsAt);
      const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setTimerDuration(remaining || 30);
    });
    socket.on('timerStopped', () => setTimerEndsAt(null));
    const onStateUpdate = (payload: StateUpdatePayload) => {
      setHasStateUpdate(true);
      setGameState(payload.state);
      const teamSnapshot = teamId ? payload.teamStatus?.find((team) => team.id === teamId) : undefined;
      if (teamSnapshot && typeof teamSnapshot.submitted === 'boolean') {
        setAnswerSubmitted(teamSnapshot.submitted);
      }
      if (payload.scores) {
        setScoreboard(payload.scores);
      }
      if (payload.teamStatus) {
        setTeamStatus(payload.teamStatus);
        // Update used avatars list
        const usedIds = new Set<string>();
        payload.teamStatus.forEach((team) => {
          if (team.avatarId && team.id !== teamId) {
            usedIds.add(team.avatarId);
          }
        });
        setUsedAvatarIds(usedIds);
      }
      if (payload.blitz !== undefined) {
        setBlitzState(payload.blitz ?? null);
      }
      if (payload.rundlauf !== undefined) {
        setRundlaufState(payload.rundlauf ?? null);
      }
      if (payload.oneOfEight !== undefined) {
        setOneOfEightState(payload.oneOfEight ?? null);
      }
      if (payload.avatarsEnabled !== undefined) {
        setAvatarsEnabled(payload.avatarsEnabled !== false);
      }
      // Only update question if explicitly provided and not null
      if (payload.currentQuestion !== undefined && payload.currentQuestion !== null) {
        const nextId = payload.currentQuestion.id;
        if (nextId && lastQuestionIdRef.current !== nextId) {
          lastQuestionIdRef.current = nextId;
          resetInputs();
          setAnswerSubmitted(false);
          setResultMessage(null);
          setResultCorrect(null);
          setSolution(null);
        }
        setQuestion(payload.currentQuestion);
        if (payload.state === 'QUESTION_INTRO') {
          setPhase('intro');
        } else if (payload.state === 'Q_ACTIVE') {
          const submitted = teamSnapshot?.submitted ?? answerSubmittedRef.current;
          setPhase(submitted ? 'waitingForResult' : 'answering');
        } else if (payload.state === 'Q_LOCKED') {
          setPhase('waitingForResult');
        } else if (payload.state === 'Q_REVEAL') {
          setPhase('showResult');
        } else if (teamId) {
          setPhase('waitingForQuestion');
        }
      }
      if (payload.timer) {
        setTimerEndsAt(payload.timer.endsAt ?? null);
        if (payload.timer.durationMs && payload.timer.durationMs > 0) {
          setTimerDuration(Math.max(1, Math.round(payload.timer.durationMs / 1000)));
        }
      }
      if (payload.results && teamId) {
        const entry = payload.results.find((res) => res.teamId === teamId);
        if (entry) {
          if (typeof entry.awardedPoints === 'number') {
            setResultPoints(entry.awardedPoints);
            // Trigger feedback animation and mood
            if (entry.awardedPoints > 0) {
              setFeedbackAnimation('success');
              if (avatarId && hasStateBasedRendering(avatarId)) {
                runAvatarSequence([
                  { state: 'happy', duration: 1200 },
                  { state: 'walking', duration: 0 }
                ]);
              } else {
                setAvatarMood('happy');
              }
              setTimeout(() => setFeedbackAnimation(null), 1000);
            } else {
              setFeedbackAnimation('error');
              if (avatarId && hasStateBasedRendering(avatarId)) {
                runAvatarSequence([
                  { state: 'sad', duration: 1200 },
                  { state: 'walking', duration: 0 }
                ]);
              } else {
                setAvatarMood('sad');
              }
              setTimeout(() => setFeedbackAnimation(null), 500);
            }
          } else {
            setResultPoints(null);
          }
          setResultDetail(entry.awardedDetail ?? null);
          setResultMessage(getResultMessage(entry, question));
        }
      }
    };
    socket.on('server:stateUpdate', onStateUpdate);

    socket.on('evaluation:started', () => {
      setPhase('waitingForResult');
      setEvaluating(true);
      setIsFinal(false);
    });
    socket.on('answersEvaluated', ({ answers, solution: sol }: { answers?: Record<string, any>; solution?: string }) => {
      setEvaluating(false);
      if (sol) setSolution(sol);
      if (teamId && answers && answers[teamId]) {
        const entry = answers[teamId];
        setResultCorrect(Boolean(entry.isCorrect));
        setResultMessage(getResultMessage(entry, questionRef.current));
        
        // Determine if result is happy or sad
        let isHappy = false;
        if (typeof entry.awardedPoints === 'number') {
          setResultPoints(entry.awardedPoints);
          isHappy = entry.awardedPoints > 0;
        } else if (typeof entry.isCorrect === 'boolean') {
          // Fallback: use isCorrect if no points
          isHappy = entry.isCorrect;
        }

        // Trigger avatar animation
        if (avatarId && hasStateBasedRendering(avatarId)) {
          runAvatarSequence([
            { state: isHappy ? 'happy' : 'sad', duration: 1200 },
            { state: 'walking', duration: 0 }
          ]);
        } else {
          setAvatarMood(isHappy ? 'happy' : 'sad');
        }
        
        const detail = (entry as any)?.awardedDetail;
        if (detail) setResultDetail(detail);
        setPhase('waitingForResult');
      }
    });
    socket.on(
      'teamResult',
      ({
        teamId: tId,
        isCorrect,
        deviation,
        bestDeviation,
        solution: sol,
        awardedPoints,
        awardedDetail
      }) => {
        if (tId !== teamId) return;
        setResultCorrect(Boolean(isCorrect));
        setResultDeviation(typeof deviation === 'number' && Number.isFinite(deviation) ? deviation : null);
        setResultMessage(getResultMessage({ isCorrect, deviation, bestDeviation }, questionRef.current));
        setPhase('showResult');
        
        // Determine if result is happy or sad
        let isHappy = false;
        if (typeof awardedPoints === 'number') {
          setResultPoints(awardedPoints);
          isHappy = awardedPoints > 0;
        } else if (typeof isCorrect === 'boolean') {
          // Fallback: use isCorrect if no points
          isHappy = isCorrect;
        }

        // Trigger avatar animation
        if (avatarId && hasStateBasedRendering(avatarId)) {
          runAvatarSequence([
            { state: isHappy ? 'happy' : 'sad', duration: 1200 },
            { state: 'walking', duration: 0 }
          ]);
        } else {
          setAvatarMood(isHappy ? 'happy' : 'sad');
        }
        
        if (awardedDetail) setResultDetail(awardedDetail);
        if (sol) setSolution(sol);
        setIsFinal(true);
      }
    );
    socket.on('teamKicked', ({ teamId: kicked }) => {
      if (kicked === teamId) {
        showError(t('kicked'));
        setTeamId(null);
        setPhase('notJoined');
      }
    });
    // Language wird lokal im Team gemanagt, nicht vom Server überschrieben
    // socket.on('languageChanged', ...) wurde entfernt

    socket.on('quizEnded', () => {
      localStorage.removeItem(storageKey('id'));
      savedIdRef.current = null;
      setTeamId(null);
      setQuestion(null);
      setQuestionMeta(null);
      setPhase('notJoined');
      setAllowReadyToggle(true);
      setAnswerSubmitted(false);
      setEvaluating(false);
      setTimerEndsAt(null);
      showError(languageRef.current === 'de' ? 'Quiz beendet. Bitte neu beitreten.' : 'Quiz ended. Please join again.');
    });

    const onSessionRestarted = () => {
      // Reset game state — server:stateUpdate (LOBBY) already arrived before this event,
      // so gameState is already 'LOBBY' and phase is 'waitingForQuestion'.
      // Do NOT set phase='notJoined' here — it would get stuck since gameState and teamId
      // don't change after the auto-rejoin, preventing the [gameState, teamId] effect from
      // re-running to restore the correct phase.
      setQuestion(null);
      setAnswerSubmitted(false);
      setTimerEndsAt(null);
      setEvaluating(false);
      setResultMessage(null);
      setResultCorrect(null);
      setSolution(null);
      silentRejoinStoredTeam();
    };
    socket.on('session:restarted', onSessionRestarted);

    return () => {
      socket.off('server:stateUpdate', onStateUpdate);
      socket.off('session:restarted', onSessionRestarted);
      socket.disconnect();
    };
  }, [roomCode, teamId, reconnectKey]);

  // Keep questionRef in sync so socket handlers always see the current question
  useEffect(() => { questionRef.current = question; }, [question]);

  // Timer tick for smooth progress animations
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setTimerTick((t) => t + 1);
    }, 500);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerEndsAt]);

  // Keyboard shortcuts for accessibility
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      // ESC key: Leave team / Exit to join screen
      if (e.key === 'Escape') {
        e.preventDefault();
        if (teamId && phase === 'notJoined') {
          handleLeaveTeam();
        }
      }
      
      // Enter key on join screen - trigger join if possible
      if (phase === 'notJoined' && e.key === 'Enter') {
        const joinDisabled = !roomCode || !teamName.trim() || joinPending || !avatarId;
        if (!joinDisabled) {
          e.preventDefault();
          handleJoin(false);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [teamId, phase, roomCode, teamName, joinPending, avatarId, handleLeaveTeam, handleJoin]);

  function connectionStatusPill() {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <span
          style={connectionPill(connectionStatus)}
          title={
            connectionStatus === 'connected'
              ? language === 'de'
                ? 'Verbunden'
                : 'Online'
              : connectionStatus === 'connecting'
              ? language === 'de'
                ? 'Verbinde...'
                : 'Connecting...'
              : language === 'de'
              ? 'Getrennt'
              : 'Offline'
          }
        />
        {connectionStatus === 'disconnected' && (
          <button
            style={{
              padding: '6px 10px',
              borderRadius: 10,
              border: '1px solid rgba(148, 163, 184, 0.3)',
              background: 'rgba(148, 163, 184, 0.15)',
              color: '#cbd5e1',
              fontWeight: 700,
              cursor: 'pointer'
            }}
            onClick={handleReconnect}
          >
            {language === 'de' ? 'Erneut verbinden' : 'Reconnect'}
          </button>
        )}
      </div>
    );
  }

  function resetInputs() {
    setAnswer('');
    setBettingPoints([0, 0, 0]);
    setBunteTop5Order([]);
    setBuntePrecisionText('');
    setBunteOneChoice('');
    setBunteOrderSelection([]);
    setBunteOrderCriteria(null);
    setBunterMapPin(null);
    setResultPoints(null);
    setResultDetail(null);
    setResultDeviation(null);
  }

  function applyRankingSelection(current: string[], index: number, value: string) {
    const next = [...current];
    next[index] = value;
    if (value) {
      next.forEach((entry, idx) => {
        if (idx !== index && entry === value) next[idx] = '';
      });
    }
    return next;
  }

  const updateTop5Text = (index: number, value: string) => {
    setBunteTop5Order((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const loadQuestion = async () => {
    const data = await fetchCurrentQuestion(roomCode);
    setQuestion(data.question);
    if (data.question) {
      resetInputs();
      setPhase('answering');
      setResultMessage(null);
      setAllowReadyToggle(false);
    } else {
      resetInputs();
      setPhase('waitingForQuestion');
      setResultMessage(null);
      setAllowReadyToggle(true);
    }
  };

  const handleSubmit = async () => {
    if (!teamId) {
      if (teamName) {
        try {
          await handleJoin();
        } catch {
          showError(t('loginError'));
          return;
        }
      } else {
        showError(t('loginError'));
        return;
      }
    }
    if (!canAnswer) {
      showError(language === 'de' ? 'Antworten aktuell gesperrt.' : 'Answers are locked right now.');
      return;
    }
    
    // Haptic feedback on submit
    if ('vibrate' in navigator) {
      navigator.vibrate(40);
    }
    
    try {
      const isBunteQuestion = question?.type === 'BUNTE_TUETE' && question?.bunteTuete;
      if (question?.mechanic === 'betting') {
        const pool = (question as any).pointsPool ?? 10;
        const sum = bettingPoints.reduce((a, b) => a + b, 0);
        if (sum !== pool) {
          showError(t('betInvalid'));
          return;
        }
        if (!teamId) return;
        await submitAnswer(roomCode, teamId, bettingPoints);
        setAnswerSubmitted(true);
        setAnswer(bettingPoints);
      } else if (isBunteQuestion) {
        const payload = buildBunteSubmission(question.bunteTuete as BunteTuetePayload);
        if (!payload || !teamId) return;
        await submitAnswer(roomCode, teamId, payload);
        setAnswerSubmitted(true);
      } else {
        if (!teamId) return;
        await submitAnswer(roomCode, teamId, answer);
        setAnswerSubmitted(true);
      }
      setPhase('waitingForResult');
      setAllowReadyToggle(false);
      setTransitioning(true);
      clearMessage();
      setTimeout(() => setTransitioning(false), 500);
    } catch (error) {
      console.error(error);
      const msg = error instanceof Error ? error.message : (language === 'de' ? 'Antwort konnte nicht gesendet werden.' : 'Could not submit answer.');
      const normalized = msg.toLowerCase();
      if (normalized.includes('team unbekannt') || normalized.includes('team unknown')) {
        // Team-ID ist ungültig (Session neu gestartet oder altes Team). Erzwinge Rejoin.
        localStorage.removeItem(storageKey('id'));
        savedIdRef.current = null;
        setTeamId(null);
        setPhase('notJoined');
        showError(language === 'de' ? 'Team nicht mehr verbunden. Bitte neu beitreten.' : 'Team not recognized. Please rejoin.');
        return;
      }
      showError(msg);
    }
  };


  function renderAnswering() {
    return (
      <div
        key={question?.id || phase}
        className="glass-reflective shimmer-card"
        style={{
          ...questionShell,
          opacity: transitioning ? 0.4 : 1,
          transform: transitioning ? 'translateY(12px) scale(0.995)' : 'translateY(0) scale(1)',
          transition: 'opacity 0.3s ease, transform 0.35s ease',
          background: 'rgba(17, 24, 39, 0.85)',
          backdropFilter: 'blur(20px)',
          color: '#f8fafc',
          borderColor: timeUp ? '#fca5a5' : 'rgba(240, 95, 178, 0.24)',
          boxShadow: timeUp ? '0 4px 0 #fca5a5, 0 14px 32px rgba(0, 0, 0, 0.35)' : '0 4px 0 rgba(177, 10, 108, 0.4), 0 14px 32px rgba(0, 0, 0, 0.35)',
          animation: timeUp
            ? 'timeup-pulse 0.35s ease-in-out 2'
            : 'spring-entrance 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both',
          position: 'relative',
          overflow: 'hidden'
        }}
    >
      <div
        style={{
          ...gradientHalo,
          background: `radial-gradient(circle at 24% 20%, ${accentColor}18, transparent 45%), radial-gradient(circle at 78% 12%, ${accentColor}08, transparent 50%)`,
          animation: 'liquid-shimmer 6s ease-in-out infinite'
        }}
      />
      <div style={questionHeader}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>

        </div>
      </div>
      {isLocked && (
        <div
          style={{
            marginTop: 8,
            padding: '8px 12px',
            borderRadius: 999,
            border: '1.5px solid rgba(240,95,178,0.45)',
            background: 'rgba(240,95,178,0.1)',
            color: '#f9a8d4',
            fontWeight: 700
          }}
        >
          {language === 'de' ? 'Antworten sind gesperrt.' : 'Answers are locked.'}
        </div>
      )}
        <h2
          style={{
            ...questionStyleTeam,
            color: '#ffd1e8',
            animation: 'fadeSlideUpStrong 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both'
          }}
        >
          {(language === 'en' && (question as any)?.questionEn) || question?.question?.split('/')[0]?.trim() || question?.question || t('waitingMsg')}
        </h2>
      <div style={{ marginTop: 10 }}>{renderInput('var(--color-primary)')}</div>
      {renderBunteDetails()}
      {timeUp && (
        <p style={{
          color: '#fef3c7',
          fontWeight: 700,
          marginTop: 8,
          padding: '8px 12px',
          borderRadius: 10,
          background: 'rgba(245, 158, 11, 0.15)',
          border: '2px solid rgba(245, 158, 11, 0.4)',
          margin: '8px 0 0'
        }}>
          {language === 'de' ? 'Leider ist die Zeit schon vorbei.' : 'Time is up.'}
        </p>
      )}
      <button
        className={answerSubmitted ? 'team-submitted-glow' : ''}
        style={{
          ...primaryButton,
          marginTop: 14,
          background: answerSubmitted ? '#16a34a' : canAnswer ? 'var(--color-primary)' : '#d1d5db',
          color: '#ffffff',
          border: '2px solid rgba(255,255,255,0.25)',
          boxShadow: answerSubmitted
            ? '0 4px 0 #15803d'
            : canAnswer ? '0 4px 0 rgba(177, 10, 108, 0.6)' : '0 4px 0 #b0b8c1',
          backdropFilter: 'none',
          animation: answerSubmitted
            ? 'submitSuccess 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both, submitWaitPulse 2.5s 0.5s ease-in-out infinite'
            : canAnswer ? 'popSoft 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
          cursor: canAnswer ? 'pointer' : 'not-allowed',
          opacity: canAnswer || answerSubmitted ? 1 : 0.7,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px'
        }}
        aria-label={canAnswer ? 'Submit your answer' : 'Submit button disabled - waiting for answer to be ready'}
        aria-disabled={!canAnswer}
        onClick={handleSubmit}
        disabled={!canAnswer}
      >
        {hasTimer && canAnswer && (
          <span
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              right: `${Math.max(0, Math.min(100, 100 - progress))}%`,
              background: 'rgba(255,255,255,0.12)',
              borderRadius: 10,
              zIndex: 0,
              pointerEvents: 'none',
              transition: 'right 100ms ease-out'
            }}
          />
        )}
        <span style={{ position: 'relative', zIndex: 1, fontWeight: 900, fontSize: 15, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {answerSubmitted ? (
            <>
              <span className="team-submitted-check" style={{ fontSize: 20, marginRight: 6 }}>&#10003;</span>
              {language === 'de' ? 'Gesendet' : 'Sent'}
            </>
          ) : t('send')}
        </span>
        {hasTimer && remainingSeconds > 0 && (
          <span
            style={{
              position: 'relative',
              zIndex: 1,
              fontSize: remainingSeconds <= 10 ? 20 : 16,
              fontWeight: 900,
              color: remainingSeconds <= 10 ? '#fef08a' : 'rgba(255,255,255,0.75)',
              animation: remainingSeconds <= 10 ? 'pulse-timer 0.8s ease-in-out infinite' : 'none'
            }}
          >
            {Math.max(0, remainingSeconds)}s
          </span>
        )}
      </button>
      {message && <div className={`message-state message-${message.type}`}>{message.text}</div>}
    </div>
  );
  }

  function renderWaitingForResult() {
    const submittedTitle =
      language === 'both'
        ? 'Antwort gesendet ✅ / Answer sent ✅'
        : language === 'en'
        ? 'Answer sent ✅'
        : 'Antwort gesendet ✅';

    // Ranking hidden during normal gameplay — only revealed at official
    // scoreboard states (after round 10 / round 20 / finals).
    const rankBadge: React.ReactNode = null;

    // Show "all answered" indicator
    const connectedTeams = (teamStatus ?? []).filter(t => t.connected !== false);
    const submittedTeams = connectedTeams.filter(t => t.submitted || t.answer !== undefined);
    const allAnswered = connectedTeams.length > 1 && submittedTeams.length >= connectedTeams.length;
    const allAnsweredBadge = allAnswered ? (
      <div style={{
        marginTop: 8,
        fontSize: 13,
        fontWeight: 700,
        color: '#4ade80',
        padding: '4px 12px',
        borderRadius: 999,
        background: 'rgba(34,197,94,0.1)',
        border: '1px solid rgba(74,222,128,0.3)',
        display: 'inline-block',
      }}>
        {language === 'de' ? '✓ Alle Teams haben geantwortet' : '✓ All teams answered'}
      </div>
    ) : null;

    const waitingCard = renderWaiting(
      answerSubmitted ? submittedTitle : t('waiting'),
      language === 'de' ? 'Wir prüfen alle Antworten ...' : t('evaluating')
    );

    if (!rankBadge && !allAnsweredBadge) return waitingCard;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        {waitingCard}
        {allAnsweredBadge}
        {rankBadge}
      </div>
    );
  }

  function buildBunteSubmission(payload: BunteTuetePayload | undefined) {
    if (!question || !payload) return null;
    if (payload.kind === 'top5') {
      const values = bunteTop5Order.map((v) => (v || '').trim()).filter(Boolean).slice(0, 5);
      if (values.length === 0) {
        showError(language === 'de' ? 'Mindestens eine Antwort eingeben.' : 'Enter at least one answer.');
        return null;
      }
      return { kind: 'top5', order: values };
    }
    if (payload.kind === 'precision') {
      if (!buntePrecisionText.trim()) {
        showError(language === 'de' ? 'Bitte Antwort eingeben.' : 'Please enter an answer.');
        return null;
      }
      return { kind: 'precision', text: buntePrecisionText.trim() };
    }
    if (payload.kind === 'oneOfEight') {
      if (!bunteOneChoice) {
        showError(language === 'de' ? 'Bitte eine Option wählen.' : 'Please choose an option.');
        return null;
      }
      return { kind: 'oneOfEight', choiceId: bunteOneChoice };
    }
    if (payload.kind === 'order') {
      // DnD provides a full ordered list; fall back to original order if not yet dragged
      const values = bunteOrderSelection.length === payload.items.length
        ? bunteOrderSelection
        : payload.items.map((i) => i.id);
      return {
        kind: 'order',
        order: values,
        criteriaId: bunteOrderCriteria ?? undefined
      };
    }
    if (payload.kind === 'map') {
      if (!bunterMapPin) {
        showError(language === 'de' ? 'Bitte einen Pin auf der Karte setzen.' : 'Please place a pin on the map.');
        return null;
      }
      return { kind: 'map', lat: bunterMapPin.lat, lng: bunterMapPin.lng };
    }
    return null;
  }

  function renderBunteInput(payload: BunteTuetePayload, accent: string) {
    if (payload.kind === 'top5') {
      const maxEntries = 5;
      return (
        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ color: '#94a3b8', fontSize: 12 }}>
            {language === 'de'
              ? 'Bis zu 5 Antworten, Reihenfolge egal.'
              : 'Up to 5 answers, order irrelevant.'}
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {Array.from({ length: maxEntries }).map((_, idx) => (
              <input
                key={idx}
                className="team-answer-input"
                style={inputStyle}
                placeholder={`${t('answerPlaceholder')} ${idx + 1}`}
                value={bunteTop5Order[idx] ?? ''}
                onChange={(e) => updateTop5Text(idx, e.target.value)}
                disabled={!canAnswer}
              />
            ))}
          </div>
        </div>
      );
    }
    if (payload.kind === 'precision') {
      return (
        <input
          className="team-answer-input"
          style={inputStyle}
          placeholder={t('inputAnswer')}
          value={buntePrecisionText}
          onChange={(e) => setBuntePrecisionText(e.target.value)}
          disabled={!canAnswer}
        />
      );
    }
    if (payload.kind === 'oneOfEight') {
      const usedIds = new Set(oneOfEightState?.usedChoiceIds?.map((id) => id.toLowerCase()) ?? []);
      const activeTeamName = oneOfEightState?.activeTeamId
        ? (teamStatus?.find((t) => t.id === oneOfEightState!.activeTeamId)?.name ?? null)
        : null;
      const waitingBanner = !isOneOfEightActiveTurn && !oneOfEightState?.finished && activeTeamName && (
        <div style={{
          padding: '10px 14px',
          borderRadius: 12,
          background: 'rgba(59, 130, 246, 0.1)',
          border: '2px solid rgba(59, 130, 246, 0.3)',
          color: '#93c5fd',
          fontWeight: 700,
          fontSize: 'clamp(14px, 3.5vw, 16px)',
          textAlign: 'center',
          marginBottom: 8
        }}>
          {language === 'de' ? `${activeTeamName} ist dran` : `${activeTeamName} is up`}
        </div>
      );
      const handleWheelConfirm = async (choiceId: string) => {
        if (!teamId || !canAnswer || !isOneOfEightActiveTurn) return;
        if ('vibrate' in navigator) navigator.vibrate(40);
        try {
          await submitAnswer(roomCode, teamId, { kind: 'oneOfEight', choiceId });
          setBunteOneChoice(choiceId);
          setAnswerSubmitted(true);
          setPhase('waitingForResult');
          clearMessage();
        } catch (error) {
          showError(error instanceof Error ? error.message : (language === 'de' ? 'Fehler beim Senden.' : 'Submit error.'));
        }
      };
      return (
        <div style={{ display: 'grid', gap: 8 }}>
          {waitingBanner}
          <OneOfEightWheel
            statements={payload.statements}
            usedIds={usedIds}
            onConfirm={handleWheelConfirm}
            canAnswer={canAnswer && isOneOfEightActiveTurn}
          />
        </div>
      );
    }
    if (payload.kind === 'order') {
      const currentOrder = bunteOrderSelection.length === payload.items.length
        ? bunteOrderSelection
        : payload.items.map((i) => i.id);
      return (
        <div style={{ display: 'grid', gap: 12 }}>
          {payload.criteriaOptions?.length > 1 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {payload.criteriaOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setBunteOrderCriteria(option.id)}
                  style={{
                    ...pillSmall,
                    borderColor: bunteOrderCriteria === option.id ? accent : 'rgba(148, 163, 184, 0.3)',
                    background: bunteOrderCriteria === option.id ? `${accent}18` : 'rgba(148, 163, 184, 0.1)',
                    color: bunteOrderCriteria === option.id ? accent : '#cbd5e1'
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
          <div style={{ fontSize: 12, color: '#64748b', textAlign: 'center' }}>
            {language === 'de' ? 'Ziehen zum Sortieren' : 'Drag to reorder'}
          </div>
          <BunteOrderDnD
            items={payload.items}
            order={currentOrder}
            onChange={setBunteOrderSelection}
            disabled={!canAnswer}
          />
        </div>
      );
    }
    if (payload.kind === 'map') {
      return <BunteMapPicker pin={bunterMapPin} onChange={setBunterMapPin} disabled={!canAnswer} />;
    }
    return null;
  };

  function renderBunteDetails() {
    if (!question || question.type !== 'BUNTE_TUETE' || !question.bunteTuete) {
      return null;
    }
    const payload = question.bunteTuete as BunteTuetePayload;
    if (payload.kind === 'order') {
      return null; // items already shown in DnD drag list
    }
    if (payload.kind === 'oneOfEight') {
      return null; // statements already shown as buttons in renderBunteInput
    }
    if (payload.kind === 'precision') {
      return (
        <div style={{ marginTop: 12, color: '#cbd5e1' }}>
          <p style={{ margin: '4px 0 0' }}>{payload.prompt}</p>
        </div>
      );
    }
    return null;
  }

  function renderTop5Solution() {
    if (!question || question.type !== 'BUNTE_TUETE' || !question.bunteTuete) return null;
    if (!(phase === 'showResult' || isFinal)) return null;
    const payload = question.bunteTuete as BunteTuetePayload;
    if (payload.kind !== 'top5') return null;
    const top5 = Array.isArray(payload.correctOrder) ? payload.correctOrder : [];
    if (!top5.length) return null;
    const itemMap = new Map(
      Array.isArray(payload.items) ? payload.items.map((item) => [item.id, item.label]) : []
    );
    const resolveLabel = (value: string) => itemMap.get(value) || value;
    return (
      <div
        style={{
          margin: '12px 0 0',
          color: '#e2e8f0',
          fontWeight: 700,
          padding: '10px',
          borderRadius: 10,
          background: 'rgba(30, 41, 59, 0.5)',
          border: '1px solid rgba(148, 163, 184, 0.2)'
        }}
      >
        <div style={{ color: '#94a3b8', fontSize: 12 }}>
          {language === 'de' ? 'Top 5 Lösung:' : 'Top 5 solution:'}
        </div>
        <ol style={{ margin: '6px 0 0', paddingInlineStart: 18 }}>
          {top5.map((entry, idx) => (
            <li key={`${idx}-${entry}`} style={{ marginBottom: 4 }}>
              {resolveLabel(entry)}
            </li>
          ))}
        </ol>
      </div>
    );
  }

  function renderInput(accent: string) {
    if (!question) return null;
    if (question.type === 'BUNTE_TUETE' && question.bunteTuete) {
      return renderBunteInput(question.bunteTuete as BunteTuetePayload, accent);
    }
    switch (question.mechanic) {
      case 'multipleChoice': {
        const q = question as MultipleChoiceQuestion;
        const cozyChoicePalette = [
          { base: 'rgba(63, 116, 174, 0.14)', border: '#5a93c7', text: '#d7ecff' },
          { base: 'rgba(70, 133, 108, 0.14)', border: '#67b58f', text: '#ddffec' },
          { base: 'rgba(167, 74, 96, 0.14)', border: '#d68598', text: '#ffe2e9' },
          { base: 'rgba(176, 122, 74, 0.14)', border: '#d7a46f', text: '#ffeed9' },
          { base: 'rgba(88, 96, 120, 0.14)', border: '#a6acc2', text: '#ebeffa' }
        ] as const;
        return (
          <div style={{ display: 'grid', gap: 10 }} className="team-answer-stagger">
            {q.options.map((opt: string, idx: number) => {
              const slashIdx = opt.indexOf('/');
              const dePart = slashIdx >= 0 ? opt.slice(0, slashIdx).trim() : opt;
              const enOpt: string | undefined = (q as any).optionsEn?.[idx];
              const enPart = enOpt?.trim() || (slashIdx >= 0 ? opt.slice(slashIdx + 1).trim() : opt);
              const same = dePart.toLowerCase() === enPart.toLowerCase();
              const displayOpt = language === 'en'
                ? enPart
                : language === 'both'
                ? (same ? dePart : `${dePart} / ${enPart}`)
                : dePart;
              return (
              <button
                key={idx}
                data-choice-letter={['A','B','C','D','E'][idx]}
                className={`team-choice shimmer-card hover-spring btn-ripple${answer === String(idx) ? ' is-selected' : ''}`}
                style={{
                  ...choiceButton,
                  ...(cozyChoicePalette[idx]
                    ? {
                        border: `2px solid ${cozyChoicePalette[idx].border}`,
                        borderBottom: `4px solid ${cozyChoicePalette[idx].border}`,
                        color: cozyChoicePalette[idx].text,
                        background: cozyChoicePalette[idx].base,
                      }
                    : {}),
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0,
                  background:
                    answer === String(idx)
                      ? `linear-gradient(135deg, ${cozyChoicePalette[idx]?.base ?? `${accent}24`}, rgba(240,95,178,0.22))`
                      : cozyChoicePalette[idx]?.base ?? 'var(--ui-card-bg)',
                  boxShadow: answer === String(idx) ? `0 10px 24px ${accent}3d, 0 0 0 1px rgba(240,95,178,0.36)` : 'none',
                  overflow: 'hidden',
                  padding: 0,
                }}
                onClick={() => setAnswer(String(idx))}
                disabled={!canAnswer}
              >
                <span className="team-choice-letter" aria-hidden="true">{['A','B','C','D','E'][idx]}</span>
                <span style={{ overflowWrap: 'anywhere', wordBreak: 'break-word', minWidth: 0, padding: 'clamp(20px,5vw,24px) clamp(16px,4.5vw,20px)' }}>{displayOpt}</span>
              </button>
              );
            })}
          </div>
        );
      }
      case 'betting': {
        const opts = language === 'en' && (question as any)?.optionsEn?.length
          ? (question as any).optionsEn
          : Array.isArray((question as any)?.options) ? (question as any).options : ['A', 'B', 'C'];
        const pool = typeof (question as any)?.pointsPool === 'number' ? (question as any).pointsPool : 10;
        const total = bettingPoints.reduce((a, b) => a + b, 0);
        const remaining = pool - total;
        const updateBet = (idx: number, value: number) => {
          const clean = Math.max(0, Math.min(pool, Math.round(value)));
          const next = [...bettingPoints] as [number, number, number];
          next[idx] = clean;
          const sum = next.reduce((a, b) => a + b, 0);
          if (sum > pool) {
            const overflow = sum - pool;
            next[idx] = Math.max(0, clean - overflow);
          }
          setBettingPoints(next);
        };
        const letters = ['A', 'B', 'C'];
        const betColors = ['#3B82F6', '#22C55E', '#EF4444'];
        return (
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--muted)', fontWeight: 700, fontSize: 14 }}>{t('betHint')(pool)}</span>
              <span style={{
                fontWeight: 800, fontSize: 14, borderRadius: 999, padding: '4px 12px',
                background: remaining === 0 ? 'rgba(34,197,94,0.15)' : remaining < 0 ? 'rgba(239,68,68,0.15)' : 'rgba(234,179,8,0.12)',
                color: remaining === 0 ? '#4ade80' : remaining < 0 ? '#f87171' : '#fde047',
                border: `1px solid ${remaining === 0 ? 'rgba(74,222,128,0.3)' : remaining < 0 ? 'rgba(248,113,113,0.3)' : 'rgba(253,224,71,0.3)'}`
              }}>
                {t('betRemaining')(remaining)}
              </span>
            </div>
            {opts.slice(0, 3).map((opt: string, idx: number) => {
              const pts = bettingPoints[idx] ?? 0;
              const color = betColors[idx] ?? accent;
              return (
                <div
                  key={idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto auto auto',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 12px',
                    borderRadius: 16,
                    border: `2px solid ${pts > 0 ? color + '66' : 'rgba(255,255,255,0.08)'}`,
                    borderLeft: `4px solid ${color}`,
                    background: pts > 0 ? color + '14' : 'var(--ui-card-bg)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ color: 'var(--text)', fontWeight: 700, fontSize: 15, overflowWrap: 'anywhere', minWidth: 0 }}>
                    <span style={{ color, fontWeight: 900, marginRight: 6 }}>{letters[idx]}</span>{opt}
                  </div>
                  <button
                    onClick={() => updateBet(idx, pts - 1)}
                    disabled={!canAnswer || pts <= 0}
                    style={{
                      width: 44, height: 44, borderRadius: 12, border: `2px solid rgba(255,255,255,0.12)`,
                      background: 'rgba(255,255,255,0.06)', color: pts <= 0 ? 'rgba(255,255,255,0.25)' : 'var(--text)',
                      fontWeight: 900, fontSize: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: pts <= 0 ? 'default' : 'pointer', touchAction: 'manipulation', flexShrink: 0
                    }}
                  >−</button>
                  <span style={{
                    width: 36, textAlign: 'center', fontWeight: 900, fontSize: 20,
                    color: pts > 0 ? color : 'var(--muted)', fontVariantNumeric: 'tabular-nums'
                  }}>{pts}</span>
                  <button
                    onClick={() => updateBet(idx, pts + 1)}
                    disabled={!canAnswer || remaining <= 0}
                    style={{
                      width: 44, height: 44, borderRadius: 12, border: `2px solid ${remaining > 0 ? color + '55' : 'rgba(255,255,255,0.08)'}`,
                      background: remaining > 0 ? color + '22' : 'rgba(255,255,255,0.04)', color: remaining <= 0 ? 'rgba(255,255,255,0.25)' : color,
                      fontWeight: 900, fontSize: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: remaining <= 0 ? 'default' : 'pointer', touchAction: 'manipulation', flexShrink: 0
                    }}
                  >+</button>
                </div>
              );
            })}
          </div>
        );
      }
      case 'trueFalse':
        return (
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className={`team-choice${answer === 'true' ? ' is-selected' : ''}`}
              style={{
                ...choiceButton,
              }}
              onClick={() => setAnswer('true')}
              disabled={!canAnswer}
            >
              {t('tfTrue')}
            </button>
            <button
              className={`team-choice${answer === 'false' ? ' is-selected' : ''}`}
              style={{
                ...choiceButton,
              }}
              onClick={() => setAnswer('false')}
              disabled={!canAnswer}
            >
              {t('tfFalse')}
            </button>
          </div>
        );
      case 'sortItems': {
        const q = question as SortItemsQuestion;
        return (
          <input
            className="team-answer-input"
            style={inputStyle}
            placeholder={t('inputOrder')}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={!canAnswer}
          />
        );
      }
      case 'imageQuestion': {
        return (
          <input
            className="team-answer-input"
            style={{ ...inputStyle, background: accent, color: '#ffffff', border: '2px solid rgba(255,255,255,0.35)', boxShadow: `0 3px 0 ${accent}99`, fontWeight: 700 }}
            placeholder={t('inputAnswer')}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={!canAnswer}
            autoFocus
          />
        );
      }
      default: {
        const rawUnit = typeof (question as any)?.unit === 'string' ? (question as any).unit : undefined;
        const unit = (() => {
          if (!rawUnit) return undefined;
          const slash = rawUnit.indexOf('/');
          if (slash < 0) return rawUnit;
          const de = rawUnit.slice(0, slash).trim();
          const en = rawUnit.slice(slash + 1).trim();
          return language === 'en' ? en : language === 'both' ? rawUnit : de;
        })();
        return (
          <input
            className="team-answer-input"
            style={{ ...inputStyle, background: accent, color: '#ffffff', border: '2px solid rgba(255,255,255,0.35)', boxShadow: `0 3px 0 ${accent}99`, fontWeight: 700 }}
            placeholder={t('inputNumber')(unit)}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={!canAnswer}
            autoFocus
          />
        );
      }
    }
  }

  const formatSubmittedAnswer = (raw: any) => {
    if (!question) return String(raw ?? '');
    if (question.mechanic === 'multipleChoice') {
      const q = question as MultipleChoiceQuestion;
      const opts = language === 'en' && q.optionsEn?.length ? q.optionsEn : q.options;
      const num = typeof raw === 'number' ? raw : typeof raw === 'string' && raw.trim() !== '' && !Number.isNaN(Number(raw)) ? Number(raw) : null;
      // Answer is stored as 0-based index, use it directly
      const idx = num;
      if (idx !== null && idx >= 0 && idx < opts.length) {
        const letter = String.fromCharCode(65 + idx);
        return `${letter} – ${opts[idx]}`;
      }
      return typeof raw === 'string' ? raw : JSON.stringify(raw ?? '');
    }
    if (question.mechanic === 'betting') {
      const q = question as BettingQuestion;
      const opts = language === 'en' && q.optionsEn?.length ? q.optionsEn : q.options;
      if (Array.isArray(raw)) {
        return raw
          .slice(0, 3)
          .map((points, idx) => {
            const letter = String.fromCharCode(65 + idx);
            const label = opts?.[idx] ? ` ${opts[idx]}` : '';
            return `${letter}${label}: ${points}`;
          })
          .join(' | ');
      }
      return typeof raw === 'string' ? raw : JSON.stringify(raw ?? '');
    }
    if (question.mechanic === 'trueFalse') {
      if (raw === true || raw === 'true') return t('tfTrue');
      if (raw === false || raw === 'false') return t('tfFalse');
    }
    return typeof raw === 'string' ? raw : JSON.stringify(raw ?? '');
  };

  function renderShowResult() {
    const isCorrect = resultCorrect === true;
    const isIncorrect = resultCorrect === false;
    const isMapQ = (question as any)?.bunteTuete?.kind === 'map';
    const isEstimateQ = isClosenessQuestion(question) || isMapQ;
    return (
      <div 
        className={`card-tilt ${feedbackAnimation ? (feedbackAnimation === 'success' ? 'success-animation' : 'shake-animation') : ''}`}
        style={{ ...glassCard, alignItems: 'center', textAlign: 'center', padding: '24px 20px' }}
      >
      {!evaluating && (
        <div style={{
          margin: '12px 0 0',
          padding: '12px 16px',
          borderRadius: 14,
          background: isCorrect ? 'rgba(34, 197, 94, 0.15)' : isIncorrect ? 'rgba(239, 68, 68, 0.15)' : 'rgba(148, 163, 184, 0.1)',
          border: `2px solid ${isCorrect ? 'rgba(134, 239, 172, 0.4)' : isIncorrect ? 'rgba(252, 165, 165, 0.4)' : 'rgba(148, 163, 184, 0.3)'}`,
        }}>
          <p style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 900,
            color: isCorrect ? '#86efac' : isIncorrect ? '#fca5a5' : '#cbd5e1'
          }}>
            {isEstimateQ && resultMessage ? resultMessage : t('resultTitle')(resultCorrect)}
          </p>
        </div>
      )}
      {evaluating && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, margin: '12px 0' }}>
          <PulseIndicator />
        </div>
      )}
      {!isFinal && answer && (
        <p style={{ margin: evaluating ? '12px 0 0' : '8px 0 0', color: '#e2e8f0', fontWeight: 700, fontSize: 14, wordBreak: 'break-word' }}>
          <span style={{ color: '#94a3b8', fontSize: 12 }}>{t('yourAnswer')}</span>
          <br />
          {formatSubmittedAnswer(answer)}
        </p>
      )}
      {isFinal && answer && isClosenessQuestion(question) && (
        <p style={{ margin: '8px 0 0', color: '#e2e8f0', fontWeight: 700, fontSize: 14, wordBreak: 'break-word' }}>
          <span style={{ color: '#94a3b8', fontSize: 12 }}>{t('yourAnswer')}</span>
          <br />
          {formatSubmittedAnswer(answer)}
          {resultDeviation !== null && (
            <span style={{ marginLeft: 8, color: '#94a3b8', fontSize: 12, fontWeight: 600 }}>
              ({language === 'de' ? 'Abweichung' : 'deviation'}: ±{Math.round(resultDeviation * 100) / 100})
            </span>
          )}
        </p>
      )}
      {/* Show other teams' answers during evaluation */}
      {!isFinal && evaluating && teamStatus && teamStatus.length > 1 && (
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(148, 163, 184, 0.2)' }}>
          <span style={{ color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 12, fontWeight: 600 }}>
            {language === 'de' ? 'Andere Teams' : 'Other teams'}
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="team-answer-stagger">
            {teamStatus
              .filter(t => t.id !== teamId && t.answer !== undefined)
              .map((team, idx) => {
                const colors = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#8b5cf6', '#10b981', '#f87171', '#60a5fa'];
                const accentColor = colors[idx % colors.length];
                const avatar = getAvatarById(team.avatarId);
                return (
                  <div
                    key={team.id}
                    className="glass-reflective shimmer-card"
                    style={{
                      padding: '14px',
                      borderRadius: 12,
                      border: `1.5px solid ${accentColor}22`,
                      borderLeft: `3px solid ${accentColor}`,
                      transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      overflow: 'hidden',
                      position: 'relative'
                    }}
                  >
                    <div style={{ color: accentColor, fontWeight: 700, marginBottom: 8, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, letterSpacing: '0.3px' }}>
                      {avatarsEnabled && avatar && (
                        <AvatarMedia
                          avatar={avatar}
                          style={{ width: 22, height: 22, borderRadius: 7, border: '1px solid rgba(148, 163, 184, 0.3)' }}
                        />
                      )}
                      {team.name}
                    </div>
                    <div style={{ color: '#cbd5e1', fontSize: 13, lineHeight: 1.5, wordBreak: 'break-word', paddingLeft: 24, fontWeight: 500 }}>
                      {formatSubmittedAnswer(team.answer)}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
      {!isFinal && resultMessage && !isEstimateQ && <div className="message-state message-accent">{resultMessage}</div>}
      {!isFinal && resultPoints !== null && (
        <div className="message-state message-success">
          +{resultPoints} {language === 'de' ? 'Punkte' : 'Points'}
          {resultDetail ? ` (${resultDetail})` : ''}
        </div>
      )}
      {solution && (
        <div
          style={{
            margin: '14px 0 0',
            padding: '14px 16px',
            borderRadius: 14,
            background: 'rgba(34, 197, 94, 0.12)',
            border: '2px solid rgba(134, 239, 172, 0.35)',
            boxShadow: '0 3px 0 rgba(134, 239, 172, 0.25)'
          }}
        >
          <div
            style={{
              color: '#86efac',
              fontSize: 12,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.12em'
            }}
          >
            {t('correctAnswer')}
          </div>
          <div
            style={{
              marginTop: 6,
              color: '#f0fdf4',
              fontSize: 22,
              fontWeight: 900,
              wordBreak: 'break-word'
            }}
          >
            {solution}
          </div>
        </div>
      )}
      {!isFinal && renderTop5Solution()}
    </div>
    );
  }


  function submitBlitzAnswers() {
    if (!teamId || !socketRef.current) return;
    socketRef.current.emit(
      'team:submitBlitzAnswers',
      { roomCode, teamId, answers: blitzAnswers },
      (resp?: { ok?: boolean; error?: string }) => {
        if (!resp?.ok && resp?.error) {
          setToast(resp.error);
          setTimeout(() => setToast(null), 2000);
        } else {
          setBlitzSubmitted(true);
        }
      }
    );
  }

  function submitBlitzBan(themeId: string) {
    if (!teamId || !socketRef.current) return;
    if (blitzSelectionBusy) return;
    setBlitzSelectionBusy(true);
    socketRef.current.emit(
      'team:blitzBanCategory',
      { roomCode, teamId, themeId },
      (resp?: { error?: string }) => {
        setBlitzSelectionBusy(false);
        if (resp?.error) {
          setToast(resp.error);
          setTimeout(() => setToast(null), 2000);
        }
      }
    );
  }

  function submitBlitzPick(themeId: string) {
    if (!teamId || !socketRef.current) return;
    if (blitzSelectionBusy) return;
    setBlitzSelectionBusy(true);
    socketRef.current.emit(
      'team:blitzPickCategory',
      { roomCode, teamId, themeId },
      (resp?: { error?: string }) => {
        setBlitzSelectionBusy(false);
        if (resp?.error) {
          setToast(resp.error);
          setTimeout(() => setToast(null), 2000);
        }
      }
    );
  }

  function submitRundlaufAnswer(pass = false) {
    if (!teamId || !socketRef.current) return;
    if (gameState !== 'RUNDLAUF_PLAY') {
      setRundlaufError(inlineCopy('K.O.-Rallye ist noch nicht aktiv.', 'Knockout relay is not active yet.'));
      return;
    }
    if (!rundlaufState || rundlaufState.activeTeamId !== teamId) {
      setRundlaufError(inlineCopy('Nur das aktive Team darf antworten.', 'Only the active team may answer.'));
      return;
    }
    if (!pass && !rundlaufInput.trim()) {
      setRundlaufError(inlineCopy('Bitte gib eine Antwort ein.', 'Please enter an answer.'));
      return;
    }
    setRundlaufSubmitting(true);
    setRundlaufError(null);
    socketRef.current.emit(
      'team:submitRundlaufAnswer',
      { roomCode, teamId, text: rundlaufInput.trim(), pass },
      (resp?: { error?: string }) => {
        setRundlaufSubmitting(false);
        if (resp?.error) {
          setRundlaufError(resp.error);
        } else if (!pass) {
          setRundlaufInput('');
        }
      }
    );
  }

  function submitRundlaufBan(categoryId: string) {
    if (!teamId || !socketRef.current) return;
    socketRef.current.emit(
      'team:rundlaufBanCategory',
      { roomCode, teamId, categoryId },
      (resp?: { error?: string }) => {
        if (resp?.error) {
          setRundlaufError(resp.error);
        }
      }
    );
  }

  function submitRundlaufPick(categoryId: string) {
    if (!teamId || !socketRef.current) return;
    socketRef.current.emit(
      'team:rundlaufPickCategory',
      { roomCode, teamId, categoryId },
      (resp?: { error?: string }) => {
        if (resp?.error) {
          setRundlaufError(resp.error);
        }
      }
    );
  }

  function renderRundlaufStage() {
    if (!teamId) return renderNotJoined();
    const state = rundlaufState;
    if (!state) {
      return (
        <div style={{ ...glassCard, textAlign: 'center' }} className="card-tilt">
          <p style={mutedText}>
            {language === 'de'
              ? 'K.O.-Rallye wird vorbereitet.'
              : language === 'both'
              ? 'K.O.-Rallye wird vorbereitet / Knockout relay is preparing.'
              : 'Knockout relay is preparing.'}
          </p>
        </div>
      );
    }
    const currentCategory = state.currentCategory?.title || state.selected[state.roundIndex]?.title || '?';
    const activeTeamName = state.activeTeamId ? scoreboardLookup[state.activeTeamId]?.name || state.activeTeamId : null;
    const isActive = state.activeTeamId === teamId;
    const isEliminated = state.eliminatedTeamIds?.includes(teamId);
    const winners = state.roundWinners || [];
    const winnerNames = winners.map((id) => scoreboardLookup[id]?.name || id).join(', ');
    const medals = ['🥇', '🥈', '🥉'];
    const scoreboardBlock = (
      <div style={{ display: 'grid', gap: 6, marginTop: 10 }}>
        {sortedScoreboard.map((entry, idx) => {
          const medal = medals[idx] || '';
          const colors = ['#fbbf24', '#e5e7eb', '#f97316'];
          const medalColor = colors[idx] || '#94a3b8';
          const avatar = getAvatarById(entry.avatarId);
          return (
            <div
              key={`rundlauf-score-${entry.id}`}
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto auto auto 1fr auto',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 12,
                border: idx < 3 ? `2px solid ${medalColor}` : '1px solid rgba(148, 163, 184, 0.2)',
                background: idx < 3 ? `${medalColor}18` : 'rgba(148, 163, 184, 0.08)',
                alignItems: 'center',
                transition: 'all 0.3s ease',
                animation: `slideInUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)`,
                animationDelay: `${idx * 60}ms`,
                animationFillMode: 'backwards'
              }}
              onMouseEnter={(e) => {
                if (idx < 3) {
                  (e.currentTarget as HTMLElement).style.borderColor = `${medalColor}88`;
                  (e.currentTarget as HTMLElement).style.background = `${medalColor}22`;
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                if (idx < 3) {
                  (e.currentTarget as HTMLElement).style.borderColor = `${medalColor}44`;
                  (e.currentTarget as HTMLElement).style.background = `${medalColor}11`;
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                }
              }}
            >
              <span style={{ fontSize: 18, fontWeight: 900 }}>{medal || idx + 1}</span>
              <span style={{ fontWeight: 800, color: medal ? medalColor : '#374151' }}>
                {idx < 3 ? idx + 1 : idx + 1}
              </span>
              {avatarsEnabled && avatar && (
                <AvatarMedia
                  avatar={avatar}
                  style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid #e5e7eb' }}
                />
              )}
              <span style={{ color: '#111827' }}>{entry.name}</span>
              <span style={{ fontWeight: 800, color: medal ? medalColor : '#6b7280' }}>{entry.score ?? 0}</span>
            </div>
          );
        })}
      </div>
    );

    if (gameState === 'RUNDLAUF_PAUSE') {
      return renderWaiting(
        language === 'de' ? 'Pause – K.O.-Rallye startet gleich' : language === 'both' ? 'Pause / Knockout relay starts soon' : 'Knockout relay starts soon',
        language === 'de' ? 'Bleibt bereit.' : 'Stay ready.'
      );
    }
    if (gameState === 'RUNDLAUF_SCOREBOARD_PRE') {
      return (
        <div style={{ ...glassCard, textAlign: 'center' }} className="card-tilt">
          <p style={mutedText}>{language === 'de' ? 'Platzierung vor der K.O.-Rallye.' : 'Standings before the knockout relay.'}</p>
          {scoreboardBlock}
        </div>
      );
    }
    if (gameState === 'RUNDLAUF_CATEGORY_SELECT') {
      const pool = rundlaufState?.pool ?? [];
      const bans = new Set(rundlaufState?.bans ?? []);
      const pinnedId = rundlaufState?.pinned?.id ?? null;
      const isTopTeam = Boolean(teamId && rundlaufState?.topTeamId === teamId);
      const isLastTeam = Boolean(teamId && rundlaufState?.lastTeamId === teamId);
      const banCount = rundlaufState?.bans?.length ?? 0;
      return (
        <div style={{ ...glassCard, textAlign: 'center', display: 'grid', gap: 10 }} className="card-tilt">
          {isTopTeam && (
            <div style={{ fontSize: 12, color: '#94a3b8' }}>
              {language === 'de'
                ? `Du bist Platz 1: streiche ${Math.max(0, 2 - banCount)} Kategorien`
                : `You are top: ban ${Math.max(0, 2 - banCount)} categories`}
            </div>
          )}
          {isLastTeam && (
            <div style={{ fontSize: 12, color: '#94a3b8' }}>
              {language === 'de' ? 'Du bist letzter Platz: wähle 1 Kategorie' : 'You are last: pick 1 category'}
            </div>
          )}
          {!isTopTeam && !isLastTeam && (
            <div style={{ fontSize: 12, color: '#94a3b8' }}>
              {language === 'de' ? 'Bitte warten...' : 'Please wait...'}
            </div>
          )}
          <div style={{ display: 'grid', gap: 8 }}>
            {pool.map((entry, idx) => {
              const isBanned = bans.has(entry.id);
              const isPinned = pinnedId === entry.id;
              return (
                <div
                  key={`rundlauf-team-pick-${entry.id}`}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 12,
                    border: isPinned ? '2px solid rgba(96,165,250,0.6)' : isBanned ? '1px solid rgba(248,113,113,0.3)' : '1px solid rgba(255,255,255,0.12)',
                    background: isPinned ? 'rgba(96,165,250,0.2)' : isBanned ? 'rgba(248,113,113,0.08)' : 'rgba(15,23,42,0.5)',
                    backdropFilter: 'blur(10px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    opacity: isBanned ? 0.6 : 1,
                    animation: `fade-transition-enter 0.4s ease ${idx * 0.08}s backwards`,
                    transition: 'all 0.3s ease'
                  }}
                >
                  <span style={{ fontWeight: isPinned ? 700 : 400 }}>{isPinned ? '✓ ' : ''}{entry.title}</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {isTopTeam && (
                      <button
                        style={{
                          ...primaryButton,
                          padding: '6px 10px',
                          fontSize: 12,
                          background: 'rgba(248,113,113,0.2)',
                          border: '1px solid rgba(248,113,113,0.4)',
                          color: '#fecaca',
                          opacity: isBanned || banCount >= 2 || isPinned ? 0.4 : 1,
                          cursor: isBanned || banCount >= 2 || isPinned ? 'not-allowed' : 'pointer'
                        }}
                        disabled={isBanned || banCount >= 2 || isPinned}
                        onClick={() => submitRundlaufBan(entry.id)}
                      >
                        {language === 'de' ? 'Bannen' : 'Ban'}
                      </button>
                    )}
                    {isLastTeam && (
                      <button
                        style={{
                          ...primaryButton,
                          padding: '6px 10px',
                          fontSize: 12,
                          background: 'rgba(34,197,94,0.2)',
                          border: '1px solid rgba(34,197,94,0.45)',
                          color: '#bbf7d0',
                          opacity: isPinned || isBanned ? 0.4 : 1,
                          cursor: isPinned || isBanned ? 'not-allowed' : 'pointer'
                        }}
                        disabled={isPinned || isBanned}
                        onClick={() => submitRundlaufPick(entry.id)}
                      >
                        {language === 'de' ? 'Wählen' : 'Pick'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    if (gameState === 'RUNDLAUF_ROUND_INTRO') {
      return renderWaiting(
        language === 'de' ? `K.O.-Rallye – ${currentCategory}` : language === 'both' ? `K.O.-Rallye / Knockout relay – ${currentCategory}` : `Knockout relay – ${currentCategory}`,
        language === 'de' ? 'Gleich geht es los.' : 'Starting shortly.'
      );
    }
    if (gameState === 'RUNDLAUF_PLAY') {
      if (isEliminated) {
        return (
          <div style={{ ...glassCard, textAlign: 'center' }} className="card-tilt">
            <p style={{ ...mutedText, marginBottom: 0 }}>
              {language === 'de'
                ? 'Du bist für diese Runde raus.'
                : language === 'both'
                ? 'Du bist raus / You are out for this round.'
                : 'You are out for this round.'}
            </p>
          </div>
        );
      }
      if (!isActive) {
        return (
          <div style={{ ...glassCard, textAlign: 'center' }} className="card-tilt">
            <p style={mutedText}>
              {activeTeamName
                ? inlineCopy(`${activeTeamName} ist dran.`, `${activeTeamName} is up.`)
                : inlineCopy('Ein anderes Team ist dran.', 'Another team is up.')}
            </p>
          </div>
        );
      }
      const ownAttempt = state.lastAttempt && state.lastAttempt.teamId === teamId ? state.lastAttempt : null;
      return (
        <div style={{ ...glassCard, display: 'grid', gap: 10 }} className="card-tilt">
          <div style={{ fontWeight: 700, fontSize: 18, color: '#111827' }}>📂 {currentCategory}</div>
          <input
            className="team-answer-input"
            style={inputStyle}
            placeholder={t('inputAnswer')}
            value={rundlaufInput}
            onChange={(e) => setRundlaufInput(e.target.value)}
            disabled={rundlaufSubmitting}
          />
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <PrimaryButton onClick={() => submitRundlaufAnswer(false)} disabled={rundlaufSubmitting}>
              {rundlaufCountdown !== null && rundlaufCountdown > 0
                ? `${language === 'de' ? 'Senden' : 'Submit'} (${rundlaufCountdown}s)`
                : language === 'de' ? 'Senden' : 'Submit'}
            </PrimaryButton>
            <button
              style={{
                ...primaryButton,
                background: 'rgba(148, 163, 184, 0.15)',
                color: '#94a3b8',
                border: '2px solid rgba(148, 163, 184, 0.3)',
                boxShadow: '0 3px 0 rgba(148, 163, 184, 0.2)',
                transition: 'all 0.15s ease',
                minHeight: 44,
                cursor: rundlaufSubmitting ? 'not-allowed' : 'pointer',
                opacity: rundlaufSubmitting ? 0.5 : 1
              }}
              onMouseEnter={(e) => {
                if (!rundlaufSubmitting) {
                  e.currentTarget.style.background = 'rgba(148, 163, 184, 0.25)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(148, 163, 184, 0.15)';
              }}
              onClick={() => submitRundlaufAnswer(true)}
              disabled={rundlaufSubmitting}
            >
              {language === 'de' ? 'Pass' : 'Pass'}
            </button>
          </div>
          
          {ownAttempt && ownAttempt.verdict === 'pending' && (
            <div style={{ color: '#6b7280', fontWeight: 700 }}>
              {language === 'de' ? 'Warte auf Moderator...' : 'Waiting for host...'}
            </div>
          )}
        </div>
      );
    }
    if (gameState === 'RUNDLAUF_ROUND_END') {
      return (
        <div style={{ ...glassCard, textAlign: 'center' }} className="card-tilt">
          {winnerNames && (
            <p style={{ ...mutedText, marginBottom: 0 }}>
              {language === 'de' ? 'Gewinner' : 'Winner'}: {winnerNames}
            </p>
          )}
        </div>
      );
    }
    if (gameState === 'RUNDLAUF_SCOREBOARD_FINAL' || gameState === 'SIEGEREHRUNG') {
      const topThree = sortedScoreboard.slice(0, 3);
      const rest = sortedScoreboard.slice(3);
      return (
        <div style={{ ...glassCard, textAlign: 'center', display: 'grid', gap: 16 }} className="card-tilt page-transition-enter-active">
          
          {/* Podium Top 3 */}
          {topThree.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
              {[1, 0, 2].map((idx) => {
                const entry = topThree[idx];
                if (!entry) return null;
                const actualRank = idx === 0 ? 2 : idx === 1 ? 1 : 3;
                const heights = { 1: '100px', 2: '80px', 3: '70px' };
                const colors = {
                  1: '#fef9c3',
                  2: '#f1f5f9',
                  3: '#fef3c7'
                };
                const borderColors = {
                  1: '#fbbf24',
                  2: '#cbd5e1',
                  3: '#f97316'
                };
                return (
                  <div key={entry.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <div style={{
                      fontSize: actualRank === 1 ? 32 : 24,
                      animation: actualRank === 1 ? 'pulse-depth 2s ease-in-out infinite' : 'none'
                    }}>
                      {actualRank === 1 ? '🥇' : actualRank === 2 ? '🥈' : '🥉'}
                    </div>
                    <div
                      className={actualRank === 1 ? 'winner-spotlight' : undefined}
                      style={{
                      background: colors[actualRank as 1 | 2 | 3],
                      border: `2px solid ${borderColors[actualRank as 1 | 2 | 3]}`,
                      borderRadius: 12,
                      padding: '12px 8px',
                      height: heights[actualRank as 1 | 2 | 3],
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'flex-end',
                      alignItems: 'center',
                      width: '100%',
                      backdropFilter: 'blur(10px)',
                      animation: `spring-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${idx * 0.15}s backwards`
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4, wordBreak: 'break-word' }}>{entry.name}</div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: actualRank === 1 ? '#d97706' : actualRank === 2 ? '#64748b' : '#ea580c' }}>
                        {entry.score ?? 0}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          {/* Rest of teams */}
          {rest.length > 0 && (
            <div style={{ display: 'grid', gap: 6 }}>
              {rest.map((entry, idx) => (
                <div
                  key={`final-${entry.id}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr auto',
                    gap: 10,
                    padding: '8px 10px',
                    borderRadius: 12,
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    background: 'rgba(148, 163, 184, 0.08)',
                    animation: `fade-transition-enter 0.4s ease ${(idx + 3) * 0.1}s backwards`
                  }}
                >
                  <span style={{ fontWeight: 800, color: '#94a3b8' }}>{idx + 4}.</span>
                  <span style={{ fontSize: 14, color: '#e2e8f0' }}>{entry.name}</span>
                  <span style={{ fontWeight: 800, color: '#e2e8f0' }}>{entry.score ?? 0}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    return renderWaiting(language === 'de' ? 'Warten...' : 'Waiting...');
  }

  function renderBlitzStage() {
    if (!blitzState) {
      return (
        <div style={{ ...glassCard, textAlign: 'center' }} className="card-tilt">
          <p style={mutedText}>{language === 'de' ? 'Host bereitet gerade den Fotosprint vor.' : 'Host is preparing the Fotosprint round.'}</p>
        </div>
      );
    }
    const phase = (() => {
      switch (gameState) {
        case 'BLITZ_READY':
          return 'READY';
        case 'BLITZ_BANNING':
          return 'BANNING';
        case 'BLITZ_SET_INTRO':
          return 'ROUND_INTRO';
        case 'BLITZ_PLAYING':
          return blitzState.phase ?? 'PLAYING';
        case 'BLITZ_SET_END':
          return 'SET_END';
        case 'BLITZ_SCOREBOARD':
        case 'BLITZ_PAUSE':
          return 'DONE';
        default:
          return blitzState.phase ?? 'IDLE';
      }
    })();
    const canAnswer = phase === 'PLAYING'; // allow re-submission to update partial answers
    const results = blitzState.results || {};
    const themeLabel = blitzState.theme?.title || '?';
    const submissionCount = blitzState.submissions?.length ?? 0;
    const totalTeamsLabel = teamCount ? String(teamCount) : '?';
    const currentItem = blitzItems[activeBlitzItemIndex];
    const totalItems = blitzItems.length || blitzAnswers.length || 5;
    const pool = blitzState.pool ?? [];
    const bannedIds = new Set(Object.values(blitzState.bans ?? {}).flat());
    const pinnedId = blitzState.pinnedTheme?.id ?? null;
    const isTopTeam = Boolean(teamId && blitzState.topTeamId === teamId);
    const isLastTeam = Boolean(teamId && blitzState.lastTeamId === teamId);
    const banLimit = teamId ? blitzState.banLimits?.[teamId] ?? 0 : 0;
    const banCount = teamId ? blitzState.bans?.[teamId]?.length ?? 0 : 0;
    const bansRemaining = Math.max(0, banLimit - banCount);
    const topBanLimit = blitzState.topTeamId ? blitzState.banLimits?.[blitzState.topTeamId] ?? 0 : 0;
    const topBanCount = blitzState.topTeamId ? blitzState.bans?.[blitzState.topTeamId]?.length ?? 0 : 0;
    const banPhaseDone = topBanLimit === 0 || topBanCount >= topBanLimit;
    const selectionLocked = Boolean(blitzState.pinnedTheme);
    const pickUnlocked = banPhaseDone;
    const canShowBan = isTopTeam && !selectionLocked && !banPhaseDone;
    const canShowPick = isLastTeam && pickUnlocked && !selectionLocked;
    if (phase === 'READY') {
      return (
        <div style={{ ...glassCard, textAlign: 'center', display: 'grid', gap: 10 }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>
            {language === 'de' ? 'Fotosprint startet gleich' : 'Photo sprint starts soon'}
          </div>
          <div style={{ fontSize: 13, color: '#cbd5e1' }}>
            {language === 'de'
              ? 'Gleich geht es los!'
              : 'Starting soon!'}
          </div>
          {/* Removed: Ready button - moderator decides when to start */}
        </div>
      );
    }
    if (phase === 'BANNING') {
      return (
        <div style={{ ...glassCard, textAlign: 'center', display: 'grid', gap: 10 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>
            {language === 'de' ? 'Themen-Auswahl' : 'Theme selection'}
          </div>
          {canShowBan && (
            <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>
              {language === 'de'
                ? `✓ Du bist Platz 1: banne ${bansRemaining} Kategorien (${banCount}/${banLimit} erledigt)`
                : `✓ You are top: ban ${bansRemaining} categories (${banCount}/${banLimit} done)`}
            </div>
          )}
          {isTopTeam && pickUnlocked && !selectionLocked && (
            <div style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }}>
              {language === 'de'
                ? '✓ Alle Bans erledigt – warte auf Auswahl'
                : '✓ All bans done – waiting for pick'}
            </div>
          )}
          {isLastTeam && !pickUnlocked && (
            <div style={{ fontSize: 12, color: '#94a3b8' }}>
              {language === 'de'
                ? 'Bitte warten bis Platz 1 fertig gebannt hat.'
                : 'Please wait until team 1 finishes banning.'}
            </div>
          )}
          {canShowPick && (
            <div style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }}>
              {language === 'de'
                ? '✓ Deine Runde: wählen Sie 1 Kategorie'
                : '✓ Your turn: pick 1 category'}
            </div>
          )}
          {!canShowBan && !canShowPick && (
            <div style={{ fontSize: 12, color: '#94a3b8' }}>
              {language === 'de' ? 'Bitte warten, Auswahl läuft...' : 'Please wait, selection in progress...'}
            </div>
          )}
          {canShowBan || canShowPick ? (
            <div style={{ display: 'grid', gap: 8 }}>
              {pool.map((theme) => {
                const isBanned = bannedIds.has(theme.id);
                const isPinned = pinnedId === theme.id;
                const canBan = canShowBan && banCount < banLimit && !isBanned && !isPinned && !blitzSelectionBusy;
                const canPick = canShowPick && !isBanned && !isPinned && !blitzSelectionBusy;
                return (
                  <div
                    key={`blitz-team-pick-${theme.id}`}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 12,
                      border: isPinned 
                        ? '2px solid rgba(34,197,94,0.6)' 
                        : '1px solid rgba(255,255,255,0.12)',
                      background: isPinned 
                        ? 'linear-gradient(135deg, rgba(34,197,94,0.25), rgba(34,197,94,0.15))' 
                        : 'rgba(15,23,42,0.6)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                      opacity: isBanned ? 0.5 : 1,
                      transform: isBanned ? 'scale(0.95)' : isPinned ? 'scale(1.05)' : 'scale(1)',
                      boxShadow: isPinned 
                        ? '0 0 20px rgba(34,197,94,0.3), 0 8px 24px rgba(0,0,0,0.2)' 
                        : 'none',
                      transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      filter: isBanned ? 'grayscale(40%)' : 'none'
                    }}
                  >
                    <span style={{ 
                      textDecoration: isBanned ? 'line-through' : 'none',
                      fontWeight: isPinned ? 700 : 400,
                      color: isPinned ? '#a7f3d0' : 'inherit'
                    }}>
                      {theme.title}
                    </span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {canShowBan && (
                        <button
                          style={{
                            ...primaryButton,
                            padding: '6px 10px',
                            fontSize: 12,
                            background: 'rgba(248,113,113,0.2)',
                            border: '1px solid rgba(248,113,113,0.4)',
                            color: '#fecaca',
                            opacity: canBan ? 1 : 0.35,
                            cursor: canBan ? 'pointer' : 'not-allowed'
                          }}
                          disabled={!canBan}
                          onClick={() => submitBlitzBan(theme.id)}
                        >
                          {language === 'de' ? 'Bannen' : 'Ban'}
                        </button>
                      )}
                      {canShowPick && (
                        <button
                          style={{
                            ...primaryButton,
                            padding: '6px 10px',
                            fontSize: 12,
                            background: 'rgba(34,197,94,0.2)',
                            border: '1px solid rgba(34,197,94,0.45)',
                            color: '#bbf7d0',
                            opacity: canPick ? 1 : 0.35,
                            cursor: canPick ? 'pointer' : 'not-allowed'
                          }}
                          disabled={!canPick}
                          onClick={() => submitBlitzPick(theme.id)}
                        >
                          {language === 'de' ? 'Wählen' : 'Pick'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: 20, textAlign: 'center', fontSize: 14, color: '#94a3b8' }}>
              {language === 'de'
                ? 'Wartet auf andere Teams...'
                : 'Waiting for other teams...'}
            </div>
          )}
        </div>
      );
    }
    if (phase === 'ROUND_INTRO') {
      return (
          <div style={{ ...glassCard, textAlign: 'center', display: 'grid', gap: 10 }}>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{themeLabel}</div>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>
            {language === 'de' ? 'Runde startet jetzt' : 'Round is starting'}
          </div>
        </div>
      );
    }
    if (gameState === 'BLITZ_SCOREBOARD') {
      const topThree = sortedScoreboard.slice(0, 3);
      const rest = sortedScoreboard.slice(3);
      return (
        <div style={{ ...glassCard, textAlign: 'center', display: 'grid', gap: 16 }} className="card-tilt page-transition-enter-active">
          
          {/* Podium Top 3 */}
          {topThree.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
              {[1, 0, 2].map((idx) => {
                const entry = topThree[idx];
                if (!entry) return null;
                const actualRank = idx === 0 ? 2 : idx === 1 ? 1 : 3;
                const heights = { 1: '100px', 2: '80px', 3: '70px' };
                const colors = {
                  1: '#fef9c3',
                  2: '#f1f5f9',
                  3: '#fef3c7'
                };
                const borderColors = {
                  1: '#fbbf24',
                  2: '#cbd5e1',
                  3: '#f97316'
                };
                return (
                  <div key={entry.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <div style={{
                      fontSize: actualRank === 1 ? 32 : 24,
                      animation: actualRank === 1 ? 'pulse-depth 2s ease-in-out infinite' : 'none'
                    }}>
                      {actualRank === 1 ? '🥇' : actualRank === 2 ? '🥈' : '🥉'}
                    </div>
                    <div
                      className={actualRank === 1 ? 'winner-spotlight' : undefined}
                      style={{
                      background: colors[actualRank as 1 | 2 | 3],
                      border: `2px solid ${borderColors[actualRank as 1 | 2 | 3]}`,
                      borderRadius: 12,
                      padding: '12px 8px',
                      height: heights[actualRank as 1 | 2 | 3],
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'flex-end',
                      alignItems: 'center',
                      width: '100%',
                      backdropFilter: 'blur(10px)',
                      animation: `spring-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${idx * 0.15}s backwards`
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4, wordBreak: 'break-word' }}>{entry.name}</div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: actualRank === 1 ? '#d97706' : actualRank === 2 ? '#64748b' : '#ea580c' }}>
                        {entry.score ?? 0}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          {/* Rest of teams */}
          {rest.length > 0 && (
            <div style={{ display: 'grid', gap: 6 }}>
              {rest.map((entry, idx) => (
                <div
                  key={`blitz-final-${entry.id}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr auto',
                    gap: 10,
                    padding: '8px 10px',
                    borderRadius: 12,
                    border: '1px solid #e5e7eb',
                    background: '#f9fafb',
                    animation: `fade-transition-enter 0.4s ease ${(idx + 3) * 0.1}s backwards`
                  }}
                >
                  <span style={{ fontWeight: 800, color: '#9ca3af' }}>{idx + 4}.</span>
                  <span style={{ fontSize: 14 }}>{entry.name}</span>
                  <span style={{ fontWeight: 800 }}>{entry.score ?? 0}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    if (gameState === 'BLITZ_PAUSE') {
      return renderWaiting(language === 'de' ? 'Pause - gleich geht es weiter.' : 'Pause - back soon.', '');
    }
    if (phase === 'SET_END') {
      return (
        <div style={{ ...glassCard, textAlign: 'center', display: 'grid', gap: 10 }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>
            {language === 'de' ? 'Runde beendet!' : 'Round complete!'}
          </div>
          <div style={{ fontSize: 13, color: '#cbd5e1' }}>
            {language === 'de' ? 'Ergebnisse werden ausgewertet...' : 'Evaluating results...'}
          </div>
        </div>
      );
    }
    if (phase === 'DONE' || !phase || phase === 'IDLE') {
      return renderWaiting(
        language === 'de' ? 'Warten auf nächste Runde...' : 'Waiting for next round...', 
        ''
      );
    }
    if (phase === 'DISPLAYING') {
      // During DISPLAYING phase, images are shown on beamer only
      return renderWaiting(
        language === 'de' ? 'Bilder werden angezeigt...' : 'Images displaying...',
        language === 'de' ? 'Gleich kannst du antworten' : 'Answer phase coming up'
      );
    }
    if (phase !== 'PLAYING') {
      // Fallback für unbekannte Phasen
      return renderWaiting('Fotosprint...', '');
    }
    return (
      <div style={{ ...glassCard, display: 'grid', gap: 10 }}>
        {phase === 'PLAYING' ? (
          <>
            <div style={{ fontSize: 14, color: '#cbd5e1', fontWeight: 600 }}>
              {language === 'de'
                ? `Item ${Math.min(activeBlitzItemIndex + 1, totalItems)}/${totalItems}`
                : `Item ${Math.min(activeBlitzItemIndex + 1, totalItems)}/${totalItems}`}
            </div>
            <div
              style={{
                padding: 14,
                borderRadius: 16,
                border: '1px solid rgba(96,165,250,0.35)',
                background: 'rgba(15,23,42,0.7)',
                display: 'grid',
                gap: 8
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 800 }}>
                {language === 'de'
                  ? `Was siehst du auf den Bildern?`
                  : `What do you see in the images?`}
              </div>
            </div>
            {/* Mobile: single item at a time — no scrolling */}
            {isMobile && (
              <div style={{ display: 'grid', gap: 12 }}>
                {/* Progress dots */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 7, marginBottom: 2 }}>
                  {Array.from({ length: totalItems }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setExpandedBlitzItem(i)}
                      style={{
                        width: blitzAnswers[i]?.trim() ? 10 : 8,
                        height: blitzAnswers[i]?.trim() ? 10 : 8,
                        borderRadius: '50%',
                        background: blitzAnswers[i]?.trim() ? '#22c55e' : i === expandedBlitzItem ? '#93c5fd' : 'rgba(148,163,184,0.3)',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        transition: 'all 0.2s',
                        flexShrink: 0
                      }}
                    />
                  ))}
                </div>
                {/* Current item label */}
                <div style={{ textAlign: 'center', fontSize: 12, color: '#64748b', fontWeight: 700, letterSpacing: '0.1em' }}>
                  FOTO {expandedBlitzItem + 1} / {totalItems}
                </div>
                {/* Input */}
                <input
                  key={expandedBlitzItem}
                  ref={(el) => (blitzInputsRef.current[expandedBlitzItem] = el)}
                  className="team-answer-input is-active"
                  autoFocus
                  style={{
                    ...inputStyle,
                    fontSize: '17px',
                    padding: '16px 14px',
                    border: `2px solid ${blitzAnswers[expandedBlitzItem]?.trim() ? 'rgba(34,197,94,0.6)' : 'rgba(96,165,250,0.5)'}`,
                    background: 'rgba(15,30,57,0.88)',
                    color: '#e2e8f0',
                    borderRadius: 16,
                  }}
                  value={blitzAnswers[expandedBlitzItem] || ''}
                  disabled={!canAnswer}
                  placeholder={language === 'de' ? 'Antwort eingeben...' : 'Enter answer...'}
                  onChange={(e) =>
                    setBlitzAnswers((prev) => {
                      const next = [...prev];
                      next[expandedBlitzItem] = e.target.value;
                      return next;
                    })
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && expandedBlitzItem < totalItems - 1) {
                      e.preventDefault();
                      setExpandedBlitzItem((i) => i + 1);
                    }
                  }}
                />
                {/* Prev / Next navigation */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    disabled={expandedBlitzItem === 0}
                    onClick={() => setExpandedBlitzItem((i) => i - 1)}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: 14,
                      border: '1.5px solid rgba(148,163,184,0.2)',
                      background: 'rgba(255,255,255,0.05)',
                      color: expandedBlitzItem === 0 ? '#334155' : '#94a3b8',
                      fontWeight: 700,
                      fontSize: 18,
                      cursor: expandedBlitzItem === 0 ? 'not-allowed' : 'pointer',
                    }}
                  >◀</button>
                  <button
                    disabled={expandedBlitzItem === totalItems - 1}
                    onClick={() => setExpandedBlitzItem((i) => i + 1)}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: 14,
                      border: '1.5px solid rgba(148,163,184,0.2)',
                      background: 'rgba(255,255,255,0.05)',
                      color: expandedBlitzItem === totalItems - 1 ? '#334155' : '#94a3b8',
                      fontWeight: 700,
                      fontSize: 18,
                      cursor: expandedBlitzItem === totalItems - 1 ? 'not-allowed' : 'pointer',
                    }}
                  >▶</button>
                </div>
              </div>
            )}
            <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 4 }}>
              {language === 'de'
                ? `Abgegeben: ${submissionCount}/${totalTeamsLabel}`
                : `Submitted: ${submissionCount}/${totalTeamsLabel}`}
            </div>
            {/* Desktop: Show all items in compact grid */}
            {!isMobile && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginBottom: 12 }}>
                {blitzAnswers.map((value, idx) => {
                  const item = blitzItems[idx];
                  const hasAnswer = value && value.trim().length > 0;
                  return (
                    <div
                      key={`blitz-desktop-${idx}`}
                      style={{
                        display: 'grid',
                        gap: 8,
                        padding: '12px',
                        borderRadius: '12px',
                        border: `2px solid ${hasAnswer ? 'rgba(34,197,94,0.6)' : 'rgba(96,165,250,0.5)'}`,
                        background: hasAnswer ? 'rgba(34,197,94,0.1)' : 'rgba(96,165,250,0.08)'
                      }}
                    >
                      <label style={{ fontSize: 13, fontWeight: '700', color: hasAnswer ? '#bbf7d0' : '#dbeafe' }}>
                        ITEM {idx + 1}
                        {hasAnswer && <span style={{ marginLeft: 6 }}>✓</span>}
                      </label>
                      <input
                        ref={(el) => (blitzInputsRef.current[idx] = el)}
                        className="team-answer-input"
                        style={{
                          ...inputStyle,
                          fontSize: '14px',
                          padding: '10px',
                          border: `1px solid ${hasAnswer ? 'rgba(34,197,94,0.6)' : 'rgba(96,165,250,0.6)'}`,
                          background: 'rgba(15,23,42,0.7)'
                        }}
                        value={value}
                        disabled={!canAnswer}
                        placeholder={`${t('answerPlaceholder')} ${idx + 1}`}
                        onChange={(e) =>
                          setBlitzAnswers((prev) => {
                            const next = [...prev];
                            next[idx] = e.target.value;
                            return next;
                          })
                        }
                      />
                    </div>
                  );
                })}
              </div>
            )}
            <button
              style={{
                ...primaryButton,
                marginTop: 8,
                opacity: canAnswer ? 1 : 0.6,
                cursor: canAnswer ? 'pointer' : 'not-allowed'
              }}
              disabled={!canAnswer}
              onClick={submitBlitzAnswers}
            >
              {blitzSubmitted
                ? language === 'de'
                  ? '✓ Aktualisieren'
                  : '✓ Update'
                : language === 'de'
                ? 'Antworten senden'
                : 'Submit answers'}
            </button>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 14, color: '#cbd5e1' }}>
              {language === 'de'
                ? 'Set abgeschlossen. Warte auf das nächste.'
                : 'Set finished. Waiting for the next one.'}
            </div>
            {Object.keys(results).length > 0 && (
              <div style={{ display: 'grid', gap: 6 }}>
                {sortedScoreboard.map((entry) => {
                  const avatar = getAvatarById(entry.avatarId);
                  return (
                  <div
                    key={`blitz-score-${entry.id}`}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'auto 1fr auto auto',
                      gap: 10,
                      padding: '8px 10px',
                      borderRadius: 12,
                      border: '1px solid rgba(255,255,255,0.12)'
                    }}
                  >
                    {avatarsEnabled && avatar && (
                      <AvatarMedia
                        avatar={avatar}
                        style={{ width: 26, height: 26, borderRadius: 8, border: '1px solid rgba(255,255,255,0.16)' }}
                      />
                    )}
                    <span>{entry.name}</span>
                    <span>{results[entry.id]?.correctCount ?? 0}/5</span>
                    <span style={{ fontWeight: 700 }}>+{results[entry.id]?.pointsAwarded ?? 0}</span>
                  </div>
                );
                })}
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  function handleLeaveTeam() {
    if (roomCode) {
      localStorage.removeItem(storageKey('id'));
      localStorage.removeItem(storageKey('name'));
      localStorage.removeItem(storageKey('avatar'));
    }
    savedIdRef.current = null;
    setTeamId(null);
    setTeamName('');
    setPhase('notJoined');
    setIsReady(false);
  }

  function renderNotJoined() {
    const joinDisabled = !roomCode || !teamName.trim() || joinPending || (avatarsEnabled && !avatarId);
    return (
      <div key="join-screen" style={{ ...glassCard, animation: 'fadeSlideUpStrong 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
        <h3 style={{ ...heading, marginBottom: 0 }}>{t('joinWelcome')}</h3>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {(['de', 'en'] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => updateLanguage(lang)}
              title={lang === 'de' ? 'Deutsch' : 'English'}
              style={{
                width: 36, height: 36, borderRadius: 10, border: '2px solid',
                borderColor: language === lang ? accentColor : 'rgba(148, 163, 184, 0.3)',
                background: language === lang ? `${accentColor}18` : 'rgba(30, 41, 59, 0.4)',
                cursor: 'pointer', fontSize: 20, lineHeight: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 0, transition: 'all 0.18s ease',
                boxShadow: language === lang ? `0 2px 0 ${accentColor}66` : '0 2px 0 rgba(148, 163, 184, 0.2)'
              }}
            >
              {lang === 'de' ? '🇩🇪' : '🇬🇧'}
            </button>
          ))}
        </div>
      </div>
      <p style={mutedText}>{language === 'en'
        ? (avatarsEnabled ? 'Enter your team name, pick a companion and a color, then you\'re good to go!' : 'Enter your team name, pick a team color, then you\'re good to go!')
        : (avatarsEnabled ? 'Gib deinen Teamnamen ein, wähle einen Begleiter und eine Farbe, dann geht\'s los!' : 'Gib deinen Teamnamen ein, wähle eine Teamfarbe und dann geht\'s los!')}
      </p>
      
      {/* Hidden hints for screen readers */}
      <div id="team-name-hint" style={{ display: 'none' }}>
        Enter your team name (up to 24 characters). Press Enter to proceed or use the Join button below.
      </div>
      <div id="avatar-carousel-hint" style={{ display: 'none' }}>
        Swipe left or right to change avatars. Click on an avatar to select it as your team companion.
      </div>
      
      <input
        value={teamName}
        onChange={(e) => setTeamName(e.target.value)}
        placeholder={t('joinPlaceholder')}
        aria-label="Team name input"
        aria-describedby="team-name-hint"
        className="team-answer-input team-join-input"
        style={{
          ...inputStyle,
          transition: 'all 0.25s ease',
        }}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="words"
        spellCheck={false}
        enterKeyHint="done"
        maxLength={24}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !joinDisabled) {
            handleJoin(false);
          }
        }}
        onFocus={(e) => {
          (e.currentTarget as HTMLInputElement).style.boxShadow = `0 0 0 3px ${accentColor}33, 0 2px 0 ${accentColor}`;
          (e.currentTarget as HTMLInputElement).style.borderColor = accentColor;
        }}
        onBlur={(e) => {
          (e.currentTarget as HTMLInputElement).style.boxShadow = `0 2px 0 ${accentColor}`;
          (e.currentTarget as HTMLInputElement).style.borderColor = accentColor;
        }}
      />
      {avatarsEnabled && <div style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 0 }}>
          <button
            type="button"
            title={t('avatarRandom')}
            style={{
              width: 32,
              height: 32,
              padding: 0,
              borderRadius: '50%',
              background: 'rgba(30, 41, 59, 0.5)',
              border: '2px solid rgba(148, 163, 184, 0.3)',
              color: '#e2e8f0',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              transition: '0.2s ease'
            }}
            onClick={() => {
              const availableAvatars = AVATARS.filter(a => !usedAvatarIds.has(a.id));
              if (availableAvatars.length === 0) {
                showError(language === 'de' ? 'Alle Avatare sind bereits vergeben.' : 'All avatars are taken.');
                return;
              }
              const random = availableAvatars[Math.floor(Math.random() * availableAvatars.length)];
              if (random) {
                setAvatarId(random.id);
                setAvatarCarouselIndex(AVATARS.findIndex(a => a.id === random.id));
                if (roomCode) localStorage.setItem(storageKey('avatar'), random.id);
              }
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(30, 41, 59, 0.7)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(30, 41, 59, 0.5)';
            }}
          >
            🎲
          </button>
        </div>
        
        {/* Swipe Instruction */}
        <div
          style={{
            textAlign: 'center',
            fontSize: isMobileSize ? 11 : 12,
            color: '#94a3b8',
            marginBottom: isMobileSize ? 6 : 8,
            fontStyle: 'italic'
          }}
        >
          ← Wische nach links oder rechts →
        </div>
        
        {/* 3D Avatar Carousel */}
        <div
          style={{
            position: 'relative',
            borderRadius: 16,
            background: 'rgba(30, 41, 59, 0.4)',
            border: '2px solid rgba(148, 163, 184, 0.2)',
            padding: isMobileSize ? '20px 0' : '30px 0',
            overflow: 'hidden',
            marginBottom: isMobileSize ? 12 : 20,
            height: isMobileSize ? 280 : 240,
            touchAction: 'pan-y',
            userSelect: 'none'
          }}
          onTouchStart={(e) => {
            setTouchStart(e.touches[0].clientX);
            // Trigger tap animation
            setAvatarTapped(true);
            setTimeout(() => setAvatarTapped(false), 400);
          }}
          onTouchEnd={(e) => {
            setTouchEnd(e.changedTouches[0].clientX);
            const diff = touchStart - touchEnd;
            if (Math.abs(diff) > 50 && availableAvatars.length > 0) {
              let newIndex;
              if (diff > 0) {
                // Swiped left - next avatar
                newIndex = (avatarCarouselIndex + 1) % availableAvatars.length;
              } else {
                // Swiped right - prev avatar
                newIndex = (avatarCarouselIndex - 1 + availableAvatars.length) % availableAvatars.length;
              }
              setAvatarCarouselIndex(newIndex);
              // Auto-select the swiped avatar (only if different)
              const selectedAvatar = availableAvatars[newIndex];
              if (selectedAvatar && selectedAvatar.id !== avatarId) {
                setAvatarId(selectedAvatar.id);
                if (roomCode) localStorage.setItem(storageKey('avatar'), selectedAvatar.id);
              }
            }
          }}
        >
          {/* Left Preview - Hidden on Mobile */}
          {availableAvatars.length > 0 && (
            <div
              style={{
                position: 'absolute',
                left: '8%',
                bottom: 0,
                width: 100,
                height: 140,
                opacity: 0.4,
                filter: 'blur(3px)',
                transition: 'all 0.3s ease',
                display: isTabletSize ? 'none' : 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center'
              }}
            >
              <AvatarMedia
                avatar={availableAvatars[(avatarCarouselIndex - 1 + availableAvatars.length) % availableAvatars.length]}
                style={{ 
                  width: '85%', 
                  height: `${getAvatarSize(availableAvatars[(avatarCarouselIndex - 1 + availableAvatars.length) % availableAvatars.length]?.id) * 90}%`,
                  objectFit: 'contain'
                }}
              />
            </div>
          )}

          {/* Center Main Avatar */}
          {availableAvatars.length > 0 && availableAvatars[avatarCarouselIndex] && (
            <div
              style={{
                position: 'absolute',
                left: '50%',
                bottom: 0,
                transform: 'translateX(-50%)',
                width: isMobileSize ? 180 : 160,
                height: isMobileSize ? 240 : 200,
                zIndex: 10,
                transition: 'all 0.3s ease'
              }}
            >
              <button
                type="button"
                aria-label={`Select ${availableAvatars[avatarCarouselIndex]?.name || 'avatar'} as team companion`}
                aria-describedby="avatar-carousel-hint"
                onClick={() => {
                  const selectedAvatar = availableAvatars[avatarCarouselIndex];
                  if (selectedAvatar) {
                    // Only update avatar ID if it's different (prevents carousel jump on tap)
                    if (selectedAvatar.id !== avatarId) {
                      setAvatarId(selectedAvatar.id);
                      if (roomCode) localStorage.setItem(storageKey('avatar'), selectedAvatar.id);
                      // Trigger happy animation on manual selection
                      setAvatarMood('happy');
                    }
                    
                    // State-based avatar: looking on tap (always trigger, even if same avatar)
                    if (hasStateBasedRendering(selectedAvatar.id)) {
                      runAvatarSequence([
                        { state: 'gesture', duration: 600 },
                        { state: 'happy', duration: 1200 },
                        { state: 'walking', duration: 0 }
                      ], selectedAvatar.id);
                    }
                  }
                  // Trigger tap animation
                  setAvatarTapped(true);
                  setTimeout(() => setAvatarTapped(false), 400);
                }}
                style={{
                  width: '100%',
                  height: '100%',
                  padding: 16,
                  borderRadius: 20,
                  border: `4px solid ${accentColor}`,
                  background: 'rgba(15, 23, 42, 0.6)',
                  backdropFilter: 'blur(8px)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: `0 4px 0 ${accentColor}66, 0 8px 24px rgba(0,0,0,0.4)`,
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                  position: 'relative'
                }}
              >
                <AvatarMedia
                  avatar={availableAvatars[avatarCarouselIndex]}
                  mood={avatarMood}
                  onTap={avatarTapped}
                  igelState={igelState}
                  style={{
                    width: '85%',
                    height: `${getAvatarSize(availableAvatars[avatarCarouselIndex]?.id) * 95}%`,
                    objectFit: 'contain'
                  }}
                />
              </button>
            </div>
          )}

          {/* Right Preview - Hidden on Mobile */}
          {availableAvatars.length > 0 && (
            <div
              style={{
                position: 'absolute',
                right: '8%',
                bottom: 0,
                width: 100,
                height: 140,
                opacity: 0.4,
                filter: 'blur(3px)',
                transition: 'all 0.3s ease',
                display: isTabletSize ? 'none' : 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center'
              }}
            >
              <AvatarMedia
                avatar={availableAvatars[(avatarCarouselIndex + 1) % availableAvatars.length]}
                style={{ 
                  width: '85%', 
                  height: `${getAvatarSize(availableAvatars[(avatarCarouselIndex + 1) % availableAvatars.length]?.id) * 90}%`,
                  objectFit: 'contain'
                }}
              />
            </div>
          )}
        </div>
      </div>}


      <button
        style={{
          ...primaryButton,
          marginTop: 12,
          background: 'var(--color-primary)',
          boxShadow: joinDisabled ? 'none' : `0 4px 0 rgba(0,0,0,0.25)`,
          opacity: joinDisabled ? 0.45 : 1,
          cursor: joinDisabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s ease',
        }}
        aria-label={joinPending ? 'Joining team...' : 'Join quiz with team name and avatar'}
        aria-disabled={joinDisabled}
        onMouseEnter={(e) => {
          if (!joinDisabled) {
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 6px 0 rgba(0,0,0,0.25)`;
          }
        }}
        onMouseLeave={(e) => {
          if (!joinDisabled) {
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 4px 0 rgba(0,0,0,0.25)`;
          }
        }}
        onClick={!joinDisabled ? () => handleJoin(false) : undefined}
        disabled={joinDisabled}
      >
        {joinPending ? (language === 'de' ? 'Beitreten...' : 'Joining...') : t('joinButton')}
      </button>
      {!roomCode && (
        <div className="message-state message-error">
          {language === 'de' ? 'Roomcode fehlt.' : 'Room code missing.'}
        </div>
      )}
      {savedIdRef.current && (
        <>
          <button
            style={{
              ...primaryButton,
              marginTop: 8,
              background: 'rgba(30, 41, 59, 0.6)',
              color: '#e2e8f0',
              border: '2px solid rgba(148, 163, 184, 0.3)',
              boxShadow: '0 3px 0 rgba(148, 163, 184, 0.2)',
              minHeight: 44
            }}
            aria-label={`Resume team ${teamName || ''}. Continue with previously saved credentials`}
            onClick={() => handleJoin(true)}
          >
            {language === 'de'
              ? `Team fortsetzen${teamName ? ` (${teamName})` : ''}`
              : `Resume team${teamName ? ` (${teamName})` : ''}`}
          </button>
          <button
            style={{
              ...primaryButton,
              marginTop: 8,
              background: 'rgba(220, 38, 38, 0.15)',
              color: '#fca5a5',
              border: '2px solid rgba(220, 38, 38, 0.3)',
              boxShadow: '0 3px 0 rgba(220, 38, 38, 0.2)',
              minHeight: 38,
              fontSize: 14
            }}
            aria-label="Leave current team and start a new team"
            onClick={handleLeaveTeam}
          >
            {language === 'de' ? 'Neues Team starten' : 'Start new team'}
          </button>
        </>
      )}
        {message && <div className={`message-state message-${message.type}`}>{message.text}</div>}
      </div>
    );
  }

  function renderWaiting(title: string, subtitle?: string) {
    return (
      <div
        key={`waiting-${phase}-${title}`}
        className="waiting-card glass-reflective shimmer-card float-parallax"
        style={{
          ...glassCard,
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          maxWidth: 620,
          minHeight: 280,
          padding: '32px 24px',
          background: 'var(--ui-card-bg)',
          borderColor: 'var(--ui-card-border)',
          boxShadow: 'var(--ui-card-shadow)',
          animation: 'spring-entrance 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) both',
          willChange: 'transform, opacity',
          position: 'relative',
          overflow: 'hidden',
          margin: '0 auto'
        }}
      >
        <h3
          style={{
            ...heading,
            marginBottom: 12,
            marginTop: 0,
            fontSize: 'clamp(22px, 5vw, 30px)',
            color: 'var(--ui-input-text)',
            textTransform: 'none'
          }}
        >
          {title}
        </h3>
        {subtitle && (
          <p
            style={{
              ...mutedText,
              marginBottom: 24,
              fontSize: 'clamp(14px, 3.6vw, 16px)',
              color: '#d0d5e0',
              opacity: 0.9
            }}
          >
            {subtitle}
          </p>
        )}
        {!teamId && <p style={mutedText}>{t('joinTitle')}</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center', width: '100%', marginTop: 18 }}>
          <div style={{ width: '100%', maxWidth: 260, height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 999, overflow: 'hidden', position: 'relative' }}>
            <div style={{
              position: 'absolute',
              top: 0, bottom: 0,
              width: '38%',
              borderRadius: 999,
              background: 'linear-gradient(90deg, transparent, rgba(240,95,178,0.9) 40%, #ffd1e8 60%, transparent)',
              boxShadow: '0 0 10px rgba(240,95,178,0.7)',
              animation: 'comet-sweep 2.2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }} />
          </div>
        </div>
      </div>
    );
  }

  function renderLoadingCard() {
    return (
      <div key="loading-screen" style={{ maxWidth: 620, margin: '0 auto', animation: 'fadeSlideUpStrong 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both' }}>
        <SkeletonCard />
      </div>
    );
  }

  function renderErrorCard() {
    return (
      <div key="error-screen" style={{ ...glassCard, borderColor: 'rgba(248,113,113,0.3)', animation: 'fadeSlideUpStrong 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both' }}>
        <h3 style={{ ...heading, marginBottom: 6 }}>
          {language === 'de' ? 'Verbindung fehlgeschlagen' : 'Connection failed'}
        </h3>
        <p style={mutedText}>{socketError || 'Unknown error'}</p>
        <button
          style={{
            ...primaryButton,
            background: 'rgba(255,255,255,0.02)',
            color: '#e2e8f0',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(30px)',
            minHeight: 44
          }}
          onClick={() => window.location.reload()}
        >
          {language === 'de' ? 'Neu laden' : 'Reload'}
        </button>
      </div>
    );
  }

  function renderByPhase() {
    if (gameState === 'SCOREBOARD_PRE_BLITZ') {
      return (
        <div style={{ ...glassCard, textAlign: 'center', display: 'grid', gap: 10 }}>
          <div style={{ display: 'grid', gap: 6 }}>
            {sortedScoreboard.map((entry, idx) => {
              const avatar = getAvatarById(entry.avatarId);
              return (
              <div
                key={`scoreboard-pre-${entry.id}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto auto 1fr auto',
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.12)'
                }}
              >
                <span style={{ fontWeight: 800 }}>{idx + 1}.</span>
                {avatarsEnabled && avatar && (
                  <AvatarMedia
                    avatar={avatar}
                    style={{ width: 24, height: 24, borderRadius: 8, border: '1px solid rgba(255,255,255,0.16)' }}
                  />
                )}
                <span>{entry.name}</span>
                <span style={{ fontWeight: 800 }}>{entry.score ?? 0}</span>
              </div>
            );
            })}
          </div>
        </div>
      );
    }
    if (gameState.startsWith('RUNDLAUF') || gameState === 'SIEGEREHRUNG') {
      return renderRundlaufStage();
    }
    if (gameState === 'BLITZ' || gameState.startsWith('BLITZ_')) {
      return renderBlitzStage();
    }
    switch (phase) {
      case 'notJoined':
        return renderNotJoined();
      case 'intro':
        return renderWaiting(
          language === 'de'
            ? 'Neue Frage kommt'
            : language === 'both'
            ? 'Neue Frage / New question'
            : 'New question',
          language === 'de'
            ? 'Bereit machen ...'
            : language === 'both'
            ? 'Bereit machen / Get ready ...'
            : 'Get ready ...'
        );
      case 'waitingForQuestion':
        return evaluating
          ? renderWaiting(t('evaluating'))
          : renderWaiting(waitForQuestionHeadline, teamId ? undefined : t('waitingJoin'));
      case 'answering':
        return renderAnswering();
      case 'waitingForResult':
        return evaluating ? renderWaiting(t('evaluating')) : renderWaitingForResult();
      case 'showResult':
        return renderShowResult();
      default:
        return evaluating ? renderWaiting(t('evaluating')) : renderWaiting(waitForQuestionHeadline);
    }
  };
  // Removed: toggleReady function - teams don't need to signal ready anymore

  const remainingSeconds = useMemo(() => 
    timerEndsAt ? Math.max(0, Math.ceil((timerEndsAt - Date.now()) / 1000)) : 0,
    [timerEndsAt, timerTick]
  );
  const progress =
    timerEndsAt && timerDuration > 0
      ? Math.max(0, Math.min(100, (remainingSeconds / timerDuration) * 100))
      : 0;
  const timeUp = timerEndsAt !== null && remainingSeconds <= 0;
  const questionAnsweringActive = gameState === 'Q_ACTIVE' && phase === 'answering';
  // For oneOfEight: canAnswer only when it's this team's turn (ignores answerSubmitted since teams may answer multiple turns)
  const canAnswer = isOneOfEightQuestion
    ? questionAnsweringActive && !timeUp && isOneOfEightActiveTurn
    : questionAnsweringActive && !timeUp && !answerSubmitted;
  const waitForQuestionHeadline = gameState === 'LOBBY' ? t('waitingStart') : t('waitingMsg');
  const isLocked = gameState === 'Q_LOCKED';
    const timerContextActive = gameState === 'Q_ACTIVE' || isBlitzPlaying || isRundlaufActiveTurn;
  const hasTimer = Boolean(timerEndsAt && timerDuration > 0 && timerContextActive);
  const showTimerProgress = hasTimer && !isLocked && gameState === 'Q_ACTIVE';
  const viewState = socketError
    ? 'error'
    : !teamId
    ? 'join'
    : 'active';

  const accentCategory = (question?.category as keyof typeof categoryColors) ?? 'GemischteTuete';
  const accentColor = categoryColors[accentCategory] ?? '#d6a2ff';
  const accentPink = '#ff4f9e';
  const labelLang = language === 'both' ? 'de' : language;
  const accentLabel =
    categoryLabels[accentCategory]?.[labelLang] ?? categoryLabels[accentCategory]?.de ?? accentCategory;
  const layout =
    (question as any)?.layout ?? { imageOffsetX: 0, imageOffsetY: 0, logoOffsetX: 0, logoOffsetY: 0 };

  const phaseLabel =
    phase === 'answering'
      ? (language === 'de' ? 'Antworten' : 'Answering')
      : phase === 'waitingForResult'
      ? (language === 'de' ? 'Auswertung' : 'Evaluation')
      : phase === 'showResult'
      ? (language === 'de' ? 'Ergebnis' : 'Result')
      : (language === 'de' ? 'Warten' : 'Waiting');

  // If we have a stored teamId but haven't received the server state yet, show loading
  // to prevent a flash of stale/default state (purple color, wrong phase, etc.)
  const stillInitializing = viewState === 'active' && !hasStateUpdate;

  const mainContent =
    viewState === 'error'
      ? renderErrorCard()
      : stillInitializing
      ? renderLoadingCard()
      : viewState === 'join'
      ? renderNotJoined()
      : renderByPhase();

  const isWaitingPhase =
    viewState === 'active' &&
    !stillInitializing &&
    (phase === 'intro' || phase === 'waitingForQuestion' || phase === 'waitingForResult');

  return (
    <div
      id="team-root"
      ref={pageRootRef}
      style={{
        ...pageStyleTeam,
        position: 'relative',
        ...(windowWidth >= 768 && {
          maxWidth: 430,
          margin: '0 auto',
          minHeight: '100vh',
          height: 'auto',
        }),
      }}
      data-timer={timerTick}
      data-team-ui="1"
      data-team-marker={teamMarker}
    >
      <ParticleCanvas count={60} opacity={0.6} zIndex={0} />
      {/* Liquid blob backgrounds */}
      <div className="liquid-bg" style={{ top: 100, left: -150, opacity: 0.6 }} />
      <div className="liquid-bg" style={{ bottom: 100, right: -150, animationDelay: '7s', opacity: 0.6 }} />
      <span style={{ display: 'none' }}>{teamMarker}</span>
      <span style={{ display: 'none' }}>
        TEAMVIEW LIVE | phase={phase} | state={gameState} | room={roomCode} | team={teamId ?? '--'}
      </span>
      <OfflineBar disconnected={connectionStatus === 'disconnected'} language={language} onReconnect={handleReconnect} />
      {showPwaBanner && pwaPrompt && (
        <div
          style={{
            position: 'fixed',
            bottom: 'calc(16px + env(safe-area-inset-bottom))',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '10px 14px',
            borderRadius: 14,
            background: 'rgba(15, 23, 42, 0.92)',
            border: '1px solid rgba(99, 102, 241, 0.4)',
            color: '#e2e8f0',
            fontWeight: 600,
            fontSize: 14,
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
            whiteSpace: 'nowrap',
          }}
        >
          <span>📲 {language === 'en' ? 'Install app' : 'App installieren'}</span>
          <button
            onClick={handlePwaInstall}
            style={{
              padding: '6px 12px',
              borderRadius: 10,
              border: 'none',
              background: 'rgba(99, 102, 241, 0.8)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            {language === 'en' ? 'Install' : 'Installieren'}
          </button>
          <button
            onClick={handlePwaDismiss}
            style={{
              padding: '4px 8px',
              borderRadius: 8,
              border: 'none',
              background: 'transparent',
              color: '#94a3b8',
              fontWeight: 700,
              fontSize: 16,
              cursor: 'pointer',
              lineHeight: 1,
            }}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}
      <div style={contentShell}>
        <header
          className="team-header"
          style={{
            display: teamId && !stillInitializing ? 'flex' : 'none',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            padding: '8px 16px',
            minHeight: 56,
            background: 'linear-gradient(270deg, #f05fb2, #b10a6c, #e0308a, #d62f93, #f05fb2)',
            backgroundSize: '300% 100%',
            animation: 'teamHeaderLiquid 8s ease infinite',
            borderRadius: '0 0 16px 16px',
            boxShadow: '0 4px 0 rgba(177, 10, 108, 0.6)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Team-color accent strip at top is handled by borderTop */}

          {/* Avatar — left side */}
          {avatarsEnabled && teamId && avatarId && (
            <div
              style={{ flexShrink: 0, cursor: 'pointer', lineHeight: 0 }}
              onClick={() => {
                if (hasStateBasedRendering(avatarId)) {
                  if (igelState === 'walking' || igelState === 'idle') {
                    runAvatarSequence([
                      { state: 'gesture', duration: 600 },
                      { state: 'happy', duration: 1200 },
                      { state: 'walking', duration: 0 }
                    ], avatarId);
                  }
                }
              }}
              title={language === 'de' ? 'Klick mich an!' : 'Tap me!'}
            >
              <AvatarMedia
                avatar={getAvatarById(avatarId)}
                mood={avatarMood}
                enableWalking={true}
                igelState={igelState}
                style={{ width: 44, height: 44, objectFit: 'contain' }}
              />
            </div>
          )}

          {/* Team name — center */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            {teamId && (
              <div style={{
                fontFamily: "var(--font-game)",
                fontWeight: 800,
                fontSize: 'clamp(18px, 4vw, 28px)',
                color: '#ffffff',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                textShadow: '0 0 20px rgba(255,209,232,0.6), 0 1px 3px rgba(0,0,0,0.3)',
              }}>
                {teamName || 'Team'}
              </div>
            )}
          </div>

          {/* Status + language — right side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: connectionStatus === 'connected' ? '#4ade80'
                : connectionStatus === 'connecting' ? '#fbbf24'
                : '#f87171',
              border: '2px solid rgba(255,255,255,0.5)',
              flexShrink: 0,
              animation: connectionStatus === 'connected' ? 'connectedPulse 2.5s ease-in-out infinite' : undefined,
            }} />
            <button
              onClick={() => updateLanguage(language === 'de' ? 'en' : 'de')}
              title={language === 'de' ? 'Switch to English' : 'Auf Deutsch wechseln'}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                fontSize: 22,
                lineHeight: 1,
                display: 'flex',
                alignItems: 'center'
              }}
            >
              {language === 'de' ? '🇩🇪' : '🇬🇧'}
            </button>
          </div>
        </header>

        {/* Timer progress bar removed - now integrated in Submit button with enhanced styling */}

        {/* Toast notifications for Blitz/Rundlauf errors */}
        {toast && (
          <div
            style={{
              position: 'fixed',
              top: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 1000,
              padding: '12px 16px',
              borderRadius: 12,
              border: '2px solid #fca5a5',
              background: '#fee2e2',
              color: '#dc2626',
              fontWeight: 700,
              fontSize: 14,
              maxWidth: '90%',
              textAlign: 'center',
              boxShadow: '0 4px 0 #fca5a5',
              animation: 'slideDown 0.3s ease-out'
            }}
          >
            {toast}
          </div>
        )}

        <div
          key={phase}
          className="phase-enter"
          style={{
            minHeight: 'calc(100dvh - 140px)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            paddingTop: 8,
            paddingBottom: 8
          }}
        >
          <div style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}>
            {mainContent}
          </div>
        </div>

        {/* Removed: Ready button - teams don't need to confirm ready status */}
        {teamId && phase === 'waitingForQuestion' && allowReadyToggle && gameState === 'LOBBY' && connectionStatus !== 'connected' && (
          <div className="message-state message-error">
            {language === 'both'
              ? `Keine Verbindung (${SOCKET_URL}). Bitte neu verbinden. / Not connected (${SOCKET_URL}). Please reconnect.`
              : language === 'de'
              ? `Keine Verbindung (${SOCKET_URL}). Bitte neu verbinden.`
              : `Not connected (${SOCKET_URL}). Please reconnect.`}
          </div>
        )}
      </div>
      <div style={footerLogo}>
        <img src="/logo.png?v=3" alt="Cozy Wolf" style={{ width: 120, opacity: 0.85, objectFit: 'contain' }} />
      </div>
    </div>
  );
}

export default TeamView;

























          
























