/* Real founder-visible counters, not synthetic history or total server bandwidth. */
(() => {
  'use strict';
  const catalog={
    ar:{title:'نبض المنصة',subtitle:'ملخص مباشر من قائمة الشركات المصرّح بها',all:'إجمالي الشركات',active:'النشطة في الصفحة',paused:'الموقوفة في الصفحة',accounts:'الحسابات في الصفحة',chart:'توزيع حالة الشركات في الصفحة الحالية',loaded:'شركات معروضة',traffic:'استهلاك تمرير المكالمات',trafficNote:'نقل مكالمات TURN في الشهر الحالي بالتوقيت العالمي؛ لا يمثل كامل استهلاك السيرفر.',getTraffic:'قراءة الاستهلاك',loading:'جارٍ جلب الاستهلاك...',unknown:'غير متاح',failed:'تعذّر تحميل الاستهلاك',usage:'من الحصة المشتركة',part:'في الصفحة',total:'إجمالي الشركة',units:'جيجابايت'},
    en:{title:'Platform pulse',subtitle:'Current counters from authorized company records',all:'Total companies',active:'Active on this page',paused:'Suspended on this page',accounts:'Accounts on this page',chart:'Company status split on this page',loaded:'Companies loaded',traffic:'Call relay traffic',trafficNote:'TURN call relay egress this UTC calendar month; not total server bandwidth.',getTraffic:'Read usage',loading:'Loading usage...',unknown:'Unavailable',failed:'Could not load usage',usage:'of shared allowance',part:'On this page',total:'Total companies',units:'GB'},
    tr:{title:'Platform özeti',subtitle:'Yetkili şirket verilerinden anlık özet',all:'Toplam şirket',active:'Bu sayfada etkin',paused:'Bu sayfada askıda',accounts:'Bu sayfadaki hesaplar',chart:'Sayfadaki şirket durumları',loaded:'Yüklenen şirketler',traffic:'Arama aktarım trafiği',trafficNote:'UTC takvim ayında TURN arama çıkış trafiği; sunucunun toplam bant kullanımı değildir.',getTraffic:'Kullanımı oku',loading:'Yükleniyor...',unknown:'Kullanılamıyor',failed:'Kullanım okunamadı',usage:'ortak kotadan',part:'Bu sayfada',total:'Toplam şirket',units:'GB'},
    fr:{title:'Aperçu plateforme',subtitle:'Données réelles des sociétés autorisées',all:'Total sociétés',active:'Actives sur cette page',paused:'Suspendues sur cette page',accounts:'Comptes sur cette page',chart:'Statut des sociétés sur cette page',loaded:'Sociétés chargées',traffic:'Trafic du relais d’appels',trafficNote:'Trafic TURN des appels du mois civil UTC ; ce n’est pas tout le trafic serveur.',getTraffic:'Lire la consommation',loading:'Chargement…',unknown:'Indisponible',failed:'Impossible de lire la consommation',usage:'du quota partagé',part:'Sur cette page',total:'Total sociétés',units:'Go'},
    ru:{title:'Сводка платформы',subtitle:'Данные доступных администратору компаний',all:'Всего компаний',active:'Активные на странице',paused:'Приостановлены на странице',accounts:'Аккаунтов на странице',chart:'Состояние компаний на странице',loaded:'Загружено компаний',traffic:'Трафик ретрансляции звонков',trafficNote:'Исходящий TURN-трафик текущего месяца UTC; не весь трафик сервера.',getTraffic:'Проверить расход',loading:'Загрузка...',unknown:'Нет данных',failed:'Не удалось получить расход',usage:'от общей квоты',part:'На этой странице',total:'Всего компаний',units:'ГБ'}
  };
  const make=(tag,css,text)=>{const e=document.createElement(tag);if(css)e.className=css;if(text!==undefined)e.textContent=text;return e;};
  const fmt=(locale,n)=>new Intl.NumberFormat(locale,{maximumFractionDigits:2}).format(n);
  function mount({host,state,request,language='ar'}){
    if(!host||!Array.isArray(state?.companies)||host.querySelector('.platform-analytics'))return;
    const t=catalog[language]||catalog.ar;
    const rows=state.companies,active=rows.filter(x=>x.status==='active').length,paused=rows.filter(x=>x.status==='suspended').length;
    const accounts=rows.reduce((n,x)=>n+(Number.isSafeInteger(x.accounts)&&x.accounts>=0?x.accounts:0),0);
    const total=Number.isSafeInteger(state.total)&&state.total>=0?state.total:null,loaded=rows.length;
    const section=make('section','platform-analytics');
    const header=make('header','platform-analytics-header');
    header.append(make('h3','',t.title),make('p','',t.subtitle));
    const cards=make('div','platform-analytics-stats');
    const stats=[[t.all,total,'companies'],[t.active,active,'active'],[t.paused,paused,'paused'],[t.accounts,accounts,'accounts']];
    for(const [label,value,kind] of stats){
      const tile=make('article','platform-analytics-tile');
      tile.dataset.metric=kind;tile.append(make('span','platform-analytics-symbol'),make('span','platform-analytics-title',label),make('strong','platform-analytics-value',value==null?t.unknown:fmt(language,value)));
      if(kind!=='companies')tile.append(make('small','platform-analytics-scope',t.part));
      cards.append(tile);
    }
    const viz=make('section','platform-analytics-visual');
    const circle=make('div','platform-analytics-donut');
    const ratio=loaded?100*active/loaded:0;
    circle.style.setProperty('--platform-active-share',ratio.toFixed(3)+'%');
    circle.setAttribute('role','img');circle.setAttribute('aria-label',t.chart+': '+active+' / '+loaded);
    const center=make('span','platform-analytics-donut-center');
    center.append(make('strong','',String(loaded)),make('small','',t.loaded));circle.append(center);
    const legend=make('div','platform-analytics-legend');
    for(const [label,value,name] of [[t.active,active,'active'],[t.paused,paused,'suspended']]){
      const line=make('p','platform-analytics-legend-item');
      line.dataset.category=name;line.append(make('span','platform-analytics-legend-dot'),make('span','',label),make('strong','',fmt(language,value)));
      legend.append(line);
    }
    viz.append(circle,legend);
    const network=make('section','platform-analytics-traffic'),head=make('div','platform-analytics-traffic-head');
    const title=make('h4','',t.traffic),refresh=make('button','platform-analytics-refresh',t.getTraffic);
    refresh.type='button';head.append(title,refresh);
    const value=make('strong','platform-analytics-traffic-value',t.unknown);
    const usage=make('p','platform-analytics-usage',t.trafficNote),track=make('div','platform-analytics-track'),progress=make('span','platform-analytics-progress');
    track.setAttribute('role','progressbar');track.setAttribute('aria-label',t.traffic);track.setAttribute('aria-valuemin','0');
    track.hidden=true;track.append(progress);
    const status=make('p','platform-analytics-feedback');status.setAttribute('role','status');
    network.append(head,value,track,usage,status);
    refresh.onclick=async()=>{
      if(refresh.disabled||!section.isConnected)return;
      refresh.disabled=true;status.textContent=t.loading;
      try{
        const data=await request('relay.get');
        if(!section.isConnected)return;
        const bytes=data?.turnEgressBytes;
        if(!Number.isFinite(bytes)||bytes<0)throw Error('UNAVAILABLE');
        const used=bytes/1e9;value.textContent=fmt(language,used)+' '+t.units;
        if(Number.isFinite(data.includedGb)&&data.includedGb>0){
          track.hidden=false;
          const percent=Math.max(0,Math.min(100,(used/data.includedGb)*100));
          progress.style.inlineSize=percent.toFixed(2)+'%';
          track.setAttribute('aria-valuemax',String(data.includedGb));
          track.setAttribute('aria-valuenow',String(used));
          usage.textContent=fmt(language,used)+' / '+fmt(language,data.includedGb)+' '+t.units+' · '+t.usage+'. '+t.trafficNote;
        }else{track.hidden=true;usage.textContent=t.trafficNote;}
        status.textContent='';
      }catch{if(section.isConnected){track.hidden=true;value.textContent=t.unknown;status.textContent=t.failed;}}
      finally{refresh.disabled=false;}
    };
    section.append(header,cards,viz,network);
    const form=host.querySelector('.platform-create-form');
    if(form)form.before(section);else host.prepend(section);
  }
  window.WFPlatformAnalytics=Object.freeze({mount});
})();
