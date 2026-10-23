#!/usr/bin/env python3
"""
Prueba de la tienda en los tres motores: WebKit (Safari), Chromium (Chrome,
Edge, Android) y Gecko (Firefox), a 375, 390, 768, 1024 y 1440 px.

Nace del 22/10/2026: en el iPhone de una clienta el boton del hero se corria a
la derecha y la foto de la ficha se aplastaba, y en Chrome no pasaba nada.
El banco (recorrido.py) corre solo en Chromium.

Que mira, en cada motor y ancho:
  - portada, catalogo, ficha (?aroma=), hoja de tamanos y carrito
  - que la pagina no se pueda correr de costado (scrollWidth > ancho)
  - que nada visible se salga por los costados (salvo dentro de una fila que
    se desliza a proposito, overflow-x auto o scroll)
  - que las fotos visibles carguen (naturalWidth > 0)
  - que los botones y titulos no corten su texto
  - en la portada, que el boton principal quede centrado en el celular
  - en la ficha, que la foto no se aplaste (alto >= 40 % de la pantalla
    en el celular) ni se estire, y que en escritorio la columna no quede flaca

Uso:
  node scripts/qa/servir.mjs &
  python3 scripts/qa/motores.py [--url http://localhost:4173] [--capturas DIR]

Necesita los tres navegadores de Playwright: python3 -m playwright install
webkit firefox (Chromium ya viene). Sale con codigo 1 si algo falla.
"""
import argparse
import os
import sys
from playwright.sync_api import sync_playwright

ANCHOS = [375, 390, 768, 1024, 1440]
AROMA = 'bagues-la-bomba'

MEDIR = """(nombre) => {
  const vw = innerWidth, vh = innerHeight, fallas = [];
  if (document.documentElement.scrollWidth > vw + 1) fallas.push(`la pagina se corre de costado: ${document.documentElement.scrollWidth} px en ${vw}`);
  const enFila = (e) => { for (let p = e.parentElement; p; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden' || o === 'clip') return p !== document.body && p !== document.documentElement; } return false; };
  const visible = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.opacity !== '0' && r.bottom > 0 && r.top < vh; };
  const raiz = document.querySelector('[role=dialog]:not([hidden])') || document;
  const todos = [...raiz.querySelectorAll('a, button, h1, h2, h3, p, img, input')].filter(visible);
  for (const e of todos) {
    if (e.closest('[aria-hidden=true]')) continue;
    const r = e.getBoundingClientRect();
    if ((r.right > vw + 1 || r.left < -1) && !enFila(e)) fallas.push(`${e.tagName.toLowerCase()} "${(e.innerText || e.alt || e.className || '').toString().trim().slice(0, 30)}" se sale: ${Math.round(r.left)} a ${Math.round(r.right)} de ${vw}`);
    if (e.tagName === 'IMG' && e.complete && e.naturalWidth === 0) fallas.push(`foto sin cargar: ${e.currentSrc || e.src}`);
    if ((e.tagName === 'BUTTON' || e.tagName === 'A' || /^H\\d$/.test(e.tagName)) && getComputedStyle(e).overflow !== 'visible' && e.scrollWidth > e.clientWidth + 2) fallas.push(`texto cortado en ${e.tagName.toLowerCase()} "${e.innerText.trim().slice(0, 30)}"`);
  }
  if (nombre === 'portada' && vw < 600) {
    const c = document.querySelector('[data-qa=hero-cta]');
    if (c) { const r = c.getBoundingClientRect(); const d = Math.round(r.left + r.width / 2 - vw / 2); if (Math.abs(d) > 4) fallas.push(`boton del hero corrido ${d} px del centro`); }
  }
  if (nombre === 'ficha') {
    const m = document.querySelector('[data-qa=ficha-media]');
    const i = m && m.querySelector('img');
    if (m && i) { const rm = m.getBoundingClientRect(), ri = i.getBoundingClientRect();
      if (vw < 820 && rm.height < vh * 0.4) fallas.push(`foto de la ficha aplastada: ${Math.round(rm.height)} px de alto`);
      if (ri.top < rm.top - 2) fallas.push(`foto de la ficha se sale por arriba (${Math.round(ri.top)} contra ${Math.round(rm.top)})`);
      // En escritorio la columna mide alto x 3/4; si la pantalla es angosta
      // cede ancho y la foto recorta un poco de pared (object-fit: cover),
      // nunca se estira. Falla si se deforma o si la columna queda flaca.
      const fit = getComputedStyle(i).objectFit;
      if (vw >= 820 && (fit !== 'cover' && fit !== 'contain')) fallas.push(`foto de la ficha estirada (object-fit ${fit})`);
      if (vw >= 820 && rm.width < rm.height * 0.6) fallas.push(`columna de la foto muy angosta: ${Math.round(rm.width)}x${Math.round(rm.height)}`);
    }
  }
  return fallas;
}"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--url', default='http://localhost:4173')
    ap.add_argument('--capturas', default='')
    a = ap.parse_args()
    if a.capturas:
        os.makedirs(a.capturas, exist_ok=True)
    total = 0
    with sync_playwright() as p:
        for motor_nombre, motor in (('webkit', p.webkit), ('chromium', p.chromium), ('firefox', p.firefox)):
            try:
                b = motor.launch()
            except Exception as e:
                print(f'{motor_nombre}: no se pudo abrir ({str(e)[:80]})')
                total += 1
                continue
            for w in ANCHOS:
                movil = w < 600
                op = dict(viewport={'width': w, 'height': 844 if movil else 900}, locale='es-AR')
                if movil and motor_nombre != 'firefox':
                    op.update(is_mobile=True, has_touch=True)
                if motor_nombre == 'firefox':
                    # En el contenedor de pruebas el trafico pasa por un proxy con
                    # su propio certificado, que Firefox no conoce (Chromium y
                    # WebKit si). Sin esto la base no contesta y el catalogo
                    # queda vacio. No cambia nada de la tienda.
                    op.update(ignore_https_errors=True)
                ctx = b.new_context(**op)
                pg = ctx.new_page()

                def revisar(nombre):
                    nonlocal total
                    pg.wait_for_timeout(900)
                    f = pg.evaluate(MEDIR, nombre)
                    estado = 'PASA ' if not f else 'FALLA'
                    print(f'  {estado} {motor_nombre:8} {w:5} {nombre:10} ' + ('; '.join(f[:4]) if f else ''), flush=True)
                    total += bool(f)
                    if a.capturas:
                        pg.screenshot(path=os.path.join(a.capturas, f'{motor_nombre}-{w}-{nombre}.png'))

                pg.goto(a.url + '/', wait_until='networkidle')
                revisar('portada')
                pg.evaluate("document.getElementById('ciudades')?.scrollIntoView()")
                revisar('ciudades')
                pg.goto(a.url + '/catalogo', wait_until='networkidle')
                pg.wait_for_selector('article', timeout=20000)
                revisar('catalogo')
                pg.goto(a.url + f'/catalogo?aroma={AROMA}', wait_until='networkidle')
                pg.wait_for_selector('[data-dialogo=ficha]', timeout=20000)
                revisar('ficha')
                pg.goto(a.url + '/catalogo', wait_until='networkidle')
                pg.wait_for_selector('article', timeout=20000)
                # la hoja de tamanos: el + de la primera tarjeta con varios tamanos
                abrio = pg.evaluate("""() => { const b = [...document.querySelectorAll('article button[aria-label^="Elegir"], article button[aria-haspopup]')][0]; if (b) { b.click(); return true; } return false; }""")
                if abrio:
                    revisar('hoja')
                    pg.keyboard.press('Escape')
                    pg.wait_for_timeout(400)
                # el carrito: agregar uno y abrirlo
                pg.evaluate("""() => { const b = [...document.querySelectorAll('article button')].find(x => /Agregar/.test(x.getAttribute('aria-label') || '')); b && b.click(); }""")
                pg.wait_for_timeout(600)
                if pg.locator('[role=dialog]').count() and not pg.locator("[role=dialog][aria-label='Tu pedido']").count():
                    pg.evaluate("() => { const f = document.querySelector('[role=dialog] [class*=filas] button, [role=dialog] button[class*=fila]'); f && f.click(); }")
                    pg.wait_for_timeout(600)
                if not pg.locator("[role=dialog][aria-label='Tu pedido']").count():
                    pg.evaluate("() => document.querySelector(\"header button[aria-label^='Ver pedido']\")?.click()")
                try:
                    pg.wait_for_selector("[role=dialog][aria-label='Tu pedido']", timeout=6000)
                    revisar('carrito')
                except Exception:
                    print(f'  FALLA {motor_nombre:8} {w:5} carrito    no se abrio el carrito')
                    total += 1
                ctx.close()
            b.close()
    print(f'\n{total} fallas')
    sys.exit(1 if total else 0)


if __name__ == '__main__':
    main()
