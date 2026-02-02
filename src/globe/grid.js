import * as THREE from "three";


export function createGrid({
  radius,
  latStepDeg = 15,
  lonStepDeg = 15,
  segments = 128,
  opacity = 0.22
}) {
  const positions = [];

  function sph(latDeg, lonDeg) {
    const phi = (90 - latDeg) * (Math.PI / 180);
    const theta = (lonDeg + 180) * (Math.PI / 180);

    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);

    return [x, y, z];
  }

  
  for (let lat = -90 + latStepDeg; lat <= 90 - latStepDeg; lat += latStepDeg) {
    for (let i = 0; i < segments; i++) {
      const lon1 = (i / segments) * 360 - 180;
      const lon2 = ((i + 1) / segments) * 360 - 180;
      positions.push(...sph(lat, lon1), ...sph(lat, lon2));
    }
  }

  
  for (let lon = -180; lon < 180; lon += lonStepDeg) {
    for (let i = 0; i < segments; i++) {
      const lat1 = (i / segments) * 180 - 90;
      const lat2 = ((i + 1) / segments) * 180 - 90;
      positions.push(...sph(lat1, lon), ...sph(lat2, lon));
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));

  const mat = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity
  });

  
  mat.depthTest = true;
  mat.depthWrite = false;

  
  mat.blending = THREE.AdditiveBlending;

  const lines = new THREE.LineSegments(geo, mat);

  
  lines.frustumCulled = false;

  return lines;
}