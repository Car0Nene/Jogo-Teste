"""Gera os retratos da tela de seleção a partir dos sprites HD (mesma arte que aparece na luta).

Uso: python3 tools/build_portraits.py [id ...]   (sem argumentos: todos que têm frames.json)

Para cada lutador pega a primeira pose de guarda ("idle") do atlas <id>-anim-hd.webp, recorta,
dá uma margem transparente e salva em public/assets/portraits/<id>.webp. O Carlos também ganha
carlos-batizado.webp a partir da forma Modo Fé (crente:idle).
"""
import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
APP = ROOT / 'prototype-2.5d'
SPRITES = APP / 'public' / 'assets' / 'sprites'
OUT = APP / 'public' / 'assets' / 'portraits'
POSE = {'default': ('idle', 0)}


def crop(atlas, frame, pad=0.04):
    x, y, w, h = frame[:4]
    im = atlas.crop((x, y, x + w, y + h))
    m = int(h * pad)
    canvas = Image.new('RGBA', (w + 2 * m, h + m), (0, 0, 0, 0))
    canvas.paste(im, (m, m))
    return canvas


def build(fid):
    frames = json.loads((ROOT / 'art-source' / f'{fid}-hd' / 'frames.json').read_text(encoding='utf-8'))
    atlas = Image.open(SPRITES / f'{fid}-anim-hd.webp').convert('RGBA')
    anim, idx = POSE.get(fid, POSE['default'])
    crop(atlas, frames[anim][idx]).save(OUT / f'{fid}.webp', 'WEBP', quality=92, method=6)
    done = [f'{fid}.webp']
    if 'crente:idle' in frames:
        crop(atlas, frames['crente:idle'][0]).save(OUT / 'carlos-batizado.webp', 'WEBP', quality=92, method=6)
        done.append('carlos-batizado.webp')
    print(fid, '->', ', '.join(done))


if __name__ == '__main__':
    ids = sys.argv[1:] or sorted(p.parent.name[:-3] for p in (ROOT / 'art-source').glob('*-hd/frames.json'))
    for fid in ids:
        build(fid)
