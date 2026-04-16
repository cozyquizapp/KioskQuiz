// QQ City Lab — zwei Ideen für das Stadt-Grid.
//
// ① Häuser (Three.js)  — 8 Gebäudetypen wie QQ3DGrid, aber mit echtem
//                        Licht/Schatten/emissive Fenstern + Team-Avatar auf dem Dach
// ② Sockel + Kopf       — Team-farbiger 3D-Sockel mit Avatar-Portrait
//
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
  { id: 1, title: '① Häuser (Three.js)', sub: '8 Gebäudetypen wie QQ3DGrid, mit echtem Licht & emissive Fenstern', accent: '#F59E0B' },
  { id: 2, title: '② Sockel + Kopf',      sub: 'Team-farbiger 3D-Sockel mit Avatar-Portrait',                       accent: '#3B82F6' },
];

// Gebäude-Typ pro Zelle deterministisch bestimmen (wie QQ3DGrid-Ansatz)
const BTYPE_NAMES = ['Haus', 'Turm', 'Hochhaus', 'Laden', 'Fabrik', 'Kirche', 'Burg', 'Silo'];
function cellBType(r: number, c: number): number {
  return (r * 5 + c * 3 + 1) % 8;
}

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

          if (variant === 1) return <Building key={key} x={x} z={z} avatar={avatar} joker={joker} btype={cellBType(r, c)} />;
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

// ── ① Häuser (Three.js) — 8 Gebäudetypen ───────────────────────────────────
// Reimplementation des QQ3DGrid-Looks: 8 Gebäudetypen, Team-Farbe als Body,
// echte Three.js-Schatten, emissive Fenster (warmes Gelb), Avatar auf dem Dach.

// Emissive Fenster-Material (warm gelb, wird vom Licht nicht ausgeblasen)
function windowMaterial() {
  return new THREE.MeshStandardMaterial({
    color: '#fde68a',
    emissive: '#fbbf24',
    emissiveIntensity: 1.1,
    roughness: 0.3,
    toneMapped: false,
  });
}

// Fenster-Reihe auf eine Gebäudeseite (rows × cols kleine emissive Planes)
function WindowGrid({ width, height, rows, cols, side = 'front', buildingDepth, buildingWidth }: {
  width: number; height: number; rows: number; cols: number;
  side?: 'front' | 'back' | 'left' | 'right';
  buildingDepth: number; buildingWidth: number;
}) {
  const mat = useMemo(() => windowMaterial(), []);
  const winW = (width / (cols + 1)) * 0.7;
  const winH = (height / (rows + 1)) * 0.55;
  const planes: JSX.Element[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const px = (c + 1) * (width / (cols + 1)) - width / 2;
      const py = (r + 1) * (height / (rows + 1));
      let position: [number, number, number];
      let rotation: [number, number, number] = [0, 0, 0];
      if (side === 'front')      { position = [px, py, buildingDepth / 2 + 0.001]; }
      else if (side === 'back')  { position = [px, py, -buildingDepth / 2 - 0.001]; rotation = [0, Math.PI, 0]; }
      else if (side === 'right') { position = [buildingWidth / 2 + 0.001, py, -px]; rotation = [0, Math.PI / 2, 0]; }
      else                       { position = [-buildingWidth / 2 - 0.001, py, px]; rotation = [0, -Math.PI / 2, 0]; }
      planes.push(
        <mesh key={`${side}-${r}-${c}`} position={position} rotation={rotation} material={mat}>
          <planeGeometry args={[winW, winH]} />
        </mesh>
      );
    }
  }
  return <>{planes}</>;
}

// Haupt-Body eines Gebäudes: gefärbte Box
function BodyBox({ w, h, d, y, color, joker }: {
  w: number; h: number; d: number; y: number; color: string; joker: boolean;
}) {
  return (
    <mesh position={[0, y + h / 2, 0]} castShadow receiveShadow>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial
        color={color}
        roughness={0.6}
        emissive={joker ? '#fbbf24' : '#000'}
        emissiveIntensity={joker ? 0.15 : 0}
      />
    </mesh>
  );
}

// Avatar-Billboard auf dem Dach
function RoofAvatar({ tex, y, joker }: { tex: THREE.Texture; y: number; joker: boolean }) {
  return (
    <>
      <Billboard position={[0, y + 0.28, 0]}>
        {joker ? (
          // Joker: goldener Stern-Look durch goldenen Kreis hinter dem Avatar
          <>
            <mesh position={[0, 0, -0.01]}>
              <circleGeometry args={[0.28, 32]} />
              <meshBasicMaterial color="#fbbf24" toneMapped={false} />
            </mesh>
            <mesh position={[0, 0, 0]}>
              <planeGeometry args={[0.4, 0.4]} />
              <meshBasicMaterial map={tex} transparent alphaTest={0.04} toneMapped={false} />
            </mesh>
          </>
        ) : (
          <mesh>
            <planeGeometry args={[0.4, 0.4]} />
            <meshBasicMaterial map={tex} transparent alphaTest={0.04} toneMapped={false} />
          </mesh>
        )}
      </Billboard>
    </>
  );
}

function Building({ x, z, avatar, joker, btype }: {
  x: number; z: number; avatar: typeof AVATARS[AvatarKey]; joker: boolean; btype: number;
}) {
  const tex = useAvatarTexture(avatar.emoji);
  const color = avatar.color;
  const bi = btype % 8;

  return (
    <group position={[x, 0.05, z]}>
      <TeamBase x={0} z={0} color={color} joker={joker} />

      {bi === 0 && <HouseB color={color} joker={joker} tex={tex} />}
      {bi === 1 && <TowerB color={color} joker={joker} tex={tex} />}
      {bi === 2 && <HighriseB color={color} joker={joker} tex={tex} />}
      {bi === 3 && <ShopB color={color} joker={joker} tex={tex} />}
      {bi === 4 && <FactoryB color={color} joker={joker} tex={tex} />}
      {bi === 5 && <ChurchB color={color} joker={joker} tex={tex} />}
      {bi === 6 && <CastleB color={color} joker={joker} tex={tex} />}
      {bi === 7 && <SiloB color={color} joker={joker} tex={tex} />}
    </group>
  );
}

type BProps = { color: string; joker: boolean; tex: THREE.Texture };

// 0: HAUS — niedrig, breit, Satteldach
function HouseB({ color, joker, tex }: BProps) {
  const w = 0.9, d = 0.9, h = 0.45;
  return (
    <group>
      <BodyBox w={w} h={h} d={d} y={0} color={color} joker={joker} />
      {/* Satteldach — Prisma */}
      <mesh position={[0, h + 0.15, 0]} castShadow rotation={[0, 0, 0]}>
        <boxGeometry args={[w + 0.04, 0.3, d + 0.04]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.05} />
      </mesh>
      <WindowGrid width={w} height={h} rows={1} cols={2} side="front" buildingDepth={d} buildingWidth={w} />
      <RoofAvatar tex={tex} y={h + 0.3} joker={joker} />
    </group>
  );
}

// 1: TURM — schmal, hoch, gestuft
function TowerB({ color, joker, tex }: BProps) {
  const w = 0.38, d = 0.38, h = 1.1;
  return (
    <group>
      <BodyBox w={w} h={h} d={d} y={0} color={color} joker={joker} />
      <BodyBox w={w * 0.7} h={0.22} d={d * 0.7} y={h} color={color} joker={joker} />
      <BodyBox w={w * 0.45} h={0.15} d={d * 0.45} y={h + 0.22} color={color} joker={joker} />
      <mesh position={[0, h + 0.42, 0]} castShadow>
        <coneGeometry args={[w * 0.3, 0.2, 4]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      <WindowGrid width={w} height={h} rows={4} cols={1} side="front" buildingDepth={d} buildingWidth={w} />
      <RoofAvatar tex={tex} y={h + 0.55} joker={joker} />
    </group>
  );
}

// 2: HOCHHAUS — quadratisch, hoch, Antenne
function HighriseB({ color, joker, tex }: BProps) {
  const w = 0.62, d = 0.62, h = 0.95;
  return (
    <group>
      <BodyBox w={w} h={h} d={d} y={0} color={color} joker={joker} />
      <WindowGrid width={w} height={h} rows={3} cols={2} side="front" buildingDepth={d} buildingWidth={w} />
      <WindowGrid width={d} height={h} rows={3} cols={2} side="right" buildingDepth={d} buildingWidth={w} />
      {/* Antenne */}
      <mesh position={[0, h + 0.15, 0]} castShadow>
        <cylinderGeometry args={[0.01, 0.012, 0.3, 8]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.4} />
      </mesh>
      <mesh position={[0, h + 0.32, 0]}>
        <sphereGeometry args={[0.025, 12, 10]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={1.2} toneMapped={false} />
      </mesh>
      <RoofAvatar tex={tex} y={h} joker={joker} />
    </group>
  );
}

// 3: LADEN — flach, breit, mit Markise
function ShopB({ color, joker, tex }: BProps) {
  const w = 1.0, d = 0.75, h = 0.25;
  return (
    <group>
      <BodyBox w={w} h={h} d={d} y={0} color={color} joker={joker} />
      {/* Markise */}
      <mesh position={[0, h * 0.6, d / 2 + 0.09]} castShadow rotation={[0.3, 0, 0]}>
        <boxGeometry args={[w + 0.1, 0.03, 0.2]} />
        <meshStandardMaterial color={color} roughness={0.55} />
      </mesh>
      <WindowGrid width={w} height={h} rows={1} cols={3} side="front" buildingDepth={d} buildingWidth={w} />
      <RoofAvatar tex={tex} y={h} joker={joker} />
    </group>
  );
}

// 4: FABRIK — zwei Hallen + Schornstein
function FactoryB({ color, joker, tex }: BProps) {
  const wA = 0.55, wB = 0.4, d = 0.7, hA = 0.65, hB = 0.3;
  return (
    <group>
      <group position={[-wB * 0.5, 0, 0]}>
        <BodyBox w={wA} h={hA} d={d} y={0} color={color} joker={joker} />
        <WindowGrid width={wA} height={hA} rows={2} cols={1} side="front" buildingDepth={d} buildingWidth={wA} />
      </group>
      <group position={[wA * 0.5, 0, 0]}>
        <BodyBox w={wB} h={hB} d={d} y={0} color={color} joker={joker} />
      </group>
      {/* Schornstein */}
      <mesh position={[-wB * 0.5, hA + 0.18, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.08, 0.36, 12]} />
        <meshStandardMaterial color="#475569" roughness={0.75} />
      </mesh>
      <RoofAvatar tex={tex} y={hA + 0.4} joker={joker} />
    </group>
  );
}

// 5: KIRCHE — Kirchenschiff + Turm + Spitze + Kreuz
function ChurchB({ color, joker, tex }: BProps) {
  const w = 0.55, d = 0.75, h = 0.4;
  const tw = 0.28, th = 0.55;
  return (
    <group>
      <BodyBox w={w} h={h} d={d} y={0} color={color} joker={joker} />
      <BodyBox w={tw} h={th} d={tw} y={0} color={color} joker={joker} />
      <mesh position={[0, th + 0.13, 0]} castShadow>
        <coneGeometry args={[tw * 0.7, 0.26, 4]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      {/* Kreuz */}
      <group position={[0, th + 0.32, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.018, 0.12, 0.018]} />
          <meshStandardMaterial color="#f8fafc" emissive="#fbbf24" emissiveIntensity={0.4} />
        </mesh>
        <mesh castShadow position={[0, 0.02, 0]}>
          <boxGeometry args={[0.065, 0.018, 0.018]} />
          <meshStandardMaterial color="#f8fafc" emissive="#fbbf24" emissiveIntensity={0.4} />
        </mesh>
      </group>
      <WindowGrid width={w} height={h} rows={1} cols={2} side="front" buildingDepth={d} buildingWidth={w} />
      <RoofAvatar tex={tex} y={th + 0.5} joker={joker} />
    </group>
  );
}

// 6: BURG — breite Basis + zwei hohe Ecktürme mit Zinnen
function CastleB({ color, joker, tex }: BProps) {
  const w = 0.95, d = 0.8, h = 0.35;
  const tw = 0.22, th = 0.85;
  return (
    <group>
      <BodyBox w={w} h={h} d={d} y={0} color={color} joker={joker} />
      {/* Zinnen auf der Mauer */}
      {[-0.28, 0, 0.28].map((px, i) => (
        <mesh key={i} position={[px, h + 0.04, d / 2 - 0.04]} castShadow>
          <boxGeometry args={[0.08, 0.08, 0.08]} />
          <meshStandardMaterial color={color} roughness={0.55} />
        </mesh>
      ))}
      {/* Zwei Ecktürme */}
      {[[-w / 2 + tw / 2, d / 2 - tw / 2], [w / 2 - tw / 2, d / 2 - tw / 2]].map(([tx, tz], i) => (
        <group key={i} position={[tx, 0, tz]}>
          <BodyBox w={tw} h={th} d={tw} y={0} color={color} joker={joker} />
          {/* Zinnen oben */}
          {[-0.06, 0.06].map((cx, j) => (
            <mesh key={j} position={[cx, th + 0.04, 0]} castShadow>
              <boxGeometry args={[0.05, 0.08, 0.05]} />
              <meshStandardMaterial color={color} roughness={0.55} />
            </mesh>
          ))}
        </group>
      ))}
      <WindowGrid width={w} height={h} rows={1} cols={3} side="front" buildingDepth={d} buildingWidth={w} />
      <RoofAvatar tex={tex} y={th + 0.1} joker={joker} />
    </group>
  );
}

// 7: SILO — Zylinder mit Kuppel
function SiloB({ color, joker, tex }: BProps) {
  const r = 0.28, h = 0.75;
  return (
    <group>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[r, r, h, 20]} />
        <meshStandardMaterial
          color={color}
          roughness={0.55}
          emissive={joker ? '#fbbf24' : '#000'}
          emissiveIntensity={joker ? 0.15 : 0}
        />
      </mesh>
      {/* Kuppel */}
      <mesh position={[0, h, 0]} castShadow>
        <sphereGeometry args={[r, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.2} />
      </mesh>
      <RoofAvatar tex={tex} y={h + r + 0.02} joker={joker} />
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
      <Note title="① Häuser (Three.js)" color="#F59E0B">
        <b>Pro:</b> dieselben 8 Gebäudetypen wie aktuell im QQ-Beamer, aber mit
        echtem Licht, Schatten und warm-gelben emissive Fenstern. Narrativ klar:
        "Quartier" = Stadt. Avatar als Billboard auf dem Dach bleibt sichtbar.
        <br /><b>Contra:</b> mehr Draw-Calls als CSS-3D (8 Teams × 25 Felder =
        viele Meshes). Bei 8 Teams live auf schwachem Beamer-Laptop testen.
      </Note>
      <Note title="② Sockel + Kopf" color="#3B82F6">
        <b>Pro:</b> starker "Spielfigur"-Charakter — 3D-Sockel in Team-Farbe mit
        Avatar-Portrait oben drauf. Avatar immer lesbar (Billboard). Elegant wie
        Monopoly-Figuren.
        <br /><b>Contra:</b> fragmentiert — Avatar sitzt nicht "im" 3D-Raum, sondern
        schwebt als Medaillon. Weniger "Stadt" als Variante ①.
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
