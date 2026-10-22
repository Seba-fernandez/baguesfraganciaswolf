/**
 * Todos los textos de la tienda, en un solo lugar.
 *
 * Si hay que cambiar una frase, un titulo o el aviso legal, se cambia aca y no
 * hay que abrir ningun componente. Los componentes leen de este archivo:
 * ninguno tiene texto propio escrito adentro.
 *
 * Lo que cambia solo (precios, ciclo, telefono, aromas) NO va aca: eso vive en
 * la base, en la tabla settings o en products.
 *
 * Donde dice {aromas} se mete un numero al mostrarlo. Para eso esta conDatos().
 */

export const MARCA = {
  nombre: 'Bagues',
  complemento: 'Grupo Wolf',
  ciudad: 'Córdoba',
};

export const CABECERA = {
  catalogo: 'Catálogo',
  como: 'Cómo funciona',
  verPedido: 'Ver pedido',
};

export const INICIO = {
  // La corona de marca, arriba del titulo. Wolf es el grupo, la firma; Bagués
  // es la casa que respalda el aroma. Presencia sin explicar.
  corona: 'Grupo Wolf',
  aval: 'Casa Bagués · Córdoba',

  titulo: ['El perfume que ya', 'conocés, al precio', 'que todavía no.'],
  // Una sola linea. Los datos duros (cuantos, desde cuanto) van en la fila de
  // abajo, que se lee de un vistazo.
  bajada: 'El mismo aroma que ya te gusta, hecho por la casa Bagués, a precio de reventa directa. Acá en Córdoba, por WhatsApp.',

  // Etiqueta del frasco protagonista del hero.
  showcaseEtiqueta: 'El más pedido',

  // La linea de datos, arriba del boton: "Desde $ 16.499 · 100 aromas · Envio
  // a todo el pais". {desde} y {n} salen de la base al hidratar; en el HTML
  // pre-generado su lugar queda reservado y vacio (nunca un numero viejo).
  datosDesde: 'Desde {desde}',
  datosAromas: '{n} aromas',
  datosEnvio: 'Envío a todo el país',

  // Rotulo de la cinta de nombres que se mueve abajo del hero.
  cintaEtiqueta: 'En este ciclo',

  verCatalogo: 'Ver el catálogo',
  verComo: 'Cómo funciona',
  selloPromo: '2x1',
  porPar: 'el par',
};

export const DESTACADOS = {
  eyebrow: 'Selección del ciclo',
  titulo: 'Los que siempre salen',
  bajada: 'Los que vuelan cada mes. Si dudás, empezá por acá.',
  desde: 'desde',
};

/**
 * Quiénes somos. La sección "nosotros" que pidió Sebastián: cercana,
 * rioplatense, con el gancho del precio. Grupo Wolf es el emprendimiento
 * familiar (lo arrancó el papá); Bagués es la casa que fabrica los frascos.
 */
export const NOSOTROS = {
  titulo: 'El mismo perfume, sin la vidriera cara.',
  parrafos: [
    'Somos Grupo Wolf, un emprendimiento familiar de Córdoba. Lo arrancó mi viejo y hoy lo seguimos entre la familia, con una idea sencilla: acercarte los perfumes que todo el mundo quiere, de una persona a otra, sin el local caro que después terminás pagando vos.',
    'Cada frasco lo fabrica y lo rotula la casa Bagués. Es el mismo aroma que probás en la perfumería del shopping, pero a precio de reventa directa. Vos reconocés el perfume, yo te saco el sobreprecio de la marca de arriba.',
    'Nada de comprar a ciegas. Me escribís por WhatsApp, te cuento qué hay y qué está por llegar, y te lo mando por correo o, si sos de Córdoba capital, lo retirás o te lo llevo. Si algo no te cierra, lo hablamos tranquilos.',
  ],
  firma: 'Sebastián, de Grupo Wolf',
};

export const CATALOGO = {
  titulo: 'El catálogo',
  bajada: '{aromas} aromas del ciclo. Buscá por el perfume que conocés, una nota o el nombre de la caja.',
  cargando: 'Cargando el catálogo…',
  placeholderBusqueda: 'Buscar: Sauvage, Le Male, amaderado...',
  buscarEtiqueta: 'Buscar aroma',
  quitarFiltros: 'Quitar filtros',
  vacioTitulo: 'No encontré ese aroma en este ciclo.',
  vacioTexto:
    'El catálogo cambia todos los meses. Si lo buscabas puntualmente, escribime y te ' +
    'digo si entra en el próximo.',
  vacioBoton: 'Ver todo el catálogo',
  // Botón principal cuando la búsqueda no encuentra nada: abre WhatsApp con
  // este mensaje. {busqueda} es lo que escribió la clienta.
  vacioWhatsapp: 'Preguntame por WhatsApp',
  vacioMensaje: 'Hola! Busco {busqueda}, ¿lo conseguís?',
  vacioDestacados: 'Los que más salen',
  // En el celular, en vez del paginador. {n} cuántos agrega, {quedan} cuántos
  // faltan ver.
  verMas: 'Ver {n} más (quedan {quedan})',
  // Los nombres de las cinco familias están en src/lib/familias.js, junto con
  // la regla que reparte cada aroma.
  filtros: {
    para: 'Para',
    el: 'Él',
    ella: 'Ella',
    todos: 'Todos',
    minis: 'Minis',
    familia: 'Familia',
    ademas: 'Además',
    rebajados: 'Rebajados',
    promoArabe: '2x1 árabes',
    promoDisenador: '2x1 diseñador',
  },
};

/**
 * El paso donde la clienta deja su nombre y su WhatsApp. La ley de datos
 * personales (25.326) pide decir para qué se usan los datos que se piden, y
 * en el lugar donde se piden.
 */
export const PEDIDO = {
  privacidad: 'Tu nombre y tu WhatsApp los uso solo para coordinar este pedido.',
  // Los dos botones dicen lo que va a pasar: que el pedido sigue por WhatsApp.
  seguir: 'Seguir por WhatsApp',
  ayudaDatos: 'Con esto guardo tu pedido y te abro WhatsApp para confirmar.',
  nombre: 'Tu nombre',
  telefono: 'Tu WhatsApp',
  enviar: 'Enviar pedido por WhatsApp',
  enviando: 'Enviando…',
  faltaNombre: 'Poné tu nombre',
  faltaTelefono: 'Poné un WhatsApp válido',
  errorEnvio: 'No se pudo enviar. Probá de nuevo.',
  errorBase: 'No pude registrar el pedido. Probá de nuevo o escribime directo por WhatsApp.',
  // Pantalla final. El botón es un enlace real a WhatsApp con el pedido escrito.
  listo: 'Te abrí WhatsApp con el pedido escrito. Si no se abrió, tocá el botón: el pedido ya está guardado.',
  listoSinLink: 'El pedido ya está guardado. Escribime por WhatsApp y lo confirmamos.',
  abrirWhatsapp: 'Abrir WhatsApp con mi pedido',
  cerrar: 'Listo',
  // Arriba y abajo del total, en el cajón. {falta} se completa con pesos.
  sena: 'Seña del 50 % para reservar. Transferencia o efectivo.',
  envioFalta: 'Te faltan {falta} para el envío gratis',
  envioGratis: 'Tenés envío gratis',
  envioEtiqueta: 'Envío gratis',
  confirmo: 'Te confirmo stock, envío y total final por WhatsApp. No pagás nada acá.',
};

export const TARJETA = {
  // Pie de la tarjeta. Con un solo tamaño se dice cuál; con más, cuántos.
  desde: 'desde',
  tamanos: '{n} tamaños',
  agregar: 'Agregar {nombre} al pedido',
};

/**
 * "Si te gusta este, mirá también", en la ficha. La razón queda a la vista:
 * {notas} son las notas que comparten; si no comparten ninguna, la familia o
 * para quién es ({algo}).
 */
export const PARECIDOS = {
  titulo: 'Si te gusta este, mirá también',
  comparte: 'comparte: {notas}',
  tambien: 'también {algo}',
  para: { masculino: 'para él', femenino: 'para ella', unisex: 'unisex' },
};

/**
 * La hoja chica que abre el + de una tarjeta con más de un tamaño.
 * {ml} es el tamaño elegido.
 */
export const HOJA_TAMANOS = {
  titulo: 'Elegí el tamaño',
  etiqueta: 'Elegir tamaño de {nombre}',
  agregar: 'Agregar {ml} ml',
  verFicha: 'Ver la ficha completa',
};

export const FICHA = {
  agregar: 'Agregar al pedido',
  // El botón de la barra fija. En el celular se ve "Agregar" (no entra más al
  // lado del precio y la cantidad); el lector de pantalla lee la frase entera.
  agregarCorto: 'Agregar',
  agregarResto: ' al pedido',
  tamano: 'Tamaño',
  // Debajo de cada tamaño: el código con el que cargo el pedido en la
  // proveedora y cuánto se ahorra contra su precio de lista ({monto} en pesos).
  codigo: 'Código',
  ahorras: 'Ahorrás {monto}',
  // Al pie de los tamaños, según la línea elegida. Ojo: el código NO se puede
  // buscar en esas tiendas (no es su SKU, verificado el 17/10/2026); por eso
  // la frase dice para qué sirve y manda a conocer la marca, nada más.
  verificar: {
    bagues: { texto: 'El código es el del catálogo de Bagués: con ese número cargo tu pedido. Mirá la casa en ', sitio: 'bagues.com.ar', url: 'https://bagues.com.ar' },
    unlock: { texto: 'El código es el del catálogo de Unlock: con ese número cargo tu pedido. Mirá la marca en ', sitio: 'unlock.com.ar', url: 'https://unlock.com.ar' },
  },
  // Arriba del nombre, chico. Unisex no lleva "para".
  para: { masculino: 'Para él', femenino: 'Para ella', unisex: 'Unisex' },
  // Debajo del nombre. La línea de cada tamaño (Unlock o Bagues) se aclara en
  // las opciones de presentación, que es donde se elige.
  inspirado: 'Versión inspirada en el perfume original.',
  sinCiclo: 'Este aroma no está disponible en este ciclo.',
  // El link directo a la ficha, para mandar un perfume puntual por WhatsApp o
  // Instagram. Si el navegador no deja copiar solo, queda el link a la vista.
  copiarLink: 'Copiar link',
  linkCopiado: 'Link copiado',
  linkManual: 'Copialo desde acá:',
  aviso:
    'Trabajo por encargo: el pedido me llega por WhatsApp y te confirmo stock, envío y ' +
    'fecha según el cierre del ciclo.',
};

export const COMO_FUNCIONA = {
  titulo: 'Cómo funciona',
  pasos: [
    { icono: 'bolsa', titulo: 'Armás el pedido', texto: 'Elegís aromas y tamaño. No se paga nada acá.' },
    { icono: 'chat', titulo: 'Te escribo', texto: 'Te confirmo stock, total y tiempos por WhatsApp.' },
    { icono: 'caja', titulo: 'Lo recibís', texto: 'Por correo a todo el país. En Córdoba capital lo retirás o te lo llevo.' },
  ],
  cita: 'Trabajo por encargo, con catálogo propio y precio de reventa directa.',
  boton: 'Escribime por WhatsApp',
};

/**
 * Antes de pedir: lo que una persona que no te conoce necesita saber para
 * confiar y pagar. Va en la portada, después de "Cómo funciona".
 * {monto} es ENVIO_GRATIS_DESDE (ajustes.js), escrito en pesos.
 * Datos confirmados por Sebastián en octubre de 2026. El plazo de entrega varía
 * con el cierre del ciclo: por eso no se promete un día.
 */
export const ANTES_DE_PEDIR = {
  titulo: 'Antes de pedir',
  datos: [
    { titulo: 'Pagás', texto: 'Seña del 50 % para reservar y el resto al retirar o recibir. Transferencia o efectivo.' },
    { titulo: 'Envío', texto: 'A todo el país por correo. Gratis desde {monto}; por menos, el envío lo pagás vos.' },
    { titulo: 'Córdoba', texto: 'En Córdoba capital lo retirás o te lo llevo. El punto de retiro te lo paso por WhatsApp.' },
    { titulo: 'Cuándo llega', texto: 'Varía con el cierre del ciclo: te confirmo la fecha por WhatsApp.' },
  ],
};

/**
 * Aviso legal. Es lo unico de este archivo que conviene no tocar sin pensarlo:
 * esta redactado para dejar en claro que la web no vende originales ni
 * representa a las marcas que nombra. El corto acompana al catalogo, los
 * parrafos van al pie.
 */
export const LEGAL = {
  corto:
    'Los nombres de diseñador se citan solo como referencia olfativa. Todos los ' +
    'productos son versiones inspiradas de la casa Bagués, así rotuladas en cada envase.',
  titulo: 'Aviso',
  parrafos: [
    'Este sitio es de exhibición. No procesa pagos ni concreta ventas: el pedido se ' +
      'deriva a una conversación de WhatsApp conmigo, donde se confirman ' +
      'disponibilidad, precio final y entrega.',
    'Todos los productos ofrecidos son fragancias de la casa Bagués, elaboradas y ' +
      'rotuladas por esa firma, y se comercializan como versiones inspiradas. Las marcas ' +
      'de perfumería que se mencionan pertenecen a sus respectivos titulares y se citan ' +
      'únicamente como referencia olfativa descriptiva, para que la persona compradora ' +
      'pueda identificar el perfil aromático. No existe vínculo, licencia, patrocinio ni ' +
      'autorización de esas marcas, ni se ofrecen los productos originales. Cada envase ' +
      'lleva la identificación de su fabricante.',
    'Bagues Grupo Wolf es un revendedor particular independiente y no representa a ' +
      'ninguna de las marcas citadas.',
  ],
};

export const PIE = {
  tienda: 'Tienda',
  contacto: 'Contacto',
  catalogoPdf: 'Catálogo en PDF',
  aclaracionPorDefecto: 'Venta particular en Córdoba',
};

export const VOLVER_ARRIBA = 'Volver arriba';

/**
 * La barra que sube al agregar un aroma, desde el segundo agregado de la
 * sesión (el primero abre el cajón). {n} es la cantidad de unidades.
 * "Agregado" lo lee solo el lector de pantalla; a la vista va una tilde.
 */
export const AVISO_AGREGADO = {
  agregado: 'Agregado:',
  verPedido: 'Ver pedido ({n})',
};

/**
 * Mete datos en un texto: conDatos(CATALOGO.bajada, { aromas: 104 }).
 * Si falta una clave deja el {hueco} a la vista, en vez de escribirle
 * "undefined" a la clienta.
 */
export function conDatos(texto, datos = {}) {
  return String(texto).replace(/\{(\w+)\}/g, (hueco, clave) =>
    datos[clave] == null ? hueco : String(datos[clave])
  );
}
