/**
 * Three.js 3D Open World Scene Manager
 * Procedural PBR terrain, composite 3D vehicle, interactive NPCs,
 * atmospheric landmarks, weather particle systems, and dynamic day/night lighting.
 */

import * as THREE from 'three';
import {
  getTerrainHeight,
  getTerrainNormal,
  getRoadFactor,
  WORLD_SIZE,
  WATER_LEVEL,
} from './terrain';
import {
  VehicleState,
  PlayerCharacterState,
  InputState,
  stepVehiclePhysics,
  stepPlayerPhysics,
  createInitialVehicle,
  createInitialPlayer,
} from './physics';
import {
  WeatherType,
  WEATHER_PROFILES,
  getSunPosition,
} from './weather';
import { NPCS, NPCDefinition, Quest } from './npcData';
import { soundEngine } from './audio';

// Pre-allocated scratch vectors to prevent GC spikes in animation loop
const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _vec3C = new THREE.Vector3();
const _quatA = new THREE.Quaternion();

export type CameraMode = 'chase' | 'cockpit' | 'orbit';

export interface WorldCallbacks {
  onSpeedChange: (speedKmh: number, rpm: number, gear: number) => void;
  onVehicleStateChange: (inVehicle: boolean, headlights: boolean, fuel: number) => void;
  onInteractPrompt: (promptText: string | null, targetNpc: NPCDefinition | null) => void;
  onQuestUpdate: (updatedQuests: Quest[]) => void;
  onCoordinatesChange: (x: number, z: number, headingDeg: number) => void;
}

export class WorldScene {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private clock: THREE.Clock;

  // Lighting & Environment
  private sunLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private skyDome: THREE.Mesh;
  private waterMesh: THREE.Mesh;

  // Procedural Actors
  public vehicleState: VehicleState;
  public playerState: PlayerCharacterState;
  private vehicleGroup: THREE.Group;
  private wheelMeshes: THREE.Group[] = [];
  private leftHeadlight: THREE.SpotLight;
  private rightHeadlight: THREE.SpotLight;
  private leftHeadlightTarget: THREE.Object3D;
  private rightHeadlightTarget: THREE.Object3D;
  private tailLightsMaterial: THREE.MeshStandardMaterial;

  private playerGroup: THREE.Group;
  private npcGroups: Map<string, THREE.Group> = new Map();

  // Dynamic Weather
  public weather: WeatherType = 'clear';
  public timeOfDay: number = 13.5; // Starts at afternoon sun
  public autoTimeProgression: boolean = true;
  private precipitationParticles: THREE.Points | null = null;
  private precipitationGeo: THREE.BufferGeometry | null = null;
  private rainMaterial: THREE.PointsMaterial | null = null;
  private snowMaterial: THREE.PointsMaterial | null = null;
  private lightningTimer: number = 0;

  // Camera & Input
  public cameraMode: CameraMode = 'chase';
  public isTitleScreen: boolean = false;
  public isPaused: boolean = false;
  private titlePanAngle: number = 0;
  private orbitAngle: number = 0;

  // Active inputs
  public inputs: InputState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    brake: false,
    boost: false,
    interact: false,
    toggleHeadlights: false,
    horn: false,
    resetVehicle: false,
  };

  private quests: Quest[];
  private callbacks: WorldCallbacks;
  private isHeadless: boolean;
  private animFrameId: number | null = null;

  // Landmark interactive objects
  private windmillBlades: THREE.Group | null = null;
  private beaconLight: THREE.PointLight | null = null;
  private campfireLight: THREE.PointLight | null = null;

  constructor(
    container: HTMLElement,
    callbacks: WorldCallbacks,
    initialQuests: Quest[],
    isTitle: boolean = false
  ) {
    this.container = container;
    this.callbacks = callbacks;
    this.quests = [...initialQuests];
    this.isTitleScreen = isTitle;

    this.isHeadless =
      typeof navigator !== 'undefined' &&
      (Boolean(navigator.webdriver) || /HeadlessChrome/i.test(navigator.userAgent));

    this.vehicleState = createInitialVehicle(0, 0);
    this.playerState = createInitialPlayer(0, 0);

    // Three.js Core Setup
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.2,
      600
    );
    this.clock = new THREE.Clock();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isHeadless,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(this.isHeadless ? 1 : Math.min(window.devicePixelRatio, 1.8));
    this.renderer.setSize(container.clientWidth, container.clientHeight);

    if (!this.isHeadless) {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    container.appendChild(this.renderer.domElement);

    // Lighting setup
    this.hemiLight = new THREE.HemisphereLight('#cce3de', '#4a5568', 0.85);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight('#fff8ea', 2.0);
    this.sunLight.position.set(100, 150, 80);
    this.sunLight.castShadow = !this.isHeadless;
    if (this.sunLight.castShadow) {
      this.sunLight.shadow.mapSize.width = 1024;
      this.sunLight.shadow.mapSize.height = 1024;
      this.sunLight.shadow.camera.near = 10;
      this.sunLight.shadow.camera.far = 400;
      const d = 45;
      this.sunLight.shadow.camera.left = -d;
      this.sunLight.shadow.camera.right = d;
      this.sunLight.shadow.camera.top = d;
      this.sunLight.shadow.camera.bottom = -d;
      this.sunLight.shadow.bias = -0.0006;
    }
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    // Build World Elements
    this.skyDome = this.createSkyDome();
    this.scene.add(this.skyDome);

    this.waterMesh = this.createWater();
    this.scene.add(this.waterMesh);

    this.createTerrain();
    this.createSceneryFoliage();
    this.createLandmarks();
    this.createNPCs();

    // Drivable Vehicle and Character
    const { group, wheels, leftLight, rightLight, leftTarget, rightTarget, tailMat } = this.createVehicleMesh();
    this.vehicleGroup = group;
    this.wheelMeshes = wheels;
    this.leftHeadlight = leftLight;
    this.rightHeadlight = rightLight;
    this.leftHeadlightTarget = leftTarget;
    this.rightHeadlightTarget = rightTarget;
    this.tailLightsMaterial = tailMat;
    this.scene.add(this.vehicleGroup);

    this.playerGroup = this.createPlayerMesh();
    this.scene.add(this.playerGroup);

    // Weather Particles
    this.setupPrecipitationParticles();

    // Initial weather application
    this.applyWeatherAndLighting();

    // Resize observer
    window.addEventListener('resize', this.onWindowResize);

    // Pre-warm shaders
    this.renderer.compile(this.scene, this.camera);

    // Kick off animation loop
    this.tick = this.tick.bind(this);
    this.animFrameId = requestAnimationFrame(this.tick);
  }

  /**
   * Sky Dome with procedural hemispherical gradient
   */
  private createSkyDome(): THREE.Mesh {
    const geo = new THREE.SphereGeometry(450, 24, 16);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x3a86ff,
      side: THREE.BackSide,
      depthWrite: false,
    });
    return new THREE.Mesh(geo, mat);
  }

  /**
   * Shimmering Water Lake Plane
   */
  private createWater(): THREE.Mesh {
    const geo = new THREE.PlaneGeometry(110, 110, 24, 24);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x1d3557,
      roughness: 0.15,
      metalness: 0.8,
      transparent: true,
      opacity: 0.88,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(40, WATER_LEVEL, 95);
    return mesh;
  }

  /**
   * Procedural terrain mesh with vertex colors for meadows, rocky slopes, dirt roads, and alpine snow
   */
  private createTerrain(): void {
    const segs = this.isHeadless ? 90 : 160;
    const size = WORLD_SIZE;
    const geo = new THREE.PlaneGeometry(size, size, segs, segs);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);

    const cWater = new THREE.Color(0x386641);
    const cSand = new THREE.Color(0xd4a373);
    const cGrass = new THREE.Color(0x40916c);
    const cHighland = new THREE.Color(0x52796f);
    const cRock = new THREE.Color(0x4a4e69);
    const cSnow = new THREE.Color(0xe9ecef);
    const cRoad = new THREE.Color(0x7f5539);

    const tempColor = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vz = pos.getZ(i);
      const vy = getTerrainHeight(vx, vz);
      pos.setY(i, vy);

      const roadFactor = getRoadFactor(vx, vz);

      if (roadFactor > 0.3) {
        tempColor.copy(cRoad).lerp(cGrass, (1 - roadFactor) * 0.4);
      } else if (vy < WATER_LEVEL + 1.2) {
        tempColor.copy(cSand);
      } else if (vy < 10) {
        tempColor.copy(cGrass);
      } else if (vy < 18) {
        tempColor.copy(cHighland);
      } else if (vy < 28) {
        tempColor.copy(cRock);
      } else {
        tempColor.copy(cSnow);
      }

      colors[i * 3] = tempColor.r;
      colors[i * 3 + 1] = tempColor.g;
      colors[i * 3 + 2] = tempColor.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.85,
      metalness: 0.1,
      flatShading: false,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = !this.isHeadless;
    this.scene.add(mesh);
  }

  /**
   * Instanced vegetation and natural boulders
   */
  private createSceneryFoliage(): void {
    // 1. Instanced Pine Trees (multi-tier composite)
    const treeCount = this.isHeadless ? 120 : 320;
    const trunkGeo = new THREE.CylinderGeometry(0.2, 0.35, 2.2, 6);
    trunkGeo.translate(0, 1.1, 0);
    const foliageGeo = new THREE.ConeGeometry(1.6, 4.0, 7);
    foliageGeo.translate(0, 3.8, 0);

    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 0.9 });
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x1b4332, roughness: 0.8 });

    const trunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
    const foliageMesh = new THREE.InstancedMesh(foliageGeo, foliageMat, treeCount);
    trunkMesh.castShadow = !this.isHeadless;
    foliageMesh.castShadow = !this.isHeadless;

    const dummy = new THREE.Object3D();
    const tintColor = new THREE.Color();
    let placed = 0;

    // Deterministic pseudo-random placement avoiding roads and water
    for (let i = 0; i < treeCount * 3 && placed < treeCount; i++) {
      const angle = (i * 137.5 * Math.PI) / 180;
      const radius = 12 + Math.sqrt(i) * 9.5;
      if (radius > 175) continue;

      const px = Math.cos(angle) * radius;
      const pz = Math.sin(angle) * radius;
      const py = getTerrainHeight(px, pz);

      if (py < WATER_LEVEL + 1.5 || py > 26) continue;
      if (getRoadFactor(px, pz) > 0.25) continue;
      // Avoid spawn and landmarks
      if (Math.hypot(px, pz) < 15) continue;

      const scale = 0.8 + (Math.sin(i * 3.1) * 0.5 + 0.5) * 0.5;
      dummy.position.set(px, py, pz);
      dummy.rotation.y = Math.sin(i * 2.3) * Math.PI;
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();

      trunkMesh.setMatrixAt(placed, dummy.matrix);
      foliageMesh.setMatrixAt(placed, dummy.matrix);

      tintColor.setHex(0x1b4332).offsetHSL(0, 0, (Math.sin(i) * 0.1));
      foliageMesh.setColorAt(placed, tintColor);

      placed++;
    }

    trunkMesh.count = placed;
    foliageMesh.count = placed;
    trunkMesh.instanceMatrix.needsUpdate = true;
    foliageMesh.instanceMatrix.needsUpdate = true;
    if (foliageMesh.instanceColor) foliageMesh.instanceColor.needsUpdate = true;
    trunkMesh.computeBoundingSphere();
    foliageMesh.computeBoundingSphere();

    this.scene.add(trunkMesh);
    this.scene.add(foliageMesh);

    // 2. Instanced Rocks and Boulders
    const rockCount = this.isHeadless ? 40 : 100;
    const rockGeo = new THREE.DodecahedronGeometry(1.2, 1);
    rockGeo.translate(0, 0.6, 0);
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x6c757d, roughness: 0.95 });
    const rockMesh = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);
    rockMesh.castShadow = !this.isHeadless;

    let rockPlaced = 0;
    for (let i = 0; i < rockCount * 2 && rockPlaced < rockCount; i++) {
      const rx = Math.sin(i * 4.7) * 140;
      const rz = Math.cos(i * 5.9) * 140;
      const ry = getTerrainHeight(rx, rz);
      if (getRoadFactor(rx, rz) > 0.3) continue;

      dummy.position.set(rx, ry - 0.2, rz);
      dummy.rotation.set(Math.sin(i), Math.cos(i), 0);
      const s = 0.7 + (Math.sin(i * 1.8) * 0.5 + 0.5) * 1.4;
      dummy.scale.set(s, s * 0.75, s);
      dummy.updateMatrix();

      rockMesh.setMatrixAt(rockPlaced, dummy.matrix);
      rockPlaced++;
    }
    rockMesh.count = rockPlaced;
    rockMesh.instanceMatrix.needsUpdate = true;
    rockMesh.computeBoundingSphere();
    this.scene.add(rockMesh);
  }

  /**
   * Architectural Landmarks: Watchtower, Workshop, Lake Camp, Windmill, Echo Antenna
   */
  private createLandmarks(): void {
    // 1. Highland Watchtower at (65, -70)
    const towerGroup = new THREE.Group();
    const towerH = getTerrainHeight(65, -70);
    towerGroup.position.set(65, towerH, -70);

    const postMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.85 });
    const platformMat = new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.8 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x9e2a2b, roughness: 0.6 });

    // 4 sturdy timber stilts
    for (const [ox, oz] of [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 9, 6), postMat);
      post.position.set(ox, 4.5, oz);
      post.castShadow = !this.isHeadless;
      towerGroup.add(post);
    }
    // Observation deck
    const deck = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.4, 4.2), platformMat);
    deck.position.set(0, 8.8, 0);
    deck.castShadow = !this.isHeadless;
    towerGroup.add(deck);

    // Railing
    const rail = new THREE.Mesh(new THREE.BoxGeometry(4.0, 1.0, 4.0), platformMat);
    rail.position.set(0, 9.5, 0);
    towerGroup.add(rail);

    // Pyramid roof
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.2, 2.0, 4), roofMat);
    roof.position.set(0, 11.8, 0);
    roof.rotation.y = Math.PI / 4;
    towerGroup.add(roof);

    this.scene.add(towerGroup);

    // 2. Meadow Workshop at (-80, -40)
    const shopGroup = new THREE.Group();
    const shopH = getTerrainHeight(-80, -40);
    shopGroup.position.set(-80, shopH, -40);

    const shopMat = new THREE.MeshStandardMaterial({ color: 0x495057, roughness: 0.7 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.85 });

    const shed = new THREE.Mesh(new THREE.BoxGeometry(7, 3.6, 6), shopMat);
    shed.position.set(0, 1.8, 0);
    shed.castShadow = !this.isHeadless;
    shopGroup.add(shed);

    const garageDoor = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.8, 0.2), woodMat);
    garageDoor.position.set(0, 1.4, 3.01);
    shopGroup.add(garageDoor);

    this.scene.add(shopGroup);

    // 3. Whispering Lake Camp at (40, 95)
    const campGroup = new THREE.Group();
    const campH = getTerrainHeight(40, 95);
    campGroup.position.set(40, campH, 95);

    // Tent
    const tentGeo = new THREE.ConeGeometry(2.2, 2.4, 3);
    const tentMat = new THREE.MeshStandardMaterial({ color: 0xf4a261, roughness: 0.7 });
    const tent = new THREE.Mesh(tentGeo, tentMat);
    tent.position.set(2, 1.2, 0);
    tent.rotation.y = Math.PI / 6;
    campGroup.add(tent);

    // Campfire with animated point light
    const fireGeo = new THREE.CylinderGeometry(0.4, 0.6, 0.2, 8);
    const fireMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });
    const firePit = new THREE.Mesh(fireGeo, fireMat);
    firePit.position.set(-1.5, 0.1, -1.5);
    campGroup.add(firePit);

    this.campfireLight = new THREE.PointLight('#ff7b00', 1.8, 18);
    this.campfireLight.position.set(-1.5, 0.8, -1.5);
    campGroup.add(this.campfireLight);

    this.scene.add(campGroup);

    // 4. Echo Ridge Antenna at (-95, 85)
    const antennaGroup = new THREE.Group();
    const antennaH = getTerrainHeight(-95, 85);
    antennaGroup.position.set(-95, antennaH, 85);

    const mastMat = new THREE.MeshStandardMaterial({ color: 0xe0e1dd, metalness: 0.7, roughness: 0.3 });
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.6, 26, 6), mastMat);
    mast.position.set(0, 13, 0);
    antennaGroup.add(mast);

    // Cross spars
    for (let h = 6; h <= 22; h += 4) {
      const spar = new THREE.Mesh(new THREE.BoxGeometry(3 - h * 0.08, 0.1, 0.1), mastMat);
      spar.position.set(0, h, 0);
      antennaGroup.add(spar);
    }

    // Aviation red warning beacon light
    const beaconSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xff0033 })
    );
    beaconSphere.position.set(0, 26.2, 0);
    antennaGroup.add(beaconSphere);

    this.beaconLight = new THREE.PointLight('#ff0033', 2.5, 30);
    this.beaconLight.position.set(0, 26.4, 0);
    antennaGroup.add(this.beaconLight);

    this.scene.add(antennaGroup);

    // 5. Windmill Crag at (-25, -95)
    const windmill = new THREE.Group();
    const windH = getTerrainHeight(-25, -95);
    windmill.position.set(-25, windH, -95);

    const stoneTower = new THREE.Mesh(
      new THREE.CylinderGeometry(2.0, 3.2, 11, 8),
      new THREE.MeshStandardMaterial({ color: 0x778da9, roughness: 0.9 })
    );
    stoneTower.position.set(0, 5.5, 0);
    stoneTower.castShadow = !this.isHeadless;
    windmill.add(stoneTower);

    this.windmillBlades = new THREE.Group();
    this.windmillBlades.position.set(0, 10.5, 2.2);

    const bladeMat = new THREE.MeshStandardMaterial({ color: 0xede0d4, roughness: 0.6 });
    for (let b = 0; b < 4; b++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4.2, 0.08), bladeMat);
      blade.position.set(0, 2.1, 0);
      const arm = new THREE.Group();
      arm.rotation.z = (b * Math.PI) / 2;
      arm.add(blade);
      this.windmillBlades.add(arm);
    }
    windmill.add(this.windmillBlades);
    this.scene.add(windmill);
  }

  /**
   * Hero Procedural 3D Drivable Vehicle (Composite 3–12 part THREE.Group)
   */
  private createVehicleMesh(): {
    group: THREE.Group;
    wheels: THREE.Group[];
    leftLight: THREE.SpotLight;
    rightLight: THREE.SpotLight;
    leftTarget: THREE.Object3D;
    rightTarget: THREE.Object3D;
    tailMat: THREE.MeshStandardMaterial;
  } {
    const group = new THREE.Group();

    // Materials
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x2b9348, // Forest explorer green
      roughness: 0.4,
      metalness: 0.35,
    });
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a, // Matte dark steel chassis
      roughness: 0.8,
      metalness: 0.5,
    });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x102a43,
      roughness: 0.1,
      metalness: 0.9,
      transparent: true,
      opacity: 0.65,
    });
    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x1f2421,
      roughness: 0.9,
      metalness: 0.05,
    });
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xd8d8d8,
      roughness: 0.25,
      metalness: 0.85,
    });
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.15,
      metalness: 0.95,
    });
    const tailMat = new THREE.MeshStandardMaterial({
      color: 0xff002b,
      emissive: 0x880000,
      emissiveIntensity: 0.6,
      roughness: 0.3,
    });

    // 1. Lower chassis frame
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.45, 3.8), frameMat);
    chassis.position.set(0, 0.25, 0);
    chassis.castShadow = !this.isHeadless;
    group.add(chassis);

    // 2. Main vehicle cabin / body
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.75, 2.2), bodyMat);
    cabin.position.set(0, 0.8, -0.3);
    cabin.castShadow = !this.isHeadless;
    group.add(cabin);

    // 3. Sloped Front Hood & Engine Grille
    const hood = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 1.4), bodyMat);
    hood.position.set(0, 0.62, 1.3);
    hood.castShadow = !this.isHeadless;
    group.add(hood);

    const grille = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.3, 0.1), frameMat);
    grille.position.set(0, 0.55, 2.01);
    group.add(grille);

    // 4. Cockpit Windshield & Side Windows
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.5, 0.6), glassMat);
    windshield.position.set(0, 0.95, 0.7);
    windshield.rotation.x = -Math.PI / 7;
    group.add(windshield);

    // 5. Heavy-Duty Steel Roll-Cage / Roof Rack
    const cageGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.1, 6);
    cageGeo.rotateX(Math.PI / 2);
    for (const rx of [-0.85, 0.85]) {
      const rail = new THREE.Mesh(cageGeo, chromeMat);
      rail.position.set(rx, 1.25, -0.3);
      group.add(rail);
    }

    // Spare tire mounted on roof rack
    const spareTire = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.28, 12), tireMat);
    spareTire.position.set(0, 1.35, -0.4);
    group.add(spareTire);

    // 6. Bull-bar front bumper
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.25, 0.3), chromeMat);
    bumper.position.set(0, 0.28, 2.05);
    group.add(bumper);

    // 7. Headlight Projectors & SpotLights
    const leftTarget = new THREE.Object3D();
    leftTarget.position.set(0.65, 0.3, 20);
    group.add(leftTarget);

    const rightTarget = new THREE.Object3D();
    rightTarget.position.set(-0.65, 0.3, 20);
    group.add(rightTarget);

    const leftLight = new THREE.SpotLight(0xfff1cf, 2.8, 48, Math.PI / 6, 0.4, 1.0);
    leftLight.position.set(0.65, 0.55, 2.0);
    leftLight.target = leftTarget;
    leftLight.castShadow = !this.isHeadless;
    group.add(leftLight);

    const rightLight = new THREE.SpotLight(0xfff1cf, 2.8, 48, Math.PI / 6, 0.4, 1.0);
    rightLight.position.set(-0.65, 0.55, 2.0);
    rightLight.target = rightTarget;
    rightLight.castShadow = !this.isHeadless;
    group.add(rightLight);

    // Glowing headlight bulbs
    for (const hx of [0.65, -0.65]) {
      const bulb = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 0.08, 12),
        new THREE.MeshBasicMaterial({ color: 0xfff6db })
      );
      bulb.rotateX(Math.PI / 2);
      bulb.position.set(hx, 0.55, 2.02);
      group.add(bulb);
    }

    // 8. Rear Tail Lights
    for (const tx of [0.75, -0.75]) {
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.15, 0.05), tailMat);
      tail.position.set(tx, 0.65, -1.92);
      group.add(tail);
    }

    // 9. Wheels & Rims (4 wheels)
    // FL: (+x, +z), FR: (-x, +z), RL: (+x, -z), RR: (-x, -z)
    const wheels: THREE.Group[] = [];
    const wheelPositions: [number, number, number][] = [
      [1.08, 0, 1.25],   // FL
      [-1.08, 0, 1.25],  // FR
      [1.08, 0, -1.25],  // RL
      [-1.08, 0, -1.25], // RR
    ];

    const tireGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.38, 16);
    tireGeo.rotateZ(Math.PI / 2);
    const rimGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.4, 12);
    rimGeo.rotateZ(Math.PI / 2);

    for (let i = 0; i < 4; i++) {
      const wheelMount = new THREE.Group();
      wheelMount.position.set(...wheelPositions[i]);

      const spinningHub = new THREE.Group();
      const tire = new THREE.Mesh(tireGeo, tireMat);
      tire.castShadow = !this.isHeadless;
      const rim = new THREE.Mesh(rimGeo, rimMat);
      spinningHub.add(tire);
      spinningHub.add(rim);

      wheelMount.add(spinningHub);
      group.add(wheelMount);
      wheels.push(wheelMount);
    }

    // 10. Contact Shadow Disc beneath vehicle
    const shadowGeo = new THREE.PlaneGeometry(2.6, 4.4);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    });
    const shadowDisc = new THREE.Mesh(shadowGeo, shadowMat);
    shadowDisc.position.set(0, -0.6, 0);
    group.add(shadowDisc);

    return {
      group,
      wheels,
      leftLight,
      rightLight,
      leftTarget,
      rightTarget,
      tailMat,
    };
  }

  /**
   * Procedural Player Character Mesh (when on foot)
   */
  private createPlayerMesh(): THREE.Group {
    const group = new THREE.Group();

    const coatMat = new THREE.MeshStandardMaterial({ color: 0x1d3557, roughness: 0.6 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x457b9d, roughness: 0.8 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xf1faee, roughness: 0.5 });
    const hatMat = new THREE.MeshStandardMaterial({ color: 0xa8dadc, roughness: 0.7 });

    // Boots
    for (const bx of [-0.18, 0.18]) {
      const boot = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.22, 0.35), coatMat);
      boot.position.set(bx, 0.11, 0.05);
      group.add(boot);
    }

    // Legs
    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.28), pantsMat);
    legs.position.set(0, 0.55, 0);
    group.add(legs);

    // Torso / Parka
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.75, 0.38), coatMat);
    torso.position.set(0, 1.25, 0);
    torso.castShadow = !this.isHeadless;
    group.add(torso);

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 12), skinMat);
    head.position.set(0, 1.8, 0);
    group.add(head);

    // Explorer Beanie / Cap
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.28, 0.2, 12), hatMat);
    hat.position.set(0, 1.95, 0);
    group.add(hat);

    // Contact shadow
    const shadowGeo = new THREE.CircleGeometry(0.55, 12);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMesh = new THREE.Mesh(
      shadowGeo,
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false })
    );
    shadowMesh.position.set(0, 0.02, 0);
    group.add(shadowMesh);

    group.visible = false; // Hidden initially because player starts inside vehicle
    return group;
  }

  /**
   * Procedural Interactive NPC Models across the world
   */
  private createNPCs(): void {
    NPCS.forEach((npc) => {
      const group = new THREE.Group();
      const groundH = getTerrainHeight(npc.x, npc.z);
      group.position.set(npc.x, groundH, npc.z);

      const coatMat = new THREE.MeshStandardMaterial({ color: npc.colorCoat, roughness: 0.6 });
      const pantsMat = new THREE.MeshStandardMaterial({ color: 0x2b2d42, roughness: 0.85 });
      const skinMat = new THREE.MeshStandardMaterial({ color: 0xffd166, roughness: 0.5 });
      const hatMat = new THREE.MeshStandardMaterial({ color: npc.colorAccent, roughness: 0.7 });

      // Boots & Legs
      const legs = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.28), pantsMat);
      legs.position.set(0, 0.45, 0);
      group.add(legs);

      // Torso / Jacket
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.75, 0.38), coatMat);
      torso.position.set(0, 1.15, 0);
      torso.castShadow = !this.isHeadless;
      group.add(torso);

      // Backpack
      const pack = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.55, 0.25), hatMat);
      pack.position.set(0, 1.2, -0.3);
      group.add(pack);

      // Head
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12), skinMat);
      head.position.set(0, 1.7, 0);
      group.add(head);

      // Optional Explorer Hat
      if (npc.hasHat) {
        const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.04, 12), hatMat);
        brim.position.set(0, 1.82, 0);
        group.add(brim);

        const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.28, 0.22, 12), hatMat);
        crown.position.set(0, 1.94, 0);
        group.add(crown);
      }

      // Floating interactive beacon halo
      const haloGeo = new THREE.RingGeometry(0.35, 0.48, 16);
      haloGeo.rotateX(-Math.PI / 2);
      const haloMat = new THREE.MeshBasicMaterial({
        color: 0xffd166,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
      });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      halo.position.set(0, 2.3, 0);
      group.add(halo);

      this.scene.add(group);
      this.npcGroups.set(npc.id, group);
    });
  }

  /**
   * Precipitation Particle System for Rain and Snow
   */
  private setupPrecipitationParticles(): void {
    const pCount = this.isHeadless ? 200 : 900;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(pCount * 3);

    for (let i = 0; i < pCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 60;
      positions[i * 3 + 1] = Math.random() * 35;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 60;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.precipitationGeo = geo;

    this.rainMaterial = new THREE.PointsMaterial({
      color: 0x90e0ef,
      size: 0.28,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    });

    this.snowMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.45,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });

    this.precipitationParticles = new THREE.Points(geo, this.rainMaterial);
    this.precipitationParticles.visible = false;
    this.scene.add(this.precipitationParticles);
  }

  /**
   * Updates lighting, sky gradient, and fog from current weather and time of day
   */
  public applyWeatherAndLighting(): void {
    const profile = WEATHER_PROFILES[this.weather](this.timeOfDay);

    // Sun & Moon mechanics
    const sunPos = getSunPosition(this.timeOfDay);
    this.sunLight.position.set(
      (this.playerState.inVehicle ? this.vehicleState.x : this.playerState.x) + sunPos.x * 0.4,
      Math.max(15, sunPos.y),
      (this.playerState.inVehicle ? this.vehicleState.z : this.playerState.z) + sunPos.z * 0.4
    );
    this.sunLight.color.set(profile.sunColor);
    this.sunLight.intensity = profile.sunIntensity;

    this.hemiLight.color.set(profile.ambientColor);
    this.hemiLight.groundColor.set('#1e293b');
    this.hemiLight.intensity = profile.ambientIntensity;

    // Sky Dome
    (this.skyDome.material as THREE.MeshBasicMaterial).color.set(profile.skyColorTop);

    // Scene Fog
    this.scene.fog = new THREE.FogExp2(profile.fogColor, profile.fogDensity);

    // Precipitation
    if (this.precipitationParticles && this.precipitationGeo) {
      if (profile.precipitationType === 'none') {
        this.precipitationParticles.visible = false;
      } else {
        this.precipitationParticles.visible = true;
        this.precipitationParticles.material =
          profile.precipitationType === 'snow' ? this.snowMaterial! : this.rainMaterial!;
      }
    }

    // Audio ambient update
    soundEngine.updateWeatherAudio(this.weather, profile.windSpeed);
  }

  /**
   * Main per-frame animation and simulation tick
   */
  private tick(): void {
    this.animFrameId = requestAnimationFrame(this.tick);

    const rawDt = this.clock.getDelta();
    const dt = Math.min(rawDt, 0.05); // Clamped delta time to prevent tunneling

    if (this.isPaused) return;

    // Time of day progression
    if (this.autoTimeProgression) {
      this.timeOfDay = (this.timeOfDay + dt * 0.12) % 24; // 1 real second = ~7.2 game minutes
      this.applyWeatherAndLighting();
    }

    // Rotating windmill blades
    if (this.windmillBlades) {
      this.windmillBlades.rotation.z += dt * 1.4;
    }

    // Aviation beacon blinking
    if (this.beaconLight) {
      const blink = Math.sin(this.clock.getElapsedTime() * 5.0) > 0.4;
      this.beaconLight.intensity = blink ? 3.0 : 0.0;
    }

    // Campfire flickering
    if (this.campfireLight) {
      this.campfireLight.intensity = 1.4 + Math.sin(this.clock.getElapsedTime() * 12.0) * 0.4;
    }

    // Thunderstorm lightning strikes
    if (this.weather === 'thunder') {
      this.lightningTimer += dt;
      if (this.lightningTimer > 7.0 + Math.random() * 6.0) {
        this.lightningTimer = 0;
        this.sunLight.intensity = 5.5;
        this.sunLight.color.set('#ffffff');
        soundEngine.playThunder();
        setTimeout(() => {
          this.applyWeatherAndLighting();
        }, 80);
      }
    }

    // Title Screen Live Tour vs Active Gameplay
    if (this.isTitleScreen) {
      this.updateTitleScreenTour(dt);
      this.renderer.render(this.scene, this.camera);
      return;
    }

    // 1. Vehicle and Player Physics
    const isWet = this.weather === 'rain' || this.weather === 'thunder' || this.weather === 'snow';

    if (this.playerState.inVehicle) {
      stepVehiclePhysics(this.vehicleState, this.inputs, dt, isWet);
      this.playerState.x = this.vehicleState.x;
      this.playerState.y = this.vehicleState.y;
      this.playerState.z = this.vehicleState.z;
      this.playerState.yaw = this.vehicleState.yaw;
    } else {
      // Step on-foot physics
      stepPlayerPhysics(this.playerState, this.inputs, this.camera.rotation.y, dt);
      // Vehicle decelerates to stop when driver is outside
      stepVehiclePhysics(
        this.vehicleState,
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
        dt,
        isWet
      );
    }

    // Sync vehicle 3D mesh
    this.vehicleGroup.position.set(this.vehicleState.x, this.vehicleState.y, this.vehicleState.z);
    this.vehicleGroup.rotation.set(0, this.vehicleState.yaw, 0, 'YXZ');
    this.vehicleGroup.rotateX(this.vehicleState.pitch);
    this.vehicleGroup.rotateZ(-this.vehicleState.roll);

    // Sync front wheel steering & 4-wheel spin
    this.wheelMeshes[0].rotation.y = this.vehicleState.steerAngle;
    this.wheelMeshes[1].rotation.y = this.vehicleState.steerAngle;

    for (let i = 0; i < 4; i++) {
      const spinningHub = this.wheelMeshes[i].children[0];
      if (spinningHub) {
        spinningHub.rotation.x = this.vehicleState.wheelRotations[i];
      }
      this.wheelMeshes[i].position.y = this.vehicleState.suspensionOffsets[i];
    }

    // Headlights toggle
    this.leftHeadlight.visible = this.vehicleState.headlightsOn;
    this.rightHeadlight.visible = this.vehicleState.headlightsOn;

    // Brake lights illumination
    if (this.vehicleState.isBraking) {
      this.tailLightsMaterial.emissiveIntensity = 2.4;
    } else {
      this.tailLightsMaterial.emissiveIntensity = 0.5;
    }

    // Sync player on-foot mesh
    this.playerGroup.visible = !this.playerState.inVehicle;
    if (!this.playerState.inVehicle) {
      this.playerGroup.position.set(this.playerState.x, this.playerState.y, this.playerState.z);
      this.playerGroup.rotation.y = this.playerState.yaw;
      // Walking bob
      if (this.playerState.isWalking) {
        const bob = Math.sin(this.clock.getElapsedTime() * 14.0) * 0.08;
        this.playerGroup.position.y += Math.abs(bob);
      }
    }

    // NPC idle breathing and facing player
    const activeTargetPos = this.playerState.inVehicle
      ? _vec3A.set(this.vehicleState.x, this.vehicleState.y, this.vehicleState.z)
      : _vec3A.set(this.playerState.x, this.playerState.y, this.playerState.z);

    this.npcGroups.forEach((npcGroup) => {
      const dist = npcGroup.position.distanceTo(activeTargetPos);
      if (dist < 28) {
        // Face toward player smoothly
        const targetAngle = Math.atan2(
          activeTargetPos.x - npcGroup.position.x,
          activeTargetPos.z - npcGroup.position.z
        );
        npcGroup.rotation.y = targetAngle;
      }
    });

    // Precipitation particles follow camera
    if (this.precipitationParticles && this.precipitationParticles.visible && this.precipitationGeo) {
      const posAttr = this.precipitationGeo.attributes.position;
      const speed = this.weather === 'snow' ? 6.0 : 28.0;
      for (let i = 0; i < posAttr.count; i++) {
        let py = posAttr.getY(i) - speed * dt;
        if (py < 0) py = 35;
        posAttr.setY(i, py);
      }
      posAttr.needsUpdate = true;
      this.precipitationParticles.position.set(
        this.camera.position.x,
        this.camera.position.y - 12,
        this.camera.position.z
      );
    }

    // Camera Rig update
    this.updateCameraRig(dt);

    // Audio Engine update
    soundEngine.updateEngine(this.vehicleState.rpm, this.vehicleState.speed, this.playerState.inVehicle);

    // Drifting sound
    if (this.vehicleState.isDrifting) {
      soundEngine.playDriftSqueal();
    }

    // Horn
    if (this.inputs.horn) {
      soundEngine.playHorn();
    }

    // Interactive Proximity check:
    this.checkInteractionPrompts();

    // Check Quest landmark proximity:
    this.checkQuestMilestones();

    // Notify UI
    const speedKmh = Math.abs(this.vehicleState.speed) * 3.6;
    this.callbacks.onSpeedChange(speedKmh, this.vehicleState.rpm, this.vehicleState.gear);
    this.callbacks.onVehicleStateChange(
      this.playerState.inVehicle,
      this.vehicleState.headlightsOn,
      this.vehicleState.fuel
    );

    const activeHeading = this.playerState.inVehicle ? this.vehicleState.yaw : this.playerState.yaw;
    const headingDeg = (Math.round((activeHeading * 180) / Math.PI) % 360 + 360) % 360;
    this.callbacks.onCoordinatesChange(
      Math.round(this.playerState.inVehicle ? this.vehicleState.x : this.playerState.x),
      Math.round(this.playerState.inVehicle ? this.vehicleState.z : this.playerState.z),
      headingDeg
    );

    // Render 3D frame
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Title Screen live-world scenic orbit tour
   */
  private updateTitleScreenTour(dt: number): void {
    this.titlePanAngle += dt * 0.12;
    const radius = 90;
    const camX = Math.cos(this.titlePanAngle) * radius;
    const camZ = Math.sin(this.titlePanAngle) * radius;
    const camY = getTerrainHeight(camX, camZ) + 24;

    this.camera.position.set(camX, camY, camZ);
    this.camera.lookAt(0, getTerrainHeight(0, 0) + 4, 0);
  }

  /**
   * Camera Chase / Cockpit / Orbit tracking
   */
  private updateCameraRig(dt: number): void {
    const isVeh = this.playerState.inVehicle;
    const targetX = isVeh ? this.vehicleState.x : this.playerState.x;
    const targetY = isVeh ? this.vehicleState.y : this.playerState.y;
    const targetZ = isVeh ? this.vehicleState.z : this.playerState.z;
    const targetYaw = isVeh ? this.vehicleState.yaw : this.playerState.yaw;

    if (this.cameraMode === 'cockpit' && isVeh) {
      // First-person driver cockpit
      const driverEyeY = targetY + 0.95;
      const fwdX = Math.sin(targetYaw);
      const fwdZ = Math.cos(targetYaw);
      const eyeX = targetX + fwdX * 0.35;
      const eyeZ = targetZ + fwdZ * 0.35;

      this.camera.position.set(eyeX, driverEyeY, eyeZ);
      this.camera.lookAt(eyeX + fwdX * 25, driverEyeY + Math.tan(this.vehicleState.pitch) * 20, eyeZ + fwdZ * 25);
    } else if (this.cameraMode === 'orbit') {
      // Cinematic 360 orbit
      this.orbitAngle += dt * 0.35;
      const dist = isVeh ? 14 : 7;
      const ox = targetX + Math.cos(this.orbitAngle) * dist;
      const oz = targetZ + Math.sin(this.orbitAngle) * dist;
      const oy = targetY + (isVeh ? 4.5 : 2.5);

      this.camera.position.set(ox, oy, oz);
      this.camera.lookAt(targetX, targetY + 1.2, targetZ);
    } else {
      // Third-person smooth chase camera
      const fwdX = Math.sin(targetYaw);
      const fwdZ = Math.cos(targetYaw);

      const chaseDist = isVeh ? 7.8 + Math.abs(this.vehicleState.speed) * 0.08 : 4.5;
      const chaseHeight = isVeh ? 2.8 + (this.vehicleState.isBoosting ? 0.3 : 0) : 1.8;

      const desiredCamX = targetX - fwdX * chaseDist;
      const desiredCamZ = targetZ - fwdZ * chaseDist;
      const groundAtCam = getTerrainHeight(desiredCamX, desiredCamZ);
      const desiredCamY = Math.max(groundAtCam + 1.2, targetY + chaseHeight);

      // Frame-rate independent exponential damping: 1 - Math.exp(-k * dt)
      const dampFactor = 1 - Math.exp(-6.5 * dt);
      this.camera.position.x += (desiredCamX - this.camera.position.x) * dampFactor;
      this.camera.position.y += (desiredCamY - this.camera.position.y) * dampFactor;
      this.camera.position.z += (desiredCamZ - this.camera.position.z) * dampFactor;

      const lookTargetY = targetY + (isVeh ? 1.1 : 1.2);
      this.camera.lookAt(targetX, lookTargetY, targetZ);
    }
  }

  /**
   * Check interactive proximity (Vehicle Enter/Exit, NPC Dialogue)
   */
  private checkInteractionPrompts(): void {
    if (this.playerState.inVehicle) {
      // Can exit vehicle anywhere on safe ground
      this.callbacks.onInteractPrompt('[E] Exit Vehicle to Walk', null);
      return;
    }

    // On-foot: check distance to vehicle
    const distToVehicle = Math.hypot(
      this.playerState.x - this.vehicleState.x,
      this.playerState.z - this.vehicleState.z
    );

    if (distToVehicle < 3.8) {
      this.callbacks.onInteractPrompt('[E] Enter Overland Rover', null);
      return;
    }

    // Check distance to NPCs
    let closestNpc: NPCDefinition | null = null;
    let minDist = 999;

    NPCS.forEach((npc) => {
      const d = Math.hypot(this.playerState.x - npc.x, this.playerState.z - npc.z);
      if (d < minDist) {
        minDist = d;
        closestNpc = npc;
      }
    });

    if (closestNpc && minDist < 4.8) {
      this.callbacks.onInteractPrompt(`[E] Talk to ${(closestNpc as NPCDefinition).name}`, closestNpc);
    } else {
      this.callbacks.onInteractPrompt(null, null);
    }
  }

  /**
   * Check if player reached quest landmark
   */
  private checkQuestMilestones(): void {
    const px = this.playerState.inVehicle ? this.vehicleState.x : this.playerState.x;
    const pz = this.playerState.inVehicle ? this.vehicleState.z : this.playerState.z;

    let updated = false;
    this.quests.forEach((q) => {
      if (!q.isCompleted) {
        const dist = Math.hypot(px - q.targetX, pz - q.targetZ);
        if (dist < 18) {
          q.isCompleted = true;
          updated = true;
          soundEngine.playQuestComplete();
        }
      }
    });

    if (updated) {
      this.callbacks.onQuestUpdate([...this.quests]);
    }
  }

  /**
   * Toggle between driving vehicle and walking on foot
   */
  public toggleVehicleMount(): void {
    if (this.playerState.inVehicle) {
      // Exit vehicle to the left side
      const rightX = Math.cos(this.vehicleState.yaw);
      const rightZ = -Math.sin(this.vehicleState.yaw);
      this.playerState.x = this.vehicleState.x + rightX * 2.2;
      this.playerState.z = this.vehicleState.z + rightZ * 2.2;
      this.playerState.y = getTerrainHeight(this.playerState.x, this.playerState.z);
      this.playerState.inVehicle = false;
      this.vehicleState.speed = 0;
      soundEngine.playToggleClick();
    } else {
      const dist = Math.hypot(
        this.playerState.x - this.vehicleState.x,
        this.playerState.z - this.vehicleState.z
      );
      if (dist < 4.5) {
        this.playerState.inVehicle = true;
        soundEngine.playToggleClick();
      }
    }
  }

  public toggleHeadlights(): void {
    this.vehicleState.headlightsOn = !this.vehicleState.headlightsOn;
    soundEngine.playToggleClick();
  }

  public resetVehicleOrientation(): void {
    const groundH = getTerrainHeight(this.vehicleState.x, this.vehicleState.z);
    this.vehicleState.y = groundH + 0.8;
    this.vehicleState.pitch = 0;
    this.vehicleState.roll = 0;
    this.vehicleState.speed = 0;
    soundEngine.playToggleClick();
  }

  public setWeather(newWeather: WeatherType): void {
    this.weather = newWeather;
    this.applyWeatherAndLighting();
    soundEngine.playToggleClick();
  }

  public setTimeOfDay(hour: number): void {
    this.timeOfDay = hour;
    this.applyWeatherAndLighting();
  }

  public setCameraMode(mode: CameraMode): void {
    this.cameraMode = mode;
    soundEngine.playToggleClick();
  }

  private onWindowResize = (): void => {
    if (!this.container) return;
    const w = this.container.clientWidth;
    const h = Math.max(1, this.container.clientHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  public destroy(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    window.removeEventListener('resize', this.onWindowResize);
    this.renderer.dispose();
  }
}
