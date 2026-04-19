export default function AmbientOrbs() {
  return (
    <div style={{
      position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
      overflow: 'hidden',
      background: 'linear-gradient(140deg, #0c1220 0%, #0a0e1a 25%, #150a1e 50%, #0a1a1a 75%, #0f0f1a 100%)',
    }}>
      {/* Azul — arriba derecha */}
      <div style={{
        position: 'absolute', top: '-15%', right: '5%',
        width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(10,132,255,0.25) 0%, rgba(10,132,255,0.08) 40%, transparent 70%)',
        animation: 'orbFloat1 20s ease-in-out infinite',
        filter: 'blur(40px)',
      }} />

      {/* Violeta — abajo izquierda */}
      <div style={{
        position: 'absolute', bottom: '-10%', left: '-5%',
        width: 550, height: 550, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(191,90,242,0.2) 0%, rgba(191,90,242,0.06) 40%, transparent 70%)',
        animation: 'orbFloat2 25s ease-in-out infinite',
        filter: 'blur(40px)',
      }} />

      {/* Verde — centro */}
      <div style={{
        position: 'absolute', top: '35%', left: '40%',
        width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(48,209,88,0.12) 0%, rgba(48,209,88,0.03) 40%, transparent 70%)',
        filter: 'blur(60px)',
      }} />

      {/* Naranja — zona sidebar */}
      <div style={{
        position: 'absolute', top: '20%', left: '-5%',
        width: 400, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,159,10,0.1) 0%, transparent 60%)',
        animation: 'orbFloat1 30s ease-in-out infinite reverse',
        filter: 'blur(50px)',
      }} />

      {/* Cyan — arriba centro */}
      <div style={{
        position: 'absolute', top: '0%', left: '35%',
        width: 450, height: 450, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(100,210,255,0.08) 0%, transparent 60%)',
        animation: 'orbFloat2 18s ease-in-out infinite',
        filter: 'blur(50px)',
      }} />

      {/* Mesh sutil */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'repeating-conic-gradient(rgba(255,255,255,0.005) 0% 25%, transparent 0% 50%) 0 0 / 80px 80px',
      }} />
    </div>
  );
}