import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';

const CartContext = createContext(null);
const STORAGE_KEY = 'bgw-carrito';

// item: { key, productId, nombre, ml, precio, cantidad, imagen_url }
const keyOf = (productId, ml) => `${productId}::${ml ?? ''}`;

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch { /* noop */ }
  }, [items]);

  const addItem = useCallback((producto, presentacion, cantidad = 1) => {
    const key = keyOf(producto.id, presentacion?.ml);
    setItems((prev) => {
      const existe = prev.find((it) => it.key === key);
      if (existe) {
        return prev.map((it) => (it.key === key ? { ...it, cantidad: it.cantidad + cantidad } : it));
      }
      return [
        ...prev,
        {
          key,
          productId: producto.id,
          nombre: producto.nombre,
          ml: presentacion?.ml ?? null,
          precio: presentacion?.precio ?? 0,
          cantidad,
          imagen_url: producto.imagen_url || '',
        },
      ];
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

  const total = useMemo(() => items.reduce((acc, it) => acc + it.precio * it.cantidad, 0), [items]);
  const count = useMemo(() => items.reduce((acc, it) => acc + it.cantidad, 0), [items]);

  const value = { items, addItem, removeItem, setCantidad, clear, total, count, open, setOpen };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart debe usarse dentro de CartProvider');
  return ctx;
};
