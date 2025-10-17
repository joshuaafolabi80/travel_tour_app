//import { defineConfig } from 'vite';
//import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
//export default defineConfig({
//  plugins: [react()],
  // Add the server configuration here
//  server: {
    // 'msedge' tells Vite to use the Microsoft Edge browser
//    open: 'msedge' 
//  }
//});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    open: 'msedge',
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    hmr: false, // ← COMPLETELY DISABLE HMR
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        ws: true
      }
    }
  }
});