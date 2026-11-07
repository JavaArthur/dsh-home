import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { launchBrowser, mountHome } from './ui-harness.js';

const folder = resolve('artifacts', process.argv[2] || 'ui-after');
await mkdir(folder, { recursive: true });
const browser = await launchBrowser();
const measurements = [];
try {
  for (const [device, width, height] of [['desktop', 1440, 1000], ['mobile', 390, 844]]) {
    for (const theme of ['light', 'dark']) {
      const app = await mountHome(browser, { width, height, theme });
      const { page } = app;
      try {
        await page.locator('.ch-note-card').first().waitFor({ state: 'attached' });
        await page.screenshot({ path: join(folder, `${device}-${theme}-work.png`) });
        measurements.push({ device, theme, work: await page.evaluate(() => { const home = document.querySelector('.ch-home'); return { taskTop: document.querySelector('[data-card="tasks"]').getBoundingClientRect().top, focusTop: document.querySelector('[data-card="focus"]').getBoundingClientRect().top, horizontalOverflow: home.scrollWidth - home.clientWidth }; }) });
        await page.locator('.ch-view-tabs button').nth(1).click();
        await page.locator('.ch-home').evaluate((home) => { home.scrollTop = 0; });
        await page.screenshot({ path: join(folder, `${device}-${theme}-notes.png`) });
        if (app.errors.length) throw new Error(app.errors.join('\n'));
      } finally { await app.close(); }
    }
  }
  await writeFile(join(folder, 'measurements.json'), JSON.stringify(measurements, null, 2) + '\n');
  console.log(JSON.stringify({ folder, measurements }, null, 2));
} finally { await browser.close(); }
