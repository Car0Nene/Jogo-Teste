// Gerado por tools/build_fighter_hd.py — não edite à mão.
// Quadro: [x, y, largura, altura, ancoraX, ancoraY(pés), 6]; 6 = atlas <id>-anim-hd.webp
import type { FighterId } from './fighters';
import type { SpriteAnimMap } from './spriteAtlas';

export const HD_ANIM_VERSION: Partial<Record<FighterId, string>> = {};

export const HD_ANIMS: Partial<Record<FighterId, SpriteAnimMap>> = {} as Partial<Record<FighterId, SpriteAnimMap>>;
