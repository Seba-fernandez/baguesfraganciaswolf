# Fondo de la tienda

Genera `public/fondo.jpg`: los haces verdes en diagonal del arranque, tipo spray
de aroma. No es una foto bajada de ningún lado, la dibuja el script pixel por
pixel, así que se puede ajustar y volver a generar cuando haga falta.

```
npm run fondo
```

## Cómo tocarlo

Todo lo que se cambia está arriba del archivo [`generar.mjs`](generar.mjs), con
su comentario:

- **`PALETA`**: del verde de sombra al más encendido. Subir los últimos valores
  lo hace más brillante y saturado; bajarlos, más apagado.
- **`GRADOS` y `JITTER`**: la inclinación de los haces y cuánto se abren. Una
  sola dirección a propósito: cruzarlos se leía como reja.
- **`semilla`**: cambia el dibujo entero sin tocar nada más. Si un resultado no
  gusta, se prueba otra semilla.
- **`LTECHO`**: cuánto se dejan encender los cruces antes de frenarlos.

Después de generar, el script imprime el peso y el pixel más claro. El verde es
brillante a propósito: en la web ningún texto se apoya sobre el fondo crudo, el
hero va sobre una placa de vidrio y el resto del contenido queda más abajo,
donde el fondo ya se desvaneció al oscuro.

El grano no está en el JPEG, se agrega en CSS (`--grano` en
[`src/styles/tienda.css`](../../src/styles/tienda.css)): metido en la imagen
multiplica el peso por cinco.
