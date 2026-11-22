import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCentralBankActions} from '../supabase/functions/wow-cloud/modules/platform-fx.mjs';

const xml='<?xml version="1.0" encoding="UTF-8"?>'+
  '<Tarih_Date Tarih="20.11.2026" Date="11/20/2026">'+
  '<Currency Kod="USD" CurrencyCode="USD"><ForexSelling>50.4936</ForexSelling></Currency>'+
  '<Currency Kod="EUR" CurrencyCode="EUR"><ForexSelling>55.3970</ForexSelling></Currency></Tarih_Date>';

test('TCMB quote uses authoritative dated forex-selling values and a bounded cache',async()=>{
  let checks=0,fetches=0,t=10000;
  const actions=createCentralBankActions({
    requirePlatformFounder:async actor=>{checks++;assert.equal(actor.userId,'founder');},
    fetchImpl:async(url,opts)=>{
      fetches++;assert.equal(url,'https://www.tcmb.gov.tr/kurlar/today.xml');
      assert.equal(opts.redirect,'error');return {ok:true,text:async()=>xml};
    },now:()=>t
  });
  const first=await actions['platform.fx.get']({actor:{userId:'founder'}});
  assert.deepEqual(first,{available:true,source:'TCMB',rateType:'forex_selling',date:'2026-11-20',
    rates:{USD:50.4936,EUR:55.397,TRY:1}});
  assert.deepEqual(await actions['platform.fx.get']({actor:{userId:'founder'}}),first);
  assert.equal(fetches,1);assert.equal(checks,2);
  t+=60*60*1000+1;
  await actions['platform.fx.get']({actor:{userId:'founder'}});
  assert.equal(fetches,2);
});

test('TCMB actions never expose a rate when the upstream bulletin is invalid or unreachable',async()=>{
  for(const response of [
    {ok:true,text:async()=>'<Tarih_Date Tarih="20.11.2026"><Currency Kod="USD"><ForexSelling>0</ForexSelling></Currency></Tarih_Date>'},
    {ok:false,text:async()=>''}
  ]){
    const actions=createCentralBankActions({requirePlatformFounder:async()=>{},fetchImpl:async()=>response});
    const result=await actions['platform.fx.get']({actor:{userId:'founder'}});
    assert.equal(result.available,false);
    assert.equal(result.rates,null);
    assert.equal(result.date,null);
  }
});

test('TCMB bulletin access never skips founder authorization even when rate is cached',async()=>{
  let fetches=0,authorized=true;
  const actions=createCentralBankActions({
    requirePlatformFounder:async()=>{if(!authorized)throw Object.assign(Error('denied'),{code:'ACCESS_DENIED'});},
    fetchImpl:async()=>{fetches++;return {ok:true,text:async()=>xml};}
  });
  await actions['platform.fx.get']({actor:{}});
  authorized=false;
  await assert.rejects(actions['platform.fx.get']({actor:{}}),{code:'ACCESS_DENIED'});
  assert.equal(fetches,1);
});
