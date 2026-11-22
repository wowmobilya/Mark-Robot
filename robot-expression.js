(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.WFRobotExpression=api;
})(globalThis,function(){
  'use strict';
  // Each intent sets the eye opening, brow angle, smile curvature and gaze.
  const poses={
    neutral:[50,0,16,0],welcome:[44,-4,27,2],success:[40,-5,33,0],
    growth:[46,-8,26,-4],caution:[53,9,-3,3],error:[58,14,-16,0],
    question:[53,-12,7,6],thinking:[41,-9,2,-7],waiting:[42,3,5,5],
    message:[48,-6,15,6],money:[45,5,10,-3],delivery:[47,-3,20,-6],
    gratitude:[37,-4,31,0]
  };
  const cues=[
    ['error',/تعذر|خطأ|فشل|رفض|failed|failure|error|denied|erreur|échec|hata|başarısız|ошиб|сбой/i],
    ['caution',/تنبيه|تحذير|ناقص|منخفض|غير مدفوع|warning|unpaid|overdue|low stock|uyarı|gecik|attention|retard|внимани|просроч/i],
    ['gratitude',/شكر|ممتن|thank|merci|teşekkür|спасибо/i],
    ['success',/نجاح|بنجاح|اكتمل|تم حفظ|success|complete|saved|başarılı|kaydedildi|réuss|enregistré|успеш|сохран/i],
    ['question',/[?؟]|استفسار|question|soru|вопрос/i],
    ['growth',/ارتفاع|زيادة|ارتفع|growth|increase|hausse|artış|рост|вырос/i],
    ['welcome',/هلا|مرحبا|صباح الخير|مساء الخير|مرحب|welcome|hello|bonjour|merhaba|привет/i],
    ['waiting',/انتظار|بانتظار|معلّق|pending|waiting|bekl|attente|ожидан/i],
    ['delivery',/تسليم|شحن|توصيل|deliver|shipment|teslim|livraison|достав/i],
    ['money',/رصيد|دفع|سعر|مبيع|مبيعات|فاتورة|invoice|payment|sales|balance|ödeme|vente|paiement|оплат|продаж/i],
    ['message',/رسالة|محادثة|مكالمة|message|chat|call|mesaj|arama|appel|сообщени|звонок/i],
    ['thinking',/تحليل|مراجعة|تقرير|report|review|analyse|rapor|отчёт|анализ/i]
  ];
  function intent(text,kind){
    if(['er','err','error'].includes(kind))return 'error';
    const normalized=String(text||'').slice(0,800).replace(/[\u064b-\u065f]/g,'');
    return cues.find(([,pattern])=>pattern.test(normalized))?.[0]||
      ({ok:'success',chat:'message',call:'message',order:'delivery'}[kind])||'neutral';
  }
  function pose(mood,strength=1,beat=1){
    const [eye,angle,smile,look]=poses[mood]||poses.neutral;
    const emphasis=strength-1,phase=beat-1;
    return {mood,eye:eye+emphasis*3-phase,brow:angle+emphasis*2,curve:smile+emphasis*3+phase*2,
      x:look+phase*3,y:phase*2-emphasis,aperture:26+emphasis*5+phase*2};
  }
  function analyze(text,kind='',beat=1){
    const line=String(text||'').trim();
    const strength=/[!！]{2,}|عاجل|urgent|acil|срочн/i.test(line)?2:/[!！?؟:]|\d|[٠-٩]/.test(line)?1:0;
    return pose(intent(line,kind),strength,beat);
  }
  function apply(face,value){
    face.dataset.robotMood=value.mood;
    const shape=face.querySelector('.wf-robot-mouth');
    shape?.setAttribute('d','M 274 252.72 Q 300 '+(252.72+value.curve)+' 326 252.72');
    for(const [key,n] of Object.entries({eye:value.eye,brow:value.brow,x:value.x,y:value.y,aperture:value.aperture}))
      face.style?.setProperty('--wf-pose-'+key,n+(key==='brow'?'deg':'px'));
  }
  function avatar(doc,text,kind,beat){
    const p=analyze(text,kind,beat),ns='http://www.w3.org/2000/svg';
    const draw=(tag,attrs)=>{const element=doc.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))element.setAttribute(k,v);return element;};
    const svg=draw('svg',{viewBox:'60 -70 480 480','aria-hidden':'true',focusable:'false','class':'wf-expression-avatar'});
    svg.append(draw('rect',{x:60,y:-70,width:480,height:480,rx:84,fill:'#eff5f6'}));
    const eyeGroup=draw('g',{transform:'translate('+p.x+' '+p.y+')'});
    for(const [i,x] of [174,426].entries()){
      const eye=draw('g',{transform:'translate('+x+' 147.84)'});
      eye.append(draw('path',{d:'M -29 -70 Q 0 -80 29 -70',fill:'none',stroke:'#171923','stroke-width':7,'stroke-linecap':'round',transform:'rotate('+(i?-p.brow:p.brow)+' 0 -72)'}),
        draw('ellipse',{rx:34,ry:p.eye,fill:'#171923'}),draw('ellipse',{cx:-10,cy:-18,rx:10,ry:13,fill:'#fff'}),draw('circle',{cx:13,cy:19,r:4,fill:'#d7d7dd'}));
      eyeGroup.append(eye);
    }
    svg.append(eyeGroup,draw('path',{d:'M 274 252.72 Q 300 '+(252.72+p.curve)+' 326 252.72',fill:'none',stroke:'#171923','stroke-width':9,'stroke-linecap':'round'}));
    return svg;
  }
  return Object.freeze({analyze,pose,apply,avatar,moods:Object.freeze(Object.keys(poses))});
});
