
export function createAltitudeHud({
  hud,
  stepKm = 20,        
  majorEvery = 100,   
  pxPerStep = 16      
} = {}) {
  const root = document.createElement("div");
  root.className = "atlas-alt";

  root.innerHTML = `
    <div class="atlas-alt__big">0</div>

    <div class="atlas-alt__tape">
      <div class="atlas-alt__line" aria-hidden="true"></div>

      <div class="atlas-alt__scaleAnchor" aria-hidden="true">
        <div class="atlas-alt__scaleInner"></div>
      </div>

      <div class="atlas-alt__bug" aria-hidden="true">
        <div class="atlas-alt__bugBox">0</div>
        <div class="atlas-alt__bugArm"></div>
      </div>
    </div>

    <div class="atlas-alt__footer">
      <span class="atlas-alt__footerTag">ALT</span>
      <span class="atlas-alt__footerUnit">km</span>
    </div>
  `;

  hud.appendChild(root);

  const bigEl = root.querySelector(".atlas-alt__big");
  const bugBoxEl = root.querySelector(".atlas-alt__bugBox");
  const tapeEl = root.querySelector(".atlas-alt__tape");
  const scaleInnerEl = root.querySelector(".atlas-alt__scaleInner");

  let rows = [];
  let half = 0;
  let lastCenterTick = null;

  function format(v) {
    return String(v);
  }

  function clearRows() {
    scaleInnerEl.innerHTML = "";
    rows = [];
  }

  function buildRowsForHalf(newHalf) {
    half = newHalf;

    clearRows();

    for (let i = -half; i <= half; i++) {
      const row = document.createElement("div");
      row.className = "atlas-alt__row";
      row.innerHTML = `
        <div class="atlas-alt__num"></div>
        <div class="atlas-alt__tick atlas-alt__tick--minor"></div>
        <div class="atlas-alt__tick atlas-alt__tick--major"></div>
      `;
      scaleInnerEl.appendChild(row);

      rows.push({
        i,
        el: row,
        numEl: row.querySelector(".atlas-alt__num"),
        minorEl: row.querySelector(".atlas-alt__tick--minor"),
        majorEl: row.querySelector(".atlas-alt__tick--major")
      });
    }

    
    lastCenterTick = null;
  }

  function computeHalfFromTapeHeight() {
    const h = Math.max(1, tapeEl.clientHeight);

    
    
    const stepsToEdge = Math.ceil((h * 0.5) / pxPerStep);

    
    return Math.max(10, stepsToEdge);
  }

  function ensureRowsFitTape() {
    const neededHalf = computeHalfFromTapeHeight();
    if (neededHalf !== half) buildRowsForHalf(neededHalf);
  }

  function rebuild(centerTickValue) {
    for (const r of rows) {
      const v = centerTickValue + r.i * stepKm;

      
      r.el.style.transform = `translate3d(0px, ${r.i * pxPerStep}px, 0px)`;

      const isMajor = (Math.round(v) % majorEvery) === 0;

      r.numEl.textContent = isMajor ? format(v) : "";
      r.majorEl.style.opacity = isMajor ? "1" : "0";
      r.minorEl.style.opacity = isMajor ? "0" : "1";
    }
  }

  
  requestAnimationFrame(() => {
    ensureRowsFitTape();
  });

  
  if (typeof ResizeObserver !== "undefined") {
    const ro = new ResizeObserver(() => {
      ensureRowsFitTape();
    });
    ro.observe(tapeEl);
  } else {
    window.addEventListener("resize", () => ensureRowsFitTape());
  }

  function update({ altitudeKm }) {
    
    ensureRowsFitTape();

    const alt = Math.max(0, altitudeKm || 0);
    const altInt = Math.round(alt);

    bigEl.textContent = format(altInt);
    bugBoxEl.textContent = format(altInt);

    const centerTick = Math.round(alt / stepKm) * stepKm;

    if (centerTick !== lastCenterTick) {
      lastCenterTick = centerTick;
      rebuild(centerTick);
    }

    
    const frac = (alt - centerTick) / stepKm;
    const offsetPx = frac * pxPerStep;

    
    scaleInnerEl.style.transform = `translate3d(0px, ${offsetPx}px, 0px)`;
  }

  return { update };
}