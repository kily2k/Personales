import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    define: {
      // Prioritize process.env.API_KEY (Vercel System Env) then env.API_KEY (.env file)
      // DO NOT hardcode the key here, or Google will revoke it immediately upon commit.
      'process.env.API_KEY': JSON.stringify(process.env.API_KEY || env.API_KEY || "")
    },
    build: {
      outDir: 'dist',
    }
  };
});