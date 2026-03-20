import { sveltekit } from '@sveltejs/kit/vite';

/** @type {import('vite').UserConfig} */
const config = {
  plugins: [sveltekit()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{js,ts}'],
    coverage: {
      include: ['src/**/*.js'],
      reporter: ['text', 'json-summary', 'json'],
    },
    silent: true,
  },
};

export default config;
