
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    exclude: [
      '**/node_modules/**',
      '**/.git/**',
      '**/dist/**',
      'tests/chat-commercial.service.test.js',
      'tests/chat-visitor.service.test.js',
    ],
  },
})
