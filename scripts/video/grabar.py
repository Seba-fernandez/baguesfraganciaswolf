"""Graba la tienda en video, cuadro por cuadro, para LinkedIn y el portfolio.

    python3 scripts/video/grabar.py --url https://baguesfraganciaswolf.vercel.app \
        --guion antes --salida videos/antes
    python3 scripts/video/grabar.py --url http://localhost:4173 --guion despues --salida videos/despues

Saca dos videos .mp4 (H.264, yuv420p, faststart, 30 cuadros por segundo):
  celular-1080x1920.mp4  (viewport 414 x 736 a densidad 1080/414, táctil)
  escritorio-1920x1080.mp4 (con un cursor dibujado que va a cada objetivo)

Por qué cuadro por cuadro y no la grabación de Playwright: esa sale en baja
resolución y con saltos. Acá las animaciones de CSS se ralentizan con CDP
(Animation.setPlaybackRate) y se saca una captura cada 1/30 s de reloj de
animación; el scroll y los toques los maneja el guion con tiempos fijos.

No confirma pedidos: toda escritura contra la base se corta y el guion
termina en el paso de los datos, antes de enviar.
"""
import argparse
import math
import shutil
import subprocess
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

FPS = 30
TASA = 0.08  # velocidad de las animaciones mientras se graba (1 = normal)

CELULAR = dict(viewport={"width": 414, "height": 736}, device_scale_factor=1080 / 414,
               is_mobile=True, has_touch=True, locale="es-AR")
ESCRITORIO = dict(viewport={"width": 1920, "height": 1080}, device_scale_factor=1, locale="es-AR")

CAPA = """
() => {
  if (document.getElementById('__capa_video')) return;
  const c = document.createElement('div');
  c.id = '__capa_video';
  c.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483647';
  c.innerHTML = `
    <div id="__toque" style="position:absolute;width:56px;height:56px;margin:-28px 0 0 -28px;border-radius:50%;
      background:rgba(255,255,255,.28);border:2px solid rgba(255,255,255,.85);opacity:0"></div>
    <svg id="__cursor" width="26" height="34" viewBox="0 0 26 34" style="position:absolute;left:0;top:0;opacity:0;
      filter:drop-shadow(0 2px 3px rgba(0,0,0,.45))">
      <path d="M2 2 L2 27 L8.5 21 L13 31.5 L17 29.8 L12.6 19.6 L21.5 19.6 Z" fill="#fff" stroke="#111" stroke-width="1.6"
        stroke-linejoin="round"/></svg>`;
  document.documentElement.appendChild(c);
}
"""


def suave(t):
    """easeInOutCubic."""
    return 4 * t * t * t if t < 0.5 else 1 - (-2 * t + 2) ** 3 / 2


class Grabador:
    def __init__(self, page, carpeta, escritorio):
        self.page = page
        self.carpeta = Path(carpeta)
        shutil.rmtree(self.carpeta, ignore_errors=True)
        self.carpeta.mkdir(parents=True)
        self.n = 0
        self.escritorio = escritorio
        self.cursor = (960, 700)
        self.cdp = page.context.new_cdp_session(page)
        self.proximo = None

    def frenar(self):
        """Ralentiza las animaciones (se repite después de navegar)."""
        self.cdp.send("Animation.enable")
        self.cdp.send("Animation.setPlaybackRate", {"playbackRate": TASA})
        self.page.evaluate(CAPA)
        if self.escritorio:
            self.page.evaluate("([x, y]) => { const c = document.getElementById('__cursor'); "
                               "c.style.opacity = 1; c.style.transform = `translate(${x}px, ${y}px)`; }",
                               list(self.cursor))

    def cuadro(self):
        ahora = time.monotonic()
        if self.proximo and ahora < self.proximo:
            time.sleep(self.proximo - ahora)
        inicio = time.monotonic()
        self.page.screenshot(path=str(self.carpeta / f"{self.n:05d}.jpg"), type="jpeg", quality=92)
        self.n += 1
        self.proximo = inicio + (1 / FPS) / TASA

    def quieto(self, segundos):
        for _ in range(round(segundos * FPS)):
            self.cuadro()

    # ---------------------------------------------------------------- scroll
    def _scroll_en(self, js_contenedor, destino, segundos):
        origen = self.page.evaluate(f"() => {{ const e = {js_contenedor}; return e ? e.scrollTop : scrollY; }}")
        cuadros = max(1, round(segundos * FPS))
        for i in range(1, cuadros + 1):
            y = origen + (destino - origen) * suave(i / cuadros)
            self.page.evaluate(f"(y) => {{ const e = {js_contenedor}; if (e) e.scrollTop = y; else window.scrollTo(0, y); }}", y)
            self.cuadro()

    def bajar_a(self, selector, segundos=1.3, margen=70):
        """Lleva la página hasta que el elemento quede `margen` px abajo del borde."""
        destino = self.page.evaluate(
            "([s, m]) => { const e = document.querySelector(s); if (!e) return null;"
            " const max = document.documentElement.scrollHeight - innerHeight;"
            " return Math.max(0, Math.min(max, e.getBoundingClientRect().top + scrollY - m)); }",
            [selector, margen])
        if destino is None:
            raise RuntimeError(f"no está: {selector}")
        self._scroll_en("null", destino, segundos)

    def bajar(self, px, segundos=1.0):
        destino = self.page.evaluate("(px) => Math.min(scrollY + px, document.documentElement.scrollHeight - innerHeight)", px)
        self._scroll_en("null", destino, segundos)

    def mostrar_en_dialogo(self, selector, segundos=0.8):
        """Baja la hoja que contiene al elemento hasta que se vea entero."""
        selector = self.css(selector)
        hay = self.page.evaluate("""(s) => {
          const e = document.querySelector(s); if (!e) return false;
          let p = e.parentElement;
          while (p && !(p.scrollHeight > p.clientHeight + 2 && /auto|scroll/.test(getComputedStyle(p).overflowY))) p = p.parentElement;
          if (!p) return false;
          document.querySelectorAll('[data-scroll-video]').forEach(x => x.removeAttribute('data-scroll-video'));
          p.setAttribute('data-scroll-video', '1');
          const r = e.getBoundingClientRect(), rp = p.getBoundingClientRect();
          if (r.bottom <= rp.bottom - 16) return false;
          p.dataset.destino = Math.min(p.scrollHeight - p.clientHeight, p.scrollTop + r.bottom - rp.bottom + 40);
          return true; }""", selector)
        if not hay:
            return
        destino = self.page.evaluate("() => Number(document.querySelector('[data-scroll-video]').dataset.destino)")
        self._scroll_en("document.querySelector('[data-scroll-video]')", destino, segundos)

    # ---------------------------------------------------------------- toques
    def css(self, selector):
        """Los selectores de Playwright (:has-text) se marcan y pasan a CSS."""
        if ":has-text" not in selector and ":text-is" not in selector:
            return selector
        self.page.evaluate("() => document.querySelectorAll('[data-sel-video]').forEach(e => e.removeAttribute('data-sel-video'))")
        self.page.locator(selector).last.evaluate("e => e.setAttribute('data-sel-video', '1')")
        return "[data-sel-video]"

    def _centro(self, selector, ultimo=False):
        selector = self.css(selector)
        caja = self.page.evaluate("""([s, ultimo]) => {
          const vis = [...document.querySelectorAll(s)].filter(x => { const r = x.getBoundingClientRect();
            return r.width && r.height && r.top >= 0 && r.bottom <= innerHeight; });
          const e = ultimo ? vis[vis.length - 1] : vis[0];
          if (!e) return null; e.setAttribute('data-objetivo-video', '1');
          const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }""", [selector, ultimo])
        if not caja:
            raise RuntimeError(f"no se ve: {selector}")
        return caja

    def tocar(self, selector, espera_despues=0.0, ultimo=False):
        x, y = self._centro(selector, ultimo)
        if self.escritorio:
            ox, oy = self.cursor
            cuadros = round(0.55 * FPS)
            for i in range(1, cuadros + 1):
                k = suave(i / cuadros)
                cx, cy = ox + (x - ox) * k, oy + (y - oy) * k
                self.page.mouse.move(cx, cy)
                self.page.evaluate("([x, y]) => { document.getElementById('__cursor').style.transform = `translate(${x}px, ${y}px)`; }", [cx, cy])
                self.cuadro()
            self.cursor = (x, y)
            self.quieto(0.12)
        # el círculo que marca el toque o el clic, dibujado cuadro a cuadro
        cuadros = round(0.4 * FPS)
        for i in range(cuadros):
            k = i / (cuadros - 1)
            escala = 0.5 + 0.9 * k
            self.page.evaluate("([x, y, e, o]) => { const t = document.getElementById('__toque');"
                               " t.style.left = x + 'px'; t.style.top = y + 'px';"
                               " t.style.transform = `scale(${e})`; t.style.opacity = o; }",
                               [x, y, escala, 1 - k])
            if i == 3:
                if self.escritorio:
                    self.page.mouse.click(x, y)
                else:
                    self.page.evaluate("() => { const e = document.querySelector('[data-objetivo-video]');"
                                       " e.removeAttribute('data-objetivo-video'); e.click(); }")
            self.cuadro()
        self.quieto(espera_despues)

    def esperar(self, selector, maximo=8.0):
        """Sigue grabando mientras aparece algo (un diálogo, el catálogo)."""
        limite = time.monotonic() + maximo / TASA
        while not self.page.locator(selector).count():
            if time.monotonic() > limite:
                raise RuntimeError(f"no apareció: {selector}")
            self.cuadro()

    def video(self, archivo, sostener=0.7):
        self.quieto(sostener)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", str(self.carpeta / "%05d.jpg"),
                        "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-pix_fmt", "yuv420p",
                        "-movflags", "+faststart", str(archivo)], check=True)
        return self.n / FPS


def proteger(ctx):
    def manejar(route):
        if route.request.method not in ("GET", "HEAD", "OPTIONS"):
            route.abort()
        else:
            route.continue_()
    ctx.route("**/rest/v1/**", manejar)


def precalentar(page, base):
    for ruta in ("/", "/catalogo"):
        page.goto(base + ruta, wait_until="networkidle")
        alto = page.evaluate("document.documentElement.scrollHeight")
        for y in range(0, alto, 300):
            page.evaluate(f"scrollTo(0, {y})")
            page.wait_for_timeout(60)
    page.goto(base + "/", wait_until="networkidle")
    page.evaluate("scrollTo(0, 0)")


# ------------------------------------------------------------------ guiones
NAV_CATALOGO = "header a[href='/catalogo'], header a[href$='/catalogo']"
CAJON = "[role=dialog][aria-label='Tu pedido']"
FICHA_AGREGAR = "[role=dialog] button:has-text('Agregar al pedido')"


def tramo_catalogo(g, celular):
    """Del menú al paso de los datos, igual en las dos versiones."""
    g.tocar(NAV_CATALOGO)
    g.esperar("article")
    g.frenar()
    g.quieto(0.9)
    g.bajar(420 if celular else 520, 1.1)
    g.quieto(0.3)
    g.tocar("article button")
    g.esperar(FICHA_AGREGAR)
    g.quieto(1.4)
    g.mostrar_en_dialogo(FICHA_AGREGAR)
    g.tocar(FICHA_AGREGAR)
    g.esperar(CAJON)
    g.quieto(1.4)
    g.tocar(f"{CAJON} .tbtn.wide", ultimo=True)
    g.esperar("#co-nombre")
    g.quieto(0.8)


def guion_antes(g, celular):
    g.quieto(2.4)
    g.bajar_a("#nosotros", 1.4, margen=(736 if celular else 1080) - 60)  # "Los que siempre salen" a la vista
    g.quieto(0.9)
    g.bajar_a("#como", 1.5)
    g.quieto(0.7)
    g.bajar_a("body", 1.2, margen=0)  # vuelve arriba, donde está el menú
    tramo_catalogo(g, celular)


def guion_despues(g, celular):
    g.quieto(2.6)
    g.bajar_a("main section:nth-of-type(2)", 1.3, margen=0)  # la cinta y Las ciudades
    g.quieto(1.0)
    g.bajar(700 if celular else 900, 1.4)  # las familias
    g.quieto(0.8)
    g.bajar(800 if celular else 1000, 1.4)  # destacados en la banda vino
    g.quieto(0.9)
    tramo_catalogo(g, celular)


GUIONES = {"antes": guion_antes, "despues": guion_despues}


def grabar(base, guion, salida, cual):
    salida = Path(salida)
    salida.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        nav = p.chromium.launch(args=["--font-render-hinting=none"])
        for nombre, opciones in (("celular-1080x1920", CELULAR), ("escritorio-1920x1080", ESCRITORIO)):
            if cual and cual not in nombre:
                continue
            ctx = nav.new_context(**opciones)
            proteger(ctx)
            page = ctx.new_page()
            precalentar(page, base)
            g = Grabador(page, salida / f"cuadros-{nombre}", escritorio=nombre.startswith("escritorio"))
            g.frenar()
            page.goto(base + "/", wait_until="commit")
            g.frenar()
            page.wait_for_load_state("load")
            page.wait_for_timeout(250)
            g.frenar()
            GUIONES[guion](g, nombre.startswith("celular"))
            dur = g.video(salida / f"{nombre}.mp4")
            print(f"{nombre}: {g.n} cuadros, {dur:.1f} s", flush=True)
            ctx.close()
        nav.close()


if __name__ == "__main__":
    a = argparse.ArgumentParser()
    a.add_argument("--url", required=True)
    a.add_argument("--guion", choices=GUIONES, required=True)
    a.add_argument("--salida", required=True)
    a.add_argument("--solo", default="", help="celular o escritorio")
    x = a.parse_args()
    grabar(x.url.rstrip("/"), x.guion, x.salida, x.solo)
