"""Trazo de plumilla: una línea central suave (Catmull-Rom) y un contorno de
grosor variable. Como con una plumilla de punta, las bajadas engordan y las
subidas quedan en pelo; el arranque es firme (cabeza redonda, sin afinar) y
el remate es una gota. Salida: un path SVG relleno."""
import math, sys

# Línea central: una ese larga. Entra firme, la panza engorda en la bajada,
# sube en pelo y cierra en un espiral que baja con peso y termina en gota.
# La ese: puntos a mano. El espiral: calculado, con radio que se achica
# parejo (un calígrafo lo cierra de un solo movimiento, sin quiebres).
CENTRO, R0, R1 = (101.0, 11.4), 7.2, 2.9
A0, VUELTA = math.radians(-118), math.radians(345)
ESPIRAL = []
for k in range(1, 40):
    t = k / 39
    a = A0 + VUELTA * t
    r = R0 + (R1 - R0) * (t ** 0.85)
    ESPIRAL.append((CENTRO[0] + r * math.cos(a), CENTRO[1] + r * math.sin(a)))
P = [(3.0, 13.2), (12, 11.6), (24, 11.4), (38, 14.2), (52, 16.6), (64, 15.6),
     (76, 12.0), (86, 7.6), (CENTRO[0] + R0 * math.cos(A0), CENTRO[1] + R0 * math.sin(A0))] + ESPIRAL


def catmull(p, n=40):
    pts = [p[0]] + p + [p[-1]]
    out = []
    for i in range(1, len(pts) - 2):
        p0, p1, p2, p3 = pts[i - 1], pts[i], pts[i + 1], pts[i + 2]
        for k in range(n):
            t = k / n
            t2, t3 = t * t, t * t * t
            x = 0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3)
            y = 0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)
            out.append((x, y))
    out.append(p[-1])
    return out


def remuestrear(pts, paso=0.35):
    """Puntos a distancia constante sobre la polilínea."""
    out = [pts[0]]; resto = 0.0
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        L = math.hypot(x1 - x0, y1 - y0); d = paso - resto
        while d <= L:
            out.append((x0 + (x1 - x0) * d / L, y0 + (y1 - y0) * d / L)); d += paso
        resto = L - (d - paso)
    out.append(pts[-1]); return out


def suavizar(pts, radio=6, pasadas=3):
    for _ in range(pasadas):
        n = len(pts); nuevo = []
        for i in range(n):
            r = min(radio, i, n - 1 - i)          # ventana que se achica en las puntas
            a, b = i - r, i + r + 1
            nuevo.append((sum(p[0] for p in pts[a:b]) / (b - a), sum(p[1] for p in pts[a:b]) / (b - a)))
        pts = nuevo
    return pts


c = suavizar(remuestrear(catmull(P)))
N = len(c)
# Grosor: base firme + peso en las bajadas (dy > 0 en SVG), suavizado.
fino, base, peso = 0.34, 0.8, 2.1
w = []
for i in range(N):
    a, b = c[max(0, i - 6)], c[min(N - 1, i + 6)]
    dx, dy = b[0] - a[0], b[1] - a[1]
    L = math.hypot(dx, dy) or 1
    baja = max(0.0, dy / L)          # 0 en horizontal o subida, 1 bajando
    sube = max(0.0, -dy / L)
    wi = base + peso * baja ** 0.72 - (base - fino) * sube ** 0.8
    w.append(wi)
# Suavizado para que el peso entre y salga como con la mano.
for _ in range(90):
    w = [w[0]] + [(w[i - 1] + 2 * w[i] + w[i + 1]) / 4 for i in range(1, N - 1)] + [w[-1]]

izq, der = [], []
for i in range(N):
    a, b = c[max(0, i - 5)], c[min(N - 1, i + 5)]
    dx, dy = b[0] - a[0], b[1] - a[1]
    L = math.hypot(dx, dy) or 1
    nx, ny = -dy / L, dx / L
    h = w[i] / 2
    izq.append((c[i][0] + nx * h, c[i][1] + ny * h))
    der.append((c[i][0] - nx * h, c[i][1] - ny * h))

f = lambda p: f"{p[0]:.2f} {p[1]:.2f}"
cuerpo = "M" + f(izq[0]) + "L" + "L".join(f(p) for p in izq[1:]) + "L" + "L".join(f(p) for p in reversed(der)) + "Z"
# Cabeza firme al arrancar y gota al terminar.
x0, y0 = c[0]; r0 = w[0] / 2
xe, ye = c[-1]
gota = 1.5
d = (cuerpo
     + f"M{x0 - r0:.2f} {y0:.2f}a{r0:.2f} {r0:.2f} 0 1 0 {2 * r0:.2f} 0a{r0:.2f} {r0:.2f} 0 1 0 {-2 * r0:.2f} 0Z"
     + f"M{xe - gota:.2f} {ye:.2f}a{gota} {gota} 0 1 0 {2 * gota:.2f} 0a{gota} {gota} 0 1 0 {-2 * gota:.2f} 0Z")
color = sys.argv[1] if len(sys.argv) > 1 else "#faefea"
svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 114 22"><path fill="{color}" fill-rule="nonzero" d="{d}"/></svg>'
print(svg)
