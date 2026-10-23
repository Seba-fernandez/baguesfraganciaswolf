"""Arma el video 4:5 para LinkedIn: antes y después, dos celulares lado a lado.

    python3 scripts/video/componer.py --antes videos/antes/celular-1080x1920.mp4 \
        --despues videos/despues/celular-1080x1920.mp4 --salida videos/antes-despues-1080x1350.mp4

La placa (fondo, biseles, títulos y firma) se dibuja en HTML con las letras
de la propia web y se saca como dos PNG: uno debajo de los videos y otro
encima, con la pantalla transparente y las esquinas redondeadas. ffmpeg pone
los dos celulares en el medio. El más corto se sostiene en su último cuadro.
"""
import argparse
import subprocess
import tempfile
from pathlib import Path

from playwright.sync_api import sync_playwright

RAIZ = Path(__file__).resolve().parents[2]
ANCHO, ALTO = 1080, 1350
PANTALLA = (450, 800)          # 9:16
BISEL = 14
Y_CEL = 252
X_CEL = (40, 562)

HTML = """<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: Melodrama; font-weight: 600; src: url('{fonts}/melodrama-600.woff2'); }
@font-face { font-family: Boska; font-style: italic; src: url('{fonts}/boska-italic-400.woff2'); }
@font-face { font-family: Boska; font-style: normal; src: url('{fonts}/boska-400.woff2'); }
@font-face { font-family: Plex; src: url('{fonts}/plexmono-500.woff2'); }
@font-face { font-family: Figtree; src: url('{fonts}/figtree-400.woff2'); }
html, body { margin: 0; width: {ancho}px; height: {alto}px; overflow: hidden; }
body { background: {fondo}; color: #faefea; font-family: Figtree; position: relative; }
.fondo { position: absolute; inset: 0;
  background: radial-gradient(70% 45% at 50% 52%, #4b1217 0%, #240604 70%); }
.cel { position: absolute; top: {y}px; width: {aw}px; height: {ah}px; border-radius: 58px;
  box-sizing: border-box; }
.debajo .cel { background: #000; box-shadow: 0 40px 80px rgba(0,0,0,.55), 0 0 0 1px rgba(250,239,234,.10); }
.encima .cel { overflow: hidden; }
.esquinas { position: absolute; inset: {bisel}px; border-radius: 44px; box-shadow: 0 0 0 60px #0d0b0b; }
.borde { position: absolute; inset: 0; border-radius: 58px; box-shadow: inset 0 0 0 1.5px rgba(255,255,255,.09); }
.rotulo { position: absolute; top: {ry}px; width: {aw}px; text-align: center; font-family: Boska; font-style: italic;
  font-size: 40px; color: #e7cfc6; }
.rotulo b { display: block; font-family: Plex; font-style: normal; font-weight: 500; font-size: 15px;
  letter-spacing: .18em; text-transform: uppercase; color: #e0708a; margin-bottom: 6px; }
.cabeza { position: absolute; top: 58px; left: 0; right: 0; text-align: center; }
.cabeza .ojo { font-family: Plex; font-size: 16px; letter-spacing: .22em; text-transform: uppercase; color: #e0708a; }
.cabeza h1 { margin: 14px 0 8px; font-family: Melodrama; font-weight: 600; font-size: 76px; line-height: 1; letter-spacing: -.01em; }
.cabeza p { margin: 0; font-family: Boska; font-style: italic; font-size: 30px; color: #e7cfc6; }
.firma { position: absolute; bottom: 52px; left: 0; right: 0; text-align: center; font-family: Plex; font-size: 17px;
  letter-spacing: .14em; color: #e7cfc6; }
.firma span { color: #e0708a; }
</style></head><body class="{capa}">
{contenido}
</body></html>"""


def placa(capa, rotulos):
    aw, ah = PANTALLA[0] + 2 * BISEL, PANTALLA[1] + 2 * BISEL
    partes = []
    if capa == "debajo":
        partes.append('<div class="fondo"></div>')
        partes.append('<div class="cabeza"><div class="ojo">Tienda Bagués · Córdoba</div>'
                      '<h1>Antes y después</h1><p>Mi primera tienda web y su rediseño</p></div>')
    for i, x in enumerate(X_CEL):
        if capa == "encima":
            partes.append(f'<div class="cel" style="left:{x}px"><div class="esquinas"></div><div class="borde"></div></div>')
        else:
            partes.append(f'<div class="cel" style="left:{x}px"></div>')
            partes.append(f'<div class="rotulo" style="left:{x}px"><b>{rotulos[i][0]}</b>{rotulos[i][1]}</div>')
    if capa == "debajo":
        partes.append('<div class="firma">SEBADEV <span>/</span> Juan Sebastián Fernández <span>/</span> Octubre 2026</div>')
    return (HTML.replace("{fonts}", (RAIZ / "public/fonts").as_uri())
            .replace("{ancho}", str(ANCHO)).replace("{alto}", str(ALTO))
            .replace("{fondo}", "transparent" if capa == "encima" else "#240604")
            .replace("{y}", str(Y_CEL)).replace("{aw}", str(aw)).replace("{ah}", str(ah))
            .replace("{bisel}", str(BISEL)).replace("{sy}", str(Y_CEL + BISEL))
            .replace("{sw}", str(PANTALLA[0])).replace("{sh}", str(PANTALLA[1]))
            .replace("{ry}", str(Y_CEL + ah + 26)).replace("{capa}", capa)
            .replace("{contenido}", "\n".join(partes)))


def duracion(video):
    salida = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", video],
                            capture_output=True, text=True, check=True).stdout
    return float(salida)


def componer(antes, despues, salida):
    tmp = Path(tempfile.mkdtemp())
    rotulos = [("La primera", "Antes"), ("El rediseño", "Después")]
    with sync_playwright() as p:
        nav = p.chromium.launch(args=["--font-render-hinting=none"])
        pg = nav.new_page(viewport={"width": ANCHO, "height": ALTO})
        for capa in ("debajo", "encima"):
            archivo = tmp / f"{capa}.html"
            archivo.write_text(placa(capa, rotulos), encoding="utf-8")
            pg.goto(archivo.as_uri())
            pg.evaluate("document.fonts.ready")
            pg.wait_for_timeout(300)
            pg.screenshot(path=str(tmp / f"{capa}.png"), omit_background=(capa == "encima"))
        nav.close()

    largo = max(duracion(antes), duracion(despues))
    w, h = PANTALLA
    sx = [x + BISEL for x in X_CEL]
    sy = Y_CEL + BISEL
    filtro = (
        f"[1:v]scale={w}:{h}:flags=lanczos,tpad=stop_mode=clone:stop_duration={largo}[a];"
        f"[2:v]scale={w}:{h}:flags=lanczos,tpad=stop_mode=clone:stop_duration={largo}[d];"
        f"[0:v][a]overlay={sx[0]}:{sy}[t1];[t1][d]overlay={sx[1]}:{sy}[t2];"
        f"[t2][3:v]overlay=0:0,format=yuv420p[v]"
    )
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error",
                    "-loop", "1", "-framerate", "30", "-i", str(tmp / "debajo.png"),
                    "-i", antes, "-i", despues,
                    "-loop", "1", "-framerate", "30", "-i", str(tmp / "encima.png"),
                    "-filter_complex", filtro, "-map", "[v]", "-t", f"{largo:.2f}", "-r", "30",
                    "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-movflags", "+faststart", salida], check=True)
    print(f"{salida}: {largo:.1f} s")


if __name__ == "__main__":
    a = argparse.ArgumentParser()
    a.add_argument("--antes", required=True)
    a.add_argument("--despues", required=True)
    a.add_argument("--salida", required=True)
    x = a.parse_args()
    componer(x.antes, x.despues, x.salida)
