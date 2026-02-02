
export function createForegroundMode({
  heroEl,
  stageEl,
  exitBtn,
  controls,
  focusController,
  interaction
}) {
  let globeForeground = false;

  function clearHeroFocusAttrs() {
    if (!heroEl) return;
    delete heroEl.dataset.focus;
    delete heroEl.dataset.cardSide;
  }

  function set(on) {
    globeForeground = !!on;

    
    document.body.classList.toggle("globe-foreground", globeForeground);

    heroEl?.classList.toggle("hero--focus", globeForeground);
    heroEl?.classList.toggle("hero--bg", !globeForeground);

    if (controls) controls.enabled = globeForeground;

    if (!globeForeground) {
      
      if (interaction?.focusActive) focusController?.clear?.();
      clearHeroFocusAttrs();
    }
  }

  function get() {
    return globeForeground;
  }

  function trapWheelScroll(e) {
    if (!globeForeground) return;
    e.preventDefault();
  }

  function trapTouchScroll(e) {
    if (!globeForeground) return;
    e.preventDefault();
  }

  function onStagePointerDownCapture(e) {
    
    if (e.target?.closest?.(".atlas-card")) return;

    
    if (!globeForeground) {
      set(true);
      e.preventDefault();
      e.stopPropagation();
    }
  }

  function onExitClick(e) {
    e.preventDefault();
    e.stopPropagation();
    set(false);
  }

  function onKeyDown(e) {
    if (e.key === "Escape" && globeForeground) set(false);
  }

  stageEl.addEventListener("wheel", trapWheelScroll, { passive: false, capture: true });
  stageEl.addEventListener("touchmove", trapTouchScroll, { passive: false, capture: true });
  stageEl.addEventListener("pointerdown", onStagePointerDownCapture, { capture: true });

  exitBtn?.addEventListener("click", onExitClick);
  window.addEventListener("keydown", onKeyDown);

  
  if (heroEl) {
    heroEl.classList.add("hero--bg");
    heroEl.classList.remove("hero--focus");
  }
  set(false);

  function destroy() {
    stageEl.removeEventListener("wheel", trapWheelScroll, { capture: true });
    stageEl.removeEventListener("touchmove", trapTouchScroll, { capture: true });
    stageEl.removeEventListener("pointerdown", onStagePointerDownCapture, { capture: true });

    exitBtn?.removeEventListener("click", onExitClick);
    window.removeEventListener("keydown", onKeyDown);
  }

  return { get, set, destroy };
}