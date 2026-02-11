import * as THREE from "three";
import { gsap } from "gsap";


export function createFocusController({
  camera,
  controls,
  globeGroup,
  interaction,
  globeRadius
}) {
  const tmpCenter = new THREE.Vector3();
  const tmpMarker = new THREE.Vector3();
  const tmpNormal = new THREE.Vector3();

  const tmpMat = new THREE.Matrix4();
  const tmpRight = new THREE.Vector3();
  const tmpUp = new THREE.Vector3();

  let tl = null;

  
  
  let savedState = null;

  function killTweens() {
    if (tl) {
      tl.kill();
      tl = null;
    }
    gsap.killTweensOf(camera.position);
    gsap.killTweensOf(controls.target);
  }

  function getGlobeRadiusWorld() {
    const s = globeGroup.scale.x || 1;
    return globeRadius * s;
  }

  function getGlobeCenterWorld(out = tmpCenter) {
    out.copy(globeGroup.position);
    return out;
  }

  function clampDistance(d) {
    const minD = Number.isFinite(controls.minDistance) ? controls.minDistance : 0;
    const maxD = Number.isFinite(controls.maxDistance) ? controls.maxDistance : Infinity;
    const eps = 1e-3;

    let out = d;
    if (minD > 0) out = Math.max(out, minD + eps);
    if (Number.isFinite(maxD)) out = Math.min(out, maxD - eps);

    return out;
  }

  
  function computeFocusPose({ markerMesh, layout }) {
    const radiusWorld = getGlobeRadiusWorld();
    const center = getGlobeCenterWorld(new THREE.Vector3());

    markerMesh.getWorldPosition(tmpMarker);

    
    tmpNormal.copy(tmpMarker).sub(center).normalize();

    
    
    const desiredDist = clampDistance(radiusWorld * 2.15);

    const endPos = tmpMarker.clone().add(tmpNormal.clone().multiplyScalar(desiredDist));

    
    
    tmpMat.lookAt(endPos, tmpMarker, camera.up);
    tmpRight.setFromMatrixColumn(tmpMat, 0).normalize();
    tmpUp.setFromMatrixColumn(tmpMat, 1).normalize();

    
    
    
    const ox = radiusWorld * 0.42;
    const oy = radiusWorld * 0.22;

    const corner = layout?.globeCorner || (layout?.cardSide === "right" ? "TL" : "BR");

    let sx = 0;
    let sy = 0;

    
    if (corner === "TL") {
      sx = +1;
      sy = -1;
    } else if (corner === "BR") {
      sx = -1;
      sy = +1;
    } else if (corner === "TR") {
      sx = -1;
      sy = -1;
    } else if (corner === "BL") {
      sx = +1;
      sy = +1;
    }

    const endTarget = tmpMarker
      .clone()
      .add(tmpRight.clone().multiplyScalar(ox * sx))
      .add(tmpUp.clone().multiplyScalar(oy * sy));

    return { endPos, endTarget };
  }

  function focus({ id, markerMesh, layout }) {
    if (!markerMesh) return;

    
    if (!interaction.focusActive) {
      savedState = {
        camPos: camera.position.clone(),
        target: controls.target.clone(),
        controlsEnabled: controls.enabled,
        controlsDamping: controls.enableDamping
      };
    }

    interaction.focusActive = true;
    interaction.focusId = id;

    interaction.bumpIdle?.(1200);

    killTweens();

    const { endPos, endTarget } = computeFocusPose({ markerMesh, layout });

    
    const prevEnabled = controls.enabled;
    const prevDamping = controls.enableDamping;

    controls.enabled = false;
    controls.enableDamping = false;

    
    tl = gsap.timeline({
      defaults: { ease: "power3.out" },
      onUpdate: () => {
        controls.update();
      },
      onComplete: () => {
        
        camera.position.copy(endPos);
        controls.target.copy(endTarget);
        controls.update();

        controls.enableDamping = prevDamping;
        controls.enabled = prevEnabled;
        tl = null;
      }
    });

    tl.to(
      camera.position,
      { x: endPos.x, y: endPos.y, z: endPos.z, duration: 1.05 },
      0
    );

    tl.to(
      controls.target,
      { x: endTarget.x, y: endTarget.y, z: endTarget.z, duration: 1.05 },
      0
    );
  }

  function clear() {
    if (!interaction.focusActive) return;

    interaction.focusActive = false;
    interaction.focusId = null;

    interaction.bumpIdle?.(900);

    
    if (!savedState) {
      killTweens();
      return;
    }

    killTweens();

    const endPos = savedState.camPos.clone();
    const endTarget = savedState.target.clone();
    const restoreEnabled = savedState?.controlsEnabled ?? true;
    const restoreDamping = savedState?.controlsDamping ?? true;

    savedState = null;
    // Restore interaction immediately so the globe feels responsive on defocus.
    controls.enableDamping = restoreDamping;
    controls.enabled = restoreEnabled;

    const cancelTweenOnUserInput = () => {
      killTweens();
      controls.removeEventListener("start", cancelTweenOnUserInput);
    };
    controls.addEventListener("start", cancelTweenOnUserInput);

    tl = gsap.timeline({
      defaults: { ease: "power3.out" },
      onUpdate: () => {
        controls.update();
      },
      onComplete: () => {
        camera.position.copy(endPos);
        controls.target.copy(endTarget);
        controls.update();

        controls.enableDamping = restoreDamping;
        controls.enabled = restoreEnabled;
        controls.removeEventListener("start", cancelTweenOnUserInput);
        tl = null;
      }
    });

    tl.to(
      camera.position,
      { x: endPos.x, y: endPos.y, z: endPos.z, duration: 0.42 },
      0
    );

    tl.to(
      controls.target,
      { x: endTarget.x, y: endTarget.y, z: endTarget.z, duration: 0.42 },
      0
    );
  }

  return { focus, clear };
}
