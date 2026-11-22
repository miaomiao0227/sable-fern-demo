(() => {
  const key='sf-review-workspace-v1';
  const profile='评审顾客';
  const sampleProduct={sku:'REVIEW-101',name:'桌面收纳篮',market:'肯尼亚',saleCountries:['肯尼亚','津巴布韦','坦桑尼亚'],category:'home',price:22,cost:9,inventory:24,listed:true,ready:true,
    image:'https://www.vinogasg.com/cdn/shop/files/VINOGATEMPLATEOriginal____1.jpg?v=1707899089',description:'评审样例商品，可在运营台修改内容或练习上下架。'};
  const receipt={type:'receipt',cents:2500,reference:'DEMO-01',date:new Date().toISOString().slice(0,10)};
  const makeOrder=(id,status,extra)=>({id,checkoutId:id,owner:'review-guest',sku:sampleProduct.sku,productSku:sampleProduct.sku,name:sampleProduct.name,market:'肯尼亚',quantity:1,price:22,cost:9,customerShipping:3,created:new Date().toISOString(),status,paymentMethod:'cod',address:{name:'演示收件人',phone:'000000000',city:'Nairobi',address:'Demo address',country:'肯尼亚'},...extra});
  function defaultState(){
    return {products:[sampleProduct],days:[],orders:[makeOrder('REVIEW-001','signed',{tracking:'SAMPLE-01',carrier:'样例承运商',shipping:3,ledger:[receipt]}),makeOrder('REVIEW-002','new',{})],members:[{name:profile,registeredAt:new Date().toISOString()}],traffic:[],catalogRevision:0};
  }
  const read=()=>JSON.parse(localStorage.getItem(key)||'null')||defaultState();
  const save=state=>localStorage.setItem(key,JSON.stringify(state));
  const currencyCents=amount=>Math.round(Number(amount)*100);
  const error=message=>{throw new Error(message);};
  const fee={肯尼亚:3,津巴布韦:4,坦桑尼亚:4.5};
  const transitions={new:['confirmed','cancelled'],confirmed:['shipped','cancelled'],shipped:['signed'],signed:['returned']};
  function recordLedger(order,body){
    const cents=currencyCents(body.amount), reference=String(body.reference||'').trim();
    if(!['signed','returned'].includes(order.status)||!Number.isSafeInteger(cents)||cents<=0||!reference)error('请选择有效的签收订单并填写凭证与金额。');
    const entries=order.ledger||[];
    const previous=entries.find(entry=>entry.type===body.type&&entry.reference===reference);
    if(previous){
      if(previous.cents!==cents||previous.date!==body.date)error('该凭证已登记。');
      return;
    }
    const received=entries.filter(entry=>entry.type==='receipt').reduce((sum,entry)=>sum+entry.cents,0);
    const refunded=entries.filter(entry=>entry.type==='refund').reduce((sum,entry)=>sum+entry.cents,0);
    const due=currencyCents(order.price*order.quantity+(order.customerShipping||0));
    if(body.type==='receipt'&&cents>due-received)error('回款超过应收余额。');
    if(body.type==='refund'&&(order.status!=='returned'||cents>received-refunded))error('请先登记退货，并检查可退款余额。');
    if(!['receipt','refund'].includes(body.type))error('流水类型无效。');
    order.ledger=[...entries,{type:body.type,cents,reference,date:body.date}];
  }
  globalThis.reviewCommerceApi=async(path,{method='GET',body}={})=>{
    const state=read();
    if(path==='catalog'&&method==='GET'){
      const sales={};
      for(const order of state.orders.filter(item=>item.status==='signed')){
        const market=sales[order.market]??={};
        const sku=order.productSku||order.sku;
        market[sku]=(market[sku]||0)+order.quantity;
      }
      return {products:state.products.filter(p=>p.listed),sales};
    }
    if(path==='session')return {signedIn:true,registered:true,admin:true,name:state.members[0].name,review:true};
    if(path==='profile'&&method==='POST'){
      state.members[0].name=String(body.name||profile).trim().slice(0,80)||profile;save(state);return {name:state.members[0].name};
    }
    if(path==='orders'&&method==='GET')return {orders:state.orders};
    if(path==='product-visit')return {ok:true};
    if(path==='admin/state'&&method==='GET')return state;
    if(path==='admin/catalog'&&method==='GET')return {products:state.products,days:state.days,catalogRevision:state.catalogRevision};
    if(path==='admin/catalog'&&method==='PUT'){
      if(body.catalogRevision!==state.catalogRevision)error('另一个标签页已更新数据，请刷新。');
      state.products=body.products;state.days=body.days;state.catalogRevision++;
      save(state);return {catalogRevision:state.catalogRevision};
    }
    if(path==='orders'&&method==='POST'){
      const {id,lines,address}=body, existing=state.orders.filter(order=>order.checkoutId===id);
      if(existing.length)return {ids:existing.map(order=>order.id)};
      const market=address?.country;
      if(!Object.hasOwn(fee,market)||!lines?.length||lines.some(line=>line.market!==market))error('配送国家与购物车不一致。');
      const products=marketCatalog(market,state.products);
      const orders=lines.map((line,index)=>{
        const product=products.find(p=>p.sku===line.sku), variant=product?.variants?.find(v=>v.sku===line.variant);
        if(!product||(product.variants?.length&&!variant)||!Number.isInteger(line.quantity)||line.quantity<1||line.quantity>99)error('商品或配置不可用。');
        const sku=variant?.sku||product.sku, inventory=variant?.inventory??product.inventory;
        const used=state.orders.filter(o=>o.sku===sku&&o.status!=='cancelled').reduce((sum,o)=>sum+o.quantity,0);
        if(inventory!=null&&used+line.quantity>inventory)error('该演示商品库存不足。');
        return {...makeOrder(id+'-'+(index+1),'new',{}),checkoutId:id,market,sku,productSku:product.sku,name:product.name,
          quantity:line.quantity,price:variant?.price??product.price,cost:product.cost??null,configuration:variant?.configuration,color:variant?.color,
          address:{name:'演示收件人',phone:'000000000',city:'Demo City',address:'Demo address',country:market},customerShipping:index===0?fee[market]:0};
      });
      state.orders.unshift(...orders);save(state);return {ids:orders.map(order=>order.id)};
    }
    if(path==='admin/order'&&method==='PATCH'){
      const order=state.orders.find(item=>item.id===body.id);
      if(!order||!transitions[order.status]?.includes(body.status))error('该演示订单无法执行此操作。');
      if(body.status==='shipped'){
        order.tracking=String(body.tracking||'').trim();
        if(!order.tracking)error('请填写模拟运单号。');
        order.carrier=String(body.carrier||'');
      }
      if(body.status==='signed'){
        if(![body.cost,body.shipping].every(value=>Number.isFinite(value)&&value>=0))error('请填写有效成本。');
        order.cost=body.cost;order.shipping=body.shipping;
      }
      order.status=body.status;save(state);return {ok:true};
    }
    if(path==='admin/ledger'&&method==='POST'){
      const order=state.orders.find(item=>item.id===body.order);
      if(!order)error('没找到这笔演示订单。');
      recordLedger(order,body);save(state);return {ok:true};
    }
    error('该功能暂无评审数据。');
  };
  if(!localStorage.getItem('sf-review-delivery-country'))localStorage.setItem('sf-review-delivery-country','肯尼亚');
  document.addEventListener('DOMContentLoaded',()=>{
    const area=document.getElementById('review-notice');
    area.querySelector('a[data-review-home]').href='/review/storefront.html';
    for(const link of document.querySelectorAll('a[href^="/signout-with-chatgpt"]')){
      link.hidden=true;
    }
    const logout=document.getElementById('logout');if(logout)logout.parentElement.hidden=true;
    const importButton=document.getElementById('import-local');if(importButton)importButton.hidden=true;
    const source=document.querySelector('#filters [name=source]');
    if(source){source.value='local';source.dispatchEvent(new Event('input',{bubbles:true}));}
  });
})();
