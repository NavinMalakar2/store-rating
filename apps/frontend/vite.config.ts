/// <reference types="vitest" />
import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // Read the monorepo-root .env so one file configures everything.
  const env = loadEnv(mode, path.resolve(__dirname, '../..'), '');
  return {
    plugins: [react()],
    envDir: path.resolve(__dirname, '../..'),
    resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
    server: {
      port: 5173,
      proxy: { '/api': { target: env.VITE_PROXY_TARGET || 'http://localhost:4000', changeOrigin: false } },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./tests/setup.ts'],
      css: false,
    },
  };
});
