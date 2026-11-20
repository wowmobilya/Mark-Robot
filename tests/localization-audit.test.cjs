const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const acorn=require('acorn'),walk=require('acorn-walk');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const languages=['ar','en','tr','fr','ru'];
const units=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map((match,index)=>({name:'index.html script '+index,code:match[1]}))
  .concat(fs.readdirSync(root).filter(name=>/\.(?:js|mjs)$/.test(name)).map(name=>({name,code:fs.readFileSync(path.join(root,name),'utf8')})));
for(const unit of units){
  try{unit.ast=acorn.parse(unit.code,{ecmaVersion:'latest',locations:true,sourceType:unit.name.endsWith('.mjs')?'module':'script'});}
  catch(error){if(!/import|export/.test(error.message))throw error;unit.ast=acorn.parse(unit.code,{ecmaVersion:'latest',locations:true,sourceType:'module'});}
}
const propertyKey=property=>property.key.name??property.key.value;
const properties=node=>Object.fromEntries((node?.properties||[]).filter(property=>property.type==='Property').map(property=>[propertyKey(property),property.value]));
const literal=node=>node?.type==='Literal'?node.value:node?.type==='TemplateLiteral'&&!node.expressions.length?node.quasis[0].value.cooked:undefined;
const tokens=text=>[...new Set([...text.matchAll(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g)].map(match=>match[1]))].sort();
const uiContext={window:{},document:{documentElement:{lang:'en'},querySelectorAll:()=>[]}};
vm.runInNewContext(fs.readFileSync(path.join(root,'ui-i18n.js'),'utf8'),uiContext);
const copy=uiContext.window.WOWUICopy;

test('all shipped script translation maps have five languages, matching keys and matching message placeholders',t=>{
  let maps=0,strings=0,placeholderMessages=0,arrays=0;const failures=[];
  function checkText(reference,translated,where){
    strings++;
    if(tokens(reference).length)placeholderMessages++;
    if(reference.trim()&&!translated.trim()||translated.includes('\ufffd')||JSON.stringify(tokens(reference))!==JSON.stringify(tokens(translated)))failures.push({...where,reference,translated});
  }
  for(const {name,ast}of units)walk.ancestor(ast,{
    ObjectExpression(node,ancestors){
      const map=properties(node);if(!map.ar||!map.en)return;
      const scope=ancestors.filter(parent=>parent.type==='VariableDeclarator'||parent.type==='FunctionDeclaration').map(parent=>parent.id?.name).filter(Boolean);
      // These number algorithms intentionally have different implementations;
      // TR is assembled below, and plural categories are language-specific.
      if(scope.includes('_toWordsCore')||scope.includes('numberToWords')||scope.length===1&&scope[0]==='TR'||name==='ui-i18n.js'&&scope.includes('forms'))return;
      maps++;const where={file:name,line:node.loc.start.line};
      for(const language of languages){
        if(!map[language]){failures.push({...where,language,error:'missing language'});continue;}
        if(typeof literal(map.en)==='string'&&typeof literal(map[language])==='string')checkText(literal(map.en),literal(map[language]),{...where,language});
        if(map.en.type==='ObjectExpression'&&map[language].type==='ObjectExpression'){
          const english=properties(map.en),localized=properties(map[language]);
          if(JSON.stringify(Object.keys(english).sort())!==JSON.stringify(Object.keys(localized).sort()))failures.push({...where,language,error:'different keys'});
          for(const key of Object.keys(english))if(typeof literal(english[key])==='string'&&typeof literal(localized[key])==='string')checkText(literal(english[key]),literal(localized[key]),{...where,language,key});
        }
      }
    },
    ArrayExpression(node){
      const values=node.elements.map(literal);
      if(values.length!==5||values.some(value=>typeof value!=='string')||!/[\u0600-\u06ff]/.test(values[0]))return;
      arrays++;for(let index=0;index<values.length;index++)checkText(values[0],values[index],{file:name,line:node.loc.start.line,index});
    }
  });
  assert(maps>1800);assert(strings>13000);assert(arrays>200);assert(placeholderMessages>0);assert.deepEqual(failures,[]);
  t.diagnostic(`${maps} language maps; ${arrays} five-language arrays; ${strings} translated string checks; ${placeholderMessages} placeholder checks`);
});

test('the assembled primary UI dictionary includes all five languages and every authored data-i18n key',t=>{
  const context={};const start=html.indexOf('const TR={'),end=html.indexOf('const t=k=>',start);
  assert(start>=0&&end>start);vm.runInNewContext(html.slice(start,end),context);
  let excelDeclaration,excelExtension;
  for(const {code,ast}of units)for(const node of ast.body){
    if(node.type==='VariableDeclaration'&&node.declarations.some(value=>value.id.name==='WF_EXCEL_TEXT'))excelDeclaration=code.slice(node.start,node.end);
    if(node.type==='ForOfStatement'&&code.slice(node.start,node.end).includes('TR[lang].excel_download='))excelExtension=code.slice(node.start,node.end);
  }
  assert(excelDeclaration&&excelExtension);vm.runInNewContext(excelDeclaration+'\n'+excelExtension,context);
  const tr=vm.runInNewContext('TR',context),keys=new Set(Object.values(tr).flatMap(Object.keys));
  for(const match of html.matchAll(/data-i18n="([^"]+)"/g))if(!match[1].includes('${'))keys.add(match[1]);
  for(const {ast}of units)walk.simple(ast,{Literal(node){if(typeof node.value==='string')for(const match of node.value.matchAll(/data-i18n="([^"]+)"/g))keys.add(match[1]);}});
  const missing=[];
  for(const key of keys)for(const language of languages){
    const value=tr[language][key];if(typeof value!=='string'&&!Array.isArray(value))missing.push({key,language});
    if(Array.isArray(value))assert.equal(value.length,tr.en[key].length,key+' '+language);
  }
  assert(keys.size>280);assert.deepEqual(missing,[]);t.diagnostic(`${keys.size} assembled primary translation keys in each language`);
});

test('static and dynamically authored UI bindings and literal helper calls resolve to the shared dictionary',t=>{
  const known=new Set([...Object.keys(copy),...Object.values(copy).flatMap(Object.values)]),missing=[],checked=new Set();
  const decode=text=>text.replace(/&#x([0-9a-f]+);/gi,(_,number)=>String.fromCodePoint(parseInt(number,16))).replace(/&#(\d+);/g,(_,number)=>String.fromCodePoint(Number(number))).replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
  function binding(text,file){for(const match of text.matchAll(/data-wf-ui(?:-(?:placeholder|title|aria-label|alt))?="([^"]*)"/g)){
    if(match[1].includes('${'))continue;const key=decode(match[1]);checked.add(key);if(!known.has(key))missing.push({file,key});
  }}
  binding(html,'index.html');
  for(const {name,ast}of units)walk.simple(ast,{
    Literal(node){if(typeof node.value==='string')binding(node.value,name);},
    TemplateElement(node){binding(node.value.cooked||'',name);},
    CallExpression(node){
      const method=node.callee.name||(node.callee.type==='MemberExpression'&&node.callee.property.name),key=literal(node.arguments[0]);
      if(method==='wfUiText'&&typeof key==='string'){checked.add(key);if(!known.has(key))missing.push({file:name,key});}
    }
  });
  assert(checked.size>100);assert.deepEqual(missing,[]);t.diagnostic(`${Object.keys(copy).length} shared dictionary entries; ${checked.size} distinct bound/called keys`);
});

test('shared translation helpers update only authored labels and leave user text and values intact',()=>{
  const ui={dataset:{wfUi:'Close'},textContent:'Close'},toast={dataset:{wfToastCopy:'Cancel'},textContent:'Cancel'};
  const input={value:'اسم العميل Custom client',textContent:'ملاحظة محفوظة',attributes:{'data-wf-ui-placeholder':'Search'},getAttribute(key){return this.attributes[key];},setAttribute(key,value){this.attributes[key]=value;}};
  const selectors=[],context={window:{},document:{documentElement:{lang:'fr'},querySelectorAll(selector){selectors.push(selector);return selector==='[data-wf-ui]'?[ui]:selector==='[data-wf-toast-copy]'?[toast]:selector==='[data-wf-ui-placeholder]'?[input]:[];}}};
  vm.runInNewContext(fs.readFileSync(path.join(root,'ui-i18n.js'),'utf8'),context);context.window.wfTranslateStaticUI();
  assert.equal(ui.textContent,'Fermer');assert.equal(toast.textContent,'Annuler');assert.equal(input.attributes.placeholder,copy.Search.fr);
  assert.equal(input.value,'اسم العميل Custom client');assert.equal(input.textContent,'ملاحظة محفوظة');assert(selectors.every(selector=>/^\[data-wf-/.test(selector)));
  for(const language of languages)assert.equal(context.window.wfUiText('اسم العميل Custom client',language),'اسم العميل Custom client');
});
