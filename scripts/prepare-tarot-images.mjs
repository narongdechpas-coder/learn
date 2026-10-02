// Convert the Rider-Waite card images (public domain, 1909) from
// @cometpisces/tarot-kit-images into small WebP files under public/tarot/.
// Run once with `npm run tarot:images`; the output is committed.
import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const src = path.resolve("node_modules/@cometpisces/tarot-kit-images/images");
const out = path.resolve("public/tarot");
await mkdir(out, { recursive: true });

const MAJOR = /^(\d{2})-/;
const MINOR = /^(Wands|Cups|Swords|Pentacles)(\d{2})\.png$/;

/** Map a source filename to our card id: major-00 … major-21, wands-01 … pentacles-14. */
function cardId(file) {
  const major = MAJOR.exec(file);
  if (major) return `major-${major[1]}`;
  const minor = MINOR.exec(file);
  if (minor) return `${minor[1].toLowerCase()}-${minor[2]}`;
  return null;
}

let count = 0;
for (const file of await readdir(src)) {
  const id = cardId(file);
  if (!id) continue;
  await sharp(path.join(src, file)).resize({ width: 300 }).webp({ quality: 75 }).toFile(path.join(out, `${id}.webp`));
  count++;
}
console.log(`wrote ${count} images to ${out}`);
