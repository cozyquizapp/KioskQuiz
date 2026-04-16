// QQ City Lab — zwei Ideen, wie die echten QQ-Avatare (8 Emoji-Tiere)
// als Spielstein im 3D-Grid aussehen könnten.
//
// ① Standups   — Emoji auf extrudierter Plane, Pappfiguren-Look
// ② Sockel     — Team-farbiger 3D-Sockel + Emoji als Kopf/Portrait
//
// Alle Tiere kommen aus shared/quarterQuizTypes.ts (QQ_AVATARS).
// Demo-Grid 5×5 mit 8 Teams gemischt + Joker.

import { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { QQ_AVATARS } from '@shared/quarterQuizTypes';

// Map QQ-Avatar-Id → Anzeige-Info (Name, Farbe, Emoji) direkt aus shared.
type AvatarKey = typeof QQ_AVATARS[number]['id'];

const AVATARS: Record<AvatarKey, { name: string; color: string; emoji: string }> =
  QQ_AVATARS.reduce((acc, a) => {
    acc[a.id as AvatarKey] = { name: a.label, color: a.color, emoji: a.emoji };
    return acc;
  }, {} as Record<AvatarKey, { name: string; color: string; emoji: string }>);

type Cell = { owner: AvatarKey | null; joker?: boolean };

const DEMO_GRID: Cell[][] = [
  [{ owner: 'fox' },   { owner: 'fox' },             { owner: null },    { owner: 'frog' },    { owner: 'frog' }],
  [{ owner: 'fox', joker: true }, { owner: 'panda' }, { owner: 'cat' },  { owner: 'frog' },    { owner: null }],
  [{ owner: null },    { owner: 'cat' },             { owner: 'unicorn' }, { owner: 'rabbit' }, { owner: 'rabbit' }],
  [{ owner: 'cow' },   { owner: 'cat' },             { owner: null },    { owner: 'raccoon', joker: true }, { owner: null }],
  [{ owner: 'cow' },   { owner: null },              { owner: 'unicorn' }, { owner: 'unicorn' }, { owner: 'raccoon' }],
];

const SIZE = 5;
const TILE = 1.6;
const OFFSET = ((SIZE - 1) * TILE) / 2;

type Variant = 1 | 2;

// ── Avatar-Textur-Cache (Emoji → CanvasTexture) ────────────────────────────
// Emojis werden via 2D-Canvas mit System-Emoji-Fonts gerendert und
// als THREE.Texture auf Billboards/Planes verwendet.
function useAvatarTexture(emoji: string): THREE.Texture {
  return useMemo(() => {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, size, size);
    ctx.font = `${size * 0.78}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, size / 2, size / 2 + size * 0.04);
    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 8;
    tex.needsUpdate = true;
    return tex;
  }, [emoji]);
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function QQCityLabPage() {
  const [variant, setVariant] = useState<Variant>(1);
  const [showAll, setShowAll] = useState(false);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at center, #1e293b 0%, #0f172a 55%, #020617 100%)',
      color: '#e2e8f0',
      fontFamily: "'Nunito', system-ui, sans-serif",
      padding: '28px 20px 60px',
      position: 'relative',
    }}>
      {/* Amber-Spotlight wie auf dem QQ-Beamer */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(circle at 50% 30%, rgba(251,191,36,0.10) 0%, transparent 55%)',
        pointerEvents: 'none',
      }} />
      <div style={{ maxWidth: 1400, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <Header variant={variant} setVariant={setVariant} showAll={showAll} setShowAll={setShowAll} />

        {showAll ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 18, marginTop: 28 }}>
            {VARIANTS.map(v => (
              <Card key={v.id} title={v.title} subtitle={v.sub} accent={v.accent}>
                <SceneHost variant={v.id} />
              </Card>
            ))}
          </div>
        ) : (
          <div style={{ marginTop: 28, display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: 'min(1000px, 100%)' }}>
              <Card
                title={VARIANTS[variant - 1].title}
                subtitle={VARIANTS[variant - 1].sub}
                accent={VARIANTS[variant - 1].accent}
                big
              >
                <SceneHost variant={variant} big />
              </Card>
            </div>
          </div>
        )}

        <Legend />
        <Notes />
      </div>
    </div>
  );
}

const VARIANTS: { id: Variant; title: string; sub: string; accent: string }[] = [
  { id: 1, title: '① Standups',     sub: 'Emoji auf extrudierter Plane (Pappfiguren-Look)', accent: '#F59E0B' },
  { id: 2, title: '② Sockel + Kopf', sub: 'Team-farbiger 3D-Sockel mit Emoji-Portrait',      accent: '#3B82F6' },
];

// ── Scene ──────────────────────────────────────────────────────────────────

function SceneHost({ variant, big }: { variant: Variant; big?: boolean }) {
  const h = big ? 560 : 360;
  return (
    <div style={{ width: '100%', height: h, borderRadius: 12, overflow: 'hidden' }}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [8, 8.5, 10], fov: 35 }}
        gl={{ antialias: true }}
      >
        {/* Slate-Palette wie QQ-Beamer: #1e293b → #0f172a → #020617 */}
        <color attach="background" args={['#0f172a']} />
        <fog attach="fog" args={['#020617', 18, 42]} />

        {/* Warmes Amber-Key (wie der Beamer-Scheinwerfer) */}
        <ambientLight intensity={0.55} color="#cbd5e1" />
        <directionalLight
          position={[6, 10, 4]}
          intensity={1.25}
          color="#fbbf24"
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-left={-8}
          shadow-camera-right={8}
          shadow-camera-top={8}
          shadow-camera-bottom={-8}
        />
        {/* Kühler Rim-Fill von hinten */}
        <pointLight position={[-4, 3, -6]} intensity={0.45} color="#60a5fa" />
        {/* Oberer Amber-Glow (Scheinwerfer-Effekt) */}
        <pointLight position={[0, 8, 0]} intensity={0.35} color="#f59e0b" distance={14} decay={2} />

        <Ground />
        <GridLines />

        {DEMO_GRID.flatMap((row, r) => row.map((cell, c) => {
          const x = (c * TILE) - OFFSET;
          const z = (r * TILE) - OFFSET;
          const key = `${r}-${c}`;
          const owner = cell.owner;
          const joker = !!cell.joker;

          if (!owner) return <EmptyPlot key={key} x={x} z={z} />;

          const avatar = AVATARS[owner];

          if (variant === 1) return <StandupFigure key={key} x={x} z={z} avatar={avatar} joker={joker} seed={r * 5 + c} />;
          if (variant === 2) return <PedestalFigure key={key} x={x} z={z} avatar={avatar} joker={joker} seed={r * 5 + c} />;
          return null;
        }))}

        <OrbitControls
          enablePan={false}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2.4}
          minDistance={7}
          maxDistance={22}
          autoRotate
          autoRotateSpeed={0.5}
        />
      </Canvas>
    </div>
  );
}

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
      <planeGeometry args={[SIZE * TILE + 2, SIZE * TILE + 2]} />
      <meshStandardMaterial color="#0b1221" roughness={0.95} />
    </mesh>
  );
}

function GridLines() {
  const lines = [];
  for (let i = 0; i <= SIZE; i++) {
    const p = (i * TILE) - OFFSET - TILE / 2;
    lines.push(
      <mesh key={`h-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, p]}>
        <planeGeometry args={[SIZE * TILE + 0.4, 0.025]} />
        <meshBasicMaterial color="#fbbf24" transparent opacity={0.18} toneMapped={false} />
      </mesh>,
      <mesh key={`v-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[p, 0.015, 0]}>
        <planeGeometry args={[0.025, SIZE * TILE + 0.4]} />
        <meshBasicMaterial color="#fbbf24" transparent opacity={0.18} toneMapped={false} />
      </mesh>
    );
  }
  return <>{lines}</>;
}

function EmptyPlot({ x, z }: { x: number; z: number }) {
  return (
    <mesh position={[x, 0.03, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[1.2, 1.2]} />
      <meshStandardMaterial color="#1e293b" roughness={0.95} />
    </mesh>
  );
}

function TeamBase({ x, z, color, joker }: { x: number; z: number; color: string; joker: boolean }) {
  return (
    <group>
      {/* Basis-Tile in Team-Farbe */}
      <mesh position={[x, 0.04, z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[1.25, 1.25]} />
        <meshStandardMaterial color={color} roughness={0.7} transparent opacity={0.45} />
      </mesh>
      {/* Team-Glow-Ring (wie Beamer-Avatar-Disc-Glow) */}
      <mesh position={[x, 0.045, z]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.52, 0.6, 40]} />
        <meshBasicMaterial color={color} transparent opacity={0.55} toneMapped={false} />
      </mesh>
      {/* Joker: zweiter goldener Ring außen */}
      {joker && (
        <mesh position={[x, 0.046, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.62, 0.68, 40]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.9} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

// ── ① Standups — SVG auf Plane mit Tiefe ──────────────────────────────────
// Dünne Box (Tiefe 0.06) mit dem Tier-Bild auf beiden Seiten (gespiegelt).
// Dreht sich sanft, damit die Rotation das "Flache" aufhebt.
function StandupFigure({ x, z, avatar, joker, seed }: {
  x: number; z: number; avatar: typeof AVATARS[AvatarKey]; joker: boolean; seed: number;
}) {
  const ref = useRef<THREE.Group>(null);
  const tex = useAvatarTexture(avatar.emoji);
  const bob = seed * 0.7;

  useFrame((state) => {
    if (ref.current) {
      ref.current.position.y = 0.7 + Math.sin(state.clock.elapsedTime * 1.5 + bob) * 0.03;
      ref.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.6 + bob) * 0.2;
    }
  });

  const W = 0.9;
  const H = 1.1;
  const D = 0.08;

  return (
    <group>
      <TeamBase x={x} z={z} color={avatar.color} joker={joker} />

      {/* Fuß-Sockel in Team-Farbe */}
      <mesh position={[x, 0.09, z]} castShadow>
        <cylinderGeometry args={[0.32, 0.36, 0.18, 20]} />
        <meshStandardMaterial color={avatar.color} roughness={0.55} />
      </mesh>

      <group ref={ref} position={[x, 0.7, z]}>
        {/* Körper der Pappfigur: dünner Block */}
        <mesh castShadow>
          <boxGeometry args={[W, H, D]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.6} />
        </mesh>

        {/* Emoji vorne */}
        <mesh position={[0, 0, D / 2 + 0.001]}>
          <planeGeometry args={[W * 0.92, H * 0.92]} />
          <meshBasicMaterial map={tex} transparent alphaTest={0.04} toneMapped={false} />
        </mesh>
        {/* Emoji hinten (gespiegelt via rotation) */}
        <mesh position={[0, 0, -D / 2 - 0.001]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[W * 0.92, H * 0.92]} />
          <meshBasicMaterial map={tex} transparent alphaTest={0.04} toneMapped={false} />
        </mesh>

        {/* Rand in Team-Farbe (Top + Seiten als schmale Boxen) */}
        <mesh position={[0, H / 2 + 0.01, 0]}>
          <boxGeometry args={[W + 0.02, 0.03, D + 0.02]} />
          <meshStandardMaterial color={avatar.color} roughness={0.5} />
        </mesh>

        {/* Krone bei Joker */}
        {joker && (
          <mesh position={[0, H / 2 + 0.18, 0]} castShadow rotation={[0, Math.PI / 8, 0]}>
            <coneGeometry args={[0.17, 0.24, 5]} />
            <meshStandardMaterial color="#fde68a" emissive="#fbbf24" emissiveIntensity={0.9} metalness={0.7} roughness={0.3} />
          </mesh>
        )}
      </group>
    </group>
  );
}

// ── ② Sockel + Kopf — 3D-Sockel mit Tier-Portrait-Billboard ────────────────
// Zylinder-Sockel in Team-Farbe (wie Schachfigur), darauf rundes Medaillon
// mit dem Avatar als Billboard (dreht sich immer zur Kamera).
function PedestalFigure({ x, z, avatar, joker, seed }: {
  x: number; z: number; avatar: typeof AVATARS[AvatarKey]; joker: boolean; seed: number;
}) {
  const tex = useAvatarTexture(avatar.emoji);
  const headRef = useRef<THREE.Group>(null);
  const bob = seed * 0.6;

  useFrame((state) => {
    if (headRef.current) {
      headRef.current.position.y = 1.05 + Math.sin(state.clock.elapsedTime * 1.3 + bob) * 0.03;
    }
  });

  return (
    <group>
      <TeamBase x={x} z={z} color={avatar.color} joker={joker} />

      {/* Sockel (dreistufig) */}
      <mesh position={[x, 0.08, z]} castShadow>
        <cylinderGeometry args={[0.32, 0.36, 0.16, 20]} />
        <meshStandardMaterial color={avatar.color} roughness={0.5} metalness={0.15} />
      </mesh>
      <mesh position={[x, 0.2, z]} castShadow>
        <cylinderGeometry args={[0.24, 0.3, 0.08, 20]} />
        <meshStandardMaterial color={avatar.color} roughness={0.5} metalness={0.15} />
      </mesh>
      {/* Säule */}
      <mesh position={[x, 0.55, z]} castShadow>
        <cylinderGeometry args={[0.14, 0.18, 0.6, 16]} />
        <meshStandardMaterial color={avatar.color} roughness={0.5} metalness={0.15} />
      </mesh>
      {/* Kapitell */}
      <mesh position={[x, 0.88, z]} castShadow>
        <cylinderGeometry args={[0.22, 0.18, 0.08, 20]} />
        <meshStandardMaterial color={avatar.color} roughness={0.5} metalness={0.15} />
      </mesh>

      {/* Kopf-Medaillon (Billboard) */}
      <group ref={headRef} position={[x, 1.05, z]}>
        <Billboard>
          {/* Weißer Hintergrund-Kreis */}
          <mesh>
            <circleGeometry args={[0.36, 40]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          {/* Farbiger Ring */}
          <mesh position={[0, 0, -0.001]}>
            <ringGeometry args={[0.36, 0.42, 40]} />
            <meshBasicMaterial color={avatar.color} toneMapped={false} />
          </mesh>
          {/* Avatar-Emoji */}
          <mesh position={[0, 0, 0.005]}>
            <planeGeometry args={[0.6, 0.6]} />
            <meshBasicMaterial map={tex} transparent alphaTest={0.04} toneMapped={false} />
          </mesh>
        </Billboard>
      </group>

      {/* Krone bei Joker */}
      {joker && (
        <mesh position={[x, 1.55, z]} castShadow rotation={[0, Math.PI / 8, 0]}>
          <coneGeometry args={[0.15, 0.22, 5]} />
          <meshStandardMaterial color="#fde68a" emissive="#fbbf24" emissiveIntensity={0.9} metalness={0.7} roughness={0.3} />
        </mesh>
      )}
    </group>
  );
}

// ── UI ─────────────────────────────────────────────────────────────────────

function Header({ variant, setVariant, showAll, setShowAll }: {
  variant: Variant; setVariant: (v: Variant) => void;
  showAll: boolean; setShowAll: (v: boolean) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{
        fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase',
        color: '#F59E0B', fontWeight: 900,
      }}>
        🏙️ City Lab · Echte Avatare im 3D-Grid
      </div>
      <h1 style={{
        margin: 0,
        fontSize: 'clamp(28px, 4vw, 44px)',
        fontWeight: 900,
        letterSpacing: '-0.01em',
        textShadow: '0 4px 20px rgba(251,191,36,0.25)',
      }}>
        Deine 8 Tier-Avatare als Spielstein
      </h1>
      <div style={{ color: '#94a3b8', fontSize: 15, maxWidth: 820, lineHeight: 1.5 }}>
        Die echten 8 QQ-Avatare (Fox · Frog · Panda · Rabbit · Unicorn · Raccoon · Cow · Cat) —
        auf zwei Arten in 3D gebracht. Demo-Grid 5×5 mit gemischten Teams + Joker.
      </div>

      <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <TabBtn active={showAll} onClick={() => setShowAll(true)}>Beide nebeneinander</TabBtn>
        {VARIANTS.map(v => (
          <TabBtn
            key={v.id}
            active={!showAll && variant === v.id}
            onClick={() => { setShowAll(false); setVariant(v.id); }}
          >
            {v.title}
          </TabBtn>
        ))}
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      padding: '10px 16px', borderRadius: 10,
      background: active ? 'rgba(245,158,11,0.18)' : 'rgba(255,255,255,0.04)',
      border: `1.5px solid ${active ? 'rgba(245,158,11,0.55)' : 'rgba(255,255,255,0.08)'}`,
      color: active ? '#FDE68A' : '#cbd5e1',
      fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
    }}>{children}</button>
  );
}

function Card({ title, subtitle, accent, children, big }: {
  title: string; subtitle: string; accent: string;
  children: React.ReactNode; big?: boolean;
}) {
  return (
    <div style={{
      borderRadius: 18, padding: 16,
      background: 'linear-gradient(135deg, rgba(251,191,36,0.04), rgba(30,41,59,0.6))',
      border: `1.5px solid ${accent}33`,
      boxShadow: `0 8px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)`,
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', gap: 8,
        paddingBottom: 8, borderBottom: `1px solid ${accent}33`,
      }}>
        <div style={{ fontSize: 15, fontWeight: 900, color: accent }}>{title}</div>
        <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>{subtitle}</div>
      </div>
      <div style={{
        height: big ? 600 : 380,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(180deg, rgba(15,23,42,0.25), rgba(5,7,18,0.6))',
        borderRadius: 12, overflow: 'hidden',
      }}>
        {children}
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div style={{ marginTop: 22, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        Avatare im Demo-Grid:
      </div>
      {(Object.keys(AVATARS) as AvatarKey[]).map(k => (
        <div key={k} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 10px', borderRadius: 999,
          background: `${AVATARS[k].color}22`,
          border: `1px solid ${AVATARS[k].color}66`,
        }}>
          <span style={{ fontSize: 14 }}>{AVATARS[k].emoji}</span>
          <span style={{ color: AVATARS[k].color, fontWeight: 800, fontSize: 12 }}>{AVATARS[k].name}</span>
        </div>
      ))}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '5px 10px', borderRadius: 999,
        background: 'rgba(251,191,36,0.12)',
        border: '1px solid rgba(251,191,36,0.5)',
      }}>
        <span style={{ fontSize: 14 }}>⭐</span>
        <span style={{ color: '#fde68a', fontWeight: 800, fontSize: 12 }}>Joker</span>
      </div>
    </div>
  );
}

function Notes() {
  return (
    <div style={{
      marginTop: 22, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14,
    }}>
      <Note title="① Standups" color="#F59E0B">
        <b>Pro:</b> nutzt die App-Avatare 1:1 — stilistisch perfekt konsistent, keine
        Extra-Assets, neue Tiere automatisch dabei. Leichtes Drehen hebt das "Flache" auf.
        Pappfiguren-Look passt zum Quiz/Brettspiel-Charme.
        <br /><b>Contra:</b> Rückseite = gespiegeltes Bild (funktioniert, aber bei
        strikt seitlicher Kamera kurz sichtbar). Avatar selbst bleibt 2D.
      </Note>
      <Note title="② Sockel + Kopf" color="#3B82F6">
        <b>Pro:</b> starker "Spielfigur"-Charakter — 3D-Sockel in Team-Farbe mit
        Tier-Portrait oben drauf. Avatar immer lesbar (Billboard). Elegant wie
        Monopoly-Figuren.
        <br /><b>Contra:</b> fragmentiert — Tier sitzt nicht "im" 3D-Raum, sondern
        schwebt als Medaillon. Weniger "lebendig" als Standups.
      </Note>
    </div>
  );
}

function Note({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div style={{
      padding: 14, borderRadius: 12,
      background: 'rgba(255,255,255,0.03)',
      border: `1px solid ${color}44`,
    }}>
      <div style={{ fontSize: 13, fontWeight: 900, color, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.55 }}>{children}</div>
    </div>
  );
}
