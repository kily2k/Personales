import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // Clave proporcionada por el usuario
  const HARDCODED_KEY = "AIzaSyBzXjMJB5nomfKp3NsBBpWXB4ARD_5sIw4";

  return {
    plugins: [react()],
    define: {
      // Prioritize process.env.API_KEY (Vercel System Env) then env.API_KEY (.env file), then use the hardcoded key.
      // This ensures the app works even if env vars are missing.
      'process.env.API_KEY': JSON.stringify(process.env.API_KEY || env.API_KEY || HARDCODED_KEY)
    },
    build: {
      outDir: 'dist',
    }
  };
});