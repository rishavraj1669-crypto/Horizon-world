/**
 * Exotic Supercar 3D Procedural Mesh
 * High-performance aerodynamic supercar featuring low-slung wedge silhouette,
 * carbon fiber aero splitters & diffuser, GT spoiler, quad exhaust with nitro flames,
 * xenon projector headlights, glowing LED taillights, and sports alloy wheels.
 */

import * as THREE from 'three';

export interface SupercarMeshBundle {
  group: THREE.Group;
  wheels: THREE.Group[];
  leftHeadlight: THREE.SpotLight;
  rightHeadlight: THREE.SpotLight;
  leftHeadlightTarget: THREE.Object3D;
  rightHeadlightTarget: THREE.Object3D;
  tailLightsMaterial: THREE.MeshStandardMaterial;
  nitroFlames: THREE.Mesh[];
  setNitroActive: (active: boolean) => void;
}

export function createSupercarMesh(): SupercarMeshBundle {
  const group = new THREE.Group();
  group.name = 'Supercar';

  // Materials
  // Exotic Metallic Paint (Deep Crimson / Italian Red)
  const bodyPaintMaterial = new THREE.MeshStandardMaterial({
    color: 0xcc1122,
    metalness: 0.85,
    roughness: 0.18,
  });

  // Carbon Fiber Material
  const carbonMaterial = new THREE.MeshStandardMaterial({
    color: 0x181818,
    metalness: 0.4,
    roughness: 0.65,
  });

  // Tinted Glass Canopy
  const glassMaterial = new THREE.MeshStandardMaterial({
    color: 0x050810,
    metalness: 0.9,
    roughness: 0.1,
    transparent: true,
    opacity: 0.88,
  });

  // Chrome / Alloy Trim
  const chromeMaterial = new THREE.MeshStandardMaterial({
    color: 0xeeeeee,
    metalness: 0.95,
    roughness: 0.12,
  });

  // LED Taillights (Emissive Red)
  const tailLightsMaterial = new THREE.MeshStandardMaterial({
    color: 0xff1122,
    emissive: 0xff0022,
    emissiveIntensity: 3.5,
    roughness: 0.3,
  });

  // Headlight Lenses (Emissive Xenon White/Cyan)
  const headLightsLensMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xccf0ff,
    emissiveIntensity: 4.0,
    roughness: 0.2,
  });

  // 1. Lower Main Chassis / Underbody
  const chassisGeo = new THREE.BoxGeometry(2.0, 0.32, 4.4);
  const chassisMesh = new THREE.Mesh(chassisGeo, carbonMaterial);
  chassisMesh.position.set(0, 0.36, 0);
  chassisMesh.castShadow = true;
  chassisMesh.receiveShadow = true;
  group.add(chassisMesh);

  // 2. Sleek Aerodynamic Body Shell (Front Wedge + Side Pods)
  const mainBodyGeo = new THREE.BoxGeometry(1.92, 0.45, 3.8);
  const mainBodyMesh = new THREE.Mesh(mainBodyGeo, bodyPaintMaterial);
  mainBodyMesh.position.set(0, 0.58, -0.1);
  mainBodyMesh.castShadow = true;
  mainBodyMesh.receiveShadow = true;
  group.add(mainBodyMesh);

  // Slanted Hood / Front Nose
  const hoodGeo = new THREE.BoxGeometry(1.82, 0.25, 1.3);
  const hoodMesh = new THREE.Mesh(hoodGeo, bodyPaintMaterial);
  hoodMesh.position.set(0, 0.48, 1.8);
  hoodMesh.rotation.x = 0.12;
  hoodMesh.castShadow = true;
  group.add(hoodMesh);

  // Front Carbon Fiber Splitter
  const splitterGeo = new THREE.BoxGeometry(2.06, 0.08, 0.45);
  const splitterMesh = new THREE.Mesh(splitterGeo, carbonMaterial);
  splitterMesh.position.set(0, 0.24, 2.38);
  splitterMesh.castShadow = true;
  group.add(splitterMesh);

  // 3. Cockpit Glass Canopy (Aerodynamic teardrop cabin)
  const cabinGeo = new THREE.BoxGeometry(1.42, 0.48, 1.8);
  const cabinMesh = new THREE.Mesh(cabinGeo, glassMaterial);
  cabinMesh.position.set(0, 0.95, -0.2);
  cabinMesh.castShadow = true;
  group.add(cabinMesh);

  // Aerodynamic Roof Air Intake Scoop
  const roofScoopGeo = new THREE.BoxGeometry(0.38, 0.14, 0.7);
  const roofScoopMesh = new THREE.Mesh(roofScoopGeo, carbonMaterial);
  roofScoopMesh.position.set(0, 1.23, -0.15);
  group.add(roofScoopMesh);

  // 4. Side Aerodynamic Air Intakes (Radiator Pods)
  const leftPodGeo = new THREE.BoxGeometry(0.24, 0.38, 1.2);
  const leftPod = new THREE.Mesh(leftPodGeo, carbonMaterial);
  leftPod.position.set(-1.02, 0.58, -0.3);
  group.add(leftPod);

  const rightPod = leftPod.clone();
  rightPod.position.set(1.02, 0.58, -0.3);
  group.add(rightPod);

  // 5. Rear Carbon Diffuser & GT Rear Wing
  const diffuserGeo = new THREE.BoxGeometry(1.9, 0.2, 0.5);
  const diffuserMesh = new THREE.Mesh(diffuserGeo, carbonMaterial);
  diffuserMesh.position.set(0, 0.3, -2.15);
  diffuserMesh.rotation.x = -0.2;
  group.add(diffuserMesh);

  // GT Rear Wing (Spoiler)
  const wingBladeGeo = new THREE.BoxGeometry(2.08, 0.06, 0.42);
  const wingBlade = new THREE.Mesh(wingBladeGeo, carbonMaterial);
  wingBlade.position.set(0, 1.15, -2.05);
  wingBlade.castShadow = true;
  group.add(wingBlade);

  const wingStrutGeo = new THREE.BoxGeometry(0.06, 0.38, 0.12);
  const leftStrut = new THREE.Mesh(wingStrutGeo, carbonMaterial);
  leftStrut.position.set(-0.65, 0.96, -2.02);
  group.add(leftStrut);
  const rightStrut = leftStrut.clone();
  rightStrut.position.set(0.65, 0.96, -2.02);
  group.add(rightStrut);

  // 6. Xenon Projector Headlights
  const leftHeadLightLens = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 0.08), headLightsLensMaterial);
  leftHeadLightLens.position.set(-0.68, 0.56, 2.38);
  group.add(leftHeadLightLens);

  const rightHeadLightLens = leftHeadLightLens.clone();
  rightHeadLightLens.position.set(0.68, 0.56, 2.38);
  group.add(rightHeadLightLens);

  // Real Spotlight Beams for Night & Dusk
  const leftHeadlight = new THREE.SpotLight(0xffffff, 4.0, 65, Math.PI / 6, 0.35, 1.2);
  leftHeadlight.position.set(-0.68, 0.56, 2.4);
  const leftHeadlightTarget = new THREE.Object3D();
  leftHeadlightTarget.position.set(-0.68, 0.1, 15);
  group.add(leftHeadlight);
  group.add(leftHeadlightTarget);
  leftHeadlight.target = leftHeadlightTarget;

  const rightHeadlight = new THREE.SpotLight(0xffffff, 4.0, 65, Math.PI / 6, 0.35, 1.2);
  rightHeadlight.position.set(0.68, 0.56, 2.4);
  const rightHeadlightTarget = new THREE.Object3D();
  rightHeadlightTarget.position.set(0.68, 0.1, 15);
  group.add(rightHeadlight);
  group.add(rightHeadlightTarget);
  rightHeadlight.target = rightHeadlightTarget;

  // 7. LED Horizontal Taillight Strip
  const tailLightMesh = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.08, 0.06), tailLightsMaterial);
  tailLightMesh.position.set(0, 0.72, -2.08);
  group.add(tailLightMesh);

  // 8. Quad Chrome Exhaust Tips
  const exhaustGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.22, 12);
  exhaustGeo.rotateX(Math.PI / 2);

  const exhaustPositions = [
    [-0.32, 0.42, -2.18],
    [-0.14, 0.42, -2.18],
    [0.14, 0.42, -2.18],
    [0.32, 0.42, -2.18],
  ];

  const nitroFlames: THREE.Mesh[] = [];
  const flameGeo = new THREE.ConeGeometry(0.12, 0.65, 8);
  flameGeo.rotateX(-Math.PI / 2);
  const flameMat = new THREE.MeshBasicMaterial({
    color: 0x00d2ff,
    transparent: true,
    opacity: 0.0,
  });

  exhaustPositions.forEach(([x, y, z]) => {
    const pipe = new THREE.Mesh(exhaustGeo, chromeMaterial);
    pipe.position.set(x, y, z);
    group.add(pipe);

    // Nitro flame cone
    const flame = new THREE.Mesh(flameGeo, flameMat.clone());
    flame.position.set(x, y, z - 0.35);
    flame.visible = false;
    group.add(flame);
    nitroFlames.push(flame);
  });

  // 9. Sports Alloy Wheels with Brembo-style Red Calipers
  const wheels: THREE.Group[] = [];
  const wheelPositions = [
    [-1.02, 0.42, 1.45],  // Front Left
    [1.02, 0.42, 1.45],   // Front Right
    [-1.02, 0.44, -1.45], // Rear Left
    [1.02, 0.44, -1.45],  // Rear Right
  ];

  const tireRubberMat = new THREE.MeshStandardMaterial({
    color: 0x1c1c1c,
    roughness: 0.85,
    metalness: 0.1,
  });

  const rimMat = new THREE.MeshStandardMaterial({
    color: 0x2b2b2b,
    metalness: 0.9,
    roughness: 0.2,
  });

  const brakeCaliperMat = new THREE.MeshStandardMaterial({
    color: 0xff0022,
    metalness: 0.5,
    roughness: 0.3,
  });

  const tireGeo = new THREE.CylinderGeometry(0.44, 0.44, 0.36, 24);
  tireGeo.rotateZ(Math.PI / 2);

  const rimGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.37, 16);
  rimGeo.rotateZ(Math.PI / 2);

  const caliperGeo = new THREE.BoxGeometry(0.12, 0.2, 0.18);

  wheelPositions.forEach(([wx, wy, wz]) => {
    const wheelGroup = new THREE.Group();
    wheelGroup.position.set(wx, wy, wz);

    const tireMesh = new THREE.Mesh(tireGeo, tireRubberMat);
    tireMesh.castShadow = true;
    wheelGroup.add(tireMesh);

    const rimMesh = new THREE.Mesh(rimGeo, rimMat);
    wheelGroup.add(rimMesh);

    // Brake Caliper
    const caliper = new THREE.Mesh(caliperGeo, brakeCaliperMat);
    caliper.position.set(wx > 0 ? -0.1 : 0.1, 0.16, 0);
    wheelGroup.add(caliper);

    group.add(wheelGroup);
    wheels.push(wheelGroup);
  });

  // Soft Contact Shadow Disc under supercar
  const shadowGeo = new THREE.CircleGeometry(2.3, 24);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.48,
    depthWrite: false,
  });
  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.position.set(0, 0.03, 0);
  group.add(shadowMesh);

  const setNitroActive = (active: boolean) => {
    nitroFlames.forEach((flame) => {
      flame.visible = active;
      if (active) {
        (flame.material as THREE.MeshBasicMaterial).opacity = 0.85 + Math.random() * 0.15;
        const scale = 0.85 + Math.random() * 0.35;
        flame.scale.set(scale, scale, scale * 1.3);
      }
    });
  };

  return {
    group,
    wheels,
    leftHeadlight,
    rightHeadlight,
    leftHeadlightTarget,
    rightHeadlightTarget,
    tailLightsMaterial,
    nitroFlames,
    setNitroActive,
  };
}
