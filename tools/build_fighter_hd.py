"""Monta o atlas de animação HD de um lutador a partir de folhas com fundo verde chroma.

Mesmo processo que deixou o Pedro bem animado (tools/build_pedro_hd.py), generalizado:
cada lutador tem 4 folhas em art-source/<id>-hd/, em grade 4 x 3, uma animação por linha.

  locomocao.png  idle x4 | walk x4 | run x4
  golpes.png     light x4 | medium x4 | heavy x4
  aereo.png      jump x4 | flykick x4 | crouch x2 + guard x2
  dano.png       hurt x4 | knockdown x4 | getup x2 + win x2

Escala: em cada folha, uma linha de quadros "de pé" serve de régua (REF) e é igualada à
altura-alvo do Pedro, então todas as folhas ficam na mesma escala sem ajuste manual.

Saídas:
  prototype-2.5d/public/assets/sprites/<id>-anim-hd.webp
  art-source/<id>-hd/frames.json
  prototype-2.5d/src/data/hdAnimAtlas.ts   (todos os lutadores que têm frames.json)

Uso:  python3 tools/build_fighter_hd.py <id> [<id> ...]
      python3 tools/build_fighter_hd.py --only-ts
"""
import hashlib
import importlib.util
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
APP = ROOT / 'prototype-2.5d'
TARGET_H = 545          # altura de um quadro "de pé" no atlas (igual ao Pedro, escala 4.2)
ATLAS_W = 2560
MAX_ATLAS = 4096        # limite seguro de textura em celulares

spec = importlib.util.spec_from_file_location('cut', ROOT / 'tools' / 'pedro_hd_cut.py')
cut = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cut)

# folha -> linhas; cada linha é [(animação, quantidade), ...]; REF = animação usada como régua
SHEETS = {
    'locomocao': {'rows': [[('idle', 4)], [('walk', 4)], [('run', 4)]], 'ref': 'idle'},
    'golpes': {'rows': [[('light', 4)], [('medium', 4)], [('heavy', 4)]], 'ref': 'light'},
    'aereo': {'rows': [[('jump', 4)], [('flykick', 4)], [('crouch', 2), ('guard', 2)]], 'ref': 'guard'},
    'dano': {'rows': [[('hurt', 4)], [('knockdown', 4)], [('getup', 2), ('win', 2)]], 'ref': 'win'},
}
# Formas com roupa própria: folhas extras <forma>-<folha>.png; as animações ganham o prefixo "<forma>:".
FORMS = {'carlos': {'crente': ['locomocao', 'golpes']}}
# quadros usados de cada animação (índices dentro da linha) — permite descartar um quadro ruim
PICK = {}
# quadros que o gerador desenhou virados para a esquerda: (lutador, animação) -> índices a espelhar
FLIP = {}


def load_sheet(path):
    rgb = np.array(Image.open(path).convert('RGB'))
    rgba = cut.key_green(rgb)
    min_area = max(2500, int(rgb.shape[0] * rgb.shape[1] * 0.0035))
    lab, boxes = cut.components(rgba[..., 3], min_area)
    rows = []
    for row in cut.order_boxes(boxes):
        frames = []
        for x1, y1, x2, y2, area, lid in row:
            crop = rgba[y1:y2, x1:x2].copy()
            crop[..., 3] = np.where(lab[y1:y2, x1:x2] == lid, crop[..., 3], 0)
            frames.append(Image.fromarray(crop, 'RGBA'))
        rows.append(frames)
    return rows


def prepare(im, factor):
    w, h = max(1, round(im.width * factor)), max(1, round(im.height * factor))
    im = im.resize((w, h), Image.LANCZOS)
    if factor > 1.15:
        rgb = im.convert('RGB').filter(ImageFilter.UnsharpMask(radius=1.2, percent=60, threshold=2))
        im = Image.merge('RGBA', (*rgb.split(), im.getchannel('A')))
    a = np.array(im.getchannel('A')).astype(np.float32)
    ys, xs = np.nonzero(a > 20)
    # âncora X: centro de massa da metade de baixo (pés/quadril), estável entre quadros
    low = ys > im.height * 0.55
    if low.sum() > 50:
        ys, xs = ys[low], xs[low]
    ax = float((xs * a[ys, xs]).sum() / a[ys, xs].sum())
    return im, ax


def build(fid):
    src = ROOT / 'art-source' / f'{fid}-hd'
    anims, problems = {}, []
    jobs = [(sheet, cfg, '') for sheet, cfg in SHEETS.items()]
    for form, sheets in FORMS.get(fid, {}).items():
        jobs += [(f'{form}-{sh}', SHEETS[sh], f'{form}:') for sh in sheets]
    for sheet, cfg, prefix in jobs:
        path = src / f'{sheet}.png'
        if not path.exists():
            problems.append(f'{sheet}: arquivo ausente')
            continue
        rows = load_sheet(path)
        if len(rows) != len(cfg['rows']):
            problems.append(f'{sheet}: {len(rows)} linhas encontradas, esperado {len(cfg["rows"])}')
        got = {}
        for spec_row, frames in zip(cfg['rows'], rows):
            want = sum(n for _, n in spec_row)
            if len(frames) != want:
                problems.append(f'{sheet}: linha {spec_row[0][0]} tem {len(frames)} quadros, esperado {want}')
                continue
            i = 0
            for anim, n in spec_row:
                got[anim] = frames[i:i + n]
                i += n
        ref = got.get(cfg['ref'])
        if not ref:
            problems.append(f'{sheet}: sem régua ({cfg["ref"]}), folha ignorada')
            continue
        factor = TARGET_H / float(np.median([f.height for f in ref]))
        for anim, frames in got.items():
            keep = PICK.get((fid, prefix + anim))
            sel = [frames[k] for k in keep] if keep else frames
            flip = FLIP.get((fid, prefix + anim), ())
            sel = [f.transpose(Image.FLIP_LEFT_RIGHT) if k in flip else f for k, f in enumerate(sel)]
            anims[prefix + anim] = [prepare(f, factor) for f in sel]
    if not anims:
        raise SystemExit(f'{fid}: nenhuma folha utilizável — ' + '; '.join(problems))
    # empacota em prateleiras (mais altos primeiro)
    items = [(a, k, im, ax) for a, fr in anims.items() for k, (im, ax) in enumerate(fr)]
    width = ATLAS_W
    while True:
        x = y = rowh = 0
        pos = {}
        for a, k, im, ax in sorted(items, key=lambda t: -t[2].height):
            if x + im.width + 4 > width:
                x, y, rowh = 0, y + rowh + 4, 0
            pos[(a, k)] = (x, y)
            x += im.width + 4
            rowh = max(rowh, im.height)
        height = y + rowh + 4
        if height <= MAX_ATLAS or width >= MAX_ATLAS:
            break
        width = min(MAX_ATLAS, width + 512)
    atlas = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    for a, k, im, ax in items:
        atlas.paste(im, pos[(a, k)])
    out_img = APP / 'public' / 'assets' / 'sprites' / f'{fid}-anim-hd.webp'
    atlas.save(out_img, 'WEBP', quality=90, method=6, exact=True)
    frames = {
        a: [[*pos[(a, k)], im.width, im.height, round(ax, 1), im.height, 6] for k, (im, ax) in enumerate(fr)]
        for a, fr in anims.items()
    }
    (src / 'frames.json').write_text(json.dumps(frames, separators=(',', ':')), encoding='utf-8')
    kb = out_img.stat().st_size // 1024
    print(f'{fid}: atlas {width}x{height}, {len(items)} quadros, {kb} KB; animações: {", ".join(frames)}')
    for p in problems:
        print(f'  aviso: {p}')


def write_ts():
    data, forms, versions = {}, {}, {}
    for f in sorted((ROOT / 'art-source').glob('*-hd/frames.json')):
        fid = f.parent.name[:-3]
        allf = json.loads(f.read_text(encoding='utf-8'))
        data[fid] = {k: v for k, v in allf.items() if ':' not in k}
        for k, v in allf.items():
            if ':' in k:
                form, anim = k.split(':', 1)
                forms.setdefault(f'{fid}@{form}', {})[anim] = v
        img = APP / 'public' / 'assets' / 'sprites' / f'{fid}-anim-hd.webp'
        versions[fid] = hashlib.sha1(img.read_bytes()).hexdigest()[:8]
    ts = ('// Gerado por tools/build_fighter_hd.py — não edite à mão.\n'
          '// Quadro: [x, y, largura, altura, ancoraX, ancoraY(pés), 6]; 6 = atlas <id>-anim-hd.webp\n'
          "import type { FighterId } from './fighters';\n"
          "import type { SpriteAnimMap } from './spriteAtlas';\n\n"
          f'export const HD_ANIM_VERSION: Partial<Record<FighterId, string>> = {json.dumps(versions)};\n\n'
          'export const HD_ANIMS: Partial<Record<FighterId, SpriteAnimMap>> = '
          f'{json.dumps(data, separators=(",", ":"))} as Partial<Record<FighterId, SpriteAnimMap>>;\n\n'
          '/** Animações de formas com roupa própria, por "<id>@<forma>" (ex.: carlos@crente = Modo Fé). */\n'
          'export const HD_FORM_ANIMS: Record<string, SpriteAnimMap> = '
          f'{json.dumps(forms, separators=(",", ":"))} as Record<string, SpriteAnimMap>;\n')
    (APP / 'src' / 'data' / 'hdAnimAtlas.ts').write_text(ts, encoding='utf-8')
    print('hdAnimAtlas.ts:', ', '.join(data) or '(vazio)')


if __name__ == '__main__':
    args = sys.argv[1:]
    for fid in [a for a in args if not a.startswith('--')]:
        build(fid)
    write_ts()
