import { useState } from 'react';
import { GENEROS, MOMENTOS, ML_SUGERIDOS } from '../../data/constants';
import ImageUpload from '../ui/ImageUpload';
import Toggle from '../ui/Toggle';
import s from './panel.module.css';

const vacio = {
  nombre: '', genero: 'unisex', momento: 'todo', familia_olfativa: '',
  descripcion_corta: '', descripcion_larga: '',
  nota_salida: '', nota_corazon: '', nota_fondo: '',
  imagen_url: '', destacado: false, activo: true,
  presentaciones: [{ ml: 50, precio: '', activo: true }],
};

export default function ProductoEditor({ producto, onClose, onCreate, onUpdate, onDelete }) {
  const esNuevo = !producto;
  const [form, setForm] = useState(() =>
    producto
      ? { ...vacio, ...producto, presentaciones: producto.presentaciones?.length ? producto.presentaciones : vacio.presentaciones }
      : vacio
  );
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const setPres = (i, k, v) =>
    setForm((f) => ({
      ...f,
      presentaciones: f.presentaciones.map((p, idx) => (idx === i ? { ...p, [k]: v } : p)),
    }));
  const addPres = () =>
    setForm((f) => ({ ...f, presentaciones: [...f.presentaciones, { ml: '', precio: '', activo: true }] }));
  const delPres = (i) =>
    setForm((f) => ({ ...f, presentaciones: f.presentaciones.filter((_, idx) => idx !== i) }));

  async function guardar() {
    setError(null);
    if (!form.nombre.trim()) { setError('Poné un nombre'); return; }
    setGuardando(true);

    const payload = {
      ...form,
      presentaciones: form.presentaciones
        .filter((p) => p.ml !== '' && p.ml != null)
        .map((p) => ({ ml: Number(p.ml), precio: Number(p.precio) || 0, activo: p.activo !== false })),
    };

    const res = esNuevo ? await onCreate(payload) : await onUpdate(producto.id, payload);
    setGuardando(false);
    if (res?.error) setError(typeof res.error === 'string' ? res.error : 'No se pudo guardar');
    else onClose();
  }

  async function borrar() {
    if (!confirm(`¿Borrar "${form.nombre}"? Los pedidos viejos conservan el nombre igual.`)) return;
    await onDelete(producto.id);
    onClose();
  }

  return (
    <>
      <div className={s.overlay} onClick={onClose} />
      <div className={`${s.sheet} glass-strong`}>
        <span className={s.handle} />
        <h3 className={s.sheetTitle}>{esNuevo ? 'Nuevo perfume' : form.nombre}</h3>

        <div className={s.field}>
          <label className={s.label}>Nombre</label>
          <input className={s.input} value={form.nombre} onChange={(e) => set('nombre', e.target.value)} placeholder="Hawai Masculino" />
        </div>

        <div className={s.field}>
          <label className={s.label}>Foto del frasco</label>
          <ImageUpload value={form.imagen_url} onChange={(url) => set('imagen_url', url)} bucket="productos" />
        </div>

        <div className={s.row2}>
          <div className={s.field}>
            <label className={s.label}>Género</label>
            <select className={s.select} value={form.genero} onChange={(e) => set('genero', e.target.value)}>
              {Object.values(GENEROS).map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
            </select>
          </div>
          <div className={s.field}>
            <label className={s.label}>Momento</label>
            <select className={s.select} value={form.momento} onChange={(e) => set('momento', e.target.value)}>
              {Object.values(MOMENTOS).map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </div>
        </div>

        <div className={s.field}>
          <label className={s.label}>Familia olfativa</label>
          <input className={s.input} value={form.familia_olfativa} onChange={(e) => set('familia_olfativa', e.target.value)} placeholder="amaderado, cítrico, dulce…" />
        </div>

        <div className={s.field}>
          <label className={s.label}>Descripción corta (card)</label>
          <input className={s.input} value={form.descripcion_corta} onChange={(e) => set('descripcion_corta', e.target.value)} maxLength={90} />
        </div>

        <div className={s.field}>
          <label className={s.label}>Descripción larga (detalle)</label>
          <textarea className={s.textarea} value={form.descripcion_larga} onChange={(e) => set('descripcion_larga', e.target.value)} />
        </div>

        <div className={s.field}>
          <label className={s.label}>Pirámide olfativa (opcional)</label>
          <input className={s.input} value={form.nota_salida} onChange={(e) => set('nota_salida', e.target.value)} placeholder="Salida: bergamota, limón" />
          <input className={s.input} value={form.nota_corazon} onChange={(e) => set('nota_corazon', e.target.value)} placeholder="Corazón: jazmín, lavanda" />
          <input className={s.input} value={form.nota_fondo} onChange={(e) => set('nota_fondo', e.target.value)} placeholder="Fondo: almizcle, cedro" />
        </div>

        <div className={s.field}>
          <label className={s.label}>Presentaciones y precios</label>
          {form.presentaciones.map((p, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                className={s.input}
                style={{ width: 84 }}
                inputMode="numeric"
                value={p.ml}
                onChange={(e) => setPres(i, 'ml', e.target.value.replace(/\D/g, ''))}
                placeholder="ml"
                list="ml-sugeridos"
              />
              <input
                className={s.input}
                style={{ flex: 1 }}
                inputMode="numeric"
                value={p.precio}
                onChange={(e) => setPres(i, 'precio', e.target.value.replace(/\D/g, ''))}
                placeholder="precio $"
              />
              <Toggle checked={p.activo !== false} onChange={(v) => setPres(i, 'activo', v)} label="Disponible" />
              <button type="button" className={s.btnGhost} style={{ padding: '8px 10px', borderRadius: 10 }} onClick={() => delPres(i)}>✕</button>
            </div>
          ))}
          <datalist id="ml-sugeridos">{ML_SUGERIDOS.map((ml) => <option key={ml} value={ml} />)}</datalist>
          <button type="button" className={s.btnGhost} style={{ marginTop: 4 }} onClick={addPres}>+ Agregar tamaño</button>
        </div>

        <div className={s.field}>
          <label className={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Destacado en el home
            <Toggle checked={form.destacado} onChange={(v) => set('destacado', v)} label="Destacado" />
          </label>
          <label className={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Activo (visible en el catálogo)
            <Toggle checked={form.activo} onChange={(v) => set('activo', v)} label="Activo" />
          </label>
        </div>

        {error && <p className={s.err}>{error}</p>}

        <div className={s.btnRow}>
          {!esNuevo && <button className={`${s.btn} ${s.btnDanger}`} onClick={borrar}>Borrar</button>}
          <button className={`${s.btn} ${s.btnGhost}`} onClick={onClose}>Cancelar</button>
          <button className={`${s.btn} ${s.btnPrimary}`} onClick={guardar} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </>
  );
}
