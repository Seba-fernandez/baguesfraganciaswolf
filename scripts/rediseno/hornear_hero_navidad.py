#!/usr/bin/env python3
"""
Horneado del hero de Navidad (campana 12/2026), hermano de hornear_hero.py.

Uso:
    python3 hornear_hero_navidad.py              # hornea los cuatro tamanos
    python3 hornear_hero_navidad.py --rapido     # solo 780x1688 y 1440x900, para probar
    python3 hornear_hero_navidad.py --publicar   # ademas copia a public/hero/navidad/

Parte de la pieza del dueno (fuentes/navidad-c12.png, 1774 x 887) y la desarma
en CAPAS, para que el hero las haga entrar una por una (Hero.module.css):

    fondo     cortina + terciopelo, sin ningun objeto. Opaco. Es el LCP: casi no pesa.
    luces     ramas de pino y luces desenfocadas de las esquinas (hasta dos recortes)
    frascos   los tres frascos con los regalos, las ramas y la pina
    destello  el polvo dorado que sale de los frascos

El texto quemado de la pieza (el "BAGUES", la bajada, "La Navidad se regala
con Bagues" y la banda roja con el precio) NO pasa: se borra y se rehace como
texto real del DOM (Hero.jsx). El precio es texto, no pixeles.

Como se separa: se arma la cortina vacia (modelo por columna: los pliegues son
verticales), y cada capa sale de la DIFERENCIA entre la pieza y esa cortina
(alfa y color tales que, puesta encima de la cortina, devuelve la pieza). Asi el
vidrio de los frascos queda transparente de verdad. Las capas se recomponen a
cada tamano sin estirar nada: los frascos solo cambian de escala, uniforme.

Color: la pieza trae una cortina verde. Aca la cortina se lleva a vino hondo
(la marca manda) y el verde queda en el brillo de los pliegues y en el pino.
Ver graduar().

Requiere: numpy, opencv-python, Pillow (con AVIF).
"""
import io, json, os, shutil, sys
import numpy as np
import cv2
from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(AQUI, '..', '..'))
FUENTE = os.path.join(AQUI, 'fuentes', 'navidad-c12.png')
SALIDA = os.path.join(AQUI, 'salida', 'hero_navidad')
PUBLICO = os.path.join(REPO, 'public', 'hero', 'navidad')

VINO_HONDO = np.array([0x24, 0x06, 0x04], np.float32) / 255   # #240604
TERCIOPELO = np.array([0.33, 0.03, 0.05], np.float32)        # rubi apagado de la mesa
Y_MESA = 655          # donde la cortina se encuentra con el terciopelo (px de la pieza)
Y_BASE = 698          # base de los frascos
Y_CORTE = 713         # desde aca la pieza trae la banda roja: no se usa

# ---------------------------------------------------------------- utilidades
def lum(a):
    return a[..., 0] * 0.2126 + a[..., 1] * 0.7152 + a[..., 2] * 0.0722

def suave(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)

def rect_suave(H, W, x0, y0, x1, y1, f=10):
    """Mascara 1 adentro del rectangulo, con borde de f px."""
    m = np.zeros((H, W), np.float32)
    m[max(y0, 0):y1, max(x0, 0):x1] = 1
    return cv2.GaussianBlur(m, (0, 0), f / 2) if f else m

# ---------------------------------------------------------------- 1. color
def graduar(im):
    """Cortina verde -> vino hondo. Solo los pixeles oscuros y verdosos: el pino
    iluminado, el oro, el rojo y el vidrio no se tocan. El verde queda en el brillo
    de los pliegues (esos pixeles son mas claros que el umbral)."""
    L = lum(im)
    w = np.clip((im[..., 1] - im[..., 0]) / 0.035, 0, 1) * (1 - suave(0.07, 0.15, L))
    tinte = np.array([38, 10, 12], np.float32) / 255 / 0.063
    nuevo = L[..., None] * tinte
    k = (w * 0.9)[..., None]
    return im * (1 - k) + nuevo * k

# ---------------------------------------------------------------- 2. cortina vacia
def modelo_cortina(G):
    """P(x): color de cada columna de cortina; gy(y): la ganancia vertical.
    Sale de los pixeles de cortina limpia (sin texto ni objetos)."""
    H, W, _ = G.shape
    inv = np.zeros((H, W), bool)
    for (x0, y0, x1, y1) in [(540, 0, 1240, 232), (1355, 222, 1725, 485), (560, 225, 1215, 720),
                             (235, 330, 590, 720), (1190, 440, 1774, 720), (0, 0, 425, 240),
                             (0, 235, 70, 720), (1480, 0, 1600, 150), (1650, 0, 1774, 140),
                             (330, 225, 620, 520), (1180, 230, 1360, 530), (0, 640, 1774, 887)]:
        inv[y0:y1, x0:x1] = True
    valido = (~inv) & (lum(G) < 0.22)
    valido = cv2.erode(valido.astype(np.uint8), np.ones((5, 5))) > 0
    P = np.full((W, 3), np.nan, np.float32)
    cuenta = valido[:Y_MESA].sum(0)
    for x in range(W):
        if cuenta[x] >= 12:
            P[x] = np.median(G[:Y_MESA][valido[:Y_MESA, x], x], axis=0)
    xs = np.arange(W); ok = ~np.isnan(P[:, 0])
    for c in range(3):
        P[:, c] = np.interp(xs, xs[ok], P[ok, c])
    for x in range(0, 70):          # el borde izquierdo tiene luces: se espeja lo de al lado
        P[x] = P[140 - x]
    # El tramo del medio (detras de titulo y frascos) casi no tiene cortina a la
    # vista: se rellena espejando los pliegues de los costados.
    g0, g1 = 540, 1262
    P2 = P.copy()
    for x in range(g0, g1):
        t = (x - g0) / (g1 - g0)
        P2[x] = P[max(2 * g0 - x, 0)] * (1 - t) + P[min(2 * g1 - x, W - 1)] * t
    Lp = lum(P2[None])[0]
    gy = np.zeros(Y_MESA, np.float32)
    for y in range(Y_MESA):
        m = valido[y]
        gy[y] = np.median(lum(G[y, m]) / (Lp[m] + 1e-4)) if m.sum() > 20 else np.nan
    oky = ~np.isnan(gy)
    gy = np.interp(np.arange(Y_MESA), np.arange(Y_MESA)[oky], gy[oky]).astype(np.float32)
    gy = cv2.GaussianBlur(gy[:, None], (0, 0), 12)[:, 0]
    gy = np.clip(gy, 0.7, 1.05)
    gy[400:] = 1.0
    return P2, gy

def espejar(x, W):
    """Indice de columna con reflejo (la cortina sigue fuera de la pieza)."""
    x = np.abs(x)
    x = np.mod(x, 2 * (W - 1))
    return np.where(x > W - 1, 2 * (W - 1) - x, x)

def fondo_en(P, gy, W_src, ox, oy, k, Wo, Ho, y_fin, rng_seed=3):
    """El fondo (cortina vacia + terciopelo) a la geometria de salida.
    pieza -> salida: x_sal = x_src * k + ox ; y_sal = y_src * k + oy (px de salida).
    y_fin: fila de salida desde la que el terciopelo se funde con el vino hondo
    de la cinta de nombres (que empieza abajo del hero)."""
    u = np.arange(Wo, dtype=np.float32); v = np.arange(Ho, dtype=np.float32)
    xs = (u - ox) / k; ys = (v - oy) / k
    xi = espejar(xs, W_src)
    f0 = np.floor(xi).astype(int); fr = (xi - f0)[:, None]
    f1 = np.minimum(f0 + 1, W_src - 1)
    Px = P[f0] * (1 - fr) + P[f1] * fr                                   # (Wo, 3)
    g = np.interp(ys, np.arange(Y_MESA), gy).astype(np.float32)          # (Ho,)
    cort = Px[None] * g[:, None, None]
    # terciopelo: color parejo con un brillo suave detras de los frascos y caida
    # hacia el vino hondo de la cinta
    x_c = (888 - 0) * k + ox
    brillo = 0.82 + 0.28 * np.exp(-(((u - x_c) / (520 * k)) ** 2))
    vel = TERCIOPELO[None, None, :] * brillo[None, :, None] * np.ones((Ho, 1, 1), np.float32)
    caida = np.clip((ys - Y_CORTE) / 700.0, 0, 1)[:, None, None]
    vel = vel * (1 - 0.35 * caida)
    # el terciopelo no es plano: manchas anchas de pelo cepillado (baja frecuencia)
    rng2 = np.random.default_rng(11)
    mot = cv2.GaussianBlur(rng2.normal(0, 1, (Ho, Wo)).astype(np.float32), (0, 0), 38 * k * (Wo / (Wo if Wo else 1)))
    mot = mot / (mot.std() + 1e-6)
    vel = vel * (1 + 0.09 * mot[..., None])
    mesa = suave(Y_MESA - 7, Y_MESA + 12, ys)[:, None, None]
    out = cort * (1 - mesa) + vel * mesa
    # grano: sin el, el degradado hace escalones y comprime a nada
    rng = np.random.default_rng(rng_seed)
    gr = cv2.GaussianBlur(rng.normal(0, 1, (Ho, Wo)).astype(np.float32), (0, 0), 0.7)
    out = out * (1 + 0.05 * gr[..., None])
    # el pie del hero se funde con la cinta de nombres (vino hondo solido)
    t = suave(y_fin - 140 * (Ho / 844 if Ho > Wo else Ho / 900), y_fin, v)[:, None, None]
    out = out * (1 - t) + VINO_HONDO[None, None, :] * t
    return np.clip(out, 0, 1).astype(np.float32)

# ---------------------------------------------------------------- 3. capas
def matte(B, T):
    """Dado el fondo B y el objetivo T (RGB 0..1) devuelve (alfa, color) tales que
    color*alfa + B*(1-alfa) = T. Las diferencias minimas (ruido de la cortina) se
    descartan: asi las capas no arrastran manchas."""
    d = T - B
    pos = np.clip(d, 0, None) / np.maximum(1 - B, 1e-3)
    neg = np.clip(-d, 0, None) / np.maximum(B, 0.08)
    # Lo que es solo "mas oscuro" y de color cortina no es un objeto: se descarta
    # (si no, la cortina de atras dejaba manchas rectangulares en la capa).
    cortina = (lum(T) < 0.12) & ((T[..., 2] - np.maximum(T[..., 0], T[..., 1])) < 0.05)
    neg = np.where(cortina[..., None], 0, neg)
    a = np.maximum(pos, neg).max(-1)
    absd = np.abs(d).max(-1)
    a = a * suave(0.05, 0.12, absd)
    a = np.clip(a, 0, 1)
    c = (T - B * (1 - a[..., None])) / np.maximum(a[..., None], 1e-3)
    c = np.clip(c, 0, 1)
    c[a < 1e-3] = 0
    return a.astype(np.float32), c.astype(np.float32)

def desarmar(G, P, gy):
    """Parte la pieza en capas sobre la cortina vacia. Devuelve dict nombre ->
    RGBA premultiplicado en las coordenadas de la pieza."""
    H, W, _ = G.shape
    B = fondo_en(P, gy, W, 0, 0, 1.0, W, H, 10 ** 6)
    B = np.clip(B, 0, 1)
    # lo que NO pasa: titulo y bajada (con el mono de abajo del moño), la frase de la
    # derecha, los trazos dorados, la banda roja y el acebo que cae sobre ella.
    borrar = np.zeros((H, W), np.float32)
    for (x0, y0, x1, y1) in [(545, 0, 1235, 226), (1352, 220, 1728, 486),
                             (425, 188, 524, 208), (1250, 188, 1345, 208),
                             (1492, 650, 1712, 715)]:
        borrar = np.maximum(borrar, rect_suave(H, W, x0, y0, x1, y1, 8))
    borrar = np.maximum(borrar, suave(Y_CORTE - 24, Y_CORTE, np.arange(H, dtype=np.float32))[:, None] * np.ones((1, W), np.float32))
    Gm = G * (1 - borrar[..., None]) + B * borrar[..., None]
    D = Gm - B
    # reparto del contenido (suma 1 en todos lados)
    m_pino = rect_suave(H, W, 0, 0, 432, 238, 14)
    m_izq = np.minimum(rect_suave(H, W, 0, 238, 242, 640, 14), 1 - m_pino)
    m_der = rect_suave(H, W, 1470, 0, 1774, 240, 14)
    m_dest = np.maximum(rect_suave(H, W, 340, 226, 596, 420, 40), rect_suave(H, W, 1196, 232, 1366, 478, 40))
    m_dest = np.clip(m_dest * (1 - np.maximum(np.maximum(m_pino, m_izq), m_der)), 0, 1)
    m_band = np.clip(1 - m_pino - m_izq - m_der - m_dest, 0, 1)
    # el borde izquierdo de la banda se funde (sin esto, el terciopelo claro bajo los
    # regalos terminaba en una arista recta al recortar la capa)
    m_band = m_band * suave(130, 236, np.arange(W, dtype=np.float32))[None, :]
    capas = {}
    for nombre, m in (('pino', m_pino), ('izq', m_izq), ('der', m_der), ('destello', m_dest), ('frascos', m_band)):
        a, c = matte(B, B + D * m[..., None])
        capas[nombre] = np.concatenate([c * a[..., None], a[..., None]], -1)   # premultiplicado
    return B, capas

# ---------------------------------------------------------------- 4. composicion por tamano
# Todas las medidas en px CSS del diseno; "esc" es la densidad a la que se hornea.
# k: escala de la pieza; "ancla": donde cae el centro de los frascos (x=888 de la pieza)
# y su base (y=698). Los frascos se escalan parejo: no se estiran ni cambian de proporcion.
FORMATOS = {
    'celular': dict(
        ancho=390, alto=844, caja_alto=718, escalas=(2, 3),
        k=0.44, ancla=(195, 492),
        # (capa, fuente, k, x_css, y_css) con x,y = esquina sup izq del recorte de la pieza
        decoracion=dict(
            luces=[('pino', 0.50, 'izq', 0), ('der', 0.46, 'der', 0)],
            lucesb=[],
        ),
        lleva=dict(frascos=['frascos'], destello=['destello']),
        recorte=dict(frascos=(425, 226, 1380, Y_CORTE), destello=(425, 226, 1380, 470)),
    ),
    'escritorio': dict(
        ancho=1440, alto=900, caja_alto=900, escalas=(1, 2),
        k=0.82, ancla=(1110, 700),
        decoracion=dict(
            # Sin la columna de luces de la izquierda ('izq'): cae justo atras de la bajada y
            # una luz desenfocada de 0,88:1 contra el texto no se lee. El pino de arriba queda.
            luces=[('pino', 0.90, 'izq', 0)],
            lucesb=[('der', 0.90, 'der', 0)],
        ),
        lleva=dict(frascos=['frascos'], destello=['destello']),
        recorte=dict(frascos=(120, 226, 1774, Y_CORTE), destello=(300, 226, 1420, 500)),
    ),
}

# Donde vive cada fuente de decoracion en la pieza (x0, y0, x1, y1)
RECORTES_DECO = dict(pino=(0, 0, 456, 262), izq=(0, 238, 266, 664), der=(1446, 0, 1774, 264))

def afin(premult, k_px, x_px, y_px, Wo, Ho, afilar=True):
    """Pone un RGBA premultiplicado (recorte de la pieza) en un lienzo (Ho, Wo, 4):
    escala k_px, esquina sup izq en (x_px, y_px) en px de salida."""
    h, w = premult.shape[:2]
    nw, nh = max(2, int(round(w * k_px))), max(2, int(round(h * k_px)))
    interp = cv2.INTER_AREA if k_px < 1 else cv2.INTER_LANCZOS4
    r = cv2.resize(premult, (nw, nh), interpolation=interp)
    if k_px > 1 and afilar:
        borr = cv2.GaussianBlur(r, (0, 0), 1.1)
        r[..., :3] = np.clip(r[..., :3] + 0.45 * (r[..., :3] - borr[..., :3]), 0, None)
    r = np.clip(r, 0, 1)
    r[..., :3] = np.minimum(r[..., :3], r[..., 3:4])
    lienzo = np.zeros((Ho, Wo, 4), np.float32)
    x0, y0 = int(round(x_px)), int(round(y_px))
    ax0, ay0, ax1, ay1 = max(0, x0), max(0, y0), min(Wo, x0 + nw), min(Ho, y0 + nh)
    if ax1 > ax0 and ay1 > ay0:
        lienzo[ay0:ay1, ax0:ax1] = r[ay0 - y0:ay1 - y0, ax0 - x0:ax1 - x0]
    return lienzo

def sobre_premult(dst, src):
    return src + dst * (1 - src[..., 3:4])

def armar_formato(nombre, f, G, P, gy, capas, esc):
    """Hornea un formato a la densidad `esc`. Devuelve (fondo_rgb, {capa: lienzo premult})."""
    Wo, Ho = f['ancho'] * esc, f['alto'] * esc
    k = f['k']; ax, ay = f['ancla']
    ox, oy = ax - 888 * k, ay - Y_BASE * k
    fondo = fondo_en(P, gy, G.shape[1], ox * esc, oy * esc, k * esc, Wo, Ho, f['caja_alto'] * esc)
    salida = {}
    # frascos y destello: recortes de la pieza a la escala del conjunto
    for capa in ('frascos', 'destello'):
        x0, y0, x1, y1 = f['recorte'][capa]
        src = sum_capas(capas, f['lleva'][capa])[y0:y1, x0:x1]
        salida[capa] = afin(src, k * esc, (x0 * k + ox) * esc, (y0 * k + oy) * esc, Wo, Ho)
    # luces: recortes a su propia escala, pegados a las esquinas
    for grupo in ('luces', 'lucesb'):
        lienzo = np.zeros((Ho, Wo, 4), np.float32)
        for (fuente, kd, lado, y_css) in f['decoracion'][grupo]:
            x0, y0, x1, y1 = RECORTES_DECO[fuente]
            rec = capas[fuente][y0:y1, x0:x1]
            w_css, h_css = (x1 - x0) * kd, (y1 - y0) * kd
            x_css = 0 if lado == 'izq' else f['ancho'] - w_css
            if y_css == 'bajo_pino':      # la columna de luces cuelga del pino
                y_css = RECORTES_DECO['izq'][1] * kd
            lienzo = sobre_premult(lienzo, afin(rec, kd * esc, x_css * esc, y_css * esc, Wo, Ho))
        salida[grupo] = lienzo
    return fondo, salida

def sum_capas(capas, nombres):
    base = capas[nombres[0]].copy()
    for n in nombres[1:]:
        base = sobre_premult(base, capas[n])
    return base

# ---------------------------------------------------------------- 5. recorte y exportacion
def bbox(lienzo, umbral=0.004):
    ys, xs = np.where(lienzo[..., 3] > umbral)
    if len(xs) == 0: return None
    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1

def a_straight(premult):
    a = premult[..., 3:4]
    rgb = np.where(a > 1e-4, premult[..., :3] / np.maximum(a, 1e-4), 0)
    return np.clip(np.concatenate([rgb, a], -1), 0, 1)

# Presupuesto de peso: bits por pixel de cada capa en AVIF (el WebP, de respaldo,
# tiene el doble). El hero de siempre pesa 0,33 bpp en AVIF; estas capas son mas
# densas (pliegues de papel, vidrio, agujas de pino) pero se bajan hasta entrar.
BPP_AVIF = dict(fondo=None, frascos=1.15, destello=1.5, luces=0.95, lucesb=0.95)

def codificar(arr, ruta_base, rgba, q_webp=86, q_avif=62, bpp=None):
    modo = 'RGBA' if rgba else 'RGB'
    img = Image.fromarray(np.clip(arr * 255 + 0.5, 0, 255).astype(np.uint8), modo)
    px = img.size[0] * img.size[1]
    res = {}
    for ext, q0, kw, mult in (('webp', q_webp, dict(method=4), 2.0), ('avif', q_avif, dict(speed=6), 1.0)):
        q = q0
        max_kb = None if not bpp else bpp * mult * px / 8 / 1024
        while True:
            b = io.BytesIO(); img.save(b, ext.upper(), quality=q, **kw)
            kb = len(b.getvalue()) / 1024
            if max_kb is None or kb <= max_kb or q <= 28: break
            q -= 8
        open(f'{ruta_base}.{ext}', 'wb').write(b.getvalue())
        res[ext] = round(kb, 1)
    return res

def hornear(rapido=False):
    os.makedirs(SALIDA, exist_ok=True)
    im = np.asarray(Image.open(FUENTE).convert('RGB')).astype(np.float32) / 255
    G = graduar(im)
    P, gy = modelo_cortina(G)
    B, capas = desarmar(G, P, gy)
    # comprobacion: las capas, apiladas sobre la cortina vacia, devuelven la pieza
    rec = B.copy()
    for n in ('pino', 'izq', 'der', 'frascos', 'destello'):
        rec = sobre_premult(np.concatenate([rec, np.ones_like(rec[..., :1])], -1), capas[n])[..., :3]
    zona = np.s_[0:Y_CORTE - 30]
    # (las zonas borradas difieren a proposito: se compara solo donde la pieza se conserva)
    err = np.abs(rec[zona] - G[zona]).max(-1)
    informe = {'reconstruccion_error_mediano': float(np.median(err)), 'reconstruccion_p99': float(np.percentile(err, 99))}
    for nombre, f in FORMATOS.items():
        if rapido and nombre == 'celular': escalas = (2,)
        elif rapido: escalas = (1,)
        else: escalas = f['escalas']
        for esc in escalas:
            Wo, Ho = f['ancho'] * esc, f['alto'] * esc
            fondo, salida = armar_formato(nombre, f, G, P, gy, capas, esc)
            tag = f'{Wo}x{Ho}'
            info = {}
            info['fondo'] = codificar(fondo, os.path.join(SALIDA, f'fondo_{tag}'), False, q_avif=60)
            for capa, lienzo in salida.items():
                bb = bbox(lienzo)
                if bb is None: continue
                x0, y0, x1, y1 = bb
                # el recorte se alinea a 2 px para que la posicion en % sea exacta
                rec_ = a_straight(lienzo[y0:y1, x0:x1])
                info[capa] = dict(
                    pesos_kb=codificar(rec_, os.path.join(SALIDA, f'{capa}_{tag}'), True, bpp=BPP_AVIF[capa]),
                    caja_css=[round(x0 / esc, 2), round(y0 / esc, 2), round((x1 - x0) / esc, 2), round((y1 - y0) / esc, 2)],
                    px=[x1 - x0, y1 - y0])
            # la escena completa (para mirar y para medir contraste), no se publica
            esc_img = np.concatenate([fondo, np.ones_like(fondo[..., :1])], -1)
            for capa in ('luces', 'lucesb', 'frascos', 'destello'):
                if capa in salida: esc_img = sobre_premult(esc_img, salida[capa])
            Image.fromarray((np.clip(esc_img[..., :3], 0, 1) * 255 + 0.5).astype(np.uint8)).save(os.path.join(SALIDA, f'escena_{tag}.png'))
            informe[tag] = info
    # previa del celular: el fondo solo, desenfocado por el escalado (va embebida en el CSS)
    f = FORMATOS['celular']
    previa = fondo_en(P, gy, G.shape[1], (195 - 888 * f['k']) * 0.5, (492 - Y_BASE * f['k']) * 0.5, f['k'] * 0.5, 195, 422, 359)
    informe['previa_195x422'] = codificar(previa, os.path.join(SALIDA, 'fondo_previa_195x422'), False, q_webp=78)
    json.dump(informe, open(os.path.join(SALIDA, 'informe.json'), 'w'), indent=2, ensure_ascii=False)
    if not rapido:
        open(os.path.join(SALIDA, 'capas.css'), 'w').write(css_capas(informe))
    return informe

# Las medias queries son las mismas que usa el hero de siempre (Hero.module.css) y
# que precarga index.html: un tamano por pantalla.
PANTALLAS = [
    ('celular', 780, 1688, '(max-width: 599px)'),
    ('celular', 1170, 2532, '(max-width: 599px) and (min-resolution: 2.5dppx)'),
    ('escritorio', 1440, 900, '(min-width: 600px)'),
    ('escritorio', 2880, 1800, '(min-width: 600px) and (min-resolution: 1.5dppx)'),
    ('escritorio', 2880, 1800, '(min-width: 1601px)'),
]

def css_capas(informe):
    """Las reglas de posicion y de imagen de cada capa, en % del lienzo. Se pegan
    en HeroNavidad.module.css, entre las marcas CAPAS. Si cambia la composicion,
    cambian estos numeros: se vuelve a generar, no se toca a mano."""
    import base64
    previa = base64.b64encode(open(os.path.join(SALIDA, 'fondo_previa_195x422.webp'), 'rb').read()).decode()
    out = ['/* CAPAS (generado por hornear_hero_navidad.py: no se edita a mano) */',
           "/* La previa del fondo (195 x 422) va embebida: se pinta al instante y la nitida la tapa. */",
           f".fondo {{ --previa: url('data:image/webp;base64,{previa}'); }}"]
    por_formato = {}
    for nombre, f in FORMATOS.items():
        ref = next(k for k in informe if k.startswith(str(f['ancho'] * f['escalas'][0]) + 'x'))
        por_formato[nombre] = (f, informe[ref])
    # posicion (igual en todas las densidades de un formato)
    for nombre, media in (('celular', '(max-width: 599px)'), ('escritorio', '(min-width: 600px)')):
        f, inf = por_formato[nombre]
        out.append(f'@media {media} {{')
        for capa in ('luces', 'lucesB', 'frascos', 'destello'):
            clave = capa.lower() if capa != 'lucesB' else 'lucesb'
            if clave not in inf:
                out.append(f'  .{capa} {{ display: none; }}'); continue
            x, y, w, h = inf[clave]['caja_css']
            pc = lambda v, t: f'{v / t * 100:.3f}%'.rstrip('0').rstrip('.') if False else f'{round(v / t * 100, 3)}%'
            out.append(f'  .{capa} {{ left: {pc(x, f["ancho"])}; top: {pc(y, f["alto"])}; width: {pc(w, f["ancho"])}; height: {pc(h, f["alto"])}; }}')
        out.append('}')
    # imagen (avif con respaldo webp) segun pantalla
    for (nombre, w, h, media) in PANTALLAS:
        f, inf = por_formato[nombre]
        tag = f'{w}x{h}'
        out.append(f'@media {media} {{')
        for capa in ('fondo', 'luces', 'lucesB', 'frascos', 'destello'):
            clave = capa.lower()
            if clave != 'fondo' and clave not in informe.get(tag, {}): continue
            base = f'/hero/navidad/{clave}_{tag}'
            extra = ', var(--previa)' if (capa == 'fondo' and nombre == 'celular') else ''
            out.append(f"  .{capa} {{ background-image: url('{base}.webp'){extra}; background-image: image-set(url('{base}.avif') type('image/avif'), url('{base}.webp') type('image/webp')){extra}; }}")
        out.append('}')
    return '\n'.join(out) + '\n'

if __name__ == '__main__':
    inf = hornear(rapido='--rapido' in sys.argv)
    if '--publicar' in sys.argv:
        os.makedirs(PUBLICO, exist_ok=True)
        for n in os.listdir(SALIDA):
            if n.endswith(('.avif', '.webp')) and 'previa' not in n:
                shutil.copy(os.path.join(SALIDA, n), os.path.join(PUBLICO, n))
        # las posiciones y las imagenes de las capas, dentro del modulo CSS del hero
        modulo = os.path.join(REPO, 'src', 'components', 'tienda', 'HeroNavidad.module.css')
        css = open(modulo).read()
        a, b = css.index('/* >>> CAPAS */'), css.index('/* <<< CAPAS */')
        css = css[:a] + '/* >>> CAPAS */\n' + css_capas(inf) + css[b:]
        open(modulo, 'w').write(css)
    print(json.dumps(inf, indent=2, ensure_ascii=False))
