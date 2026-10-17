/**
 * Vehicle (Supercar) and Character (Spider-Man) Physics Engine
 * Zero-allocation mathematical kinematic simulation with:
 * 1. Supercar: High-performance 0-100 in 2.8s, 320+ km/h top speed, high-RPM tachometer,
 *    drifting slip angle physics, and nitro boost.
 * 2. Spider-Man: Web-swinging pendulum physics, web-zip aerial launch, rooftop landing,
 *    and combat movement.
 */

import { getTerrainHeight, getTerrainNormal } from './terrain';
import { getBuildingAt } from './cityData';

export interface VehicleState {
  x: number;
  y: number;
  z: number;
  yaw: number; // heading angle in radians
  pitch: number;
  roll: number;
  speed: number; // forward speed in m/s
  steerAngle: number; // current front wheel turn angle
  targetSteerAngle: number;
  rpm: number; // engine RPM (800 - 9000)
  gear: number; // 1 to 6, -1 for reverse
  isBraking: boolean;
  isDrifting: boolean;
  isBoosting: boolean;
  headlightsOn: boolean;
  wheelRotations: [number, number, number, number]; // FL, FR, RL, RR
  suspensionOffsets: [number, number, number, number];
  damage: number; // 0 to 100
  fuel: number; // 0 to 100 (Nitro)
}

export interface PlayerCharacterState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  yaw: number;
  isGrounded: boolean;
  isWalking: boolean;
  isSprinting: boolean;
  inVehicle: boolean;

  // Spider-Man Special Mechanics
  isSwinging: boolean;
  isWebZipping: boolean;
  webAnchor: { x: number; y: number; z: number } | null;
  ropeLength: number;
  swingAngle: number;
  health: number;
  webFluid: number; // 0 to 100
  animAction: 'idle' | 'run' | 'sprint' | 'swing' | 'zip' | 'punch' | 'kick' | 'dodge' | 'wall';
  attackCooldown: number;
}

export interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  brake: boolean;
  boost: boolean;
  interact: boolean; // E key
  toggleHeadlights: boolean; // L key
  horn: boolean; // H key
  resetVehicle: boolean; // R key
  steerAxis?: number; // Analog steering (-1 = full right, +1 = full left)
  throttleAxis?: number; // Analog throttle (+1 = forward, -1 = reverse)

  // Spider-Man Action Inputs
  webSwing?: boolean; // Space / Click
  webZip?: boolean; // Q key
  attack?: boolean; // Left click / J key
  webShoot?: boolean; // E key (when not driving)
  dodge?: boolean; // Shift key
}

export const SUPERCAR_DIMENSIONS = {
  halfLength: 2.1,
  halfWidth: 1.05,
  wheelRadius: 0.44,
  rideHeight: 0.45,
  maxSpeed: 75.0, // ~270 km/h
  reverseMaxSpeed: 18.0,
  boostMultiplier: 1.4, // ~380 km/h top speed with nitro
  accel: 28.0, // 0-100 in ~2.8 seconds
  brakeDecel: 36.0,
  naturalFriction: 3.2,
  maxSteer: 0.52, // ~30 degrees
  steerSpeed: 6.5,
};

// Aliased for backward compatibility with tests
export const VEHICLE_DIMENSIONS = SUPERCAR_DIMENSIONS;

export function createInitialVehicle(x: number = 0, z: number = 0): VehicleState {
  const y = getTerrainHeight(x, z) + SUPERCAR_DIMENSIONS.rideHeight;
  return {
    x: 0,
    y,
    z: 0,
    yaw: Math.PI / 2, // Facing East down the open 4-lane avenue
    pitch: 0,
    roll: 0,
    speed: 0,
    steerAngle: 0,
    targetSteerAngle: 0,
    rpm: 800,
    gear: 1,
    isBraking: false,
    isDrifting: false,
    isBoosting: false,
    headlightsOn: true,
    wheelRotations: [0, 0, 0, 0],
    suspensionOffsets: [0, 0, 0, 0],
    damage: 0,
    fuel: 100,
  };
}

export function createInitialPlayer(x: number = 0, z: number = 0): PlayerCharacterState {
  const y = getTerrainHeight(x, z);
  return {
    x: x + 2.8, // Standing right beside supercar
    y,
    z: z + 0.8,
    vx: 0,
    vy: 0,
    vz: 0,
    yaw: Math.PI / 2, // Facing East down the open skyscraper canyon
    isGrounded: true,
    isWalking: false,
    isSprinting: false,
    inVehicle: false, // starts on foot as Spider-Man!
    isSwinging: false,
    isWebZipping: false,
    webAnchor: null,
    ropeLength: 0,
    swingAngle: 0,
    health: 100,
    webFluid: 100,
    animAction: 'idle',
    attackCooldown: 0,
  };
}

/**
 * Step Supercar physics simulation
 */
export function stepVehiclePhysics(
  v: VehicleState,
  inputs: InputState,
  dt: number,
  isWetOrSnowy: boolean = false
): void {
  const dim = SUPERCAR_DIMENSIONS;

  // Steering
  let steerIntent = 0;
  if (inputs.steerAxis !== undefined && Math.abs(inputs.steerAxis) > 0.02) {
    steerIntent = Math.max(-1, Math.min(1, inputs.steerAxis));
  } else {
    if (inputs.left) steerIntent += 1;
    if (inputs.right) steerIntent -= 1;
  }

  // High speed steering stability
  const speedRatio = Math.min(1, Math.abs(v.speed) / dim.maxSpeed);
  const effectiveMaxSteer = dim.maxSteer * (1 - speedRatio * 0.55);
  v.targetSteerAngle = steerIntent * effectiveMaxSteer;

  v.steerAngle += (v.targetSteerAngle - v.steerAngle) * Math.min(1, dim.steerSpeed * dt);

  // Nitro Boosting
  v.isBoosting = inputs.boost && v.fuel > 0 && inputs.forward;
  if (v.isBoosting) {
    v.fuel = Math.max(0, v.fuel - 12.0 * dt);
  } else {
    v.fuel = Math.min(100, v.fuel + 4.5 * dt); // Nitro regen
  }

  const topSpeed = v.isBoosting ? dim.maxSpeed * dim.boostMultiplier : dim.maxSpeed;
  const accelPower = v.isBoosting ? dim.accel * 1.55 : dim.accel;

  // Acceleration & Handbrake Drifting
  v.isBraking = inputs.brake;
  v.isDrifting = inputs.brake && Math.abs(v.speed) > 10.0;

  if (inputs.forward) {
    if (v.speed < -0.5) {
      v.speed += dim.brakeDecel * dt;
    } else {
      v.speed += accelPower * dt;
      if (v.speed > topSpeed) v.speed = topSpeed;
    }
  } else if (inputs.backward) {
    if (v.speed > 0.5) {
      v.speed -= dim.brakeDecel * dt;
    } else {
      v.speed -= (accelPower * 0.6) * dt;
      if (v.speed < -dim.reverseMaxSpeed) v.speed = -dim.reverseMaxSpeed;
    }
  } else {
    const friction = dim.naturalFriction * (isWetOrSnowy ? 0.7 : 1.0);
    if (v.speed > 0) {
      v.speed = Math.max(0, v.speed - friction * dt);
    } else if (v.speed < 0) {
      v.speed = Math.min(0, v.speed + friction * dt);
    }
  }

  if (v.isBraking) {
    const brakeForce = dim.brakeDecel * (v.isDrifting ? 0.85 : 1.4);
    if (v.speed > 0) {
      v.speed = Math.max(0, v.speed - brakeForce * dt);
    } else if (v.speed < 0) {
      v.speed = Math.min(0, v.speed + brakeForce * dt);
    }
  }

  // Yaw rotation & drift slip
  const turnDirection = v.speed >= 0 ? 1 : -1;
  const driftBonus = v.isDrifting ? 2.1 : 1.0;
  const yawRate = (v.speed / dim.halfLength) * Math.sin(v.steerAngle) * driftBonus;
  v.yaw += yawRate * dt * turnDirection;

  // Position update
  const forwardX = Math.sin(v.yaw);
  const forwardZ = Math.cos(v.yaw);
  v.x += forwardX * v.speed * dt;
  v.z += forwardZ * v.speed * dt;

  // Building collision push-out for car
  const hitBuilding = getBuildingAt(v.x, v.z, 2.5);
  if (hitBuilding) {
    v.speed *= -0.25; // bounce back
    const dx = v.x - hitBuilding.x;
    const dz = v.z - hitBuilding.z;
    const len = Math.hypot(dx, dz) || 1;
    v.x += (dx / len) * 1.5;
    v.z += (dz / len) * 1.5;
  }

  // World bounds
  const distFromCenter = Math.hypot(v.x, v.z);
  if (distFromCenter > 240) {
    v.speed *= 0.5;
    v.x += (-v.x / distFromCenter) * 2.0;
    v.z += (-v.z / distFromCenter) * 2.0;
  }

  // 4-Wheel terrain contact
  const rightX = Math.cos(v.yaw);
  const rightZ = -Math.sin(v.yaw);

  const flX = v.x + rightX * dim.halfWidth + forwardX * dim.halfLength;
  const flZ = v.z + rightZ * dim.halfWidth + forwardZ * dim.halfLength;

  const frX = v.x - rightX * dim.halfWidth + forwardX * dim.halfLength;
  const frZ = v.z - rightZ * dim.halfWidth + forwardZ * dim.halfLength;

  const rlX = v.x + rightX * dim.halfWidth - forwardX * dim.halfLength;
  const rlZ = v.z + rightZ * dim.halfWidth - forwardZ * dim.halfLength;

  const rrX = v.x - rightX * dim.halfWidth - forwardX * dim.halfLength;
  const rrZ = v.z - rightZ * dim.halfWidth - forwardZ * dim.halfLength;

  const flY = getTerrainHeight(flX, flZ);
  const frY = getTerrainHeight(frX, frZ);
  const rlY = getTerrainHeight(rlX, rlZ);
  const rrY = getTerrainHeight(rrX, rrZ);

  const avgGroundY = (flY + frY + rlY + rrY) * 0.25;
  const targetY = avgGroundY + dim.rideHeight;

  v.y += (targetY - v.y) * Math.min(1, 16.0 * dt);

  const frontY = (flY + frY) * 0.5;
  const rearY = (rlY + rrY) * 0.5;
  const leftY = (flY + rlY) * 0.5;
  const rightY = (frY + rrY) * 0.5;

  const targetPitch = Math.atan2(frontY - rearY, dim.halfLength * 2);
  const targetRoll = Math.atan2(leftY - rightY, dim.halfWidth * 2);

  v.pitch += (targetPitch - v.pitch) * Math.min(1, 14.0 * dt);
  v.roll += (targetRoll - v.roll) * Math.min(1, 14.0 * dt);

  // Wheel rotations
  const distTraveled = v.speed * dt;
  const wheelDelta = distTraveled / dim.wheelRadius;
  v.wheelRotations[0] += wheelDelta;
  v.wheelRotations[1] += wheelDelta;
  v.wheelRotations[2] += wheelDelta;
  v.wheelRotations[3] += wheelDelta;

  // Suspension offsets
  v.suspensionOffsets[0] = Math.max(-0.2, Math.min(0.2, flY - (v.y - dim.rideHeight)));
  v.suspensionOffsets[1] = Math.max(-0.2, Math.min(0.2, frY - (v.y - dim.rideHeight)));
  v.suspensionOffsets[2] = Math.max(-0.2, Math.min(0.2, rlY - (v.y - dim.rideHeight)));
  v.suspensionOffsets[3] = Math.max(-0.2, Math.min(0.2, rrY - (v.y - dim.rideHeight)));

  // Supercar V10/V12 RPM & 6-Speed transmission
  const absSpeed = Math.abs(v.speed);
  if (v.speed < -0.1) {
    v.gear = -1;
    v.rpm = 1200 + (absSpeed / dim.reverseMaxSpeed) * 4500;
  } else if (absSpeed < 0.1) {
    v.gear = 1;
    v.rpm = inputs.forward ? 2600 : 850;
  } else {
    if (absSpeed < 10) v.gear = 1;
    else if (absSpeed < 22) v.gear = 2;
    else if (absSpeed < 38) v.gear = 3;
    else if (absSpeed < 52) v.gear = 4;
    else if (absSpeed < 68) v.gear = 5;
    else v.gear = 6;

    const gearRanges = [0, 10, 22, 38, 52, 68, dim.maxSpeed * 1.5];
    const low = gearRanges[v.gear - 1];
    const high = gearRanges[v.gear];
    const gearFraction = (absSpeed - low) / (high - low);
    v.rpm = 2200 + gearFraction * 6500; // Roars up to 8700 RPM!
  }
}

/**
 * Step Spider-Man physics simulation:
 * - On-foot movement (walk/sprint)
 * - Pendulum Web-Swinging physics
 * - Web-Zip launch
 * - Rooftop detection and landing
 */
export function stepPlayerPhysics(
  p: PlayerCharacterState,
  inputs: InputState,
  cameraYaw: number,
  dt: number
): void {
  if (p.inVehicle) return;

  // Web fluid regeneration
  p.webFluid = Math.min(100, p.webFluid + 14 * dt);

  // Attack cooldown
  if (p.attackCooldown > 0) {
    p.attackCooldown -= dt;
  }

  // 1. WEB SWINGING PENDULUM SIMULATION
  if (p.isSwinging && p.webAnchor) {
    p.animAction = 'swing';
    p.isGrounded = false;

    const gravity = -28.0;
    p.vy += gravity * dt;

    // Vector from anchor to Spider-Man
    const rx = p.x - p.webAnchor.x;
    const ry = p.y - p.webAnchor.y;
    const rz = p.z - p.webAnchor.z;
    const dist = Math.hypot(rx, ry, rz);

    if (dist >= p.ropeLength) {
      // Rope is taut: remove outward velocity component (Centripetal constraint)
      const nx = rx / dist;
      const ny = ry / dist;
      const nz = rz / dist;

      const vDotN = p.vx * nx + p.vy * ny + p.vz * nz;
      if (vDotN > 0) {
        p.vx -= vDotN * nx;
        p.vy -= vDotN * ny;
        p.vz -= vDotN * nz;
      }

      // Constrain position to rope sphere
      p.x = p.webAnchor.x + nx * p.ropeLength;
      p.y = p.webAnchor.y + ny * p.ropeLength;
      p.z = p.webAnchor.z + nz * p.ropeLength;

      // Forward swing pump boost
      if (inputs.forward) {
        const fwdX = Math.sin(cameraYaw);
        const fwdZ = Math.cos(cameraYaw);
        p.vx += fwdX * 18.0 * dt;
        p.vz += fwdZ * 18.0 * dt;
      }

      // Calculate swing angle for dynamic poses
      p.swingAngle = Math.atan2(Math.hypot(rx, rz), -ry);
    }

    // Integrate velocity
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;

    // Heading aligns with horizontal velocity
    if (Math.hypot(p.vx, p.vz) > 1.0) {
      p.yaw = Math.atan2(p.vx, p.vz);
    }

    return;
  }

  // 2. WEB ZIP BURST
  if (p.isWebZipping && p.webAnchor) {
    p.animAction = 'zip';
    p.isGrounded = false;

    const dx = p.webAnchor.x - p.x;
    const dy = p.webAnchor.y - p.y;
    const dz = p.webAnchor.z - p.z;
    const dist = Math.hypot(dx, dy, dz);

    if (dist < 3.5) {
      // Arrived at target! Release zip with forward momentum
      p.isWebZipping = false;
      p.webAnchor = null;
      p.vy = 6.0; // slight upward hop onto ledge
    } else {
      const zipSpeed = 34.0;
      p.vx = (dx / dist) * zipSpeed;
      p.vy = (dy / dist) * zipSpeed;
      p.vz = (dz / dist) * zipSpeed;

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.yaw = Math.atan2(dx, dz);
      return;
    }
  }

  // 3. GROUND / ROOFTOP SURFACES
  // Check if player is standing on a building rooftop or ground terrain
  let surfaceY = getTerrainHeight(p.x, p.z);
  const buildingUnder = getBuildingAt(p.x, p.z, 0.0);
  if (buildingUnder && p.y >= buildingUnder.height - 4.0) {
    surfaceY = buildingUnder.height;
  }

  // 4. ON-FOOT LOCOMOTION
  const moveSpeed = inputs.boost ? 8.5 : 4.5;
  p.isSprinting = inputs.boost;

  let moveX = 0;
  let moveZ = 0;

  if (
    inputs.steerAxis !== undefined &&
    inputs.throttleAxis !== undefined &&
    (Math.abs(inputs.steerAxis) > 0.05 || Math.abs(inputs.throttleAxis) > 0.05)
  ) {
    moveX = -inputs.steerAxis;
    moveZ = inputs.throttleAxis;
  } else {
    if (inputs.forward) moveZ += 1;
    if (inputs.backward) moveZ -= 1;
    if (inputs.left) moveX -= 1;
    if (inputs.right) moveX += 1;
  }

  p.isWalking = moveX !== 0 || moveZ !== 0;

  if (p.isWalking) {
    const moveLen = Math.hypot(moveX, moveZ);
    const normX = moveX / moveLen;
    const normZ = moveZ / moveLen;

    const forwardX = Math.sin(cameraYaw);
    const forwardZ = Math.cos(cameraYaw);
    const rightX = Math.cos(cameraYaw);
    const rightZ = -Math.sin(cameraYaw);

    const worldDx = forwardX * normZ + rightX * normX;
    const worldDz = forwardZ * normZ + rightZ * normX;

    p.x += worldDx * moveSpeed * dt;
    p.z += worldDz * moveSpeed * dt;

    p.yaw = Math.atan2(worldDx, worldDz);
    p.animAction = p.isSprinting ? 'sprint' : 'run';
  } else {
    p.animAction = 'idle';
  }

  // Check building wall collisions when on foot (cannot walk through walls)
  if (buildingUnder && p.y < buildingUnder.height - 0.5) {
    const bDx = p.x - buildingUnder.x;
    const bDz = p.z - buildingUnder.z;
    const len = Math.hypot(bDx, bDz) || 1;
    p.x += (bDx / len) * 0.8;
    p.z += (bDz / len) * 0.8;
  }

  // Jump and Gravity
  const gravity = 22.0;

  if (p.isGrounded) {
    if (inputs.brake) {
      // Space key = Acrobat Super Jump!
      p.vy = 10.5;
      p.isGrounded = false;
    } else {
      p.y = surfaceY;
      p.vy = 0;
    }
  } else {
    p.vy -= gravity * dt;
    p.y += p.vy * dt;

    // Apply residual horizontal aerial momentum
    p.x += p.vx * dt;
    p.z += p.vz * dt;
    p.vx *= Math.pow(0.95, dt * 60);
    p.vz *= Math.pow(0.95, dt * 60);

    if (p.y <= surfaceY) {
      p.y = surfaceY;
      p.vy = 0;
      p.vx = 0;
      p.vz = 0;
      p.isGrounded = true;
    }
  }
}
