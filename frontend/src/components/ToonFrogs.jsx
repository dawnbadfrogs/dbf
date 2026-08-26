import { useEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';

const FROG_URL = '/frog.glb';

/** Slight scale / pose accent per module */
export const FROG_FORMS = {
  classic: { sx: 1, sy: 1, sz: 1 },
  slim: { sx: 0.92, sy: 1.08, sz: 0.92 },
  athletic: { sx: 1.1, sy: 0.95, sz: 1.08 },
  king: { sx: 1.12, sy: 1.05, sz: 1.1 },
  stylish: { sx: 0.98, sy: 1.02, sz: 0.98 },
};

function normalizeFrog(root, targetSize = 1.65, { grounded = false } = {}) {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z, 0.001);
  root.scale.multiplyScalar(targetSize / maxDim);

  root.updateMatrixWorld(true);
  box.setFromObject(root);
  const center = box.getCenter(new THREE.Vector3());
  root.position.x -= center.x;
  root.position.z -= center.z;

  if (grounded) {
    // Feet on local y=0 so parent can plant on sand
    root.position.y -= box.min.y;
  } else {
    root.position.y -= center.y;
    root.updateMatrixWorld(true);
    box.setFromObject(root);
    root.position.y -= (box.min.y + box.max.y) * 0.5;
  }
}

/**
 * Hub frog from public/frog.glb — tinted lightly by module accent.
 */
export function FrogMesh({
  color,
  accent,
  formKey = 'classic',
  matRef,
  grounded = false,
  onClick,
}) {
  const { scene } = useGLTF(FROG_URL);
  const form = FROG_FORMS[formKey] || FROG_FORMS.classic;
  const groupRef = useRef(null);

  const model = useMemo(() => {
    const cloned = cloneSkinned(scene);
    cloned.traverse((obj) => {
      if (!obj.isMesh) return;
      obj.castShadow = false;
      obj.receiveShadow = false;
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        const next = mats.map((m) => {
          const c = m.clone();
          c.transparent = false;
          c.opacity = 1;
          c.depthWrite = true;
          return c;
        });
        obj.material = next.length === 1 ? next[0] : next;
      }
    });
    normalizeFrog(cloned, grounded ? 1.45 : 1.7, { grounded });
    return cloned;
  }, [scene, grounded]);

  // Soft accent wash + expose one material for hub emissive pulse
  useEffect(() => {
    const accentColor = accent instanceof THREE.Color ? accent : new THREE.Color(accent);
    const baseColor = color instanceof THREE.Color ? color : new THREE.Color(color);
    let firstMat = null;

    model.traverse((obj) => {
      if (!obj.isMesh || !obj.material) return;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((m) => {
        if (!firstMat) firstMat = m;
        if (m.color && m.map == null) {
          // Untextured parts: lean toward module color
          m.color.copy(baseColor);
        }
        if (m.emissive) {
          m.emissive.copy(accentColor);
          m.emissiveIntensity = 0.12;
        }
      });
    });

    if (matRef) matRef.current = firstMat;
  }, [model, color, accent, matRef]);

  return (
    <group
      ref={groupRef}
      onClick={onClick}
      scale={[form.sx, form.sy, form.sz]}
      dispose={null}
    >
      <primitive object={model} />
    </group>
  );
}

useGLTF.preload(FROG_URL);
