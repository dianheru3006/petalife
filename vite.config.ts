import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'

function injectServiceWorkerAssetsPlugin(): Plugin {
  return {
    name: 'inject-sw-assets',
    apply: 'build',
    closeBundle() {
      const distDir = path.resolve(import.meta.dirname, 'dist');
      const assetsDir = path.join(distDir, 'assets');
      const swFile = path.join(distDir, 'sw.js');

      if (!fs.existsSync(swFile)) return;

      let assetFiles: string[] = [];
      if (fs.existsSync(assetsDir)) {
        assetFiles = fs.readdirSync(assetsDir).map(file => `./assets/${file}`);
      }

      let swContent = fs.readFileSync(swFile, 'utf-8');
      const buildId = Date.now().toString(36);
      const assetsJson = JSON.stringify(assetFiles);
      swContent = swContent.replace(
        'const BUILD_ASSETS = [];',
        `const BUILD_ASSETS = ${assetsJson};`
      ).replace(
        "const BUILD_ID = '__BUILD_ID__';",
        `const BUILD_ID = '${buildId}';`
      );
      fs.writeFileSync(swFile, swContent, 'utf-8');
      console.log(`[PWA Plugin] Injected ${assetFiles.length} hashed build assets & build ID (${buildId}) into dist/sw.js for offline precache.`);
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  base: './',
  server: {
    host: true,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  plugins: [
    tailwindcss(),
    react(),
    injectServiceWorkerAssetsPlugin(),
  ],
})

