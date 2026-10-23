#!/usr/bin/env python3
"""
Piezas que usan el mismo motor que el hero C (hornear_hero.py):
  texturas   5 texturas de familia 1200x1200 + version con vidrio dentro del frasco Bagues (PNG con alfa)
  destacados 6 destacados 900x1200: nitido y detras del vidrio
  hero_a     Hero A "Bodegon de ciudad" 1440x900 y 390x844 (+ @2x)
  og         og.jpg 1200x630 con titular en Cormorant
  maquetas   el hero C con el texto real encima, solo para revisar zonas (no se publica)

Uso: python3 hornear_piezas.py [texturas] [destacados] [hero_a] [og] [maquetas]   (sin argumentos: todo)
"""
import os, sys, json, io
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import hornear_hero as H

AQUI = H.AQUI
SAL = os.path.join(AQUI, 'salida')
TTF = os.path.join(AQUI, 'trabajo/fuentes_ttf')

def fuente(nombre, tam):
    return ImageFont.truetype(os.path.join(TTF, nombre + '.ttf'), tam)

def a_u8(a): return np.clip(a * 255 + 0.5, 0, 255).astype(np.uint8)

# ======================================================================= texturas
FAMILIAS = {
    # nombre: (archivo generado, color de etiqueta, gradacion rgb)
    'citricos':   ('textura_citricos_gen.webp',   '#d9c45a', (1.00, 0.97, 0.86)),
    'florales':   ('textura_florales_gen.webp',   '#e0708a', (1.00, 0.94, 0.95)),
    'dulces':     ('textura_dulces_gen.webp',     '#b8693a', (1.00, 0.93, 0.86)),
    'amaderados': ('textura_amaderados_gen.webp', '#7a4a2c', (1.00, 0.94, 0.88)),
    'ambar':      ('textura_ambar_gen.webp',      '#c9772a', (1.00, 0.92, 0.82)),
}

def textura_base(archivo, grad):
    im = Image.open(os.path.join(H.GEN, archivo)).convert('RGB')
    im = im.resize((1200, 1200), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=1.4, percent=60, threshold=2))
    a = np.asarray(im).astype(np.float32) / 255
    a = a * np.array(grad, np.float32)
    # bajar un poco la clave para que viva en la paleta noir, sin apagarla
    a = a ** 1.08
    yy, xx = np.mgrid[0:1200, 0:1200].astype(np.float32) / 1200
    vig = 1 - 0.22 * (((xx - 0.5) * 2) ** 2 + ((yy - 0.5) * 2) ** 2) / 2
    return np.clip(a * vig[..., None], 0, 1)

def tapa_real():
    """Recorta la tapa de madera real de una caja Bagues (Granada) para el frasco."""
    a = H.leer_rgba(H.ruta_caja('bagues-la-bomba'))
    # zona de la tapa y el collar en el PNG de 800x800 (medida a ojo sobre la fuente)
    tapa = a[44:247, 488:660].copy()
    al = tapa[..., 3]
    ys, xs = np.where(al > 0.5)
    return tapa[ys.min():ys.max() + 1, xs.min():xs.max() + 1]

def mascara_frasco(W, Hh, s=1.0):
    """Silueta del frasco Bagues: cuerpo rectangular de cantos suaves, hombro recto."""
    m = np.zeros((Hh, W), np.uint8)
    cw, ch = int(480 * s), int(740 * s)
    x0 = (W - cw) // 2; y0 = int(380 * s); r = int(30 * s)
    cv2.rectangle(m, (x0 + r, y0), (x0 + cw - r, y0 + ch), 255, -1)
    cv2.rectangle(m, (x0, y0 + r), (x0 + cw, y0 + ch - r), 255, -1)
    for cx, cy in ((x0 + r, y0 + r), (x0 + cw - r, y0 + r), (x0 + r, y0 + ch - r), (x0 + cw - r, y0 + ch - r)):
        cv2.circle(m, (cx, cy), r, 255, -1, lineType=cv2.LINE_AA)
    m = cv2.GaussianBlur(m.astype(np.float32) / 255, (0, 0), 0.8)
    return m, (x0, y0, cw, ch)

def textura_en_frasco(tex, color_etiqueta, foto_en_etiqueta=False):
    W = Hh = 1200
    m, (x0, y0, cw, ch) = mascara_frasco(W, Hh)
    # la textura vista a traves del vidrio acanalado del frasco
    halo = H.campo_halo(W, Hh, dict(cx=x0 + cw * 0.3, cy=y0 + ch * 0.2, r=420, fuerza=1.0), 1)
    vid, _ = H.aplicar_vidrio(tex, halo, dict(tipo='todo'), 64, 2.5, origen_x=x0 + 32)
    # el vidrio del frasco es grueso: oscurece hacia los cantos y tiene un fondo mas espeso
    yy, xx = np.mgrid[0:Hh, 0:W].astype(np.float32)
    nx = np.clip(np.abs((xx - (x0 + cw / 2)) / (cw / 2)), 0, 1)
    vid = vid * (1 - 0.35 * nx[..., None] ** 6)
    fondo = np.clip((yy - (y0 + ch - 70)) / 70, 0, 1)
    vid = vid * (1 - 0.45 * fondo[..., None]) + fondo[..., None] * 0.45 * np.array([0.30, 0.18, 0.16], np.float32)
    # canto: filo claro adentro del contorno
    dist = cv2.distanceTransform((m > 0.5).astype(np.uint8), cv2.DIST_L2, 5)
    filo = np.exp(-((dist - 3) / 1.6) ** 2) * (0.55 + 0.45 * (1 - yy / Hh))
    banda = np.exp(-((dist - 12) / 6) ** 2)
    vid = vid * (1 - 0.25 * banda[..., None]) + filo[..., None] * (H.HUESO * 0.6 + H.ORO * 0.4) * 0.55
    # reflejo vertical largo del lado de la luz (el frasco es un prisma, no una caja plana)
    refl = np.exp(-((xx - (x0 + cw * 0.12)) / 10) ** 2) * np.clip((yy - y0) / ch, 0, 1) ** 0.3 * (1 - np.clip((yy - y0 - ch * 0.85) / (ch * 0.15), 0, 1))
    vid = vid + refl[..., None] * 0.22 * H.HUESO
    # etiqueta de color (sin texto: el nombre lo pone la web)
    ex0, ey0, ew, eh = x0 + int(cw * 0.20), y0 + int(ch * 0.17), int(cw * 0.60), int(ch * 0.40)
    col = H.hex2f(color_etiqueta)
    et = np.zeros((Hh, W), np.float32); et[ey0:ey0 + eh, ex0:ex0 + ew] = 1
    et = cv2.GaussianBlur(et, (0, 0), 0.7)
    lado = 1 + 0.08 * ((xx - ex0) / ew - 0.5)
    papel = col[None, None, :] * lado[..., None] * 0.92
    # filete dorado fino de la etiqueta (como la caja real)
    filete = np.zeros((Hh, W), np.float32); cv2.rectangle(filete, (ex0 + 14, ey0 + eh - 46), (ex0 + ew - 14, ey0 + eh - 44), 1, -1)
    cv2.rectangle(filete, (ex0 + ew // 2 - 26, ey0 + eh - 34), (ex0 + ew // 2 + 26, ey0 + eh - 20), 1, -1)
    papel = papel * (1 - filete[..., None]) + filete[..., None] * H.ORO
    if foto_en_etiqueta:
        # Variante del 23/10 (pedido de Sebas): en vez del color liso, el
        # ingrediente nitido en la etiqueta, con un marco dorado fino. Atras,
        # el mismo ingrediente se sigue viendo borroso por el vidrio.
        th_, tw_ = tex.shape[:2]
        lado_ = min(th_, int(tw_ * eh / ew))
        cy_, cx_ = th_ // 2, tw_ // 2
        rec = tex[cy_ - lado_ // 2: cy_ + lado_ // 2, cx_ - int(lado_ * ew / eh) // 2: cx_ + int(lado_ * ew / eh) // 2]
        rec = cv2.resize(rec, (ew, eh), interpolation=cv2.INTER_AREA)
        rec = rec * (0.88 + 0.12 * lado[ey0:ey0 + eh, ex0:ex0 + ew, None])
        papel = np.zeros((Hh, W, 3), np.float32); papel[ey0:ey0 + eh, ex0:ex0 + ew] = rec
        marco = np.zeros((Hh, W), np.float32)
        cv2.rectangle(marco, (ex0, ey0), (ex0 + ew - 1, ey0 + eh - 1), 1, 5)
        cv2.rectangle(marco, (ex0 + 12, ey0 + 12), (ex0 + ew - 13, ey0 + eh - 13), 0.8, 2)
        marco = cv2.GaussianBlur(marco, (0, 0), 0.6)
        papel = papel * (1 - marco[..., None]) + marco[..., None] * H.ORO
    vid = vid * (1 - et[..., None]) + papel * et[..., None]
    rgba = np.zeros((Hh, W, 4), np.float32)
    rgba[..., :3] = np.clip(vid, 0, 1); rgba[..., 3] = m
    # tapa y collar reales
    tapa = tapa_real()
    th = int(320); tw = int(tapa.shape[1] * th / tapa.shape[0])
    tapa = H.redim(tapa, tw, th)
    H.pegar(rgba, tapa, W / 2 - tw / 2, y0 - th + 18)
    return rgba

def hacer_texturas():
    out = os.path.join(SAL, 'texturas'); os.makedirs(out, exist_ok=True)
    res = {}
    for nombre, (arch, col, grad) in FAMILIAS.items():
        tex = textura_base(arch, grad)
        Image.fromarray(a_u8(tex)).save(os.path.join(out, f'textura_{nombre}.png'), optimize=True)
        pes = H.exportar_peso(tex, os.path.join(out, f'textura_{nombre}'), max_kb=160, q_webp=84, q_avif=62)
        fr = textura_en_frasco(tex, col)
        Image.fromarray(a_u8(fr)).save(os.path.join(out, f'frasco_{nombre}.png'), optimize=True)
        b = io.BytesIO(); Image.fromarray(a_u8(fr)).save(b, 'WEBP', quality=84, method=6)
        open(os.path.join(out, f'frasco_{nombre}.webp'), 'wb').write(b.getvalue())
        res[nombre] = dict(textura=pes, frasco_webp_kb=round(len(b.getvalue()) / 1024, 1))
        print(nombre, res[nombre], flush=True)
    return res

def familias_web(foto_en_etiqueta):
    """Los frascos de "¿Que te gusta oler?" listos para public/familias/:
    recortados a la silueta y a 240 y 420 px de ancho."""
    out = os.path.join(SAL, 'familias_foto' if foto_en_etiqueta else 'familias_color'); os.makedirs(out, exist_ok=True)
    for nombre, (arch, col, grad) in FAMILIAS.items():
        fr = a_u8(textura_en_frasco(textura_base(arch, grad), col, foto_en_etiqueta))
        im = Image.fromarray(fr); im = im.crop(im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox())
        for ancho in (240, 420):
            im.resize((ancho, round(im.height * ancho / im.width)), Image.LANCZOS).save(os.path.join(out, f'{nombre}-{ancho}.webp'), quality=84, method=6)
        print(nombre, im.size, flush=True)

# ======================================================================= destacados
DESTACADOS = ['bagues-la-bomba', 'bagues-baccarat-rouge', 'bagues-angels-share',
              'bagues-sublime', 'bagues-amor-amor', 'bagues-linterdit']

def formato_destacado():
    return dict(
        ancho=300, alto=400, escala=3, fuente_pared='pared_celular_gen.webp',
        pared_src=dict(sup0=1103, sup1=1166), detalle_css_por_src=1.3,
        repisa=300, frente=328,
        halo=dict(cx=150, cy=190, r=150, fuerza=1.0),
        panel=dict(tipo='todo'), estria=26,
        caja_ventana=dict(cx=150, base=318, alto=212),
        cajas=[],
    )

def hacer_destacados():
    out = os.path.join(SAL, 'destacados'); os.makedirs(out, exist_ok=True)
    f = formato_destacado(); s = f['escala']; W, Hh = 900, 1200
    pared, halo = H.hacer_pared(f)
    res = {}
    for slug in DESTACADOS:
        caja = H.cargar_caja(slug)
        capa = H.componer_cajas(f, caja, [], W, Hh, s, f['frente'] * s)
        esc = H.sobre(pared, capa)
        yy, xx = np.mgrid[0:Hh, 0:W].astype(np.float32)
        vig = 1 - 0.16 * (((xx / W - 0.5) * 2) ** 4 + ((yy / Hh - 0.5) * 2) ** 4)
        nit = np.clip(esc * vig[..., None], 0, 1)
        vid, _ = H.aplicar_vidrio(esc, halo, f['panel'], f['estria'], s, origen_x=(W / 2) % (f['estria'] * s))
        vid = np.clip(vid * vig[..., None], 0, 1)
        nombre = slug.replace('bagues-', '')
        for tag, img in (('nitido', nit), ('vidrio', vid)):
            base = os.path.join(out, f'destacado_{nombre}_{tag}')
            Image.fromarray(a_u8(img)).save(base + '.png', optimize=True)
            res[f'{nombre}_{tag}'] = H.exportar_peso(img, base, max_kb=90, q_webp=84, q_avif=62)
        print(slug, res[f'{nombre}_nitido'], res[f'{nombre}_vidrio'], flush=True)
    return res

# ======================================================================= hero A
VINO_A = H.hex2f('#3b0d16'); ORO_A = H.hex2f('#c9a15a'); PAPEL_A = H.hex2f('#f2e3df')

def arco_sdf(W, Hh, cx, ancho, arriba, abajo):
    return H.sdf_arco(W, Hh, cx, ancho, arriba, abajo, 1)

def hornear_hero_a(nombre, caja_slug):
    if nombre == 'escritorio':
        W, Hh, s = 1440, 900, 2
        src = np.asarray(Image.open(os.path.join(H.GEN, 'bodegon_escritorio_gen.webp')).convert('RGB')).astype(np.float32) / 255
        k = W * s / src.shape[1]
        img = cv2.resize(src, (W * s, int(src.shape[0] * k)), interpolation=cv2.INTER_CUBIC)
        top = int(img.shape[0] - Hh * s) // 2 + int(10 * s)
        img = img[top:top + Hh * s]
        repisa_src = 799; y_repisa = (repisa_src * k - top) / s     # canto de la repisa en px css
        arco = dict(cx=800, ancho=330, arriba=236, abajo=y_repisa + 6)
        caja = dict(cx=800, base=y_repisa + 8, alto=250)
        zonas = [(96, 110, 620, 800)]
    else:
        W, Hh, s = 390, 844, 3
        src = np.asarray(Image.open(os.path.join(H.GEN, 'bodegon_celular_gen.webp')).convert('RGB')).astype(np.float32) / 255
        k = Hh * s / src.shape[0]
        img = cv2.resize(src, (int(src.shape[1] * k), Hh * s), interpolation=cv2.INTER_CUBIC)
        left = (img.shape[1] - W * s) // 2
        img = img[:, left:left + W * s]
        repisa_src = 836; y_repisa = repisa_src * k / s
        arco = dict(cx=195, ancho=200, arriba=266, abajo=y_repisa + 8)
        caja = dict(cx=195, base=y_repisa + 10, alto=160)
        zonas = [(16, 96, 374, 260), (16, 580, 374, 660)]
    Wp, Hp = W * s, Hh * s
    yy, xx = np.mgrid[0:Hp, 0:Wp].astype(np.float32)
    sdf = H.sdf_arco(Wp, Hp, arco['cx'], arco['ancho'], arco['arriba'], arco['abajo'], s)
    dentro = np.clip(0.5 - sdf, 0, 1)
    # adentro del arco: la luz de ventana se concentra detras de la caja
    luz = np.exp(-(((xx - arco['cx'] * s) / (arco['ancho'] * s * 0.55)) ** 2 + ((yy - (arco['arriba'] + arco['ancho'] * 0.6) * s) / (arco['ancho'] * s * 0.75)) ** 2))
    nicho = img * 0.55 + (VINO_A * 0.6 + H.hex2f('#7a1d32') * 0.4) * 0.30
    nicho = nicho + luz[..., None] * (H.hex2f('#7a1d32') * 0.55 + PAPEL_A * 0.10)
    # afuera del arco, el bodegon con un velo vino (direccion A: un color tine todo)
    velo = img * 0.80 + VINO_A * 0.12
    # el lado del titular se apaga mas
    if nombre == 'escritorio':
        kx = np.clip((xx / s - 380) / 380, 0, 1); kx = kx * kx * (3 - 2 * kx)
        velo = velo * (0.36 + 0.64 * kx)[..., None]
    else:
        ky = np.clip((yy / s - 250) / 60, 0, 1)
        velo = velo * (0.70 + 0.30 * ky)[..., None]
        # zona de precio y boton: el frente de marmol se oscurece en la franja de lectura
        kb = np.exp(-(((yy / s) - 620) / 70) ** 2)
        velo = velo * (1 - 0.40 * kb)[..., None]
    base = velo * (1 - dentro[..., None]) + nicho * dentro[..., None]
    # la caja real
    c = H.cargar_caja(caja_slug)
    c = H.tratar_caja(c, caja['alto'] * s, 1.0, -1, s, nitida=True)
    # luz de ventana desde arriba-izquierda: la cara izquierda un poco mas clara
    capa = np.zeros((Hp, Wp, 4), np.float32)
    h, w = c.shape[:2]
    x = caja['cx'] * s - w / 2; yb = caja['base'] * s
    H.sombras_y_reflejo(capa, c, x, yb, s, 1, yb + 60 * s, fuerza=1.15)
    H.pegar(capa, c, x, yb - h)
    capa[..., 3] *= np.clip(dentro + (yy > (arco['abajo'] - 2) * s), 0, 1)  # el reflejo puede salir abajo
    base = H.sobre(base, capa)
    # ornamento: doble filete dorado del arco
    for off, gros, inten in ((0, 1.1, 0.9), (9, 0.7, 0.55)):
        d = sdf + off * s
        linea = np.exp(-((d) / (gros * s)) ** 2)
        base = base * (1 - 0.6 * linea[..., None] * inten) + linea[..., None] * ORO_A * inten
    # chiaroscuro general y grano
    vig = 1 - 0.22 * (((xx / Wp - 0.5) * 2) ** 4 + ((yy / Hp - 0.5) * 2) ** 4)
    base = base * vig[..., None]
    rng = np.random.default_rng(3)
    base = base + cv2.GaussianBlur(rng.normal(0, 0.012, (Hp, Wp)).astype(np.float32), (0, 0), 0.6 * s)[..., None]
    base = np.clip(base, 0, 1)
    return base, zonas, W, Hh

def hacer_hero_a(slug='bagues-la-bomba'):
    out = os.path.join(SAL, 'hero_a'); os.makedirs(out, exist_ok=True)
    inf = {}
    for nombre in ('escritorio', 'celular'):
        img, zonas, W, Hh = hornear_hero_a(nombre, slug)
        tam = [(1440, 900, 220), (2880, 1800, 260)] if nombre == 'escritorio' else [(390, 844, None), (780, 1688, 140), (1170, 2532, None)]
        for (w, h, lim) in tam:
            im = H.redim(img, w, h) if w != img.shape[1] else img
            base = os.path.join(out, f'hero_a_{w}x{h}')
            if w <= 1440: Image.fromarray(a_u8(im)).save(base + '.png', optimize=True)
            pes = H.exportar_peso(im, base, max_kb=lim)
            dec = np.asarray(Image.open(base + '.webp').convert('RGB'))
            inf[f'{w}x{h}'] = dict(pesos_kb=pes, contraste=H.contraste(dec, zonas, w / W))
            print(w, h, inf[f'{w}x{h}'], flush=True)
    json.dump(inf, open(os.path.join(out, 'informe.json'), 'w'), indent=2)
    return inf

# ======================================================================= og
TITULO = ['El perfume que ya', 'conocés, al precio', 'que todavía no.']

def hacer_og():
    out = os.path.join(SAL, 'og'); os.makedirs(out, exist_ok=True)
    src = Image.open(os.path.join(SAL, 'hero_c', 'hero_c_1440x900.png')).convert('RGB')
    # 1200x630 sale de recortar el alto del hero 1440x900 escalado a 1200 de ancho (1200x750)
    im = src.resize((1200, 750), Image.LANCZOS).crop((0, 70, 1200, 700))
    # el lado del texto, un poco mas oscuro para que respire
    a = np.asarray(im).astype(np.float32) / 255
    xx = np.arange(1200, dtype=np.float32)
    k = np.clip((xx - 590) / 120, 0, 1); k = k * k * (3 - 2 * k)
    a = a * (0.74 + 0.26 * k)[None, :, None]
    im = Image.fromarray(a_u8(a))
    d = ImageDraw.Draw(im)
    tinta = (243, 236, 225); rosa = (224, 112, 138)
    fT = fuente('cormorant-600', 70); fI = fuente('cormorant-italic-500', 70)
    fS = fuente('figtree-500', 22); fC = fuente('figtree-600', 17)
    x, y = 72, 150
    d.text((x, 92), 'GRUPO WOLF', font=fC, fill=rosa, spacing=0)
    for i, linea in enumerate(TITULO):
        f = fI if i == 2 else fT
        d.text((x, y + i * 74), linea, font=f, fill=tinta)
    d.text((x, y + 3 * 74 + 30), 'Casa Bagués, por WhatsApp.', font=fS, fill=tinta)
    d.text((x, y + 3 * 74 + 60), 'Envío a todo el país.', font=fS, fill=tinta)
    ruta = os.path.join(out, 'og.jpg')
    im.save(ruta, quality=86, optimize=True, progressive=True)
    dec = np.asarray(Image.open(ruta).convert('RGB'))
    # contraste: peor pixel del fondo debajo del bloque de texto (se mide sobre la imagen sin texto)
    c = H.contraste(np.asarray(Image.fromarray(a_u8(a))), [(66, 86, 575, 540)])
    kb = round(os.path.getsize(ruta) / 1024, 1)
    print('og', kb, 'kB contraste', c)
    return dict(kb=kb, contraste=c)

# ======================================================================= maquetas
def maqueta_c():
    out = os.path.join(SAL, 'maquetas'); os.makedirs(out, exist_ok=True)
    tinta = (243, 236, 225); rosa = (224, 112, 138); sobre_rosa = (34, 17, 15)
    # escritorio
    im = Image.open(os.path.join(SAL, 'hero_c', 'hero_c_1440x900.png')).convert('RGB')
    d = ImageDraw.Draw(im)
    d.text((96, 30), 'Bagués  Grupo Wolf', font=fuente('cormorant-600', 26), fill=tinta)
    for i, t in enumerate(['Catálogo', 'Cómo funciona', 'Ver pedido']):
        d.text((1010 + i * 140, 36), t, font=fuente('figtree-500', 16), fill=tinta)
    d.text((96, 190), 'GRUPO WOLF', font=fuente('figtree-600', 13), fill=rosa)
    for i, t in enumerate(TITULO):
        d.text((96, 220 + i * 78), t, font=fuente('cormorant-italic-500' if i == 2 else 'cormorant-600', 74), fill=tinta)
    d.text((96, 478), 'El mismo aroma que ya te gusta, hecho por la casa Bagués.', font=fuente('figtree-400', 19), fill=tinta)
    d.text((96, 506), 'Acá en Córdoba, por WhatsApp.', font=fuente('figtree-400', 19), fill=tinta)
    d.text((96, 566), 'Desde $ 16.499', font=fuente('cormorant-600', 34), fill=tinta)
    d.rounded_rectangle((96, 622, 316, 676), 27, fill=rosa)
    d.text((126, 637), 'Ver el catálogo', font=fuente('figtree-600', 18), fill=sobre_rosa)
    d.text((344, 638), 'Cómo funciona', font=fuente('figtree-500', 18), fill=tinta)
    im.save(os.path.join(out, 'maqueta_hero_c_escritorio.jpg'), quality=88)
    # celular
    im = Image.open(os.path.join(SAL, 'hero_c', 'hero_c_780x1688.png')).convert('RGB')
    d = ImageDraw.Draw(im); S = 2
    d.text((16 * S, 22 * S), 'Bagués', font=fuente('cormorant-600', 24 * S), fill=tinta)
    d.text((300 * S, 28 * S), 'Pedido', font=fuente('figtree-500', 14 * S), fill=tinta)
    for i, t in enumerate(TITULO):
        d.text((20 * S, (104 + i * 46) * S), t, font=fuente('cormorant-italic-500' if i == 2 else 'cormorant-600', 44 * S), fill=tinta)
    d.text((20 * S, 248 * S), 'Casa Bagués, por WhatsApp.', font=fuente('figtree-400', 15 * S), fill=tinta)
    d.text((20 * S, 588 * S), 'Desde $ 16.499', font=fuente('cormorant-600', 28 * S), fill=tinta)
    d.rounded_rectangle((200 * S, 586 * S, 372 * S, 634 * S), 24 * S, fill=rosa)
    d.text((222 * S, 600 * S), 'Ver el catálogo', font=fuente('figtree-600', 16 * S), fill=sobre_rosa)
    d.line((0, 664 * S, 390 * S, 664 * S), fill=(120, 200, 255), width=2)
    d.text((8 * S, 668 * S), 'corte 390x664 (visor de Instagram)', font=fuente('figtree-400', 11 * S), fill=(120, 200, 255))
    im.save(os.path.join(out, 'maqueta_hero_c_celular.jpg'), quality=88)

if __name__ == '__main__':
    que = sys.argv[1:] or ['texturas', 'destacados', 'hero_a', 'og', 'maquetas']
    inf = {}
    if 'texturas' in que: inf['texturas'] = hacer_texturas()
    if 'familias_foto' in que: familias_web(True)
    if 'familias_color' in que: familias_web(False)
    if 'destacados' in que: inf['destacados'] = hacer_destacados()
    if 'hero_a' in que: inf['hero_a'] = hacer_hero_a()
    if 'og' in que: inf['og'] = hacer_og()
    if 'maquetas' in que: maqueta_c()
    json.dump(inf, open(os.path.join(SAL, f'informe_piezas_{"_".join(que)}.json'), 'w'), indent=2, ensure_ascii=False)
