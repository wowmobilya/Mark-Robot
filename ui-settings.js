/* Settings share one workspace, preserving existing fields and save handlers. */
(()=>{'use strict';
const page=document.getElementById('page-settings'),workspace=page?.querySelector('.wf-settings-workspace'),tabs=page?.querySelector('.tabs');
if(!workspace||!tabs)return;
const content=document.createElement('div');content.className='wf-settings-content';
const panels=[...page.querySelectorAll('[id^="stab-"]')];
panels.forEach(panel=>content.append(panel));workspace.replaceChildren(tabs,content);
tabs.setAttribute('role','tablist');
const buttons=[...tabs.querySelectorAll('.tab-btn')];
buttons.forEach(button=>{const key=button.getAttribute('onclick')?.match(/switchTab\('([^']+)'\)/)?.[1];if(!key)return;button.id='wf-settings-tab-'+key;button.type='button';button.setAttribute('role','tab');button.setAttribute('aria-controls','stab-'+key);const panel=document.getElementById('stab-'+key);if(panel){panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',button.id);if(!['language','about'].includes(key)){const heading=document.createElement('h2');heading.className='wf-settings-panel-title';heading.innerHTML=button.innerHTML;heading.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));panel.prepend(heading);}}});
function sync(){if(page.classList.contains('wf-settings-inline-ready'))return;buttons.forEach(button=>{const active=button.classList.contains('active');button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;});}
const original=window.switchTab;
window.switchTab=function(key){const result=original.apply(this,arguments);sync();return result;};
tabs.addEventListener('keydown',event=>{if(page.classList.contains('wf-settings-inline-ready'))return;const index=buttons.indexOf(event.target.closest('.tab-btn'));if(index<0)return;let next;if(event.key==='Home')next=0;else if(event.key==='End')next=buttons.length-1;else if(event.key==='ArrowDown'||event.key==='ArrowRight')next=(index+1)%buttons.length;else if(event.key==='ArrowUp'||event.key==='ArrowLeft')next=(index-1+buttons.length)%buttons.length;else return;event.preventDefault();buttons[next].click();buttons[next].focus();});
['stPhone','stEmail','stWebsite','stMersis','stIbanUSD','stIbanTRY','stIbanEUR','stSwift','stAccountNo'].forEach(id=>{const input=document.getElementById(id);if(input)input.dir='ltr';});
const email=document.getElementById('stEmail');if(email)email.type='email';const phone=document.getElementById('stPhone');if(phone)phone.type='tel';
sync();
})();
