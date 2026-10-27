import { defineConfig } from 'vite';

// base './' deixa os caminhos relativos: o build funciona no GitHub Pages
// (gabrielcaue83.github.io/<repo>/) sem precisar saber o nome do repositório.
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
  },
});
