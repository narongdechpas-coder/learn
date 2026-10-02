// สร้างไฟล์ HTML เดียวที่รันได้ในเบราว์เซอร์: node demo/build.js [output]
const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');

const root = path.join(__dirname, '..');
const out = path.resolve(process.argv[2] || path.join(root, 'dist', 'demo.html'));

const bundle = esbuild.buildSync({
  entryPoints: [path.join(__dirname, 'browser.js')],
  bundle: true,
  write: false,
  format: 'iife',
  platform: 'browser',
  target: 'es2020',
  minify: true,
  loader: { '.ttf': 'binary' },
  alias: {
    'node:crypto': path.join(__dirname, 'shims/crypto.js'),
    'node:fs': path.join(__dirname, 'shims/empty.js'),
    'node:path': path.join(__dirname, 'shims/empty.js'),
    pdfkit: path.join(root, 'node_modules/pdfkit/js/pdfkit.standalone.js'),
  },
  logLevel: 'warning',
}).outputFiles[0].text;

const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public', 'style.css'), 'utf8');
const pick = (re) => html.match(re)[0];

const page = [
  '<title>เช็คเบี้ยประกันรถยนต์</title>',
  pick(/<link rel="preconnect"[^>]*>/),
  pick(/<link href="https:\/\/fonts\.googleapis\.com[^>]*>/),
  `<style>\n${css}</style>`,
  pick(/<header[\s\S]*<\/main>/).replace('ระบบเดโม', 'ทดลองในเบราว์เซอร์'),
  `<script>${bundle.replace(/<\/script/gi, '<\\/script')}</script>`,
].join('\n');

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, page);
console.log(`เขียนไฟล์ ${out} (${(page.length / 1024).toFixed(0)} KB)`);
