// Converts the original app's vector drawables to a JSON the React Native app draws with react-native-svg.
// usage: node tools/convert-icons.mjs <decoded-apk>/res/drawable <IconSelectorActivity.java> <out.json>
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [dir, selector, out] = process.argv.slice(2);
const attr = (src, name) => new RegExp(`android:${name}="([^"]*)"`).exec(src)?.[1];
const num = (s) => parseFloat(s);

const icons = {};
for (const file of readdirSync(dir).filter((f) => /^_?ic_.*\.xml$/.test(f))) {
  const xml = readFileSync(join(dir, file), 'utf8');
  const vector = /<vector[^>]*>/.exec(xml)?.[0];
  if (!vector) continue;
  const paths = [...xml.matchAll(/<path\b[^>]*\/?>/g)].map((m) => {
    const p = { d: attr(m[0], 'pathData') };
    const alpha = attr(m[0], 'fillAlpha');
    if (alpha) p.o = num(alpha);
    return p;
  });
  icons[file.replace(/\.xml$/, '')] = { w: num(attr(vector, 'viewportWidth')), h: num(attr(vector, 'viewportHeight')), p: paths };
}

const order = [...readFileSync(selector, 'utf8').matchAll(/R\.drawable\.(ic_[a-z0-9_]+)/g)].map((m) => m[1]);
const missing = order.filter((n) => !icons[n]);
if (missing.length) console.warn('missing icons:', missing.join(', '));
writeFileSync(out, JSON.stringify({ order, icons }));
console.log(`${Object.keys(icons).length} icons, ${order.length} in selector order -> ${out}`);
