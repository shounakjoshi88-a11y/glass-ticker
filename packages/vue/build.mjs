import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';

mkdirSync('dist', { recursive: true });

await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  format: 'esm',
  target: ['es2020', 'chrome90', 'firefox90', 'safari14'],
  outfile: 'dist/index.js',
  external: ['vue', '@glass-ticker/core'],
  sourcemap: true,
  minify: true,
  legalComments: 'none',
});

console.log('built dist/index.js');
