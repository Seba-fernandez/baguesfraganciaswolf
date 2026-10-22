// ============================================================================
// whatsapp.js — armado de links wa.me y textos de pedido
// No usa API de Meta: solo genera el deep link que abre el chat con el mensaje.
// ============================================================================

import { detalleLinea, esPublicable, presentacionesActivas, tituloDe } from './producto';

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
    // La linea y la caja van siempre: con el codigo alcanza para cargarlo,
    // pero leido de corrido hay que saber sin abrir nada si es Unlock o Bagues.
    const linea = it.linea ? ` (${detalleLinea(it, it.nombre)})` : '';
    return `${cod}${it.nombre}${ml}${linea} x${it.cantidad}`;
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


/**
 * Un pedido de ejemplo armado con el catalogo real, para "Como funciona": dos
 * aromas activos, una caja de Bagues y un frasco de Unlock (las dos lineas, con
 * su codigo), de los destacados si se puede. Los items tienen la MISMA forma
 * que los del carrito (CartContext), asi el mensaje sale de mensajePedidoCliente
 * igual que uno de verdad: si cambia el formato, la portada cambia sola.
 * Sin catalogo devuelve [] y la seccion espera.
 */
export function pedidoDeEjemplo(productos = []) {
  const activos = (productos || [])
    .filter((p) => p?.activo && esPublicable(p))
    .sort((a, b) => (b.destacado ? 1 : 0) - (a.destacado ? 1 : 0));
  const deLinea = (linea, salvo) => {
    for (const p of activos) {
      if (p === salvo) continue;
      const pres = presentacionesActivas(p).find((x) => x.linea === linea && x.codigo);
      if (pres) return { producto: p, pres };
    }
    return null;
  };
  const primero = deLinea('bagues');
  const segundo = deLinea('unlock', primero?.producto);
  return [primero, segundo].filter(Boolean).map(({ producto, pres }) => ({
    nombre: tituloDe(producto),
    ml: pres.ml ?? null,
    codigo: pres.codigo || '',
    linea: pres.linea || '',
    nombre_proveedor: pres.nombre_proveedor || '',
    precio: Number(pres.precio) || 0,
    cantidad: 1,
  }));
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
