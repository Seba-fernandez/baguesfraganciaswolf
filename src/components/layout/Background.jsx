import { motion, useReducedMotion } from 'motion/react';
import { useTheme } from '../../contexts/ThemeContext';

const DARK_ORBS = [
  { color: '#6366f1', size: 500, x: '-15%', y: '-12%', delay: 0,   opacity: 0.55 },
  { color: '#f43f5e', size: 420, x: '85%',  y: '5%',   delay: 1.5, opacity: 0.55 },
  { color: '#06b6d4', size: 460, x: '35%',  y: '85%',  delay: 3,   opacity: 0.55 },
  { color: '#a78bfa', size: 380, x: '50%',  y: '40%',  delay: 4.5, opacity: 0.35 },
];

const LIGHT_BLOBS = [
  { color: '#ffd86b', size: 600, x: '-15%', y: '-15%', delay: 0,   opacity: 0.7 },
  { color: '#ff6b9d', size: 520, x: '85%',  y: '10%',  delay: 1.2, opacity: 0.65 },
  { color: '#ff5e3a', size: 480, x: '20%',  y: '85%',  delay: 2.4, opacity: 0.6 },
  { color: '#ff9a76', size: 420, x: '55%',  y: '40%',  delay: 3.6, opacity: 0.55 },
  { color: '#ffb88c', size: 380, x: '78%',  y: '70%',  delay: 4.8, opacity: 0.5 },
];

/**
 * Blob: dos capas
 * - Wrapper externo: tiene el blur estático, no se mueve. Chrome lo
 *   renderiza una vez en alta resolución y lo cachea.
 * - Hijo motion: solo cambia transform/scale. No tiene blur, solo el color.
 *
 * Resultado: blur nítido siempre, animación fluida.
 */
function Blob({ color, size, x, y, delay, opacity }) {
  const reduce = useReducedMotion();

  const animate = reduce
    ? {}
    : {
        x: ['0%', '8%', '-6%', '4%', '0%'],
        y: ['0%', '-6%', '5%', '-3%', '0%'],
        scale: [1, 1.07, 0.96, 1.04, 1],
      };

  return (
    <div
      className="orb-wrap"
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: size,
        height: size,
        opacity,
        // Blur EN EL WRAPPER, no en el hijo animado.
        // Esto es lo que arregla la pixelación en Chrome desktop.
        filter: 'blur(80px)',
        // Forzar GPU layer dedicado para el blur
        transform: 'translateZ(0)',
        willChange: 'opacity',
        pointerEvents: 'none',
        // Aislar pintado para que Chrome no re-pinte el blur en cada frame
        contain: 'layout paint',
      }}
    >
      <motion.div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
          willChange: 'transform',
        }}
        animate={animate}
        transition={{
          duration: 18,
          delay,
          repeat: Infinity,
          ease: 'easeInOut',
          times: [0, 0.25, 0.5, 0.75, 1],
        }}
      />
    </div>
  );
}

export default function Background() {
  const { theme } = useTheme();
  const blobs = theme === 'light' ? LIGHT_BLOBS : DARK_ORBS;

  return (
    <div className={`bg-scene bg-scene--${theme}`} aria-hidden="true">
      {blobs.map((blob, i) => (
        <Blob key={i} {...blob} />
      ))}
      {theme === 'light' && <div className="coral-grain" />}
    </div>
  );
}
