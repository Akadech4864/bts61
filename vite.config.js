import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// base: './' ทำให้ใช้งานได้ทั้งบน GitHub Pages (อยู่ใต้ /<ชื่อ repo>/) และโดเมนของตัวเอง
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: { target: 'es2020' },
});
