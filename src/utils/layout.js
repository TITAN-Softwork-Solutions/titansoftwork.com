

export function layoutCards({ items, viewport, avoid }) {
  const GAP = 12;

  const PAD = Number.isFinite(avoid?.padding) ? avoid.padding : 22;
  const circle = avoid?.globeCircle;

  const safe = avoid?.safeInsets || {};
  const safeL = safe.left ?? 16;
  const safeR = safe.right ?? 16;
  const safeT = safe.top ?? 14;
  const safeB = safe.bottom ?? 14;

  const COL_T = 0.5; 
  const SWITCH_PENALTY = 90; 
  const BALANCE_PENALTY = 70; 
  const CROSS_PENALTY = 900; 

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function segmentIntersectsCircle(ax, ay, bx, by, cx, cy, r) {
    
    const abx = bx - ax;
    const aby = by - ay;
    const acx = cx - ax;
    const acy = cy - ay;

    const abLen2 = abx * abx + aby * aby;
    if (abLen2 < 1e-6) return Math.hypot(acx, acy) <= r;

    let t = (acx * abx + acy * aby) / abLen2;
    t = Math.max(0, Math.min(1, t));

    const px = ax + t * abx;
    const py = ay + t * aby;

    return Math.hypot(px - cx, py - cy) <= r;
  }

  function sideBounds(side, w) {
    
    
    const minX = safeL;
    const maxX = viewport.width - safeR - w;

    if (!circle || !Number.isFinite(circle.cx) || !Number.isFinite(circle.r)) {
      
      const mid = (safeL + (viewport.width - safeR)) * 0.5;
      if (side === "left") return { min: minX, max: Math.min(maxX, mid - w), ok: minX <= Math.min(maxX, mid - w) };
      return { min: Math.max(minX, mid), max: maxX, ok: Math.max(minX, mid) <= maxX };
    }

    const leftLimit = circle.cx - circle.r - PAD;
    const rightLimit = circle.cx + circle.r + PAD;

    if (side === "left") {
      const mx = Math.min(maxX, leftLimit - w);
      return { min: minX, max: mx, ok: minX <= mx };
    }

    const mn = Math.max(minX, rightLimit);
    return { min: mn, max: maxX, ok: mn <= maxX };
  }

  function columnX(side, w) {
    const b = sideBounds(side, w);
    if (!b.ok) return { x: clamp(side === "left" ? safeL : viewport.width - safeR - w, safeL, viewport.width - safeR - w), ok: false };
    const x = b.min + (b.max - b.min) * COL_T;
    return { x, ok: true };
  }

  function candidateCost(it, side, x, counts) {
    const ax = it.anchorScreen.x;
    const ay = it.anchorScreen.y;
    const w = it.w || 360;

    
    const backX = side === "right" ? (x + 2) : (x + w - 2);
    const backY = ay;

    let cost = Math.hypot(backX - ax, backY - ay); 

    
    if (circle && Number.isFinite(circle.cx) && Number.isFinite(circle.r)) {
      const r = circle.r + PAD * 0.85;
      const crosses = segmentIntersectsCircle(ax, ay, backX, backY, circle.cx, circle.cy, r);
      if (crosses) cost += CROSS_PENALTY;
    }

    
    if (it.prevSide && it.prevSide !== side) cost += SWITCH_PENALTY;

    
    cost += (counts[side] || 0) * BALANCE_PENALTY;

    
    if (it.hintSide && it.hintSide !== side) cost += 18;

    return cost;
  }

  
  const ordered = [...items].sort((a, b) => a.anchorScreen.y - b.anchorScreen.y);

  const assignedLeft = [];
  const assignedRight = [];
  const counts = { left: 0, right: 0 };

  
  for (const it of ordered) {
    const w = it.w || 360;

    
    if (it.lockSide === "left" || it.lockSide === "right") {
      const side = it.lockSide;
      (side === "left" ? assignedLeft : assignedRight).push({ ...it, side });
      counts[side] += 1;
      continue;
    }

    const leftPos = columnX("left", w);
    const rightPos = columnX("right", w);

    
    if (leftPos.ok && !rightPos.ok) {
      assignedLeft.push({ ...it, side: "left" });
      counts.left += 1;
      continue;
    }
    if (!leftPos.ok && rightPos.ok) {
      assignedRight.push({ ...it, side: "right" });
      counts.right += 1;
      continue;
    }

    
    const lc = candidateCost(it, "left", leftPos.x, counts);
    const rc = candidateCost(it, "right", rightPos.x, counts);

    if (lc <= rc) {
      assignedLeft.push({ ...it, side: "left" });
      counts.left += 1;
    } else {
      assignedRight.push({ ...it, side: "right" });
      counts.right += 1;
    }
  }

  function stack(sideItems) {
    const placed = [];
    const limitBottom = viewport.height - safeB;

    let cursorY = safeT;

    for (const it of sideItems) {
      const w = it.w || 360;
      const h = it.h || 180;

      const { x } = columnX(it.side, w);

      let y = clamp(it.anchorScreen.y - h * 0.5, safeT, limitBottom - h);
      y = Math.max(y, cursorY);

      placed.push({
        id: it.id,
        x: Math.round(clamp(x, safeL, viewport.width - safeR - w)),
        y: Math.round(y),
        side: it.side,
        anchorScreen: it.anchorScreen,
        alpha: it.alpha
      });

      cursorY = y + h + GAP;
    }

    
    if (placed.length) {
      const last = placed[placed.length - 1];
      const lastH = sideItems[sideItems.length - 1].h || 180;
      const overflow = (last.y + lastH) - limitBottom;

      if (overflow > 0) {
        for (const p of placed) p.y = Math.round(p.y - overflow);

        
        if (placed[0].y < safeT) {
          placed[0].y = safeT;
          for (let i = 1; i < placed.length; i++) {
            const prev = placed[i - 1];
            const prevH = sideItems[i - 1].h || 180;
            placed[i].y = Math.max(placed[i].y, prev.y + prevH + GAP);
          }
        }
      }
    }

    return placed;
  }

  const placedLeft = stack(assignedLeft);
  const placedRight = stack(assignedRight);

  return [...placedLeft, ...placedRight];
}