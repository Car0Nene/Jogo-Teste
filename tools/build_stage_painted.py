"""Prepara um cenário pintado (2.5D) a partir das imagens geradas.

Entrada em art-source/stages/<id>/:
  fundo.png   — painel panorâmico (fachada/horizonte), vai num plano atrás da luta
  chao.png    — textura de chão vista de cima, repetível
  objetos.png — folha de objetos sobre verde chroma (grade, lidos da esquerda p/ direita, linha a linha)

Saída em public/assets/stages/painted/<id>/: fundo.webp, chao.webp, obj-<n>.webp e
props.json com o tamanho de cada objeto (para manter a proporção na cena).

Uso: python3 tools/build_stage_painted.py bar
"""
import importlib.util
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
APP = ROOT / 'prototype-2.5d'

spec = importlib.util.spec_from_file_location('cut', ROOT / 'tools' / 'pedro_hd_cut.py')
cut = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cut)


def load_props(path):
    rgb = np.array(Image.open(path).convert('RGB'))
    rgba = cut.key_green(rgb)
    min_area = max(4000, int(rgb.shape[0] * rgb.shape[1] * 0.004))
    lab, boxes = cut.components(rgba[..., 3], min_area, join=12)
    out = []
    for row in cut.order_boxes(boxes):
        for x1, y1, x2, y2, area, lid in row:
            crop = rgba[y1:y2, x1:x2].copy()
            crop[..., 3] = np.where(lab[y1:y2, x1:x2] == lid, crop[..., 3], 0)
            out.append(Image.fromarray(crop, 'RGBA'))
    return out


# chão tirado da própria pintura do fundo (faixa de calçada), para casar cor e luz com a fachada
FLOOR_FROM_BACKGROUND = {'bar': (705, 880), 'padaria': (845, 955), 'quintal': (660, 950), 'festa': (670, 950), 'praia': (765, 895)}
# linha onde a pintura do fundo é cortada (o resto vira o chão da luta)
BG_CUT = {'padaria': 838, 'quintal': 640, 'festa': 650, 'praia': 752}


def build(sid):
    src = ROOT / 'art-source' / 'stages' / sid
    dst = APP / 'public' / 'assets' / 'stages' / 'painted' / sid
    dst.mkdir(parents=True, exist_ok=True)

    if sid in BG_CUT:
        orig_bg = Image.open(src / 'fundo-original.png').convert('RGB')
        bg = orig_bg.crop((0, 0, orig_bg.width, BG_CUT[sid]))
        bg.save(src / 'fundo.png')
    else:
        bg = Image.open(src / 'fundo.png').convert('RGB')
    bg.save(dst / 'fundo.webp', 'WEBP', quality=88, method=6)

    band = FLOOR_FROM_BACKGROUND.get(sid)
    if band and (src / 'fundo-original.png').exists():
        orig = Image.open(src / 'fundo-original.png').convert('RGB')
        floor = orig.crop((0, band[0], orig.width, band[1])).resize((2048, 512), Image.LANCZOS)
    else:
        floor = Image.open(src / 'chao.png').convert('RGB').resize((1024, 1024), Image.LANCZOS)
    floor.save(dst / 'chao.webp', 'WEBP', quality=86, method=6)

    props = []
    if (src / 'objetos.png').exists():
        for i, im in enumerate(load_props(src / 'objetos.png')):
            if max(im.size) > 900:
                im.thumbnail((900, 900), Image.LANCZOS)
            name = f'obj-{i}.webp'
            im.save(dst / name, 'WEBP', quality=90, method=6, exact=True)
            props.append({'file': name, 'w': im.width, 'h': im.height})
    (dst / 'props.json').write_text(json.dumps({'background': list(bg.size), 'props': props}, indent=1), encoding='utf-8')
    print(f'{sid}: fundo {bg.size}, chão {floor.size}, {len(props)} objetos ->', dst.relative_to(ROOT))


if __name__ == '__main__':
    for sid in sys.argv[1:]:
        build(sid)
