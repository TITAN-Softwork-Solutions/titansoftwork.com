import * as THREE from "three";
import { computeVisibleMarkers } from "../utils/visibility.js";

export function createFrameController({
  renderer,
  camera,
  globe,
  markers,
  markerById,
  interaction,
  altitudeHud,
  cardLayer,
  linkLayer,
  inspectorHud,
  isForeground,
  focusSelection
}) {
  const tmpCenter = new THREE.Vector3();

  return function onFrame({ time, width, height }) {
    const stageRect = renderer.domElement.getBoundingClientRect();

    
    focusSelection.syncHeroAttrsOnFrame();

    
    const globeScale = globe.group.scale.x || 1;
    const globeRadiusWorld = globe.radius * globeScale;

    tmpCenter.copy(globe.group.position);

    const distToCenter = camera.position.distanceTo(tmpCenter);
    const altitudeWorld = Math.max(0, distToCenter - globeRadiusWorld);

    const kmPerWorldUnit = 6371 / globeRadiusWorld;
    const altitudeKm = altitudeWorld * kmPerWorldUnit;

    altitudeHud.update({ altitudeKm });

    
    const inViewItems = computeVisibleMarkers({
      markers: markers.items,
      camera,
      globeCenterWorld: globe.centerWorld,
      width,
      height
    });
    const inViewIds = new Set(inViewItems.map((v) => String(v.id)));

    
    let visibleItems;

    const focusLayout = focusSelection.getLayout();

    if (interaction.focusActive && interaction.focusId) {
      const item = markerById.get(interaction.focusId);
      if (!item) return;

      const wPos = item.mesh.getWorldPosition(new THREE.Vector3());
      const proj = wPos.clone().project(camera);

      const sx = (proj.x * 0.5 + 0.5) * width;
      const sy = (-proj.y * 0.5 + 0.5) * height;

      visibleItems = [{
        id: item.id,
        breach: item.breach,
        anchorScreen: { x: sx, y: sy },
        preferredSide: focusLayout.cardSide,
        alpha: 1
      }];
    } else {
      visibleItems = inViewItems;

      if (!isForeground()) {
        visibleItems = visibleItems.map((it) => ({ ...it, alpha: (it.alpha ?? 1) * 0.55 }));
      }
    }

    const laidOut = cardLayer.update({
      visibleItems,
      viewport: { width, height },
      stageRect,
      focus: {
        active: interaction.focusActive,
        id: interaction.focusId,
        globeCorner: focusLayout.globeCorner,
        cardSide: focusLayout.cardSide,
        pin: (interaction.focusActive && interaction.focusId)
          ? focusSelection.getPinFor(interaction.focusId)
          : null
      },
      time
    });

    linkLayer.update({
      viewport: { width, height },
      time,
      connections: laidOut.map((it) => ({
        id: it.id,
        from: it.anchorScreen,
        to: it.backScreen,
        alpha: it.alpha
      }))
    });

    
    inspectorHud?.update({
      inViewIds,
      foreground: isForeground(),
      focusActive: interaction.focusActive,
      focusId: interaction.focusId
    });
  };
}