import * as THREE from "three";

export function startLoop({
  scene,
  camera,
  renderer,
  orbitControls,
  interaction,
  globeGroup,
  onFrame
}) {
  const clock = new THREE.Clock();

  function tick() {
    requestAnimationFrame(tick);

    const dt = clock.getDelta();
    const time = clock.getElapsedTime();

    
    if (interaction.allowAutoMotion() && !interaction.focusActive) {
      globeGroup.rotation.y += dt * 0.20;
    }

    orbitControls.update();

    const width = renderer.domElement.clientWidth;
    const height = renderer.domElement.clientHeight;

    onFrame?.({ dt, time, width, height });

    renderer.render(scene, camera);
  }

  tick();
}
