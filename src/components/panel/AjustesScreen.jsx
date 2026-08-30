import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import useSettings from '../../hooks/useSettings';
import { normalizarTelefono } from '../../lib/whatsapp';
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

  if (loading) return <div className={s.loading}>Cargando ajustes…</div>;

  return (
    <div className={s.screen}>
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
          onChange={(e) => set('whatsapp_owner', normalizarTelefono(e.target.value))}
          onBlur={() => guardar('whatsapp_owner')}
          placeholder="5493511234567"
        />
        <span className={s.cardMeta}>Código de país + área + número, sin “+” ni espacios.</span>
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

      <button className={`${s.btn} ${s.btnDanger} ${s.btnWide}`} onClick={signOut}>
        Cerrar sesión
      </button>
    </div>
  );
}
