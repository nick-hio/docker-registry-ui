import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';
export default defineConfig({
  base: './',
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: { groups: [{ name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ }] },
      },
    },
  },
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    host: '127.0.0.1',
    strictPort: true,
    port: Number(process.env.PORT || 5173),
    proxy: process.env.REGISTRY_PROXY_URL
      ? { '/v2': { target: process.env.REGISTRY_PROXY_URL, changeOrigin: true } }
      : undefined,
  },
  test: { globals: true, include: ['test/**/*.test.{js,ts}'] },
});
