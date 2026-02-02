import { gsap } from "gsap";
import { escapeHtml, escapeAttr } from "../utils/dom.js";

export function createCard({ hud }) {
  const el = document.createElement("div");
  el.className = "atlas-card";
  el.style.opacity = "0";
  el.style.transform = "scale(0.96)";
  hud.appendChild(el);

  
  const PIN_X = 14 + 5; 
  const PIN_Y = 14 + 5;

  function render(breach) {
    const dateLabel = new Date(breach.date + "T00:00:00Z").toISOString().slice(0, 10);

    el.innerHTML = `
      <div class="atlas-card__pin" aria-hidden="true"></div>

      <div class="atlas-card__top">
        <div class="atlas-card__org">${escapeHtml(breach.org)}</div>
        <div class="atlas-card__date">${escapeHtml(dateLabel)}</div>
      </div>

      <div class="atlas-card__title">${escapeHtml(breach.title)}</div>

      <div class="atlas-card__pattern">
        <span class="atlas-card__pattern-dot"></span>
        <span>${escapeHtml(breach.pattern)}</span>
      </div>

      <div class="atlas-card__summary">${escapeHtml(breach.summary)}</div>

      <div class="atlas-card__hint">Drag to a point. Click to expand.</div>

      <div class="atlas-card__actions">
        <a class="atlas-link" href="${escapeAttr(breach.url)}" target="_blank" rel="noreferrer">
          Source <span aria-hidden="true">↗</span>
        </a>
      </div>
    `;

    
    el.onclick = (evt) => {
      
      if (el.dataset.suppressClick === "1") return;
      el.classList.toggle("expanded");
    };
  }

  function show() {
    gsap.to(el, { opacity: 1, duration: 0.35, ease: "power2.out" });
    gsap.to(el, { transform: "scale(1)", duration: 0.35, ease: "power2.out" });
  }

  function pop() {
    gsap.fromTo(
      el,
      { transform: "scale(0.98)" },
      { transform: "scale(1)", duration: 0.22, ease: "power2.out" }
    );
  }

  function positionFromAnchor({ camera, renderer, anchorWorld }) {
    const p = anchorWorld.clone().project(camera);

    const w = renderer.domElement.clientWidth;
    const h = renderer.domElement.clientHeight;

    const x = (p.x * 0.5 + 0.5) * w;
    const y = (-p.y * 0.5 + 0.5) * h;

    
    el.style.left = `${Math.round(x - PIN_X)}px`;
    el.style.top = `${Math.round(y - PIN_Y)}px`;
  }

  return { el, render, show, pop, positionFromAnchor };
}