"""Recorta quadros de folhas de sprites com fundo verde chroma (Pedro HD).

Uso:  python3 tools/pedro_hd_cut.py <folha.png> <pasta_saida> [--min-area 3000]
Saída: <pasta_saida>/NN.png (RGBA, fundo removido, bordas limpas) + index.json com bbox.
Os quadros saem ordenados por linha e depois por coluna.
"""
import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage


def key_green(rgb):
    """Devolve RGBA com o verde removido e o reflexo verde (spill) neutralizado."""
    a = rgb.astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    d = g - np.maximum(r, b)              # quão "verde puro" é o pixel
    alpha = 1.0 - np.clip((d - 35.0) / 55.0, 0.0, 1.0)
    # reflexo verde nas bordas: limita o canal verde ao maior entre vermelho e azul
    g2 = np.minimum(g, np.maximum(r, b) + 6.0)
    out = np.stack([r, g2, b, alpha * 255.0], axis=-1)
    return np.clip(out, 0, 255).astype(np.uint8)


def components(alpha, min_area, join=0):
    """Componentes conexos sem dilatar (para não colar quadros vizinhos).
    Pedaços pequenos (mãos, mechas de cabelo, sandália) são anexados ao quadro grande mais
    próximo; ruído longe de qualquer quadro é descartado. Devolve (rótulos, caixas)."""
    mask = alpha > 128
    lab, n = ndimage.label(mask, structure=np.ones((3, 3)))
    objs = ndimage.find_objects(lab)
    areas = ndimage.sum(mask, lab, range(1, n + 1))
    big = [i + 1 for i in range(n) if areas[i] >= min_area]
    boxes = {}
    for i in big:
        ys, xs = objs[i - 1]
        boxes[i] = [xs.start, ys.start, xs.stop, ys.stop, int(areas[i - 1])]
    remap = {i: i for i in big}
    reach = 40
    for i in range(1, n + 1):
        if i in remap or areas[i - 1] < 25:
            continue
        ys, xs = objs[i - 1]
        best, bd = None, reach + 1
        for j, bx in boxes.items():
            dx = max(bx[0] - xs.stop, xs.start - bx[2], 0)
            dy = max(bx[1] - ys.stop, ys.start - bx[3], 0)
            d = max(dx, dy)
            if d < bd:
                best, bd = j, d
        if best is not None:
            remap[i] = best
            bx = boxes[best]
            bx[0] = min(bx[0], xs.start); bx[1] = min(bx[1], ys.start)
            bx[2] = max(bx[2], xs.stop); bx[3] = max(bx[3], ys.stop)
            bx[4] += int(areas[i - 1])
    lut = np.zeros(n + 1, dtype=np.int32)
    for i, j in remap.items():
        lut[i] = j
    merged = lut[lab]
    return merged, [bx + [j] for j, bx in boxes.items()]


def order_boxes(boxes):
    """Agrupa em linhas (pelo centro vertical) e ordena cada linha da esquerda p/ a direita."""
    boxes = sorted(boxes, key=lambda b: (b[1] + b[3]) / 2)
    rows, cur = [], []
    for b in boxes:
        cy = (b[1] + b[3]) / 2
        if cur and cy - np.mean([(c[1] + c[3]) / 2 for c in cur]) > 0.45 * np.mean([c[3] - c[1] for c in cur]):
            rows.append(cur); cur = []
        cur.append(b)
    if cur:
        rows.append(cur)
    return [sorted(r, key=lambda b: b[0]) for r in rows]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('sheet'); ap.add_argument('out')
    ap.add_argument('--min-area', type=int, default=6000)
    ap.add_argument('--join', type=int, default=3, help='dilatação para unir partes soltas (cabelo, mãos)')
    args = ap.parse_args()
    rgb = np.array(Image.open(args.sheet).convert('RGB'))
    rgba = key_green(rgb)
    lab, boxes = components(rgba[..., 3], args.min_area, args.join)
    out = Path(args.out); out.mkdir(parents=True, exist_ok=True)
    index = []
    n = 0
    for row_i, row in enumerate(order_boxes(boxes)):
        for b in row:
            x1, y1, x2, y2, area, lid = b
            crop = rgba[y1:y2, x1:x2].copy()
            crop[..., 3] = np.where(lab[y1:y2, x1:x2] == lid, crop[..., 3], 0)
            Image.fromarray(crop, 'RGBA').save(out / f'{n:02d}.png')
            index.append(dict(i=n, row=row_i, x=x1, y=y1, w=x2 - x1, h=y2 - y1, area=area))
            n += 1
    (out / 'index.json').write_text(json.dumps(index, indent=1))
    print(f'{n} quadros em {out}')


if __name__ == '__main__':
    main()
