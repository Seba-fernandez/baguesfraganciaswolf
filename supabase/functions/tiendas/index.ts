// Intermediario con las tiendas de las proveedoras (bagues.com.ar y unlock.com.ar).
//
// Para que sirve: cuando entra un perfume nuevo en el ciclo, el panel busca su
// caja en la tienda de Bagues (foto con fondo transparente y descripcion) para
// armar la foto sobre la pared vino. El navegador no puede leer esas tiendas
// directo (no lo permiten, y la politica de seguridad de la tienda tampoco deja
// cargar fotos de otros sitios): lo hace esta funcion, que vive en Supabase.
//
// Solo la usa la cuenta de la tienda (se valida el token y el email). Solo lee:
// no guarda nada. Solo pide a las dos tiendas y a su CDN de fotos.
//
//   GET ?accion=buscar&linea=bagues&q=Niza   -> [{ titulo, sku, descripcion, imagenes }]
//   GET ?accion=imagen&url=https://cdn.shopify.com/...  -> la imagen
//
// Se despliega con el conector de Supabase (deploy_edge_function, verify_jwt).

const TIENDAS: Record<string, string> = {
  bagues: 'https://bagues.com.ar',
  unlock: 'https://unlock.com.ar',
};
const HOSTS_DE_FOTOS = ['cdn.shopify.com', 'bagues.com.ar', 'unlock.com.ar'];
const ADMIN = 'sebixtar@gmail.com';
const MAX_IMAGEN = 8 * 1024 * 1024;
const UNA_HORA = 60 * 60 * 1000;

const memoria: Record<string, { hora: number; productos: any[] }> = {};

function origenPermitido(origen: string | null) {
  if (!origen) return null;
  if (origen === 'https://baguesfraganciaswolf.vercel.app') return origen;
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origen)) return origen; // vistas previas
  if (/^http:\/\/localhost:\d+$/.test(origen)) return origen;
  return null;
}

function cabeceras(req: Request, extra: Record<string, string> = {}) {
  const origen = origenPermitido(req.headers.get('origin'));
  return {
    ...(origen ? { 'Access-Control-Allow-Origin': origen, Vary: 'Origin' } : {}),
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    ...extra,
  };
}

function emailDelToken(req: Request): string | null {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const partes = token.split('.');
  if (partes.length !== 3) return null;
  try {
    const json = atob(partes[1].replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(partes[1].length / 4) * 4, '='));
    return JSON.parse(json).email ?? null;
  } catch {
    return null;
  }
}

async function productosDe(linea: string) {
  const guardado = memoria[linea];
  if (guardado && Date.now() - guardado.hora < UNA_HORA) return guardado.productos;
  const productos: any[] = [];
  for (let pagina = 1; pagina <= 8; pagina++) {
    const r = await fetch(`${TIENDAS[linea]}/products.json?limit=250&page=${pagina}`, { signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw new Error(`la tienda contesto ${r.status}`);
    const tanda = (await r.json()).products || [];
    if (!tanda.length) break;
    productos.push(...tanda);
  }
  memoria[linea] = { hora: Date.now(), productos };
  return productos;
}

const plano = (t: string) => String(t || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9]+/g, ' ').trim();
const textoPlano = (html: string) => String(html || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

function buscar(productos: any[], q: string) {
  const palabras = plano(q).split(' ').filter(Boolean);
  if (!palabras.length) return [];
  return productos
    .map((p) => {
      const titulo = plano(p.title);
      const todas = palabras.every((w) => titulo.split(' ').includes(w));
      const empieza = titulo.startsWith(palabras.join(' '));
      const perfume = /eau de (parfum|toilette)/.test(titulo) ? 1 : 0;
      return { p, puntos: (todas ? 4 : 0) + (empieza ? 2 : 0) + perfume };
    })
    .filter((x) => x.puntos >= 4)
    .sort((a, b) => b.puntos - a.puntos)
    .slice(0, 5)
    .map(({ p }) => ({
      titulo: p.title,
      sku: p.variants?.[0]?.sku || '',
      descripcion: textoPlano(p.body_html).slice(0, 900),
      imagenes: (p.images || []).slice(0, 4).map((i: any) => i.src),
    }));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cabeceras(req) });
  const json = (cuerpo: unknown, estado = 200) =>
    new Response(JSON.stringify(cuerpo), { status: estado, headers: cabeceras(req, { 'Content-Type': 'application/json' }) });

  if (emailDelToken(req) !== ADMIN) return json({ error: 'Solo la cuenta de la tienda' }, 403);
  const url = new URL(req.url);
  const accion = url.searchParams.get('accion');

  try {
    if (accion === 'buscar') {
      const linea = url.searchParams.get('linea') || '';
      const q = (url.searchParams.get('q') || '').slice(0, 80);
      if (!TIENDAS[linea]) return json({ error: 'linea invalida' }, 400);
      return json({ resultados: buscar(await productosDe(linea), q) });
    }
    if (accion === 'imagen') {
      const destino = new URL(url.searchParams.get('url') || '');
      if (destino.protocol !== 'https:' || !HOSTS_DE_FOTOS.includes(destino.hostname)) return json({ error: 'sitio no permitido' }, 400);
      const r = await fetch(destino, { signal: AbortSignal.timeout(20000) });
      const tipo = r.headers.get('content-type') || '';
      if (!r.ok || !tipo.startsWith('image/')) return json({ error: 'no es una imagen' }, 502);
      const datos = new Uint8Array(await r.arrayBuffer());
      if (datos.byteLength > MAX_IMAGEN) return json({ error: 'imagen demasiado grande' }, 413);
      return new Response(datos, { headers: cabeceras(req, { 'Content-Type': tipo, 'Cache-Control': 'private, max-age=3600' }) });
    }
    return json({ error: 'accion desconocida' }, 400);
  } catch (e) {
    return json({ error: `no se pudo leer la tienda: ${(e as Error).message}` }, 502);
  }
});
