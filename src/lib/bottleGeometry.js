// Geometría y materiales del frasco decorativo — compartidos entre el
// Bottle3D interactivo del hero y el render estático por acento
// (bottleRender.js). Un solo lugar de verdad: si se ajusta el perfil acá,
// el hero y las miniaturas de producto quedan coherentes solos.

// Perfil de lathe: esbelto, hombro angulado (flacón de eau de parfum en vez
// de "pastilla redonda"), cuello fino.
export const BOTTLE_PROFILE = [
  [0, -1.55], [0.5, -1.55], [0.54, -1.48],
  [0.54, 0.7], [0.5, 0.78],
  [0.2, 0.92], [0.19, 0.98],
  [0.19, 1.2], [0.27, 1.24], [0.27, 1.3],
  [0, 1.34],
];

export const BOTTLE_MATERIAL = { metalness: 0.04, roughness: 0.07 };
export const CAP_MATERIAL = { color: 0x161613, metalness: 0.55, roughness: 0.22 };
export const CAP_RADIUS = 0.37;
export const CAP_HEIGHT = 0.5;
export const CAP_Y = 1.86;

// Mismos hex que --cream/--wine/--pine en tienda.css — los acentos de marca,
// para que el frasco tiña exactamente igual que el resto del sistema.
export const ACCENT_HEX = {
  cream: 0xefdcb4,
  wine: 0x7a1625,
  pine: 0x16382f,
};

/** Agrega el rig de luces de marca (vino/pino/crema) a una escena. */
export function addBrandLights(scene, THREE) {
  scene.add(new THREE.AmbientLight(0x3a2e28, 0.85));
  const key = new THREE.DirectionalLight(0xf4ece0, 2.4); key.position.set(-3, 4, 5); scene.add(key);
  const rim = new THREE.PointLight(0x2a6a58, 42, 30); rim.position.set(4, -1, 2); scene.add(rim); // pino: contraste frío
  const fill = new THREE.PointLight(0xefdcb4, 20, 30); fill.position.set(-4, -2, 3); scene.add(fill); // crema: brillo cálido
  const top = new THREE.PointLight(0xf4ece0, 16, 20); top.position.set(0, 5, 3); scene.add(top);
}
