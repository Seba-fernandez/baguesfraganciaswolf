import { NavLink } from 'react-router-dom';
import { NAV_PANEL } from '../../data/constants';
import { NAV_ICONS, IconLogout, IconStore } from '../ui/Icon';
import { useAuth } from '../../contexts/AuthContext';
import s from './Sidebar.module.css';

// Navegación de escritorio (≥960px, ver BottomNav.module.css). En mobile no
// se monta nada visible — la clase .sidebar tiene display:none por debajo
// de ese ancho, así que este componente no le cuesta nada al layout mobile.
export default function Sidebar() {
  const { user, signOut } = useAuth();

  return (
    <aside className={`${s.sidebar} glass-strong`}>
      <div className={s.brand}>
        <span className={s.mark}>W</span>
        <span className={s.brandText}>Bagues<br />Grupo Wolf</span>
      </div>

      <nav className={s.nav}>
        {NAV_PANEL.map((item) => {
          const Icon = NAV_ICONS[item.id];
          return (
            <NavLink
              key={item.id}
              to={item.path}
              end={item.end}
              className={({ isActive }) => `${s.item} ${isActive ? s.active : ''}`}
            >
              <Icon size={19} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <a className={s.verTienda} href="/" title="Ir a la tienda pública">
        <IconStore size={17} />
        Ver tienda
      </a>

      <div className={s.foot}>
        <span className={s.email} title={user?.email}>{user?.email}</span>
        <button type="button" className={s.logout} onClick={signOut} aria-label="Cerrar sesión">
          <IconLogout size={17} />
        </button>
      </div>
    </aside>
  );
}
