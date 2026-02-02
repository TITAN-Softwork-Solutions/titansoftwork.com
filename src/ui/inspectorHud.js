import { escapeHtml, escapeAttr } from "../utils/dom.js";

function formatDate(dateStr) {
  if (!dateStr) return "";
  return String(dateStr).slice(0, 10);
}

export function createInspectorHud({ hud, breaches, onSelect }) {
  const el = document.createElement("div");
  el.className = "atlas-inspector";
  el.innerHTML = `
    <div class="atlas-inspector__bar">
      <div class="atlas-inspector__inview" data-inview>IN VIEW 0 / 0</div>
    </div>
    <div class="atlas-inspector__list" data-list></div>
  `;
  hud.appendChild(el);

  
  el.addEventListener(
    "pointerdown",
    (e) => {
      e.stopPropagation();
    },
    { capture: true }
  );
  el.addEventListener(
    "click",
    (e) => {
      e.stopPropagation();
    },
    { capture: true }
  );

  const inViewEl = el.querySelector("[data-inview]");
  const listEl = el.querySelector("[data-list]");

  const total = breaches.length;
  const nodeById = new Map();

  
  for (const b of breaches) {
    const id = String(b.id);

    const row = document.createElement("button");
    row.type = "button";
    row.className = "atlas-inspector__item";
    row.dataset.id = id;

    row.innerHTML = `
      <div class="atlas-inspector__rowTop">
        <div class="atlas-inspector__org">${escapeHtml(b.org || "Unknown")}</div>
        <div class="atlas-inspector__date">${escapeHtml(formatDate(b.date))}</div>
      </div>
      <div class="atlas-inspector__title">${escapeHtml(b.title || "Untitled")}</div>
    `;

    row.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      onSelect?.({ id });
    });

    listEl.appendChild(row);
    nodeById.set(id, row);
  }

  function update({ inViewIds, focusActive, focusId }) {
    const inViewCount = inViewIds?.size ?? 0;
    inViewEl.textContent = `IN VIEW ${inViewCount} / ${total}`;

    
    el.classList.toggle("is-hidden", !!(focusActive && focusId));

    
    for (const [id, node] of nodeById.entries()) {
      const inView = inViewIds?.has?.(id) ?? false;
      node.classList.toggle("is-inview", inView);

      const focused = !!(focusActive && focusId && String(focusId) === id);
      node.classList.toggle("is-focused", focused);
    }
  }

  return { el, update };
}