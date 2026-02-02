
import * as THREE from "three";

export function createFocusCardSelection({
  renderer,
  camera,
  heroEl,
  interaction,
  markerById,
  cardLayer,
  focusController,
  isForeground
}) {
  let focusLayout = { globeCorner: "TL", cardSide: "right" };
  let focusPin = null; 

  function clearPin() {
    focusPin = null;
  }

  function getLayout() {
    return focusLayout;
  }

  function getPinFor(id) {
    if (!focusPin) return null;
    if (focusPin.id !== id) return null;
    return focusPin;
  }

  function syncHeroAttrsOnFrame() {
    if (!heroEl) return;

    if (interaction.focusActive && interaction.focusId) {
      heroEl.dataset.focus = "1";
      heroEl.dataset.cardSide = focusLayout.cardSide;
    } else {
      delete heroEl.dataset.focus;
      delete heroEl.dataset.cardSide;
      clearPin();
    }
  }

  function handleSelect({ id }) {
    if (!isForeground()) return;

    
    if (interaction.focusActive && interaction.focusId === id) {
      clearPin();
      focusController.clear();
      return;
    }

    const item = markerById.get(id);
    if (!item) return;

    const stageRect = renderer.domElement.getBoundingClientRect();
    const width = renderer.domElement.clientWidth;

    
    const existing = cardLayer.getCardLayout?.(id, stageRect);

    let side = existing?.side;
    if (!side) {
      
      const wPos = item.mesh.getWorldPosition(new THREE.Vector3());
      const p = wPos.clone().project(camera);
      const sx = (p.x * 0.5 + 0.5) * width;
      side = sx >= width * 0.5 ? "right" : "left";
    }

    
    const globeCorner = side === "right" ? "TL" : "BR";
    focusLayout = { globeCorner, cardSide: side };

    
    if (existing?.rectLocal) {
      focusPin = { id, x: existing.rectLocal.left, y: existing.rectLocal.top, side };
    } else {
      focusPin = { id, x: null, y: null, side };
    }

    
    if (heroEl) {
      heroEl.dataset.cardSide = side;
      heroEl.dataset.focus = "1";
    }

    focusController.focus({
      id,
      markerMesh: item.mesh,
      layout: focusLayout
    });
  }

  return {
    handleSelect,
    syncHeroAttrsOnFrame,
    getLayout,
    getPinFor,
    clearPin
  };
}
