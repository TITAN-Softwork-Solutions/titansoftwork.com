
export function createSplash({
  storageKey = "atlas_splash_shown",
  minShowMs = 900,
  fadeOutMs = 700
} = {}) {
  
  try {
    sessionStorage.setItem(storageKey, "1");
  } catch {
    
  }

  const root = document.createElement("div");
  root.className = "atlas-splash";
  root.style.setProperty("--p", "0");

  root.innerHTML = `
    <div class="atlas-splash__center">
      <div class="atlas-splash__ring" aria-hidden="true"></div>
      <div class="atlas-splash__brand">ATLAS</div>
      <div class="atlas-splash__pct">0%</div>

      <div class="atlas-splash__welcome">WELCOME TO ATLAS</div>
      <div class="atlas-splash__sub">Security reset initiated.</div>
    </div>
  `;

  document.body.appendChild(root);

  const pctEl = root.querySelector(".atlas-splash__pct");

  let raf = 0;
  let destroyed = false;

  const t0 = performance.now();
  let target = 0;
  let current = 0;
  let finishing = false;

  function clamp01(v) {
    return Math.max(0, Math.min(1, Number(v) || 0));
  }

  function render() {
    if (destroyed) return;

    
    current += (target - current) * 0.14;
    if (Math.abs(target - current) < 0.0015) current = target;

    root.style.setProperty("--p", String(current));
    pctEl.textContent = `${Math.round(current * 100)}%`;

    raf = requestAnimationFrame(render);
  }

  raf = requestAnimationFrame(render);

  function setProgress(p) {
    target = Math.max(target, clamp01(p));
  }

  async function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  async function finish() {
    if (finishing) return;
    finishing = true;

    setProgress(1);

    
    const elapsed = performance.now() - t0;
    if (elapsed < minShowMs) await sleep(minShowMs - elapsed);

    
    const waitStart = performance.now();
    while (!destroyed && current < 0.995 && performance.now() - waitStart < 1200) {
      await sleep(16);
    }

    
    root.classList.add("atlas-splash--done");

    
    await sleep(620);

    
    root.classList.add("atlas-splash--hide");
    await sleep(fadeOutMs);

    destroy();
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    cancelAnimationFrame(raf);
    root.remove();
  }

  return { setProgress, finish, destroy };
}


export function shouldShowSplash(storageKey = "atlas_splash_shown") {
  try {
    return sessionStorage.getItem(storageKey) !== "1";
  } catch {
    return true;
  }
}