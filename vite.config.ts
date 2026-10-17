import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // o MapLibre carrega o próprio worker via import.meta.url; o pré-bundle quebra esse caminho
  optimizeDeps: { exclude: ['maplibre-gl'] },
})
