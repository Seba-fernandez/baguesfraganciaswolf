# Imágenes del rediseño C ("A través del vidrio")

Acá vive lo necesario para volver a hornear las imágenes de la portada cuando
cambian las cajas del ciclo o llegan fotos propias de Sebas. Lo que se publica
está en `public/hero/c/`, `public/familias/` y `public/nosotros/`. Nada de esto
corre en el build de Vercel: las imágenes van commiteadas.

## Qué hay

| Archivo | Para qué |
| --- | --- |
| `hornear_hero.py` | Arma el hero: pared vino con halo, cajas Bagués reales detrás del vidrio acanalado y una ventana en arco con una caja nítida. Saca 1440x900, 2880x1800, 390x844, 780x1688 y 1170x2532 en WebP y AVIF, con las capas separadas |
| `ciclo.json` | Qué caja va en la ventana y cuáles detrás del vidrio (slugs de la base o rutas a PNG recortados) |
| `hornear_piezas.py` | Texturas y frascos de las familias, destacados nítidos y con vidrio, hero A (bodegón), `og.jpg` y maquetas |
| `hoja_contacto.py` | Una hoja con todo junto para revisar antes de publicar |
| `generadas/` | Las 9 imágenes generadas con IA (paredes, bodegón, texturas). Son la fuente: no se vuelven a generar (cada una costó una generación paga) |
| `referencias.md` | Las referencias de vidrio acanalado, bodegón y perfumería de nicho, con qué tomar de cada una |

## Volver a hornear el hero

```bash
pip install --break-system-packages numpy opencv-python-headless pillow
cd scripts/rediseno
# 1. Cambiar ciclo.json: "ventana" es la caja nítida, "cajas" las de atrás.
python3 hornear_hero.py ciclo.json --rapido   # prueba en 1x, menos de un minuto
python3 hornear_hero.py ciclo.json            # completo, unos 3 minutos
# 2. Mirar salida/hero_c/ y salida/hero_c/informe.json (pesos y contraste)
# 3. Copiar los WebP y AVIF a public/hero/c/ con el mismo nombre
```

- Las cajas se bajan solas de bagues.com.ar (URLs en `scripts/fotos/fuentes.json`) a
  `cache/cajas/`, que no se versiona.
- **Solo cajas Bagués.** Si un slug no tiene caja Bagués, el script rechaza el
  frasco Unlock: nunca un frasco con forma de diseñador en el hero.
- **Fotos propias de Sebas:** en `ciclo.json` se puede poner la ruta a un PNG ya
  recortado en vez de un slug. Con una luz lateral de ventana del lado
  izquierdo, fondo oscuro mate y la cámara a la altura de la caja, se integran
  mejor que los renders planos de la tienda.
- El informe mide el contraste de la tinta `#f3ece1` contra el píxel más claro de
  la zona del titular (tiene que dar 4,5:1 o más) y los pesos (1440 hasta 220 kB,
  780 hasta 140 kB).

## Zonas libres que respeta la imagen

- Celular 390x844: titular en y 96 a 260, ventana en y 290 a 540, precio y
  botón en y 580 a 660 (entra en el visor de Instagram, 390x664).
- Escritorio 1440x900: texto en x 96 a 620, ventana centrada en x 980.

Si cambian estas zonas, hay que tocar también `Hero.module.css`.
