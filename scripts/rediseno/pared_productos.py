#!/usr/bin/env python3
"""
Las fotos de producto en la pared vino (rediseño C).

Toma los recortes limpios que exporta el pipeline de siempre y apoya cada uno
en la misma pared del hero, con el motor de hornear_hero.py: luz de la escena,
luz de contorno del lado del halo, sombra en la pared, reflejo en la repisa y
sombra de contacto. Sale 900x1200 (3:4), como todas las fotos de la tienda.

    node scripts/fotos/componer.mjs --todo --recortes DIR [--solo a,b]
    python3 scripts/rediseno/pared_productos.py DIR SALIDA

Vidrio transparente (tratamiento "espresso" en fuentes.json): no se recorta.
Recortado, el vidrio quedaba flotando, desflecado o con el fondo viejo
adentro. El frasco queda intacto en su foto y solo el fondo pasa a la pared
vino: su luz y su sombra originales se llevan a una rampa vino y se mezclan
con la textura y el halo de la pared.

Detalle del proceso y de cada número: docs/RECETA-VISUAL.md, paso 5.
"""
import io, json, os, sys
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import hornear_hero as H

ESCALA = 3                 # 300x400 px CSS de diseño a 3x = 900x1200
ANCHO, ALTO = 300, 400
ALTURA_MAX = 0.62          # del alto del cuadro
ANCHO_MAX = 0.78           # del ancho del cuadro
BASE = 318                 # donde apoya, en px CSS (la repisa está en 300)
VINETA = 0.16


def formato(alto_css):
    return dict(
        ancho=ANCHO, alto=ALTO, escala=ESCALA, fuente_pared='pared_celular_gen.webp',
        pared_src=dict(sup0=1103, sup1=1166), detalle_css_por_src=1.3,
        repisa=300, frente=328,
        halo=dict(cx=150, cy=190, r=150, fuerza=1.0),
        panel=dict(tipo='todo'), estria=26,
        caja_ventana=dict(cx=150, base=BASE, alto=alto_css),
        cajas=[],
    )


# Rampa del fondo para el vidrio: la misma pared, de la sombra al halo.
RAMPA_VINO = [(0.0, H.hex2f('#14070a')), (0.5, H.hex2f('#3a1118')), (0.85, H.hex2f('#6a2230')), (1.0, H.hex2f('#8a3443'))]


def rampa(t):
    out = np.zeros(t.shape + (3,), np.float32)
    for (t0, c0), (t1, c1) in zip(RAMPA_VINO, RAMPA_VINO[1:]):
        m = (t >= t0) & (t <= t1)
        f = ((t[m] - t0) / (t1 - t0))[:, None]
        out[m] = c0 + (c1 - c0) * f
    return out


def escena_vidrio(png, meta, pared):
    """Vidrio transparente: el frasco queda intacto en su foto y solo el fondo
    pasa a la pared vino (su luz y sombra originales llevadas a la rampa, mezcladas
    con la textura y el halo de la pared). Encuadre igual que el estudio de siempre:
    el frasco al 70 % del alto, apoyado al 86,5 %."""
    import cv2
    img = H.leer_rgba(png)
    Hs, Ws = img.shape[:2]
    rgb, m = img[..., :3], img[..., 3]
    k = max(1, round(Ws * 0.002))
    m = cv2.erode(m, np.ones((2 * k + 1, 2 * k + 1), np.uint8))
    m = cv2.GaussianBlur(m, (0, 0), max(0.7, Ws * 0.0015))
    c = meta['caja']
    escala = min(1200 * 0.70 / c['h'], 900 * 0.84 / c['w'], meta.get('ampliacionMax') or 2.6)
    escala = max(escala, 900 / Ws, 1200 / Hs)
    cw, ch = round(900 / escala), round(1200 / escala)
    cx = (c['x0'] + c['x1']) / 2
    left = int(min(max(0, round(cx - cw / 2)), Ws - cw))
    top = int(min(max(0, round(c['y1'] - 0.865 * ch)), Hs - ch))
    rgb = cv2.resize(rgb[top:top + ch, left:left + cw], (900, 1200), interpolation=cv2.INTER_LANCZOS4)
    m = cv2.resize(m[top:top + ch, left:left + cw], (900, 1200), interpolation=cv2.INTER_LINEAR)[..., None]
    t = np.clip((H.lum(rgb) - 0.04) / 0.92, 0, 1) ** 1.15
    fondo = 0.55 * rampa(t) + 0.45 * pared
    return np.clip(rgb * m + fondo * (1 - m), 0, 1)


def una(png, meta, pared, halo):
    if meta.get('caja'):
        img = escena_vidrio(png, meta, pared)
        yy, xx = np.mgrid[0:1200, 0:900].astype(np.float32)
        vig = 1 - VINETA * (((xx / 900 - 0.5) * 2) ** 4 + ((yy / 1200 - 0.5) * 2) ** 4)
        return np.clip(img * vig[..., None], 0, 1)
    caja = H.cargar_caja(png)
    # restos casi invisibles del fondo viejo: fuera (si no, dibujan un rectángulo claro)
    caja[..., 3] = np.where(caja[..., 3] < 0.06, 0, caja[..., 3])
    h, w = caja.shape[:2]
    alto = min(ALTO * ALTURA_MAX, ANCHO * ANCHO_MAX * h / w)
    f = formato(alto)
    W, Hh = ANCHO * ESCALA, ALTO * ESCALA
    capa = H.componer_cajas(f, caja, [], W, Hh, ESCALA, f['frente'] * ESCALA)
    esc = H.sobre(pared, capa)
    yy, xx = np.mgrid[0:Hh, 0:W].astype(np.float32)
    vig = 1 - VINETA * (((xx / W - 0.5) * 2) ** 4 + ((yy / Hh - 0.5) * 2) ** 4)
    return np.clip(esc * vig[..., None], 0, 1)


def main(entrada, salida):
    os.makedirs(salida, exist_ok=True)
    pared, halo = H.hacer_pared(formato(200))
    hechas = []
    for linea in sorted(os.listdir(entrada)):
        carpeta = os.path.join(entrada, linea)
        if not os.path.isdir(carpeta): continue
        for arch in sorted(os.listdir(carpeta)):
            if not arch.endswith('.png'): continue
            slug = arch[:-4]
            meta_path = os.path.join(carpeta, slug + '.json')
            meta = json.load(open(meta_path)) if os.path.exists(meta_path) else {}
            img = una(os.path.join(carpeta, arch), meta, pared, halo)
            base = os.path.join(salida, linea, slug)
            os.makedirs(os.path.dirname(base), exist_ok=True)
            pesos = H.exportar_peso(img, base, max_kb=90, q_webp=84, q_avif=62)
            hechas.append((linea, slug, meta.get('tratamiento', ''), pesos))
            print(linea.ljust(7), meta.get('tratamiento', '').ljust(9), str(pesos).ljust(36), slug, flush=True)
    json.dump([dict(linea=l, slug=s, tratamiento=t, pesos=p) for l, s, t, p in hechas],
              open(os.path.join(salida, 'informe.json'), 'w'), indent=1, ensure_ascii=False)


def vacia(salida):
    """La misma pared, con su luz y su vineta, sin producto. La usa la ficha
    del celular a los costados de la foto (espejada), asi la pared sigue sin
    costura en vez de estirar el borde de la foto."""
    pared, halo = H.hacer_pared(formato(200))
    W, Hh = ANCHO * ESCALA, ALTO * ESCALA
    yy, xx = np.mgrid[0:Hh, 0:W].astype(np.float32)
    vig = 1 - VINETA * (((xx / W - 0.5) * 2) ** 4 + ((yy / Hh - 0.5) * 2) ** 4)
    img = np.clip(pared[..., :3] * vig[..., None], 0, 1)
    base = os.path.join(salida, 'pared-vacia')
    print(H.exportar_peso(img, base, max_kb=60, q_webp=80, q_avif=60))


if __name__ == '__main__':
    if len(sys.argv) == 3 and sys.argv[1] == '--vacia':
        vacia(sys.argv[2]); raise SystemExit
    if len(sys.argv) < 3:
        raise SystemExit(__doc__)
    main(sys.argv[1], sys.argv[2])
