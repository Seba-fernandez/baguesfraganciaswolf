import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import useProducts from '../../../hooks/useProducts';
import useSettings from '../../../hooks/useSettings';
import { compararCiclo } from '../../../lib/ciclo/comparar.js';
import { nuevosParaAplicar } from '../../../lib/ciclo/panel.js';
import { leerArchivo, aplicarCiclo } from '../../../lib/ciclo/servidor.js';
import { guardarCache } from '../../../lib/cachePanel';
import Propuesta from './Propuesta';
import FotosFaltantes from './FotosFaltantes';
import s from '../panel.module.css';
import c from './Ciclo.module.css';

const NOMBRE = { unlock: 'Unlock', bagues: 'Bagués' };

function fecha(iso) {
  if (!iso) return '';
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a, m - 1, d).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
}

export default function CicloScreen() {
  const { products, loading, reload } = useProducts();
  const { settings } = useSettings();
  const [archivos, setArchivos] = useState({ unlock: null, bagues: null });
  const [leyendo, setLeyendo] = useState(null); // { nombre, n, total }
  const [error, setError] = useState(null);
  const [decisiones, setDecisiones] = useState({});
  const [forzar, setForzar] = useState(false);
  const [tocarCiclo, setTocarCiclo] = useState(true);
  const [etapa, setEtapa] = useState('revisar'); // revisar | confirmar | aplicando | hecho
  const [resultado, setResultado] = useState(null);

  async function alElegir(e) {
    const lista = [...(e.target.files || [])];
    e.target.value = '';
    setError(null);
    for (const archivo of lista) {
      setLeyendo({ nombre: archivo.name, n: 0, total: 1 });
      try {
        const leido = await leerArchivo(archivo, (n, total) => setLeyendo({ nombre: archivo.name, n, total }));
        setArchivos((a) => ({ ...a, [leido.linea]: leido }));
        setEtapa('revisar');
        setResultado(null);
        setForzar(false);
      } catch (err) {
        setError(`${archivo.name}: ${err.message}`);
      }
    }
    setLeyendo(null);
  }

  const leidos = { unlock: archivos.unlock?.leidos ?? null, bagues: archivos.bagues?.leidos ?? null };
  const hayArchivo = Boolean(archivos.unlock || archivos.bagues);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const propuesta = useMemo(() => (hayArchivo && products.length ? compararCiclo(products, leidos) : null), [products, archivos]);
  const ciclo = archivos.unlock?.ciclo || archivos.bagues?.ciclo || null;
  const cicloNuevo = ciclo && (ciclo.nombre !== settings.ciclo_nombre || (ciclo.hasta && ciclo.hasta !== settings.ciclo_hasta));
  const nuevos = useMemo(() => (propuesta ? nuevosParaAplicar(propuesta.grupos.nuevos, decisiones) : { lista: [], faltan: [] }), [propuesta, decisiones]);

  const bloqueosFirmes = propuesta ? propuesta.bloqueos.filter((b) => !propuesta.forzables.includes(b)) : [];
  const necesitaForzar = propuesta ? propuesta.forzables.length > 0 : false;
  // El Type de cada caja se guarda para comparar el ciclo que viene, pero no
  // cambia nada en la tienda: no se cuenta como cambio.
  const types = propuesta ? propuesta.operaciones.filter((o) => o.tipo === 'type').length : 0;
  const visibles = propuesta ? propuesta.operaciones.length - types + nuevos.lista.length + (cicloNuevo && tocarCiclo ? 1 : 0) : 0;
  const cambios = visibles + types;
  const puedeAplicar = propuesta && !bloqueosFirmes.length && (!necesitaForzar || forzar) && !nuevos.faltan.length && cambios > 0;

  async function aplicar() {
    if (etapa === 'revisar') { setEtapa('confirmar'); return; }
    setEtapa('aplicando');
    setError(null);
    try {
      const r = await aplicarCiclo({
        archivos: Object.values(archivos).filter(Boolean).map((a) => ({ nombre: a.nombre, linea: a.linea, paginas: a.paginas, tamano: a.tamano })),
        lectura: leidos,
        propuesta: { resumen: propuesta.resumen, alertas: propuesta.alertas, bloqueos: propuesta.bloqueos, forzado: forzar },
        operaciones: propuesta.operaciones,
        nuevos: nuevos.lista,
        ciclo: cicloNuevo && tocarCiclo ? ciclo : null,
      });
      if (r?.ciclo) guardarCache('settings', { ...settings, ciclo_nombre: r.ciclo.nombre, ciclo_hasta: r.ciclo.hasta ?? settings.ciclo_hasta });
      setResultado(r);
      setEtapa('hecho');
      setArchivos({ unlock: null, bagues: null });
      setDecisiones({});
      await reload();
    } catch (err) {
      setError(err.message);
      setEtapa('revisar');
    }
  }

  if (loading) return <div className={s.loading}>Cargando catálogo…</div>;

  return (
    <div className={`${s.screen} ${c.pantalla}`}>
      <Link to="/panel/productos" className={c.volver}>← Catálogo</Link>
      <div className={s.head}>
        <h2 className={s.title}>Cargar ciclo nuevo</h2>
        <span className={s.subtitle}>{settings.ciclo_nombre || 'Sin ciclo'}{settings.ciclo_hasta ? ` · hasta el ${fecha(settings.ciclo_hasta)}` : ''}</span>
      </div>

      <section className={c.paso} aria-labelledby="paso-pdf">
        <h3 id="paso-pdf" className={c.pasoTitulo}>1. Subí los PDF del ciclo</h3>
        <p className={c.ayuda}>
          Los dos catálogos del Drive, o uno solo: <b>solo se toca la línea del PDF que subas</b>. Se compara por
          código: los precios que cambiaron se actualizan, lo que no está en el ciclo se desactiva (no se borra) y
          lo nuevo te lo muestro para que decidas. Nada se guarda hasta que confirmes.
        </p>
        <label className={c.subir}>
          <input type="file" accept="application/pdf,.pdf" multiple onChange={alElegir} disabled={Boolean(leyendo) || etapa === 'aplicando'} />
          <strong>{leyendo ? 'Leyendo…' : 'Elegir PDF'}</strong>
          <small>Catálogo de Unlock y catálogo general de Bagués. Se reconoce solo cuál es cuál.</small>
        </label>
        {leyendo && (
          <div aria-live="polite">
            <p className={c.ayuda}>{leyendo.nombre}: página {leyendo.n} de {leyendo.total}</p>
            <div className={c.barra}><span style={{ width: `${Math.round((leyendo.n / Math.max(1, leyendo.total)) * 100)}%` }} /></div>
          </div>
        )}
        {['unlock', 'bagues'].map((linea) => archivos[linea] && (
          <div key={linea} className={c.archivo}>
            <span className={c.archivoNombre}>{NOMBRE[linea]} · {archivos[linea].nombre}</span>
            <span className={c.archivoDato}>
              {archivos[linea].paginas} páginas · {archivos[linea].leidos.length} perfumes leídos
              {archivos[linea].ciclo ? ` · ${archivos[linea].ciclo.nombre}` : ''}
            </span>
            <button type="button" className={c.quitar} onClick={() => setArchivos((a) => ({ ...a, [linea]: null }))}>Quitar</button>
          </div>
        ))}
        {error && <p className={c.bloqueo} role="alert">{error}</p>}
      </section>

      {etapa === 'hecho' && resultado && (
        <section className={c.paso} aria-live="polite">
          <h3 className={c.pasoTitulo}>Listo, el catálogo quedó actualizado</h3>
          <div className={c.resumen}>
            <div className={c.cifra}><b>{resultado.precios}</b><span>precios</span></div>
            <div className={c.cifra}><b>{resultado.desactivados}</b><span>tamaños fuera</span></div>
            <div className={c.cifra}><b>{resultado.activados}</b><span>tamaños que vuelven</span></div>
            <div className={c.cifra}><b>{resultado.nuevos}</b><span>códigos nuevos</span></div>
          </div>
          <p className={c.ayuda}>
            {resultado.aromas_nuevos ? `${resultado.aromas_nuevos} perfumes nuevos. ` : ''}
            {resultado.aromas_apagados ? `${resultado.aromas_apagados} perfumes quedaron pausados (no les queda ningún tamaño). ` : ''}
            {resultado.ciclo ? `La tira de la tienda ahora dice ${resultado.ciclo.nombre}. ` : ''}
            Antes de aplicar se guardó una copia del catálogo entero.
          </p>
          <p className={c.aviso}>
            La tienda ya muestra los precios nuevos. El precio “Desde” del inicio se escribe al publicar: va a
            quedar fijo en la próxima publicación.
          </p>
        </section>
      )}

      {propuesta && etapa !== 'hecho' && (
        <Propuesta
          propuesta={propuesta}
          productos={products}
          decisiones={decisiones}
          setDecisiones={setDecisiones}
          faltan={nuevos.faltan}
        >
          {bloqueosFirmes.map((b) => <p key={b} className={c.bloqueo}>{b}</p>)}
          {necesitaForzar && (
            <div className={c.bloqueo}>
              {propuesta.forzables.map((b) => <p key={b}>{b}</p>)}
              <label className={c.check} style={{ marginTop: 10 }}>
                <input type="checkbox" checked={forzar} onChange={(e) => setForzar(e.target.checked)} />
                Revisé el PDF: es el del ciclo nuevo, está completo y de verdad salen tantos perfumes.
              </label>
            </div>
          )}
          {ciclo && cicloNuevo && (
            <label className={c.check}>
              <input type="checkbox" checked={tocarCiclo} onChange={(e) => setTocarCiclo(e.target.checked)} />
              <span>Cambiar la tira de la tienda a{' '}<b>{ciclo.nombre}{ciclo.hasta ? `, pedidos hasta el ${fecha(ciclo.hasta)}` : ''}</b></span>
            </label>
          )}
          {visibles === 0 && !propuesta.bloqueos.length && (
            <p className={c.bien}>
              El catálogo ya está igual que el PDF: no hay nada que cambiar en la tienda.
              {types > 0 && ` Si aplicás, se guarda el Type de ${types} cajas de Bagués para avisarte si alguna cambia de perfume el próximo ciclo.`}
            </p>
          )}
          <div className={c.acciones}>
            {etapa === 'confirmar' && (
              <button type="button" className={`${s.btn} ${s.btnGhost}`} onClick={() => setEtapa('revisar')}>Volver a revisar</button>
            )}
            <button type="button" className={`${s.btn} ${s.btnPrimary}`} disabled={!puedeAplicar || etapa === 'aplicando'} onClick={aplicar}>
              {etapa === 'aplicando' ? 'Aplicando…' : etapa === 'confirmar' ? (visibles ? `Confirmar ${visibles} ${visibles === 1 ? 'cambio' : 'cambios'}` : 'Confirmar') : 'Aplicar cambios'}
            </button>
          </div>
          {etapa === 'confirmar' && (
            <p className={c.ayuda}>Se guarda una copia del catálogo antes de tocar nada. Si algo no pasa las validaciones de la base, no se aplica ningún cambio.</p>
          )}
        </Propuesta>
      )}

      <FotosFaltantes productos={products} alCambiar={reload} />
    </div>
  );
}
