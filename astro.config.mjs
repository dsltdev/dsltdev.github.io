// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://dsltdev.github.io',
  output: 'static',
  build: {
    inlineStylesheets: 'always'
  },
  vite: {
    build: {
      cssMinify: true
    }
  }
});
