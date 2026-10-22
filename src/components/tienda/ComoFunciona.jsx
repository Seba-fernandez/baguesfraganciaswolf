import { useMemo } from 'react';
import useReveal from '../../hooks/useReveal';
import { linkWhatsApp, mensajePedidoCliente, pedidoDeEjemplo } from '../../lib/whatsapp';
import { COMO_FUNCIONA } from '../../config/contenido';
import s from './ComoFunciona.module.css';

/**
 * Cómo funciona, mostrado en vez de contado: la conversación de WhatsApp que
 * de verdad me llega. La burbuja de la clienta es el mensaje que arma
 * lib/whatsapp.js (el mismo del cajón del pedido) con dos aromas reales del
 * catálogo, cada uno con su tamaño, su línea y su código; abajo, mi respuesta.
 * Si cambia el formato del mensaje, esta sección cambia sola.
 *
 * Rediseño D (plano 5, el respiro): papel después del clímax vino, y el chat
 * real nada más. Los tres pasos numerados salieron: el chat ya los cuenta.
 * Al costado, una frase y el botón de WhatsApp en el acento.
 */

/** Un renglón del mensaje. El código va aparte, en cifras tabulares. */
function Renglon({ texto }) {
  const m = /^\[(\d+)\]\s(.*)$/.exec(texto);
  if (m) {
    return (
      <span className={s.renglon}>
        <span className={`${s.codigo} tnum`}>[{m[1]}]</span> {m[2]}
      </span>
    );
  }
  return <span className={`${s.renglon} ${/^Total/.test(texto) ? s.total : ''}`}>{texto}</span>;
}

export default function ComoFunciona({ settings, products = [] }) {
  const ref = useReveal();
  const items = useMemo(() => pedidoDeEjemplo(products), [products]);
  const mensaje = items.length
    ? mensajePedidoCliente({ nombre: COMO_FUNCIONA.ejemploNombre, items })
    : '';

  return (
    <section className={s.section} id="como" ref={ref}>
      <div className="tw">
      <header className={s.head}>
        <h2 className={s.titulo}>{COMO_FUNCIONA.titulo}</h2>
        <p className={s.bajada}>{COMO_FUNCIONA.bajada}</p>
      </header>

      <div className={s.cuerpo}>
        <figure className={s.chat} aria-label={COMO_FUNCIONA.chatEtiqueta}>
          <figcaption className={s.contacto}>{COMO_FUNCIONA.chatContacto}</figcaption>
          {mensaje ? (
            <>
              <p className={`${s.burbuja} ${s.ella} treveal`} data-qa="chat-pedido">
                {mensaje.split('\n').map((linea, i) => <Renglon key={i} texto={linea} />)}
              </p>
              <p className={`${s.burbuja} ${s.yo} treveal`} style={{ transitionDelay: '420ms' }}>
                {COMO_FUNCIONA.respuesta}
              </p>
            </>
          ) : (
            // Mientras llega el catálogo: el mismo lugar, sin texto inventado.
            <span className={`${s.burbuja} ${s.ella} ${s.espera}`} aria-hidden="true" />
          )}
        </figure>

        <div className={s.lado}>
          <p className={s.cita}>{COMO_FUNCIONA.cita}</p>

          {settings?.whatsapp_owner && (
            <a className={`tbtn ${s.boton}`} href={linkWhatsApp(settings.whatsapp_owner, COMO_FUNCIONA.mensajeConsulta)} target="_blank" rel="noopener">
              {COMO_FUNCIONA.boton}
            </a>
          )}
        </div>
      </div>
      </div>
    </section>
  );
}
