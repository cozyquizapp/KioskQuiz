// QQDemoShowcase3D — 3D/WebGL-Hero mit den ECHTEN Live-Quiz-Views (drei <Html
// transform>) in einer Three.js-Szene: dunkler Raum, Projektor, weicher
// volumetrischer Lichtstrahl (Gradient-Textur), Screen-Glow, Boden-Lichtpfuetze,
// Bloom. Sounds: keine. Beat-Timeline/Mock-State 1:1 aus QQDemoShowcase (2D).
//
// Tuning: Seite mit ?tune=1 oeffnen → Live-Slider-Panel (nur dann sichtbar).
// Werte unten als Default eintragen, sobald die Komposition sitzt.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { AvatarSetProvider } from '../avatarSetContext';
import { wakeAllAvatars, wakeTeamAvatar } from '../avatarAwake';
import {
  BEAMER, PHONE, buildBeats, BeamerScene, PhoneScene, ProjectedFX, DemoKeyframes, type Beat,
} from './QQDemoShowcase';

const COZY_BG = 'radial-gradient(circle at 50% 0%, #1E2A5A 0%, #0F1530 60%, #0A0E22 100%)';
const PROJ = new THREE.Vector3(0.35, -1.95, 2.4);

// drei <Html transform>: 1024px-Screen * scale * ~0.046 ≈ Weltbreite.
// Aus Screenshot geeicht; ~47 Welt-Einheiten Breite pro Scale-Einheit (1024px).
const PX_TO_WORLD = 47;

type Params = {
  camZ: number;
  beamerScale: number; beamerX: number; beamerY: number;
  phoneScale: number; phoneX: number; phoneY: number; phoneRotY: number;
  coneOpacity: number; coneRadius: number; bloom: number;
};

// ── Default-Komposition (per ?tune=1 nachjustierbar) ─────────────────────────
const DEFAULTS: Params = {
  camZ: 5.6,
  beamerScale: 0.075, beamerX: -1.05, beamerY: 0.42,
  phoneScale: 0.072, phoneX: 1.7, phoneY: -0.05, phoneRotY: -0.32,
  coneOpacity: 0.06, coneRadius: 1.35, bloom: 0.75,
};

// ── Canvas-Texturen (weicher Strahl + radialer Glow) ─────────────────────────
function makeBeamTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 8; c.height = 256;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0.0, 'rgba(210,228,255,0)');
  g.addColorStop(0.14, 'rgba(214,230,255,0.55)');
  g.addColorStop(0.45, 'rgba(196,216,255,0.30)');
  g.addColorStop(0.82, 'rgba(186,206,255,0.12)');
  g.addColorStop(1.0, 'rgba(180,200,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 8, 256);
  const t = new THREE.CanvasTexture(c);
  t.needsUpdate = true;
  return t;
}
function makeRadialTexture(inner: string, mid: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, inner);
  g.addColorStop(0.5, mid);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.needsUpdate = true;
  return t;
}

// ── Raum (Wand + Boden, dezent angeleuchtet) ─────────────────────────────────
function Room({ p }: { p: Params }) {
  return (
    <group>
      <mesh position={[0, 0.3, -1.6]}>
        <planeGeometry args={[30, 18]} />
        <meshStandardMaterial color="#0a0c16" roughness={1} metalness={0} />
      </mesh>
      <mesh position={[0, -2.5, 1]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[30, 16]} />
        <meshStandardMaterial color="#070910" roughness={1} metalness={0} />
      </mesh>
      <pointLight position={[p.beamerX, p.beamerY, 1.6]} intensity={9} distance={10} decay={2} color="#9db8ff" />
      <pointLight position={[p.phoneX, p.phoneY, 1.6]} intensity={3} distance={7} decay={2} color="#ec4899" />
      <ambientLight intensity={0.12} />
    </group>
  );
}

// ── Boden-Lichtpfuetze unter dem Screen ──────────────────────────────────────
function FloorGlow({ p, tex }: { p: Params; tex: THREE.Texture }) {
  const w = p.beamerScale * PX_TO_WORLD * 1.8;
  return (
    <mesh position={[p.beamerX, -2.48, 0.6]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[w, w * 0.8]} />
      <meshBasicMaterial map={tex} transparent blending={THREE.AdditiveBlending} depthWrite={false} opacity={0.55} toneMapped={false} />
    </mesh>
  );
}

// ── Glow hinter dem Screen (Licht spillt in den Raum) ────────────────────────
function ScreenGlow({ p, tex }: { p: Params; tex: THREE.Texture }) {
  const w = p.beamerScale * PX_TO_WORLD * 1.7;
  const h = w * (BEAMER.h / BEAMER.w) * 1.5;
  return (
    <mesh position={[p.beamerX, p.beamerY, -0.06]}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={tex} transparent blending={THREE.AdditiveBlending} depthWrite={false} opacity={0.7} toneMapped={false} />
    </mesh>
  );
}

// ── Projektor (stilisiert, dunkel) ───────────────────────────────────────────
function Projector() {
  return (
    <group position={PROJ.toArray()}>
      <mesh rotation={[0.12, 0, 0]}>
        <boxGeometry args={[0.9, 0.4, 0.66]} />
        <meshStandardMaterial color="#15171f" roughness={0.55} metalness={0.4} />
      </mesh>
      <mesh position={[-0.32, 0.06, 0.34]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.09, 0.09, 0.08, 24]} />
        <meshStandardMaterial color="#dfeaff" emissive="#bcd4ff" emissiveIntensity={3.6} toneMapped={false} />
      </mesh>
    </group>
  );
}

// ── Volumetrischer Lichtstrahl (Gradient-Textur) + Staub ─────────────────────
function Beam({ p, tex }: { p: Params; tex: THREE.Texture }) {
  const motesRef = useRef<THREE.Group>(null);
  const screen = useMemo(() => new THREE.Vector3(p.beamerX, p.beamerY, -0.02), [p.beamerX, p.beamerY]);
  const { len, position, quaternion } = useMemo(() => {
    const dir = new THREE.Vector3().subVectors(screen, PROJ);
    const l = dir.length();
    const mid = new THREE.Vector3().addVectors(PROJ, screen).multiplyScalar(0.5);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    return { len: l, position: mid.toArray() as [number, number, number], quaternion: [q.x, q.y, q.z, q.w] as [number, number, number, number] };
  }, [screen]);

  const motes = useMemo(() => {
    const n = 80;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const ly = (Math.random() - 0.5) * len;
      const frac = ly / len + 0.5;
      const r = (0.05 + frac * (p.coneRadius * 0.85)) * Math.sqrt(Math.random());
      const a = Math.random() * Math.PI * 2;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = ly;
      pos[i * 3 + 2] = Math.sin(a) * r;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, [len, p.coneRadius]);

  useFrame((_, dt) => {
    if (motesRef.current) motesRef.current.rotation.y += dt * 0.1;
  });

  return (
    <group position={position} quaternion={quaternion}>
      <mesh>
        <cylinderGeometry args={[p.coneRadius, 0.05, len, 56, 1, true]} />
        <meshBasicMaterial map={tex} transparent opacity={p.coneOpacity * 14} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[p.coneRadius * 0.5, 0.035, len, 40, 1, true]} />
        <meshBasicMaterial map={tex} transparent opacity={p.coneOpacity * 10} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <group ref={motesRef}>
        <points geometry={motes}>
          <pointsMaterial color="#cfe0ff" size={0.028} sizeAttenuation transparent opacity={0.55} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </points>
      </group>
    </group>
  );
}

// ── Kamera-Parallax ──────────────────────────────────────────────────────────
function CameraRig({ p }: { p: Params }) {
  useFrame((state) => {
    const tx = state.pointer.x * 0.5;
    const ty = 0.28 + state.pointer.y * 0.35;
    state.camera.position.x += (tx - state.camera.position.x) * 0.045;
    state.camera.position.y += (ty - state.camera.position.y) * 0.045;
    state.camera.position.z += (p.camZ - state.camera.position.z) * 0.08;
    state.camera.lookAt(p.beamerX * 0.5, p.beamerY * 0.4, 0);
  });
  return null;
}

// ── Echte Views als DOM im 3D-Raum ───────────────────────────────────────────
function BeamerHtml({ beat, p }: { beat: Beat; p: Params }) {
  return (
    <Html transform position={[p.beamerX, p.beamerY, -0.02]} rotation={[0, 0.05, 0]} scale={p.beamerScale} zIndexRange={[10, 0]} pointerEvents="none">
      <AvatarSetProvider value="cozy3d">
        <div style={{
          width: BEAMER.w, height: BEAMER.h, position: 'relative', overflow: 'hidden',
          borderRadius: 16, background: COZY_BG, pointerEvents: 'none',
          boxShadow: '0 0 0 2px rgba(255,255,255,0.10), 0 0 80px rgba(120,150,255,0.35)',
        }}>
          <BeamerScene beat={beat} />
          <ProjectedFX radius={16} />
        </div>
      </AvatarSetProvider>
    </Html>
  );
}

function PhoneHtml({ beat, p }: { beat: Beat; p: Params }) {
  return (
    <Html transform position={[p.phoneX, p.phoneY, 0.5]} rotation={[0, p.phoneRotY, 0.02]} scale={p.phoneScale} zIndexRange={[10, 0]} pointerEvents="none">
      <AvatarSetProvider value="cozy3d">
        <div style={{
          width: PHONE.w + 18, height: PHONE.h + 18, position: 'relative', padding: 9,
          borderRadius: 56, pointerEvents: 'none',
          background: 'linear-gradient(155deg,#262b3d 0%,#0c0f1a 70%)',
          boxShadow: '0 0 0 2px rgba(0,0,0,0.6), 0 0 70px rgba(236,72,153,0.4)',
        }}>
          <div style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', width: 120, height: 30, borderRadius: 99, background: '#05070d', zIndex: 5 }} />
          <div style={{ position: 'absolute', inset: 9, borderRadius: 48, overflow: 'hidden', background: COZY_BG }}>
            <PhoneScene beat={beat} />
          </div>
        </div>
      </AvatarSetProvider>
    </Html>
  );
}

function Effects({ p }: { p: Params }) {
  return (
    <EffectComposer>
      <Bloom intensity={p.bloom} luminanceThreshold={0.22} luminanceSmoothing={0.4} mipmapBlur radius={0.6} />
      <Vignette offset={0.24} darkness={0.92} eskil={false} />
    </EffectComposer>
  );
}

function Scene({ beat, p }: { beat: Beat; p: Params }) {
  const beamTex = useMemo(makeBeamTexture, []);
  const glowTex = useMemo(() => makeRadialTexture('rgba(150,180,255,0.55)', 'rgba(110,140,255,0.16)'), []);
  const floorTex = useMemo(() => makeRadialTexture('rgba(150,180,255,0.5)', 'rgba(120,150,255,0.12)'), []);
  return (
    <>
      <color attach="background" args={['#05060d']} />
      <fog attach="fog" args={['#05060d', 9, 30]} />
      <Room p={p} />
      <FloorGlow p={p} tex={floorTex} />
      <Projector />
      <Beam p={p} tex={beamTex} />
      <ScreenGlow p={p} tex={glowTex} />
      <BeamerHtml beat={beat} p={p} />
      <PhoneHtml beat={beat} p={p} />
      <CameraRig p={p} />
      <Effects p={p} />
    </>
  );
}

// ── Tune-Panel (nur bei ?tune=1) ─────────────────────────────────────────────
function TunePanel({ p, set }: { p: Params; set: (k: keyof Params, v: number) => void }) {
  const rows: [keyof Params, number, number, number][] = [
    ['camZ', 3, 10, 0.1], ['beamerScale', 0.02, 0.14, 0.002], ['beamerX', -3, 1, 0.05], ['beamerY', -1, 2, 0.05],
    ['phoneScale', 0.02, 0.14, 0.002], ['phoneX', 0, 4, 0.05], ['phoneY', -2, 2, 0.05], ['phoneRotY', -1, 1, 0.02],
    ['coneOpacity', 0, 0.15, 0.005], ['coneRadius', 0.4, 2.5, 0.05], ['bloom', 0, 2, 0.05],
  ];
  return (
    <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 50, background: 'rgba(0,0,0,0.82)', padding: 12, borderRadius: 10, fontFamily: 'monospace', fontSize: 12, color: '#fff', width: 260 }}>
      {rows.map(([k, min, max, step]) => (
        <label key={k} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 5 }}>
          <span style={{ width: 86 }}>{k}</span>
          <input type="range" min={min} max={max} step={step} value={p[k]} onChange={(e) => set(k, parseFloat(e.target.value))} style={{ flex: 1 }} />
          <span style={{ width: 44, textAlign: 'right' }}>{p[k]}</span>
        </label>
      ))}
      <textarea readOnly value={JSON.stringify(p)} onFocus={(e) => e.currentTarget.select()} style={{ width: '100%', height: 56, marginTop: 6, fontSize: 10, background: '#111', color: '#9fe' }} />
      <div style={{ fontSize: 10, opacity: 0.7, marginTop: 4 }}>Werte kopieren → an Claude schicken</div>
    </div>
  );
}

// ── Haupt-Komponente ─────────────────────────────────────────────────────────
export default function QQDemoShowcase3D() {
  const beats = useMemo(buildBeats, []);
  const [beat, setBeat] = useState(0);
  const [paused, setPaused] = useState(false);
  const [params, setParams] = useState<Params>(DEFAULTS);
  const setP = (k: keyof Params, v: number) => setParams((s) => ({ ...s, [k]: v }));
  const tune = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('tune') === '1';

  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => setBeat((b) => (b + 1) % beats.length), beats[beat].ms);
    return () => clearTimeout(t);
  }, [beat, paused, beats]);

  const cur = beats[beat];
  useEffect(() => {
    if (cur.beamer === 'lobby') wakeAllAvatars(2600);
    if (cur.highlightTeam) wakeTeamAvatar(cur.highlightTeam, 2600);
  }, [beat, cur]);

  return (
    <>
      <DemoKeyframes />
      <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, width: '100%' }}>
        <div key={`cap-${beat}`} style={{
          fontSize: 'clamp(15px, 2vw, 20px)', color: '#e2e8f0', fontWeight: 700,
          textAlign: 'center', maxWidth: 660, minHeight: 52, lineHeight: 1.35,
          animation: 'demoIn 0.5s ease both',
        }}>
          {cur.caption}
        </div>

        <div
          onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
          style={{
            position: 'relative', width: '100%', height: 'min(76vh, 660px)', borderRadius: 28, overflow: 'hidden',
            background: 'radial-gradient(125% 95% at 50% 0%, #0b1020 0%, #05060d 60%, #04050b 100%)',
            boxShadow: 'inset 0 0 160px rgba(0,0,0,0.9)', cursor: 'grab',
          }}>
          <Canvas dpr={[1, 1.6]} gl={{ antialias: true, alpha: false }} camera={{ position: [0, 0.3, params.camZ], fov: 42 }}>
            <Scene beat={cur} p={params} />
          </Canvas>
          {tune && <TunePanel p={params} set={setP} />}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {beats.map((_, i) => (
            <button key={i} aria-label={`Szene ${i + 1}`} onClick={() => setBeat(i)} style={{
              width: i === beat ? 24 : 8, height: 8, borderRadius: 99, border: 0, cursor: 'pointer', padding: 0,
              background: i === beat ? '#EC4899' : 'rgba(148,163,184,0.4)', transition: 'all 0.3s ease',
            }} />
          ))}
        </div>
      </section>
    </>
  );
}
