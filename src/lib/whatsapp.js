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

const SALTO = String.fromCharCode(10);

const money = (n) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);

/**
 * Texto que se pre-carga en el WhatsApp del cliente al tocar "Hacer pedido".
 * items: [{ nombre, ml, cantidad, precio }]
 */
export function mensajePedidoCliente({ nombre, items, numero, total }) {
  // Cada renglon lleva el CODIGO de la presentacion: es lo que Sebastian
  // carga en el sistema de su proveedora. Un pedido sin codigo no se puede
  // cargar, asi que va primero en la linea, no al final.
  const lineas = items.map((it) => {
    const cod = it.codigo ? `[${it.codigo}] ` : '';
    const ml = it.ml ? ` ${it.ml}ml` : '';
    const prov = it.nombre_proveedor ? ` (${it.nombre_proveedor})` : '';
    return `${cod}${it.nombre}${ml}${prov} x${it.cantidad}`;
  });
  const suma = typeof total === 'number'
    ? total
    : items.reduce((acc, it) => acc + (it.precio || 0) * it.cantidad, 0);
  return [
    `Hola! Soy ${nombre}. Quiero hacer este pedido${numero ? ` (#${numero})` : ''}:`,
    '',
    ...lineas,
    '',
    suma ? `Total estimado: ${money(suma)}` : '',
    'Quedo a la espera de la confirmación. Gracias!',
  ]
    .filter((l) => l !== '')
    .join(SALTO);
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
