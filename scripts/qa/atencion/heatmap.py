#!/usr/bin/env python3
"""
Mapa de calor de atencion predicha para la tienda (o para una captura de Figma).

Entrada, una de dos:
  --url https://...  --ancho 390      captura la pagina entera con Playwright,
                                      saca las cajas de cada seccion del DOM y
                                      la puntua.
  --imagen captura.png [--dpr 2]      una imagen ya hecha (Figma, otra captura).
                                      Las secciones salen de --secciones (JSON)
                                      o, si no se pasa, de bandas de una pantalla.

Salida (en --salida, por defecto ./salida):
  calor_<nombre>.jpg          la pagina con el calor encima y el puntaje de cada seccion
  calor_<nombre>_scroll.jpg   lo mismo con la caida de atencion por scroll (NN/g)
  secciones/<nombre>_NN_<seccion>.jpg   un recorte por seccion
  calor_<nombre>.json         numeros por seccion y la rubrica aplicada
  captura_<nombre>.png        la captura limpia (solo en modo --url)

Modelo: DeepGaze IIE (Linardos, Kummerer, Press y Bethge, 2021) con los pesos
oficiales. Si no se puede cargar (falta torch o no bajan los pesos), cae a
OpenCV: spectral residual + fine grained, con sesgo centro-arriba y peso de texto.
El JSON y la consola dicen siempre cual se uso. --modelo cv2 lo fuerza.

Ver README.md para la rubrica y como usarlo con Figma.
"""

import argparse
import json
import math
import os
import re
import sys
import time

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

Image.MAX_IMAGE_PIXELS = None
AQUI = os.path.dirname(os.path.abspath(__file__))
FUENTE = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

# ---------------------------------------------------------------------------
# Modelo de saliencia
# ---------------------------------------------------------------------------

_MODELO = {"nombre": None, "red": None}


def cargar_deepgaze():
    import torch
    import torchvision

    # deepgaze_pytorch pide densenet201 y resnext50 por torch.hub a
    # github.com/pytorch/vision (bloqueado en esta red). Son los mismos pesos
    # de ImageNet que trae torchvision desde download.pytorch.org.
    tabla = {"densenet201": ("densenet201", "DenseNet201_Weights"),
             "resnext50_32x4d": ("resnext50_32x4d", "ResNeXt50_32X4D_Weights")}
    original = torch.hub.load

    def hub(repo, nombre, *a, **k):
        if nombre in tabla:
            fn, w = tabla[nombre]
            return getattr(torchvision.models, fn)(weights=getattr(torchvision.models, w).IMAGENET1K_V1)
        return original(repo, nombre, *a, **k)
    torch.hub.load = hub
    import warnings
    warnings.filterwarnings("ignore")
    import deepgaze_pytorch
    torch.set_num_threads(max(1, os.cpu_count() or 1))
    red = deepgaze_pytorch.DeepGazeIIE(pretrained=True).eval()
    return red


def preparar_modelo(pedido):
    if pedido in ("auto", "deepgaze"):
        try:
            t = time.time()
            _MODELO["red"] = cargar_deepgaze()
            _MODELO["nombre"] = "DeepGaze IIE (pesos oficiales v1.0.0, CPU)"
            print(f"modelo: DeepGaze IIE cargado en {time.time() - t:.0f} s", flush=True)
            return
        except Exception as e:  # noqa: BLE001
            if pedido == "deepgaze":
                raise
            print(f"modelo: DeepGaze IIE no cargo ({type(e).__name__}: {e}); uso OpenCV", flush=True)
    _MODELO["nombre"] = "OpenCV spectral residual + fine grained, sesgo centro-arriba y peso de texto"
    print("modelo: " + _MODELO["nombre"], flush=True)


def sesgo_centro(h, w, escritorio):
    """Log densidad del sesgo de centro. Reemplaza al centerbias_mit1003.npy de
    DeepGaze (no se pudo bajar: GitHub raw bloqueado). Gaussiana centrada un poco
    arriba del medio (la gente mira primero arriba, NN/g) y, en escritorio, un
    poco a la izquierda (patron en F)."""
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float32)
    cx = w * (0.46 if escritorio else 0.5)
    cy = h * 0.42
    sx, sy = w * 0.32, h * 0.38
    g = -(((xs - cx) / sx) ** 2 + ((ys - cy) / sy) ** 2) / 2
    g -= np.log(np.exp(g).sum())
    return g


def saliencia_pantalla(rgb, escritorio, texto_mask=None):
    """Densidad de fijaciones para UNA pantalla (suma 1)."""
    h, w = rgb.shape[:2]
    if _MODELO["red"] is not None:
        import torch
        cb = sesgo_centro(h, w, escritorio)
        x = torch.tensor(rgb.transpose(2, 0, 1)[None].astype(np.float32))
        c = torch.tensor(cb[None])
        with torch.no_grad():
            log = _MODELO["red"](x, c)[0, 0].numpy()
        d = np.exp(log - log.max())
        return d / d.sum()
    # OpenCV
    sr = cv2.saliency.StaticSaliencySpectralResidual_create()
    fg = cv2.saliency.StaticSaliencyFineGrained_create()
    _, a = sr.computeSaliency(rgb)
    _, b = fg.computeSaliency(rgb)
    a = cv2.GaussianBlur(a.astype(np.float32), (0, 0), max(2, w / 80))
    b = cv2.GaussianBlur(b.astype(np.float32), (0, 0), max(2, w / 80))
    a /= a.max() + 1e-9
    b /= b.max() + 1e-9
    s = 0.5 * a + 0.5 * b
    # Peso de texto: el texto atrae fijaciones (Cerf y otros 2009, Judd y otros
    # 2009) aunque el espectral lo subestima. +35 % donde hay texto detectado.
    if texto_mask is not None:
        s = s * (1 + 0.35 * cv2.GaussianBlur(texto_mask.astype(np.float32), (0, 0), max(2, w / 60)))
    s = s * np.exp(sesgo_centro(h, w, escritorio) - sesgo_centro(h, w, escritorio).max())
    s = cv2.GaussianBlur(s, (0, 0), max(3, w / 40))
    return s / s.sum()


# ---------------------------------------------------------------------------
# Captura con Playwright
# ---------------------------------------------------------------------------

JS_PREPARAR = r"""
async () => {
  const s = document.createElement('style');
  s.id = '__qa_cv';
  s.textContent = `*{content-visibility:visible!important}
    .treveal{opacity:1!important;transform:none!important}`;
  document.head.appendChild(s);
  document.querySelectorAll('img[loading=lazy]').forEach(i => { i.loading = 'eager'; });
  document.querySelectorAll('.treveal').forEach(e => e.classList.add('trevealed'));
  const paso = innerHeight * 0.6;
  for (let y = 0; y < document.documentElement.scrollHeight; y += paso) {
    scrollTo(0, y); await new Promise(r => setTimeout(r, 120));
  }
  scrollTo(0, 0);
  await document.fonts.ready;
  const t0 = Date.now();
  while (Date.now() - t0 < 15000) {
    const imgs = [...document.images].filter(i => i.getBoundingClientRect().width > 0);
    if (imgs.every(i => i.complete && i.naturalWidth > 0)) break;
    await new Promise(r => setTimeout(r, 250));
  }
  const imgs = [...document.images].filter(i => i.getBoundingClientRect().width > 0);
  return { imagenes: imgs.length, rotas: imgs.filter(i => !(i.complete && i.naturalWidth > 0)).map(i => i.currentSrc || i.src).slice(0, 10),
           fuentes: [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family + ' ' + f.weight) };
}
"""

JS_CAJAS = r"""
(vh) => {
  const Y = (r) => ({ x: Math.round(r.left + scrollX), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height) });
  const vis = (e) => { const st = getComputedStyle(e); const r = e.getBoundingClientRect();
    return r.width > 2 && r.height > 2 && st.visibility !== 'hidden' && parseFloat(st.opacity) > 0.05; };
  const nombre = (e) => {
    const h = e.querySelector('h1,h2,h3');
    if (h && h.innerText.trim()) return h.innerText.trim().replace(/\s+/g, ' ').slice(0, 40);
    if (e.id) return e.id;
    return (e.getAttribute('aria-label') || e.tagName.toLowerCase());
  };
  // Secciones: hijos de <main> (o section de primer nivel) + footer. Las que
  // pasan de 1,6 pantallas se parten por sus hijos y, si un hijo sigue largo,
  // en tramos de una pantalla.
  const main = document.querySelector('main') || document.body;
  let tops = [...main.children].filter(vis);
  if (tops.length === 1 && tops[0].tagName === 'SECTION' && tops[0].getBoundingClientRect().height > 1.6 * vh) tops = [tops[0]];
  const secs = [];
  const head = document.querySelector('body > header, #root header, header');
  const add = (e, n, r) => secs.push({ nombre: n, ...r });
  for (const e of tops) {
    const r = Y(e.getBoundingClientRect());
    if (r.h <= 1.6 * vh) { add(e, nombre(e), r); continue; }
    const hijos = [...e.children].filter(vis);
    let tit = nombre(e);
    for (const c of hijos) {
      const rc = Y(c.getBoundingClientRect());
      let n = nombre(c);
      if (/^(div|ul|ol)$/.test(n)) {
        if (c.querySelector('article')) n = 'Grilla de tarjetas';
        else if (c.querySelector('input')) n = 'Buscador y filtros';
        else if (c.querySelector('button')) n = (c.innerText || '').trim().slice(0, 30) || n;
      }
      if (n === 'header') n = tit;
      if (rc.h > 1.6 * vh) {
        const k = Math.ceil(rc.h / vh);
        for (let i = 0; i < k; i++) add(c, `${n} (tramo ${i + 1}/${k})`, { x: rc.x, y: rc.y + Math.round(i * rc.h / k), w: rc.w, h: Math.round(rc.h / k) });
      } else add(c, n, rc);
    }
  }
  const pie = document.querySelector('footer');
  if (pie && vis(pie)) add(pie, 'Pie', Y(pie.getBoundingClientRect()));
  // Huecos entre secciones (padding) se los queda la seccion de arriba.
  secs.sort((a, b) => a.y - b.y);
  if (secs.length && secs[0].y > 0) { secs[0].h += secs[0].y; secs[0].y = 0; }
  for (let i = 0; i < secs.length - 1; i++) secs[i].h = Math.max(secs[i].h, secs[i + 1].y - secs[i].y);

  // Renglones de texto visibles (rects de cada nodo de texto).
  const texto = [];
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = tw.nextNode())) {
    if (!n.textContent.trim()) continue;
    const p = n.parentElement;
    if (!p || !vis(p) || p.closest('[aria-hidden=true] svg, script, style, noscript')) continue;
    if (p.closest('[role=dialog]')) continue;
    const rg = document.createRange(); rg.selectNodeContents(n);
    for (const r of rg.getClientRects()) if (r.width > 3 && r.height > 5) texto.push({ ...Y(r), t: n.textContent.trim().slice(0, 40), fs: parseFloat(getComputedStyle(p).fontSize) });
  }
  // Lo que vende: foto de producto, precio, boton de compra / WhatsApp.
  const venta = [];
  document.querySelectorAll('article img, [class*=carrusel] img, [class*=showcase] img, [class*=frasco]').forEach(e => { if (vis(e)) venta.push({ ...Y(e.getBoundingClientRect()), tipo: 'producto', t: e.alt || 'foto' }); });
  document.querySelectorAll('a, button').forEach(e => {
    if (!vis(e) || e.closest('[role=dialog]')) return;
    const t = (e.innerText || e.getAttribute('aria-label') || '').trim();
    const h = e.getAttribute('href') || '';
    if (/wa\.me/.test(h) || /whatsapp|pedido|agregar|cat[aá]logo|ver \d+ m[aá]s/i.test(t) || e.classList.contains('tbtn'))
      venta.push({ ...Y(e.getBoundingClientRect()), tipo: 'cta', t: t.slice(0, 40) });
  });
  for (const r of texto) if (/\$\s?\d/.test(r.t) || /^\d{1,3}(\.\d{3})+$/.test(r.t)) venta.push({ ...r, tipo: 'precio' });
  // Gancho visual: fotos, fondos con imagen, svg grandes, video.
  const visual = [];
  document.querySelectorAll('*').forEach(e => {
    if (e.closest('[role=dialog]')) return;
    const tag = e.tagName;
    let es = tag === 'IMG' || tag === 'VIDEO' || tag === 'CANVAS' || tag === 'PICTURE';
    if (!es && tag !== 'svg' && tag !== 'HTML' && tag !== 'BODY') { const bg = getComputedStyle(e).backgroundImage; es = bg && bg.includes('url('); }
    if (!es && tag === 'svg') { const r = e.getBoundingClientRect(); es = r.width > 80 && r.height > 80; }
    if (es && vis(e)) visual.push({ ...Y(e.getBoundingClientRect()), t: tag });
  });
  return { secciones: secs, texto, venta, visual, alto: document.documentElement.scrollHeight, ancho: document.documentElement.clientWidth };
}
"""


def proteger(ctx):
    """Nunca escribir en la base ni abrir WhatsApp de verdad."""
    def manejar(route):
        req = route.request
        if "rpc/crear_pedido_web" in req.url:
            route.fulfill(status=200, content_type="application/json",
                          body=json.dumps([{"order_id": "00000000-0000-0000-0000-000000000000", "numero": 9999}]))
        elif req.method not in ("GET", "HEAD", "OPTIONS"):
            route.abort()
        else:
            route.continue_()
    ctx.route("**/rest/v1/**", manejar)
    ctx.route("**/auth/v1/**", lambda r: r.continue_() if r.request.method == "GET" else r.abort())
    ctx.route(re.compile(r"https://(wa\.me|api\.whatsapp\.com)/.*"), lambda r: r.abort())
    ctx.add_init_script("window.open = function (u) { (window.__aperturas = window.__aperturas || []).push(String(u)); return null; };")


def capturar(url, ancho, salida, nombre):
    from playwright.sync_api import sync_playwright
    movil = ancho < 800
    op = dict(viewport={"width": ancho, "height": 844 if movil else 900}, device_scale_factor=2 if movil else 1, locale="es-AR")
    if movil:
        op.update(is_mobile=True, has_touch=True)
    with sync_playwright() as p:
        b = p.chromium.launch(args=["--font-render-hinting=none"])
        ctx = b.new_context(**op)
        proteger(ctx)
        pg = ctx.new_page()
        pg.goto(url, wait_until="networkidle", timeout=60000)
        if "/catalogo" in url:
            pg.wait_for_selector("article", timeout=30000)
        pg.wait_for_timeout(1200)
        estado = pg.evaluate(JS_PREPARAR)
        pg.wait_for_timeout(3500)  # termina la coreografia de entrada del hero
        pg.evaluate("scrollTo(0, 0)")
        pg.wait_for_timeout(400)
        cajas = pg.evaluate(JS_CAJAS, op["viewport"]["height"])
        ruta = os.path.join(salida, f"captura_{nombre}.png")
        pg.screenshot(path=ruta, full_page=True)
        b.close()
    cajas["estado_captura"] = estado
    cajas["dpr"] = op["device_scale_factor"]
    cajas["viewport"] = op["viewport"]
    return ruta, cajas


# ---------------------------------------------------------------------------
# Medidas sobre la imagen
# ---------------------------------------------------------------------------

def lum(rgb):
    c = rgb.astype(np.float32) / 255
    c = np.where(c <= 0.03928, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    return 0.2126 * c[..., 0] + 0.7152 * c[..., 1] + 0.0722 * c[..., 2]


def contraste_caja(rgb):
    """WCAG entre el color de la letra y el del fondo, medido en pixeles: los
    dos extremos de luminancia del renglon (percentiles 4 y 96)."""
    if rgb.size == 0:
        return None
    L = lum(rgb).ravel()
    a, b = np.percentile(L, 4), np.percentile(L, 96)
    return float((b + 0.05) / (a + 0.05))


def detectar_texto(rgb):
    """Para imagenes sin DOM (Figma): renglones de texto por gradiente
    morfologico + cierre horizontal. Aproximado: tambien agarra bordes finos."""
    g = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    grad = cv2.morphologyEx(g, cv2.MORPH_GRADIENT, np.ones((3, 3), np.uint8))
    _, bw = cv2.threshold(grad, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)
    bw = cv2.morphologyEx(bw, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_RECT, (max(9, rgb.shape[1] // 60), 1)))
    n, lab, st, _ = cv2.connectedComponentsWithStats(bw)
    cajas = []
    H = rgb.shape[1] / 100
    for i in range(1, n):
        x, y, w, h, a = st[i]
        if h < 0.6 * H or h > 6 * H or w < 1.5 * h or a / (w * h) < 0.25:
            continue
        # el texto tiene muchas transiciones; una foto lisa no
        cajas.append(dict(x=int(x), y=int(y), w=int(w), h=int(h), t="(detectado)"))
    return cajas


def colorido(rgb):
    """Hasler y Suesstrunk (2003)."""
    r, g, b = [rgb[..., i].astype(np.float32) for i in range(3)]
    rg, yb = r - g, 0.5 * (r + g) - b
    return float(np.sqrt(rg.std() ** 2 + yb.std() ** 2) + 0.3 * np.sqrt(rg.mean() ** 2 + yb.mean() ** 2))


def mascara(cajas, shape, esc, rec=None):
    m = np.zeros(shape[:2], np.uint8)
    for c in cajas:
        x0, y0 = int(c["x"] * esc), int(c["y"] * esc)
        x1, y1 = int((c["x"] + c["w"]) * esc), int((c["y"] + c["h"]) * esc)
        m[max(0, y0):max(0, y1), max(0, x0):max(0, x1)] = 1
    return m


# ---------------------------------------------------------------------------
# Calor de la pagina entera
# ---------------------------------------------------------------------------

def calor_pagina(img, dpr, vh_css, escritorio, texto_mask):
    """Corre el modelo por pantallas (alto del visor, paso de media pantalla):
    la gente ve una pantalla por vez, no la pagina entera achicada. Cada pantalla
    reparte la misma atencion (densidad que suma 1) y el solapamiento se promedia.
    Devuelve la densidad por pixel de la captura (condicional: lo que mira quien
    llega a esa pantalla)."""
    H, W = img.shape[:2]
    vh = int(vh_css * dpr)
    # Escala de entrada al modelo: ~25-35 px por grado visual (MIT1003). Un
    # celular de 390 px css a 30 cm ocupa ~12 grados -> ~490 px; un monitor de
    # 1440 css a 60 cm ~45 grados -> ~1080 px (se baja un poco por velocidad).
    ancho_modelo = 1080 if escritorio else 488
    s = ancho_modelo / W
    acum = np.zeros((H, W), np.float64)
    cuenta = np.zeros((H, 1), np.float64)
    paso = max(1, vh // 2)
    ys = list(range(0, max(1, H - vh) + 1, paso))
    if ys[-1] + vh < H:
        ys.append(H - vh)
    for i, y in enumerate(ys):
        y1 = min(H, y + vh)
        crop = img[y:y1]
        tm = texto_mask[y:y1] if texto_mask is not None else None
        ch = max(8, int(round(crop.shape[0] * s)))
        peq = cv2.resize(crop, (ancho_modelo, ch), interpolation=cv2.INTER_AREA)
        tmp = cv2.resize(tm, (ancho_modelo, ch), interpolation=cv2.INTER_NEAREST) if tm is not None else None
        d = saliencia_pantalla(peq, escritorio, tmp)
        d = cv2.resize(d.astype(np.float32), (W, y1 - y), interpolation=cv2.INTER_LINEAR)
        d = d / d.sum()
        acum[y:y1] += d
        cuenta[y:y1] += 1
        print(f"  pantalla {i + 1}/{len(ys)} (y {int(y / dpr)}-{int(y1 / dpr)} css)", flush=True)
    dens = acum / np.maximum(cuenta, 1)
    return dens / dens.sum(), len(ys)


def caida_scroll(H, dpr, vh_css):
    """Peso por altura segun NN/g (2018): 57 % del tiempo en la primera
    pantalla, 17 % en la segunda (74 % acumulado) y el resto cae geometrico
    (razon 0,605, que reparte el 26 % restante)."""
    vh = vh_css * dpr
    k = np.arange(H) / vh  # pantalla continua
    w = np.where(k < 1, 0.57, np.where(k < 2, 0.17, 0.17 * 0.605 ** (k - 1)))
    return (w / vh).astype(np.float64)


# ---------------------------------------------------------------------------
# Rubrica
# ---------------------------------------------------------------------------

RUBRICA = {
    "atencion_media": "2,5 pts. Densidad media de la seccion / densidad media de la pagina (r). 2,5 x min(1, r / 1,5).",
    "pico": "1,5 pts. Percentil 99 de la seccion / percentil 99 de la pagina (q). 1,5 x min(1, q).",
    "pico_vende": "2 pts. Del 10 % mas caliente de la seccion, que parte cae sobre producto, precio o boton (f). 2 x min(1, f / 0,5).",
    "densidad_texto": "1,5 pts. % del area de la seccion cubierta por renglones de texto (t). 1,5 si t <= 12 %, 0 si t >= 40 %, lineal en el medio.",
    "contraste": "1 pt. Percentil 10 del contraste WCAG medido en pixeles de los renglones (c). 1 si c >= 4,5; 0,5 si c >= 3; 0 si menos.",
    "gancho_visual": "1,5 pts. % del area con foto, fondo con imagen o ilustracion (v) y colorido (Hasler-Suesstrunk). 1,2 x min(1, v / 0,35) + 0,3 x min(1, colorido / 45).",
}


def puntuar(sec, img, dens, dens_media, p99_pag, venta_m, texto_m, visual_m, texto_cajas, esc):
    y0 = int(sec["y"] * esc)
    y1 = int((sec["y"] + sec["h"]) * esc)
    y0, y1 = max(0, y0), min(img.shape[0], y1)
    if y1 - y0 < 4:
        return None
    d = dens[y0:y1]
    r = float(d.mean() / dens_media)
    q = float(np.percentile(d, 99) / p99_pag)
    umbral = np.percentile(d, 90)
    top = d >= umbral
    vm = venta_m[y0:y1]
    f = float((top & (vm > 0)).sum() / max(1, top.sum()))
    t = float(texto_m[y0:y1].mean())
    v = float(visual_m[y0:y1].mean())
    col = colorido(img[y0:y1])
    contr = []
    for c in texto_cajas:
        cy = c["y"] + c["h"] / 2
        # Solo renglones con al menos 3 letras o cifras y 8 px de alto: un
        # separador "·" o un icono no tienen contraste medible en pixeles.
        if sec["y"] <= cy < sec["y"] + sec["h"] and len(re.findall(r"\w", c.get("t", ""))) >= 3 and c["h"] >= 8:
            x0, yy0 = int(c["x"] * esc), int(c["y"] * esc)
            x1, yy1 = int((c["x"] + c["w"]) * esc), int((c["y"] + c["h"]) * esc)
            k = contraste_caja(img[max(0, yy0):yy1, max(0, x0):x1])
            if k:
                contr.append((k, c["w"] * c["h"], c.get("t", "")))
    if contr:
        ks = np.array([k for k, _, _ in contr])
        c10 = float(np.percentile(ks, 10))
        cmed = float(np.median(ks))
        peor = min(contr, key=lambda z: z[0])
    else:
        c10 = cmed = None
        peor = None
    # donde cae el pico
    iy, ix = np.unravel_index(np.argmax(d), d.shape)
    pts = dict(
        atencion_media=round(2.5 * min(1, r / 1.5), 2),
        pico=round(1.5 * min(1, q), 2),
        pico_vende=round(2 * min(1, f / 0.5), 2),
        densidad_texto=round(1.5 * (1 if t <= 0.12 else 0 if t >= 0.40 else (0.40 - t) / 0.28), 2),
        contraste=(1.0 if c10 is None or c10 >= 4.5 else 0.5 if c10 >= 3 else 0.0),
        gancho_visual=round(1.2 * min(1, v / 0.35) + 0.3 * min(1, col / 45), 2),
    )
    return dict(
        nombre=sec["nombre"], y_css=[int(sec["y"]), int(sec["y"] + sec["h"])],
        atencion_rel=round(r, 2), pico_rel=round(q, 2),
        parte_de_la_atencion=round(float(d.sum()), 4),
        pico_en_venta=round(f, 2), texto_area=round(t, 3), visual_area=round(v, 3),
        colorido=round(col, 1), contraste_p10=round(c10, 2) if c10 else None,
        contraste_mediana=round(cmed, 2) if cmed else None,
        peor_contraste=dict(ratio=round(peor[0], 2), texto=peor[2]) if peor else None,
        pico_xy_css=[int(ix / esc), int((iy + y0) / esc)],
        puntos=pts, puntaje=round(sum(pts.values()), 1),
    )


# ---------------------------------------------------------------------------
# Dibujo
# ---------------------------------------------------------------------------

def colorear(dens, ref):
    """Mapa de color comun a toda la pagina: 0 = azul, percentil 99,5 de la
    pagina = rojo. Raiz cuadrada para que se lean los tibios."""
    z = np.clip(dens / ref, 0, 1) ** 0.6
    u8 = (z * 255).astype(np.uint8)
    return cv2.cvtColor(cv2.applyColorMap(u8, cv2.COLORMAP_JET), cv2.COLOR_BGR2RGB), z


def superponer(img, dens, ref, resultados, esc, titulo):
    col, z = colorear(dens, ref)
    gris = cv2.cvtColor(cv2.cvtColor(img, cv2.COLOR_RGB2GRAY), cv2.COLOR_GRAY2RGB).astype(np.float32)
    base = 0.55 * img.astype(np.float32) + 0.45 * gris
    a = (0.35 + 0.35 * z)[..., None]
    out = (base * (1 - a) + col.astype(np.float32) * a).clip(0, 255).astype(np.uint8)
    im = Image.fromarray(out)
    dr = ImageDraw.Draw(im)
    tam = max(14, int(13 * esc))
    f = ImageFont.truetype(FUENTE, tam)
    fp = ImageFont.truetype(FUENTE, int(tam * 0.8))
    for r in resultados:
        y = int(r["y_css"][0] * esc)
        dr.line([(0, y), (im.width, y)], fill=(255, 255, 255), width=max(1, int(esc)))
        txt = f"{r['puntaje']}/10  {r['nombre'][:34]}"
        w = dr.textlength(txt, font=f)
        dr.rectangle([4, y + 4, 12 + w, y + 8 + tam * 1.25], fill=(20, 12, 10))
        dr.text((8, y + 6), txt, fill=(255, 236, 200), font=f)
        px, py = r["pico_xy_css"]
        cx, cy = int(px * esc), int(py * esc)
        rr = int(9 * esc)
        dr.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], outline=(255, 255, 255), width=max(2, int(1.5 * esc)))
    dr.rectangle([0, im.height - int(tam * 1.6), im.width, im.height], fill=(20, 12, 10))
    dr.text((8, im.height - int(tam * 1.4)), titulo, fill=(255, 236, 200), font=fp)
    return im


# ---------------------------------------------------------------------------

def correr(args):
    os.makedirs(args.salida, exist_ok=True)
    os.makedirs(os.path.join(args.salida, "secciones"), exist_ok=True)
    nombre = args.nombre
    if args.url:
        nombre = nombre or str(args.ancho)
        ruta, cajas = capturar(args.url, args.ancho, args.salida, nombre)
        dpr = cajas["dpr"]
        vh = cajas["viewport"]["height"]
        escritorio = args.ancho >= 800
        print(f"captura: {ruta} ({cajas['estado_captura']['imagenes']} imagenes, rotas: {cajas['estado_captura']['rotas']})", flush=True)
    else:
        ruta = args.imagen
        nombre = nombre or os.path.splitext(os.path.basename(ruta))[0]
        dpr = args.dpr
        escritorio = (Image.open(ruta).width / dpr) >= 800
        vh = args.alto_visor or (900 if escritorio else 844)
        cajas = {"texto": [], "venta": [], "visual": []}
        if args.secciones:
            with open(args.secciones) as fh:
                extra = json.load(fh)
            cajas.update({k: v for k, v in extra.items() if k in ("secciones", "venta", "visual", "texto")})
    img = np.array(Image.open(ruta).convert("RGB"))
    H, W = img.shape[:2]
    alto_css = H / dpr
    if not cajas.get("secciones"):
        k = max(1, math.ceil(alto_css / vh))
        cajas["secciones"] = [dict(nombre=f"Pantalla {i + 1}", x=0, y=int(i * vh), w=int(W / dpr), h=int(min(vh, alto_css - i * vh))) for i in range(k)]
    if not cajas.get("texto"):
        cajas["texto"] = [{k: (v / dpr if k in "xywh" else v) for k, v in c.items()} for c in detectar_texto(img)]
        cajas["texto_detectado"] = True
    texto_m = mascara(cajas["texto"], img.shape, dpr)
    venta_m = mascara(cajas.get("venta", []), img.shape, dpr)
    visual_m = mascara(cajas.get("visual", []), img.shape, dpr)

    preparar_modelo(args.modelo)
    dens, n_pant = calor_pagina(img, dpr, vh, escritorio, texto_m if _MODELO["red"] is None else None)
    ret = caida_scroll(H, dpr, vh)[:, None]
    dens_s = dens * ret
    dens_s /= dens_s.sum()

    media = dens.mean()
    p99 = np.percentile(dens, 99)
    resultados = []
    for sec in cajas["secciones"]:
        r = puntuar(sec, img, dens, media, p99, venta_m, texto_m, visual_m, cajas["texto"], dpr)
        if r:
            y0, y1 = int(sec["y"] * dpr), int((sec["y"] + sec["h"]) * dpr)
            r["parte_con_scroll"] = round(float(dens_s[max(0, y0):y1].sum()), 4)
            resultados.append(r)

    ref = np.percentile(dens, 99.5)
    titulo = f"{nombre}  |  {_MODELO['nombre'].split(' (')[0]}  |  calor por pantalla (quien llega)"
    im = superponer(img, dens, ref, resultados, dpr, titulo)
    destino = os.path.join(args.salida, f"calor_{nombre}.jpg")
    escala_jpg = min(1.0, 1600 / max(im.width, 1)) if escritorio else 1.0
    im_g = im.resize((int(im.width * escala_jpg), int(im.height * escala_jpg))) if escala_jpg < 1 else im
    im_g.save(destino, quality=82, optimize=True)
    ims = superponer(img, dens_s, np.percentile(dens_s, 99.5), resultados, dpr,
                     f"{nombre}  |  con caida por scroll (NN/g 57/17/26)")
    ims.save(os.path.join(args.salida, f"calor_{nombre}_scroll.jpg"), quality=78, optimize=True)
    for i, r in enumerate(resultados):
        y0 = int(r["y_css"][0] * dpr)
        y1 = min(im.height, int(r["y_css"][1] * dpr))
        slug = re.sub(r"[^a-z0-9]+", "-", r["nombre"].lower().encode("ascii", "ignore").decode())[:30].strip("-")
        rec = im.crop((0, y0, im.width, y1))
        if rec.width > 1200:
            rec = rec.resize((1200, int(rec.height * 1200 / rec.width)))
        p = os.path.join(args.salida, "secciones", f"{nombre}_{i + 1:02d}_{slug}.jpg")
        rec.save(p, quality=82)
        r["recorte"] = p
    salida = dict(
        modelo=_MODELO["nombre"], fuente=args.url or ruta, ancho_css=int(W / dpr), alto_css=int(alto_css),
        dpr=dpr, alto_visor=vh, pantallas_evaluadas=n_pant,
        sesgo_centro="gaussiana propia (centerbias_mit1003.npy no se pudo bajar)",
        texto_detectado_por_imagen=bool(cajas.get("texto_detectado")),
        estado_captura=cajas.get("estado_captura"), rubrica=RUBRICA, secciones=resultados,
        imagen=destino,
    )
    with open(os.path.join(args.salida, f"calor_{nombre}.json"), "w") as fh:
        json.dump(salida, fh, ensure_ascii=False, indent=1)
    print(f"\n{nombre}: {len(resultados)} secciones")
    for r in resultados:
        print(f"  {r['puntaje']:4}/10  {r['nombre'][:40]:40}  aten {r['atencion_rel']:.2f}  pico {r['pico_rel']:.2f}  vende {r['pico_en_venta']:.2f}  texto {r['texto_area']:.0%}  contr {r['contraste_p10']}  visual {r['visual_area']:.0%}")
    return salida


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--url")
    g.add_argument("--imagen")
    ap.add_argument("--ancho", type=int, default=390, help="ancho del visor en modo --url (390 o 1440)")
    ap.add_argument("--dpr", type=float, default=1, help="densidad de la imagen en modo --imagen (Figma @2x = 2)")
    ap.add_argument("--alto-visor", type=int, help="alto de una pantalla en px css (844 celular, 900 escritorio)")
    ap.add_argument("--secciones", help="JSON con secciones/venta/visual/texto en px css (modo --imagen)")
    ap.add_argument("--nombre", help="sufijo de los archivos (por defecto, el ancho o el nombre de la imagen)")
    ap.add_argument("--salida", default=os.path.join(AQUI, "salida"))
    ap.add_argument("--modelo", choices=["auto", "deepgaze", "cv2"], default="auto")
    correr(ap.parse_args())


if __name__ == "__main__":
    main()
