import { NavLink } from 'react-router-dom';
import { NAV_PANEL } from '../../data/constants';
import { NAV_ICONS } from '../ui/Icon';
import st from './BottomNav.module.css';

export default function BottomNav() {
  return (
    <nav className={`${st.nav} glass-strong`}>
      {NAV_PANEL.map((item) => {
        const Icon = NAV_ICONS[item.id];
        return (
          <NavLink
            key={item.id}
            to={item.path}
            end={item.end}
            className={({ isActive }) => `${st.item} ${isActive ? st.active : ''}`}
          >
            <span className={st.icon}><Icon size={22} /></span>
            <span className={st.label}>{item.label}</span>
            <span className={st.dot} aria-hidden="true" />
          </NavLink>
        );
      })}
    </nav>
  );
}
