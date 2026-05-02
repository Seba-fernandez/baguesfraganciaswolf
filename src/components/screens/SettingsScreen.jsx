import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import s from './SettingsScreen.module.css';

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const { theme, toggle } = useTheme();

  const items = [
    { icon: '👤', label: 'Mi perfil', sub: user?.email || '—' },
    { icon: '🌐', label: 'Zona', sub: 'Córdoba Capital' },
    { icon: '🎨', label: 'Tema', sub: theme === 'dark' ? 'Oscuro' : 'Claro', onClick: toggle },
    { icon: '📤', label: 'Exportar contactos', sub: 'Próximamente', disabled: true },
    { icon: '🔔', label: 'Notificaciones', sub: 'Próximamente', disabled: true },
  ];

  return (
    <div className={s.screen}>
      <h2 className={s.title}>Configuración</h2>

      <div className={s.list}>
        {items.map(item => (
          <button
            key={item.label}
            className={`${s.item} glass ${item.disabled ? s.disabled : ''}`}
            onClick={item.onClick}
            disabled={item.disabled}
          >
            <span className={s.itemIcon}>{item.icon}</span>
            <div className={s.itemText}>
              <div className={s.itemLabel}>{item.label}</div>
              <div className={s.itemSub}>{item.sub}</div>
            </div>
          </button>
        ))}
      </div>

      <button className={s.logout} onClick={signOut}>Cerrar sesión</button>
    </div>
  );
}
