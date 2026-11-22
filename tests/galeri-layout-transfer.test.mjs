import test from 'node:test';
import assert from 'node:assert/strict';
import layout from '../modules/gallery/legacy-layout.js';
import {validateGalleryAction} from '../supabase/functions/wow-cloud/modules/gallery.mjs';
import {randomUUID} from 'node:crypto';

const projectRef='sldthbnigivpsqixccah';
function source(tables){
 return {projectRef,tables,counts:Object.fromEntries(Object.entries(tables).map(([name,rows])=>[name,rows.length]))};
}
function card(id,order_num,section_key){
 return {id,order_num,section_key,title:section_key,subtitle:'',description:'',count_label:'',btn_text:'',is_active:true};
}
test('legacy layout preserves native settings, order, collection targets and visibility',()=>{
 const current={version:7,cards:[{id:'existing',title:'Native',visible:true}],slides:[],fields:[]};
 const original=structuredClone(current);
 const data=source({
   home_cards:[card('1',20,'Consoles'),{...card(1,10,'TV'),image_url:'https://source.invalid/old.jpg'},card(3,30,'users_panel')],
   hero_slider:[{id:9,order_num:1,title:'Living room',price:'₺',link_section:'TV',is_active:false}],
   dimension_fields:[{field_key:'kg',field_label:'Ağırlık',field_unit:'kg',order_num:5,icon:'fa-weight-hanging',is_visible:false}]
 });
 const result=layout.preview(data,current);
 assert.deepEqual(current,original);
 assert.equal(result.value.version,7);
 assert.deepEqual(result.value.cards.map(x=>x.title),['Native','TV','Consoles']);
 assert.equal(result.value.cards[1].visible,false);
 assert.equal(result.value.cards[1].imageId,null);
 assert.equal(result.value.slides[0].collection,'TV');
 assert.equal(result.value.fields[0].visible,false);
 assert.deepEqual(result.added,{cards:2,slides:1,fields:1});
 assert.equal(result.mediaPending,1);assert.equal(result.conflicts,1);
 assert(!JSON.stringify(result).includes('source.invalid'));
 validateGalleryAction('gallery.presentation',{commandId:randomUUID(),version:7,value:result.value});
 const again=layout.preview(data,result.value);
 assert.deepEqual(again.value,result.value);
 assert.equal(again.retained,4);
 const edited=structuredClone(result.value);
 edited.cards[1].title='Edited';
 const repeat=layout.preview(data,edited);
 assert.deepEqual(repeat.value,edited);assert.equal(repeat.conflicts,2);
});
test('layout rejects an incomplete source count, duplicate typed key and wrong project',()=>{
 const data=source({home_cards:[card(1,5,'TV')]});
 assert.throws(()=>layout.preview({...data,projectRef:'other'},{}));
 assert.throws(()=>layout.preview({...data,counts:{}},{}));
 assert.throws(()=>layout.preview(source({home_cards:[...data.tables.home_cards,...data.tables.home_cards]}),{}));
});
