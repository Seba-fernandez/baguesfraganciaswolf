import { useEffect, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import s from './TopBar.module.css';

const SunIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4"/>
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
  </svg>
);

const MoonIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);

function useClock() {
  const fmt = () => {
    const n = new Date();
    return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`;
  };
  const [time, setTime] = useState(fmt);
  useEffect(() => {
    const iv = setInterval(() => setTime(fmt()), 10000);
    return () => clearInterval(iv);
  }, []);
  return time;
}

export default function TopBar({ title = 'Bagues Grupo Wolf' }) {
  const time = useClock();
  const { theme, toggle } = useTheme();

  return (
    <header className={`${s.bar} glass`}>
      <div className={s.title}>{title}</div>
      <div className={s.clock}>{time}</div>
      <button
        className={s.toggle}
        onClick={toggle}
        aria-label={`Cambiar a tema ${theme === 'dark' ? 'claro' : 'oscuro'}`}
      >
        {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
      </button>
    </header>
  );
}
