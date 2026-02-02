import * as THREE from "three";

export function createPicker({ canvas, camera, objects, interaction, onPick }) {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  let down = null;

  function pointerPos(e) {
    const r = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointer.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
  }

  canvas.addEventListener("pointerdown", (e) => {
    down = { x: e.clientX, y: e.clientY, t: performance.now() };
  });

  canvas.addEventListener("pointerup", (e) => {
    if (!down) return;
    const dx = e.clientX - down.x;
    const dy = e.clientY - down.y;
    const moved = Math.hypot(dx, dy);

    down = null;

    
    if (moved > 6) return;

    pointerPos(e);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(objects, false);
    if (hits.length) {
      interaction.bumpIdle(900);
      onPick?.(hits[0].object);
    }
  });

  function attachOrbitControls(controls) {
    
    
    controls.addEventListener("start", () => {});
  }

  return { attachOrbitControls };
}