const test=require('node:test');
const assert=require('node:assert/strict');
const {calculate,parseLocation,copy}=require('../prayer-card');
const adhan=require('../vendor/adhan/adhan.umd.min');
const timezone=require('../vendor/tz-lookup/tz');

test('Ankara prayer times match the published Ankara reference within its two-minute tolerance',()=>{
  // Batoul Apps shared test data: Shared/Times/Ankara-Turkey.json, 2019-01-01.
  const cfg={lat:39.939382,lon:32.819713,method:'Turkey',school:'Shafi'};
  const {zone,rows}=calculate(cfg,new Date('2018-12-31T21:30:00Z'),adhan,timezone);
  assert.equal(zone,'Europe/Istanbul');
  const today=rows.filter(r=>r.offset===0);
  assert.deepEqual(today.map(r=>r.key),['fajr','dhuhr','asr','maghrib','isha']);
  const expected=[393,777,920,1060,1145];
  today.forEach((r,i)=>{
    const [h,m]=new Intl.DateTimeFormat('en-GB',{timeZone:zone,hour:'2-digit',minute:'2-digit'}).format(r.at).split(':').map(Number);
    assert.ok(Math.abs(h*60+m-expected[i])<=2);
  });
  assert.equal(rows.length,15);
});

test('the prayer card rejects incomplete locations, accepts the equator and covers five languages',()=>{
  for(const value of ['',',','0','NaN,0','91,0','0,-181'])assert.equal(parseLocation(value),null);
  assert.deepEqual(parseLocation('0، 0'),{lat:0,lon:0});
  assert.deepEqual(parseLocation('39.939382, 32.819713'),{lat:39.939,lon:32.82});
  for(const value of Object.values(copy))assert.equal(value.length,5);
});
