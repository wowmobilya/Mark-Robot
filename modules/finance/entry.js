/* Register navigation at boot; load accounting views on the first authorized visit. */
(function(root){
  'use strict';
  const registry=root.WFModules;
  if(!registry)return;
  const base=new URL('.',document.currentScript.src);
  const routes={
    finance:{icon:'wallet',title:{en:'Finance',ar:'المحاسبة',tr:'Muhasebe',fr:'Comptabilité',ru:'Финансы'}},
    payroll:{icon:'users',title:{en:'Payroll',ar:'الرواتب والحضور',tr:'Bordro',fr:'Paie',ru:'Зарплата'}},
    metals:{icon:'coins',title:{en:'Precious metals',ar:'المعادن الثمينة',tr:'Değerli metaller',fr:'Métaux précieux',ru:'Драгоценные металлы'}}
  };
  let loading=null,implementation=null;
  root.WFFinanceEntry=Object.freeze({provide(fn){implementation=fn;}});
  function script(relative){
    return new Promise((resolve,reject)=>{
      const file=document.createElement('script');
      file.async=false;
      file.src=new URL(relative,base).href;
      file.onload=()=>{file.remove();resolve();};
      file.onerror=()=>{file.remove();reject(Error('FINANCE_ASSET_UNAVAILABLE'));};
      document.head.append(file);
    });
  }
  async function load(){
    const assets=[];
    if(!root.WFFinanceCore)assets.push(script('core.js?v=2'));
    if(!implementation)assets.push(script('workspace.js?v=3'));
    // Ordered classic scripts download together and also work on local file installations.
    await Promise.allSettled(assets);
    if(!root.WFFinanceCore||typeof implementation!=='function')throw Error('FINANCE_ASSET_UNAVAILABLE');
    return implementation;
  }
  async function mount(ctx){
    if(!ctx.api.can(ctx.route+'.view'))return;
    if(implementation)return implementation(ctx);
    const marker=document.createComment('');ctx.container.append(marker);
    try{
      loading||=load().finally(()=>{loading=null;});
      const render=await loading;
      // Registry release clears the container when the route or principal changes.
      if(marker.parentNode!==ctx.container||!ctx.api.can(ctx.route+'.view'))return;
      return render(ctx);
    }finally{marker.remove();}
  }
  for(const [id,route] of Object.entries(routes)){
    registry.register({id,...route,permission:id+'.view',mount});
  }
})(window);
