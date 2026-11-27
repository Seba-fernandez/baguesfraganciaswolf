import { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { calcularCarrito } from '../lib/promos';
import { tituloDe, detalleLinea } from '../lib/producto';
import { recortarCantidad } from '../lib/mayorista.js';

const CartContext = createContext(null);
const STORAGE_KEY = 'bgw-carrito-v2'; // v2: el item ahora lleva codigo y grupo_promo

// El item guarda TODO lo que necesita el pedido, no solo lo que se dibuja.
// `codigo` viaja hasta el mensaje de WhatsApp: sin el, Sebastian no puede
// cargar la orden en el sistema de su proveedora.
// item: { key, productId, nombre, inspirado_en, ml, codigo, linea,
//         nombre_proveedor, grupo_promo, precio, cantidad, imagen_url }
const keyOf = (productId, ml) => `${productId}::${ml ?? ''}`;

// El cajon se abre solo en el PRIMER agregado de la sesion: ahi la clienta ve
// que el pedido existe y donde vive. Desde el segundo, abrirlo cada vez tapaba
// el 85 % de la pantalla y obligaba a cerrarlo para seguir mirando: en su
// lugar sube una barra chica con "Ver pedido". Se recuerda por pestana
// (sessionStorage), asi recargar no lo vuelve a abrir.
const CAJON_VISTO = 'bgw-cajon-visto';
function cajonYaVisto() {
  try { return sessionStorage.getItem(CAJON_VISTO) === '1'; } catch { return false; }
}
function marcarCajonVisto() {
  try { sessionStorage.setItem(CAJON_VISTO, '1'); } catch { /* sin almacenamiento: se abre siempre */ }
}

export function CartProvider({ children, promosCiclo = [] }) {
  // Arranca SIEMPRE vacío y el carrito guardado se lee en un efecto, no en el
  // inicializador. La portada se pre-genera como HTML en el build, y ahí no
  // existe localStorage: si el primer dibujado del cliente leyera el carrito y
  // el del servidor no, React encontraría un marcado distinto al hidratar y
  // volvería a dibujar toda la cáscara (el contador del carrito vive en el
  // encabezado). Con las dos partes arrancando en vacío, coinciden.
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  // El ultimo agregado: lo usan la tarjeta (el + pasa a tilde) y la barra de
  // "agregado" de TiendaLayout. `t` cambia en cada agregado, aunque sea el mismo.
  const [ultimo, setUltimo] = useState(null);
  const cargado = useRef(false);
  // Siempre lo ultimo que hay en el pedido, para que addItem sepa cuanto sumo de
  // verdad sin depender de cuando React corre el updater.
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      // Un carrito guardado antes del tope puede traer lineas de mas.
      if (raw) setItems(JSON.parse(raw).map((it) => ({ ...it, cantidad: recortarCantidad(it.cantidad) })).filter((it) => it.cantidad > 0));
    } catch { /* sin carrito guardado, o almacenamiento bloqueado */ }
    cargado.current = true;
  }, []);

  useEffect(() => {
    // Sin esta guarda, el primer disparo (con items todavía en vacío) pisaría
    // el carrito guardado antes de que el efecto de arriba alcance a leerlo.
    if (!cargado.current) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch { /* noop */ }
  }, [items]);

  // Devuelve cuantas unidades sumo de verdad (0 si la linea ya estaba en el
  // tope). Si no sumo nada, no hay "ultimo agregado": ni tilde ni latido.
  const addItem = useCallback((producto, presentacion, cantidad = 1) => {
    if (!presentacion) return 0;
    const key = keyOf(producto.id, presentacion.ml);
    const prev = itemsRef.current;
    const existe = prev.find((it) => it.key === key);
    const antes = existe ? existe.cantidad : 0;
    const despues = recortarCantidad(antes + cantidad);
    const sumo = despues - antes;
    if (sumo <= 0) return 0;
    const next = existe
      // Nunca por encima del tope: la base convertiria en 1 lo que lo pase.
      ? prev.map((it) => (it.key === key ? { ...it, cantidad: despues } : it))
      : [...prev, {
        key,
        productId: producto.id,
        nombre: tituloDe(producto),
        nombre_catalogo: producto.nombre || '',
        ml: presentacion.ml ?? null,
        codigo: presentacion.codigo || '',
        linea: presentacion.linea || '',
        nombre_proveedor: presentacion.nombre_proveedor || '',
        grupo_promo: presentacion.grupo_promo || null,
        precio: Number(presentacion.precio) || 0,
        cantidad: despues,
        imagen_url: producto.imagen_url || '',
      }];
    itemsRef.current = next;
    setItems(next);
    const abreCajon = !cajonYaVisto();
    if (abreCajon) {
      marcarCajonVisto();
      setOpen(true);
    }
    const nombre = tituloDe(producto);
    setUltimo({
      productId: producto.id,
      nombre,
      ml: presentacion.ml ?? null,
      detalle: detalleLinea(presentacion, nombre),
      abrioCajon: abreCajon,
      t: Date.now(),
    });
    return sumo;
  }, []);

  const removeItem = useCallback((key) => setItems((prev) => prev.filter((it) => it.key !== key)), []);

  const setCantidad = useCallback((key, cantidad) => {
    const tope = recortarCantidad(cantidad);
    setItems((prev) =>
      tope <= 0
        ? prev.filter((it) => it.key !== key)
        : prev.map((it) => (it.key === key ? { ...it, cantidad: tope } : it))
    );
  }, []);

  // Cuantas unidades de esa linea (producto + tamano) hay ya en el pedido.
  const cantidadDe = useCallback(
    (productId, ml) => items.find((it) => it.key === keyOf(productId, ml))?.cantidad || 0,
    [items]
  );

  const clear = useCallback(() => setItems([]), []);

  // El total sale del motor de promos, no de una suma simple: 2x1 por grupo.
  const cuenta = useMemo(() => calcularCarrito(items, promosCiclo), [items, promosCiclo]);
  const count = useMemo(() => items.reduce((acc, it) => acc + it.cantidad, 0), [items]);
  const totalLista = useMemo(
    () => items.reduce((acc, it) => acc + it.precio * it.cantidad, 0),
    [items]
  );

  const value = {
    items, addItem, removeItem, setCantidad, clear,
    total: cuenta.total, totalLista, ahorro: cuenta.ahorroTotal, grupos: cuenta.grupos,
    count, open, setOpen, ultimo, cantidadDe,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart debe usarse dentro de CartProvider');
  return ctx;
};
