// QQ City Lab — Brainstorming-Seite für die Grid-Darstellung.
// Out-of-the-Box Ideen (weg von Häusern):
//   ① 3D-Avatar-Figuren (Team-Tiere direkt im Feld)
//   ② 3D-Flaggen / Standarten (Territorium-Vibe, sehr lesbar)
//   ③ Biotop (Bäume/Pilze/Felsen — cozy, passt zu Wolf-Marke)
//   ④ Leuchttürme (abstrakte Lichtquellen, Nachtstimmung)
//   ⑤ Schachfiguren (strategischer Eroberungs-Look)
//
// Alle Varianten sind Three.js / R3F. Demo-Grid 5×5, 4 Teams + Joker.

import { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Billboard } from '@react-three/drei';
import * as THREE from 'three';

// Emoji → Canvas-Textur. Three-Text-Glyphen rendern Emojis nicht,
// also malen wir sie per 2D-Canvas und benutzen die Textur als Sprite.
function useEmojiTexture(emoji: string, size = 256): THREE.Texture {
  return useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, size, size);
    ctx.font = `${size * 0.75}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, size / 2, size / 2 + size * 0.04);
    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 4;
    tex.needsUpdate = true;
    return tex;
  }, [emoji, size]);
}

type TeamId = 'A' | 'B' | 'C' | 'D' | null;

const TEAMS: Record<Exclude<TeamId, null>, { color: string; emoji: string; name: string }> = {
  A: { color: '#3B82F6', emoji: '🐟', name: 'Blaubeeren' },
  B: { color: '#22C55E', emoji: '🐸', name: 'Moos' },
  C: { color: '#EF4444', emoji: '🦊', name: 'Paprika' },
  D: { color: '#F97316', emoji: '🐯', name: 'Kürbis' },
};

const DEMO_GRID: Array<Array<{ owner: TeamId; joker?: boolean }>> = [
  [{ owner: 'A' }, { owner: 'A' }, { owner: null }, { owner: 'B' }, { owner: 'B' }],
  [{ owner: 'A', joker: true }, { owner: 'A', joker: true }, { owner: 'C' }, { owner: 'B' }, { owner: null }],
  [{ owner: null }, { owner: 'C' }, { owner: 'C' }, { owner: 'D' }, { owner: 'D' }],
  [{ owner: 'D' }, { owner: 'C' }, { owner: null }, { owner: 'D' }, { owner: null }],
  [{ owner: 'D' }, { owner: null }, { owner: 'B' }, { owner: 'B' }, { owner: 'A' }],
];

const SIZE = 5;
const TILE = 1.6;
const OFFSET = ((SIZE - 1) * TILE) / 2;

type Variant = 1 | 2 | 3 | 4 | 5;

export default function QQCityLabPage() {
  const [variant, setVariant] = useState<Variant>(1);
  const [showAll, setShowAll] = useState(false);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 50% 0%, #1e293b 0%, #0b0d14 55%, #050712 100%)',
      color: '#e2e8f0',
      fontFamily: "'Nunito', system-ui, sans-serif",
      padding: '28px 20px 60px',
    }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <Header variant={variant} setVariant={setVariant} showAll={showAll} setShowAll={setShowAll} />

        {showAll ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 18,
            marginTop: 28,
          }}>
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
  { id: 1, title: '① Avatar-Figuren', sub: 'Team-Tiere als Figuren im Feld', accent: '#F59E0B' },
  { id: 2, title: '② Flaggen', sub: 'Standarten, Territorium-Vibe', accent: '#3B82F6' },
  { id: 3, title: '③ Biotop', sub: 'Bäume, Pilze, Felsen — cozy', accent: '#22C55E' },
  { id: 4, title: '④ Leuchttürme', sub: 'Lichtquellen bei Nacht', accent: '#A855F7' },
  { id: 5, title: '⑤ Schachfiguren', sub: 'Strategie-Eroberung', accent: '#EF4444' },
];

// ── Shared Scene Host ──────────────────────────────────────────────────────

function SceneHost({ variant, big }: { variant: Variant; big?: boolean }) {
  const h = big ? 560 : 340;
  const isNight = variant === 4;

  return (
    <div style={{ width: '100%', height: h, borderRadius: 12, overflow: 'hidden' }}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [8, 8.5, 10], fov: 35 }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={isNight ? ['#0a0a24'] : ['#1a1633']} />
        <fog attach="fog" args={[isNight ? '#0a0a24' : '#1a1633', 18, 40]} />

        {variant !== 4 && (
          <>
            <ambientLight intensity={0.5} color="#a59cd6" />
            <directionalLight
              position={[6, 10, 4]}
              intensity={1.2}
              color="#ffd79a"
              castShadow
              shadow-mapSize-width={1024}
              shadow-mapSize-height={1024}
              shadow-camera-left={-8}
              shadow-camera-right={8}
              shadow-camera-top={8}
              shadow-camera-bottom={-8}
            />
            <pointLight position={[-4, 3, -4]} intensity={0.35} color="#6b5fb8" />
          </>
        )}
        {variant === 4 && (
          <>
            <ambientLight intensity={0.18} color="#4a4680" />
            <directionalLight position={[4, 8, 2]} intensity={0.25} color="#6670b8" />
          </>
        )}

        <Ground />
        <GridLines />

        {/* Felder pro Variante */}
        {DEMO_GRID.flatMap((row, r) => row.map((cell, c) => {
          const x = (c * TILE) - OFFSET;
          const z = (r * TILE) - OFFSET;
          const key = `${r}-${c}`;
          const seed = (r * 17 + c * 31) % 7;
          const owner = cell.owner;
          const joker = !!cell.joker;

          if (!owner) return <EmptyPlot key={key} x={x} z={z} />;

          const color = TEAMS[owner].color;
          const emoji = TEAMS[owner].emoji;

          switch (variant) {
            case 1: return <AvatarFigure key={key} x={x} z={z} color={color} emoji={emoji} joker={joker} seed={seed} />;
            case 2: return <FlagPole key={key} x={x} z={z} color={color} emoji={emoji} joker={joker} />;
            case 3: return <BiotopeItem key={key} x={x} z={z} color={color} joker={joker} seed={seed} />;
            case 4: return <Lighthouse key={key} x={x} z={z} color={color} joker={joker} seed={seed} />;
            case 5: return <ChessPiece key={key} x={x} z={z} color={color} joker={joker} seed={seed} />;
            default: return null;
          }
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

// ── Shared Scene Pieces ────────────────────────────────────────────────────

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
      <planeGeometry args={[SIZE * TILE + 2, SIZE * TILE + 2]} />
      <meshStandardMaterial color="#14172a" roughness={0.95} />
    </mesh>
  );
}

function GridLines() {
  const lines = [];
  for (let i = 0; i <= SIZE; i++) {
    const p = (i * TILE) - OFFSET - TILE / 2;
    lines.push(
      <mesh key={`h-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, p]}>
        <planeGeometry args={[SIZE * TILE + 0.4, 0.03]} />
        <meshBasicMaterial color="#2a2f47" transparent opacity={0.5} />
      </mesh>,
      <mesh key={`v-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[p, 0.01, 0]}>
        <planeGeometry args={[0.03, SIZE * TILE + 0.4]} />
        <meshBasicMaterial color="#2a2f47" transparent opacity={0.5} />
      </mesh>
    );
  }
  return <>{lines}</>;
}

function EmptyPlot({ x, z }: { x: number; z: number }) {
  return (
    <mesh position={[x, 0.03, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[1.2, 1.2]} />
      <meshStandardMaterial color="#242a44" roughness={0.95} />
    </mesh>
  );
}

function TeamBase({ x, z, color, joker }: { x: number; z: number; color: string; joker: boolean }) {
  return (
    <group>
      {/* Teppich/Platte in Team-Farbe */}
      <mesh position={[x, 0.04, z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[1.25, 1.25]} />
        <meshStandardMaterial color={color} roughness={0.7} transparent opacity={0.55} />
      </mesh>
      {joker && (
        <mesh position={[x, 0.045, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.55, 0.62, 32]} />
          <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.8} />
        </mesh>
      )}
    </group>
  );
}

// ── ① Avatar-Figuren ───────────────────────────────────────────────────────
// Team-Tier als stilisierte Figur: Kugel-Körper in Team-Farbe + Emoji-Gesicht
// als Billboard (immer zur Kamera). Bei Joker: goldene Krone.

function AvatarFigure({ x, z, color, emoji, joker, seed }: {
  x: number; z: number; color: string; emoji: string; joker: boolean; seed: number;
}) {
  const ref = useRef<THREE.Group>(null);
  const bob = seed * 0.7;
  const emojiTex = useEmojiTexture(emoji);
  useFrame((state) => {
    if (ref.current) {
      ref.current.position.y = 0.45 + Math.sin(state.clock.elapsedTime * 1.5 + bob) * 0.04;
    }
  });

  return (
    <group>
      <TeamBase x={x} z={z} color={color} joker={joker} />
      <group ref={ref} position={[x, 0.45, z]}>
        {/* Füße */}
        <mesh position={[-0.12, -0.3, 0]} castShadow>
          <sphereGeometry args={[0.09, 12, 8]} />
          <meshStandardMaterial color={color} roughness={0.6} />
        </mesh>
        <mesh position={[0.12, -0.3, 0]} castShadow>
          <sphereGeometry args={[0.09, 12, 8]} />
          <meshStandardMaterial color={color} roughness={0.6} />
        </mesh>
        {/* Körper — abgerundeter Block */}
        <mesh position={[0, -0.05, 0]} castShadow>
          <sphereGeometry args={[0.28, 16, 12]} />
          <meshStandardMaterial color={color} roughness={0.55} />
        </mesh>
        {/* Kopf — weißer Kreis als Hintergrund + Emoji-Textur als Billboard */}
        <Billboard position={[0, 0.35, 0]}>
          <mesh>
            <circleGeometry args={[0.28, 32]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={[0, 0, 0.01]}>
            <planeGeometry args={[0.5, 0.5]} />
            <meshBasicMaterial map={emojiTex} transparent alphaTest={0.05} toneMapped={false} />
          </mesh>
        </Billboard>
        {/* Krone bei Joker */}
        {joker && (
          <mesh position={[0, 0.65, 0]} castShadow rotation={[0, Math.PI / 8, 0]}>
            <coneGeometry args={[0.13, 0.18, 5]} />
            <meshStandardMaterial color="#fde68a" emissive="#fbbf24" emissiveIntensity={0.8} metalness={0.7} roughness={0.3} />
          </mesh>
        )}
      </group>
    </group>
  );
}

// ── ② Flaggen ──────────────────────────────────────────────────────────────
// Fahnenmast mit wehender Fahne in Team-Farbe. Joker = goldener Mast.

function FlagPole({ x, z, color, emoji, joker }: {
  x: number; z: number; color: string; emoji: string; joker: boolean;
}) {
  const flagRef = useRef<THREE.Mesh>(null);
  const emojiTex = useEmojiTexture(emoji);
  useFrame((state) => {
    if (flagRef.current) {
      const t = state.clock.elapsedTime;
      flagRef.current.rotation.y = Math.sin(t * 2 + x + z) * 0.25;
    }
  });

  const poleColor = joker ? '#fde68a' : '#8a8fa8';

  return (
    <group>
      <TeamBase x={x} z={z} color={color} joker={joker} />
      {/* Fundament-Stein */}
      <mesh position={[x, 0.12, z]} castShadow>
        <boxGeometry args={[0.4, 0.18, 0.4]} />
        <meshStandardMaterial color="#6b7280" roughness={0.85} />
      </mesh>
      {/* Mast */}
      <mesh position={[x, 0.85, z]} castShadow>
        <cylinderGeometry args={[0.035, 0.04, 1.4, 12]} />
        <meshStandardMaterial color={poleColor} metalness={joker ? 0.7 : 0.2} roughness={0.5} />
      </mesh>
      {/* Mastknauf */}
      <mesh position={[x, 1.58, z]} castShadow>
        <sphereGeometry args={[0.065, 12, 10]} />
        <meshStandardMaterial color={joker ? '#fde68a' : '#94a3b8'} metalness={0.7} roughness={0.3} emissive={joker ? '#fbbf24' : '#000'} emissiveIntensity={joker ? 0.5 : 0} />
      </mesh>
      {/* Fahne (dreieckig, wehend) */}
      <mesh ref={flagRef} position={[x + 0.01, 1.2, z]} castShadow>
        <planeGeometry args={[0.65, 0.4]} />
        <meshStandardMaterial color={color} roughness={0.6} side={THREE.DoubleSide} />
      </mesh>
      {/* Emoji auf der Fahne */}
      <Billboard position={[x + 0.32, 1.2, z]}>
        <mesh>
          <planeGeometry args={[0.3, 0.3]} />
          <meshBasicMaterial map={emojiTex} transparent alphaTest={0.05} toneMapped={false} />
        </mesh>
      </Billboard>
    </group>
  );
}

// ── ③ Biotop ───────────────────────────────────────────────────────────────
// Baum oder Pilz oder Fels pro Feld — Art variiert per seed.
// Team-Farbe via Krone/Kappe. Joker = leuchtender Zauberbaum.

function BiotopeItem({ x, z, color, joker, seed }: {
  x: number; z: number; color: string; joker: boolean; seed: number;
}) {
  const type: 'tree' | 'mushroom' | 'rock' = joker ? 'tree' : (['tree', 'mushroom', 'rock'] as const)[seed % 3];

  return (
    <group>
      <TeamBase x={x} z={z} color={color} joker={joker} />
      {type === 'tree' && (
        <group position={[x, 0, z]}>
          {/* Stamm */}
          <mesh position={[0, 0.35, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.11, 0.7, 10]} />
            <meshStandardMaterial color="#6b4423" roughness={0.9} />
          </mesh>
          {/* Krone in Team-Farbe */}
          <mesh position={[0, 0.95, 0]} castShadow>
            <coneGeometry args={[0.4, 0.7, 10]} />
            <meshStandardMaterial
              color={color}
              roughness={0.55}
              emissive={joker ? color : '#000'}
              emissiveIntensity={joker ? 0.5 : 0}
            />
          </mesh>
          {joker && (
            <mesh position={[0, 1.4, 0]} castShadow>
              <sphereGeometry args={[0.1, 12, 10]} />
              <meshStandardMaterial color="#fde68a" emissive="#fbbf24" emissiveIntensity={1.5} />
            </mesh>
          )}
        </group>
      )}
      {type === 'mushroom' && (
        <group position={[x, 0, z]}>
          {/* Stiel */}
          <mesh position={[0, 0.25, 0]} castShadow>
            <cylinderGeometry args={[0.12, 0.15, 0.5, 12]} />
            <meshStandardMaterial color="#f5f5dc" roughness={0.8} />
          </mesh>
          {/* Kappe */}
          <mesh position={[0, 0.6, 0]} castShadow>
            <sphereGeometry args={[0.35, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color={color} roughness={0.5} />
          </mesh>
          {/* Tupfen */}
          {[0, 1, 2].map(i => (
            <mesh key={i} position={[Math.sin(i * 2) * 0.2, 0.7, Math.cos(i * 2) * 0.2]}>
              <sphereGeometry args={[0.04, 8, 6]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
          ))}
        </group>
      )}
      {type === 'rock' && (
        <group position={[x, 0, z]}>
          <mesh position={[0, 0.22, 0]} castShadow rotation={[0, seed * 0.8, 0]}>
            <dodecahedronGeometry args={[0.38, 0]} />
            <meshStandardMaterial color="#7a7f95" roughness={0.9} />
          </mesh>
          {/* Moos in Team-Farbe */}
          <mesh position={[0, 0.5, 0.12]} castShadow>
            <sphereGeometry args={[0.14, 12, 8]} />
            <meshStandardMaterial color={color} roughness={0.85} />
          </mesh>
        </group>
      )}
    </group>
  );
}

// ── ④ Leuchttürme ──────────────────────────────────────────────────────────
// Abstrakte Lichtsäule pro Feld in Team-Farbe. Height variiert, emissive Top.
// Joker = doppelt so hell + größerer Glanz.

function Lighthouse({ x, z, color, joker, seed }: {
  x: number; z: number; color: string; joker: boolean; seed: number;
}) {
  const height = 0.7 + (seed % 4) * 0.2;
  const glowRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (glowRef.current) {
      const t = state.clock.elapsedTime;
      const mat = glowRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = (joker ? 2.8 : 1.6) + Math.sin(t * 2 + x) * 0.25;
    }
  });

  return (
    <group>
      <TeamBase x={x} z={z} color={color} joker={joker} />
      {/* Turm — zylindrisch, dunkel */}
      <mesh position={[x, height / 2 + 0.08, z]} castShadow>
        <cylinderGeometry args={[0.13, 0.18, height, 16]} />
        <meshStandardMaterial color="#1f2640" roughness={0.7} />
      </mesh>
      {/* Leuchtkopf */}
      <mesh ref={glowRef} position={[x, height + 0.15, z]}>
        <sphereGeometry args={[0.18, 16, 12]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={joker ? 2.8 : 1.6}
          toneMapped={false}
        />
      </mesh>
      <pointLight position={[x, height + 0.15, z]} color={color} intensity={joker ? 1.8 : 1} distance={joker ? 5 : 3.5} decay={2} />
      {/* Lichtstrahl nach oben (transparenter Kegel) */}
      <mesh position={[x, height + 0.9, z]}>
        <coneGeometry args={[0.35, 1.4, 16, 1, true]} />
        <meshBasicMaterial color={color} transparent opacity={joker ? 0.25 : 0.15} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
    </group>
  );
}

// ── ⑤ Schachfiguren ────────────────────────────────────────────────────────
// Turm / Bauer / Springer / Läufer — Typ variiert per seed. Team-Farbe = Körper.
// Joker = Dame (goldene Krone).

function ChessPiece({ x, z, color, joker, seed }: {
  x: number; z: number; color: string; joker: boolean; seed: number;
}) {
  const type: 'pawn' | 'rook' | 'bishop' | 'knight' = joker ? 'rook' : (['pawn', 'rook', 'bishop', 'knight'] as const)[seed % 4];

  return (
    <group>
      <TeamBase x={x} z={z} color={color} joker={joker} />
      {/* Sockel — gemeinsam */}
      <mesh position={[x, 0.08, z]} castShadow>
        <cylinderGeometry args={[0.22, 0.26, 0.1, 16]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.2} />
      </mesh>
      <mesh position={[x, 0.17, z]} castShadow>
        <cylinderGeometry args={[0.16, 0.22, 0.08, 16]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.2} />
      </mesh>

      {type === 'pawn' && (
        <>
          <mesh position={[x, 0.4, z]} castShadow>
            <cylinderGeometry args={[0.09, 0.13, 0.35, 14]} />
            <meshStandardMaterial color={color} roughness={0.5} metalness={0.2} />
          </mesh>
          <mesh position={[x, 0.65, z]} castShadow>
            <sphereGeometry args={[0.15, 16, 12]} />
            <meshStandardMaterial color={color} roughness={0.5} metalness={0.2} />
          </mesh>
        </>
      )}
      {type === 'rook' && (
        <>
          <mesh position={[x, 0.5, z]} castShadow>
            <cylinderGeometry args={[0.17, 0.17, 0.55, 16]} />
            <meshStandardMaterial color={color} roughness={0.5} metalness={0.2} />
          </mesh>
          <mesh position={[x, 0.85, z]} castShadow>
            <cylinderGeometry args={[0.2, 0.2, 0.12, 16]} />
            <meshStandardMaterial color={color} roughness={0.5} metalness={0.2} />
          </mesh>
          {/* Zinnen */}
          {[0, 1, 2, 3].map(i => {
            const a = (i * Math.PI) / 2;
            return (
              <mesh key={i} position={[x + Math.cos(a) * 0.14, 0.95, z + Math.sin(a) * 0.14]} castShadow>
                <boxGeometry args={[0.08, 0.08, 0.08]} />
                <meshStandardMaterial color={color} roughness={0.5} metalness={0.2} />
              </mesh>
            );
          })}
        </>
      )}
      {type === 'bishop' && (
        <>
          <mesh position={[x, 0.55, z]} castShadow>
            <coneGeometry args={[0.16, 0.7, 16]} />
            <meshStandardMaterial color={color} roughness={0.5} metalness={0.2} />
          </mesh>
          <mesh position={[x, 1.0, z]} castShadow>
            <sphereGeometry args={[0.09, 12, 10]} />
            <meshStandardMaterial color={color} roughness={0.5} metalness={0.2} />
          </mesh>
        </>
      )}
      {type === 'knight' && (
        <>
          <mesh position={[x, 0.5, z]} castShadow rotation={[0, seed, 0]}>
            <cylinderGeometry args={[0.13, 0.17, 0.6, 12]} />
            <meshStandardMaterial color={color} roughness={0.5} metalness={0.2} />
          </mesh>
          {/* Pferdekopf angedeutet */}
          <mesh position={[x, 0.9, z + 0.1]} castShadow rotation={[Math.PI / 4, 0, 0]}>
            <boxGeometry args={[0.22, 0.28, 0.14]} />
            <meshStandardMaterial color={color} roughness={0.5} metalness={0.2} />
          </mesh>
        </>
      )}
      {/* Krone bei Joker (nach Sockel gerendert, oben drauf) */}
      {joker && (
        <mesh position={[x, 1.15, z]} castShadow>
          <coneGeometry args={[0.12, 0.18, 5]} />
          <meshStandardMaterial color="#fde68a" emissive="#fbbf24" emissiveIntensity={0.9} metalness={0.7} roughness={0.3} />
        </mesh>
      )}
    </group>
  );
}

// ── Header / UI ────────────────────────────────────────────────────────────

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
        🏙️ City Lab · Brainstorming
      </div>
      <h1 style={{ margin: 0, fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900, letterSpacing: '-0.01em' }}>
        Was kommt aufs Feld?
      </h1>
      <div style={{ color: '#94a3b8', fontSize: 15, maxWidth: 780, lineHeight: 1.5 }}>
        Fünf Ideen jenseits von Häusern — alles Three.js, Demo-Daten 5×5 mit 4 Teams + Joker.
        Kein Live-Spiel, nur zum Gucken.
      </div>

      <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <TabBtn active={showAll} onClick={() => setShowAll(true)}>Alle 5 nebeneinander</TabBtn>
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
      background: 'rgba(255,255,255,0.03)',
      border: '1.5px solid rgba(255,255,255,0.08)',
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
        height: big ? 600 : 360,
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
    <div style={{ marginTop: 22, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        Teams im Demo-Grid:
      </div>
      {(['A', 'B', 'C', 'D'] as const).map(t => (
        <div key={t} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 12px', borderRadius: 999,
          background: `${TEAMS[t].color}22`,
          border: `1px solid ${TEAMS[t].color}66`,
        }}>
          <span style={{ fontSize: 16 }}>{TEAMS[t].emoji}</span>
          <span style={{ color: TEAMS[t].color, fontWeight: 800, fontSize: 13 }}>{TEAMS[t].name}</span>
        </div>
      ))}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 12px', borderRadius: 999,
        background: 'rgba(251,191,36,0.12)',
        border: '1px solid rgba(251,191,36,0.5)',
      }}>
        <span style={{ fontSize: 16 }}>⭐</span>
        <span style={{ color: '#fde68a', fontWeight: 800, fontSize: 13 }}>Joker = spezial</span>
      </div>
    </div>
  );
}

function Notes() {
  return (
    <div style={{
      marginTop: 22, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14,
    }}>
      <Note title="① Avatar-Figuren" color="#F59E0B">
        <b>Pro:</b> stärkste Team-Identität. Tiere schon bekannt, Krönung bei Joker
        intuitiv. Figuren "leben" durch Bob-Animation.
        <br /><b>Contra:</b> Emoji-Billboards brauchen Font-Loading; bei 8 Teams
        Gedränge. Figuren könnten "kindlich" wirken — hängt vom Ton ab.
      </Note>
      <Note title="② Flaggen" color="#3B82F6">
        <b>Pro:</b> klassischstes Territorium-Symbol. Team-Farbe dominant, Emoji
        als Wappen. Skaliert gut bei 8 Teams. Wehen ist kleiner WOW-Effekt.
        <br /><b>Contra:</b> weniger emotional als Figuren; viele Masten können
        sehr "uniform" wirken.
      </Note>
      <Note title="③ Biotop" color="#22C55E">
        <b>Pro:</b> perfekt zu Cozy/Wolf-Marke — Wald statt Stadt. Joker als
        Zauberbaum narrativ stark. Bäume/Pilze/Felsen bringen Vielfalt.
        <br /><b>Contra:</b> Team-Farbe nur in Krone/Kappe → schwächer lesbar.
        Bei 8 Teams könnten ähnliche Grün-/Blautöne kollidieren.
      </Note>
      <Note title="④ Leuchttürme" color="#A855F7">
        <b>Pro:</b> visuell am spektakulärsten. Nachtstimmung + emissive Lichter
        = Instagram-Material. Joker sticht stark heraus (doppelte Helligkeit).
        <br /><b>Contra:</b> Perf-Kosten bei vielen PointLights; zu abstrakt für
        "Quartier"-Metapher. Lesbarkeit bei gedeckten Team-Farben schwerer.
      </Note>
      <Note title="⑤ Schachfiguren" color="#EF4444">
        <b>Pro:</b> Strategie-Narrativ sofort klar — "Spielbrett-Eroberung".
        Figurentypen (Bauer/Turm/Läufer/Springer) bringen Variation ohne Content-
        Pflege. Joker = Turm/Dame elegant.
        <br /><b>Contra:</b> weniger "warm" als Biotop/Avatare. Figurentypen
        sind arbiträr, kein echter narrativer Link zur Frage/Runde.
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
