import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import useSettings from '../../hooks/useSettings';
import { telefonoArgentino } from '../../lib/datosCliente.js';
import { PEDIDO } from '../../config/contenido';
import Toggle from '../ui/Toggle';
import s from './panel.module.css';

export default function AjustesScreen() {
  const { user, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const { settings, loading, updateSettings } = useSettings();

  const [form, setForm] = useState(settings);
  useEffect(() => { setForm(settings); }, [settings]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const guardar = (k) => updateSettings({ [k]: form[k] });
  // Un número mal guardado acá manda todos los pedidos de la web a otro
  // WhatsApp: se guarda solo si es válido, y ya normalizado (549...).
  const [avisoTel, setAvisoTel] = useState(null);
  const guardarWhatsapp = () => {
    const t = telefonoArgentino(form.whatsapp_owner);
    if (!t.ok) { setAvisoTel(PEDIDO.telefonoAvisos[t.motivo]); return; }
    setAvisoTel(null);
    set('whatsapp_owner', t.valor);
    if (t.valor !== settings?.whatsapp_owner) updateSettings({ whatsapp_owner: t.valor });
  };

  if (loading) return <div className={s.loading}>Cargando ajustes…</div>;

  return (
    <div className={`${s.screen} ${s.narrow}`}>
      <h2 className={s.title}>Ajustes</h2>

      <div className={s.card}>
        <div className={s.cardRow}>
          <span className={s.cardMeta}>Sesión</span>
        </div>
        <span className={s.cardName} style={{ fontSize: 14 }}>{user?.email}</span>
      </div>

      <div className={s.card}>
        <div className={s.cardRow}>
          <span className={s.cardName} style={{ fontSize: 14 }}>Tema {theme === 'dark' ? 'oscuro' : 'claro'}</span>
          <Toggle checked={theme === 'dark'} onChange={toggle} label="Cambiar tema" />
        </div>
      </div>

      <div className={s.field}>
        <label className={s.label}>Tu WhatsApp (para los pedidos de la web)</label>
        <input
          className={s.input}
          inputMode="tel"
          value={form.whatsapp_owner || ''}
          onChange={(e) => { set('whatsapp_owner', e.target.value); setAvisoTel(null); }}
          onBlur={guardarWhatsapp}
          placeholder="351 555 1234"
          maxLength={24}
          aria-invalid={avisoTel ? 'true' : undefined}
        />
        <span className={s.cardMeta} style={avisoTel ? { color: 'var(--danger)' } : undefined}>
          {avisoTel || 'Escribilo como quieras (351 555 1234, +54 9 351...): se guarda en el formato de WhatsApp.'}
        </span>
      </div>

      <div className={s.field}>
        <label className={s.label}>Usuario de Instagram</label>
        <input
          className={s.input}
          value={form.instagram_user || ''}
          onChange={(e) => set('instagram_user', e.target.value.replace('@', ''))}
          onBlur={() => guardar('instagram_user')}
          placeholder="baguesgrupowolf"
        />
      </div>

      <div className={s.field}>
        <label className={s.label}>Link al catálogo completo (PDF / Linktree)</label>
        <input
          className={s.input}
          value={form.link_catalogo || ''}
          onChange={(e) => set('link_catalogo', e.target.value)}
          onBlur={() => guardar('link_catalogo')}
          placeholder="https://linktr.ee/CosmeticosBagues"
        />
        <span className={s.cardMeta}>Aparece en el pie de la tienda. Como es un link a Drive/Linktree, si corregís el PDF en Drive no hace falta tocar nada acá.</span>
      </div>

      <div className={s.field}>
        <label className={s.label}>Aclaración del pedido (se muestra en la web)</label>
        <textarea
          className={s.textarea}
          value={form.aclaracion_pedido || ''}
          onChange={(e) => set('aclaracion_pedido', e.target.value)}
          onBlur={() => guardar('aclaracion_pedido')}
        />
      </div>

      <div className={s.field}>
        <label className={s.label}>Mensaje de confirmación del checkout</label>
        <textarea
          className={s.textarea}
          value={form.mensaje_checkout || ''}
          onChange={(e) => set('mensaje_checkout', e.target.value)}
          onBlur={() => guardar('mensaje_checkout')}
        />
      </div>

      <a className={`${s.btn} ${s.btnGhost} ${s.btnWide}`} href="/" style={{ textDecoration: 'none' }}>
        Ver la tienda pública
      </a>

      <button className={`${s.btn} ${s.btnDanger} ${s.btnWide}`} onClick={signOut}>
        Cerrar sesión
      </button>
    </div>
  );
}
