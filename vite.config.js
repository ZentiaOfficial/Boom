import { defineConfig } from 'vite';
const headers={
  'X-Content-Type-Options':'nosniff',
  'Referrer-Policy':'strict-origin-when-cross-origin',
  'X-Frame-Options':'DENY',
  'Permissions-Policy':'camera=(), microphone=(), geolocation=()',
};
export default defineConfig({
  build:{assetsInlineLimit:0},
  server:{host:'127.0.0.1',port:4173,strictPort:true,headers},
  preview:{host:'127.0.0.1',port:4173,strictPort:true,headers:{...headers,'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"}},
});
