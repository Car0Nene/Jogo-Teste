/**
 * Efeitos de impacto da luta: faíscas (com pool de malhas reaproveitadas), corações e o "estouro"
 * dos golpes que derrubam. Também a limpeza padrão de efeitos (geometria/material liberados,
 * texturas compartilhadas mantidas). Extraído do GameEngine sem mudar o comportamento.
 */
import * as THREE from 'three';
import { buildBurstMesh } from '../propsBuilder';

interface SparkParticle {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
}

interface Burst {
  mesh: THREE.Group;
  life: number;
  maxLife: number;
}

/** Máximo de malhas de faísca guardadas para reuso. */
const SPARK_POOL_MAX = 160;

export class HitEffects {
  readonly sparkGeo: THREE.SphereGeometry;
  readonly heartGeo: THREE.ShapeGeometry;
  private sparks: SparkParticle[] = [];
  private bursts: Burst[] = [];
  private sparkMats = new Map<string, THREE.MeshBasicMaterial>();
  private sparkPool: THREE.Mesh[] = [];

  constructor(private scene: THREE.Scene) {
    this.sparkGeo = new THREE.SphereGeometry(0.06, 8, 6);
    const heart = new THREE.Shape();
    heart.moveTo(0, -0.13);
    heart.bezierCurveTo(-0.3, 0.06, -0.14, 0.23, 0, 0.1);
    heart.bezierCurveTo(0.14, 0.23, 0.3, 0.06, 0, -0.13);
    this.heartGeo = new THREE.ShapeGeometry(heart);
  }

  /** Material compartilhado por cor (faísca redonda ou coração). */
  sparkMaterial(colorHex: number, hearts: boolean): THREE.MeshBasicMaterial {
    const key = `${colorHex}:${hearts ? 1 : 0}`;
    let mat = this.sparkMats.get(key);
    if (!mat) {
      mat = new THREE.MeshBasicMaterial({ color: colorHex, side: hearts ? THREE.DoubleSide : THREE.FrontSide });
      this.sparkMats.set(key, mat);
    }
    return mat;
  }

  spawnSparks(x: number, y: number, colorHex: number, count = 10, hearts = false) {
    const mat = this.sparkMaterial(colorHex, hearts);
    const geo = hearts ? this.heartGeo : this.sparkGeo;
    for (let i = 0; i < count; i++) {
      const pooled = this.sparkPool.pop();
      const m = pooled ?? new THREE.Mesh(geo, mat);
      m.geometry = geo;
      m.material = mat;
      m.scale.setScalar(1);
      m.position.set(x, y, (Math.random() - 0.5) * 0.4);
      this.scene.add(m);
      const a = Math.random() * Math.PI * 2;
      const spd = 2.5 + Math.random() * 5.2;
      this.sparks.push({
        mesh: m,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd + 1.5,
        vz: (Math.random() - 0.5) * 2.5,
        life: 0.36 + Math.random() * 0.18,
        maxLife: 0.5,
      });
    }
  }

  spawnBurst(x: number, y: number) {
    const mesh = buildBurstMesh();
    mesh.position.set(x, y, 0.25);
    this.scene.add(mesh);
    this.bursts.push({ mesh, life: 0.24, maxLife: 0.24 });
  }

  update(dt: number) {
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i];
      b.life -= dt;
      const t = 1 - Math.max(0, b.life / b.maxLife);
      b.mesh.scale.setScalar(0.7 + Math.sin(t * Math.PI) * 0.55);
      if (b.life <= 0) {
        this.removeFx(b.mesh);
        this.bursts.splice(i, 1);
      }
    }
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.life -= dt;
      s.vy -= 14 * dt;
      s.mesh.position.x += s.vx * dt;
      s.mesh.position.y += s.vy * dt;
      s.mesh.position.z += s.vz * dt;
      s.mesh.scale.setScalar(Math.max(0.01, s.life / s.maxLife));
      if (s.life <= 0) {
        this.releaseSpark(s.mesh);
        this.sparks.splice(i, 1);
      }
    }
  }

  /** Remove todas as faíscas e estouros em cena (troca de round/partida). */
  clear() {
    for (const b of this.bursts) this.removeFx(b.mesh);
    this.bursts = [];
    for (const s of this.sparks) this.releaseSpark(s.mesh);
    this.sparks = [];
  }

  /** Tira um efeito de cena e libera geometria/material (texturas são compartilhadas e ficam). */
  removeFx(obj: THREE.Object3D) {
    this.scene.remove(obj);
    obj.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (!this.isShared(mesh.geometry)) mesh.geometry?.dispose();
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) m?.dispose();
    });
  }

  /** Geometrias que pertencem a este sistema e não podem ser liberadas por quem limpa a cena. */
  isShared(geo: THREE.BufferGeometry | undefined): boolean {
    return geo === this.sparkGeo || geo === this.heartGeo;
  }

  dispose() {
    this.clear();
    this.sparkGeo.dispose();
    this.heartGeo.dispose();
    for (const m of this.sparkMats.values()) m.dispose();
    this.sparkMats.clear();
    this.sparkPool = [];
  }

  private releaseSpark(m: THREE.Mesh) {
    this.scene.remove(m);
    if (this.sparkPool.length < SPARK_POOL_MAX) this.sparkPool.push(m);
  }
}
