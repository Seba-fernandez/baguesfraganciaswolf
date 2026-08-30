// ============================================================================
// whatsapp.js — armado de links wa.me y textos de pedido
// No usa API de Meta: solo genera el deep link que abre el chat con el mensaje.
// ============================================================================

/** Deja solo dígitos (formato internacional sin "+"). */
export function normalizarTelefono(valor) {
  return String(valor || '').replace(/\D/g, '');
}

/** Link wa.me con mensaje predeterminado. */
export function linkWhatsApp(telefono, mensaje = '') {
  const tel = normalizarTelefono(telefono);
  const q = mensaje ? `?text=${encodeURIComponent(mensaje)}` : '';
  return `https://wa.me/${tel}${q}`;
}

const money = (n) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);

/**
 * Texto que se pre-carga en el WhatsApp del cliente al tocar "Hacer pedido".
 * items: [{ nombre, ml, cantidad, precio }]
 */
export function mensajePedidoCliente({ nombre, items, numero }) {
  const lineas = items.map(
    (it) => `• ${it.nombre}${it.ml ? ` ${it.ml}ml` : ''} x${it.cantidad}`
  );
  const total = items.reduce((acc, it) => acc + (it.precio || 0) * it.cantidad, 0);
  return [
    `Hola! Soy ${nombre}. Quiero hacer este pedido${numero ? ` (#${numero})` : ''}:`,
    '',
    ...lineas,
    '',
    total ? `Total estimado: ${money(total)}` : '',
    'Quedo a la espera de la confirmación. Gracias!',
  ]
    .filter((l) => l !== '')
    .join('\n');
}

/** Texto para que VOS le escribas al cliente desde el panel. */
export function mensajeParaCliente(estado, { nombreCliente = '' } = {}) {
  const saludo = nombreCliente ? `Hola ${nombreCliente}! ` : 'Hola! ';
  switch (estado) {
    case 'senia':
      return `${saludo}Te confirmo que recibí la seña. Tu pedido queda reservado, te aviso cuando esté para retirar (suele ser el viernes).`;
    case 'en_proveedora':
      return `${saludo}Tu pedido ya está en camino, lo retiro el viernes y te aviso apenas lo tenga.`;
    case 'avisado':
    case 'retirado':
      return `${saludo}Tu pedido ya está listo para retirar. ¿Cuándo te queda cómodo pasar?`;
    default:
      return `${saludo}Te escribo por tu pedido.`;
  }
}
