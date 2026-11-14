import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// La demo se compila a ../public/demo para verla en el servidor local en /demo/.
// No se enlaza desde la landing (robots.txt la excluye de buscadores).
export default defineConfig({
  plugins: [react()],
  base: '/demo/',
  build: { target: 'es2022', outDir: '../public/demo', emptyOutDir: true, modulePreload: { polyfill: false } },
  resolve: { dedupe: ['react', 'react-dom'] },
})
