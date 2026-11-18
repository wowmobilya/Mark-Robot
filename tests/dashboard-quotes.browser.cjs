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
      const widths = section === 'dashboard' ? [[1600, 3], [800, 2], [390, 2], [320, 2]] : [[1600, 6], [800, 3], [390, 2], [320, 2]];
      for (const [width, columns] of widths) {
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
        if (section === 'dashboard') {
          const quotes = await grid.locator('.curr-item').evaluateAll(items => items.map(item => ({
            height: item.getBoundingClientRect().height,
            fits: item.scrollWidth <= item.clientWidth + 1,
          })));
          assert(quotes.every(quote => quote.fits && quote.height >= 43.9 && quote.height <= 58), JSON.stringify(quotes));
        }
      }
    }

    const cards = grid.locator('.curr-item');
    const direction = async pair => {
      const card = cards.filter({ has: page.locator('#' + pair) });
      return card.evaluate(el => ({
        trend: el.dataset.quoteTrend,
        color: getComputedStyle(el.querySelector('.wf-quote-trend')).color,
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
      getComputedStyle(el.querySelector('.wf-quote-arrow')).animationName,
    ]);
    assert.deepEqual(await animationNames(), ['wfQuoteEnter', 'wfQuoteArrow']);
    const stableArrow = await cards.first().locator('.wf-quote-arrow').elementHandle();
    await page.evaluate(() => updateRateUI());
    assert(await stableArrow.evaluate(el => el.isConnected), 'Unchanged rates do not restart the arrow animation');
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
