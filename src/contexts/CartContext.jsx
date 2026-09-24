import { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { calcularCarrito } from '../lib/promos';
import { tituloDe } from '../lib/producto';

const CartContext = createContext(null);
const STORAGE_KEY = 'bgw-carrito-v2'; // v2: el item ahora lleva codigo y grupo_promo

// El item guarda TODO lo que necesita el pedido, no solo lo que se dibuja.
// `codigo` viaja hasta el mensaje de WhatsApp: sin el, Sebastian no puede
// cargar la orden en el sistema de su proveedora.
// item: { key, productId, nombre, inspirado_en, ml, codigo, linea,
//         nombre_proveedor, grupo_promo, precio, cantidad, imagen_url }
const keyOf = (productId, ml) => `${productId}::${ml ?? ''}`;

export function CartProvider({ children, promosCiclo = [] }) {
  // Arranca SIEMPRE vacío y el carrito guardado se lee en un efecto, no en el
  // inicializador. La portada se pre-genera como HTML en el build, y ahí no
  // existe localStorage: si el primer dibujado del cliente leyera el carrito y
  // el del servidor no, React encontraría un marcado distinto al hidratar y
  // volvería a dibujar toda la cáscara (el contador del carrito vive en el
  // encabezado). Con las dos partes arrancando en vacío, coinciden.
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const cargado = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch { /* sin carrito guardado, o almacenamiento bloqueado */ }
    cargado.current = true;
  }, []);

  useEffect(() => {
    // Sin esta guarda, el primer disparo (con items todavía en vacío) pisaría
    // el carrito guardado antes de que el efecto de arriba alcance a leerlo.
    if (!cargado.current) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch { /* noop */ }
  }, [items]);

  const addItem = useCallback((producto, presentacion, cantidad = 1) => {
    if (!presentacion) return;
    const key = keyOf(producto.id, presentacion.ml);
    setItems((prev) => {
      const existe = prev.find((it) => it.key === key);
      if (existe) {
        return prev.map((it) => (it.key === key ? { ...it, cantidad: it.cantidad + cantidad } : it));
      }
      return [...prev, {
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
        cantidad,
        imagen_url: producto.imagen_url || '',
      }];
    });
    setOpen(true);
  }, []);

  const removeItem = useCallback((key) => setItems((prev) => prev.filter((it) => it.key !== key)), []);

  const setCantidad = useCallback((key, cantidad) => {
    setItems((prev) =>
      cantidad <= 0
        ? prev.filter((it) => it.key !== key)
        : prev.map((it) => (it.key === key ? { ...it, cantidad } : it))
    );
  }, []);

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
    count, open, setOpen,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart debe usarse dentro de CartProvider');
  return ctx;
};
