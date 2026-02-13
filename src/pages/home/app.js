import * as THREE from "three";

import { setup } from "../../core/setup.js";
import { attachResize } from "../../core/resize.js";
import { startLoop } from "../../core/loop.js";
import { createAdaptiveQuality } from "../../core/quality.js";

import { loadBreaches } from "../../data/breaches.js";

import { createGlobe } from "../../globe/globe.js";
import { createMarkers } from "../../globe/markers.js";

import { interactionState } from "../../interactions/interactionState.js";
import { createOrbit } from "../../interactions/orbit.js";
import { createFocusController } from "../../interactions/focus.js";

import { createCardLayer } from "../../ui/cardLayer.js";
import { createLinkLayer } from "../../ui/linkLayer.js";

import { computeVisibleMarkers } from "../../utils/visibility.js";

const ORG_REPO_API =
  "https://api.github.com/orgs/TITAN-Softwork-Solutions/repos?per_page=8&sort=updated";

function initNavDropdowns() {
  const menu = document.querySelector('[data-menu="projects"] .site-nav__dropdown');
  if (!menu) return;

  const staticLinks = [...menu.querySelectorAll("a[data-repo]")];
  const existing = new Set(
    staticLinks.map((link) => link.dataset.repo?.toLowerCase()).filter(Boolean)
  );
  const maxTotal = 8;
  const remaining = Math.max(0, maxTotal - existing.size);

  if (!remaining) return;

  fetch(ORG_REPO_API)
    .then((res) => (res.ok ? res.json() : Promise.reject(new Error("GitHub API error"))))
    .then((repos) => {
      let added = 0;
      for (const repo of repos) {
        if (!repo || !repo.name || repo.archived) continue;
        const nameKey = repo.name.toLowerCase();
        if (existing.has(nameKey)) continue;

        const link = document.createElement("a");
        link.textContent = repo.name;
        link.href = repo.html_url;
        link.target = "_blank";
        link.rel = "noreferrer";
        menu.appendChild(link);

        existing.add(nameKey);
        added += 1;
        if (added >= remaining) break;
      }
    })
    .catch(() => {});
}


function initInquiryModal() {
  const modal = document.getElementById("inquiry-modal");
  if (!modal) return;

  const openButtons = [...document.querySelectorAll("[data-inquiry-open]")];
  const closeButtons = [...modal.querySelectorAll("[data-inquiry-close]")];
  const form = modal.querySelector("#inquiry-form");
  const emailInput = modal.querySelector("#inquiry-email");
  const companyInput = modal.querySelector("#inquiry-company");
  const scopeInput = modal.querySelector("#inquiry-scope");

  if (!openButtons.length || !form || !emailInput) return;

  const INQUIRY_EMAIL = "inquire@titansoftwork.com";
  let lastFocused = null;

  function openModal() {
    lastFocused = document.activeElement;
    modal.hidden = false;
    modal.classList.add("is-open");
    document.body.classList.add("modal-open");
    window.setTimeout(() => emailInput.focus(), 0);
  }

  function closeModal() {
    modal.classList.remove("is-open");
    document.body.classList.remove("modal-open");
    modal.hidden = true;
    if (lastFocused && typeof lastFocused.focus === "function") {
      lastFocused.focus();
    }
  }

  function buildMailtoHref() {
    const email = String(emailInput.value || "").trim();
    const company = String(companyInput?.value || "").trim();
    const scope = String(scopeInput?.value || "").trim();

    const subject = company
      ? `Inquiry - ${company}`
      : "Inquiry - TITAN Engagement";
    const bodyLines = [
      `Email: ${email}`,
      company ? `Company: ${company}` : null,
      "",
      "Scope:",
      scope || "(not provided)",
    ].filter(Boolean);

    const body = bodyLines.join("\n");
    return `mailto:${INQUIRY_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  openButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      openModal();
    });
  });

  closeButtons.forEach((button) => {
    button.addEventListener("click", closeModal);
  });

  window.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (modal.hidden) return;
    closeModal();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!emailInput.checkValidity()) {
      emailInput.reportValidity();
      return;
    }
    window.location.href = buildMailtoHref();
    closeModal();
  });
}

async function main() {
  const { scene, camera, renderer, hud } = setup();
  attachResize({ camera, renderer });

  const startNonCritical = () => {
    window.setTimeout(() => {
      initNavDropdowns();
    }, 1200);
  };
  if (document.readyState === "complete") {
    startNonCritical();
  } else {
    window.addEventListener("load", startNonCritical, { once: true });
  }

  const quality = createAdaptiveQuality({ renderer });
  initInquiryModal();

  const heroEl = document.querySelector(".hero");
  const stageEl = document.getElementById("stage");
  const compactQuery = window.matchMedia("(max-width: 900px), (pointer: coarse)");
  const isCompactUI = () => compactQuery.matches;

  const breaches = await loadBreaches();

  const globe = createGlobe({ scene });
  const markers = createMarkers({
    globeGroup: globe.group,
    breaches,
    radius: globe.radius,
  });
  const markerById = new Map(markers.items.map((m) => [m.id, m]));

  const orbit = createOrbit({ camera, renderer, interaction: interactionState });

  const focusController = createFocusController({
    camera,
    controls: orbit.controls,
    globeGroup: globe.group,
    interaction: interactionState,
    globeRadius: globe.radius,
  });

  const linkLayer = createLinkLayer({ hud });

  let globeForeground = false;

  function clearHeroFocusAttrs() {
    if (!heroEl) return;
    delete heroEl.dataset.focus;
    delete heroEl.dataset.cardSide;
  }

  function setGlobeForeground(on) {
    globeForeground = !!(on && !isCompactUI());

    heroEl?.classList.toggle("hero--focus", globeForeground);
    heroEl?.classList.toggle("hero--bg", !globeForeground);
    document.body.classList.toggle("globe-foreground", globeForeground);

    orbit.controls.enabled = globeForeground;

    // Three.js OrbitControls sets `touch-action: none` on the canvas by default, which
    // can block page scrolling on mobile when the hero is fullscreen.
    if (renderer?.domElement) {
      renderer.domElement.style.touchAction = globeForeground ? "none" : "pan-y";
    }

    if (!globeForeground) {
      if (interactionState.focusActive) focusController.clear();
      clearHeroFocusAttrs();
    }
  }

  if (heroEl) {
    heroEl.classList.add("hero--bg");
    heroEl.classList.remove("hero--focus");
  }
  setGlobeForeground(false);

  function syncCompactState() {
    if (isCompactUI()) setGlobeForeground(false);
  }

  if (compactQuery.addEventListener) {
    compactQuery.addEventListener("change", syncCompactState);
  } else {
    compactQuery.addListener(syncCompactState);
  }

  function allowPageWheel(e) {
    if (globeForeground) return;
    e.stopImmediatePropagation();
  }

  function allowPageTouchMove(e) {
    if (globeForeground) return;
    e.stopImmediatePropagation();
  }

  renderer.domElement.addEventListener("wheel", allowPageWheel, {
    capture: true,
    passive: true,
  });
  renderer.domElement.addEventListener("touchmove", allowPageTouchMove, {
    capture: true,
    passive: true,
  });

  function trapWheelScroll(e) {
    if (!globeForeground) return;
    e.preventDefault();
  }

  function trapTouchScroll(e) {
    if (!globeForeground) return;
    e.preventDefault();
  }

  stageEl.addEventListener("wheel", trapWheelScroll, { passive: false, capture: true });
  stageEl.addEventListener("touchmove", trapTouchScroll, { passive: false, capture: true });

  stageEl.addEventListener(
    "pointerdown",
    (e) => {
      if (isCompactUI()) return;
      if (e.target?.closest?.(".atlas-card")) return;

      if (!globeForeground) {
        setGlobeForeground(true);
        e.preventDefault();
        e.stopPropagation();
      }
    },
    { capture: true }
  );

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && globeForeground) setGlobeForeground(false);
  });

  let focusLayout = { globeCorner: "TL", cardSide: "right" };
  let focusPin = null;
  let lastAutoCardIds = new Set();

  const cardLayer = createCardLayer({
    hud,
    onSelect: ({ id }) => {
      if (isCompactUI()) return;
      if (!globeForeground) return;

      if (interactionState.focusActive && interactionState.focusId === id) {
        focusPin = null;
        focusController.clear();
        return;
      }

      const item = markerById.get(id);
      if (!item) return;

      const stageRect = renderer.domElement.getBoundingClientRect();
      const width = renderer.domElement.clientWidth;

      const existing = cardLayer.getCardLayout?.(id, stageRect);

      let side = existing?.side;
      if (!side) {
        const wPos = (item.anchor || item.mesh).getWorldPosition(new THREE.Vector3());
        const p = wPos.clone().project(camera);
        const sx = (p.x * 0.5 + 0.5) * width;
        side = sx >= width * 0.5 ? "right" : "left";
      }

      const globeCorner = side === "right" ? "TL" : "BR";
      focusLayout = { globeCorner, cardSide: side };

      if (existing?.rectLocal) {
        focusPin = { id, x: existing.rectLocal.left, y: existing.rectLocal.top, side };
      } else {
        focusPin = { id, x: null, y: null, side };
      }

      if (heroEl) {
        heroEl.dataset.cardSide = side;
        heroEl.dataset.focus = "1";
      }

      focusController.focus({
        id,
        markerMesh: item.mesh,
        layout: focusLayout,
      });
    },
  });

  stageEl.addEventListener("pointerdown", (e) => {
    if (isCompactUI()) return;
    if (e.target?.closest?.(".atlas-card")) return;
    if (!globeForeground) return;
    if (interactionState.focusActive) {
      focusPin = null;
      focusController.clear();
    }
  });

  interactionState.bumpIdle(800);

  startLoop({
    scene,
    camera,
    renderer,
    orbitControls: orbit.controls,
    interaction: interactionState,
    globeGroup: globe.group,
    onFrame: ({ dt, time, width, height }) => {
      quality.onFrame(dt, { interacting: interactionState.draggingGlobe });
      const stageRect = renderer.domElement.getBoundingClientRect();

      for (const item of markers.items) {
        if (item.spinOuter) {
          item.spinOuter.rotation.y = time * item.spinSpeedOuter;
        }
        if (item.spinInner) {
          item.spinInner.rotation.y = -time * item.spinSpeedInner;
        }
      }

      if (heroEl) {
        if (interactionState.focusActive && interactionState.focusId) {
          heroEl.dataset.focus = "1";
          heroEl.dataset.cardSide = focusLayout.cardSide;
        } else {
          delete heroEl.dataset.focus;
          delete heroEl.dataset.cardSide;
          focusPin = null;
        }
      }

      let visibleItems;

      if (interactionState.focusActive && interactionState.focusId) {
        const item = markerById.get(interactionState.focusId);
        if (!item) return;

        const wPos = item.mesh.getWorldPosition(new THREE.Vector3());
        const proj = wPos.clone().project(camera);

        const sx = (proj.x * 0.5 + 0.5) * width;
        const sy = (-proj.y * 0.5 + 0.5) * height;

        visibleItems = [
          {
            id: item.id,
            breach: item.breach,
            anchorScreen: { x: sx, y: sy },
            preferredSide: focusLayout.cardSide,
            alpha: 1,
          },
        ];
      } else {
        visibleItems = computeVisibleMarkers({
          markers: markers.items,
          camera,
          globeCenterWorld: globe.centerWorld,
          width,
          height,
        });

        if (!globeForeground) {
          visibleItems = visibleItems.map((it) => ({
            ...it,
            alpha: (it.alpha ?? 1) * 0.55,
          }));
        }

        // Small laptop screens get overwhelmed: cap the number of cards and keep the set stable.
        const maxCards =
          width <= 1100 || height <= 680
            ? 2
            : width <= 1300 || height <= 740
              ? 3
              : width <= 1500 || height <= 820
                ? 4
                : 6;

        if (visibleItems.length > maxCards) {
          const bonus = 0.10; // mild stickiness to prevent cards swapping every frame

          visibleItems = visibleItems
            .map((it) => ({
              it,
              score: (it.alpha ?? 1) + (lastAutoCardIds.has(it.id) ? bonus : 0),
            }))
            .sort((a, b) => {
              const ds = (b.score ?? 0) - (a.score ?? 0);
              if (ds) return ds;
              const da = (b.it.alpha ?? 1) - (a.it.alpha ?? 1);
              if (da) return da;
              return (a.it.id ?? 0) - (b.it.id ?? 0);
            })
            .slice(0, maxCards)
            .map((x) => x.it);
        }

        lastAutoCardIds = new Set(visibleItems.map((it) => it.id));
      }

      const laidOut = cardLayer.update({
        visibleItems,
        viewport: { width, height },
        stageRect,
        focus: {
          active: interactionState.focusActive,
          id: interactionState.focusId,
          globeCorner: focusLayout.globeCorner,
          cardSide: focusLayout.cardSide,
          pin:
            focusPin && focusPin.id === interactionState.focusId
              ? { x: focusPin.x, y: focusPin.y, side: focusPin.side }
              : null,
        },
        time,
      });

      linkLayer.update({
        viewport: { width, height },
        time,
        connections: laidOut.map((it) => ({
          id: it.id,
          from: it.anchorScreen,
          to: it.backScreen,
          alpha: it.alpha,
        })),
      });
    },
  });
}

main();
