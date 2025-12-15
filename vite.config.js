import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  // 获取仓库名称，支持 GitHub Actions 和本地开发
  const getBase = () => {
    // 在 GitHub Actions 中，使用环境变量
    if (process.env.GITHUB_REPOSITORY) {
      const repoName = process.env.GITHUB_REPOSITORY.split('/')[1];
      return `/${repoName}/`;
    }
    // 如果设置了 VITE_BASE，使用它
    if (process.env.VITE_BASE) {
      return process.env.VITE_BASE;
    }
    // 默认使用根路径（适用于 username.github.io 类型的仓库）
    return '/';
  };

  return {
  base: getBase(),
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
        format: 'es',
        // 确保模块路径使用相对路径
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        manualChunks: (id) => {
          if (id.includes('node_modules/three')) {
            return 'three';
          }
          if (id.includes('node_modules/@mediapipe')) {
            return 'mediapipe';
          }
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      },
      onwarn(warning, warn) {
        // 忽略 source map 相关的警告
        if (warning.code === 'SOURCEMAP_ERROR' || warning.message?.includes('source map')) {
          return;
        }
        warn(warning);
      }
    },
    // 确保 WASM 文件被正确复制
    copyPublicDir: false,
    assetsDir: 'assets',
    // 确保模块路径正确解析
    commonjsOptions: {
      include: [/node_modules/]
    }
  },
  optimizeDeps: {
    exclude: ['@mediapipe/tasks-vision']
  },
  assetsInclude: ['**/*.wasm'],
  publicDir: false
  };
});

