import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import { FrogMesh } from './ToonFrogs';

/**
 * Cartoon pond constellation — toon frogs (project mascot).
 * Each module has a unique frog silhouette (form).
 */
const ORBS = [
  {
    id: 'nft',
    label: 'NFT',
    accent: '#FE77BC',
    // Front of the pond — sits on the sand bed
    path: { x: -0.25, y: 0, floor: -2.42 },
    lines: ['$1 mint', '1,111 supply'],
    form: 'stylish',
  },
  {
    id: 'portfolio',
    label: 'Portfolio',
    accent: '#5EC8FF',
    path: { x: 1.35, y: -0.18 },
    lines: ['Open positions', 'Cost basis', 'Realized PnL'],
    form: 'slim',
  },
  {
    id: 'tracker',
    label: 'Tracker',
    accent: '#FF5C7A',
    path: { x: -1.3, y: -0.4 },
    lines: ['Epoch progress', 'Rank delta', 'Reward est.'],
    form: 'athletic',
  },
  {
    id: 'treasury',
    label: 'Treasury',
    accent: '#D9FFB8',
    path: { x: 1.28, y: 0.35 },
    lines: ['Inflows', 'Airdrops', 'Epoch pool'],
    form: 'king',
  },
  {
    id: 'leaderboard',
    label: 'Rekt Leaderboard',
    accent: '#70C431',
    path: { x: -0.55, y: 0.5 },
    form: 'classic',
  },
];

/** Comfortable spacing — close enough to feel continuous, not stacked */
const STAR_GAP = 3.15;
const SCROLL_PER_STAR = 1.4;
const MAX_AHEAD = (ORBS.length - 1) * STAR_GAP;
const HUB_VIEWPORTS = (ORBS.length - 1) * SCROLL_PER_STAR + 0.5;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function depthToPose(depth, path) {
  const ahead = depth >= 0;
  const abs = Math.abs(depth);

  let scale;
  let opacity;

  if (ahead) {
    const t = THREE.MathUtils.clamp(abs / MAX_AHEAD, 0, 1);
    // Smooth ease across the whole swim — always visible ahead, never pop-in
    const ease = t * t * (3 - 2 * t);
    scale = THREE.MathUtils.lerp(1.08, 0.32, ease);
    opacity = THREE.MathUtils.lerp(1, 0.28, ease);
  } else {
    const t = THREE.MathUtils.clamp(abs, 0, 1.15);
    const ease = t / 1.15;
    scale = THREE.MathUtils.lerp(1.08, 1.85, ease);
    opacity = THREE.MathUtils.clamp(1 - ease * 1.15, 0, 1);
  }

  const z = -depth * 2.35;
  const drift = ahead ? 0.62 + abs * 0.26 : 1.05 + abs * 0.8;

  // When zoomed/focused, pull hard to screen center
  const centerT = 1 - THREE.MathUtils.clamp(abs / 1.05, 0, 1);
  const centerEase = centerT * centerT * (3 - 2 * centerT);

  let y;
  if (typeof path.floor === 'number') {
    const floorY = ahead
      ? path.floor + abs * 0.04
      : path.floor - abs * 0.12;
    // Lift off extreme bottom so the zoomed frog sits mid-frame
    y = THREE.MathUtils.lerp(floorY, -0.35, centerEase * 0.82);
  } else {
    y = THREE.MathUtils.lerp(path.y * drift, 0.05, centerEase * 0.75);
  }

  const x = THREE.MathUtils.lerp(path.x * drift, 0, centerEase * 0.95);

  return {
    x,
    y,
    z,
    scale,
    opacity,
    focused: abs < 0.48 && opacity > 0.55,
    grounded: typeof path.floor === 'number',
  };
}

function HubCamera({ mouseRef }) {
  const { camera } = useThree();
  useFrame(() => {
    const mx = mouseRef?.current?.sx ?? 0;
    const my = mouseRef?.current?.sy ?? 0;
    // Soft parallax — keep focused frog optically centered
    camera.position.x += (mx * 0.35 - camera.position.x) * 0.1;
    camera.position.y += (my * 0.22 - camera.position.y) * 0.1;
    camera.lookAt(mx * 0.08, my * 0.05, 0);
  });
  return null;
}

function ToonFrog({
  orb,
  index,
  progressRef,
  focusRef,
  onFocusChange,
  onSelect,
  enteringRef,
  mouseRef,
}) {
  const group = useRef(null);
  const bobRef = useRef(null);
  const bodyRef = useRef(null);
  const matRef = useRef(null);
  const matsRef = useRef(null);
  const fadeRef = useRef({ solid: true, o: 1 });
  const smooth = useRef({ x: 0, y: 0, z: 0, s: 1, o: 1 });
  // Each frog spins at its own pace / direction
  const spin = useMemo(
    () => ({
      speed: (0.45 + (index % 5) * 0.12) * (index % 2 === 0 ? 1 : -1),
      phase: index * 1.17,
      wobble: 0.7 + (index % 3) * 0.15,
    }),
    [index]
  );
  const accent = useMemo(() => new THREE.Color(orb.accent), [orb.accent]);
  const bodyColor = useMemo(() => {
    const c = new THREE.Color(orb.accent);
    c.offsetHSL(0, -0.06, -0.04);
    return c;
  }, [orb.accent]);

  useFrame((state) => {
    if (!group.current) return;

    const progress = progressRef.current;
    const depthBase = progress * (ORBS.length - 1) * STAR_GAP;
    const depth = index * STAR_GAP - depthBase;
    const pose = depthToPose(depth, orb.path);
    const mx = mouseRef?.current?.sx ?? 0;
    const my = mouseRef?.current?.sy ?? 0;
    // Don't shove focused frog off-center with mouse
    const mouseAmp = pose.focused ? 0.08 : 0.14;
    const t = state.clock.elapsedTime;

    const targetX = pose.x + mx * 0.18 * mouseAmp;
    const targetY = pose.focused
      ? pose.y + Math.sin(t * 0.9 + index) * 0.012
      : pose.grounded
        ? pose.y + Math.sin(t * 0.9 + index) * 0.015
        : pose.y + my * 0.25 * mouseAmp + Math.sin(t * 1.05 + index) * 0.02;
    const targetZ = pose.z;

    // Soft follow — no sudden pops when scrolling onto a frog
    const sm = smooth.current;
    const k = 0.12;
    sm.x += (targetX - sm.x) * k;
    sm.y += (targetY - sm.y) * k;
    sm.z += (targetZ - sm.z) * k;
    sm.s += (pose.scale - sm.s) * k;
    sm.o += (pose.opacity - sm.o) * k;

    group.current.position.set(sm.x, sm.y, sm.z);
    group.current.scale.setScalar(sm.s);
    group.current.visible = sm.o > 0.04;

    if (bobRef.current) {
      // Continuous self-spin — never idle
      const turn = t * spin.speed + spin.phase;
      bobRef.current.rotation.y = turn;
      bobRef.current.rotation.x = Math.sin(t * 0.9 * spin.wobble + spin.phase) * 0.08;
      bobRef.current.rotation.z = Math.sin(t * 1.1 * spin.wobble + index) * 0.06;
    }

    if (matRef.current) {
      const next = pose.focused ? 0.32 : 0.12;
      const cur = matRef.current.emissiveIntensity ?? 0.12;
      if (Math.abs(next - cur) > 0.008) {
        matRef.current.emissiveIntensity = THREE.MathUtils.lerp(cur, next, 0.1);
      }
    }

    const solid = sm.o > 0.94;
    const fade = fadeRef.current;
    if (solid !== fade.solid || Math.abs(sm.o - fade.o) > 0.02) {
      fade.solid = solid;
      fade.o = sm.o;
      if (!matsRef.current && bodyRef.current) {
        const collected = [];
        bodyRef.current.traverse((obj) => {
          if (!obj.isMesh || !obj.material) return;
          const list = Array.isArray(obj.material) ? obj.material : [obj.material];
          list.forEach((m) => {
            if (m.userData.baseOpacity === undefined) m.userData.baseOpacity = 1;
            collected.push(m);
          });
        });
        matsRef.current = collected;
      }
      const mats = matsRef.current;
      if (mats) {
        for (let i = 0; i < mats.length; i++) {
          const m = mats[i];
          if (solid) {
            m.transparent = false;
            m.opacity = 1;
            m.depthWrite = true;
          } else {
            m.transparent = true;
            m.opacity = sm.o * m.userData.baseOpacity;
            m.depthWrite = sm.o > 0.55;
          }
        }
      }
    }

    if (pose.focused && focusRef.current !== index) {
      focusRef.current = index;
      onFocusChange?.(index);
    }
  });

  const handleClick = (e) => {
    e.stopPropagation();
    if (enteringRef.current || focusRef.current !== index) return;
    enteringRef.current = true;
    onSelect?.(orb.id);
  };

  return (
    <group ref={group}>
      <group ref={bobRef}>
        <group ref={bodyRef}>
          <FrogMesh
            key={`frog-${orb.id}-glb`}
            color={bodyColor}
            accent={accent}
            formKey={orb.form}
            matRef={matRef}
            grounded={typeof orb.path.floor === 'number'}
            onClick={handleClick}
          />
        </group>
      </group>
    </group>
  );
}

function HubScene({
  progressRef,
  focusRef,
  onFocusChange,
  onSelect,
  enteringRef,
  mouseRef,
}) {
  return (
    <>
      <ambientLight intensity={0.72} color="#8FD4DE" />
      <hemisphereLight args={['#C8F6F8', '#013A48', 0.4]} />
      <directionalLight position={[3, 10, 4]} intensity={0.75} color="#E0FFFB" />
      <pointLight position={[-3, 2, 3]} intensity={0.45} color="#9EE8DC" distance={14} decay={1.5} />
      <pointLight position={[3, 0, 2]} intensity={0.3} color="#F5B0D0" distance={12} decay={1.5} />
      <HubCamera mouseRef={mouseRef} />

      {ORBS.map((orb, i) => (
        <ToonFrog
          key={orb.id}
          orb={orb}
          index={i}
          progressRef={progressRef}
          focusRef={focusRef}
          onFocusChange={onFocusChange}
          onSelect={onSelect}
          enteringRef={enteringRef}
          mouseRef={mouseRef}
        />
      ))}
    </>
  );
}

/**
 * Constellation of unique 3D toon frogs (project mascot).
 */
export default function GalaxyHub({
  active = true,
  onSelect,
  onFocusChange,
  travelRef = null,
  mouseRef = null,
}) {
  const rootRef = useRef(null);
  const pinRef = useRef(null);
  const localProgress = useRef(0);
  const progressRef = travelRef || localProgress;
  const focusRef = useRef(0);
  const enteringRef = useRef(false);
  const [focusIndex, setFocusIndex] = useState(0);
  const [onScreen, setOnScreen] = useState(true);

  useEffect(() => {
    onFocusChange?.(ORBS[focusIndex]?.id ?? null);
  }, [focusIndex, onFocusChange]);

  useEffect(() => {
    const root = rootRef.current;
    const pin = pinRef.current;
    if (!root || !pin || !active) return undefined;

    progressRef.current = 0;
    focusRef.current = 0;
    setFocusIndex(0);
    enteringRef.current = false;
    gsap.set(pin, { opacity: 1 });

    let startY = 0;
    const measure = () => {
      startY = root.getBoundingClientRect().top + window.scrollY;
    };
    const update = () => {
      const total = Math.max(1, root.offsetHeight - window.innerHeight);
      progressRef.current = Math.max(0, Math.min(1, (window.scrollY - startY) / total));
    };

    const onResize = () => {
      measure();
      update();
    };

    measure();
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });

    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', onResize);
    };
  }, [active]);

  useEffect(() => {
    const pin = pinRef.current;
    if (!pin || !active) return undefined;
    const io = new IntersectionObserver(
      ([entry]) => setOnScreen(entry.isIntersecting),
      { root: null, threshold: 0.05 }
    );
    io.observe(pin);
    return () => io.disconnect();
  }, [active]);

  const handleSelect = (id) => {
    const pin = pinRef.current;
    if (prefersReducedMotion() || !pin) {
      onSelect?.(id);
      enteringRef.current = false;
      return;
    }

    gsap.to(pin, {
      opacity: 0,
      duration: 0.18,
      ease: 'power2.out',
      onComplete: () => {
        onSelect?.(id);
        enteringRef.current = false;
      },
    });
  };

  return (
    <section
      ref={rootRef}
      className="galaxy-hub relative w-full"
      style={active ? { height: `${HUB_VIEWPORTS * 100}svh` } : undefined}
      aria-label="Frog navigation"
    >
      <div
        ref={pinRef}
        className="galaxy-hub-pin sticky top-0 flex h-[100svh] w-full items-center justify-center overflow-hidden"
      >
        <div className="galaxy-hub-canvas absolute inset-0 z-10">
          <Canvas
            key="frog-hub-center-zoom"
            dpr={[1, 1]}
            camera={{ position: [0, 0, 7.2], fov: 42, near: 0.1, far: 80 }}
            gl={{
              antialias: false,
              alpha: true,
              powerPreference: 'high-performance',
              stencil: false,
              depth: true,
            }}
            frameloop={active && onScreen ? 'always' : 'demand'}
            style={{ background: 'transparent' }}
          >
            <Suspense fallback={null}>
              <HubScene
                progressRef={progressRef}
                focusRef={focusRef}
                onFocusChange={setFocusIndex}
                onSelect={handleSelect}
                enteringRef={enteringRef}
                mouseRef={mouseRef}
              />
            </Suspense>
          </Canvas>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-10 z-20 flex flex-col items-center gap-3 px-6 text-center">
          <div>
            <p className="hub-frog-label">
              {ORBS[focusIndex]?.label ?? 'Choose a frog'}
              {ORBS[focusIndex]?.soon && (
                <span className="ml-2 align-middle rounded-lg border-2 border-cartoon-ink bg-cartoon-cream/15 px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-cartoon-cream">
                  Soon
                </span>
              )}
            </p>
            <p className="mt-2 text-sm text-cartoon-cream/70">
              {ORBS[focusIndex]?.soon
                ? 'Holder drops in a future season · click to preview'
                : 'Swim to travel · Click a frog to enter'}
            </p>
          </div>
          <div className="flex gap-2" aria-hidden="true">
            {ORBS.map((orb, i) => (
              <span
                key={orb.id}
                className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${
                  i === focusIndex ? 'w-5 bg-white' : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
