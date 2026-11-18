const assert = require('node:assert/strict');
const { chromium } = require('playwright');

async function checkQuotes() {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    args: ['--no-sandbox'],
  });
  try {
    const page = await browser.newPage({ serviceWorkers: 'block', reducedMotion: 'no-preference' });
    await page.route('https://**/*', route => route.abort());
    await page.addInitScript(() => {
      localStorage.setItem('wf_market_quotes_v1', JSON.stringify([
        { at: '2026-11-10T00:00:00Z', try: 40, eur: .9 },
        { at: '2026-11-11T00:00:00Z', try: 41, eur: .9 },
      ]));
    });
    await page.goto(process.env.TEST_URL || 'http://127.0.0.1:3010/', { waitUntil: 'load' });
    await page.waitForFunction(() => !document.documentElement.classList.contains('wf-booting'));
    await page.evaluate(() => {
      wfBackupCloseRestoreModal();
      showPage('dashboard');
      updateRateUI();
    });
    const grid = page.locator('#currBar .curr-bar-grid');
    for (const section of ['dashboard', 'exchange']) {
      await page.evaluate(name => showPage(name), section);
      assert.equal(await grid.evaluate(el => el.closest('.page').id), 'page-' + section);
      for (const [width, columns] of [[1600, 6], [800, 3], [390, 2], [320, 2]]) {
        await page.setViewportSize({ width, height: 900 });
        const layout = await grid.evaluate(el => {
          const style = getComputedStyle(el);
          return {
            display: style.display,
            columns: style.gridTemplateColumns.split(' ').length,
            cards: el.querySelectorAll('.curr-item').length,
            overflow: style.overflow,
            fits: el.scrollWidth <= el.clientWidth + 1,
          };
        });
        assert.deepEqual(layout, { display: 'grid', columns, cards: 6, overflow: 'visible', fits: true }, section + ' at ' + width);
      }
    }

    const cards = grid.locator('.curr-item');
    const direction = async pair => {
      const card = cards.filter({ has: page.locator('#' + pair) });
      return card.evaluate(el => ({
        trend: el.dataset.quoteTrend,
        color: getComputedStyle(el.querySelector('.wf-quote-chart')).color,
      }));
    };
    for (const theme of ['light', 'dark']) {
      await page.evaluate(value => document.documentElement.dataset.theme = value, theme);
      const accents = await cards.evaluateAll(items => items.map(el => getComputedStyle(el.querySelector('.curr-flag')).backgroundColor));
      assert.equal(new Set(accents).size, 3, theme);
      const up = await direction('usdTryRate');
      const down = await direction('tryUsdRate');
      assert.equal(up.trend, 'up');
      assert.equal(down.trend, 'down');
      assert.notEqual(up.color, down.color, theme);
    }

    const animationNames = () => cards.first().evaluate(el => [
      getComputedStyle(el).animationName,
      getComputedStyle(el.querySelector('.wf-quote-chart')).animationName,
    ]);
    assert.deepEqual(await animationNames(), ['wfQuoteEnter', 'wfQuoteDraw']);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.deepEqual(await animationNames(), ['none', 'none']);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.evaluate(() => document.documentElement.dataset.wfMotion = 'reduced');
    assert.deepEqual(await animationNames(), ['none', 'none']);
  } finally {
    await browser.close();
  }
}

checkQuotes().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
