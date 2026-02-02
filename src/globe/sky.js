import * as THREE from "three";

export function createSky({ scene, globeGroup, globeRadius }) {
  const group = new THREE.Group();
  group.name = "atlas-sky";
  scene.add(group);

  const rSky = globeRadius * 220;        
  const sunDist = rSky * 0.72;
  const moonDist = rSky * 0.68;

  const stars = makeStars({ radius: rSky, count: 3600, size: 1.25 });
  group.add(stars);

  const sun = makeDiscSprite({ sizeWorld: globeRadius * 10.0, kind: "sun" });
  sun.renderOrder = -50;
  group.add(sun);

  const moon = makeDiscSprite({ sizeWorld: globeRadius * 7.8, kind: "moon" });
  moon.renderOrder = -49;
  group.add(moon);

  const sunLight = new THREE.DirectionalLight(0xffffff, 1.05);
  sunLight.name = "atlas-sun-light";
  scene.add(sunLight);
  scene.add(sunLight.target);
  sunLight.target.position.copy(globeGroup.position);

  const state = {
    sunDir: new THREE.Vector3(0.65, 0.20, 0.73).normalize(),
    moonDir: new THREE.Vector3(-0.55, 0.08, 0.83).normalize()
  };

  function applyPositions(sunDir, moonDir) {
    const center = globeGroup.position;

    sun.position.copy(center).addScaledVector(sunDir, sunDist);
    moon.position.copy(center).addScaledVector(moonDir, moonDist);

    sunLight.position.copy(center).addScaledVector(sunDir, sunDist);
    sunLight.target.position.copy(center);
  }

  function setDirections({ sunDir, moonDir }) {
    if (sunDir) state.sunDir.copy(sunDir).normalize();
    if (moonDir) state.moonDir.copy(moonDir).normalize();
    applyPositions(state.sunDir, state.moonDir);
  }

  function setTime(date = new Date()) {
    
    const utcH = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
    const dayT = utcH / 24;

    const doy = dayOfYearUTC(date);
    const season = (2 * Math.PI * doy) / 365.25;

    const tilt = THREE.MathUtils.degToRad(23.44);
    const decl = tilt * Math.sin(season);

    const theta = 2 * Math.PI * (dayT - 0.15);

    const horiz = Math.cos(decl);
    const y = Math.sin(decl);
    const x = Math.cos(theta) * horiz;
    const z = Math.sin(theta) * horiz;

    state.sunDir.set(x, y, z).normalize();
    state.moonDir
      .set(Math.cos(theta + 0.9) * horiz, Math.sin(-decl * 0.55), Math.sin(theta + 0.9) * horiz)
      .normalize();

    applyPositions(state.sunDir, state.moonDir);
  }

  function update() {
    
    applyPositions(state.sunDir, state.moonDir);
  }

  
  applyPositions(state.sunDir, state.moonDir);

  return { group, stars, sun, moon, sunLight, setDirections, setTime, update };
}

function makeStars({ radius, count, size }) {
  const geom = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const u = Math.random() * 2 - 1;
    const a = Math.random() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);

    const x = s * Math.cos(a);
    const y = u;
    const z = s * Math.sin(a);

    const r = radius * (0.96 + Math.random() * 0.04);

    positions[i * 3 + 0] = x * r;
    positions[i * 3 + 1] = y * r;
    positions[i * 3 + 2] = z * r;
  }

  geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const mat = new THREE.PointsMaterial({
    color: 0xffffff,
    size,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.55,
    depthWrite: false
  });

  const pts = new THREE.Points(geom, mat);
  pts.name = "atlas-stars";
  pts.renderOrder = -100;
  return pts;
}

function makeDiscSprite({ sizeWorld, kind }) {
  const tex = makeDiscTexture(kind);
  if ("colorSpace" in tex && THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
  if ("encoding" in tex && THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;

  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    opacity: kind === "sun" ? 0.95 : 0.82,
    depthWrite: false,
    depthTest: true
  });

  const spr = new THREE.Sprite(mat);
  spr.name = kind === "sun" ? "atlas-sun" : "atlas-moon";
  spr.scale.set(sizeWorld, sizeWorld, 1);
  return spr;
}

function makeDiscTexture(kind) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext("2d");

  ctx.clearRect(0, 0, c.width, c.height);

  const cx = c.width / 2;
  const cy = c.height / 2;

  if (kind === "sun") {
    const g = ctx.createRadialGradient(cx, cy, 6, cx, cy, 124);
    g.addColorStop(0.0, "rgba(255,255,255,1.0)");
    g.addColorStop(0.20, "rgba(255,255,255,0.95)");
    g.addColorStop(0.55, "rgba(255,255,255,0.35)");
    g.addColorStop(1.0, "rgba(255,255,255,0.0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, 124, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const g = ctx.createRadialGradient(cx - 18, cy - 12, 18, cx, cy, 124);
    g.addColorStop(0.0, "rgba(245,245,245,0.95)");
    g.addColorStop(0.55, "rgba(210,210,210,0.82)");
    g.addColorStop(0.95, "rgba(155,155,155,0.45)");
    g.addColorStop(1.0, "rgba(0,0,0,0.0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, 118, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.10;
    ctx.fillStyle = "#000";
    for (let i = 0; i < 140; i++) {
      const r = 2 + Math.random() * 10;
      const x = cx + (Math.random() * 2 - 1) * 70;
      const y = cy + (Math.random() * 2 - 1) * 70;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
  }

  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

function dayOfYearUTC(d) {
  const start = Date.UTC(d.getUTCFullYear(), 0, 1);
  const now = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.floor((now - start) / 86400000) + 1;
}