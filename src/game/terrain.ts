/**
 * Procedural Open-World Terrain Generator
 * Mathematical multi-octave noise, biome classification, road network, and elevation sampling.
 */

// Permutation table for fast procedural gradient noise (Zero external dependencies)
const PERM = new Uint8Array(512);
const P_BASE = [
  151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,
  8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,
  35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,
  134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,
  55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,
  18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,
  250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,
  189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,
  172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,
  228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,
  107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,
  138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180
];
for (let i = 0; i < 256; i++) {
  PERM[i] = P_BASE[i];
  PERM[i + 256] = P_BASE[i];
}

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(t: number, a: number, b: number): number {
  return a + t * (b - a);
}

function grad(hash: number, x: number, y: number): number {
  const h = hash & 7;
  const u = h < 4 ? x : y;
  const v = h < 4 ? y : x;
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}

export function perlin2D(x: number, y: number): number {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);

  const u = fade(xf);
  const v = fade(yf);

  const A = PERM[X] + Y;
  const B = PERM[X + 1] + Y;

  const g00 = grad(PERM[A], xf, yf);
  const g10 = grad(PERM[B], xf - 1, yf);
  const g01 = grad(PERM[A + 1], xf, yf - 1);
  const g11 = grad(PERM[B + 1], xf - 1, yf - 1);

  const x1 = lerp(u, g00, g10);
  const x2 = lerp(u, g01, g11);
  return lerp(v, x1, x2);
}

export const WORLD_SIZE = 400; // Radius: -200 to +200
export const WATER_LEVEL = 1.0;

// Key Landmark Positions across the world
export const LANDMARK_COORDS = [
  { id: 'spawn', name: 'Valley Camp', x: 0, z: 0 },
  { id: 'outpost', name: 'Highland Watchtower', x: 65, z: -70 },
  { id: 'workshop', name: 'Meadow Workshop', x: -80, z: -40 },
  { id: 'lake', name: 'Whispering Lake Camp', x: 40, z: 95 },
  { id: 'tower', name: 'Echo Ridge Antenna', x: -95, z: 85 },
];

/**
 * Calculates road influence factor at (x, z).
 * Roads flatten terrain slightly and create smooth drivable trails connecting landmarks.
 */
export function getRoadFactor(x: number, z: number): number {
  // Road segments connecting landmarks:
  // 1: Spawn (0,0) -> Highland Watchtower (65, -70)
  // 2: Spawn (0,0) -> Meadow Workshop (-80, -40)
  // 3: Spawn (0,0) -> Whispering Lake (40, 95)
  // 4: Workshop (-80, -40) -> Echo Ridge Antenna (-95, 85)
  // 5: Echo Ridge (-95, 85) -> Whispering Lake (40, 95)

  const segments = [
    { x1: 0, z1: 0, x2: 65, z2: -70, curveAmp: 12 },
    { x1: 0, z1: 0, x2: -80, z2: -40, curveAmp: -10 },
    { x1: 0, z1: 0, x2: 40, z2: 95, curveAmp: 15 },
    { x1: -80, z1: -40, x2: -95, z2: 85, curveAmp: -8 },
    { x1: -95, z1: 85, x2: 40, z2: 95, curveAmp: 10 },
  ];

  let minDist = 999;
  for (const seg of segments) {
    const dx = seg.x2 - seg.x1;
    const dz = seg.z2 - seg.z1;
    const lenSq = dx * dx + dz * dz;
    let t = Math.max(0, Math.min(1, ((x - seg.x1) * dx + (z - seg.z1) * dz) / lenSq));
    // add gentle spline curve
    const curve = Math.sin(t * Math.PI) * seg.curveAmp;
    const perpX = -dz / Math.sqrt(lenSq);
    const perpZ = dx / Math.sqrt(lenSq);
    const px = seg.x1 + t * dx + perpX * curve;
    const pz = seg.z1 + t * dz + perpZ * curve;

    const dist = Math.hypot(x - px, z - pz);
    if (dist < minDist) {
      minDist = dist;
    }
  }

  const roadWidth = 4.5;
  if (minDist > roadWidth * 2) return 0;
  return Math.max(0, 1 - minDist / (roadWidth * 2));
}

/**
 * Procedural terrain height at (x, z)
 */
export function getTerrainHeight(x: number, z: number): number {
  const distFromCenter = Math.hypot(x, z);

  // Natural mountain perimeter barrier: raises sharply at borders (dist > 160)
  let perimeterLift = 0;
  if (distFromCenter > 140) {
    const edgeRatio = (distFromCenter - 140) / 60;
    perimeterLift = Math.pow(Math.min(edgeRatio, 1.2), 2) * 45;
  }

  // Broad rolling hills (macro scale)
  const macro = perlin2D(x * 0.005, z * 0.005) * 18.0;
  // Medium detail ridges & mounds
  const medium = perlin2D(x * 0.015 + 1.2, z * 0.015 + 3.4) * 7.0;
  // Micro terrain ripple
  const micro = perlin2D(x * 0.05 + 5.7, z * 0.05 + 8.1) * 1.5;

  // Lake depression near (40, 95)
  const lakeDist = Math.hypot(x - 40, z - 95);
  let lakeDepression = 0;
  if (lakeDist < 45) {
    lakeDepression = (1 - lakeDist / 45) * 8.0;
  }

  // Gentle spawn plateau around (0, 0)
  let spawnFlatten = 1.0;
  if (distFromCenter < 35) {
    spawnFlatten = Math.pow(distFromCenter / 35, 1.5);
  }

  let rawHeight = 4.0 + (macro + medium) * spawnFlatten + micro - lakeDepression + perimeterLift;

  // Road flattening: if on road, smooth out sudden bumps for silky driving
  const roadFactor = getRoadFactor(x, z);
  if (roadFactor > 0) {
    const smoothMacro = 4.0 + macro * 0.7 * spawnFlatten;
    rawHeight = lerp(roadFactor * 0.65, rawHeight, smoothMacro);
  }

  return rawHeight;
}

/**
 * Analytical ground surface normal at (x, z)
 */
export function getTerrainNormal(x: number, z: number): { x: number; y: number; z: number } {
  const delta = 0.5;
  const hL = getTerrainHeight(x - delta, z);
  const hR = getTerrainHeight(x + delta, z);
  const hD = getTerrainHeight(x, z - delta);
  const hU = getTerrainHeight(x, z + delta);

  const nx = (hL - hR) / (2 * delta);
  const ny = 1.0;
  const nz = (hD - hU) / (2 * delta);

  const len = Math.hypot(nx, ny, nz);
  return {
    x: nx / len,
    y: ny / len,
    z: nz / len,
  };
}

/**
 * Biome classification for surface textures, foliage distribution, and sound footstep effects
 */
export type BiomeType = 'water' | 'sand' | 'road' | 'grass' | 'rock' | 'snow';

export function getBiomeAt(x: number, z: number): BiomeType {
  const h = getTerrainHeight(x, z);
  if (h <= WATER_LEVEL + 0.3) return 'water';
  if (h <= WATER_LEVEL + 1.8) return 'sand';

  const road = getRoadFactor(x, z);
  if (road > 0.45) return 'road';

  if (h > 24) return 'snow';
  if (h > 15) return 'rock';
  return 'grass';
}
