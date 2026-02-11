import * as THREE from "three";
import { createGrid } from "./grid.js";

function setSRGB(tex) {
  if (!tex) return;
  if ("colorSpace" in tex && THREE.SRGBColorSpace) {
    tex.colorSpace = THREE.SRGBColorSpace;
  } else if ("encoding" in tex && THREE.sRGBEncoding) {
    tex.encoding = THREE.sRGBEncoding;
  }
}

function tuneForSharpness(tex, { anisotropy = 16 } = {}) {
  if (!tex) return;
  tex.anisotropy = anisotropy;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
}


function makeCyberEarthMapTexture(srcTexture) {
  const img = srcTexture?.image;
  if (!img || (!img.width && !img.naturalWidth)) return srcTexture;

  const w = img.width || img.naturalWidth;
  const h = img.height || img.naturalHeight;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);

  let imageData;
  try {
    imageData = ctx.getImageData(0, 0, w, h);
  } catch {
    
    return srcTexture;
  }

  const data = imageData.data;

  
  const oceanDark = 0.03;   
  const landLift = 0.18;    
  const landGamma = 0.86;   
  const contrast = 1.14;    
  const mid = 128;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i + 0];
    const g = data[i + 1];
    const b = data[i + 2];

    
    let y = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    
    const blueDominant = b > r + 18 && b > g + 10;
    const notTooBright = y < 210;

    if (blueDominant && notTooBright) {
      
      y = y * oceanDark;
    } else {
      
      const yn = Math.max(0, Math.min(1, y / 255));
      y = Math.pow(yn, landGamma) * 255;
      y = y + landLift * 255;
    }

    
    y = (y - mid) * contrast + mid;

    
    y = Math.max(0, Math.min(255, y));

    data[i + 0] = y;
    data[i + 1] = y;
    data[i + 2] = y;
  }

  ctx.putImageData(imageData, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  setSRGB(tex);
  tuneForSharpness(tex, { anisotropy: 16 });
  tex.needsUpdate = true;
  return tex;
}

export function createGlobe({ scene, loadingManager = undefined }) {
  const group = new THREE.Group();
  scene.add(group);

  const radius = 1.55;
  const loader = new THREE.TextureLoader(loadingManager);

  
  const earthMap = loader.load(
    "https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg",
    (tex) => {
      setSRGB(tex);
      tuneForSharpness(tex, { anisotropy: 16 });
      const cyber = makeCyberEarthMapTexture(tex);
      earthMesh.material.map = cyber;
      earthMesh.material.needsUpdate = true;
    }
  );
  setSRGB(earthMap);

  tuneForSharpness(earthMap, { anisotropy: 16 });

  const earthGeo = new THREE.SphereGeometry(radius, 96, 96);

  
  const earthMat = new THREE.MeshPhongMaterial({
    map: earthMap,
    bumpScale: 0.0,

    specular: new THREE.Color(0x171a1d), 
    shininess: 8,                        

    
    color: new THREE.Color(0xb3b8be)
  });

  const earthMesh = new THREE.Mesh(earthGeo, earthMat);
  earthMesh.renderOrder = 0;
  group.add(earthMesh);

  
  const grid = createGrid({
    radius: radius * 1.004,
    latStepDeg: 15,
    lonStepDeg: 15,
    segments: 96,
    opacity: 0.28
  });
  grid.renderOrder = 1;
  group.add(grid);

  const atmoGeo = new THREE.SphereGeometry(radius * 1.025, 64, 64);
  const atmoMat = new THREE.MeshBasicMaterial({
    color: 0xcfd3d8,
    transparent: true,
    opacity: 0.03,
    depthWrite: false
  });

  const atmosphere = new THREE.Mesh(atmoGeo, atmoMat);
  atmosphere.renderOrder = 2;
  group.add(atmosphere);

  const centerWorld = new THREE.Vector3(0, 0, 0);

  return { group, radius, earthMesh, centerWorld };
}
