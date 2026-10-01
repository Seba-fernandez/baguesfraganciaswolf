import Background from './Background';
import BottomNav from './BottomNav';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function Layout({ children, title }) {
  return (
    <div className="app-shell">
      {/* Fondo quieto: degradé en CSS */}
      <Background />

      {/* Sidebar de escritorio (desde 960px); en el celular la reemplaza BottomNav */}
      <Sidebar />

      <div className="app-content">
        <TopBar title={title} />
        <main className="app-main">
          {children}
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
