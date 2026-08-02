import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Necesario para probar el GPS desde el celular entrando por IP: la
    // geolocalización exige contexto seguro. En localhost no hace falta,
    // porque el navegador ya lo trata como seguro; si en algún momento
    // molesta para depurar, se puede comentar esta línea temporalmente.
    basicSsl()
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  }
})