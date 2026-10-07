/**
 * Renders public/icons/icon.svg to the PNG sizes the PWA manifest needs.
 * Run: npm run icons. Uses the Chromium Playwright already ships with.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const root = resolve(import.meta.dirname, '..');
const svg = readFileSync(resolve(root, 'public/icons/icon.svg'), 'utf8');
const preset = '/opt/pw-browsers/chromium';

const targets: Array<{ file: string; size: number; maskable?: boolean }> = [
  { file: 'pwa-192.png', size: 192 },
  { file: 'pwa-512.png', size: 512 },
  { file: 'maskable-512.png', size: 512, maskable: true },
  { file: 'apple-touch-icon.png', size: 180 },
];

const browser = await chromium.launch(existsSync(preset) ? { executablePath: preset } : {});
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (const t of targets) {
  // Maskable icons need the artwork inside the safe zone (80%) on a solid background.
  const inner = t.maskable ? Math.round(t.size * 0.8) : t.size;
  const pad = Math.round((t.size - inner) / 2);
  await page.setViewportSize({ width: t.size, height: t.size });
  await page.setContent(
    `<html><body style="margin:0;background:#0b0f1a;width:${t.size}px;height:${t.size}px;overflow:hidden">
       <div style="position:absolute;left:${pad}px;top:${pad}px;width:${inner}px;height:${inner}px">${svg.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</div>
     </body></html>`,
  );
  const png = await page.screenshot({ type: 'png', omitBackground: !t.maskable, clip: { x: 0, y: 0, width: t.size, height: t.size } });
  writeFileSync(resolve(root, 'public/icons', t.file), png);
  console.log(`wrote public/icons/${t.file} (${t.size}px${t.maskable ? ', maskable' : ''})`);
}
await browser.close();
