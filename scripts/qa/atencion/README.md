# heatmap.py: calor de atención para comparar antes y después

Predice dónde mira la gente en una página (mirada libre, los primeros segundos) y
le pone un puntaje de 0 a 10 a cada sección. Sirve para medir la tienda en
producción y las capturas de Figma con la misma vara.

## Instalar (una vez)

```bash
pip install --break-system-packages torch torchvision --index-url https://download.pytorch.org/whl/cpu
pip install --break-system-packages "torchvision==0.29.1+cpu" --force-reinstall --no-deps --index-url https://download.pytorch.org/whl/cpu
pip install --break-system-packages git+https://github.com/matthias-k/DeepGaze.git
pip install --break-system-packages --no-deps git+https://github.com/openai/CLIP.git
pip install --break-system-packages ftfy regex tqdm wcwidth einops pandas boltons
```

La primera corrida baja unos 800 MB de pesos (DeepGaze IIE de GitHub Releases y
las redes de ImageNet de download.pytorch.org). `deepgaze_pytorch` pide dos redes
por `torch.hub` a github.com/pytorch/vision, que en esta red está bloqueado: el
script las carga de torchvision (mismos pesos) sin tocar el paquete.

## Correr

```bash
# Producción (captura, secciones del DOM, calor, puntaje)
python3 heatmap.py --url https://baguesfraganciaswolf.vercel.app/ --ancho 390  --nombre 390
python3 heatmap.py --url https://baguesfraganciaswolf.vercel.app/ --ancho 1440 --nombre 1440

# Una captura de Figma exportada @2x (390 de ancho = 780 px)
python3 heatmap.py --imagen figma_portada_390@2x.png --dpr 2 --nombre figma_390
python3 heatmap.py --imagen figma_portada_1440.png --dpr 1 --nombre figma_1440 --secciones secciones_1440.json
```

Cada corrida tarda de 1 a 2 minutos en CPU (4,6 s por pantalla).

Sale, en `--salida` (por defecto `./salida`):

| Archivo | Qué es |
| --- | --- |
| `calor_<nombre>.jpg` | La página con el calor, la línea de cada sección con su puntaje y un círculo en el pico |
| `calor_<nombre>_scroll.jpg` | Lo mismo con la caída de atención por scroll (57 % / 17 % / 26 %, NN/g) |
| `secciones/<nombre>_NN_<sección>.jpg` | Un recorte por sección |
| `calor_<nombre>.json` | Los números de cada sección, el modelo y la rúbrica |

### Comparar con Figma de igual a igual

Sin DOM, el script no sabe dónde están las secciones, los botones ni el precio:
corta en bandas de una pantalla y detecta el texto por la imagen (aproximado). Para
que "el pico cae en algo que vende" valga, pasale un JSON en px css (los de Figma a
1x):

```json
{
  "secciones": [ {"nombre": "Hero", "x": 0, "y": 0, "w": 390, "h": 844},
                 {"nombre": "Destacados", "x": 0, "y": 844, "w": 390, "h": 620} ],
  "venta":     [ {"x": 24, "y": 590, "w": 342, "h": 64, "tipo": "cta"},
                 {"x": 24, "y": 560, "w": 120, "h": 24, "tipo": "precio"},
                 {"x": 70, "y": 290, "w": 250, "h": 250, "tipo": "producto"} ],
  "visual":    [ {"x": 0, "y": 0, "w": 390, "h": 844} ],
  "texto":     [ {"x": 24, "y": 96, "w": 330, "h": 52, "t": "titular"} ]
}
```

`venta` es lo que vende (foto de producto, precio, botón), `visual` lo que es foto
o fondo con imagen, `texto` los renglones. Si falta `texto`, se detecta solo.

**Sin ese JSON el puntaje no se puede comparar con el de la web.** "El pico vende"
y el "gancho visual" dan 0, y el texto detectado en la imagen queda por debajo del
que se mide en el DOM (en la prueba, 9 % contra 23 % en el hero). En ese caso
compará solo el mapa de calor y las columnas `atencion_rel` y `pico_rel`.
Exportá los frames con el mismo ancho y alto de visor que la web (390 x 844 o
1440 x 900 por pantalla) para que la escala del modelo sea la misma.

## El modelo

**DeepGaze IIE** (Linardos, Kümmerer, Press y Bethge, 2021,
https://arxiv.org/abs/2105.12441), pesos oficiales `deepgaze2e.pth` v1.0.0. Es el
mejor modelo abierto de saliencia en el banco MIT/Tübingen. Predice la densidad de
fijaciones de mirada libre de un adulto mirando una imagen unos segundos.

Cómo se usa acá:

- **Por pantallas, no la página entera achicada.** La gente ve un visor por vez:
  se corre el modelo en ventanas del alto del visor (844 o 900 px css) con paso de
  media pantalla y se promedia donde se solapan. Cada pantalla reparte la misma
  atención. Por eso `calor_<nombre>.jpg` muestra "qué mira quien llega a esa
  pantalla", y `_scroll.jpg` le aplica cuánta gente llega.
- **Escala:** la pantalla entra al modelo a 488 px de ancho (celular) y 1080 px
  (escritorio), unos 30 px por grado visual, como el banco MIT1003 con el que se
  entrenó.
- **Sesgo de centro:** el `centerbias_mit1003.npy` oficial no se pudo bajar
  (GitHub raw devuelve 403 en esta red). Se usa una gaussiana propia: centrada al
  42 % del alto (un poco arriba del medio) y, en escritorio, al 46 % del ancho.
- **Respaldo:** si DeepGaze no carga, cae a OpenCV (spectral residual + fine
  grained) con el mismo sesgo y +35 % de peso donde hay texto (el texto atrae
  fijaciones y el espectral lo subestima). Es bastante peor. El JSON dice siempre
  cuál se usó (`"modelo"`). `--modelo deepgaze` falla en vez de caer.

## La rúbrica (0 a 10 por sección)

| Criterio | Puntos | Cómo se mide |
| --- | --- | --- |
| Atención media | 2,5 | densidad media de la sección / media de la página (r). 2,5 x min(1, r / 1,5) |
| Pico | 1,5 | percentil 99 de la sección / percentil 99 de la página (q). 1,5 x min(1, q) |
| El pico vende | 2 | del 10 % más caliente de la sección, qué parte cae sobre producto, precio o botón (f). 2 x min(1, f / 0,5) |
| Densidad de texto | 1,5 | % del área con renglones de texto (t). 1,5 si t <= 12 %, 0 si t >= 40 %, lineal en el medio |
| Contraste | 1 | percentil 10 del contraste WCAG medido en píxeles de cada renglón (c). 1 si c >= 4,5; 0,5 si c >= 3; 0 si menos |
| Gancho visual | 1,5 | % del área con foto o fondo con imagen (v) y colorido de Hasler-Süsstrunk. 1,2 x min(1, v / 0,35) + 0,3 x min(1, colorido / 45) |

El contraste se mide en la captura (percentiles 4 y 96 de luminancia de cada
renglón), no en el CSS: cuenta el fondo real, la foto de atrás o el degradé.

## Lo que no mide

- **Mirada libre, no intención de compra.** Alguien que entra buscando "Good Girl"
  no mira como el modelo: va al buscador. El calor dice qué gana la pelea por la
  atención cuando nadie tiene apuro, no qué convierte.
- **Entrenado con fotos, no con páginas web.** Tiende a subestimar texto chico y
  botones sin contraste y a sobrestimar caras y objetos aislados.
- **No ve movimiento.** La cinta que se mueve, los reveals y las animaciones
  atraen la mirada y el modelo no lo sabe.
- **Promedio de personas, no una.** Y no sabe nada de Instagram, de la confianza
  ni del precio de la competencia.
- Comparar puntajes solo entre capturas del mismo ancho y con el mismo script.
