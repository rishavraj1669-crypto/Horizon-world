/**
 * Spider-Man 3D Procedural Character Mesh & Web Rope System
 * Iconic red & navy suit, spider insignia, expressive white eye lenses,
 * articulated limbs for running, web-swinging, aerial flips, and combat combos.
 */

import * as THREE from 'three';

export interface SpiderManMeshBundle {
  group: THREE.Group;
  head: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  torso: THREE.Mesh;
  spiderSenseRing: THREE.Group;
  webLine: THREE.Line;
  updateAnimation: (
    action: 'idle' | 'run' | 'sprint' | 'swing' | 'zip' | 'punch' | 'kick' | 'dodge' | 'wall',
    animTimer: number,
    swingAngle: number,
    isSpiderSense: boolean
  ) => void;
  setWebLine: (
    start: THREE.Vector3 | null,
    end: THREE.Vector3 | null,
    color?: number
  ) => void;
}

export function createSpiderManMesh(): SpiderManMeshBundle {
  const group = new THREE.Group();
  group.name = 'SpiderMan';

  // Materials
  const suitRedMat = new THREE.MeshStandardMaterial({
    color: 0xd32f2f, // Spider Red
    roughness: 0.45,
    metalness: 0.15,
  });

  const suitBlueMat = new THREE.MeshStandardMaterial({
    color: 0x1565c0, // Spider Navy Blue
    roughness: 0.45,
    metalness: 0.15,
  });

  const spiderEmblemMat = new THREE.MeshBasicMaterial({
    color: 0x111111,
  });

  const eyeWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xeeeeee,
    emissiveIntensity: 0.35,
    roughness: 0.2,
  });

  const eyeRimMat = new THREE.MeshBasicMaterial({
    color: 0x111111,
  });

  // Root Pelvis / Lower Body
  const pelvisGeo = new THREE.BoxGeometry(0.42, 0.25, 0.28);
  const pelvis = new THREE.Mesh(pelvisGeo, suitBlueMat);
  pelvis.position.set(0, 0.95, 0);
  pelvis.castShadow = true;
  group.add(pelvis);

  // Torso / Chest (Athletic superhero V-taper)
  const torsoGeo = new THREE.BoxGeometry(0.52, 0.62, 0.32);
  const torso = new THREE.Mesh(torsoGeo, suitRedMat);
  torso.position.set(0, 1.36, 0);
  torso.castShadow = true;
  group.add(torso);

  // Side blue rib inserts
  const ribGeo = new THREE.BoxGeometry(0.12, 0.58, 0.33);
  const leftRib = new THREE.Mesh(ribGeo, suitBlueMat);
  leftRib.position.set(-0.21, 1.36, 0);
  group.add(leftRib);
  const rightRib = leftRib.clone();
  rightRib.position.set(0.21, 1.36, 0);
  group.add(rightRib);

  // Spider Chest Insignia
  const emblemGeo = new THREE.BoxGeometry(0.22, 0.24, 0.04);
  const emblem = new THREE.Mesh(emblemGeo, spiderEmblemMat);
  emblem.position.set(0, 1.42, 0.17);
  group.add(emblem);

  // Head & Mask
  const head = new THREE.Group();
  head.position.set(0, 1.82, 0);

  const headGeo = new THREE.SphereGeometry(0.23, 16, 16);
  headGeo.scale(1.0, 1.25, 1.1);
  const headMesh = new THREE.Mesh(headGeo, suitRedMat);
  headMesh.castShadow = true;
  head.add(headMesh);

  // Large Expressive White Eyes with Black Rims
  const eyeRimGeo = new THREE.BoxGeometry(0.12, 0.11, 0.04);
  const eyeWhiteGeo = new THREE.BoxGeometry(0.09, 0.08, 0.05);

  const leftEyeRim = new THREE.Mesh(eyeRimGeo, eyeRimMat);
  leftEyeRim.position.set(-0.095, 0.04, 0.22);
  leftEyeRim.rotation.z = 0.25;
  head.add(leftEyeRim);

  const leftEyeWhite = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
  leftEyeWhite.position.set(-0.095, 0.04, 0.23);
  leftEyeWhite.rotation.z = 0.25;
  head.add(leftEyeWhite);

  const rightEyeRim = new THREE.Mesh(eyeRimGeo, eyeRimMat);
  rightEyeRim.position.set(0.095, 0.04, 0.22);
  rightEyeRim.rotation.z = -0.25;
  head.add(rightEyeRim);

  const rightEyeWhite = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
  rightEyeWhite.position.set(0.095, 0.04, 0.23);
  rightEyeWhite.rotation.z = -0.25;
  head.add(rightEyeWhite);

  group.add(head);

  // Spider-Sense Wavy Alert Halo above head
  const spiderSenseRing = new THREE.Group();
  spiderSenseRing.position.set(0, 2.25, 0);
  const senseLineGeo = new THREE.BoxGeometry(0.06, 0.28, 0.06);
  const senseLineMat = new THREE.MeshBasicMaterial({
    color: 0xff1744, // Glowing Red Spider-Sense
  });

  const senseAngles = [-0.65, -0.32, 0, 0.32, 0.65];
  senseAngles.forEach((ang) => {
    const sMesh = new THREE.Mesh(senseLineGeo, senseLineMat);
    sMesh.position.set(Math.sin(ang) * 0.45, Math.cos(ang) * 0.22, 0);
    sMesh.rotation.z = -ang;
    spiderSenseRing.add(sMesh);
  });
  spiderSenseRing.visible = false;
  group.add(spiderSenseRing);

  // Left Arm (Shoulder Pivot)
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.35, 1.62, 0);

  const upperArmGeo = new THREE.BoxGeometry(0.14, 0.38, 0.14);
  const leftUpperArm = new THREE.Mesh(upperArmGeo, suitRedMat);
  leftUpperArm.position.set(0, -0.19, 0);
  leftUpperArm.castShadow = true;
  leftArm.add(leftUpperArm);

  const forearmGeo = new THREE.BoxGeometry(0.13, 0.35, 0.13);
  const leftForearm = new THREE.Mesh(forearmGeo, suitBlueMat);
  leftForearm.position.set(0, -0.52, 0);
  leftForearm.castShadow = true;
  leftArm.add(leftForearm);

  // Web Shooter Gauntlet
  const gauntletGeo = new THREE.BoxGeometry(0.14, 0.12, 0.14);
  const leftGauntlet = new THREE.Mesh(gauntletGeo, suitRedMat);
  leftGauntlet.position.set(0, -0.68, 0);
  leftArm.add(leftGauntlet);
  group.add(leftArm);

  // Right Arm (Shoulder Pivot)
  const rightArm = new THREE.Group();
  rightArm.position.set(0.35, 1.62, 0);

  const rightUpperArm = new THREE.Mesh(upperArmGeo, suitRedMat);
  rightUpperArm.position.set(0, -0.19, 0);
  rightUpperArm.castShadow = true;
  rightArm.add(rightUpperArm);

  const rightForearm = new THREE.Mesh(forearmGeo, suitBlueMat);
  rightForearm.position.set(0, -0.52, 0);
  rightForearm.castShadow = true;
  rightArm.add(rightForearm);

  const rightGauntlet = new THREE.Mesh(gauntletGeo, suitRedMat);
  rightGauntlet.position.set(0, -0.68, 0);
  rightArm.add(rightGauntlet);
  group.add(rightArm);

  // Left Leg (Hip Pivot)
  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.16, 0.88, 0);

  const thighGeo = new THREE.BoxGeometry(0.16, 0.46, 0.16);
  const leftThigh = new THREE.Mesh(thighGeo, suitBlueMat);
  leftThigh.position.set(0, -0.23, 0);
  leftThigh.castShadow = true;
  leftLeg.add(leftThigh);

  const calfGeo = new THREE.BoxGeometry(0.15, 0.44, 0.15);
  const leftCalf = new THREE.Mesh(calfGeo, suitRedMat); // Red Spidey boots
  leftCalf.position.set(0, -0.64, 0);
  leftCalf.castShadow = true;
  leftLeg.add(leftCalf);
  group.add(leftLeg);

  // Right Leg (Hip Pivot)
  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.16, 0.88, 0);

  const rightThigh = new THREE.Mesh(thighGeo, suitBlueMat);
  rightThigh.position.set(0, -0.23, 0);
  rightThigh.castShadow = true;
  rightLeg.add(rightThigh);

  const rightCalf = new THREE.Mesh(calfGeo, suitRedMat);
  rightCalf.position.set(0, -0.64, 0);
  rightCalf.castShadow = true;
  rightLeg.add(rightCalf);
  group.add(rightLeg);

  // Contact Shadow underneath
  const shadowGeo = new THREE.CircleGeometry(0.65, 16);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.position.set(0, 0.02, 0);
  group.add(shadow);

  // 3D Web Line Mesh (White Tensile Rope)
  const webLineGeo = new THREE.BufferGeometry();
  const webPoints = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0)];
  webLineGeo.setFromPoints(webPoints);
  const webLineMat = new THREE.LineBasicMaterial({
    color: 0xffffff,
    linewidth: 3,
  });
  const webLine = new THREE.Line(webLineGeo, webLineMat);
  webLine.visible = false;
  webLine.frustumCulled = false;

  const setWebLine = (start: THREE.Vector3 | null, end: THREE.Vector3 | null) => {
    if (!start || !end) {
      webLine.visible = false;
      return;
    }
    webLine.visible = true;
    const positions = new Float32Array([
      start.x, start.y, start.z,
      end.x, end.y, end.z,
    ]);
    webLine.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    webLine.geometry.attributes.position.needsUpdate = true;
  };

  const updateAnimation = (
    action: 'idle' | 'run' | 'sprint' | 'swing' | 'zip' | 'punch' | 'kick' | 'dodge' | 'wall',
    animTimer: number,
    swingAngle: number,
    isSpiderSense: boolean
  ) => {
    spiderSenseRing.visible = isSpiderSense;
    if (isSpiderSense) {
      spiderSenseRing.scale.setScalar(1.0 + Math.sin(animTimer * 15) * 0.25);
    }

    if (action === 'idle') {
      const breath = Math.sin(animTimer * 2.5);
      torso.position.y = 1.36 + breath * 0.02;
      head.position.y = 1.82 + breath * 0.02;
      leftArm.rotation.set(breath * 0.08, 0, breath * 0.05);
      rightArm.rotation.set(-breath * 0.08, 0, -breath * 0.05);
      leftLeg.rotation.set(0, 0, -0.06);
      rightLeg.rotation.set(0, 0, 0.06);
    } else if (action === 'run' || action === 'sprint') {
      const freq = action === 'sprint' ? 14 : 9;
      const amp = action === 'sprint' ? 0.95 : 0.65;
      const legCycle = Math.sin(animTimer * freq);

      leftLeg.rotation.x = legCycle * amp;
      rightLeg.rotation.x = -legCycle * amp;
      leftArm.rotation.x = -legCycle * amp * 0.9;
      rightArm.rotation.x = legCycle * amp * 0.9;
      torso.rotation.x = 0.15; // Hero forward lean
    } else if (action === 'swing') {
      // Dynamic Web-Swinging pose
      // Arm raised high holding web rope, other arm back for balance
      rightArm.rotation.set(-Math.PI * 0.75, 0, 0.35);
      leftArm.rotation.set(Math.PI * 0.25, 0, -0.4);
      // Legs trailing or kicking into pendulum
      leftLeg.rotation.set(swingAngle * 0.8 - 0.2, 0, 0.1);
      rightLeg.rotation.set(swingAngle * 0.8 + 0.2, 0, -0.1);
      torso.rotation.x = swingAngle * 0.6;
    } else if (action === 'zip') {
      // High-speed acrobatic torpedo dive
      rightArm.rotation.set(-Math.PI * 0.85, 0, 0.15);
      leftArm.rotation.set(-Math.PI * 0.85, 0, -0.15);
      leftLeg.rotation.set(0.1, 0, 0.05);
      rightLeg.rotation.set(0.1, 0, -0.05);
      torso.rotation.x = Math.PI * 0.45;
    } else if (action === 'punch') {
      // Punch combo pose
      rightArm.rotation.set(-Math.PI * 0.5, 0, -0.3);
      leftArm.rotation.set(Math.PI * 0.15, 0, 0.4);
      torso.rotation.y = -0.4;
      leftLeg.rotation.set(-0.3, 0, 0);
      rightLeg.rotation.set(0.4, 0, 0);
    } else if (action === 'kick') {
      // High spinning aerial kick
      rightLeg.rotation.set(-Math.PI * 0.55, 0, -0.2);
      leftLeg.rotation.set(0.15, 0, 0);
      leftArm.rotation.set(-0.5, 0, -0.6);
      rightArm.rotation.set(0.4, 0, 0.5);
      torso.rotation.z = 0.35;
    } else if (action === 'dodge') {
      // Acrobatic backflip dodge
      torso.rotation.x = -Math.PI * 0.6;
      leftArm.rotation.set(Math.PI * 0.7, 0, 0.3);
      rightArm.rotation.set(Math.PI * 0.7, 0, -0.3);
      leftLeg.rotation.set(-0.8, 0, 0);
      rightLeg.rotation.set(-0.8, 0, 0);
    } else if (action === 'wall') {
      // Wall crawling stance
      torso.rotation.x = Math.PI * 0.45;
      leftArm.rotation.set(-Math.PI * 0.5, 0, -0.5);
      rightArm.rotation.set(-Math.PI * 0.5, 0, 0.5);
      leftLeg.rotation.set(Math.PI * 0.4, 0, -0.4);
      rightLeg.rotation.set(Math.PI * 0.4, 0, 0.4);
    }
  };

  return {
    group,
    head,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    torso,
    spiderSenseRing,
    webLine,
    updateAnimation,
    setWebLine,
  };
}
