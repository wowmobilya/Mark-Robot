const test=require('node:test'),assert=require('node:assert/strict');
const engine=require('../robot-expression');
test('13 semantic intents combine three emphases and three phrase positions into distinct face geometries',()=>{
  const geometries=new Set();
  for(const mood of engine.moods)for(let strength=0;strength<3;strength++)for(let beat=0;beat<3;beat++){
    const {mood:_,...geometry}=engine.pose(mood,strength,beat);
    geometries.add(JSON.stringify(geometry));
  }
  assert.equal(geometries.size,117);
});
test('message meaning and severity guide expressions in the supported languages',()=>{
  for(const line of ['تعذّر الاتصال','Connection failed','İşlem başarısız','Échec du paiement','Ошибка подключения'])
    assert.equal(engine.analyze(line).mood,'error');
  assert.equal(engine.analyze('مبيعات اليوم').mood,'money');
  assert.equal(engine.analyze('تم حفظ الطلب').mood,'success');
  assert.equal(engine.analyze('OK','er').mood,'error');
  assert.equal(engine.analyze('طلب جديد؟').mood,'question');
  assert.notDeepEqual(engine.analyze('urgent!!','chat',0),engine.analyze('urgent!!','chat',2));
});
