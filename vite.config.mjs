import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  base: '/Galactic-Run/',
  // no custom alias needed – we want the real NPM package
  plugins: []
});
