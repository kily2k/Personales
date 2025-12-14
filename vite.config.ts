import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Casting process to any avoids TypeScript errors if @types/node is missing.
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    define: {
      // JSON.stringify needed to insert the string value into the code.
      // We default to '' to ensure 'process.env.API_KEY' is replaced even if the env var is missing,
      // preventing "ReferenceError: process is not defined" in the browser.
      'process.env.API_KEY': JSON.stringify(env.API_KEY || '')
    },
    build: {
      outDir: 'dist',
    }
  };
});