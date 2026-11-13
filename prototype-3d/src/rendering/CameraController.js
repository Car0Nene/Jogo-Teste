import * as THREE from 'three';

export class CameraController {
  constructor() {
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    this.camera.position.set(0, 4.2, 9.5);
    this.camera.lookAt(0, 1.5, 0);
  }

  setAspect(width, height) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  update(fighters) {
    const total = fighters.filter(Boolean);
    if (!total.length) return;
    const midX = total.reduce((sum, fighter) => sum + fighter.x, 0) / total.length;
    const midZ = total.reduce((sum, fighter) => sum + fighter.z, 0) / total.length;
    const target = new THREE.Vector3(midX * 0.35, 4.2 + Math.max(0, Math.abs(total[0].y - total[1].y)) * 0.15, 9.5 + (1.2 - Math.min(1, Math.abs(midZ) * 0.25)));
    this.camera.position.lerp(target, 0.08);
    this.camera.lookAt(midX * 0.55, 1.4, midZ * 0.5);
  }
}
