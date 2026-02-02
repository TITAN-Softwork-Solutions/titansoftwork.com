

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function formatNumber(value, decimals) {
  const fixed = value.toFixed(decimals);
  const parts = fixed.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

function setText(el, { value, decimals, prefix, suffix }) {
  el.textContent = `${prefix}${formatNumber(value, decimals)}${suffix}`;
}

function animateCount(el, { from, to, ms, decimals, prefix, suffix }) {
  const t0 = performance.now();

  function frame(t) {
    const p = clamp((t - t0) / ms, 0, 1);
    const eased = 1 - Math.pow(1 - p, 3); 
    const v = from + (to - from) * eased;
    setText(el, { value: v, decimals, prefix, suffix });
    if (p < 1) requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

function readStatSpec(statEl) {
  const to = Number(statEl.getAttribute("data-count") || "0");
  const decimals = Number(statEl.getAttribute("data-decimals") || "0");
  const prefix = statEl.getAttribute("data-prefix") || "";
  const suffix = statEl.getAttribute("data-suffix") || "";
  return { to, decimals, prefix, suffix };
}


function extractUsdCost(b) {
  if (!b || typeof b !== "object") return null;

  
  const directKeys = [
    "costUsd", "costUSD", "cost_usd", "usdCost",
    "lossUsd", "lossUSD", "loss_usd", "usdLoss",
    "financialImpactUsd", "financialImpactUSD",
    "impactUsd", "impactUSD",
    "estimatedCostUsd", "estimatedCostUSD",
    "estimatedLossUsd", "estimatedLossUSD",
    "totalCostUsd", "totalCostUSD"
  ];

  for (const k of directKeys) {
    if (typeof b[k] === "number" && Number.isFinite(b[k])) return b[k];
    if (typeof b[k] === "string") {
      const n = Number(String(b[k]).replace(/[,$\s]/g, ""));
      if (Number.isFinite(n)) return n;
    }
  }

  
  for (const [k, v] of Object.entries(b)) {
    if (typeof v !== "number" || !Number.isFinite(v)) continue;
    const kk = k.toLowerCase();
    if (kk.includes("usd") && (kk.includes("cost") || kk.includes("loss") || kk.includes("impact") || kk.includes("damage"))) {
      return v;
    }
  }

  return null;
}

function extractTitle(b) {
  if (!b || typeof b !== "object") return "Unknown";
  const keys = ["name", "title", "org", "organization", "company", "victim", "entity", "label"];
  for (const k of keys) {
    if (typeof b[k] === "string" && b[k].trim()) return b[k].trim();
  }
  
  if (typeof b.id === "string" && b.id.trim()) return b.id.trim();
  if (typeof b.id === "number" && Number.isFinite(b.id)) return String(b.id);
  return "Unknown";
}

function extractYear(b) {
  if (!b || typeof b !== "object") return null;

  const keys = ["year", "date", "when", "occurred", "timestamp"];
  for (const k of keys) {
    const v = b[k];
    if (typeof v === "number" && v > 1970 && v < 2100) return v;
    if (typeof v === "string" && v) {
      const m = v.match(/\b(19|20)\d{2}\b/);
      if (m) return Number(m[0]);
    }
  }
  return null;
}

function formatUsdCompact(n) {
  if (!Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${Math.round(n / 1e3)}K`;
  return `$${Math.round(n)}`;
}

function populateExpensiveList({ breaches }) {
  const list = document.querySelector('.shockMiniList[data-role="expensive"]');
  if (!list) return;

  const topN = Number(list.getAttribute("data-top") || "6");

  list.innerHTML = "";

  if (!Array.isArray(breaches) || breaches.length === 0) {
    const li = document.createElement("li");
    li.className = "shockMiniList--empty";
    li.textContent = "No breach dataset loaded.";
    list.appendChild(li);
    return;
  }

  const rows = [];
  for (const b of breaches) {
    const usd = extractUsdCost(b);
    if (!Number.isFinite(usd)) continue;
    rows.push({
      title: extractTitle(b),
      year: extractYear(b),
      usd
    });
  }

  if (rows.length === 0) {
    const li = document.createElement("li");
    li.className = "shockMiniList--empty";
    li.textContent = "No cost fields found in breach objects. Add e.g. costUsd/lossUsd to your dataset to render this list.";
    list.appendChild(li);
    return;
  }

  rows.sort((a, b) => b.usd - a.usd);

  const slice = rows.slice(0, topN);

  for (const r of slice) {
    const li = document.createElement("li");

    const name = document.createElement("span");
    name.className = "shockMiniList__name";
    name.title = r.title;
    name.textContent = r.year ? `${r.title} (${r.year})` : r.title;

    const val = document.createElement("span");
    val.className = "shockMiniList__val";
    val.textContent = formatUsdCompact(r.usd);

    li.appendChild(name);
    li.appendChild(val);
    list.appendChild(li);
  }
}


function installTiltPhysics() {
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  if (reduceMotion) return;

  const cards = [...document.querySelectorAll('.shockStat[data-tilt="1"]')];
  if (!cards.length) return;

  for (const card of cards) {
    let active = false;

    
    let rx = 0, ry = 0, tz = 0;
    let gx = 50, gy = 12;

    
    let trx = 0, tryy = 0, ttz = 0;
    let tgx = 50, tgy = 12;

    
    let vrx = 0, vry = 0, vtz = 0;
    let vgx = 0, vgy = 0;

    let raf = 0;

    const MAX_RX = 11;   
    const MAX_RY = 14;   
    const MAX_TZ = 18;   

    
    const K = 0.18;      
    const D = 0.72;      

    function apply() {
      card.style.setProperty("--rx", rx.toFixed(3));
      card.style.setProperty("--ry", ry.toFixed(3));
      card.style.setProperty("--tz", tz.toFixed(3));
      card.style.setProperty("--gx", gx.toFixed(3));
      card.style.setProperty("--gy", gy.toFixed(3));
      card.style.setProperty("--h", active ? "1" : "0");
    }

    function step() {
      
      vrx = (vrx + (trx - rx) * K) * D; rx += vrx;
      vry = (vry + (tryy - ry) * K) * D; ry += vry;
      vtz = (vtz + (ttz - tz) * K) * D; tz += vtz;

      vgx = (vgx + (tgx - gx) * (K * 0.7)) * D; gx += vgx;
      vgy = (vgy + (tgy - gy) * (K * 0.7)) * D; gy += vgy;

      apply();

      const still =
        Math.abs(trx - rx) + Math.abs(tryy - ry) + Math.abs(ttz - tz) +
        Math.abs(tgx - gx) + Math.abs(tgy - gy);

      if (still < 0.02 && !active) {
        cancelAnimationFrame(raf);
        raf = 0;
        return;
      }

      raf = requestAnimationFrame(step);
    }

    function ensureRAF() {
      if (!raf) raf = requestAnimationFrame(step);
    }

    function setFromPointer(clientX, clientY) {
      const r = card.getBoundingClientRect();
      const px = clamp((clientX - r.left) / r.width, 0, 1);
      const py = clamp((clientY - r.top) / r.height, 0, 1);

      
      const dx = (px - 0.5);
      const dy = (py - 0.20); 

      trx = clamp(-dy * MAX_RX, -MAX_RX, MAX_RX);
      tryy = clamp(dx * MAX_RY, -MAX_RY, MAX_RY);
      ttz = MAX_TZ;

      tgx = px * 100;
      tgy = py * 100;
    }

    function enter(e) {
      active = true;
      card.style.willChange = "transform";
      if (e?.clientX != null) setFromPointer(e.clientX, e.clientY);
      else {
        trx = 0; tryy = 0; ttz = MAX_TZ;
        tgx = 50; tgy = 12;
      }
      ensureRAF();
    }

    function move(e) {
      if (!active) return;
      setFromPointer(e.clientX, e.clientY);
      ensureRAF();
    }

    function leave() {
      active = false;
      trx = 0; tryy = 0; ttz = 0;
      tgx = 50; tgy = 12;
      ensureRAF();

      
      window.setTimeout(() => {
        if (!active) card.style.willChange = "";
      }, 260);
    }

    card.addEventListener("pointerenter", enter);
    card.addEventListener("pointermove", move);
    card.addEventListener("pointerleave", leave);

    
    card.addEventListener("focus", () => {
      active = true;
      trx = 3; tryy = 0; ttz = MAX_TZ * 0.8;
      tgx = 50; tgy = 18;
      ensureRAF();
    });
    card.addEventListener("blur", leave);

    
    apply();
  }
}

export function initShockSection({ breaches } = {}) {
  const grid = document.querySelector(".shockStats");
  if (!grid) return;

  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

  function runOnce() {
    
    const stats = [...grid.querySelectorAll(".shockStat")];
    for (const stat of stats) {
      if (stat.dataset.animated === "1") continue;

      const num = stat.querySelector(".shockStat__num");
      if (!num) continue;

      const { to, decimals, prefix, suffix } = readStatSpec(stat);

      stat.dataset.animated = "1";

      if (reduceMotion) {
        setText(num, { value: to, decimals, prefix, suffix });
        continue;
      }

      animateCount(num, { from: 0, to, ms: 980, decimals, prefix, suffix });
    }

    
    populateExpensiveList({ breaches });

    
    installTiltPhysics();
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        runOnce();
        io.disconnect();
        break;
      }
    },
    { threshold: 0.22 }
  );

  io.observe(grid);
}