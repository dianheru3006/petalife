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

      // R4-PERF-06: pasangan fallback (mis. room-bg.jpg 197 KB untuk WebView
      // kuno) tidak boleh ikut di-precache. Install SW akan mengunduh SEMUA
      // BUILD_ASSETS; menyertakan fallback yang hanya dipakai browser tanpa
      // WebP berarti ~378 KB kuota terbuang di setiap instalasi. Fallback tetap
      // dikirim ke dist dan akan di-cache SW saat benar-benar diminta.
      const stemOf = (file: string) => file.replace(/\.[a-z0-9]+$/i, '').replace(/-[A-Za-z0-9_-]{6,}$/, '');
      const webpStems = new Set(
        assetFiles.filter(file => file.endsWith('.webp')).map(stemOf)
      );
      const precacheFiles = assetFiles.filter(file => {
        const isLegacyRaster = /\.(jpe?g|png)$/i.test(file);
        return !(isLegacyRaster && webpStems.has(stemOf(file)));
      });
      const skippedFallbacks = assetFiles.length - precacheFiles.length;
      assetFiles = precacheFiles;

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
      if (skippedFallbacks > 0) {
        console.log(`[PWA Plugin] Skipped ${skippedFallbacks} legacy raster fallback(s) from precache (WebP sibling exists).`);
      }
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

