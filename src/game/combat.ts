/**
 * Spider-Man Fighting & Combat Engine
 * Multi-hit combo attacks, web strikes, web-immobilize traps,
 * Spider-sense dodge reflex triggers, and street thug AI.
 */

export interface ThugEntity {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  health: number;
  maxHealth: number;
  state: 'idle' | 'chase' | 'windup' | 'attack' | 'webbed' | 'hurt' | 'knocked_out';
  attackTimer: number; // Cooldown / windup timer
  webbedTimer: number; // Duration left webbed
  hurtTimer: number;
  isCrimeLeader?: boolean;
}

export interface CombatFeedback {
  type: 'hit' | 'dodge' | 'web_trap' | 'ko' | 'combo_high';
  message: string;
  x: number;
  y: number;
  z: number;
  combo: number;
}

export interface CombatState {
  comboCount: number;
  comboTimer: number; // Decrements to 0 to drop combo
  spiderSenseActive: boolean;
  spiderSenseSourceId: string | null;
  spiderSenseTimeRemaining: number;
  crimesCleared: number;
  totalScore: number;
  activeFeedbacks: CombatFeedback[];
}

export const INITIAL_COMBAT_STATE: CombatState = {
  comboCount: 0,
  comboTimer: 0,
  spiderSenseActive: false,
  spiderSenseSourceId: null,
  spiderSenseTimeRemaining: 0,
  crimesCleared: 0,
  totalScore: 0,
  activeFeedbacks: [],
};

export const INITIAL_THUGS: ThugEntity[] = [
  // 5th Avenue Bank Heist Thugs
  { id: 'thug_bank_1', name: 'Syndicate Enforcer', x: 26, y: 0, z: -32, yaw: 1.2, health: 100, maxHealth: 100, state: 'idle', attackTimer: 0, webbedTimer: 0, hurtTimer: 0 },
  { id: 'thug_bank_2', name: 'Syndicate Gunner', x: 34, y: 0, z: -38, yaw: 2.1, health: 80, maxHealth: 80, state: 'idle', attackTimer: 0, webbedTimer: 0, hurtTimer: 0 },
  { id: 'thug_bank_boss', name: 'Bank Vault Bruiser', x: 30, y: 0, z: -35, yaw: 0, health: 180, maxHealth: 180, state: 'idle', attackTimer: 0, webbedTimer: 0, hurtTimer: 0, isCrimeLeader: true },

  // Midtown Alley Thugs
  { id: 'thug_alley_1', name: 'Street Punk', x: -28, y: 0, z: 42, yaw: 0.8, health: 70, maxHealth: 70, state: 'idle', attackTimer: 0, webbedTimer: 0, hurtTimer: 0 },
  { id: 'thug_alley_2', name: 'Crowbar Henchman', x: -33, y: 0, z: 48, yaw: -1.4, health: 90, maxHealth: 90, state: 'idle', attackTimer: 0, webbedTimer: 0, hurtTimer: 0 },

  // Fisk Tower Rooftop Syndicate
  { id: 'thug_roof_1', name: 'Rooftop Mercenary', x: 6, y: 155, z: 42, yaw: 0.4, health: 110, maxHealth: 110, state: 'idle', attackTimer: 0, webbedTimer: 0, hurtTimer: 0 },
  { id: 'thug_roof_2', name: 'Fisk Heavy Guard', x: -6, y: 155, z: 48, yaw: -0.7, health: 140, maxHealth: 140, state: 'idle', attackTimer: 0, webbedTimer: 0, hurtTimer: 0 },
  { id: 'thug_roof_boss', name: 'Syndicate Lieutenant', x: 0, y: 155, z: 45, yaw: 3.14, health: 220, maxHealth: 220, state: 'idle', attackTimer: 0, webbedTimer: 0, hurtTimer: 0, isCrimeLeader: true },

  // Central Plaza Disturbance
  { id: 'thug_park_1', name: 'Plaza Vandal', x: -28, y: 0, z: -82, yaw: 1.5, health: 75, maxHealth: 75, state: 'idle', attackTimer: 0, webbedTimer: 0, hurtTimer: 0 },
  { id: 'thug_park_2', name: 'Chain Brawler', x: -32, y: 0, z: -88, yaw: -2.0, health: 85, maxHealth: 85, state: 'idle', attackTimer: 0, webbedTimer: 0, hurtTimer: 0 },
];

/**
 * Step AI update for all thugs in the city.
 * Checks distance to Spider-Man, manages windup attacks (which trigger Spider-Sense!),
 * executes hits, and processes timers.
 */
export function updateThugs(
  thugs: ThugEntity[],
  playerX: number,
  playerY: number,
  playerZ: number,
  inVehicle: boolean,
  combatState: CombatState,
  dt: number,
  onPlayerHit: (damage: number) => void
): { spiderSenseActive: boolean; attackingThugId: string | null } {
  let spiderSenseAlert = false;
  let activeAttackerId: string | null = null;

  // Decrease combo timer
  if (combatState.comboTimer > 0) {
    combatState.comboTimer -= dt;
    if (combatState.comboTimer <= 0) {
      combatState.comboCount = 0;
    }
  }

  // Clear older feedbacks
  combatState.activeFeedbacks = combatState.activeFeedbacks.filter((_, i) => i < 5);

  for (const thug of thugs) {
    if (thug.health <= 0) {
      thug.state = 'knocked_out';
      continue;
    }

    // Process timers
    if (thug.webbedTimer > 0) {
      thug.webbedTimer -= dt;
      if (thug.webbedTimer <= 0) {
        thug.state = 'idle';
      }
      continue;
    }

    if (thug.hurtTimer > 0) {
      thug.hurtTimer -= dt;
      if (thug.hurtTimer <= 0 && thug.state === 'hurt') {
        thug.state = 'idle';
      }
      continue;
    }

    const dx = playerX - thug.x;
    const dy = playerY - thug.y;
    const dz = playerZ - thug.z;
    const distSq = dx * dx + dz * dz;
    const horizDist = Math.sqrt(distSq);

    // Height check (e.g. if player is high in the air, thugs cannot reach)
    const isReachable = Math.abs(dy) < 5.0;

    // Turn towards player if nearby
    if (horizDist < 25 && isReachable) {
      thug.yaw = Math.atan2(dx, dz);
    }

    if (inVehicle) {
      // In car, thugs back off or dodge
      if (horizDist < 12) {
        thug.state = 'idle';
      }
      continue;
    }

    // AI State Machine
    if (horizDist > 24 || !isReachable) {
      thug.state = 'idle';
      thug.attackTimer = 0;
    } else if (horizDist > 2.8) {
      // Chase player
      thug.state = 'chase';
      const moveSpeed = 3.2 * dt;
      thug.x += (dx / horizDist) * moveSpeed;
      thug.z += (dz / horizDist) * moveSpeed;
      thug.attackTimer = 0;
    } else {
      // In melee range: prepare attack windup
      if (thug.state !== 'windup' && thug.state !== 'attack') {
        thug.state = 'windup';
        thug.attackTimer = 0.85; // 0.85s windup before strike
      } else if (thug.state === 'windup') {
        thug.attackTimer -= dt;

        // Triggers Spider-Man's Spider-Sense!
        if (thug.attackTimer <= 0.65) {
          spiderSenseAlert = true;
          activeAttackerId = thug.id;
        }

        // Strike landed!
        if (thug.attackTimer <= 0) {
          thug.state = 'attack';
          thug.attackTimer = 0.35;
          // Apply damage to Spider-Man
          const dmg = thug.isCrimeLeader ? 22 : 12;
          onPlayerHit(dmg);
        }
      } else if (thug.state === 'attack') {
        thug.attackTimer -= dt;
        if (thug.attackTimer <= 0) {
          thug.state = 'idle';
          thug.attackTimer = 1.0; // Cooldown before next attack
        }
      }
    }
  }

  combatState.spiderSenseActive = spiderSenseAlert;
  combatState.spiderSenseSourceId = activeAttackerId;

  return { spiderSenseActive: spiderSenseAlert, attackingThugId: activeAttackerId };
}

/**
 * Executes a melee attack by Spider-Man (punch/kick combo).
 * Returns the hit thug if any was in range, along with damage dealt and combo count.
 */
export function executeMeleeAttack(
  thugs: ThugEntity[],
  playerX: number,
  playerY: number,
  playerZ: number,
  playerYaw: number,
  combatState: CombatState
): { hitThug: ThugEntity | null; damage: number; isKnockout: boolean; combo: number } {
  const attackRange = 3.6;
  let targetThug: ThugEntity | null = null;
  let closestDist = 999;

  for (const thug of thugs) {
    if (thug.health <= 0) continue;
    const dx = thug.x - playerX;
    const dy = thug.y - playerY;
    const dz = thug.z - playerZ;
    if (Math.abs(dy) > 3.0) continue;

    const dist = Math.hypot(dx, dz);
    if (dist <= attackRange && dist < closestDist) {
      closestDist = dist;
      targetThug = thug;
    }
  }

  if (!targetThug) {
    return { hitThug: null, damage: 0, isKnockout: false, combo: combatState.comboCount };
  }

  // Calculate damage based on combo streak
  combatState.comboCount++;
  combatState.comboTimer = 3.5; // 3.5 seconds to continue combo

  const comboMultiplier = 1.0 + Math.min(combatState.comboCount * 0.1, 2.5);
  const baseDamage = 25 + Math.floor(Math.random() * 15);
  const totalDamage = Math.round(baseDamage * comboMultiplier);

  targetThug.health = Math.max(0, targetThug.health - totalDamage);
  targetThug.state = targetThug.health <= 0 ? 'knocked_out' : 'hurt';
  targetThug.hurtTimer = 0.4;

  // Knockback
  const knockbackDist = targetThug.health <= 0 ? 3.0 : 1.2;
  const knockDirX = Math.sin(playerYaw);
  const knockDirZ = Math.cos(playerYaw);
  targetThug.x += knockDirX * knockbackDist;
  targetThug.z += knockDirZ * knockbackDist;

  const isKnockout = targetThug.health <= 0;
  combatState.totalScore += totalDamage * 10;

  // Add feedback floating alert
  combatState.activeFeedbacks.push({
    type: isKnockout ? 'ko' : 'hit',
    message: isKnockout ? 'KNOCKOUT!' : `HIT! x${combatState.comboCount}`,
    x: targetThug.x,
    y: targetThug.y + 1.8,
    z: targetThug.z,
    combo: combatState.comboCount,
  });

  return {
    hitThug: targetThug,
    damage: totalDamage,
    isKnockout,
    combo: combatState.comboCount,
  };
}

/**
 * Fires a web shooter projectile to immobilize an enemy in white spider webs.
 */
export function executeWebShoot(
  thugs: ThugEntity[],
  playerX: number,
  playerY: number,
  playerZ: number,
  playerYaw: number,
  combatState: CombatState
): { targetThug: ThugEntity | null } {
  const maxRange = 28;
  const facingX = Math.sin(playerYaw);
  const facingZ = Math.cos(playerYaw);

  let targetThug: ThugEntity | null = null;
  let closestDist = 999;

  for (const thug of thugs) {
    if (thug.health <= 0) continue;
    const dx = thug.x - playerX;
    const dy = thug.y - playerY;
    const dz = thug.z - playerZ;
    if (Math.abs(dy) > 4.0) continue;

    const dist = Math.hypot(dx, dz);
    if (dist > maxRange) continue;

    // Check angle alignment with player facing direction
    const dot = (dx / dist) * facingX + (dz / dist) * facingZ;
    if (dot > 0.4 && dist < closestDist) {
      closestDist = dist;
      targetThug = thug;
    }
  }

  if (targetThug) {
    targetThug.state = 'webbed';
    targetThug.webbedTimer = 4.5; // Webbed for 4.5 seconds!
    targetThug.health = Math.max(0, targetThug.health - 15);
    combatState.comboCount++;
    combatState.comboTimer = 3.5;
    combatState.totalScore += 250;

    combatState.activeFeedbacks.push({
      type: 'web_trap',
      message: 'WEBBED UP!',
      x: targetThug.x,
      y: targetThug.y + 1.5,
      z: targetThug.z,
      combo: combatState.comboCount,
    });
  }

  return { targetThug };
}

/**
 * Executes a Spider-Sense Dodge counter-flip!
 * If an enemy was winding up an attack, perfectly evades it and counters with score bonus.
 */
export function executeSpiderSenseDodge(
  combatState: CombatState,
  thugs: ThugEntity[],
  playerX: number,
  playerY: number,
  playerZ: number
): { isPerfectDodge: boolean } {
  let isPerfect = false;

  if (combatState.spiderSenseActive && combatState.spiderSenseSourceId) {
    const attacker = thugs.find((t) => t.id === combatState.spiderSenseSourceId);
    if (attacker && attacker.state === 'windup') {
      // Perfect counter dodge! Cancel attacker's strike and stun him
      attacker.state = 'hurt';
      attacker.hurtTimer = 0.7;
      attacker.attackTimer = 1.2;
      combatState.comboCount += 2;
      combatState.comboTimer = 4.0;
      combatState.totalScore += 500;
      isPerfect = true;

      combatState.activeFeedbacks.push({
        type: 'dodge',
        message: 'PERFECT SPIDER DODGE!',
        x: playerX,
        y: playerY + 2.0,
        z: playerZ,
        combo: combatState.comboCount,
      });
    }
  }

  combatState.spiderSenseActive = false;
  combatState.spiderSenseSourceId = null;

  return { isPerfectDodge: isPerfect };
}
