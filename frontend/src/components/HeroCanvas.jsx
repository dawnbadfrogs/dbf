import { useMemo, useRef, useEffect, Suspense, useState, useLayoutEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const WATER = '#243028';
const IDLE_Z = 6;
const IDLE_FOV = 55;
const SETTLE_Z = 4.2;
const SETTLE_FOV = 58;
const DIVE_PEAK_Z = 1.8;
const DIVE_PEAK_FOV = 88;

const FISH_COLORS = ['#FC6C34', '#FFD802', '#01D1FD', '#FE77BC', '#A8E5CF'];
const LEAF_COLORS = ['#6C8D22', '#75C025', '#4A7A28', '#9BC53D'];
const ROCK_COLORS = ['#7A8494', '#5C6670', '#9AA3AD', '#4A5560'];
const WOOD_COLORS = ['#C4894A', '#D4A06A', '#B87538'];

/* —— Bold cartoon lake assets (clear readable details) —— */
let geoCache = {};
let texCache = {};
// Bust caches when geometry/UV pipeline changes (HMR-safe)
const ASSET_CACHE_VER = 6;
if (typeof window !== 'undefined' && window.__dbfAssetVer !== ASSET_CACHE_VER) {
  window.__dbfAssetVer = ASSET_CACHE_VER;
  geoCache = {};
  texCache = {};
}

function makeCanvasTex(draw, size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  draw(ctx, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

/** High-contrast fish: scales + stripes + eye stickers */
function getFishMap() {
  if (texCache.fish || typeof document === 'undefined') return texCache.fish;
  texCache.fish = makeCanvasTex((ctx, s) => {
    ctx.fillStyle = '#f4f7fa';
    ctx.fillRect(0, 0, s, s);
    // belly lighter
    const belly = ctx.createLinearGradient(0, 0, 0, s);
    belly.addColorStop(0, 'rgba(255,255,255,0.15)');
    belly.addColorStop(1, 'rgba(255,255,255,0.55)');
    ctx.fillStyle = belly;
    ctx.fillRect(0, s * 0.45, s, s * 0.55);

    // bold cartoon scales (high contrast)
    for (let y = 18; y < s - 8; y += 20) {
      for (let x = 14; x < s - 8; x += 24) {
        const ox = ((y / 20) | 0) % 2 === 0 ? 0 : 12;
        const cx = x + ox;
        const cy = y;
        ctx.beginPath();
        ctx.arc(cx, cy, 10, 0.08 * Math.PI, 0.92 * Math.PI);
        ctx.strokeStyle = '#141820';
        ctx.lineWidth = 4.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy, 10, 0.08 * Math.PI, 0.92 * Math.PI);
        ctx.strokeStyle = 'rgba(255,255,255,0.65)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
    // fin ray hatch (top strip)
    ctx.strokeStyle = 'rgba(20,25,40,0.55)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 10; i++) {
      const x = 80 + i * 36;
      ctx.beginPath();
      ctx.moveTo(x, 8);
      ctx.lineTo(x + 10, 70);
      ctx.stroke();
    }

    // thick body stripes
    ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const x = 70 + i * 90;
      ctx.strokeStyle = 'rgba(20,25,40,0.35)';
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(x, 30);
      ctx.quadraticCurveTo(x + 12, s * 0.5, x, s - 30);
      ctx.stroke();
    }

    // cartoon eye stickers (survive tint multiply)
    const drawEye = (ex, ey) => {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#141820';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(ex, ey, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#1a2030';
      ctx.beginPath();
      ctx.arc(ex + 4, ey, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex + 9, ey - 5, 5, 0, Math.PI * 2);
      ctx.fill();
    };
    drawEye(s * 0.78, s * 0.38);
    drawEye(s * 0.78, s * 0.62);
  }, 512);
  return texCache.fish;
}

/** Cartoon leaf: thick veins + spots + outline wash */
function getLeafMap() {
  if (texCache.leaf || typeof document === 'undefined') return texCache.leaf;
  texCache.leaf = makeCanvasTex((ctx, s) => {
    ctx.fillStyle = '#d8f0a8';
    ctx.fillRect(0, 0, s, s);

    // soft blotches (deterministic)
    for (let i = 0; i < 18; i++) {
      const px = 40 + ((i * 97) % (s - 80));
      const py = 40 + ((i * 53) % (s - 80));
      ctx.fillStyle = i % 2 ? 'rgba(90,150,40,0.22)' : 'rgba(200,230,80,0.28)';
      ctx.beginPath();
      ctx.ellipse(px, py, 22 + (i % 5) * 8, 16 + (i % 4) * 6, i * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    const ink = '#1a2e10';
    // main vein
    ctx.strokeStyle = ink;
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(s * 0.5, s * 0.94);
    ctx.quadraticCurveTo(s * 0.52, s * 0.5, s * 0.5, s * 0.08);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,220,0.45)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(s * 0.5, s * 0.9);
    ctx.quadraticCurveTo(s * 0.515, s * 0.5, s * 0.5, s * 0.12);
    ctx.stroke();

    // side veins
    ctx.strokeStyle = ink;
    ctx.lineWidth = 5;
    for (let i = 0; i < 10; i++) {
      const y = s * (0.18 + i * 0.07);
      const spread = 0.28 + (i % 3) * 0.04;
      ctx.beginPath();
      ctx.moveTo(s * 0.5, y);
      ctx.quadraticCurveTo(s * (0.5 + spread * 0.55), y - 18, s * (0.5 + spread), y + 8);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s * 0.5, y);
      ctx.quadraticCurveTo(s * (0.5 - spread * 0.55), y - 18, s * (0.5 - spread), y + 8);
      ctx.stroke();
    }

    // edge serration marks
    ctx.strokeStyle = 'rgba(26,46,16,0.55)';
    ctx.lineWidth = 4;
    for (let i = 0; i < 16; i++) {
      const t = i / 15;
      const y = s * (0.12 + t * 0.76);
      ctx.beginPath();
      ctx.moveTo(s * 0.08, y);
      ctx.lineTo(s * 0.14, y - 8);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s * 0.92, y);
      ctx.lineTo(s * 0.86, y - 8);
      ctx.stroke();
    }
  }, 512);
  return texCache.leaf;
}

function getLotusMap() {
  if (texCache.lotus || typeof document === 'undefined') return texCache.lotus;
  texCache.lotus = makeCanvasTex((ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 8, s / 2, s / 2, s * 0.55);
    g.addColorStop(0, '#fff4c8');
    g.addColorStop(0.4, '#ffd0e8');
    g.addColorStop(1, '#f5a0c8');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = '#5a2040';
    ctx.lineWidth = 5;
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(s / 2, s / 2);
      ctx.lineTo(s / 2 + Math.cos(a) * s * 0.48, s / 2 + Math.sin(a) * s * 0.48);
      ctx.stroke();
    }
    ctx.fillStyle = '#c88820';
    ctx.strokeStyle = '#3a2810';
    ctx.lineWidth = 3;
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const r = 22 + (i % 3) * 8;
      ctx.beginPath();
      ctx.arc(s / 2 + Math.cos(a) * r, s / 2 + Math.sin(a) * r, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }, 512);
  return texCache.lotus;
}

/** Cartoon wood: thick bark scratches + knots + cut rings */
function getWoodMap() {
  if (texCache.wood || typeof document === 'undefined') return texCache.wood;
  texCache.wood = makeCanvasTex((ctx, s) => {
    // base planks
    const base = ctx.createLinearGradient(0, 0, s, 0);
    base.addColorStop(0, '#c4894a');
    base.addColorStop(0.5, '#e0a868');
    base.addColorStop(1, '#b87538');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, s, s);

    // deep bark scratches (clear cartoon grooves)
    ctx.lineCap = 'round';
    for (let i = 0; i < 28; i++) {
      const x = 10 + i * 18;
      const wobble = Math.sin(i * 1.7) * 22;
      ctx.strokeStyle = '#3a1e0c';
      ctx.lineWidth = 5 + (i % 3);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x + wobble, s * 0.3, x - wobble, s * 0.65, x + wobble * 0.4, s);
      ctx.stroke();
      // highlight beside groove
      ctx.strokeStyle = 'rgba(255,230,180,0.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 4, 0);
      ctx.bezierCurveTo(x + wobble + 4, s * 0.3, x - wobble + 4, s * 0.65, x + 4, s);
      ctx.stroke();
    }

    // knots with rings
    const knots = [
      [120, 140],
      [300, 280],
      [420, 160],
      [200, 380],
    ];
    knots.forEach(([kx, ky]) => {
      for (let r = 34; r > 6; r -= 6) {
        ctx.beginPath();
        ctx.ellipse(kx, ky, r, r * 0.65, 0.25, 0, Math.PI * 2);
        ctx.strokeStyle = r % 12 === 0 ? '#2a1608' : '#5a3018';
        ctx.lineWidth = 3.5;
        ctx.stroke();
      }
      ctx.fillStyle = '#4a2810';
      ctx.beginPath();
      ctx.ellipse(kx, ky, 8, 5, 0.25, 0, Math.PI * 2);
      ctx.fill();
    });

    // end-grain rings strip (reads as cut wood)
    ctx.fillStyle = '#d4a06a';
    ctx.fillRect(0, 0, 48, s);
    ctx.strokeStyle = '#2a1608';
    ctx.lineWidth = 3;
    for (let r = 8; r < 70; r += 8) {
      ctx.beginPath();
      ctx.arc(0, s / 2, r, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
    }
  }, 512);
  return texCache.wood;
}

function getRockMap() {
  if (texCache.rock || typeof document === 'undefined') return texCache.rock;
  texCache.rock = makeCanvasTex((ctx, s) => {
    ctx.fillStyle = '#c5cad0';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 1200; i++) {
      const v = 70 + Math.random() * 120;
      ctx.fillStyle = `rgba(${v},${v + 4},${v + 8},0.35)`;
      ctx.fillRect(Math.random() * s, Math.random() * s, 2 + Math.random() * 3, 2 + Math.random() * 3);
    }
    ctx.fillStyle = 'rgba(60,120,50,0.4)';
    for (let i = 0; i < 10; i++) {
      ctx.beginPath();
      ctx.ellipse(Math.random() * s, Math.random() * s, 18 + Math.random() * 30, 12 + Math.random() * 20, Math.random(), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = '#1a1c22';
    ctx.lineWidth = 4;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      let x = Math.random() * s;
      let y = Math.random() * s;
      ctx.moveTo(x, y);
      for (let j = 0; j < 5; j++) {
        x += (Math.random() - 0.5) * 50;
        y += (Math.random() - 0.5) * 50;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }, 512);
  return texCache.rock;
}

function getDetailMap(kind) {
  if (kind === 'fish') return getFishMap();
  if (kind === 'leaf') return getLeafMap();
  if (kind === 'lotus') return getLotusMap();
  if (kind === 'wood') return getWoodMap();
  return getRockMap();
}

/** Fish silhouette: big fins + eye sockets */
function getFishGeo() {
  if (geoCache.fish) return geoCache.fish;
  const parts = [];
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const x = -0.75 + t * 1.4;
    const r = Math.sin(t * Math.PI) * 0.34 * (1 - t * 0.1);
    pts.push(new THREE.Vector2(Math.max(r, 0.02), x));
  }
  const body = new THREE.LatheGeometry(pts, 32);
  body.rotateZ(-Math.PI / 2);
  parts.push(body);

  // Split cartoon tail
  const tailTop = new THREE.ConeGeometry(0.22, 0.5, 8);
  tailTop.rotateZ(Math.PI / 2);
  tailTop.scale(1, 1.5, 0.18);
  tailTop.rotateZ(0.35);
  tailTop.translate(-0.9, 0.12, 0);
  parts.push(tailTop);
  const tailBot = new THREE.ConeGeometry(0.22, 0.5, 8);
  tailBot.rotateZ(Math.PI / 2);
  tailBot.scale(1, 1.5, 0.18);
  tailBot.rotateZ(-0.35);
  tailBot.translate(-0.9, -0.12, 0);
  parts.push(tailBot);

  // Tall dorsal
  const dorsal = new THREE.ConeGeometry(0.2, 0.48, 8);
  dorsal.scale(0.3, 1, 0.7);
  dorsal.translate(0.05, 0.38, 0);
  parts.push(dorsal);

  // Anal fin
  const anal = new THREE.ConeGeometry(0.12, 0.28, 8);
  anal.scale(0.3, 1, 0.55);
  anal.rotateZ(Math.PI);
  anal.translate(-0.15, -0.3, 0);
  parts.push(anal);

  // Big pectorals
  const pecShape = (z) => {
    const pec = new THREE.SphereGeometry(0.2, 12, 10);
    pec.scale(0.85, 0.2, 1.3);
    pec.translate(0.12, -0.02, z);
    return pec;
  };
  parts.push(pecShape(0.28), pecShape(-0.28));

  // Eye sockets (bulge)
  const socket = (z) => {
    const e = new THREE.SphereGeometry(0.09, 12, 12);
    e.translate(0.5, 0.08, z);
    return e;
  };
  parts.push(socket(0.2), socket(-0.2));

  // Lips bump
  const lips = new THREE.SphereGeometry(0.08, 10, 10);
  lips.scale(1.2, 0.7, 0.9);
  lips.translate(0.68, -0.02, 0);
  parts.push(lips);

  const merged = mergeGeos(parts);
  merged.computeVertexNormals();
  geoCache.fish = merged;
  return merged;
}

/** Leaf: serrated blade + thick midrib + side ribs + stem */
function getLeafGeo() {
  if (geoCache.leaf) return geoCache.leaf;
  const parts = [];
  const shape = new THREE.Shape();
  // serrated outline
  shape.moveTo(0, -0.7);
  const lobes = 9;
  for (let i = 0; i <= lobes; i++) {
    const t = i / lobes;
    const y = -0.7 + t * 1.4;
    const x = Math.sin(t * Math.PI) * 0.48 * (i % 2 === 0 ? 1 : 0.82);
    if (i === 0) shape.lineTo(x * 0.2, y);
    else shape.lineTo(x, y);
  }
  for (let i = lobes; i >= 0; i--) {
    const t = i / lobes;
    const y = -0.7 + t * 1.4;
    const x = -Math.sin(t * Math.PI) * 0.48 * (i % 2 === 0 ? 1 : 0.82);
    shape.lineTo(x, y);
  }
  shape.closePath();

  const blade = new THREE.ExtrudeGeometry(shape, {
    depth: 0.04,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.025,
    bevelSegments: 3,
    curveSegments: 4,
  });
  blade.center();
  parts.push(blade);

  // Thick midrib
  const mid = new THREE.CapsuleGeometry(0.035, 1.05, 4, 8);
  mid.translate(0, 0, 0.04);
  parts.push(mid);

  // Side ribs
  for (let i = 0; i < 8; i++) {
    const y = -0.35 + i * 0.1;
    const len = 0.28 + Math.sin((i / 7) * Math.PI) * 0.12;
    const ribL = new THREE.CapsuleGeometry(0.015, len, 3, 6);
    ribL.rotateZ(0.9);
    ribL.translate(len * 0.28, y, 0.035);
    parts.push(ribL);
    const ribR = new THREE.CapsuleGeometry(0.015, len, 3, 6);
    ribR.rotateZ(-0.9);
    ribR.translate(-len * 0.28, y, 0.035);
    parts.push(ribR);
  }

  // Stem
  const stem = new THREE.CapsuleGeometry(0.04, 0.5, 4, 8);
  stem.translate(0, -0.72, 0);
  parts.push(stem);

  const merged = mergeGeos(parts);
  merged.computeVertexNormals();
  geoCache.leaf = merged;
  return merged;
}

function getLotusGeo() {
  if (geoCache.lotus) return geoCache.lotus;
  const parts = [];
  // Outer petals
  for (let i = 0; i < 10; i++) {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0.02);
    shape.quadraticCurveTo(0.22, 0.2, 0.12, 0.58);
    shape.quadraticCurveTo(0, 0.7, -0.12, 0.58);
    shape.quadraticCurveTo(-0.22, 0.2, 0, 0.02);
    const p = new THREE.ExtrudeGeometry(shape, {
      depth: 0.035,
      bevelEnabled: true,
      bevelThickness: 0.012,
      bevelSize: 0.018,
      bevelSegments: 3,
      curveSegments: 14,
    });
    p.rotateZ((i / 10) * Math.PI * 2);
    p.rotateX(-0.15);
    p.translate(0, 0, 0.02);
    parts.push(p);
  }
  // Inner petals
  for (let i = 0; i < 8; i++) {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0.02);
    shape.quadraticCurveTo(0.14, 0.16, 0.08, 0.42);
    shape.quadraticCurveTo(0, 0.5, -0.08, 0.42);
    shape.quadraticCurveTo(-0.14, 0.16, 0, 0.02);
    const p = new THREE.ExtrudeGeometry(shape, {
      depth: 0.03,
      bevelEnabled: true,
      bevelThickness: 0.01,
      bevelSize: 0.012,
      bevelSegments: 2,
      curveSegments: 12,
    });
    p.rotateZ((i / 8) * Math.PI * 2 + 0.2);
    p.rotateX(-0.28);
    p.translate(0, 0, 0.06);
    parts.push(p);
  }
  // Seed pod
  const pod = new THREE.SphereGeometry(0.16, 22, 18);
  pod.scale(1, 1, 0.7);
  pod.translate(0, 0, 0.14);
  parts.push(pod);
  // Seed bumps
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const bump = new THREE.SphereGeometry(0.035, 8, 8);
    bump.translate(Math.cos(a) * 0.08, Math.sin(a) * 0.08, 0.22);
    parts.push(bump);
  }

  const merged = mergeGeos(parts);
  merged.computeVertexNormals();
  geoCache.lotus = merged;
  return geoCache.lotus;
}

function getWoodGeo() {
  if (geoCache.wood) return geoCache.wood;
  const parts = [];
  const trunk = new THREE.CapsuleGeometry(0.22, 1.0, 10, 24);
  trunk.rotateZ(Math.PI / 2);
  // Deep cartoon bark grooves
  const pos = trunk.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const groove = Math.sin(x * 18) * 0.085 + Math.sin(x * 40 + y * 3) * 0.03;
    const n = 1 + groove;
    pos.setXYZ(i, x, y * n, z * n);
  }
  pos.needsUpdate = true;
  parts.push(trunk);

  // Cut ends with ring ridges
  for (const side of [-1, 1]) {
    const cap = new THREE.CylinderGeometry(0.22, 0.22, 0.06, 24);
    cap.rotateZ(Math.PI / 2);
    cap.translate(side * 0.72, 0, 0);
    parts.push(cap);
    for (let r = 0; r < 4; r++) {
      const ring = new THREE.TorusGeometry(0.08 + r * 0.035, 0.012, 6, 20);
      ring.rotateY(Math.PI / 2);
      ring.translate(side * 0.75, 0, 0);
      parts.push(ring);
    }
  }

  // Branch stubs
  for (let i = 0; i < 2; i++) {
    const branch = new THREE.CapsuleGeometry(0.07, 0.35, 5, 10);
    branch.rotateZ(0.55 + i * 0.3);
    branch.translate(-0.05 + i * 0.25, 0.26 * (i === 0 ? 1 : -1), 0.05);
    parts.push(branch);
  }

  // Raised knots
  for (let i = 0; i < 4; i++) {
    const knot = new THREE.SphereGeometry(0.08, 12, 12);
    knot.scale(1.3, 0.65, 1.1);
    knot.translate(-0.3 + i * 0.2, 0.14 * ((i % 2) * 2 - 1), 0.14);
    parts.push(knot);
  }

  const merged = mergeGeos(parts);
  merged.computeVertexNormals();
  geoCache.wood = merged;
  return geoCache.wood;
}

function getRockGeo() {
  if (geoCache.rock) return geoCache.rock;
  const parts = [];
  const main = new THREE.IcosahedronGeometry(0.5, 3);
  const pos = main.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const n = 0.82 + ((i * 13) % 11) * 0.022 + Math.sin(i * 0.7) * 0.03;
    pos.setXYZ(i, pos.getX(i) * n * 1.2, pos.getY(i) * n * 0.72, pos.getZ(i) * n * 1.05);
  }
  pos.needsUpdate = true;
  parts.push(main);

  // Satellite pebbles
  for (let i = 0; i < 4; i++) {
    const p = new THREE.DodecahedronGeometry(0.12 + i * 0.02, 0);
    p.scale(1.1, 0.7, 1);
    p.translate(
      Math.cos(i) * 0.45,
      -0.25 + (i % 2) * 0.08,
      Math.sin(i * 1.7) * 0.4
    );
    parts.push(p);
  }

  const merged = mergeGeos(parts);
  merged.computeVertexNormals();
  geoCache.rock = merged;
  return geoCache.rock;
}

function mergeGeos(geos) {
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  let indexOffset = 0;
  geos.forEach((g) => {
    g.computeVertexNormals();
    g.computeBoundingBox();
    const pos = g.attributes.position;
    const nor = g.attributes.normal;
    const uvAttr = g.attributes.uv;
    const box = g.boundingBox;
    const sx = Math.max(box.max.x - box.min.x, 1e-4);
    const sy = Math.max(box.max.y - box.min.y, 1e-4);
    const sz = Math.max(box.max.z - box.min.z, 1e-4);
    // Prefer the two longest axes so grain / scales / veins stretch correctly
    const axes = [
      ['x', sx],
      ['y', sy],
      ['z', sz],
    ].sort((a, b) => b[1] - a[1]);
    const uAxis = axes[0][0];
    const vAxis = axes[1][0];
    const getAxis = (axis, i) =>
      axis === 'x' ? pos.getX(i) : axis === 'y' ? pos.getY(i) : pos.getZ(i);
    const minU = box.min[uAxis];
    const minV = box.min[vAxis];
    const spanU = Math.max(box.max[uAxis] - minU, 1e-4);
    const spanV = Math.max(box.max[vAxis] - minV, 1e-4);

    for (let i = 0; i < pos.count; i++) {
      positions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
      if (nor) normals.push(nor.getX(i), nor.getY(i), nor.getZ(i));
      else normals.push(0, 1, 0);
      if (uvAttr) {
        uvs.push(uvAttr.getX(i), uvAttr.getY(i));
      } else {
        uvs.push((getAxis(uAxis, i) - minU) / spanU, (getAxis(vAxis, i) - minV) / spanV);
      }
    }
    const idx = g.index;
    if (idx) {
      for (let i = 0; i < idx.count; i++) indices.push(idx.getX(i) + indexOffset);
    } else {
      for (let i = 0; i < pos.count; i++) indices.push(i + indexOffset);
    }
    indexOffset += pos.count;
  });
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  out.setIndex(indices);
  return out;
}

/**
 * Dense underwater scatter — pack sides / upper water / near-floor.
 * Keep a narrow swim corridor clear for hub frogs (|x|<1.9 && |y|<1.15).
 */
function scatterInSphere(count, radius, depth = 38) {
  const positions = new Float32Array(count * 3);
  const scales = new Float32Array(count);
  const baseRot = new Float32Array(count * 3);
  const spins = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const t = i / Math.max(count - 1, 1);
    const band = i % 5; // variety of placements
    const side = i % 2 === 0 ? 1 : -1;

    let x;
    let y;
    if (band === 0) {
      // Far side walls
      x = side * (3.2 + Math.random() * radius * 0.7);
      y = (Math.random() - 0.5) * 5.5;
    } else if (band === 1) {
      // Upper water canopy (above frog eye-line)
      x = (Math.random() - 0.5) * radius * 1.1;
      y = 1.4 + Math.random() * 3.2;
    } else if (band === 2) {
      // Near sand / lower band (sides only)
      x = side * (2.5 + Math.random() * radius * 0.55);
      y = -1.6 - Math.random() * 2.4;
    } else if (band === 3) {
      // Mid side schools
      x = side * (2.4 + Math.random() * radius * 0.5);
      y = (Math.random() - 0.5) * 3.2;
    } else {
      // Soft fill — mid depth, nudged out of corridor
      x = (Math.random() - 0.5) * radius;
      y = (Math.random() - 0.5) * 4.8;
    }

    // Punch out of frog swim lane
    if (Math.abs(x) < 1.9 && Math.abs(y) < 1.15) {
      x = (x >= 0 ? 1 : -1) * (2.1 + Math.random() * 2.8);
      if (Math.random() > 0.45) y += (y >= 0 ? 1 : -1) * (1.2 + Math.random());
    }

    positions[i3] = x;
    positions[i3 + 1] = y;
    // Stagger in Z so depth never looks empty
    positions[i3 + 2] = 4.5 - t * depth - Math.random() * 2.4 + (i % 7) * 0.15;
    scales[i] = 0.28 + Math.random() * 1.05;
    baseRot[i3] = Math.random() * Math.PI * 2;
    baseRot[i3 + 1] = Math.random() * Math.PI * 2;
    baseRot[i3 + 2] = Math.random() * Math.PI * 2;
    spins[i3] = (Math.random() - 0.5) * 0.28;
    spins[i3 + 1] = (Math.random() - 0.5) * 0.4;
    spins[i3 + 2] = (Math.random() - 0.5) * 0.22;
  }
  return { positions, scales, baseRot, spins };
}

function LakeLayer({
  kind,
  count,
  radius,
  depth = 38,
  scaleBase,
  drift,
  travelRef,
  mouseRef,
  parallax = 1,
  animate = true,
}) {
  const groupRef = useRef(null);
  const meshRef = useRef(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  const geometry = useMemo(() => {
    if (kind === 'fish') return getFishGeo();
    if (kind === 'leaf') return getLeafGeo();
    if (kind === 'lotus') return getLotusGeo();
    if (kind === 'wood') return getWoodGeo();
    return getRockGeo();
  }, [kind]);

  const palette = useMemo(() => {
    if (kind === 'fish') return FISH_COLORS;
    if (kind === 'leaf') return LEAF_COLORS;
    if (kind === 'lotus') return ['#FE77BC', '#FD8D93', '#FFF8E7', '#FFD802'];
    if (kind === 'wood') return WOOD_COLORS;
    return ROCK_COLORS;
  }, [kind]);

  const { positions, scales, baseRot, spins, colors, swim } = useMemo(() => {
    const scatter = scatterInSphere(count, radius, depth);
    const colors = new Float32Array(count * 3);
    const swim = kind === 'fish' ? new Array(count) : null;
    for (let i = 0; i < count; i++) {
      const c = new THREE.Color(palette[i % palette.length]);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
      scatter.scales[i] *= scaleBase;
      if (swim) {
        // Patrol paths — left/right, loops, weave through depth
        const mode = i % 4;
        swim[i] = {
          mode,
          speed: 0.35 + (i % 7) * 0.08 + Math.random() * 0.2,
          phase: Math.random() * Math.PI * 2,
          ampX: mode === 0 ? 2.8 + Math.random() * 3.2 : 1.4 + Math.random() * 2.2,
          ampY: mode === 2 ? 1.2 + Math.random() * 1.4 : 0.35 + Math.random() * 0.7,
          ampZ: mode === 1 ? 2.2 + Math.random() * 2.5 : 0.8 + Math.random() * 1.6,
        };
      }
    }
    return { ...scatter, colors, swim };
  }, [count, radius, depth, scaleBase, palette, kind]);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      dummy.position.set(positions[i3], positions[i3 + 1], positions[i3 + 2]);
      dummy.rotation.set(baseRot[i3], baseRot[i3 + 1], baseRot[i3 + 2]);
      dummy.scale.setScalar(scales[i]);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      color.setRGB(colors[i3], colors[i3 + 1], colors[i3 + 2]);
      mesh.setColorAt(i, color);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [count, positions, scales, baseRot, colors, dummy, color]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    const travel = travelRef?.current ?? 0;
    const mx = mouseRef?.current?.sx ?? mouseRef?.current?.x ?? 0;
    const my = mouseRef?.current?.sy ?? mouseRef?.current?.y ?? 0;

    // Fish school drifts slowly; rocks/wood keep light ambient drift
    const groupDrift = kind === 'fish' ? drift * 0.25 : drift;
    groupRef.current.rotation.y =
      t * groupDrift * 0.65 + travel * 1.1 * parallax + mx * 0.16 * parallax;
    groupRef.current.rotation.x =
      Math.sin(t * groupDrift * 0.4) * 0.025 +
      travel * 0.22 * parallax +
      my * 0.12 * parallax;
    groupRef.current.position.z = travel * 5.5 * parallax;
    groupRef.current.position.x = mx * 0.55 * parallax;
    groupRef.current.position.y = my * 0.35 * parallax + Math.sin(t * 0.22) * 0.05;

    if (!animate || !meshRef.current) return;
    const mesh = meshRef.current;
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      if (kind === 'fish' && swim) {
        const s = swim[i];
        const tt = t * s.speed + s.phase;
        let ox;
        let oy;
        let oz;
        let vx;
        let vz;

        if (s.mode === 0) {
          // Horizontal patrol (kesana-kemari)
          ox = Math.sin(tt) * s.ampX;
          oy = Math.sin(tt * 0.55 + s.phase) * s.ampY;
          oz = Math.sin(tt * 0.35) * s.ampZ * 0.45;
          vx = Math.cos(tt) * s.ampX * s.speed;
          vz = Math.cos(tt * 0.35) * s.ampZ * 0.45 * s.speed * 0.35;
        } else if (s.mode === 1) {
          // Depth ellipse
          ox = Math.sin(tt) * s.ampX;
          oy = Math.cos(tt * 0.4) * s.ampY;
          oz = Math.cos(tt) * s.ampZ;
          vx = Math.cos(tt) * s.ampX * s.speed;
          vz = -Math.sin(tt) * s.ampZ * s.speed;
        } else if (s.mode === 2) {
          // Vertical weave / up-down cruise
          ox = Math.sin(tt * 0.7) * s.ampX;
          oy = Math.sin(tt) * s.ampY;
          oz = Math.cos(tt * 0.55) * s.ampZ;
          vx = Math.cos(tt * 0.7) * s.ampX * s.speed * 0.7;
          vz = -Math.sin(tt * 0.55) * s.ampZ * s.speed * 0.55;
        } else {
          // Loose figure-8
          ox = Math.sin(tt) * s.ampX;
          oy = Math.sin(tt * 2) * s.ampY * 0.65;
          oz = Math.sin(tt) * Math.cos(tt) * s.ampZ;
          vx = Math.cos(tt) * s.ampX * s.speed;
          vz = (Math.cos(tt) * Math.cos(tt) - Math.sin(tt) * Math.sin(tt)) * s.ampZ * s.speed;
        }

        // Stay out of frog corridor while swimming
        let px = positions[i3] + ox;
        let py = positions[i3 + 1] + oy;
        if (Math.abs(px) < 1.85 && Math.abs(py) < 1.05) {
          px += px >= 0 ? 1.6 : -1.6;
        }

        // Face travel direction (fish mesh noses +X)
        const yaw = Math.atan2(-vz, vx || 0.001);
        const pitch = Math.sin(tt * 2.2) * 0.1;
        const roll = Math.sin(tt * 3.1) * 0.18;

        dummy.position.set(px, py, positions[i3 + 2] + oz);
        dummy.rotation.set(pitch, yaw, roll);
      } else {
        const sway =
          kind === 'leaf' || kind === 'lotus' ? Math.sin(t * 0.35 + i * 0.25) * 0.05 : 0;
        dummy.position.set(
          positions[i3] + sway,
          positions[i3 + 1] + Math.sin(t * 0.28 + i * 0.2) * 0.04,
          positions[i3 + 2]
        );
        dummy.rotation.set(
          baseRot[i3] + t * spins[i3] * (kind === 'rock' || kind === 'wood' ? 0.08 : 0.45),
          baseRot[i3 + 1] + t * spins[i3 + 1] * 0.45,
          baseRot[i3 + 2] + t * spins[i3 + 2] * 0.45
        );
      }

      dummy.scale.setScalar(scales[i]);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  const detailMap = useMemo(() => getDetailMap(kind), [kind]);

  const matProps =
    kind === 'fish'
      ? { roughness: 0.32, metalness: 0.1 }
      : kind === 'lotus'
        ? { roughness: 0.36, metalness: 0.06 }
        : kind === 'leaf'
          ? { roughness: 0.5, metalness: 0.02, transparent: true, opacity: 0.94 }
          : kind === 'wood'
            ? { roughness: 0.78, metalness: 0.02 }
            : { roughness: 0.68, metalness: 0.03 };

  return (
    <group ref={groupRef}>
      <instancedMesh ref={meshRef} args={[geometry, undefined, count]} frustumCulled={false}>
        <meshStandardMaterial
          {...matProps}
          map={detailMap}
          flatShading={false}
          toneMapped
        />
      </instancedMesh>
    </group>
  );
}

/** Multi-part cartoon fish — eyes / fins / gills / mouth read clearly up close */
function CartoonFish({ color = '#FC6C34', scale = 1, ...props }) {
  const fishMap = useMemo(() => getFishMap(), []);
  const body = useMemo(() => getFishGeo(), []);
  const finInk = '#1a2030';
  return (
    <group scale={scale} {...props}>
      <mesh geometry={body}>
        <meshStandardMaterial color={color} map={fishMap} roughness={0.35} metalness={0.08} />
      </mesh>
      {/* Eyes: sclera + pupil + highlight */}
      {[-1, 1].map((side) => (
        <group key={side} position={[0.52, 0.1, 0.22 * side]}>
          <mesh>
            <sphereGeometry args={[0.1, 18, 18]} />
            <meshStandardMaterial color="#fffef5" roughness={0.2} />
          </mesh>
          <mesh position={[0.04, -0.01, 0.01 * side]}>
            <sphereGeometry args={[0.048, 14, 14]} />
            <meshStandardMaterial color="#141820" roughness={0.35} />
          </mesh>
          <mesh position={[0.06, 0.02, 0.025 * side]}>
            <sphereGeometry args={[0.018, 8, 8]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          {/* Cartoon eyelid stroke */}
          <mesh position={[0.01, 0.08, 0]} rotation={[0, 0, side * 0.15]} scale={[1, 0.35, 1]}>
            <torusGeometry args={[0.09, 0.012, 6, 16, Math.PI]} />
            <meshStandardMaterial color={finInk} roughness={0.8} />
          </mesh>
        </group>
      ))}
      {/* Gill slits */}
      {[0, 1, 2].map((i) => (
        <mesh
          key={`gill-${i}`}
          position={[0.28 - i * 0.04, 0.02, 0.26]}
          rotation={[0, 0.35, 0.4 + i * 0.08]}
        >
          <capsuleGeometry args={[0.012, 0.12, 3, 6]} />
          <meshStandardMaterial color={finInk} roughness={0.85} />
        </mesh>
      ))}
      {[0, 1, 2].map((i) => (
        <mesh
          key={`gill-b-${i}`}
          position={[0.28 - i * 0.04, 0.02, -0.26]}
          rotation={[0, -0.35, -0.4 - i * 0.08]}
        >
          <capsuleGeometry args={[0.012, 0.12, 3, 6]} />
          <meshStandardMaterial color={finInk} roughness={0.85} />
        </mesh>
      ))}
      {/* Mouth */}
      <mesh position={[0.72, -0.04, 0]} rotation={[0, 0, 0.2]} scale={[1, 0.45, 1]}>
        <torusGeometry args={[0.06, 0.014, 6, 16, Math.PI]} />
        <meshStandardMaterial color="#3a1820" roughness={0.7} />
      </mesh>
      {/* Fin ray lines on dorsal */}
      {[-0.06, 0.02, 0.1].map((x, i) => (
        <mesh key={`ray-${i}`} position={[x, 0.42, 0]} rotation={[0, 0, 0.05]}>
          <capsuleGeometry args={[0.008, 0.22 - i * 0.02, 2, 5]} />
          <meshStandardMaterial color={finInk} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function CartoonLeaf(props) {
  const leafMap = useMemo(() => getLeafMap(), []);
  const leaf = useMemo(() => getLeafGeo(), []);
  return (
    <group {...props}>
      <mesh geometry={leaf}>
        <meshStandardMaterial color="#8AD63A" map={leafMap} roughness={0.48} />
      </mesh>
      {/* Extra dark midrib + side veins on top (reads even without texture) */}
      <mesh position={[0, 0, 0.055]}>
        <capsuleGeometry args={[0.028, 1.0, 4, 8]} />
        <meshStandardMaterial color="#2a4a14" roughness={0.65} />
      </mesh>
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const y = -0.28 + i * 0.12;
        const len = 0.22 + Math.sin((i / 5) * Math.PI) * 0.1;
        return (
          <group key={i}>
            <mesh position={[len * 0.22, y, 0.05]} rotation={[0, 0, 0.85]}>
              <capsuleGeometry args={[0.01, len, 3, 5]} />
              <meshStandardMaterial color="#2f5218" roughness={0.7} />
            </mesh>
            <mesh position={[-len * 0.22, y, 0.05]} rotation={[0, 0, -0.85]}>
              <capsuleGeometry args={[0.01, len, 3, 5]} />
              <meshStandardMaterial color="#2f5218" roughness={0.7} />
            </mesh>
          </group>
        );
      })}
      {/* Stem tip */}
      <mesh position={[0, -0.78, 0]}>
        <capsuleGeometry args={[0.035, 0.28, 4, 8]} />
        <meshStandardMaterial color="#5a3a18" roughness={0.8} />
      </mesh>
    </group>
  );
}

function CartoonWood(props) {
  const woodMap = useMemo(() => getWoodMap(), []);
  const wood = useMemo(() => getWoodGeo(), []);
  return (
    <group {...props}>
      <mesh geometry={wood}>
        <meshStandardMaterial color="#D4A06A" map={woodMap} roughness={0.7} />
      </mesh>
      {/* Raised bark scratches — dark grooves you can see in silhouette */}
      {[-0.45, -0.25, -0.05, 0.15, 0.35].map((x, i) => (
        <mesh
          key={`groove-${i}`}
          position={[x, 0.02 * ((i % 2) * 2 - 1), 0.2]}
          rotation={[0.1, 0, Math.sin(i) * 0.15]}
          scale={[1, 1.1, 0.35]}
        >
          <capsuleGeometry args={[0.018, 0.55, 3, 6]} />
          <meshStandardMaterial color="#2a1608" roughness={0.95} />
        </mesh>
      ))}
      {/* Cut-end growth rings */}
      {[-1, 1].map((side) =>
        [0.08, 0.13, 0.18].map((r, i) => (
          <mesh
            key={`ring-${side}-${i}`}
            position={[side * 0.76, 0, 0]}
            rotation={[0, Math.PI / 2, 0]}
          >
            <torusGeometry args={[r, 0.01, 6, 28]} />
            <meshStandardMaterial color="#3a1e0c" roughness={0.9} />
          </mesh>
        ))
      )}
      {/* Knots with dark centers */}
      {[
        [-0.2, 0.16, 0.18],
        [0.15, -0.14, 0.2],
        [0.35, 0.12, 0.16],
      ].map(([x, y, z], i) => (
        <group key={`knot-${i}`} position={[x, y, z]}>
          <mesh scale={[1.2, 0.7, 1]}>
            <sphereGeometry args={[0.07, 12, 12]} />
            <meshStandardMaterial color="#8B5A2B" roughness={0.85} />
          </mesh>
          <mesh scale={[1, 0.55, 0.85]}>
            <sphereGeometry args={[0.035, 10, 10]} />
            <meshStandardMaterial color="#2a1608" roughness={0.95} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Front props — spread to edges so hero copy stays clear in the center */
function PondHeroProps({ mouse }) {
  const root = useRef(null);
  const floatRefs = useRef([]);
  const lotus = useMemo(() => getLotusGeo(), []);
  const rock = useMemo(() => getRockGeo(), []);
  const lotusMap = useMemo(() => getLotusMap(), []);
  const rockMap = useMemo(() => getRockMap(), []);

  const pieces = useMemo(
    () => [
      // top-left leaf
      { id: 'leafL', base: [-2.15, 1.15, 0.2], amp: 0.06, speed: 0.55 },
      // top-right lotus
      { id: 'lotus', base: [2.05, 1.05, 0.05], amp: 0.05, speed: 0.4 },
      // mid-left fish
      { id: 'fishL', base: [-2.35, -0.15, 0.35], amp: 0.1, speed: 0.75 },
      // mid-right fish
      { id: 'fishR', base: [2.25, 0.05, 0.3], amp: 0.09, speed: 0.7 },
      // bottom-left wood
      { id: 'wood', base: [-1.85, -1.35, 0.15], amp: 0.035, speed: 0.32 },
      // bottom-right leaf
      { id: 'leafR', base: [1.95, -1.25, 0.1], amp: 0.07, speed: 0.5 },
      // far-bottom rock (low, out of copy)
      { id: 'rock', base: [0.15, -1.7, -0.25], amp: 0.02, speed: 0.25 },
    ],
    []
  );

  useFrame((state) => {
    if (!root.current) return;
    const t = state.clock.elapsedTime;
    const mx = mouse.current.sx ?? mouse.current.x ?? 0;
    const my = mouse.current.sy ?? mouse.current.y ?? 0;
    // Soft parallax only — no group spin that piles everything together
    root.current.position.x += (mx * 0.22 - root.current.position.x) * 0.06;
    root.current.position.y += (my * 0.14 - root.current.position.y) * 0.06;

    pieces.forEach((p, i) => {
      const node = floatRefs.current[i];
      if (!node) return;
      node.position.x = p.base[0] + Math.sin(t * p.speed + i) * p.amp;
      node.position.y = p.base[1] + Math.cos(t * p.speed * 0.85 + i * 0.7) * p.amp;
      node.position.z = p.base[2];
      node.rotation.z = Math.sin(t * p.speed * 0.6 + i) * 0.08;
    });
  });

  return (
    <group ref={root} position={[0, 0, 0.85]}>
      <group
        ref={(el) => {
          floatRefs.current[0] = el;
        }}
      >
        <CartoonLeaf scale={0.48} rotation={[0.4, 0.25, 0.55]} />
      </group>
      <group
        ref={(el) => {
          floatRefs.current[1] = el;
        }}
      >
        <mesh geometry={lotus} scale={0.72}>
          <meshStandardMaterial
            color="#FE77BC"
            map={lotusMap}
            roughness={0.34}
            metalness={0.06}
            emissive="#FE77BC"
            emissiveIntensity={0.05}
          />
        </mesh>
      </group>
      <group
        ref={(el) => {
          floatRefs.current[2] = el;
        }}
      >
        <CartoonFish color="#01D1FD" scale={0.38} rotation={[0.05, -0.7, 0.05]} />
      </group>
      <group
        ref={(el) => {
          floatRefs.current[3] = el;
        }}
      >
        <CartoonFish color="#FC6C34" scale={0.42} rotation={[0, 0.65, -0.05]} />
      </group>
      <group
        ref={(el) => {
          floatRefs.current[4] = el;
        }}
      >
        <CartoonWood scale={0.38} rotation={[0.12, 0.55, 0.1]} />
      </group>
      <group
        ref={(el) => {
          floatRefs.current[5] = el;
        }}
      >
        <CartoonLeaf scale={0.4} rotation={[0.55, -0.45, -0.35]} />
      </group>
      <group
        ref={(el) => {
          floatRefs.current[6] = el;
        }}
      >
        <mesh geometry={rock} scale={0.45}>
          <meshStandardMaterial color="#8A919A" map={rockMap} roughness={0.65} />
        </mesh>
      </group>
      <pointLight position={[2.2, 1.4, 2]} intensity={0.45} color="#D9FFB8" distance={9} decay={1.6} />
      <pointLight position={[-2.2, 0.4, 1.5]} intensity={0.2} color="#F0A070" distance={8} decay={1.6} />
    </group>
  );
}

function CameraRig({ mouse, mode, travelRef }) {
  const { camera, gl } = useThree();
  const diveT = useRef(0);
  const prevMode = useRef(mode);

  useFrame((_, delta) => {
    if (prevMode.current !== mode) {
      if (mode === 'diving') {
        diveT.current = 0;
        gl.setPixelRatio(1);
      }
      if (mode === 'idle') diveT.current = 0;
      prevMode.current = mode;
    }

    if (mode === 'diving') {
      diveT.current = Math.min(1, diveT.current + delta / 0.7);
      const t = diveT.current;
      if (t < 0.55) {
        const p = t / 0.55;
        const e = p * p;
        camera.position.z = THREE.MathUtils.lerp(IDLE_Z, DIVE_PEAK_Z, e);
        camera.fov = THREE.MathUtils.lerp(IDLE_FOV, DIVE_PEAK_FOV, e);
      } else {
        const p = (t - 0.55) / 0.45;
        const e = p * p * (3 - 2 * p);
        camera.position.z = THREE.MathUtils.lerp(DIVE_PEAK_Z, SETTLE_Z, e);
        camera.fov = THREE.MathUtils.lerp(DIVE_PEAK_FOV, SETTLE_FOV, e);
      }
      camera.position.x = THREE.MathUtils.lerp(camera.position.x, 0, 0.15);
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, 0, 0.15);
      camera.updateProjectionMatrix();
      camera.lookAt(0, 0, -4);
      return;
    }

    const mx = mouse.current.sx ?? mouse.current.x ?? 0;
    const my = mouse.current.sy ?? mouse.current.y ?? 0;

    if (mode === 'settled') {
      const p = travelRef?.current ?? 0;
      const targetZ = SETTLE_Z - p * 14;
      const swayX = Math.sin(p * Math.PI * 2.4) * 0.45;
      const swayY = Math.cos(p * Math.PI * 1.8) * 0.28;
      camera.position.x = mx * 1.15 + swayX;
      camera.position.y = my * 0.75 + swayY;
      camera.position.z = targetZ;
      camera.fov = SETTLE_FOV + p * 12;
      camera.updateProjectionMatrix();
      camera.lookAt(mx * 0.55 + swayX * 0.2, my * 0.4 + swayY * 0.15, targetZ - 8);
      return;
    }

    camera.position.x += (mx * 0.55 - camera.position.x) * 0.07;
    camera.position.y += (my * 0.38 - camera.position.y) * 0.07;
    camera.position.z += (IDLE_Z - camera.position.z) * 0.06;
    camera.fov += (IDLE_FOV - camera.fov) * 0.06;
    camera.updateProjectionMatrix();
    camera.lookAt(mx * 0.25, my * 0.18, 0);
  });

  return null;
}

let bubbleMap = null;
function getBubbleTexture() {
  if (bubbleMap || typeof document === 'undefined') return bubbleMap;
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const c = size / 2;
  const g = ctx.createRadialGradient(c * 0.7, c * 0.65, 0, c, c, c);
  g.addColorStop(0, 'rgba(255,255,255,0.95)');
  g.addColorStop(0.35, 'rgba(180,245,255,0.55)');
  g.addColorStop(0.7, 'rgba(100,200,220,0.2)');
  g.addColorStop(1, 'rgba(100,200,220,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(c, c, c - 1, 0, Math.PI * 2);
  ctx.fill();
  // highlight rim
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(c * 0.72, c * 0.68, c * 0.28, 0, Math.PI * 2);
  ctx.stroke();
  bubbleMap = new THREE.CanvasTexture(canvas);
  bubbleMap.colorSpace = THREE.SRGBColorSpace;
  return bubbleMap;
}

/** Rising air bubbles — strongest underwater cue */
function Bubbles({ travelRef, count = 120 }) {
  const ref = useRef(null);
  const map = useMemo(() => getBubbleTexture(), []);
  const { positions, speeds, sizes } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 18;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 14;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 16 - 1;
      speeds[i] = 0.35 + Math.random() * 0.9;
      sizes[i] = 0.08 + Math.random() * 0.22;
    }
    return { positions, speeds, sizes };
  }, [count]);

  useFrame((state, delta) => {
    if (!ref.current) return;
    const travel = travelRef?.current ?? 0;
    const arr = ref.current.geometry.attributes.position.array;
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      arr[i3 + 1] += speeds[i] * delta * 0.75;
      arr[i3] += Math.sin(state.clock.elapsedTime * 0.6 + i) * delta * 0.12;
      if (arr[i3 + 1] > 7) {
        arr[i3 + 1] = -7;
        arr[i3] = (Math.random() - 0.5) * 18;
        arr[i3 + 2] = (Math.random() - 0.5) * 16 - 1;
      }
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
    ref.current.position.z = travel * 3.5;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={map}
        color="#D9FFB8"
        size={0.22}
        transparent
        opacity={0.32}
        depthWrite={false}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        toneMapped={false}
        alphaTest={0.01}
      />
    </points>
  );
}

/** Soft vertical beam texture — feathered edges, no hard plane look */
function getGodRayMap() {
  if (texCache.godray || typeof document === 'undefined') return texCache.godray;
  texCache.godray = makeCanvasTex((ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    // Horizontal soft falloff (beam edges)
    const gx = ctx.createLinearGradient(0, 0, s, 0);
    gx.addColorStop(0, 'rgba(255,255,255,0)');
    gx.addColorStop(0.22, 'rgba(255,255,255,0.18)');
    gx.addColorStop(0.5, 'rgba(255,255,255,0.95)');
    gx.addColorStop(0.78, 'rgba(255,255,255,0.18)');
    gx.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gx;
    ctx.fillRect(0, 0, s, s);
    // Vertical soft falloff (bright near surface → fade deep)
    const gy = ctx.createLinearGradient(0, 0, 0, s);
    gy.addColorStop(0, 'rgba(255,255,255,0.15)');
    gy.addColorStop(0.12, 'rgba(255,255,255,1)');
    gy.addColorStop(0.55, 'rgba(255,255,255,0.55)');
    gy.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.globalCompositeOperation = 'destination-in';
    ctx.fillStyle = gy;
    ctx.fillRect(0, 0, s, s);
  }, 256);
  texCache.godray.wrapS = texCache.godray.wrapT = THREE.ClampToEdgeWrapping;
  return texCache.godray;
}

function getCausticMap() {
  if (texCache.caustic || typeof document === 'undefined') return texCache.caustic;
  texCache.caustic = makeCanvasTex((ctx, s) => {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 38; i++) {
      const x = (i * 97) % s;
      const y = (i * 53) % s;
      const r = 40 + (i % 5) * 18;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(217,255,184,0.55)');
      g.addColorStop(0.45, 'rgba(112,196,49,0.18)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * (0.55 + (i % 3) * 0.15), (i * 0.4) % Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  }, 512);
  texCache.caustic.wrapS = texCache.caustic.wrapT = THREE.RepeatWrapping;
  return texCache.caustic;
}

function getSurfaceGlowMap() {
  if (texCache.surfaceGlow || typeof document === 'undefined') return texCache.surfaceGlow;
  texCache.surfaceGlow = makeCanvasTex((ctx, s) => {
    const g = ctx.createRadialGradient(s * 0.5, s * 0.5, 0, s * 0.5, s * 0.5, s * 0.5);
    g.addColorStop(0, 'rgba(220,255,252,0.9)');
    g.addColorStop(0.35, 'rgba(160,240,245,0.45)');
    g.addColorStop(0.7, 'rgba(80,180,200,0.12)');
    g.addColorStop(1, 'rgba(0,40,50,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  }, 256);
  return texCache.surfaceGlow;
}

/**
 * Multi-layer volumetric god rays — soft textured shafts + haze + depth cones.
 */
function GodRays() {
  const root = useRef(null);
  const haze = useRef(null);
  const map = useMemo(() => getGodRayMap(), []);

  const shafts = useMemo(() => {
    const out = [];
    const n = 28;
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1);
      const side = (u - 0.5) * 2;
      out.push({
        x: side * 7.2 + Math.sin(i * 1.7) * 0.55,
        z: -1.2 - (i % 6) * 0.85 - ((i * 17) % 10) * 0.04,
        rotZ: side * 0.12 + Math.sin(i) * 0.04,
        rotX: 0.08 + (i % 4) * 0.03,
        w: 1.1 + (i % 5) * 0.55 + ((i * 13) % 7) * 0.05,
        h: 14 + (i % 3) * 1.8,
        base: 0.04 + (i % 4) * 0.014,
        phase: i * 0.73,
        speed: 0.18 + (i % 5) * 0.04,
        sxTop: 1.15 + (i % 3) * 0.1,
      });
    }
    return out;
  }, []);

  const deepCones = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => ({
        x: (i - 3.5) * 1.8,
        z: -2 - (i % 3) * 1.2,
        rotZ: (i - 3.5) * 0.06,
        phase: i * 1.1,
        speed: 0.16 + (i % 3) * 0.03,
        base: 0.032,
        scale: 0.7 + (i % 3) * 0.15,
      })),
    []
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (root.current) {
      root.current.rotation.z = Math.sin(t * 0.06) * 0.04;
      root.current.position.x = Math.sin(t * 0.07) * 0.25;
    }
    if (haze.current?.material) {
      haze.current.material.opacity = 0.1 + Math.sin(t * 0.2) * 0.025;
      haze.current.rotation.z = Math.sin(t * 0.05) * 0.03;
    }
    if (!root.current) return;
    root.current.children.forEach((child) => {
      const meta = child.userData?.ray;
      if (!child.material || !meta) return;
      const pulse = 0.5 + 0.5 * Math.sin(t * meta.speed + meta.phase);
      const soft = pulse * pulse * (3 - 2 * pulse);
      child.material.opacity = meta.base * (0.55 + soft * 0.9);
    });
  });

  return (
    <group position={[0, 5.6, 0]}>
      {/* Broad volumetric haze volume */}
      <mesh ref={haze} position={[0, -4, -2]} rotation={[0.12, 0, 0]}>
        <planeGeometry args={[22, 18]} />
        <meshBasicMaterial
          map={map}
          color="#B6F06A"
          transparent
          opacity={0.1}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>

      <group ref={root}>
        {shafts.map((s, i) => (
          <mesh
            key={`ray-${i}`}
            position={[s.x, -3.8, s.z]}
            rotation={[s.rotX, 0, s.rotZ]}
            scale={[s.sxTop, 1, 1]}
            userData={{ ray: { base: s.base, phase: s.phase, speed: s.speed } }}
          >
            <planeGeometry args={[s.w, s.h, 1, 8]} />
            <meshBasicMaterial
              map={map}
              color={i % 3 === 0 ? '#D9FFB8' : '#B6F06A'}
              transparent
              opacity={s.base}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
              toneMapped={false}
            />
          </mesh>
        ))}

        {/* Soft conical shafts for depth / 3D volume */}
        {deepCones.map((c, i) => (
          <mesh
            key={`cone-${i}`}
            position={[c.x, -2.2, c.z]}
            rotation={[0.2, 0, c.rotZ]}
            scale={[c.scale, 1.1, c.scale]}
            userData={{ ray: { base: c.base, phase: c.phase, speed: c.speed } }}
          >
            <coneGeometry args={[1.6, 12, 24, 1, true]} />
            <meshBasicMaterial
              map={map}
              color="#C8FF7A"
              transparent
              opacity={c.base}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** Bright water-surface plane above — soft glow looking up */
function WaterSurface() {
  const mat = useRef(null);
  const glow = useRef(null);
  const map = useMemo(() => getSurfaceGlowMap(), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (mat.current) {
      mat.current.opacity = 0.16 + Math.sin(t * 0.28) * 0.035;
    }
    if (glow.current) {
      glow.current.material.opacity = 0.22 + Math.sin(t * 0.35) * 0.04;
      glow.current.scale.setScalar(1 + Math.sin(t * 0.2) * 0.04);
    }
  });

  return (
    <group>
      <mesh position={[0, 6.5, -3]} rotation={[-Math.PI / 2.15, 0, 0]}>
        <planeGeometry args={[48, 48]} />
        <meshBasicMaterial
          ref={mat}
          map={map}
          color="#D9FFB8"
          transparent
          opacity={0.18}
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {/* Hot spot where shafts originate */}
      <mesh ref={glow} position={[0.4, 6.2, -1.5]} rotation={[-Math.PI / 2.1, 0, 0]}>
        <circleGeometry args={[7, 48]} />
        <meshBasicMaterial
          map={map}
          color="#EAF6D8"
          transparent
          opacity={0.24}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

function getSandMap() {
  if (texCache.sand || typeof document === 'undefined') return texCache.sand;
  texCache.sand = makeCanvasTex((ctx, s) => {
    const g = ctx.createLinearGradient(0, 0, 0, s);
    g.addColorStop(0, '#e8c99a');
    g.addColorStop(0.45, '#d4b07a');
    g.addColorStop(1, '#b8925a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    // grain
    for (let i = 0; i < 9000; i++) {
      const v = 140 + ((i * 17) % 90);
      ctx.fillStyle = `rgba(${v},${v - 20},${v - 55},0.22)`;
      ctx.fillRect((i * 31) % s, (i * 47) % s, 1 + (i % 3), 1 + (i % 2));
    }
    // darker patches / ripples in sand
    ctx.strokeStyle = 'rgba(90,60,30,0.18)';
    ctx.lineWidth = 6;
    for (let i = 0; i < 18; i++) {
      const y = 20 + i * 28;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(s * 0.3, y + 12, s * 0.6, y - 10, s, y + 6);
      ctx.stroke();
    }
    // tiny pebble dots
    for (let i = 0; i < 80; i++) {
      ctx.fillStyle = i % 3 ? 'rgba(90,90,95,0.35)' : 'rgba(180,140,90,0.4)';
      ctx.beginPath();
      ctx.arc((i * 73) % s, (i * 91) % s, 2 + (i % 4), 0, Math.PI * 2);
      ctx.fill();
    }
  }, 512);
  return texCache.sand;
}

function getKelpGeo() {
  if (geoCache.kelp) return geoCache.kelp;
  const parts = [];
  // Tall wavy blade
  const shape = new THREE.Shape();
  shape.moveTo(-0.08, 0);
  shape.quadraticCurveTo(-0.18, 0.4, -0.06, 0.85);
  shape.quadraticCurveTo(-0.02, 1.15, 0.02, 1.35);
  shape.quadraticCurveTo(0.08, 1.1, 0.1, 0.75);
  shape.quadraticCurveTo(0.16, 0.35, 0.07, 0);
  shape.closePath();
  const blade = new THREE.ExtrudeGeometry(shape, {
    depth: 0.02,
    bevelEnabled: true,
    bevelThickness: 0.01,
    bevelSize: 0.012,
    bevelSegments: 2,
    curveSegments: 10,
  });
  blade.center();
  blade.translate(0, 0.65, 0);
  parts.push(blade);
  // Side fronds
  for (let i = 0; i < 4; i++) {
    const f = new THREE.SphereGeometry(0.1, 8, 8);
    f.scale(0.35, 1.2, 0.15);
    f.translate((i % 2 === 0 ? 0.12 : -0.12), 0.35 + i * 0.22, 0);
    parts.push(f);
  }
  const merged = mergeGeos(parts);
  merged.computeVertexNormals();
  geoCache.kelp = merged;
  return geoCache.kelp;
}

/**
 * Fixed lake bed — sand / rocks / rooted plants.
 * Locked to camera so cursor parallax never slides the floor.
 */
function LakeBed({ dense = true }) {
  const root = useRef(null);
  const plantGroup = useRef(null);
  const caustic = useRef(null);
  const causticB = useRef(null);
  const { camera } = useThree();
  const sandMap = useMemo(() => getSandMap(), []);
  const rockGeo = useMemo(() => getRockGeo(), []);
  const rockMap = useMemo(() => getRockMap(), []);
  const kelpGeo = useMemo(() => getKelpGeo(), []);
  const causticMap = useMemo(() => getCausticMap(), []);
  const causticMapB = useMemo(() => {
    const m = getCausticMap();
    return m ? m.clone() : m;
  }, []);

  const dunes = useMemo(() => {
    const out = [];
    const n = dense ? 64 : 36;
    for (let i = 0; i < n; i++) {
      const col = i % 12;
      const row = Math.floor(i / 12);
      out.push({
        x: col * 1.65 - 9.2 + (i % 5) * 0.22 + ((i * 7) % 5) * 0.08,
        z: row * 1.7 - 6.5 + (i % 3) * 0.45,
        sx: 0.95 + (i % 6) * 0.28,
        sy: 0.12 + (i % 5) * 0.045,
        sz: 0.85 + (i % 5) * 0.25,
        color: i % 3 === 0 ? '#CBA870' : i % 3 === 1 ? '#D4B07A' : '#BE9A62',
      });
    }
    return out;
  }, [dense]);

  const floorRocks = useMemo(() => {
    const out = [];
    const n = dense ? 110 : 64;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + i * 0.31;
      const r = 1.6 + (i % 9) * 0.85 + (i % 4) * 0.35;
      // Mostly sides / mid — sparse center corridor for frogs
      let x = Math.cos(a) * r + (i % 2 === 0 ? 0.9 : -0.9);
      let z = Math.sin(a) * r * 1.05 - 2.2 + ((i * 13) % 20) * 0.15;
      if (Math.abs(x) < 1.4 && Math.abs(z + 1) < 2.2) {
        x += x >= 0 ? 2.2 : -2.2;
      }
      out.push({
        x,
        z,
        s: 0.1 + (i % 8) * 0.055 + (i % 3) * 0.02,
        ry: i * 0.55,
        rx: ((i % 5) - 2) * 0.08,
        color: ROCK_COLORS[i % ROCK_COLORS.length],
      });
    }
    return out;
  }, [dense]);

  // Tiny pebbles fill empty sand patches
  const pebbles = useMemo(() => {
    const out = [];
    const n = dense ? 140 : 80;
    for (let i = 0; i < n; i++) {
      let x = ((i * 47) % 200) / 10 - 10;
      let z = ((i * 31) % 180) / 10 - 8;
      if (Math.abs(x) < 1.2 && Math.abs(z + 0.5) < 1.8) {
        x += x >= 0 ? 1.8 : -1.8;
      }
      out.push({
        x,
        z,
        s: 0.04 + (i % 5) * 0.018,
        ry: i * 0.9,
        color: ROCK_COLORS[(i + 2) % ROCK_COLORS.length],
      });
    }
    return out;
  }, [dense]);

  const plants = useMemo(() => {
    const out = [];
    const n = dense ? 280 : 160;
    const greens = [
      '#3D8B2E',
      '#5AAF36',
      '#2F6B24',
      '#78C042',
      '#4A7A28',
      '#2A5A1C',
      '#6BBF3A',
      '#8FD94A',
      '#1F4F18',
    ];
    for (let i = 0; i < n; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const band = i % 6;
      let x;
      let z;
      if (band === 0 || band === 1) {
        // Thick side forests
        x = side * (1.9 + ((i * 17) % 110) / 10);
        z = ((i * 29) % 240) / 10 - 10;
      } else if (band === 2) {
        // Near-camera grass beds
        x = side * (1.6 + ((i * 11) % 55) / 10);
        z = 1.5 + ((i * 37) % 70) / 10;
      } else if (band === 3) {
        // Mid field clumps
        x = side * (2.0 + ((i * 13) % 70) / 10) + ((i % 3) - 1) * 0.35;
        z = ((i * 41) % 180) / 10 - 7;
      } else if (band === 4) {
        // Far depth beds
        x = ((i * 23) % 200) / 10 - 10;
        z = -6 - ((i * 19) % 70) / 10;
        if (Math.abs(x) < 1.5) x = side * (1.6 + (i % 6) * 0.28);
      } else {
        // Tight tuft clusters (3-ish around a seed)
        const seed = Math.floor(i / 3);
        const cx = side * (2.4 + ((seed * 19) % 80) / 10);
        const cz = ((seed * 33) % 200) / 10 - 8;
        x = cx + ((i % 3) - 1) * 0.28;
        z = cz + ((i % 3) - 1) * 0.22;
      }
      // Keep a slim frog corridor clear
      if (Math.abs(x) < 1.35 && z > -2 && z < 3) {
        x = side * (1.55 + (i % 4) * 0.25);
      }
      out.push({
        x,
        z,
        s: 0.22 + (i % 9) * 0.07,
        phase: i * 0.37,
        color: greens[i % greens.length],
        lean: ((i % 7) - 3) * 0.05,
        tall: i % 4 === 0,
        bushy: i % 3 === 0,
      });
    }
    return out;
  }, [dense]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    // Glue bed to camera XY — sand/rocks/plants stay put when cursor moves
    if (root.current) {
      root.current.position.x = camera.position.x;
      root.current.position.y = camera.position.y - 2.9;
      root.current.position.z = camera.position.z - IDLE_Z - 0.5;
    }
    // Plants sway with water current only — never mouse
    if (plantGroup.current) {
      plantGroup.current.children.forEach((child, i) => {
        const p = plants[i];
        if (!p) return;
        child.rotation.z = p.lean + Math.sin(t * 0.9 + p.phase) * 0.18;
        child.rotation.x = Math.sin(t * 0.55 + p.phase * 0.7) * 0.08;
      });
    }
    if (caustic.current?.material) {
      caustic.current.material.opacity = 0.18 + Math.sin(t * 0.35) * 0.04;
      caustic.current.position.x = Math.sin(t * 0.1) * 0.45;
      caustic.current.position.z = Math.cos(t * 0.08) * 0.35;
      if (caustic.current.material.map) {
        caustic.current.material.map.offset.x = t * 0.02;
        caustic.current.material.map.offset.y = t * 0.015;
      }
    }
    if (causticB.current?.material) {
      causticB.current.material.opacity = 0.1 + Math.sin(t * 0.28 + 1) * 0.03;
      causticB.current.position.x = 2.2 + Math.sin(t * 0.14) * 0.5;
      if (causticB.current.material.map) {
        causticB.current.material.map.offset.x = -t * 0.018;
        causticB.current.material.map.offset.y = t * 0.012;
      }
    }
  });

  return (
    <group ref={root} position={[0, -2.9, -0.5]}>
      {/* Sand bed — wider fill */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -1]} receiveShadow>
        <planeGeometry args={[48, 36]} />
        <meshStandardMaterial
          color="#D8B888"
          map={sandMap}
          roughness={0.95}
          metalness={0}
        />
      </mesh>
      {/* Near sand shelf */}
      <mesh rotation={[-Math.PI / 2.05, 0, 0]} position={[0, 0.04, 4.8]}>
        <planeGeometry args={[36, 14]} />
        <meshStandardMaterial color="#CFAF78" map={sandMap} roughness={0.96} metalness={0} />
      </mesh>
      {/* Mid sand ridge */}
      <mesh rotation={[-Math.PI / 2.08, 0, 0]} position={[0, 0.03, 1.2]}>
        <planeGeometry args={[40, 12]} />
        <meshStandardMaterial color="#C8A66E" map={sandMap} roughness={0.96} metalness={0} />
      </mesh>
      {/* Far sand shelf */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -6]}>
        <planeGeometry args={[42, 14]} />
        <meshStandardMaterial color="#B8925A" map={sandMap} roughness={0.97} metalness={0} />
      </mesh>

      {/* Soft sand dunes — packed */}
      {dunes.map((d, i) => (
        <mesh key={`dune-${i}`} position={[d.x, 0.04, d.z]} scale={[d.sx, d.sy, d.sz]}>
          <sphereGeometry args={[1, 14, 10]} />
          <meshStandardMaterial color={d.color} map={sandMap} roughness={0.97} />
        </mesh>
      ))}

      {/* Floor rocks */}
      {floorRocks.map((r, i) => (
        <mesh
          key={`frock-${i}`}
          geometry={rockGeo}
          position={[r.x, 0.1 + r.s * 0.15, r.z]}
          scale={r.s}
          rotation={[r.rx ?? 0.1, r.ry, 0.05]}
        >
          <meshStandardMaterial color={r.color} map={rockMap} roughness={0.72} />
        </mesh>
      ))}

      {/* Pebble scatter */}
      {pebbles.map((p, i) => (
        <mesh
          key={`peb-${i}`}
          geometry={rockGeo}
          position={[p.x, 0.04 + p.s * 0.2, p.z]}
          scale={p.s}
          rotation={[0.15, p.ry, 0.1]}
        >
          <meshStandardMaterial color={p.color} map={rockMap} roughness={0.8} />
        </mesh>
      ))}

      {/* Rooted plants / kelp — dense beds */}
      <group ref={plantGroup}>
        {plants.map((p, i) => (
          <group key={`kelp-${i}`} position={[p.x, 0.02, p.z]}>
            <mesh
              geometry={kelpGeo}
              scale={[
                p.s * (p.tall ? 0.9 : 0.62),
                p.s * (p.tall ? 1.45 : p.bushy ? 1.1 : 0.95),
                p.s * (p.bushy ? 0.65 : 0.45),
              ]}
            >
              <meshStandardMaterial color={p.color} roughness={0.55} metalness={0.02} />
            </mesh>
            {/* Extra blade for bushier clumps */}
            {p.bushy && (
              <mesh
                geometry={kelpGeo}
                position={[0.12, 0, -0.08]}
                rotation={[0, 0.4, 0.08]}
                scale={[p.s * 0.5, p.s * 0.85, p.s * 0.38]}
              >
                <meshStandardMaterial color={p.color} roughness={0.58} metalness={0.02} />
              </mesh>
            )}
          </group>
        ))}
      </group>

      {/* Soft caustic pools dancing on sand */}
      <mesh ref={caustic} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, -0.5]}>
        <planeGeometry args={[22, 18]} />
        <meshBasicMaterial
          map={causticMap}
          color="#D9FFB8"
          transparent
          opacity={0.22}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={causticB} rotation={[-Math.PI / 2, 0, 0]} position={[2.2, 0.1, 1.4]}>
        <circleGeometry args={[5.5, 48]} />
        <meshBasicMaterial
          map={causticMapB}
          color="#EAF6D8"
          transparent
          opacity={0.12}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

/** Slow fill + surface shafts so the pond reads more 3D */
function SoftFillRig() {
  const fill = useRef(null);
  const spotA = useRef(null);
  const spotB = useRef(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (fill.current) {
      fill.current.intensity = 0.38 + Math.sin(t * 0.25) * 0.07;
    }
    if (spotA.current) {
      spotA.current.intensity = 1.15 + Math.sin(t * 0.32) * 0.2;
      spotA.current.position.x = Math.sin(t * 0.09) * 1.2;
    }
    if (spotB.current) {
      spotB.current.intensity = 0.7 + Math.sin(t * 0.27 + 1.2) * 0.15;
      spotB.current.position.x = 2.2 + Math.cos(t * 0.11) * 0.8;
    }
  });

  return (
    <>
      <pointLight
        ref={fill}
        position={[0, 3, 2]}
        intensity={0.38}
        color="#D9FFB8"
        distance={18}
        decay={1.4}
      />
      {/* Surface beams that catch fish / frogs in volume */}
      <spotLight
        ref={spotA}
        position={[0, 7.5, 1]}
        angle={0.55}
        penumbra={0.85}
        intensity={1.2}
        color="#EAF6D8"
        distance={22}
        decay={1.6}
        castShadow={false}
      />
      <spotLight
        ref={spotB}
        position={[2.4, 7.2, -1]}
        angle={0.42}
        penumbra={0.9}
        intensity={0.75}
        color="#B6F06A"
        distance={20}
        decay={1.7}
        castShadow={false}
      />
      <spotLight
        position={[-2.8, 6.8, 0.5]}
        angle={0.5}
        penumbra={0.88}
        intensity={0.55}
        color="#D9FFB8"
        distance={18}
        decay={1.7}
        castShadow={false}
      />
    </>
  );
}

function Scene({ mouse, quality, mode, travelRef }) {
  const dense = quality === 'high' || quality === 'medium';
  const lush = quality === 'high';
  const showHero = quality !== 'low' && mode === 'idle';
  const hubScroll = mode === 'settled';
  const density = hubScroll ? 0.62 : 1;
  const scale = (n) => Math.max(1, Math.round(n * density));

  // Packed pond — lighter counts while scrolling the hub (dual WebGL with frog nav)
  const n = {
    fish: scale(lush ? 160 : dense ? 120 : 70),
    fishFar: scale(lush ? 90 : dense ? 65 : 40),
    leaf: scale(lush ? 180 : dense ? 130 : 80),
    leafFar: scale(lush ? 100 : dense ? 70 : 45),
    lotus: scale(lush ? 55 : dense ? 40 : 24),
    wood: scale(lush ? 48 : dense ? 36 : 22),
    rock: scale(lush ? 70 : dense ? 52 : 32),
    rockFar: scale(lush ? 45 : dense ? 32 : 20),
    bubbles: scale(lush ? 280 : dense ? 200 : 120),
  };

  return (
    <>
      <color attach="background" args={[WATER]} />
      {/* Softer fog so deep assets still read */}
      <fog attach="fog" args={[WATER, 8, 36]} />
      <ambientLight intensity={0.42} color="#4A6A48" />
      <directionalLight position={[0, 16, 2]} intensity={1.15} color="#EAF6D8" />
      <directionalLight position={[6, 8, 4]} intensity={0.35} color="#70C431" />
      <directionalLight position={[-5, 3, -2]} intensity={0.22} color="#1A1D1E" />
      <hemisphereLight args={['#C4F4F8', '#2A1A08', 0.75]} />
      <SoftFillRig />

      {/* Fixed lake floor — sand, rocks, rooted plants (no cursor parallax) */}
      <LakeBed dense />

      <WaterSurface />
      <GodRays />
      <Bubbles travelRef={travelRef} count={n.bubbles} />

      {/* Near / mid schools */}
      <LakeLayer kind="fish" count={n.fish} radius={20} depth={52} scaleBase={0.2} drift={0.0032} travelRef={travelRef} mouseRef={mouse} parallax={0.42} />
      <LakeLayer kind="leaf" count={n.leaf} radius={22} depth={54} scaleBase={0.15} drift={0.0022} travelRef={travelRef} mouseRef={mouse} parallax={0.32} />
      <LakeLayer kind="lotus" count={n.lotus} radius={18} depth={50} scaleBase={0.2} drift={0.0026} travelRef={travelRef} mouseRef={mouse} parallax={0.48} />
      <LakeLayer kind="wood" count={n.wood} radius={19} depth={52} scaleBase={0.3} drift={0.0014} travelRef={travelRef} mouseRef={mouse} parallax={0.24} animate={false} />
      <LakeLayer kind="rock" count={n.rock} radius={21} depth={56} scaleBase={0.22} drift={0.001} travelRef={travelRef} mouseRef={mouse} parallax={0.18} animate={false} />

      {/* Far parallax layers — fill depth / edges */}
      <LakeLayer kind="fish" count={n.fishFar} radius={26} depth={70} scaleBase={0.14} drift={0.0018} travelRef={travelRef} mouseRef={mouse} parallax={0.18} />
      <LakeLayer kind="leaf" count={n.leafFar} radius={28} depth={72} scaleBase={0.11} drift={0.0012} travelRef={travelRef} mouseRef={mouse} parallax={0.14} />
      <LakeLayer kind="rock" count={n.rockFar} radius={27} depth={68} scaleBase={0.16} drift={0.0007} travelRef={travelRef} mouseRef={mouse} parallax={0.1} animate={false} />
      <LakeLayer kind="wood" count={dense ? 22 : 14} radius={24} depth={64} scaleBase={0.22} drift={0.0009} travelRef={travelRef} mouseRef={mouse} parallax={0.12} animate={false} />
      <LakeLayer kind="lotus" count={dense ? 28 : 16} radius={23} depth={60} scaleBase={0.14} drift={0.0015} travelRef={travelRef} mouseRef={mouse} parallax={0.2} />

      <group visible={showHero}>
        <PondHeroProps mouse={mouse} />
      </group>
      <CameraRig mouse={mouse} mode={mode} travelRef={travelRef} />
    </>
  );
}

function CssPondField() {
  const items = useMemo(() => {
    const glyphs = ['✿', '🍃', '🐟', '🪨', '🪵', '🫧', '🌿'];
    const colors = ['#FE77BC', '#75C025', '#FC6C34', '#9AA3AD', '#8B5A2B', '#A8E8F0', '#4A7A28'];
    const out = [];
    for (let i = 0; i < 140; i++) {
      const kind = i % glyphs.length;
      out.push({
        id: i,
        glyph: glyphs[kind],
        color: colors[kind],
        left: `${(Math.random() * 100).toFixed(2)}%`,
        top: `${(Math.random() * 100).toFixed(2)}%`,
        fontSize: 9 + Math.random() * 20,
        opacity: 0.3 + Math.random() * 0.45,
        rotate: Math.random() * 40 - 20,
        layer: Math.random() < 0.45 ? 'far' : 'mid',
      });
    }
    return out;
  }, []);

  return (
    <div className="css-starfield css-pondfield" aria-hidden="true">
      {items.map((s) => (
        <span
          key={s.id}
          className={`css-star-glyph css-star-${s.layer}`}
          style={{
            left: s.left,
            top: s.top,
            fontSize: `${s.fontSize}px`,
            color: s.color,
            opacity: s.opacity,
            ['--star-rot']: `${s.rotate}deg`,
          }}
        >
          {s.glyph}
        </span>
      ))}
    </div>
  );
}

function pickQuality() {
  if (typeof window === 'undefined') return 'medium';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'css';
  const cores = navigator.hardwareConcurrency || 4;
  const mem = navigator.deviceMemory || 8;
  // Prefer denser pond — only throttle on clearly weak devices
  if (window.innerWidth < 640 || (cores <= 2 && mem <= 2)) return 'low';
  if (window.innerWidth < 900 || cores <= 4 || mem <= 4) return 'medium';
  return 'high';
}

/**
 * Live underwater lake background.
 * mode: idle | diving | settled
 */
export default function HeroCanvas({
  mode = 'idle',
  webgl = true,
  travelRef = null,
  mouseRef: externalMouse = null,
}) {
  const localMouse = useRef({ x: 0, y: 0, sx: 0, sy: 0 });
  const mouse = externalMouse || localMouse;
  const [quality, setQuality] = useState('medium');
  const cssRootRef = useRef(null);
  const internalTravel = useRef(0);
  const travel = travelRef || internalTravel;

  useEffect(() => {
    setQuality(pickQuality());
    const onResize = () => setQuality(pickQuality());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (externalMouse || quality === 'css' || mode === 'diving') return undefined;
    const onMove = (e) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
      mouse.current.sx = mouse.current.x;
      mouse.current.sy = mouse.current.y;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [externalMouse, quality, mode, mouse]);

  const showWebgl = webgl && quality !== 'css';
  const restMode = !webgl;

  return (
    <div
      className={`hero-canvas${restMode ? ' hero-canvas--rest' : ''}`}
      aria-hidden="true"
      ref={cssRootRef}
    >
      {/* Always-on water cues (works with or without WebGL) */}
      <div className="water-depth" />
      {/* Fixed sand floor — never follows cursor / travel */}
      <div className="water-sandbed" />
      <div className="water-caustics" />
      <div className="water-rays" />
      <div className="water-bubbles-css" />
      {quality === 'css' && <CssPondField />}
      {showWebgl && (
        <div className="hero-webgl">
          <Canvas
            dpr={[1, 1]}
            camera={{ position: [0, 0, IDLE_Z], fov: IDLE_FOV }}
            gl={{
              antialias: false,
              alpha: true,
              powerPreference: 'high-performance',
              stencil: false,
              depth: true,
            }}
            frameloop="always"
            style={{ background: 'transparent' }}
          >
            <Suspense fallback={null}>
              <Scene
                mouse={mouse}
                quality={quality === 'high' ? 'high' : quality === 'medium' ? 'medium' : 'low'}
                mode={mode}
                travelRef={travel}
              />
            </Suspense>
          </Canvas>
        </div>
      )}
      <div className="hero-canvas-vignette" />
      <div className="water-tint" />
    </div>
  );
}
