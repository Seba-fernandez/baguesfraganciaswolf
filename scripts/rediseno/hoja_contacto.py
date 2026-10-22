"""Hoja de contacto: todas las piezas juntas, con etiquetas. python3 hoja_contacto.py"""
import os, json
from PIL import Image, ImageDraw, ImageFont
AQ = os.path.dirname(os.path.abspath(__file__)); S = os.path.join(AQ, 'salida')
F = lambda n, t: ImageFont.truetype(os.path.join(AQ, 'trabajo/fuentes_ttf', n + '.ttf'), t)
fondo = (23, 17, 13); tinta = (243, 236, 225); rosa = (224, 112, 138)
W = 2400; filas = []
def fila(titulo, items, alto):
    """items: [(ruta, etiqueta)] -> una fila escalada a 'alto'"""
    ims = []
    for r, et in items:
        im = Image.open(os.path.join(S, r)).convert('RGBA')
        w = int(im.width * alto / im.height); im = im.resize((w, alto), Image.LANCZOS)
        ims.append((im, et))
    filas.append((titulo, ims, alto))
fila('Hero C "A través del vidrio" (1440x900 y 390x844)', [('hero_c/hero_c_1440x900.png', 'hero_c_1440x900'), ('hero_c/hero_c_390x844.png', 'hero_c_390x844')], 520)
fila('Hero C con texto real (maqueta de zonas, no se publica)', [('maquetas/maqueta_hero_c_escritorio.jpg', 'maqueta escritorio'), ('maquetas/maqueta_hero_c_celular.jpg', 'maqueta celular, corte 664')], 520)
fila('Capas del hero C escritorio', [('hero_c/capas/escritorio_pared.png', 'pared'), ('hero_c/capas/escritorio_cajas_compuestas.png', 'cajas compuestas'), ('hero_c/capas/escritorio_ventana.png', 'ventana'), ('hero_c/capas/escritorio_vidrio.png', 'vidrio')], 300)
fila('Hero A "Bodegón de ciudad" (1440x900 y 390x844)', [('hero_a/hero_a_1440x900.png', 'hero_a_1440x900'), ('hero_a/hero_a_390x844.png', 'hero_a_390x844')], 520)
fam = ['citricos', 'florales', 'dulces', 'amaderados', 'ambar']
fila('Texturas de familia 1200x1200', [(f'texturas/textura_{k}.png', k) for k in fam], 420)
fila('Textura dentro del frasco Bagués (PNG con alfa)', [(f'texturas/frasco_{k}.png', k) for k in fam], 420)
des = ['la-bomba', 'baccarat-rouge', 'angels-share', 'sublime', 'amor-amor', 'linterdit']
fila('Destacados 900x1200, nítidos', [(f'destacados/destacado_{k}_nitido.png', k) for k in des], 440)
fila('Destacados 900x1200, detrás del vidrio', [(f'destacados/destacado_{k}_vidrio.png', k) for k in des], 440)
fila('og.jpg 1200x630', [('og/og.jpg', 'og.jpg')], 560)
# armar
pad = 24; cab = 64; et = 30
alto_total = 90 + sum(cab + a + et + pad for _, _, a in filas)
H = Image.new('RGB', (W, alto_total), fondo); d = ImageDraw.Draw(H)
d.text((pad, 24), 'Bagués, rediseño visual. Imágenes v1', font=F('cormorant-600', 44), fill=tinta)
y = 90
for titulo, ims, a in filas:
    d.text((pad, y + 18), titulo, font=F('figtree-600', 24), fill=rosa); y += cab
    x = pad
    for im, e in ims:
        if x + im.width > W - pad:  # si no entra, achicar la fila
            pass
        bg = Image.new('RGBA', im.size, (60, 46, 38, 255)) if im.mode == 'RGBA' else None
        if bg is not None:
            # damero suave para que se vea el alfa
            dd = ImageDraw.Draw(bg)
            for yy in range(0, im.height, 24):
                for xx in range(0, im.width, 24):
                    if (xx // 24 + yy // 24) % 2: dd.rectangle((xx, yy, xx + 23, yy + 23), fill=(48, 37, 31, 255))
            bg.alpha_composite(im); im = bg
        H.paste(im.convert('RGB'), (x, y))
        d.text((x, y + a + 4), e, font=F('figtree-400', 18), fill=tinta)
        x += im.width + pad
    y += a + et + pad
H = H.resize((W, alto_total)); H.save(os.path.join(AQ, 'hoja_contacto.jpg'), quality=84, optimize=True)
print(H.size, round(os.path.getsize(os.path.join(AQ, 'hoja_contacto.jpg')) / 1024), 'kB')
