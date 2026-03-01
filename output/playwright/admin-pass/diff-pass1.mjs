import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const dir = '/Users/angel/dev/angel/imperio/VecinoHub/output/playwright/admin-pass/pass1';
const sections = ['overview','users','groups','polls','fundraising','events','posts'];

for (const section of sections) {
  const aPath = path.join(dir, `redesign-${section}.png`);
  const bPath = path.join(dir, `vecino-${section}.png`);
  const a = PNG.sync.read(fs.readFileSync(aPath));
  const b = PNG.sync.read(fs.readFileSync(bPath));
  const width = Math.min(a.width, b.width);
  const height = Math.min(a.height, b.height);

  const aCrop = new PNG({ width, height });
  const bCrop = new PNG({ width, height });
  PNG.bitblt(a, aCrop, 0, 0, width, height, 0, 0);
  PNG.bitblt(b, bCrop, 0, 0, width, height, 0, 0);

  const diff = new PNG({ width, height });
  const mismatched = pixelmatch(aCrop.data, bCrop.data, diff.data, width, height, {
    threshold: 0.1,
  });
  const percent = (mismatched / (width * height)) * 100;
  fs.writeFileSync(path.join(dir, `diff-${section}.png`), PNG.sync.write(diff));

  console.log(`${section}: ${percent.toFixed(2)}% mismatch`);
}
