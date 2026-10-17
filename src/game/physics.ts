/**
 * Vehicle and Character Physics Engine
 * Zero-allocation mathematical kinematic simulation with 4-wheel terrain clamping,
 * suspension dynamics, drifting, and on-foot character controls.
 */

import { getTerrainHeight, getTerrainNormal } from './terrain';

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
  rpm: number; // engine RPM (800 - 6500)
  gear: number; // 1 to 5, -1 for reverse
  isBraking: boolean;
  isDrifting: boolean;
  isBoosting: boolean;
  headlightsOn: boolean;
  wheelRotations: [number, number, number, number]; // FL, FR, RL, RR
  suspensionOffsets: [number, number, number, number];
  damage: number; // 0 to 100
  fuel: number; // 0 to 100
}

export interface PlayerCharacterState {
  x: number;
  y: number;
  z: number;
  vy: number;
  yaw: number;
  isGrounded: boolean;
  isWalking: boolean;
  isSprinting: boolean;
  inVehicle: boolean;
}

export interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  brake: boolean;
  boost: boolean;
  interact: boolean; // Just pressed E
  toggleHeadlights: boolean; // Just pressed L
  horn: boolean; // Held H
  resetVehicle: boolean; // R key
  steerAxis?: number; // Analog steering (-1 = full right, +1 = full left)
  throttleAxis?: number; // Analog throttle (+1 = forward, -1 = reverse)
}

export const VEHICLE_DIMENSIONS = {
  halfLength: 1.8,
  halfWidth: 1.1,
  wheelRadius: 0.48,
  rideHeight: 0.65,
  maxSpeed: 28.0, // ~100 km/h
  reverseMaxSpeed: 8.0,
  boostMultiplier: 1.45,
  accel: 14.0,
  brakeDecel: 24.0,
  naturalFriction: 2.2,
  maxSteer: 0.58, // ~33 degrees
  steerSpeed: 4.5,
};

export function createInitialVehicle(x: number = 0, z: number = 0): VehicleState {
  const y = getTerrainHeight(x, z) + VEHICLE_DIMENSIONS.rideHeight;
  return {
    x,
    y,
    z,
    yaw: 0,
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
    x: x + 2.5,
    y,
    z: z + 1.0,
    vy: 0,
    yaw: 0,
    isGrounded: true,
    isWalking: false,
    isSprinting: false,
    inVehicle: true, // starts inside vehicle ready to explore
  };
}

/**
 * Step vehicle physics
 */
export function stepVehiclePhysics(
  v: VehicleState,
  inputs: InputState,
  dt: number,
  isWetOrSnowy: boolean = false
): void {
  const dim = VEHICLE_DIMENSIONS;

  // Steering input: prioritize analog steerAxis if present, otherwise use discrete keys
  let steerIntent = 0;
  if (inputs.steerAxis !== undefined && Math.abs(inputs.steerAxis) > 0.02) {
    steerIntent = Math.max(-1, Math.min(1, inputs.steerAxis));
  } else {
    if (inputs.left) steerIntent += 1;
    if (inputs.right) steerIntent -= 1;
  }

  // High speed steering damping
  const speedRatio = Math.min(1, Math.abs(v.speed) / dim.maxSpeed);
  const effectiveMaxSteer = dim.maxSteer * (1 - speedRatio * 0.45);
  v.targetSteerAngle = steerIntent * effectiveMaxSteer;

  // Smooth steer lerp
  v.steerAngle += (v.targetSteerAngle - v.steerAngle) * Math.min(1, dim.steerSpeed * dt);

  // Boosting
  v.isBoosting = inputs.boost && v.fuel > 0 && inputs.forward;
  if (v.isBoosting) {
    v.fuel = Math.max(0, v.fuel - 2.5 * dt);
  } else {
    v.fuel = Math.min(100, v.fuel + 1.2 * dt); // slow regen
  }

  const topSpeed = v.isBoosting ? dim.maxSpeed * dim.boostMultiplier : dim.maxSpeed;
  const accelPower = v.isBoosting ? dim.accel * 1.5 : dim.accel;

  // Acceleration / Braking
  v.isBraking = inputs.brake;
  v.isDrifting = inputs.brake && Math.abs(v.speed) > 6.0;

  if (inputs.forward) {
    if (v.speed < -0.5) {
      // Reversing -> forward acts as brake
      v.speed += dim.brakeDecel * dt;
    } else {
      v.speed += accelPower * dt;
      if (v.speed > topSpeed) v.speed = topSpeed;
    }
  } else if (inputs.backward) {
    if (v.speed > 0.5) {
      // Forward -> backward acts as brake
      v.speed -= dim.brakeDecel * dt;
    } else {
      v.speed -= (accelPower * 0.6) * dt;
      if (v.speed < -dim.reverseMaxSpeed) v.speed = -dim.reverseMaxSpeed;
    }
  } else {
    // Natural coasting friction
    const friction = dim.naturalFriction * (isWetOrSnowy ? 0.65 : 1.0);
    if (v.speed > 0) {
      v.speed = Math.max(0, v.speed - friction * dt);
    } else if (v.speed < 0) {
      v.speed = Math.min(0, v.speed + friction * dt);
    }
  }

  // Handbrake friction
  if (v.isBraking) {
    const brakeForce = dim.brakeDecel * (v.isDrifting ? 0.75 : 1.25);
    if (v.speed > 0) {
      v.speed = Math.max(0, v.speed - brakeForce * dt);
    } else if (v.speed < 0) {
      v.speed = Math.min(0, v.speed + brakeForce * dt);
    }
  }

  // Yaw rotation based on steer angle and speed
  const turnDirection = v.speed >= 0 ? 1 : -1;
  const driftBonus = v.isDrifting ? 1.6 : 1.0;
  const yawRate = (v.speed / dim.halfLength) * Math.sin(v.steerAngle) * driftBonus;
  v.yaw += yawRate * dt * turnDirection;

  // Position update
  const forwardX = Math.sin(v.yaw);
  const forwardZ = Math.cos(v.yaw);
  v.x += forwardX * v.speed * dt;
  v.z += forwardZ * v.speed * dt;

  // Boundary soft rebound if player drives past world edge
  const distFromCenter = Math.hypot(v.x, v.z);
  if (distFromCenter > 185) {
    v.speed *= 0.5;
    const nx = -v.x / distFromCenter;
    const nz = -v.z / distFromCenter;
    v.x += nx * 2.0;
    v.z += nz * 2.0;
  }

  // 4-Wheel contact terrain sampling
  // Wheel local offsets:
  // FL: (+w, +l), FR: (-w, +l), RL: (+w, -l), RR: (-w, -l)
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

  // Ground elevation under vehicle center
  const avgGroundY = (flY + frY + rlY + rrY) * 0.25;
  const targetY = avgGroundY + dim.rideHeight;

  // Smooth suspension damping on Y
  v.y += (targetY - v.y) * Math.min(1, 14.0 * dt);

  // Calculate pitch and roll angles from 4 wheel contacts
  const frontY = (flY + frY) * 0.5;
  const rearY = (rlY + rrY) * 0.5;
  const leftY = (flY + rlY) * 0.5;
  const rightY = (frY + rrY) * 0.5;

  const targetPitch = Math.atan2(frontY - rearY, dim.halfLength * 2);
  const targetRoll = Math.atan2(leftY - rightY, dim.halfWidth * 2);

  v.pitch += (targetPitch - v.pitch) * Math.min(1, 12.0 * dt);
  v.roll += (targetRoll - v.roll) * Math.min(1, 12.0 * dt);

  // Wheel spin rotation (circumference = 2 * PI * r)
  const distTraveled = v.speed * dt;
  const wheelDelta = distTraveled / dim.wheelRadius;
  v.wheelRotations[0] += wheelDelta;
  v.wheelRotations[1] += wheelDelta;
  v.wheelRotations[2] += wheelDelta;
  v.wheelRotations[3] += wheelDelta;

  // Compute suspension offset for visual shocks
  v.suspensionOffsets[0] = Math.max(-0.25, Math.min(0.25, (flY - (v.y - dim.rideHeight))));
  v.suspensionOffsets[1] = Math.max(-0.25, Math.min(0.25, (frY - (v.y - dim.rideHeight))));
  v.suspensionOffsets[2] = Math.max(-0.25, Math.min(0.25, (rlY - (v.y - dim.rideHeight))));
  v.suspensionOffsets[3] = Math.max(-0.25, Math.min(0.25, (rrY - (v.y - dim.rideHeight))));

  // RPM and Gear calculation
  const absSpeed = Math.abs(v.speed);
  if (v.speed < -0.1) {
    v.gear = -1;
    v.rpm = 1000 + (absSpeed / dim.reverseMaxSpeed) * 3500;
  } else if (absSpeed < 0.1) {
    v.gear = 1;
    v.rpm = inputs.forward ? 2200 : 850;
  } else {
    // 5 gears
    if (absSpeed < 5) v.gear = 1;
    else if (absSpeed < 11) v.gear = 2;
    else if (absSpeed < 18) v.gear = 3;
    else if (absSpeed < 24) v.gear = 4;
    else v.gear = 5;

    const gearSpeedRanges = [0, 5, 11, 18, 24, dim.maxSpeed * 1.5];
    const low = gearSpeedRanges[v.gear - 1];
    const high = gearSpeedRanges[v.gear];
    const gearFraction = (absSpeed - low) / (high - low);
    v.rpm = 1500 + gearFraction * 4500;
  }
}

/**
 * Step player on-foot character physics
 */
export function stepPlayerPhysics(
  p: PlayerCharacterState,
  inputs: InputState,
  cameraYaw: number,
  dt: number
): void {
  if (p.inVehicle) return;

  const moveSpeed = inputs.boost ? 7.5 : 4.0; // sprint vs walk
  p.isSprinting = inputs.boost;

  let moveX = 0;
  let moveZ = 0;

  if (inputs.steerAxis !== undefined && inputs.throttleAxis !== undefined && (Math.abs(inputs.steerAxis) > 0.05 || Math.abs(inputs.throttleAxis) > 0.05)) {
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

    // Relative to camera yaw
    const forwardX = Math.sin(cameraYaw);
    const forwardZ = Math.cos(cameraYaw);
    const rightX = Math.cos(cameraYaw);
    const rightZ = -Math.sin(cameraYaw);

    const worldDx = forwardX * normZ + rightX * normX;
    const worldDz = forwardZ * normZ + rightZ * normX;

    p.x += worldDx * moveSpeed * dt;
    p.z += worldDz * moveSpeed * dt;

    p.yaw = Math.atan2(worldDx, worldDz);
  }

  // Terrain ground check & gravity
  const groundY = getTerrainHeight(p.x, p.z);
  const gravity = 18.0;

  if (p.isGrounded) {
    if (inputs.brake) { // Space key = Jump on foot
      p.vy = 6.2;
      p.isGrounded = false;
    } else {
      p.y = groundY;
      p.vy = 0;
    }
  } else {
    p.vy -= gravity * dt;
    p.y += p.vy * dt;
    if (p.y <= groundY) {
      p.y = groundY;
      p.vy = 0;
      p.isGrounded = true;
    }
  }
}
