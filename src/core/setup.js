import * as THREE from "three";

export function setup() {
  const canvas = document.getElementById("gl");
  const hud = document.getElementById("hud");

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x040405, 10, 24);

  const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    200
  );
  camera.position.set(0, 0.25, 5.8);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance"
  });
  const maxPixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  // Start slightly lower for faster first render, then upscale adaptively.
  renderer.setPixelRatio(Math.max(1, maxPixelRatio * 0.82));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x040405, 1);

  
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.25);
  keyLight.position.set(4, 2, 3);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xffffff, 0.32);
  fillLight.position.set(-3, -1, 2);
  scene.add(fillLight);

  scene.add(new THREE.AmbientLight(0xffffff, 0.20));

  // Keep background local-only and deterministic; avoids external fetch failures.
  scene.background = null;

  return { canvas, hud, scene, camera, renderer };
}
