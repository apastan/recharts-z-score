import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const base = mode === 'production' ? '/recharts-z-score' : '/'

  return {
    plugins: [react()],
    base, // Используем динамически заданный base
  }
})
