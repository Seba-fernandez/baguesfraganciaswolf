#!/usr/bin/env python3
"""
Banco de pruebas de la tienda publica.

Recorre la tienda en un Chromium real (Playwright) a 390 px de celular y a
1440 px de escritorio, y mide cada hallazgo de la auditoria de octubre 2026
con un chequeo automatico. Cada chequeo dice PASA, FALLA o NO APLICA, con el
dato medido al lado.

Uso:
  python3 scripts/qa/recorrido.py --url https://baguesfraganciaswolf.vercel.app
  python3 scripts/qa/recorrido.py --url http://localhost:4173
  python3 scripts/qa/recorrido.py --url ... --lh 5          # + Lighthouse, mediana de 5
  python3 scripts/qa/recorrido.py --url ... --solo UX-1,UX-3
  python3 scripts/qa/recorrido.py --url ... --salida scripts/qa/linea-base.json

No confirma pedidos reales: la llamada a crear_pedido_web se intercepta y se
contesta con un pedido de mentira, y cualquier otra escritura contra la base se
corta. Necesita playwright (Python) con Chromium instalado; Lighthouse se corre
con npx y el Chromium de Playwright.
"""

import argparse
import glob
import json
import os
import re
import statistics
import subprocess
import sys
import tempfile
import time
import urllib.parse

from playwright.sync_api import sync_playwright

AQUI = os.path.dirname(os.path.abspath(__file__))

MOVIL = dict(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True,
             device_scale_factor=2, locale="es-AR")
MOVIL3 = dict(MOVIL, device_scale_factor=3)
ESCRITORIO = dict(viewport={"width": 1440, "height": 900}, device_scale_factor=1, locale="es-AR")

BUSQUEDAS = ["sauvage", "savage", "good gril", "amaderado", "amaderada", "vainilla",
             "hombre", "mujer", "arizona", "esparta", "212 vip"]
INEXISTENTE = "zzzz perfume inexistente"

RESULTADOS = []
SOLO = None
BASE = ""


def quiere(cid):
    """--solo UX-1 pide UX-1 (y sus variantes 'UX-1 390'), no UX-10 ni UX-15."""
    return SOLO is None or any(cid == s or cid.startswith(s + " ") for s in SOLO)


def chk(cid, categoria, severidad, descripcion, ok, detalle):
    resultado = "NO APLICA" if ok is None else ("PASA" if ok else "FALLA")
    RESULTADOS.append(dict(id=cid, categoria=categoria, severidad=severidad,
                           descripcion=descripcion, resultado=resultado, detalle=detalle))
    print(f"  {resultado:9} {cid:16} {descripcion[:70]}", flush=True)


def proteger_base(ctx, simular_pedido=True):
    """Corta toda escritura contra la base y simula crear_pedido_web."""
    def manejar(route):
        req = route.request
        if "rpc/crear_pedido_web" in req.url:
            if simular_pedido:
                route.fulfill(status=200, content_type="application/json",
                              body=json.dumps([{"order_id": "00000000-0000-0000-0000-000000000000", "numero": 9999}]))
            else:
                route.abort()
            return
        if req.method not in ("GET", "HEAD", "OPTIONS"):
            route.abort()
            return
        route.continue_()
    ctx.route("**/rest/v1/**", manejar)
    ctx.route("**/auth/v1/**", lambda r: r.continue_() if r.request.method == "GET" else r.abort())


def nuevo(browser, opciones, simular_pedido=True):
    ctx = browser.new_context(**opciones)
    proteger_base(ctx, simular_pedido)
    # window.open queda registrado y devuelve null: es lo que pasa cuando Safari
    # o el navegador de Instagram bloquean la ventana despues de una espera.
    ctx.add_init_script("""
      window.__aperturas = [];
      window.open = function (u) { window.__aperturas.push(String(u)); return null; };
    """)
    return ctx, ctx.new_page()


def esperar_catalogo(page, timeout=25000):
    page.wait_for_selector("article", timeout=timeout)
    page.wait_for_timeout(400)


def buscar(page, termino):
    page.fill("input[type=search]", termino)
    page.wait_for_timeout(450)


def conteo(page):
    txt = page.evaluate("() => document.querySelector('[class*=conteo]')?.innerText || ''")
    m = re.search(r"(\d+)", txt)
    return int(m.group(1)) if m else 0, txt


def abrir_ficha(page, indice=0):
    page.locator("article").nth(indice).locator("button").first.click()
    page.wait_for_selector("[role=dialog] button:has-text('Agregar al pedido')", timeout=15000)
    page.wait_for_timeout(500)


def cerrar_dialogo(page):
    page.keyboard.press("Escape")
    page.wait_for_timeout(500)


JS_DESCRIBIR = """
  (e) => {
    if (!e) return 'nada';
    const cls = (e.className && e.className.baseVal === undefined ? e.className : '') || '';
    return (e.tagName + '.' + String(cls).split(' ')[0] + ' "' + (e.innerText || e.getAttribute('aria-label') || '').trim().slice(0, 30) + '"');
  }
"""


def golpe_agregar(page):
    """elementFromPoint en el centro del boton de agregar de la ficha."""
    # Como lo hace la clienta: baja la hoja hasta el final, que es donde queda
    # el boton. Ahi es donde el pie se dibujaba encima.
    page.evaluate("""() => {
      const b = [...document.querySelectorAll('[role=dialog] button')].find(x => x.textContent.trim() === 'Agregar al pedido');
      const d = b.closest('[role=dialog]');
      d.scrollTop = d.scrollHeight;
      b.scrollIntoView({ block: 'nearest' });
    }""")
    page.wait_for_timeout(400)
    return page.evaluate("""(describir) => {
      const d = eval(describir);
      const b = [...document.querySelectorAll('[role=dialog] button')].find(x => x.textContent.trim() === 'Agregar al pedido');
      const r = b.getBoundingClientRect();
      const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { ok: !!e && (e === b || b.contains(e)), golpea: d(e), enPie: !!(e && e.closest('footer')), y: Math.round(r.top) };
    }""", JS_DESCRIBIR)


def area_tactil(page, selector, nombre):
    """Mide el area clickeable real: el centro y los cuatro bordes de un
    cuadrado de 44x44 centrado en el elemento tienen que caer en el elemento
    (o en su ::after, que cuenta como el elemento)."""
    return page.evaluate("""([sel, nombre]) => {
      const els = [...document.querySelectorAll(sel)].filter(e => e.getBoundingClientRect().width > 0);
      if (!els.length) return [{ nombre, falta: true }];
      return els.slice(0, 3).map((el) => {
        el.scrollIntoView({ block: 'center', inline: 'center' });
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const pts = [[0, 0], [-21, 0], [21, 0], [0, -21], [0, 21]];
        const fallan = pts.filter(([dx, dy]) => {
          const e = document.elementFromPoint(cx + dx, cy + dy);
          return !(e && (e === el || el.contains(e)));
        }).map(p => p.join(','));
        return { nombre, w: Math.round(r.width), h: Math.round(r.height), fallan };
      });
    }""", [selector, nombre])


def texto_completo(page):
    """innerText de toda la pagina, despues de pasar por todas las secciones
    (content-visibility: auto no calcula lo que no se acerco a la pantalla)."""
    page.evaluate("""async () => {
      const paso = innerHeight * 0.8;
      for (let y = 0; y < document.documentElement.scrollHeight; y += paso) {
        scrollTo(0, y); await new Promise(r => setTimeout(r, 60));
      }
      scrollTo(0, 0);
    }""")
    # innerText deja afuera lo que content-visibility: auto no calcula, y al
    # volver arriba las secciones de abajo se vuelven a saltear: se fuerzan
    # visibles solo para leer.
    return page.evaluate("""() => {
      const s = document.createElement('style');
      s.textContent = '* { content-visibility: visible !important; }';
      document.head.appendChild(s);
      const t = document.body.innerText;
      s.remove();
      return t;
    }""")


# ---------------------------------------------------------------------------

def abrir_con_pie_detras(page):
    """Abre la ultima tarjeta y deja el pie de pagina detras de la ficha.

    Es el caso de la clienta que bajo hasta el resultado: el pie queda a la
    vista y la ficha se abre encima. En iOS la pagina no salta al abrir la
    ficha, asi que el pie sigue ahi; en Chromium movil el overflow: hidden del
    body la manda arriba y el error se esconde. Para que la prueba no dependa
    del navegador, despues de abrir se lleva la pagina hasta el pie a mano.
    El pie tiene content-visibility: auto: fuera de pantalla no se pinta."""
    page.evaluate("() => scrollTo(0, document.documentElement.scrollHeight)")
    page.wait_for_timeout(400)
    n = page.locator("article").count()
    abrir_ficha(page, n - 1)
    # Desde la etapa 3A el body queda fijo con la ficha abierta (conserva la
    # posicion): scrollTo no mueve nada y hay que correr el body.
    page.evaluate("""() => { const f = document.querySelector('footer'); const b = document.body;
        if (getComputedStyle(b).position === 'fixed') {
          const actual = -parseFloat(b.style.top || '0');
          b.style.top = `-${f.getBoundingClientRect().top + actual - 120}px`;
        } else scrollTo(0, f.getBoundingClientRect().top + scrollY - 120); }""")
    page.wait_for_timeout(500)
    return page.evaluate("() => { const f = document.querySelector('footer'); return f ? Math.round(f.getBoundingClientRect().top) : null; }")


def ux1(browser, base):
    for nombre, op in (("390", MOVIL), ("1440", ESCRITORIO)):
        ctx, page = nuevo(browser, op)
        page.goto(base + "/catalogo", wait_until="domcontentloaded")
        esperar_catalogo(page)
        buscar(page, "sauvage")
        pie_a = abrir_con_pie_detras(page)
        a = golpe_agregar(page)
        cerrar_dialogo(page)
        if page.locator("[role=dialog]").count():
            page.mouse.click(5, 5)
            page.wait_for_timeout(400)
        buscar(page, "")
        # ultima pagina, sin busqueda
        page.evaluate("""() => {
          const nums = [...document.querySelectorAll('nav[aria-label="Páginas del catálogo"] button:not([aria-label])')];
          nums[nums.length - 1]?.click();
        }""")
        page.wait_for_timeout(900)
        pie_b = abrir_con_pie_detras(page)
        b = golpe_agregar(page)
        chk(f"UX-1 {nombre}", "bloqueante", "alta",
            f"El toque en 'Agregar al pedido' llega al boton ({nombre} px)",
            a["ok"] and b["ok"],
            f"con busqueda (pie a {pie_a} px): {a['golpea']}{' (pie)' if a['enPie'] else ''}; "
            f"ultima pagina (pie a {pie_b} px): {b['golpea']}{' (pie)' if b['enPie'] else ''}")
        ctx.close()


def ux2(browser, base):
    ctx, page = nuevo(browser, MOVIL)
    page.add_init_script("""
      window.__ls = [];
      new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__ls.push({ v: e.value, t: e.startTime }); })
        .observe({ type: 'layout-shift', buffered: true });
      window.__muestras = [];
      const muestrear = () => {
        const hero = document.querySelector('#inicio-hero');
        const hr = hero && hero.getBoundingClientRect();
        const pie = document.querySelector('.tienda > footer, footer');
        const pr = pie && pie.getBoundingClientRect();
        const arts = document.querySelectorAll('article').length;
        if (document.body) window.__muestras.push({
          t: Math.round(performance.now()),
          hero: !!(hr && hr.height > 0 && hr.top < innerHeight && hr.bottom > 0),
          pie: !!(pr && pr.height > 0 && pr.top < innerHeight),
          arts,
        });
        if (arts === 0 || performance.now() < 4000) requestAnimationFrame(muestrear);
      };
      requestAnimationFrame(muestrear);
    """)
    page.goto(base + "/catalogo", wait_until="domcontentloaded")
    esperar_catalogo(page)
    page.wait_for_timeout(3000)
    ls = page.evaluate("window.__ls")
    muestras = page.evaluate("window.__muestras")
    # CLS como lo calcula Lighthouse: la peor ventana de sesion (1 s de hueco, 5 s de largo).
    cls, ventana, ini, ult = 0.0, 0.0, None, None
    for e in ls:
        if ini is None or e["t"] - ult > 1000 or e["t"] - ini > 5000:
            ventana, ini = 0.0, e["t"]
        ventana += e["v"]
        ult = e["t"]
        cls = max(cls, ventana)
    antes = [m for m in muestras if m["arts"] == 0]
    vio_hero = any(m["hero"] for m in muestras)
    vio_pie = any(m["pie"] for m in antes)
    html = page.request.get(base + "/catalogo").text()
    m = re.search(r'<link rel="canonical" href="([^"]+)"', html)
    canonical = m.group(1) if m else None
    chk("UX-2 CLS", "conversion", "alta", "Carga en frio de /catalogo: CLS < 0,1",
        cls < 0.1, f"CLS {cls:.3f} ({len(ls)} corrimientos)")
    chk("UX-2 primer", "conversion", "alta",
        "En frio /catalogo no muestra la portada ni el pie con el aviso antes del catalogo",
        not vio_hero and not vio_pie,
        f"portada vista: {vio_hero}; pie visible antes de las tarjetas: {vio_pie}; {len(muestras)} cuadros")
    chk("UX-2 canonical", "conversion", "media", "El canonical de /catalogo apunta a /catalogo",
        bool(canonical and canonical.rstrip("/").endswith("/catalogo")), f"canonical servido: {canonical}")
    ctx.close()


def ux3_ux4(browser, base):
    ctx, page = nuevo(browser, MOVIL)
    page.goto(base + "/catalogo", wait_until="domcontentloaded")
    esperar_catalogo(page)
    cuentas = {}
    for t in BUSQUEDAS:
        buscar(page, t)
        cuentas[t] = conteo(page)[0]
    ceros = [t for t, n in cuentas.items() if n == 0]
    if quiere("UX-3"):
        chk("UX-3", "conversion", "alta", "La busqueda encuentra lo que la gente escribe (11 terminos > 0)",
            not ceros, ", ".join(f"{t}={n}" for t, n in cuentas.items()))
    buscar(page, INEXISTENTE)
    links = page.evaluate("""(q) => [...document.querySelectorAll('a[href*="wa.me"]')].map(a => ({
        txt: a.innerText, href: decodeURIComponent(a.getAttribute('href') || '') }))
        .filter(x => (x.txt + ' ' + x.href).toLowerCase().includes(q))""", INEXISTENTE)
    if quiere("UX-4"):
        chk("UX-4", "conversion", "alta", "Sin resultados: enlace a WhatsApp con lo buscado",
            bool(links), (links[0]["href"][:120] if links else "no hay enlace wa.me con el termino"))
    ctx.close()


def cerrar_cajon(page):
    page.locator("[role=dialog][aria-label='Tu pedido'] button[aria-label='Cerrar']").first.click()
    page.wait_for_function("() => !document.querySelector('[role=dialog][aria-label=\"Tu pedido\"]')", timeout=5000)
    page.wait_for_timeout(200)


def agregar_desde_catalogo(page, indice):
    """Toca el + de una tarjeta y cierra el cajon. Devuelve el precio que mostraba."""
    precio = page.evaluate("""(i) => {
      const a = document.querySelectorAll('article')[i];
      const p = a.querySelector('[class*=precio]:not([class*=precioWrap])');
      return Number((p?.innerText || '').replace(/\\D/g, ''));
    }""", indice)
    boton = page.locator("article").nth(indice).locator("button[aria-label^='Agregar']")
    cajon = "[role=dialog][aria-label='Tu pedido']"
    for intento in range(2):
        boton.click()
        try:
            # Desde la etapa 3A: un aroma con varios tamanos abre la hoja (se
            # agrega el que viene elegido, el mas barato, que es el precio de
            # la tarjeta) y desde el segundo agregado el cajon no se abre solo:
            # sube la barra con "Ver pedido".
            page.wait_for_selector(f"{cajon}, [role=dialog][data-dialogo=tamanos], [data-qa=aviso-agregado] button", timeout=8000)
            if page.locator("[role=dialog][data-dialogo=tamanos]").count():
                page.locator("[data-qa=agregar-hoja]").click()
                page.wait_for_selector(f"{cajon}, [data-qa=aviso-agregado] button", timeout=8000)
            if not page.locator(cajon).count():
                page.locator("[data-qa=aviso-agregado] button").first.click()
            page.wait_for_selector(cajon, timeout=8000)
            break
        except Exception:
            if intento:
                raise
    page.wait_for_timeout(500)
    return precio


def flujo_pedido(browser, base):
    """UX-7, CONFIANZA-1 (cajon), REG-1 (codigo y suma)."""
    ctx, page = nuevo(browser, MOVIL)
    productos = {}

    def guardar(resp):
        if "/rest/v1/products" in resp.url and resp.request.method == "GET":
            try:
                productos["filas"] = resp.json()
            except Exception:
                pass
    page.on("response", guardar)
    page.goto(base + "/catalogo", wait_until="domcontentloaded")
    esperar_catalogo(page)
    page.evaluate("localStorage.clear()")
    p1 = agregar_desde_catalogo(page, 0)
    cerrar_cajon(page)
    p2 = agregar_desde_catalogo(page, 1)
    cajon = page.locator("[role=dialog][aria-label='Tu pedido']")
    texto_cajon = cajon.inner_text()
    m = re.search(r"Total estimado\s*\$\s*([\d.]+)", texto_cajon)
    total = int(m.group(1).replace(".", "")) if m else None
    boton1 = page.evaluate("""() => [...document.querySelectorAll('[role=dialog][aria-label="Tu pedido"] button.tbtn, [role=dialog][aria-label="Tu pedido"] .tbtn')]
       .map(b => b.innerText.trim()).filter(Boolean).pop() || ''""")
    # paso de datos
    page.locator("[role=dialog][aria-label='Tu pedido'] .tbtn.wide").last.click()
    page.wait_for_timeout(400)
    page.fill("#co-nombre", "Prueba QA")
    page.fill("#co-tel", "351 555 1234")
    boton2 = page.locator("[role=dialog][aria-label='Tu pedido'] .tbtn.wide").last.inner_text().strip()
    page.locator("[role=dialog][aria-label='Tu pedido'] .tbtn.wide").last.click()
    page.wait_for_timeout(1500)
    final = page.evaluate("""() => {
      const d = document.querySelector('[role=dialog][aria-label="Tu pedido"]');
      const a = d && [...d.querySelectorAll('a[href*="wa.me"]')][0];
      return { texto: d ? d.innerText : '', tag: a ? a.tagName : null, href: a ? a.getAttribute('href') : null, clase: a ? a.className : '' };
    }""")
    aperturas = page.evaluate("window.__aperturas")
    href = final["href"] or (aperturas[0] if aperturas else "")
    mensaje = urllib.parse.unquote(href.split("text=", 1)[1]) if "text=" in href else ""
    codigos = re.findall(r"\[(\d{8})\]", mensaje)
    validos = set()
    for fila in productos.get("filas", []):
        for pr in fila.get("presentaciones") or []:
            if pr.get("codigo"):
                validos.add(str(pr["codigo"]))

    if quiere("UX-7"):
        anticipa = "whatsapp" in boton1.lower() and "whatsapp" in boton2.lower()
        chk("UX-7 enlace", "bloqueante", "alta", "Pantalla final con <a> real a WhatsApp (sin depender de window.open)",
            final["tag"] == "A" and "text=" in (final["href"] or ""),
            f"enlace: {final['tag']} {(final['href'] or '')[:60]}; window.open intentado {len(aperturas)} vez/veces")
        chk("UX-7 textos", "conversion", "media", "Los botones del cajon anticipan WhatsApp",
            anticipa, f"paso 1: '{boton1}'; paso 2: '{boton2}'")
    if quiere("REG-1"):
        chk("REG-1 codigo", "bloqueante", "alta", "El codigo de proveedor llega al mensaje de WhatsApp",
            len(codigos) == 2 and all(c in validos for c in codigos),
            f"codigos en el mensaje: {codigos}; existen en la base: {all(c in validos for c in codigos) if codigos else False}")
        chk("REG-1 suma", "bloqueante", "alta", "El cajon suma bien dos productos",
            total is not None and total == p1 + p2, f"{p1} + {p2} = {p1 + p2}; cajon dice {total}")
    if quiere("CONFIANZA-1"):
        req = {"seña 50 %": r"se[ñn]a del 50\s?%", "transferencia o efectivo": r"transferencia o efectivo",
               "envio gratis": r"env[ií]o gratis", "no pagas nada aca": r"no pag[aá]s nada ac[aá]"}
        faltan = [k for k, rx in req.items() if not re.search(rx, texto_cajon, re.I)]
        chk("CONFIANZA-1 cajon", "confianza", "alta", "El cajon dice seña, medios de pago, envio gratis y que no se paga aca",
            not faltan, "falta: " + ", ".join(faltan) if faltan else "las cuatro lineas estan")
    RESULTADOS_TEXTOS["cajon"] = texto_cajon + "\n" + final["texto"]
    ctx.close()


RESULTADOS_TEXTOS = {}


def ux15(browser, base):
    ctx, page = nuevo(browser, ESCRITORIO)
    page.goto(base + "/catalogo", wait_until="domcontentloaded")
    esperar_catalogo(page)
    # Ficha abierta con el teclado
    page.evaluate("""() => { const b = document.querySelector('article button'); b.setAttribute('data-qa', 'disparador'); b.focus(); }""")
    page.keyboard.press("Enter")
    page.wait_for_selector("[role=dialog] button:has-text('Agregar al pedido')", timeout=15000)
    page.wait_for_timeout(600)
    foco_entra = page.evaluate("() => !!document.activeElement.closest('[role=dialog]')")
    fugas, contornos = 0, []
    for _ in range(15):
        page.keyboard.press("Tab")
        r = page.evaluate("""() => { const a = document.activeElement; const cs = getComputedStyle(a);
            return { dentro: !!a.closest('[role=dialog]'), w: parseFloat(cs.outlineWidth) || 0, st: cs.outlineStyle,
                     n: (a.getAttribute('aria-label') || a.innerText || a.tagName).trim().slice(0, 20) } }""")
        if not r["dentro"]:
            fugas += 1
        else:
            contornos.append(r)
    flacos = [c["n"] for c in contornos if c["st"] == "none" or c["w"] < 2]
    page.keyboard.press("Escape")
    page.wait_for_timeout(600)
    vuelve = page.evaluate("() => !document.querySelector('[role=dialog]') && document.activeElement?.getAttribute('data-qa') === 'disparador'")

    # Cajon abierto con el teclado
    page.evaluate("() => document.querySelector('header button[aria-label^=\"Ver pedido\"]').focus()")
    page.keyboard.press("Enter")
    page.wait_for_selector("[role=dialog][aria-label='Tu pedido']", timeout=10000)
    page.wait_for_timeout(600)
    cajon_entra = page.evaluate("() => !!document.activeElement.closest('[role=dialog]')")
    fugas_c = 0
    for _ in range(15):
        page.keyboard.press("Tab")
        if not page.evaluate("() => !!document.activeElement.closest('[role=dialog]')"):
            fugas_c += 1
    page.keyboard.press("Escape")
    page.wait_for_timeout(600)
    cajon_vuelve = page.evaluate("() => !document.querySelector('[role=dialog][aria-label=\"Tu pedido\"]') && !!document.activeElement?.matches('header button[aria-label^=\"Ver pedido\"]')")
    ctx.close()

    chk("UX-15 foco", "accesibilidad", "media",
        "Ficha y cajon: el foco entra, no se escapa con 15 Tabs, Escape cierra y vuelve al disparador",
        foco_entra and fugas == 0 and vuelve and cajon_entra and fugas_c == 0 and cajon_vuelve,
        f"ficha: entra {foco_entra}, fugas {fugas}/15, vuelve {vuelve}; cajon: entra {cajon_entra}, fugas {fugas_c}/15, cierra y vuelve {cajon_vuelve}")
    chk("UX-15 contorno", "accesibilidad", "media", "Foco visible con contorno de 2 px o mas en la ficha",
        bool(contornos) and not flacos,
        f"{len(contornos)} elementos medidos; flacos: {', '.join(sorted(set(flacos))) or 'ninguno'}")

    # Areas tactiles en el celular
    ctx, page = nuevo(browser, MOVIL)
    page.goto(base + "/catalogo", wait_until="domcontentloaded")
    esperar_catalogo(page)
    med = []
    med += area_tactil(page, "[class*=chips] button", "filtro")
    # Las pastillas de talla salieron de la tarjeta en la etapa 3A (las filas de
    # la hoja de tamanos se miden en E3-A4 tactil): se miden solo si estan.
    if page.locator("article [role=group] button").count():
        med += area_tactil(page, "article [role=group] button", "talla tarjeta")
    med += area_tactil(page, "article button[aria-label^='Agregar']", "+ tarjeta")
    abrir_ficha(page, 0)
    med += area_tactil(page, "[role=dialog] button[aria-label='Cerrar']", "cerrar ficha")
    med += area_tactil(page, "[role=dialog] [aria-label='Cantidad'] button", "+/- ficha")
    med += area_tactil(page, "[role=dialog] [aria-label='Elegir presentación'] button", "presentacion")
    page.locator("[role=dialog] button:has-text('Agregar al pedido')").click()
    page.wait_for_selector("[role=dialog][aria-label='Tu pedido']", timeout=10000)
    page.wait_for_timeout(500)
    med += area_tactil(page, "[role=dialog][aria-label='Tu pedido'] button[aria-label='Cerrar']", "cerrar cajon")
    med += area_tactil(page, "[role=dialog][aria-label='Tu pedido'] button[aria-label='Restar'], [role=dialog][aria-label='Tu pedido'] button[aria-label='Sumar']", "+/- cajon")
    ctx.close()
    chicos = [f"{m['nombre']} {m.get('w')}x{m.get('h')}" for m in med if m.get("falta") or m["fallan"]]
    chk("UX-15 tactil", "accesibilidad", "media", "Areas tactiles de 44x44 en pastillas, +/-, cerrar (medido con elementFromPoint)",
        not chicos, "chicas: " + "; ".join(dict.fromkeys(chicos)) if chicos else f"{len(med)} controles con 44x44 reales")


def ux10(browser, base):
    ctx, page = nuevo(browser, MOVIL)
    page.goto(base + "/catalogo", wait_until="domcontentloaded")
    esperar_catalogo(page)
    fam = page.evaluate("() => getComputedStyle(document.querySelector('article [class*=titulo]')).fontFamily")
    chk("UX-10", "visual", "media", "El nombre de la tarjeta del catalogo usa Cormorant",
        fam.strip().strip("'\"").lower().startswith("cormorant"), f"font-family: {fam[:60]}")
    ctx.close()


def foto5(browser, base):
    ctx, page = nuevo(browser, MOVIL3)
    page.goto(base + "/catalogo", wait_until="domcontentloaded")
    esperar_catalogo(page)
    page.evaluate("""async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 400) { scrollTo(0, y); await new Promise(r => setTimeout(r, 80)); } scrollTo(0, 0); }""")
    page.wait_for_timeout(1500)
    rotas = page.evaluate("() => [...document.querySelectorAll('article img')].filter(i => !(i.complete && i.naturalWidth > 0)).map(i => i.currentSrc || i.src)")
    total = page.evaluate("() => document.querySelectorAll('article img').length")
    abrir_ficha(page, 0)
    page.wait_for_function("() => { const i = document.querySelector('[role=dialog] img'); return i && i.complete && i.naturalWidth > 0; }", timeout=15000)
    # naturalWidth de una imagen con srcset viene dividido por la densidad que
    # eligio el navegador: para saber los pixeles reales del archivo se carga
    # aparte, sin srcset.
    f = page.evaluate("""async () => { const i = document.querySelector('[role=dialog] img');
       const real = await new Promise((ok) => { const x = new Image(); x.onload = () => ok(x.naturalWidth); x.onerror = () => ok(0); x.src = i.currentSrc; });
       return { src: i.currentSrc, nw: real, w: Math.round(i.getBoundingClientRect().width) }; }""")
    ctx.close()
    chico = bool(re.search(r"-(360|560)w\.webp", f["src"]))
    chk("FOTO-5 ficha", "visual", "alta", "La ficha a 390 px dpr 3 baja la foto grande (no -560w) y alcanza 2x",
        not chico and f["nw"] >= f["w"] * 2,
        f"{f['src'].rsplit('/', 1)[-1]} natural {f['nw']} px para {f['w']} px mostrados ({f['nw'] / max(f['w'], 1):.2f}x)")
    chk("FOTO-5 cargan", "visual", "alta", "Todas las imagenes del catalogo cargan (naturalWidth > 0)",
        not rotas and total > 0, f"{total - len(rotas)}/{total} cargadas" + (f"; rotas: {rotas[:3]}" if rotas else ""))


def espresso(rgb):
    """El fondo de una foto cae en el estudio espresso: oscuro, calido y poco
    saturado. Medido sobre las 133 fotos de octubre de 2026: las escenas viejas
    (azul, celeste, gris, rojo) quedan todas afuera; el estudio, todo adentro."""
    r, g, b = rgb
    luma = 0.2126 * r + 0.7152 * g + 0.0722 * b
    return luma <= 72 and r >= g - 2 and g >= b - 2 and r - b <= 48


def foto1(browser, base):
    try:
        from PIL import Image
        import io
    except ImportError:
        chk("FOTO-1", "visual", "alta", "Todas las fotos del catalogo en el estudio espresso", None, "falta Pillow (pip install pillow)")
        return
    ctx, page = nuevo(browser, ESCRITORIO)
    page.goto(base + "/catalogo", wait_until="domcontentloaded")
    esperar_catalogo(page)
    fuentes = []
    for pagina in (1, 2):
        if pagina == 2:
            page.click("button[aria-label='Página siguiente']")
            page.wait_for_timeout(900)
        page.evaluate("""async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 400) { scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); } }""")
        page.wait_for_timeout(800)
        fuentes += page.evaluate("() => [...document.querySelectorAll('article')].map(a => { const i = a.querySelector('img'); return i ? (i.currentSrc || i.src) : null; })")
    fuera, sin_foto = [], 0
    for src in fuentes:
        if not src:
            sin_foto += 1
            continue
        im = Image.open(io.BytesIO(page.request.get(src).body())).convert("RGB")
        w, h = im.size
        lado = max(4, int(w * 0.06))
        for x0 in (int(w * 0.02), w - int(w * 0.02) - lado):
            y0 = int(h * 0.02)
            px = list(im.crop((x0, y0, x0 + lado, y0 + lado)).getdata())
            media = tuple(sum(c[k] for c in px) / len(px) for k in range(3))
            if not espresso(media):
                fuera.append(f"{src.rsplit('/', 1)[-1]} {tuple(round(v) for v in media)}")
                break
    ctx.close()
    medidas = len(fuentes) - sin_foto
    chk("FOTO-1", "visual", "alta", "Paginas 1 y 2 del catalogo: el fondo de cada foto (esquinas de arriba) es espresso",
        not fuera and medidas >= 20,
        f"{medidas - len(fuera)}/{medidas} en espresso ({len(fuentes)} tarjetas, {sin_foto} sin foto)"
        + (f"; fuera: {fuera[:4]}" if fuera else ""))
    # FOTO-2 (filos blancos) no se puede medir de forma confiable sobre la foto
    # final: el canto dorado de una caja o el brillo del borde de un vidrio tienen
    # el mismo perfil que un filo blanco. Probado en octubre de 2026 sobre las 133
    # fotos: el detector marcaba 7 cajas ya limpias. Se controla en la hoja de
    # contacto (npm run fotos:contacto) y en componer.mjs, que limpia el filo de
    # todo recorte.
    chk("FOTO-2", "visual", "media", "Filos blancos en los recortes (se controla en la hoja de contacto)", None,
        "no medible en la foto final: ver docs/QA.md")


def ux17(browser, base):
    ctx, page = nuevo(browser, MOVIL)
    html = page.request.get(base + "/").text()
    m = re.search(r"(\d+)\s*aromas", html)
    servido = m.group(1) if m else None
    page.goto(base + "/", wait_until="load")
    page.wait_for_timeout(1500)
    page.wait_for_function("() => /\\d+\\s*aromas/.test(document.querySelector('[data-hero=meta]')?.innerText || '')", timeout=20000)
    page.wait_for_timeout(2500)
    vivo = page.evaluate("() => (document.querySelector('[data-hero=meta]').innerText.match(/(\\d+)\\s*aromas/) || [])[1] || null")
    ctx.close()
    chk("UX-17", "contenido", "baja", "El numero de aromas del HTML servido es el mismo que despues de hidratar",
        servido is None and vivo is not None or servido == vivo,
        f"servido: {servido if servido is not None else 'sin numero (lugar reservado)'}; despues de hidratar: {vivo}")


SIN_HINTING = None


def ux14(browser, base):
    # Chromium en Linux redondea el avance de cada letra a pixeles enteros con
    # el hinting de la fuente del sistema (Liberation Sans, la Arial de Linux):
    # a 16 px eso solo ya corre 5 px el boton. iOS, Android y Mac no lo hacen.
    # Para medir lo que ve un telefono, este chequeo usa un Chromium sin hinting.
    ctx, page = nuevo(SIN_HINTING or browser, MOVIL)

    def demorar(route):
        time.sleep(1.5)
        route.continue_()
    page.route("**/fonts/*.woff2", demorar)
    page.add_init_script("""
      window.__anchos = {};
      const medir = () => [...document.querySelectorAll('#inicio-hero .tbtn')].map(b => b.getBoundingClientRect().width);
      document.addEventListener('DOMContentLoaded', () => requestAnimationFrame(() => {
        window.__anchos.antes = medir();
        window.__anchos.estado = document.fonts.status;
        document.fonts.ready.then(() => requestAnimationFrame(() => { window.__anchos.despues = medir(); }));
      }));
    """)
    page.goto(base + "/", wait_until="load")
    page.wait_for_function("() => window.__anchos && window.__anchos.despues", timeout=30000)
    a = page.evaluate("window.__anchos")
    flecha = page.evaluate("""() => [...document.querySelectorAll('#inicio-hero .tbtn')].some(b => b.textContent.includes('→'))""")
    ctx.close()
    dif = max((abs(x - y) for x, y in zip(a["antes"], a["despues"])), default=0)
    chk("UX-14", "visual", "baja", "Los botones del hero no cambian de ancho al llegar la fuente y la flecha no es texto",
        dif <= 2 and not flecha,
        f"ancho antes {[round(x) for x in a['antes']]} despues {[round(x) for x in a['despues']]} (dif {dif:.1f} px, fuentes {a.get('estado')}); flecha como texto: {flecha}")


def contenido(browser, base):
    ctx, page = nuevo(browser, MOVIL)
    page.goto(base + "/", wait_until="load")
    page.wait_for_timeout(2500)
    portada = texto_completo(page)
    pie_panel = page.evaluate("() => [...document.querySelectorAll('footer a')].filter(a => /\\/panel/.test(a.getAttribute('href') || '') || a.innerText.trim() === 'Panel').length")
    escena = page.evaluate("""() => { const e = document.querySelector('#inicio-hero [data-hero=escena]');
        const f = document.querySelector('#inicio-hero img');
        return { fondo: e ? getComputedStyle(e).backgroundImage : '', frasco: f ? f.naturalWidth : 0 }; }""")
    page.goto(base + "/catalogo", wait_until="domcontentloaded")
    esperar_catalogo(page)
    catalogo = texto_completo(page)
    abrir_ficha(page, 0)
    ficha = page.locator("[role=dialog]").first.inner_text()
    page.goto(base + "/panel", wait_until="domcontentloaded")
    try:
        page.wait_for_selector("text=Ingresar con Google", timeout=20000)
        panel_ok = True
    except Exception:
        panel_ok = False
    ctx.close()

    if quiere("CONFIANZA-1"):
        req = {"seña 50 %": r"se[ñn]a del 50\s?%|50\s?% de se[ñn]a", "transferencia o efectivo": r"transferencia o efectivo",
               "todo el pais": r"todo el pa[ií]s", "gratis desde $ 60.000": r"gratis desde \$\s?60\.000",
               "Cordoba retiro o domicilio": r"retir[aá]s", "fecha por WhatsApp": r"fecha por whatsapp"}
        faltan = [k for k, rx in req.items() if not re.search(rx, portada, re.I)]
        chk("CONFIANZA-1 portada", "confianza", "alta", "La portada dice pago, seña, envio, Cordoba y plazo",
            not faltan, "falta: " + ", ".join(faltan) if faltan else "los cuatro datos estan")
    if quiere("CONTENIDO-1"):
        todo = "\n".join([portada, catalogo, ficha, RESULTADOS_TEXTOS.get("cajon", "")])
        bajo = todo.lower()
        contradice = "retiro los viernes" in bajo and "llega los viernes" in bajo
        plural = sorted(set(re.findall(r"\b(escribinos|nosotros|te abrimos|no pudimos|un asesor)\b", bajo)))
        guiones = len(re.findall(r"[—–]", todo))
        viernes = re.findall(r"[^.\n]*los viernes[^.\n]*", todo, re.I)
        chk("CONTENIDO-1", "contenido", "media",
            "Sin 'retiro'/'llega los viernes' a la vez, sin voz plural y sin guiones largos visibles",
            not contradice and not plural and guiones == 0,
            f"contradiccion: {contradice}; plural: {plural or 'no'}; guiones largos: {guiones}"
            + (f"; aviso, 'los viernes' sigue en: {[v.strip()[:70] for v in viernes]}" if viernes else ""))
    if quiere("PANEL-1"):
        chk("PANEL-1", "contenido", "baja", "El pie publico no enlaza al panel y /panel sigue cargando el ingreso",
            pie_panel == 0 and panel_ok, f"enlaces a panel en el pie: {pie_panel}; /panel muestra 'Ingresar con Google': {panel_ok}")
    if quiere("REG-1"):
        chk("REG-1 portada", "visual", "alta", "La portada sigue mostrando la escena del hero y los frascos",
            "duna" in escena["fondo"] and escena["frasco"] > 0, f"fondo: {escena['fondo'][-40:]}; frascos naturalWidth {escena['frasco']}")


# ---------------------------------------------------------------------------
# Etapa 3A (17/10/2026): link por perfume, ficha, tarjeta, agregar sin perder
# el lugar, familias, parecidos, "Ver mas" y los pendientes tecnicos.
#
# Contrato con la pagina (atributos que estos chequeos buscan):
#   ficha            [role=dialog][data-dialogo=ficha]
#   hoja de tamanos  [role=dialog][data-dialogo=tamanos], filas [data-qa=fila-tamano]
#   ficha            [data-qa=frase], [data-qa=piramide] [data-qa=nota],
#                    [data-qa=codigo], [data-qa=ahorro], [data-qa=verificar] a,
#                    [data-qa=agregar-ficha], [data-qa=parecido]
#   tarjeta          [data-qa=notas], + con data-estado
#   aviso            [data-qa=aviso-agregado] (role=status)
#   filtros          [data-qa=filtro-para], [data-qa=filtro-familia], [data-qa=filtro-minis]
#   ver mas          [data-qa=ver-mas]
# ---------------------------------------------------------------------------

FICHA = "[role=dialog][data-dialogo=ficha]"
HOJA = "[role=dialog][data-dialogo=tamanos]"


def catalogo_con_datos(browser, op, ruta="/catalogo", esperar=True):
    """Abre una pagina y guarda las filas de products que manda la base."""
    ctx, page = nuevo(browser, op)
    datos = {}

    def guardar(resp):
        if "/rest/v1/products" in resp.url and resp.request.method == "GET":
            try:
                datos["filas"] = resp.json()
            except Exception:
                pass
    page.on("response", guardar)
    page.goto(BASE + ruta, wait_until="domcontentloaded")
    if esperar:
        esperar_catalogo(page)
    return ctx, page, datos


def activos(datos):
    return [p for p in datos.get("filas", []) if p.get("activo") and p.get("presentaciones")]


def pres_activas(p):
    return sorted([x for x in (p.get("presentaciones") or []) if x.get("activo", True) is not False and x.get("ml")],
                  key=lambda x: x["ml"])


def ficha_abierta(page):
    return page.locator(FICHA).count() > 0


def esperar_ficha(page, timeout=12000):
    try:
        page.wait_for_selector(FICHA, timeout=timeout)
        page.wait_for_timeout(500)
        return True
    except Exception:
        return False


def slug_de_url(url):
    q = urllib.parse.urlparse(url).query
    return urllib.parse.parse_qs(q).get("aroma", [None])[0]


def e3_a1(browser, base):
    ctx, page, datos = catalogo_con_datos(browser, MOVIL)
    page.locator("article").first.locator("button").first.click()
    abre = esperar_ficha(page)
    url_ficha = page.url
    slug = slug_de_url(url_ficha)
    titulo = page.evaluate(f"() => document.querySelector('{FICHA}')?.getAttribute('aria-label') || ''") if abre else ""
    page.go_back()
    page.wait_for_timeout(900)
    cerro = not ficha_abierta(page) and not page.locator("[role=dialog]").count()
    ruta = urllib.parse.urlparse(page.url).path
    arts = page.locator("article").count()
    chk("E3-A1 atras", "conversion", "alta",
        "Abrir la ficha pone ?aroma= en la direccion y 'atras' la cierra quedandose en /catalogo",
        abre and bool(slug) and cerro and ruta.rstrip("/") == "/catalogo" and arts > 0,
        f"ficha abierta: {abre}; url: {url_ficha.replace(base, '')}; despues de atras: {page.url.replace(base, '')}, dialogo cerrado {cerro}, {arts} tarjetas")
    if not slug:
        # Produccion vieja: se toma un slug real de la base para probar la entrada directa.
        filas = activos(datos)
        slug = filas[0]["slug"] if filas else "unlock-sauvage-hom"
        titulo = (filas[0].get("inspirado_en") or filas[0].get("nombre")) if filas else "Sauvage"
    ctx.close()

    ctx, page, _ = catalogo_con_datos(browser, MOVIL, f"/catalogo?aroma={slug}")
    ok = esperar_ficha(page)
    visto = page.evaluate(f"() => document.querySelector('{FICHA}')?.getAttribute('aria-label') || ''") if ok else ""
    # Cerrar una ficha a la que se entro por link no puede sacar de la tienda.
    if ok:
        page.locator(f"{FICHA} button[aria-label='Cerrar']").click()
        page.wait_for_timeout(700)
    queda = urllib.parse.urlparse(page.url).path.rstrip("/") == "/catalogo" and not ficha_abierta(page)
    chk("E3-A1 link", "conversion", "alta", "Entrar a /catalogo?aroma=<slug> abre esa ficha y cerrarla deja en /catalogo",
        ok and visto == titulo and queda, f"/catalogo?aroma={slug}: ficha {visto or 'no abre'} (esperado {titulo}); al cerrar: {page.url.replace(base, '')}")
    ctx.close()

    ctx, page = nuevo(browser, MOVIL)
    errores = []
    page.on("pageerror", lambda e: errores.append(str(e)[:80]))
    page.goto(base + "/catalogo?aroma=no-existe-este-aroma", wait_until="domcontentloaded")
    esperar_catalogo(page)
    page.wait_for_timeout(800)
    sin = not page.locator("[role=dialog]").count()
    chk("E3-A1 inexistente", "conversion", "media", "Un ?aroma= que no existe se ignora: catalogo normal, sin ficha ni errores",
        sin and not errores and page.locator("article").count() > 0,
        f"dialogo: {not sin}; errores JS: {errores or 'ninguno'}; url final: {page.url.replace(base, '')}")
    ctx.close()

    ctx, page = nuevo(browser, MOVIL)
    page.goto(base + f"/?aroma={slug}", wait_until="load")
    # La portada hidrata despues de `load` y del pedido a la base: con el CDN
    # en frio, justo despues de un deploy, tarda.
    ok = esperar_ficha(page, 30000)
    chk("E3-A1 portada", "conversion", "media", "/?aroma=<slug> abre la ficha encima de la portada",
        ok, f"ficha abierta: {ok}")
    ctx.close()

    ctx, page = nuevo(browser, ESCRITORIO)
    ctx.grant_permissions(["clipboard-read", "clipboard-write"], origin=base)
    page.goto(base + f"/catalogo?aroma={slug}", wait_until="domcontentloaded")
    copiado, boton = "", False
    if esperar_ficha(page, 20000):
        b = page.locator(f"{FICHA} button:has-text('Copiar link')")
        boton = b.count() > 0
        if boton:
            b.first.click()
            page.wait_for_timeout(500)
            copiado = page.evaluate("() => navigator.clipboard.readText().catch(() => '')")
    chk("E3-A1 copiar", "conversion", "media", "La ficha tiene 'Copiar link' y copia /catalogo?aroma=<slug>",
        boton and copiado.endswith(f"/catalogo?aroma={slug}"), f"boton: {boton}; copiado: {copiado or 'nada'}")
    ctx.close()


def e3_a2_a3(browser, base):
    ctx, page, datos = catalogo_con_datos(browser, MOVIL)
    filas = {p["slug"]: p for p in activos(datos)}
    # Un aroma con piramide, familia y dos tamanos (Sauvage, si esta).
    elegido = filas.get("unlock-sauvage-hom") or next(
        (p for p in filas.values() if p.get("nota_salida") and len(pres_activas(p)) > 1), None)
    ctx.close()
    if not elegido:
        chk("E3-A2", "error", "-", "No hay un aroma con notas y dos tamanos para probar la ficha", False, "")
        return
    slug = elegido["slug"]
    ctx, page = nuevo(browser, MOVIL)
    page.goto(base + f"/catalogo?aroma={slug}", wait_until="domcontentloaded")
    if not esperar_ficha(page, 20000):
        # Produccion vieja: se abre tocando la tarjeta del buscador.
        esperar_catalogo(page)
        buscar(page, elegido.get("inspirado_en") or elegido["nombre"])
        abrir_ficha(page, 0)
    dlg = FICHA if page.locator(FICHA).count() else "[role=dialog]"
    m = page.evaluate("""(dlg) => {
      const d = document.querySelector(dlg);
      const vh = innerHeight;
      const vis = (el) => { if (!el) return false; const r = el.getBoundingClientRect();
        if (!(r.width > 0 && r.top >= 0 && r.bottom <= vh)) return false;
        const e = document.elementFromPoint(r.left + r.width / 2, r.top + Math.min(r.height / 2, 10));
        return !!e && (e === el || el.contains(e) || e.contains(el)); };
      const filas = [...d.querySelectorAll('[aria-label="Elegir presentación"] button')];
      const precio = filas[0] && (filas[0].querySelector('[data-qa=precio]') || filas[0]);
      const boton = d.querySelector('[data-qa=agregar-ficha]') || [...d.querySelectorAll('button')].find(b => /agregar al pedido/i.test(b.textContent));
      const foto = d.querySelector('img');
      const piramide = d.querySelector('[data-qa=piramide]') || d.querySelector('[class*=piramide]');
      const ins = [...d.querySelectorAll('p, span')].find(e => e.textContent.trim() === 'Versión inspirada en el perfume original.');
      return {
        precio: vis(precio), boton: vis(boton),
        foto: foto ? Math.round(foto.getBoundingClientRect().height) : 0, vh,
        filaAntes: !!(filas[0] && piramide) && filas[0].getBoundingClientRect().top < piramide.getBoundingClientRect().top,
        notas: d.querySelectorAll('[data-qa=piramide] [data-qa=nota]').length,
        etapas: [...d.querySelectorAll('[data-qa=piramide] [data-qa=etapa]')].map(e => e.textContent.trim()),
        frase: (d.querySelector('[data-qa=frase]')?.textContent || '').trim(),
        insColor: ins ? getComputedStyle(ins).color : null,
      };
    }""", dlg)
    chk("E3-A2 primer", "conversion", "alta", "Ficha a 390x844: precio y boton de agregar en el primer pantallazo, sin bajar",
        m["precio"] and m["boton"], f"precio a la vista: {m['precio']}; boton a la vista y tocable: {m['boton']}")
    chk("E3-A2 orden", "conversion", "media", "Ficha a 390: foto <= 46% del alto y los tamanos antes de la piramide",
        m["foto"] <= m["vh"] * 0.46 + 1 and m["filaAntes"], f"foto {m['foto']} px de {m['vh']} ({m['foto'] / max(m['vh'], 1):.0%}); tamanos antes de la piramide: {m['filaAntes']}")
    esperadas = sum(len([n for n in (elegido.get(k) or '').split(',') if n.strip()]) for k in ("nota_salida", "nota_corazon", "nota_fondo"))
    chk("E3-A2 notas", "visual", "media", "La piramide va en tres filas (Salida, Corazon, Fondo) con una pastilla por nota",
        m["etapas"] == ["Salida", "Corazón", "Fondo"] and m["notas"] == esperadas,
        f"filas: {m['etapas'] or 'ninguna'}; pastillas {m['notas']} de {esperadas} notas")
    momento = {"verano": "Para el calor.", "invierno": "Para el frío.", "todo": "Todo el año."}.get(elegido.get("momento"), "")
    chk("E3-A2 frase", "contenido", "media", "Frase corta desde familia y momento (sin inventar)",
        bool(m["frase"]) and (not momento or m["frase"].endswith(momento)),
        f"frase: '{m['frase'] or 'ninguna'}' (familia '{elegido.get('familia_olfativa')}', momento '{elegido.get('momento')}')")
    acento = "rgb(224, 112, 138)"
    chk("E3-A2 aviso", "visual", "baja", "'Versión inspirada en el perfume original.' sigue y ya no va en el acento",
        m["insColor"] is not None and m["insColor"] != acento, f"color: {m['insColor']}")
    # La barra queda a la vista al bajar la hoja.
    barra = page.evaluate("""(dlg) => { const d = document.querySelector(dlg);
      const b = d.querySelector('[data-qa=agregar-ficha]') || [...d.querySelectorAll('button')].find(x => /agregar al pedido/i.test(x.textContent));
      const res = [];
      for (const f of [0.5, 1]) { d.scrollTop = (d.scrollHeight - d.clientHeight) * f;
        const r = b.getBoundingClientRect(); res.push(r.top >= 0 && r.bottom <= innerHeight); }
      d.scrollTop = 0; return res; }""", dlg)
    chk("E3-A2 barra", "conversion", "media", "El boton de agregar queda fijo abajo mientras se baja la ficha (390)",
        all(barra), f"a la vista a mitad y al final de la hoja: {barra}")

    # A3: codigo y ahorro de cada tamano, contra la base.
    filas_dom = page.evaluate("""(dlg) => [...document.querySelectorAll(dlg + ' [aria-label="Elegir presentación"] button')].map(b => ({
        txt: b.innerText, codigo: (b.querySelector('[data-qa=codigo]')?.innerText || ''),
        ahorro: (b.querySelector('[data-qa=ahorro]')?.innerText || '') }))""", dlg)
    pres = pres_activas(elegido)
    cods, aho = [], []
    for fila, p in zip(filas_dom, pres):
        cod = re.sub(r"\D", "", fila["codigo"])
        cods.append(cod == str(p.get("codigo")) and "Código" in fila["codigo"])
        dif = (p.get("precio_anterior") or 0) - p["precio"]
        valor = int(re.sub(r"\D", "", fila["ahorro"]) or 0)
        aho.append(valor == dif if dif > 0 else not fila["ahorro"])
    chk("E3-A3 codigo", "confianza", "alta", "Cada tamano de la ficha muestra 'Codigo NNNNNNNN' igual al de la base",
        len(filas_dom) == len(pres) and all(cods),
        f"{sum(cods)}/{len(pres)} codigos; base: {[p.get('codigo') for p in pres]}; ficha: {[f['codigo'] for f in filas_dom]}")
    chk("E3-A3 ahorro", "confianza", "alta", "'Ahorras $ X' = precio de lista - precio, solo si hay rebaja",
        len(filas_dom) == len(pres) and all(aho),
        f"base: {[(p.get('precio_anterior') or 0) - p['precio'] for p in pres]}; ficha: {[f['ahorro'] for f in filas_dom]}")
    ver = page.evaluate("""(dlg) => { const v = document.querySelector(dlg + ' [data-qa=verificar]');
        const filas = [...document.querySelectorAll(dlg + ' [aria-label="Elegir presentación"] button')];
        const on = filas.find(b => b.getAttribute('aria-pressed') === 'true');
        return { txt: v ? v.innerText : '', href: v?.querySelector('a')?.getAttribute('href') || '', linea: on ? on.innerText : '' }; }""", dlg)
    sitio = "unlock.com.ar" if "Unlock" in ver["linea"] else "bagues.com.ar"
    chk("E3-A3 verificar", "confianza", "media", "Linea de la proveedora con link a la portada de su tienda, segun la linea elegida",
        sitio in ver["txt"] and ver["href"].rstrip("/") == f"https://{sitio}",
        f"linea elegida: {ver['linea'].splitlines()[1] if ver['linea'].count(chr(10)) else ver['linea'][:30]}; texto: '{ver['txt'][:90]}'; href {ver['href']}")
    ctx.close()


def e3_a4(browser, base):
    ctx, page, datos = catalogo_con_datos(browser, MOVIL)
    filas = {p["slug"]: p for p in activos(datos)}
    t = page.evaluate("""() => { const a = [...document.querySelectorAll('article')];
      return { pastillas: a.reduce((n, x) => n + x.querySelectorAll('[role=group] button').length, 0),
               inspirado: a.filter(x => /versi[oó]n inspirada/i.test(x.textContent)).length,
               notas: a.filter(x => (x.querySelector('[data-qa=notas]')?.textContent || '').trim()).length,
               vacias: a.filter(x => !(x.querySelector('[data-qa=notas]')?.textContent || '').trim()).map(x => x.querySelector('[class*=titulo]')?.textContent.trim()),
               total: a.length,
               peso: getComputedStyle(a[0].querySelector('[class*=titulo]')).fontWeight,
               fam: getComputedStyle(a[0].querySelector('[class*=titulo]')).fontFamily,
               aviso: !!document.querySelector('[class*=aviso]') && /referencia olfativa/.test(document.querySelector('[class*=aviso]').innerText) }; }""")
    # Sin notas ni familia en la base no hay linea que mostrar: esas no cuentan.
    con_datos = {(p.get("inspirado_en") or p.get("nombre")) for p in filas.values()
                 if p.get("nota_salida") or p.get("nota_corazon") or p.get("nota_fondo") or p.get("familia_olfativa")}
    faltan = [v for v in t["vacias"] if v in con_datos]
    chk("E3-A4 tarjeta", "visual", "alta", "Tarjeta a 390: sin pastillas ni 'version inspirada', nombre Cormorant 600 y linea de notas",
        t["pastillas"] == 0 and t["inspirado"] == 0 and t["notas"] > 0 and not faltan and t["peso"] == "600" and "ormorant" in t["fam"],
        f"pastillas {t['pastillas']}; 'version inspirada' en {t['inspirado']} tarjetas; notas en {t['notas']}/{t['total']}; nombre {t['fam'][:10]} {t['peso']}")
    chk("E3-A4 aviso", "confianza", "alta", "El aviso de la cabecera del catalogo sigue a la vista",
        t["aviso"], f"aviso corto con 'referencia olfativa': {t['aviso']}")
    # Un aroma de varios tamanos en la primera pagina.
    idx = page.evaluate("""() => [...document.querySelectorAll('article')].findIndex(a => /tamaños/.test(a.textContent))""")
    hoja = dict(abre=False, filas=0, esc=False, atras=False, fugas=-1)
    if idx >= 0:
        mas = page.locator("article").nth(idx).locator("button[aria-label^='Agregar']")
        mas.click()
        try:
            page.wait_for_selector(HOJA, timeout=6000)
            hoja["abre"] = True
        except Exception:
            pass
        if hoja["abre"]:
            page.wait_for_timeout(400)
            hoja["filas"] = page.locator(f"{HOJA} [data-qa=fila-tamano]").count()
            fugas = 0
            for _ in range(8):
                page.keyboard.press("Tab")
                if not page.evaluate(f"() => !!document.activeElement.closest('{HOJA}')"):
                    fugas += 1
            hoja["fugas"] = fugas
            page.keyboard.press("Escape")
            page.wait_for_timeout(500)
            hoja["esc"] = not page.locator(HOJA).count()
            mas.click()
            page.wait_for_selector(HOJA, timeout=6000)
            page.wait_for_timeout(300)
            page.go_back()
            page.wait_for_timeout(700)
            hoja["atras"] = not page.locator(HOJA).count() and urllib.parse.urlparse(page.url).path.rstrip("/") == "/catalogo"
    chk("E3-A4 hoja", "conversion", "alta", "390: el + de un aroma con varios tamanos abre una hoja (foco adentro, Escape y 'atras' la cierran)",
        hoja["abre"] and hoja["filas"] >= 2 and hoja["fugas"] == 0 and hoja["esc"] and hoja["atras"],
        f"tarjeta {idx}; abre {hoja['abre']}; filas {hoja['filas']}; fugas {hoja['fugas']}/8; Escape {hoja['esc']}; atras {hoja['atras']}")
    tact = area_tactil(page, "article button[aria-label^='Agregar']", "+ tarjeta")
    if idx >= 0:
        page.locator("article").nth(idx).locator("button[aria-label^='Agregar']").click()
        try:
            page.wait_for_selector(HOJA, timeout=4000)
            tact += area_tactil(page, f"{HOJA} [data-qa=fila-tamano]", "fila hoja")
            tact += area_tactil(page, f"{HOJA} button[aria-label='Cerrar']", "cerrar hoja")
        except Exception:
            tact.append(dict(nombre="fila hoja", falta=True))
    chicos = [f"{m['nombre']} {m.get('w')}x{m.get('h')}" for m in tact if m.get("falta") or m["fallan"]]
    chk("E3-A4 tactil", "accesibilidad", "media", "+ de la tarjeta y filas de la hoja con 44x44 reales",
        not chicos, "chicas: " + "; ".join(dict.fromkeys(chicos)) if chicos else f"{len(tact)} controles")
    ctx.close()

    # Un solo tamano: el + agrega directo, sin hoja.
    ctx, page, _ = catalogo_con_datos(browser, MOVIL)
    page.evaluate("() => { localStorage.clear(); sessionStorage.clear(); }")
    idx1 = page.evaluate("""() => [...document.querySelectorAll('article')].findIndex(a => !/tamaños/.test(a.textContent))""")
    directo = False
    if idx1 >= 0:
        page.locator("article").nth(idx1).locator("button[aria-label^='Agregar']").click()
        page.wait_for_timeout(900)
        directo = not page.locator(HOJA).count() and (
            page.locator("[role=dialog][aria-label='Tu pedido']").count() > 0 or page.locator("[data-qa=aviso-agregado]").count() > 0)
    chk("E3-A4 directo", "conversion", "media", "Con un solo tamano, el + agrega directo (sin hoja)",
        directo, f"tarjeta {idx1}: agrego sin hoja {directo}")
    ctx.close()

    alturas = {}
    for nombre, op, cols in (("390", MOVIL, 2), ("1440", ESCRITORIO, 4)):
        ctx, page, _ = catalogo_con_datos(browser, op)
        page.evaluate("""() => { const s = document.createElement('style'); s.textContent = 'article { content-visibility: visible !important; }'; document.head.appendChild(s); }""")
        page.wait_for_timeout(300)
        hs = page.evaluate("() => [...document.querySelectorAll('article')].map(a => Math.round(a.getBoundingClientRect().height))")
        filas_h = [hs[i:i + cols] for i in range(0, len(hs), cols)]
        alturas[nombre] = [max(f) - min(f) for f in filas_h if f]
        ctx.close()
    chk("E3-A4 altura", "visual", "media", "Las tarjetas de una misma fila tienen la misma altura (390 y 1440)",
        all(max(v, default=0) <= 1 for v in alturas.values()),
        "; ".join(f"{k}: diferencia maxima {max(v, default=0)} px" for k, v in alturas.items()))

    ctx, page = nuevo(browser, MOVIL)
    page.goto(base + "/", wait_until="load")
    try:
        # Los destacados llegan despues de hidratar y de que conteste la base.
        page.wait_for_function("() => [...document.querySelectorAll('section [class*=nombre]')].some(e => getComputedStyle(e).fontFamily.includes('ormorant'))", timeout=25000)
        peso = page.evaluate("""() => { const n = [...document.querySelectorAll('[class*=nombre]')].find(e => e.closest('section') && getComputedStyle(e).fontFamily.includes('ormorant'));
            return n ? getComputedStyle(n).fontWeight : null; }""")
    except Exception:
        peso = None
    chk("E3-A4 destacados", "visual", "baja", "Los destacados de la portada usan el mismo peso de Cormorant que la tarjeta (600)",
        peso == "600", f"peso del nombre en destacados: {peso}")
    ctx.close()


def e3_a5(browser, base):
    ctx, page, _ = catalogo_con_datos(browser, MOVIL)
    page.evaluate("() => { localStorage.clear(); sessionStorage.clear(); }")
    page.reload(wait_until="domcontentloaded")
    esperar_catalogo(page)
    cajon = "[role=dialog][aria-label='Tu pedido']"

    def mas(i):
        if page.locator(cajon).count():
            cerrar_cajon(page)
        page.locator("article").nth(i).locator("button[aria-label^='Agregar']").click()
        # La hoja (si el aroma tiene varios tamanos) aparece enseguida; no se
        # espera de mas: la tilde dura 1,2 s.
        page.wait_for_timeout(350)
        if page.locator(HOJA).count():
            page.locator(f"{HOJA} [data-qa=agregar-hoja]").click()
        page.wait_for_timeout(150)

    mas(0)
    page.wait_for_timeout(500)
    primero = page.locator(cajon).count() > 0
    if primero:
        cerrar_cajon(page)
    mas(1)
    estado = page.evaluate("() => document.querySelectorAll('article')[1].querySelector('button[aria-label^=\"Agregar\"]').dataset.estado || ''")
    page.wait_for_timeout(300)
    segundo_cajon = page.locator(cajon).count() > 0
    aviso = page.evaluate("""() => { const a = document.querySelector('[data-qa=aviso-agregado]');
        return a ? { txt: a.innerText, rol: a.getAttribute('role') || a.getAttribute('aria-live') || '' } : null; }""")
    page.wait_for_timeout(1400)
    estado_despues = page.evaluate("() => document.querySelectorAll('article')[1].querySelector('button[aria-label^=\"Agregar\"]').dataset.estado || ''")
    page.wait_for_timeout(3300)
    se_fue = not page.evaluate("() => { const a = document.querySelector('[data-qa=aviso-agregado]'); return !!a && getComputedStyle(a).visibility !== 'hidden' && a.innerText.trim() !== ''; }")
    chk("E3-A5 cajon", "conversion", "alta", "El cajon se abre solo en el primer agregado; desde el segundo sube una barra que se va sola",
        primero and not segundo_cajon and bool(aviso) and "Ver pedido (2)" in (aviso or {}).get("txt", "") and se_fue,
        f"primero abre cajon: {primero}; segundo abre cajon: {segundo_cajon}; barra: {(aviso or {}).get('txt', 'no hay').replace(chr(10), ' | ')[:90]}; se va a los 4 s: {se_fue}")
    chk("E3-A5 tilde", "visual", "media", "El + pasa a tilde al agregar y vuelve a + despues de 1,2 s",
        estado == "hecho" and estado_despues != "hecho", f"al agregar: '{estado}'; a los 1,7 s: '{estado_despues}'")
    # Ver pedido desde la barra.
    mas(2)
    page.wait_for_timeout(300)
    abre = False
    b = page.locator("[data-qa=aviso-agregado] button")
    if b.count():
        b.first.click()
        try:
            page.wait_for_selector(cajon, timeout=4000)
            abre = True
        except Exception:
            pass
    chk("E3-A5 ver", "conversion", "media", "'Ver pedido' en la barra abre el cajon",
        abre and (aviso or {}).get("rol") in ("status", "polite"), f"abre: {abre}; anuncio: {(aviso or {}).get('rol')}")
    ctx.close()

    ctx = browser.new_context(**MOVIL, reduced_motion="reduce")
    proteger_base(ctx)
    page = ctx.new_page()
    page.goto(base + "/catalogo", wait_until="domcontentloaded")
    esperar_catalogo(page)
    page.evaluate("() => { localStorage.clear(); sessionStorage.setItem('bgw-cajon-visto', '1'); }")
    mas(0)
    dur = page.evaluate("""() => { const a = document.querySelector('[data-qa=aviso-agregado]'); if (!a) return null;
        const cs = getComputedStyle(a); return [cs.transitionDuration, cs.animationDuration].join(' '); }""")
    quieto = dur is not None and all(float(x.rstrip("ms").rstrip("s") or 0) <= (0.001 if x.endswith("s") and not x.endswith("ms") else 1)
                                     for x in re.findall(r"[\d.]+m?s", dur))
    chk("E3-A5 movimiento", "accesibilidad", "baja", "Con prefers-reduced-motion la barra aparece sin movimiento",
        quieto, f"duraciones: {dur}")
    ctx.close()


def e3_a6(browser, base):
    ctx, page, datos = catalogo_con_datos(browser, MOVIL)
    total = conteo(page)[0]
    fams = page.evaluate("() => [...document.querySelectorAll('[data-qa=filtro-familia] button')].map(b => b.innerText.replace('✓', '').trim())")
    cuentas = {}
    for i, nombre in enumerate(fams):
        page.locator("[data-qa=filtro-familia] button").nth(i).click()
        page.wait_for_timeout(350)
        cuentas[nombre] = (conteo(page)[0], urllib.parse.parse_qs(urllib.parse.urlparse(page.url).query).get("familia", [""])[0])
        page.locator("[data-qa=filtro-familia] button").nth(i).click()
        page.wait_for_timeout(250)
    chk("E3-A6 familias", "conversion", "alta", "Cinco familias; cada una devuelve > 0 aromas y queda en la URL (?familia=)",
        len(fams) == 5 and all(n > 0 and f for n, f in cuentas.values()),
        "; ".join(f"{k}={n} (?familia={f})" for k, (n, f) in cuentas.items()) or "no hay filtro de familia")
    para = page.evaluate("() => [...document.querySelectorAll('[data-qa=filtro-para] button')].map(b => b.innerText.replace('✓', '').trim())")
    c = {}
    for i, nombre in enumerate(para):
        page.locator("[data-qa=filtro-para] button").nth(i).click()
        page.wait_for_timeout(350)
        c[nombre] = conteo(page)[0]
    chk("E3-A6 para", "conversion", "media", "'Para': El, Ella, Todos; El + Ella cubren todo (unisex en las dos)",
        para == ["Él", "Ella", "Todos"] and c.get("Todos") == total and c.get("Él", 0) + c.get("Ella", 0) >= total and c.get("Él", 0) < total,
        f"pastillas {para}; cuentas {c}; total {total}")
    filas = activos(datos)
    rebajados = sum(1 for p in filas if any((x.get("precio_anterior") or 0) > x["precio"] for x in pres_activas(p)))
    hay_reb = page.locator("[class*=chips] button:has-text('Rebajados'), [data-qa^=filtro] button:has-text('Rebajados')").count() > 0
    debe = rebajados <= 0.8 * len(filas)
    minis = page.locator("[data-qa=filtro-minis]").count() > 0
    hay_minis = any(x["ml"] <= 30 for p in filas for x in pres_activas(p))
    chk("E3-A6 rebajados", "conversion", "media", "'Rebajados' se oculta solo si cubre mas del 80 %; 'Minis' esta si hay tamanos <= 30 ml",
        hay_reb == debe and minis == hay_minis,
        f"rebajados {rebajados}/{len(filas)} -> pastilla {'a la vista' if hay_reb else 'oculta'} (debe {'verse' if debe else 'ocultarse'}); minis {minis} (hay {hay_minis})")
    anchos = page.evaluate("() => [...document.querySelectorAll('[data-qa^=filtro-]')].map(g => g.scrollWidth - g.clientWidth)")
    chk("E3-A6 pastillas", "visual", "baja", "Las pastillas de filtro bajan de linea, sin tira que se corta (390)",
        bool(anchos) and max(anchos) <= 1, f"desborde por grupo: {anchos}")
    ctx.close()

    ctx, page, _ = catalogo_con_datos(browser, MOVIL, "/catalogo?familia=amaderados&para=el")
    n = conteo(page)[0]
    activas = page.evaluate("() => [...document.querySelectorAll('[data-qa^=filtro-] button[aria-pressed=true]')].map(b => b.innerText.replace('✓', '').trim())")
    page.locator("article").first.locator("button").first.click()
    abre = esperar_ficha(page)
    page.go_back()
    page.wait_for_timeout(800)
    n2 = conteo(page)[0]
    url2 = page.url.replace(base, "")
    chk("E3-A6 url", "conversion", "media", "Entrar con ?familia=amaderados&para=el aplica los filtros y sobreviven a abrir una ficha y 'atras'",
        0 < n < total and "Amaderados" in activas and "Él" in activas and abre and n2 == n and "familia=amaderados" in url2,
        f"{n} de {total} aromas; activas {activas}; ficha {abre}; despues de atras {n2} en {url2}")
    ctx.close()


def e3_a7(browser, base):
    ctx, page, datos = catalogo_con_datos(browser, MOVIL)
    page.locator("article").first.locator("button").first.click()
    ok = esperar_ficha(page)
    p = page.evaluate(f"""() => {{ const d = document.querySelector('{FICHA}'); if (!d) return null;
        return {{ titulo: d.getAttribute('aria-label'),
                 items: [...d.querySelectorAll('[data-qa=parecido]')].map(b => b.innerText.replace(/\\n+/g, ' | ')) }}; }}""") if ok else None
    cambia = False
    if p and p["items"]:
        page.locator(f"{FICHA} [data-qa=parecido]").first.click()
        page.wait_for_timeout(700)
        nuevo_t = page.evaluate(f"() => document.querySelector('{FICHA}')?.getAttribute('aria-label')")
        cambia = nuevo_t and nuevo_t != p["titulo"] and slug_de_url(page.url) is not None and p["items"][0].startswith(nuevo_t)
        page.go_back()
        page.wait_for_timeout(700)
        cambia = cambia and not page.locator("[role=dialog]").count()
    items = (p or {}).get("items", [])
    razones = all(("comparte:" in i or "también" in i) for i in items)
    chk("E3-A7 parecidos", "conversion", "media", "La ficha sugiere 3 aromas con la razon a la vista, ninguno es el mismo",
        len(items) == 3 and razones and all(not i.startswith((p or {}).get("titulo") + " |") for i in items),
        f"{(p or {}).get('titulo')}: {items or 'ninguno'}")
    chk("E3-A7 cambia", "conversion", "media", "Tocar un parecido cambia la ficha y el ?aroma=; 'atras' cierra la ficha",
        bool(cambia), f"cambia: {bool(cambia)}")
    ctx.close()


def e3_a8(browser, base):
    ctx, page, _ = catalogo_con_datos(browser, MOVIL)
    total = conteo(page)[0]
    pag = page.locator("nav[aria-label='Páginas del catálogo']").count()
    antes = page.locator("article").count()
    b = page.locator("[data-qa=ver-mas]")
    txt = b.first.inner_text() if b.count() else ""
    despues, url, tras = antes, page.url, antes
    if b.count():
        b.first.click()
        page.wait_for_timeout(600)
        despues = page.locator("article").count()
        url = page.url
        page.locator("article").nth(despues - 1).locator("button").first.click()
        esperar_ficha(page)
        page.go_back()
        page.wait_for_timeout(800)
        tras = page.locator("article").count()
    esperado = f"Ver 12 más (quedan {total - 12})"
    chk("E3-A8 ver mas", "conversion", "media", "390: sin paginador, 'Ver 12 mas (quedan N)' agrega 12 y guarda ?ver= (sobrevive a 'atras')",
        pag == 0 and txt.strip() == esperado and despues == antes + 12 and "ver=24" in url and tras == despues,
        f"paginador {pag}; boton '{txt.strip() or 'no hay'}' (esperado '{esperado}'); {antes} -> {despues}; url {url.replace(base, '')}; despues de ficha y atras {tras}")
    ctx.close()
    ctx, page, _ = catalogo_con_datos(browser, ESCRITORIO)
    pag = page.locator("nav[aria-label='Páginas del catálogo']").count()
    vm = page.locator("[data-qa=ver-mas]").count()
    chk("E3-A8 escritorio", "conversion", "baja", "1440: el paginador sigue y no hay 'Ver mas'", pag == 1 and vm == 0, f"paginador {pag}; ver mas {vm}")
    ctx.close()


def e3_a9(browser, base):
    ctx, page, _ = catalogo_con_datos(browser, MOVIL)
    page.evaluate("() => scrollTo(0, 900)")
    page.wait_for_timeout(500)
    y0 = page.evaluate("() => scrollY")
    idx = page.evaluate("""() => [...document.querySelectorAll('article')].findIndex(a => { const r = a.getBoundingClientRect(); return r.top > 80 && r.top < innerHeight - 300; })""")
    # Con el dedo, como en el celular (un clic de mouse deja el hover puesto).
    caja = page.locator("article").nth(max(idx, 0)).locator("button").first.bounding_box()
    page.touchscreen.tap(caja["x"] + caja["width"] / 2, caja["y"] + 40)
    abre = esperar_ficha(page) or page.locator("[role=dialog]").count() > 0
    page.wait_for_timeout(300)
    # Lo que se ve detras de la ficha: si el documento salto, la tarjeta ya no esta donde estaba.
    detras = page.evaluate("""(i) => { const a = document.querySelectorAll('article')[i]; return a ? Math.round(a.getBoundingClientRect().top) : null; }""", max(idx, 0))
    page.keyboard.press("Escape")
    page.wait_for_timeout(700)
    y1 = page.evaluate("() => scrollY")
    despues = page.evaluate("""(i) => { const a = document.querySelectorAll('article')[i]; return a ? Math.round(a.getBoundingClientRect().top) : null; }""", max(idx, 0))
    chk("E3-A9 scroll", "visual", "media", "390: abrir y cerrar la ficha no mueve la pagina de atras",
        abre and abs(y1 - y0) <= 2 and detras == despues,
        f"scrollY {y0} -> {y1}; tarjeta a {despues} px despues, {detras} px con la ficha abierta")
    ctx.close()
    res = {}
    for nombre, op, cols in (("390", MOVIL, 2), ("1440", ESCRITORIO, 4)):
        ctx, page, _ = catalogo_con_datos(browser, op)
        res[nombre] = page.evaluate("""(cols) => [...document.querySelectorAll('article img')].slice(0, cols).map(i => [i.loading, i.getAttribute('fetchpriority') || ''])""", cols)
        ctx.close()
    ok = all(all(l == "eager" for l, _ in v) and v and v[0][1] == "high" for v in res.values())
    chk("E3-A9 lcp", "rendimiento", "media", "Primera fila del catalogo con loading=eager y la primera foto con fetchpriority=high",
        ok, "; ".join(f"{k}: {v}" for k, v in res.items()))


# ---------------------------------------------------------------------------
# Etapa 3B (17/10/2026): primer pantallazo, tira del ciclo, "Como funciona"
# como chat, Nosotros en dos columnas, cinta con links, capturas de clientas,
# pulido de la ficha, limpieza y los dos cambios autorizados en la base.
#
# Contrato con la pagina:
#   hero             [data-hero=corona] (sello), [data-hero=escena] (banda en
#                    el celular), [data-qa=hero-datos] (dentro de
#                    [data-hero=meta]), [data-qa=hero-cta], [data-qa=hero-como]
#   ciclo            [data-qa=ciclo], la cifra en [data-qa=ciclo-dias]
#   como funciona    #como [data-qa=chat-pedido], #como ol[data-qa=pasos]
#   nosotros         #nosotros [data-qa=pagas] li, [data-qa=no-pagas] li
#   cinta            [data-hero=cinta] a[data-qa=cinta-aroma]
#   opiniones        #opiniones
#   ficha            [data-qa=ficha-media] (el contenedor de la foto)
# ---------------------------------------------------------------------------

ACENTO = "rgb(224, 112, 138)"
SEMANA = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]
SIETE = ["unlock-bad-boy", "unlock-one-million", "unlock-polo-blue", "unlock-polo-red",
         "unlock-creed-aventus", "unlock-rabanne-phantom", "unlock-rabanne-phantom-black"]
# Los que tienen ficha publica con familia y notas en unlock.com.ar o
# bagues.com.ar (ver docs/QA.md, etapa 3B). Phantom trae notas pero no familia;
# Polo Red no esta en ninguna de las dos tiendas.
CON_FAMILIA = ["unlock-bad-boy", "unlock-one-million", "unlock-polo-blue", "unlock-creed-aventus",
               "unlock-rabanne-phantom-black"]
CON_NOTAS = CON_FAMILIA + ["unlock-rabanne-phantom"]


def hoy_ar():
    """La fecha de hoy en Cordoba (UTC-3 todo el ano)."""
    import datetime
    return (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=3)).date()


def con_ciclo(ctx, dias):
    """Contesta settings con ciclo_hasta = hoy + dias (en Argentina)."""
    import datetime
    hasta = hoy_ar() + datetime.timedelta(days=dias)

    def manejar(route):
        if route.request.method != "GET":
            route.continue_()
            return
        resp = route.fetch()
        try:
            filas = resp.json()
            for f in (filas if isinstance(filas, list) else [filas]):
                f["ciclo_hasta"] = hasta.isoformat()
                f["ciclo_nombre"] = "Ciclo de prueba"
            route.fulfill(response=resp, body=json.dumps(filas), content_type="application/json")
        except Exception:
            route.fulfill(response=resp)
    ctx.route("**/rest/v1/settings*", manejar)
    return hasta


def portada_con_datos(browser, op, ciclo=None, movimiento=None):
    """Abre la portada, espera a que hidrate con los datos de la base y
    devuelve las filas de products."""
    extra = {"reduced_motion": movimiento} if movimiento else {}
    ctx = browser.new_context(**op, **extra)
    proteger_base(ctx)
    hasta = con_ciclo(ctx, ciclo) if ciclo is not None else None
    page = ctx.new_page()
    datos = {}

    def guardar(resp):
        if "/rest/v1/products" in resp.url and resp.request.method == "GET":
            try:
                datos["filas"] = resp.json()
            except Exception:
                pass
    page.on("response", guardar)
    page.goto(BASE + "/", wait_until="load")
    try:
        page.wait_for_function("() => /\\d/.test(document.querySelector('[data-hero=meta]')?.innerText || '')", timeout=30000)
    except Exception:
        pass
    page.wait_for_timeout(1200)
    return ctx, page, datos, hasta


def publicables(datos):
    return [p for p in activos(datos) if (p.get("nombre") or "").strip() and not re.fullmatch(r"\d+", p["nombre"].strip())
            and pres_activas(p)]


def e3_b1(browser, base):
    res = {}
    for nombre, op in (("664", dict(MOVIL, viewport={"width": 390, "height": 664})), ("844", MOVIL), ("1440", ESCRITORIO)):
        ctx, page, datos, _ = portada_con_datos(browser, op)
        res[nombre] = page.evaluate("""() => {
          const vh = innerHeight, q = (s) => document.querySelector(s);
          const caja = (el) => { if (!el) return null; const r = el.getBoundingClientRect();
            return { top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height) }; };
          const corona = q('[data-hero=corona]');
          const hijos = corona ? [...corona.children].map(c => Math.round(c.getBoundingClientRect().top)) : [];
          const marca = corona?.children[0];
          return {
            vh, titulo: caja(q('#inicio-hero h1')), datos: caja(q('[data-qa=hero-datos]')), cta: caja(q('[data-qa=hero-cta]')),
            textoDatos: (q('[data-qa=hero-datos]')?.innerText || '').replace(/\\s+/g, ' ').trim(),
            pesoDatos: q('[data-qa=hero-datos]') ? getComputedStyle(q('[data-qa=hero-datos]')).fontWeight : '',
            como: (() => { const c = q('[data-qa=hero-como]'); return c ? { tag: c.tagName, boton: c.classList.contains('tbtn'), href: c.getAttribute('href') } : null; })(),
            botones: document.querySelectorAll('#inicio-hero [data-hero=cta], #inicio-hero .tbtn:not([class*=promo])').length,
            ctaAncho: q('[data-qa=hero-cta]') ? Math.round(q('[data-qa=hero-cta]').getBoundingClientRect().width) : 0,
            corona: caja(corona), coronaTops: hijos, marcaPx: marca ? parseFloat(getComputedStyle(marca).fontSize) : 0,
            escena: caja(q('#inicio-hero [data-hero=escena]')),
            frascos: (() => { const f = q('#inicio-hero img'); return f ? { w: f.naturalWidth, src: f.currentSrc.split('/').pop() } : null; })(),
          };
        }""")
        res[nombre]["filas"] = publicables(datos)
        res[nombre]["html"] = page.request.get(BASE + "/").text() if nombre == "844" else ""
        ctx.close()

    def dentro(m, k):
        c = m.get(k)
        return bool(c) and c["top"] >= 0 and c["bottom"] <= m["vh"]

    m = res["664"]
    chk("E3-B1 664", "conversion", "alta", "390x664 (Instagram): titular, linea de datos y boton principal dentro de la pantalla",
        all(dentro(m, k) for k in ("titulo", "datos", "cta")),
        f"alto {m['vh']}; titulo {m['titulo']}; datos {m['datos']}; boton {m['cta']}")
    m = res["844"]
    chk("E3-B1 844", "conversion", "alta", "390x844: un solo boton a todo el ancho y 'Como funciona' como enlace de texto",
        dentro(m, "cta") and m["ctaAncho"] >= 340 and bool(m["como"]) and not m["como"]["boton"] and m["como"]["href"] == "#como",
        f"boton {m['cta']} de {m['ctaAncho']} px; como funciona: {m['como']}")
    filas = res["844"]["filas"]
    n = len(filas)
    desde = min((x["precio"] for p in filas for x in pres_activas(p) if x.get("precio")), default=None)
    desde_txt = f"{desde:,}".replace(",", ".") if desde else "?"
    txt = m["textoDatos"]
    servido = re.search(r'data-qa="hero-datos"[^>]*>(.*?)</p>', res["844"]["html"], re.S)
    servido_txt = re.sub(r"<[^>]+>", "", servido.group(1)) if servido else None
    chk("E3-B1 datos", "conversion", "alta", "Linea 'Desde $ X · N aromas · Envio a todo el pais' con X y N reales, sin numeros escritos en el HTML",
        bool(re.fullmatch(rf"Desde \$\s?{re.escape(desde_txt)} · {n} aromas · Envío a todo el país", txt))
        and servido_txt is not None and not re.search(r"\d", servido_txt) and m["pesoDatos"] == "600",
        f"se ve: '{txt}'; base: desde {desde_txt}, {n} aromas; HTML servido: '{(servido_txt or 'no hay')[:60]}'; peso {m['pesoDatos']}")
    sellos = {k: (v["corona"], v["coronaTops"], v["marcaPx"]) for k, v in res.items()}
    una_linea = all(c and len(t) >= 2 and max(t) - min(t) <= 4 and c["h"] <= 30 for c, t, _ in sellos.values())
    chk("E3-B1 sello", "visual", "media", "Sello GRUPO WOLF en una linea con 'Casa Bagués · Córdoba' al lado, mas chico (390 y 1440)",
        una_linea and res["844"]["marcaPx"] <= 16,
        "; ".join(f"{k}: alto {c['h'] if c else '-'} px, tops {t}, marca {px:.1f} px" for k, (c, t, px) in sellos.items()))
    e = res["844"]["escena"]
    prop = (e["h"] / m["vh"]) if e else 0
    chk("E3-B1 banda", "visual", "media", "390x844: la banda de frascos ocupa ~42 % del alto (36 a 46 %) y la imagen LCP es la misma",
        0.36 <= prop <= 0.46 and (res["844"]["frascos"] or {}).get("src") == "frascos-460.webp",
        f"banda {e['h'] if e else '-'} px de {m['vh']} ({prop:.0%}); frascos {res['844']['frascos']}")


def e3_b2(browser, base):
    import datetime
    res = {}
    for dias in (15, 2):
        ctx, page, _, hasta = portada_con_datos(browser, MOVIL, ciclo=dias)
        portada = page.evaluate("""() => { const c = document.querySelector('[data-qa=ciclo]');
            const d = document.querySelector('[data-qa=ciclo] [data-qa=ciclo-dias]');
            return c ? { txt: c.textContent.replace(/\\s+/g, ' ').trim(), color: d ? getComputedStyle(d).color : '' } : null; }""")
        # El cajon del pedido.
        page.locator("header button[aria-label^='Ver pedido']").click()
        try:
            page.wait_for_selector("[role=dialog][aria-label='Tu pedido'] [data-qa=ciclo]", timeout=6000)
            cajon = page.locator("[role=dialog][aria-label='Tu pedido'] [data-qa=ciclo]").inner_text().replace("\n", " ")
        except Exception:
            cajon = None
        ctx.close()
        # El catalogo, midiendo cuanto se mueve la pagina mientras llegan los datos.
        ctx = browser.new_context(**MOVIL)
        proteger_base(ctx)
        con_ciclo(ctx, dias)
        ctx.add_init_script("""window.__cls = 0; new PerformanceObserver((l) => { for (const e of l.getEntries())
            if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });""")
        page = ctx.new_page()
        page.goto(base + "/catalogo", wait_until="domcontentloaded")
        esperar_catalogo(page)
        page.wait_for_timeout(2500)
        catalogo = page.evaluate("() => document.querySelector('[data-qa=ciclo]')?.textContent.replace(/\\s+/g, ' ').trim() || null")
        cls = page.evaluate("window.__cls")
        ctx.close()
        res[dias] = dict(hasta=hasta, portada=portada, cajon=cajon, catalogo=catalogo, cls=round(cls, 3))

    r = res[15]
    esperado = f"hasta el {SEMANA[r['hasta'].weekday()]} {r['hasta'].day}"
    ok_txt = lambda t: bool(t) and esperado in t and "Quedan 15 días" in t and "Ciclo de prueba" in t
    chk("E3-B2 tira", "conversion", "media", "Con ciclo_hasta a 15 dias: 'Pedidos hasta el <dia> · Quedan 15 días' en portada, catalogo y cajon, sin mover el catalogo",
        ok_txt((r["portada"] or {}).get("txt")) and ok_txt(r["catalogo"]) and ok_txt(r["cajon"]) and r["cls"] < 0.02,
        f"esperado '{esperado}'; portada: {(r['portada'] or {}).get('txt')}; catalogo: {r['catalogo']}; cajon: {r['cajon']}; CLS catalogo {r['cls']}")
    u = res[2]
    chk("E3-B2 urgente", "conversion", "baja", "Con 3 dias o menos la cifra pasa al acento; con 15, no",
        bool(u["portada"]) and u["portada"]["color"] == ACENTO and "Quedan 2 días" in u["portada"]["txt"]
        and bool(r["portada"]) and r["portada"]["color"] != ACENTO,
        f"2 dias: {u['portada']}; 15 dias: color {(r['portada'] or {}).get('color')}")
    # Vencida (ayer) y la base real: nunca una fecha pasada.
    vistas = []
    for dias in (-1, None):
        ctx, page, _, _ = portada_con_datos(browser, MOVIL, ciclo=dias)
        p = page.locator("[data-qa=ciclo]").count()
        page.goto(base + "/catalogo", wait_until="domcontentloaded")
        esperar_catalogo(page)
        page.wait_for_timeout(1500)
        vistas.append((dias, p, page.locator("[data-qa=ciclo]").count()))
        ctx.close()
    chk("E3-B2 vencida", "contenido", "media", "Con ciclo_hasta vencido (o el de la base, si ya paso) la tira no aparece",
        vistas[0][1] == 0 and vistas[0][2] == 0,
        "; ".join(f"{'ayer' if d == -1 else 'base real'}: portada {p}, catalogo {c}" for d, p, c in vistas))


def e3_b3(browser, base):
    ctx, page, datos, _ = portada_con_datos(browser, MOVIL)
    codigos = {str(x.get("codigo")) for p in publicables(datos) for x in pres_activas(p) if x.get("codigo")}
    page.evaluate("() => document.getElementById('como')?.scrollIntoView()")
    page.wait_for_timeout(1500)
    m = page.evaluate("""() => { const c = document.getElementById('como'); if (!c) return null;
        const chat = c.querySelector('[data-qa=chat-pedido]');
        return { chat: chat ? chat.innerText : '', pasos: c.querySelectorAll('ol[data-qa=pasos] > li').length,
                 iconos: c.querySelectorAll('svg').length, todo: c.innerText }; }""")
    ctx.close()
    if not m:
        chk("E3-B3 chat", "confianza", "media", "'Como funciona' existe", False, "no hay #como")
        return
    cods = re.findall(r"\[(\d{8})\]", m["chat"])
    chk("E3-B3 chat", "confianza", "media", "'Como funciona' muestra el mensaje real de whatsapp.js con dos aromas y codigos de la base",
        len(cods) >= 2 and all(c in codigos for c in cods) and "Quiero hacer este pedido" in m["chat"],
        f"codigos en el chat: {cods} (en la base: {[c in codigos for c in cods]}); texto: '{m['chat'][:80]}'")
    chk("E3-B3 pasos", "visual", "media", "Sin iconos en circulos; los pasos en una lista ordenada de tres",
        m["iconos"] == 0 and m["pasos"] == 3, f"svg en la seccion: {m['iconos']}; pasos en <ol>: {m['pasos']}")


def e3_b4(browser, base):
    res = {}
    for nombre, op in (("390", MOVIL), ("1440", ESCRITORIO)):
        ctx, page, _, _ = portada_con_datos(browser, op)
        page.evaluate("() => document.getElementById('nosotros')?.scrollIntoView()")
        page.wait_for_timeout(900)
        res[nombre] = page.evaluate("""() => { const n = document.getElementById('nosotros'); if (!n) return null;
            const a = n.querySelector('[data-qa=pagas]'), b = n.querySelector('[data-qa=no-pagas]');
            return { pagas: a ? a.querySelectorAll('li').length : 0, nopagas: b ? b.querySelectorAll('li').length : 0,
              lado: a && b ? Math.abs(a.getBoundingClientRect().top - b.getBoundingClientRect().top) : null,
              palabras: n.innerText.split(/\\s+/).filter(Boolean).length, texto: n.innerText,
              marcas: n.querySelectorAll('svg').length + (n.innerText.match(/[✓✔✗✘×]/g) || []).length }; }""")
        ctx.close()
    a, b = res["390"], res["1440"]
    ok = all(r and r["pagas"] == 3 and r["nopagas"] == 3 and r["lado"] is not None and r["lado"] <= 4 and r["marcas"] == 0 for r in (a, b))
    chk("E3-B4 columnas", "confianza", "media", "Nosotros: 'Lo que pagás' y 'Lo que no pagás' lado a lado (390 y 1440), tres y tres, sin tildes ni cruces",
        ok, "; ".join(f"{k}: {r and {x: r[x] for x in ('pagas', 'nopagas', 'lado', 'marcas')}}" for k, r in res.items()))
    chk("E3-B4 texto", "contenido", "media", "La placa ya no es una pared de texto (<= 120 palabras) y conserva 'Somos Grupo Wolf, un emprendimiento familiar'",
        bool(a) and a["palabras"] <= 120 and "Somos Grupo Wolf, un emprendimiento familiar" in a["texto"],
        f"palabras: {a and a['palabras']}")


def e3_b5(browser, base):
    ctx, page, datos, _ = portada_con_datos(browser, MOVIL)
    slugs = {p["slug"] for p in publicables(datos)}
    links = page.evaluate("""() => [...document.querySelectorAll('[data-hero=cinta] a[data-qa=cinta-aroma]')]
        .filter(a => a.getAttribute('aria-hidden') !== 'true').map(a => a.getAttribute('href'))""")
    malos = [h for h in links if (urllib.parse.parse_qs(urllib.parse.urlparse(h or "").query).get("aroma") or [None])[0] not in slugs]
    abre, slug_url, esperado = False, None, None
    if links:
        cinta = page.locator("[data-hero=cinta]")
        cinta.scroll_into_view_if_needed()
        cinta.hover()
        page.wait_for_timeout(300)
        pausa = page.evaluate("() => getComputedStyle(document.querySelector('[data-hero=cinta] [class*=cintaPista]')).animationPlayState")
        primero = page.locator("[data-hero=cinta] a[data-qa=cinta-aroma]:not([aria-hidden=true])").first
        esperado = urllib.parse.parse_qs(urllib.parse.urlparse(primero.get_attribute("href")).query)["aroma"][0]
        primero.evaluate("(a) => a.click()")
        abre = esperar_ficha(page)
        slug_url = slug_de_url(page.url)
    else:
        pausa = None
    ctx.close()
    chk("E3-B5 links", "conversion", "media", "Cada nombre de la cinta es un link a su ficha (?aroma= de un aroma activo) y tocarlo la abre",
        len(links) >= 6 and not malos and abre and slug_url == esperado,
        f"{len(links)} links, {len(malos)} sin aroma activo; abre la ficha: {abre} ({slug_url} / {esperado})")
    ctx, page, _, _ = portada_con_datos(browser, MOVIL, movimiento="reduce")
    quieta = page.evaluate("() => { const p = document.querySelector('[data-hero=cinta] [class*=cintaPista]'); return p ? getComputedStyle(p).animationName : null; }")
    ctx.close()
    chk("E3-B5 pausa", "accesibilidad", "baja", "La cinta se pausa con el puntero encima y queda quieta con prefers-reduced-motion",
        pausa == "paused" and quieta == "none", f"con el puntero: {pausa}; movimiento reducido: animation-name {quieta}")


def e3_b6(browser, base):
    ctx, page, _, _ = portada_con_datos(browser, MOVIL)
    txt = texto_completo(page)
    hay = page.locator("#opiniones").count()
    ctx.close()
    chk("E3-B6 vacia", "confianza", "baja", "Sin capturas cargadas no hay seccion de opiniones (ni el titulo)",
        hay == 0 and "Lo que me escriben" not in txt, f"#opiniones: {hay}; titulo a la vista: {'Lo que me escriben' in txt}")


def e3_b7(browser, base):
    from io import BytesIO
    from PIL import Image
    ctx, page, datos = catalogo_con_datos(browser, MOVIL)
    # Un aroma con dos tamanos y rebaja en los dos (para ver el ultimo "Ahorras").
    elegido = next((p for p in activos(datos) if len(pres_activas(p)) >= 2
                    and all((x.get("precio_anterior") or 0) > x["precio"] for x in pres_activas(p))), None)
    ctx.close()
    ctx, page = nuevo(browser, MOVIL)
    page.goto(base + f"/catalogo?aroma={elegido['slug']}", wait_until="domcontentloaded")
    esperar_ficha(page, 20000)
    page.wait_for_timeout(1200)
    r = page.evaluate("""() => { const d = document.querySelector('[data-dialogo=ficha]');
        const img = d.querySelector('img'); const m = d.querySelector('[data-qa=ficha-media]') || img.closest('div').parentElement;
        const a = m.getBoundingClientRect(), b = img.getBoundingClientRect();
        return { m: [a.left, a.top, a.width, a.height], i: [b.left, b.top, b.width, b.height] }; }""")
    png = Image.open(BytesIO(page.screenshot())).convert("RGB")
    esc = png.width / 390
    mx, my, mw, mh = r["m"]
    ix, iy, iw, ih = r["i"]
    banda = round(ix - mx)

    def media(x0, x1, y0, y1):
        px = [png.getpixel((int(x * esc), int(y * esc))) for x in range(int(x0), int(x1)) for y in range(int(y0), int(y1), 6)]
        return tuple(sum(c[k] for c in px) / len(px) for k in range(3)) if px else None
    # Por franjas de 5 % del alto: el recuadro se ve donde el estudio cambia
    # (el halo arriba, el piso con su filo de luz abajo), no en el promedio.
    if banda <= 1:
        dif, detalle = 0, "la foto ocupa todo el ancho"
    else:
        difs = []
        for k in range(3, 19):  # arriba del 15 % estan "Copiar link" y el cerrar
            y0, y1 = iy + ih * k / 20, iy + ih * (k + 1) / 20
            fuera = media(max(mx + 1, ix - 12), ix - 1, y0, y1)
            borde = media(ix + 1, ix + 4, y0, y1)
            difs.append((max(abs(a - b) for a, b in zip(fuera, borde)), k * 5, fuera, borde))
        dif, pct, fuera, borde = max(difs)
        detalle = (f"banda {banda} px; peor franja al {pct} % del alto: contenedor {tuple(round(v) for v in fuera)} "
                   f"contra borde de la foto {tuple(round(v) for v in borde)}; promedio {sum(d[0] for d in difs) / len(difs):.1f}")
    chk("E3-B7 bandas", "visual", "media", "Ficha a 390: en cada franja, el contenedor de la foto tiene el color del borde de la foto (no se lee un recuadro)",
        dif <= 4, f"diferencia maxima {dif:.1f}; {detalle}")
    # El ultimo tamano no queda tapado por la barra fija.
    t = page.evaluate("""() => { const d = document.querySelector('[data-dialogo=ficha]');
        const filas = [...d.querySelectorAll('[aria-label="Elegir presentación"] button')]; const u = filas[filas.length - 1];
        const barra = d.querySelector('[data-qa=agregar-ficha]').parentElement;
        u.scrollIntoView({ block: 'end' });
        const a = u.getBoundingClientRect(), b = barra.getBoundingClientRect();
        const ahorro = u.querySelector('[data-qa=ahorro]');
        const c = ahorro ? ahorro.getBoundingClientRect() : a;
        const e = document.elementFromPoint(c.left + c.width / 2, c.top + c.height / 2);
        return { fila: Math.round(a.bottom), barra: Math.round(b.top), tocable: !!e && (e === ahorro || u.contains(e)) }; }""")
    page.keyboard.press("Tab")
    ctx.close()
    chk("E3-B7 ahorro", "conversion", "media", "Ficha a 390: al bajar hasta el ultimo tamano, su 'Ahorras $ X' queda arriba de la barra fija",
        t["fila"] <= t["barra"] + 1 and t["tocable"], f"{elegido['slug']}: ultima fila termina en {t['fila']}, barra empieza en {t['barra']}; ahorro a la vista: {t['tocable']}")


def e3_b8(browser, base):
    ctx, page, _, _ = portada_con_datos(browser, MOVIL)
    texto_completo(page)
    js = """() => [...document.querySelectorAll('body *')].filter(e => {
        if (e.closest('[data-hero=corona]') || e.closest('[aria-hidden=true]')) return false;
        const t = [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
        if (!t) return false;
        const cs = getComputedStyle(e);
        return cs.textTransform === 'uppercase' && parseFloat(cs.letterSpacing) / parseFloat(cs.fontSize) >= 0.08 && e.getBoundingClientRect().width > 0;
      }).map(e => e.textContent.trim().slice(0, 24))"""
    portada = page.evaluate(js)
    ctx.close()
    chk("E3-B8 mayusculas", "visual", "baja", "Portada: a lo sumo una etiqueta en mayusculas espaciadas fuera del sello de marca",
        len(portada) <= 1, f"{len(portada)}: {portada}")
    pkg = json.load(open(os.path.join(AQUI, "..", "..", "package.json")))
    deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}
    chk("E3-B8 motion", "rendimiento", "baja", "La dependencia 'motion' (sin uso) ya no esta en package.json (repo local)",
        "motion" not in deps, f"motion: {deps.get('motion', 'no esta')}")


def e3_b9(browser, base):
    ctx, page, datos, _ = portada_con_datos(browser, MOVIL)
    page.evaluate("() => document.querySelector('footer')?.scrollIntoView()")
    page.wait_for_timeout(800)
    pie = page.evaluate("() => document.querySelector('footer')?.textContent || ''")
    ctx.close()
    m = re.search(r"Grupo Wolf\s*(.*?)Aviso", pie, re.S)
    aclaracion = (m.group(1) if m else pie[:80]).strip()[:110]
    chk("E3-B9 pie", "contenido", "media", "El pie ya no dice 'retiro los viernes' (settings.aclaracion_pedido)",
        "viernes" not in pie.lower() and bool(pie), f"aclaracion: '{aclaracion}'")
    filas = {p["slug"]: p for p in datos.get("filas", [])}
    fam = [s for s in CON_FAMILIA if (filas.get(s) or {}).get("familia_olfativa")]
    notas = [s for s in CON_NOTAS if all((filas.get(s) or {}).get(k) for k in ("nota_salida", "nota_corazon", "nota_fondo"))]
    chk("E3-B9 familias", "conversion", "media", "Los aromas con ficha publica de la proveedora tienen familia (5) y notas (6); Polo Red queda pendiente",
        len(fam) == len(CON_FAMILIA) and len(notas) == len(CON_NOTAS),
        f"con familia {len(fam)}/{len(CON_FAMILIA)}; con notas {len(notas)}/{len(CON_NOTAS)}; "
        + ", ".join(f"{s.replace('unlock-', '')}: {(filas.get(s) or {}).get('familia_olfativa') or '-'}" for s in SIETE))


def lighthouse(base, corridas, linea_base):
    chrome = (glob.glob("/opt/pw-browsers/chromium-*/chrome-linux/chrome") or [None])[0]
    env = dict(os.environ, CHROME_PATH=chrome or "")
    datos = {}
    for ruta in ("/", "/catalogo"):
        filas = []
        for i in range(corridas):
            with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as t:
                salida = t.name
            subprocess.run(["npx", "-y", "lighthouse@13.5.0", base + ruta, "--only-categories=performance",
                            "--output=json", f"--output-path={salida}", "--quiet",
                            "--chrome-flags=--headless=new --no-sandbox --disable-dev-shm-usage"],
                           env=env, check=False, timeout=240)
            try:
                r = json.load(open(salida))
                a = r["audits"]
                filas.append(dict(score=round(r["categories"]["performance"]["score"] * 100),
                                  lcp=round(a["largest-contentful-paint"]["numericValue"]),
                                  cls=round(a["cumulative-layout-shift"]["numericValue"], 3),
                                  fcp=round(a["first-contentful-paint"]["numericValue"]),
                                  tbt=round(a["total-blocking-time"]["numericValue"])))
            except Exception as e:  # una corrida rota no tumba el banco
                filas.append(dict(error=str(e)[:80]))
            finally:
                os.unlink(salida)
            print(f"    lighthouse {ruta} {i + 1}/{corridas}: {filas[-1]}", flush=True)
        buenas = [f for f in filas if "score" in f]
        datos[ruta] = dict(corridas=filas,
                           mediana=statistics.median([f["score"] for f in buenas]) if buenas else None,
                           cls_mediana=statistics.median([f["cls"] for f in buenas]) if buenas else None,
                           lcp_mediana=statistics.median([f["lcp"] for f in buenas]) if buenas else None)
    previo = (linea_base or {}).get("lighthouse", {})
    h, c = datos["/"], datos["/catalogo"]
    hb = (previo.get("/") or {}).get("mediana")
    ok_h = h["mediana"] is not None and (h["mediana"] >= hb - 2 if hb is not None else h["mediana"] >= 90)
    chk("RENDIMIENTO /", "rendimiento", "media",
        "Lighthouse mobile de la portada (mediana) no baja mas de 2 puntos" if hb is not None else "Lighthouse mobile de la portada (mediana) >= 90",
        ok_h, f"mediana {h['mediana']} (base {hb}); {[f.get('score') for f in h['corridas']]}; LCP {h['lcp_mediana']} ms")
    cb = (previo.get("/catalogo") or {}).get("mediana")
    ok_c = c["mediana"] is not None and c["cls_mediana"] is not None and c["cls_mediana"] < 0.1 and c["mediana"] >= 80
    chk("RENDIMIENTO /catalogo", "rendimiento", "alta", "Lighthouse mobile de /catalogo (mediana) >= 80 con CLS < 0,1",
        ok_c, f"mediana {c['mediana']} (base {cb}); {[f.get('score') for f in c['corridas']]}; CLS {c['cls_mediana']}")
    return datos


def main():
    global SOLO
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--url", default="http://localhost:4173")
    ap.add_argument("--lh", type=int, default=0, help="corridas de Lighthouse por pagina (0 = no corre)")
    ap.add_argument("--solo", default="", help="ids separados por coma (prefijo), por ejemplo UX-1,UX-3")
    ap.add_argument("--salida", default=os.path.join(AQUI, "resultado.json"))
    ap.add_argument("--base", default=os.path.join(AQUI, "linea-base.json"),
                    help="linea de base para comparar Lighthouse (si existe)")
    a = ap.parse_args()
    base = a.url.rstrip("/")
    global BASE
    BASE = base
    SOLO = [s.strip() for s in a.solo.split(",") if s.strip()] or None
    linea_base = None
    if os.path.exists(a.base) and os.path.abspath(a.base) != os.path.abspath(a.salida):
        linea_base = json.load(open(a.base))

    print(f"Banco de pruebas contra {base}")
    # Cada paso cubre uno o mas ids; corre si se pidio alguno de ellos.
    # flujo_pedido va antes que contenido: deja el texto del cajon para CONTENIDO-1.
    pasos = [
        (["UX-1"], ux1), (["UX-2"], ux2), (["UX-3", "UX-4"], ux3_ux4),
        (["UX-7", "REG-1", "CONFIANZA-1", "CONTENIDO-1"], flujo_pedido),
        (["UX-15"], ux15), (["UX-10"], ux10), (["FOTO-5"], foto5), (["FOTO-1", "FOTO-2"], foto1), (["UX-17"], ux17), (["UX-14"], ux14),
        (["CONFIANZA-1", "CONTENIDO-1", "PANEL-1", "REG-1"], contenido),
        (["E3-A1"], e3_a1), (["E3-A2", "E3-A3"], e3_a2_a3), (["E3-A4"], e3_a4), (["E3-A5"], e3_a5),
        (["E3-A6"], e3_a6), (["E3-A7"], e3_a7), (["E3-A8"], e3_a8), (["E3-A9"], e3_a9),
        (["E3-B1"], e3_b1), (["E3-B2"], e3_b2), (["E3-B3"], e3_b3), (["E3-B4"], e3_b4), (["E3-B5"], e3_b5),
        (["E3-B6"], e3_b6), (["E3-B7"], e3_b7), (["E3-B8"], e3_b8), (["E3-B9"], e3_b9),
    ]
    global SIN_HINTING
    with sync_playwright() as p:
        browser = p.chromium.launch()
        SIN_HINTING = p.chromium.launch(args=["--font-render-hinting=none"])
        for ids, fn in pasos:
            if not any(quiere(i) for i in ids):
                continue
            try:
                fn(browser, base)
            except Exception as e:
                chk(ids[0], "error", "-", f"El chequeo {'/'.join(ids)} no pudo correr", False,
                    f"{type(e).__name__}: {str(e)[:200]}")
        browser.close()
        SIN_HINTING.close()

    lh = None
    if a.lh and quiere("RENDIMIENTO"):
        lh = lighthouse(base, a.lh, linea_base)
    elif quiere("RENDIMIENTO"):
        chk("RENDIMIENTO", "rendimiento", "media", "Lighthouse mobile (correr con --lh 5)", None, "no se corrio")

    salida = dict(url=base, fecha=time.strftime("%Y-%m-%d %H:%M"), chequeos=RESULTADOS)
    if lh:
        salida["lighthouse"] = lh
    with open(a.salida, "w") as f:
        json.dump(salida, f, ensure_ascii=False, indent=1)

    print()
    print(f"{'ID':18} {'CATEGORIA':14} {'SEV':6} {'RESULTADO':10} DETALLE")
    for r in RESULTADOS:
        print(f"{r['id']:18} {r['categoria']:14} {r['severidad']:6} {r['resultado']:10} {r['detalle'][:110]}")
    fallan = sum(1 for r in RESULTADOS if r["resultado"] == "FALLA")
    print(f"\n{len(RESULTADOS)} chequeos, {fallan} fallan. Guardado en {os.path.relpath(a.salida)}")


if __name__ == "__main__":
    main()
