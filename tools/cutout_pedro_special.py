"""Prepara os recortes das novas folhas do especial do Pedro.

As folhas usam fundo preto. O recorte remove apenas o fundo escuro conectado
às bordas, preservando as linhas pretas fechadas dos desenhos.
"""
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent

MUSCULAR = ROOT / 'Folha de sprites_ Pedro em fúria muscular.png'
AURA = ROOT / 'Sprite de Golpe Especial com Aura Verde.png'
PEDRO_OUT = ROOT / 'art-source' / 'cutouts' / 'pedro'
FX_OUT = ROOT / 'art-source' / 'cutouts' / 'fx'

PEDRO_FRAMES = {
    'hulk': (MUSCULAR, [
        (0, 0, 230, 320), (235, 0, 455, 320), (465, 0, 710, 320)
    ]),
    'hulkPower': (AURA, [
        (430, 290, 655, 600), (655, 290, 895, 600),
        (895, 290, 1140, 600), (1140, 290, 1380, 600)
    ]),
    'hulkBlast': (AURA, [(0, 595, 475, 887)])
}

FX_FRAMES = {
    'pedro-beer-blast.png': (AURA, (463, 600, 932, 850)),
    'pedro-beer-burst.png': (AURA, (925, 600, 1405, 875))
}


def cut_black(sheet, rect):
    x0, y0, x1, y1 = rect
    rgb = np.asarray(sheet.crop(rect).convert('RGB'))
    dark = rgb.max(axis=2) <= 12
    seeds = np.zeros(dark.shape, dtype=bool)
    seeds[0, :] = dark[0, :]
    seeds[-1, :] = dark[-1, :]
    seeds[:, 0] = dark[:, 0]
    seeds[:, -1] = dark[:, -1]
    background = ndimage.binary_propagation(seeds, structure=np.ones((3, 3), dtype=bool), mask=dark)
    alpha = np.where(background, 0, 255).astype(np.uint8)
    ys, xs = np.nonzero(alpha)
    if not len(xs):
        raise ValueError(f'Nenhum sprite encontrado no recorte {rect}')
    rgba = np.dstack((rgb, alpha))
    return Image.fromarray(rgba[ys.min():ys.max() + 1, xs.min():xs.max() + 1], 'RGBA')


def main():
    if not MUSCULAR.is_file() or not AURA.is_file():
        missing = [str(path.relative_to(ROOT)) for path in (MUSCULAR, AURA) if not path.is_file()]
        raise FileNotFoundError(f'Folha(s) não encontrada(s): {", ".join(missing)}')

    sheets = {MUSCULAR: Image.open(MUSCULAR), AURA: Image.open(AURA)}
    PEDRO_OUT.mkdir(parents=True, exist_ok=True)
    FX_OUT.mkdir(parents=True, exist_ok=True)

    for animation, (path, rects) in PEDRO_FRAMES.items():
        for index, rect in enumerate(rects):
            output = PEDRO_OUT / f'{animation}_{index}.png'
            image = cut_black(sheets[path], rect)
            image.save(output, optimize=True)
            print(f'{output.relative_to(ROOT)} {image.size}')

    for name, (path, rect) in FX_FRAMES.items():
        output = FX_OUT / name
        image = cut_black(sheets[path], rect)
        image.save(output, optimize=True)
        print(f'{output.relative_to(ROOT)} {image.size}')


if __name__ == '__main__':
    main()
