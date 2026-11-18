#!/usr/bin/env python3
"""Genera los iconos PNG (lupa sobre fondo teal) sin dependencias externas."""
import struct, zlib, math, pathlib

BG, FG = (15, 118, 110), (255, 255, 255)
SS = 4  # supersampling

def seg_dist(px, py, ax, ay, bx, by):
    dx, dy = bx - ax, by - ay
    t = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return math.hypot(px - ax - t * dx, py - ay - t * dy)

def coverage(x, y):
    """Devuelve (alpha fondo, alpha lupa) para un punto en [0,1]²."""
    r = 0.22
    cx, cy = min(max(x, r), 1 - r), min(max(y, r), 1 - r)
    bg = math.hypot(x - cx, y - cy) <= r
    d = math.hypot(x - 0.43, y - 0.43)
    lens = 0.15 <= d <= 0.27
    handle = seg_dist(x, y, 0.63, 0.63, 0.80, 0.80) <= 0.055
    return bg, (lens or handle)

def render(size):
    rows = []
    for j in range(size):
        row = bytearray([0])
        for i in range(size):
            a = f = 0
            for sj in range(SS):
                for si in range(SS):
                    bg, fg = coverage((i + (si + .5) / SS) / size, (j + (sj + .5) / SS) / size)
                    a += bg; f += fg and bg
            n = SS * SS
            alpha = a / n
            mix = f / a if a else 0
            rgb = [round(BG[k] * (1 - mix) + FG[k] * mix) for k in range(3)]
            row += bytes(rgb + [round(255 * alpha)])
        rows.append(bytes(row))
    def chunk(tag, data):
        body = tag + data
        return struct.pack('>I', len(data)) + body + struct.pack('>I', zlib.crc32(body))
    png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0))
    return png + chunk(b'IDAT', zlib.compress(b''.join(rows), 9)) + chunk(b'IEND', b'')

out = pathlib.Path(__file__).resolve().parent.parent / 'icons'
out.mkdir(exist_ok=True)
for s in (16, 32, 48, 128):
    (out / f'icon-{s}.png').write_bytes(render(s))
