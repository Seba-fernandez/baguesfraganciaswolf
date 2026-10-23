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
};

export const CABECERA = {
  catalogo: 'Catálogo',
  como: 'Cómo funciona',
  verPedido: 'Ver pedido',
};

export const INICIO = {
  // Sin sello arriba del titulo (Sebas, 23/10): la marca ya esta en la barra
  // y la bajada dice de donde viene el perfume. El hero respira.

  // Rediseño D: el titulo sale de algo que el negocio ya tiene (cada caja
  // Bagués lleva el nombre de una ciudad). La ultima linea va en la italica
  // de Boska.
  titulo: ['Cada perfume,', 'una ciudad.'],
  // Una sola linea. Los datos duros (cuantos, desde cuanto) van en la fila de
  // abajo, que se lee de un vistazo.
  // Rediseño C: "versiones inspiradas" en el primer pantallazo (no negociable
  // de la evaluacion: quien llega tiene que saber que compra antes de bajar).
  bajada: 'Versiones inspiradas, hechas por Bagués.',

  // La linea de datos, arriba del boton: "Desde $ 16.499 · Envíos a todo el
  // país". {desde} sale de la base al hidratar; en el HTML pre-generado su
  // lugar queda reservado y vacio (nunca un numero viejo). Sin la cantidad de
  // aromas desde el 23/10 (Sebas): el envio pesa mas que el numero.
  datosDesde: 'Desde {desde}',
  datosEnvio: 'Envíos a todo el país',

  // Rotulo de la cinta de nombres que se mueve abajo del hero.
  cintaEtiqueta: 'En este ciclo',

  verCatalogo: 'Ver el catálogo',
  selloPromo: '2x1',
  porPar: 'el par',
};

/**
 * "¿Qué te gusta oler?" de la portada (rediseño C): las cinco familias del
 * filtro como puerta al catálogo filtrado. "archivo" es el nombre de la imagen
 * en public/familias/ (sin el ancho).
 */
export const FAMILIAS_PORTADA = {
  // Sebas, 23/10: la pregunta invita a elegirse, y la bajada arranca con el
  // verbo de lo que hay que hacer.
  titulo: '¿Con cuál te identificás?',
  bajada: 'Elegí la familia que te gusta oler, para vos o para regalar.',
  archivo: {
    frescos: 'citricos', florales: 'florales', dulces: 'dulces', amaderados: 'amaderados', ambar: 'ambar',
  },
  ejemplos: {
    frescos: 'Bergamota, limón, notas marinas',
    florales: 'Jazmín, rosa, azahar',
    dulces: 'Vainilla, caramelo, café',
    amaderados: 'Cedro, sándalo, vetiver',
    ambar: 'Ámbar, canela, especias',
  },
  // La hoja que se abre al tocar una familia (encima de la portada).
  cuenta: '{n} aromas',
  cerrar: 'Cerrar',
};

/**
 * "¿Son truchos?": la charla que Sebas tiene con cada clienta que duda,
 * puesta en la portada. OCULTA (MOSTRAR_DUDA en ajustes.js) hasta que él
 * apruebe título y texto. Compara por cómo se usa y cuánto rinde la plata,
 * nunca por calidad: no se nombran marcas ni se dice que "duran igual" (no se
 * puede probar y es lo que cuida el aviso legal).
 */
export const DUDA = {
  titulo: '¿Son truchos?',
  bajada: 'No. Los hace Bagués, una casa que fabrica y rotula cada frasco con su nombre. El mismo perfil de aroma, sin la vidriera.',
  vidriera: {
    rotulo: 'Un perfume de vidriera',
    cifra: '1',
    texto: 'Uno solo, para cuidarlo. Lo usás poco para que no se termine.',
  },
  bagues: {
    rotulo: 'Con Bagués',
    cifra: '4',
    texto: 'Varios por el precio de uno: uno para todos los días, otro para salir, otro para probar algo nuevo.',
  },
  cierre: 'Usá Bagués de diario y guardá el de vidriera para las ocasiones especiales. O no: muchos de los más ricos también salen de acá.',
  boton: 'Ver el catálogo',
};

export const DESTACADOS = {
  titulo: 'Los más pedidos',
  bajada: 'Los que vuelan cada mes. Si dudás, empezá por acá.',
};

/**
 * Las ciudades (rediseño D, 22/10/2026). Reemplaza a "Nosotros / Lo que
 * pagás" (Sebas decidió sacarlo): cada caja Bagués con el nombre de su ciudad
 * en grande, el perfume y el precio. Las elige ciudadesDe (lib/producto.js).
 */
export const CIUDADES = {
  titulo: 'Las ciudades',
  rotulo: 'cómo leer la caja',
  bajada: 'El perfume que ya conocés viene en una caja con nombre de ciudad. Así la reconocés cuando te llega.',
  es: 'es',
  verTodas: 'Ver todas las cajas',
};

export const CATALOGO = {
  titulo: 'El catálogo',
  bajada: '{aromas} aromas del ciclo. Buscá por el perfume que conocés, una nota o el nombre de la caja.',
  cargando: 'Cargando el catálogo…',
  placeholderBusqueda: 'Buscar: Sauvage, Le Male…',
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
  // Avisos del formulario, uno por cada motivo de lib/datosCliente.js.
  nombreAvisos: {
    vacio: 'Poné tu nombre',
    corto: 'Poné tu nombre, con al menos dos letras',
    largo: 'Es un poco largo: con nombre y apellido alcanza',
    raro: 'Usá solo letras en el nombre',
  },
  telefonoAvisos: {
    vacio: 'Poné tu WhatsApp',
    letras: 'Usá solo números en el WhatsApp',
    sin_area: 'Sumale la característica: 351 si sos de Córdoba',
    invalido: 'Revisá el número: son 10 cifras con la característica, como 351 555 1234',
  },
  telefonoEjemplo: '351 555 1234',
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
  agregar: 'Agregar',
  // El botón de la barra fija. En el celular se ve "Agregar" (no entra más al
  // lado del precio y la cantidad); el lector de pantalla lee la frase entera.
  agregarCorto: 'Agregar',
  agregarResto: ' al pedido',
  tamano: 'Tamaño',
  // Debajo de cada tamaño: cuánto se ahorra contra su precio de lista ({monto}
  // en pesos). El código de la proveedora ya no se muestra (decisión de Sebas,
  // 23/10/2026: a la clienta no le sirve); viaja igual en el WhatsApp.
  ahorras: 'Ahorrás {monto}',
  // Las líneas de la ficha, al estilo del elenco de Netflix: rótulo en negrita
  // y datos seguidos (Familia, y después Salida, Corazón y Fondo).
  familia: 'Familia',
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
};

/**
 * Cómo funciona: una conversación de WhatsApp dibujada (el mensaje que arma
 * lib/whatsapp.js con dos aromas reales del catálogo, y mi respuesta) y al
 * lado los tres pasos. {nombre} del mensaje de ejemplo es `ejemploNombre`.
 */
export const COMO_FUNCIONA = {
  titulo: 'Cómo funciona',
  bajada: 'Así me llega tu pedido: cada perfume con su tamaño y el total, listo para confirmarte.',
  chatEtiqueta: 'Ejemplo de un pedido por WhatsApp',
  chatContacto: 'Sebastián, Bagues',
  ejemploNombre: 'Caro',
  respuesta: '¡Hola! Te confirmo stock y te paso la seña para reservarlo.',
  cita: 'Trabajo por encargo. Si algo no te cierra, lo hablamos tranquilos.',
  boton: 'Escribime por WhatsApp',
  // Lo que ya viene escrito al abrir el chat desde el boton o el pie: nadie
  // arranca de un chat vacio (evaluacion del 22/10/2026).
  mensajeConsulta: 'Hola Sebastián! Vi la tienda y quiero hacerte una consulta.',
};

/**
 * La tira del ciclo: "Ciclo 10/26 · Pedidos hasta el viernes 30 · Quedan 9
 * días". Sale de ciclo_nombre y ciclo_hasta (Ajustes del panel) y la calcula
 * lib/ciclo.js en la hora de Argentina. Si la fecha falta o ya paso, no se
 * muestra. {dia} es "viernes 30"; {n}, los dias que faltan.
 */
export const CICLO = {
  hasta: 'Pedidos hasta el {dia}',
  quedan: { hoy: 'Último día', uno: 'Queda 1 día', varios: 'Quedan {n} días' },
};

/**
 * Antes de pedir: lo que una persona que no te conoce necesita saber para
 * confiar y pagar. Va en la portada, después de "Cómo funciona".
 * {monto} es ENVIO_GRATIS_DESDE (ajustes.js), escrito en pesos.
 * Datos confirmados por Sebastián en octubre de 2026. El plazo de entrega varía
 * con el cierre del ciclo: por eso no se promete un día.
 */
/**
 * "Lo que me escriben": capturas de mensajes de clientas, con permiso. Las
 * capturas se cargan en src/data/opiniones.json (ver docs/EDITAR.md); sin
 * ninguna cargada, la seccion no aparece.
 */
export const OPINIONES = {
  titulo: 'Lo que me escriben',
  bajada: 'Mensajes de clientas después de recibir su pedido. Los comparto con su permiso.',
};

export const ANTES_DE_PEDIR = {
  titulo: 'Antes de pedir',
  // Cada dato abre con una cifra grande (lo que se lee de un vistazo) y abajo
  // una frase entera que se entiende sola: mucha clientela es gente grande
  // (pedido de Sebas, 23/10). {monto} es el envio gratis. La entrega no lleva
  // fecha fija: el martes es el corte de cada semana (Sebas, 23/10).
  datos: [
    { cifra: '50 %', titulo: 'Seña para reservar', texto: 'El resto lo pagás al retirar o al recibir. Transferencia o efectivo.' },
    { cifra: '{monto}', titulo: 'Envío gratis a todo el país', texto: 'Por correo, en pedidos desde {monto}. Si tu pedido es menor, el envío lo pagás vos.' },
    { cifra: 'Martes', titulo: 'Pedí hasta el martes', texto: 'Y te lo entrego desde el viernes. El día lo coordinamos por WhatsApp.' },
    { cifra: 'Córdoba', titulo: 'Retiro o envío en capital', texto: 'Lo retirás o te lo envío. El punto de retiro te lo paso por WhatsApp.' },
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

/**
 * La pagina que no existe (/lo-que-sea): link viejo o mal copiado. Vercel la
 * contesta con 404 de verdad (dist/404.html).
 */
export const NO_ENCONTRADA = {
  titulo: 'Esta página no existe',
  texto: 'Puede ser un link viejo o mal copiado. Los perfumes siguen todos acá.',
  catalogo: 'Ver el catálogo',
  inicio: 'Ir al inicio',
};
