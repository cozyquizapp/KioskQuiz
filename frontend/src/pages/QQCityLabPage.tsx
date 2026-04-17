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

          if (variant === 1) return <Building key={key} x={x} z={z} avatar={avatar} joker={joker} btype={cellBType(r, c)} ownerId={owner} />;
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

// Grid-Lines — wie 2D-Grid-Gap (dezent hell, nicht leuchtend gelb)
function GridLines() {
  const lines = [];
  for (let i = 0; i <= SIZE; i++) {
    const p = (i * TILE) - OFFSET - TILE / 2;
    lines.push(
      <mesh key={`h-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, p]}>
        <planeGeometry args={[SIZE * TILE + 0.4, 0.02]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.15} toneMapped={false} />
      </mesh>,
      <mesh key={`v-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[p, 0.02, 0]}>
        <planeGeometry args={[0.02, SIZE * TILE + 0.4]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.15} toneMapped={false} />
      </mesh>
    );
  }
  return <>{lines}</>;
}

// Leere Zelle — wie 2D: sehr dunkel mit subtilem Rand
function EmptyPlot({ x, z }: { x: number; z: number }) {
  return (
    <group>
      <mesh position={[x, 0.025, z]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.22, 1.22]} />
        <meshBasicMaterial color="#0a0f1c" toneMapped={false} />
      </mesh>
      <SquareFrame
        x={x} z={z} y={0.031}
        size={1.22} thickness={0.012}
        color="#ffffff" opacity={0.12}
      />
    </group>
  );
}

// Team-Tile — Übersetzung des 2D-Grid-Looks:
// 2D: linearer Gradient teamColor99 → teamColor66, 135°, dünner Rand teamColor55,
//     Joker: 2px goldener Rand + goldener Glow.
// 3D: gradient-lookalike per Canvas-Texture auf das Tile, dünner Rahmen,
//     goldenes Außen-Quadrat bei Joker.

function useTeamTileTexture(color: string): THREE.Texture {
  return useMemo(() => {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    // Wie 2D: 135° Linear-Gradient teamColor99 → teamColor66
    const g = ctx.createLinearGradient(0, 0, size, size);
    g.addColorStop(0, color + '99');
    g.addColorStop(1, color + '66');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    // Dünner Innen-Rand wie teamColor55 im 2D
    ctx.strokeStyle = color + '55';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, size - 6, size - 6);
    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 4;
    return tex;
  }, [color]);
}

function SquareFrame({ x, z, y, size, thickness, color, opacity = 1 }: {
  x: number; z: number; y: number; size: number; thickness: number; color: string; opacity?: number;
}) {
  const half = size / 2;
  const tHalf = thickness / 2;
  return (
    <group>
      <mesh position={[x, y, z + half - tHalf]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[size, thickness]} />
        <meshBasicMaterial color={color} toneMapped={false} transparent={opacity < 1} opacity={opacity} />
      </mesh>
      <mesh position={[x, y, z - half + tHalf]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[size, thickness]} />
        <meshBasicMaterial color={color} toneMapped={false} transparent={opacity < 1} opacity={opacity} />
      </mesh>
      <mesh position={[x + half - tHalf, y, z]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[thickness, size]} />
        <meshBasicMaterial color={color} toneMapped={false} transparent={opacity < 1} opacity={opacity} />
      </mesh>
      <mesh position={[x - half + tHalf, y, z]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[thickness, size]} />
        <meshBasicMaterial color={color} toneMapped={false} transparent={opacity < 1} opacity={opacity} />
      </mesh>
    </group>
  );
}

function TeamBase({ x, z, color, joker }: { x: number; z: number; color: string; joker: boolean }) {
  const tex = useTeamTileTexture(color);
  // Zelle wie 2D: 1.22 (EmptyPlot-Größe) statt 1.32 — damit bleibt Grid-Gap sichtbar
  const size = 1.22;
  return (
    <group>
      {/* Gradient-Tile wie im 2D-Grid */}
      <mesh position={[x, 0.04, z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[size, size]} />
        <meshBasicMaterial map={tex} transparent toneMapped={false} />
      </mesh>
      {/* Joker: goldener 2D-style Rahmen ohne Gap-Überschreitung */}
      {joker && (
        <SquareFrame
          x={x} z={z} y={0.047}
          size={size - 0.02}
          thickness={0.035}
          color="#fbbf24"
        />
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

// Avatar-Billboard auf dem Dach — klein + direkt aufsitzend, wie QQ3DGrid
// (kein weißer Badge-Hintergrund, nur das Emoji selbst; Team-ID trägt
// der farbige Boden-Ring in TeamBase).
function RoofAvatar({ tex, y, joker }: { tex: THREE.Texture; y: number; joker: boolean }) {
  return (
    <Billboard position={[0, y + 0.18, 0]}>
      {joker && (
        <mesh position={[0, 0, -0.01]}>
          <circleGeometry args={[0.2, 28]} />
          <meshBasicMaterial color="#fbbf24" toneMapped={false} />
        </mesh>
      )}
      <mesh>
        <planeGeometry args={[0.34, 0.34]} />
        <meshBasicMaterial map={tex} transparent alphaTest={0.04} toneMapped={false} />
      </mesh>
    </Billboard>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function Building({ x, z, avatar, joker, btype: _btype, ownerId: _ownerId }: {
  x: number; z: number; avatar: typeof AVATARS[AvatarKey]; joker: boolean; btype: number; ownerId: AvatarKey;
}) {
  const tex = useAvatarTexture(avatar.emoji);
  const color = avatar.color;

  // Eixample-Block (Barcelona) für alle Teams:
  // Chamfered-Corner-Grundriss (abgeschrägte Ecken wie in Eixample),
  // cremefarbene Fassaden, Dach in Team-Farbe, Avatar mittig auf dem Dach,
  // dunkler Innenhof. Form bleibt konstant = echter "Quartier"-Look.
  return (
    <group position={[x, 0.05, z]}>
      <EixampleBlock color={color} joker={joker} tex={tex} />
    </group>
  );
}

type BProps = { color: string; joker: boolean; tex: THREE.Texture };

// ─────────────────────────────────────────────────────────────────────────────
// EIXAMPLE-BLOCK (Barcelona) — Kern-Gebäude für Quartier-Look
// Chamfered Octagon footprint, ring-shape mit Innenhof, flaches Team-Dach.
// ─────────────────────────────────────────────────────────────────────────────

const EIX_WALL = '#e8d9b8';    // warme Creme-Fassade
const EIX_WALL_DARK = '#b69a6c';
const EIX_COURTYARD = '#1a1208'; // dunkler Innenhof

// Chamfered-Square Shape (Eixample-Grundriss): Quadrat mit 4 abgeschrägten Ecken
function chamferedSquareShape(size: number, chamfer: number): THREE.Shape {
  const s = size / 2;
  const c = chamfer;
  const shape = new THREE.Shape();
  // Start rechts unten, gegen den Uhrzeigersinn (= außen)
  shape.moveTo( s,     -s + c);
  shape.lineTo( s,      s - c);
  shape.lineTo( s - c,  s);
  shape.lineTo(-s + c,  s);
  shape.lineTo(-s,      s - c);
  shape.lineTo(-s,     -s + c);
  shape.lineTo(-s + c, -s);
  shape.lineTo( s - c, -s);
  shape.closePath();
  return shape;
}

// Ring-Shape (Eixample-Block ist hohl → Innenhof)
function chamferedRingShape(outer: number, inner: number, chamfer: number): THREE.Shape {
  const shape = chamferedSquareShape(outer, chamfer);
  const holeSize = inner;
  const hc = chamfer * (inner / outer);
  const hole = new THREE.Path();
  const s = holeSize / 2;
  const c = hc;
  hole.moveTo( s,     -s + c);
  hole.lineTo( s,      s - c);
  hole.lineTo( s - c,  s);
  hole.lineTo(-s + c,  s);
  hole.lineTo(-s,      s - c);
  hole.lineTo(-s,     -s + c);
  hole.lineTo(-s + c, -s);
  hole.lineTo( s - c, -s);
  hole.closePath();
  shape.holes.push(hole);
  return shape;
}

function EixampleBlock({ color, joker, tex }: BProps) {
  const OUTER = 1.18;
  const INNER = 0.48;
  const CHAMFER = 0.22;
  const H = 0.42;

  // Geometrien memoizen (werden pro Frame sonst neu gebaut)
  const facadeGeom = useMemo(() => {
    const shape = chamferedRingShape(OUTER, INNER, CHAMFER);
    const geom = new THREE.ExtrudeGeometry(shape, {
      depth: H,
      bevelEnabled: false,
      curveSegments: 4,
    });
    geom.rotateX(-Math.PI / 2);
    geom.translate(0, H, 0);
    return geom;
  }, []);

  const roofGeom = useMemo(() => {
    const shape = chamferedRingShape(OUTER, INNER, CHAMFER);
    const geom = new THREE.ExtrudeGeometry(shape, {
      depth: 0.04,
      bevelEnabled: false,
      curveSegments: 4,
    });
    geom.rotateX(-Math.PI / 2);
    geom.translate(0, H + 0.04, 0);
    return geom;
  }, []);

  return (
    <group>
      {/* Hauptkörper — Eixample-Ring-Gebäude */}
      <mesh geometry={facadeGeom} castShadow receiveShadow>
        <meshStandardMaterial
          color={EIX_WALL}
          roughness={0.78}
          metalness={0.02}
          emissive={joker ? '#fbbf24' : '#000'}
          emissiveIntensity={joker ? 0.18 : 0}
        />
      </mesh>

      {/* Dach — in Team-Farbe (hier sitzt die Team-ID) */}
      <mesh geometry={roofGeom} castShadow>
        <meshStandardMaterial
          color={color}
          roughness={0.55}
          metalness={0.1}
          emissive={color}
          emissiveIntensity={0.45}
        />
      </mesh>

      {/* Dach-Kante (kleiner farbiger Rahmen auf Fassaden-Oberkante) */}
      <EixampleRoofRim color={color} outer={OUTER} inner={INNER} chamfer={CHAMFER} y={H} />

      {/* Fensterbänder auf den 4 Hauptfassaden */}
      <EixampleWindows outer={OUTER} chamfer={CHAMFER} h={H} />

      {/* Innenhof-Boden (dunkel, tiefer liegend) */}
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[INNER * 0.95, INNER * 0.95]} />
        <meshStandardMaterial color={EIX_COURTYARD} roughness={0.9} />
      </mesh>

      {/* Avatar mittig über dem Innenhof, hängt über dem Block */}
      <RoofAvatar tex={tex} y={H + 0.18} joker={joker} />
    </group>
  );
}

// Schmaler farbiger Dach-Rand als sichtbare Linie zwischen Fassade und Dach
function EixampleRoofRim({ color, outer, inner, chamfer, y }: {
  color: string; outer: number; inner: number; chamfer: number; y: number;
}) {
  const geom = useMemo(() => {
    const shape = chamferedRingShape(outer + 0.015, inner - 0.015, chamfer);
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: 0.015,
      bevelEnabled: false,
      curveSegments: 4,
    });
    g.rotateX(-Math.PI / 2);
    g.translate(0, y + 0.015, 0);
    return g;
  }, [outer, inner, chamfer, y]);
  return (
    <mesh geometry={geom}>
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.2} toneMapped={false} />
    </mesh>
  );
}

// Fensterreihen auf den 4 Haupt-Fassaden + 4 Schräg-Fassaden
function EixampleWindows({ outer, chamfer, h }: { outer: number; chamfer: number; h: number }) {
  const s = outer / 2;
  const flatLen = outer - 2 * chamfer;
  const diagLen = chamfer * Math.SQRT2;

  const rows = 2;
  const cols = 4;
  const winW = (flatLen / (cols + 1)) * 0.5;
  const winH = 0.08;
  const rowYs = [h * 0.32, h * 0.68];
  const winMat = (
    <meshStandardMaterial color="#fef3c7" emissive="#fbbf24" emissiveIntensity={0.9} toneMapped={false} />
  );

  const items: JSX.Element[] = [];

  // Pro Hauptfassade ein <group> das an die Seite gesetzt und rotiert wird.
  // Innen die Fenster im lokalen Raum (X = horizontal, Y = vertikal, Z = 0).
  type Side = { groupPos: [number, number, number]; groupRot: [number, number, number]; key: string };
  const mainSides: Side[] = [
    { groupPos: [0, 0, s + 0.003],  groupRot: [0, 0, 0],            key: 'S' },
    { groupPos: [0, 0, -s - 0.003], groupRot: [0, Math.PI, 0],      key: 'N' },
    { groupPos: [s + 0.003, 0, 0],  groupRot: [0, Math.PI / 2, 0],  key: 'E' },
    { groupPos: [-s - 0.003, 0, 0], groupRot: [0, -Math.PI / 2, 0], key: 'W' },
  ];
  mainSides.forEach((side) => {
    const winElements: JSX.Element[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const px = (c + 1) * (flatLen / (cols + 1)) - flatLen / 2;
        winElements.push(
          <mesh key={`${side.key}-${r}-${c}`} position={[px, rowYs[r], 0]}>
            <planeGeometry args={[winW, winH]} />
            {winMat}
          </mesh>
        );
      }
    }
    items.push(
      <group key={`side-${side.key}`} position={side.groupPos} rotation={side.groupRot}>
        {winElements}
      </group>
    );
  });

  // 4 Schräg-Fassaden (Chamfers) — je 1 Fenster-Reihe mit 2 Etagen
  const diagOffset = s - chamfer / 2 + 0.003;
  const diagSides: Side[] = [
    { groupPos: [ diagOffset, 0,  diagOffset], groupRot: [0,  Math.PI / 4, 0],      key: 'SE' },
    { groupPos: [-diagOffset, 0,  diagOffset], groupRot: [0, -Math.PI / 4, 0],      key: 'SW' },
    { groupPos: [ diagOffset, 0, -diagOffset], groupRot: [0,  3 * Math.PI / 4, 0],  key: 'NE' },
    { groupPos: [-diagOffset, 0, -diagOffset], groupRot: [0, -3 * Math.PI / 4, 0],  key: 'NW' },
  ];
  diagSides.forEach((side) => {
    const winElements: JSX.Element[] = [];
    for (let r = 0; r < rows; r++) {
      winElements.push(
        <mesh key={`${side.key}-${r}`} position={[0, rowYs[r], 0]}>
          <planeGeometry args={[diagLen * 0.45, winH]} />
          {winMat}
        </mesh>
      );
    }
    items.push(
      <group key={`side-${side.key}`} position={side.groupPos} rotation={side.groupRot}>
        {winElements}
      </group>
    );
  });

  return <>{items}</>;
}

// ─────────────────────────────────────────────────────────────────────────────
// STIL-WELTEN PROTOTYP — 3 Teams × 3 Gebäude
// Jeder Stil hat eigene Material-Palette (unabhängig von Team-Farbe als Body).
// Team-Farbe sitzt nur noch als Akzent (Fensterlichter, Dach, Flagge) auf der
// Stil-Fassade — so bleibt "Paris" immer als Paris lesbar, egal welche Farbe.
// ─────────────────────────────────────────────────────────────────────────────

// Material-Helfer (mehr als nur Farbe: eigene Roughness/Metalness pro Stil)
function m(color: string, roughness = 0.65, metalness = 0.0, emissive?: string, emissiveIntensity = 0): JSX.Element {
  return (
    <meshStandardMaterial
      color={color}
      roughness={roughness}
      metalness={metalness}
      emissive={emissive ?? '#000'}
      emissiveIntensity={emissiveIntensity}
    />
  );
}

// ═══ PARIS (Fox) ═════════════════════════════════════════════════════════════
// Creme-Fassade · Zink-blaues Mansard-Dach · schmiedeeiserne Balkone (dunkel) ·
// Team-Farbe als warmes Fensterlicht

const PARIS_WALL = '#f3e5c2';
const PARIS_ROOF = '#394b63';   // zinc blue
const PARIS_IRON = '#1c1f2a';

function ParisMansardRoof({ w, d, y, height = 0.28 }: { w: number; d: number; y: number; height?: number }) {
  // Angeschrägte Pyramide (Mansarddach) — schmalere Top-Box
  return (
    <group position={[0, y, 0]}>
      <mesh castShadow position={[0, height / 2, 0]}>
        <boxGeometry args={[w + 0.02, height, d + 0.02]} />
        {m(PARIS_ROOF, 0.55, 0.15)}
      </mesh>
      {/* Top flat cap schmaler → Trapezform-Andeutung */}
      <mesh castShadow position={[0, height + 0.015, 0]}>
        <boxGeometry args={[w * 0.75, 0.04, d * 0.75]} />
        {m(PARIS_ROOF, 0.55, 0.15)}
      </mesh>
    </group>
  );
}

// Balkon-Gitter als dünne dunkle Linie unterhalb einer Fensterreihe
function ParisBalcony({ w, y, z }: { w: number; y: number; z: number }) {
  return (
    <mesh position={[0, y, z + 0.005]}>
      <boxGeometry args={[w, 0.02, 0.01]} />
      {m(PARIS_IRON, 0.4, 0.6)}
    </mesh>
  );
}

// Parisian-Fensterreihe: Team-Farbe als warmes Licht
function ParisWindows({ w, d, rows, cols, startY, stepY, color }: {
  w: number; d: number; rows: number; cols: number; startY: number; stepY: number; color: string;
}) {
  const winW = (w / (cols + 1)) * 0.55;
  const winH = 0.09;
  const ps: JSX.Element[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const px = (c + 1) * (w / (cols + 1)) - w / 2;
      const py = startY + r * stepY;
      ps.push(
        <mesh key={`pw-${r}-${c}`} position={[px, py, d / 2 + 0.002]}>
          <planeGeometry args={[winW, winH]} />
          <meshStandardMaterial color="#fef3c7" emissive={color} emissiveIntensity={1.3} toneMapped={false} />
        </mesh>
      );
    }
  }
  return <>{ps}</>;
}

// Paris S — Haussmann-Bürgerhaus (5 Etagen, Mansarddach, Balkon)
function ParisHouse({ color, joker, tex }: BProps) {
  const w = 0.9, d = 0.85, h = 0.95;
  return (
    <group>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        {m(PARIS_WALL, 0.7, 0.05, joker ? '#fbbf24' : undefined, joker ? 0.2 : 0)}
      </mesh>
      <ParisMansardRoof w={w} d={d} y={h} height={0.24} />
      <ParisWindows w={w} d={d} rows={4} cols={3} startY={0.18} stepY={0.18} color={color} />
      <ParisBalcony w={w * 0.95} y={0.36} z={d / 2} />
      {/* Eingang (dunkles Tor mittig) */}
      <mesh position={[0, 0.12, d / 2 + 0.002]}>
        <planeGeometry args={[0.14, 0.22]} />
        {m(PARIS_IRON, 0.5, 0.2)}
      </mesh>
      <RoofAvatar tex={tex} y={h + 0.3} joker={joker} />
    </group>
  );
}

// Paris M — Sacré-Cœur-artige Basilika (große Kuppel + Türmchen)
function ParisBasilica({ color, joker, tex }: BProps) {
  const w = 0.85, d = 0.85, h = 0.5;
  return (
    <group>
      {/* Basis */}
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        {m(PARIS_WALL, 0.7, 0.05, joker ? '#fbbf24' : undefined, joker ? 0.2 : 0)}
      </mesh>
      {/* Tambour (runder Sockel unter Kuppel) */}
      <mesh position={[0, h + 0.1, 0]} castShadow>
        <cylinderGeometry args={[0.24, 0.28, 0.2, 24]} />
        {m(PARIS_WALL, 0.65, 0.1)}
      </mesh>
      {/* Haupt-Kuppel */}
      <mesh position={[0, h + 0.2, 0]} castShadow>
        <sphereGeometry args={[0.26, 24, 18, 0, Math.PI * 2, 0, Math.PI / 2]} />
        {m('#e8e4d5', 0.45, 0.2)}
      </mesh>
      {/* Zwei kleine Ecktürmchen */}
      {[[-w / 2 + 0.1, d / 2 - 0.1], [w / 2 - 0.1, d / 2 - 0.1]].map(([tx, tz], i) => (
        <group key={i} position={[tx, h, tz]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.05, 0.06, 0.18, 12]} />
            {m(PARIS_WALL)}
          </mesh>
          <mesh position={[0, 0.12, 0]} castShadow>
            <sphereGeometry args={[0.055, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
            {m('#e8e4d5', 0.45, 0.2)}
          </mesh>
        </group>
      ))}
      {/* Großes Rosetten-Fenster in Team-Farbe */}
      <mesh position={[0, h * 0.6, d / 2 + 0.002]}>
        <circleGeometry args={[0.12, 32]} />
        <meshStandardMaterial color="#fef3c7" emissive={color} emissiveIntensity={2.4} toneMapped={false} />
      </mesh>
      <RoofAvatar tex={tex} y={h + 0.48} joker={joker} />
    </group>
  );
}

// Paris L — Eiffelturm (4 geneigte Beine → Plattform → 2 Stufen → Spitze)
function ParisEiffel({ color, joker, tex }: BProps) {
  return (
    <group>
      {/* 4 geneigte Beine */}
      {[[-0.22, -0.22, 0.16, 0, 0.11, 0], [0.22, -0.22, -0.16, 0, 0.11, 0],
        [-0.22, 0.22, 0.16, 0, -0.11, 0], [0.22, 0.22, -0.16, 0, -0.11, 0]].map((v, i) => (
        <mesh key={i} position={[v[0] * 0.6, 0.3, v[1] * 0.6]} rotation={[v[2], v[3], v[4]]} castShadow>
          <boxGeometry args={[0.035, 0.6, 0.035]} />
          {m('#d4a574', 0.5, 0.4, joker ? '#fbbf24' : undefined, joker ? 0.15 : 0)}
        </mesh>
      ))}
      {/* Plattform 1 */}
      <mesh position={[0, 0.58, 0]} castShadow>
        <boxGeometry args={[0.34, 0.04, 0.34]} />
        {m('#b8895a', 0.55, 0.3)}
      </mesh>
      {/* Mittelteil */}
      <mesh position={[0, 0.82, 0]} castShadow>
        <boxGeometry args={[0.2, 0.45, 0.2]} />
        {m('#d4a574', 0.5, 0.4)}
      </mesh>
      {/* Plattform 2 */}
      <mesh position={[0, 1.07, 0]} castShadow>
        <boxGeometry args={[0.22, 0.035, 0.22]} />
        {m('#b8895a', 0.55, 0.3)}
      </mesh>
      {/* Spitze */}
      <mesh position={[0, 1.26, 0]} castShadow>
        <coneGeometry args={[0.09, 0.35, 4]} />
        {m('#d4a574', 0.5, 0.4)}
      </mesh>
      {/* Leuchtender Team-Farb-Punkt auf der Spitze */}
      <mesh position={[0, 1.46, 0]}>
        <sphereGeometry args={[0.03, 14, 10]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={3.5} toneMapped={false} />
      </mesh>
      <RoofAvatar tex={tex} y={1.58} joker={joker} />
    </group>
  );
}

// ═══ KYOTO (Frog) ════════════════════════════════════════════════════════════
// Dunkles Holz · geschwungene schwarze Dächer · weißer Putz · Team-Farbe als
// Lampion-Akzent

const KYOTO_WOOD = '#6b4a2b';
const KYOTO_ROOF = '#1c1a1f';
const KYOTO_WALL = '#f4ead5';

function KyotoRoof({ w, d, y, overhang = 0.12, height = 0.14 }: {
  w: number; d: number; y: number; overhang?: number; height?: number;
}) {
  // Schwungdach-Andeutung: breites flaches Prisma + abgerundete Ecken via kleine Kegel-Enden
  return (
    <group position={[0, y, 0]}>
      <mesh castShadow position={[0, height / 2, 0]}>
        <boxGeometry args={[w + overhang * 2, height, d + overhang * 2]} />
        {m(KYOTO_ROOF, 0.7, 0.1)}
      </mesh>
      {/* Nach oben geneigter oberer Dachgrat */}
      <mesh castShadow position={[0, height + 0.04, 0]}>
        <boxGeometry args={[w + overhang * 1.4, 0.04, d + overhang * 1.4]} />
        {m(KYOTO_ROOF, 0.7, 0.1)}
      </mesh>
      {/* Dachfirst */}
      <mesh position={[0, height + 0.07, 0]}>
        <boxGeometry args={[w + overhang * 1.6, 0.02, 0.05]} />
        {m('#0f0d10', 0.7, 0.1)}
      </mesh>
    </group>
  );
}

// Lampion in Team-Farbe (klein, emissive)
function KyotoLampion({ y, x = 0, z = 0, color }: { y: number; x?: number; z?: number; color: string }) {
  return (
    <mesh position={[x, y, z]}>
      <sphereGeometry args={[0.05, 14, 10]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.2} toneMapped={false} />
    </mesh>
  );
}

// Kyoto S — Shōya-Holzhaus (niedrig, Schwungdach, Schiebetüren)
function KyotoShoya({ color, joker, tex }: BProps) {
  const w = 0.92, d = 0.78, h = 0.35;
  return (
    <group>
      {/* Holz-Unterbau */}
      <mesh position={[0, 0.06, 0]} castShadow receiveShadow>
        <boxGeometry args={[w + 0.04, 0.12, d + 0.04]} />
        {m(KYOTO_WOOD, 0.75, 0.1)}
      </mesh>
      {/* Weiße Putz-Wand */}
      <mesh position={[0, 0.12 + h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        {m(KYOTO_WALL, 0.7, 0.0, joker ? '#fbbf24' : undefined, joker ? 0.2 : 0)}
      </mesh>
      {/* Holzrahmen-Gitter auf Front (Schiebetüren) */}
      {[-0.25, 0, 0.25].map((px, i) => (
        <mesh key={i} position={[px, 0.25, d / 2 + 0.002]}>
          <planeGeometry args={[0.18, h - 0.05]} />
          <meshStandardMaterial color="#d4c598" emissive={color} emissiveIntensity={0.6} toneMapped={false} />
        </mesh>
      ))}
      {/* Horizontale Holz-Balken */}
      <mesh position={[0, 0.12, d / 2 + 0.003]}>
        <planeGeometry args={[w, 0.02]} />
        {m(KYOTO_WOOD)}
      </mesh>
      <mesh position={[0, 0.12 + h, d / 2 + 0.003]}>
        <planeGeometry args={[w, 0.025]} />
        {m(KYOTO_WOOD)}
      </mesh>
      <KyotoRoof w={w} d={d} y={0.12 + h} overhang={0.16} height={0.12} />
      <KyotoLampion x={-w / 2 + 0.1} y={0.28} z={d / 2 + 0.08} color={color} />
      <KyotoLampion x={w / 2 - 0.1} y={0.28} z={d / 2 + 0.08} color={color} />
      <RoofAvatar tex={tex} y={0.12 + h + 0.3} joker={joker} />
    </group>
  );
}

// Kyoto M — Torii-Tor + kleiner Schrein dahinter
function KyotoTorii({ color, joker, tex }: BProps) {
  return (
    <group>
      {/* Torii: zwei Säulen + zwei Querbalken */}
      <mesh position={[-0.3, 0.3, 0.2]} castShadow>
        <cylinderGeometry args={[0.04, 0.045, 0.6, 12]} />
        {m('#c24a3a', 0.55, 0.1, joker ? '#fbbf24' : undefined, joker ? 0.2 : 0)}
      </mesh>
      <mesh position={[0.3, 0.3, 0.2]} castShadow>
        <cylinderGeometry args={[0.04, 0.045, 0.6, 12]} />
        {m('#c24a3a', 0.55, 0.1)}
      </mesh>
      {/* Oberer Querbalken (geschwungen, dicker + länger) */}
      <mesh position={[0, 0.65, 0.2]} castShadow>
        <boxGeometry args={[0.78, 0.06, 0.08]} />
        {m('#1c1a1f', 0.7, 0.1)}
      </mesh>
      {/* Unterer Querbalken */}
      <mesh position={[0, 0.55, 0.2]} castShadow>
        <boxGeometry args={[0.68, 0.04, 0.06]} />
        {m('#c24a3a', 0.55, 0.1)}
      </mesh>
      {/* Mittelstempel oben */}
      <mesh position={[0, 0.72, 0.2]}>
        <boxGeometry args={[0.08, 0.05, 0.07]} />
        {m('#1c1a1f')}
      </mesh>
      {/* Schrein dahinter (niedriger Holz-Bau) */}
      <mesh position={[0, 0.16, -0.22]} castShadow>
        <boxGeometry args={[0.55, 0.32, 0.4]} />
        {m(KYOTO_WALL, 0.7)}
      </mesh>
      <KyotoRoof w={0.55} d={0.4} y={0.32} overhang={0.14} height={0.1} />
      {/* Schrein-Front: leuchtendes Quadrat (Kerzen) */}
      <mesh position={[0, 0.18, -0.02]}>
        <planeGeometry args={[0.22, 0.14]} />
        <meshStandardMaterial color="#fef3c7" emissive={color} emissiveIntensity={2.0} toneMapped={false} />
      </mesh>
      {/* Lampions an den Säulen */}
      <KyotoLampion x={-0.3} y={0.12} z={0.28} color={color} />
      <KyotoLampion x={0.3} y={0.12} z={0.28} color={color} />
      <RoofAvatar tex={tex} y={0.85} joker={joker} />
    </group>
  );
}

// Kyoto L — 3-stöckige Pagode (je schmaler nach oben, Schwungdächer)
function KyotoPagoda({ color, joker, tex }: BProps) {
  const levels = [
    { w: 0.85, d: 0.85, h: 0.26, y: 0 },
    { w: 0.68, d: 0.68, h: 0.24, y: 0.4 },
    { w: 0.5,  d: 0.5,  h: 0.22, y: 0.78 },
  ];
  return (
    <group>
      {/* Holz-Sockel */}
      <mesh position={[0, 0.04, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.95, 0.08, 0.95]} />
        {m(KYOTO_WOOD, 0.75)}
      </mesh>
      {levels.map((L, i) => (
        <group key={i}>
          {/* Body */}
          <mesh position={[0, L.y + L.h / 2 + 0.08, 0]} castShadow receiveShadow>
            <boxGeometry args={[L.w, L.h, L.d]} />
            {m(KYOTO_WALL, 0.7, 0.0, joker ? '#fbbf24' : undefined, joker ? 0.18 : 0)}
          </mesh>
          {/* Fenster-Akzent pro Stockwerk in Team-Farbe */}
          <mesh position={[0, L.y + L.h / 2 + 0.08, L.d / 2 + 0.002]}>
            <planeGeometry args={[L.w * 0.45, L.h * 0.5]} />
            <meshStandardMaterial color="#fef3c7" emissive={color} emissiveIntensity={1.6} toneMapped={false} />
          </mesh>
          {/* Geschwungenes Dach */}
          <KyotoRoof w={L.w} d={L.d} y={L.y + L.h + 0.08} overhang={0.14} height={0.1} />
        </group>
      ))}
      {/* Spitze (dünner Turm + Spitzring) */}
      <mesh position={[0, 1.25, 0]} castShadow>
        <cylinderGeometry args={[0.012, 0.018, 0.24, 10]} />
        {m('#c9a14a', 0.4, 0.7)}
      </mesh>
      {[0.08, 0.14, 0.2].map((yp, i) => (
        <mesh key={i} position={[0, 1.13 + yp, 0]}>
          <torusGeometry args={[0.03, 0.006, 8, 18]} />
          {m('#c9a14a', 0.4, 0.7)}
        </mesh>
      ))}
      <RoofAvatar tex={tex} y={1.45} joker={joker} />
    </group>
  );
}

// ═══ SANTORINI (Rabbit) ═══════════════════════════════════════════════════════
// Weißer Putz · blaue Kuppeln · Kykladen-Würfel · Team-Farbe als Tür/Fenster

const SANT_WALL = '#f8f5ed';
const SANT_DOME = '#2e6fb5';   // Aegean blue
const SANT_SHADOW = '#e2dccb';

// Santorin S — schichtiger weißer Kubus-Stack
function SantoriniCube({ color, joker, tex }: BProps) {
  return (
    <group>
      {/* Unterste Schicht (breit, flach) */}
      <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.95, 0.2, 0.8]} />
        {m(SANT_WALL, 0.85, 0.0, joker ? '#fbbf24' : undefined, joker ? 0.2 : 0)}
      </mesh>
      {/* Mittlere Schicht (leicht versetzt) */}
      <mesh position={[0.06, 0.32, -0.06]} castShadow>
        <boxGeometry args={[0.65, 0.24, 0.55]} />
        {m(SANT_WALL, 0.85)}
      </mesh>
      {/* Obere Schicht */}
      <mesh position={[-0.1, 0.54, 0.04]} castShadow>
        <boxGeometry args={[0.4, 0.2, 0.35]} />
        {m(SANT_WALL, 0.85)}
      </mesh>
      {/* Schatten-Wangen an den Übergängen */}
      <mesh position={[0.06, 0.2, -0.06]}>
        <boxGeometry args={[0.66, 0.015, 0.56]} />
        {m(SANT_SHADOW, 0.9)}
      </mesh>
      {/* Tür in Team-Farbe */}
      <mesh position={[0, 0.12, 0.4 + 0.002]}>
        <planeGeometry args={[0.1, 0.18]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
      {/* Zwei kleine blaue Fensterläden */}
      {[-0.22, 0.22].map((xp, i) => (
        <mesh key={i} position={[xp, 0.14, 0.4 + 0.002]}>
          <planeGeometry args={[0.1, 0.1]} />
          {m(SANT_DOME, 0.4, 0.2, color, 0.6)}
        </mesh>
      ))}
      <RoofAvatar tex={tex} y={0.66} joker={joker} />
    </group>
  );
}

// Santorin M — Kuppelkirche (weißer Würfel + blaue Halbkugel + Glocken-Bogen)
function SantoriniDome({ color, joker, tex }: BProps) {
  return (
    <group>
      <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.75, 0.44, 0.75]} />
        {m(SANT_WALL, 0.85, 0.0, joker ? '#fbbf24' : undefined, joker ? 0.2 : 0)}
      </mesh>
      {/* Tambour */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.25, 0.1, 20]} />
        {m(SANT_WALL, 0.85)}
      </mesh>
      {/* Blaue Kuppel */}
      <mesh position={[0, 0.55, 0]} castShadow>
        <sphereGeometry args={[0.24, 24, 18, 0, Math.PI * 2, 0, Math.PI / 2]} />
        {m(SANT_DOME, 0.35, 0.4)}
      </mesh>
      {/* Kreuz oben */}
      <group position={[0, 0.82, 0]}>
        <mesh><boxGeometry args={[0.015, 0.1, 0.015]} />{m('#ffffff', 0.4, 0.3, color, 1.2)}</mesh>
        <mesh position={[0, 0.01, 0]}><boxGeometry args={[0.06, 0.015, 0.015]} />{m('#ffffff', 0.4, 0.3, color, 1.2)}</mesh>
      </group>
      {/* Glocken-Bogen seitlich (kleine Mauer mit Loch) */}
      <mesh position={[-0.45, 0.32, 0]} castShadow>
        <boxGeometry args={[0.14, 0.38, 0.18]} />
        {m(SANT_WALL, 0.85)}
      </mesh>
      <mesh position={[-0.45, 0.38, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 0.06, 18]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.8} toneMapped={false} />
      </mesh>
      {/* Blaue Tür */}
      <mesh position={[0, 0.15, 0.375 + 0.002]}>
        <planeGeometry args={[0.12, 0.22]} />
        {m(SANT_DOME, 0.4, 0.2, color, 0.8)}
      </mesh>
      <RoofAvatar tex={tex} y={0.95} joker={joker} />
    </group>
  );
}

// Santorin L — Windmühle (runder Turm + kegelförmiges Dach + 4 Segel)
function SantoriniMill({ color, joker, tex }: BProps) {
  const millRef = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (millRef.current) millRef.current.rotation.z = state.clock.elapsedTime * 0.6;
  });
  return (
    <group>
      {/* Turm */}
      <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.3, 0.34, 1.2, 24]} />
        {m(SANT_WALL, 0.85, 0.0, joker ? '#fbbf24' : undefined, joker ? 0.2 : 0)}
      </mesh>
      {/* Kleine Fensterchen in Team-Farbe */}
      {[0.35, 0.75, 1.0].map((yp, i) => (
        <mesh key={i} position={[0, yp, 0.32]}>
          <planeGeometry args={[0.08, 0.08]} />
          <meshStandardMaterial color="#fef3c7" emissive={color} emissiveIntensity={1.6} toneMapped={false} />
        </mesh>
      ))}
      {/* Kegel-Dach */}
      <mesh position={[0, 1.3, 0]} castShadow>
        <coneGeometry args={[0.34, 0.28, 24]} />
        {m(SANT_DOME, 0.4, 0.3)}
      </mesh>
      {/* Nabe + rotierende Segel */}
      <group position={[0, 0.85, 0.34]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.045, 0.045, 0.08, 16]} />
          {m('#3a2e20', 0.55, 0.1)}
        </mesh>
        <group ref={millRef} position={[0, 0, 0.04]}>
          {[0, Math.PI / 2, Math.PI, 3 * Math.PI / 2].map((a, i) => (
            <mesh key={i} rotation={[0, 0, a]}>
              <boxGeometry args={[0.06, 0.42, 0.01]} />
              <meshStandardMaterial color="#f8f5ed" emissive={color} emissiveIntensity={0.35} toneMapped={false} />
            </mesh>
          ))}
        </group>
      </group>
      <RoofAvatar tex={tex} y={1.6} joker={joker} />
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GENERISCHE GEBÄUDE (Fallback für noch nicht umgesetzte Teams)
// ─────────────────────────────────────────────────────────────────────────────

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
