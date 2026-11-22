'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('founder-only session diagnostics stay service-role read-only',()=>{
  const sql=read('supabase/modules/platform-device-observations.sql');
  assert.match(sql,/alter table public\.wow_client_device_observations enable row level security/i);
  assert.match(sql,/revoke all on public\.wow_client_device_observations from public,anon,authenticated/i);
  assert.match(sql,/if p_action='list' then[\s\S]*?perform public\.wow_platform_require\(p_user,p_session\)/i);
  assert.match(sql,/grant execute on function public\.wow_client_devices_rpc\([^)]*\) to service_role/i);
  assert.doesNotMatch(sql,/grant execute on function public\.wow_client_devices_rpc\([^)]*\) to (?:anon|authenticated)/i);
});
test('company client reports limited diagnostic metadata using its authenticated session',()=>{
  const source=read('modules/platform/cloud/wow-cloud-settings.js');
  assert.match(source,/state\?\.authenticated/);
  assert.match(source,/client\.request\('device\.observe'/);
  assert.match(source,/String\(root\.navigator\.userAgent\|\|''\)\.slice\(0,512\)/);
  assert.match(source,/observationAttempt<3600000/);
  assert.match(source,/observationCopy/);
  assert.doesNotMatch(source,/fetch\(['"]https?:\/\/[^'"]*ipify/i);
});
test('founder device cards distinguish provider IP from user location and active presence',()=>{
  const source=read('platform/company-inspect.js');
  assert.match(source,/const sections=\[[^\]]*'devices'\]/);
  assert.match(source,/current==='devices'\?deviceRow\(row\)/);
  assert.match(source,/IP.*Supabase|Supabase IP/);
  assert.match(source,/closedAt\?w\.closed:w\.notClosed/);
  assert.match(source,/record\.reportedAt\?date\(record\.reportedAt\)/);
});
