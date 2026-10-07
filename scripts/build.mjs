// Bundles the app into one self-contained HTML file (no server needed).
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const out = await build({
  entryPoints: ['src/main.tsx'],
  bundle: true,
  minify: true,
  write: false,
  format: 'iife',
  target: 'es2020',
  jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"production"' },
  legalComments: 'none',
});
const js = out.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = readFileSync('src/styles.css', 'utf8');

const head = `<title>ABC Motor Insurance Demo</title>
<meta name="description" content="ระบบจำลองการซื้อประกันรถยนต์ ABC: หน้าลูกค้า หลังบ้าน และ Performance Dashboard">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bai+Jamjuree:wght@500;600;700&family=IBM+Plex+Sans+Thai:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap">
<style>${css}</style>`;
const body = `<div id="root"></div>
<script>${js}</script>`;

mkdirSync('dist', { recursive: true });
// Standalone page: open dist/index.html directly in a browser.
writeFileSync('dist/index.html', `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${head}
</head>
<body>
${body}
</body>
</html>
`);
// Fragment for hosts that supply their own document skeleton.
writeFileSync('dist/fragment.html', `${head}\n${body}\n`);
console.log(`built dist/index.html (${(js.length / 1024).toFixed(0)} KB js)`);
