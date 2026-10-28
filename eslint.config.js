// Revisor de codigo (ESLint). Corre con `npm run lint` y en las pruebas de
// GitHub en cada cambio. Busca errores comunes antes de que lleguen a la
// tienda: variables que no existen o no se usan, efectos de React con
// dependencias mal puestas, hooks llamados dentro de un if.
//
// Reglas en "error" frenan la prueba; las de "warn" avisan sin frenar (son
// para ir limpiando de a poco).
import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  { ignores: ['dist/**', 'dist-ssr/**', 'node_modules/**', 'public/**', '.claude/**', '.agents/**'] },
  js.configs.recommended,
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.browser, __VERSION__: 'readonly' },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: '18.3' } },
    plugins: { react, 'react-hooks': reactHooks },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      // Sin PropTypes: el proyecto no los usa (los datos vienen de la base y de lib/).
      'react/prop-types': 'off',
      // Los textos en castellano llevan comillas y apostrofes a proposito.
      'react/no-unescaped-entities': 'off',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  {
    // Scripts de Node: el build, las pruebas y los pipelines.
    files: ['scripts/**/*.{js,mjs}', '*.config.js', 'vite.config.js'],
    languageOptions: { ecmaVersion: 2023, sourceType: 'module', globals: { ...globals.node } },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
];
