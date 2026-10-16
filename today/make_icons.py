"""앱 아이콘: '오늘' 두 글자를 도형으로 그려요 (폰트 없이도 같은 모양).
    python3 make_icons.py
"""
from PIL import Image, ImageDraw

T = 0.15  # 획 두께 (글자 너비 1 기준), 글자 높이는 H
H = 1.5
# 글자별 도형: ('r', x0, y0, x1, y1) 사각형 / ('ring', cx, cy, r_out, r_in)
O = [('ring', 0.5, 0.42, 0.40, 0.40 - T),
     ('r', 0.425, 0.78, 0.575, 1.36),
     ('r', 0.0, 1.35, 1.0, 1.5)]
NEUL = [('r', 0.08, 0.0, 0.23, 0.40), ('r', 0.08, 0.25, 0.92, 0.40),   # ㄴ
        ('r', 0.0, 0.52, 1.0, 0.67),                                   # ㅡ
        ('r', 0.08, 0.79, 0.92, 0.94), ('r', 0.77, 0.79, 0.92, 1.22),  # ㄹ
        ('r', 0.08, 1.07, 0.92, 1.22), ('r', 0.08, 1.07, 0.23, 1.5),
        ('r', 0.08, 1.35, 0.92, 1.5)]


def make(size, path, bg, fg, pad=0.1):
    S = size * 4
    img = Image.new('RGB', (S, S), bg)
    d = ImageDraw.Draw(img)
    gap = 0.12
    unit = S * (1 - 2 * pad) / (2 + gap)
    ox = S * pad
    oy = (S - unit * H) / 2
    rad = unit * T * 0.18
    for i, glyph in enumerate((O, NEUL)):
        gx = ox + i * (1 + gap) * unit
        for sh in glyph:
            if sh[0] == 'r':
                _, x0, y0, x1, y1 = sh
                d.rounded_rectangle([gx + x0 * unit, oy + y0 * unit, gx + x1 * unit, oy + y1 * unit], radius=rad, fill=fg)
            else:
                _, cx, cy, ro, ri = sh
                d.ellipse([gx + (cx - ro) * unit, oy + (cy - ro) * unit, gx + (cx + ro) * unit, oy + (cy + ro) * unit], fill=fg)
                d.ellipse([gx + (cx - ri) * unit, oy + (cy - ri) * unit, gx + (cx + ri) * unit, oy + (cy + ri) * unit], fill=bg)
    img.resize((size, size), Image.LANCZOS).save(path)


if __name__ == '__main__':
    W, K = (255, 255, 255), (17, 17, 17)
    make(192, 'icons/icon-192.png', W, K)
    make(512, 'icons/icon-512.png', W, K)
    make(512, 'icons/maskable-512.png', W, K, pad=0.22)
    make(180, 'icons/apple-touch-icon.png', W, K)
    make(192, 'icons/icon-dark-192.png', K, W)
