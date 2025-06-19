import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  base: '/Galactic-Run/',
  resolve: {
    alias: {
      // Always deliver the same module object for every `import 'yuka'`
      yuka: path.resolve(__dirname, 'src/alias/yuka.js')
    }
  },
  plugins: []
});
