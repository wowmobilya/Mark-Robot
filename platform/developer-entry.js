/* Reuse the exact developer-profile page from the main WOW application.
   All source content, portrait and responsive page logic remain shared. */
(() => {
  'use strict';
  const dialog=document.getElementById('wfDevDialog');
  if(!dialog)return;
  const closer=dialog.querySelector('[data-dialog-close]');
  let previousFocus=null;
  function open(){
    if(dialog.open)return;
    previousFocus=document.activeElement;
    if(typeof dialog.showModal==='function')dialog.showModal();
    else dialog.setAttribute('open','');
  }
  function close(){
    if(!dialog.open)return;
    if(typeof dialog.close==='function')dialog.close();
    else {dialog.removeAttribute('open');previousFocus?.focus?.({preventScroll:true});}
  }
  closer?.addEventListener('click',close);
  dialog.addEventListener('close',()=>{if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});previousFocus=null;});
  dialog.addEventListener('click',event=>{
    if(event.target===dialog)close();
  });
  window.WFPlatformDeveloper=Object.freeze({open,close});
})();