import * as THREE from 'three';
import { assetUrl } from '../assetUrl';
import type { StageId } from '../data/stages';

/**
 * Cenário pintado 2.5D: painel de fundo + chão em perspectiva real + objetos recortados em
 * profundidade. Arte em public/assets/stages/painted/<id>/ (tools/build_stage_painted.py).
 */
export interface PaintedProp {
  /** índice do objeto (obj-<n>.webp) */
  obj: number;
  x: number;
  z: number;
  /** altura em unidades de mundo (lutador ≈ 2.4) */
  h: number;
  flip?: boolean;
}

export interface PaintedStageLayout {
  /** plano do fundo */
  bg: { z: number; width: number; y?: number; tint?: number };
  /** repetição da textura do chão (lado a lado, profundidade) */
  floorRepeat: [number, number];
  floorTint?: number;
  /** espelha a textura nas repetições (chão tirado da pintura do fundo) */
  floorMirror?: boolean;
  props: PaintedProp[];
}

export const PAINTED_STAGES: Partial<Record<StageId, PaintedStageLayout>> = {
  bar: {
    bg: { z: -14, width: 33, tint: 0xf4eef6 },
    floorRepeat: [2.4, 2.2],
    floorTint: 0xb4a9bb,
    floorMirror: true,
    props: [
      { obj: 0, x: -7.8, z: -5, h: 1.5 }, // mesa com cadeiras
      { obj: 1, x: 8.4, z: -5.5, h: 1.4 }, // engradados
      { obj: 2, x: -12.5, z: -7, h: 5 }, // poste
      { obj: 3, x: 12.5, z: -3, h: 2.2 }, // palmeira no vaso
      { obj: 4, x: 15, z: -6, h: 1.2 }, // lixeira
      { obj: 5, x: -15.5, z: -6, h: 1.1 }, // banco
      { obj: 6, x: -9.8, z: 3.2, h: 1.4 }, // lousa (primeiro plano)
    ],
  },
  // Cenários novos: objetos só nas laterais/fundo (nada na frente da luta) e fundo levemente
  // mais escuro que os lutadores, para a ação ficar legível.
  padaria: {
    bg: { z: -14, width: 33, tint: 0xe4dfe0 },
    floorRepeat: [2.4, 2.2],
    floorTint: 0xc9bdb6,
    floorMirror: true,
    props: [
      { obj: 0, x: -8.2, z: -5, h: 1.5 }, // mesinha com café e bolo
      { obj: 1, x: 12.8, z: -6.5, h: 2.6 }, // prateleira de pães
      { obj: 2, x: 8.6, z: -5.2, h: 1.5 }, // vitrine com bolo
      { obj: 3, x: -13, z: -4.2, h: 1.0 }, // sacos de farinha
      { obj: 4, x: -15.5, z: -6.5, h: 2.0 }, // vaso de planta
      { obj: 5, x: 15.2, z: -3.6, h: 0.9 }, // caixote de ovos e leite
    ],
  },
  quintal: {
    bg: { z: -14, width: 33, tint: 0xe2ddd6 },
    floorRepeat: [2.2, 2.0],
    floorTint: 0xc8bba9,
    floorMirror: true,
    props: [
      { obj: 0, x: -8.4, z: -5, h: 1.4 }, // mesa e cadeiras de plástico
      { obj: 1, x: 9.6, z: -6, h: 1.6 }, // churrasqueira
      { obj: 2, x: -13.4, z: -5.5, h: 2.2 }, // bananeira no vaso
      { obj: 3, x: 13.6, z: -3.8, h: 0.8 }, // tanquinho
      { obj: 4, x: -16, z: -3.6, h: 1.0 }, // carrinho de mão
      { obj: 5, x: 16.2, z: -6.5, h: 1.3 }, // casinha do Doguinho
    ],
  },
  festa: {
    bg: { z: -14, width: 33, tint: 0xd9d4de },
    floorRepeat: [2.2, 2.0],
    floorTint: 0xb9aa9b,
    floorMirror: true,
    props: [
      { obj: 0, x: 11.5, z: -6.5, h: 1.3 }, // fogueira
      { obj: 1, x: -9.2, z: -5.2, h: 1.0 }, // fardos de feno
      { obj: 2, x: -13.6, z: -4.2, h: 1.0 }, // banco com milho
      { obj: 3, x: 14.6, z: -4, h: 1.3 }, // panela de quentão
      { obj: 4, x: 8.4, z: -5.6, h: 1.3 }, // carrinho de pipoca
      { obj: 5, x: -16.4, z: -6.8, h: 2.3 }, // espantalho
    ],
  },
  praia: {
    bg: { z: -14, width: 33, tint: 0xe6e3e2 },
    floorRepeat: [2.4, 2.2],
    floorTint: 0xc2c0c2,
    floorMirror: true,
    props: [
      { obj: 0, x: -9, z: -5.4, h: 1.9 }, // guarda-sol com cadeira
      { obj: 1, x: 8.6, z: -4.6, h: 0.9 }, // caixa térmica com cocos
      { obj: 2, x: -14.6, z: -6.6, h: 3.4 }, // coqueiro
      { obj: 3, x: 13.4, z: -5.8, h: 2.0 }, // prancha de surfe
      { obj: 4, x: 16.4, z: -4, h: 1.6 }, // arvorezinha de Natal
      { obj: 5, x: -16.8, z: -3.8, h: 1.1 }, // bicicleta
    ],
  },
};

type Track = <T extends { dispose: () => void }>(item: T) => T;

function loadTex(url: string, anisotropy: number, onLoad?: (t: THREE.Texture) => void): THREE.Texture {
  const tex = new THREE.TextureLoader().load(url, onLoad);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

export function buildPaintedLayers(
  id: StageId,
  layout: PaintedStageLayout,
  group: THREE.Group,
  anisotropy: number,
  track: Track
): THREE.Mesh {
  const base = `/assets/stages/painted/${id}`;

  // fundo: largura fixa, altura pela proporção real da imagem; base encostada no chão
  const bgGeo = track(new THREE.PlaneGeometry(1, 1));
  const bgMat = track(
    new THREE.MeshBasicMaterial({ color: layout.bg.tint ?? 0xffffff, fog: false, depthWrite: true })
  );
  const bg = new THREE.Mesh(bgGeo, bgMat);
  bg.scale.set(layout.bg.width, layout.bg.width / 2.33, 1);
  bg.position.set(0, (layout.bg.y ?? -0.08) + bg.scale.y / 2, layout.bg.z);
  bgMat.map = track(
    loadTex(assetUrl(`${base}/fundo.webp`), anisotropy, (t) => {
      const img = t.image as { width: number; height: number };
      const h = layout.bg.width * (img.height / img.width);
      bg.scale.y = h;
      bg.position.y = (layout.bg.y ?? -0.08) + h / 2;
    })
  );
  bgMat.needsUpdate = true;
  group.add(bg);

  // chão: do pé do fundo até perto da câmera, recebe as sombras dos lutadores
  const floorTex = track(loadTex(assetUrl(`${base}/chao.webp`), anisotropy));
  floorTex.wrapS = floorTex.wrapT = layout.floorMirror ? THREE.MirroredRepeatWrapping : THREE.RepeatWrapping;
  floorTex.repeat.set(layout.floorRepeat[0], layout.floorRepeat[1]);
  const depth = 22;
  const floor = new THREE.Mesh(
    track(new THREE.PlaneGeometry(80, depth)),
    track(new THREE.MeshStandardMaterial({ map: floorTex, color: layout.floorTint ?? 0xffffff, roughness: 0.9, metalness: 0.02 }))
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, layout.bg.z + depth / 2);
  floor.receiveShadow = true;
  group.add(floor);

  // objetos recortados (billboards fixos, base no chão)
  for (const p of layout.props) {
    const mat = track(
      new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, color: 0xe8e2ee })
    );
    const mesh = new THREE.Mesh(track(new THREE.PlaneGeometry(1, 1)), mat);
    mesh.scale.set(p.h, p.h, 1);
    mesh.position.set(p.x, p.h / 2, p.z);
    mat.map = track(
      loadTex(assetUrl(`${base}/obj-${p.obj}.webp`), anisotropy, (t) => {
        const img = t.image as { width: number; height: number };
        mesh.scale.x = p.h * (img.width / img.height) * (p.flip ? -1 : 1);
      })
    );
    mat.needsUpdate = true;
    group.add(mesh);
  }

  return bg;
}
