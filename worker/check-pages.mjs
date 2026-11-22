import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import worker from '../pages-dist/_worker.js';
const database=new DatabaseSync(':memory:');
for(const file of ['drizzle/0000_commerce.sql','drizzle/0001_product_visits.sql','cloudflare/0002_commerce_sessions.sql']){
  database.exec(await readFile(file,'utf8'));
}
const db={
  prepare(sql){
    const statement=database.prepare(sql);
    const bind=(...args)=>({
      first:()=>statement.get(...args),
      run:()=>({meta:{changes:statement.run(...args).changes}}),
      all:()=>({results:statement.all(...args)})
    });
    return {...bind(),bind};
  },
  batch(statements){
    return statements.map(command=>command.run());
  }
};
const origin='https://shop.example.test';
const env={DB:db,GOOGLE_CLIENT_ID:'test-client',GOOGLE_CLIENT_SECRET:'test-secret',COMMERCE_PUBLIC_ORIGIN:origin,COMMERCE_ADMIN_EMAIL:'admin@example.test'};
const request=(path,{cookie,method='GET',body,headers={}}={})=>worker.fetch(new Request(origin+path,{
  method,headers:{origin,...headers,...(cookie?{cookie}:{})},body:body===undefined?undefined:JSON.stringify(body)
}),env);
const cookies=response=>response.headers.getSetCookie().map(value=>value.split(';')[0]);

assert.equal((await request('/')).status,200);
assert.equal((await request('/shop.css')).status,200);
assert.equal((await request('/catalog.js')).status,200);
assert.equal((await request('/product.html?sku=SF-201')).status,200);
assert.equal((await request('/api/catalog')).status,200);
assert.equal((await request('/analysis.html')).status,403);
const spoof=await request('/api/session',{headers:{'oai-authenticated-user-id':'fake-admin','oai-authenticated-user-email':env.COMMERCE_ADMIN_EMAIL}});
assert.deepEqual(await spoof.json(),{signedIn:false,admin:false,registered:false,name:null});
const account=await (await request('/account.html')).text();
assert(account.includes('/auth/google'));
assert(!account.includes('/signin-with-chatgpt'));

let profile={};
const network=globalThis.fetch;
globalThis.fetch=async (target,options)=>{
  if(target==='https://oauth2.googleapis.com/token'){
    assert.equal(options.body.get('client_id'),'test-client');
    assert.equal(options.body.get('redirect_uri'),origin+'/auth/google/callback');
    assert.match(options.body.get('code_verifier'),/^[\w-]{43}$/);
    return Response.json({access_token:'mock-access-token'});
  }
  assert.equal(target,'https://openidconnect.googleapis.com/v1/userinfo');
  assert.equal(options.headers.authorization,'Bearer mock-access-token');
  return Response.json(profile);
};
async function signIn(email,sub){
  profile={email,sub,email_verified:true};
  const start=await request('/auth/google?return_to=%2Faccount.html');
  assert.equal(start.status,303);
  const provider=new URL(start.headers.get('location'));
  assert.equal(provider.hostname,'accounts.google.com');
  assert.equal(provider.searchParams.get('code_challenge_method'),'S256');
  const flowCookie=cookies(start)[0];
  const invalid=await request('/auth/google/callback?code=mock&state=invalid',{cookie:flowCookie});
  assert.equal(invalid.status,400);
  const callback=await request('/auth/google/callback?'+new URLSearchParams({code:'mock',state:provider.searchParams.get('state')}),{cookie:flowCookie});
  assert.equal(callback.status,303);
  assert.equal(callback.headers.get('location'),origin+'/account.html');
  return cookies(callback).find(value=>value.startsWith('__Host-sf-session='));
}
try{
  const buyer=await signIn('buyer@example.test','buyer');
  const admin=await signIn('admin@example.test','admin');
  assert.equal((await request('/api/profile',{cookie:buyer,method:'POST',body:{name:'Buyer'}})).status,200);
  assert.equal((await request('/api/admin/state',{cookie:buyer})).status,403);
  assert.equal((await request('/workflow.html',{cookie:admin})).status,200);
  const order={id:crypto.randomUUID(),lines:[{sku:'SF-201',variant:'SF-201-L',market:'肯尼亚',quantity:1}],
    address:{name:'Test',phone:'123',city:'Nairobi',address:'Demo',country:'肯尼亚'}};
  assert.equal((await request('/api/orders',{cookie:buyer,method:'POST',body:order})).status,201);
  assert.equal((await (await request('/api/orders',{cookie:buyer})).json()).orders.length,1);
  assert.equal((await (await request('/api/orders',{cookie:admin})).json()).orders.length,0);
  const records=await (await request('/api/admin/state',{cookie:admin})).json();
  assert.equal(records.orders[0].sku,'SF-201-L');
  assert.equal((await request('/api/admin/order',{cookie:admin,method:'PATCH',body:{id:records.orders[0].id,status:'confirmed'}})).status,200);
  assert.equal((await request('/auth/logout',{cookie:buyer})).status,303);
  assert.equal((await request('/api/orders',{cookie:buyer})).status,401);
}finally{
  globalThis.fetch=network;
}
console.log('Pages assets, Google OAuth flow with a mock provider, logout, roles, and demo checkout passed.');
