import * as THREE from "three";
import { latLngToVector3 } from "../utils/visibility.js";

export function createMarkers({ globeGroup, breaches, radius }) {
  const markerGroup = new THREE.Group();
  globeGroup.add(markerGroup);

  const arcOuterGeo = new THREE.TorusGeometry(0.066, 0.0022, 12, 64, Math.PI);
  const arcInnerGeo = new THREE.TorusGeometry(0.052, 0.0019, 12, 64, Math.PI);
  const arcMat = new THREE.MeshStandardMaterial({
    color: 0xf5f5f5,
    emissive: 0xffffff,
    emissiveIntensity: 0.95,
    roughness: 0.25,
    metalness: 0.05,
    transparent: true,
    opacity: 0.92
  });

  const stemGeo = new THREE.CylinderGeometry(0.0016, 0.0016, 0.085, 10);
  const stemMat = new THREE.MeshStandardMaterial({
    color: 0xf5f5f5,
    emissive: 0xffffff,
    emissiveIntensity: 0.25,
    roughness: 0.45,
    metalness: 0.05
  });

  const items = breaches.map((b) => {
    const anchor = new THREE.Group();
    anchor.position.copy(latLngToVector3(b.lat, b.lng, radius));

    const normal = anchor.position.clone().normalize();
    const up = new THREE.Vector3(0, 1, 0);
    anchor.quaternion.setFromUnitVectors(up, normal);


    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.y = 0.035;
    stem.renderOrder = 1;
    anchor.add(stem);

    const linkAnchor = new THREE.Object3D();
    linkAnchor.position.y = 0.07;
    anchor.add(linkAnchor);

    const target = new THREE.Group();
    target.position.y = 0.07;

    const spinnerOuter = new THREE.Group();
    const arcOuter = new THREE.Mesh(arcOuterGeo, arcMat);
    arcOuter.rotation.x = Math.PI / 2;
    arcOuter.renderOrder = 2;
    spinnerOuter.add(arcOuter);
    target.add(spinnerOuter);

    const spinnerInner = new THREE.Group();
    spinnerInner.position.y = -0.012;
    const arcInner = new THREE.Mesh(arcInnerGeo, arcMat);
    arcInner.rotation.x = Math.PI / 2;
    arcInner.rotation.z = Math.PI;
    arcInner.renderOrder = 2;
    spinnerInner.add(arcInner);
    target.add(spinnerInner);

    anchor.add(target);

    markerGroup.add(anchor);

    return {
      id: b.id,
      breach: b,
      mesh: anchor,
      anchor: linkAnchor,
      spinOuter: spinnerOuter,
      spinInner: spinnerInner,
      spinSpeedOuter: 0.35 + Math.random() * 0.45,
      spinSpeedInner: 0.55 + Math.random() * 0.55
    };
  });

  return { items };
}
