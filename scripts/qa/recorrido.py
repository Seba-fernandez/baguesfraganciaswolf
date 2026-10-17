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
    page.evaluate("""() => { const f = document.querySelector('footer');
        scrollTo(0, f.getBoundingClientRect().top + scrollY - 120); }""")
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
    for intento in range(2):
        boton.click()
        try:
            page.wait_for_selector("[role=dialog][aria-label='Tu pedido']", timeout=8000)
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
    m = re.search(r"(\d+)\s*aromas en el ciclo", html)
    servido = m.group(1) if m else None
    page.goto(base + "/", wait_until="load")
    page.wait_for_timeout(1500)
    page.wait_for_function("() => /\\d+\\s*aromas en el ciclo/.test(document.querySelector('[data-hero=meta]')?.innerText || '')", timeout=20000)
    page.wait_for_timeout(2500)
    vivo = page.evaluate("() => (document.querySelector('[data-hero=meta]').innerText.match(/(\\d+)\\s*aromas en el ciclo/) || [])[1] || null")
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
