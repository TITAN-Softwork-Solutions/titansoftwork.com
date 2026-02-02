import * as THREE from "three";

export function latLngToLocalVector(lat, lng, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);

  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);

  return new THREE.Vector3(x, y, z);
}

export function localAnchorAboveSurface(surfaceLocal, radius, height) {
  return surfaceLocal.clone().normalize().multiplyScalar(radius + height);
}