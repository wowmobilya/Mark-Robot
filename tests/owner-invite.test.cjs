const test=require('node:test');
const assert=require('node:assert/strict');
const {parse}=require('../owner-invite');
const {randomUUID,randomBytes}=require('node:crypto');
test('owner scanner only opens canonical WOW owner invitations under the current installation',()=>{
  const base='https://wow.example/Mark-Robot/',id=randomUUID(),hash='#invite='+randomBytes(32).toString('hex');
  const link=base+'platform/?setup='+id+hash;
  assert.equal(parse(link,base),link);
  assert.equal(parse(link.replace('platform/?','platform/index.html?'),base),link);
  for(const bad of [link.replace('wow.example','other.example'),link.replace('wow.example','user@wow.example'),
    link.replace('Mark-Robot/',''),link.replace('platform/','files/'),link.replace('?setup','?next=/&setup'),
    link.replace(id,'wrong'),link.slice(0,-1),link+'&x',link.replace('https:','http:'),'javascript:alert(1)']){
    assert.equal(parse(bad,base),null);
  }
});
