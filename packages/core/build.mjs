import { build, context } from 'esbuild';
import { mkdirSync } from 'node:fs';

const watch = process.argv.includes('--watch');

mkdirSync('dist', { recursive: true });

/** @type {import('esbuild').BuildOptions} */
const options = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  format: 'esm',
  target: ['es2020', 'chrome90', 'firefox90', 'safari14'],
  outfile: 'dist/glass-ticker.js',
  sourcemap: true,
  minify: !watch,
  legalComments: 'none',
  banner: {
    js: '/* Glass Ticker web component - MIT licensed, https://github.com/shounakjoshi88-a11y/glass-ticker */',
  },
};

if (watch) {
  const ctx = await context(options);
  await ctx.watch();
  console.log('watching...');
} else {
  await build(options);
  console.log('built dist/glass-ticker.js');
}
