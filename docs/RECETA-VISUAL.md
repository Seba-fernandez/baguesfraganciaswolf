# Receta visual: de las referencias a los assets

Cómo se hizo la identidad del rediseño de Bagués, paso a paso y con los números
reales, para poder calcarla en otro proyecto. Está escrita para repetirse, no
como historia: cada paso dice qué entra, qué sale, con qué herramienta y qué
mirar antes de seguir.

Lo que produce:

- El ADN medido de las referencias.
- La pareja tipográfica y su regla de tamaños.
- El guion de color de la página.
- La pared con su luz, donde vive todo producto.
- Las fotos de producto compuestas sobre esa pared (las "fotos pared vino").
- El vidrio acanalado.
- El adorno caligráfico.

Herramientas: Python 3 con `numpy`, `opencv-python-headless` y `Pillow` (con
AVIF); Node con `sharp`; Playwright para mirar; un generador de imágenes (acá,
`generate_image` de Figma) solo para las fuentes de fondo. Los scripts están en
[`scripts/rediseno/`](../scripts/rediseno/).

---

## 0. El orden importa

1. Descifrar las referencias **antes** de diseñar nada.
2. Elegir la letra y el título.
3. Escribir el guion de color de la página entera.
4. Recién ahí producir assets, todos con el mismo grado.
5. Diseñar en Figma, aprobar, y después código.

En Bagués, saltar del 1 al 4 produjo una primera versión que "tomaba el vidrio
y lo pegaba": se descartó. El paso 3 es el que hace que todo parezca la misma
película.

---

## 1. Descifrar las referencias (design-dna)

**Entra:** las capturas que eligió el cliente (en Bagués, 3: una tienda
editorial de fruta, NOIR y PRISM). **Sale:** una ficha de ADN con colores
medidos, voces tipográficas, densidad de texto, tratamiento de foto y formas.

Herramienta: [design-dna](https://github.com/zanwei/design-dna). Su script
de color solo usa `sharp` y cálculo local (sin red, sin procesos externos).

```bash
git clone --depth 1 https://github.com/zanwei/design-dna
ln -s "$PWD/node_modules" design-dna/scripts/node_modules   # sharp del proyecto
# Recortar cada captura a la web en sí (sin la lámina de presentación) y
# por zonas: hero y cuerpo por separado. Si no, el fondo de la lámina ensucia.
node design-dna/scripts/measure-colors.mjs "$PWD/refs/01-hero.png"   > refs/01-hero.color.json
node design-dna/scripts/measure-colors.mjs "$PWD/refs/01-cuerpo.png" > refs/01-cuerpo.color.json
```

**Medir, no estimar:** a ojo, los colores derivan hacia los de siempre. En
Bagués la medición dio el dato que cambió todo el diseño:

| Referencia | Hero | Cuerpo |
| --- | --- | --- |
| Fruta | vino `#4b1217` (56 %) | papel `#f6ece8` (61 %) |
| NOIR | casi negro `#170605` y rojo `#ba3e23` | igual |
| PRISM | oliva y crema detrás de vidrio | `#f6f5f3` (48 %) |

Dos de tres leen sobre **papel claro** y guardan el color fuerte para el hero y
las fotos. La tienda era oscura de punta a punta: por eso la letra se veía
"recortada y pegada".

**Tipografía:** ampliar los títulos y las etiquetas 3x con `PIL.Image.resize(...,
LANCZOS)` y mirarlos. Checklist de lo que hay que anotar:

- [ ] ¿Cuántas voces tipográficas hay y qué hace cada una? (Fruta: serif
  condensada con redonda e itálica en el mismo título, mono en mayúsculas para
  nombres y precios, caligrafía para rótulos.)
- [ ] ¿Cuánto texto corrido hay? (Fruta: casi nada; nombres grandes con dos
  líneas en mono al costado.)
- [ ] ¿Cómo está tratada la foto? (Fruta: bodegón, luz de ventana, lino.
  NOIR: todo virado a un color.)
- [ ] ¿Qué formas no son rectángulos? (Fruta: cartucho barroco, arcos.)
- [ ] ¿Qué se repite entre las referencias? Eso es el ADN; lo que aparece en
  una sola es un adorno de esa referencia.

---

## 2. Letra y título

**Dónde buscar letras con personalidad** (gratis, también para uso comercial):

- [Fontshare](https://www.fontshare.com) (Indian Type Foundry, licencia ITF FFL).
  El CSS dice dónde está cada `woff2`:
  `https://api.fontshare.com/v2/css?f[]=melodrama@600&display=swap`.
- [Fontsource](https://fontsource.org) por npm (`npm pack @fontsource/<familia>`),
  todas OFL.
- Evitar como primera opción las que salen en cualquier web hecha con IA
  (Instrument Serif, Fraunces, Inter): se sienten ya vistas.

**Probar al tamaño real, no en una lista.** La misma palabra del cliente
("Granada"), sobre su imagen real, a dos tamaños:

- 72 px: título y nombres grandes.
- 17 px: un nombre en la tarjeta del celular.

**Lo que se eligió en Bagués:**

- **Melodrama 600** (Fontshare) para lo que se ve de lejos: título del hero,
  nombres de ciudades, cifras grandes. Es condensada y dramática; a 17 px se
  aprieta y pierde los finos.
- **Boska 400/500 con itálica** (Fontshare) para lo mediano (nombre de cada
  perfume, ficha) y para la itálica del título, que Melodrama no trae.
- **IBM Plex Mono 500** para todo lo que es dato: ml, precio, código, caja.
- **La Belle Aurore** (caligrafía) solo para rótulos de sección, de a uno.

**Título:** sale de algo que el negocio ya tiene, no de una metáfora. Las
cajas Bagués llevan nombre de ciudad: "Cada perfume, *una ciudad.*" (la
segunda parte en la itálica de Boska).

---

## 3. Guion de color

La página como una película en dos luces, con un mismo grado para todo.

| Plano | Sección | Luz |
| --- | --- | --- |
| 1 | Hero | noche: pared vino con una ventana cálida |
| 2 | Las ciudades | día: papel, mucho aire |
| 3 | ¿Qué te gusta oler? | día con cinco ventanas de noche |
| 4 | Los que siempre salen | clímax: banda vino entera, productos sobre la misma pared |
| 5 | Cómo funciona | respiro: papel |
| 6 | Antes de pedir | papel un tono más hondo |
| 7 | Pie | noche otra vez |

La curva de luminosidad alterna (baja, alta, media, baja, alta, alta, baja):
nunca dos secciones oscuras seguidas, nunca más de dos claras sin una pieza
visual fuerte.

**La LUT (el grado), en 5 reglas:**

1. **Blanco:** nunca `#fff`. El papel `#f6ece8`; las luces de las fotos tiran a él.
2. **Negro:** nunca negro neutro. Vino hondo `#240604`; las sombras se tiñen de vino.
3. **Un acento:** rubí `#9e2335`, solo en lo que se toca.
4. **Ingredientes apagados:** medios cálidos, saturación contenida.
5. **Una luz:** ventana arriba a la izquierda en todo (hero, cajas, productos)
   y el mismo grano fino en toda la página.

Para otro proyecto: reemplazar los cinco hex por los medidos en el paso 1. La
estructura (dos luces, una curva que alterna, un clímax) se mantiene.

---

## 4. La pared (el set de fotos)

La pared es el escenario donde vive todo producto: hero, destacados, catálogo.

**Fuente generada** (dos imágenes, una apaisada y una vertical):

```
empty dark wine-red plaster wall with a soft circular warm pink light pool,
a narrow dark stone ledge along the bottom, studio photograph, no objects, no text
```

Guardadas en `scripts/rediseno/generadas/pared_escritorio_gen.webp` y
`pared_celular_gen.webp`. **De la foto generada se usa solo la textura**, no su
luz: así la luz la decidimos nosotros y cae donde conviene (nunca debajo del
título).

`hacer_pared()` en `hornear_hero.py`:

1. **Relieve del yeso:** `detalle = clip(Y / GaussianBlur(Y, 38), 0.55, 1.6)`,
   donde `Y` es la luminancia. Es un pasa-altos: queda la textura y se va la
   luz original. Se escala a la densidad de salida y se repite en espejo si no
   alcanza.
2. **Grano:** ruido gaussiano desenfocado 0,6 px, al 3,5 %, para que no quede
   blando al ampliar.
3. **Luz nueva:**
   - ambiente: de `SOMBRA #14070a` a `VINO #4a161f`, que cae hacia los bordes:
     `amb = 0.30 + 0.70 · exp(-(dx/0.85W)² - (dy/0.9H)²)`;
   - halo: `exp(-1.6 · d²)` con el radio del formato, mezcla `ROSA·0.62 + VINO·0.38`
     al 95 %.
4. **Textura sobre la luz:** el relieve pesa más donde hay luz
   (`0.55 + 0.9 · halo`), como en una pared real.
5. **Oclusión** donde la pared toca la repisa: 40 % que se apaga en 10 px.
6. **Repisa:** superficie y frente tomados de la foto generada, teñidos hacia
   el vino (`L · (1, .62, .62) · .6 + color · .4`), iluminados por el halo, con
   un filo de luz oro de 1 px en el canto.
7. **Repisa apagada del lado del texto** (escritorio, x 420 a 760): la luz vive
   solo del lado del producto, y el título conserva su contraste.

---

## 5. El producto en la pared (las "fotos pared vino")

**Entra:** un PNG con fondo transparente (las cajas de bagues.com.ar, o una
foto propia recortada). **Sale:** una foto 900x1200 (3:4) del producto parado
en la pared, en WebP y AVIF de hasta 90 kB.

`hacer_destacados()` en `hornear_piezas.py`, con el motor de `hornear_hero.py`:

1. **Recortar y limpiar el filo** (`cargar_caja`): se recorta al alfa y se
   oscurece el borde semitransparente (`rgb · (0.55 + 0.45 · alfa)`). Los PNG
   de Shopify traen un halo blanco en el filo que, sobre una pared oscura, se
   ve como un recorte pegado.
2. **Escalar** a la altura del formato (en el destacado, 212 px CSS a 3x).
3. **Graduar con la luz de la escena** (`tratar_caja`):
   - gradiente lateral +16 % del lado que mira al halo;
   - la base 10 % más oscura en el último cuarto (oclusión sobre la repisa);
   - tinte cálido `(1, .96, .94)` en la caja principal, `(1, .93, .90)` en las de atrás;
   - las cajas de atrás, con la saturación bajada (`0.78 + 0.22 · luz`).
4. **Luz de contorno cálida:** el borde del alfa del lado del halo, corrido
   2,2 px y desenfocado 0,8 px, más fuerte arriba (la luz viene de arriba),
   en `ROSA·0.55 + ORO·0.45`, al 55 % en la caja principal. Es lo que hace que
   el producto parezca **en** la luz y no delante de ella.
5. **Tres sombras** (`sombras_y_reflejo`), en este orden:
   - **proyectada en la pared:** el alfa desenfocado al 5 % de la altura, al
     38 %, corrida 6 % del lado contrario a la luz;
   - **reflejo en la repisa:** la caja dada vuelta, el 32 % de su altura, con
     desvanecido `^1.6`, al 20 %, desenfocada en vertical (0,6 x 2,2 px),
     oscurecida 25 % y recortada al plano de la repisa;
   - **de contacto:** una elipse del ancho de la caja y 3 % de su alto, al 80 %.
     Sin ella el producto flota.
6. **Viñeta suave:** `1 - 0.16 · (x⁴ + y⁴)`, normalizados de -1 a 1.
7. **Exportar** con `exportar_peso()`: WebP calidad 84 y AVIF 62; si se pasa
   del límite, baja de a 4 puntos (nunca de 30).

**Para el catálogo entero** (133 fotos) el mismo proceso entra al pipeline de
siempre (`scripts/fotos/componer.mjs`), cambiando el estudio espresso por esta
pared. Ojo con los frascos de vidrio transparente de Unlock (tratamiento
`espresso`): su fondo original se ve a través del vidrio y hay que recortarlos
con su máscara antes de apoyarlos en la pared. Se prueba primero con 8 fotos
y la hoja de contacto.

---

## 6. El vidrio acanalado

`aplicar_vidrio()` en `hornear_hero.py`. Por cada estría (30 px CSS en escritorio,
24 en celular, 26 en destacados), con `u` de -1 a 1 a lo ancho de la estría:

1. **Lente cilíndrica:** desvío horizontal `Wf · (0.34·u³ + 0.52·u)`. El centro
   casi no desvía; los bordes desvían y comprimen. Es lo que separa "vidrio" de
   "franjas planas".
2. **Desenfoque vertical** leve (0,6 x 2,4 px) y más fuerte en los bordes de
   cada estría (`|u|⁴`).
3. **Aberración cromática** de 1 px: rojo y azul corridos en sentido opuesto.
4. **Transmisión** `(.93, .91, .90)`: el vidrio come un poco de luz.
5. **Sombra en el valle** entre estrías (38 %) y sombreado de cilindro.
6. **Dos brillos finos:** uno hueso por la luz de frente (`u = -0.55`) y uno oro
   por el halo de atrás (`u = 0.82`), cada uno según lo que haya detrás.
7. **Bisel** en el canto del panel y de la ventana: línea clara, banda oscura,
   más brillante del lado que mira arriba a la izquierda.

La ventana en arco se recorta con un campo de distancia (`sdf_arco`): adentro,
la caja nítida; afuera, el vidrio.

---

## 7. El adorno caligráfico

`scripts/rediseno/trazo.py` dibuja un trazo de plumilla como contorno relleno
de grosor variable (no una línea de grosor parejo):

1. **Línea central:** una ese larga a mano (puntos en `P`) y un **espiral
   calculado** con radio que se achica parejo (`R0 7.2` a `R1 2.9`, 345°). Un
   espiral dibujado a mano punto por punto siempre queda con quiebres.
2. **Remuestreo a paso constante** (0,35) y **suavizado** con ventana que se
   achica en las puntas: el trazo sale de un solo movimiento.
3. **Grosor según la presión:** base 0,8; las bajadas engordan
   (`+ 2.1 · bajada^0.72`) y las subidas quedan en pelo (0,34). Suavizado 90
   pasadas, para que el peso entre y salga como con la mano.
4. **Arranque firme** (cabeza redonda, sin afinar) y **remate en gota** de 1,5.

```bash
python3 scripts/rediseno/trazo.py "#faefea" > trazo-crema.svg   # sobre vino
python3 scripts/rediseno/trazo.py "#4b1217" > trazo-vino.svg    # sobre papel
```

Uso: espejado a cada lado del botón principal (`transform: scaleX(-1)` en el de
la derecha), de 64 a 120 px de ancho según la pantalla. Para otra forma, se
cambian los puntos de `P` y el espiral; la presión y el suavizado se dejan.

---

## 8. Control de calidad (antes de dar un asset por bueno)

- [ ] **Mirarlo** al tamaño real y ampliado.
- [ ] **Contraste medido** del texto contra el **peor píxel** de su zona
  (`contraste()` en `hornear_hero.py`): 4,5:1 o más.
- [ ] **Pesos:** hero hasta 220 kB a 1440 y 140 kB a 780; productos hasta 90 kB.
- [ ] **Hoja de contacto** con todo junto (`hoja_contacto.py`).
- [ ] **Nada que imite a otra marca:** en Bagués, ningún frasco con forma de
  diseñador ni logo ajeno en hero, og o redes.
- [ ] **El mismo grado en todo:** ponerlo al lado de las otras piezas; si una
  parece de otra película, el problema es el grado, no la pieza.

---

## 9. Calcarlo en otro proyecto

| Qué cambia | Dónde |
| --- | --- |
| Paleta (vino, sombra, halo, oro, papel) | constantes `VINO`, `SOMBRA`, `ROSA`, `ORO`, `HUESO` arriba de `hornear_hero.py` |
| La pared | el prompt del paso 4 con el color y el material del nuevo proyecto; las dos imágenes en `generadas/` |
| Los productos | rutas a PNG recortados en `ciclo.json` o en la lista `DESTACADOS` |
| Medidas y zonas de texto | `FORMATOS` en `hornear_hero.py` (todo en px CSS; `escala` es la densidad) |
| Estría del vidrio | `estria` de cada formato |
| El adorno | puntos `P` y espiral de `trazo.py` |
| Letras | paso 2, siempre probadas al tamaño real |

Lo que **no** cambia, porque es la receta:

- medir las referencias;
- un grado común;
- la luz de la foto generada no se usa, solo su textura;
- luz de contorno y tres sombras en cada producto;
- probar todo al tamaño real.
