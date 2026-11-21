const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../package-label-core.js');

const invoice = core.normalizeInvoice({
  id:'i', invNo:'A101', companyLogo:'/client.png',
  items:[
    {name:'TAB-20', type:'side_table', color:'Oak-Gray', qty:2, packets:2, image:'/product.png'},
    {name:'TAB-30', type:'tv_table', color:'Blue', qty:5, packets:1}
  ]
}, {companyLogo:'/issuer.png'});

const batchFor = profileId => core.buildLabelBatch(invoice, {profileId});
const twipsToMM = twips => twips * 25.4 / 1440;
function close(actual, expected, tolerance = 0.000001) {
  assert(Math.abs(actual - expected) < tolerance, `expected ${actual} to be within ${tolerance} of ${expected}`);
}

test('the current paper preference is TW-2004 while the old core entry point preserves eight-up output', () => {
  assert.equal(core.defaultProfileId, 'tw2004');
  const legacy = core.buildLabelBatch(invoice);
  assert.equal(legacy.profileId, 'tw2008');
  assert.deepEqual(legacy.pages.map(page => page.length), [8,1]);
  assert.equal(core.renderDocument(legacy), core.renderDocument({...legacy, profileId:undefined}));
  assert.equal(core.renderDocument(legacy), core.renderDocument(batchFor('tw2008')));
  assert(Object.isFrozen(core.profiles));
  assert(Object.isFrozen(core.profiles.tw2004));
  assert(Object.isFrozen(core.profiles.tw2008));
  for (const p of Object.values(core.profiles)) {
    assert.equal(p.stockWidthMM, 99.1);
    assert.equal(p.stockHeightMM, p.id === 'tw2004' ? 139 : 67.7);
  }
  assert.equal(core.profiles.tw2008.artworkScale, 1);
});

test('TW-2004 die positions follow the manufacturer Word template on portrait A4', () => {
  const p = core.profiles.tw2004;
  assert.deepEqual([p.pageWidthMM,p.pageHeightMM,p.columns,p.rows,p.cardWidthMM,p.cardHeightMM], [210,297,2,2,99.1,139]);
  close(p.marginLeftMM, twipsToMM(284));
  close(p.marginTopMM, twipsToMM(567));
  close(p.cardWidthMM + p.gapColumnMM, twipsToMM(5619 + 164));
  close(p.cardHeightMM + p.gapRowMM, twipsToMM(7881));
  assert(p.marginLeftMM + 2 * p.cardWidthMM + p.gapColumnMM < p.pageWidthMM);
  assert(p.marginTopMM + 2 * p.cardHeightMM + p.gapRowMM < p.pageHeightMM);
});

test('each sheet profile keeps every packet, unit, line, and barcode in the original order', () => {
  const large = batchFor('tw2004'), original = batchFor('tw2008');
  assert.equal(large.profileId, 'tw2004');
  assert.equal(large.pageCount, 3);
  assert.deepEqual(large.pages.map(page => page.length), [4,4,1]);
  assert.deepEqual(original.pages.map(page => page.length), [8,1]);
  assert.deepEqual(large.labels, original.labels);
  assert.deepEqual(large.pages.flat(), original.labels);
  assert.deepEqual(large.pages[0].map(label => [label.currentPacket, label.unitIndex]), [[1,1],[1,2],[2,1],[2,2]]);
  assert(large.pages.every(Object.isFrozen));
  for (const [key, capacity] of [['tw2004',4], ['tw2008',8]]) {
    for (const quantity of [0,1,capacity,capacity+1,2*capacity,core.maxLabels]) {
      const model = core.normalizeInvoice({invNo:'A2', items:[{name:'TAB',type:'other',qty:quantity,packets:1}]});
      const batch = core.buildLabelBatch(model, {profileId:key});
      assert.equal(batch.pageCount, Math.ceil(quantity / capacity));
      assert.equal(batch.labelCount, quantity);
    }
  }
});

test('four-up print and single-sheet preview uniformly enlarge the complete original card', () => {
  const large = batchFor('tw2004'), original = batchFor('tw2008');
  const options = {barcodeImages:new Map(large.labels.map(label => [label.barcodeText, 'data:image/png;base64,AA==']))};
  const html = core.renderDocument(large, options);
  const single = core.renderDocument({...large, pages:[large.pages[0]]}, options);
  const sameFour = core.renderDocument({...original, pages:[large.pages[0]]}, options);
  // Both profiles share the complete card markup with every saved value and graphic.
  const realCards = document => document.match(/<div class="label-card">[\s\S]*?MADE IN TÜRKIYE<\/span>\s*<\/div>\s*<\/div>/g);
  assert.equal(realCards(single).length, 4);
  assert.deepEqual(realCards(single), realCards(sameFour));
  assert.match(single, /grid-template-columns:\s*repeat\(2, 99\.1mm\)/);
  assert.match(single, /grid-template-rows:\s*repeat\(2, 139mm\)/);
  const match = /transform:\s*rotate\(90deg\) scale\(([\d.]+)\)/.exec(single);
  assert(match, 'a single proportional transform rotates and enlarges the entire card');
  const {insetMM, artworkScale} = core.profiles.tw2004;
  assert.equal(insetMM, 1.5);
  close(artworkScale, Math.min((139 - 2 * insetMM) / 97, (99.1 - 2 * insetMM) / 66.2));
  close(Number(match[1]), artworkScale);
  close((139 - 97 * artworkScale) / 2, 1.5);
  close((99.1 - 66.2 * artworkScale) / 2, 3.14175258);
  assert.doesNotMatch(sameFour, /rotate\(90deg\)/);
  assert.equal((single.match(/class="label-card"/g)||[]).length, 4);
  assert.equal((html.match(/class="page"/g)||[]).length, 3);
  assert.equal(realCards(html).length, 9);
  assert.equal((html.match(/class="label-card" style="background:#f3faf6;"/g)||[]).length, 3);
  assert.match(html, /\.page:last-child\s*{[^}]*break-after: auto/);
});
