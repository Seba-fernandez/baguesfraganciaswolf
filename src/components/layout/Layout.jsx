import Background from './Background';
import BottomNav from './BottomNav';
import TopBar from './TopBar';
import SVGFilters from './SVGFilters';

export default function Layout({ children, title }) {
  return (
    <div className="app-shell">
      {/* Filtros SVG globales (refraccion liquida) */}
      <SVGFilters />

      {/* Fondo animado (orbes en dark, blobs coral en light) */}
      <Background />

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
