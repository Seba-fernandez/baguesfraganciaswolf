#!/usr/bin/env python3
"""
El nombre de la familia en la etiqueta del frasco de "¿Qué te gusta oler?"
(decisión de Sebas, 23/10/2026).

    python3 scripts/rediseno/etiquetas_familias.py

Lee los frascos sin texto de scripts/rediseno/familias_sin_nombre/ (los mismos
que hornea hornear_piezas.py familias_color) y escribe public/familias/ con el
nombre en Melodrama y "BAGUES" debajo, como una etiqueta de verdad. Se puede
correr las veces que haga falta: siempre parte de los frascos sin texto.

El texto se dibuja aparte, al doble de tamaño, y se achica para cada ancho
(240 y 420): el frasco no se re-muestrea, solo la letra. El color sale de
medir el contraste contra la etiqueta: tinta o crema, el que contraste más
(4,5:1 o más en todas).
"""
import io, os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from fontTools.ttLib import TTFont

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
FUENTE_DIR = os.path.join(os.path.dirname(__file__), 'familias_sin_nombre')
SALIDA = os.path.join(RAIZ, 'public', 'familias')
NOMBRES = {'citricos': 'Frescos', 'florales': 'Florales', 'dulces': 'Dulces', 'amaderados': 'Amaderados', 'ambar': 'Ámbar'}
TINTA, CREMA = (42, 10, 14), (250, 239, 234)
# La etiqueta en el frasco de 420 px (sale de mascara_frasco y la etiqueta de
# textura_en_frasco en hornear_piezas.py: 20 % a 80 % del ancho, 17 % a 57 %
# del alto del cuerpo). Medida y comprobada sobre los cinco.
ETIQUETA_420 = (86, 374, 334, 630)   # x0, y0, x1, y1
ZONA_TEXTO = 0.40                    # el nombre, al 40 % del alto de la etiqueta (arriba del filete)


def fuente(nombre, tam):
    f = TTFont(os.path.join(RAIZ, 'public', 'fonts', nombre)); f.flavor = None
    b = io.BytesIO(); f.save(b); b.seek(0)
    return ImageFont.truetype(b, tam)


def luminancia(rgb):
    c = np.array(rgb, np.float64) / 255
    c = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]


def contraste(a, b):
    la, lb = sorted((luminancia(a), luminancia(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def capa_texto(nombre, color, escala, sombra=False):
    """El texto solo, en una capa transparente del tamaño del frasco de 420 x escala."""
    x0, y0, x1, y1 = [v * escala for v in ETIQUETA_420]
    ancho = x1 - x0
    capa = Image.new('RGBA', (420 * escala, 905 * escala), (0, 0, 0, 0))
    d = ImageDraw.Draw(capa)
    tam = 46 * escala
    while tam > 10:
        f = fuente('melodrama-600.woff2', tam)
        if d.textlength(nombre, font=f) <= ancho * 0.8: break
        tam -= 1
    cy = y0 + (y1 - y0) * ZONA_TEXTO
    d.text(((x0 + x1) / 2, cy), nombre, font=f, fill=color + (255,), anchor='mm')
    sub = fuente('plexmono-500.woff2', 14 * escala)
    d.text(((x0 + x1) / 2, cy + tam * 0.82), 'B A G U E S', font=sub, fill=color + (235,), anchor='mm')
    if sombra:
        # Etiqueta de tono medio (dulces): ni tinta ni crema llegan a 4,5:1
        # solos. Un halo oscuro muy corto detras de la letra crema la despega
        # sin que se vea como sombra.
        alfa = capa.getchannel('A').filter(ImageFilter.GaussianBlur(1.6 * escala))
        halo = Image.new('RGBA', capa.size, TINTA + (0,)); halo.putalpha(alfa.point(lambda v: int(v * 0.75)))
        capa = Image.alpha_composite(halo, capa)
    return capa


def main():
    os.makedirs(SALIDA, exist_ok=True)
    for archivo, nombre in NOMBRES.items():
        base420 = Image.open(os.path.join(FUENTE_DIR, f'{archivo}-420.webp')).convert('RGBA')
        x0, y0, x1, y1 = ETIQUETA_420
        papel = np.array(base420)[y0 + 20:int(y0 + (y1 - y0) * 0.6), x0 + 20:x1 - 20, :3].reshape(-1, 3).mean(0)
        color = max((TINTA, CREMA), key=lambda c: contraste(c, papel))
        ratio = contraste(color, papel)
        grande = capa_texto(nombre, color, 2, sombra=ratio < 4.5)
        for ancho in (240, 420):
            base = Image.open(os.path.join(FUENTE_DIR, f'{archivo}-{ancho}.webp')).convert('RGBA')
            texto = grande.resize(base.size, Image.LANCZOS)
            Image.alpha_composite(base, texto).save(os.path.join(SALIDA, f'{archivo}-{ancho}.webp'), quality=86, method=6)
        print(f'{archivo:11} {nombre:11} {"tinta" if color == TINTA else "crema"} {ratio:.1f}:1')


if __name__ == '__main__':
    main()
