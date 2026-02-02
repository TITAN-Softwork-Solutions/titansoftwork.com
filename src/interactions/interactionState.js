export const interactionState = {
  draggingGlobe: false,
  pauseUntilMs: 0,

  focusActive: false,
  focusId: null,

  bumpIdle(ms = 1200) {
    this.pauseUntilMs = performance.now() + ms;
  },

  allowAutoMotion() {
    const now = performance.now();
    if (this.draggingGlobe) return false;
    if (this.focusActive) return false;
    return now > this.pauseUntilMs;
  }
};