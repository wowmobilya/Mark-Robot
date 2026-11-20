/* Shared touch keyboard. Original fields and their draft handlers remain the
   source of truth; only unfinished numeric text lives in the readonly mirror. */
(function (global) {
  'use strict';

  const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(undefined, {granularity:'grapheme'}) : null;
  function boundaries(value) {
    if (segmenter) return [0, ...Array.from(segmenter.segment(value), part => part.index + part.segment.length)];
    let offset=0; const result=[0];
    for (const character of value) { offset+=character.length; if (/\p{Mark}/u.test(character) && result.length>1) result[result.length-1]=offset; else result.push(offset); }
    return result;
  }
  function editText(state, action, data='', maxLength=-1) {
    const value=String(state.value), clamp=n=>Math.max(0,Math.min(value.length,Number(n)||0));
    let start=clamp(state.start), end=Math.max(start,clamp(state.end));
    let inputType='insertText', insertion=String(data);
    if (action==='clear') { start=0;end=value.length;insertion='';inputType='deleteContentBackward'; }
    if (action==='backspace'||action==='delete') {
      insertion='';inputType=action==='backspace'?'deleteContentBackward':'deleteContentForward';
      if(start===end){const points=boundaries(value);if(action==='backspace')start=points.filter(point=>point<start).pop()??0;else end=points.find(point=>point>end)??value.length;}
    }
    if (maxLength>=0 && insertion.length>maxLength-(value.length-end+start)) {
      const room=Math.max(0,maxLength-(value.length-end+start));
      insertion=insertion.slice(0,boundaries(insertion).filter(point=>point<=room).pop()??0);
    }
    return {value:value.slice(0,start)+insertion+value.slice(end),start:start+insertion.length,end:start+insertion.length,inputType,data:inputType.startsWith('delete')?null:insertion};
  }
  function normalizeNumber(value) {
    return String(value).trim().replace(/[٠-٩۰-۹]/g,c=>String(c.charCodeAt(0)-(c<='٩'?1632:1776))).replace(/[٫,]/g,'.').replace(/−/g,'-');
  }
  function numberValue(value) {
    const normalized=normalizeNumber(value);
    if (normalized==='') return '';
    if (!/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(normalized)||!Number.isFinite(Number(normalized))) return null;
    return normalized.replace(/\.$/,'');
  }
  const core={editText,normalizeNumber,numberValue};
  if (typeof module==='object'&&module.exports) { module.exports=core;return; }
  if (!global?.document||global.WFTouchKeyboard) return;

  const doc=global.document, root=doc.documentElement;
  const locales=['ar','tr','en','fr','ru'];
  const names={ar:'العربية',tr:'Türkçe',en:'English',fr:'Français',ru:'Русский'};
  const copy={
    title:['لوحة المفاتيح','Klavye','Keyboard','Clavier','Клавиатура'],
    close:['إغلاق','Kapat','Close','Fermer','Закрыть'],
    done:['تم','Tamam','Done','Terminé','Готово'],
    search:['بحث','Ara','Search','Rechercher','Поиск'],
    next:['التالي','Sonraki','Next','Suivant','Далее'],
    previous:['السابق','Önceki','Previous','Précédent','Назад'],
    select:['تحديد الكل','Tümünü seç','Select all','Tout sélectionner','Выделить всё'],
    clear:['مسح','Temizle','Clear','Effacer','Очистить'],
    paste:['لصق','Yapıştır','Paste','Coller','Вставить'],
    undo:['تراجع','Geri al','Undo','Annuler','Отменить'],
    backspace:['حذف الحرف السابق','Geri sil','Backspace','Effacer avant','Удалить слева'],
    shift:['تغيير حالة الأحرف','Büyük / küçük harf','Upper / lower case','Majuscules / minuscules','Регистр букв'],
    symbols:['رموز','Simgeler','Symbols','Symboles','Символы'],
    letters:['حروف','Harfler','Letters','Lettres','Буквы'],
    space:['مسافة','Boşluk','Space','Espace','Пробел'],
    enter:['إدخال','Enter','Enter','Entrée','Ввод'],
    left:['المؤشر لليسار','İmleci sola taşı','Move cursor left','Curseur à gauche','Курсор влево'],
    right:['المؤشر لليمين','İmleci sağa taşı','Move cursor right','Curseur à droite','Курсор вправо'],
    language:['لغة الكتابة','Yazma dili','Typing language','Langue de saisie','Язык ввода'],
    numeric:['أدخل رقماً صحيحاً','Geçerli bir sayı girin','Enter a valid number','Saisissez un nombre valide','Введите корректное число'],
    clipboard:['تعذّر اللصق. يمكنك استخدام لصق من لوحة مفاتيح متصلة.','Yapıştırılamadı. Bağlı klavyenin yapıştır komutunu kullanabilirsiniz.','Paste is unavailable. You can use Paste on a connected keyboard.','Collage indisponible. Utilisez la commande Coller d’un clavier connecté.','Вставка недоступна. Используйте команду вставки подключённой клавиатуры.']
  };
  const layouts={
    ar:[Array.from('ضصثقفغعهخحجد'),Array.from('شسيبلاتنمكط'),['ئ','ء','ؤ','ر','لا','ى','ة','و','ز','ظ'],['أ','إ','آ','ـ','َ','ُ','ِ','ّ','ْ']],
    tr:[Array.from('qwertyuıopğü'),Array.from('asdfghjklşi'),Array.from('zxcvbnmöç')],
    en:[Array.from('qwertyuiop'),Array.from('asdfghjkl'),Array.from('zxcvbnm')],
    fr:[Array.from('azertyuiop'),Array.from('qsdfghjklm'),Array.from('wxcvbn'),Array.from('éèêëàâçùûîïôœ')],
    ru:[Array.from('йцукенгшщзхъ'),Array.from('фывапролджэ'),Array.from('ячсмитьбюё')]
  };
  const symbols=[['@','#','$','€','₺','£','%','&','*','+'],['(',')','[',']','{','}','=','_','-'],['!','?',':',';','"',"'",'،','؟','\\','/'],['.',',','…','°','×','÷','<','>','|']];
  const supported=new Set(['text','search','email','tel','url','password','number']);
  const registrations=new Map(), nodeRegistrations=new WeakMap();
  let observedTouch=false, active=null, dialog, editor, title, caption, toolbar, languageBar, keys, footer, error;
  let suppressFocus=0, lastIntercept=null, focusFrame=0, repeatTimer=0, repeatInterval=0, repeated=false;
  let gesture=null, ignoredClick=null, ignoreClickUntil=0;
  let transferField=null;
  let chosenLanguage=null;
  try { const saved=global.localStorage.getItem('wf_touch_keyboard_language'); if(locales.includes(saved))chosenLanguage=saved; } catch (_) {}
  const uiLanguage=()=>locales.includes(root.lang)?root.lang:'en';
  const t=key=>copy[key]?.[locales.indexOf(uiLanguage())]||key;
  function isTouchDevice() { return observedTouch||Number(global.navigator?.maxTouchPoints)>0||Number(global.navigator?.msMaxTouchPoints)>0||!!global.matchMedia?.('(any-pointer: coarse)').matches; }
  function supports(field) {
    return !!field && !registrations.get(field.id)?.picker && (field.tagName==='TEXTAREA'||field.tagName==='INPUT'&&supported.has(field.type||'text')) && !field.readOnly&&!field.disabled&&!field.matches(':disabled')&&!field.closest('[inert]')&&!dialog?.contains(field);
  }
  function visible(field) {
    if(!field?.isConnected||field.closest('[hidden],dialog:not([open])'))return false;
    const style=global.getComputedStyle(field);return style.visibility!=='hidden'&&style.display!=='none'&&field.getClientRects().length>0;
  }
  function targetField(target) {
    const node=target?.nodeType===1?target:target?.parentElement;
    if(!node||dialog?.contains(node))return null;
    if(supports(node))return node;
    const label=node.closest('label');return supports(label?.control)?label.control:null;
  }
  function locate(field) {
    const scope=field.parentElement.closest('form,.page,dialog,[role="dialog"],section')||field.parentElement.closest('[id]')||field.parentElement;
    return {field,id:field.id,scope,name:field.name,tag:field.tagName,type:field.type,handlers:[field.getAttribute('oninput'),field.getAttribute('onchange'),field.getAttribute('onblur')]};
  }
  function resolve(locator) {
    if(locator.field?.isConnected)return locator.field;
    const idMatch=locator.id?doc.getElementById(locator.id):null;
    if(idMatch&&idMatch.tagName===locator.tag&&idMatch.type===locator.type)return idMatch;
    if(!locator.scope?.isConnected||(!locator.name&&!locator.handlers.some(Boolean)))return null;
    const matches=Array.from(locator.scope.querySelectorAll('input,textarea')).filter(field=>field.tagName===locator.tag&&field.type===locator.type&&(locator.name?field.name===locator.name:locator.handlers.every((value,index)=>field.getAttribute(['oninput','onchange','onblur'][index])===value)));
    return matches.length===1?matches[0]:null;
  }
  function source() {
    if(!active)return null;
    const field=resolve(active.locator);
    if(field){
      // Change-only invoice controls can be rebuilt from the old model while
      // editing. Rebind the same logical control with its latest live draft.
      if(field!==active.field&&supports(field))field.value=active.publishedValue;
      active.field=field;active.locator.field=field;
    }
    return field;
  }
  function make(tag,className,text) { const node=doc.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node; }
  function button(action,text,label=action) { const node=make('button','wf-tk-key',text);node.type='button';node.dataset.action=action;node.setAttribute('aria-label',t(label));node.title=t(label);return node; }
  function keyButton(value) { const node=make('button','wf-tk-key',value===' '?'␣':value);node.type='button';node.dataset.key=value;return node; }
  function describe(field) {
    const label=field.labels?.[0]?.textContent?.trim();
    const labelled=field.getAttribute('aria-labelledby')?.split(/\s+/).map(id=>doc.getElementById(id)?.textContent?.trim()).filter(Boolean).join(' ');
    return field.getAttribute('aria-label')||labelled||label||field.placeholder||field.title||t('title');
  }
  function stopRepeat() { clearTimeout(repeatTimer);clearInterval(repeatInterval);repeatTimer=repeatInterval=0; }
  function build() {
    if(dialog)return;
    dialog=make('dialog','wf-touch-keyboard');dialog.id='wfTouchKeyboard';dialog.setAttribute('aria-labelledby','wfTouchKeyboardTitle');
    const header=make('header','wf-tk-header'),heading=make('div','wf-tk-heading');
    title=make('h2');title.id='wfTouchKeyboardTitle';caption=make('p','wf-tk-caption');heading.append(title,caption);
    const closeButton=button('close','×','close');closeButton.classList.add('wf-tk-close');header.append(heading,closeButton);
    const editHost=make('div','wf-tk-edit-host');editHost.id='wfTouchKeyboardEditHost';
    toolbar=make('div','wf-tk-toolbar');languageBar=make('div','wf-tk-languages');languageBar.setAttribute('role','group');
    keys=make('div','wf-tk-keys');keys.setAttribute('dir','ltr');
    const body=make('div','wf-tk-body');body.append(languageBar,keys);
    error=make('p','wf-tk-error');error.hidden=true;error.setAttribute('role','status');
    footer=make('footer','wf-tk-footer');dialog.append(header,editHost,toolbar,body,error,footer);doc.body.append(dialog);
    dialog.addEventListener('cancel',event=>{event.preventDefault();close('dismiss');});
    dialog.addEventListener('close',()=>{if(active)close('dismiss');});
    dialog.addEventListener('click',event=>{
      const node=event.target.closest('button');
      if(!node){if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)close('dismiss');}return;}
      if(node.disabled)return;
      if(node.dataset.language){active.language=node.dataset.language;chosenLanguage=active.language;try{global.localStorage.setItem('wf_touch_keyboard_language',chosenLanguage);}catch(_){}render();focusEditor();return;}
      if(node.dataset.key!==undefined){edit('insert',node.dataset.key);return;}
      if(repeated&&node.dataset.action==='backspace'){repeated=false;return;}
      runAction(node.dataset.action);
    });
    dialog.addEventListener('pointerdown',event=>{
      const node=event.target.closest('button');if(!node)return;
      event.preventDefault();
      if(node.dataset.action==='backspace'&&!node.disabled){repeated=false;stopRepeat();repeatTimer=setTimeout(()=>{repeated=true;edit('backspace');repeatInterval=setInterval(()=>edit('backspace'),75);},450);}
    });
    for(const event of ['pointerup','pointercancel','lostpointercapture'])global.addEventListener(event,stopRepeat,true);
    dialog.addEventListener('keydown',event=>{
      event.stopPropagation();
      if(event.key==='Escape'){event.preventDefault();close('dismiss');return;}
      if(event.target!==editor)return;
      if((event.ctrlKey||event.metaKey)&&!event.altKey){
        if(event.key.toLowerCase()==='a'){event.preventDefault();editor.select();}
        else if(event.key.toLowerCase()==='z'){event.preventDefault();undo(event.shiftKey);}
        else if(event.key.toLowerCase()==='y'){event.preventDefault();undo(true);}
        return;
      }
      if(event.altKey||event.isComposing)return;
      if(event.key==='Backspace'||event.key==='Delete'){event.preventDefault();edit(event.key==='Backspace'?'backspace':'delete');}
      else if(event.key==='Enter'){event.preventDefault();runAction('enter');}
      else if(event.key==='Tab'){event.preventDefault();moveField(event.shiftKey?-1:1);}
      else if(event.key.length===1||Array.from(event.key).length===1){event.preventDefault();edit('insert',event.key);}
    });
  }
  function setupEditor(field) {
    const previous=editor;
    editor=make(field.tagName==='TEXTAREA'?'textarea':'input','wf-tk-editor');editor.id='wfTouchKeyboardEditor';
    if(editor.tagName==='INPUT')editor.type=field.type==='password'?'password':'text';else editor.rows=2;
    editor.readOnly=true;editor.inputMode='none';editor.setAttribute('inputmode','none');editor.autocomplete='off';editor.spellcheck=false;
    editor.setAttribute('autocapitalize','off');editor.setAttribute('aria-label',describe(field));editor.placeholder=field.placeholder||'';
    editor.dir=active.numeric||['email','url','tel','password'].includes(field.type)?'ltr':(field.getAttribute('dir')||'auto');
    editor.addEventListener('paste',event=>{event.preventDefault();edit('insert',event.clipboardData?.getData('text/plain')||'');});
    editor.addEventListener('cut',event=>{event.preventDefault();if(field.type==='password')return;event.clipboardData?.setData('text/plain',editor.value.slice(editor.selectionStart,editor.selectionEnd));edit('insert','');});
    if(previous)previous.replaceWith(editor);else doc.getElementById('wfTouchKeyboardEditHost').append(editor);
  }
  function render() {
    if(!active)return;
    dialog.dir=uiLanguage()==='ar'?'rtl':'ltr';dialog.dataset.numeric=String(active.numeric);
    title.textContent=t('title');caption.textContent=active.options.title||describe(active.field);
    const closeButton=dialog.querySelector('[data-action="close"]');closeButton.setAttribute('aria-label',t('close'));closeButton.title=t('close');
    toolbar.replaceChildren(...[['select','▣'],['left','←'],['right','→'],['undo','↶'],['paste',t('paste')],['clear',t('clear')]].map(([action,text])=>button(action,text)));
    toolbar.querySelector('[data-action="undo"]').disabled=!active.undo.length;
    languageBar.setAttribute('aria-label',t('language'));
    languageBar.replaceChildren(...locales.map(language=>{const node=make('button','wf-tk-language',names[language]);node.type='button';node.dataset.language=language;node.lang=language;node.setAttribute('aria-pressed',String(active.language===language));return node;}));
    const rows=[];
    const row=values=>{const node=make('div','wf-tk-row');for(const value of values)node.append(typeof value==='string'?keyButton(value):value);rows.push(node);};
    if(active.numeric){
      row(['7','8','9',button('backspace','⌫')]);row(['4','5','6','-']);row(['1','2','3','.']);row(['0','00',button('clear',t('clear'))]);
      keys.classList.add('wf-tk-number-keys');
    }else{
      keys.classList.remove('wf-tk-number-keys');row(Array.from('1234567890'));
      for(const letters of active.symbols?symbols:layouts[active.language])row(letters.map(value=>active.shift&&!active.symbols?value.toLocaleUpperCase(active.language):value));
      const shift=button('shift','⇧');shift.setAttribute('aria-pressed',String(active.shift));shift.disabled=active.language==='ar'||active.symbols;
      const mode=button('symbols',active.symbols?'ABC':'#+=',active.symbols?'letters':'symbols');
      const space=button('space',t('space'));space.classList.add('wf-tk-space');
      row([shift,mode,keyButton('@'),keyButton('.'),space,button('backspace','⌫'),button('enter','↵')]);
    }
    keys.replaceChildren(...rows);
    footer.replaceChildren(button('previous','‹ '+t('previous')),button('next',t('next')+' ›'),button('done',t(active.search?'search':'done'),active.search?'search':'done'));
    footer.querySelector('[data-action="done"]').classList.add('wf-tk-done');
    for(const [action,step]of [['previous',-1],['next',1]])footer.querySelector('[data-action="'+action+'"]').disabled=!neighbor(step);
  }
  function focusEditor() { if(!active)return;const start=editor.selectionStart,end=editor.selectionEnd;editor.focus({preventScroll:true});editor.setSelectionRange(start,end); }
  function snapshot() { return {value:editor.value,start:editor.selectionStart??editor.value.length,end:editor.selectionEnd??editor.value.length}; }
  function paint(state) { editor.value=state.value;editor.setSelectionRange(state.start,state.end);error.hidden=true; }
  function inputEvent(type,inputType,data,cancelable=false) {
    try{return new InputEvent(type,{bubbles:true,cancelable,inputType,data});}catch(_){return new Event(type,{bubbles:true,cancelable});}
  }
  function publish(result) {
    const session=active,field=source();if(!field||!supports(field)){close('unavailable');return false;}
    const value=active.numeric?numberValue(result.value):result.value;
    if(value===null)return true;
    if(field.value===value)return true;
    if(!field.dispatchEvent(inputEvent('beforeinput',result.inputType,result.data,true)))return false;
    field.value=value;
    if(active.numeric&&value!==''&&field.value==='')field.value=String(Number(value));
    try{field.setSelectionRange(result.start,result.end);}catch(_){}
    session.publishedValue=field.value;
    field.dispatchEvent(inputEvent('input',result.inputType,result.data));
    if(active!==session)return false;
    session.publishedValue=field.value;
    const current=source();
    if(!current){close('unavailable');return false;}
    if(current.value!==value){
      const delta=current.value.length-value.length;
      result.value=current.value;
      result.start=Math.max(0,Math.min(result.value.length,current===field&&typeof current.selectionStart==='number'?current.selectionStart:result.start+delta));
      result.end=Math.max(result.start,Math.min(result.value.length,current===field&&typeof current.selectionEnd==='number'?current.selectionEnd:result.end+delta));
    }
    return true;
  }
  function edit(action,data='') {
    if(!active)return;
    const before=snapshot(),field=source();if(!field){close('unavailable');return;}
    if(active.numeric)data=normalizeNumber(data);
    else if(field.tagName!=='TEXTAREA')data=String(data).replace(/[\r\n]/g,'');
    const result=editText(before,action,data,field.maxLength);
    if(active.numeric&&!/^-?(?:\d*(?:\.\d*)?)(?:[eE][+-]?\d*)?$/.test(result.value))return;
    if(result.value===before.value){paint(result);focusEditor();return;}
    if(!publish(result)||!active)return;
    active.undo.push(before);if(active.undo.length>100)active.undo.shift();active.redo.length=0;
    paint(result);focusEditor();toolbar.querySelector('[data-action="undo"]').disabled=false;
  }
  function undo(redo=false) {
    if(!active)return;const from=redo?active.redo:active.undo,to=redo?active.undo:active.redo;
    if(!from.length)return;
    const before=snapshot(),result={...from[from.length-1],inputType:redo?'historyRedo':'historyUndo',data:null};
    if(!publish(result)||!active)return;from.pop();to.push(before);paint(result);focusEditor();toolbar.querySelector('[data-action="undo"]').disabled=!active.undo.length;
  }
  function neighbor(step) {
    const field=source();if(!field)return null;
    const scope=active.locator.scope?.isConnected?active.locator.scope:field.parentElement;
    const fields=Array.from(scope.querySelectorAll('input,textarea')).filter(node=>supports(node)&&visible(node));
    const index=fields.indexOf(field);return index<0?null:fields[index+step]||null;
  }
  function canCommit() { if(!active?.numeric||numberValue(editor.value)!==null)return true;error.textContent=t('numeric');error.hidden=false;return false; }
  function moveField(step) {
    if(!active||!canCommit())return;
    const next=neighbor(step),locator=next?locate(next):null;
    if(!next){close('done');return;}
    close('next',false);const field=resolve(locator);if(field&&supports(field)&&visible(field))open(field);
  }
  function submit() {
    if(!active||!canCommit())return;
    const field=source(),options=active.options;
    close('submit');
    if(typeof options.onSubmit==='function'){options.onSubmit(field);return;}
    if(!field?.isConnected)return;
    const down=new KeyboardEvent('keydown',{key:'Enter',code:'Enter',bubbles:true,cancelable:true});
    const accepted=field.dispatchEvent(down);field.dispatchEvent(new KeyboardEvent('keyup',{key:'Enter',code:'Enter',bubbles:true}));
    if(field.type==='search')field.dispatchEvent(new Event('search',{bubbles:true}));
    if(accepted&&field.form&&field.isConnected)field.form.requestSubmit?.();
  }
  function runAction(action) {
    if(!active)return;
    if(action==='close'){close('dismiss');return;}
    if(action==='done'){if(canCommit()){if(active.search)submit();else close('done');}return;}
    if(action==='enter'){if(active.field.tagName==='TEXTAREA')edit('insert','\n');else submit();return;}
    if(action==='space'){edit('insert',' ');return;}
    if(action==='backspace'||action==='clear'){edit(action);return;}
    if(action==='select'){editor.select();focusEditor();return;}
    if(action==='undo'){undo();return;}
    if(action==='next'||action==='previous'){moveField(action==='next'?1:-1);return;}
    if(action==='symbols'||action==='shift'){active[action]=!active[action];render();focusEditor();return;}
    if(action==='left'||action==='right'){
      const current=snapshot(),points=boundaries(current.value),back=action==='left';
      const next=current.start!==current.end?(back?current.start:current.end):(back?points.filter(p=>p<current.start).pop()??0:points.find(p=>p>current.end)??current.value.length);
      editor.setSelectionRange(next,next);focusEditor();return;
    }
    if(action==='paste'){
      const session=active;
      if(!global.navigator.clipboard?.readText){error.textContent=t('clipboard');error.hidden=false;return;}
      global.navigator.clipboard.readText().then(value=>{if(active===session)edit('insert',value);},()=>{if(active===session){error.textContent=t('clipboard');error.hidden=false;}});
    }
  }
  function watch(session) {
    const check=()=>{
      if(active!==session)return;
      const field=source();if(!field||!supports(field)||!visible(field))close('navigation');
    };
    session.ancestors=new MutationObserver(check);
    for(let parent=session.field.parentElement;parent&&parent!==doc.body;parent=parent.parentElement)session.ancestors.observe(parent,{attributes:true,attributeFilter:['hidden','class','style','open','inert']});
    session.ancestors.observe(session.field,{attributes:true,attributeFilter:['disabled','readonly','hidden']});
    // Only the active form/container is watched. Added inputs elsewhere require
    // no scanning: pointer/focus delegation discovers them at interaction time.
    const scope=session.locator.scope;
    if(scope&&scope!==doc.body&&scope!==root){session.children=new MutationObserver(()=>{if(active===session&&!session.field.isConnected)check();});session.children.observe(scope,{childList:true,subtree:true});}
  }
  function open(field,options={}) {
    if(typeof field==='string')field=doc.getElementById(field);
    if(!isTouchDevice()||!supports(field)||!visible(field))return false;
    if(active?.field===field){focusEditor();return true;}
    if(active)close('switch',false);
    build();
    const settings={...(registrations.get(field.id)||{}),...(nodeRegistrations.get(field)||{}),...options};
    const locator=locate(field),value=field.value;
    const focused=doc.activeElement===field;
    const start=focused?(field.selectionStart??value.length):value.length,end=focused?(field.selectionEnd??start):value.length;
    active={field,locator,options:settings,initial:value,publishedValue:value,numeric:settings.numeric===true||field.type==='number'||['decimal','numeric'].includes(field.inputMode),search:settings.action==='search'||field.type==='search'||field.enterKeyHint==='search',language:chosenLanguage||uiLanguage(),symbols:false,shift:false,undo:[],redo:[]};
    const session=active;
    settings.onOpen?.(field);
    if(active!==session)return false;
    setupEditor(field);paint({value,start,end});render();root.classList.add('wf-touch-keyboard-open','wf-touch-device');
    // The mirror is readonly from its creation; neither a tap nor a delayed
    // programmatic focus can request the OS keyboard on iOS/Android/Windows.
    const wasReadonly=field.readOnly,previousTransfer=transferField;field.readOnly=true;transferField=field;
    suppressFocus++;
    try { if(!dialog.open)dialog.showModal();focusEditor(); } finally { suppressFocus--;field.readOnly=wasReadonly;transferField=previousTransfer; }
    watch(session);
    // Some fields render their row on blur when showModal moves focus.
    if(!source()){close('unavailable');return false;}
    return true;
  }
  function close(reason='done',restoreFocus=true) {
    if(!active)return false;
    if(reason==='done'&&!canCommit())return false;
    const session=active,field=source();active=null;stopRepeat();session.ancestors?.disconnect();session.children?.disconnect();
    const priorReadonly=field?.readOnly,previousTransfer=transferField;transferField=field;
    if(field)field.readOnly=true;
    suppressFocus++;
    try{
      if(dialog.open)dialog.close();
      if(restoreFocus&&field?.isConnected&&visible(field)){
        // Return focus to the field's context, never to an editable input that
        // would immediately summon a second keyboard after dismissing this one.
        const context=field.parentElement;
        if(context&&!context.closest('[inert]')){const previous=context.getAttribute('tabindex');context.setAttribute('tabindex','-1');context.focus({preventScroll:true});if(previous===null)context.removeAttribute('tabindex');else context.setAttribute('tabindex',previous);}
      } else if(doc.activeElement===field)field.blur();
    }finally{if(field)field.readOnly=priorReadonly;transferField=previousTransfer;suppressFocus--;root.classList.remove('wf-touch-keyboard-open');}
    if(field?.isConnected){
      if(field.value!==session.initial)field.dispatchEvent(new Event('change',{bubbles:true}));
      // Inline custom-value controls use blur rather than change to commit.
      field.dispatchEvent(new FocusEvent('blur',{bubbles:false}));field.dispatchEvent(new FocusEvent('focusout',{bubbles:true}));
    }
    session.options.onClose?.({reason,field});
    return true;
  }
  function finishGesture(current,activate) {
    if(gesture!==current)return;
    gesture=null;
    // Blur while still readonly, so restoring editability after a pan cannot
    // wake the system keyboard. No pointer/touch pan event is cancelled.
    const previousTransfer=transferField;transferField=current.field;suppressFocus++;
    try{current.field.blur();current.field.readOnly=current.readOnly;}finally{suppressFocus--;transferField=previousTransfer;}
    if(!activate){ignoredClick=current.field;ignoreClickUntil=Date.now()+500;return;}
    const field=resolve(current.locator);
    if(field&&open(field))lastIntercept=field;
  }
  function beginGesture(event) {
    if(event.pointerType==='touch'||event.type==='touchstart')observedTouch=true;
    if(!isTouchDevice()||event.button>0||suppressFocus)return;
    if(gesture)finishGesture(gesture,false);
    ignoredClick=null;
    const field=targetField(event.target);if(!field)return;
    const point=event.changedTouches?.[0]||event;
    gesture={field,locator:locate(field),readOnly:field.readOnly,x:point.clientX||0,y:point.clientY||0,pointerId:event.pointerId,moved:false};
    field.readOnly=true;
  }
  function moveGesture(event) {
    if(!gesture||event.pointerId!==undefined&&gesture.pointerId!==event.pointerId)return;
    const point=event.changedTouches?.[0]||event;
    if(Math.abs((point.clientX||0)-gesture.x)>10||Math.abs((point.clientY||0)-gesture.y)>10)gesture.moved=true;
  }
  function endGesture(event) {
    if(!gesture||event.pointerId!==undefined&&gesture.pointerId!==event.pointerId)return;
    moveGesture(event);const current=gesture;
    if(current.moved){finishGesture(current,false);return;}
    // A normal click arrives before the next frame. The frame also covers
    // browsers that omit the compatibility click for a readonly input.
    current.ended=true;requestAnimationFrame(()=>finishGesture(current,true));
  }
  doc.addEventListener('pointerdown',beginGesture,true);
  doc.addEventListener('pointermove',moveGesture,{capture:true,passive:true});
  doc.addEventListener('pointerup',endGesture,true);
  doc.addEventListener('pointercancel',()=>{if(gesture)finishGesture(gesture,false);},true);
  // Covers Safari versions without PointerEvent; all pan listeners are passive.
  if(!global.PointerEvent){
    doc.addEventListener('touchstart',beginGesture,{capture:true,passive:true});
    doc.addEventListener('touchmove',moveGesture,{capture:true,passive:true});
    doc.addEventListener('touchend',endGesture,{capture:true,passive:true});
    doc.addEventListener('touchcancel',()=>{if(gesture)finishGesture(gesture,false);},{capture:true,passive:true});
  }
  doc.addEventListener('click',event=>{
    if(!isTouchDevice()||suppressFocus||dialog?.contains(event.target))return;
    const node=event.target?.nodeType===1?event.target:event.target?.parentElement;
    const rawField=node?.tagName==='INPUT'||node?.tagName==='TEXTAREA'?node:node?.closest('label')?.control;
    if(gesture&&rawField===gesture.field){
      event.preventDefault();event.stopImmediatePropagation();finishGesture(gesture,!gesture.moved);return;
    }
    if(ignoredClick===rawField&&Date.now()<ignoreClickUntil&&event.detail!==0){event.preventDefault();event.stopImmediatePropagation();return;}
    const field=targetField(event.target);if(!field)return;
    if(lastIntercept===field&&active?.field===field){event.preventDefault();event.stopImmediatePropagation();return;}
    if(open(field)){lastIntercept=field;event.preventDefault();event.stopImmediatePropagation();}
  },true);
  // Readonly source fields can still receive native focus during a tap. Their
  // blur-only draft handlers belong to the final commit, not this transfer.
  for(const type of ['blur','focusout'])doc.addEventListener(type,event=>{if(event.target===transferField)event.stopImmediatePropagation();},true);
  doc.addEventListener('focusin',event=>{
    if(dialog?.contains(event.target)){event.stopPropagation();return;}
    if(suppressFocus||!isTouchDevice())return;
    const field=targetField(event.target);if(!field)return;
    // Focus can be requested by existing search buttons and validation code.
    // Suppress native input before leaving this focus event, then show our pad.
    const locator=locate(field),readonly=field.readOnly,previousTransfer=transferField;transferField=field;field.readOnly=true;
    try{field.blur();}finally{field.readOnly=readonly;transferField=previousTransfer;}
    cancelAnimationFrame(focusFrame);focusFrame=requestAnimationFrame(()=>{const current=resolve(locator);if(supports(current)&&visible(current))open(current);});
  },true);
  global.addEventListener('pagehide',()=>{if(gesture)finishGesture(gesture,false);close('navigation',false);});
  global.addEventListener('popstate',()=>close('navigation',false));
  new MutationObserver(()=>{if(active)render();}).observe(root,{attributes:true,attributeFilter:['lang']});
  if(isTouchDevice())root.classList.add('wf-touch-device');
  global.WFTouchKeyboard={
    open,close,isTouchDevice,
    register(field,options){if(typeof field==='string')registrations.set(field,options);else if(field)nodeRegistrations.set(field,options);},
    get isOpen(){return !!active;},get activeField(){return active?.field||null;}
  };
  // Keep the scanner's existing camera lifecycle and search action. Register by
  // ID so recreated controls retain the same behavior without new listeners.
  global.WFTouchKeyboard.register('qblInput',{
    action:'search',
    onOpen(){global.qblEnableSound?.();global.qblStopCamera?.();},
    onSubmit(){global.searchQbl?.();},
    onClose({reason}){
      if(!['dismiss','done'].includes(reason)||doc.hidden||global.WFTouchKeyboard.isOpen)return;
      if(typeof QBL==='object'&&QBL.phase===1&&typeof qblDropdownOpen!=='undefined'&&!qblDropdownOpen&&global.getCurrentPage?.()==='quick-barcode')global.qblStartCamera?.();
    }
  });
  // currency-calculator.js deliberately uses a text input for partial decimals.
  global.WFTouchKeyboard.register('ccInput',{numeric:true});
  // These apparent text fields are existing option pickers. Their separate
  // custom-value inputs are ordinary editable fields and use the shared pad.
  for(const id of ['prHsCode','prDesc']){
    global.WFTouchKeyboard.register(id,{picker:true});
    const field=doc.getElementById(id);if(field&&isTouchDevice())field.readOnly=true;
  }
})(typeof window!=='undefined'?window:null);
