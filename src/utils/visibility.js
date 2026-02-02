import * as THREE from "three";

const _tmpWorld = new THREE.Vector3();
const _tmpCenter = new THREE.Vector3();
const _tmpCamDir = new THREE.Vector3();
const _tmpPointDir = new THREE.Vector3();
const _tmpProj = new THREE.Vector3();

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function smoothstep(edge0, edge1, x) {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}


export function latLngToVector3(lat, lng, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);

  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);

  return new THREE.Vector3(x, y, z);
}


export function computeVisibleMarkers({
  markers,
  camera,
  globeCenterWorld,
  width,
  height
}) {
  _tmpCenter.copy(globeCenterWorld);

  
  _tmpCamDir.copy(camera.position).sub(_tmpCenter).normalize();

  const results = [];

  
  const DOT_VISIBLE = 0.12; 
  const DOT_FULL = 0.50;    

  for (const m of markers) {
    const anchor = m.anchor || m.mesh;
    anchor.getWorldPosition(_tmpWorld);

    
    _tmpPointDir.copy(_tmpWorld).sub(_tmpCenter).normalize();
    const dot = _tmpPointDir.dot(_tmpCamDir);

    if (dot < DOT_VISIBLE) continue;

    
    _tmpProj.copy(_tmpWorld).project(camera);

    if (_tmpProj.z < -1 || _tmpProj.z > 1) continue;
    if (_tmpProj.x < -1.02 || _tmpProj.x > 1.02) continue;
    if (_tmpProj.y < -1.02 || _tmpProj.y > 1.02) continue;

    const sx = (_tmpProj.x * 0.5 + 0.5) * width;
    const sy = (-_tmpProj.y * 0.5 + 0.5) * height;

    const preferredSide = sx >= width * 0.5 ? "right" : "left";

    
    
    const t = smoothstep(DOT_VISIBLE, DOT_FULL, dot);

    
    
    const alpha = 0.35 + 0.65 * t;

    results.push({
      id: m.id,
      breach: m.breach,
      anchorScreen: { x: sx, y: sy },
      preferredSide,
      alpha
    });
  }

  return results;
}
