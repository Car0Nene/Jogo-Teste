"""Retratos da tela de seleção a partir das artes do Kling (art-source/select-kling/<id>.webp).

As artes vêm com fundo verde chapado (o tom varia um pouco entre elas). O recorte mede a distância
de cada pixel até a cor do fundo amostrada nas bordas, então funciona mesmo com roupas verdes
(Davi) e tira o reflexo verde só nas bordas semitransparentes.

Saída: prototype-2.5d/public/assets/portraits/<id>.webp (transparente, recortado e com margem).
Uso:  python3 tools/build_portraits_kling.py [id ...]
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'art-source' / 'select-kling'
OUT = ROOT / 'prototype-2.5d' / 'public' / 'assets' / 'portraits'
TARGET_H = 1100
# versão escolhida de cada um: 'v2_' = pose com o objeto da piada; '' = primeira versão (guarda)
CHOICE = {'juraci': 'v2_', 'pedro': 'v2_', 'franciely': 'v2_', 'tainara': 'v2_',
          'carlos': '', 'daniel': '', 'gabi': '', 'paula': '', 'davi': ''}


def cutout(rgb: np.ndarray) -> np.ndarray:
    a = rgb.astype(np.float32)
    border = np.concatenate([a[:8].reshape(-1, 3), a[-8:].reshape(-1, 3), a[:, :8].reshape(-1, 3), a[:, -8:].reshape(-1, 3)])
    bg = np.median(border, axis=0)
    dist = np.sqrt(((a - bg) ** 2).sum(-1))
    alpha = np.clip((dist - 45.0) / 45.0, 0.0, 1.0)
    # brilho/halo verde-limão pintado em volta da figura também é fundo
    r, gg, b = rgb[..., 0].astype(np.float32), rgb[..., 1].astype(np.float32), rgb[..., 2].astype(np.float32)
    lime = (gg > 110) & (gg > np.maximum(r, b) + 45)
    alpha = np.where(lime, 0.0, alpha)
    # mantém só a maior mancha (o personagem) e fecha buracos pequenos
    mask = Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.MedianFilter(5))
    alpha = np.asarray(mask).astype(np.float32) / 255.0
    # mantém só a figura principal (descarta pontinhos soltos)
    from scipy import ndimage
    lab, n = ndimage.label(alpha > 0.1)
    if n > 1:
        sizes = ndimage.sum(np.ones_like(alpha), lab, range(1, n + 1))
        keep = ndimage.binary_dilation(lab == (int(np.argmax(sizes)) + 1), iterations=3)
        alpha = np.where(keep, alpha, 0.0)
    # tira o verde (e o brilho verde pintado) numa faixa de ~14 px junto da borda
    band = ndimage.binary_dilation(alpha < 0.5, iterations=14) & (alpha > 0)
    g = a[..., 1]
    limit = np.maximum(a[..., 0], a[..., 2])
    a[..., 1] = np.where(band & (g > limit), limit, g)
    # o halo verde claro que sobrar na borda vira transparência
    greenish = band & (rgb[..., 1].astype(np.float32) > np.maximum(rgb[..., 0], rgb[..., 2]) + 25)
    alpha = np.where(greenish, alpha * 0.15, alpha)
    out = np.dstack([np.clip(a, 0, 255), alpha * 255]).astype(np.uint8)
    return out


def build(fid: str) -> None:
    rgb = np.array(Image.open(SRC / f"{CHOICE.get(fid, '')}{fid}.webp").convert('RGB'))
    im = Image.fromarray(cutout(rgb), 'RGBA')
    bbox = im.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()
    im = im.crop(bbox)
    scale = TARGET_H / im.height
    im = im.resize((round(im.width * scale), TARGET_H), Image.LANCZOS)
    m = int(TARGET_H * 0.04)
    canvas = Image.new('RGBA', (im.width + 2 * m, im.height + m), (0, 0, 0, 0))
    canvas.paste(im, (m, m))
    canvas.save(OUT / f'{fid}.webp', 'WEBP', quality=90, method=6)
    print(fid, '->', canvas.size)


if __name__ == '__main__':
    ids = sys.argv[1:] or sorted(CHOICE)
    for fid in ids:
        build(fid)
