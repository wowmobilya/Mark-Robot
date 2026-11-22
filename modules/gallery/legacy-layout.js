(function(root,factory){
  'use strict';
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.WFGalleryLegacyLayout=factory();
})(typeof window==='object'?window:globalThis,function(){
  'use strict';
  const projectRef='sldthbnigivpsqixccah';
  const sections=[['home_cards','cards',40],['hero_slider','slides',40],['dimension_fields','fields',100]];
  const sourceImages=new Map([
    ["https://static.wixstatic.com/media/42e4ec_7557d3da2f9e4a2a8816339de74659b2~mv2.jpg/v1/fill/w_750,h_562,al_c,q_85,usm_0.66_1.00_0.01,enc_auto/%D8%B5%D9%88%D8%B1%D8%A9%20%D9%88%D8%A7%D8%AA%D8%B3%D8%A7%D8%A8%20%D8%A8%D8%AA%D8%A7%D8%B1%D9%8A%D8%AE%201447-05-21%20%D9%81%D9%8A%2016_52_edited.jpg", "tv-card"],
    ["https://static.wixstatic.com/media/42e4ec_f3e0eda2c9564c5f95529b02c0046660~mv2.jpg/v1/fill/w_824,h_618,al_c,q_85,usm_0.66_1.00_0.01,enc_auto/IMG_20251019_150626_edited.jpg", "orta-card"],
    ["https://static.wixstatic.com/media/42e4ec_8d4e6ca411db4107957248517ed332a4~mv2.png/v1/fill/w_1400,h_718,al_c,q_90,enc_avif,quality_auto/WhatsApp%20G%C3%B6rsel%202024-09-21%20saat%2018_edited.png", "orders-card"],
    ["https://static.wixstatic.com/media/42e4ec_497547faea6641019e1ece74652f9f0c~mv2.jpg/v1/fill/w_824,h_618,al_c,q_85,usm_0.66_1.00_0.01,enc_auto/Photoroom-20260127_160720150_edited.jpg", "dresuar-card"],
    ["https://static.wixstatic.com/media/42e4ec_7557d3da2f9e4a2a8816339de74659b2~mv2.jpg", "tv-slide"],
    ["https://static.wixstatic.com/media/42e4ec_f3e0eda2c9564c5f95529b02c0046660~mv2.jpg", "orta-slide"],
    ["https://static.wixstatic.com/media/42e4ec_497547faea6641019e1ece74652f9f0c~mv2.jpg", "dresuar-slide"]
  ]);
  const bundledImages=new Set([...sourceImages.values(),'inventory-3']);
  function imagePath(name){return bundledImages.has(name)?'assets/galeri-tr/'+name+'.webp':null;}
  const icons=new Map([['fa-arrows-alt-h','length'],['fa-arrows-alt-v','width'],['fa-sort-amount-up','height'],['fa-weight-hanging','weight'],['fa-box-open','box']]);
  const privateSections=new Set(['admin','user_preview','messages','users_panel','stock_panel','settings','accounting_external','my_files','admin_accounts']);
  const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
  function invalid(){throw Error('INVALID_GALERI_LAYOUT');}
  function text(value,max){
    if(value==null)return '';
    if(typeof value!=='string')invalid();
    const result=value.trim().normalize('NFC');
    if([...result].length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(result))invalid();
    return result;
  }
  function layoutId(kind,id){
    if(Number.isSafeInteger(id))return 'galeri-'+kind+'-n-'+id;
    if(typeof id==='string'&&/^[A-Za-z0-9_-]{1,45}$/.test(id))return 'galeri-'+kind+'-s-'+id;
    invalid();
  }
  function normalized(row,kind){
    if(kind==='fields'){
      const id=text(row.field_key,70),label=text(row.field_label,80);
      if(!/^[A-Za-z0-9_-]+$/.test(id)||['__proto__','constructor','prototype'].includes(id)||!label||typeof row.is_visible!=='boolean')invalid();
      return {id,label,unit:text(row.field_unit,30),visible:row.is_visible,icon:icons.get(row.icon)||'ruler'};
    }
    const title=text(row.title,120),collection=text(kind==='cards'?row.section_key:row.link_section,80);
    if(!title||typeof row.is_active!=='boolean'||privateSections.has(collection))invalid();
    const legacyImage=sourceImages.get(row.image_url);
    return {id:layoutId(kind,row.id),title,subtitle:text(row.subtitle,160),description:text(row.description,400),
      countLabel:kind==='cards'?text(row.count_label,60):'',buttonText:kind==='cards'?text(row.btn_text,80):'',
      priceLabel:kind==='slides'?text(row.price,80):'',collection,imageId:null,...(legacyImage?{legacyImage}:{}),visible:row.is_active&&(!row.image_url||!!legacyImage)};
  }
  function preview(source,settings){
    if(!plain(source)||source.projectRef!==projectRef||!plain(source.tables)||!plain(source.counts)||!plain(settings))invalid();
    const result={value:{...settings},added:{cards:0,slides:0,fields:0},retained:0,conflicts:0,mediaPending:0,duplicates:0};
    let included=false;
    for(const [table,kind,max] of sections){
      if(!Object.hasOwn(source.tables,table))continue;
      included=true;
      const rows=source.tables[table],current=settings[kind]??[];
      if(!Array.isArray(rows)||rows.length>10000||source.counts[table]!==rows.length||!Array.isArray(current))invalid();
      const prev=new Map(current.map(item=>[item.id,item])),next=[...current],staged=[],seen=new Set(),cardGroups=new Map();
      for(const row of rows){
        if(!plain(row)||!Number.isSafeInteger(row.order_num))invalid();
        let entry;
        try{entry=normalized(row,kind);}catch{result.conflicts++;continue;}
        if(seen.has(entry.id))invalid();
        seen.add(entry.id);
        const candidate={entry,order:row.order_num,needsImage:kind!=='fields'&&!!row.image_url&&!entry.legacyImage};
        if(kind!=='cards'){staged.push(candidate);continue;}
        const {id,...content}=entry;
        const signature=JSON.stringify([content,row.image_url||'',row.is_active]);
        if(!cardGroups.has(signature))cardGroups.set(signature,[]);
        cardGroups.get(signature).push(candidate);
      }
      for(const group of cardGroups.values()){
        const frequency=new Map();
        for(const row of group)frequency.set(row.order,(frequency.get(row.order)||0)+1);
        // Preserve the prevalent source order when historical seed runs disagree.
        group.sort((a,b)=>frequency.get(b.order)-frequency.get(a.order)||a.order-b.order||a.entry.id.localeCompare(b.entry.id,'en',{numeric:true}));
        staged.push(group[0]);result.duplicates+=group.length-1;
      }
      staged.sort((a,b)=>a.order-b.order||a.entry.id.localeCompare(b.entry.id,'en'));
      for(const {entry,needsImage} of staged){
        const prior=prev.get(entry.id);
        if(prior){
          if(Object.keys(entry).every(k=>prior[k]===entry[k]))result.retained++;
          else result.conflicts++;
          continue;
        }
        if(next.length>=max){result.conflicts++;continue;}
        next.push(entry);result.added[kind]++;
        if(needsImage)result.mediaPending++;
      }
      result.value[kind]=next;
    }
    if(!included)invalid();
    return result;
  }
  return Object.freeze({preview,imagePath});
});
