import { pesos } from '../../../lib/format';
import { decisionInicial, GENEROS } from '../../../lib/ciclo/panel.js';
import s from '../panel.module.css';
import c from './Ciclo.module.css';

const LINEA = { unlock: 'Unlock', bagues: 'Bagués' };
const tamano = (x) => `${LINEA[x.linea]} ${x.ml ? `${x.ml} ml` : ''}`.trim();
const precio = (p) => (p == null ? 'sin lista' : pesos(p));

function Grupo({ titulo, cuenta, abierto = false, children }) {
  if (!cuenta) return null;
  return (
    <details className={c.grupo} open={abierto}>
      <summary>{titulo}<span className={c.grupoCuenta}>{cuenta}</span></summary>
      <ul className={c.filas}>{children}</ul>
    </details>
  );
}

function Fila({ nombre, dato, valor }) {
  return (
    <li className={c.fila}>
      <span className={c.filaNombre}>{nombre}</span>
      <span className={c.filaDato}>{dato}</span>
      {valor != null && <span className={c.filaValor}>{valor}</span>}
    </li>
  );
}

function CodigoNuevo({ nuevo, decision, cambiar, productos, falta }) {
  const p = nuevo.leido || {};
  const d = decision || decisionInicial(nuevo);
  const set = (patch) => cambiar({ ...d, ...patch });
  const id = `nuevo-${nuevo.codigo}`;
  const titulo = nuevo.linea === 'bagues'
    ? `Caja ${p.caja || 'sin nombre'}${p.type ? `, tipo ${p.type}` : ''}`
    : `Unlock ${p.ml ? `${p.ml} ml` : ''}${p.titulo ? `, “${p.titulo}”` : ''}`;
  return (
    <li className={c.nuevo} aria-labelledby={id}>
      <div>
        <span id={id} className={c.filaNombre}>{titulo}</span>
        <div className={c.filaDato}>
          <span className={c.mono}>{nuevo.codigo}</span> · {pesos(p.precio)}{p.precio_anterior ? ` (lista ${pesos(p.precio_anterior)})` : ''} · página {p.pagina}
        </div>
        {nuevo.linea === 'unlock' && (
          <div className={c.filaDato}>Unlock tapa letras con estrellas: el nombre puede venir cambiado.{p.pagina ? ` Fijate la foto en la página ${p.pagina}.` : ''}</div>
        )}
        {nuevo.linea === 'unlock' && (nuevo.sugeridos || []).length > 0 && (
          <div className={c.filaDato}>
            Se parece a:{' '}
            {nuevo.sugeridos.map((x) => (
              <button key={x.id} type="button" className={`${c.modo} ${d.modo === 'sumar' && d.id === x.id ? c.modoOn : ''}`}
                aria-pressed={d.modo === 'sumar' && d.id === x.id}
                onClick={() => cambiar({ ...d, modo: 'sumar', id: x.id })}>
                {x.nombre} · sumar
              </button>
            ))}
          </div>
        )}
      </div>
      <div className={c.modos} role="group" aria-label={`Qué hacer con ${nuevo.codigo}`}>
        {[['sumar', 'Sumar a un perfume'], ['nuevo', 'Perfume nuevo'], ['omitir', 'Dejar afuera']].map(([modo, texto]) => (
          <button key={modo} type="button" aria-pressed={d.modo === modo}
            className={`${c.modo} ${d.modo === modo ? c.modoOn : ''}`}
            onClick={() => set({ modo, id: modo === 'sumar' ? d.id || nuevo.sumarA?.id || '' : d.id })}>
            {texto}
          </button>
        ))}
      </div>
      {d.modo === 'sumar' && (
        <div className={c.campos}>
          <label className={c.ancho}>
            Perfume
            <select className={s.input} value={d.id || ''} onChange={(e) => set({ id: e.target.value })}>
              <option value="">Elegí…</option>
              {productos.map((x) => <option key={x.id} value={x.id}>{x.nombre}{x.activo ? '' : ' (pausado)'}</option>)}
            </select>
          </label>
        </div>
      )}
      {d.modo === 'nuevo' && (
        <div className={c.campos}>
          <label>Nombre oficial<input className={s.input} value={d.nombre || ''} maxLength={80} onChange={(e) => set({ nombre: e.target.value })} placeholder="Ej: Sauvage" /></label>
          <label>
            Para
            <select className={s.input} value={d.genero || 'unisex'} onChange={(e) => set({ genero: e.target.value })}>
              {GENEROS.map((g) => <option key={g} value={g}>{g === 'femenino' ? 'Ella' : g === 'masculino' ? 'Él' : 'Unisex'}</option>)}
            </select>
          </label>
          <label className={c.ancho}>Familia olfativa<input className={s.input} value={d.familia_olfativa || ''} onChange={(e) => set({ familia_olfativa: e.target.value })} /></label>
          <label>Salida<input className={s.input} value={d.nota_salida || ''} onChange={(e) => set({ nota_salida: e.target.value })} /></label>
          <label>Corazón<input className={s.input} value={d.nota_corazon || ''} onChange={(e) => set({ nota_corazon: e.target.value })} /></label>
          <label className={c.ancho}>Fondo<input className={s.input} value={d.nota_fondo || ''} onChange={(e) => set({ nota_fondo: e.target.value })} /></label>
        </div>
      )}
      {falta && <span className={c.sospechoso}>Falta: {falta.motivo}</span>}
    </li>
  );
}

export default function Propuesta({ propuesta, productos, decisiones, setDecisiones, faltan, children }) {
  const { grupos, resumen, alertas } = propuesta;
  const ordenados = [...productos].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  const faltaDe = new Map(faltan.map((f) => [f.codigo, f]));
  const haySospechosos = grupos.precios.some((p) => p.sospechoso);

  return (
    <section className={c.paso} aria-labelledby="paso-revisar">
      <h3 id="paso-revisar" className={c.pasoTitulo}>2. Revisá los cambios</h3>
      <div className={c.resumen}>
        <div className={c.cifra}><b>{resumen.precios}</b><span>precios cambian</span></div>
        <div className={c.cifra}><b>{resumen.desactivar}</b><span>tamaños salen</span></div>
        <div className={c.cifra}><b>{resumen.reactivar}</b><span>tamaños vuelven</span></div>
        <div className={c.cifra}><b>{resumen.nuevos}</b><span>códigos nuevos</span></div>
      </div>

      {alertas.length > 0 && (
        <details className={c.grupo} open={haySospechosos || faltan.length > 0}>
          <summary>Para mirar<span className={c.grupoCuenta}>{alertas.length}</span></summary>
          <ul className={c.filas}>{alertas.map((a) => <li key={a} className={c.fila}><span className={c.filaNombre}>{a}</span></li>)}</ul>
        </details>
      )}

      <Grupo titulo="Precios de lista para confirmar" cuenta={grupos.revisar.length} abierto>
        {grupos.revisar.map((x) => (
          <Fila key={x.codigo} nombre={x.nombre} dato={<>{x.ml ? `${x.ml} ml · ` : ''}<span className={c.mono}>{x.codigo}</span> · {x.motivo}</>}
            valor={<span className={c.sospechoso}>lista {precio(x.lista)}</span>} />
        ))}
      </Grupo>
      <Grupo titulo="Precios que cambian" cuenta={grupos.precios.length} abierto={haySospechosos}>
        {grupos.precios.map((x) => (
          <Fila key={x.codigo} nombre={x.nombre} dato={<>{tamano(x)} · <span className={c.mono}>{x.codigo}</span></>}
            valor={<span className={x.sospechoso ? c.sospechoso : ''}><s>{pesos(x.antes.precio)}</s>{pesos(x.despues.precio)}<br /><small>lista {precio(x.despues.precio_anterior)}</small></span>} />
        ))}
      </Grupo>
      <Grupo titulo="Salen del ciclo (se desactivan)" cuenta={grupos.desactivar.length}>
        {grupos.desactivar.map((x) => (
          <Fila key={x.codigo} nombre={x.nombre} dato={<>{tamano(x)}{x.caja ? `, caja ${x.caja}` : ''} · <span className={c.mono}>{x.codigo}</span></>} />
        ))}
      </Grupo>
      <Grupo titulo="Vuelven al ciclo" cuenta={grupos.reactivar.length}>
        {grupos.reactivar.map((x) => (
          <Fila key={x.codigo} nombre={x.nombre} dato={<>{tamano(x)} · <span className={c.mono}>{x.codigo}</span></>} valor={pesos(x.precio)} />
        ))}
      </Grupo>
      {grupos.nuevos.length > 0 && (
        <details className={c.grupo} open>
          <summary>Códigos nuevos<span className={c.grupoCuenta}>{grupos.nuevos.length}</span></summary>
          <ul className={c.filas}>
            {grupos.nuevos.map((n) => (
              <CodigoNuevo key={n.codigo} nuevo={n} productos={ordenados} decision={decisiones[n.codigo]} falta={faltaDe.get(n.codigo)}
                cambiar={(d) => setDecisiones((prev) => ({ ...prev, [n.codigo]: d }))} />
            ))}
          </ul>
        </details>
      )}
      <Grupo titulo="Cajas con otro nombre" cuenta={grupos.cajas.length}>
        {grupos.cajas.map((x) => (
          <Fila key={x.codigo} nombre={x.nombre} dato={<span className={c.mono}>{x.codigo}</span>} valor={<><s>{x.antes || 'sin nombre'}</s>{x.despues}</>} />
        ))}
      </Grupo>
      <Grupo titulo="El Type no coincide (revisalo a mano)" cuenta={grupos.types.length} abierto>
        {grupos.types.map((x) => (
          <Fila key={x.codigo} nombre={x.nombre} dato={<>En la tienda: {x.inspirado} · <span className={c.mono}>{x.codigo}</span></>} valor={`Type ${x.despues}`} />
        ))}
      </Grupo>
      <Grupo titulo="Leídos que no se usan" cuenta={grupos.descartados.length}>
        {grupos.descartados.map((x) => (
          <Fila key={`${x.linea}-${x.codigo}`} nombre={`${LINEA[x.linea]} ${x.codigo}${x.titulo ? ` (${x.titulo})` : ''}`} dato={`${x.motivo}${x.pagina ? `, página ${x.pagina}` : ''}`} />
        ))}
      </Grupo>

      {children}
    </section>
  );
}
