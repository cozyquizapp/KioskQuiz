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
import { EffectComposer, Vignette, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { QQ_AVATARS } from '@shared/quarterQuizTypes';

// Map QQ-Avatar-Id → Anzeige-Info (Name, Farbe, Emoji) direkt aus shared.
type AvatarKey = typeof QQ_AVATARS[number]['id'];

const AVATARS: Record<AvatarKey, { name: string; color: string; emoji: string; image: string }> =
  QQ_AVATARS.reduce((acc, a) => {
    acc[a.id as AvatarKey] = {
      name: a.label, color: a.color, emoji: a.emoji,
      image: `/avatars/cozy-cast/avatar-${a.slug}.png`,
    };
    return acc;
  }, {} as Record<AvatarKey, { name: string; color: string; emoji: string; image: string }>);

type Cell = {
  owner: AvatarKey | null;
  joker?: boolean;     // Goldenes Glow-Dach (Event-Feld vom Quiz)
  frozen?: boolean;    // Eis-Dach (Team darf Zelle nicht verlieren)
  stacked?: number;    // 0 = normal, 1+ = höheres Haus pro Level
};

// 7×7 Grid — Mix aus eingenommenen Blöcken (Team-farbig) + unbebauten
// Plazas (Parks mit Bäumen/Brunnen) für den nötigen Kontrast.
// Joker-Zelle in der Mitte für Demo-Zwecke.
const DEMO_GRID: Cell[][] = [
  [{ owner: 'fox' },     { owner: null },      { owner: 'frog', stacked: 2 }, { owner: 'frog' },   { owner: null },      { owner: 'panda' },   { owner: 'panda' }],
  [{ owner: 'fox' },     { owner: 'cat', frozen: true }, { owner: null },     { owner: 'frog' },   { owner: 'panda' },   { owner: null },      { owner: 'cat' }],
  [{ owner: null },      { owner: 'cat' },     { owner: 'unicorn' },          { owner: 'unicorn', stacked: 1 }, { owner: 'unicorn' }, { owner: 'cat' },     { owner: null }],
  [{ owner: 'cow' },     { owner: null },      { owner: 'unicorn' },          { owner: 'rabbit', joker: true }, { owner: 'unicorn' }, { owner: null },      { owner: 'raccoon' }],
  [{ owner: null },      { owner: 'cow' },     { owner: 'rabbit' },           { owner: null },     { owner: 'raccoon', frozen: true }, { owner: 'raccoon' }, { owner: null }],
  [{ owner: 'cow' },     { owner: 'unicorn', stacked: 1 }, { owner: null },   { owner: 'rabbit' }, { owner: null },      { owner: 'frog' },    { owner: 'panda' }],
  [{ owner: 'fox' },     { owner: null },      { owner: 'cat' },              { owner: 'unicorn' },{ owner: 'cow' },     { owner: null },      { owner: 'panda' }],
];

const SIZE = 7;
const TILE = 1.6;
const OFFSET = ((SIZE - 1) * TILE) / 2;

type Variant = 1 | 2 | 3 | 4 | 5;

// ── Cluster-Sizes BFS (4er-Nachbarschaft) ─────────────────────────────────
// Wird einmal beim Modul-Load berechnet. Variant 4 nutzt diese Map, um die
// Hoehe der Tier-Haeuser proportional zur verbundenen Territoriumsgroesse
// wachsen zu lassen — kleines Cluster = kleine Huette, grosses = Tower.
function computeClusterSizes(grid: Cell[][]): Map<string, number> {
  const visited = new Set<string>();
  const sizes = new Map<string, number>();
  const rows = grid.length;
  const cols = grid[0].length;
  const k = (r: number, c: number) => `${r}-${c}`;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const owner = grid[r][c].owner;
      if (!owner || visited.has(k(r, c))) continue;
      const cluster: Array<[number, number]> = [];
      const queue: Array<[number, number]> = [[r, c]];
      while (queue.length > 0) {
        const [rr, cc] = queue.shift()!;
        if (rr < 0 || rr >= rows || cc < 0 || cc >= cols) continue;
        if (visited.has(k(rr, cc))) continue;
        if (grid[rr][cc].owner !== owner) continue;
        visited.add(k(rr, cc));
        cluster.push([rr, cc]);
        queue.push([rr - 1, cc], [rr + 1, cc], [rr, cc - 1], [rr, cc + 1]);
      }
      cluster.forEach(([rr, cc]) => sizes.set(k(rr, cc), cluster.length));
    }
  }
  return sizes;
}
const CLUSTER_SIZES: Map<string, number> = computeClusterSizes(DEMO_GRID);

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

// Lädt eine Avatar-PNG (cozy-cast) als Three.js-Texture. Async-Load —
// Texture wird beim Mount blank initialisiert und beim Bild-Empfang neu
// gerendert. SRGB-Colorspace, sonst werden die Avatare zu hell.
function useAvatarImageTexture(imageUrl: string): THREE.Texture {
  return useMemo(() => {
    const tex = new THREE.TextureLoader().load(imageUrl);
    tex.anisotropy = 8;
    (tex as any).colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [imageUrl]);
}

// ─────────────────────────────────────────────────────────────────────────────
// ExtrudedAvatar — flacher Sprite wird durch Z-Layer-Stacking zu einem
// fake-volumetrischen Modell. Trick: 8-12 Planes mit gleicher Avatar-Textur
// werden mit minimalem Z-Versatz hintereinander gestapelt; alphaTest haut
// die transparenten Bereiche raus, sodass nur die Avatar-Silhouette in
// Z-Richtung extrudiert wird. Layer in der Mitte werden subtil abgedunkelt
// (fake-AO) → das Auge liest „echte Tiefe", obwohl alles aus 2D-Planes
// besteht. Funktioniert exakt wie Canvas „3D Maker"-Output.
function ExtrudedAvatar({
  texture, size = 0.5, depth = 0.07, layers = 10,
}: {
  texture: THREE.Texture; size?: number; depth?: number; layers?: number;
}) {
  return (
    <group>
      {Array.from({ length: layers }).map((_, i) => {
        const z = (i / (layers - 1) - 0.5) * depth;
        // Front (i = layers-1) ist hellster Layer, mittlere Layer dunkler
        // (fake-AO), back (i = 0) wieder leicht heller. Erzeugt sichtbare
        // Tiefe ohne explizites Lighting.
        const fromFront = (layers - 1 - i) / (layers - 1);
        const aoCenter = 1 - 4 * fromFront * (1 - fromFront); // 0 an den Enden, 1 in der Mitte
        const tint = 1.0 - aoCenter * 0.35;
        return (
          <mesh key={i} position={[0, 0, z]}>
            <planeGeometry args={[size, size]} />
            <meshBasicMaterial
              map={texture}
              transparent
              alphaTest={0.5}
              color={new THREE.Color(tint, tint, tint)}
              side={THREE.DoubleSide}
              toneMapped={false}
              depthWrite={i === layers - 1}
            />
          </mesh>
        );
      })}
    </group>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

type EmptyStyle = 'plaza' | 'brache' | 'beige' | 'ghost';

export default function QQCityLabPage() {
  const [variant, setVariant] = useState<Variant>(1);
  const [showAll, setShowAll] = useState(false);
  const [emptyStyle, setEmptyStyle] = useState<EmptyStyle>('plaza');

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

        {/* Empty-Style-Picker — 4 Varianten für unbesetzte Felder */}
        <div style={{
          marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap',
          justifyContent: 'center', alignItems: 'center',
        }}>
          <span style={{ fontSize: 13, opacity: 0.7, marginRight: 6 }}>Freie Felder:</span>
          {([
            { id: 'plaza',  label: '① Plaza-Park' },
            { id: 'brache', label: '② Brache'     },
            { id: 'beige',  label: '③ Beige-Haus' },
            { id: 'ghost',  label: '④ Ghost-Haus' },
          ] as const).map(opt => (
            <button key={opt.id} onClick={() => setEmptyStyle(opt.id)} style={{
              padding: '6px 14px', borderRadius: 999,
              border: emptyStyle === opt.id ? '2px solid #F59E0B' : '1px solid rgba(255,255,255,0.15)',
              background: emptyStyle === opt.id ? 'rgba(245,158,11,0.18)' : 'rgba(255,255,255,0.05)',
              color: '#e2e8f0', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            }}>{opt.label}</button>
          ))}
        </div>

        {showAll ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 18, marginTop: 28 }}>
            {VARIANTS.map(v => (
              <Card key={v.id} title={v.title} subtitle={v.sub} accent={v.accent}>
                <SceneHost variant={v.id} emptyStyle={emptyStyle} />
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
                <SceneHost variant={variant} big emptyStyle={emptyStyle} />
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
  { id: 3, title: '③ 2D-Plan (Morph-Base)', sub: 'Flacher Stadtplan mit Straßen + Innenhöfen — gleiche Topologie wie 3D, morphbar', accent: '#10B981' },
  { id: 4, title: '④ Habitat (Tier-Häuser)', sub: 'Häuschen wachsen mit Cluster-Größe · Pagode bei Stapel · Joker-Sparkle-Ring', accent: '#EC4899' },
  { id: 5, title: '⑤ Lantern Field 🏮', sub: 'Schwebende Papier-Laternen in Teamfarbe · Pagoden-Stapel-Tower · Embers · Bloom-Glow', accent: '#FB923C' },
];

// Gebäude-Typ pro Zelle deterministisch bestimmen (wie QQ3DGrid-Ansatz)
const BTYPE_NAMES = ['Haus', 'Turm', 'Hochhaus', 'Laden', 'Fabrik', 'Kirche', 'Burg', 'Silo'];
function cellBType(r: number, c: number): number {
  return (r * 5 + c * 3 + 1) % 8;
}

// ── Scene ──────────────────────────────────────────────────────────────────

function SceneHost({ variant, big, emptyStyle = 'plaza' }: { variant: Variant; big?: boolean; emptyStyle?: EmptyStyle }) {
  const h = big ? 560 : 360;
  // Variante 3: 2D-Plan mit identischer Topologie (Straßen + Innenhöfe).
  // Rendert keine Canvas/Three — das ist der Morph-Ausgangspunkt.
  if (variant === 3) {
    return (
      <div style={{ width: '100%', height: h, borderRadius: 12, overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'radial-gradient(ellipse at center, #1e293b 0%, #0b0d14 70%, #020617 100%)',
        position: 'relative',
      }}>
        <Grid2DTopDown emptyStyle={emptyStyle} />
      </div>
    );
  }
  // Variant 5 (Lantern Field) bekommt eigenes Setting: dunklerer Hintergrund,
  // schwächere Ambient/Direct-Lights damit die Laternen-Emissive-Glows als
  // Hauptlichtquelle wirken — Bloom-Pipeline pusht das in „derbe Wow".
  const isLantern = variant === 5;
  const bgColor = isLantern ? '#04060c' : '#0b0d14';

  return (
    <div style={{ width: '100%', height: h, borderRadius: 12, overflow: 'hidden' }}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [11, 10.5, 13], fov: 32 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: isLantern ? 0.85 : 1.0 }}
      >
        {/* Epischer Nacht-Look, konsistent mit dem Beamer-Theme */}
        <color attach="background" args={[bgColor]} />
        <fog attach="fog" args={[bgColor, isLantern ? 12 : 16, isLantern ? 32 : 38]} />

        {/* Dezente Umgebungsfüllung — bei Laternen-Variante stark gedimmt,
            damit die emissive Laternen-Glows wirklich der Hauptbeleuchter sind. */}
        <hemisphereLight args={['#6d80a8', '#2a1f14', isLantern ? 0.16 : 0.55]} />

        {/* Key-Light: warmer Amber-Spot, wie das Beamer-Theme — bei Laternen
            stark reduziert, sonst würde es die Lanterns überstrahlen. */}
        <directionalLight
          position={[6, 18, 6]}
          intensity={isLantern ? 0.35 : 1.6}
          color={isLantern ? '#a08070' : '#ffc880'}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-left={-14}
          shadow-camera-right={14}
          shadow-camera-top={14}
          shadow-camera-bottom={-14}
          shadow-camera-near={0.5}
          shadow-camera-far={40}
          shadow-bias={-0.0003}
          shadow-radius={6}
        />
        {/* Rim-Light gegenüberliegend, kühler Akzent */}
        <directionalLight position={[-6, 10, -6]} intensity={0.4} color="#7c9cff" />

        {/* Boden: Variante 5 hat einen Lake-Reflector statt Asphalt — die
            Laternen spiegeln sich nach unten, doppelter Wow-Effekt. */}
        {isLantern ? <LanternPondGround /> : <Ground />}
        {variant === 1 && <Streets />}
        {variant === 1 && <ChaflanPlazas />}
        {variant === 1 && <StreetTrees />}
        {!isLantern && variant !== 1 && <GridLines />}
        {isLantern && <LanternGridLines />}

        {/* Embers — schwebende Glühpartikel, nur in Variant 5. */}
        {isLantern && <Embers count={75} />}

        {DEMO_GRID.flatMap((row, r) => row.map((cell, c) => {
          const x = (c * TILE) - OFFSET;
          const z = (r * TILE) - OFFSET;
          const key = `${r}-${c}`;
          const owner = cell.owner;
          const joker = !!cell.joker;

          if (variant === 1) {
            if (!owner) {
              const seed = r * 11 + c * 7;
              if (emptyStyle === 'plaza')  return <Plaza key={key} x={x} z={z} seed={seed} />;
              if (emptyStyle === 'brache') return <Brache key={key} x={x} z={z} seed={seed} />;
              // 'beige' + 'ghost' rendern leeres Haus im Barcelona-Stil
              return (
                <BarcelonaCell
                  key={key}
                  x={x}
                  z={z}
                  seed={r * 31 + c * 17}
                  joker={false}
                  teamColor={undefined}
                  avatarEmoji={undefined}
                  emptyVariant={emptyStyle === 'beige' ? 'beige' : 'ghost'}
                />
              );
            }
            const avatar = AVATARS[owner];
            return (
              <BarcelonaCell
                key={key}
                x={x}
                z={z}
                seed={r * 31 + c * 17}
                joker={joker}
                teamColor={avatar.color}
                avatarEmoji={avatar.emoji}
                frozen={cell.frozen}
                stacked={cell.stacked ?? 0}
              />
            );
          }

          if (!owner) {
            if (variant === 4) return <MeadowMound key={key} x={x} z={z} seed={r * 11 + c * 7} />;
            if (variant === 5) return <DarkStoneTile key={key} x={x} z={z} seed={r * 11 + c * 7} />;
            return <EmptyPlot key={key} x={x} z={z} />;
          }
          const avatar = AVATARS[owner];
          if (variant === 2) return <PedestalFigure key={key} x={x} z={z} avatar={avatar} joker={joker} seed={r * 5 + c} />;
          if (variant === 4) {
            return (
              <HabitatCell
                key={key}
                x={x} z={z}
                avatar={avatar}
                joker={joker}
                stacked={cell.stacked ?? 0}
                frozen={!!cell.frozen}
                clusterSize={CLUSTER_SIZES.get(`${r}-${c}`) ?? 1}
                seed={r * 7 + c * 3}
              />
            );
          }
          if (variant === 5) {
            return (
              <LanternCell
                key={key}
                x={x} z={z}
                avatar={avatar}
                joker={joker}
                stacked={cell.stacked ?? 0}
                frozen={!!cell.frozen}
                seed={r * 13 + c * 9}
              />
            );
          }
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

        {/* Post-Processing — Variant 5 mit Bloom fuer das richtige Laternen-
            Glow-Drama; Vignette dunkler. Andere Varianten bleiben dezent. */}
        {isLantern ? (
          <EffectComposer multisampling={0}>
            <Bloom
              luminanceThreshold={0.32}
              luminanceSmoothing={0.5}
              intensity={1.15}
              mipmapBlur
              radius={0.78}
            />
            <Vignette eskil={false} offset={0.4} darkness={0.62} />
          </EffectComposer>
        ) : (
          <EffectComposer multisampling={0}>
            <Vignette eskil={false} offset={0.4} darkness={0.35} />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Grid2DTopDown — 2D-Plan der exakt gleichen Topologie wie das 3D-Grid.
// Jede Zelle ist ein Block-Quadrat mit Innenhof-Fenster in der Mitte;
// zwischen den Zellen liegt das Straßenraster (Gaps). Dachfarbe (Team)
// erscheint als Ring um den Innenhof — exakt die gleiche Schicht-Logik wie
// im 3D-BarcelonaBlock (Plinth → Fassade → Dach → Innenhof-Plateau).
// Damit lässt sich jede 2D-Zelle beim Morph direkt zu ihrem 3D-Gegenstück
// extrudieren (Translate x/z gleich, Höhe interpoliert 0 → heightBase).
// ─────────────────────────────────────────────────────────────────────────────
function Grid2DTopDown({ emptyStyle }: { emptyStyle: EmptyStyle }) {
  // Zelle = Roof-Quadrat mit abgeschrägten Ecken (chaflán), Innenhof in der
  // Mitte, Straßen als Gap um die Zelle herum. Genau wie in Barcelona-Eixample.
  const CELL = 88;          // px pro Zelle (Block + Dach)
  const GAP  = 14;          // px Straßenbreite zwischen Zellen (~15% des Tile)
  const CHAMFER_PCT = 18;   // % der Zellenbreite = Eckabschrägung (wie CHAMFER in 3D)
  const INNER_PCT = 46;     // % der Zellenbreite = Innenhof (INNER/OUTER ≈ 0.58/1.22)
  const rows = DEMO_GRID.length;
  const cols = DEMO_GRID[0].length;
  const w = cols * CELL + (cols + 1) * GAP;
  const h = rows * CELL + (rows + 1) * GAP;

  // Chaflán-Polygon: 8-Eck mit abgeschrägten Ecken — matcht chamferedSquareShape in 3D.
  const chaflanClip = (() => {
    const c = CHAMFER_PCT;
    return `polygon(${c}% 0%, ${100 - c}% 0%, 100% ${c}%, 100% ${100 - c}%, ${100 - c}% 100%, ${c}% 100%, 0% ${100 - c}%, 0% ${c}%)`;
  })();

  return (
    <div style={{
      position: 'relative', width: w, height: h,
      // Straßen-Grundfarbe (Asphalt-Grau) als Background
      background: 'linear-gradient(180deg, #3a3f4a 0%, #2e333d 100%)',
      borderRadius: 10,
      boxShadow: '0 10px 40px rgba(0,0,0,0.6), inset 0 0 0 1.5px rgba(0,0,0,0.5)',
      overflow: 'hidden',
    }}>
      {/* Straßen-Grid-Muster: horizontale + vertikale Linien an jeder Gap-Mitte */}
      <svg width={w} height={h} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {Array.from({ length: rows + 1 }).map((_, i) => {
          const y = i * (CELL + GAP) + GAP / 2;
          return <line key={`hl-${i}`} x1={0} y1={y} x2={w} y2={y} stroke="#cdb184" strokeWidth={0.8} strokeDasharray="4 6" opacity={0.25} />;
        })}
        {Array.from({ length: cols + 1 }).map((_, i) => {
          const x = i * (CELL + GAP) + GAP / 2;
          return <line key={`vl-${i}`} x1={x} y1={0} x2={x} y2={h} stroke="#cdb184" strokeWidth={0.8} strokeDasharray="4 6" opacity={0.25} />;
        })}
      </svg>

      {/* Zellen */}
      {DEMO_GRID.flatMap((row, r) => row.map((cell, c) => {
        const left = GAP + c * (CELL + GAP);
        const top  = GAP + r * (CELL + GAP);
        const owner = cell.owner;
        const avatar = owner ? AVATARS[owner] : null;
        const teamColor = avatar?.color;
        const isEmpty = !owner;
        const joker = !!cell.joker;
        const frozen = !!cell.frozen;
        const stacked = cell.stacked ?? 0;

        // Dach-Farbe: gleiche Logik wie 3D BarcelonaCell.
        const roofColor = joker
          ? '#fbbf24'
          : frozen
            ? '#7ec5ef'
            : teamColor
              ?? (emptyStyle === 'plaza' ? '#3d6b3f' : emptyStyle === 'brache' ? '#7a6f52' : '#c9b692');

        // Fassade (als leichter "Mantel"-Rand im 2D sichtbar): beige, bei frozen eisblau.
        const facadeColor = frozen ? '#b8daf2' : '#e8dcc0';

        return (
          <div key={`${r}-${c}`} style={{
            position: 'absolute', left, top, width: CELL, height: CELL,
            clipPath: chaflanClip,
            // Fassade = äußere Schicht (Dach wird drauf gesetzt als kleineres Polygon)
            background: isEmpty && emptyStyle === 'plaza'
              ? 'transparent'  // Plaza = kein Gebäude, nur Park — Innenhof füllt alles
              : `linear-gradient(180deg, ${facadeColor} 0%, ${facadeColor}dd 100%)`,
            boxShadow: isEmpty && emptyStyle === 'plaza'
              ? 'none'
              : `inset 0 0 0 1px rgba(0,0,0,0.25), 0 1px 2px rgba(0,0,0,0.5)`,
            // Stacked = stärkerer Schatten als Höhen-Hinweis
            filter: stacked > 0 && !isEmpty
              ? `drop-shadow(0 ${2 + stacked * 2}px ${3 + stacked * 2}px rgba(0,0,0,0.55))`
              : undefined,
          }}>
            {/* Dach-Layer (Ring um Innenhof) — bei Plaza wird kein Dach gerendert */}
            {!(isEmpty && emptyStyle === 'plaza') && (
              <div style={{
                position: 'absolute', inset: 0,
                clipPath: chaflanClip,
                background: roofColor,
                // Emissive-Effekt für Joker/Frozen simulieren
                boxShadow: joker
                  ? `inset 0 0 24px rgba(251,191,36,0.6), 0 0 16px rgba(251,191,36,0.5)`
                  : frozen
                    ? `inset 0 0 18px rgba(91,179,255,0.55)`
                    : undefined,
              }} />
            )}

            {/* Innenhof — quadratisches Fenster in der Mitte.
                Bei Plaza-Park = grüner großer Innenhof (nimmt fast alles ein). */}
            {(() => {
              const innerPct = isEmpty && emptyStyle === 'plaza' ? 78 : INNER_PCT;
              const innerBg = isEmpty && emptyStyle === 'plaza'
                ? 'radial-gradient(ellipse at center, #6b8e4a 0%, #4d6b38 70%, #3d5a2e 100%)'
                : isEmpty
                  ? (emptyStyle === 'brache' ? '#7a6f52' : emptyStyle === 'beige' ? '#d4c4a0' : '#c9b692')
                  : '#6b8e4a';  // Innenhof = Garten (grün)
              return (
                <div style={{
                  position: 'absolute',
                  left: `${(100 - innerPct) / 2}%`, top: `${(100 - innerPct) / 2}%`,
                  width: `${innerPct}%`, height: `${innerPct}%`,
                  borderRadius: 4,
                  background: innerBg,
                  boxShadow: isEmpty && emptyStyle === 'plaza'
                    ? 'none'
                    : `inset 0 0 0 1px rgba(0,0,0,0.35), inset 0 2px 6px rgba(0,0,0,0.45)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {/* Mini-Baum im Innenhof (immer — matcht 3D-Szene) */}
                  {!isEmpty && (
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: '#3d6b3f',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
                    }} />
                  )}
                  {/* Plaza: Brunnen + 3 Bäume */}
                  {isEmpty && emptyStyle === 'plaza' && (
                    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                      <div style={{
                        position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
                        width: 14, height: 14, borderRadius: '50%',
                        background: 'radial-gradient(circle, #a8c8e0 0%, #6d9ab8 100%)',
                        boxShadow: '0 0 6px rgba(168,200,224,0.6), inset 0 -2px 3px rgba(0,0,0,0.3)',
                      }} />
                      {[[20, 20], [76, 22], [24, 78], [76, 78]].map(([x, y], i) => (
                        <div key={i} style={{
                          position: 'absolute', left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)',
                          width: 8, height: 8, borderRadius: '50%',
                          background: '#3d6b3f',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.5)',
                        }} />
                      ))}
                    </div>
                  )}
                  {/* Avatar-Emoji über dem Innenhof (im 3D: Billboard) */}
                  {avatar && (
                    <div style={{
                      position: 'absolute', left: '50%', top: '50%',
                      transform: 'translate(-50%, -50%)',
                      fontSize: 22, lineHeight: 1,
                      filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.6))',
                      zIndex: 2,
                    }}>{avatar.emoji}</div>
                  )}
                  {/* Joker: Stern */}
                  {joker && (
                    <div style={{
                      position: 'absolute', left: '50%', top: '50%',
                      transform: 'translate(-50%, -50%)',
                      fontSize: 20, filter: 'drop-shadow(0 0 8px rgba(251,191,36,0.9))',
                      zIndex: 3,
                    }}>⭐</div>
                  )}
                </div>
              );
            })()}
            {/* Frozen: Schneeflocken-Badge oben rechts, wie 3D */}
            {frozen && (
              <div style={{
                position: 'absolute', top: -6, right: -6,
                width: 22, height: 22, borderRadius: '50%',
                background: 'linear-gradient(135deg, #a8d8ff, #5bb3ff)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, color: '#fff',
                boxShadow: '0 0 8px rgba(91,179,255,0.7)',
                zIndex: 4,
              }}>❄</div>
            )}
            {/* Stacked: kleine Ebenen-Indikatoren (•• oder •••) */}
            {stacked > 0 && !isEmpty && (
              <div style={{
                position: 'absolute', bottom: 4, right: 6,
                fontSize: 10, color: '#fff', fontWeight: 900,
                textShadow: '0 1px 2px rgba(0,0,0,0.9)',
                zIndex: 4,
              }}>{'•'.repeat(1 + stacked)}</div>
            )}
          </div>
        );
      }))}

      {/* Label: Morph-Hinweis */}
      <div style={{
        position: 'absolute', left: 10, bottom: 10,
        padding: '4px 10px', borderRadius: 8,
        background: 'rgba(0,0,0,0.6)', color: '#10b981', fontSize: 11, fontWeight: 800,
        letterSpacing: '0.05em',
      }}>
        TOPOLOGIE IDENTISCH ZU 3D — MORPH-BASE
      </div>
    </div>
  );
}

// Sky-Gradient: große Kuppel mit vertikalem Gradient (hellblau → dunstig am Horizont)
function SkyGradient() {
  const geom = useMemo(() => new THREE.SphereGeometry(50, 32, 16), []);
  const mat = useMemo(() => {
    return new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        topColor:    { value: new THREE.Color('#6ab4e2') },
        bottomColor: { value: new THREE.Color('#dce8ef') },
        offset:      { value: 3.0 },
        exponent:    { value: 0.7 },
      },
      vertexShader: `
        varying vec3 vWorld;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorld = worldPosition.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorld;
        void main() {
          float h = normalize(vWorld + vec3(0.0, offset, 0.0)).y;
          float t = max(pow(max(h, 0.0), exponent), 0.0);
          gl_FragColor = vec4(mix(bottomColor, topColor, t), 1.0);
        }
      `,
    });
  }, []);
  return <mesh geometry={geom} material={mat} />;
}

function Ground() {
  // Stadtboden exakt auf Grid-Größe — keine Straßen außerhalb. Darunter ein
  // leicht größeres, dunkles Podium als Rahmen (setzt das Grid in Szene).
  const groundSize = SIZE * TILE;
  return (
    <group>
      {/* Podium (leicht größer, tiefer unten, dunkler) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 0]} receiveShadow>
        <planeGeometry args={[groundSize + 0.6, groundSize + 0.6]} />
        <meshStandardMaterial color="#1a1d26" roughness={0.95} />
      </mesh>
      {/* Asphalt-Ebene (Blocks stehen hier drauf) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[groundSize, groundSize]} />
        <meshStandardMaterial color="#2e323c" roughness={0.92} metalness={0.02} />
      </mesh>
    </group>
  );
}

// Straßen: heller Asphalt-Streifen + gestrichelte weiße Mittellinie
// Nur INNERE Straßen (zwischen Blöcken) — keine Straßen am äußeren Rand,
// sonst hätte das Grid einen "Kragen" aus Straße um sich herum.
function Streets() {
  const gridLen = SIZE * TILE;
  const halfGrid = gridLen / 2;
  const lines: JSX.Element[] = [];
  const streetWidth = 0.4;
  // Nur innere Linien: i = 1..SIZE-1 (nicht 0 und nicht SIZE)
  for (let i = 1; i < SIZE; i++) {
    const p = (i * TILE) - OFFSET - TILE / 2;
    lines.push(
      <mesh key={`h-road-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, p]} receiveShadow>
        <planeGeometry args={[gridLen, streetWidth]} />
        <meshStandardMaterial color="#4f555c" roughness={0.9} />
      </mesh>
    );
    lines.push(
      <mesh key={`v-road-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[p, 0.005, 0]} receiveShadow>
        <planeGeometry args={[streetWidth, gridLen]} />
        <meshStandardMaterial color="#4f555c" roughness={0.9} />
      </mesh>
    );
  }
  // Gestrichelte Mittellinien auf den inneren Straßen
  const dashCount = 14;
  for (let i = 1; i < SIZE; i++) {
    const p = (i * TILE) - OFFSET - TILE / 2;
    for (let d = 0; d < dashCount; d++) {
      const pos = -halfGrid + (d + 0.5) * (gridLen / dashCount);
      lines.push(
        <mesh key={`h-dash-${i}-${d}`} rotation={[-Math.PI / 2, 0, 0]} position={[pos, 0.008, p]}>
          <planeGeometry args={[0.18, 0.03]} />
          <meshStandardMaterial color="#e8e2c8" roughness={0.7} />
        </mesh>
      );
      lines.push(
        <mesh key={`v-dash-${i}-${d}`} rotation={[-Math.PI / 2, 0, 0]} position={[p, 0.008, pos]}>
          <planeGeometry args={[0.03, 0.18]} />
          <meshStandardMaterial color="#e8e2c8" roughness={0.7} />
        </mesh>
      );
    }
  }
  // Gehsteig-Kanten nur an inneren Straßen
  const curb = 0.02;
  const inset = 0.24;
  for (let i = 1; i < SIZE; i++) {
    const p = (i * TILE) - OFFSET - TILE / 2;
    lines.push(
      <mesh key={`h-curb-a-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, p - inset]}>
        <planeGeometry args={[gridLen, curb]} />
        <meshStandardMaterial color="#aeb4bc" roughness={0.85} />
      </mesh>,
      <mesh key={`h-curb-b-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, p + inset]}>
        <planeGeometry args={[gridLen, curb]} />
        <meshStandardMaterial color="#aeb4bc" roughness={0.85} />
      </mesh>,
      <mesh key={`v-curb-a-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[p - inset, 0.012, 0]}>
        <planeGeometry args={[curb, gridLen]} />
        <meshStandardMaterial color="#aeb4bc" roughness={0.85} />
      </mesh>,
      <mesh key={`v-curb-b-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[p + inset, 0.012, 0]}>
        <planeGeometry args={[curb, gridLen]} />
        <meshStandardMaterial color="#aeb4bc" roughness={0.85} />
      </mesh>
    );
  }
  return <>{lines}</>;
}

// Chaflán-Plätze + parkende Autos an jeder inneren Kreuzung
const CAR_COLORS = ['#d8433a', '#3c6fb5', '#2b2b2b', '#e8e8e2', '#d9a42a', '#4a6b52', '#8f3a78', '#c5c5c2'];
function ChaflanPlazas() {
  const items: JSX.Element[] = [];
  for (let i = 1; i < SIZE; i++) {
    for (let j = 1; j < SIZE; j++) {
      const x = (j * TILE) - OFFSET - TILE / 2;
      const z = (i * TILE) - OFFSET - TILE / 2;
      const rng = rngFromSeed(i * 31 + j * 17 + 101);

      // Platz-Boden
      items.push(
        <group key={`plaza-${i}-${j}`} position={[x, 0.006, z]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]} receiveShadow>
            <circleGeometry args={[0.26, 8]} />
            <meshStandardMaterial color="#a9a8a0" roughness={0.9} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
            <circleGeometry args={[0.06, 8]} />
            <meshStandardMaterial color="#8b8a82" roughness={0.85} />
          </mesh>
        </group>
      );

      // Zebrastreifen — 4 Richtungen (N/S/E/W) rund um den Chaflán
      const stripeCount = 4;
      const stripeW = 0.035;
      const stripeL = 0.14;
      const stripeGap = 0.018;
      const groupOffset = 0.32;
      const dirs: Array<[number, number, number]> = [
        [0, -groupOffset, 0],
        [0, groupOffset, 0],
        [groupOffset, 0, Math.PI / 2],
        [-groupOffset, 0, Math.PI / 2],
      ];
      dirs.forEach(([dx, dz, rotY], d) => {
        const stripes: JSX.Element[] = [];
        for (let s = 0; s < stripeCount; s++) {
          const offset = (s - (stripeCount - 1) / 2) * (stripeW + stripeGap);
          stripes.push(
            <mesh
              key={`stripe-${s}`}
              position={rotY === 0 ? [offset, 0.001, 0] : [0, 0.001, offset]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <planeGeometry args={rotY === 0 ? [stripeW, stripeL] : [stripeL, stripeW]} />
              <meshStandardMaterial color="#f4f1e6" roughness={0.85} />
            </mesh>
          );
        }
        items.push(
          <group key={`crosswalk-${i}-${j}-${d}`} position={[x + dx, 0.008, z + dz]}>
            {stripes}
          </group>
        );
      });

      // Parkende Autos entlang der Chamfer-Kanten (1-3 pro Platz)
      const carCount = 1 + Math.floor(rng() * 3);
      for (let k = 0; k < carCount; k++) {
        // Position rund um den Platz-Rand
        const angle = rng() * Math.PI * 2;
        const dist = 0.2 + rng() * 0.08;
        const cx = x + Math.cos(angle) * dist;
        const cz = z + Math.sin(angle) * dist;
        const carColor = CAR_COLORS[Math.floor(rng() * CAR_COLORS.length)];
        const orientation = angle + Math.PI / 2;
        items.push(
          <group key={`car-${i}-${j}-${k}`} position={[cx, 0.018, cz]} rotation={[0, orientation, 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.055, 0.022, 0.11]} />
              <meshStandardMaterial color={carColor} roughness={0.4} metalness={0.35} />
            </mesh>
            {/* Dach/Windschutz etwas dunkler oben drauf */}
            <mesh position={[0, 0.013, 0]} castShadow>
              <boxGeometry args={[0.048, 0.012, 0.06]} />
              <meshStandardMaterial color="#1a1e26" roughness={0.25} metalness={0.5} />
            </mesh>
          </group>
        );
      }
    }
  }
  return <>{items}</>;
}

// Alleebaum an Kreuzungs-Ecken (wie Barcelona-Platanen)
function TreeAt({ x, z, scale = 1 }: { x: number; z: number; scale?: number }) {
  return (
    <group position={[x, 0, z]} scale={scale}>
      {/* Stamm */}
      <mesh position={[0, 0.18, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.04, 0.36, 8]} />
        <meshStandardMaterial color="#5a3a22" roughness={0.9} />
      </mesh>
      {/* Krone — 3 überlappende Kugeln für buschigen Look */}
      <mesh position={[0, 0.42, 0]} castShadow>
        <sphereGeometry args={[0.17, 14, 12]} />
        <meshStandardMaterial color="#3a6a3e" roughness={0.85} />
      </mesh>
      <mesh position={[0.08, 0.48, 0.03]} castShadow>
        <sphereGeometry args={[0.12, 12, 10]} />
        <meshStandardMaterial color="#4a7b4e" roughness={0.85} />
      </mesh>
      <mesh position={[-0.06, 0.46, -0.08]} castShadow>
        <sphereGeometry args={[0.11, 12, 10]} />
        <meshStandardMaterial color="#2f5a32" roughness={0.85} />
      </mesh>
    </group>
  );
}

// Bäume entlang der Straßen — nur auf INNEREN Straßen, nicht am äußeren
// Grid-Rand (da gibt es keine Straßen mehr).
function StreetTrees() {
  const trees: JSX.Element[] = [];
  const halfGrid = (SIZE * TILE) / 2;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const cx = c * TILE - OFFSET;
      const cz = r * TILE - OFFSET;
      const offs = TILE * 0.34;
      const roadOffs = TILE * 0.5 - 0.08;
      const positions: [number, number, number][] = [
        [cx - offs, 0, cz - roadOffs],
        [cx + offs, 0, cz - roadOffs],
        [cx - offs, 0, cz + roadOffs],
        [cx + offs, 0, cz + roadOffs],
      ];
      positions.forEach((p, i) => {
        // Aus Grid gefallene Bäume auslassen (kein Außen-Straßen-Kragen mehr)
        if (Math.abs(p[0]) > halfGrid - 0.05 || Math.abs(p[2]) > halfGrid - 0.05) return;
        const seed = (r * 7 + c * 3 + i * 13) % 5;
        const scale = 0.85 + seed * 0.06;
        if ((r + c + i) % 2 === 0) {
          trees.push(<TreeAt key={`t-${r}-${c}-${i}`} x={p[0]} z={p[2]} scale={scale} />);
        }
      });
    }
  }
  return <>{trees}</>;
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
  // Hole muss entgegengesetzt zum Outer gewunden sein (im Uhrzeigersinn,
  // waehrend Outer gegen den Uhrzeigersinn geht). Sonst kollabieren die
  // Innenwand-Triangulationen.
  hole.moveTo( s - c, -s);
  hole.lineTo(-s + c, -s);
  hole.lineTo(-s,     -s + c);
  hole.lineTo(-s,      s - c);
  hole.lineTo(-s + c,  s);
  hole.lineTo( s - c,  s);
  hole.lineTo( s,      s - c);
  hole.lineTo( s,     -s + c);
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
function EixampleWindows({ outer, chamfer, h, plinthH = 0 }: { outer: number; chamfer: number; h: number; plinthH?: number }) {
  const s = outer / 2;
  const flatLen = outer - 2 * chamfer;
  const diagLen = chamfer * Math.SQRT2;

  // Fensterreihen starten OBERHALB des Sockels (Erdgeschoss hat Türen/Schaufenster)
  const winZoneBottom = plinthH + 0.02;
  const winZoneTop = h - 0.05;
  const winZoneH = Math.max(0.05, winZoneTop - winZoneBottom);
  const rows = Math.max(2, Math.round(winZoneH * 6));
  const cols = 5;
  const winW = (flatLen / (cols + 1)) * 0.42;
  const winH = 0.055;
  const rowStep = winZoneH / (rows + 1);
  const rowYs: number[] = [];
  for (let r = 0; r < rows; r++) rowYs.push(winZoneBottom + (r + 1) * rowStep);
  const winMat = (
    <meshStandardMaterial color="#2a3440" roughness={0.25} metalness={0.55} />
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
// BARCELONA-RECONSTRUCTION — Tag-Luftbild-Look (Eixample)
// - Gleiche O-Form pro Zelle, per-cell deterministische Höhen-/Detail-Variation
// - Terrakotta-Dächer, Innenhof grün, AC-Boxen, Solarpanels, Dachterrassen
// - Keine Team-Farben, keine Avatare
// ─────────────────────────────────────────────────────────────────────────────

// Terrakotta-Palette (satt rot-orange — das Barcelona-Signal von oben)
const TERRACOTTA = ['#c2481e', '#b84220', '#a83a1a', '#cc5025', '#b53f1c', '#bd4520', '#a6371c'];
// Erweiterte Fassaden-Palette: Creme, Ocker, Sandrosa, Lehm — mehr Variation
const FACADE_TONES = [
  '#e8d9b8', '#efdebc', '#e0cfa3', '#eadbb2',   // Creme-Gelb
  '#d8c59a', '#f0e2c4', '#e4d3af',              // Standard-Creme
  '#d9b888', '#c9a472', '#dab584',              // Ocker
  '#e8c8a8', '#e0bfa0', '#d7ae8e',              // Sandrosa
  '#c5a784', '#b8977a',                          // Lehm-warm
];
// Sockel-Farben — nur leicht dunkler als Fassade (nicht braun-dunkel,
// sonst wirken die Erdgeschosse wie durchsichtige Lücken)
const PLINTH_TONES = ['#c9b898', '#d0bea0', '#c5b090', '#cfbda0', '#bfac8a', '#d4c2a6', '#c8b494'];

// Mulberry32 deterministic RNG
function rngFromSeed(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Pro Zelle: ein Barcelona-Block mit detaillierter Dachvariation
function BarcelonaCell({ x, z, seed, joker, teamColor, avatarEmoji, emptyVariant, frozen, stacked }: {
  x: number; z: number; seed: number; joker: boolean;
  teamColor?: string; avatarEmoji?: string;
  emptyVariant?: 'beige' | 'ghost';
  frozen?: boolean;
  stacked?: number;
}) {
  const rng = useMemo(() => rngFromSeed(seed + 1), [seed]);
  // Variation: Höhe — mit 20% Chance ein echter Turm (2-3× normal)
  const baseH = useMemo(() => {
    const v = rng();
    if (v < 0.08) return 0.68 + rng() * 0.12;  // Punktuell höher (~0.68-0.8)
    if (v < 0.3)  return 0.52 + rng() * 0.12;  // leicht erhöht
    return 0.38 + rng() * 0.1;                 // Standard (0.38-0.48)
  }, [rng]);
  // Stacked erhöht pro Level um 40% der Basishöhe (deutlich sichtbar)
  const heightBase = baseH * (1 + (stacked ?? 0) * 0.4);
  const facadeBase = useMemo(() => FACADE_TONES[Math.floor(rng() * FACADE_TONES.length)], [rng]);
  const plinthBase = useMemo(() => PLINTH_TONES[Math.floor(rng() * PLINTH_TONES.length)], [rng]);
  // Frozen: Fassade + Sockel werden in kühles Eis-Blau getaucht, damit das
  // ganze Haus sofort als "gefroren" lesbar ist — nicht nur das Dach.
  // Sockel minimal dunkler als Fassade für Kontrast.
  const facade = frozen ? '#b8daf2' : facadeBase;
  const plinth = frozen ? '#8fb9d6' : plinthBase;
  // Dach-Farbe: Joker → Amber, Frozen → Eis-Blau, sonst Team-Farbe.
  // Leere Felder: beige/ghost → sandbeige; Fallback Terrakotta (Defensive).
  const terracotta = useMemo(() => TERRACOTTA[Math.floor(rng() * TERRACOTTA.length)], [rng]);
  const roof = joker
    ? '#fbbf24'
    : frozen
      ? '#7ec5ef'
      : teamColor
        ?? (emptyVariant === 'beige' || emptyVariant === 'ghost' ? '#c9b692' : terracotta);
  const hasPenthouse = rng() > 0.75;  // seltener, damit Dach lesbar bleibt
  const hasSolar = rng() > 0.7;
  const hasTerrace = rng() > 0.6;
  const hasBalconies = rng() > 0.25;
  const acCount = 2 + Math.floor(rng() * 4);
  const acSeeds = useMemo(() => Array.from({ length: acCount }, () => [rng(), rng(), rng()]), [acCount, rng]);

  return (
    <group position={[x, 0.02, z]}>
      <BarcelonaBlock
        heightBase={heightBase}
        facadeColor={facade}
        plinthColor={plinth}
        roofColor={roof}
        joker={joker}
        frozen={!!frozen}
        hasPenthouse={hasPenthouse}
        hasSolar={hasSolar}
        hasTerrace={hasTerrace}
        hasBalconies={hasBalconies}
        acSeeds={acSeeds}
        avatarEmoji={avatarEmoji}
        ghost={emptyVariant === 'ghost'}
      />
    </group>
  );
}

function BarcelonaBlock({
  heightBase, facadeColor, plinthColor, roofColor, joker, frozen = false,
  hasPenthouse, hasSolar, hasTerrace, hasBalconies, acSeeds,
  avatarEmoji, ghost = false,
}: {
  heightBase: number; facadeColor: string; plinthColor: string; roofColor: string;
  joker: boolean; frozen?: boolean;
  hasPenthouse: boolean; hasSolar: boolean; hasTerrace: boolean; hasBalconies: boolean;
  acSeeds: number[][];
  avatarEmoji?: string;
  ghost?: boolean;
}) {
  const OUTER = 1.22;
  const INNER = 0.58;
  const CHAMFER = 0.24;
  const H = heightBase;
  const PLINTH_H = Math.min(0.1, H * 0.22);

  // NEUER ANSATZ (sauberer Rebuild): kein Ring mit Hole.
  // Gebaeude ist ein VOLLER chamfered-Octagon-Block (keine Durchsicht moeglich).
  // Innenhof-Illusion macht nur die RoofDepression als aufgesetztes Plateau.
  // Stack von unten nach oben:
  //   y=0 .. PLINTH_H          -> Plinth (Sockel, cremig)
  //   y=PLINTH_H .. H          -> Fassade (heller Creme)
  //   y=H .. H+ROOF_T          -> ROOF (Terrakotta, mit Ueberhang, deckt Fassade oben komplett ab)
  // ROOT CAUSE FUER DEN 'WAENDE UEBER DEM DACH'-BUG:
  // Nach geom.rotateX(-PI/2) liegt die extrudierte Geometrie in y ∈ [0, +depth]
  // (NICHT [-depth, 0] wie ich faelschlich angenommen habe). Deshalb muss der
  // Translate-Offset der UNTERE Startpunkt sein, nicht der obere.
  //   Plinth: y ∈ [0, PLINTH_H]      -> translate(0, 0, 0)
  //   Fassade: y ∈ [PLINTH_H, H]     -> translate(0, PLINTH_H, 0)
  //   Dach: y ∈ [H, H + ROOF_T]       -> translate(0, H, 0) (+ kleiner Offset)
  // Plinth + Fassade sind Ring-Geometrien mit Innenhof-Loch. Ring-Winding
  // ist jetzt korrekt (chamferedRingShape fixed in vorherigem commit).
  const plinthGeom = useMemo(() => {
    const shape = chamferedRingShape(OUTER + 0.008, INNER - 0.008, CHAMFER);
    const geom = new THREE.ExtrudeGeometry(shape, {
      depth: PLINTH_H, bevelEnabled: false, curveSegments: 4,
    });
    geom.rotateX(-Math.PI / 2);
    geom.translate(0, 0, 0);
    return geom;
  }, [PLINTH_H]);

  const facadeGeom = useMemo(() => {
    const shape = chamferedRingShape(OUTER, INNER, CHAMFER);
    const geom = new THREE.ExtrudeGeometry(shape, {
      depth: H - PLINTH_H, bevelEnabled: false, curveSegments: 4,
    });
    geom.rotateX(-Math.PI / 2);
    geom.translate(0, PLINTH_H, 0);
    return geom;
  }, [H, PLINTH_H]);

  // Dach sitzt bei y ∈ [H, H + ROOF_T]. Ring-Shape mit Innenhof-Loch,
  // damit man durch das Dach auf den Innenhof-Boden unten schauen kann.
  const ROOF_T = 0.04;
  const roofGeom = useMemo(() => {
    const shape = chamferedRingShape(OUTER + 0.03, INNER, CHAMFER);
    const geom = new THREE.ExtrudeGeometry(shape, {
      depth: ROOF_T, bevelEnabled: false, curveSegments: 4,
    });
    geom.rotateX(-Math.PI / 2);
    geom.translate(0, H + 0.001, 0);
    return geom;
  }, [H]);

  // Innenhof-Vertiefung: kleines Loch-Plateau IM Dach (Eixample Patio Interior)
  // Wird NICHT durch den Block gestanzt -> keine Winding-Issues.
  // Grüner Boden sitzt auf dem Dach leicht versenkt.
  const COURTYARD_SIZE = INNER * 0.9;

  // Innenhof-Boden (Grün + Sand) — wie echter Eixample-pati interior
  return (
    <group>
      {/* Sockel (Erdgeschoss, y=0..PLINTH_H) — voller Octagon-Block, keine
          Ring-Geometrie mehr -> keine Winding- oder Hole-Probleme,
          kein DoubleSide noetig. */}
      <mesh geometry={plinthGeom} castShadow={!ghost} receiveShadow={!ghost}>
        <meshStandardMaterial
          color={plinthColor}
          roughness={frozen ? 0.45 : 0.88}
          metalness={frozen ? 0.2 : 0.03}
          emissive={frozen ? '#5bb3ff' : '#000'}
          emissiveIntensity={frozen ? 0.18 : 0}
          transparent={ghost}
          opacity={ghost ? 0.35 : 1}
          depthWrite={!ghost}
        />
      </mesh>

      {/* Fassade (y=PLINTH_H..H) — voller Octagon-Block */}
      <mesh geometry={facadeGeom} castShadow={!ghost} receiveShadow={!ghost}>
        <meshStandardMaterial
          color={facadeColor}
          roughness={frozen ? 0.4 : 0.82}
          metalness={frozen ? 0.25 : 0.02}
          emissive={joker ? '#fbbf24' : frozen ? '#5bb3ff' : '#000'}
          emissiveIntensity={joker ? 0.15 : frozen ? 0.22 : 0}
          transparent={ghost}
          opacity={ghost ? 0.35 : 1}
          depthWrite={!ghost}
        />
      </mesh>

      {/* Dach (y ∈ [H, H + ROOF_T]) — Team/Joker/Frozen-Farbe, mit leichtem Ueberhang.
          Joker = Amber-Emissive, Frozen = kühles Cyan-Emissive. */}
      <mesh geometry={roofGeom} castShadow={!ghost} receiveShadow={!ghost}>
        <meshStandardMaterial
          color={roofColor}
          roughness={frozen ? 0.4 : 0.85}
          metalness={frozen ? 0.3 : 0.0}
          emissive={joker ? '#fbbf24' : frozen ? '#5bb3ff' : '#000'}
          emissiveIntensity={joker ? 0.5 : frozen ? 0.3 : 0}
          transparent={ghost}
          opacity={ghost ? 0.4 : 1}
          depthWrite={!ghost}
        />
      </mesh>

      {/* Joker: pulsierender Glow-Ring knapp über dem Dach */}
      {joker && <JokerGlowRing y={H + 0.08} />}

      {/* Frozen: Frost-Overlay auf dem Dach + pulsierender Eis-Ring */}
      {frozen && <FrostOverlay y={H + 0.045} />}

      {/* Innenhof auf Bodenhoehe (Eixample Patio Interior) — gruener Garten
          mit kleinem Baum, sichtbar durchs Dach-Loch */}
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[COURTYARD_SIZE, COURTYARD_SIZE]} />
        <meshStandardMaterial color="#6b8e4a" roughness={0.9} />
      </mesh>
      {/* Stamm */}
      <mesh position={[0, 0.06, 0]} castShadow>
        <cylinderGeometry args={[0.012, 0.016, 0.12, 6]} />
        <meshStandardMaterial color="#4a2e1a" roughness={0.9} />
      </mesh>
      {/* Krone */}
      <mesh position={[0, 0.15, 0]} castShadow>
        <sphereGeometry args={[0.08, 12, 10]} />
        <meshStandardMaterial color="#3d6b3f" roughness={0.85} />
      </mesh>

      {/* Avatar / Icon als Billboard auf Dachhöhe über dem Innenhof.
          Joker → ⭐ statt Team-Avatar, Frozen → Avatar + ❄️-Badge. */}
      {joker && <AvatarBillboard emoji="⭐" y={H + 0.22} size={0.52} />}
      {!joker && avatarEmoji && (
        <AvatarBillboard emoji={avatarEmoji} y={H + 0.18} />
      )}
      {frozen && <SnowflakeBadge y={H + 0.34} />}

      {/* Rooftop-Extras bleiben ausgeblendet solange Bug nicht gefunden */}
      {false && <RooftopPenthouse roofY={H + ROOF_T} color={facadeColor} />}
      {false && <RooftopSolar roofY={H + ROOF_T} />}
      {false && <RooftopTerrace roofY={H + ROOF_T} />}

      {/* Ladentueren + Markisen + Fenster weiter an der Fassade */}
      <PlinthDoors outer={OUTER} chamfer={CHAMFER} plinthH={PLINTH_H} />
      <Awnings outer={OUTER} chamfer={CHAMFER} plinthH={PLINTH_H} seed={Math.round(H * 1000)} />
      {hasBalconies && (
        <Balconies outer={OUTER} chamfer={CHAMFER} plinthH={PLINTH_H} totalH={H} />
      )}
      <EixampleWindows outer={OUTER} chamfer={CHAMFER} h={H} plinthH={PLINTH_H} />

      {/* AC-Boxen ausgeblendet (stoeren das saubere Dach-Bild) */}
      {false && acSeeds.map((s, i) => (
        <RooftopAC key={i} roofY={H + 0.001 + ROOF_T} sx={(s[0] - 0.5) * 0.5} sz={(s[1] - 0.5) * 0.5} sr={s[2]} />
      ))}

      {/* Referenz-Verwendung um TS-Unused-Warning zu vermeiden */}
      {hasPenthouse || hasSolar || hasTerrace ? null : null}
      {COURTYARD_SIZE > 0 ? null : null}
    </group>
  );
}

// Avatar-Billboard: Emoji-Plane, dreht sich zur Kamera (lesbar aus jedem Winkel).
// Keine Umrandung, keine Plate — der Avatar schwebt pur.
function AvatarBillboard({ emoji, y, size = 0.42 }: { emoji: string; y: number; size?: number }) {
  const tex = useAvatarTexture(emoji);
  return (
    <Billboard position={[0, y, 0]}>
      <mesh>
        <planeGeometry args={[size, size]} />
        <meshBasicMaterial map={tex} transparent depthWrite={false} toneMapped={false} />
      </mesh>
    </Billboard>
  );
}

// Schneeflocken-Badge oben über dem Avatar — kleiner Icon-Akzent für Frozen-Felder.
function SnowflakeBadge({ y }: { y: number }) {
  const tex = useAvatarTexture('❄️');
  return (
    <Billboard position={[0.18, y, 0]}>
      <mesh>
        <planeGeometry args={[0.22, 0.22]} />
        <meshBasicMaterial map={tex} transparent depthWrite={false} toneMapped={false} />
      </mesh>
    </Billboard>
  );
}

// Joker-Glow-Ring: pulsierender Amber-Ring über dem Dach (sieht wie ein Halo aus).
function JokerGlowRing({ y }: { y: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    const s = 1 + Math.sin(t * 2.2) * 0.08;
    ref.current.scale.set(s, s, 1);
    const m = ref.current.material as THREE.MeshBasicMaterial;
    m.opacity = 0.55 + Math.sin(t * 2.2) * 0.2;
  });
  return (
    <mesh ref={ref} position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.55, 0.72, 32]} />
      <meshBasicMaterial color="#fbbf24" transparent opacity={0.65} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

// Frost-Overlay: leicht transparente hellblaue Scheibe über dem Dach + pulse.
function FrostOverlay({ y }: { y: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    if (!ref.current) return;
    const m = ref.current.material as THREE.MeshBasicMaterial;
    m.opacity = 0.3 + Math.sin(state.clock.elapsedTime * 1.5) * 0.12;
  });
  return (
    <mesh ref={ref} position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.0, 0.68, 28]} />
      <meshBasicMaterial color="#cfe8ff" transparent opacity={0.35} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

// Dachziegel-Linien (dünne dunkle Streifen auf dem Dach für Textur-Look)
function RoofTileLines({ outer, inner, chamfer, y }: {
  outer: number; inner: number; chamfer: number; y: number;
}) {
  void chamfer;
  const lines: JSX.Element[] = [];
  const steps = 6;
  // Außenring-Streifen (4 Hauptseiten)
  for (let i = 0; i < steps; i++) {
    const t = (i + 0.5) / steps;
    const len = outer * 0.88;
    // Nord/Süd
    const posZN = -outer / 2 + (outer / 2 - inner / 2) * t;
    const posZS = outer / 2 - (outer / 2 - inner / 2) * t;
    lines.push(
      <mesh key={`n-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, y, posZN]}>
        <planeGeometry args={[len, 0.006]} />
        <meshStandardMaterial color="#6b2f1a" roughness={0.9} transparent opacity={0.35} />
      </mesh>,
      <mesh key={`s-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, y, posZS]}>
        <planeGeometry args={[len, 0.006]} />
        <meshStandardMaterial color="#6b2f1a" roughness={0.9} transparent opacity={0.35} />
      </mesh>,
      <mesh key={`e-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[posZS, y, 0]}>
        <planeGeometry args={[0.006, len]} />
        <meshStandardMaterial color="#6b2f1a" roughness={0.9} transparent opacity={0.35} />
      </mesh>,
      <mesh key={`w-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[posZN, y, 0]}>
        <planeGeometry args={[0.006, len]} />
        <meshStandardMaterial color="#6b2f1a" roughness={0.9} transparent opacity={0.35} />
      </mesh>
    );
  }
  return <>{lines}</>;
}

// Ladentüren/Eingangsportale auf dem Sockel (2 dunkle Rechtecke pro Hauptseite)
function PlinthDoors({ outer, chamfer, plinthH }: {
  outer: number; chamfer: number; plinthH: number;
}) {
  const s = outer / 2;
  const flatLen = outer - 2 * chamfer;
  const doorW = 0.08;
  const doorH = plinthH * 0.75;
  const doorY = doorH / 2 + 0.005;

  const sides: { pos: [number, number, number]; rot: [number, number, number]; key: string }[] = [
    { pos: [0, 0, s + 0.004],  rot: [0, 0, 0],            key: 'S' },
    { pos: [0, 0, -s - 0.004], rot: [0, Math.PI, 0],      key: 'N' },
    { pos: [s + 0.004, 0, 0],  rot: [0, Math.PI / 2, 0],  key: 'E' },
    { pos: [-s - 0.004, 0, 0], rot: [0, -Math.PI / 2, 0], key: 'W' },
  ];

  const items: JSX.Element[] = [];
  sides.forEach((side) => {
    const doors: JSX.Element[] = [];
    // 2 Türen pro Seite + ein paar schmalere "Laden-Vitrinen" dazwischen
    [-flatLen * 0.3, flatLen * 0.3].forEach((px, i) => {
      doors.push(
        <mesh key={`door-${side.key}-${i}`} position={[px, doorY, 0]}>
          <planeGeometry args={[doorW, doorH]} />
          <meshStandardMaterial color="#2a1e14" roughness={0.6} metalness={0.2} />
        </mesh>
      );
    });
    // Laden-Schaufenster (breiter, heller)
    [-flatLen * 0.05, flatLen * 0.05].forEach((px, i) => {
      doors.push(
        <mesh key={`shop-${side.key}-${i}`} position={[px, doorY + 0.003, 0]}>
          <planeGeometry args={[doorW * 0.9, doorH * 0.7]} />
          <meshStandardMaterial color="#c8d2d9" roughness={0.25} metalness={0.5} />
        </mesh>
      );
    });
    items.push(
      <group key={`doors-${side.key}`} position={side.pos} rotation={side.rot}>
        {doors}
      </group>
    );
  });
  return <>{items}</>;
}

// Schmiedeeiserne Balkon-Bänder pro Etage (dünne dunkle vorspringende Streifen)
// Markisen über den Schaufenstern (bunte kleine Schrägflächen)
const AWNING_COLORS = ['#c23828', '#2e7a3b', '#1e5ea0', '#d9a72a', '#8c2d6b', '#c26632'];
function Awnings({ outer, chamfer, plinthH, seed }: {
  outer: number; chamfer: number; plinthH: number; seed: number;
}) {
  const s = outer / 2;
  const flatLen = outer - 2 * chamfer;
  const awnW = 0.12;
  const awnH = 0.035;
  const awnDepth = 0.04;
  // Oberkante über dem Schaufenster (Schaufenster geht etwa bis 0.7*plinthH)
  const awnY = plinthH * 0.82;

  const rng = rngFromSeed(seed);
  const items: JSX.Element[] = [];
  const sides: { pos: [number, number, number]; rot: [number, number, number]; key: string }[] = [
    { pos: [0, 0, s + 0.01],   rot: [0, 0, 0],            key: 'S' },
    { pos: [0, 0, -s - 0.01],  rot: [0, Math.PI, 0],      key: 'N' },
    { pos: [s + 0.01, 0, 0],   rot: [0, Math.PI / 2, 0],  key: 'E' },
    { pos: [-s - 0.01, 0, 0],  rot: [0, -Math.PI / 2, 0], key: 'W' },
  ];
  sides.forEach((side) => {
    const awnings: JSX.Element[] = [];
    // 2 Markisen mittig pro Seite (über den Schaufenstern)
    [-flatLen * 0.05, flatLen * 0.05].forEach((px, i) => {
      // Nicht immer alle Markisen setzen — per rng weglassen
      if (rng() < 0.3) return;
      const color = AWNING_COLORS[Math.floor(rng() * AWNING_COLORS.length)];
      awnings.push(
        <mesh
          key={`awn-${side.key}-${i}`}
          position={[px, awnY, awnDepth / 2]}
          rotation={[-Math.PI / 8, 0, 0]}
          castShadow
        >
          <boxGeometry args={[awnW, awnH, awnDepth]} />
          <meshStandardMaterial color={color} roughness={0.6} />
        </mesh>
      );
    });
    if (awnings.length > 0) {
      items.push(
        <group key={`awn-grp-${side.key}`} position={side.pos} rotation={side.rot}>
          {awnings}
        </group>
      );
    }
  });
  return <>{items}</>;
}

function Balconies({ outer, chamfer, plinthH, totalH }: {
  outer: number; chamfer: number; plinthH: number; totalH: number;
}) {
  const s = outer / 2;
  const flatLen = outer - 2 * chamfer;
  const diagLen = chamfer * Math.SQRT2;
  const upperH = totalH - plinthH;
  const floors = Math.max(2, Math.round(upperH / 0.1));

  const items: JSX.Element[] = [];
  const mainSides: { pos: [number, number, number]; rot: [number, number, number]; key: string }[] = [
    { pos: [0, 0, s + 0.012],  rot: [0, 0, 0],            key: 'S' },
    { pos: [0, 0, -s - 0.012], rot: [0, Math.PI, 0],      key: 'N' },
    { pos: [s + 0.012, 0, 0],  rot: [0, Math.PI / 2, 0],  key: 'E' },
    { pos: [-s - 0.012, 0, 0], rot: [0, -Math.PI / 2, 0], key: 'W' },
  ];
  // Balkons nur auf oberen Etagen (nicht auf dem Erdgeschoss-Sockel)
  for (let f = 1; f < floors; f++) {
    const y = plinthH + (f / floors) * upperH - upperH / (floors + 1) * 0.35;
    mainSides.forEach((side) => {
      items.push(
        <group key={`balc-${side.key}-${f}`} position={side.pos} rotation={side.rot}>
          {/* Haupt-Geländer als dünner dunkler Streifen */}
          <mesh position={[0, y, 0]}>
            <boxGeometry args={[flatLen * 0.86, 0.012, 0.018]} />
            <meshStandardMaterial color="#1c1f2a" roughness={0.55} metalness={0.4} />
          </mesh>
          {/* Dünne Bodenplatte darunter (hellerer Beton-Ton) */}
          <mesh position={[0, y - 0.008, 0]}>
            <boxGeometry args={[flatLen * 0.86, 0.006, 0.024]} />
            <meshStandardMaterial color="#a89d86" roughness={0.8} />
          </mesh>
        </group>
      );
    });
  }

  // Chamfer-Balkons (diagonal) — kleiner
  const diagOffset = s - chamfer / 2 + 0.012;
  const diagSides: { pos: [number, number, number]; rot: [number, number, number]; key: string }[] = [
    { pos: [ diagOffset, 0,  diagOffset], rot: [0,  Math.PI / 4, 0],      key: 'SE' },
    { pos: [-diagOffset, 0,  diagOffset], rot: [0, -Math.PI / 4, 0],      key: 'SW' },
    { pos: [ diagOffset, 0, -diagOffset], rot: [0,  3 * Math.PI / 4, 0],  key: 'NE' },
    { pos: [-diagOffset, 0, -diagOffset], rot: [0, -3 * Math.PI / 4, 0],  key: 'NW' },
  ];
  for (let f = 1; f < floors; f++) {
    const y = plinthH + (f / floors) * upperH - upperH / (floors + 1) * 0.35;
    diagSides.forEach((side) => {
      items.push(
        <group key={`balc-d-${side.key}-${f}`} position={side.pos} rotation={side.rot}>
          <mesh position={[0, y, 0]}>
            <boxGeometry args={[diagLen * 0.7, 0.012, 0.018]} />
            <meshStandardMaterial color="#1c1f2a" roughness={0.55} metalness={0.4} />
          </mesh>
          <mesh position={[0, y - 0.008, 0]}>
            <boxGeometry args={[diagLen * 0.7, 0.006, 0.024]} />
            <meshStandardMaterial color="#a89d86" roughness={0.8} />
          </mesh>
        </group>
      );
    });
  }

  return <>{items}</>;
}

// Innenhof — grüner Garten mit Baum in der Mitte
function InnerCourtyard({ size }: { size: number }) {
  return (
    <group>
      {/* Rasenfläche */}
      <mesh position={[0, 0.018, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial color="#6b8e4a" roughness={0.92} />
      </mesh>
      {/* Sand-Weg als Kreuz */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[size * 0.2, size * 0.95]} />
        <meshStandardMaterial color="#c9ad7f" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[size * 0.95, size * 0.2]} />
        <meshStandardMaterial color="#c9ad7f" roughness={0.9} />
      </mesh>
      {/* Kleiner Baum mittig */}
      <mesh position={[0, 0.06, 0]} castShadow>
        <cylinderGeometry args={[0.015, 0.02, 0.12, 6]} />
        <meshStandardMaterial color="#4a2e1a" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.16, 0]} castShadow>
        <sphereGeometry args={[0.08, 12, 10]} />
        <meshStandardMaterial color="#3d6b3f" roughness={0.85} />
      </mesh>
    </group>
  );
}

// Dachboxen: Klimaanlagen (kleine graue Quader)
function RooftopAC({ roofY, sx, sz, sr }: { roofY: number; sx: number; sz: number; sr: number }) {
  const w = 0.06 + sr * 0.04;
  return (
    <mesh position={[sx, roofY + 0.03, sz]} castShadow>
      <boxGeometry args={[w, 0.05, w * 0.8]} />
      <meshStandardMaterial color="#c8ccd0" roughness={0.5} metalness={0.4} />
    </mesh>
  );
}

// Solarpanels — Reihe aus dunkelblauen flachen Rechtecken
function RooftopSolar({ roofY }: { roofY: number }) {
  const panels: JSX.Element[] = [];
  const count = 3;
  for (let i = 0; i < count; i++) {
    const px = (i - (count - 1) / 2) * 0.12;
    panels.push(
      <mesh key={i} position={[px, roofY + 0.015, 0.22]} rotation={[-Math.PI / 2.4, 0, 0]} castShadow>
        <planeGeometry args={[0.1, 0.07]} />
        <meshStandardMaterial color="#1e2a4a" roughness={0.25} metalness={0.6} />
      </mesh>
    );
  }
  return <>{panels}</>;
}

// Penthouse — kleine weiße Box auf dem Dach
function RooftopPenthouse({ roofY, color }: { roofY: number; color: string }) {
  return (
    <group>
      {/* Kleiner Dachaufbau — bewusst klein, damit er nicht wie eine zweite
          Fassadenschicht wirkt. Nur ~30% der Dachhoehe. */}
      <mesh position={[-0.24, roofY + 0.025, -0.24]} castShadow receiveShadow>
        <boxGeometry args={[0.12, 0.05, 0.1]} />
        <meshStandardMaterial color={color} roughness={0.75} />
      </mesh>
      <mesh position={[-0.24, roofY + 0.055, -0.24]}>
        <boxGeometry args={[0.14, 0.008, 0.12]} />
        <meshStandardMaterial color="#8a3a20" roughness={0.8} />
      </mesh>
    </group>
  );
}

// Terrasse — helle Fläche + Liegen + Pflanzen-Töpfe
function RooftopTerrace({ roofY }: { roofY: number }) {
  return (
    <group>
      <mesh position={[0.3, roofY + 0.005, 0.3]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.32, 0.28]} />
        <meshStandardMaterial color="#d8cfb8" roughness={0.85} />
      </mesh>
      {/* 2 Liege-Andeutungen */}
      <mesh position={[0.24, roofY + 0.018, 0.3]} castShadow>
        <boxGeometry args={[0.08, 0.02, 0.04]} />
        <meshStandardMaterial color="#4a8ec5" roughness={0.6} />
      </mesh>
      <mesh position={[0.36, roofY + 0.018, 0.3]} castShadow>
        <boxGeometry args={[0.08, 0.02, 0.04]} />
        <meshStandardMaterial color="#e8a23c" roughness={0.6} />
      </mesh>
      {/* Pflanzen-Töpfe — 3 Stück */}
      <group position={[0.28, roofY + 0.012, 0.22]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.025, 0.022, 0.025, 10]} />
          <meshStandardMaterial color="#8a5a3a" roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.025, 0]} castShadow>
          <sphereGeometry args={[0.035, 10, 8]} />
          <meshStandardMaterial color="#3d6b3f" roughness={0.85} />
        </mesh>
      </group>
      <group position={[0.38, roofY + 0.012, 0.38]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.022, 0.02, 0.022, 10]} />
          <meshStandardMaterial color="#95613f" roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.022, 0]} castShadow>
          <sphereGeometry args={[0.032, 10, 8]} />
          <meshStandardMaterial color="#4c7c4a" roughness={0.85} />
        </mesh>
      </group>
      <group position={[0.2, roofY + 0.012, 0.36]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.02, 0.018, 0.02, 10]} />
          <meshStandardMaterial color="#7f4f30" roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.02, 0]} castShadow>
          <sphereGeometry args={[0.028, 10, 8]} />
          <meshStandardMaterial color="#588a50" roughness={0.85} />
        </mesh>
      </group>
    </group>
  );
}

// Plaza — grüner Park für null-Zellen (Monumental Squares im echten Eixample)
// Brache — ungenutztes Grundstück: sandiger Boden, ein paar Grasbüschel,
// vielleicht ein Schutthaufen. Flach, klarer Kontrast zu hohen Team-Blöcken.
function Brache({ x, z, seed }: { x: number; z: number; seed: number }) {
  const rng = useMemo(() => rngFromSeed(seed + 2024), [seed]);
  const clumps = useMemo(
    () => Array.from({ length: 5 + Math.floor(rng() * 4) },
      () => [(rng() - 0.5) * 1.0, (rng() - 0.5) * 1.0, 0.5 + rng() * 0.5] as [number, number, number]),
    [rng]
  );
  const hasRubble = useMemo(() => rng() > 0.5, [rng]);
  return (
    <group position={[x, 0.02, z]}>
      {/* Erdboden */}
      <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[1.22, 1.22]} />
        <meshStandardMaterial color="#6b5a3d" roughness={0.98} />
      </mesh>
      {/* Dunklere Flecken (Erdvariation) */}
      <mesh position={[0.15, 0.004, -0.1]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.3, 10]} />
        <meshStandardMaterial color="#5a4a30" roughness={0.98} />
      </mesh>
      {/* Gras-/Unkraut-Büschel */}
      {clumps.map((c, i) => (
        <mesh key={i} position={[c[0], 0.025, c[1]]} castShadow>
          <sphereGeometry args={[0.04 * c[2], 6, 5]} />
          <meshStandardMaterial color="#7a8a4a" roughness={0.95} />
        </mesh>
      ))}
      {/* Schutthaufen (optional) */}
      {hasRubble && (
        <group position={[0.25, 0, 0.2]}>
          <mesh position={[0, 0.04, 0]} castShadow>
            <boxGeometry args={[0.22, 0.08, 0.18]} />
            <meshStandardMaterial color="#8c8275" roughness={0.9} />
          </mesh>
          <mesh position={[0.08, 0.08, 0.05]} castShadow rotation={[0.2, 0.4, 0.1]}>
            <boxGeometry args={[0.1, 0.08, 0.09]} />
            <meshStandardMaterial color="#7a7268" roughness={0.9} />
          </mesh>
        </group>
      )}
      {/* Niedriger Bauzaun rundherum (3 von 4 Seiten stilisiert) */}
      {[[0, 0.06, 0.58], [0.58, 0.06, 0], [-0.58, 0.06, 0]].map((p, i) => (
        <mesh key={`fence-${i}`} position={[p[0], p[1], p[2]]} castShadow>
          <boxGeometry args={i === 0 ? [1.16, 0.12, 0.02] : [0.02, 0.12, 1.16]} />
          <meshStandardMaterial color="#b5a584" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function Plaza({ x, z, seed }: { x: number; z: number; seed: number }) {
  const rng = useMemo(() => rngFromSeed(seed + 999), [seed]);
  const hasFountain = useMemo(() => rng() > 0.4, [rng]);
  const treeCount = 4 + Math.floor(rng() * 3);
  const treePos = useMemo(
    () => Array.from({ length: treeCount }, () => [(rng() - 0.5) * 0.9, (rng() - 0.5) * 0.9, rng()] as [number, number, number]),
    [rng, treeCount]
  );
  return (
    <group position={[x, 0.02, z]}>
      {/* Rasen */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[1.22, 1.22]} />
        <meshStandardMaterial color="#6d9249" roughness={0.92} />
      </mesh>
      {/* Diagonale Wege als Kreuz — Plane plattlegen (rotateX -PI/2) und danach
          innerhalb der horizontalen Ebene via rotateZ um 45° drehen.
          (rotateY nach rotateX würde den Plane aufrichten, weil die lokale Y-Achse
          nach dem X-Flip entlang World-Z zeigt — das war der diagonale-Balken-Bug.)
          Außerdem kürzer (1.0 statt 1.55), damit sie nicht aus der Plaza ragen. */}
      <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
        <planeGeometry args={[1.0, 0.14]} />
        <meshStandardMaterial color="#cdb184" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, -Math.PI / 4]}>
        <planeGeometry args={[1.0, 0.14]} />
        <meshStandardMaterial color="#cdb184" roughness={0.9} />
      </mesh>
      {/* Fountain */}
      {hasFountain && (
        <group>
          <mesh position={[0, 0.04, 0]} castShadow>
            <cylinderGeometry args={[0.14, 0.14, 0.05, 24]} />
            <meshStandardMaterial color="#a8a8a4" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.065, 0]} receiveShadow>
            <cylinderGeometry args={[0.12, 0.12, 0.01, 24]} />
            <meshStandardMaterial color="#5a8dc2" roughness={0.2} metalness={0.4} />
          </mesh>
          <mesh position={[0, 0.13, 0]} castShadow>
            <cylinderGeometry args={[0.02, 0.02, 0.12, 10]} />
            <meshStandardMaterial color="#8a8a86" roughness={0.6} />
          </mesh>
        </group>
      )}
      {/* Bäume */}
      {treePos.map((p, i) => {
        // Nicht auf Fountain legen
        if (hasFountain && Math.abs(p[0]) < 0.2 && Math.abs(p[1]) < 0.2) return null;
        return <TreeAt key={i} x={p[0]} z={p[1]} scale={0.8 + p[2] * 0.25} />;
      })}
    </group>
  );
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

// ─────────────────────────────────────────────────────────────────────────────
// ④ HABITAT CELL — Tier-Häuser, die mit Cluster-Größe wachsen.
// Kleine Hütte (1 Feld) → Cottage (2-3) → Tower (4-5) → Skyscraper (6+).
// Stapel = klassische Pagode mit 3 abgestuften Stockwerken.
// Joker = schwebendes Häuschen + rotierender Sparkle-Ring oben.
// Frozen = Eiskristall-Kappe auf dem Dach.
// Cluster ≥ 3 = farbiger Glow-Ring um die Basis.
// Avatar schwebt als Billboard ueber dem Dach mit sanftem Bobbing.
// ─────────────────────────────────────────────────────────────────────────────
function HabitatCell({ x, z, avatar, joker, stacked, frozen, clusterSize, seed }: {
  x: number; z: number; avatar: typeof AVATARS[AvatarKey];
  joker: boolean; stacked: number; frozen: boolean; clusterSize: number; seed: number;
}) {
  const tex = useAvatarTexture(avatar.emoji);
  const headRef = useRef<THREE.Group>(null);
  const sparkleRef = useRef<THREE.Group>(null);
  const houseRef = useRef<THREE.Group>(null);
  const bob = seed * 0.6;

  // Kleines Cluster = niedrige Hütte, grosses Cluster = hoher Tower.
  // Cap bei 1.6, sonst werden die Modelle viel größer als die Tile-Spannweite.
  const baseH = stacked > 0
    ? 0.32 + 0.36 * (1 + stacked)        // Pagode-Stapel-Höhe
    : Math.min(1.55, 0.36 + clusterSize * 0.18);
  const topY = baseH + 0.05;

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (headRef.current) {
      headRef.current.position.y = topY + 0.3 + Math.sin(t * 1.4 + bob) * 0.05;
    }
    if (sparkleRef.current) {
      sparkleRef.current.rotation.y = t * 1.2;
      const s = 0.95 + Math.sin(t * 2.4 + bob) * 0.06;
      sparkleRef.current.scale.setScalar(s);
    }
    if (houseRef.current && joker) {
      // Joker-Hütte schwebt sanft hoch und runter
      houseRef.current.position.y = 0.05 + Math.sin(t * 0.9 + bob) * 0.04;
    }
  });

  return (
    <group>
      {/* Boden-Tile in Teamfarbe (gleich wie Variant 1/2) */}
      <TeamBase x={x} z={z} color={avatar.color} joker={joker} />

      {/* Cluster-Glow-Ring fuer grosse Territorien */}
      {clusterSize >= 3 && (
        <mesh position={[x, 0.045, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.6, 0.7, 36]} />
          <meshBasicMaterial color={avatar.color} toneMapped={false} transparent opacity={0.32} />
        </mesh>
      )}

      <group ref={houseRef} position={[x, 0.05, z]}>
        {stacked > 0 ? (
          // PAGODE — 3 hexagonale Stockwerke mit Pyramiden-Dächern
          <>
            {[0, 1, 2].map(i => {
              const tierH = 0.28;
              const tierY = i * (tierH + 0.06);
              const tierR = 0.38 - i * 0.06;
              return (
                <group key={i} position={[0, tierY, 0]}>
                  {/* Stockwerk */}
                  <mesh position={[0, tierH / 2, 0]} castShadow receiveShadow>
                    <cylinderGeometry args={[tierR, tierR + 0.02, tierH, 6]} />
                    <meshStandardMaterial
                      color="#f3e3c2"
                      roughness={0.7}
                      emissive={avatar.color}
                      emissiveIntensity={0.08}
                    />
                  </mesh>
                  {/* Dach */}
                  <mesh position={[0, tierH + 0.09, 0]} castShadow rotation={[0, Math.PI / 6, 0]}>
                    <coneGeometry args={[tierR + 0.12, 0.18, 6]} />
                    <meshStandardMaterial
                      color={avatar.color}
                      emissive={avatar.color}
                      emissiveIntensity={0.55}
                      roughness={0.4}
                      metalness={0.25}
                    />
                  </mesh>
                  {/* Dach-Kante (heller Rand wie traditionelle Pagode) */}
                  <mesh position={[0, tierH + 0.005, 0]}>
                    <torusGeometry args={[tierR + 0.06, 0.012, 6, 24]} />
                    <meshStandardMaterial color="#fde68a" emissive="#fbbf24" emissiveIntensity={0.4} toneMapped={false} />
                  </mesh>
                </group>
              );
            })}
            {/* Spitze ganz oben */}
            <mesh position={[0, 3 * (0.28 + 0.06) + 0.06, 0]} castShadow>
              <coneGeometry args={[0.05, 0.16, 4]} />
              <meshStandardMaterial color="#fde68a" emissive="#fbbf24" emissiveIntensity={1.0} metalness={0.7} roughness={0.3} />
            </mesh>
          </>
        ) : (
          // STANDARD-HAUS — Box mit Pyramiden-Dach in Teamfarbe + Fenster + Tür
          <>
            {/* Hauskorpus */}
            <mesh position={[0, baseH / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.62, baseH, 0.62]} />
              <meshStandardMaterial
                color="#efddb8"
                roughness={0.78}
                emissive={avatar.color}
                emissiveIntensity={0.06}
              />
            </mesh>
            {/* Pyramiden-Dach in Teamfarbe */}
            <mesh position={[0, baseH + 0.13, 0]} castShadow rotation={[0, Math.PI / 4, 0]}>
              <coneGeometry args={[0.5, 0.28, 4]} />
              <meshStandardMaterial
                color={avatar.color}
                emissive={avatar.color}
                emissiveIntensity={0.5}
                roughness={0.45}
                metalness={0.18}
              />
            </mesh>
            {/* Tür */}
            <mesh position={[0, 0.13, 0.312]}>
              <planeGeometry args={[0.13, 0.24]} />
              <meshStandardMaterial color="#3a2614" roughness={0.85} />
            </mesh>
            {/* Fenster — emissive, beleuchtet (links/rechts auf Frontfassade) */}
            <mesh position={[-0.18, baseH * 0.62, 0.312]}>
              <planeGeometry args={[0.11, 0.13]} />
              <meshStandardMaterial color="#fde68a" emissive="#fbbf24" emissiveIntensity={1.3} roughness={0.3} toneMapped={false} />
            </mesh>
            <mesh position={[0.18, baseH * 0.62, 0.312]}>
              <planeGeometry args={[0.11, 0.13]} />
              <meshStandardMaterial color="#fde68a" emissive="#fbbf24" emissiveIntensity={1.3} roughness={0.3} toneMapped={false} />
            </mesh>
            {/* Bei Tower (clusterSize >= 4): zweite Fenster-Reihe oberhalb */}
            {clusterSize >= 4 && (
              <>
                <mesh position={[-0.18, baseH * 0.32, 0.312]}>
                  <planeGeometry args={[0.11, 0.13]} />
                  <meshStandardMaterial color="#fde68a" emissive="#fbbf24" emissiveIntensity={1.0} roughness={0.3} toneMapped={false} />
                </mesh>
                <mesh position={[0.18, baseH * 0.32, 0.312]}>
                  <planeGeometry args={[0.11, 0.13]} />
                  <meshStandardMaterial color="#fde68a" emissive="#fbbf24" emissiveIntensity={1.0} roughness={0.3} toneMapped={false} />
                </mesh>
              </>
            )}
            {/* Bei Tower: schmale Türmchen an den Seiten */}
            {clusterSize >= 5 && (
              <>
                <mesh position={[0.36, baseH * 0.55, 0]} castShadow>
                  <cylinderGeometry args={[0.08, 0.08, baseH * 0.85, 12]} />
                  <meshStandardMaterial color="#efddb8" roughness={0.8} />
                </mesh>
                <mesh position={[0.36, baseH + 0.06, 0]} castShadow>
                  <coneGeometry args={[0.12, 0.18, 12]} />
                  <meshStandardMaterial color={avatar.color} emissive={avatar.color} emissiveIntensity={0.6} roughness={0.4} />
                </mesh>
              </>
            )}
            {/* Bei großem Cluster (≥4): Fahnenmast mit Team-Fahne auf der Spitze */}
            {clusterSize >= 4 && (
              <>
                <mesh position={[0, baseH + 0.42, 0]}>
                  <cylinderGeometry args={[0.008, 0.008, 0.3, 6]} />
                  <meshStandardMaterial color="#5a4a30" />
                </mesh>
                <mesh position={[0.08, baseH + 0.5, 0]}>
                  <planeGeometry args={[0.16, 0.1]} />
                  <meshStandardMaterial color={avatar.color} emissive={avatar.color} emissiveIntensity={0.4} side={THREE.DoubleSide} />
                </mesh>
              </>
            )}
          </>
        )}
      </group>

      {/* Tier-Avatar schwebt als Billboard ueber dem Haus */}
      <group ref={headRef} position={[x, topY + 0.3, z]}>
        <Billboard>
          {joker && (
            <mesh position={[0, 0, -0.01]}>
              <circleGeometry args={[0.32, 32]} />
              <meshBasicMaterial color="#fbbf24" toneMapped={false} transparent opacity={0.55} />
            </mesh>
          )}
          {/* Soft white glow disc behind avatar */}
          <mesh position={[0, 0, -0.005]}>
            <circleGeometry args={[0.26, 32]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.18} />
          </mesh>
          <mesh>
            <planeGeometry args={[0.46, 0.46]} />
            <meshBasicMaterial map={tex} transparent alphaTest={0.04} toneMapped={false} />
          </mesh>
        </Billboard>
      </group>

      {/* Joker: rotierender Sparkle-Ring oberhalb des Avatars */}
      {joker && (
        <group ref={sparkleRef} position={[x, topY + 0.78, z]}>
          {[0, 1, 2, 3, 4, 5, 6, 7].map(i => {
            const angle = (i / 8) * Math.PI * 2;
            const r = 0.34;
            return (
              <mesh key={i} position={[Math.cos(angle) * r, 0, Math.sin(angle) * r]}>
                <sphereGeometry args={[0.045, 10, 10]} />
                <meshStandardMaterial color="#fde68a" emissive="#fbbf24" emissiveIntensity={2.2} toneMapped={false} />
              </mesh>
            );
          })}
        </group>
      )}

      {/* Frozen: Eiskristall-Kappe auf dem Dach */}
      {frozen && (
        <mesh position={[x, topY + 0.08, z]} castShadow rotation={[0, Math.PI / 4, 0]}>
          <octahedronGeometry args={[0.16, 0]} />
          <meshStandardMaterial
            color="#bfe7ff"
            emissive="#5bb3ff"
            emissiveIntensity={0.85}
            roughness={0.12}
            metalness={0.45}
            transparent
            opacity={0.88}
          />
        </mesh>
      )}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ⑤ LANTERN FIELD — Schwebende Papier-Laternen, Bloom-Glow, Embers, Lake-Reflector.
// Maximaler Wow-Faktor: Lanterns sind die einzige relevante Lichtquelle, alles
// andere ist gedimmt. Bloom auf den emissive-Materialien ergibt das Glow-Halo.
// ─────────────────────────────────────────────────────────────────────────────

// Reflektierender, fast-schwarzer „Bambussee"-Boden — die Laternen spiegeln sich.
function LanternPondGround() {
  const groundSize = SIZE * TILE * 1.8;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[groundSize, groundSize]} />
        <MeshReflectorMaterial
          blur={[280, 90]}
          resolution={1024}
          mixBlur={1.0}
          mixStrength={1.6}
          roughness={0.85}
          depthScale={0.35}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#070a14"
          metalness={0.4}
          mirror={0.18}
        />
      </mesh>
      {/* Subtiler Außenring in tiefem Indigo, damit der Übergang zum BG sanft ist */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, 0]}>
        <ringGeometry args={[groundSize / 2, groundSize / 2 + 1.5, 64]} />
        <meshBasicMaterial color="#080c18" toneMapped={false} />
      </mesh>
    </group>
  );
}

// Embers — Glühpartikel, die langsam aufsteigen und ausfaden. Pseudo-zufällig
// per Seed gestreut, jeder Funken hat seinen eigenen Lebenszyklus.
function Embers({ count }: { count: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRefs = useRef<Array<THREE.Mesh | null>>([]);
  const seeds = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => {
      const r = rngFromSeed(i * 17 + 3);
      return {
        x: (r() - 0.5) * SIZE * TILE * 1.3,
        z: (r() - 0.5) * SIZE * TILE * 1.3,
        yStart: r() * 5,
        speed: 0.18 + r() * 0.32,
        size: 0.018 + r() * 0.028,
        phase: r() * Math.PI * 2,
        sway: 0.08 + r() * 0.18,
        hueShift: r(),
      };
    });
  }, [count]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    for (let i = 0; i < seeds.length; i++) {
      const m = meshRefs.current[i];
      if (!m) continue;
      const s = seeds[i];
      const ageY = (s.yStart + t * s.speed) % 5.5;
      m.position.y = 0.1 + ageY;
      m.position.x = s.x + Math.sin(t * 0.6 + s.phase) * s.sway;
      m.position.z = s.z + Math.cos(t * 0.45 + s.phase * 1.2) * s.sway;
      // Fadet hoch raus
      const fade = Math.max(0, 1 - ageY / 5.5);
      const mat = m.material as THREE.MeshBasicMaterial;
      if (mat) mat.opacity = fade * 0.85;
    }
  });

  return (
    <group ref={groupRef}>
      {seeds.map((s, i) => (
        <mesh
          key={i}
          ref={el => { meshRefs.current[i] = el; }}
          position={[s.x, s.yStart, s.z]}
        >
          <sphereGeometry args={[s.size, 6, 6]} />
          <meshBasicMaterial
            color={s.hueShift > 0.6 ? '#ffd28a' : s.hueShift > 0.3 ? '#ff9d4a' : '#ff7a2a'}
            toneMapped={false}
            transparent
            opacity={0.8}
          />
        </mesh>
      ))}
    </group>
  );
}

// Hot Air Balloon Body — Pear-shaped (Sphere + Neck-Cone unten), 6 vertikale
// Panel-Nähte als Halbkreis-Tori, emissive Teamfarbe → Bloom holt das Halo raus.
function BalloonBody({
  color, size = 1.0, intensity = 1.0, frozen = false, joker = false,
}: {
  color: string; size?: number; intensity?: number; frozen?: boolean; joker?: boolean;
}) {
  const innerColor = frozen ? '#dceaff' : joker ? '#fff4cc' : '#fff5d4';
  const emissiveColor = frozen ? '#7ec5ff' : joker ? '#fbbf24' : color;
  const seamColor = joker ? '#b8860b' : color;

  const radius = 0.42 * size;
  return (
    <group>
      {/* Ballon-Hauptkörper — Sphere, ein bisschen höher als breit (yScale 1.1) */}
      <group scale={[1, 1.1, 1]}>
        <mesh castShadow>
          <sphereGeometry args={[radius, 32, 24]} />
          <meshStandardMaterial
            color={innerColor}
            emissive={emissiveColor}
            emissiveIntensity={2.1 * intensity}
            roughness={0.55}
            transparent
            opacity={0.93}
            toneMapped={false}
          />
        </mesh>
        {/* Hellerer Innenkern fuer weichen Bloom-Trigger */}
        <mesh>
          <sphereGeometry args={[radius * 0.55, 18, 14]} />
          <meshBasicMaterial color={emissiveColor} toneMapped={false} transparent opacity={0.85} />
        </mesh>
      </group>
      {/* 6 vertikale Panel-Nähte als Halbkreis-Tori (Y-Achse) */}
      {[0, 1, 2, 3, 4, 5].map(i => {
        const angle = (i / 6) * Math.PI * 2;
        return (
          <mesh key={i} rotation={[Math.PI / 2, 0, angle]}>
            <torusGeometry args={[radius * 1.05, 0.005 * size, 4, 32, Math.PI]} />
            <meshStandardMaterial
              color={seamColor}
              emissive={seamColor}
              emissiveIntensity={0.4}
              roughness={0.6}
            />
          </mesh>
        );
      })}
      {/* Neck-Cone unten — Übergang zu den Seilen, leicht offen ("Brenneröffnung") */}
      <mesh position={[0, -radius * 1.1, 0]} castShadow>
        <coneGeometry args={[radius * 0.32, 0.22 * size, 16, 1, true]} />
        <meshStandardMaterial
          color={emissiveColor}
          emissive={emissiveColor}
          emissiveIntensity={0.7 * intensity}
          roughness={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Brenner-Glüh-Disk unten in der Öffnung */}
      <mesh position={[0, -radius * 1.18, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[radius * 0.28, 16]} />
        <meshBasicMaterial
          color={joker ? '#fde68a' : '#ffaa3a'}
          toneMapped={false}
          transparent
          opacity={0.85}
        />
      </mesh>
    </group>
  );
}

// Wicker-Basket (Gondola) — kleine Korbgeflecht-Box am Boden des Ballons.
// Trägt den Avatar als ExtrudedAvatar (Z-gestapelte Planes für Tiefe) +
// Team-Color-Ring drumherum (Canva-3D-Maker-Style).
function BalloonBasket({
  size = 1.0, avatarTex, color,
}: {
  size?: number; avatarTex: THREE.Texture; color: string;
}) {
  const basketR = 0.18 * size;
  const basketH = 0.16 * size;
  const avatarSize = basketR * 2.4;
  const ringR = avatarSize * 0.46;
  return (
    <group>
      {/* Korpus — leicht konisch (oben breiter), Korbgeflecht-Braun */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[basketR * 1.08, basketR * 0.95, basketH, 16]} />
        <meshStandardMaterial color="#7a4a1f" roughness={0.92} />
      </mesh>
      {/* Oberer Rand (dunkler) */}
      <mesh position={[0, basketH / 2, 0]} castShadow>
        <torusGeometry args={[basketR * 1.08, 0.012 * size, 8, 24]} />
        <meshStandardMaterial color="#3a2614" roughness={0.85} />
      </mesh>
      {/* 3 horizontale Geflecht-Linien */}
      {[-0.04, 0.0, 0.04].map((y, i) => (
        <mesh key={i} position={[0, y * size, 0]}>
          <torusGeometry args={[basketR * 1.04, 0.004 * size, 4, 18]} />
          <meshStandardMaterial color="#4a2a14" roughness={0.9} />
        </mesh>
      ))}

      {/* ── 3D-Avatar im Korb mit Canva-Style Ring drumherum ──
          NICHT als Billboard — die Z-gestapelten Planes brauchen ein festes
          Forward-Direction, damit das Auge die Tiefe wahrnimmt wenn die
          OrbitControls die Kamera schwenken. */}
      <group position={[0, basketH * 0.55, 0]}>
        {/* Glow-Disc dahinter (klein, fängt das Auge zum Avatar) */}
        <mesh position={[0, 0, -0.06]}>
          <circleGeometry args={[ringR * 1.05, 28]} />
          <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.32} />
        </mesh>
        {/* ExtrudedAvatar: flaches PNG bekommt durch Z-Layer-Stacking Tiefe */}
        <ExtrudedAvatar
          texture={avatarTex}
          size={avatarSize}
          depth={0.08 * size}
          layers={10}
        />
        {/* Canva-Style Team-Color-Ring um den Avatar — extrudiert via Torus,
            sieht aus wie ein 3D-Reifen aus dem die Animal-Cutout schaut. */}
        <mesh>
          <torusGeometry args={[ringR, 0.022 * size, 12, 36]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.65}
            metalness={0.35}
            roughness={0.32}
          />
        </mesh>
        {/* Innerer Ring-Schatten (dunklere Innenkante macht den Reifen runder) */}
        <mesh>
          <torusGeometry args={[ringR * 0.93, 0.008 * size, 8, 32]} />
          <meshStandardMaterial color={color} roughness={0.85} opacity={0.55} transparent />
        </mesh>
      </group>
    </group>
  );
}

// 4 Seile vom Ballon-Hals zur Korb-Oberkante
function BalloonRopes({ size = 1.0 }: { size?: number }) {
  const ropeLen = 0.18 * size;
  const offset = 0.13 * size;
  return (
    <group>
      {[[1, 1], [-1, 1], [1, -1], [-1, -1]].map(([dx, dz], i) => {
        // Ropes gehen leicht schräg nach innen/unten — vom Hals (oben breiter)
        // zum Korb-Rand (unten enger). Berechnung: tiltX/tiltZ für Rotation.
        const topX = dx * 0.06 * size;
        const topZ = dz * 0.06 * size;
        const botX = dx * offset;
        const botZ = dz * offset;
        const midX = (topX + botX) / 2;
        const midZ = (topZ + botZ) / 2;
        const dxRope = botX - topX;
        const dzRope = botZ - topZ;
        const rotZ = Math.atan2(dxRope, ropeLen);
        const rotX = -Math.atan2(dzRope, ropeLen);
        return (
          <mesh
            key={i}
            position={[midX, -ropeLen / 2, midZ]}
            rotation={[rotX, 0, rotZ]}
          >
            <cylinderGeometry args={[0.005 * size, 0.005 * size, ropeLen, 4]} />
            <meshStandardMaterial color="#2a1a0c" roughness={0.95} />
          </mesh>
        );
      })}
    </group>
  );
}

// Komplettes Heißluftballon-Modell: Body + Ropes + Basket + Avatar.
// Hängt am Mittelpunkt — Body zentriert bei (0,0,0), Korb fällt drunter.
function HotAirBalloon({
  color, size = 1.0, intensity = 1.0, frozen = false, joker = false, avatarTex,
}: {
  color: string; size?: number; intensity?: number;
  frozen?: boolean; joker?: boolean; avatarTex: THREE.Texture;
}) {
  const radius = 0.42 * size;
  return (
    <group>
      <BalloonBody color={color} size={size} intensity={intensity} frozen={frozen} joker={joker} />
      {/* Seile darunter */}
      <group position={[0, -radius * 1.32, 0]}>
        <BalloonRopes size={size} />
      </group>
      {/* Korb noch tiefer */}
      <group position={[0, -radius * 1.32 - 0.18 * size - 0.08 * size, 0]}>
        <BalloonBasket size={size} avatarTex={avatarTex} color={color} />
      </group>
    </group>
  );
}

// Sichtbares Grid fuer Variant 5 — warme Amber-Linien mit niedrigem Opacity,
// damit man die Tile-Grenzen sieht ohne dass es vom Lantern-Glow ablenkt.
function LanternGridLines() {
  const lines = [];
  const len = SIZE * TILE;
  const half = len / 2;
  for (let i = 0; i <= SIZE; i++) {
    const p = (i * TILE) - OFFSET - TILE / 2;
    lines.push(
      <mesh key={`h-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, p]}>
        <planeGeometry args={[len + 0.4, 0.018]} />
        <meshBasicMaterial color="#fbbf24" transparent opacity={0.18} toneMapped={false} />
      </mesh>,
      <mesh key={`v-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[p, 0.015, 0]}>
        <planeGeometry args={[0.018, len + 0.4]} />
        <meshBasicMaterial color="#fbbf24" transparent opacity={0.18} toneMapped={false} />
      </mesh>
    );
  }
  // Subtile Eck-Pfosten an jeder Kreuzung (kleine emissive Punkte)
  for (let i = 0; i <= SIZE; i++) {
    for (let j = 0; j <= SIZE; j++) {
      const x = (j * TILE) - OFFSET - TILE / 2;
      const z = (i * TILE) - OFFSET - TILE / 2;
      // Nur jeden zweiten Eckpfosten, sonst zu busy
      if ((i + j) % 2 !== 0) continue;
      // Außerhalb des Boards überspringen (passt zu len/2 Begrenzung)
      if (Math.abs(x) > half || Math.abs(z) > half) continue;
      lines.push(
        <mesh key={`p-${i}-${j}`} position={[x, 0.04, z]}>
          <sphereGeometry args={[0.018, 8, 6]} />
          <meshBasicMaterial color="#fde68a" toneMapped={false} transparent opacity={0.7} />
        </mesh>
      );
    }
  }
  return <>{lines}</>;
}

// LanternCell (jetzt: Hot-Air-Balloon-Cell) — schwebender Heißluftballon
// in Teamfarbe mit Avatar-PNG im Korb. Sanftes Bobbing + leichtes Pendeln.
// Joker = größerer goldener Ballon mit rotierendem Sparkle-Ring.
// Stapel = vertikale 3er-Ballon-Allee mit goldener Spitze.
// Frozen = eis-blau gefärbter Ballon mit Eiskristall-Aura.
function LanternCell({ x, z, avatar, joker, stacked, frozen, seed }: {
  x: number; z: number; avatar: typeof AVATARS[AvatarKey];
  joker: boolean; stacked: number; frozen: boolean; seed: number;
}) {
  const avatarTex = useAvatarImageTexture(avatar.image);
  const balloonRef = useRef<THREE.Group>(null);
  const sparkleRef = useRef<THREE.Group>(null);

  const isTower = stacked > 0;
  // Ein einzelner Ballon ist deutlich grösser als die alte Laterne — daher
  // hangY höher und Größen kleiner skaliert.
  const balloonSize = joker ? 1.25 : isTower ? 0.7 : 1.0;
  const hangY = isTower ? 1.85 : 1.25;
  const swingPhase = seed * 0.83;

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (balloonRef.current) {
      // Sanftes Schweben — Heißluftballons pendeln weniger als Laternen.
      balloonRef.current.rotation.z = Math.sin(t * 0.5 + swingPhase) * 0.04;
      balloonRef.current.rotation.x = Math.cos(t * 0.4 + swingPhase * 0.7) * 0.025;
      balloonRef.current.position.y = hangY + Math.sin(t * 0.65 + swingPhase) * 0.05;
    }
    if (sparkleRef.current) {
      sparkleRef.current.rotation.y = t * 0.9;
      const s = 0.95 + Math.sin(t * 2.4 + swingPhase) * 0.06;
      sparkleRef.current.scale.setScalar(s);
    }
  });

  // Real point light fuer den Lake-Reflector — wird auf Boden gespiegelt.
  const lightColor = frozen ? '#7ec5ff' : joker ? '#fbbf24' : avatar.color;
  const lightIntensity = joker ? 2.0 : isTower ? 1.5 : 1.1;

  return (
    <group position={[x, 0, z]}>
      {/* Boden-Sockel: dunkler Fels in matter Teamfarbe */}
      <mesh position={[0, 0.04, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.42, 0.46, 0.08, 16]} />
        <meshStandardMaterial color="#1a1d28" roughness={0.92} metalness={0.05} />
      </mesh>
      {/* Farbiger Glow-Ring auf dem Sockel — Team-Owner-Marker, klar sichtbar */}
      <mesh position={[0, 0.085, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.36, 0.44, 32]} />
        <meshBasicMaterial color={lightColor} toneMapped={false} transparent opacity={0.9} />
      </mesh>

      {/* Anker-Seil vom Boden bis zum Korb (sehr dünn, fast nur Andeutung).
          Macht das „der Ballon schwebt fest auf seinem Feld" lesbar. */}
      <mesh position={[0, hangY * 0.4, 0]}>
        <cylinderGeometry args={[0.0035, 0.0035, hangY * 0.7, 4]} />
        <meshBasicMaterial color="#2a1a0c" transparent opacity={0.6} toneMapped={false} />
      </mesh>

      {/* DER BALLON / TOWER */}
      <group ref={balloonRef} position={[0, hangY, 0]}>
        {isTower ? (
          // STAPEL-TOWER: 3 Ballons vertikal — größer unten, kleiner oben
          <>
            {[0, 1, 2].map(i => {
              const tierSize = 0.95 - i * 0.18;
              const tierY = -0.85 + i * 0.85;
              return (
                <group key={i} position={[0, tierY, 0]}>
                  <HotAirBalloon
                    color={avatar.color}
                    size={tierSize}
                    intensity={1.1}
                    joker={joker}
                    frozen={frozen}
                    avatarTex={avatarTex}
                  />
                </group>
              );
            })}
          </>
        ) : (
          <HotAirBalloon
            color={avatar.color}
            size={balloonSize}
            intensity={joker ? 1.6 : 1.0}
            joker={joker}
            frozen={frozen}
            avatarTex={avatarTex}
          />
        )}
      </group>

      {/* Joker: rotierender Sparkle-Ring um den großen Ballon */}
      {joker && (
        <group ref={sparkleRef} position={[0, hangY + 0.05, 0]}>
          {[0, 1, 2, 3, 4, 5, 6, 7].map(i => {
            const angle = (i / 8) * Math.PI * 2;
            const r = 0.78;
            return (
              <mesh key={i} position={[Math.cos(angle) * r, 0, Math.sin(angle) * r]}>
                <sphereGeometry args={[0.055, 10, 10]} />
                <meshStandardMaterial color="#fde68a" emissive="#fbbf24" emissiveIntensity={2.8} toneMapped={false} />
              </mesh>
            );
          })}
        </group>
      )}

      {/* Echte Punktlicht im Ballon — beleuchtet leicht den Boden + Lake-Reflector */}
      <pointLight
        position={[0, hangY, 0]}
        color={lightColor}
        intensity={lightIntensity}
        distance={isTower ? 5.2 : 3.6}
        decay={1.8}
        castShadow={false}
      />

      {/* Frozen: kalte Eis-Aura um den Ballon */}
      {frozen && !isTower && (
        <mesh position={[0, hangY, 0]}>
          <sphereGeometry args={[0.7, 16, 12]} />
          <meshBasicMaterial color="#7ec5ff" toneMapped={false} transparent opacity={0.08} />
        </mesh>
      )}
    </group>
  );
}

// Dunkles Stein-Tile fuer freie Felder im Lantern Field — fast unsichtbar,
// damit die Laternen das Auge fuehren.
function DarkStoneTile({ x, z, seed }: { x: number; z: number; seed: number }) {
  const rng = useMemo(() => rngFromSeed(seed), [seed]);
  const rotY = rng() * Math.PI * 2;
  const scale = 0.92 + rng() * 0.16;
  return (
    <group position={[x, 0, z]} rotation={[0, rotY, 0]}>
      <mesh position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[0.42 * scale, 12]} />
        <meshStandardMaterial color="#0c0f18" roughness={0.94} metalness={0.05} />
      </mesh>
      {/* Subtiler Moos-Akzent in dunkelgrün — nur 30% der Tiles, per Seed entschieden */}
      {rng() < 0.3 && (
        <mesh position={[(rng() - 0.5) * 0.4, 0.028, (rng() - 0.5) * 0.4]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.06 + rng() * 0.05, 8]} />
          <meshStandardMaterial color="#1f3624" roughness={0.95} emissive="#0a1410" emissiveIntensity={0.3} />
        </mesh>
      )}
    </group>
  );
}

// Wiesen-Hügel als „leeres Feld" in Variant 4 — ein dunkelgrüner Mound mit
// 1-2 Bäumchen drauf, statt der dunklen leeren Tile-Plane.
function MeadowMound({ x, z, seed }: { x: number; z: number; seed: number }) {
  const rng = useMemo(() => rngFromSeed(seed), [seed]);
  const treeCount = 1 + Math.floor(rng() * 2);
  const trees: Array<{ tx: number; tz: number; sc: number }> = [];
  for (let i = 0; i < treeCount; i++) {
    trees.push({
      tx: (rng() - 0.5) * 0.6,
      tz: (rng() - 0.5) * 0.6,
      sc: 0.42 + rng() * 0.18,
    });
  }
  return (
    <group position={[x, 0, z]}>
      {/* Hügel-Boden */}
      <mesh position={[0, 0.045, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[0.6, 24]} />
        <meshStandardMaterial color="#3d6b3f" roughness={0.92} />
      </mesh>
      {/* Sanfter Hügel-Dome */}
      <mesh position={[0, 0.04, 0]} castShadow receiveShadow>
        <sphereGeometry args={[0.55, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2.6]} />
        <meshStandardMaterial color="#3d6b3f" roughness={0.95} />
      </mesh>
      {trees.map((t, i) => <TreeAt key={i} x={t.tx} z={t.tz} scale={t.sc} />)}
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
