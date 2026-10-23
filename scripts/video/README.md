# Videos de la tienda

Para LinkedIn y el portfolio. Dos scripts, sin dependencias nuevas (Playwright
y ffmpeg ya están en el contenedor).

```bash
# La tienda publicada (antes) y el rediseño (después, desde dist/)
python3 scripts/video/grabar.py --url https://baguesfraganciaswolf.vercel.app --guion antes --salida videos/antes
npm run build && node scripts/qa/servir.mjs &
python3 scripts/video/grabar.py --url http://localhost:4173 --guion despues --salida videos/despues

# El 4:5 con los dos celulares lado a lado
python3 scripts/video/componer.py --antes videos/antes/celular-1080x1920.mp4 \
  --despues videos/despues/celular-1080x1920.mp4 --salida videos/antes-despues-1080x1350.mp4
```

- `grabar.py` saca `celular-1080x1920.mp4` y `escritorio-1920x1080.mp4` (H.264,
  yuv420p, faststart, 30 cuadros por segundo). `--solo celular` graba uno.
- **Cuadro por cuadro**, no la grabación de Playwright (sale borrosa y a
  saltos): las animaciones de CSS van al 8 % con CDP y se saca una captura cada
  1/30 s de reloj de animación. El scroll va con easing cuadro a cuadro; los
  toques se marcan con un círculo y en escritorio hay un cursor dibujado.
- **No confirma pedidos:** toda escritura contra la base se corta y el guion
  termina en el paso de los datos.
- Los guiones (`guion_antes`, `guion_despues`) recorren la portada, entran al
  catálogo, abren una ficha, agregan y llegan a los datos. Si cambia la
  portada, se ajustan ahí.
- Un video de 17 s tarda unos 4 minutos en celular y 8 en escritorio.
- Antes de usarlo, mirar una hoja de cuadros (cada 18 cuadros): que no haya
  cuadros en blanco ni toques fuera de lugar.
- `videos/` no se versiona (pesan): quedan en la máquina donde se grabaron.
