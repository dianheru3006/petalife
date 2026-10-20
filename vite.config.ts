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
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        // R2-PERF-01: pisahkan vendor agar entry chunk hanya berisi kode layar pertama.
        // Catatan: Vite 8 memakai Rolldown, yang HANYA menerima bentuk fungsi
        // (objek manualChunks ditolak: "Expected Function but received Object").
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('react-dom') || id.includes('scheduler')) return 'react';
          if (id.includes('/react/')) return 'react';
          if (id.includes('dexie')) return 'db';
          if (id.includes('lucide-react')) return 'icons';
          return undefined;
        },
      },
    },
  },
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

