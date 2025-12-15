import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    wasm(),
    topLevelAwait()
  ],
  server: {
    port: 3000,
    open: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    },
    fs: {
      // 允许访问 node_modules 中的文件
      allow: ['..']
    }
  },
  resolve: {
    alias: {
      '@mediapipe/tasks-vision': resolve(__dirname, 'node_modules/@mediapipe/tasks-vision')
    }
  },
  build: {
    target: 'esnext',
    sourcemap: false, // 禁用 source map 以避免警告
    rollupOptions: {
      output: {
        manualChunks: {
          'three': ['three'],
          'mediapipe': ['@mediapipe/tasks-vision']
        }
      },
      onwarn(warning, warn) {
        // 忽略 source map 相关的警告
        if (warning.code === 'SOURCEMAP_ERROR' || warning.message?.includes('source map')) {
          return;
        }
        warn(warning);
      }
    }
  },
  optimizeDeps: {
    exclude: ['@mediapipe/tasks-vision']
  },
  assetsInclude: ['**/*.wasm'],
  publicDir: false
});

