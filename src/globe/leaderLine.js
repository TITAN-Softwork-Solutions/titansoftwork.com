import * as THREE from "three";

export function createLeaderLine({ scene }) {
  const SEGMENTS = 48;
  const positions = new Float32Array((SEGMENTS + 1) * 3);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const material = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.55
  });

  const line = new THREE.Line(geometry, material);
  scene.add(line);

  const tmpMid = new THREE.Vector3();
  const tmpP = new THREE.Vector3();
  const tmpA = new THREE.Vector3();
  const tmpB = new THREE.Vector3();
  const tmpDir = new THREE.Vector3();

  const EPS = 1e-6;

  
  function update(startWorld, endWorld, preferDirWorld) {
    
    
    tmpA.copy(startWorld);
    tmpB.copy(endWorld);

    const aLen = tmpA.length();
    const bLen = tmpB.length();

    const aDir = aLen > EPS ? tmpA.clone().multiplyScalar(1 / aLen) : new THREE.Vector3(1, 0, 0);
    const bDir = bLen > EPS ? tmpB.clone().multiplyScalar(1 / bLen) : new THREE.Vector3(0, 0, 1);

    tmpDir.copy(aDir).add(bDir);

    
    if (tmpDir.lengthSq() < EPS) {
      tmpDir.copy(aDir);
    } else {
      tmpDir.normalize();
    }

    
    const base = Math.max(aLen, bLen);
    const bulge = 0.55;
    const c = tmpDir.multiplyScalar(base + bulge);

    
    if (preferDirWorld && preferDirWorld.lengthSq() > EPS) {
      const pref = preferDirWorld.clone().normalize();
      if (c.dot(pref) < 0) c.multiplyScalar(-1);
    }

    
    for (let i = 0; i <= SEGMENTS; i++) {
      const t = i / SEGMENTS;
      const it = 1 - t;

      tmpP
        .set(0, 0, 0)
        .addScaledVector(startWorld, it * it)
        .addScaledVector(c, 2 * it * t)
        .addScaledVector(endWorld, t * t);

      const idx = i * 3;
      positions[idx] = tmpP.x;
      positions[idx + 1] = tmpP.y;
      positions[idx + 2] = tmpP.z;
    }

    geometry.attributes.position.needsUpdate = true;
  }

  return { update, line };
}