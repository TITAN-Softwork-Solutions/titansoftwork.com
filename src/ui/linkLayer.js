
export function createLinkLayer({ hud }) {
  const canvas = document.createElement("canvas");
  canvas.className = "atlas-links";
  hud.appendChild(canvas);

  const ctx = canvas.getContext("2d", { alpha: true });

  let lastW = 0;
  let lastH = 0;
  let lastDpr = 0;

  function ensureSize(viewport) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    if (viewport.width !== lastW || viewport.height !== lastH || dpr !== lastDpr) {
      lastW = viewport.width;
      lastH = viewport.height;
      lastDpr = dpr;

      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      canvas.width = Math.round(viewport.width * dpr);
      canvas.height = Math.round(viewport.height * dpr);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    } else {
      ctx.setTransform(lastDpr, 0, 0, lastDpr, 0, 0);
    }
  }

  function hash01(str) {
    
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return ((h >>> 0) % 10000) / 10000;
  }

  function quadPoint(ax, ay, cx, cy, bx, by, t) {
    const it = 1 - t;
    const x = it * it * ax + 2 * it * t * cx + t * t * bx;
    const y = it * it * ay + 2 * it * t * cy + t * t * by;
    return { x, y };
  }

  function drawCurve(ax, ay, cx, cy, bx, by) {
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.quadraticCurveTo(cx, cy, bx, by);
    ctx.stroke();
  }

  function drawPulseSegment(ax, ay, cx, cy, bx, by, t0, t1) {
    const steps = 18;
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const t = t0 + ((t1 - t0) * i) / steps;
      const p = quadPoint(ax, ay, cx, cy, bx, by, t);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }

  
  function update({ connections, viewport, time }) {
    ensureSize(viewport);

    ctx.clearRect(0, 0, viewport.width, viewport.height);

    for (const c of connections) {
      const sx = c.from.x;
      const sy = c.from.y;
      const ex = c.to.x;
      const ey = c.to.y;

      const alpha = Math.max(0, Math.min(1, c.alpha ?? 1));

      const mx = (sx + ex) * 0.5;
      const my = (sy + ey) * 0.5;

      const dx = ex - sx;
      const dy = ey - sy;
      const len = Math.max(1, Math.hypot(dx, dy));

      const px = -dy / len;
      const py = dx / len;

      const bow = Math.min(140, len * 0.22);
      const cx = mx + px * bow;
      const cy = my + py * bow;

      
      ctx.setLineDash([]);
      ctx.lineWidth = 1.2;
      ctx.globalAlpha = 0.55 * alpha;
      ctx.strokeStyle = "rgba(245,245,245,1)";
      drawCurve(sx, sy, cx, cy, ex, ey);

      
      ctx.setLineDash([10, 14]);
      ctx.lineDashOffset = -(time * 38 + hash01(c.id) * 60);
      ctx.lineWidth = 1.0;
      ctx.globalAlpha = 0.18 * alpha;
      ctx.strokeStyle = "rgba(245,245,245,1)";
      drawCurve(sx, sy, cx, cy, ex, ey);

      
      const phase = (time * 0.22 + hash01(c.id)) % 1; 
      const pulseLen = 0.16; 
      let t0 = phase - pulseLen * 0.5;
      let t1 = phase + pulseLen * 0.5;

      
      if (t0 < 0) {
        
        ctx.setLineDash([]);
        ctx.lineWidth = 2.6;
        ctx.globalAlpha = 0.22 * alpha;
        ctx.strokeStyle = "rgba(245,245,245,1)";
        drawPulseSegment(sx, sy, cx, cy, ex, ey, 0, t1);
        drawPulseSegment(sx, sy, cx, cy, ex, ey, 1 + t0, 1);

        ctx.lineWidth = 1.6;
        ctx.globalAlpha = 0.42 * alpha;
        drawPulseSegment(sx, sy, cx, cy, ex, ey, 0, t1);
        drawPulseSegment(sx, sy, cx, cy, ex, ey, 1 + t0, 1);
      } else if (t1 > 1) {
        ctx.setLineDash([]);
        ctx.lineWidth = 2.6;
        ctx.globalAlpha = 0.22 * alpha;
        ctx.strokeStyle = "rgba(245,245,245,1)";
        drawPulseSegment(sx, sy, cx, cy, ex, ey, t0, 1);
        drawPulseSegment(sx, sy, cx, cy, ex, ey, 0, t1 - 1);

        ctx.lineWidth = 1.6;
        ctx.globalAlpha = 0.42 * alpha;
        drawPulseSegment(sx, sy, cx, cy, ex, ey, t0, 1);
        drawPulseSegment(sx, sy, cx, cy, ex, ey, 0, t1 - 1);
      } else {
        ctx.setLineDash([]);
        ctx.lineWidth = 2.6;
        ctx.globalAlpha = 0.22 * alpha;
        ctx.strokeStyle = "rgba(245,245,245,1)";
        drawPulseSegment(sx, sy, cx, cy, ex, ey, t0, t1);

        ctx.lineWidth = 1.6;
        ctx.globalAlpha = 0.42 * alpha;
        drawPulseSegment(sx, sy, cx, cy, ex, ey, t0, t1);
      }

      ctx.globalAlpha = 1;
      ctx.setLineDash([]);
    }
  }

  return { update };
}
