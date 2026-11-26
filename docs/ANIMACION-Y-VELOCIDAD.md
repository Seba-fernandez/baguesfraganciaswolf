# Animación y velocidad

Este documento junta lo que ya medimos en este proyecto sobre animaciones, LCP,
peso de imágenes y caché. Leelo antes de tocar cualquier animación, cualquier
imagen del hero o la entrega de archivos. Cada regla trae el motivo al lado para
que no la deshagas sin querer.

## 1. Reglas de oro

- Animá SOLO `transform` y `opacity`. Porque `clip-path`, `inset`, `border-radius`, `width`, `height` y `filter` repintan en cada cuadro y tironean. Ya costó un error real en este proyecto.
- Dibujá de antemano las formas orgánicas (SVG con la curva trazada) y animá solo su posición. Porque calcular la forma en cada cuadro cuesta más que moverla.
- Usá `fill-mode: backwards`, nunca `both`. Porque con `both` la animación pisa el `:hover`.
- Usá un único oyente de scroll, con una sola pasada por cuadro (`src/lib/alScroll.js`). No agregues otro. Porque cada oyente extra suma trabajo en el hilo principal.
- No secuestres el scroll. Porque la persona tiene que poder pasarse de largo rápido sin que la página se trabe.
- Respetá `prefers-reduced-motion` siempre: sin movimiento, todo visible y usable. Porque hay gente que se marea o se distrae con el movimiento.
- En secciones atadas al scroll usá `svh`, no `dvh`. Porque con `dvh` la sección cambia de alto cuando aparece o desaparece la barra del navegador y hace saltar el scroll.
- No pongas `filter: drop-shadow` en imágenes que aparecen al bajar. Porque traba el scroll en el celular.
- No animes una variable CSS si no está registrada con `@property`. Porque sin registro el navegador no la interpola.

## 2. El LCP y las animaciones de entrada

Medido el 25/11/2026.

**El elemento más grande que se pinta NO puede arrancar en `opacity: 0`.** Si arranca transparente, el navegador cuenta el LCP recién cuando termina de aparecer.

Caso real del hero de Navidad, en escritorio:

- Con la capa `frascos` arrancando en opacidad 0, con 0,4 s de espera y 1 s de duración: LCP de 1700 ms.
- Entrando solo con movimiento (translateY + scale, sin opacity): LCP de 452 ms a dpr1 y 624 ms a dpr2.
- No era el peso: las imágenes terminaban de bajar a los 200 ms.

Por eso el fondo, la placa del precio y los frascos entran solo con movimiento. El precio y el botón además nunca arrancan transparentes, para que se lean desde el primer cuadro aunque la animación todavía no haya terminado.

## 3. Soporte real de navegadores (noviembre de 2026)

- `animation-timeline: view()` y las animaciones de scroll en CSS: Safari iOS desde 26.0 y Chrome Android desde 148. La mayoría de las clientas todavía no lo tiene. Por eso, toda animación atada al scroll necesita dos caminos desde el diseño, no un parche después: el nativo con `@supports`, y otro con IntersectionObserver más transiciones.
- CSS Paint API (Houdini): sin soporte en iOS. Descartada para este proyecto.
- View Transitions del mismo documento: Chrome 111+ y Safari 18+. Es lo viable para la entrada de la ficha de producto, con FLIP como alternativa en iOS viejo.
- View Transitions entre documentos: no hacen falta en una SPA.
- Lenis envuelve el scroll nativo y no rompe sticky ni anclas. Queda solo en escritorio.
- No hay GSAP ni Framer Motion instalados y no se agregan.

## 4. Números medidos en este proyecto

**Líquido de destacados.** Chrome headless, 390 px, scroll por CDP, mediana de 3, CPU con throttling 6x.

- Camino nativo: 48 a 53 fps. Camino alternativo: 41 a 49 fps.
- La misma sección SIN animar, en el mismo entorno: 46 fps.
- Conclusión: el efecto no agrega costo medible. El piso lo pone el render por software del contenedor.
- Con la entrada escalonada de las 7 tarjetas con fotos grandes: 24 a 35 fps. Sacarla fue lo que permitió llegar a los números de arriba.
- CLS medido: 0,0000 a 390 px y a 1440 px.

**Hero de Navidad, LCP.** Chrome real por CDP, caché apagada, mediana de 5, intercalado contra `main`.

| Perfil | main | Navidad |
|---|---|---|
| Móvil 390, dpr2, 4G lento, CPU 4x | 1248 ms | 756 ms |
| Móvil 390, dpr3, 4G lento, CPU 4x | 1624 ms | 688 ms |
| Escritorio 1440, dpr1, cable | 264 ms | 452 ms |

En móvil el elemento LCP es el `fondo`. En escritorio son los `frascos`. En `main` el LCP es un texto, que no depende de ninguna imagen.

## 5. Peso de imágenes: lo que funcionó y lo que no

Funcionó:

- Elegí la calidad POR CAPA con búsqueda binaria hasta igualar el PSNR que ya tenía, en vez de usar un tope de bits parejo para todas. Ahorro: frascos 22 a 25 %, luces 40 a 50 %.
- Rellená el color de las zonas transparentes con el del vecino (blur normalizado, alfa menor a 0,04). Ahorro de 8 a 15 % extra, y evita los bordes oscuros.
- Poné el esfuerzo del codificador al máximo (avif speed 0, webp method 6). Ahorro de 30 a 37 % en avif con el mismo o mejor PSNR, y no cuesta nada en tiempo de carga.
- Bajá la resolución solo donde el efecto es difuminado de verdad (el destello, a 2/3). Ahorro de 45 a 66 % en esa capa, sin diferencia a la vista.
- Igualá la calidad del webp de respaldo a la del avif nuevo. Ahorro de 45 a 50 % en webp.

Resultado total en avif: 88,5 a 62,9 kB (780 px), 185 a 111,2 kB (1170 px), 87,9 a 63,4 kB (1440 px), 312 a 189,5 kB (2880 px).

Probado y descartado, con el motivo:

- Bajar la resolución de los frascos: la etiqueta "BAGUÉS / AMALFI" sale blanda (PSNR de 27 a 31 contra 34 a 37).
- Bajar la resolución de las luces: tienen agujas de pino y una estrella nítidas, no son un resplandor difuso.
- Sacar el tamaño de 2880: los frascos escalados desde 1440 a 2x se ven blandos.
- Fusionar las capas de luces: la fusionada pesa lo mismo que las dos juntas.
- Diferir capas por JS para sacarlas del camino crítico: medido, NO sirve. Con las capas bloqueadas el LCP dio 724 ms contra 664 ms normales. El `<link rel=preload fetchpriority=high>` ya prioriza el fondo.
- Opciones avanzadas del codificador (`tune=ssim`, `deltaq-mode=3`): 10 % menos de peso, pero 0,5 dB peor.

## 6. Entrega y caché

Arreglado el 25/11/2026.

- El HTML va con `Cache-Control: public, max-age=0, must-revalidate`, y `/assets/*` con `immutable`. Sin eso, un teléfono se queda con un HTML viejo que apunta a chunks con hash que ya no existen. El import dinámico falla y **la página queda en blanco**. Pasó de verdad, y quedó registrado en la tabla `errores_web`.
- Red de seguridad en `src/lib/recuperar.js`. Escucha `vite:preloadError`, `unhandledrejection` y `error`, recarga UNA vez con freno anti bucle en `sessionStorage`, y si vuelve a fallar muestra un cartel con "Reintentar" en vez de dejar la pantalla en blanco. El error se anota con `keepalive: true` para que sobreviva a la recarga.
- Las imágenes del hero NO llevan hash en el nombre. Por eso van con revalidación y no con `immutable`: si fueran inmutables, al cambiar el hero los teléfonos se quedarían con el viejo.

## 7. Cómo medir acá sin engañarse

- No decidas con Lighthouse del contenedor. Tiene mucho ruido (TBT de 125 a 690 ms con el mismo build). Para decidir entre dos versiones, usá CDP con throttling de red y de CPU, mediana de 5, caché apagada y contexto nuevo en cada corrida.
- Serví las dos versiones intercaladas, una y una, con `node scripts/qa/servir.mjs`. La versión de referencia se arma aparte con `git archive` y se sirve en otro puerto.
- Recién publicado, la primera medición contra producción sale peor por CDN frío. Repetí antes de decidir.
- Chrome headless del contenedor: `/usr/bin/google-chrome` v153. Playwright en `/opt/npm-tools/node_modules/playwright`.
- La ruedita por CDP (`Input.synthesizeScrollGesture` con source 'mouse') sí scrollea. El touch no.
- Los destacados solo se dibujan si hay productos desde Supabase. Para probarlos en local hace falta un fixture e intercepción de red con `page.route`.
- Para capturar los primeros cuadros de una animación, frenala con `Animation.setPlaybackRate(0)` y buscá el tiempo. No esperes a que termine.
- `content-visibility: auto` esconde errores en las pruebas: lo que está fuera de pantalla no se pinta ni recibe toques.

## 8. Referencias usadas

Técnica:

- Scroll-driven animations, Chrome: https://developer.chrome.com/docs/css-ui/scroll-driven-animations
- View Transitions del mismo documento, Chrome: https://developer.chrome.com/docs/modern-web-guidance/guides/ui-behaviors/same-document-transitions
- Propiedades que no repintan, web.dev: https://web.dev/articles/stick-to-compositor-only-properties-and-manage-layer-count
- Panorama de animaciones, web.dev: https://web.dev/articles/animations-overview
- Reveal a pantalla completa con máscaras SVG (Codrops): https://tympanus.net/codrops/2026/03/11/svg-mask-transitions-on-scroll-with-gsap-and-scrolltrigger/
- Origen del filtro gooey, Lucas Bebber (Codrops): https://tympanus.net/codrops/2015/03/10/creative-gooey-effects/

Microinteracciones:

- Emil Kowalski, 7 consejos prácticos: https://emilkowal.ski/ui/7-practical-animation-tips
- Josh W. Comeau, botón 3D: https://www.joshwcomeau.com/animation/3d-button/

Dirección visual:

- TrueKind, caso de estudio de motion contenido (Codrops): https://tympanus.net/codrops/2025/06/25/designing-truekind-a-skincare-brands-journey-through-moodboards-motion-and-meaning/
- Gucci Beauty Wishes (MONOGRID): https://www.awwwards.com/inspiration/scroll-navigation-gucci-beauty-wishes
- Agence Cartier (MILL3): https://www.awwwards.com/inspiration/scroll-layout-homepage

De los sitios de dirección visual se miraron las fichas y los listados. No se auditó el código de cada uno.

## Lo que falta medir

- Ninguna medición de fps o LCP en un iPhone o Android real. Todo sale de Chrome headless del contenedor.
- El soporte de scroll-driven CSS se tomó como dato de noviembre de 2026. Conviene revisarlo cuando cambien las versiones de Safari iOS y Chrome Android.
- Las cifras de LCP del hero de Navidad son del 25/11/2026. No hay una repetición posterior contra producción.
- La ficha de producto con View Transitions figura como viable, pero no hay medición de fps ni de LCP sobre esa ficha.
