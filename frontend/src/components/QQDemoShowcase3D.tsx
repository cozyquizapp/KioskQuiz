// QQDemoShowcase3D — der „awwwards-Liga" Hero (Wolf-Wahl 2026-06-26: Voll-3D/WebGL).
// Eine echte Three.js-Szene (dunkler Raum, Projektor, volumetrischer Lichtkegel,
// Staubpartikel, Bloom) — und MITTENDRIN die ECHTEN Live-Quiz-Views, via drei
// <Html transform> als DOM in den 3D-Raum eingebettet (kein Nachbau, kein Foto).
// Inhalt + Beat-Timeline kommen 1:1 aus QQDemoShowcase (2D). Sounds: keine.
//
// Lazy-geladen von der Landing; bei WebGL-Fehler faellt die Landing auf die
// 2D-Variante zurueck (ErrorBoundary dort).
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

// Projektor-Position + Screen-Mittelpunkt (Weltkoordinaten) — der Lichtkegel
// spannt sich dazwischen.
const PROJ = new THREE.Vector3(0.25, -1.85, 2.9);
const SCREEN = new THREE.Vector3(-1.2, 0.5, -0.02);

// ── Raum (dunkle Wand + Boden, dezent angeleuchtet) ──────────────────────────
function Room() {
  return (
    <group>
      <mesh position={[0, 0, -1.3]} receiveShadow>
        <planeGeometry args={[26, 15]} />
        <meshStandardMaterial color="#0a0c16" roughness={1} metalness={0} />
      </mesh>
      <mesh position={[0, -2.6, 1]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[26, 14]} />
        <meshStandardMaterial color="#06070e" roughness={1} metalness={0} />
      </mesh>
      {/* weicher Lichtfleck auf der Wand hinter dem Screen */}
      <pointLight position={[SCREEN.x, SCREEN.y, 1.4]} intensity={7} distance={9} decay={2} color="#9db8ff" />
      <pointLight position={[2.0, -0.3, 1.8]} intensity={3} distance={7} decay={2} color="#ec4899" />
      <ambientLight intensity={0.12} />
    </group>
  );
}

// ── Projektor (stilisiert, dunkel — der Star ist das Licht) ───────────────────
function Projector() {
  return (
    <group position={PROJ.toArray()}>
      <mesh rotation={[0.12, 0, 0]}>
        <boxGeometry args={[0.95, 0.42, 0.7]} />
        <meshStandardMaterial color="#15171f" roughness={0.55} metalness={0.4} />
      </mesh>
      {/* Linse (emissive → bloomt) */}
      <mesh position={[-0.34, 0.06, 0.36]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.08, 24]} />
        <meshStandardMaterial color="#dfeaff" emissive="#bcd4ff" emissiveIntensity={3.4} toneMapped={false} />
      </mesh>
    </group>
  );
}

// ── Volumetrischer Lichtkegel + Staubpartikel ────────────────────────────────
function Beam() {
  const motesRef = useRef<THREE.Group>(null);
  const { len, position, quaternion } = useMemo(() => {
    const dir = new THREE.Vector3().subVectors(SCREEN, PROJ);
    const l = dir.length();
    const mid = new THREE.Vector3().addVectors(PROJ, SCREEN).multiplyScalar(0.5);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    return { len: l, position: mid.toArray() as [number, number, number], quaternion: [q.x, q.y, q.z, q.w] as [number, number, number, number] };
  }, []);

  // Staub im Kegel (lokale Koords: +Y = Screen-Seite, weiter Radius).
  const motes = useMemo(() => {
    const n = 90;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const ly = (Math.random() - 0.5) * len;
      const frac = ly / len + 0.5;            // 0 = Projektor … 1 = Screen
      const r = (0.05 + frac * 1.5) * Math.sqrt(Math.random());
      const a = Math.random() * Math.PI * 2;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = ly;
      pos[i * 3 + 2] = Math.sin(a) * r;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, [len]);

  useFrame((_, dt) => {
    if (motesRef.current) motesRef.current.rotation.y += dt * 0.12;
  });

  return (
    <group position={position} quaternion={quaternion}>
      {/* aeusserer weicher Kegel */}
      <mesh>
        <cylinderGeometry args={[1.7, 0.06, len, 48, 1, true]} />
        <meshBasicMaterial color="#a9c5ff" transparent opacity={0.06} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      {/* heller Kern */}
      <mesh>
        <cylinderGeometry args={[0.95, 0.04, len, 40, 1, true]} />
        <meshBasicMaterial color="#dbe8ff" transparent opacity={0.05} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <group ref={motesRef}>
        <points geometry={motes}>
          <pointsMaterial color="#cfe0ff" size={0.035} sizeAttenuation transparent opacity={0.7} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </points>
      </group>
    </group>
  );
}

// ── Kamera-Parallax (folgt subtil dem Cursor) ────────────────────────────────
function CameraRig() {
  useFrame((state) => {
    const tx = state.pointer.x * 0.55;
    const ty = 0.25 + state.pointer.y * 0.4;
    state.camera.position.x += (tx - state.camera.position.x) * 0.045;
    state.camera.position.y += (ty - state.camera.position.y) * 0.045;
    state.camera.lookAt(-0.35, 0.12, 0);
  });
  return null;
}

// ── Die echten Views als DOM im 3D-Raum ──────────────────────────────────────
function BeamerHtml({ beat }: { beat: Beat }) {
  return (
    <Html transform position={[SCREEN.x, SCREEN.y, SCREEN.z]} rotation={[0, 0.04, 0]} scale={0.0034} zIndexRange={[10, 0]}>
      <AvatarSetProvider value="cozy3d">
        <div style={{
          width: BEAMER.w, height: BEAMER.h, position: 'relative', overflow: 'hidden',
          borderRadius: 16, background: COZY_BG, pointerEvents: 'none',
          boxShadow: '0 0 0 2px rgba(255,255,255,0.08), 0 0 60px rgba(120,150,255,0.25)',
        }}>
          <BeamerScene beat={beat} />
          <ProjectedFX radius={16} />
        </div>
      </AvatarSetProvider>
    </Html>
  );
}

function PhoneHtml({ beat }: { beat: Beat }) {
  return (
    <Html transform position={[2.05, -0.3, 1.3]} rotation={[0, -0.36, 0.02]} scale={0.0034} zIndexRange={[10, 0]}>
      <AvatarSetProvider value="cozy3d">
        <div style={{
          width: PHONE.w + 18, height: PHONE.h + 18, position: 'relative', padding: 9,
          borderRadius: 56, pointerEvents: 'none',
          background: 'linear-gradient(155deg,#262b3d 0%,#0c0f1a 70%)',
          boxShadow: '0 0 0 2px rgba(0,0,0,0.6), 0 0 60px rgba(236,72,153,0.30)',
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

// ── Effects (Bloom + Vignette) ───────────────────────────────────────────────
function Effects() {
  return (
    <EffectComposer>
      <Bloom intensity={0.9} luminanceThreshold={0.16} luminanceSmoothing={0.4} mipmapBlur radius={0.7} />
      <Vignette offset={0.26} darkness={0.92} eskil={false} />
    </EffectComposer>
  );
}

function Scene({ beat }: { beat: Beat }) {
  return (
    <>
      <color attach="background" args={['#05060d']} />
      <fog attach="fog" args={['#05060d', 9, 28]} />
      <Room />
      <Projector />
      <Beam />
      <BeamerHtml beat={beat} />
      <PhoneHtml beat={beat} />
      <CameraRig />
      <Effects />
    </>
  );
}

// ── Haupt-Komponente (Beat-Timeline + Canvas) ────────────────────────────────
export default function QQDemoShowcase3D() {
  const beats = useMemo(buildBeats, []);
  const [beat, setBeat] = useState(0);
  const [paused, setPaused] = useState(false);

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
            width: '100%', height: 'min(74vh, 620px)', borderRadius: 28, overflow: 'hidden',
            background: 'radial-gradient(125% 95% at 50% 0%, #0b1020 0%, #05060d 60%, #04050b 100%)',
            boxShadow: 'inset 0 0 160px rgba(0,0,0,0.9)', cursor: 'grab',
          }}>
          <Canvas dpr={[1, 1.6]} gl={{ antialias: true, alpha: false }} camera={{ position: [0, 0.25, 6.6], fov: 42 }}>
            <Scene beat={cur} />
          </Canvas>
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
