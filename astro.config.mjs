// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://dsltdev.com',
  output: 'static',
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
