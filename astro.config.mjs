// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  site: 'https://dsltdev.com',
  output: 'static',
  integrations: [react()],
  // URLs del juego y de los simuladores retirados: llevan a la portada.
  redirects: {
    '/juego': '/',
    '/casino': '/',
    '/trading': '/',
    '/terminal': '/',
    '/ondas': '/',
    '/practica-dom': '/',
    '/4d': '/',
    '/desk': '/',
    '/desk/fuentes': '/',
    '/desk/matematicas': '/',
    '/desk/sesiones': '/',
    '/juego-responsable': '/'
  },
  build: {
    inlineStylesheets: 'always'
  },
  vite: {
    build: {
      cssMinify: true
    },
    server: {
      allowedHosts: ['dsltdev.com', 'www.dsltdev.com', '.trycloudflare.com']
    }
  }
});
