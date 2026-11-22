import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,readdir,mkdir,stat,symlink,link,copyFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
test('release verification rejects a stale page update guard before publication',async()=>{
  const fixture=await mkdtemp(path.join(tmpdir(),'mark-release-gate-'));
  try{
    for(const name of await readdir(root)){
      if(name==='scripts'||name==='index.html'||name.startsWith('.git'))continue;
      const source=path.join(root,name),target=path.join(fixture,name);
      if((await stat(source)).isDirectory())await symlink(source,target,'junction');
      else await link(source,target);
    }
    await mkdir(path.join(fixture,'scripts'));
    await copyFile(path.join(root,'scripts/verify-release.mjs'),path.join(fixture,'scripts/verify-release.mjs'));
    const html=await readFile(path.join(root,'index.html'),'utf8');
    const sw=await readFile(path.join(root,'sw.js'),'utf8');
    const release=/wow-furniture-v(\d+)-/.exec(sw)?.[1];
    assert(release,'fixture requires the real deployment cache identity');
    await writeFile(path.join(fixture,'index.html'),html.replace(/data-release="\d+"/,'data-release="'+release+'"'));
    const run=()=>spawnSync(process.execPath,['scripts/verify-release.mjs'],{cwd:fixture,encoding:'utf8'});
    const matching=run();
    assert.equal(matching.status,0,matching.stderr);
    await writeFile(path.join(fixture,'index.html'),html.replace(/data-release="\d+"/,'data-release="0"'));
    const stale=run();
    assert.notEqual(stale.status,0,'stale release metadata must fail the publishing gate');
    assert.match(stale.stderr,/release.*mismatch/i);
  }finally{await rm(fixture,{recursive:true,force:true});}
});
