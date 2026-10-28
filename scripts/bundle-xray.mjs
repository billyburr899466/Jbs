import { build } from 'esbuild';
await build({ entryPoints: ['client/xray-viewer.js'], outfile: 'public/xray-viewer.js', bundle: true, minify: true, format: 'esm', target: ['es2022'], legalComments: 'linked' });
