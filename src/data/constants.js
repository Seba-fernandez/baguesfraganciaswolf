/**
 * Configuración visual de estados y prioridades
 * g = RGB string para generar rgba() dinámicos
 */

export const ESTADOS = {
  pendiente:     { label: "Pendiente",   color: "#8E8E93", g: "142,142,147" },
  contactado:    { label: "Contactado",  color: "#0A84FF", g: "10,132,255"  },
  interesado:    { label: "Interesado",  color: "#30D158", g: "48,209,88"   },
  no_interesado: { label: "No interesa", color: "#FF453A", g: "255,69,58"   },
  vendido:       { label: "Vendido",     color: "#BF5AF2", g: "191,90,242"  },
};

export const PRIORIDADES = {
  alta:  { label: "Alta",  color: "#FF453A" },
  media: { label: "Media", color: "#FF9F0A" },
  baja:  { label: "Baja",  color: "#636366" },
};

export const NAV_ITEMS = [
  { key: "todos",         icon: "☰", label: "Todos" },
  { key: "pendiente",     icon: "◌", label: "Pendientes" },
  { key: "contactado",    icon: "◉", label: "Contactados" },
  { key: "interesado",    icon: "✦", label: "Interesados" },
  { key: "no_interesado", icon: "⊘", label: "Descartados" },
  { key: "vendido",       icon: "✧", label: "Vendidos" },
];
