#!/usr/bin/env python3
"""
La previa del hero del celular: la escena a 195 x 422 en WebP (unos 2,8 kB),
que va dentro del CSS (Hero.module.css, variable --previa) y se pinta al
instante debajo de la escena nitida.

Tiene que pesar mas de 0,05 bits por pixel de pantalla (412 x 758 en un
celular comun: mas de 1.950 bytes). Por debajo de eso Chrome la considera
"de baja entropia" y no la cuenta para el LCP; por encima, el LCP se marca
cuando aparece la escena y no cuando termina de bajar la nitida.

    python3 scripts/rediseno/hornear_hero.py scripts/rediseno/ciclo.json
    python3 scripts/rediseno/previa_hero.py
    # y pegar el data: que imprime en --previa de Hero.module.css
"""
import base64, io, os
from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
src = Image.open(os.path.join(AQUI, 'salida', 'hero_c', 'hero_c_780x1688.png')).convert('RGB')
b = io.BytesIO(); src.resize((195, 422), Image.LANCZOS).save(b, 'WEBP', quality=50, method=6)
open(os.path.join(AQUI, '..', '..', 'public', 'hero', 'c', 'hero_c_previa_195x422.webp'), 'wb').write(b.getvalue())
n = len(b.getvalue())
print(f'{n} bytes, {n * 8 / (412 * 758):.3f} bits por pixel a 412 x 758')
print('data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode())
