#!/usr/bin/env python3
"""
Los tres recorridos de consulta, a 390 px de celular, contra produccion.

  a) "busco Good Girl mas barato"
  b) "no se que quiero, algo dulce para regalar"
  c) "desconfio, nunca le compre a un particular"

Cuenta toques (tap, tecleo de una busqueda = 1, scroll no cuenta pero se
mide en pantallas), saca capturas de los momentos clave y deja un JSON.

NUNCA manda un pedido: crear_pedido_web se contesta con un pedido de mentira,
cualquier otra escritura contra la base se corta, wa.me se aborta y window.open
queda registrado sin abrir nada.
"""
import json
import os
import re
import sys
import urllib.parse

from playwright.sync_api import sync_playwright

AQUI = os.path.dirname(os.path.abspath(__file__))
BASE = sys.argv[1] if len(sys.argv) > 1 else "https://baguesfraganciaswolf.vercel.app"
DIR = os.path.join(AQUI, "recorridos")
os.makedirs(DIR, exist_ok=True)
MOVIL = dict(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True, device_scale_factor=2, locale="es-AR")
POST_BLOQUEADOS = []


def proteger(ctx):
    def manejar(route):
        req = route.request
        if "rpc/crear_pedido_web" in req.url:
            POST_BLOQUEADOS.append("crear_pedido_web (simulado)")
            route.fulfill(status=200, content_type="application/json",
                          body=json.dumps([{"order_id": "00000000-0000-0000-0000-000000000000", "numero": 9999}]))
        elif req.method not in ("GET", "HEAD", "OPTIONS"):
            POST_BLOQUEADOS.append(f"{req.method} {req.url[:80]} (cortado)")
            route.abort()
        else:
            route.continue_()
    ctx.route("**/rest/v1/**", manejar)
    ctx.route("**/auth/v1/**", lambda r: r.continue_() if r.request.method == "GET" else r.abort())
    ctx.route("**/*supabase.co/**", manejar)
    ctx.route(re.compile(r"https://(wa\.me|api\.whatsapp\.com|instagram\.com|www\.instagram\.com)/.*"), lambda r: r.abort())
    ctx.add_init_script("window.__aperturas = []; window.open = function (u) { window.__aperturas.push(String(u)); return null; };")


JS_VISOR = r"""
(alto) => {
  const vis = (e) => { const r = e.getBoundingClientRect(); const st = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && r.top < alto && r.bottom > 0 && st.visibility !== 'hidden' && parseFloat(st.opacity) > 0.05; };
  const precios = [];
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = tw.nextNode())) {
    if (!/\$\s?\d/.test(n.textContent)) continue;
    const p = n.parentElement; if (!p || !vis(p)) continue;
    const r = p.getBoundingClientRect();
    if (r.bottom <= alto) precios.push({ t: n.textContent.trim().slice(0, 30), y: Math.round(r.top) });
  }
  const ctas = [...document.querySelectorAll('a.tbtn, button.tbtn, a[href*="wa.me"], button[aria-label^="Agregar"]')]
    .filter(e => vis(e) && e.getBoundingClientRect().bottom <= alto)
    .map(e => ({ t: (e.innerText || e.getAttribute('aria-label') || '').trim().slice(0, 40), y: Math.round(e.getBoundingClientRect().top) }));
  return { precios: precios.slice(0, 8), ctas: ctas.slice(0, 8) };
}
"""


class Recorrido:
    def __init__(self, page, clave, perfil):
        self.page, self.clave, self.perfil = page, clave, perfil
        self.toques = 0
        self.pasos = []
        self.dudas = []
        self.n = 0

    def toque(self, desc, loc, como="tap"):
        loc.first.scroll_into_view_if_needed()
        if como == "tap":
            loc.first.tap()
        else:
            loc.first.click()
        self.toques += 1
        self.pasos.append(dict(toque=self.toques, accion=desc, url=self.page.url.replace(BASE, "")))
        self.page.wait_for_timeout(700)

    def teclear(self, desc, selector, texto):
        self.page.locator(selector).first.tap()
        self.page.fill(selector, texto)
        self.toques += 1  # tocar el campo + escribir = 1 accion
        self.pasos.append(dict(toque=self.toques, accion=f"{desc}: '{texto}'", url=self.page.url.replace(BASE, "")))
        self.page.wait_for_timeout(700)

    def scroll(self, desc, px):
        self.page.evaluate(f"scrollBy(0, {px})")
        self.page.wait_for_timeout(500)
        self.pasos.append(dict(toque=None, accion=f"scroll: {desc} ({px} px, {px / 844:.1f} pantallas)"))

    def foto(self, desc, alto=844):
        self.n += 1
        p = os.path.join(DIR, f"{self.clave}_{self.n:02d}_{re.sub(r'[^a-z0-9]+', '-', desc.lower())[:40].strip('-')}.png")
        self.page.screenshot(path=p)
        visor = self.page.evaluate(JS_VISOR, alto)
        self.pasos.append(dict(toque=None, captura=p, momento=desc, en_pantalla=visor))
        return visor

    def duda(self, donde, que):
        self.dudas.append(dict(donde=donde, que=que, tras_toques=self.toques))

    def json(self):
        return dict(perfil=self.perfil, toques=self.toques, pasos=self.pasos, dudas=self.dudas)


def nuevo(b):
    ctx = b.new_context(**MOVIL)
    proteger(ctx)
    pg = ctx.new_page()
    pg.goto(BASE + "/", wait_until="networkidle")
    pg.wait_for_timeout(2500)
    return ctx, pg


def terminar_pedido(r):
    """Del cajon a la pantalla final. Devuelve el mensaje de WhatsApp armado."""
    pg = r.page
    caj = "[role=dialog][aria-label='Tu pedido']"
    pg.wait_for_selector(caj, timeout=10000)
    v = r.foto("cajon abierto")
    texto = pg.locator(caj).inner_text()
    r.toque("Seguir por WhatsApp", pg.locator(f"{caj} .tbtn.wide").last)
    r.foto("pide nombre y WhatsApp")
    r.teclear("nombre", "#co-nombre", "Prueba QA")
    r.teclear("WhatsApp", "#co-tel", "351 555 1234")
    r.toque("Enviar pedido por WhatsApp", pg.locator(f"{caj} .tbtn.wide").last)
    pg.wait_for_timeout(1800)
    r.foto("pantalla final")
    fin = pg.evaluate("""() => { const d = document.querySelector('[role=dialog][aria-label="Tu pedido"]');
      const a = d && d.querySelector('a[href*="wa.me"]'); return { href: a ? a.getAttribute('href') : null, texto: d ? d.innerText : '' }; }""")
    aperturas = pg.evaluate("window.__aperturas")
    href = fin["href"] or (aperturas[0] if aperturas else "")
    msg = urllib.parse.unquote(href.split("text=", 1)[1]) if "text=" in href else ""
    # El toque final: el enlace real a WhatsApp (no se abre: se lee el href).
    r.toques += 1
    r.pasos.append(dict(toque=r.toques, accion="Abrir WhatsApp con mi pedido (enlace wa.me, NO abierto: se leyo el href)"))
    return dict(cajon=texto, mensaje=msg, window_open=len(aperturas), final=fin["texto"])


# ---------------------------------------------------------------------------

def perfil_a(b):
    ctx, pg = nuevo(b)
    r = Recorrido(pg, "a", "busco Good Girl mas barato")
    v = r.foto("llega a la portada")
    gg_portada = pg.evaluate("() => /good girl/i.test(document.body.innerText)")
    if not gg_portada:
        r.duda("portada", "No hay buscador en la portada: para buscar Good Girl tiene que ir al catálogo primero.")
    r.toque("Ver el catálogo", pg.locator("a:has-text('Ver el catálogo')"))
    pg.wait_for_selector("article", timeout=25000)
    pg.wait_for_timeout(800)
    r.foto("catalogo recien abierto")
    y_busc = pg.evaluate("() => Math.round(document.querySelector('input[type=search]').getBoundingClientRect().top)")
    r.teclear("busca", "input[type=search]", "good girl")
    pg.wait_for_timeout(600)
    res = pg.evaluate("""() => [...document.querySelectorAll('article')].map(a => {
        const r = a.getBoundingClientRect();
        return { t: (a.querySelector('h3,h2,[class*=nombre]')?.innerText || a.innerText.split('\\n')[0]).trim(),
                 precio: (a.innerText.match(/\\$\\s?[\\d.]+/) || [''])[0], linea: a.innerText.replace(/\\n+/g, ' | ').slice(0, 120), y: Math.round(r.top) }; })""")
    v = r.foto("resultados de good girl")
    conteo = pg.evaluate("() => document.querySelector('[class*=conteo]')?.innerText || ''")
    primero_visible = [x for x in res if x["y"] < 844]
    if not primero_visible:
        r.duda("resultados", f"Despues de buscar, ninguna tarjeta asoma en la pantalla (la primera arranca en y={res[0]['y'] if res else '?'}): los filtros quedan entre el buscador y los resultados.")
    if len(res) > 1:
        r.duda("resultados", f"Aparecen {len(res)} perfumes con 'Good Girl' ({', '.join(x['t'] for x in res[:5])}): tiene que entender cual es el suyo y comparar precios 'desde' tarjeta por tarjeta.")
    # Elige el que se llama exactamente Good Girl
    idx = next((i for i, x in enumerate(res) if re.fullmatch(r"good girl", x["t"].strip(), re.I)), 0)
    art = pg.locator("article").nth(idx)
    art.scroll_into_view_if_needed()
    pg.wait_for_timeout(300)
    r.foto("tarjeta de good girl a la vista")
    r.toque(f"abre la ficha de {res[idx]['t'] if res else '?'}", art.locator("button").first)
    pg.wait_for_selector("[role=dialog][data-dialogo=ficha]", timeout=15000)
    pg.wait_for_timeout(700)
    v = r.foto("ficha abierta")
    ops = pg.evaluate("""() => [...document.querySelectorAll('[role=dialog][data-dialogo=ficha] [aria-label="Elegir presentación"] button')].map(b => ({
        t: b.innerText.replace(/\\n+/g, ' | '), y: Math.round(b.getBoundingClientRect().top), sel: b.getAttribute('aria-pressed') || b.getAttribute('aria-checked') || (b.className.includes('activ') ? 'true' : '') }))""")
    precios = []
    for o in ops:
        # El precio que se paga es el ultimo "$" que no sea "Ahorrás": si hay
        # rebaja, el primero es el de lista (tachado).
        sin_ahorro = re.sub(r"Ahorr[aá]s\s*\$\s?[\d.]+", "", o["t"])
        m = re.findall(r"\$\s?([\d.]+)", sin_ahorro)
        ml = re.search(r"(\d+)\s?ml", o["t"])
        if m:
            precios.append((int(m[-1].replace(".", "")), int(ml.group(1)) if ml else None, o))
    if precios:
        barato = min(precios, key=lambda z: z[0])
        por_ml = sorted([(p / ml, ml, p) for p, ml, _ in precios if ml])
        if por_ml and por_ml[0][1] != barato[1]:
            r.duda("ficha", f"El precio mas bajo (${barato[0]:,} por {barato[1]} ml) no es el que mas rinde: el de {por_ml[0][1]} ml sale ${por_ml[0][0]:,.0f} el ml. La web no muestra precio por ml, la que busca 'el mas barato' tiene que hacer la cuenta.".replace(",", "."))
        if ops and ops[0]["y"] > 844:
            r.duda("ficha", f"Los tamaños con precio arrancan en y={ops[0]['y']}: abajo de la foto, hay que bajar para ver cuanto sale.")
        i_b = precios.index(barato)
        boton = pg.locator("[role=dialog][data-dialogo=ficha] [aria-label='Elegir presentación'] button").nth(ops.index(barato[2]))
        boton.scroll_into_view_if_needed()
        pg.wait_for_timeout(300)
        r.foto("tamanos y precios en la ficha")
        if barato[2]["sel"] == "true":
            r.pasos.append(dict(toque=None, accion=f"el tamaño mas barato ({barato[1]} ml, ${barato[0]}) ya viene elegido: no toca"))
            r.duda("ficha", "La opcion de 50 ml muestra primero el precio de lista ($ 29.999) y despues el real; leyendo rapido, la de 25 ml ($ 23.249) parece la mas barata y es la mas cara.")
        else:
            r.toque(f"elige el tamaño mas barato ({barato[1]} ml, ${barato[0]})", boton)
    r.toque("Agregar al pedido", pg.locator("[data-qa=agregar-ficha]"))
    pg.wait_for_timeout(900)
    if not pg.locator("[role=dialog][aria-label='Tu pedido']").count():
        r.toque("Ver pedido", pg.locator("[data-qa=aviso-agregado] button"))
    fin = terminar_pedido(r)
    out = r.json()
    out.update(resultados_busqueda=res, conteo=conteo, opciones_ficha=ops, y_buscador=y_busc, **{"pedido": fin})
    ctx.close()
    return out


def perfil_b(b):
    ctx, pg = nuevo(b)
    r = Recorrido(pg, "b", "no se que quiero, algo dulce para regalar")
    r.foto("llega a la portada")
    txt = pg.evaluate("() => { const s=document.createElement('style'); s.textContent='*{content-visibility:visible!important}'; document.head.appendChild(s); const t=document.body.innerText; s.remove(); return t; }")
    if not re.search(r"regal", txt, re.I):
        r.duda("portada", "Ninguna palabra de regalo en toda la portada (ni 'regalo', ni 'para regalar', ni envoltorio o tarjeta): no se siente invitada.")
    if not re.search(r"dulce", txt, re.I):
        r.duda("portada", "La portada no ofrece entrar por 'lo que te gusta oler' (dulce, fresco...): las familias solo existen como filtro adentro del catálogo.")
    # Mira los destacados primero (es lo que haria alguien sin rumbo)
    r.scroll("baja a los destacados", 700)
    r.foto("destacados")
    r.toque("Ver el catálogo (desde la cabecera)", pg.locator("header a:has-text('Catálogo')"))
    pg.wait_for_selector("article", timeout=25000)
    pg.wait_for_timeout(800)
    r.foto("catalogo")
    r.toque("Familia: Dulces y gourmand", pg.locator("[data-qa=filtro-familia] button:has-text('Dulces')"))
    pg.wait_for_timeout(700)
    n1 = pg.evaluate("() => document.querySelector('[class*=conteo]')?.innerText || ''")
    r.foto("filtro dulces")
    r.toque("Para: Ella (regalo para ella)", pg.locator("[data-qa=filtro-para] button:has-text('Ella')"))
    pg.wait_for_timeout(700)
    n2 = pg.evaluate("() => document.querySelector('[class*=conteo]')?.innerText || ''")
    res = pg.evaluate("""() => [...document.querySelectorAll('article')].map(a => ({ t: a.innerText.split('\\n')[0].trim(), info: a.innerText.replace(/\\n+/g,' | ').slice(0,110), y: Math.round(a.getBoundingClientRect().top) }))""")
    v = r.foto("dulces para ella")
    if res and res[0]["y"] > 700:
        r.duda("catálogo", f"Con los dos filtros puestos, la primera tarjeta arranca en y={res[0]['y']}: casi no ve resultados sin bajar.")
    r.duda("catálogo", f"Le quedan {n2.strip() or len(res)} opciones sin ninguna señal de cuál elegir para regalar: no hay 'más pedido', 'ideal para regalo', ni reseñas. Solo nombre, notas y precio.")
    r.scroll("recorre los resultados", 1600)
    r.foto("recorriendo resultados")
    pg.evaluate("scrollTo(0, 0)")
    art = pg.locator("article").first
    art.scroll_into_view_if_needed()
    r.toque(f"abre la ficha de {res[0]['t'] if res else '?'}", art.locator("button").first)
    pg.wait_for_selector("[role=dialog][data-dialogo=ficha]", timeout=15000)
    pg.wait_for_timeout(700)
    r.foto("ficha")
    ficha = pg.locator("[role=dialog][data-dialogo=ficha]").inner_text()
    if not re.search(r"regal|envolt|tarjeta", ficha, re.I):
        r.duda("ficha", "La ficha no dice si se puede mandar para regalo (envuelto, con tarjeta, directo a otra dirección).")
    pg.evaluate("() => { const d = document.querySelector('[role=dialog][data-dialogo=ficha]'); d.scrollTop = d.scrollHeight; }")
    pg.wait_for_timeout(500)
    r.foto("ficha abajo, parecidos")
    r.toque("Agregar al pedido", pg.locator("[data-qa=agregar-ficha]"))
    pg.wait_for_timeout(900)
    if not pg.locator("[role=dialog][aria-label='Tu pedido']").count():
        r.toque("Ver pedido", pg.locator("[data-qa=aviso-agregado] button"))
    fin = terminar_pedido(r)
    out = r.json()
    out.update(conteo_dulces=n1, conteo_dulces_ella=n2, resultados=res[:12], ficha=ficha[:900], pedido=fin)
    ctx.close()
    return out


def perfil_c(b):
    ctx, pg = nuevo(b)
    r = Recorrido(pg, "c", "desconfio, nunca le compre a un particular")
    r.foto("llega a la portada")
    txt = pg.evaluate("() => { const s=document.createElement('style'); s.textContent='*{content-visibility:visible!important}'; document.head.appendChild(s); const t=document.body.innerText; s.remove(); return t; }")
    señales = {
        "quién vende (nombre)": bool(re.search(r"Sebasti[aá]n", txt)),
        "foto de la persona": pg.evaluate("() => [...document.images].some(i => /sebas|nosotros|equipo|retrato|persona/i.test(i.src + i.alt))"),
        "reseñas o capturas de clientas": bool(re.search(r"rese[ñn]a|opini|clientas? (dicen|contentas)|testimon|★|estrellas", txt, re.I)),
        "cantidad de ventas o clientes": bool(re.search(r"\d+\s*(clientes|pedidos|ventas|personas)", txt, re.I)),
        "Instagram enlazado": pg.evaluate("() => !!document.querySelector('a[href*=\"instagram.com\"]')"),
        "WhatsApp directo": pg.evaluate("() => !!document.querySelector('a[href*=\"wa.me\"]')"),
        "cómo se paga (seña 50 %)": bool(re.search(r"se[ñn]a del 50", txt, re.I)),
        "qué pasa si algo sale mal (cambio, devolución, garantía)": bool(re.search(r"cambio|devoluci|garant|reembols", txt, re.I)),
        "aclara que son versiones inspiradas": bool(re.search(r"versiones inspiradas", txt, re.I)),
        "zona o punto de retiro concreto": bool(re.search(r"barrio|calle|av\.|avenida|punto de retiro en", txt, re.I)),
        "antigüedad (desde cuándo vende)": bool(re.search(r"desde 20\d\d|a[ñn]os vendiendo|hace \d+ a[ñn]os", txt, re.I)),
        "fotos reales del producto (no de estudio)": False,
    }
    pantallas = {}
    for sel, nombre in [("#nosotros", "nosotros"), ("#como", "como funciona"), ("#antes", "antes de pedir"), ("footer", "pie")]:
        y = pg.evaluate(f"() => {{ const e = document.querySelector('{sel}'); return e ? Math.round(e.getBoundingClientRect().top + scrollY) : null; }}")
        pantallas[nombre] = round(y / 844, 1) if y else None
        if y is None:
            continue
        pg.evaluate(f"() => document.querySelector('{sel}').scrollIntoView({{block: 'start'}})")
        pg.wait_for_timeout(900)
        r.pasos.append(dict(toque=None, accion=f"scroll hasta {nombre} (arranca a {y / 844:.1f} pantallas)"))
        r.foto(nombre)
        if nombre == "pie":
            pg.evaluate("scrollBy(0, 844)")
            pg.wait_for_timeout(500)
            r.foto("pie, aviso legal")
    faltan = [k for k, v in señales.items() if not v]
    r.duda("portada entera", "Señales de confianza que NO encuentra: " + "; ".join(faltan) + ".")
    if pantallas.get("nosotros") and pantallas["nosotros"] > 1.5:
        r.duda("nosotros", f"La única cara humana ('Sebastián, de Grupo Wolf') está a {pantallas['nosotros']} pantallas y es un bloque de tres párrafos sin foto: según NN/g solo ~17 % del tiempo llega a la segunda pantalla.")
    if pantallas.get("antes de pedir") and pantallas["antes de pedir"] > 3:
        r.duda("antes de pedir", f"Seña, envío y retiro (lo que necesita para animarse) están a {pantallas['antes de pedir']} pantallas.")
    # Decide preguntar antes de comprar: el CTA de "Cómo funciona"
    pg.evaluate("() => document.querySelector('#como').scrollIntoView({block: 'start'})")
    pg.wait_for_timeout(700)
    wa = pg.evaluate("""() => { const a = [...document.querySelectorAll('#como a[href*="wa.me"], a[href*="wa.me"]')][0]; return a ? { t: a.innerText.trim(), href: a.getAttribute('href') } : null; }""")
    a = pg.locator("#como a[href*='wa.me']")
    if a.count():
        a.first.scroll_into_view_if_needed()
        pg.wait_for_timeout(300)
        r.foto("boton escribime por whatsapp")
    r.toques += 1
    r.pasos.append(dict(toque=r.toques, accion=f"Escribime por WhatsApp (wa.me NO abierto: href leido) -> {wa['href'][:90] if wa else 'no hay'}"))
    msg = urllib.parse.unquote(wa["href"].split("text=", 1)[1]) if wa and "text=" in wa["href"] else ""
    if not msg:
        r.duda("WhatsApp", "El botón abre WhatsApp sin mensaje armado: la persona desconfiada tiene que redactar la pregunta desde cero.")
    out = r.json()
    out.update(senales=señales, pantallas_hasta=pantallas, whatsapp=wa, mensaje_whatsapp=msg)
    ctx.close()
    return out


def visor_664(b):
    """Lo que entra en el visor de Instagram (390x664) al llegar a la portada y al catálogo."""
    out = {}
    for ruta in ["/", "/catalogo"]:
        ctx = b.new_context(**dict(MOVIL, viewport={"width": 390, "height": 664}))
        proteger(ctx)
        pg = ctx.new_page()
        pg.goto(BASE + ruta, wait_until="networkidle")
        if ruta == "/catalogo":
            pg.wait_for_selector("article", timeout=25000)
        pg.wait_for_timeout(3000)
        p = os.path.join(DIR, f"visor664{ruta.replace('/', '_') or '_portada'}.png")
        pg.screenshot(path=p)
        v = pg.evaluate(JS_VISOR, 664)
        pr = pg.evaluate("""() => { const e = [...document.querySelectorAll('*')].find(x => x.children.length === 0 && /Desde \\$/.test(x.textContent)); const r = e && e.getBoundingClientRect(); return r ? { t: e.textContent.trim(), y: Math.round(r.top), b: Math.round(r.bottom) } : null; }""")
        out[ruta] = dict(captura=p, **v, precio_desde=pr)
        ctx.close()
    return out


def main():
    with sync_playwright() as p:
        b = p.chromium.launch(args=["--font-render-hinting=none"])
        res = dict(base=BASE)
        for k, f in [("visor_664", visor_664), ("a", perfil_a), ("b", perfil_b), ("c", perfil_c)]:
            try:
                res[k] = f(b)
                t = res[k].get("toques") if isinstance(res[k], dict) else None
                print(f"{k}: ok" + (f", {t} toques" if t is not None else ""), flush=True)
            except Exception as e:  # noqa: BLE001
                res[k] = dict(error=f"{type(e).__name__}: {e}")
                print(f"{k}: ERROR {e}", flush=True)
        res["escrituras_bloqueadas"] = POST_BLOQUEADOS
        b.close()
    with open(os.path.join(AQUI, "recorridos.json"), "w") as fh:
        json.dump(res, fh, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
