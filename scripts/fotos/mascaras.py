"""
Calcula la mascara del frasco de cada foto con "tratamiento" estudio o
espresso (ver scripts/fotos/README.md) y la guarda en
scripts/fotos/datos/mascaras/, que SI se versiona.

    python3 scripts/fotos/mascaras.py                # las que faltan o cambiaron
    python3 scripts/fotos/mascaras.py unlock-kenzo-homme   # solo esa (o varias)

No hace falta correrlo a mano: componer.mjs lo llama solo cuando a una foto le
falta la mascara. Corre UNA vez por foto: despues la mascara queda guardada y
componer.mjs no vuelve a necesitar Python. El build de Vercel no lo usa nunca.

Necesita rembg con el modelo isnet-general-use (se baja solo la primera vez,
~180 MB, a ~/.rembg):

    pip install --break-system-packages rembg onnxruntime

indice.json guarda, por foto, el sha1 de la fuente con la que se calculo la
mascara: si la fuente cambia, la mascara se rehace sola.
"""
import hashlib
import json
import os
import sys
from urllib.parse import urlparse

from PIL import Image

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
FUENTES = os.path.join(RAIZ, 'scripts/fotos/fuentes.json')
CACHE = os.path.join(RAIZ, 'scripts/fotos/datos/fuentes')
SALIDA = os.path.join(RAIZ, 'scripts/fotos/datos/mascaras')
INDICE = os.path.join(SALIDA, 'indice.json')
MODELO = 'isnet-general-use'
# Las mascaras se guardan con el lado mayor en este tope: alcanza para una foto
# de 900x1200 y el repo no crece de mas.
LADO_MAX = 1200


def ruta_fuente(slug, linea, f):
    if 'archivo' in f:
        return os.path.join(RAIZ, f['archivo'])
    ext = os.path.splitext(urlparse(f['url']).path)[1] or '.img'
    return os.path.join(CACHE, f'{slug}__{linea}{ext}')


def main():
    pedidas = set(sys.argv[1:])
    fuentes = json.load(open(FUENTES, encoding='utf8'))
    indice = json.load(open(INDICE)) if os.path.exists(INDICE) else {}
    os.makedirs(SALIDA, exist_ok=True)

    pendientes = []
    for slug, por_linea in fuentes.items():
        for linea, f in por_linea.items():
            if f.get('tratamiento') not in ('estudio', 'espresso'):
                continue
            if pedidas and slug not in pedidas and f'{slug}__{linea}' not in pedidas:
                continue
            fuente = ruta_fuente(slug, linea, f)
            if not os.path.exists(fuente):
                print(f'  falta la fuente de {slug} ({linea}): corre antes npm run fotos:componer')
                continue
            sha = hashlib.sha1(open(fuente, 'rb').read()).hexdigest()
            clave = f'{slug}__{linea}'
            png = os.path.join(SALIDA, f'{clave}.png')
            if not pedidas and indice.get(clave, {}).get('sha1') == sha and os.path.exists(png):
                continue
            pendientes.append((clave, fuente, png, sha))

    if not pendientes:
        print('  mascaras: todas al dia')
        return

    from rembg import new_session, remove  # recien aca: si no hace falta, no se importa
    sesion = new_session(MODELO)
    for clave, fuente, png, sha in pendientes:
        im = Image.open(fuente).convert('RGB')
        mascara = remove(im, session=sesion, only_mask=True).convert('L')
        if max(mascara.size) > LADO_MAX:
            mascara.thumbnail((LADO_MAX, LADO_MAX), Image.LANCZOS)
        mascara.save(png, optimize=True)
        indice[clave] = {'sha1': sha, 'modelo': MODELO, 'fuente': list(im.size)}
        print(f'  mascara {clave} {im.size[0]}x{im.size[1]}')

    with open(INDICE, 'w') as salida:
        json.dump(dict(sorted(indice.items())), salida, indent=1)


if __name__ == '__main__':
    main()
