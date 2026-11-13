import * as THREE from 'three';

function makeMaterial(color) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.78, metalness: 0.08 });
}

export class CharacterModel {
  constructor(config) {
    this.root = new THREE.Group();
    this.parts = {};
    this.config = config;
    this.createBody();
  }

  createBody() {
    const skin = makeMaterial(this.config.skin);
    const shirt = makeMaterial(this.config.shirt);
    const pants = makeMaterial(this.config.pants);
    const hair = makeMaterial(this.config.hair);
    const accent = makeMaterial(this.config.accent);
    const dark = makeMaterial(0x1c1d20);

    const torso = new THREE.Mesh(new THREE.SphereGeometry(0.48, 22, 18), shirt);
    torso.scale.set(1, 1.2, 0.8);
    torso.position.set(0, 1.7, 0);
    torso.castShadow = true;
    this.root.add(torso);
    this.parts.torso = torso;

    const pelvis = new THREE.Mesh(new THREE.SphereGeometry(0.38, 18, 12), pants);
    pelvis.scale.set(1, 0.8, 0.9);
    pelvis.position.set(0, 1.02, 0);
    pelvis.castShadow = true;
    this.root.add(pelvis);
    this.parts.pelvis = pelvis;

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 24, 20), skin);
    head.position.set(0, 2.58, 0);
    head.castShadow = true;
    this.root.add(head);
    this.parts.head = head;

    const hairMesh = new THREE.Mesh(new THREE.SphereGeometry(0.36, 20, 18, 0, Math.PI * 2, 0, Math.PI * 0.75), hair);
    hairMesh.position.set(0, 2.84, -0.04);
    hairMesh.scale.set(1.05, 0.8, 1.1);
    hairMesh.castShadow = true;
    this.root.add(hairMesh);
    this.parts.hair = hairMesh;

    const leftArm = new THREE.Group();
    leftArm.position.set(-0.55, 1.85, 0);
    const leftUpper = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.6, 6, 12), shirt);
    leftUpper.rotation.z = Math.PI / 2;
    leftArm.add(leftUpper);
    const leftFore = new THREE.Mesh(new THREE.CapsuleGeometry(0.10, 0.55, 6, 12), skin);
    leftFore.position.set(-0.38, -0.18, 0.04);
    leftFore.rotation.z = Math.PI / 2;
    leftArm.add(leftFore);
    this.root.add(leftArm);
    this.parts.leftArm = leftArm;

    const rightArm = new THREE.Group();
    rightArm.position.set(0.55, 1.85, 0);
    const rightUpper = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.6, 6, 12), shirt);
    rightUpper.rotation.z = Math.PI / 2;
    rightArm.add(rightUpper);
    const rightFore = new THREE.Mesh(new THREE.CapsuleGeometry(0.10, 0.55, 6, 12), skin);
    rightFore.position.set(0.38, -0.18, 0.04);
    rightFore.rotation.z = Math.PI / 2;
    rightArm.add(rightFore);
    this.root.add(rightArm);
    this.parts.rightArm = rightArm;

    const leftLeg = new THREE.Group();
    leftLeg.position.set(-0.2, 0.74, 0);
    const leftThigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.65, 6, 12), pants);
    leftThigh.rotation.z = Math.PI / 2;
    leftLeg.add(leftThigh);
    const leftShin = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.7, 6, 12), pants);
    leftShin.position.set(-0.02, -0.64, 0);
    leftShin.rotation.z = Math.PI / 2;
    leftLeg.add(leftShin);
    const leftFoot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.42), dark);
    leftFoot.position.set(-0.02, -1.12, 0.12);
    leftLeg.add(leftFoot);
    this.root.add(leftLeg);
    this.parts.leftLeg = leftLeg;

    const rightLeg = new THREE.Group();
    rightLeg.position.set(0.2, 0.74, 0);
    const rightThigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.65, 6, 12), pants);
    rightThigh.rotation.z = Math.PI / 2;
    rightLeg.add(rightThigh);
    const rightShin = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.7, 6, 12), pants);
    rightShin.position.set(0.02, -0.64, 0);
    rightShin.rotation.z = Math.PI / 2;
    rightLeg.add(rightShin);
    const rightFoot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.42), dark);
    rightFoot.position.set(0.02, -1.12, 0.12);
    rightLeg.add(rightFoot);
    this.root.add(rightLeg);
    this.parts.rightLeg = rightLeg;

    const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.06, 12, 22, Math.PI * 1.8), accent);
    scarf.rotation.x = Math.PI / 2;
    scarf.position.set(0, 1.72, 0.22);
    this.root.add(scarf);
    this.parts.scarf = scarf;

    this.root.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }

  updateFromRuntime(runtime) {
    const crouchFactor = runtime.crouch ? 0.84 : 1;
    const grounded = runtime.y <= 0.02;
    const moving = Math.abs(runtime.vx) > 0.08 || Math.abs(runtime.vz) > 0.08;
    const attackPhase = runtime.attack ? Math.min(1, runtime.attack.time / Math.max(runtime.attack.move.startup + runtime.attack.move.active + runtime.attack.move.recovery, 0.01)) : 0;

    this.root.position.set(runtime.x, runtime.y + 0.1, runtime.z);
    this.root.rotation.y = runtime.facing === 1 ? 0 : Math.PI;
    this.root.scale.setScalar(crouchFactor);

    this.parts.leftLeg.rotation.x = grounded ? (moving ? Math.sin(runtime.age * 8) * 0.55 : 0.15) : -0.1;
    this.parts.rightLeg.rotation.x = grounded ? (moving ? -Math.sin(runtime.age * 8) * 0.55 : 0.15) : -0.1;
    this.parts.leftArm.rotation.x = runtime.block ? -0.8 : (runtime.attack ? -Math.sin(attackPhase * Math.PI) * 1.2 : (moving ? Math.sin(runtime.age * 8) * 0.6 : 0.12));
    this.parts.rightArm.rotation.x = runtime.block ? -0.8 : (runtime.attack ? -Math.sin(attackPhase * Math.PI) * 1.2 : (moving ? -Math.sin(runtime.age * 8) * 0.6 : 0.12));
    this.parts.torso.rotation.x = runtime.crouch ? 0.22 : 0;
    this.parts.torso.rotation.z = runtime.block ? (runtime.facing === 1 ? -0.1 : 0.1) : 0;
    this.parts.head.rotation.y = runtime.block ? 0.2 : 0;
  }
}
