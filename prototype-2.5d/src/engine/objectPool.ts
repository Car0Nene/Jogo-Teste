/**
 * Object Pool for Spark & Particle Effects
 * Recycles materials and particles to avoid GC pauses during combat
 */

import * as THREE from 'three';

interface PooledMaterial {
  material: THREE.MeshBasicMaterial;
  inUse: boolean;
}

interface PooledMesh {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  inUse: boolean;
}

export class ParticlePoolManager {
  private materialPool: Map<string, PooledMaterial[]> = new Map();
  private sparkGeo: THREE.SphereGeometry;
  private heartGeo: THREE.ShapeGeometry;
  private maxPoolSize = 200;
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene, sparkGeo: THREE.SphereGeometry, heartGeo: THREE.ShapeGeometry) {
    this.scene = scene;
    this.sparkGeo = sparkGeo;
    this.heartGeo = heartGeo;
  }

  /**
   * Get or create a material for a given color
   * Reuses existing materials from pool to avoid GC
   */
  public getMaterial(colorHex: number, isHeart: boolean = false): THREE.MeshBasicMaterial {
    const key = `${colorHex}_${isHeart}`;
    let pool = this.materialPool.get(key);

    if (!pool) {
      pool = [];
      this.materialPool.set(key, pool);
    }

    // Try to find an unused material
    const unused = pool.find(p => !p.inUse);
    if (unused) {
      unused.inUse = true;
      return unused.material;
    }

    // Create new material if pool not full
    if (pool.length < this.maxPoolSize) {
      const mat = new THREE.MeshBasicMaterial({
        color: colorHex,
        side: isHeart ? THREE.DoubleSide : THREE.FrontSide,
      });
      const pooledMat: PooledMaterial = { material: mat, inUse: true };
      pool.push(pooledMat);
      return mat;
    }

    // Pool is full, reuse the first one and change color
    const mat = pool[0].material;
    mat.color.setHex(colorHex);
    pool[0].inUse = true;
    return mat;
  }

  /**
   * Release a material back to the pool
   */
  public releaseMaterial(colorHex: number, isHeart: boolean = false) {
    const key = `${colorHex}_${isHeart}`;
    const pool = this.materialPool.get(key);
    if (pool) {
      const pooled = pool.find(p => p.material.color.getHex() === colorHex);
      if (pooled) {
        pooled.inUse = false;
      }
    }
  }

  /**
   * Create a spark mesh (reused from pool)
   */
  public createSparkMesh(
    colorHex: number,
    x: number,
    y: number,
    z: number,
    isHeart: boolean = false
  ): THREE.Mesh {
    const mat = this.getMaterial(colorHex, isHeart);
    const geo = isHeart ? this.heartGeo : this.sparkGeo;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    this.scene.add(mesh);
    return mesh;
  }

  /**
   * Dispose everything (call on engine cleanup)
   */
  public dispose() {
    for (const [, pool] of this.materialPool) {
      for (const pooledMat of pool) {
        pooledMat.material.dispose();
      }
    }
    this.materialPool.clear();
  }

  /**
   * Get pool statistics (for debugging)
   */
  public getStats() {
    const stats: Record<string, { total: number; inUse: number }> = {};
    for (const [key, pool] of this.materialPool) {
      stats[key] = {
        total: pool.length,
        inUse: pool.filter(p => p.inUse).length,
      };
    }
    return stats;
  }
}

/**
 * Burst mesh pool — pre-build and reuse
 */
export class BurstMeshPool {
  private burstPool: Array<{ mesh: THREE.Group; inUse: boolean }> = [];
  private maxPoolSize = 20;
  private scene: THREE.Scene;
  private burstMeshBuilder: () => THREE.Group;

  constructor(
    scene: THREE.Scene,
    burstMeshBuilder: () => THREE.Group
  ) {
    this.scene = scene;
    this.burstMeshBuilder = burstMeshBuilder;
    // Pre-build initial pool
    for (let i = 0; i < Math.min(10, this.maxPoolSize); i++) {
      const mesh = this.burstMeshBuilder();
      mesh.visible = false;
      this.scene.add(mesh);
      this.burstPool.push({ mesh, inUse: false });
    }
  }

  /**
   * Get a burst mesh from pool or create new
   */
  public getBurstMesh(x: number, y: number, z: number): THREE.Group {
    // Try to find unused mesh
    const unused = this.burstPool.find(b => !b.inUse);
    if (unused) {
      unused.inUse = true;
      unused.mesh.position.set(x, y, z);
      unused.mesh.visible = true;
      return unused.mesh;
    }

    // Create new if pool not full
    if (this.burstPool.length < this.maxPoolSize) {
      const mesh = this.burstMeshBuilder();
      mesh.position.set(x, y, z);
      this.scene.add(mesh);
      this.burstPool.push({ mesh, inUse: true });
      return mesh;
    }

    // Reuse first one (last resort)
    this.burstPool[0].inUse = true;
    this.burstPool[0].mesh.position.set(x, y, z);
    this.burstPool[0].mesh.visible = true;
    return this.burstPool[0].mesh;
  }

  /**
   * Release a burst mesh back to pool
   */
  public releaseBurstMesh(mesh: THREE.Group) {
    const pooled = this.burstPool.find(b => b.mesh === mesh);
    if (pooled) {
      pooled.inUse = false;
      mesh.visible = false;
    }
  }

  /**
   * Dispose everything
   */
  public dispose() {
    for (const pooled of this.burstPool) {
      this.scene.remove(pooled.mesh);
      // Dispose geometries and materials
      pooled.mesh.traverse(node => {
        if (node instanceof THREE.Mesh) {
          node.geometry.dispose();
          if (Array.isArray(node.material)) {
            node.material.forEach(m => m.dispose());
          } else {
            node.material.dispose();
          }
        }
      });
    }
    this.burstPool = [];
  }

  /**
   * Get pool statistics
   */
  public getStats() {
    return {
      total: this.burstPool.length,
      inUse: this.burstPool.filter(b => b.inUse).length,
      maxSize: this.maxPoolSize,
    };
  }
}

/**
 * Audio clip pool — pre-load and reuse Audio elements
 */
export class AudioClipPool {
  private clipPool: Map<string, Array<{ element: HTMLAudioElement; inUse: boolean }>> = new Map();
  private maxPoolPerClip = 3; // Allow up to 3 simultaneous plays of same clip
  private activeLoads = new Set<string>();

  /**
   * Pre-load a clip (populate pool)
   */
  public preloadClip(url: string): void {
    if (this.clipPool.has(url) || this.activeLoads.has(url)) return;

    this.activeLoads.add(url);
    for (let i = 0; i < this.maxPoolPerClip; i++) {
      const el = new Audio(url);
      el.preload = 'auto';
      el.addEventListener(
        'canplay',
        () => {
          this.activeLoads.delete(url);
        },
        { once: true }
      );
      el.load();
      
      if (!this.clipPool.has(url)) {
        this.clipPool.set(url, []);
      }
      this.clipPool.get(url)!.push({ element: el, inUse: false });
    }
  }

  /**
   * Get an audio element (clone if original is playing)
   */
  public getAudioElement(url: string): HTMLAudioElement | null {
    if (!this.clipPool.has(url)) {
      this.preloadClip(url);
      return null; // Not ready yet
    }

    const pool = this.clipPool.get(url)!;
    const unused = pool.find(p => !p.inUse && p.element.paused);
    if (unused) {
      unused.inUse = true;
      unused.element.currentTime = 0;
      return unused.element;
    }

    // Need to create a new instance (simultaneous plays)
    if (pool.length < this.maxPoolPerClip * 2) {
      const clone = pool[0].element.cloneNode() as HTMLAudioElement;
      pool.push({ element: clone, inUse: true });
      return clone;
    }

    // Pool full, reuse (will interrupt)
    pool[0].inUse = true;
    pool[0].element.currentTime = 0;
    return pool[0].element;
  }

  /**
   * Release audio element
   */
  public releaseAudioElement(url: string, element: HTMLAudioElement) {
    const pool = this.clipPool.get(url);
    if (pool) {
      const pooled = pool.find(p => p.element === element);
      if (pooled) {
        pooled.inUse = false;
      }
    }
  }

  /**
   * Dispose everything
   */
  public dispose() {
    for (const [, pool] of this.clipPool) {
      for (const pooled of pool) {
        pooled.element.pause();
        pooled.element.src = '';
      }
    }
    this.clipPool.clear();
    this.activeLoads.clear();
  }

  /**
   * Get pool statistics
   */
  public getStats() {
    const stats: Record<string, { total: number; inUse: number }> = {};
    for (const [key, pool] of this.clipPool) {
      stats[key] = {
        total: pool.length,
        inUse: pool.filter(p => p.inUse).length,
      };
    }
    return stats;
  }
}
