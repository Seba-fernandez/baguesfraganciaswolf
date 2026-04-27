import { useEffect, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

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
  const [time, setTime] = useState(() => {
    const n = new Date();
    return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`;
  });

  useEffect(() => {
    const tick = () => {
      const n = new Date();
      setTime(`${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`);
    };
    const iv = setInterval(tick, 10000);
    return () => clearInterval(iv);
  }, []);

  return time;
}

export default function TopBar({ title = 'Vajilla CRM' }) {
  const time = useClock();
  const { theme, toggle } = useTheme();

  return (
    <header className="top-bar glass">
      <div className="top-bar__title">{title}</div>
      <div className="top-bar__clock">{time}</div>
      <button
        className="top-bar__theme-toggle"
        onClick={toggle}
        aria-label={`Cambiar a tema ${theme === 'dark' ? 'claro' : 'oscuro'}`}
      >
        {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
      </button>
    </header>
  );
}
