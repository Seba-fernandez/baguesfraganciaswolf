import { motion, useReducedMotion } from 'motion/react';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * Configuración de los blobs.
 * Cada blob tiene una posición base y motion la anima con paths random suaves.
 */
const DARK_ORBS = [
  { color: '#6366f1', size: 500, x: '-15%', y: '-12%', delay: 0 },
  { color: '#f43f5e', size: 420, x: '85%',  y: '5%',   delay: 1.5 },
  { color: '#06b6d4', size: 460, x: '35%',  y: '85%',  delay: 3 },
  { color: '#a78bfa', size: 380, x: '50%',  y: '40%',  delay: 4.5, opacity: 0.35 },
];

const LIGHT_BLOBS = [
  { color: '#ffd86b', size: 600, x: '-15%', y: '-15%', delay: 0,   opacity: 0.7 },
  { color: '#ff6b9d', size: 520, x: '85%',  y: '10%',  delay: 1.2, opacity: 0.65 },
  { color: '#ff5e3a', size: 480, x: '20%',  y: '85%',  delay: 2.4, opacity: 0.6 },
  { color: '#ff9a76', size: 420, x: '55%',  y: '40%',  delay: 3.6, opacity: 0.55 },
  { color: '#ffb88c', size: 380, x: '78%',  y: '70%',  delay: 4.8, opacity: 0.5 },
];

function Blob({ color, size, x, y, delay, opacity = 0.55 }) {
  const reduce = useReducedMotion();

  // Si el user pidió menos animación, dejamos el blob estático
  const animate = reduce
    ? {}
    : {
        x: ['0%', '8%', '-6%', '4%', '0%'],
        y: ['0%', '-6%', '5%', '-3%', '0%'],
        scale: [1, 1.07, 0.96, 1.04, 1],
      };

  return (
    <motion.div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: size,
        height: size,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        filter: 'blur(90px)',
        opacity,
        pointerEvents: 'none',
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
  );
}

export default function Background() {
  const { theme } = useTheme();
  const blobs = theme === 'light' ? LIGHT_BLOBS : DARK_ORBS;

  return (
    <div
      className={`bg-scene bg-scene--${theme}`}
      aria-hidden="true"
    >
      {blobs.map((blob, i) => (
        <Blob key={i} {...blob} />
      ))}
      {theme === 'light' && <div className="coral-grain" />}
    </div>
  );
}
