import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// base: './' ทำให้ใช้งานได้ทั้งบน GitHub Pages (อยู่ใต้ /<ชื่อ repo>/) และโดเมนของตัวเอง
// __BUILD_TIME__ / __BUILD_SHA__ = เวลาที่ build และรหัส commit (แสดงเป็นเวอร์ชันในเมนูอื่น)
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: { target: 'es2020' },
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __BUILD_SHA__: JSON.stringify((process.env.GITHUB_SHA || '').slice(0, 7)),
  },
});
