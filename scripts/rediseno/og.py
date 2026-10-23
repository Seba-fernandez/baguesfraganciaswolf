#!/usr/bin/env python3
"""
La imagen para compartir (public/og.jpg, 1200 x 630): el hero de la portada
con el sello, el titulo y la bajada, sin botones, sin barra y sin la linea de
precio y aromas (cambian cada ciclo y WhatsApp guarda la imagen por semanas).

    npm run build && node scripts/qa/servir.mjs &
    python3 scripts/rediseno/og.py [--url http://localhost:4173]

Se saca a 2x y se achica a 1200 x 630, asi la letra queda nitida. Queda en
unos 110 kB (WhatsApp no muestra imagenes de mas de 300 kB).
"""
import argparse, io, os
from playwright.sync_api import sync_playwright
from PIL import Image

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OCULTAR = """
  .tienda > header, [data-hero=cinta], [data-qa=hero-datos], [data-hero=promos],
  [class*=_acciones], [class*=volver], [class*=Volver] { display: none !important; }
  #inicio-hero { margin-top: 0 !important; }
  #inicio-hero [class*=_caja] { height: 630px !important; }
  #inicio-hero [class*=_inner] { padding-top: 0 !important; padding-bottom: 0 !important; }
"""

ap = argparse.ArgumentParser(); ap.add_argument('--url', default='http://localhost:4173')
a = ap.parse_args()
with sync_playwright() as p:
    b = p.chromium.launch(args=['--font-render-hinting=none'])
    pg = b.new_context(viewport={'width': 1200, 'height': 630}, device_scale_factor=2, reduced_motion='reduce').new_page()
    pg.goto(a.url + '/', wait_until='networkidle'); pg.wait_for_timeout(1500)
    pg.add_style_tag(content=OCULTAR); pg.wait_for_timeout(800)
    im = Image.open(io.BytesIO(pg.screenshot(clip={'x': 0, 'y': 0, 'width': 1200, 'height': 630}))).convert('RGB')
    im.resize((1200, 630), Image.LANCZOS).save(os.path.join(RAIZ, 'public', 'og.jpg'), quality=86, optimize=True, progressive=True)
    b.close()
print('public/og.jpg', os.path.getsize(os.path.join(RAIZ, 'public', 'og.jpg')) // 1024, 'kB')
