import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * Frasco decorativo genérico (no representa un producto real — los productos
 * reales usan foto). Es el "momento 3D" de marca: hero de la tienda.
 * Rotación idle + arrastre + un poco de scroll. Se apaga con reduced-motion.
 */
export default function Bottle3D({ color = 0x9c2540, className }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(0, 0.1, 6.2);

    const group = new THREE.Group();
    group.scale.setScalar(0.92);
    group.position.y = -0.05;
    group.rotation.x = -0.05;
    scene.add(group);

    const prof = [[0, -1.5], [0.6, -1.5], [0.64, -1.42], [0.64, 0.5], [0.5, 0.66], [0.24, 0.78], [0.22, 0.82], [0.22, 1.02], [0.3, 1.05], [0.3, 1.42], [0, 1.42]];
    const pts = prof.map(([x, y]) => new THREE.Vector2(x * 1.2, y * 1.2));
    const mesh = new THREE.Mesh(
      new THREE.LatheGeometry(pts, 96),
      new THREE.MeshStandardMaterial({ color, metalness: 0.18, roughness: 0.16 })
    );
    group.add(mesh);

    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, 0.5, 44),
      new THREE.MeshStandardMaterial({ color: 0x161613, metalness: 0.6, roughness: 0.3 })
    );
    cap.position.y = 1.78;
    group.add(cap);

    scene.add(new THREE.AmbientLight(0x3a2e28, 0.85));
    const key = new THREE.DirectionalLight(0xf4ece0, 2.4); key.position.set(-3, 4, 5); scene.add(key);
    const rim = new THREE.PointLight(0x2a6a58, 42, 30); rim.position.set(4, -1, 2); scene.add(rim); // pino: contraste frío
    const fill = new THREE.PointLight(0xefdcb4, 20, 30); fill.position.set(-4, -2, 3); scene.add(fill); // crema: brillo cálido
    const top = new THREE.PointLight(0xf4ece0, 16, 20); top.position.set(0, 5, 3); scene.add(top);

    function resize() {
      const r = canvas.getBoundingClientRect();
      const w = Math.max(1, r.width), h = Math.max(1, r.height);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    let drag = false, px = 0, raf = null;
    const onDown = (e) => { drag = true; px = e.clientX; };
    const onUp = () => { drag = false; };
    const onMove = (e) => {
      if (!drag) return;
      group.rotation.y += (e.clientX - px) * 0.012;
      px = e.clientX;
    };
    canvas.addEventListener('pointerdown', onDown);
    addEventListener('pointerup', onUp);
    addEventListener('pointermove', onMove);

    let scrollRot = 0, applied = 0;
    const onScroll = () => { scrollRot = scrollY * 0.0012; };
    addEventListener('scroll', onScroll, { passive: true });

    if (reduce) {
      renderer.render(scene, camera);
    } else {
      const tick = () => {
        if (!drag) group.rotation.y += 0.0028;
        group.rotation.y += scrollRot - applied;
        applied = scrollRot;
        renderer.render(scene, camera);
        raf = requestAnimationFrame(tick);
      };
      tick();
    }

    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      removeEventListener('pointerup', onUp);
      removeEventListener('pointermove', onMove);
      removeEventListener('scroll', onScroll);
      mesh.geometry.dispose();
      mesh.material.dispose();
      cap.geometry.dispose();
      cap.material.dispose();
      renderer.dispose();
    };
  }, [color]);

  return <canvas ref={canvasRef} className={className} style={{ display: 'block', width: '100%', height: '100%', cursor: 'grab' }} />;
}
