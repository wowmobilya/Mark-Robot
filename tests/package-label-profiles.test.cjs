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
const realCards = html => html.match(/<div class="label-card">[\s\S]*?MADE IN TÜRKIYE<\/span>\s*<\/div>\s*<\/div>/g);
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
  for (const p of [core.profiles.tw2004,core.profiles.tw2008]) {
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

const rollProfiles = [
  {id:'zebra100x150', name:'Zebra 100 × 150', width:100, height:150, angle:90, scale:97/66.2, printedWidth:97, printedHeight:142.129909, labelsPerRoll:250},
  {id:'zebra150x100', name:'Zebra 150 × 100', width:150, height:100, angle:0, scale:97/66.2, printedWidth:142.129909, printedHeight:97, labelsPerRoll:250},
  {id:'thermal80x100', name:'Thermal 80 × 100', width:80, height:100, angle:90, scale:1, printedWidth:66.2, printedHeight:97},
  {id:'thermal70x100', name:'Thermal 70 × 100', width:70, height:100, angle:90, scale:1, printedWidth:66.2, printedHeight:97},
  {id:'thermal100x100', name:'Thermal 100 × 100', width:100, height:100, angle:0, scale:1, printedWidth:97, printedHeight:66.2},
  {id:'thermal100x200', name:'Thermal 100 × 200', width:100, height:200, angle:90, scale:97/66.2, printedWidth:97, printedHeight:142.129909},
  {id:'thermal100x80', name:'Thermal 100 × 80', width:100, height:80, angle:0, scale:1, printedWidth:97, printedHeight:66.2},
  {id:'thermal100x70', name:'Thermal 100 × 70', width:100, height:70, angle:0, scale:1, printedWidth:97, printedHeight:66.2},
  {id:'thermal200x100', name:'Thermal 200 × 100', width:200, height:100, angle:0, scale:97/66.2, printedWidth:142.129909, printedHeight:97},
  {id:'thermal100x50', name:'Thermal 100 × 50', width:100, height:50, angle:0, scale:47/66.2, printedWidth:68.8670695, printedHeight:47},
  {id:'thermal50x100', name:'Thermal 50 × 100', width:50, height:100, angle:90, scale:47/66.2, printedWidth:47, printedHeight:68.8670695},
  {id:'thermal80x500', name:'Thermal 80 × 500', width:80, height:500, angle:90, scale:77/66.2, printedWidth:77, printedHeight:112.8247734},
  {id:'thermal500x80', name:'Thermal 500 × 80', width:500, height:80, angle:0, scale:77/66.2, printedWidth:112.8247734, printedHeight:77}
];
for (const {id,name,width,height,angle,scale,printedWidth,printedHeight,labelsPerRoll} of rollProfiles) {
  test(`${id} has one die per page and keeps the artwork inside its safe inset`, () => {
    const p = core.profiles[id];
    assert(p && Object.isFrozen(p));
    assert.equal(p.name, name);
    assert.equal(p.mediaType, 'roll');
    assert.equal(p.labelsPerRoll, labelsPerRoll);
    assert.deepEqual([p.pageWidthMM,p.pageHeightMM,p.stockWidthMM,p.stockHeightMM,p.cardWidthMM,p.cardHeightMM], [width,height,width,height,width,height]);
    assert.deepEqual([p.columns,p.rows,p.gapColumnMM,p.gapRowMM], [1,1,0,0]);
    assert.deepEqual([p.marginLeftMM,p.marginRightMM,p.marginTopMM,p.marginBottomMM], [0,0,0,0]);
    assert.equal(p.insetMM, 1.5);
    assert.equal(p.artworkRotationDeg, angle);
    close(p.artworkScale, scale);
    close(p.artworkScale * (angle === 90 ? 66.2 : 97), printedWidth);
    close(p.artworkScale * (angle === 90 ? 97 : 66.2), printedHeight);
    close(Math.min((width - printedWidth) / 2, (height - printedHeight) / 2), p.insetMM);
  });

  test(`${id} emits one original card and its matching barcode per roll label and single-page preview`, () => {
    const roll = batchFor(id), original = batchFor('tw2008');
    assert.equal(roll.profileId, id);
    assert.equal(roll.pageCount, 9);
    assert.equal(roll.pages.length, roll.labelCount);
    assert(roll.pages.every(page => page.length === 1 && Object.isFrozen(page)));
    assert.deepEqual(roll.pages.flat(), original.labels);
    const options = {barcodeImages:new Map([
      ['TAB-20 - Packet 1/2','data:image/png;base64,AA=='],
      ['TAB-20 - Packet 2/2','data:image/png;base64,AQ=='],
      ['TAB-30 - Packet 1/1','data:image/png;base64,Ag==']
    ])};
    const html = core.renderDocument(roll, options), cards = realCards(core.renderDocument(original, options));
    const pageRule = `@page { size: ${width}mm ${height}mm; margin: 0; }`;
    assert(html.replace(/\s+/g,' ').includes(pageRule));
    assert.doesNotMatch(html, /210mm|297mm/);
    assert(html.includes(`grid-template-columns: repeat(1, ${width}mm);`));
    assert(html.includes(`grid-template-rows: repeat(1, ${height}mm);`));
    assert.match(html, /\.label-card\s*\{\s*place-self:\s*center;/);
    assert(html.includes(`transform: rotate(${angle}deg) scale(${core.profiles[id].artworkScale});`));
    assert.match(html, /\.page:last-child\s*{[^}]*break-after: auto/);
    const pages = html.split('<div class="page">').slice(1);
    assert.equal(pages.length, 9);
    pages.forEach((page, index) => {
      assert.deepEqual(realCards(page), [cards[index]]);
      assert.equal((page.match(/class="label-card"/g)||[]).length, 1);
    });
    const preview = core.renderDocument({...roll, pages:[roll.pages[2]]}, options);
    assert(preview.replace(/\s+/g,' ').includes(pageRule));
    assert.equal((preview.match(/class="page"/g)||[]).length, 1);
    assert.deepEqual(realCards(preview), [cards[2]]);
  });

  test(`${id} emits exactly one page per package across short, long and empty jobs`, () => {
    for (const qty of [0,1,249,250,251,core.maxLabels]) {
      const model = core.normalizeInvoice({invNo:'A2', items:[{name:'TAB',type:'other',qty,packets:1}]});
      const roll = core.buildLabelBatch(model, {profileId:id});
      assert.equal(roll.pageCount, qty);
      assert.equal(roll.labelCount, qty);
    }
  });
}

test('the 70 and 80 mm rolls contain the original 97 mm layout box after rotation', () => {
  for (const [profileId,sideClearance] of [['thermal70x100',1.9], ['thermal80x100',6.9]]) {
    const html = core.renderDocument(batchFor(profileId));
    assert.match(html, /\.labels-grid\s*\{[^}]*overflow:\s*hidden/);
    const profile = core.profiles[profileId];
    close((profile.pageWidthMM - core.geometry.cardHeightMM * profile.artworkScale) / 2, sideClearance);
    close((profile.pageHeightMM - core.geometry.cardWidthMM * profile.artworkScale) / 2, 1.5);
  }
});

test('the 50 mm stocks clip untransformed layout overflow on the short page axis', () => {
  for (const id of ['thermal50x100','thermal100x50']) {
    assert.match(core.renderDocument(batchFor(id)), /\.labels-grid\s*\{[^}]*overflow:\s*hidden/);
  }
});

for (const sourceId of ['tw2004','tw2008']) {
  test(`${sourceId} landscape rotates the entire calibrated grid and keeps its source pagination`, () => {
    const portrait = batchFor(sourceId), landscape = batchFor(sourceId+'Landscape');
    const p = core.profiles[landscape.profileId], original = core.profiles[sourceId];
    assert.equal(p.sourceProfileId, sourceId);
    assert.equal(p.sheetRotationDeg, -90);
    assert.equal(p.artworkRotationDeg, sourceId === 'tw2004' ? 0 : -90);
    assert.deepEqual([p.pageWidthMM,p.pageHeightMM,p.columns,p.rows], [297,210,original.rows,original.columns]);
    assert.deepEqual([p.stockWidthMM,p.stockHeightMM], [original.stockHeightMM,original.stockWidthMM]);
    assert.deepEqual(landscape.pages, portrait.pages);
    for (const pageSet of [portrait.pages, [portrait.pages.at(-1)]]) {
      const rotated = core.renderDocument({...landscape,pages:pageSet});
      const native = core.renderDocument({...portrait,pages:pageSet});
      assert.match(rotated, /@page\s*\{\s*size:\s*297mm 210mm/);
      assert.match(rotated, /\.page\s*\{[^}]*width: 297mm;[^}]*height: 210mm;[^}]*overflow: hidden;/);
      assert.match(rotated, /\.sheet-layout\s*\{[^}]*width: 210mm;[^}]*height: 297mm;[^}]*padding-top:/);
      assert.match(rotated, /\.sheet-layout\s*\{[^}]*position: absolute;[^}]*top: 210mm;[^}]*left: 0;[^}]*transform-origin: 0 0;[^}]*transform: matrix\(0, -1, 1, 0, 0, 0\)/);
      assert.match(rotated, /@media print\s*\{\s*\.sheet-layout\s*\{\s*display: flex/);
      assert.match(rotated, /\.page:last-child\s*\{[^}]*break-after: auto/);
      const sourcePageRule = native.match(/\.page\s*\{\s*position: relative;[^}]+\}/)[0];
      assert(rotated.includes(sourcePageRule.replace('.page', '.sheet-layout')));
      assert.deepEqual(rotated.match(/\.labels-grid\s*\{[^}]+\}/g), native.match(/\.labels-grid\s*\{[^}]+\}/g));
      const bodyOf = html => html.slice(html.indexOf('<body>')).split('<div class="page">').slice(1);
      const originalPages = bodyOf(native);
      const rotatedPages = bodyOf(rotated);
      assert.equal(rotatedPages.length, pageSet.length);
      rotatedPages.forEach((page, i) => {
        assert(page.startsWith('<div class="sheet-layout"><div class="labels-grid">'));
        assert.equal(page, '<div class="sheet-layout">' + originalPages[i].replace(/<\/div>(?=(?:<\/body><\/html>)?$)/, '</div></div>'));
      });
    }
    const corners = [[0,0],[210,0],[210,297],[0,297]];
    assert.deepEqual(corners.map(([x,y]) => [y,p.pageHeightMM-x]), [[0,210],[0,0],[297,0],[297,210]]);
  });
}
