#!/usr/bin/env python3
"""Sinh SVG cảnh giữa bàn cờ (làng quê Cửu Long nhìn từ trên xuống) và ghi đè <svg class="city"> trong index.html.
Chạy: python3 tools/gen-center-scene.py   (idempotent). Giữ SVG nhẹ: dùng <symbol>/<use>, không filter."""
import math, re, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
out = []
add = out.append

def palm_leaf(i, n=8, r=15):
    a = i * 2 * math.pi / n
    x, y = r * math.cos(a), r * math.sin(a)
    # lá dừa: cong nhẹ
    cx, cy = x * .5 - math.sin(a) * 3, y * .5 + math.cos(a) * 3
    return f'M0 0Q{cx:.1f} {cy:.1f} {x:.1f} {y:.1f}'

defs = f'''<defs>
<symbol id="palm" viewBox="-17 -17 34 34" overflow="visible"><circle r="15" fill="#000" opacity=".12" cx="2" cy="3"/><g fill="none" stroke="#2f8a3a" stroke-width="3.4" stroke-linecap="round">{''.join(f'<path d="{palm_leaf(i)}"/>' for i in range(8))}</g><g fill="none" stroke="#5fb24a" stroke-width="1.2" stroke-linecap="round">{''.join(f'<path d="{palm_leaf(i + .5, 8, 11)}"/>' for i in range(8))}</g><circle r="2.8" fill="#8a5a2a"/><circle cx="-1" cy="-1" r="1.1" fill="#c99a52"/></symbol>
<symbol id="tile" viewBox="0 0 24 18" overflow="visible"><rect x="1.5" y="2.5" width="24" height="18" rx="2" fill="#000" opacity=".16"/><rect width="24" height="18" rx="2" fill="#c8452d"/><rect width="24" height="9" rx="2" fill="#dd6a46"/><path d="M0 9H24" stroke="#7d2416" stroke-width="2"/><path d="M3 4.5H21M3 13.5H21" stroke="#a83a24" stroke-width=".8" stroke-dasharray="2 1.4"/></symbol>
<symbol id="thatch" viewBox="0 0 24 18" overflow="visible"><rect x="1.5" y="2.5" width="24" height="18" rx="3" fill="#000" opacity=".16"/><rect width="24" height="18" rx="3" fill="#d6b266"/><rect width="24" height="9" rx="3" fill="#e6c882"/><path d="M0 9H24" stroke="#8d6b2d" stroke-width="1.8"/><path d="M3 3V7M7 3V7M11 3V7M15 3V7M19 3V7M5 11V15M9 11V15M13 11V15M17 11V15M21 11V15" stroke="#b58e45" stroke-width=".9"/></symbol>
<symbol id="boat" viewBox="-16 -7 32 14" overflow="visible"><path d="M-15 0Q-12 -6 0 -6Q12 -6 16 0Q12 6 0 6Q-12 6 -15 0Z" fill="#6b4a2a"/><path d="M-13 0Q-10 -4 0 -4Q10 -4 13 0Q10 4 0 4Q-10 4 -13 0Z" fill="#a8743a"/><path d="M-14 0H15" stroke="#4a301a" stroke-width=".8"/></symbol>
<symbol id="hat" viewBox="-5 -5 10 10" overflow="visible"><circle r="4.6" fill="#f1dca0"/><circle r="4.6" fill="none" stroke="#b8923f" stroke-width=".6"/><circle r="2.8" fill="none" stroke="#c9a352" stroke-width=".5"/><circle r="1" fill="#b8923f"/></symbol>
<symbol id="lotus" viewBox="-9 -9 18 18" overflow="visible"><circle r="8" fill="#3f9a4e"/><path d="M0 0L8 -1.5" stroke="#2a7a38" stroke-width=".8"/><g fill="#f58bb0" stroke="#d8618c" stroke-width=".5">{''.join(f'<ellipse cx="0" cy="-3.2" rx="1.7" ry="3.2" transform="rotate({k * 60})"/>' for k in range(6))}</g><circle r="1.5" fill="#ffd54a"/></symbol>
<symbol id="bamboo" viewBox="-9 -9 18 18" overflow="visible"><g fill="none" stroke-linecap="round">{''.join(f'<path d="M0 0L{9 * math.cos(k * .9):.1f} {9 * math.sin(k * .9):.1f}" stroke="#4da04a" stroke-width="1.6"/>' for k in range(7))}</g><circle r="1.6" fill="#3a7f3a"/></symbol>
<pattern id="paddy" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#9bd36a"/><path d="M0 2H8M0 6H8" stroke="#86c257" stroke-width="1.6"/></pattern>
<pattern id="wavep" width="16" height="8" patternUnits="userSpaceOnUse"><path d="M0 4q4 -3 8 0t8 0" fill="none" stroke="#bfe9f2" stroke-width="1" opacity=".7"/></pattern>
</defs>'''
add(defs)

# nền: đồng lúa
add('<rect width="300" height="300" fill="#a6da72"/>')
add('<g fill="#92cb61"><circle cx="30" cy="260" r="40"/><circle cx="270" cy="30" r="34"/><circle cx="150" cy="200" r="44"/></g>')
# ruộng bậc thấp góc dưới trái
add('<path d="M14 214H120V286H14Z" fill="url(#paddy)"/><path d="M14 214H120V286H14Z" fill="none" stroke="#7aa54a" stroke-width="2"/>')
add('<path d="M14 250H120" stroke="#c9b27a" stroke-width="2"/>')

# SÔNG: chạy dọc cạnh trên rồi quặt xuống cạnh phải
river = "M-10 64 C40 52 80 80 130 72 S 200 50 236 78 S 252 150 244 190 S 262 262 250 312"
add(f'<path d="{river}" fill="none" stroke="#7a5a30" stroke-width="42" stroke-linecap="round"/>')  # bờ
add(f'<path d="{river}" fill="none" stroke="#3aa6c4" stroke-width="36" stroke-linecap="round"/>')
add(f'<path d="{river}" fill="none" stroke="#63c3dc" stroke-width="24" stroke-linecap="round" opacity=".7"/>')
add(f'<path d="{river}" fill="none" stroke="url(#wavep)" stroke-width="32" stroke-linecap="round"/>')

# đường đất dẫn vào sân giữa
add('<path d="M70 222 C95 205 120 180 150 160 M150 160 C190 190 205 215 205 250 M150 160 C130 120 120 100 112 92" fill="none" stroke="#d9c28a" stroke-width="7" stroke-linecap="round"/>')
add('<path d="M70 222 C95 205 120 180 150 160 M150 160 C190 190 205 215 205 250 M150 160 C130 120 120 100 112 92" fill="none" stroke="#c6ad6f" stroke-width="7" stroke-linecap="round" stroke-dasharray="1 6" opacity=".7"/>')

# SÂN GIỮA: trống đồng (hoạ tiết Đông Sơn) mờ để xúc xắc rơi lên
cx, cy = 150, 150
add(f'<circle cx="{cx}" cy="{cy}" r="52" fill="#d7b872"/>')
add(f'<circle cx="{cx}" cy="{cy}" r="52" fill="none" stroke="#8a6a2c" stroke-width="2.5"/>')
for r_, w_, col in [(46, 3, "#b98f43"), (36, 5, "#c9a050"), (26, 3, "#b98f43")]:
    add(f'<circle cx="{cx}" cy="{cy}" r="{r_}" fill="none" stroke="{col}" stroke-width="{w_}" stroke-dasharray="{3 if r_ != 36 else 1.5} 3"/>')
# ngôi sao 14 cánh tâm trống
pts = []
for k in range(28):
    rr = 19 if k % 2 == 0 else 9
    a = k * math.pi / 14 - math.pi / 2
    pts.append(f'{cx + rr * math.cos(a):.1f},{cy + rr * math.sin(a):.1f}')
add(f'<polygon points="{" ".join(pts)}" fill="#e4c47d" stroke="#8a6a2c" stroke-width="1"/>')
add(f'<circle cx="{cx}" cy="{cy}" r="5" fill="#b98f43"/>')
# chim lạc / hươu vòng ngoài (chấm tượng trưng)
for k in range(12):
    a = k * math.pi / 6
    add(f'<circle cx="{cx + 41 * math.cos(a):.1f}" cy="{cy + 41 * math.sin(a):.1f}" r="1.6" fill="#8a6a2c"/>')

# CHỢ NỔI ở khúc quanh sông (236,78)
boats = [(214, 62, 8, "#d9534f"), (232, 52, -20, "#e8a13a"), (250, 72, 12, "#3b8a58"), (226, 90, -6, "#c75a9b"), (244, 100, 70, "#e8a13a"), (200, 78, 4, "#3b8a58"), (258, 124, 80, "#d9534f"), (240, 148, 82, "#3b8a58"), (96, 66, 2, "#e8a13a"), (60, 70, 8, "#d9534f")]
for (x, y, rot, col) in boats:
    add(f'<g transform="translate({x} {y}) rotate({rot})"><use href="#boat" x="-16" y="-7" width="32" height="14"/>'
        f'<path d="M-9 0H9" stroke="{col}" stroke-width="3.4" stroke-linecap="round"/>'
        f'<circle cx="-4" cy="0" r="2.2" fill="{col}"/><circle cx="3" cy="0" r="2.2" fill="#ffd24a"/><circle cx="8" cy="0" r="1.8" fill="#e84a3a"/>'
        f'<use href="#hat" x="-13" y="-5" width="10" height="10"/></g>')
# cây bẹo (cột treo hàng) ở 3 ghe
for (x, y) in [(232, 52), (214, 62), (250, 72)]:
    add(f'<circle cx="{x}" cy="{y - 9}" r="1.2" fill="#6b4129"/><circle cx="{x + 3}" cy="{y - 11}" r="2" fill="#ffd24a"/><circle cx="{x - 3}" cy="{y - 11}" r="2" fill="#e84a3a"/>')

# CẦU KHỈ bắc ngang sông (x=90) và cầu bê tông (y=190, x≈244)
add('<g><rect x="86" y="44" width="5" height="52" rx="2" fill="#a7814a"/><path d="M86 48V92" stroke="#6b4a2a" stroke-width=".8"/><path d="M92 46V94" stroke="#6b4a2a" stroke-width="1.4" stroke-dasharray="3 2"/><path d="M84 44V96" stroke="#8a6a35" stroke-width="1"/></g>')
add('<g><rect x="222" y="184" width="46" height="12" rx="3" fill="#cfc7b4"/><rect x="222" y="184" width="46" height="3" fill="#e8e2d2"/><path d="M226 196V184M236 196V184M246 196V184M256 196V184M266 196V184" stroke="#9a927e" stroke-width="1"/></g>')

# CHÙA Việt (mái ngói nhiều tầng) bên trái, nhà thờ họ nhỏ
def pagoda(x, y, s=1):
    return (f'<g transform="translate({x} {y}) scale({s})"><rect x="-24" y="-24" width="48" height="48" rx="4" fill="#e8dcb4" stroke="#a89560" stroke-width="1.5"/>'
            f'<rect x="-22.5" y="-3" width="3" height="26" fill="none"/><rect x="-14" y="-14" width="28" height="28" rx="2" fill="#7d2416" transform="translate(2 2)" opacity=".3"/>'
            f'<rect x="-14" y="-14" width="28" height="28" rx="2" fill="#c8452d"/><rect x="-14" y="-14" width="28" height="14" rx="2" fill="#df6a46"/>'
            f'<rect x="-8" y="-8" width="16" height="16" rx="1" fill="#b53a26"/><rect x="-8" y="-8" width="16" height="8" rx="1" fill="#e9835a"/>'
            f'<rect x="-3.2" y="-3.2" width="6.4" height="6.4" fill="#f2b632" stroke="#9b6c13" stroke-width=".8"/><circle r="1.4" fill="#fff3c8"/>'
            f'<path d="M-14 0H14M0 -14V14" stroke="#7d2416" stroke-width=".9"/></g>')
add(pagoda(58, 150, 1.05))
# Chùa Khmer vàng bên phải sân
def khmer(x, y):
    g = f'<g transform="translate({x} {y})"><rect x="-22" y="-22" width="44" height="44" rx="4" fill="#efe3b8" stroke="#b49a58" stroke-width="1.5"/>'
    for r_, col in [(16, "#e89a1f"), (12, "#f2b632"), (8, "#f7c94c"), (4, "#fff0a8")]:
        g += f'<rect x="{-r_}" y="{-r_}" width="{2 * r_}" height="{2 * r_}" rx="1.5" fill="{col}" stroke="#a8721a" stroke-width=".7" transform="rotate(45)"/>'
    g += '<circle r="1.6" fill="#c8452d"/></g>'
    return g
add(khmer(196, 236))

# AO SEN
add('<ellipse cx="64" cy="226" rx="38" ry="22" fill="#6b4a2a"/><ellipse cx="64" cy="226" rx="35" ry="19" fill="#3aa6c4"/><ellipse cx="64" cy="226" rx="35" ry="19" fill="url(#wavep)"/>')
for (x, y) in [(50, 222), (64, 232), (76, 220), (58, 214), (84, 232), (44, 234)]:
    add(f'<use href="#lotus" x="{x - 9}" y="{y - 9}" width="18" height="18"/>')

# NHÀ MÁI NGÓI (đỏ) và NHÀ LÁ (nâu vàng) rải thành xóm
tiles = [(30, 112, 0), (30, 136, 0), (100, 120, 8), (116, 150, 0), (34, 190, 0), (160, 234, 0), (130, 258, 0), (168, 120, 0), (172, 96, 10)]
thatch = [(28, 160, 0), (100, 205, 0), (150, 262, 0), (176, 150, 0), (180, 190, 0), (106, 96, 0), (56, 108, 4), (74, 262, 0), (230, 248, 0)]
far = lambda t: math.hypot(t[0] - 150, t[1] - 150) > 66
for (x, y, r) in filter(far, tiles):
    add(f'<g transform="translate({x} {y}) rotate({r})"><use href="#tile" x="-12" y="-9" width="24" height="18"/></g>')
for (x, y, r) in filter(far, thatch):
    add(f'<g transform="translate({x} {y}) rotate({r})"><use href="#thatch" x="-12" y="-9" width="24" height="18"/></g>')

# DỪA, TRE, CHUỐI
for (x, y, s) in [(14, 100, 1), (80, 128, .9), (84, 184, 1.1), (154, 100, 1), (190, 172, .9), (140, 236, 1.05), (212, 205, 1), (18, 238, .95), (118, 280, 1), (240, 232, .9), (276, 150, 1), (275, 270, 1), (20, 40, 1.1), (60, 24, 1), (150, 24, 1.1), (200, 22, 1), (274, 40, 1)]:
    add(f'<use href="#palm" x="{x - 17 * s}" y="{y - 17 * s}" width="{34 * s}" height="{34 * s}"/>')
for (x, y) in [(46, 94), (72, 196), (190, 122), (215, 128), (14, 176), (174, 280), (268, 196)]:
    add(f'<use href="#bamboo" x="{x - 9}" y="{y - 9}" width="18" height="18"/>')

# Đèn lồng / cờ phướn dọc viền (chấm đỏ-vàng)
for k in range(15):
    x = 14 + k * 19.5
    col = "#e63946" if k % 2 == 0 else "#ffc93c"
    add(f'<circle cx="{x:.1f}" cy="290" r="3" fill="{col}"/><circle cx="{x:.1f}" cy="290" r="3" fill="none" stroke="#7a2b1a" stroke-width=".6"/>')
    add(f'<circle cx="{x:.1f}" cy="10" r="3" fill="{col}"/><circle cx="{x:.1f}" cy="10" r="3" fill="none" stroke="#7a2b1a" stroke-width=".6"/>')
add('<path d="M10 10H290M10 290H290" stroke="#7a2b1a" stroke-width=".8" opacity=".6"/>')
add('<rect x="5" y="5" width="290" height="290" rx="16" fill="none" stroke="#7b4a26" stroke-width="5"/><rect x="5" y="5" width="290" height="290" rx="16" fill="none" stroke="#f2b632" stroke-width="1.2" stroke-dasharray="2 3"/>')

svg = ('<svg class="city" viewBox="0 0 300 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">' + ''.join(out) + '</svg>')
p = ROOT / "index.html"
s = p.read_text(encoding="utf-8")
s2, n = re.subn(r'<svg class="city".*?</svg>', lambda m: svg, s, count=1, flags=re.S)
assert n == 1
p.write_text(s2, encoding="utf-8")
print("OK", len(svg), "bytes")
