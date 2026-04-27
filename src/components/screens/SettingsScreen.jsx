import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const { theme, toggle } = useTheme();

  const items = [
    { icon: '👤', label: 'Mi perfil', sub: user?.email || '—' },
    { icon: '🌐', label: 'Zona', sub: 'Córdoba Capital' },
    { icon: '🎨', label: 'Tema', sub: theme === 'dark' ? 'Oscuro' : 'Claro', onClick: toggle, action: true },
    { icon: '📤', label: 'Exportar contactos', sub: 'Próximamente', disabled: true },
    { icon: '🔔', label: 'Notificaciones', sub: 'Próximamente', disabled: true },
  ];

  return (
    <div className="settings-screen">
      <h2 className="screen-title">Configuración</h2>

      <div className="settings-list">
        {items.map(item => (
          <button
            key={item.label}
            className={`settings-item glass ${item.disabled ? 'is-disabled' : ''} ${item.action ? 'is-action' : ''}`}
            onClick={item.onClick}
            disabled={item.disabled}
          >
            <span className="settings-item__icon">{item.icon}</span>
            <div className="settings-item__text">
              <div className="settings-item__label">{item.label}</div>
              <div className="settings-item__sub">{item.sub}</div>
            </div>
          </button>
        ))}
      </div>

      <button
        className="settings-logout"
        onClick={signOut}
      >
        Cerrar sesión
      </button>
    </div>
  );
}
