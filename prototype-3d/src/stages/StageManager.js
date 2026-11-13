import * as THREE from 'three';

export class StageManager {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.buildArena();
  }

  buildArena() {
    const floor = new THREE.Mesh(
      new THREE.CylinderGeometry(7.5, 8.5, 0.8, 50),
      new THREE.MeshStandardMaterial({ color: 0x30261f, roughness: 0.96, metalness: 0.08 })
    );
    floor.receiveShadow = true;
    floor.position.y = -0.45;
    this.group.add(floor);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(5.4, 0.18, 16, 100),
      new THREE.MeshStandardMaterial({ color: 0x7ae4c6, emissive: 0x0a2017, roughness: 0.5 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.02;
    this.group.add(ring);

    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(15, 5, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x11151d, roughness: 0.88 })
    );
    backWall.position.set(0, 2.5, -4.5);
    this.group.add(backWall);

    const neon = new THREE.Mesh(
      new THREE.BoxGeometry(11, 0.2, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x59d3ff, emissive: 0x2ac8ff, emissiveIntensity: 1.6 })
    );
    neon.position.set(0, 3.2, -4.2);
    this.group.add(neon);

    const stageLight = new THREE.PointLight(0x73d7ff, 1.6, 32, 2);
    stageLight.position.set(0, 4.5, 2.8);
    this.group.add(stageLight);
  }
}
