import { gsap } from "gsap";
import { escapeHtml } from "../utils/dom.js";
import { layoutCards } from "../utils/layout.js";

export function createCardLayer({ hud, onSelect, onOpen }) {
  const layer = document.createElement("div");
  layer.className = "atlas-cards";
  hud.appendChild(layer);

  const cards = new Map();

  function measure(el) {
    const r = el.getBoundingClientRect();
    return { w: r.width || 360, h: r.height || 180 };
  }

  function makeCard(breach, id) {
    const el = document.createElement("div");
    el.className = "atlas-card";
    el.dataset.id = String(id);

    el.innerHTML = `
      <div class="atlas-card__pin" aria-hidden="true"></div>

      <div class="atlas-card__top">
        <div class="atlas-card__org">${escapeHtml(breach.org)}</div>
        <div class="atlas-card__date">${escapeHtml(breach.date)}</div>
      </div>

      <div class="atlas-card__title">${escapeHtml(breach.title)}</div>

      <div class="atlas-card__pattern">
        <span class="atlas-card__pattern-dot"></span>
        <span>${escapeHtml(breach.pattern)}</span>
      </div>

      <div class="atlas-card__snippet">${escapeHtml(breach.summary)}</div>

      <div class="atlas-card__hint">Click to focus.</div>
    `;

    el.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      onSelect?.({ id });
      onOpen?.(breach);
    });

    el.style.visibility = "hidden";
    layer.appendChild(el);

    const { w, h } = measure(el);

    gsap.set(el, { x: -9999, y: -9999, opacity: 0, scale: 0.98 });

    return {
      el,
      w,
      h,
      isNew: true,
      linkReady: false,
      side: null,
      alpha: 1
    };
  }

  function removeCard(id) {
    const c = cards.get(id);
    if (!c) return;

    cards.delete(id);

    gsap.to(c.el, {
      opacity: 0,
      scale: 0.98,
      duration: 0.18,
      ease: "power2.in",
      onComplete: () => c.el.remove()
    });
  }

  function pickStickySide(card, anchorX, centerX, switchBandPx) {
    const desired = anchorX >= centerX ? "right" : "left";

    if (!card.side) {
      card.side = desired;
      return card.side;
    }

    if (card.side === "left" && anchorX > centerX + switchBandPx) card.side = "right";
    if (card.side === "right" && anchorX < centerX - switchBandPx) card.side = "left";

    return card.side;
  }

  function getCardLayout(id, stageRect) {
    const c = cards.get(id);
    if (!c || !c.el || !stageRect) return null;

    const cr = c.el.getBoundingClientRect();
    if (!cr.width || !cr.height) return null;

    return {
      id,
      side: c.side,
      rectLocal: {
        left: cr.left - stageRect.left,
        top: cr.top - stageRect.top,
        width: cr.width,
        height: cr.height
      }
    };
  }

  function update({ visibleItems, viewport, stageRect, focus }) {
    const visibleIds = new Set(visibleItems.map((v) => v.id));

    for (const id of cards.keys()) {
      if (!visibleIds.has(id)) removeCard(id);
    }

    for (const v of visibleItems) {
      if (!cards.has(v.id)) {
        cards.set(v.id, makeCard(v.breach, v.id));
      }
    }

    const centerX = viewport.width * 0.5;
    const switchBandPx = Math.min(110, Math.max(70, viewport.width * 0.06));

    const inputs = visibleItems.map((v) => {
      const c = cards.get(v.id);
      const isFocused = !!(focus?.active && focus?.id === v.id);

      const side = isFocused
        ? (focus?.cardSide || v.preferredSide || c.side || "right")
        : pickStickySide(c, v.anchorScreen.x, centerX, switchBandPx);

      c.side = side;
      c.alpha = v.alpha;

      return {
        id: v.id,
        anchorScreen: v.anchorScreen,
        preferredSide: side,
        w: c?.w ?? 360,
        h: c?.h ?? 180,
        alpha: v.alpha
      };
    });

    const placed = layoutCards({ items: inputs, viewport });

    const output = [];

    for (const p of placed) {
      const c = cards.get(p.id);
      if (!c) continue;

      const isFocused = !!(focus?.active && focus?.id === p.id);

      c.el.classList.toggle("atlas-card--focused", isFocused);

      if (isFocused && focus?.pin && Number.isFinite(focus.pin.x) && Number.isFinite(focus.pin.y)) {
        p.x = focus.pin.x;
        p.y = focus.pin.y;
        p.preferredSide = focus.pin.side || p.preferredSide;
        c.side = p.preferredSide;
      } else {
        c.side = p.preferredSide;
      }

      const targetScale = isFocused ? 1.04 : 1.0;

      if (c.isNew) {
        c.el.style.visibility = "visible";

        gsap.set(c.el, { x: p.x, y: p.y });

        gsap.to(c.el, {
          opacity: c.alpha,
          scale: targetScale,
          duration: 0.22,
          ease: "power2.out"
        });

        c.isNew = false;
        c.linkReady = false;

        requestAnimationFrame(() => {
          c.linkReady = true;
        });
      } else {
        const curX = Number(gsap.getProperty(c.el, "x")) || 0;
        const curY = Number(gsap.getProperty(c.el, "y")) || 0;
        const dist = Math.hypot(curX - p.x, curY - p.y);
        const dur = dist > 500 ? 0.45 : 0.26;

        gsap.to(c.el, {
          x: p.x,
          y: p.y,
          duration: dur,
          ease: "power2.out",
          overwrite: true
        });

        gsap.to(c.el, {
          opacity: c.alpha,
          duration: 0.18,
          ease: "power2.out",
          overwrite: "auto"
        });

        gsap.to(c.el, {
          scale: targetScale,
          duration: 0.22,
          ease: "power2.out",
          overwrite: "auto"
        });
      }

      const cr = c.el.getBoundingClientRect();
      const midY = (cr.top - stageRect.top) + cr.height * 0.5;

      const inset = 2;
      const leftX = (cr.left - stageRect.left) + inset;
      const rightX = (cr.left - stageRect.left) + cr.width - inset;

      const ax = p.anchorScreen.x;
      const ay = p.anchorScreen.y;

      const dxL = ax - leftX;
      const dyL = ay - midY;
      const d2L = dxL * dxL + dyL * dyL;

      const dxR = ax - rightX;
      const dyR = ay - midY;
      const d2R = dxR * dxR + dyR * dyR;

      const backX = d2L <= d2R ? leftX : rightX;

      if (c.linkReady) {
        output.push({
          id: p.id,
          anchorScreen: p.anchorScreen,
          backScreen: { x: backX, y: midY },
          alpha: c.alpha
        });
      }
    }

    return output;
  }

  return { update, getCardLayout };
}
