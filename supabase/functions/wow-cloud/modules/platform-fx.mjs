/* Read-only, founder-authorized TCMB indicative FX rates. No database writes or keys. */
export function createCentralBankActions({
  requirePlatformFounder,fetchImpl=fetch,now=()=>Date.now(),ttlMs=60*60*1000
}={}){
  if(typeof requirePlatformFounder!=='function')throw new TypeError('Founder authorization required');
  let cached=null,inFlight=null;
  const bulletin='https://www.tcmb.gov.tr/kurlar/today.xml';
  function parse(xml){
    if(typeof xml!=='string'||xml.length>100000)throw new Error('INVALID_TCBM_RESPONSE');
    const date=xml.match(/<Tarih_Date\b[^>]*\bTarih=["'](\d{2})\.(\d{2})\.(\d{4})["']/);
    if(!date)throw new Error('INVALID_TCBM_DATE');
    const rate=code=>{
      const row=xml.match(new RegExp('<Currency\\b[^>]*\\b(?:Kod|CurrencyCode)=["\\x27]'+code+'["\\x27][^>]*>([\\s\\S]*?)<\\/Currency>'));
      const value=row?.[1].match(/<ForexSelling>\s*(\d+(?:\.\d+)?)\s*<\/ForexSelling>/);
      const n=Number(value?.[1]);
      return Number.isFinite(n)&&n>0&&n<1000000?n:null;
    };
    const usdTry=rate('USD'),eurTry=rate('EUR');
    if(!usdTry||!eurTry)throw new Error('TCMB_RATES_MISSING');
    return {available:true,source:'TCMB',rateType:'forex_selling',
      date:date[3]+'-'+date[2]+'-'+date[1],rates:{USD:usdTry,EUR:eurTry,TRY:1}};
  }
  async function getRate(){
    if(cached&&now()<cached.expires)return cached.data;
    if(inFlight)return inFlight;
    inFlight=(async()=>{
      let data;
      try{
        const response=await fetchImpl(bulletin,{method:'GET',redirect:'error',
          headers:{Accept:'application/xml,text/xml'},signal:AbortSignal.timeout(5500)});
        if(!response.ok)throw new Error('TCMB_UNAVAILABLE');
        data=parse(await response.text());
      }catch{
        data={available:false,source:'TCMB',rateType:'forex_selling',date:null,rates:null};
      }
      cached={data,expires:now()+(data.available?ttlMs:5*60*1000)};
      return data;
    })();
    try{return await inFlight;}finally{inFlight=null;}
  }
  return {'platform.fx.get':async({actor})=>{
    // Authentication in core.mjs is not a substitute for founder authorization.
    await requirePlatformFounder(actor);
    return getRate();
  }};
}
