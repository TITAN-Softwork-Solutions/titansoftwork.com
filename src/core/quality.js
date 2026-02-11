export function createAdaptiveQuality({ renderer }) {
  const maxPixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const minScale = 0.68;
  const maxScale = 1.0;
  let scale = 0.82;

  let elapsed = 0;
  let sampleTime = 0;
  let sampleFrames = 0;
  let cooldown = 0;

  function applyScale(nextScale) {
    const clamped = Math.max(minScale, Math.min(maxScale, nextScale));
    if (Math.abs(clamped - scale) < 0.03) return;
    scale = clamped;
    renderer.setPixelRatio(Math.max(1, maxPixelRatio * scale));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
  }

  function onFrame(dt, { interacting = false } = {}) {
    elapsed += dt;
    sampleTime += dt;
    sampleFrames += 1;
    cooldown -= dt;

    // Give initial paint time before quality ramps.
    if (elapsed < 1.0) return;
    if (sampleTime < 0.7) return;
    if (cooldown > 0) return;

    const fps = sampleFrames / sampleTime;
    sampleTime = 0;
    sampleFrames = 0;

    if (fps > 57 && scale < maxScale && !interacting) {
      applyScale(scale + 0.08);
      cooldown = 1.2;
      return;
    }

    if (fps < 43 && scale > minScale) {
      applyScale(scale - 0.08);
      cooldown = 0.8;
    }
  }

  return { onFrame };
}
