// QQ City Lab — zwei Ideen für das Stadt-Grid.
//
// ① Häuser (Three.js)  — 8 Gebäudetypen wie QQ3DGrid, aber mit echtem
//                        Licht/Schatten/emissive Fenstern + Team-Avatar auf dem Dach
// ② Sockel + Kopf       — Team-farbiger 3D-Sockel mit Avatar-Portrait
//
// Demo-Grid 5×5 mit 8 Teams gemischt + Joker.

import { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Billboard, MeshReflectorMaterial } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
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
        camera={{ position: [7.5, 7, 9.5], fov: 34 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.15 }}
      >
        {/* Tief-dunkler Bühnen-Hintergrund */}
        <color attach="background" args={['#05060d']} />
        <fog attach="fog" args={['#05060d', 14, 36]} />

        {/* Ambient — mehr Füllung, damit Gebäude-Farben lesbar bleiben */}
        <ambientLight intensity={0.55} color="#c7d2fe" />

        {/* Key-Light: neutral-weißes Spotlight von schräg oben */}
        <spotLight
          position={[5, 11, 5]}
          angle={0.7}
          penumbra={0.55}
          intensity={2.2}
          color="#fef3c7"
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-bias={-0.0005}
        />

        {/* Fill von rechts vorne (wärmer) */}
        <spotLight
          position={[8, 6, 8]}
          angle={0.8}
          penumbra={0.8}
          intensity={1.2}
          color="#fde68a"
        />

        {/* Rim-Light: kühles Cyan von hinten/links */}
        <spotLight
          position={[-5, 8, -5]}
          angle={0.7}
          penumbra={0.7}
          intensity={1.4}
          color="#7dd3fc"
        />

        {/* Akzent: violettes Punktlicht unten/hinten */}
        <pointLight position={[0, 1.5, -7]} intensity={0.9} color="#a855f7" distance={12} decay={2} />

        {/* Front-Fill damit Avatare lesbar sind */}
        <pointLight position={[0, 5, 8]} intensity={0.8} color="#ffffff" distance={14} decay={2} />

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
          autoRotateSpeed={0.4}
        />

        {/* Post-Processing: dezenter Bloom nur auf sehr helle Emissives */}
        <EffectComposer multisampling={0}>
          <Bloom
            intensity={0.65}
            luminanceThreshold={0.88}
            luminanceSmoothing={0.35}
            mipmapBlur
          />
          <Vignette eskil={false} offset={0.3} darkness={0.55} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}

function Ground() {
  return (
    <group>
      {/* Äußerer Bühnenboden: großer spiegelnder Ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <MeshReflectorMaterial
          blur={[300, 80]}
          resolution={512}
          mixBlur={1}
          mixStrength={3.5}
          roughness={0.85}
          depthScale={0.5}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.2}
          color="#050810"
          metalness={0.7}
          mirror={0.55}
        />
      </mesh>
      {/* Inneres Bühnen-Tile: subtil heller, damit Grid darauf sichtbar ist */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[SIZE * TILE + 1.8, SIZE * TILE + 1.8]} />
        <meshStandardMaterial
          color="#0b1221"
          roughness={0.35}
          metalness={0.55}
          emissive="#fbbf24"
          emissiveIntensity={0.04}
        />
      </mesh>
    </group>
  );
}

function GridLines() {
  const lines = [];
  for (let i = 0; i <= SIZE; i++) {
    const p = (i * TILE) - OFFSET - TILE / 2;
    lines.push(
      <mesh key={`h-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, p]}>
        <planeGeometry args={[SIZE * TILE + 0.4, 0.035]} />
        <meshBasicMaterial color="#fde68a" toneMapped={false} />
      </mesh>,
      <mesh key={`v-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[p, 0.02, 0]}>
        <planeGeometry args={[0.035, SIZE * TILE + 0.4]} />
        <meshBasicMaterial color="#fde68a" toneMapped={false} />
      </mesh>
    );
  }
  return <>{lines}</>;
}

function EmptyPlot({ x, z }: { x: number; z: number }) {
  return (
    <mesh position={[x, 0.025, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[1.22, 1.22]} />
      <meshStandardMaterial color="#0d1626" roughness={0.4} metalness={0.3} />
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

// Haupt-Body eines Gebäudes: gefärbte Box — leicht selbst-emissive
// damit Team-Farbe auch im Schatten lesbar bleibt.
function BodyBox({ w, h, d, y, color, joker }: {
  w: number; h: number; d: number; y: number; color: string; joker: boolean;
}) {
  return (
    <mesh position={[0, y + h / 2, 0]} castShadow receiveShadow>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial
        color={color}
        roughness={0.55}
        emissive={joker ? '#fbbf24' : color}
        emissiveIntensity={joker ? 0.25 : 0.22}
      />
    </mesh>
  );
}

// Avatar-Billboard auf dem Dach — größer + direkt aufgesetzt
function RoofAvatar({ tex, y, joker }: { tex: THREE.Texture; y: number; joker: boolean }) {
  return (
    <Billboard position={[0, y + 0.36, 0]}>
      {joker && (
        <mesh position={[0, 0, -0.015]}>
          <circleGeometry args={[0.44, 32]} />
          <meshBasicMaterial color="#fbbf24" toneMapped={false} />
        </mesh>
      )}
      {/* Weißes Kreis-Badge als Hintergrund */}
      <mesh position={[0, 0, -0.005]}>
        <circleGeometry args={[0.36, 32]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh>
        <planeGeometry args={[0.62, 0.62]} />
        <meshBasicMaterial map={tex} transparent alphaTest={0.04} toneMapped={false} />
      </mesh>
    </Billboard>
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

// Helper: emissive strip (für neon-style Akzente, toneMapped off = bloom-ready)
function NeonStrip({ w, h, d, y, x = 0, z = 0, color, intensity = 2.2 }: {
  w: number; h: number; d: number; y: number; x?: number; z?: number; color: string; intensity?: number;
}) {
  return (
    <mesh position={[x, y, z]}>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={intensity}
        toneMapped={false}
      />
    </mesh>
  );
}

// 0: HAUS — kubistisches Stadthaus, warm beleuchtete Etage, Lichtkrone
function HouseB({ color, joker, tex }: BProps) {
  const w = 0.92, d = 0.92, h = 0.55;
  return (
    <group>
      <BodyBox w={w} h={h} d={d} y={0} color={color} joker={joker} />
      {/* Erdgeschoss-Lichtband (warm gelb, umlaufend) */}
      <NeonStrip w={w + 0.01} h={0.05} d={d + 0.01} y={0.12} color="#fbbf24" intensity={1.6} />
      {/* Oberes Lichtband in Team-Farbe */}
      <NeonStrip w={w + 0.01} h={0.025} d={d + 0.01} y={h - 0.06} color={color} intensity={2.4} />
      {/* Satteldach als Prisma (gedreht) */}
      <mesh position={[0, h + 0.18, 0]} castShadow rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[w * 0.78, 0.36, 4]} />
        <meshStandardMaterial color={color} roughness={0.45} metalness={0.1} />
      </mesh>
      {/* Dachspitze: leuchtende Kugel */}
      <mesh position={[0, h + 0.4, 0]}>
        <sphereGeometry args={[0.05, 16, 12]} />
        <meshStandardMaterial color="#fde68a" emissive="#fbbf24" emissiveIntensity={3} toneMapped={false} />
      </mesh>
      <WindowGrid width={w} height={h} rows={2} cols={3} side="front" buildingDepth={d} buildingWidth={w} />
      <WindowGrid width={d} height={h} rows={2} cols={3} side="right" buildingDepth={d} buildingWidth={w} />
      <RoofAvatar tex={tex} y={h + 0.32} joker={joker} />
    </group>
  );
}

// 1: TURM — Uhrturm mit glühendem Zifferblatt
function TowerB({ color, joker, tex }: BProps) {
  const w = 0.44, d = 0.44, h = 1.25;
  return (
    <group>
      <BodyBox w={w} h={h} d={d} y={0} color={color} joker={joker} />
      {/* Vertikale Neon-Stripes (4 Kanten) */}
      {[[-w/2 + 0.012, -d/2 + 0.012], [w/2 - 0.012, -d/2 + 0.012],
        [-w/2 + 0.012,  d/2 - 0.012], [w/2 - 0.012,  d/2 - 0.012]].map(([sx, sz], i) => (
        <mesh key={i} position={[sx, h / 2, sz]}>
          <boxGeometry args={[0.025, h - 0.05, 0.025]} />
          <meshStandardMaterial color="#fde68a" emissive="#fbbf24" emissiveIntensity={2.4} toneMapped={false} />
        </mesh>
      ))}
      {/* Uhr-Zifferblatt (emissive Disc) */}
      <mesh position={[0, h * 0.72, d / 2 + 0.002]}>
        <circleGeometry args={[w * 0.32, 32]} />
        <meshStandardMaterial color="#fef9c3" emissive="#fbbf24" emissiveIntensity={2.6} toneMapped={false} />
      </mesh>
      {/* Uhrzeiger (dark) */}
      <mesh position={[0, h * 0.72, d / 2 + 0.004]}>
        <boxGeometry args={[0.012, w * 0.24, 0.004]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      <mesh position={[0, h * 0.72, d / 2 + 0.004]} rotation={[0, 0, Math.PI / 3]}>
        <boxGeometry args={[0.012, w * 0.18, 0.004]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      {/* Gestufte Spitze */}
      <BodyBox w={w * 0.7} h={0.18} d={d * 0.7} y={h} color={color} joker={joker} />
      <mesh position={[0, h + 0.36, 0]} castShadow>
        <coneGeometry args={[w * 0.4, 0.3, 4]} />
        <meshStandardMaterial color={color} roughness={0.45} />
      </mesh>
      {/* Fahne auf der Spitze */}
      <mesh position={[0, h + 0.62, 0]}>
        <sphereGeometry args={[0.035, 16, 12]} />
        <meshStandardMaterial color="#fde68a" emissive="#fbbf24" emissiveIntensity={3.2} toneMapped={false} />
      </mesh>
      <RoofAvatar tex={tex} y={h + 0.65} joker={joker} />
    </group>
  );
}

// 2: HOCHHAUS — Wolkenkratzer mit LED-Ring-Krone
function HighriseB({ color, joker, tex }: BProps) {
  const w = 0.58, d = 0.58, h = 1.4;
  return (
    <group>
      <BodyBox w={w} h={h} d={d} y={0} color={color} joker={joker} />
      {/* Horizontale Etagen-Lichter (mehrere emissive Bänder) */}
      {[0.22, 0.48, 0.74, 1.0, 1.24].map((yp, i) => (
        <NeonStrip key={i} w={w + 0.012} h={0.02} d={d + 0.012} y={yp} color={color} intensity={2.6} />
      ))}
      {/* LED-Ring-Krone */}
      <mesh position={[0, h + 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[w * 0.55, w * 0.68, 32]} />
        <meshBasicMaterial color="#fbbf24" toneMapped={false} />
      </mesh>
      {/* Penthouse-Box */}
      <BodyBox w={w * 0.55} h={0.16} d={d * 0.55} y={h + 0.08} color={color} joker={joker} />
      {/* Antennen-Mast */}
      <mesh position={[0, h + 0.45, 0]} castShadow>
        <cylinderGeometry args={[0.008, 0.014, 0.45, 8]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.3} metalness={0.8} />
      </mesh>
      {/* Warning-Light rot */}
      <mesh position={[0, h + 0.7, 0]}>
        <sphereGeometry args={[0.035, 16, 12]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={3.5} toneMapped={false} />
      </mesh>
      <RoofAvatar tex={tex} y={h + 0.78} joker={joker} />
    </group>
  );
}

// 3: LADEN — Neon-Storefront mit beleuchteter Markise
function ShopB({ color, joker, tex }: BProps) {
  const w = 1.05, d = 0.8, h = 0.42;
  return (
    <group>
      <BodyBox w={w} h={h} d={d} y={0} color={color} joker={joker} />
      {/* Neon-Schriftband unterhalb der Markise */}
      <NeonStrip w={w - 0.1} h={0.06} d={0.02} y={h * 0.78} z={d / 2 + 0.01} color={color} intensity={3} />
      {/* Markise (breit, tiefer) mit Lampen-Unterseite */}
      <mesh position={[0, h + 0.06, d / 2 + 0.16]} castShadow rotation={[0.35, 0, 0]}>
        <boxGeometry args={[w + 0.14, 0.04, 0.32]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      <NeonStrip w={w + 0.14} h={0.015} d={0.02} y={h + 0.02} z={d / 2 + 0.28} color="#fde68a" intensity={2.4} />
      {/* Flache Dachplattform mit Lichtband */}
      <NeonStrip w={w + 0.02} h={0.02} d={d + 0.02} y={h + 0.015} color={color} intensity={2.2} />
      {/* Schaufenster (großes warmes Licht) */}
      <mesh position={[0, h * 0.38, d / 2 + 0.002]}>
        <planeGeometry args={[w * 0.82, h * 0.55]} />
        <meshStandardMaterial color="#fef3c7" emissive="#fbbf24" emissiveIntensity={1.8} toneMapped={false} />
      </mesh>
      <RoofAvatar tex={tex} y={h + 0.08} joker={joker} />
    </group>
  );
}

// 4: FABRIK — Industriehalle mit glühendem Rauch + Logo-Leuchte
function FactoryB({ color, joker, tex }: BProps) {
  const wA = 0.6, wB = 0.45, d = 0.78, hA = 0.7, hB = 0.35;
  return (
    <group>
      {/* Haupthalle */}
      <group position={[-wB * 0.5, 0, 0]}>
        <BodyBox w={wA} h={hA} d={d} y={0} color={color} joker={joker} />
        {/* Sägezahn-Dach (3 kleine Prismen) */}
        {[-0.2, 0, 0.2].map((sx, i) => (
          <mesh key={i} position={[sx, hA + 0.05, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
            <coneGeometry args={[0.13, 0.12, 4]} />
            <meshStandardMaterial color={color} roughness={0.5} />
          </mesh>
        ))}
        <WindowGrid width={wA} height={hA} rows={3} cols={2} side="front" buildingDepth={d} buildingWidth={wA} />
      </group>
      {/* Nebenhalle */}
      <group position={[wA * 0.5, 0, 0]}>
        <BodyBox w={wB} h={hB} d={d} y={0} color={color} joker={joker} />
        <NeonStrip w={wB + 0.01} h={0.025} d={d + 0.01} y={hB - 0.05} color="#fbbf24" intensity={2.4} />
      </group>
      {/* Logo-Disc an der Seite */}
      <mesh position={[-wB * 0.5, hA * 0.55, d / 2 + 0.002]}>
        <circleGeometry args={[0.1, 32]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.4} toneMapped={false} />
      </mesh>
      {/* Schornstein (höher, konischer) */}
      <mesh position={[-wB * 0.5 - wA * 0.3, hA + 0.28, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.09, 0.56, 12]} />
        <meshStandardMaterial color="#334155" roughness={0.75} metalness={0.3} />
      </mesh>
      {/* Rotes Warn-Band am Schornstein */}
      <mesh position={[-wB * 0.5 - wA * 0.3, hA + 0.42, 0]}>
        <cylinderGeometry args={[0.065, 0.065, 0.04, 12]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={2.2} toneMapped={false} />
      </mesh>
      {/* Glühender "Rauch" — 3 aufsteigende Kugeln */}
      <FactorySmoke x={-wB * 0.5 - wA * 0.3} baseY={hA + 0.56} />
      <RoofAvatar tex={tex} y={hA + 0.18} joker={joker} />
    </group>
  );
}

function FactorySmoke({ x, baseY }: { x: number; baseY: number }) {
  const r1 = useRef<THREE.Mesh>(null);
  const r2 = useRef<THREE.Mesh>(null);
  const r3 = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    [r1, r2, r3].forEach((r, i) => {
      if (!r.current) return;
      const phase = (t + i * 0.6) % 1.8;
      r.current.position.y = baseY + phase * 0.35;
      (r.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.6 - phase * 0.35);
      const s = 0.8 + phase * 0.6;
      r.current.scale.setScalar(s);
    });
  });
  return (
    <>
      {[r1, r2, r3].map((r, i) => (
        <mesh key={i} ref={r} position={[x, baseY, 0]}>
          <sphereGeometry args={[0.05, 12, 10]} />
          <meshBasicMaterial color="#fde68a" transparent opacity={0.5} toneMapped={false} />
        </mesh>
      ))}
    </>
  );
}

// 5: KIRCHE — Kathedrale mit leuchtendem Rosettenfenster + Kreuz
function ChurchB({ color, joker, tex }: BProps) {
  const w = 0.6, d = 0.85, h = 0.48;
  const tw = 0.3, th = 0.85;
  return (
    <group>
      {/* Kirchenschiff */}
      <BodyBox w={w} h={h} d={d} y={0} color={color} joker={joker} />
      {/* Steil-Dach */}
      <mesh position={[0, h + 0.18, 0]} castShadow rotation={[0, Math.PI / 2, 0]}>
        <coneGeometry args={[d * 0.55, 0.4, 4]} />
        <meshStandardMaterial color={color} roughness={0.55} />
      </mesh>
      {/* Rosetten-Fenster (großes emissive Rund) */}
      <mesh position={[0, h * 0.62, d / 2 + 0.002]}>
        <circleGeometry args={[0.13, 32]} />
        <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={3.2} toneMapped={false} />
      </mesh>
      <mesh position={[0, h * 0.62, d / 2 + 0.003]}>
        <ringGeometry args={[0.13, 0.15, 32]} />
        <meshBasicMaterial color="#fde68a" toneMapped={false} />
      </mesh>
      {/* Turm */}
      <group position={[0, 0, -d / 2 + tw / 2]}>
        <BodyBox w={tw} h={th} d={tw} y={0} color={color} joker={joker} />
        {/* Turmfenster (hoch, schmal, emissive) */}
        <mesh position={[0, th * 0.7, tw / 2 + 0.002]}>
          <planeGeometry args={[0.08, 0.24]} />
          <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={2.8} toneMapped={false} />
        </mesh>
        {/* Spitze */}
        <mesh position={[0, th + 0.15, 0]} castShadow>
          <coneGeometry args={[tw * 0.72, 0.32, 4]} />
          <meshStandardMaterial color={color} roughness={0.5} />
        </mesh>
        {/* Leuchtendes Kreuz */}
        <group position={[0, th + 0.42, 0]}>
          <mesh>
            <boxGeometry args={[0.022, 0.16, 0.022]} />
            <meshStandardMaterial color="#fef9c3" emissive="#fbbf24" emissiveIntensity={3} toneMapped={false} />
          </mesh>
          <mesh position={[0, 0.02, 0]}>
            <boxGeometry args={[0.085, 0.022, 0.022]} />
            <meshStandardMaterial color="#fef9c3" emissive="#fbbf24" emissiveIntensity={3} toneMapped={false} />
          </mesh>
        </group>
      </group>
      <RoofAvatar tex={tex} y={h + 0.25} joker={joker} />
    </group>
  );
}

// 6: BURG — gedrungene Festung mit zwei Ecktürmen + Banner + Fackeln
function CastleB({ color, joker, tex }: BProps) {
  const w = 1.0, d = 0.88, h = 0.45;
  const tw = 0.26, th = 1.0;
  return (
    <group>
      {/* Burgmauer */}
      <BodyBox w={w} h={h} d={d} y={0} color={color} joker={joker} />
      {/* Zinnenkranz vorne */}
      {[-0.35, -0.12, 0.12, 0.35].map((px, i) => (
        <mesh key={i} position={[px, h + 0.05, d / 2 - 0.05]} castShadow>
          <boxGeometry args={[0.1, 0.1, 0.1]} />
          <meshStandardMaterial color={color} roughness={0.55} />
        </mesh>
      ))}
      {/* Tor (dunkle emissive Öffnung) */}
      <mesh position={[0, h * 0.45, d / 2 + 0.002]}>
        <planeGeometry args={[0.16, 0.28]} />
        <meshStandardMaterial color="#78350f" emissive="#fb923c" emissiveIntensity={1.6} toneMapped={false} />
      </mesh>
      {/* Fackeln neben dem Tor (leuchten + Glühkugel) */}
      {[-0.15, 0.15].map((fx, i) => (
        <group key={i}>
          <mesh position={[fx, h * 0.58, d / 2 + 0.01]}>
            <boxGeometry args={[0.015, 0.18, 0.015]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
          <mesh position={[fx, h * 0.78, d / 2 + 0.01]}>
            <sphereGeometry args={[0.04, 14, 10]} />
            <meshStandardMaterial color="#fb923c" emissive="#f97316" emissiveIntensity={3.5} toneMapped={false} />
          </mesh>
        </group>
      ))}
      {/* Zwei hohe Ecktürme mit Kegeldach + Banner */}
      {[[-w / 2 + tw / 2, d / 2 - tw / 2], [w / 2 - tw / 2, d / 2 - tw / 2]].map(([tx, tz], i) => (
        <group key={i} position={[tx, 0, tz]}>
          <mesh position={[0, th / 2, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[tw * 0.55, tw * 0.6, th, 16]} />
            <meshStandardMaterial color={color} roughness={0.55} emissive={joker ? '#fbbf24' : '#000'} emissiveIntensity={joker ? 0.15 : 0} />
          </mesh>
          {/* Zinnen */}
          {[0, Math.PI / 2, Math.PI, 3 * Math.PI / 2].map((a, j) => (
            <mesh key={j} position={[Math.cos(a) * tw * 0.48, th + 0.05, Math.sin(a) * tw * 0.48]} castShadow>
              <boxGeometry args={[0.05, 0.1, 0.05]} />
              <meshStandardMaterial color={color} />
            </mesh>
          ))}
          {/* Kegeldach */}
          <mesh position={[0, th + 0.22, 0]} castShadow>
            <coneGeometry args={[tw * 0.62, 0.3, 18]} />
            <meshStandardMaterial color={color} roughness={0.5} />
          </mesh>
          {/* Banner-Stange + Fahne */}
          <mesh position={[0, th + 0.48, 0]} castShadow>
            <cylinderGeometry args={[0.008, 0.008, 0.16, 8]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
          <mesh position={[0.08, th + 0.5, 0]}>
            <planeGeometry args={[0.14, 0.1]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.8} side={THREE.DoubleSide} toneMapped={false} />
          </mesh>
        </group>
      ))}
      <RoofAvatar tex={tex} y={h + 0.08} joker={joker} />
    </group>
  );
}

// 7: SILO — Doppel-Silo mit pulsierendem Leuchtring
function SiloB({ color, joker, tex }: BProps) {
  const r = 0.26, h = 0.9;
  const pulseRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (pulseRef.current) {
      const t = state.clock.elapsedTime;
      const s = 1 + Math.sin(t * 2) * 0.08;
      pulseRef.current.scale.set(s, 1, s);
      (pulseRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 2.2 + Math.sin(t * 2) * 1.0;
    }
  });
  return (
    <group>
      {/* Silo 1 (links, groß) */}
      <group position={[-r * 0.55, 0, 0]}>
        <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[r, r, h, 20]} />
          <meshStandardMaterial color={color} roughness={0.45} metalness={0.2} emissive={joker ? '#fbbf24' : '#000'} emissiveIntensity={joker ? 0.15 : 0} />
        </mesh>
        {/* Pulsierender Ring in der Mitte */}
        <mesh ref={pulseRef} position={[0, h * 0.5, 0]}>
          <cylinderGeometry args={[r + 0.012, r + 0.012, 0.04, 20]} />
          <meshStandardMaterial color="#fde68a" emissive="#fbbf24" emissiveIntensity={2.2} toneMapped={false} />
        </mesh>
        {/* Kuppel */}
        <mesh position={[0, h, 0]} castShadow>
          <sphereGeometry args={[r, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={color} roughness={0.3} metalness={0.35} />
        </mesh>
        {/* Warnlicht-Kugel oben */}
        <mesh position={[0, h + r + 0.02, 0]}>
          <sphereGeometry args={[0.03, 14, 10]} />
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={3} toneMapped={false} />
        </mesh>
      </group>
      {/* Silo 2 (rechts, kleiner) */}
      <group position={[r * 0.85, 0, 0]}>
        <mesh position={[0, 0.35, 0]} castShadow>
          <cylinderGeometry args={[r * 0.65, r * 0.65, 0.7, 18]} />
          <meshStandardMaterial color={color} roughness={0.45} metalness={0.2} />
        </mesh>
        <NeonStrip w={r * 1.35} h={0.03} d={r * 1.35} y={0.62} color={color} intensity={2.4} />
        <mesh position={[0, 0.7, 0]} castShadow>
          <sphereGeometry args={[r * 0.65, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={color} roughness={0.3} metalness={0.35} />
        </mesh>
      </group>
      {/* Verbindungs-Röhre */}
      <mesh position={[r * 0.15, h * 0.75, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, r * 1.4, 10]} />
        <meshStandardMaterial color="#64748b" roughness={0.45} metalness={0.6} />
      </mesh>
      <RoofAvatar tex={tex} y={h + r + 0.05} joker={joker} />
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
