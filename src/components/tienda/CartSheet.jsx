import { useState, useEffect, useRef } from 'react';
import { useCart } from '../../contexts/CartContext';
import useCheckoutWeb from '../../hooks/useCheckoutWeb';
import useDialogo from '../../hooks/useDialogo';
import { pesos } from '../../lib/format';
import { linkWhatsApp, mensajePedidoCliente } from '../../lib/whatsapp';
import { nombreCliente, telefonoArgentino, NOMBRE_MAX } from '../../lib/datosCliente.js';
import { detalleLinea } from '../../lib/producto';
import { envioGratis } from '../../lib/envio';
import { PEDIDO, conDatos } from '../../config/contenido';
import TiraCiclo from './TiraCiclo';
import { ENVIO_GRATIS_DESDE } from '../../config/ajustes';
import s from './CartSheet.module.css';

export default function CartSheet({ settings, onVerPromo, refRespaldo }) {
  const { items, removeItem, setCantidad, clear, total, totalLista, ahorro, grupos, open, setOpen } = useCart();
  const { enviarPedido, loading, error } = useCheckoutWeb();
  const [paso, setPaso] = useState('carrito');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [formErr, setFormErr] = useState(null);
  // Un aviso por campo, debajo de cada uno: así se sabe cuál corregir.
  const [avisos, setAvisos] = useState({});
  const refNombre = useRef(null);
  const refTel = useRef(null);
  const [numeroPedido, setNumeroPedido] = useState(null);
  const [linkPedido, setLinkPedido] = useState(null);
  const hoja = useRef(null);

  // Foco adentro al abrir, Escape cierra y al cerrar vuelve a quien lo abrió
  // (o al botón del pedido, si quien lo abrió era la ficha que ya se cerró).
  useDialogo({ abierto: open, onCerrar: () => setOpen(false), refInicial: hoja, refRespaldo });

  // El cajon se queda montado mientras se anima la salida, si no se cortaria de
  // golpe al cerrar. `cerrando` dispara la animacion de salida; al terminar se
  // desmonta y se resetea el paso.
  const [montado, setMontado] = useState(open);
  const [cerrando, setCerrando] = useState(false);
  useEffect(() => {
    if (open) {
      setMontado(true);
      setCerrando(false);
      return;
    }
    if (!montado) return;
    setCerrando(true);
    const t = setTimeout(() => {
      setMontado(false);
      setCerrando(false);
      setPaso('carrito');
      setFormErr(null);
      setAvisos({});
    }, 240);
    return () => clearTimeout(t);
  }, [open, montado]);

  // Con `open` ya se dibuja, sin esperar al efecto que marca `montado`: asi la
  // hoja existe en el mismo commit y el foco tiene a donde entrar.
  if (!montado && !open) return null;

  function cerrar() {
    setOpen(false);
  }

  async function confirmar() {
    setFormErr(null);
    // Se acepta el número escrito de cualquier forma (+54 9, 0351, 15...) y
    // se manda ya normalizado; la base vuelve a controlar lo mismo.
    const n = nombreCliente(nombre);
    const t = telefonoArgentino(telefono);
    const nuevos = {
      nombre: n.ok ? null : PEDIDO.nombreAvisos[n.motivo],
      telefono: t.ok ? null : PEDIDO.telefonoAvisos[t.motivo],
    };
    setAvisos(nuevos);
    if (!n.ok) { refNombre.current?.focus(); return; }
    if (!t.ok) { refTel.current?.focus(); return; }
    setNombre(n.valor);

    const { data, error: err } = await enviarPedido({ nombre: n.valor, telefono: t.valor, items });
    if (err) { setFormErr(error || PEDIDO.errorEnvio); return; }

    setNumeroPedido(data?.numero ?? null);
    // El mensaje lleva el codigo de cada presentacion y el total YA con promo.
    const msg = mensajePedidoCliente({ nombre: n.valor, numero: data?.numero, items, total });
    const link = settings?.whatsapp_owner ? linkWhatsApp(settings.whatsapp_owner, msg) : null;
    setLinkPedido(link);
    // Se intenta abrir solo, pero no se depende de eso: despues de esperar a
    // la base, Safari y el navegador de Instagram ya no dejan abrir ventanas.
    // La pantalla final tiene el enlace de verdad.
    if (link) window.open(link, '_blank', 'noopener');
    clear();
    setPaso('listo');
  }

  const faltantes = (grupos || []).filter((g) => g.faltaUno);
  // El sello "2x1" del renglon solo se muestra si el grupo esta ACTIVO en el
  // ciclo (igual que la tarjeta y la ficha, que miran promos[grupo]). Un
  // producto puede seguir cargando grupo_promo en sus presentaciones de un
  // ciclo anterior; sin promo activa, no hay 2x1 y el precio es unitario, asi
  // que mostrar el sello mentiria. `grupos` sale del motor de promos con las
  // reglas de settings.promos_ciclo: vacio cuando no hay 2x1.
  const gruposActivos = new Set((grupos || []).map((g) => g.grupo));
  const envio = envioGratis(total, ENVIO_GRATIS_DESDE);

  return (
    <>
      <div className={`${s.overlay} ${cerrando ? s.overlaySale : ''}`} onClick={cerrar} />
      <div
        ref={hoja}
        tabIndex={-1}
        className={`${s.sheet} ${cerrando ? s.sale : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Tu pedido"
      >
        {paso === 'carrito' && (
          <>
            <div className={s.head}>
              <h2>Tu pedido</h2>
              <button className={s.cerrar} onClick={cerrar} aria-label="Cerrar">✕</button>
            </div>
            <TiraCiclo settings={settings} className={s.ciclo} />

            {items.length === 0 ? (
              <div className={s.vacio}>
                <p className={s.vacioTitulo}>Todavía no agregaste nada.</p>
                <p className={s.vacioTexto}>Armá tu pedido desde el catálogo y te lo confirmo por WhatsApp.</p>
                <button type="button" className="tbtn ghost" onClick={cerrar}>Ver el catálogo</button>
              </div>
            ) : (
              <>
                <div className={s.lista}>
                  {items.map((it) => (
                    <div key={it.key} className={s.item}>
                      <div className={s.itemInfo}>
                        <p className={s.itemNombre}>{it.nombre}</p>
                        <p className={s.itemMeta}>
                          <span className="tnum">{it.ml} ml</span>
                          {` · ${detalleLinea(it, it.nombre)}`}
                          {it.grupo_promo && gruposActivos.has(it.grupo_promo) ? <span className={s.itemSello}>2x1</span> : null}
                        </p>
                        <div className={s.stepper}>
                          <button type="button" onClick={() => setCantidad(it.key, it.cantidad - 1)} aria-label="Restar">-</button>
                          <span className="tnum">{it.cantidad}</span>
                          <button type="button" onClick={() => setCantidad(it.key, it.cantidad + 1)} aria-label="Sumar">+</button>
                        </div>
                      </div>
                      <div className={s.itemDer}>
                        <span className={`${s.itemPrecio} tnum`}>{pesos(it.precio * it.cantidad)}</span>
                        <button className={s.quitar} onClick={() => removeItem(it.key)}>Quitar</button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* El detalle que mueve plata: con impares, sumar uno no cuesta nada. */}
                {faltantes.map((g) => (
                  <button
                    key={g.grupo}
                    type="button"
                    className={s.faltaUno}
                    onClick={() => { onVerPromo?.(g.grupo); cerrar(); }}
                  >
                    <span className={s.faltaTitulo}>Te falta uno</span>
                    <span className={s.faltaTexto}>
                      Agregá una fragancia más de esta promo y no pagás nada extra.
                    </span>
                  </button>
                ))}

                <div className={s.totales}>
                  {/* Antes del total, lo que la clienta se pregunta: cómo paga
                      y cuánto le falta para no pagar el envío. */}
                  <p className={s.sena}>{PEDIDO.sena}</p>
                  <div className={s.envio}>
                    <p className={`${s.envioTexto} tnum`}>
                      {envio.gratis ? PEDIDO.envioGratis : conDatos(PEDIDO.envioFalta, { falta: pesos(envio.falta) })}
                    </p>
                    <div
                      className={s.barra}
                      role="progressbar"
                      aria-label={PEDIDO.envioEtiqueta}
                      aria-valuemin={0}
                      aria-valuemax={ENVIO_GRATIS_DESDE}
                      aria-valuenow={Math.min(total, ENVIO_GRATIS_DESDE)}
                    >
                      <span className={s.barraLlena} style={{ transform: `scaleX(${envio.progreso})` }} />
                    </div>
                  </div>
                  {ahorro > 0 && (
                    <div className={s.filaTotal}>
                      <span className={s.totalLabel}>Precio de lista</span>
                      <span className={`${s.tachado} tnum`}>{pesos(totalLista)}</span>
                    </div>
                  )}
                  <div className={s.filaTotal}>
                    <span className={s.totalLabel}>Total estimado</span>
                    <b className={`${s.totalValor} tnum`}>{pesos(total)}</b>
                  </div>
                  {ahorro > 0 && (
                    <p className={`${s.ahorro} tnum`}>Ahorrás {pesos(ahorro)} con la promo del ciclo.</p>
                  )}
                  <p className={s.confirmo}>{PEDIDO.confirmo}</p>
                </div>

                <button type="button" className="tbtn wide" onClick={() => setPaso('datos')}>
                  {PEDIDO.seguir}
                </button>
              </>
            )}
          </>
        )}

        {paso === 'datos' && (
          <>
            <button className={s.volver} onClick={() => setPaso('carrito')}>Volver al pedido</button>
            <div className={s.head}>
              <h2>Tus datos</h2>
              <button className={s.cerrar} onClick={cerrar} aria-label="Cerrar">✕</button>
            </div>
            <p className={s.ayuda}>{PEDIDO.ayudaDatos}</p>

            <div className={s.campo}>
              <label className="tlabel" htmlFor="co-nombre">{PEDIDO.nombre}</label>
              <input
                id="co-nombre" ref={refNombre} className={s.input} value={nombre}
                onChange={(e) => { setNombre(e.target.value); if (avisos.nombre) setAvisos((a) => ({ ...a, nombre: null })); }}
                autoComplete="name" autoCapitalize="words" enterKeyHint="next" maxLength={NOMBRE_MAX + 20}
                aria-invalid={avisos.nombre ? 'true' : undefined}
                aria-describedby={avisos.nombre ? 'co-nombre-aviso' : undefined}
              />
              {avisos.nombre && <p id="co-nombre-aviso" className={s.avisoCampo}>{avisos.nombre}</p>}
            </div>
            <div className={s.campo}>
              <label className="tlabel" htmlFor="co-tel">{PEDIDO.telefono}</label>
              <input
                id="co-tel" ref={refTel} className={s.input} type="tel" inputMode="tel" value={telefono}
                onChange={(e) => { setTelefono(e.target.value); if (avisos.telefono) setAvisos((a) => ({ ...a, telefono: null })); }}
                placeholder={PEDIDO.telefonoEjemplo} autoComplete="tel" enterKeyHint="send" maxLength={24}
                aria-invalid={avisos.telefono ? 'true' : undefined}
                aria-describedby={avisos.telefono ? 'co-tel-aviso' : undefined}
              />
              {avisos.telefono && <p id="co-tel-aviso" className={s.avisoCampo}>{avisos.telefono}</p>}
            </div>

            <p className={s.privacidad}>{PEDIDO.privacidad}</p>

            {formErr && <p className={s.err}>{formErr}</p>}

            <button type="button" className="tbtn wide" onClick={confirmar} disabled={loading}>
              {loading ? PEDIDO.enviando : PEDIDO.enviar}
            </button>
          </>
        )}

        {paso === 'listo' && (
          <div className={s.listo}>
            <h2>{numeroPedido ? `Pedido #${numeroPedido} recibido` : 'Pedido recibido'}</h2>
            <p className={s.ayuda}>{linkPedido ? PEDIDO.listo : PEDIDO.listoSinLink}</p>
            {/* Un enlace de verdad, no window.open: funciona siempre, aunque el
                navegador haya bloqueado la ventana que se intentó abrir sola. */}
            {linkPedido && (
              <a className="tbtn wide" href={linkPedido} target="_blank" rel="noopener">
                {PEDIDO.abrirWhatsapp}
              </a>
            )}
            <button type="button" className={`tbtn ghost wide ${s.listoCerrar}`} onClick={cerrar}>{PEDIDO.cerrar}</button>
          </div>
        )}
      </div>
    </>
  );
}
