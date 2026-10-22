#!/usr/bin/env python3
"""
Horneado del hero C "A traves del vidrio" (y piezas que usan el mismo motor).

Uso:
    python3 hornear_hero.py ciclo.json            # hornea con las cajas del JSON
    python3 hornear_hero.py ciclo.json --rapido   # solo 1x, para probar

ciclo.json:
    {
      "ventana": "bagues-la-bomba",                       # la caja nitida
      "cajas": ["bagues-amor-amor", "bagues-angels-share", ...],  # 2 a 5 detras del vidrio
      "salida": "salida/hero_c"                           # opcional
    }

Cada entrada de "ventana" o "cajas" puede ser:
  - un slug de scripts/fotos/fuentes.json (se usa la caja Bagues, nunca el frasco Unlock);
  - una ruta a un PNG con fondo transparente (por ejemplo una foto propia de Sebas ya recortada).

Capas: la pared sale de las paredes generadas (generadas/pared_*_gen.webp): de ahi se toma solo
el relieve del yeso y la repisa; la luz (pared vino #4a161f, halo rosa-vino) se rehace aca, asi
el halo cae siempre detras de la ventana y nunca debajo del titular.

Requiere: numpy, opencv-python, Pillow (con AVIF).
"""
import json, os, sys, math, subprocess, io
import numpy as np
import cv2
from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(AQUI, '..', '..'))
FUENTES_JSON = os.path.join(REPO, 'scripts/fotos/fuentes.json')
CACHE_CAJAS = os.path.join(AQUI, 'cache', 'cajas')  # se baja sola; no se versiona
GEN = os.path.join(AQUI, 'generadas')

# ---------------------------------------------------------------- paleta
def hex2f(h):
    h = h.lstrip('#'); return np.array([int(h[i:i+2], 16) for i in (0, 2, 4)], np.float32) / 255.0

VINO = hex2f('#4a161f')
SOMBRA = hex2f('#14070a')
ROSA = hex2f('#e0708a')
ORO = hex2f('#d6a862')
HUESO = hex2f('#f3ece1')
TINTA = hex2f('#f3ece1')

# ---------------------------------------------------------------- formatos
# Todas las medidas en px CSS; "escala" es la densidad a la que se hornea.
FORMATOS = {
    'escritorio': dict(
        ancho=1440, alto=900, escala=2, fuente_pared='pared_escritorio_gen.webp',
        pared_src=dict(sup0=803, sup1=915), detalle_css_por_src=0.94,
        repisa=712, frente=772, repisa_apagada_hasta=(420, 760),
        halo=dict(cx=990, cy=440, r=360, fuerza=1.0),
        panel=dict(tipo='x', desde=648),  # vidrio desde x=648 hasta el borde derecho
        estria=30,
        ventana=dict(cx=980, ancho=340, arriba=150, abajo=808),
        caja_ventana=dict(cx=980, base=752, alto=318),
        cajas=[  # (cx, base, alto, luz)  se dibujan de atras para adelante
            (770, 724, 250, 0.66), (1236, 724, 250, 0.74),
            (872, 738, 292, 0.80), (1100, 738, 292, 0.86), (1376, 740, 296, 0.64),
        ],
        zonas_texto=[(96, 110, 620, 800)],
    ),
    'celular': dict(
        ancho=390, alto=844, escala=3, fuente_pared='pared_celular_gen.webp',
        pared_src=dict(sup0=1103, sup1=1166), detalle_css_por_src=1.0,
        repisa=498, frente=540,
        halo=dict(cx=195, cy=430, r=170, fuerza=1.0),
        panel=dict(tipo='y', desde=272),
        estria=24,
        ventana=dict(cx=195, ancho=200, arriba=290, abajo=540),
        caja_ventana=dict(cx=195, base=528, alto=184),
        cajas=[
            (58, 512, 150, 0.60), (334, 512, 150, 0.66),
            (-12, 524, 172, 0.55), (404, 524, 172, 0.55),
        ],
        zonas_texto=[(16, 96, 374, 260), (16, 580, 374, 660)],
    ),
}

# ---------------------------------------------------------------- utilidades
def leer_rgba(ruta):
    im = Image.open(ruta).convert('RGBA')
    return np.asarray(im).astype(np.float32) / 255.0

def guardar_png(arr, ruta):
    a = np.clip(arr * 255 + 0.5, 0, 255).astype(np.uint8)
    Image.fromarray(a).save(ruta, optimize=True)

def redim(arr, w, h):
    sh, sw = arr.shape[:2]
    interp = cv2.INTER_AREA if (w < sw and h < sh) else cv2.INTER_LANCZOS4
    out = cv2.resize(arr, (int(w), int(h)), interpolation=interp)
    return np.clip(out, 0, 1) if out.dtype == np.float32 else out

def lum(rgb):
    return rgb[..., 0] * 0.2126 + rgb[..., 1] * 0.7152 + rgb[..., 2] * 0.0722

def sobre(base_rgb, capa_rgba):
    """Composicion 'over' de una capa RGBA (no premultiplicada) sobre RGB."""
    a = capa_rgba[..., 3:4]
    return base_rgb * (1 - a) + capa_rgba[..., :3] * a

def sobre_rgba(dst, src):
    """'over' RGBA sobre RGBA, ambos no premultiplicados."""
    sa = src[..., 3:4]; da = dst[..., 3:4]
    oa = sa + da * (1 - sa)
    oc = (src[..., :3] * sa + dst[..., :3] * da * (1 - sa)) / np.maximum(oa, 1e-6)
    return np.concatenate([oc, oa], -1)

def pegar(capa, img, x, y):
    """Pega img RGBA en capa RGBA (over), x,y = esquina sup izq en px, con recorte."""
    H, W = capa.shape[:2]; h, w = img.shape[:2]
    x0, y0 = int(round(x)), int(round(y))
    ax0, ay0 = max(0, x0), max(0, y0); ax1, ay1 = min(W, x0 + w), min(H, y0 + h)
    if ax1 <= ax0 or ay1 <= ay0: return
    sub = img[ay0 - y0:ay1 - y0, ax0 - x0:ax1 - x0]
    capa[ay0:ay1, ax0:ax1] = sobre_rgba(capa[ay0:ay1, ax0:ax1], sub)

# ---------------------------------------------------------------- cajas
_FUENTES = None
def fuentes():
    global _FUENTES
    if _FUENTES is None:
        _FUENTES = json.load(open(FUENTES_JSON))
    return _FUENTES

def ruta_caja(entrada):
    if os.path.exists(entrada):
        return entrada
    os.makedirs(CACHE_CAJAS, exist_ok=True)
    ruta = os.path.join(CACHE_CAJAS, entrada + '.png')
    if not os.path.exists(ruta):
        f = fuentes().get(entrada, {}).get('bagues')
        if not f:
            raise SystemExit(f'"{entrada}" no tiene caja Bagues en fuentes.json (no se usan frascos Unlock).')
        subprocess.run(['curl', '-sS', '-f', '-L', '-o', ruta, f['url']], check=True)
    return ruta

def cargar_caja(entrada):
    a = leer_rgba(ruta_caja(entrada))
    al = a[..., 3]
    ys, xs = np.where(al > 0.04)
    if len(xs) == 0: raise SystemExit(f'{entrada}: el PNG no tiene alfa (hace falta el recorte).')
    a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1].copy()
    # limpiar el halo blanco del filo: los PNG de Shopify traen el borde premultiplicado claro
    al = a[..., 3]
    borde = (al > 0.02) & (al < 0.9)
    a[..., :3][borde] = a[..., :3][borde] * (0.55 + 0.45 * al[borde, None])
    return a

def tratar_caja(caja, alto_px, luz, lado_luz, escala, nitida=False):
    """Escala, gradua (luz de la escena) y agrega luz de contorno del lado del halo."""
    h0, w0 = caja.shape[:2]
    w = max(2, int(round(w0 * alto_px / h0)))
    c = redim(caja, w, int(alto_px)).copy()
    rgb, al = c[..., :3], c[..., 3]
    # gradiente lateral: el lado que mira al halo, mas claro
    xs = np.linspace(-1, 1, w, dtype=np.float32)[None, :, None]
    lado = 1.0 + 0.16 * xs * lado_luz
    # caida vertical: la base un poco mas oscura (oclusion sobre la repisa)
    ys = np.linspace(0, 1, c.shape[0], dtype=np.float32)[:, None, None]
    vert = 1.0 - 0.10 * np.clip((ys - 0.75) / 0.25, 0, 1)
    tinte = np.array([1.0, 0.93, 0.90], np.float32)
    if nitida:
        tinte = np.array([1.0, 0.96, 0.94], np.float32)
    rgb = rgb * luz * lado * vert * (0.85 + 0.15 * tinte)
    # bajar un poco la saturacion de las del fondo
    if not nitida:
        L = lum(rgb)[..., None]
        rgb = L + (rgb - L) * (0.78 + 0.22 * luz)
    # luz de contorno calida
    k = max(1, int(round(2.2 * escala)))
    desplazado = np.roll(al, -k * lado_luz, axis=1)
    if lado_luz > 0: desplazado[:, -k:] = 0
    else: desplazado[:, :k] = 0
    borde = np.clip(al - desplazado, 0, 1)
    borde = cv2.GaussianBlur(borde, (0, 0), 0.8 * escala)
    # mas fuerte arriba (la luz viene de arriba)
    borde *= (1.0 - 0.6 * ys[..., 0])
    color_borde = ROSA * 0.55 + ORO * 0.45
    fuerza = 0.55 if nitida else 0.38
    rgb = rgb + borde[..., None] * color_borde * fuerza * al[..., None]
    c[..., :3] = np.clip(rgb, 0, 1)
    return c

def sombras_y_reflejo(capa, caja, x, y_base, escala, lado_luz, y_frente_px, fuerza=1.0):
    """Agrega a 'capa' (RGBA) la sombra en la pared, el reflejo en la repisa y la sombra de contacto."""
    h, w = caja.shape[:2]
    al = caja[..., 3]
    H, W = capa.shape[:2]
    # 1) sombra proyectada sobre la pared (la luz de frente arriba-izq la tira atras, a un lado)
    sh = np.zeros((h, w, 4), np.float32)
    sh[..., 3] = cv2.GaussianBlur(al, (0, 0), 0.05 * h) * 0.38 * fuerza
    pegar(capa, sh, x - lado_luz * 0.06 * h, y_base - h - 0.02 * h)
    # 2) reflejo en la piedra pulida
    ref = caja[::-1].copy()
    largo = int(0.32 * h)
    ref = ref[:largo]
    fade = np.linspace(1, 0, largo, dtype=np.float32) ** 1.6
    ref[..., 3] *= fade[:, None] * 0.20 * fuerza
    ref = cv2.GaussianBlur(ref, (0, 0), sigmaX=0.6 * escala, sigmaY=2.2 * escala)
    ref[..., :3] *= 0.75
    # recortar el reflejo al plano de la repisa
    lim = int(y_frente_px - y_base)
    if lim > 0:
        ref = ref[:lim]
        pegar(capa, ref, x, y_base)
    # 3) sombra de contacto
    rx, ry = 0.50 * w, max(2.0 * escala, 0.030 * h)
    pad = int(ry * 4)
    cw, ch = int(2 * rx + 2 * pad), int(2 * ry + 2 * pad)
    yy, xx = np.mgrid[0:ch, 0:cw].astype(np.float32)
    e = ((xx - cw / 2) / rx) ** 2 + ((yy - ch / 2) / ry) ** 2
    m = np.clip(1.0 - e, 0, 1) ** 0.7
    m = cv2.GaussianBlur(m, (0, 0), ry * 0.8)
    cs = np.zeros((ch, cw, 4), np.float32); cs[..., 3] = m * 0.80 * fuerza
    pegar(capa, cs, x + w / 2 - cw / 2, y_base - ch / 2 - ry * 0.3)

# ---------------------------------------------------------------- pared
def campo_halo(W, H, halo, s):
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    d = np.hypot(xx - halo['cx'] * s, (yy - halo['cy'] * s) * 1.05) / (halo['r'] * s)
    return (np.exp(-1.6 * d ** 2) * halo.get('fuerza', 1.0)).astype(np.float32)

def hacer_pared(f):
    s = f['escala']; W, H = f['ancho'] * s, f['alto'] * s
    src = np.asarray(Image.open(os.path.join(GEN, f['fuente_pared'])).convert('RGB')).astype(np.float32) / 255
    sup0, sup1 = f['pared_src']['sup0'], f['pared_src']['sup1']
    # --- relieve del yeso (sin la luz original)
    yeso = src[:sup0 - 6]
    Y = lum(yeso) + 1e-3
    bajo = cv2.GaussianBlur(Y, (0, 0), 38)
    detalle = np.clip(Y / bajo, 0.55, 1.6)
    k = s / f['detalle_css_por_src']  # px de salida por px fuente
    dw, dh = int(detalle.shape[1] * k), int(detalle.shape[0] * k)
    detalle = cv2.resize(detalle, (dw, dh), interpolation=cv2.INTER_CUBIC)
    alto_pared = int(f['repisa'] * s)
    # repetir en espejo si no alcanza
    while detalle.shape[1] < W: detalle = np.concatenate([detalle, detalle[:, ::-1]], 1)
    while detalle.shape[0] < alto_pared: detalle = np.concatenate([detalle, detalle[::-1]], 0)
    ox = (detalle.shape[1] - W) // 2
    detalle = detalle[detalle.shape[0] - alto_pared:, ox:ox + W]
    # grano fino para que no quede blando al ampliar
    rng = np.random.default_rng(7)
    grano = cv2.GaussianBlur(rng.normal(0, 1, (alto_pared, W)).astype(np.float32), (0, 0), 0.6 * s)
    detalle = detalle * (1 + 0.035 * grano)

    halo = campo_halo(W, H, f['halo'], s)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    # luz ambiente: cae hacia los bordes y hacia arriba
    amb = np.exp(-(((xx - f['halo']['cx'] * s) / (W * 0.85)) ** 2) - (((yy - f['halo']['cy'] * s) / (H * 0.9)) ** 2))
    amb = 0.30 + 0.70 * amb
    base = SOMBRA + (VINO - SOMBRA) * amb[..., None]
    rosa_halo = (ROSA * 0.62 + VINO * 0.38) - VINO
    color = base + rosa_halo * (halo[..., None] * 0.95)
    pared = color[:alto_pared] * (1 + (detalle[..., None] - 1) * (0.55 + 0.9 * halo[:alto_pared, :, None]))
    # oclusion en el encuentro pared-repisa
    dy = (alto_pared - yy[:alto_pared]) / (10 * s)
    pared *= (1 - 0.40 * np.exp(-dy))[..., None]

    # --- repisa: superficie y frente tomados de la foto generada
    kx = W / src.shape[1] if f['ancho'] > f['alto'] else 2.1 * s / 3
    sw = int(src.shape[1] * kx)
    sup = src[sup0:sup1]; fre = src[sup1:]
    alto_sup = int((f['frente'] - f['repisa']) * s); alto_fre = H - int(f['frente'] * s)
    sup = cv2.resize(sup, (sw, alto_sup), interpolation=cv2.INTER_CUBIC)
    fre = cv2.resize(fre, (sw, max(alto_fre, 1)), interpolation=cv2.INTER_CUBIC)
    ox = (sw - W) // 2
    sup, fre = sup[:, ox:ox + W], fre[:, ox:ox + W]
    # tenir la piedra hacia el vino y que el halo la ilumine
    def tenir(p, oscuro):
        L = lum(p)[..., None]
        p = L * (np.array([1.0, 0.62, 0.62], np.float32)) * 0.6 + p * 0.4
        return p * oscuro
    lx = np.exp(-(((np.arange(W) - f['halo']['cx'] * s) / (f['halo']['r'] * s * 1.6)) ** 2)).astype(np.float32)
    sup = tenir(sup, 1.0) * (0.36 + 1.0 * lx)[None, :, None]
    fre = tenir(fre, 0.80) * (0.55 + 0.50 * lx)[None, :, None]
    # canto de la repisa: filo de luz fino
    filo = np.exp(-((np.arange(alto_sup) - (alto_sup - 1.2 * s)) / (0.9 * s)) ** 2).astype(np.float32)
    sup = sup + filo[:, None, None] * (ORO * 0.25)[None, None, :] * lx[None, :, None]
    # sombra del frente: arriba mas claro
    gf = np.linspace(1.0, 0.65, fre.shape[0], dtype=np.float32)[:, None, None]
    fre = fre * gf
    out = np.concatenate([pared, sup, fre[:H - alto_pared - alto_sup]], 0)
    # la repisa se apaga del lado del titular (escritorio): la luz vive solo del lado del halo
    if f.get('repisa_apagada_hasta'):
        x0, x1 = [v * s for v in f['repisa_apagada_hasta']]
        k = np.clip((np.arange(W, dtype=np.float32) - x0) / (x1 - x0), 0, 1)
        k = k * k * (3 - 2 * k)
        out[alto_pared:] *= (0.45 + 0.55 * k)[None, :, None]
    return np.clip(out, 0, 1).astype(np.float32), halo

# ---------------------------------------------------------------- vidrio
def sdf_arco(W, H, cx, ancho, arriba, abajo, s):
    r = ancho * s / 2; cx, arriba, abajo = cx * s, arriba * s, abajo * s
    cy = arriba + r
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    d_circ = np.hypot(xx - cx, yy - cy) - r
    dx = np.abs(xx - cx) - r; dyb = yy - abajo
    d_caja = np.maximum(dx, dyb)
    d = np.where(yy < cy, np.maximum(d_circ, dyb), d_caja)
    return d  # negativo adentro, en px

def aplicar_vidrio(escena, halo, panel, estria_css, s, sdf_ventana=None, fuerza=1.0, origen_x=0.0):
    H, W = escena.shape[:2]
    Wf = estria_css * s
    xx = np.arange(W, dtype=np.float32)
    fase = (xx - origen_x) / Wf
    u = (fase - np.floor(fase)) * 2 - 1  # -1..1 a lo ancho de la estria
    # lente cilindrica: el centro casi no desvia, los bordes desvian y comprimen
    A, B = 0.34 * fuerza, 0.52 * fuerza
    desv = Wf * (A * u ** 3 + B * u)
    ca = 1.0 * s * u  # aberracion cromatica 1 px CSS
    # desenfoque vertical leve (y algo mas en los bordes de la estria)
    suave = cv2.GaussianBlur(escena, (0, 0), sigmaX=0.6 * s, sigmaY=2.4 * s)
    muy = cv2.GaussianBlur(escena, (0, 0), sigmaX=2.0 * s, sigmaY=4.0 * s)
    mx = np.tile((xx + desv)[None, :], (H, 1)).astype(np.float32)
    my = np.tile(np.arange(H, dtype=np.float32)[:, None], (1, W))
    out = np.empty_like(escena)
    peso_borde = (np.abs(u) ** 4)[None, :]
    for c, off in ((0, ca), (1, 0 * ca), (2, -ca)):
        mxc = mx + np.tile(off[None, :], (H, 1)).astype(np.float32)
        a = cv2.remap(suave[..., c], mxc, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
        b = cv2.remap(muy[..., c], mxc, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
        out[..., c] = a * (1 - 0.7 * peso_borde) + b * 0.7 * peso_borde
    # transmision: el vidrio come un poco de luz
    out *= np.array([0.93, 0.91, 0.90], np.float32)
    # sombreado de lente: cada estria es un cilindro, claro del lado de la luz y mas oscuro del otro
    out *= (1.0 - 0.10 * u - 0.10 * u ** 2)[None, :, None]
    # sombra en el valle entre estrias
    valle = np.exp(-((1 - np.abs(u)) / 0.10) ** 2)[None, :, None]
    out *= 1 - 0.38 * valle
    # brillo especular fino: uno por la luz de frente (hueso), otro por el halo de atras (oro)
    yy = np.linspace(0, 1, H, dtype=np.float32)[:, None]
    esp_frente = (np.exp(-((u + 0.55) / 0.05) ** 2) + 0.35 * np.exp(-((u + 0.45) / 0.18) ** 2))[None, :]
    esp_halo = np.exp(-((u - 0.82) / 0.04) ** 2)[None, :]
    # el borde ilumina segun lo que hay detras (luz transmitida)
    detras = lum(cv2.GaussianBlur(escena, (0, 0), 6 * s))
    i_frente = (0.05 + 0.10 * (1 - yy)) * (0.4 + 0.6 * np.clip(detras * 3, 0, 1)) * (0.6 + 0.8 * halo)
    i_halo = 0.06 + 0.55 * halo * (0.5 + 0.5 * np.clip(detras * 2.5, 0, 1))
    out += esp_frente[..., None] * i_frente[..., None] * HUESO
    out += esp_halo[..., None] * i_halo[..., None] * ORO
    # brillo suave de Fresnel al costado de cada estria
    out += (np.abs(u) ** 6)[None, :, None] * 0.018
    out = np.clip(out, 0, 1)

    # mascara del panel
    if panel['tipo'] == 'x':
        pos = np.arange(W, dtype=np.float32)[None, :] - panel['desde'] * s
        m_panel = np.clip(pos + 0.5, 0, 1) * np.ones((H, 1), np.float32)
        dist_borde = np.tile(pos, (H, 1))
    elif panel['tipo'] == 'y':
        pos = np.arange(H, dtype=np.float32)[:, None] - panel['desde'] * s
        m_panel = np.clip(pos + 0.5, 0, 1) * np.ones((1, W), np.float32)
        dist_borde = np.tile(pos, (1, W))
    else:
        m_panel = np.ones((H, W), np.float32); dist_borde = np.full((H, W), 1e6, np.float32)
    m = m_panel.copy()
    if sdf_ventana is not None:
        m_vent = np.clip(0.5 - sdf_ventana, 0, 1)  # 1 adentro de la ventana
        m = m * (1 - m_vent)
    res = escena * (1 - m[..., None]) + out * m[..., None]

    # canto del vidrio (bisel): borde del panel y borde de la ventana
    def bisel(dist, intens):
        # dist >= 0 del lado del vidrio
        linea_clara = np.exp(-((dist - 1.0 * s) / (0.7 * s)) ** 2)
        banda_osc = np.exp(-((dist - 4.5 * s) / (2.5 * s)) ** 2)
        linea_osc = np.exp(-((dist + 0.2 * s) / (0.6 * s)) ** 2)
        return linea_clara * intens, banda_osc, linea_osc
    if panel['tipo'] in ('x', 'y'):
        lc, bo, lo = bisel(dist_borde, 1.0)
        intens = 0.30 + 0.35 * halo
        res = res * (1 - 0.30 * bo[..., None] - 0.35 * lo[..., None])
        res = res + (lc * intens)[..., None] * (HUESO * 0.6 + ORO * 0.4)
    if sdf_ventana is not None:
        d = sdf_ventana * m_panel  # positivo afuera de la ventana (en el vidrio)
        lc, bo, lo = bisel(sdf_ventana, 1.0)
        # el canto brilla mas del lado que mira arriba-izquierda y hacia el halo
        gy, gx = np.gradient(cv2.GaussianBlur(sdf_ventana, (0, 0), 2 * s))
        nrm = np.hypot(gx, gy) + 1e-6
        mira = np.clip((-gx * 0.55 - gy * 0.83) / nrm, -1, 1)  # normal hacia afuera; luz desde arriba-izq
        intens = (0.40 + 0.45 * np.clip(mira, 0, 1) + 0.25 * halo) * m_panel
        res = res * (1 - (0.28 * bo + 0.45 * lo)[..., None] * m_panel[..., None])
        res = res + (lc * intens)[..., None] * (HUESO * 0.5 + ORO * 0.5)
    return np.clip(res, 0, 1), m

# ---------------------------------------------------------------- escena completa
def componer_cajas(f, ventana, cajas, W, H, s, y_frente_px):
    """Devuelve la capa RGBA de cajas (con sombras y reflejos) en el orden correcto."""
    capa = np.zeros((H, W, 4), np.float32)
    piezas = []
    for i, (cx, base, alto, luz) in enumerate(f['cajas']):
        if i >= len(cajas): break
        piezas.append((base, cx, alto, luz, cajas[i], False))
    cv_ = f['caja_ventana']
    piezas.append((cv_['base'] + 0.01, cv_['cx'], cv_['alto'], 1.0, ventana, True))
    piezas.sort(key=lambda p: p[0])
    hx = f['halo']['cx']
    for base, cx, alto, luz, src, nitida in piezas:
        lado = 1 if cx < hx else -1
        if nitida: lado = -1
        c = tratar_caja(src, alto * s, luz, lado, s, nitida=nitida)
        h, w = c.shape[:2]
        x = cx * s - w / 2; y_base = base * s
        sombras_y_reflejo(capa, c, x, y_base, s, lado, y_frente_px, fuerza=1.0 if nitida else 0.9)
        pegar(capa, c, x, y_base - h)
    return capa

def hornear_formato(nombre, ventana, cajas, carpeta, f=None, guardar_capas=True):
    f = f or FORMATOS[nombre]
    s = f['escala']; W, H = f['ancho'] * s, f['alto'] * s
    pared, halo = hacer_pared(f)
    capa = componer_cajas(f, ventana, cajas, W, H, s, f['frente'] * s)
    escena = sobre(pared, capa)
    v = f['ventana']
    sdf = sdf_arco(W, H, v['cx'], v['ancho'], v['arriba'], v['abajo'], s)
    # el halo se ve un toque mas vivo a traves de la ventana nitida (no hay vidrio que lo coma)
    final, m = aplicar_vidrio(escena, halo, f['panel'], f['estria'], s, sdf_ventana=sdf,
                              origen_x=(v['cx'] * s) % (f['estria'] * s))
    # vineta suave en los bordes del cuadro
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    vig = 1 - 0.18 * (((xx / W - 0.5) * 2) ** 4 + ((yy / H - 0.5) * 2) ** 4)
    final = np.clip(final * vig[..., None], 0, 1)
    if guardar_capas:
        cap = os.path.join(carpeta, 'capas'); os.makedirs(cap, exist_ok=True)
        guardar_png(pared, os.path.join(cap, f'{nombre}_pared.png'))
        guardar_png(capa, os.path.join(cap, f'{nombre}_cajas_compuestas.png'))
        # vidrio: el panel horneado sobre la escena, con alfa = donde hay vidrio
        vid = np.concatenate([final, m[..., None]], -1)
        guardar_png(vid, os.path.join(cap, f'{nombre}_vidrio.png'))
        vent = np.concatenate([escena, np.clip(0.5 - sdf, 0, 1)[..., None]], -1)
        guardar_png(vent, os.path.join(cap, f'{nombre}_ventana.png'))
    return final

# ---------------------------------------------------------------- exportar
def exportar_peso(arr, ruta_base, max_kb=None, q_webp=90, q_avif=70):
    img = Image.fromarray(np.clip(arr * 255 + 0.5, 0, 255).astype(np.uint8))
    res = {}
    for ext, q0, kw in (('webp', q_webp, dict(method=6)), ('avif', q_avif, dict(speed=4))):
        q = q0
        while True:
            b = io.BytesIO(); img.save(b, ext.upper(), quality=q, **kw)
            kb = len(b.getvalue()) / 1024
            if max_kb is None or kb <= max_kb or q <= 30: break
            q -= 4
        open(f'{ruta_base}.{ext}', 'wb').write(b.getvalue())
        res[ext] = (round(kb, 1), q)
    return res

def contraste(arr_u8_o_f, zonas, escala=1):
    a = arr_u8_o_f.astype(np.float32)
    if a.max() > 1.5: a /= 255
    lin = np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4)
    L = lin[..., 0] * 0.2126 + lin[..., 1] * 0.7152 + lin[..., 2] * 0.0722
    t = TINTA; tl = np.where(t <= 0.04045, t / 12.92, ((t + 0.055) / 1.055) ** 2.4)
    Lt = tl[0] * 0.2126 + tl[1] * 0.7152 + tl[2] * 0.0722
    out = []
    for (x0, y0, x1, y1) in zonas:
        z = L[int(y0 * escala):int(y1 * escala), int(x0 * escala):int(x1 * escala)]
        peor = z.max()
        out.append(round(float((Lt + 0.05) / (peor + 0.05)), 2))
    return out

def hornear_hero(cfg, rapido=False):
    carpeta = os.path.join(AQUI, cfg.get('salida', 'salida/hero_c'))
    os.makedirs(carpeta, exist_ok=True)
    ventana = cargar_caja(cfg['ventana'])
    cajas = [cargar_caja(c) for c in cfg['cajas']]
    informe = {}
    for nombre in ('escritorio', 'celular'):
        f = dict(FORMATOS[nombre])
        if rapido: f['escala'] = 1
        img = hornear_formato(nombre, ventana, cajas, carpeta, f, guardar_capas=not rapido)
        s = f['escala']
        if nombre == 'escritorio':
            tam = [(1440, 900, 220), (2880, 1800, 260)] if not rapido else [(1440, 900, 220)]
        else:
            tam = [(390, 844, None), (780, 1688, 140), (1170, 2532, None)] if not rapido else [(390, 844, None)]
        for (w, h, lim) in tam:
            if w > f['ancho'] * s: continue
            im = redim(img, w, h) if w != img.shape[1] else img
            base = os.path.join(carpeta, f'hero_c_{w}x{h}')
            guardar_png(im, base + '.png') if w <= 1440 else None
            pesos = exportar_peso(im, base, max_kb=lim)
            # contraste medido sobre el WebP ya codificado, a 1x
            dec = np.asarray(Image.open(base + '.webp').convert('RGB'))
            esc = w / f['ancho']
            informe[f'{w}x{h}'] = dict(pesos_kb=pesos, contraste=contraste(dec, f['zonas_texto'], esc))
    json.dump(informe, open(os.path.join(carpeta, 'informe.json'), 'w'), indent=2, ensure_ascii=False)
    return informe

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(__doc__); sys.exit(1)
    cfg = json.load(open(sys.argv[1]))
    inf = hornear_hero(cfg, rapido='--rapido' in sys.argv)
    print(json.dumps(inf, indent=2, ensure_ascii=False))
