import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export function createOrbit({ camera, renderer, interaction }) {
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.rotateSpeed = 0.55;

  controls.enablePan = false;
  controls.minDistance = 2.6;
  controls.maxDistance = 6.8;

  controls.addEventListener("start", () => {
    interaction.draggingGlobe = true;
  });

  controls.addEventListener("end", () => {
    interaction.draggingGlobe = false;
    interaction.bumpIdle(900); 
  });

  return { controls };
}