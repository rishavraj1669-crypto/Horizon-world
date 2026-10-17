/**
 * Three.js 3D Open World Scene Manager
 * Metropolis Open World: Towering Skyscraper Cityscape (up to 165m),
 * Playable Spider-Man with physics web-swinging, web-zip, and combat combos,
 * Exotic Drivable Supercar with screaming V10/V12 audio synthesis, nitro flames,
 * Syndicate Thug AI encounters with Spider-Sense reflex dodges,
 * and realistic PBR lighting, soft shadows, and dynamic day/sunset/night cycles.
 */

import * as THREE from 'three';
import {
  BUILDINGS,
  BuildingDef,
  CRIMES,
  CrimeEncounter,
  getBuildingAt,
  findWebSwingAnchor,
} from './cityData';
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
import { createSpiderManMesh, SpiderManMeshBundle } from './spiderman';
import { createSupercarMesh, SupercarMeshBundle } from './supercar';
import {
  ThugEntity,
  INITIAL_THUGS,
  INITIAL_COMBAT_STATE,
  CombatState,
  updateThugs,
  executeMeleeAttack,
  executeWebShoot,
  executeSpiderSenseDodge,
} from './combat';

export type CameraMode = 'chase' | 'cockpit' | 'orbit' | 'cinematic';

export interface WorldCallbacks {
  onSpeedChange: (speedKmh: number, rpm: number, gear: number) => void;
  onVehicleStateChange: (inVehicle: boolean, headlights: boolean, fuel: number) => void;
  onInteractPrompt: (promptText: string | null, targetNpc: NPCDefinition | null) => void;
  onQuestUpdate: (updatedQuests: Quest[]) => void;
  onCoordinatesChange: (x: number, z: number, headingDeg: number) => void;
  onSpiderManStateChange?: (
    health: number,
    webFluid: number,
    isSwinging: boolean,
    combo: number,
    spiderSense: boolean,
    score: number
  ) => void;
}

export class WorldScene {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private clock: THREE.Clock;

  // Environment & Lighting
  private sunLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private skyDome: THREE.Mesh;
  private streetLightsGroup: THREE.Group;
  private windowLightsMaterials: THREE.MeshStandardMaterial[] = [];

  // Supercar & Spider-Man Entities
  public vehicleState: VehicleState;
  public playerState: PlayerCharacterState;
  private supercarBundle: SupercarMeshBundle;
  private spiderManBundle: SpiderManMeshBundle;

  // Combat & Thugs
  public combatState: CombatState = { ...INITIAL_COMBAT_STATE };
  public thugs: ThugEntity[] = [...INITIAL_THUGS];
  private thugGroups: Map<string, THREE.Group> = new Map();
  private webCocoonGeo: THREE.BufferGeometry;
  private webCocoonMat: THREE.MeshStandardMaterial;

  // Dynamic Weather & Day/Night
  public weather: WeatherType = 'clear';
  public timeOfDay: number = 14.0; // Afternoon sun
  public autoTimeProgression: boolean = true;
  private rainParticles: THREE.Points | null = null;

  // Camera & Input
  public cameraMode: CameraMode = 'chase';
  public isTitleScreen: boolean = false;
  public isPaused: boolean = false;
  private cameraYaw: number = Math.PI / 2; // Face down East avenue
  private cameraPitch: number = 0.25;
  private titlePanAngle: number = 0;

  // Active User Inputs
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
    webSwing: false,
    webZip: false,
    attack: false,
    webShoot: false,
    dodge: false,
  };

  private quests: Quest[];
  private callbacks: WorldCallbacks;
  private isHeadless: boolean;
  private animFrameId: number | null = null;
  private animTimer: number = 0;

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
      65,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.3,
      800
    );
    this.clock = new THREE.Clock();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isHeadless,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.setPixelRatio(this.isHeadless ? 1 : Math.min(window.devicePixelRatio, 1.8));
    this.renderer.setSize(container.clientWidth, container.clientHeight);

    if (!this.isHeadless) {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    container.appendChild(this.renderer.domElement);

    // 1. Lighting Setup
    this.hemiLight = new THREE.HemisphereLight(0xbadfff, 0x444b55, 1.15);
    this.scene.add(this.hemiLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    this.scene.add(ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xfff8ee, 2.2);
    this.sunLight.position.set(120, 220, 100);
    if (!this.isHeadless) {
      this.sunLight.castShadow = true;
      this.sunLight.shadow.mapSize.width = 2048;
      this.sunLight.shadow.mapSize.height = 2048;
      this.sunLight.shadow.camera.near = 10;
      this.sunLight.shadow.camera.far = 450;
      const d = 160;
      this.sunLight.shadow.camera.left = -d;
      this.sunLight.shadow.camera.right = d;
      this.sunLight.shadow.camera.top = d;
      this.sunLight.shadow.camera.bottom = -d;
      this.sunLight.shadow.bias = -0.0005;
    }
    this.scene.add(this.sunLight);

    // 2. Sky Dome
    const skyGeo = new THREE.SphereGeometry(600, 32, 16);
    const skyMat = new THREE.MeshBasicMaterial({
      color: 0x64b5f6,
      side: THREE.BackSide,
    });
    this.skyDome = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.skyDome);

    this.scene.fog = new THREE.FogExp2(0xcfe6f5, 0.0035);

    // 3. Street Lights Group
    this.streetLightsGroup = new THREE.Group();
    this.scene.add(this.streetLightsGroup);

    // 4. Build Metropolis City Ground & Skyscrapers
    this.buildCityGround();
    this.buildCitySkyscrapers();

    // 5. Entities: Supercar & Spider-Man
    this.supercarBundle = createSupercarMesh();
    this.supercarBundle.group.position.set(this.vehicleState.x, this.vehicleState.y, this.vehicleState.z);
    this.scene.add(this.supercarBundle.group);

    this.spiderManBundle = createSpiderManMesh();
    this.spiderManBundle.group.position.set(this.playerState.x, this.playerState.y, this.playerState.z);
    this.scene.add(this.spiderManBundle.group);
    this.scene.add(this.spiderManBundle.webLine);

    // 6. Build Thug Syndicate Characters
    this.webCocoonGeo = new THREE.SphereGeometry(0.85, 12, 12);
    this.webCocoonGeo.scale(1.0, 1.6, 1.0);
    this.webCocoonMat = new THREE.MeshStandardMaterial({
      color: 0xf5f5f5,
      roughness: 0.8,
      wireframe: true,
    });
    this.buildThugs();

    // 7. Setup Weather & Rain
    this.setupRainParticles();

    // Resize listener
    window.addEventListener('resize', this.onWindowResize);

    // Start Animation Loop
    this.animate();
  }

  // ==========================================
  // CITY ENVIRONMENT BUILDERS
  // ==========================================

  private buildCityGround(): void {
    // Ground base plane (dark asphalt city ground)
    const groundGeo = new THREE.PlaneGeometry(600, 600, 1, 1);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x1f2429,
      roughness: 0.82,
      metalness: 0.1,
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.receiveShadow = true;
    groundMesh.position.y = 0;
    this.scene.add(groundMesh);

    // Concrete Sidewalks and Curbs along avenues
    const sidewalkMat = new THREE.MeshStandardMaterial({
      color: 0x9e9e9e,
      roughness: 0.9,
    });

    const streetLinesMat = new THREE.MeshBasicMaterial({
      color: 0xfbc02d, // Yellow road dividers
    });

    // Create main 4-lane avenues
    const mainAvenues = [-70, 0, 70];
    mainAvenues.forEach((pos) => {
      // East-West road yellow divider
      const lineEW = new THREE.Mesh(new THREE.PlaneGeometry(450, 0.4), streetLinesMat);
      lineEW.rotateX(-Math.PI / 2);
      lineEW.position.set(0, 0.03, pos);
      this.scene.add(lineEW);

      // North-South road yellow divider
      const lineNS = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 450), streetLinesMat);
      lineNS.rotateX(-Math.PI / 2);
      lineNS.position.set(pos, 0.03, 0);
      this.scene.add(lineNS);
    });

    // Central Plaza Park with trees and fountain
    const parkGeo = new THREE.BoxGeometry(44, 0.15, 44);
    const parkMat = new THREE.MeshStandardMaterial({
      color: 0x2e7d32, // Grass park
      roughness: 0.88,
    });
    const parkMesh = new THREE.Mesh(parkGeo, parkMat);
    parkMesh.position.set(-30, 0.08, -85);
    parkMesh.receiveShadow = true;
    this.scene.add(parkMesh);

    // Fountain
    const fountainBase = new THREE.Mesh(
      new THREE.CylinderGeometry(4.5, 4.8, 0.8, 16),
      new THREE.MeshStandardMaterial({ color: 0x757575, roughness: 0.7 })
    );
    fountainBase.position.set(-30, 0.4, -85);
    this.scene.add(fountainBase);

    const fountainWater = new THREE.Mesh(
      new THREE.CylinderGeometry(4.2, 4.2, 0.6, 16),
      new THREE.MeshStandardMaterial({ color: 0x00bcd4, roughness: 0.1, transparent: true, opacity: 0.8 })
    );
    fountainWater.position.set(-30, 0.6, -85);
    this.scene.add(fountainWater);

    // Street Lamps along avenues
    this.buildStreetLamps();
  }

  private buildStreetLamps(): void {
    const lampPostGeo = new THREE.CylinderGeometry(0.12, 0.15, 6.5, 8);
    const lampArmGeo = new THREE.BoxGeometry(1.6, 0.12, 0.12);
    const lampHeadGeo = new THREE.BoxGeometry(0.4, 0.15, 0.25);

    const lampMetalMat = new THREE.MeshStandardMaterial({
      color: 0x37474f,
      metalness: 0.8,
      roughness: 0.3,
    });

    const lampBulbMat = new THREE.MeshStandardMaterial({
      color: 0xfff9c4,
      emissive: 0xffeb3b,
      emissiveIntensity: 2.5,
    });

    const lampPositions = [
      [-14, 0, -18], [14, 0, -18],
      [-14, 0, 18], [14, 0, 18],
      [-14, 0, -75], [14, 0, -75],
      [-14, 0, 75], [14, 0, 75],
      [-75, 0, -14], [-75, 0, 14],
      [75, 0, -14], [75, 0, 14],
    ];

    lampPositions.forEach(([lx, ly, lz]) => {
      const lamp = new THREE.Group();
      lamp.position.set(lx, ly, lz);

      const post = new THREE.Mesh(lampPostGeo, lampMetalMat);
      post.position.y = 3.25;
      post.castShadow = true;
      lamp.add(post);

      const arm = new THREE.Mesh(lampArmGeo, lampMetalMat);
      arm.position.set(0.6, 6.4, 0);
      lamp.add(arm);

      const bulb = new THREE.Mesh(lampHeadGeo, lampBulbMat);
      bulb.position.set(1.2, 6.3, 0);
      lamp.add(bulb);

      // Night light source
      const pointLight = new THREE.PointLight(0xffea00, 0.9, 22, 1.4);
      pointLight.position.set(1.2, 6.1, 0);
      lamp.add(pointLight);

      this.streetLightsGroup.add(lamp);
    });
  }

  private buildCitySkyscrapers(): void {
    // Construct each tall skyscraper from BUILDINGS definition
    for (const b of BUILDINGS) {
      const bGroup = new THREE.Group();
      bGroup.position.set(b.x, 0, b.z);

      // Facade Material
      const facadeMat = new THREE.MeshStandardMaterial({
        color: b.color,
        roughness: b.type === 'glass_tower' ? 0.15 : 0.65,
        metalness: b.type === 'glass_tower' ? 0.85 : 0.25,
      });

      // Window Material (Emissive at night)
      const windowMat = new THREE.MeshStandardMaterial({
        color: b.windowColor,
        emissive: b.windowColor,
        emissiveIntensity: 0.45,
        roughness: 0.2,
        metalness: 0.8,
      });
      this.windowLightsMaterials.push(windowMat);

      // 1. Primary Tower Structure
      const towerGeo = new THREE.BoxGeometry(b.width, b.height, b.depth);
      const towerMesh = new THREE.Mesh(towerGeo, facadeMat);
      towerMesh.position.y = b.height / 2;
      towerMesh.castShadow = true;
      towerMesh.receiveShadow = true;
      bGroup.add(towerMesh);

      // 2. Glass Window Bands
      const numBands = Math.floor(b.height / 8);
      for (let i = 1; i < numBands; i++) {
        const bandGeo = new THREE.BoxGeometry(b.width + 0.1, 2.2, b.depth + 0.1);
        const bandMesh = new THREE.Mesh(bandGeo, windowMat);
        bandMesh.position.y = i * 8.0;
        bGroup.add(bandMesh);
      }

      // 3. Rooftop Architecture
      const roofY = b.height;

      // Helipad
      if (b.hasHelipad) {
        const padGeo = new THREE.CylinderGeometry(7.5, 7.5, 0.4, 24);
        const padMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.7 });
        const padMesh = new THREE.Mesh(padGeo, padMat);
        padMesh.position.set(0, roofY + 0.2, 0);
        bGroup.add(padMesh);

        // 'H' marking
        const hBar1 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 5.0), new THREE.MeshBasicMaterial({ color: 0xffeb3b }));
        hBar1.position.set(-1.6, roofY + 0.42, 0);
        bGroup.add(hBar1);

        const hBar2 = hBar1.clone();
        hBar2.position.set(1.6, roofY + 0.42, 0);
        bGroup.add(hBar2);

        const hCross = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.05, 0.8), new THREE.MeshBasicMaterial({ color: 0xffeb3b }));
        hCross.position.set(0, roofY + 0.42, 0);
        bGroup.add(hCross);
      }

      // Spire / Antenna
      if (b.hasSpire) {
        const spireBase = new THREE.Mesh(
          new THREE.CylinderGeometry(1.4, 2.8, 12, 8),
          new THREE.MeshStandardMaterial({ color: 0xeeeeee, metalness: 0.9, roughness: 0.2 })
        );
        spireBase.position.set(0, roofY + 6, 0);
        bGroup.add(spireBase);

        const spireTip = new THREE.Mesh(
          new THREE.CylinderGeometry(0.15, 1.2, 22, 8),
          new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.95, roughness: 0.1 })
        );
        spireTip.position.set(0, roofY + 23, 0);
        bGroup.add(spireTip);

        // Red beacon warning light at top
        const beacon = new THREE.Mesh(
          new THREE.SphereGeometry(0.45, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0xff0000 })
        );
        beacon.position.set(0, roofY + 34, 0);
        bGroup.add(beacon);
      }

      // HVAC Machinery Units
      if (b.hasHVAC) {
        const hvacGeo = new THREE.BoxGeometry(3.5, 2.2, 3.5);
        const hvacMat = new THREE.MeshStandardMaterial({ color: 0x546e7a, roughness: 0.6 });
        const hvacMesh = new THREE.Mesh(hvacGeo, hvacMat);
        hvacMesh.position.set(b.width * 0.25, roofY + 1.1, b.depth * 0.25);
        bGroup.add(hvacMesh);
      }

      // Water Tower
      if (b.hasWaterTower) {
        const tankGeo = new THREE.CylinderGeometry(2.4, 2.4, 3.6, 12);
        const tankMat = new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.9 });
        const tankMesh = new THREE.Mesh(tankGeo, tankMat);
        tankMesh.position.set(-b.width * 0.25, roofY + 4.2, -b.depth * 0.25);
        bGroup.add(tankMesh);

        // Stilts
        const stiltGeo = new THREE.CylinderGeometry(0.12, 0.12, 2.5, 6);
        const stiltMat = new THREE.MeshStandardMaterial({ color: 0x424242 });
        const stilt = new THREE.Mesh(stiltGeo, stiltMat);
        stilt.position.set(-b.width * 0.25, roofY + 1.25, -b.depth * 0.25);
        bGroup.add(stilt);
      }

      this.scene.add(bGroup);
    }
  }

  private buildThugs(): void {
    const thugBodyMat = new THREE.MeshStandardMaterial({ color: 0x263238, roughness: 0.6 });
    const thugJacketMat = new THREE.MeshStandardMaterial({ color: 0xb71c1c, roughness: 0.7 });
    const thugHeadMat = new THREE.MeshStandardMaterial({ color: 0xffcc80, roughness: 0.5 });

    for (const thug of this.thugs) {
      const group = new THREE.Group();
      group.position.set(thug.x, thug.y, thug.z);

      // Torso / Jacket
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.35), thugJacketMat);
      torso.position.y = 1.35;
      torso.castShadow = true;
      group.add(torso);

      // Head
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), thugHeadMat);
      head.position.y = 1.85;
      head.castShadow = true;
      group.add(head);

      // Legs
      const legGeo = new THREE.BoxGeometry(0.18, 0.9, 0.2);
      const lLeg = new THREE.Mesh(legGeo, thugBodyMat);
      lLeg.position.set(-0.16, 0.45, 0);
      group.add(lLeg);
      const rLeg = new THREE.Mesh(legGeo, thugBodyMat);
      rLeg.position.set(0.16, 0.45, 0);
      group.add(rLeg);

      // Arms
      const armGeo = new THREE.BoxGeometry(0.16, 0.65, 0.16);
      const lArm = new THREE.Mesh(armGeo, thugJacketMat);
      lArm.position.set(-0.38, 1.32, 0);
      group.add(lArm);
      const rArm = new THREE.Mesh(armGeo, thugJacketMat);
      rArm.position.set(0.38, 1.32, 0);
      group.add(rArm);

      // Health bar floating billboard
      const barBg = new THREE.Mesh(
        new THREE.PlaneGeometry(1.2, 0.15),
        new THREE.MeshBasicMaterial({ color: 0x212121, side: THREE.DoubleSide })
      );
      barBg.position.y = 2.3;
      group.add(barBg);

      const barFill = new THREE.Mesh(
        new THREE.PlaneGeometry(1.16, 0.11),
        new THREE.MeshBasicMaterial({ color: 0xff1744, side: THREE.DoubleSide })
      );
      barFill.position.set(0, 2.3, 0.01);
      group.add(barFill);

      // Web cocoon mesh (visible when webbed)
      const cocoon = new THREE.Mesh(this.webCocoonGeo, this.webCocoonMat);
      cocoon.position.y = 1.2;
      cocoon.visible = false;
      group.add(cocoon);

      this.scene.add(group);
      this.thugGroups.set(thug.id, group);
    }
  }

  private setupRainParticles(): void {
    const rainCount = 1200;
    const rainGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(rainCount * 3);

    for (let i = 0; i < rainCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 120;
      positions[i + 1] = Math.random() * 80;
      positions[i + 2] = (Math.random() - 0.5) * 120;
    }

    rainGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const rainMat = new THREE.PointsMaterial({
      color: 0x90caf9,
      size: 0.22,
      transparent: true,
      opacity: 0.6,
    });

    this.rainParticles = new THREE.Points(rainGeo, rainMat);
    this.rainParticles.visible = false;
    this.scene.add(this.rainParticles);
  }

  // ==========================================
  // SPIDER-MAN ACTIONS & INTERACTION
  // ==========================================

  /**
   * Shoot Web Swing line to skyscraper
   */
  public triggerWebSwing(): void {
    if (this.playerState.inVehicle) return;

    if (this.playerState.isSwinging) {
      // Release swing: launch Spider-Man with upward acrobatic fling!
      this.playerState.isSwinging = false;
      this.playerState.webAnchor = null;
      this.playerState.vy += 12.0; // Extra aerial lift
      this.spiderManBundle.setWebLine(null, null);
      soundEngine.playDodgeWhoosh();
      return;
    }

    // Cast forward for skyscraper anchor point
    const fwdX = Math.sin(this.cameraYaw);
    const fwdZ = Math.cos(this.cameraYaw);

    const anchor = findWebSwingAnchor(
      this.playerState.x,
      this.playerState.y,
      this.playerState.z,
      fwdX,
      fwdZ,
      95
    );

    if (anchor && this.playerState.webFluid >= 10) {
      this.playerState.isSwinging = true;
      this.playerState.webAnchor = { x: anchor.x, y: anchor.y, z: anchor.z };
      this.playerState.ropeLength = anchor.dist;
      this.playerState.webFluid -= 12;

      soundEngine.playWebShoot();
      soundEngine.setBgmIntensity('action');
    }
  }

  /**
   * Web Zip Launch to rooftop
   */
  public triggerWebZip(): void {
    if (this.playerState.inVehicle) return;

    const fwdX = Math.sin(this.cameraYaw);
    const fwdZ = Math.cos(this.cameraYaw);

    const anchor = findWebSwingAnchor(
      this.playerState.x,
      this.playerState.y,
      this.playerState.z,
      fwdX,
      fwdZ,
      120
    );

    if (anchor && this.playerState.webFluid >= 15) {
      this.playerState.isWebZipping = true;
      this.playerState.webAnchor = { x: anchor.x, y: anchor.y, z: anchor.z };
      this.playerState.webFluid -= 18;

      soundEngine.playWebZip();
      soundEngine.setBgmIntensity('action');
    }
  }

  /**
   * Spider-Man Melee Attack Combo
   */
  public triggerMeleeAttack(): void {
    if (this.playerState.inVehicle) return;

    this.playerState.attackCooldown = 0.35;
    this.playerState.animAction = this.combatState.comboCount % 2 === 0 ? 'punch' : 'kick';

    const result = executeMeleeAttack(
      this.thugs,
      this.playerState.x,
      this.playerState.y,
      this.playerState.z,
      this.playerState.yaw,
      this.combatState
    );

    if (result.hitThug) {
      soundEngine.playCombatHit(result.isKnockout);
      soundEngine.setBgmIntensity('action');
      if (result.isKnockout) {
        soundEngine.playQuestComplete();
      }
    } else {
      soundEngine.playDodgeWhoosh();
    }
  }

  /**
   * Spider-Man Web Shooter Blast (Immobilizes thug)
   */
  public triggerWebShootCombat(): void {
    if (this.playerState.inVehicle) return;
    if (this.playerState.webFluid < 20) return;

    this.playerState.webFluid -= 20;
    soundEngine.playWebShoot();

    const result = executeWebShoot(
      this.thugs,
      this.playerState.x,
      this.playerState.y,
      this.playerState.z,
      this.playerState.yaw,
      this.combatState
    );

    if (result.targetThug) {
      soundEngine.playWebTrap();
    }
  }

  /**
   * Spider-Sense Reflex Dodge
   */
  public triggerSpiderDodge(): void {
    if (this.playerState.inVehicle) return;

    this.playerState.animAction = 'dodge';
    soundEngine.playDodgeWhoosh();

    const result = executeSpiderSenseDodge(
      this.combatState,
      this.thugs,
      this.playerState.x,
      this.playerState.y,
      this.playerState.z
    );

    if (result.isPerfectDodge) {
      soundEngine.playSpiderSense();
      this.playerState.vy = 8.0; // High acrobatic dodge flip
    }
  }

  /**
   * Enter / Exit Supercar
   */
  public toggleVehicleMount(): void {
    if (this.playerState.inVehicle) {
      // Exit Supercar
      this.playerState.inVehicle = false;
      this.playerState.x = this.vehicleState.x + 2.8;
      this.playerState.y = this.vehicleState.y;
      this.playerState.z = this.vehicleState.z;
      this.playerState.vy = 4.5; // Hop out
      this.spiderManBundle.group.visible = true;
      this.callbacks.onVehicleStateChange(false, this.vehicleState.headlightsOn, this.vehicleState.fuel);
    } else {
      // Check distance to Supercar
      const dist = Math.hypot(this.playerState.x - this.vehicleState.x, this.playerState.z - this.vehicleState.z);
      if (dist < 7.0) {
        // Hop into Supercar
        this.playerState.inVehicle = true;
        this.spiderManBundle.group.visible = false;
        this.callbacks.onVehicleStateChange(true, this.vehicleState.headlightsOn, this.vehicleState.fuel);
      }
    }
  }

  public toggleHeadlights(): void {
    this.vehicleState.headlightsOn = !this.vehicleState.headlightsOn;
    this.supercarBundle.leftHeadlight.visible = this.vehicleState.headlightsOn;
    this.supercarBundle.rightHeadlight.visible = this.vehicleState.headlightsOn;
  }

  public resetVehicleOrientation(): void {
    this.vehicleState.pitch = 0;
    this.vehicleState.roll = 0;
    this.vehicleState.speed = 0;
    this.vehicleState.y = 1.0;
  }

  public setWeather(newWeather: WeatherType): void {
    this.weather = newWeather;
    if (this.rainParticles) {
      this.rainParticles.visible = newWeather === 'rain' || newWeather === 'thunder';
    }
  }

  public setTimeOfDay(hour: number): void {
    this.timeOfDay = hour;
    this.updateLighting(hour);
  }

  public setCameraMode(mode: CameraMode): void {
    this.cameraMode = mode;
  }

  // ==========================================
  // LIGHTING & DYNAMIC ATMOSPHERE
  // ==========================================

  private updateLighting(hour: number): void {
    const sunPos = getSunPosition(hour);
    this.sunLight.position.set(sunPos.x * 200, Math.max(sunPos.y * 220, 20), sunPos.z * 200);

    const isNight = hour < 6 || hour > 19;
    const isSunset = (hour >= 17 && hour <= 19) || (hour >= 5 && hour <= 6.5);

    const skyMat = this.skyDome.material as THREE.MeshBasicMaterial;

    if (isNight) {
      this.hemiLight.color.setHex(0x1a237e);
      this.hemiLight.groundColor.setHex(0x0a0e27);
      this.sunLight.intensity = 0.2;
      skyMat.color.setHex(0x050814);
      this.scene.fog = new THREE.FogExp2(0x080c1a, 0.004);

      // Night illuminated windows glow
      this.windowLightsMaterials.forEach((m) => {
        m.emissiveIntensity = 2.8;
      });
      this.streetLightsGroup.visible = true;
    } else if (isSunset) {
      this.hemiLight.color.setHex(0xff7043);
      this.hemiLight.groundColor.setHex(0x3e2723);
      this.sunLight.intensity = 1.8;
      skyMat.color.setHex(0xff7043);
      this.scene.fog = new THREE.FogExp2(0xd84315, 0.0035);
      this.windowLightsMaterials.forEach((m) => {
        m.emissiveIntensity = 1.5;
      });
      this.streetLightsGroup.visible = true;
    } else {
      this.hemiLight.color.setHex(0xb1e1ff);
      this.hemiLight.groundColor.setHex(0x383838);
      this.sunLight.intensity = 2.4;
      skyMat.color.setHex(0x64b5f6);
      this.scene.fog = new THREE.FogExp2(0xcfe6f5, 0.0035);
      this.windowLightsMaterials.forEach((m) => {
        m.emissiveIntensity = 0.45;
      });
      this.streetLightsGroup.visible = false;
    }
  }

  // ==========================================
  // MAIN ANIMATION LOOP
  // ==========================================

  private animate = (): void => {
    this.animFrameId = requestAnimationFrame(this.animate);
    const dt = Math.min(this.clock.getDelta(), 0.06);
    this.animTimer += dt;

    if (this.isPaused) return;

    // 1. Time progression
    if (this.autoTimeProgression) {
      this.timeOfDay = (this.timeOfDay + dt * 0.08) % 24;
      this.updateLighting(this.timeOfDay);
    }

    // 2. Physics Step: Supercar
    stepVehiclePhysics(this.vehicleState, this.inputs, dt);

    // Update Supercar mesh transforms
    this.supercarBundle.group.position.set(this.vehicleState.x, this.vehicleState.y, this.vehicleState.z);
    this.supercarBundle.group.rotation.set(this.vehicleState.pitch, this.vehicleState.yaw, this.vehicleState.roll);

    // Supercar Wheels & Nitro
    this.supercarBundle.wheels.forEach((w, idx) => {
      w.rotation.x = this.vehicleState.wheelRotations[idx];
      if (idx < 2) {
        w.rotation.y = this.vehicleState.steerAngle;
      }
    });
    this.supercarBundle.setNitroActive(this.vehicleState.isBoosting);

    // 3. Supercar Web Audio Synthesis
    soundEngine.updateEngine(
      this.vehicleState.rpm,
      this.vehicleState.gear,
      Math.abs(this.vehicleState.speed) * 3.6,
      this.vehicleState.isBoosting,
      this.vehicleState.isDrifting,
      this.playerState.inVehicle
    );

    // 4. Physics Step: Spider-Man
    stepPlayerPhysics(this.playerState, this.inputs, this.cameraYaw, dt);

    // Update Spider-Man mesh transforms
    this.spiderManBundle.group.position.set(this.playerState.x, this.playerState.y, this.playerState.z);
    this.spiderManBundle.group.rotation.y = this.playerState.yaw;

    // Update Spider-Man procedural animation
    this.spiderManBundle.updateAnimation(
      this.playerState.animAction,
      this.animTimer,
      this.playerState.swingAngle,
      this.combatState.spiderSenseActive
    );

    // 5. Update 3D Web Line during swing or zip
    if ((this.playerState.isSwinging || this.playerState.isWebZipping) && this.playerState.webAnchor) {
      const wristPos = new THREE.Vector3(
        this.playerState.x,
        this.playerState.y + 1.6,
        this.playerState.z
      );
      const anchorPos = new THREE.Vector3(
        this.playerState.webAnchor.x,
        this.playerState.webAnchor.y,
        this.playerState.webAnchor.z
      );
      this.spiderManBundle.setWebLine(wristPos, anchorPos);
    } else {
      this.spiderManBundle.setWebLine(null, null);
    }

    // 6. Update Syndicate Thugs & Combat
    const combatUpdate = updateThugs(
      this.thugs,
      this.playerState.x,
      this.playerState.y,
      this.playerState.z,
      this.playerState.inVehicle,
      this.combatState,
      dt,
      (dmg) => {
        this.playerState.health = Math.max(0, this.playerState.health - dmg);
        soundEngine.playCombatHit(false);
      }
    );

    if (combatUpdate.spiderSenseActive) {
      soundEngine.playSpiderSense();
    }

    // Update Thug visual meshes
    for (const thug of this.thugs) {
      const g = this.thugGroups.get(thug.id);
      if (g) {
        g.position.set(thug.x, thug.y, thug.z);
        g.rotation.y = thug.yaw;

        // Knockout tilt
        if (thug.health <= 0) {
          g.rotation.x = Math.PI / 2;
          g.position.y = thug.y + 0.2;
        }

        // Web cocoon
        const cocoon = g.children.find((c) => (c as THREE.Mesh).geometry === this.webCocoonGeo);
        if (cocoon) {
          cocoon.visible = thug.state === 'webbed';
        }

        // Update health bar width
        const barFill = g.children[5] as THREE.Mesh;
        if (barFill) {
          const ratio = Math.max(0, thug.health / thug.maxHealth);
          barFill.scale.set(ratio, 1, 1);
          barFill.position.x = (ratio - 1) * 0.58;
        }
      }
    }

    // 7. Dynamic Camera Rig
    this.updateCamera(dt);

    // 8. Rain Particles follow player
    if (this.rainParticles && this.rainParticles.visible) {
      const targetPos = this.playerState.inVehicle ? this.vehicleState : this.playerState;
      this.rainParticles.position.set(targetPos.x, targetPos.y, targetPos.z);
    }

    // 9. Dispatch Callbacks to HUD
    const speedKmh = Math.round(Math.abs(this.vehicleState.speed) * 3.6);
    this.callbacks.onSpeedChange(speedKmh, this.vehicleState.rpm, this.vehicleState.gear);

    const activeActor = this.playerState.inVehicle ? this.vehicleState : this.playerState;
    const headingDeg = Math.round((this.playerState.inVehicle ? this.vehicleState.yaw : this.cameraYaw) * (180 / Math.PI)) % 360;
    this.callbacks.onCoordinatesChange(Math.round(activeActor.x), Math.round(activeActor.z), (headingDeg + 360) % 360);

    if (this.callbacks.onSpiderManStateChange) {
      this.callbacks.onSpiderManStateChange(
        this.playerState.health,
        this.playerState.webFluid,
        this.playerState.isSwinging,
        this.combatState.comboCount,
        this.combatState.spiderSenseActive,
        this.combatState.totalScore
      );
    }

    // Interactive Prompt calculation
    if (this.playerState.inVehicle) {
      this.callbacks.onInteractPrompt('[E] Exit Supercar to Web-Swing', null);
    } else {
      const distToCar = Math.hypot(this.playerState.x - this.vehicleState.x, this.playerState.z - this.vehicleState.z);
      if (distToCar < 7.0) {
        this.callbacks.onInteractPrompt('[E] Enter Exotic Supercar', null);
      } else if (this.combatState.spiderSenseActive) {
        this.callbacks.onInteractPrompt('[SHIFT] SPIDER-SENSE DODGE!', null);
      } else {
        this.callbacks.onInteractPrompt(null, null);
      }
    }

    // Render Scene
    this.renderer.render(this.scene, this.camera);
  };

  private updateCamera(dt: number): void {
    if (this.isTitleScreen) {
      // Cinematic rotating flyover of the metropolis skyline
      this.titlePanAngle += dt * 0.12;
      const radius = 180;
      this.camera.position.set(
        Math.sin(this.titlePanAngle) * radius,
        140 + Math.sin(this.titlePanAngle * 0.5) * 30,
        Math.cos(this.titlePanAngle) * radius
      );
      this.camera.lookAt(0, 45, 0);
      return;
    }

    if (this.playerState.inVehicle) {
      // Supercar Follow Camera
      const forwardX = Math.sin(this.vehicleState.yaw);
      const forwardZ = Math.cos(this.vehicleState.yaw);

      const targetCamX = this.vehicleState.x - forwardX * 7.5;
      const targetCamY = this.vehicleState.y + 2.8;
      const targetCamZ = this.vehicleState.z - forwardZ * 7.5;

      this.camera.position.x += (targetCamX - this.camera.position.x) * Math.min(1, 12 * dt);
      this.camera.position.y += (targetCamY - this.camera.position.y) * Math.min(1, 10 * dt);
      this.camera.position.z += (targetCamZ - this.camera.position.z) * Math.min(1, 12 * dt);

      this.camera.lookAt(this.vehicleState.x, this.vehicleState.y + 1.2, this.vehicleState.z);
    } else {
      // Spider-Man Third-Person / Web-Swing Camera
      // Dynamic camera yaw adjustment
      if (this.inputs.left) this.cameraYaw += 2.2 * dt;
      if (this.inputs.right) this.cameraYaw -= 2.2 * dt;

      const fwdX = Math.sin(this.cameraYaw);
      const fwdZ = Math.cos(this.cameraYaw);

      // Swing chase camera pulls back and rises when soaring high
      const isHigh = this.playerState.y > 25;
      const camDist = this.playerState.isSwinging ? 10.5 : isHigh ? 8.5 : 6.2;
      const camHeight = this.playerState.isSwinging ? 4.2 : 2.5;

      const targetX = this.playerState.x - fwdX * camDist;
      const targetY = this.playerState.y + camHeight;
      const targetZ = this.playerState.z - fwdZ * camDist;

      this.camera.position.x += (targetX - this.camera.position.x) * Math.min(1, 10 * dt);
      this.camera.position.y += (targetY - this.camera.position.y) * Math.min(1, 10 * dt);
      this.camera.position.z += (targetZ - this.camera.position.z) * Math.min(1, 10 * dt);

      this.camera.lookAt(
        this.playerState.x,
        this.playerState.y + 1.5,
        this.playerState.z
      );
    }
  }

  private onWindowResize = (): void => {
    if (!this.container || !this.renderer || !this.camera) return;
    const w = this.container.clientWidth;
    const h = Math.max(1, this.container.clientHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  public destroy(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }
    window.removeEventListener('resize', this.onWindowResize);
    this.renderer.dispose();
    if (this.container && this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
