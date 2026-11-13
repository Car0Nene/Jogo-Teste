import * as THREE from 'three';

export class Renderer {
  constructor({ canvas = null } = {}) {
    const options = { antialias: true, alpha: true };
    if (canvas) options.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer(options);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x070b12, 1);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
  }

  setSize(width, height) {
    this.renderer.setSize(width, height, false);
  }

  render(scene, camera) {
    this.renderer.render(scene, camera);
  }

  get domElement() {
    return this.renderer.domElement;
  }
}
