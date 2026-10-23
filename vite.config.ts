import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      manifest: false,
      registerType: 'autoUpdate',
      injectRegister: false,
      
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      
      injectManifest: {
        globPatterns: ['**/*.{html,js,css,png,json}'],
        globIgnores: ['modelos/**'],
      },
    }),
  ],
  optimizeDeps: {
    exclude: ['virtual:pwa-register']
  }
});