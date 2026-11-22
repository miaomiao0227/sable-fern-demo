const marketDay=value=>new Intl.DateTimeFormat('fr-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(value);
const markets=['津巴布韦','肯尼亚','坦桑尼亚'];
const fees={'津巴布韦':4,'肯尼亚':3,'坦桑尼亚':4.5};
const adminPaths=new Set(['/index.html','/workflow.html','/analysis.html','/analysis.js']);
const json=(body,status=200)=>Response.json(body,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const textField=(value,max)=>typeof value==='string'?value.trim().slice(0,max):'';
const amount=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=1000000;
const validPath=pathname=>pathname==='/api'||pathname.startsWith('/api/');
const cleanProduct=({cost,ready,...product})=>product;
async function load(env){
  const row=await env.DB.prepare('SELECT revision,data FROM commerce_state WHERE id=1').first();
  if(!row)throw fail('商城存储尚未初始化。',503);
  return {revision:row.revision,state:JSON.parse(row.data)};
}
async function change(env,modify){
  for(let attempt=0;attempt<5;attempt++){
    const {revision,state}=await load(env);
    const result=modify(state);
    const raw=JSON.stringify(state);
    if(raw.length>900000)throw fail('站点数据已接近容量上限，请使用图片链接减少存储占用。',413);
    const saved=await env.DB.prepare('UPDATE commerce_state SET data=?, revision=revision+1 WHERE id=1 AND revision=?').bind(raw,revision).run();
    if(saved.meta.changes===1)return {result,revision:revision+1};
  }
  throw fail('数据正被更新，请稍后重试。',409);
}
async function payload(request){
  const data=await request.text();
  if(data.length>850000)throw fail('提交的数据过大。',413);
  try{return JSON.parse(data);}
  catch{throw fail('请求数据格式无效。');}
}
function validateProduct(product){
  if(!product||!markets.includes(product.market)||!textField(product.sku,40)||!textField(product.name,100)||!amount(product.price)||!amount(product.cost))throw fail('商品字段不完整。');
  if(product.saleCountries!==undefined&&(!Array.isArray(product.saleCountries)||!product.saleCountries.length||product.saleCountries.some(country=>!markets.includes(country))||new Set(product.saleCountries).size!==product.saleCountries.length))throw fail('请选择有效的可售国家。');
  if(product.inventory!=null&&(!Number.isInteger(product.inventory)||!amount(product.inventory)))throw fail('库存必须为非负整数。');
  if((product.variants!=null&&!Array.isArray(product.variants))||(product.variants||[]).length>30)throw fail('单件商品最多支持 30 个配置。');
  for(const v of product.variants||[]){
    if(!textField(v.sku,40)||!textField(v.configuration,80)||!textField(v.color,80)||!amount(v.price)||!Number.isInteger(v.inventory)||!amount(v.inventory))throw fail('配置 SKU、选项、价格和库存不完整。');
  }
  if(new Set((product.variants||[]).map(v=>v.sku)).size!==(product.variants||[]).length)throw fail('配置 SKU 重复。');
  if(!product.listed)return;
  for(const src of productImages(product)){
    if(typeof src!=='string'||!/^https:\/\/|^data:image\/(jpeg|png|webp);base64,/.test(src))throw fail('图片格式无效。');
  }
}
function placeOrder(state,user,input){
  const id=textField(input.id,64);
  if(!/^[a-f0-9-]{36}$/i.test(id))throw fail('订单标识无效。');
  const previous=state.orders.filter(order=>order.owner===user&&order.checkoutId===id);
  if(previous.length)return previous.map(order=>order.id);
  if(!Array.isArray(input.lines)||!input.lines.length||input.lines.length>25)throw fail('请检查购物车。');
  const market=input.address?.country;
  if(!markets.includes(market)||input.lines.some(line=>line.market!==market))throw fail('收货国家与购物车不一致，请重新确认配送国家。');
  const address=Object.fromEntries(['name','phone','city','address'].map(key=>[key,textField(input.address?.[key],key==='address'?240:80)]));
  if(Object.values(address).some(value=>!value))throw fail('请填写完整收货信息。');
  const current=marketCatalog(market,state.products), selected=new Set();
  const orders=input.lines.map((line,index)=>{
    const product=current.find(p=>p.sku===line.sku);
    const variant=product?.variants?.find(v=>v.sku===line.variant);
    if(!product||(product.variants?.length&&!variant)||!Number.isInteger(line.quantity)||line.quantity<1||line.quantity>99)throw fail('购物车商品或配置已变动，请重新选择。',409);
    const sku=variant?.sku||product.sku;
    if(selected.has(sku))throw fail('订单中有重复 SKU。');
    selected.add(sku);
    const inventory=variant?.inventory??product.inventory;
    const used=state.orders.filter(o=>(Array.isArray(product.saleCountries)||o.market===market)&&o.sku===sku&&(o.productSku||o.sku)===product.sku&&o.status!=='cancelled').reduce((n,o)=>n+o.quantity,0);
    if(inventory!=null&&used+line.quantity>inventory)throw fail(product.name+' 库存不足。',409);
    return {id:id+'-'+(index+1),checkoutId:id,owner:user,market,sku,productSku:product.sku,name:product.name,
      configuration:variant?.configuration,color:variant?.color,price:variant?.price??product.price,cost:product.cost??null,
      quantity:line.quantity,created:new Date().toISOString(),status:'new',paymentMethod:'cod',address:{...address,country:market},customerShipping:index===0?fees[market]:0};
  });
  state.orders.unshift(...orders);
  return orders.map(o=>o.id);
}
const reviewPages=new Set(['storefront.html','product.html','checkout.html','account.html','workflow.html','analysis.html','index.html']);
const reviewAssets=new Set(['shop.css','shop.js','catalog.js','cart.js','analysis.js','mock-orders.js','review.js']);
const reviewNotice='<div id="review-notice" style="position:relative;z-index:5;background:#122d22;color:white;padding:10px 4%;display:flex;gap:12px 18px;flex-wrap:wrap;align-items:center;font:15px system-ui,sans-serif"><strong>团队评审版</strong><a data-review-home href="storefront.html" style="color:#abf2ce">商城</a><a href="workflow.html" style="color:#abf2ce">运营工作台</a><a href="analysis.html?tab=overview" style="color:#abf2ce">经营看板</a><small style="color:#fff">免登录 · 样例数据 · 修改仅保存在当前浏览器，请使用测试资料</small></div><script src="review.js"></script>';
function reviewRoute(request,url){
  if(request.method!=='GET'&&request.method!=='HEAD')return new Response('Method not allowed',{status:405});
  const file=url.pathname.slice('/review/'.length);
  if(!file||file==='index.html')return Response.redirect(new URL('/review/storefront.html',url),302);
  if(!reviewPages.has(file)&&!reviewAssets.has(file))return new Response('Not found',{status:404});
  const original=assets['/'+file];
  if(original===undefined)return new Response('Not found',{status:404});
  let body=original.replace(/commerce-(?:cart-v1|instant-cart-v1|mock-orders-v1|workflow-v1|ad-data-v1|stock-notes-v1|language|delivery-country|currency)/g,key=>key.replace('commerce-','sf-review-'));
  if(file.endsWith('.html')){
    body=body.replace(/<main\b/,reviewNotice+'<main');
    if(file==='workflow.html')body=body.replace('商品、经营日数据和订单保存到服务端','商品、经营日数据和订单仅保存在当前浏览器');
    if(file==='analysis.html'){
      body=body.replace('本地运营数据','当前浏览器评审数据')
        .replace(/<a href="\/signout-with-chatgpt[^"]*"[^>]*>退出<\/a>/,'')
        .replace('</style>','@media(min-width:641px){header{top:86px}}</style>');
    }
  }
  const type=file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html';
  return new Response(request.method==='HEAD'?null:body,{headers:{'content-type':type+'; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
}
async function route(request,env){
  const url=new URL(request.url), path=url.pathname;
  if(path==='/review')return Response.redirect(new URL('/review/storefront.html',url),302);
  if(path.startsWith('/review/'))return reviewRoute(request,url);
  const user=request.headers.get('oai-authenticated-user-id'), email=request.headers.get('oai-authenticated-user-email');
  const admin=!!(user&&email&&env.COMMERCE_ADMIN_EMAIL&&email.toLowerCase()===env.COMMERCE_ADMIN_EMAIL.toLowerCase());
  if(!validPath(path)){
    if(adminPaths.has(path)&&!admin)return new Response('当前账号没有运营权限。',{status:403});
    if(path==='/index.html')return Response.redirect(new URL('/analysis.html?tab=overview',url),302);
    const file=path==='/'?'/storefront.html':path, body=assets[file];
    if(body===undefined)return new Response('Not found',{status:404});
    const contentType=file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html';
    return new Response(body,{headers:{'content-type':contentType+'; charset=utf-8','x-content-type-options':'nosniff','cache-control':'no-store'}});
  }
  if(request.method!=='GET'&&request.headers.get('origin')!==url.origin)throw fail('请求来源无效。',403);
  if(path==='/api/catalog'&&request.method==='GET'){
    const {state}=await load(env);
    const sales=Object.create(null);
    for(const order of state.orders){
      if(order.status!=='signed')continue;
      const market=sales[order.market]??=Object.create(null), sku=order.productSku||order.sku;
      market[sku]=(market[sku]||0)+order.quantity;
    }
    return json({products:state.products.filter(product=>product.listed).map(cleanProduct),sales});
  }
  if(path==='/api/session'&&request.method==='GET'){
    const {state}=await load(env);
    const profile=user?state.users[user]:null;
    return json({signedIn:!!user,admin,registered:!!profile,name:profile?.name||null});
  }
  if(!user)throw fail('请先登录。',401);
  if(path==='/api/product-visit'&&request.method==='POST'){
    const input=await payload(request);
    const {state}=await load(env);
    if(!markets.includes(input.market)||!marketCatalog(input.market,state.products).some(p=>p.sku===input.sku))throw fail('商品不可用。',404);
    await env.DB.prepare('INSERT OR IGNORE INTO product_visits (day,market,sku,user_id) VALUES (?,?,?,?)').bind(marketDay(new Date()),input.market,input.sku,user).run();
    return json({ok:true},201);
  }
  if(path==='/api/profile'&&request.method==='POST'){
    const fields=await payload(request), name=textField(fields.name,80);
    if(!name)throw fail('请输入姓名。');
    await change(env,state=>{state.users[user]={name,registeredAt:state.users[user]?.registeredAt||new Date().toISOString()};});return json({name});
  }
  if(path==='/api/orders'&&request.method==='GET'){
    const {state}=await load(env);
    return json({orders:state.orders.filter(order=>order.owner===user).map(({owner,cost,shipping,ledger,...order})=>order)});
  }
  if(path==='/api/orders'&&request.method==='POST'){
    const input=await payload(request);
    const saved=await change(env,state=>{
      if(!state.users[user])throw fail('请先完成顾客资料注册。',403);
      return placeOrder(state,user,input);
    });
    return json({ids:saved.result},201);
  }
  if(!path.startsWith('/api/admin/'))throw fail('接口不存在。',404);
  if(!admin)throw fail('当前账号没有运营权限。',403);
  if(path==='/api/admin/state'&&request.method==='GET'){
    const {state,revision}=await load(env);
    const earliest=marketDay(new Date(Date.now()-89*86400000));
    const {results:visits}=await env.DB.prepare('SELECT day,market,sku,user_id FROM product_visits WHERE day>=? ORDER BY day DESC LIMIT 10000').bind(earliest).all();
    const buyers=new Set(state.orders.filter(o=>o.owner&&o.status!=='cancelled').map(o=>JSON.stringify([marketDay(new Date(o.created)),o.market,o.productSku||o.sku,o.owner])));
    const byDay=new Map();
    for(const visit of visits){
      const key=JSON.stringify([visit.day,visit.market,visit.sku]);
      if(!byDay.has(key))byDay.set(key,{date:visit.day,market:visit.market,sku:visit.sku,visits:0,purchases:0});
      const group=byDay.get(key);
      group.visits++;
      if(buyers.has(JSON.stringify([visit.day,visit.market,visit.sku,visit.user_id])))group.purchases++;
    }
    return json({products:state.products,days:state.days,orders:state.orders,traffic:[...byDay.values()],members:Object.values(state.users).map(u=>({name:u.name,registeredAt:u.registeredAt||null})),revision});
  }
  if(path==='/api/admin/catalog'&&request.method==='PUT'){
    const input=await payload(request);
    if(!Array.isArray(input.products)||!Array.isArray(input.days))throw fail('商品或日数据格式无效。');
    const seen=new Set();
    for(const product of input.products){
      validateProduct(product);
      for(const sku of [product.sku,...(product.variants||[]).map(v=>v.sku)]){
        if(seen.has(sku))throw fail('商品或配置 SKU 重复：'+sku);
        seen.add(sku);
      }
    }
    const saved=await change(env,state=>{
      if((state.catalogRevision||0)!==input.catalogRevision)throw fail('其他设备已更新目录，请刷新后重试。',409);
      const previous=new Map(state.products.map(product=>[product.sku,product.createdAt]));state.products=input.products.map(product=>({...product,createdAt:previous.has(product.sku)?previous.get(product.sku):new Date().toISOString()}));state.days=input.days;state.catalogRevision=(state.catalogRevision||0)+1;
      return state.catalogRevision;
    });
    return json({catalogRevision:saved.result});
  }
  if(path==='/api/admin/catalog'&&request.method==='GET'){
    const {state}=await load(env);
    return json({products:state.products,days:state.days,catalogRevision:state.catalogRevision||0});
  }
  if(path==='/api/admin/ledger'&&request.method==='POST'){
    const input=await payload(request);
    const cents=Number.isFinite(input.amount)?Math.round(input.amount*100):0;
    const reference=textField(input.reference,80);
    const date=textField(input.date,10);
    if(!reference||!cents||cents<0||!['receipt','refund'].includes(input.type)||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)throw fail('请填写有效的金额、日期和凭证号。');
    await change(env,state=>{
      const order=state.orders.find(o=>o.id===input.order);
      if(!order||!['signed','returned'].includes(order.status))throw fail('仅签收或已退货订单可以对账。',409);
      const ledger=order.ledger||[];
      const prior=ledger.find(entry=>entry.type===input.type&&entry.reference===reference);
      if(prior){
        if(prior.cents===cents&&prior.date===date)return;
        throw fail('同类型凭证号已存在，金额或日期不一致。',409);
      }
      const received=ledger.filter(e=>e.type==='receipt').reduce((sum,e)=>sum+e.cents,0);
      const refunded=ledger.filter(e=>e.type==='refund').reduce((sum,e)=>sum+e.cents,0);
      const due=Math.round((order.price*order.quantity+(order.customerShipping||0))*100);
      if(input.type==='receipt'&&cents>due-received)throw fail('登记回款不能超过应收余额。',409);
      if(input.type==='refund'&&(order.status!=='returned'||cents>received-refunded))throw fail('退款需先登记退货，且金额不能超过已收未退款余额。',409);
      order.ledger=[...ledger,{type:input.type,cents,reference,date}];
    });
    return json({ok:true},201);
  }
  if(path==='/api/admin/order'&&request.method==='PATCH'){
    const input=await payload(request);
    await change(env,state=>{
      const order=state.orders.find(o=>o.id===input.id);
      const transitions={new:['confirmed','cancelled'],confirmed:['shipped','cancelled'],shipped:['signed'],signed:['returned']};
      if(!order||!transitions[order.status]?.includes(input.status))throw fail('订单状态已变更或不允许此操作。',409);
      if(input.status==='shipped'){
        order.tracking=textField(input.tracking,80);order.carrier=textField(input.carrier,60);
        if(!order.tracking)throw fail('请填写运单号。');
      }
      if(input.status==='signed'){
        if(!amount(input.cost)||!amount(input.shipping))throw fail('请填写有效成本。');
        order.cost=input.cost;order.shipping=input.shipping;
      }
      order.status=input.status;
    });
    return json({ok:true});
  }
  throw fail('接口不存在。',404);
}
export default {async fetch(request,env){
  try{return await route(request,env);}
  catch(error){return json({error:error.status?error.message:'商城服务暂时不可用。'},error.status||500);}
}};
