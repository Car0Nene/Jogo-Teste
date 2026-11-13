import * as THREE from 'three';

export class LightingSystem {
  constructor(scene) {
    this.scene = scene;
    this.ambient = new THREE.HemisphereLight(0xb8d6ff, 0x1d1111, 1.15);
    this.mainLight = new THREE.DirectionalLight(0xfff7d6, 1.35);
    this.mainLight.position.set(5.5, 9, 6.5);
    this.mainLight.castShadow = true;
    this.mainLight.shadow.mapSize.set(1024, 1024);
    this.mainLight.shadow.camera.left = -8;
    this.mainLight.shadow.camera.right = 8;
    this.mainLight.shadow.camera.top = 8;
    this.mainLight.shadow.camera.bottom = -8;
    this.mainLight.shadow.camera.near = 0.1;
    this.mainLight.shadow.camera.far = 28;

    this.rimLight = new THREE.PointLight(0x55b8ff, 1.1, 28, 2);
    this.rimLight.position.set(-5, 5, -4);

    scene.add(this.ambient, this.mainLight, this.rimLight);
  }
}
