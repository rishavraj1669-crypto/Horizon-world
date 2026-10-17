/**
 * Metropolis City Data & Skyscraper Definitions
 * Procedural city grid featuring tall skyscrapers (up to 160m), architectural roofs,
 * rooftop helipads, antennas, street grid, and open-world crime encounters.
 */

export interface BuildingDef {
  id: string;
  name: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  type: 'glass_tower' | 'art_deco' | 'brick_highrise' | 'modern_corporate' | 'spire_tower';
  color: number;
  windowColor: number;
  hasHelipad?: boolean;
  hasSpire?: boolean;
  hasWaterTower?: boolean;
  hasHVAC?: boolean;
  roofLevel: number;
}

export interface CrimeEncounter {
  id: string;
  name: string;
  type: 'bank_heist' | 'alley_ambush' | 'rooftop_syndicate' | 'park_disturbance';
  x: number;
  y: number;
  z: number;
  thugCount: number;
  isCleared: boolean;
  description: string;
}

// City bounding box: -250 to +250
export const CITY_RADIUS = 250;
export const STREET_WIDTH = 22;
export const BLOCK_SIZE = 70;

// High-rise Skyscrapers and Long Buildings
export const BUILDINGS: BuildingDef[] = [
  // Central District (Tallest towers)
  {
    id: 'b_stark',
    name: 'Stark Metropolis Tower',
    x: 0,
    z: -35,
    width: 32,
    depth: 32,
    height: 165,
    type: 'spire_tower',
    color: 0x1b2838,
    windowColor: 0x64b5f6,
    hasHelipad: true,
    hasSpire: true,
    hasHVAC: true,
    roofLevel: 165,
  },
  {
    id: 'b_oscorp',
    name: 'Oscorp Chemical Highrise',
    x: -60,
    z: -35,
    width: 34,
    depth: 30,
    height: 140,
    type: 'glass_tower',
    color: 0x0f2027,
    windowColor: 0x4dd0e1,
    hasHelipad: true,
    hasHVAC: true,
    roofLevel: 140,
  },
  {
    id: 'b_daily_bugle',
    name: 'Daily Bugle Building',
    x: 60,
    z: -35,
    width: 30,
    depth: 28,
    height: 115,
    type: 'art_deco',
    color: 0x5d4037,
    windowColor: 0xffe082,
    hasSpire: true,
    hasHVAC: true,
    roofLevel: 115,
  },
  {
    id: 'b_fisk_tower',
    name: 'Fisk Trade Center',
    x: 0,
    z: 45,
    width: 36,
    depth: 36,
    height: 155,
    type: 'modern_corporate',
    color: 0x212121,
    windowColor: 0xffb74d,
    hasHelipad: true,
    hasHVAC: true,
    roofLevel: 155,
  },
  {
    id: 'b_chrysler_style',
    name: 'Empire Apex Tower',
    x: -60,
    z: 45,
    width: 32,
    depth: 32,
    height: 150,
    type: 'art_deco',
    color: 0x37474f,
    windowColor: 0x81d4fa,
    hasSpire: true,
    roofLevel: 150,
  },
  {
    id: 'b_broadway_plaza',
    name: 'Broadway Grand Center',
    x: 60,
    z: 45,
    width: 30,
    depth: 32,
    height: 125,
    type: 'glass_tower',
    color: 0x263238,
    windowColor: 0x80deea,
    hasHelipad: false,
    hasHVAC: true,
    roofLevel: 125,
  },

  // Outer Manhattan Blocks - Long High-rises & Residential Skyscraper complexes
  {
    id: 'b_outer_nw',
    name: 'Hudson Heights Tower',
    x: -125,
    z: -35,
    width: 38,
    depth: 28,
    height: 95,
    type: 'brick_highrise',
    color: 0x616161,
    windowColor: 0xfff59d,
    hasWaterTower: true,
    roofLevel: 95,
  },
  {
    id: 'b_outer_nw2',
    name: 'Riverside Corporate Plaza',
    x: -125,
    z: -105,
    width: 32,
    depth: 32,
    height: 130,
    type: 'glass_tower',
    color: 0x1a237e,
    windowColor: 0x90caf9,
    hasHelipad: true,
    roofLevel: 130,
  },
  {
    id: 'b_outer_n1',
    name: 'Central North Spire',
    x: -60,
    z: -105,
    width: 28,
    depth: 30,
    height: 135,
    type: 'spire_tower',
    color: 0x212121,
    windowColor: 0x80cbc4,
    hasSpire: true,
    roofLevel: 135,
  },
  {
    id: 'b_outer_n2',
    name: 'Lexington Tech Tower',
    x: 0,
    z: -105,
    width: 34,
    depth: 32,
    height: 120,
    type: 'modern_corporate',
    color: 0x2e3a4e,
    windowColor: 0xbbdefb,
    hasHVAC: true,
    roofLevel: 120,
  },
  {
    id: 'b_outer_ne',
    name: 'East River Apex',
    x: 60,
    z: -105,
    width: 32,
    depth: 28,
    height: 145,
    type: 'glass_tower',
    color: 0x1b5e20,
    windowColor: 0xa5d6a7,
    hasHelipad: true,
    roofLevel: 145,
  },
  {
    id: 'b_outer_ne2',
    name: 'Queensboro Vista Highrise',
    x: 125,
    z: -105,
    width: 36,
    depth: 32,
    height: 90,
    type: 'brick_highrise',
    color: 0x4e342e,
    windowColor: 0xffe082,
    hasWaterTower: true,
    roofLevel: 90,
  },
  {
    id: 'b_outer_e1',
    name: 'Vanderbilt Financial Hub',
    x: 125,
    z: -35,
    width: 32,
    depth: 32,
    height: 128,
    type: 'modern_corporate',
    color: 0x263238,
    windowColor: 0x90caf9,
    hasHelipad: true,
    roofLevel: 128,
  },
  {
    id: 'b_outer_e2',
    name: 'Midtown High Residences',
    x: 125,
    z: 45,
    width: 34,
    depth: 30,
    height: 85,
    type: 'brick_highrise',
    color: 0x795548,
    windowColor: 0xfff59d,
    hasWaterTower: true,
    hasHVAC: true,
    roofLevel: 85,
  },
  {
    id: 'b_outer_se',
    name: 'Wall Street Sovereign Tower',
    x: 125,
    z: 115,
    width: 34,
    depth: 34,
    height: 138,
    type: 'art_deco',
    color: 0x3e2723,
    windowColor: 0xffecb3,
    hasSpire: true,
    roofLevel: 138,
  },
  {
    id: 'b_outer_s1',
    name: 'Battery Park Sky Suites',
    x: 60,
    z: 115,
    width: 32,
    depth: 30,
    height: 105,
    type: 'glass_tower',
    color: 0x004d40,
    windowColor: 0x80cbc4,
    hasHelipad: true,
    roofLevel: 105,
  },
  {
    id: 'b_outer_s2',
    name: 'Metropolis Science Center',
    x: 0,
    z: 115,
    width: 36,
    depth: 32,
    height: 110,
    type: 'modern_corporate',
    color: 0x1a237e,
    windowColor: 0x9fa8da,
    hasHVAC: true,
    roofLevel: 110,
  },
  {
    id: 'b_outer_sw1',
    name: 'SoHo Loft Residences',
    x: -60,
    z: 115,
    width: 34,
    depth: 30,
    height: 80,
    type: 'brick_highrise',
    color: 0x5d4037,
    windowColor: 0xfff59d,
    hasWaterTower: true,
    roofLevel: 80,
  },
  {
    id: 'b_outer_sw2',
    name: 'Tribeca Luxury Lofts',
    x: -125,
    z: 115,
    width: 36,
    depth: 32,
    height: 92,
    type: 'brick_highrise',
    color: 0x424242,
    windowColor: 0xffe082,
    hasWaterTower: true,
    hasHVAC: true,
    roofLevel: 92,
  },
  {
    id: 'b_outer_w1',
    name: 'Greenwich Zenith Tower',
    x: -125,
    z: 45,
    width: 30,
    depth: 32,
    height: 122,
    type: 'glass_tower',
    color: 0x263238,
    windowColor: 0x80deea,
    hasHelipad: false,
    roofLevel: 122,
  },
];

// Open-world Crime Encounters
export const CRIMES: CrimeEncounter[] = [
  {
    id: 'crime_bank',
    name: '5th Avenue Vault Heist',
    type: 'bank_heist',
    x: 30,
    y: 0,
    z: -35,
    thugCount: 4,
    isCleared: false,
    description: 'Armed syndicate thugs attempting a daylight robbery near the Bank!',
  },
  {
    id: 'crime_alley',
    name: 'Midtown Alley Ambush',
    type: 'alley_ambush',
    x: -30,
    y: 0,
    z: 45,
    thugCount: 3,
    isCleared: false,
    description: 'Gangsters threatening shopkeepers in the neon alleyway!',
  },
  {
    id: 'crime_rooftop',
    name: 'Fisk Tower Rooftop Syndicate',
    type: 'rooftop_syndicate',
    x: 0,
    y: 155,
    z: 45,
    thugCount: 4,
    isCleared: false,
    description: 'Heavy mob enforcers holding contraband on the Fisk helipad!',
  },
  {
    id: 'crime_park',
    name: 'Central Plaza Shakedown',
    type: 'park_disturbance',
    x: -30,
    y: 0,
    z: -85,
    thugCount: 3,
    isCleared: false,
    description: 'Street punks causing chaos around the central fountain!',
  },
];

/**
 * Checks if a point (x, z) is inside any building bounding box.
 * Returns the building if colliding, or null if on street/sidewalk.
 */
export function getBuildingAt(x: number, z: number, padding: number = 0.5): BuildingDef | null {
  for (const b of BUILDINGS) {
    const minX = b.x - b.width / 2 - padding;
    const maxX = b.x + b.width / 2 + padding;
    const minZ = b.z - b.depth / 2 - padding;
    const maxZ = b.z + b.depth / 2 + padding;

    if (x >= minX && x <= maxX && z >= minZ && z <= maxZ) {
      return b;
    }
  }
  return null;
}

/**
 * Find the best anchor point on nearby skyscrapers for Web-Swinging or Web-Zipping.
 * Searches in player heading / velocity cone for realistic skyscraper attachment.
 */
export function findWebSwingAnchor(
  playerX: number,
  playerY: number,
  playerZ: number,
  dirX: number,
  dirZ: number,
  maxDist: number = 85
): { x: number; y: number; z: number; building: BuildingDef; dist: number } | null {
  let bestAnchor: { x: number; y: number; z: number; building: BuildingDef; dist: number } | null = null;
  let bestScore = -9999;

  for (const b of BUILDINGS) {
    // Check distance to building center
    const dx = b.x - playerX;
    const dz = b.z - playerZ;
    const horizDist = Math.hypot(dx, dz);

    if (horizDist < 12 || horizDist > maxDist) continue;

    // Calculate facing alignment (dot product with direction)
    const normX = dx / (horizDist || 1);
    const normZ = dz / (horizDist || 1);
    const dot = normX * dirX + normZ * dirZ;

    // Must be roughly in front of or slightly to the side of Spider-Man (-0.2 to 1.0)
    if (dot < -0.2) continue;

    // Pick attachment point on the building face facing the player
    const attachX = Math.max(b.x - b.width / 2, Math.min(b.x + b.width / 2, playerX));
    const attachZ = Math.max(b.z - b.depth / 2, Math.min(b.z + b.depth / 2, playerZ));

    // Anchor height should be above player for a great swinging arc
    const idealHeight = Math.min(b.height * 0.85, Math.max(playerY + 15, b.height * 0.45));

    const totalDist = Math.hypot(attachX - playerX, idealHeight - playerY, attachZ - playerZ);
    if (totalDist > maxDist) continue;

    // Score favors forward alignment and high anchor points
    const score = dot * 40 - totalDist * 0.6 + (idealHeight - playerY) * 0.8;

    if (score > bestScore) {
      bestScore = score;
      bestAnchor = {
        x: attachX,
        y: idealHeight,
        z: attachZ,
        building: b,
        dist: totalDist,
      };
    }
  }

  return bestAnchor;
}
