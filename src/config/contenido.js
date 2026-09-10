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
  titulo: ['El perfume que ya', 'conoce, al precio', 'que todavía no.'],
  bajada:
    '{aromas} fragancias inspiradas en los grandes de diseñador. Elegís, armás el ' +
    'pedido y te lo confirmo por WhatsApp. Retiro los viernes en Córdoba.',
  verCatalogo: 'Ver el catálogo',
  verComo: 'Cómo funciona',
  selloPromo: '2x1',
  porPar: 'el par',
};

export const DESTACADOS = {
  titulo: 'Los que siempre salen',
  bajada: 'Los que más pide la gente, ciclo tras ciclo.',
  desde: 'desde',
};

export const CATALOGO = {
  titulo: 'El catálogo',
  bajada: '{aromas} aromas del ciclo. Buscá por el perfume en el que se inspira.',
  placeholderBusqueda: 'Buscar: Sauvage, Le Male, amaderado...',
  buscarEtiqueta: 'Buscar aroma',
  quitarFiltros: 'Quitar filtros',
  vacioTitulo: 'No encontré ese aroma en este ciclo.',
  vacioTexto:
    'El catálogo cambia todos los meses. Si lo buscabas puntualmente, escribime y te ' +
    'digo si entra en el próximo.',
  vacioBoton: 'Ver todo el catálogo',
  filtros: {
    rebajados: 'Rebajados',
    verano: 'Verano',
    invierno: 'Invierno',
    promoArabe: '2x1 árabes',
    promoDisenador: '2x1 diseñador',
  },
};

export const TARJETA = {
  inspirado: 'versión inspirada',
};

export const FICHA = {
  agregar: 'Agregar al pedido',
  sinCiclo: 'Este aroma no está disponible en este ciclo.',
  aviso:
    'Trabajo por encargo: el pedido me llega por WhatsApp y te confirmo stock y tiempos. ' +
    'Retiro los viernes en Córdoba.',
};

export const COMO_FUNCIONA = {
  titulo: 'Cómo funciona',
  pasos: [
    {
      n: '01',
      titulo: 'Armás el pedido',
      texto: 'Elegís los aromas y la presentación. No se paga nada en la web.',
    },
    {
      n: '02',
      titulo: 'Te escribo',
      texto: 'El pedido me llega por WhatsApp y te confirmo stock, total y tiempos.',
    },
    {
      n: '03',
      titulo: 'Lo retirás',
      texto: 'La mercadería llega los viernes. Coordinamos entrega en Córdoba.',
    },
  ],
  cita: 'Trabajo por encargo, con catálogo propio y precio de reventa directa.',
  boton: 'Escribime por WhatsApp',
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
      'deriva a una conversación de WhatsApp con un asesor, donde se confirman ' +
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
  gestion: 'Gestión',
  catalogoPdf: 'Catálogo en PDF',
  panel: 'Panel',
  aclaracionPorDefecto: 'Venta particular en Córdoba',
};

export const VOLVER_ARRIBA = 'Volver arriba';

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
