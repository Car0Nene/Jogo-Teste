"""Monta o atlas HD do Pedro (assets/sprites/pedro-hd.webp + js/sprite-data-hd.js).

Fontes (art-source/pedro-hd/): folhas geradas com fundo verde chroma.
  principal.png  folha completa (44 quadros, tamanho médio)
  agachar.png    4 quadros grandes e detalhados
  pular.png      5 quadros grandes e detalhados

Cada quadro é recortado (tools/pedro_hd_cut.py), tem a escala igualada pelo tamanho da
cabeça (as folhas foram desenhadas em tamanhos diferentes) e vai para o atlas.
Quando você gerar folhas novas no tamanho grande, basta trocar as fontes e os índices.

Uso:  python3 tools/build_pedro_hd.py
"""
import hashlib
import importlib.util
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'art-source' / 'pedro-hd'
HD_SCALE = 4.2          # pixels do atlas por unidade de jogo (o atlas antigo usa 1.4)
K = 2.32                # fator de escala da folha "principal" para o atlas (cabeça = 48 px)
BIG = 0.355             # fator das folhas grandes (cabeça ~135 px) para cabeça = 48 px

spec = importlib.util.spec_from_file_location('cut', ROOT / 'tools' / 'pedro_hd_cut.py')
cut = importlib.util.module_from_spec(spec); spec.loader.exec_module(cut)


def head_factor(sheet, i):
    if sheet != 'principal':
        return BIG
    for lo, hi, f in [(0, 3, .87), (4, 10, 1.0), (15, 17, 1.1), (18, 21, .95), (22, 24, 1.1),
                      (25, 27, .8), (28, 31, 1.1), (32, 35, 1.0), (36, 39, 1.0), (40, 40, .85),
                      (41, 41, .9), (42, 42, 1.3), (43, 43, .85)]:
        if lo <= i <= hi:
            return f
    return 1.0


# animação -> [(folha, índice do quadro)]
ANIMS = {
    'idle':    [('principal', i) for i in (0, 1, 2, 3)],
    'walk':    [('principal', i) for i in (4, 5, 6)],
    'run':     [('principal', i) for i in (7, 8, 9, 10)],
    'jump':    [('pular', 0), ('pular', 1), ('pular', 3), ('pular', 4)],
    'crouch':  [('agachar', 1), ('agachar', 2)],
    'guard':   [('principal', 15), ('principal', 17)],
    'light':   [('principal', 18), ('principal', 20)],            # soco
    'medium':  [('principal', 22), ('principal', 24)],            # chute alto
    'heavy':   [('principal', 30), ('principal', 31), ('principal', 28)],  # uppercut
    'sweep':   [('principal', 25), ('principal', 26), ('principal', 27)],  # rasteira
    'flykick': [('principal', 32), ('principal', 35)],            # voadora
    'hurt':    [('principal', i) for i in (36, 37, 38, 39)],
    'knockdown': [('principal', 37), ('principal', 39), ('principal', 40)],
    'getup':   [('principal', 40), ('principal', 41)],
}

SHEETS = {'principal': 'principal.png', 'agachar': 'agachar.png', 'pular': 'pular.png'}


def load_frames(name):
    rgb = np.array(Image.open(SRC / SHEETS[name]).convert('RGB'))
    rgba = cut.key_green(rgb)
    lab, boxes = cut.components(rgba[..., 3], 6000)
    out = []
    for row in cut.order_boxes(boxes):
        for x1, y1, x2, y2, area, lid in row:
            crop = rgba[y1:y2, x1:x2].copy()
            crop[..., 3] = np.where(lab[y1:y2, x1:x2] == lid, crop[..., 3], 0)
            out.append(Image.fromarray(crop, 'RGBA'))
    return out


def prepare(im, factor):
    w, h = max(1, round(im.width * factor)), max(1, round(im.height * factor))
    im = im.resize((w, h), Image.LANCZOS)
    if factor > 1.2:  # ampliação deixa as bordas moles: realce leve só no RGB
        rgb = im.convert('RGB').filter(ImageFilter.UnsharpMask(radius=1.4, percent=70, threshold=2))
        im = Image.merge('RGBA', (*rgb.split(), im.getchannel('A')))
    a = np.array(im.getchannel('A')).astype(np.float32)
    ys, xs = np.nonzero(a > 20)
    ax = float((xs * a[ys, xs]).sum() / a[ys, xs].sum())
    # anda 1 px para dentro de cada lado: evita sangrar para o vizinho no atlas
    return im, ax


def main():
    sheets = {n: load_frames(n) for n in SHEETS}
    cache, placed = {}, []
    for anim, refs in ANIMS.items():
        for sheet, i in refs:
            if (sheet, i) in cache:
                continue
            im, ax = prepare(sheets[sheet][i], head_factor(sheet, i) * (K if sheet == 'principal' else K))
            cache[(sheet, i)] = (im, ax)
    # empacota em prateleiras
    W = 2560
    x = y = rowh = 0
    pos = {}
    for key, (im, ax) in sorted(cache.items(), key=lambda kv: -kv[1][0].height):
        if x + im.width + 4 > W:
            x, y, rowh = 0, y + rowh + 4, 0
        pos[key] = (x, y)
        x += im.width + 4
        rowh = max(rowh, im.height)
    H = y + rowh + 4
    atlas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for key, (im, ax) in cache.items():
        atlas.paste(im, pos[key])
    out_img = ROOT / 'assets' / 'sprites' / 'pedro-hd.webp'
    atlas.save(out_img, 'WEBP', quality=92, method=6, exact=True)
    frames = {}
    for anim, refs in ANIMS.items():
        frames[anim] = []
        for key in refs:
            im, ax = cache[key]
            px, py = pos[key]
            frames[anim].append([px, py, im.width, im.height, round(ax, 1), im.height, 1])
    version = hashlib.sha1(out_img.read_bytes()).hexdigest()[:10]
    js = ('// Gerado por tools/build_pedro_hd.py — não edite à mão.\n'
          '// Quadro: [x, y, largura, altura, ancoraX, ancoraY(pés), 1]; o 1 marca "atlas HD".\n'
          f'window.FF_HD_SCALE = {HD_SCALE};\nwindow.FF_HD_VERSION = "{version}";\n'
          f'window.FF_SPRITES_HD = {json.dumps({"pedro": frames}, separators=(",", ":"))};\n')
    (ROOT / 'js' / 'sprite-data-hd.js').write_text(js, encoding='utf-8')
    print(f'atlas {W}x{H}, {len(cache)} quadros, {out_img.stat().st_size // 1024} KB, versão {version}')


if __name__ == '__main__':
    main()
