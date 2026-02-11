export function attachResize({ camera, renderer }) {
  let resizeRaf = 0;

  function onResize() {
    if (resizeRaf) cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      resizeRaf = 0;
    });
  }

  window.addEventListener("resize", onResize);
}
