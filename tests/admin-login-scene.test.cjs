'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=path=>fs.readFileSync(path,'utf8');

test('WOW 241 admin ships versioned robot login assets without changing sign-in endpoint',()=>{
  const html=read('platform/index.html'),js=read('platform/dashboard.js');
  assert.match(html,/login-scene\.css\?v=241/);
  assert.match(html,/dashboard\.css\?v=241/);
  assert.match(html,/dashboard\.js\?v=241/);
  assert.match(html,/WOW Admin · v241/);
  assert.match(js,/className='platform-login-scene'/);
  assert.match(js,/sceneWords=\{/);
  assert.match(js,/ar:\[/);
  assert.match(js,/en:\[/);
  assert.match(js,/tr:\[/);
  assert.match(js,/fr:\[/);
  assert.match(js,/ru:\[/);
  assert.match(js,/action:'auth.signIn',founderOnly:true/);
  assert.match(js,/scene\.append\(stage,intro,connection\);form\.prepend\(scene\)/);
});

test('WOW 241 robot has eyes, nose, mouth and accessible reduced-motion design',()=>{
  const css=read('platform/login-scene.css'),js=read('platform/dashboard.js'),robot=read('platform/server-robot.js');
  assert.match(js,/wow241-eye/);
  assert.match(js,/wow241-nose/);
  assert.match(js,/wow241-mouth/);
  assert.match(css,/platform-server-robot-face\{border:0;background:transparent/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css,/@media\(max-height:620px\)/);
  assert.match(css,/platform-login:has\(>button\[data-phase="busy"\]\)/);
  assert.match(robot,/class="platform-robot-nose"/);
});
