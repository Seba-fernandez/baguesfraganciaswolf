# **PLAN MAESTRO — Bagues Grupo Wolf (Sebastián Fernández)**

> **Qué es este documento:** la guía única del proyecto. Si te perdés, empezá acá.
> Explica **qué se construye**, **dónde vive cada cosa**, **cómo se llaman las cosas**
> y **en qué orden se hace**. Se actualiza a medida que avanzamos.
>
> **Fecha de arranque:** 29/08/2026
> **Autor / dueño / único usuario del panel:** Sebastián Fernández — sebixtar@gmail.com

---

## 1. La idea en una frase

Una **web pública tipo vitrina** (diseño **neofuturista**) donde la gente arma un
pedido de perfumes y lo envía; y un **panel de administración privado** (solo vos)
donde ese pedido queda guardado, organizado por estado, con el cliente, la seña,
los tiempos y las notas de cada conversación. Todo con **una sola base de datos**
(Supabase) y **una sola app** que se puede **instalar en el celular (PWA)** y usar
en la web.

**No es un e-commerce:** no cobra, no procesa pagos, no tiene stock en tiempo real.
Es catálogo + captación de pedidos + organización personal.

---

## 2. Tu flujo de trabajo real (lo que el sistema tiene que respetar)

```
   Fin de semana            Fin de semana            Viernes              Después
 ┌───────────────┐   →    ┌─────────────────┐   →  ┌───────────┐   →  ┌──────────┐
 │ Cliente te    │        │ Vos cargás el   │      │ Buscás lo │      │ Avisás y │
 │ pide (web o   │        │ pedido en la    │      │ que pediste│      │ entregás │
 │ WhatsApp)     │        │ web de Bagués   │      │ en tu     │      │          │
 │               │        │ (proveedora)    │      │ proveedora│      │          │
 └───────────────┘        └─────────────────┘      └───────────┘      └──────────┘
```

La web de Bagués (donde vos pedís a tu proveedora) **queda 100% afuera de esta
app**. No hay integración, ni scraping, ni login a ese sistema. Vos copiás a mano
los nombres de los perfumes allá. Esta app solo te **organiza tu lado**.

### Estados de un pedido (columna vertebral del panel)

| Estado | Qué significa | Quién lo dispara |
|---|---|---|
| `nuevo` | Entró un pedido (web o lo cargaste a mano). Todavía no hiciste nada. | Web / vos |
| `senia` | El cliente pagó la seña. | Vos |
| `cargado` | Ya lo cargaste en la web de Bagués. | Vos (finde) |
| `en_proveedora` | Llegó a tu proveedora, esperando el viernes. | Vos |
| `retirado` | Lo buscaste el viernes, lo tenés vos. | Vos |
| `avisado` | Le avisaste al cliente que está listo. | Vos |
| `entregado` | Cerrado. Cobrado y entregado. | Vos |
| `cancelado` | Se cayó el pedido. | Vos |

Campos extra por pedido:
- **Pago:** `no` · `senia` · `total`
- **Detalle de conversación:** texto libre ("le dije que llega el viernes",
  "está al pendiente de confirmación", "sabe que retira en persona", etc.)
- **Semana del pedido** y **fecha estimada de retiro** (el viernes siguiente).

---

## 3. Decisiones ya tomadas

| Tema | Decisión |
|---|---|
| **Nombre público** | "Bagues Grupo Wolf" · vendedor: Sebastián Fernández. En la web se aclara: *catálogo Bagués, venta particular*. |
| **Notificación de pedido nuevo** | **Sin API de WhatsApp** (no tenés chip aparte). El checkout **guarda el pedido en la base** y abre un link `wa.me` para que el cliente te escriba a tu número de siempre. A vos te avisa una **notificación push de la PWA** (o Telegram). Las auto-respuestas las hace la **app WhatsApp Business** nativa. Ver §9. |
| **Móvil** | **PWA instalable** (la misma web se instala como app, sin tiendas). |
| **Base de datos** | **Reactivar y reutilizar** el proyecto Supabase existente (`wynownataftnompltsok`, hoy PAUSADO). Se borra lo de vajillas y se crea el esquema de perfumes encima. |
| **Repo** | Se **reutiliza este repo** (`crm-vajilla-cba`) porque ya tiene React + Vite + Supabase + auth con Google. Se renombra conceptualmente a **grupo-wolf**. Historial de git se conserva. |
| **Deploy** | Vercel (una sola app, un solo dominio). |
| **Sin sobreingeniería** | Nada de n8n, nada de microservicios, nada de librería de estado. Context + hooks + Supabase alcanza. |

---

## 4. Arquitectura (visión de 10.000 pies)

```
                         ┌──────────────────────────┐
                         │        UNA APP React     │  (Vite + React Router)
                         │                          │
      Público  ─────────▶│  Zona TIENDA   /         │  sin login
      (clientes)         │   · Hero + promos        │
                         │   · Catálogo (neofuturista)│
                         │   · Modal de perfume     │
                         │   · Carrito (localStorage)│
                         │   · Checkout ──┐         │
                         │                │         │
      Vos ──────────────▶│  Zona PANEL  /panel/*    │  login (solo tu email)
      (admin)            │   · Pedidos (por estado) │
                         │   · Clientes             │
                         │   · Productos (on/off)   │
                         │   · Promos / Hero        │
                         │   · Ajustes              │
                         └────────┬─────────┬───────┘
                                  │         │
                    ┌─────────────▼──┐   ┌──▼───────────────┐
                    │  Supabase DB   │   │ Supabase Storage │
                    │  (Postgres)    │   │  fotos productos │
                    │  + RLS         │   │  + banners promo │
                    └───────┬────────┘   └──────────────────┘
                            │
                   Database Webhook (INSERT en orders con canal='web')
                            │
                    ┌───────▼────────────────┐
                    │ Edge Function          │──▶ Push PWA / Telegram ──▶ 📱 "Pedido nuevo #15"
                    │ "notificar-pedido"     │
                    └────────────────────────┘

   (el cliente, aparte, te escribe a tu WhatsApp de siempre por el link wa.me;
    vos respondés cuando podés; WhatsApp Business manda el saludo automático)
```

**Por qué una sola app y no dos:** menos deploys, un solo dominio, comparten
`supabase.js`, tokens de diseño y componentes `ui/`. La zona pública simplemente
no monta el `AuthGate`.

---

## 5. Stack y herramientas — **qué instalar y para qué**

### Ya está en el proyecto (no tocar)
| Paquete | Para qué |
|---|---|
| `react` + `react-dom` 18 | UI |
| `react-router-dom` 7 | Rutas (`/` tienda, `/panel/*` admin) |
| `@supabase/supabase-js` 2 | Cliente de base de datos + auth |
| `motion` (Framer Motion) 12 | Animaciones (ya instalado, se aprovecha para el neofuturismo) |
| `vite` 5 + `@vitejs/plugin-react` | Build / dev server |

### Hay que instalar
| Comando | Qué es | Por qué |
|---|---|---|
| `npm i -D vite-plugin-pwa` | Plugin de Vite | Genera el manifest, los iconos y el service worker para que la app se **instale en el celular** y abra offline la parte visual. |
| `npm i -D workbox-window` | (lo pide vite-plugin-pwa) | Runtime del service worker. |
| `npm i -g supabase` | **Supabase CLI** | Correr y versionar **migraciones SQL** y **deployar la Edge Function** de notificación. Se instala una sola vez en tu PC. |
| `npm i date-fns` | Utilidades de fecha (liviano) | Calcular "próximo viernes", "semana del pedido", mostrar "hace 3 días". Solo si la lógica de fechas se complica; si no, se usa `Intl` nativo. **Se decide en Fase 1.** |
| `npm i web-push` (en la Edge Function) | Envío de notificaciones push | Avisarte de un pedido nuevo en la PWA instalada. Alternativa: bot de Telegram (aún más simple). |

### NO se instala (a propósito)
- **n8n / Zapier / Make** — la notificación se hace con 1 Edge Function de ~40 líneas.
- **Redux / Zustand / Jotai** — el estado global es: sesión (Context), tema
  (Context), carrito (Context + localStorage). Nada más.
- **Tailwind / librería de componentes** — ya hay un sistema de diseño propio
  (`global.css` + CSS Modules). Se extiende, no se reemplaza.
- **TypeScript** — el proyecto es JS. Migrar ahora es costo sin beneficio para un
  proyecto de un solo dev. Se puede evaluar más adelante.

### Servicios externos a dar de alta
| Servicio | Para qué | Costo |
|---|---|---|
| **WhatsApp Business** (app en tu celular) | Chatear con los clientes + saludo/ausencia automáticos + etiquetas | Gratis. Reemplaza a WhatsApp normal en tu **mismo número** |
| **Bot de Telegram** (opcional, plan B de aviso) | Recibir "pedido nuevo #N" al toque | Gratis, se crea con @BotFather en 2 min |
| **Vercel** | Hosting de la app | Gratis (plan Hobby) |
| **Supabase** | DB + Storage + Edge Functions + Auth | Gratis (plan Free); el proyecto pausado se reactiva |

**Ya NO hace falta:** Meta Business / WhatsApp Cloud API / número o chip aparte.

---

## 6. Estructura de carpetas (destino)

> Lo **NUEVO** está marcado. Lo demás ya existe y se conserva o se adapta.

```
grupo-wolf/                          (este repo, renombrado)
│
├── PLAN-MAESTRO.md                  ★ este documento
├── index.html                       (se actualiza: título, metas, manifest PWA)
├── vite.config.js                   (se le agrega vite-plugin-pwa)
├── package.json
├── .env                             VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY  (ya existe, NO se commitea)
├── vercel.json                      ★ headers de seguridad (traído de tienda-perfumes)
├── skills-lock.json                 ★ versiones de los skills (se versiona; los skills en sí no)
├── .claude/skills/                  ★ 12 skills de diseño/animación (gitignored — §14)
│
├── public/
│   ├── favicon.svg
│   ├── icon-192.png  icon-512.png   ★ iconos PWA
│   └── og-cover.webp                ★ imagen para compartir el link
│
├── supabase/                        ★ TODO NUEVO
│   ├── migrations/
│   │   ├── 20260829_0001_backup_y_reset_vajilla.sql
│   │   ├── 20260829_0002_schema_perfumes.sql
│   │   ├── 20260829_0003_rls_policies.sql
│   │   ├── 20260829_0004_rpc_crear_pedido_web.sql
│   │   └── 20260829_0005_storage_buckets.sql
│   └── functions/
│       └── notificar-pedido/
│           └── index.ts             (Deno — llama a WhatsApp Cloud API)
│
├── docs/                            ★ material de apoyo (traído de tienda-perfumes)
│   ├── direccion-de-arte.md         (brief para las fotos de los frascos)
│   ├── neofuturismo.md              ★ el sistema visual de la tienda (paleta, tipo, motion)
│   └── whatsapp-cloud-api.md        ★ paso a paso de la config de Meta
│
└── src/
    ├── main.jsx                     (monta Providers: Auth, Theme, Cart)
    ├── App.jsx                      (router: público vs panel — se reescribe)
    │
    ├── lib/
    │   ├── supabase.js             (cliente + authHelpers — ya existe)
    │   ├── whatsapp.js             ★ arma links wa.me y el texto del pedido
    │   └── fechas.js               ★ "próximo viernes", "semana del pedido"
    │
    ├── contexts/
    │   ├── AuthContext.jsx         (ya existe)
    │   ├── ThemeContext.jsx        (ya existe — la tienda fuerza tema "neo")
    │   └── CartContext.jsx         ★ carrito en localStorage
    │
    ├── hooks/
    │   ├── useProducts.js          ★ lee/escribe products (+ presentaciones)
    │   ├── useOrders.js            ★ lee/escribe orders + order_items
    │   ├── useCustomers.js         ★ lee/escribe customers
    │   ├── usePromos.js            ★ lee/escribe promos
    │   ├── useSettings.js          ★ número de WhatsApp, textos, etc.
    │   └── useIsDesktop.js         (ya existe)
    │
    ├── data/
    │   └── constants.js            (se reescribe: ESTADOS_PEDIDO, PAGO, GENEROS, FAMILIAS_OLFATIVAS, NAV_PANEL)
    │
    ├── styles/
    │   ├── global.css             (tokens base + sistema "glass" — ya existe, se amplía)
    │   └── tienda.css             ★ capa neofuturista SOLO para la zona pública
    │
    └── components/
        ├── layout/                 (ya existe: Layout, TopBar, BottomNav, Background, SVGFilters)
        │   └── PanelLayout.jsx     ★ shell del panel (renombra el Layout actual si hace falta)
        │
        ├── ui/                     (ya existe: Avatar, StatusBadge, FAB)
        │   ├── Toggle.jsx          ★ switch on/off para "disponible"
        │   ├── Money.jsx           ★ formatea $ AR
        │   └── ImageUpload.jsx     ★ subir foto a Supabase Storage
        │
        ├── auth/                   (ya existe: AuthGate, Login, Register)
        │
        ├── tienda/                 ★ TODO NUEVO — zona pública
        │   ├── TiendaLayout.jsx        (header + footer + botón flotante WhatsApp)
        │   ├── Hero.jsx
        │   ├── PromoStrip.jsx          (promos con foto, editables desde el panel)
        │   ├── CatalogFilters.jsx      (chips: género, familia, momento)
        │   ├── ProductGrid.jsx
        │   ├── ProductCard.jsx         (jerarquía: nombre → bajada → etiqueta → foto)
        │   ├── ProductModal.jsx        (detalle + pirámide olfativa + tamaño + cantidad + "Agregar")
        │   ├── CartButton.jsx          (contador flotante)
        │   ├── CartSheet.jsx           (resumen del carrito)
        │   └── CheckoutForm.jsx        (nombre + WhatsApp → crea el pedido → abre wa.me)
        │
        └── panel/                  ★ TODO NUEVO — zona admin
            ├── PedidosScreen.jsx       (tablero por estado — el corazón del panel)
            ├── PedidoCard.jsx
            ├── PedidoSheet.jsx         (editar estado, pago, notas, ítems)
            ├── NuevoPedidoForm.jsx     (cargar un pedido a mano, de WhatsApp)
            ├── ClientesScreen.jsx
            ├── ClienteSheet.jsx        (historial de pedidos del cliente)
            ├── ProductosScreen.jsx     (grilla con Toggle disponible + precio inline)
            ├── ProductoEditor.jsx      (alta/edición: nombre, textos, notas, foto, presentaciones)
            ├── PromosScreen.jsx
            └── AjustesScreen.jsx       (tu WhatsApp, textos del checkout, tema, logout, exportar)
```

---

## 7. Convenciones de nombres (respetar siempre)

Se **mantienen las del repo actual**, no se inventan nuevas:

| Cosa | Convención | Ejemplo |
|---|---|---|
| Componente React | `PascalCase.jsx` + `PascalCase.module.css` en la **misma carpeta** | `ProductCard.jsx` / `ProductCard.module.css` |
| Hook | `useAlgo.js` en `src/hooks/` | `useOrders.js` |
| Helper / util | `camelCase.js` en `src/lib/` | `whatsapp.js` |
| Variables y funciones JS | `camelCase` (en español está OK, ya se usa) | `pedidosPorEstado`, `armarLinkWhatsApp()` |
| Constantes exportadas | `MAYUS_CON_GUION_BAJO` | `ESTADOS_PEDIDO`, `PAGO` |
| Clases CSS (dentro de Module) | `camelCase`; helpers globales existentes: `.glass`, `.glass-strong` | `s.pedidoCard`, `s.estadoDot` |
| Rutas | minúscula, en español | `/panel/pedidos`, `/panel/clientes` |
| **Tablas DB** | plural, `snake_case`, español | `products`, `order_items`, `customers` |
| **Columnas DB** | `snake_case`, español | `precio_unitario`, `fecha_retiro_estimada` |
| **Enums DB** | `snake_case` | `estado_pedido`, `estado_pago` |
| Archivos de migración | `AAAAMMDD_NNNN_descripcion.sql` | `20260829_0002_schema_perfumes.sql` |
| Buckets de Storage | `kebab` o simple | `productos`, `promos` |

**Regla de oro del código:** cada componente hace **una** cosa. Si un archivo pasa
de ~150 líneas, se parte. La lógica de datos vive en **hooks**, nunca en el JSX.

---

## 8. Modelo de datos (Supabase / Postgres)

> SQL completo en `supabase/migrations/`. Acá el mapa conceptual.

### `products` — el catálogo
| Columna | Tipo | Nota |
|---|---|---|
| `id` | uuid PK | |
| `slug` | text unique | `hawai-masculino` |
| `nombre` | text | **"Hawai Masculino"** (jerarquía: es el título grande) |
| `linea` | text | `bagues` (por si mañana sumás otra línea) |
| `genero` | `genero` enum | `masculino` · `femenino` · `unisex` |
| `familia_olfativa` | text | `amaderado`, `cítrico`, `dulce`... (para filtros) |
| `momento` | text | `verano` · `invierno` · `todo` |
| `descripcion_corta` | text | 1 línea, aparece en la card |
| `descripcion_larga` | text | 2-3 líneas, aparece en el modal |
| `nota_salida` / `nota_corazon` / `nota_fondo` | text | pirámide olfativa (puede quedar vacía) |
| `imagen_url` | text | ruta en Storage |
| `presentaciones` | jsonb | `[{ "ml": 50, "precio": 18000, "activo": true }, ...]` — **acá actualizás precios cada mes** |
| `activo` | bool | **el toggle on/off del panel.** `false` = no está en el catálogo de este mes |
| `destacado` | bool | aparece en la sección "Destacados" del home |
| `orden` | int | orden manual en la grilla |
| `created_at` / `updated_at` | timestamptz | |

### `customers` — clientes
| Columna | Tipo | Nota |
|---|---|---|
| `id` | uuid PK | |
| `nombre` | text | nombre completo |
| `telefono` | text unique | WhatsApp normalizado (`549351...`) |
| `notas` | text | libre |
| `created_at` | timestamptz | |

### `orders` — pedidos
| Columna | Tipo | Nota |
|---|---|---|
| `id` | uuid PK | |
| `numero` | int (serial, legible) | "Pedido #14" |
| `customer_id` | uuid FK → customers | |
| `estado` | `estado_pedido` enum | ver §2 |
| `pago` | `estado_pago` enum | `no` · `senia` · `total` |
| `senia_monto` | numeric | opcional |
| `total_estimado` | numeric | suma de ítems (referencial) |
| `canal` | text | `web` · `manual` |
| `notas_conversacion` | text | **"detalle de conversación"** — qué le dijiste |
| `notas_privadas` | text | tus recordatorios |
| `semana_pedido` | date | fin de semana en que entró |
| `fecha_retiro_estimada` | date | viernes siguiente (auto, editable) |
| `created_at` / `updated_at` | timestamptz | |

### `order_items` — ítems de cada pedido
| Columna | Tipo | Nota |
|---|---|---|
| `id` | uuid PK | |
| `order_id` | uuid FK → orders | |
| `product_id` | uuid FK → products (nullable) | null si lo escribiste a mano |
| `nombre_snapshot` | text | **"Hawai Masculino Bagués 50ml"** — se guarda el nombre tal cual, no se rompe si después editás el producto |
| `ml` | int | 50, 100... |
| `cantidad` | int | |
| `precio_unitario` | numeric | precio al momento del pedido |

### `promos` — promos del home (editables desde el panel)
| Columna | Tipo | Nota |
|---|---|---|
| `id` | uuid PK | |
| `titulo` / `bajada` | text | |
| `imagen_url` | text | foto de catálogo |
| `cta_texto` / `cta_link` | text | opcional |
| `ubicacion` | text | `hero` · `seccion` |
| `activo` | bool | |
| `orden` | int | |

### `settings` — configuración (una sola fila)
`whatsapp_owner`, `mensaje_checkout`, `aclaracion_pedido`, etc.

### Seguridad (RLS) — resumen
| Tabla | Público (anon) | Vos (autenticado, tu email) |
|---|---|---|
| `products` | SELECT solo `activo = true` | todo |
| `promos` | SELECT solo `activo = true` | todo |
| `customers` | ❌ nada directo | todo |
| `orders` / `order_items` | ❌ nada directo | todo |
| **crear pedido web** | vía función `crear_pedido_web()` (`SECURITY DEFINER`), que valida y hace todo en una transacción | — |

El panel se restringe con una policy tipo
`(auth.jwt() ->> 'email') = 'sebixtar@gmail.com'` (o tabla `admins` con tu id).

---

## 9. Mensajes de pedidos y avisos — **sin chip aparte, sin API de Meta**

### El problema
La API oficial de WhatsApp (Cloud API) **exige un número que NO esté activo en
ninguna app de WhatsApp**. Como no tenés un chip aparte y querés seguir chateando
normal desde tu teléfono, **descartamos la API**. No hace falta.

### La solución (3 piezas que trabajan juntas)

**1. El cliente te escribe a tu número de siempre (link `wa.me`)**
- Al tocar "Hacer pedido", el checkout **primero guarda el pedido en la base**
  (función `crear_pedido_web()`), y **después** abre
  `https://wa.me/<tu-numero>?text=<resumen del pedido>`.
- El mensaje le queda pre-escrito al cliente con los perfumes, tamaños y su
  nombre. Él solo toca "enviar". Te llega a tu WhatsApp normal.
- **Aunque el cliente no envíe el WhatsApp, el pedido YA quedó en tu panel.**

**2. Vos recibís un aviso de "pedido nuevo" (push de la PWA o Telegram)**
- `Database Webhook` en `INSERT` de `orders` → Edge Function `notificar-pedido`.
- La función manda una **notificación push** a tu PWA instalada:
  *"🆕 Pedido #15 — Juan Pérez · 2 ítems · ~$36.000"*. Tocás y abrís el pedido.
- **Plan B más simple:** en vez de push, un **bot de Telegram** (creás el bot con
  @BotFather, guardás `TELEGRAM_TOKEN` y `TELEGRAM_CHAT_ID`). Mismo resultado,
  cero configuración de claves VAPID.
- **Además**, el panel usa **Supabase Realtime**: si lo tenés abierto, el pedido
  nuevo aparece solo con un badge. Nunca dependés 100% de la notificación.

**3. Las respuestas automáticas las hace WhatsApp Business (app nativa, gratis)**
- Instalás **WhatsApp Business** en tu celular. **Mantiene tu mismo número**
  (migra tu cuenta, reemplaza a la app normal). Tenés, sin escribir una línea de
  código:
  - **Mensaje de bienvenida** — se envía solo la primera vez que alguien te escribe.
  - **Mensaje de ausencia** — se envía fuera del horario que vos definas.
  - **Respuestas rápidas** — atajos (`/seña`, `/viernes`) para contestar en 1 toque.
  - **Etiquetas** — "Seña pagada", "Espera viernes", "Avisado"… ordenás los chats.
- Esto es exactamente *"que responda cuando no estoy y yo tomo el control cuando
  puedo"* — **el bot nunca aparece de más porque no hay bot**, es la app oficial.

### Instagram
- En la web va tu `@usuario` con link directo a tu Instagram.
- Los DMs te llegan a la app de Instagram normal. Activás **cuenta profesional**
  (gratis) y usás sus **respuestas guardadas** + **respuestas frecuentes** +
  **mensaje de ausencia** desde el panel profesional de IG. Mismo criterio que
  WhatsApp Business.
- Unificar WhatsApp + Instagram + web en **una sola bandeja con bot** (tipo
  Chatwoot) es posible pero es **otro sistema entero** → queda fuera del alcance
  ahora (sobreingeniería). Si algún día el volumen lo justifica, se evalúa.

### Secrets de la Edge Function (van con `supabase secrets set`, no al repo)
```
# opción push:
VAPID_PUBLIC_KEY=...   VAPID_PRIVATE_KEY=...   VAPID_SUBJECT=mailto:sebixtar@gmail.com
# opción Telegram (más simple):
TELEGRAM_TOKEN=...      TELEGRAM_CHAT_ID=...
```

---

## 10. Diseño NEOFUTURISTA (zona pública)

> Detalle en `docs/neofuturismo.md`. Resumen de la dirección:

El panel ya tiene una base "glass / oscuro / acento índigo neón" que sirve de
punto de partida. Para la **tienda** se lleva a un **neofuturismo con criterio**
(no el "negro + dorado + glow" genérico de IA):

- **Fondo:** casi-negro azulado (`#050510`), con una grilla/mesh sutil y grano.
- **Un solo acento** de color (cian eléctrico o violeta), usado con moderación
  para foco y estados — no todo brilla.
- **Vidrio y cromo:** superficies `glass` (ya existe el sistema), bordes finos
  luminosos, reflejos.
- **Tipografía:** un display geométrico/ancho para títulos + una mono o
  grotesque para datos y etiquetas (precio, ml, familia olfativa). Jerarquía por
  tamaño y tracking, no por mil fuentes.
- **Forma:** medios rectos (foto del frasco = rectángulo), interactivos en
  píldora. Se conserva esta regla de `tienda-perfumes`.
- **Motion:** con `motion` (ya instalado). Entrada coreografiada del hero,
  reveals al scrollear, hover con parallax sutil en las cards. Todo colapsa con
  `prefers-reduced-motion`.
- **Elemento firma:** la **pirámide olfativa** (salida / corazón / fondo) del
  detalle de perfume — se trae tal cual de `tienda-perfumes`, es vocabulario
  real del rubro.

Lo que se **descarta** de `tienda-perfumes`: la paleta "Forest" verde/ámbar y las
fuentes Marcellus/Garamond (son de perfumería clásica, opuestas al neofuturismo).
Se **conserva**: la estructura de secciones, la lógica JS del catálogo/modal/
filtros/wa-link (portada a React) y `docs/direccion-de-arte.md`.

---

## 11. Plan de trabajo por fases

> Cada fase deja algo **usable**. No se empieza la siguiente sin cerrar la anterior.

### **FASE 0 — Preparar terreno** ✅ *(completada 30/08/2026)*
- [x] Rama `feature/migracion-perfumes` (desde `feature/v2-redesign`, el código más nuevo).
- [x] Skills de diseño/animación instaladas (§14).
- [x] Proyecto Supabase reactivado (`ACTIVE_HEALTHY`).
- [x] Backup de `contacts`: **tenía 0 filas** (los datos de vajilla nunca se
      importaron, viven solo en `src/data/contacts.js`). No hubo nada que perder.
- [x] Migración `0001` — drop `contacts`.
- [x] Migración `0002` — esquema de perfumes (§8): `products`, `customers`,
      `orders`, `order_items`, `promos`, `settings` + enums + trigger `updated_at`.
- [x] Migración `0003` — RLS: público lee catálogo/promos activos; admin (tu email) todo.
- [x] Migración `0004` — `crear_pedido_web()` (probada de punta a punta: crea
      cliente + pedido + ítems, toma precios de la DB, devuelve el nº de pedido).
- [x] Migración `0005` — buckets Storage `productos` y `promos` (lectura pública, escritura admin).
- [x] Migración `0006` — hardening (cierra avisos del linter de Supabase).
- [x] `vite-plugin-pwa` instalado + `npm audit fix` (8 → 2 vulnerabilidades, las 2
      restantes son de `vite`/`esbuild` solo-dev, requieren subir a Vite 8: pendiente aparte).
- [x] Renombrado: `package.json` → `bagues-grupo-wolf` v2.0.0; `index.html` título/meta.
- [x] Semilla: 6 perfumes de ejemplo en `products` (editables/borrables desde el panel).
- [ ] *(pendiente, opcional)* Instalar `supabase` CLI global para deploy de la Edge Function (Fase 3).

**Resultado:** base de datos de perfumes lista y verificada. Las migraciones
quedaron en `supabase/migrations/` (fuente de verdad versionada).

### **FASE 1 — Panel admin** ✅ *(completada 30/08/2026)*
- [x] `App.jsx` reescrito: rutas `/panel/*` detrás de `AuthGate`. `AuthGate` ahora
      corta si el email no está en `ADMIN_EMAILS` (coincide con `es_admin()` de la DB).
- [x] Hooks: `useProducts`, `useOrders` (con Realtime), `useCustomers`, `useSettings`.
- [x] `lib/whatsapp.js` (links `wa.me` + textos) y `lib/format.js` (pesos, fechas).
- [x] `ProductosScreen` + `ProductoEditor` + `ui/ImageUpload` (sube a Storage) + `ui/Toggle`:
      alta/edición de perfumes, foto, pirámide olfativa, presentaciones (ml + precio +
      disponible), destacado, y el **toggle activo** directo en la lista.
- [x] `PedidosScreen` — tablero por estado (columnas de estados abiertos, "Todos" para ver cerrados).
- [x] `PedidoSheet` — cambiar estado, pago, seña, fecha de retiro, notas de conversación,
      y botón "Escribir al cliente" (abre WhatsApp con texto según el estado).
- [x] `NuevoPedidoForm` — cargar a mano un pedido (elegís del catálogo o escribís libre;
      el precio se autocompleta del producto).
- [x] `ClientesScreen` + `ClienteSheet` — se crean solos al cargar pedidos; historial por cliente.
- [x] `AjustesScreen` — tu WhatsApp, Instagram, textos del checkout, tema, logout.
- [x] Borradas todas las pantallas/hooks del CRM de vajilla viejo.
- [x] `npm run build` en verde; la app monta sin errores de consola.

**Resultado:** ya podés cargar clientes, pedidos y moverlos por estado, y administrar
el catálogo con el toggle on/off. Falta la web pública (Fase 2) y el aviso automático (Fase 3).

### **FASE 2 — Web pública** ✅ *(núcleo completado 31/08/2026 — ver `MASTER.md` para el detalle de diseño)*
- [x] `MASTER.md` (sistema visual "Vitrina Ácida", iteró 4 veces con el usuario) + `src/styles/tienda.css`.
- [x] `TiendaLayout` (header + footer + wordmark), `Hero` (con `Bottle3D` decorativo).
- [x] `ProductGrid` + `ProductCard` + filtros por género + `FeaturedRows` ("Los que no fallan").
- [x] `ProductModal` con pirámide olfativa, spec, tamaños, stepper.
- [x] `CartContext` (localStorage) + `CartSheet` (carrito → checkout, un solo sheet, sin anidar).
- [x] Checkout → `crear_pedido_web()` → abre WhatsApp con el resumen — **probado end-to-end contra la DB real**.
- [x] Ruta `/` pública (sin login) + `/panel/*` gateado — reestructuración de `App.jsx`.
- [x] `ProductosTabla.jsx` — vista de tabla para carga rápida mensual (precio + disponibilidad en línea).
- [ ] `PromosScreen` en el panel (editar hero/promos con foto) — pendiente; el Hero ya tiene copy por defecto sin esto.
- [ ] Code-splitting más fino (three.js ~530kb en su propio chunk, ya separado del panel).

**Resultado:** la web ya recibe pedidos reales y quedan en tu panel. Falta el
aviso automático (Fase 3) y opcionalmente que puedas editar el hero desde el panel.

### **FASE 3 — Aviso de pedido nuevo**
- [ ] Edge Function `notificar-pedido` (Telegram como default, push PWA opcional).
- [ ] Database Webhook `orders` INSERT → función.
- [ ] `docs/whatsapp-business.md` (cómo configurar bienvenida/ausencia/etiquetas).
- [ ] Supabase Realtime en `PedidosScreen` (badge de pedido nuevo en vivo).
- [ ] Probar de punta a punta: pedido web → aparece en panel → llega el aviso.

**Resultado:** te enterás del pedido al toque, sin depender de que el cliente
mande el WhatsApp.

### **FASE 4 — PWA + deploy + pulido**
- [ ] `vite-plugin-pwa`: manifest, iconos, service worker (cachea el shell visual).
- [ ] Probar "Agregar a pantalla de inicio" en tu celular.
- [ ] `vercel.json` con headers de seguridad.
- [ ] Deploy en Vercel, variables de entorno, dominio.
- [ ] Checklist final (Lighthouse, prueba en celular real, link compartido).

**Resultado:** app instalada en tu celular + web publicada.

---

## 12. Variables de entorno

**`.env.local`** (local y en Vercel — **nunca se commitea**):
```
VITE_SUPABASE_URL=https://wynownataftnompltsok.supabase.co
VITE_SUPABASE_ANON_KEY=...(anon key, es pública por diseño, protegida por RLS)
```

**Secrets de la Edge Function** (se cargan con `supabase secrets set`, no van al repo):
```
# Aviso por Telegram (default, más simple):
TELEGRAM_TOKEN=...
TELEGRAM_CHAT_ID=...
# Aviso por push PWA (opcional):
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:sebixtar@gmail.com
```

> El **número de WhatsApp tuyo** (para armar el link `wa.me` del checkout) NO es
> secreto: va en la tabla `settings` y lo editás desde el panel.

---

## 13. Cómo correr el proyecto

```bash
npm install
npm run dev            # http://localhost:5173  → / (tienda) y /panel (admin)

# Base de datos (con Supabase CLI logueado):
supabase link --project-ref wynownataftnompltsok
supabase db push                      # aplica migraciones de supabase/migrations/
supabase functions deploy notificar-pedido
```

---

## 14. Skills de diseño/animación instaladas

Instaladas en `.claude/skills/` (proyecto), con `npx skills add`. Se usan cuando
construyamos la tienda neofuturista. **Revisar antes de confiar** — son de la
comunidad, corren con permisos del agente.

| Skill | Fuente | Para qué |
|---|---|---|
| `design-dna` | `zanwei/design-dna` | Extraer un "ADN de diseño" (tokens + estilo + efectos) desde referencias (capturas, URLs) y aplicarlo. Ideal para fijar la identidad neofuturista. |
| `paint` | `athevon/genjutsu` | Orquestador: arma un universo visual completo desde cero (arte, sistema, implementación, auditoría). Anti "AI slop". |
| `cast` | `athevon/genjutsu` | Orquestador de **movimiento**: pipeline de 7 etapas para pedidos de animación. |
| `motion-principles` | `athevon/genjutsu` | Principios de motion (timing, easing, coreografía). |
| `gsap` | `athevon/genjutsu` | Motor GSAP: core, timeline, ScrollTrigger, plugins. |
| `gsap-scrolltrigger` | `freshtechbro/claudedesignskills` | GSAP + ScrollTrigger en profundidad (pin, scrub, parallax). |
| `threejs-r3f` | `athevon/genjutsu` | Three.js con React Three Fiber (encaja con este stack React). |
| `threejs-webgl` | `freshtechbro/claudedesignskills` | Three.js vanilla / WebGPU, escenas, materiales, shaders. |
| `css-native` | `athevon/genjutsu` | Animación y efectos solo con CSS (lo más liviano primero). |
| `design-audit` | `athevon/genjutsu` | Auditar un diseño ya hecho y detectar debilidades. |
| `ui-ux-pro-max` | `athevon/genjutsu` | Base de datos de 84 estilos, 192 paletas, 74 pares de fuentes, guías UX. |
| `modern-web-design` | `freshtechbro/claudedesignskills` | Patrones de diseño web contemporáneo. |

`skills-lock.json` (en la raíz) registra versiones para reinstalar con
`npx skills install`. Actualizar con `npx skills update`.

**Regla de uso:** primero `css-native` / `motion` (ya en el proyecto). GSAP solo
si una animación lo necesita de verdad. Three.js solo para el hero o un momento
puntual — **no** 3D en todo el sitio (peso y batería en el celular).

---

## 15. Conexión con las conversaciones de Claude.ai

Claude Code (esto) y la app de Claude.ai son **entornos separados**: desde acá no
puedo leer tus chats ni tus Proyectos de Claude.ai, y desde allá no se ve este
repo salvo que vos lo conectes. Opciones para tener el mismo contexto en los dos
lados:

1. **Proyecto en Claude.ai (recomendado).** Creá un Proyecto llamado
   "Bagues Grupo Wolf" y subí `PLAN-MAESTRO.md` como conocimiento del proyecto.
   Cada vez que el plan cambie fuerte, volvés a subir el archivo. Así, cuando
   pidas cosas en la app, ya tiene todo el contexto.
2. **Conector de GitHub en Claude.ai.** Si subís este repo a GitHub, podés
   conectar el repo al Proyecto y Claude.ai lee los archivos directamente
   (incluido este plan). Es la opción más automática.
3. **Este repo es la fuente de verdad.** Todo lo importante vive en
   `PLAN-MAESTRO.md` + `docs/`. Los dos "Claudes" leen de lo mismo.
4. **Memoria de Claude Code.** Ya quedó guardada una memoria de proyecto en
   `.claude/projects/.../memory/` — las próximas sesiones de Claude Code en esta
   carpeta arrancan con el contexto del pivote sin que expliques nada.

> No hay (todavía) una forma de que yo "importe" el historial de un chat puntual
> de Claude.ai. Si hay algo decidido en un chat que importa, la vía es: copiar
> esa conclusión a `PLAN-MAESTRO.md` o a un archivo en `docs/`.

---

## 16. Estado actual del documento

| Fase | Estado |
|---|---|
| Plan maestro | ✅ redactado y revisado — 29/08/2026 |
| Fase 0 | ✅ completada — 30/08/2026 (DB nueva verificada, skills, renombrado) |
| Fase 1 | ✅ completada — 30/08/2026 (panel admin: pedidos, catálogo, clientes, ajustes) |
| Fase 2 | ✅ núcleo completado — 31/08/2026 (tienda pública, ver `MASTER.md`) |
| Fase 3 | ⬜ próxima — aviso automático de pedido nuevo |
| Fase 4 | ⬜ |

**Próximo paso:** Fase 3 — Edge Function `notificar-pedido` (Telegram) + Database
Webhook en `orders`, para enterarte de un pedido nuevo sin depender de que el
cliente mande el WhatsApp. O, si preferís, primero `PromosScreen` para poder
editar el hero de la tienda desde el panel.

### Cómo probar la Fase 2 (tienda pública)
1. `npm run dev` → abrí `http://localhost:5173/` (sin login, es la tienda).
2. Vas a ver el hero con el frasco 3D (arrastralo para girarlo), "Los que no
   fallan" y el catálogo completo con los 6 perfumes de ejemplo de la Fase 0.
3. Tocá el `+` de una card → se suma directo al carrito (ícono arriba a la derecha).
4. Tocá el nombre de un perfume → se abre el detalle con pirámide olfativa y tamaños.
5. Abrí el carrito → "Hacer pedido" → cargá nombre y WhatsApp → "Confirmar
   pedido" → se guarda en la base (lo vas a ver en `/panel`) y se abre WhatsApp
   con el resumen.

### Cómo probar la Fase 1
1. `npm run dev` → abre `http://localhost:5173` (redirige a `/panel`).
2. Iniciá sesión con Google usando **sebixtar@gmail.com** (cualquier otro email
   ve "acceso denegado").
3. En **Catálogo** ya hay 6 perfumes de ejemplo: editalos, subí fotos, prendé/apagá.
4. En **Pedidos** tocá **+** para cargar un pedido de prueba y movelo por estados.
