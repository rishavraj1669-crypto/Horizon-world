import test from 'node:test';
import assert from 'node:assert/strict';
import { getTerrainHeight, getTerrainNormal, getRoadFactor, getBiomeAt } from './terrain.ts';
import { createInitialVehicle, createInitialPlayer, stepVehiclePhysics, stepPlayerPhysics } from './physics.ts';
import { WEATHER_PROFILES, formatTimeOfDay, getSunPosition } from './weather.ts';
import { NPCS, INITIAL_QUESTS } from './npcData.ts';

test('Terrain height generation is deterministic and grounded', () => {
  const h1 = getTerrainHeight(0, 0);
  const h2 = getTerrainHeight(0, 0);
  assert.equal(h1, h2, 'Terrain height must be deterministic');
  assert.ok(h1 > 0, 'Spawn height should be above sea level');

  // Highland watchtower height
  const towerH = getTerrainHeight(65, -70);
  assert.ok(typeof towerH === 'number' && !isNaN(towerH), 'Tower height must be a valid number');

  // Lake depression near (40, 95)
  const lakeH = getTerrainHeight(40, 95);
  assert.ok(lakeH < h1 + 5, 'Lake basin should be lower than surrounding hills');

  // Mountain perimeter at edge
  const edgeH = getTerrainHeight(180, 0);
  assert.ok(edgeH > h1, 'Perimeter boundary should rise sharply as natural mountains');
});

test('Terrain normal is normalized unit vector', () => {
  const normal = getTerrainNormal(10, 10);
  const len = Math.hypot(normal.x, normal.y, normal.z);
  assert.ok(Math.abs(len - 1.0) < 0.001, 'Terrain normal length should be 1.0');
  assert.ok(normal.y > 0, 'Terrain normal Y must point upward');
});

test('Road factor correctly detects road paths', () => {
  const roadNearSpawn = getRoadFactor(0, 0);
  assert.ok(roadNearSpawn > 0.5, 'Spawn (0, 0) should be on the road network');

  const offRoad = getRoadFactor(120, -120);
  assert.equal(offRoad, 0, 'Distant wilderness should have zero road factor');
});

test('Biomes are correctly classified', () => {
  const spawnBiome = getBiomeAt(0, 0);
  assert.ok(['road', 'grass', 'sand'].includes(spawnBiome), 'Spawn biome should be valid');

  const lakeBiome = getBiomeAt(40, 95);
  assert.ok(typeof lakeBiome === 'string', 'Lake biome should return string type');
});

test('Vehicle physics accelerates forward and updates RPM and gear', () => {
  const vehicle = createInitialVehicle(0, 0);
  assert.equal(vehicle.speed, 0);
  assert.equal(vehicle.gear, 1);

  // Apply forward acceleration for 1 second
  for (let i = 0; i < 20; i++) {
    stepVehiclePhysics(
      vehicle,
      {
        forward: true,
        backward: false,
        left: false,
        right: false,
        brake: false,
        boost: false,
        interact: false,
        toggleHeadlights: false,
        horn: false,
        resetVehicle: false,
      },
      0.05
    );
  }

  assert.ok(vehicle.speed > 0, 'Vehicle speed should increase when forward is pressed');
  assert.ok(vehicle.rpm > 1000, 'Engine RPM should rise under acceleration');
});

test('Vehicle braking stops forward momentum', () => {
  const vehicle = createInitialVehicle(0, 0);
  vehicle.speed = 15.0;

  for (let i = 0; i < 20; i++) {
    stepVehiclePhysics(
      vehicle,
      {
        forward: false,
        backward: false,
        left: false,
        right: false,
        brake: true,
        boost: false,
        interact: false,
        toggleHeadlights: false,
        horn: false,
        resetVehicle: false,
      },
      0.05
    );
  }

  assert.ok(vehicle.speed < 5.0, 'Braking must rapidly decrease speed');
});

test('Touch control analog axes steer and accelerate correctly', () => {
  const vehicle = createInitialVehicle(0, 0);

  // Apply touch joystick analog steer (steerAxis = 0.8 -> steer left) and forward
  stepVehiclePhysics(
    vehicle,
    {
      forward: true,
      backward: false,
      left: false,
      right: false,
      brake: false,
      boost: false,
      interact: false,
      toggleHeadlights: false,
      horn: false,
      resetVehicle: false,
      steerAxis: 0.8,
      throttleAxis: 1.0,
    },
    0.1
  );

  assert.ok(vehicle.targetSteerAngle > 0.2, 'steerAxis should set positive target steer angle');
  assert.ok(vehicle.speed > 0, 'throttleAxis should accelerate vehicle forward');
});

test('Player on-foot movement updates position and respects ground', () => {
  const player = createInitialPlayer(0, 0);
  player.inVehicle = false;
  const startX = player.x;

  stepPlayerPhysics(
    player,
    {
      forward: true,
      backward: false,
      left: false,
      right: false,
      brake: false,
      boost: false,
      interact: false,
      toggleHeadlights: false,
      horn: false,
      resetVehicle: false,
    },
    0, // camera facing north
    0.1
  );

  assert.ok(player.isWalking, 'Player should be in walking state');
  assert.ok(player.z > 0, 'Player should have moved forward');
  assert.ok(player.isGrounded, 'Player should remain grounded on terrain');
});

test('Weather profiles include all requested atmospheric states', () => {
  const requiredWeathers = ['clear', 'overcast', 'rain', 'thunder', 'snow', 'mist'];
  for (const w of requiredWeathers) {
    const profile = WEATHER_PROFILES[w as keyof typeof WEATHER_PROFILES](12);
    assert.ok(profile.name, `Weather ${w} must have a name`);
    assert.ok(profile.fogColor, `Weather ${w} must specify fog color`);
    assert.ok(profile.sunIntensity >= 0, `Weather ${w} must specify sun intensity`);
  }
});

test('Time formatting helper formats 24hr correctly', () => {
  assert.equal(formatTimeOfDay(14.5), '14:30');
  assert.equal(formatTimeOfDay(8.0), '08:00');
  assert.equal(formatTimeOfDay(0.25), '00:15');
});

test('NPC definitions and Quests are properly linked', () => {
  assert.ok(NPCS.length >= 3, 'Must have at least 3 distinct interactive NPCs');
  assert.ok(INITIAL_QUESTS.length >= 2, 'Must have at least 2 open-world quests');

  const jax = NPCS.find((n) => n.id === 'jax');
  assert.ok(jax, 'Ranger Jax must be defined');
  assert.ok(jax.dialogues['jax_intro'], 'Jax must have intro dialogue');

  const chloe = NPCS.find((n) => n.id === 'chloe');
  assert.ok(chloe, 'Mechanic Chloe must be defined');
});

test('City skyscrapers and building collision detection work accurately', async () => {
  const { BUILDINGS, getBuildingAt, findWebSwingAnchor } = await import('./cityData.ts');
  assert.ok(BUILDINGS.length >= 10, 'Must have at least 10 tall skyscrapers');

  // Stark Tower is at (0, -35) with height 165m
  const starkTower = getBuildingAt(0, -35);
  assert.ok(starkTower !== null, 'Should detect Stark Tower at (0, -35)');
  assert.equal(starkTower?.name, 'Stark Metropolis Tower');
  assert.ok(starkTower!.height >= 150, 'Stark Tower should be at least 150m tall');

  // Open street at (0, 0) has no building
  const openStreet = getBuildingAt(0, 0);
  assert.equal(openStreet, null, 'Center intersection (0, 0) should be open street');

  // Web swing anchor search finds tall skyscraper facing player
  const anchor = findWebSwingAnchor(0, 20, 0, 0, -1, 85);
  assert.ok(anchor !== null, 'Should find high anchor point on nearby skyscraper');
  assert.ok(anchor!.y > 30, 'Anchor must be high up the building for swinging');
});

test('Spider-Man combat combos, web shots, and spider-sense dodge work correctly', async () => {
  const { INITIAL_COMBAT_STATE, executeMeleeAttack, executeWebShoot, executeSpiderSenseDodge } = await import('./combat.ts');
  type ThugType = import('./combat.ts').ThugEntity;
  const combatState = { ...INITIAL_COMBAT_STATE };

  const testThug: ThugType = {
    id: 'test_thug_1',
    name: 'Syndicate Enforcer',
    x: 2.0,
    y: 0,
    z: 0,
    yaw: 0,
    health: 100,
    maxHealth: 100,
    state: 'idle',
    attackTimer: 0,
    webbedTimer: 0,
    hurtTimer: 0,
  };

  // 1. Melee attack hit test
  const hitResult = executeMeleeAttack([testThug], 0, 0, 0, 0, combatState);
  assert.ok(hitResult.hitThug !== null, 'Should hit the thug in melee range');
  assert.ok(hitResult.damage > 0, 'Damage must be greater than zero');
  assert.equal(combatState.comboCount, 1, 'Combo count should increment to 1');
  assert.ok(testThug.health < 100, 'Thug health must decrease after hit');

  // 2. Web shooter immobilize
  const webResult = executeWebShoot([testThug], 0, 0, 0, 0, combatState);
  assert.ok(webResult.targetThug !== null, 'Should immobilize thug with web shooter');
  assert.equal(testThug.state, 'webbed', 'Thug state must transition to webbed');
  assert.ok(testThug.webbedTimer > 0, 'Webbed timer must be active');

  // 3. Spider-sense dodge reflex
  testThug.state = 'windup';
  combatState.spiderSenseActive = true;
  combatState.spiderSenseSourceId = testThug.id;
  const dodgeResult = executeSpiderSenseDodge(combatState, [testThug], 0, 0, 0);
  assert.equal(dodgeResult.isPerfectDodge, true, 'Should execute perfect spider-sense dodge');
  assert.equal(combatState.spiderSenseActive, false, 'Spider-sense should clear after dodge');
});

