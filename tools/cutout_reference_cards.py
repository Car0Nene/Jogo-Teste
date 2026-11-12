"""Recorta poses das fichas ilustradas de Paula, Tainara e do Cão.

As fichas são cartões de referência, não folhas transparentes tradicionais.
Este script recorta cada pose e remove o fundo azul/lilás conectado às bordas.
Depois rode tools/build_atlas.py para atualizar o atlas de lutadores.
"""
from pathlib import Path

import numpy as np
from PIL import Image
from PIL import ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
SHEETS = {
    'paula': ('art-source/paula-sheet.png', 'purple', {
        'idle': (815, 76, 920, 238), 'walk': (938, 76, 1040, 238),
        'run': (1050, 76, 1168, 238), 'guard': (1175, 76, 1288, 238),
        'jump': (1295, 65, 1400, 238), 'crouch': (1405, 90, 1535, 238),
        'light': (20, 360, 175, 495), 'medium': (180, 360, 340, 495),
        'heavy': (345, 360, 500, 495),
    }),
    'tainara': ('art-source/tainara-sheet.png', 'blue', {
        'idle': (38, 326, 165, 502), 'walk': (250, 326, 400, 502),
        'run': (475, 326, 680, 502), 'jump': (755, 326, 940, 502),
        'guard': (1018, 326, 1180, 502), 'crouch': (1295, 326, 1510, 502),
        'light': (15, 555, 195, 730), 'medium': (215, 555, 425, 730),
        'heavy': (455, 555, 710, 730), 'special': (720, 555, 945, 730),
    }),
    'cao': ('art-source/daniel-dog-sheet.png', 'blue', {
        'idle': (20, 326, 235, 502), 'walk': (250, 326, 465, 502),
        'run': (470, 326, 800, 502), 'jump': (805, 326, 1040, 502),
        'guard': (1050, 326, 1295, 502), 'crouch': (1295, 326, 1535, 502),
        'light': (15, 555, 215, 730), 'medium': (235, 555, 465, 730),
        'heavy': (480, 555, 710, 730), 'special': (720, 555, 970, 730),
    }),
}

# A nova ficha compartilhada tem sequências de movimento com vários quadros.
# Os centros separam as figuras dentro de cada faixa do painel.
MOVEMENT = {
    'paula': {
        'idle': [360, 414, 468, 522], 'walk': [570, 620, 671, 721],
        'run': [784, 856, 923], 'jump': [984, 1050, 1117],
        'guard': [1182, 1248, 1313], 'crouch': [1380, 1452, 1498],
        'rows': (38, 163),
    },
    'tainara': {
        'idle': [360, 414, 468, 522], 'walk': [570, 620, 671, 721],
        'run': [784, 856, 923], 'jump': [984, 1050, 1117],
        'guard': [1182, 1248, 1313], 'crouch': [1380, 1452, 1498],
        'rows': (548, 681),
    },
}
MOVEMENT_SHEET = 'art-source/paula-tainara-movement-sheet.png'
MOVEMENT_REGIONS = {
    'paula': {'run': [(748, 820), (821, 890), (891, 952)],
              'crouch': [(1347, 1411), (1416, 1479), (1480, 1531)]},
    'tainara': {'run': [(748, 820), (821, 890), (891, 952)],
                'crouch': [(1347, 1411), (1416, 1479), (1480, 1531)]},
}
PORTRAIT_BOXES = {'paula': (5, 3, 139, 168), 'tainara': (5, 514, 139, 679)}


def cut_pose(sheet: Image.Image, box: tuple[int, int, int, int], key: str,
             remove_specks: bool = False) -> Image.Image:
    rgba = np.array(sheet.crop(box).convert('RGBA'))
    rgb = rgba[:, :, :3].astype(np.int16)
    r, g, b = (rgb[:, :, i] for i in range(3))
    if key == 'blue':
        # Navy background and speed lines; the dark character outline keeps the
        # bright blue costume from connecting to the card background.
        bg_candidate = (b > r * 1.22 + 14) & (b > g * 1.12 + 10) & (b > 55) & (r < 125) & (g < 160)
    else:
        # Pale lavender card background; Paula's magenta dress stays opaque.
        bg_candidate = (b > r * 1.04) & (b > g * 1.02) & (b > 145) & (r > 65) & (g > 75) & (r - g < 95)
    edge = np.zeros(bg_candidate.shape, dtype=bool)
    edge[[0, -1], :] = True
    edge[:, [0, -1]] = True
    background = ndimage.binary_propagation(bg_candidate & edge, mask=bg_candidate)
    rgba[:, :, 3] = np.where(background, 0, rgba[:, :, 3])
    if remove_specks:
        labels, count = ndimage.label(rgba[:, :, 3] > 8)
        sizes = np.bincount(labels.ravel(), minlength=count + 1)
        cutoff = max(16, int(sizes[1:].max(initial=0) * 0.02))
        keep = sizes >= cutoff
        keep[0] = False
        rgba[:, :, 3] = np.where(keep[labels], rgba[:, :, 3], 0)
    ys, xs = np.where(rgba[:, :, 3] > 8)
    if not len(xs):
        raise ValueError(f'Nenhum personagem encontrado no recorte {box}')
    x0, x1 = max(0, xs.min() - 2), min(rgba.shape[1], xs.max() + 3)
    y0, y1 = max(0, ys.min() - 2), min(rgba.shape[0], ys.max() + 3)
    return Image.fromarray(rgba[y0:y1, x0:x1])


def main() -> None:
    portrait_colors = {'paula': ((84, 23, 120), (225, 44, 139)),
                       'tainara': ((16, 45, 115), (47, 155, 222)),
                       'cao': ((72, 38, 18), (230, 144, 50))}
    for fighter, (source, key, poses) in SHEETS.items():
        sheet = Image.open(ROOT / source)
        out = ROOT / 'art-source' / 'cutouts' / fighter
        out.mkdir(parents=True, exist_ok=True)
        for animation, box in poses.items():
            cut_pose(sheet, box, key).save(out / f'{animation}_0.png')
        if fighter in MOVEMENT:
            movement_sheet = Image.open(ROOT / MOVEMENT_SHEET)
            y0, y1 = MOVEMENT[fighter]['rows']
            for animation, centers in MOVEMENT[fighter].items():
                if animation == 'rows':
                    continue
                for index, center in enumerate(centers):
                    regions = MOVEMENT_REGIONS.get(fighter, {}).get(animation)
                    x0, x1 = regions[index] if regions else (center - 28, center + 28)
                    box = (x0, y0, x1, y1)
                    cut_pose(movement_sheet, box, 'blue', remove_specks=True).save(out / f'{animation}_{index}.png')
        if fighter in PORTRAIT_BOXES:
            portrait = movement_sheet.crop(PORTRAIT_BOXES[fighter]).resize((512, 640), Image.Resampling.LANCZOS)
        else:
            idle = Image.open(out / 'idle_0.png').convert('RGBA')
            head = idle.crop((0, 0, idle.width, max(1, int(idle.height * 0.78))))
            head.thumbnail((470, 575), Image.Resampling.LANCZOS)
            c0, c1 = portrait_colors[fighter]
            portrait = Image.new('RGBA', (512, 640))
            draw = ImageDraw.Draw(portrait)
            for y in range(640):
                t = y / 639
                color = tuple(round(c0[i] * (1 - t) + c1[i] * t) for i in range(3))
                draw.line((0, y, 511, y), fill=(*color, 255))
            draw.ellipse((58, 42, 454, 438), fill=(255, 255, 255, 18), outline=(255, 255, 255, 70), width=4)
            portrait.alpha_composite(head, ((512 - head.width) // 2, 24))
        (ROOT / 'assets' / 'portraits').mkdir(parents=True, exist_ok=True)
        portrait.save(ROOT / 'assets' / 'portraits' / f'{fighter}.png')
        print(f'{fighter}: {len(list(out.glob("*.png")))} recortes gerados')


if __name__ == '__main__':
    main()
