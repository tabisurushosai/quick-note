import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const outDir = 'dist';
const publicDir = resolve(__dirname, 'public');
const requiredExtensionAssets = [
  'manifest.json',
  'icons/icon16.png',
  'icons/icon48.png',
  'icons/icon128.png',
] as const;

function ensureExtensionAssets() {
  return {
    name: 'ensure-extension-assets',
    apply: 'build' as const,
    closeBundle() {
      const missingAssets = requiredExtensionAssets.filter(
        (asset) => !existsSync(resolve(__dirname, outDir, asset)),
      );

      if (missingAssets.length > 0) {
        throw new Error(
          `Missing Chrome extension build assets: ${missingAssets.join(', ')}`,
        );
      }
    },
  };
}

export default defineConfig({
  publicDir,
  copyPublicDir: true,
  plugins: [ensureExtensionAssets()],
  build: {
    outDir,
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup.html'),
      },
      output: {
        entryFileNames: '[name].js',
      },
    },
  },
});
