import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Add the server configuration here
  server: {
    // 'msedge' tells Vite to use the Microsoft Edge browser
    open: 'msedge' 
  }
});