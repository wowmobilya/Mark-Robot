/* Shared in-app color chooser. Existing fields own their save transactions;
 * draft previews never dispatch input/change or write to persistent storage. */
(function (root) {
  'use strict';
  const clamp=(value,min,max)=>Math.min(max,Math.max(min,Number(value)||0));
  function normalizeHex(value){
    if(typeof value!=='string')return null;
    const match=/^#?([\da-f]{3}|[\da-f]{6})$/i.exec(value.trim());
    if(!match)return null;
    const digits=match[1].toLowerCase();
    return '#'+(digits.length===3?[...digits].map(char=>char+char).join(''):digits);
  }
  function hexToHsv(value){
    const color=normalizeHex(value)||'#000000';
    const [r,g,b]=color.slice(1).match(/../g).map(part=>parseInt(part,16)/255);
    const max=Math.max(r,g,b),min=Math.min(r,g,b),delta=max-min;
    let h=0;
    if(delta)h=60*(max===r?((g-b)/delta)%6:max===g?(b-r)/delta+2:(r-g)/delta+4);
    return {h:(h+360)%360,s:max?delta/max*100:0,v:max*100};
  }
  function hsvToHex({h=0,s=0,v=0}={}){
    h=((Number(h)||0)%360+360)%360;s=clamp(s,0,100)/100;v=clamp(v,0,100)/100;
    const c=v*s,x=c*(1-Math.abs((h/60)%2-1)),m=v-c;
    const rgb=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];
    return '#'+rgb.map(channel=>Math.round((channel+m)*255).toString(16).padStart(2,'0')).join('');
  }
  function contrastText(value){
    const luminance=hex=>normalizeHex(hex).slice(1).match(/../g).map(part=>parseInt(part,16)/255)
      .map(channel=>channel<=.04045?channel/12.92:((channel+.055)/1.055)**2.4)
      .reduce((sum,channel,index)=>sum+channel*[.2126,.7152,.0722][index],0);
    const light=luminance(value),dark=luminance('#172c37');
    return (Math.max(light,dark)+.05)/(Math.min(light,dark)+.05)>=1.05/(light+.05)?'#172c37':'#ffffff';
  }
  const core={normalizeHex,hexToHsv,hsvToHex};
  if(typeof module==='object'&&module.exports){module.exports=core;return;}
  const doc=root.document;
  if(!doc||root.WFColorPicker)return;

  const locales=['ar','en','tr','fr','ru'];
  const copy={
    title:['اختيار اللون','Choose a color','Renk seçin','Choisir une couleur','Выберите цвет'],
    choose:['تعديل اللون','Edit color','Rengi düzenle','Modifier la couleur','Изменить цвет'],
    close:['إغلاق','Close','Kapat','Fermer','Закрыть'],
    cancel:['إلغاء','Cancel','İptal','Annuler','Отмена'],
    apply:['اعتماد اللون','Apply color','Rengi uygula','Appliquer la couleur','Применить цвет'],
    current:['اللون الحالي','Current color','Geçerli renk','Couleur actuelle','Текущий цвет'],
    next:['المعاينة','Preview','Önizleme','Aperçu','Предпросмотр'],
    reset:['العودة إلى اللون الحالي','Restore current color','Geçerli renge dön','Revenir à la couleur actuelle','Вернуть текущий цвет'],
    hue:['درجة اللون','Hue','Renk tonu','Teinte','Цветовой тон'],
    saturation:['التشبّع','Saturation','Doygunluk','Saturation','Насыщенность'],
    brightness:['السطوع','Brightness','Parlaklık','Luminosité','Яркость'],
    plane:['اختيار التشبّع والسطوع','Choose saturation and brightness','Doygunluk ve parlaklık seçin','Choisir saturation et luminosité','Выберите насыщенность и яркость'],
    planeHelp:['اسحب لاختيار اللون، أو استخدم الأسهم. Shift يغيّر القيمة بخطوة أكبر.','Drag to choose, or use arrow keys. Hold Shift for larger steps.','Sürükleyin veya ok tuşlarını kullanın. Büyük adımlar için Shift basılı tutun.','Faites glisser ou utilisez les flèches. Maj agrandit les pas.','Перетаскивайте или используйте стрелки. Shift увеличивает шаг.'],
    precise:['ضبط دقيق','Fine adjustment','Hassas ayar','Réglage précis','Точная настройка'],
    palette:['ألوان مقترحة','Suggested colors','Önerilen renkler','Couleurs proposées','Предлагаемые цвета'],
    brand:['لون البرنامج','App color','Uygulama rengi','Couleur de l’application','Цвет приложения'],
    hex:['رمز اللون HEX','HEX color code','HEX renk kodu','Code couleur HEX','Код цвета HEX'],
    invalid:['أدخل رمزًا صحيحًا من 3 أو 6 خانات، مثل ‎#3F7C94.','Enter a valid 3- or 6-digit code, such as #3F7C94.','Örneğin #3F7C94 gibi 3 veya 6 haneli geçerli bir kod girin.','Saisissez un code valide de 3 ou 6 caractères, tel que #3F7C94.','Введите код из 3 или 6 знаков, например #3F7C94.'],
    hint:['المعاينة مؤقتة حتى تضغط «اعتماد اللون».','Preview is temporary until you apply the color.','Önizleme, rengi uygulayana kadar geçicidir.','L’aperçu reste temporaire jusqu’à l’application.','Предпросмотр временный, пока вы не примените цвет.']
  };
  const language=()=>Math.max(0,locales.indexOf((doc.documentElement.lang||'en').split('-')[0]));
  const t=key=>copy[key][language()];
  const node=(tag,className,text)=>{const value=doc.createElement(tag);if(className)value.className=className;if(text)value.textContent=text;return value;};
  const textNodes=[];
  const translated=(tag,key,className)=>{const value=node(tag,className);textNodes.push([value,key]);return value;};
  const icon=(path)=>{const span=node('span','wf-color-icon');span.setAttribute('aria-hidden','true');span.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+path+'</svg>';return span;};
  const button=(className)=>{const value=node('button',className);value.type='button';return value;};
  const bindings=new Map();let session=null,nextId=0,pointerId=null;
  const dialog=node('dialog','wf-color-dialog');dialog.id='wfColorPickerDialog';
  dialog.setAttribute('aria-labelledby','wfColorPickerTitle');
  dialog.setAttribute('aria-describedby','wfColorPickerHint');
  const header=node('header','wf-color-header'),heading=node('div','wf-color-heading');
  const title=translated('h2','title');title.id='wfColorPickerTitle';
  const context=node('p','wf-color-context');heading.append(title,context);
  const close=button('wf-color-close');close.append(icon('<path d="m6 6 12 12M18 6 6 18"/>'));
  header.append(heading,close);
  const body=node('div','wf-color-body'),previews=node('div','wf-color-previews');
  const current=button('wf-color-preview wf-color-current'),next=node('div','wf-color-preview');
  const currentLabel=translated('small','current'),nextLabel=translated('small','next');
  const currentHex=node('bdi'),nextHex=node('bdi');
  current.append(currentLabel,currentHex);next.append(nextLabel,nextHex);previews.append(current,next);
  const plane=node('div','wf-color-plane');plane.id='wfColorPlane';plane.tabIndex=0;
  plane.setAttribute('role','group');plane.setAttribute('aria-describedby','wfColorPlaneHelp wfColorCoordinates');plane.dir='ltr';
  const cursor=node('span','wf-color-cursor');cursor.setAttribute('aria-hidden','true');plane.append(cursor);
  const planeHelp=translated('p','planeHelp','wf-color-visually-hidden');planeHelp.id='wfColorPlaneHelp';
  const coordinates=node('output','wf-color-visually-hidden');coordinates.id='wfColorCoordinates';
  function range(key,id,max){
    const group=node('div','wf-color-range-group'),row=node('div','wf-color-range-heading');
    const label=translated('label',key);label.htmlFor=id;
    const output=node('output');output.htmlFor=id;row.append(label,output);
    const input=node('input','wf-color-range');input.type='range';input.id=id;input.min=0;input.max=max;input.step=1;input.dir='ltr';
    group.append(row,input);return {group,input,output};
  }
  const hue=range('hue','wfColorHue',360);hue.input.classList.add('wf-color-hue');
  const precise=node('details','wf-color-precise');precise.append(translated('summary','precise'));
  const saturation=range('saturation','wfColorSaturation',100),brightness=range('brightness','wfColorBrightness',100);
  const preciseBody=node('div','wf-color-precise-body');preciseBody.append(saturation.group,brightness.group);precise.append(preciseBody);
  const paletteGroup=node('section','wf-color-palette-group'),paletteLabel=translated('h3','palette');paletteLabel.id='wfColorPaletteLabel';
  const palette=node('div','wf-color-palette');palette.setAttribute('role','group');palette.setAttribute('aria-labelledby',paletteLabel.id);paletteGroup.append(paletteLabel,palette);
  const hexGroup=node('div','wf-color-hex-group'),hexLabel=translated('label','hex');hexLabel.htmlFor='wfColorHex';
  const hex=node('input','wf-color-hex');hex.type='text';hex.id='wfColorHex';hex.dir='ltr';hex.maxLength=7;hex.autocomplete='off';hex.spellcheck=false;hex.setAttribute('autocapitalize','characters');
  const error=translated('p','invalid','wf-color-error');error.id='wfColorError';error.hidden=true;error.setAttribute('role','alert');hex.setAttribute('aria-describedby',error.id);
  hexGroup.append(hexLabel,hex,error);
  const hint=translated('p','hint','wf-color-hint');hint.id='wfColorPickerHint';
  body.append(previews,plane,planeHelp,coordinates,hue.group,precise,paletteGroup,hexGroup,hint);
  const footer=node('footer','wf-color-footer');
  const cancel=button('wf-color-action wf-color-cancel'),apply=button('wf-color-action wf-color-apply');
  textNodes.push([cancel,'cancel'],[apply,'apply']);footer.append(cancel,apply);dialog.append(header,body,footer);doc.body.append(dialog);

  function sourceLabel(input){return input.getAttribute('aria-label')||[...input.labels||[]].map(label=>label.textContent.trim()).filter(Boolean).join(' ')||t('choose');}
  function sync(binding){
    const {input,trigger,chip,value}=binding;
    trigger.hidden=input.hidden||input.style.display==='none';trigger.disabled=input.disabled;
    const color=normalizeHex(input.value)||'#000000';chip.style.background=color;value.textContent=color.toUpperCase();
    trigger.setAttribute('aria-label',sourceLabel(input)+' · '+color.toUpperCase());trigger.title=t('choose');
    if(input.getAttribute('aria-describedby'))trigger.setAttribute('aria-describedby',input.getAttribute('aria-describedby'));
  }
  function syncAll(){for(const binding of bindings.values())sync(binding);}
  function paintPreview(target,color){target.style.background=color;target.style.color=contrastText(color);}
  function invalid(value){hex.setAttribute('aria-invalid',String(value));error.hidden=!value;apply.disabled=value;}
  function render({keepHex=false}={}){
    if(!session)return;
    const {value,hsv,opening}=session;
    plane.style.setProperty('--wf-color-hue',hsvToHex({h:hsv.h,s:100,v:100}));
    cursor.style.left=hsv.s+'%';cursor.style.top=(100-hsv.v)+'%';
    hue.input.value=Math.round(hsv.h);hue.output.textContent=Math.round(hsv.h)+'°';
    saturation.input.value=Math.round(hsv.s);saturation.output.textContent=Math.round(hsv.s)+'%';
    brightness.input.value=Math.round(hsv.v);brightness.output.textContent=Math.round(hsv.v)+'%';
    coordinates.textContent=t('saturation')+' '+Math.round(hsv.s)+'%, '+t('brightness')+' '+Math.round(hsv.v)+'%';
    paintPreview(current,opening);paintPreview(next,value);currentHex.textContent=opening.toUpperCase();nextHex.textContent=value.toUpperCase();
    if(!keepHex)hex.value=value.toUpperCase();
    invalid(false);
    for(const swatch of palette.children)swatch.setAttribute('aria-pressed',String(swatch.dataset.color===value));
    session.preview?.(value);
  }
  function select(value,options){
    if(!session)return;
    const color=normalizeHex(value);if(!color)return;
    session.value=color;session.hsv=hexToHsv(color);render(options);
  }
  function selectHsv(){session.value=hsvToHex(session.hsv);render();}
  function brandColor(){
    const probe=node('span');probe.style.color='var(--brand-primary, #3f7c94)';probe.style.display='none';dialog.append(probe);
    const computed=root.getComputedStyle(probe).color;probe.remove();
    const rgb=/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/.exec(computed);
    return normalizeHex(computed)||(rgb?'#'+rgb.slice(1).map(part=>Math.round(clamp(part,0,255)).toString(16).padStart(2,'0')).join(''):'#3f7c94');
  }
  function renderPalette(){
    const accent=brandColor();palette.replaceChildren();
    for(const color of new Set([accent,'#315c6e','#8eb9c9','#dcebf0','#ffffff','#172c37','#c8a96e','#f6f0e4','#3b7a64','#855d7f','#a66b58','#dadfe3'])){
      const swatch=button('wf-color-swatch');swatch.dataset.color=color;swatch.style.setProperty('--wf-swatch',color);
      swatch.setAttribute('aria-label',(color===accent?t('brand')+' · ':'')+color.toUpperCase());swatch.title=swatch.getAttribute('aria-label');
      swatch.append(icon('<path d="m6 12 4 4 8-8"/>'));swatch.style.color=contrastText(color);
      swatch.addEventListener('click',()=>select(color));palette.append(swatch);
    }
  }
  function translate(){
    for(const [element,key]of textNodes)element.textContent=t(key);
    close.setAttribute('aria-label',t('close'));current.setAttribute('aria-label',t('reset'));plane.setAttribute('aria-label',t('plane'));
    if(session){
      const unfinished=!normalizeHex(hex.value);
      context.textContent=session.title||sourceLabel(session.input);renderPalette();render({keepHex:true});
      if(unfinished)invalid(true);
    }
    syncAll();
  }
  function safeVisualPreview(input){
    // The branding input owns a draft and dirty bit. Preview only its rendered
    // background; its existing input handler runs once, on Apply.
    const target=input.id==='wfCompanyLogoBackground'?doc.getElementById('settingsLogoPrev'):null;
    if(!target)return {};
    const value=target.style.getPropertyValue('background'),priority=target.style.getPropertyPriority('background');
    return {preview:color=>target.style.setProperty('background',color,'important'),
      restore:()=>value?target.style.setProperty('background',value,priority):target.style.removeProperty('background')};
  }
  function finish(commit){
    if(!session)return;
    const previous=session;session=null;pointerId=null;previous.restore?.();
    if(commit&&previous.value!==previous.opening&&previous.input.isConnected&&!previous.input.disabled){
      previous.input.value=previous.value;
      previous.input.dispatchEvent(new Event('input',{bubbles:true}));
      previous.input.dispatchEvent(new Event('change',{bubbles:true}));
    }
    if(dialog.open)dialog.close(commit?'apply':'cancel');
    syncAll();
    if(previous.opener?.isConnected&&!previous.opener.closest('[inert]'))previous.opener.focus({preventScroll:true});
  }
  function open(input,options={}){
    if(typeof input==='string')input=doc.getElementById(input);
    if(!input||input.type!=='color'||input.disabled||!input.isConnected)return false;
    if(session)finish(false);
    enhance(input);
    const opening=normalizeHex(input.value)||'#000000',visual=safeVisualPreview(input);
    session={input,opening,value:opening,hsv:hexToHsv(opening),opener:options.opener||bindings.get(input)?.trigger||doc.activeElement,title:options.title,...visual};
    precise.open=false;hex.value=opening.toUpperCase();translate();
    dialog.showModal();body.scrollTop=0;close.focus({preventScroll:true});return true;
  }
  function enhance(scope=doc){
    const inputs=[...(scope.matches?.('input[type="color"]')?[scope]:[]),...scope.querySelectorAll?.('input[type="color"]')||[]];
    for(const input of inputs){
      if(bindings.has(input)){const binding=bindings.get(input);if(input.nextElementSibling!==binding.trigger)input.after(binding.trigger);sync(binding);continue;}
      if(!input.id)input.id='wfColorSource'+(++nextId);
      const trigger=button('wf-color-trigger');trigger.id=input.id+'Picker';trigger.dataset.wfColorFor=input.id;
      trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-controls',dialog.id);
      const chip=node('span','wf-color-trigger-chip');chip.setAttribute('aria-hidden','true');
      const value=node('bdi','wf-color-trigger-value');value.setAttribute('aria-hidden','true');
      trigger.append(chip,value,icon('<path d="m14 5 5 5M4 20l4-1L20 7a2 2 0 0 0-3-3L5 16Z"/>'));
      input.classList.add('wf-color-native');input.tabIndex=-1;input.setAttribute('aria-hidden','true');input.after(trigger);
      const binding={input,trigger,chip,value};bindings.set(input,binding);
      trigger.addEventListener('click',()=>open(input,{opener:trigger}));
      input.addEventListener('input',()=>sync(binding));input.addEventListener('change',()=>sync(binding));
      const observer=new MutationObserver(()=>sync(binding));observer.observe(input,{attributes:true,attributeFilter:['hidden','disabled','value','aria-label','style']});binding.observer=observer;
      sync(binding);
    }
  }
  close.addEventListener('click',()=>finish(false));cancel.addEventListener('click',()=>finish(false));
  apply.addEventListener('click',()=>{if(session&&!apply.disabled)finish(true);});
  current.addEventListener('click',()=>{if(session)select(session.opening);});
  dialog.addEventListener('cancel',event=>{event.preventDefault();event.stopPropagation();finish(false);});
  dialog.addEventListener('close',()=>{if(session&&!dialog.open)finish(false);});
  dialog.addEventListener('keydown',event=>{
    if(event.key==='Escape')event.stopPropagation();
    if(event.key==='Enter'&&event.target===hex){event.preventDefault();if(!apply.disabled)finish(true);}
  });
  hex.addEventListener('input',()=>{const color=normalizeHex(hex.value);if(color)select(color,{keepHex:true});else invalid(true);});
  for(const [field,key]of [[hue,'h'],[saturation,'s'],[brightness,'v']])field.input.addEventListener('input',()=>{if(session){session.hsv[key]=Number(field.input.value);selectHsv();}});
  function move(event){
    if(!session)return;
    const rect=plane.getBoundingClientRect();if(!rect.width||!rect.height)return;
    session.hsv.s=clamp((event.clientX-rect.left)/rect.width*100,0,100);
    session.hsv.v=clamp(100-(event.clientY-rect.top)/rect.height*100,0,100);selectHsv();
  }
  plane.addEventListener('pointerdown',event=>{if(event.button!==0)return;event.preventDefault();plane.focus({preventScroll:true});pointerId=event.pointerId;plane.setPointerCapture(pointerId);move(event);});
  plane.addEventListener('pointermove',event=>{if(event.pointerId===pointerId)move(event);});
  const endPointer=event=>{if(event.pointerId===pointerId)pointerId=null;};
  plane.addEventListener('pointerup',endPointer);plane.addEventListener('pointercancel',endPointer);plane.addEventListener('lostpointercapture',endPointer);
  plane.addEventListener('keydown',event=>{
    if(!session)return;
    const step=event.shiftKey?10:1,{hsv}=session;
    if(event.key==='ArrowLeft')hsv.s=clamp(hsv.s-step,0,100);
    else if(event.key==='ArrowRight')hsv.s=clamp(hsv.s+step,0,100);
    else if(event.key==='ArrowUp')hsv.v=clamp(hsv.v+step,0,100);
    else if(event.key==='ArrowDown')hsv.v=clamp(hsv.v-step,0,100);
    else if(event.key==='Home')hsv.s=0;
    else if(event.key==='End')hsv.s=100;
    else return;
    event.preventDefault();selectHsv();
  });
  // Programmatic .click() and associated label clicks use the same themed UI.
  doc.addEventListener('click',event=>{
    let input=event.target.closest?.('input[type="color"]');
    if(!input){const label=event.target.closest?.('label');if(label?.control?.type==='color')input=label.control;}
    if(!input)return;event.preventDefault();event.stopImmediatePropagation();open(input);
  },true);
  doc.addEventListener('close',event=>{if(session&&event.target!==dialog&&event.target.contains?.(session.input))finish(false);},true);
  new MutationObserver(translate).observe(doc.documentElement,{attributes:true,attributeFilter:['lang']});
  new MutationObserver(records=>{
    for(const record of records){
      if(record.type==='attributes'){syncAll();continue;}
      for(const child of record.addedNodes)if(child.nodeType===1&&!dialog.contains(child))enhance(child);
    }
    for(const [input,binding]of bindings)if(!input.isConnected){binding.observer.disconnect();binding.trigger.remove();bindings.delete(input);if(session?.input===input)finish(false);}
  }).observe(doc.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open']});
  root.WFColorPicker=Object.freeze({open,close:()=>finish(false),enhance,...core});
  translate();enhance();
})(typeof window!=='undefined'?window:globalThis);
