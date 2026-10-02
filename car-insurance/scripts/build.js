// สร้างหน้าแอป ABI จากซอร์สใน app/
//   node scripts/build.js            → public/ (ให้ Express เสิร์ฟ — ใช้ API จริง)
//   node scripts/build.js --offline  → dist/abi-offline.html ไฟล์เดียว เปิดได้เลยไม่ต้องมีเซิร์ฟเวอร์
const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');

const root = path.join(__dirname, '..');
const app = path.join(root, 'app');
const offline = process.argv.includes('--offline');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

// ลำดับไฟล์สำคัญ: แต่ละไฟล์ประกาศคอมโพเนนต์ไว้บน window ให้ไฟล์ถัดไปใช้
const VENDOR = [
  'node_modules/react/umd/react.production.min.js',
  'node_modules/react-dom/umd/react-dom.production.min.js',
  'app/vendor/lucide.js',
  'app/vendor/aioi-design-system.js',
];
const SOURCES = [
  'ios-frame.jsx', 'data.js', 'api.js', 'ui.jsx', 'home.jsx', 'wallet.jsx', 'detail.jsx',
  'quote.jsx', 'checkout.jsx', 'purchase.jsx', 'phyd.jsx', 'app.jsx',
];
const STYLES = ['fonts', 'tokens-color', 'tokens-type', 'tokens-spacing', 'tokens-radius', 'base', 'page', 'app'];

function bundle(entry, extra = {}) {
  return esbuild.buildSync({
    entryPoints: [entry], bundle: true, write: false, format: 'iife', platform: 'browser',
    target: 'es2020', minify: !process.env.NOMIN, logLevel: 'warning', ...extra,
  }).outputFiles[0].text;
}

// สูตรคำนวณเบี้ยตัวเดียวกับเซิร์ฟเวอร์ → window.Premium (ใช้แสดงราคาประเมินทันที)
const premiumJs = bundle(path.join(root, 'src/premium.js'), { globalName: 'Premium' });

const appJs = SOURCES.map((f) => {
  const code = fs.readFileSync(path.join(app, f), 'utf8');
  const out = esbuild.transformSync(code, { loader: f.endsWith('.jsx') ? 'jsx' : 'js', target: 'es2020', minify: !process.env.NOMIN });
  return `/* ${f} */(function(){${out.code}})();`;
}).join('\n');

const boot = `ReactDOM.createRoot(document.getElementById('app')).render(React.createElement(window.ABIApp));`;
const js = [...VENDOR.map(read), premiumJs, appJs, boot].join('\n;\n');

let css = STYLES.map((n) => read(`app/styles/${n}.css`)).join('\n');

function page({ cssText, scripts, head = '' }) {
  return `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#15357D">
<title>ABI Mobile App — เช็คเบี้ยประกันรถยนต์</title>
${head}<style>${cssText}</style>
</head>
<body>
<div id="app"></div>
${scripts}
</body>
</html>
`;
}

const copyDir = (from, to) => {
  fs.mkdirSync(to, { recursive: true });
  for (const f of fs.readdirSync(from)) fs.copyFileSync(path.join(from, f), path.join(to, f));
};

if (!offline) {
  const out = path.join(root, 'public');
  fs.rmSync(out, { recursive: true, force: true });
  copyDir(path.join(app, 'assets/fonts'), path.join(out, 'assets/fonts'));
  copyDir(path.join(app, 'assets/photos'), path.join(out, 'assets/photos'));
  // ไฟล์รูปอื่นใน app/assets (เช่น aioi-mark.png, family-home.png ถ้ามี)
  for (const f of fs.readdirSync(path.join(app, 'assets'))) {
    if (/\.(png|jpe?g|svg|webp)$/i.test(f)) fs.copyFileSync(path.join(app, 'assets', f), path.join(out, 'assets', f));
  }
  fs.writeFileSync(path.join(out, 'app.js'), js);
  // fonts.css อ้าง ../assets/ จาก app/styles → ในหน้า public อ้าง assets/ ตรง ๆ
  css = css.replaceAll('../assets/', 'assets/');
  fs.writeFileSync(path.join(out, 'index.html'), page({ cssText: css, scripts: '<script src="app.js"></script>' }));
  console.log(`สร้าง public/ แล้ว (app.js ${(js.length / 1024).toFixed(0)} KB)`);
} else {
  // ฝังฟอนต์และรูปเป็น data URI + แบ็กเอนด์จำลองในเบราว์เซอร์
  const dataUri = (file, mime) => `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`;
  css = css.replace(/url\("\.\.\/assets\/fonts\/([^"]+)"\)/g, (_, f) => `url("${dataUri(path.join(app, 'assets/fonts', f), 'font/woff2')}")`);
  const photos = Object.fromEntries(
    ['mine', 'eco', 'sedan', 'suv', 'pickup'].map((k) => [k, dataUri(path.join(app, `assets/photos/car-${k}.jpg`), 'image/jpeg')]),
  );
  // pdfkit สร้าง URL จาก document.baseURI ตอนโหลด ซึ่งพังเมื่อเปิดไฟล์ในหน้าพรีวิว (about:srcdoc / blob:)
  // ค่านี้ใช้เฉพาะ PDF/A ที่เราไม่ได้ใช้ จึงแทนด้วยสตริงคงที่
  const pdfkitSrc = read('node_modules/pdfkit/js/pdfkit.standalone.js');
  const pdfkitPatched = pdfkitSrc.replace(/const ICC_PROFILE_PATH = new URL\([^;]*;/, "const ICC_PROFILE_PATH = './data/sRGB_IEC61966_2_1.icc';");
  if (pdfkitPatched === pdfkitSrc) throw new Error('pdfkit patch ไม่พบบรรทัด ICC_PROFILE_PATH (pdfkit อาจเปลี่ยนเวอร์ชัน)');
  const pdfkitFile = path.join(root, 'node_modules/.cache/pdfkit.standalone.patched.js');
  fs.mkdirSync(path.dirname(pdfkitFile), { recursive: true });
  fs.writeFileSync(pdfkitFile, pdfkitPatched);
  const backend = bundle(path.join(root, 'demo/browser.js'), {
    loader: { '.ttf': 'binary' },
    alias: {
      'node:crypto': path.join(root, 'demo/shims/crypto.js'),
      'node:fs': path.join(root, 'demo/shims/empty.js'),
      'node:path': path.join(root, 'demo/shims/empty.js'),
      pdfkit: pdfkitFile,
    },
  });
  const safe = (s) => s.replace(/<\/script/gi, '<\\/script');
  const scripts = [
    `<script>window.CAR_PHOTOS=${JSON.stringify(photos)};</script>`,
    `<script>${safe(backend)}</script>`,
    `<script>${safe(js)}</script>`,
  ].join('\n');
  const out = path.join(root, 'dist', 'abi-offline.html');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const html = page({ cssText: css, scripts });
  fs.writeFileSync(out, html);
  console.log(`สร้าง ${path.relative(root, out)} แล้ว (${(html.length / 1024 / 1024).toFixed(1)} MB)`);
}
