const el=id=>document.getElementById(id);
const adKey='commerce-ad-data-v1', notesKey='commerce-stock-notes-v1';
const fields=['date','market','sku','account','group','ad','ads','impressions','clicks','views','results'];
const totals=['orders','confirmed','signed','revenue','cash','cost','shipping','ads','impressions','clicks','views','results'];
const markets=['津巴布韦','肯尼亚','坦桑尼亚'];
const localDate=date=>new Intl.DateTimeFormat('fr-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
const dateBack=days=>localDate(new Date(Date.now()-days*86400000));
const read=(key,fallback)=>JSON.parse(localStorage.getItem(key)??fallback);
const write=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
const matchKey=entry=>JSON.stringify([entry.market,entry.sku]);
const adId=entry=>JSON.stringify(fields.slice(0,6).map(key=>entry[key]));
const money=value=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(value);
const format=value=>typeof value==='number'?Number(value.toFixed(2)):value;
const ratio=(numerator,denominator)=>denominator?numerator/denominator:null;
const percent=value=>value===null?'—':(value*100).toFixed(1)+'%';
const unit=value=>value===null?'—':money(value);
const base=()=>Object.fromEntries(totals.map(key=>[key,0]));
const add=(target,row)=>{for(const key of totals)target[key]+=row[key]||0;};
const demoProducts=[
  {market:'津巴布韦',sku:'ZW-101',name:'蓝牙无线耳机',price:29,cost:12},
  {market:'津巴布韦',sku:'ZW-102',name:'运动智能手表',price:39,cost:18},
  {market:'肯尼亚',sku:'KE-101',name:'便携榨汁杯',price:25,cost:10},
  {market:'坦桑尼亚',sku:'TZ-101',name:'迷你投影仪',price:85,cost:41}
];
function demo(){
  const sales=[], ads=[];
  for(let day=6;day>=0;day--){
    demoProducts.forEach((p,i)=>{
      const orders=5+(day*3+i*5)%13, signed=Math.floor(orders*.57), date=dateBack(day);
      sales.push({...p,date,orders,confirmed:orders-1,signed,revenue:signed*p.price,cash:signed*p.price,cost:signed*p.cost,shipping:orders*2,stock:5+i*9+(day%3)});
      ads.push({...p,date,account:'演示广告账户',group:i%2?'再营销':'测品',ad:p.name+' · 素材 A',ads:orders*2.75,impressions:1200+orders*110,clicks:50+orders*2,views:35+orders,results:orders-1});
    });
  }
  return {products:demoProducts,sales,ads,logistics:sales.map(row=>({...row,status:'日汇总',quantity:row.orders}))};
}
let cloud=await commerceApi("admin/state"); function local(){
  const {products,days}=cloud;
  const lookup=new Map(products.map(p=>[p.sku,p]));
  const logistics=cloud.orders.map(o=>({...o,date:localDate(new Date(o.created))}));
  const sales=days.flatMap(d=>{
    const p=lookup.get(d.sku);
    return p?[{...p,...d,manualAds:d.ads,ads:0,cost:d.signed*d.unitCost}]:[];
  });
  for(const o of logistics){
    const signed=Number(o.status==='signed');
    sales.push({...o,orders:1,confirmed:Number(['confirmed','shipped','signed'].includes(o.status)),signed,revenue:signed*o.price*o.quantity,cash:(o.ledger||[]).reduce((n,e)=>n+(e.type==='receipt'?1:-1)*e.cents/100,0),cost:signed*(o.cost??0)*o.quantity,shipping:signed*(o.shipping??0)});
  }
  return {products,sales,ads:read(adKey,'[]'),logistics};
}
let tab='overview', exportRows=[], points=[];
const captions={overview:'经营总览',transactions:'交易数据',finance:'财务数据',members:'会员数据',testing:'FB 测品',stock:'现货分析',ads:'广告明细',logistics:'物流明细',alerts:'库存预警',profit:'利润排行',mapping:'映射说明'};
function options(select,values){
  const current=select.value;
  select.replaceChildren(new Option(select.name==='account'?'全部账户':'全部分组',''),...values.map(value=>new Option(value,value)));
  if(values.includes(current))select.value=current;
}
function build(data,filter){
  const catalog=new Map([...data.logistics,...data.products].map(p=>[matchKey(p),p]));
  const query=filter.query.trim().toLowerCase();
  const matches=row=>(!filter.market||row.market===filter.market)&&(!query||[row.sku,catalog.get(matchKey(row))?.name||row.name||''].some(value=>value.toLowerCase().includes(query)));
  const dated=row=>(!filter.start||row.date>=filter.start)&&(!filter.end||row.date<=filter.end);
  const ads=data.ads.filter(row=>matches(row)&&dated(row)&&(!filter.account||row.account===filter.account)&&(!filter.group||row.group===filter.group));
  const selectedKeys=new Set(ads.map(matchKey));
  const selected=row=>matches(row)&&(!(filter.account||filter.group)||selectedKeys.has(matchKey(row)));
  const knownAds=new Set(data.ads.map(matchKey));
  const aggregates=new Map(), byDay=new Map(), latestStock=new Map();
  for(const row of data.sales){
    if(row.stock===undefined||!selected(row)||(filter.end&&row.date>filter.end))continue;
    const key=matchKey(row);
    if(!latestStock.has(key)||latestStock.get(key).date<=row.date)latestStock.set(key,row);
  }
  function absorb(row){
    const key=matchKey(row), product=catalog.get(key);
    if(!aggregates.has(key))aggregates.set(key,{...base(),sku:row.sku,market:row.market,name:product?.name||row.name||row.sku,stock:latestStock.get(key)?.stock,adNames:new Set()});
    if(!byDay.has(row.date))byDay.set(row.date,{...base(),date:row.date});
    const result=aggregates.get(key);
    if(row.ad)result.adNames.add(row.ad);
    add(result,row);add(byDay.get(row.date),row);
  }
  for(const row of data.sales.filter(row=>selected(row)&&dated(row)))absorb({...row,ads:knownAds.has(matchKey(row))?0:(row.manualAds||0)});
  for(const row of ads)absorb(row);
  for(const p of data.products.filter(selected)){
    const key=matchKey(p), stock=latestStock.get(key)?.stock;
    if(!aggregates.has(key)&&stock!==undefined)aggregates.set(key,{...base(),sku:p.sku,market:p.market,name:p.name,stock,adNames:new Set()});
  }
  return {rows:[...aggregates.values()],ads,logistics:data.logistics.filter(row=>selected(row)&&dated(row)),trend:[...byDay.values()].sort((a,b)=>a.date.localeCompare(b.date))};
}
const profit=row=>row.revenue-row.cost-row.shipping-row.ads;
function render(){
  const form=el('filters');
  const data=form.elements.source.value==='demo'?demo():local();
  const market=form.elements.market.value;
  const available=data.ads.filter(row=>!market||row.market===market);
  options(form.elements.account,[...new Set(available.map(row=>row.account))].sort());
  options(form.elements.group,[...new Set(available.filter(row=>!form.elements.account.value||row.account===form.elements.account.value).map(row=>row.group))].sort());
  const filter=Object.fromEntries(new FormData(form));
  const {rows,ads,logistics,trend}=build(data,filter);
  const sum=base();rows.forEach(row=>add(sum,row));
  const cards=[['订单',sum.orders],['入单',sum.confirmed],['签收订单',sum.signed],['签收率',percent(ratio(sum.signed,sum.confirmed))],['签收货值',money(sum.revenue)],['COD 回款',money(sum.cash)],['广告花费',money(sum.ads)],['采购成本',money(sum.cost)],['配送费',money(sum.shipping)],['经营利润',money(profit(sum))],['利润率',percent(ratio(profit(sum),sum.revenue))],['投入利润率',percent(ratio(profit(sum),sum.cost+sum.shipping+sum.ads))]];
  const visibleOrders=logistics.filter(order=>order.id);
  const belongs=date=>!!date&&(!filter.start||date>=filter.start)&&(!filter.end||date<=filter.end);
  const entries=cloud.orders.filter(order=>(!filter.market||order.market===filter.market)&&(!filter.query||[order.sku,order.name].some(value=>value.toLowerCase().includes(filter.query.trim().toLowerCase())))).flatMap(order=>(order.ledger||[]).filter(entry=>belongs(entry.date)).map(entry=>({...entry,order})));
  const demoSource=filter.source==='demo';
  const members=demoSource?[]:cloud.members||[];
  const memberRows=members.filter(member=>!filter.start&&!filter.end||member.registeredAt&&belongs(localDate(new Date(member.registeredAt))));
  if(tab==='overview'){
    const traffic=(cloud.traffic||[]).filter(row=>belongs(row.date)&&(!filter.market||row.market===filter.market)&&(!filter.query||row.sku.toLowerCase().includes(filter.query.trim().toLowerCase())||cloud.products.some(p=>p.sku===row.sku&&p.name.toLowerCase().includes(filter.query.trim().toLowerCase()))));
    const visits=traffic.reduce((sum,row)=>sum+row.visits,0),purchases=traffic.reduce((sum,row)=>sum+row.purchases,0);
    cards.unshift(['新增会员',demoSource?'—':memberRows.filter(member=>member.registeredAt).length],['商品转化率 · 登录访客',demoSource?'—':percent(ratio(purchases,visits))]);
  }
  if(tab==='finance'&&!demoSource){
    const receipts=entries.filter(entry=>entry.type==='receipt').reduce((sum,entry)=>sum+entry.cents/100,0);
    const refunds=entries.filter(entry=>entry.type==='refund').reduce((sum,entry)=>sum+entry.cents/100,0);
    const due=visibleOrders.filter(order=>order.status==='signed').reduce((sum,order)=>{
      const received=(order.ledger||[]).filter(entry=>entry.type==='receipt').reduce((total,entry)=>total+entry.cents/100,0);
      return sum+Math.max(0,order.price*order.quantity+(order.customerShipping||0)-received);
    },0);
    cards.splice(0,cards.length,['待回款 USD',money(due)],['期间 COD 回款',money(receipts)],['期间登记退款',money(refunds)],['期间净入账',money(receipts-refunds)]);
  }
  if(tab==='members'){
    cards.splice(0,cards.length,['累计注册会员',demoSource?'—':members.length],['筛选期间注册',demoSource?'—':memberRows.filter(member=>member.registeredAt).length],['筛选订单的购买会员',demoSource?'—':new Set(visibleOrders.filter(order=>order.status!=='cancelled').map(order=>order.owner).filter(Boolean)).size],['筛选订单的复购会员',demoSource?'—':(()=>{
      const counts=new Map();
      for(const order of visibleOrders.filter(order=>order.owner&&order.status!=='cancelled')){
        if(!counts.has(order.owner))counts.set(order.owner,new Set());
        counts.get(order.owner).add(order.checkoutId||order.id);
      }
      return [...counts.values()].filter(ids=>ids.size>1).length;
    })()]);
  }
  el('cards').innerHTML=cards.map(([label,value])=>'<div class="metric"><small>'+label+'</small><b>'+value+'</b></div>').join('');
  const notes=read(notesKey,'{}'), noteNamespace=filter.source;
  const stockRows=rows.filter(row=>tab!=='alerts'||row.stock!==undefined&&row.stock<=10).sort((a,b)=>tab==='profit'?profit(b)-profit(a):tab==='alerts'?a.stock-b.stock:b.orders-a.orders);
  let columns=['备注','广告名称','市场','SKU','商品','订单','成效数','成效成本','点击率','广告费','落地费','千展','入单','签收','库存','建议补货','经营利润','利润率','签收率'];
  let display=stockRows.map(row=>[notes[noteNamespace+matchKey(row)]||'', [...row.adNames].join('、')||'—',row.market,row.sku,row.name,row.orders,row.results,unit(ratio(row.ads,row.results)),percent(ratio(row.clicks,row.impressions)),row.ads,unit(ratio(row.ads,row.views)),unit(ratio(row.ads*1000,row.impressions)),row.confirmed,row.signed,row.stock??'—',row.stock===undefined?'—':Math.max(0,20-row.stock),profit(row),percent(ratio(profit(row),row.revenue)),percent(ratio(row.signed,row.confirmed))]);
  if(tab==='ads'||tab==='testing'){
    columns=['日期','市场','SKU','账户','分组','广告名称','广告费','展示','链接点击','落地页浏览','成效数','点击率','千展'];
    display=ads.filter(row=>tab!=='testing'||/测品|test|facebook|meta|\bfb\b/i.test([row.group,row.account].join(' '))).map(row=>[...fields.map(key=>row[key]),percent(ratio(row.clicks,row.impressions)),unit(ratio(row.ads*1000,row.impressions))]);
  }
  if(tab==='logistics'||tab==='transactions'){
    columns=['日期','市场','SKU','商品','订单标识','状态','数量','订单金额','签收货值','配送费','承运商','运单号'];
    const statuses={new:'待入单',confirmed:'待发货',shipped:'待签收',signed:'已签收',cancelled:'已取消',returned:'已退货'};
    display=logistics.map(row=>[row.date,row.market,row.sku,row.name,row.id?.slice(0,8)||'—',statuses[row.status]||row.status,row.quantity,row.id?row.quantity*row.price+(row.customerShipping||0):'—',row.status==='signed'?row.quantity*row.price:row.revenue||0,row.shipping||0,row.carrier||'—',row.tracking||'—']);
  }
  el('mapping').hidden=tab!=='mapping';
  el('ad-entry').hidden=!['ads','testing'].includes(tab);
  el('finance-entry').hidden=tab!=='finance';
  if(tab==='finance'){
    columns=['流水日期','订单','市场','SKU','类型','金额 USD','凭证号'];
    display=demoSource?[]:entries.map(entry=>[entry.date,entry.order.id.slice(0,8),entry.order.market,entry.order.sku,entry.type==='receipt'?'回款':'退款',entry.cents/100,entry.reference]);
    const select=el('finance-form').elements.order;
    const last=select.value;
    const choices=visibleOrders.filter(order=>['signed','returned'].includes(order.status));
    select.replaceChildren(new Option('选择签收或退货订单',''),...choices.map(order=>new Option(order.id.slice(0,8)+' · '+order.sku+' · '+order.market,order.id)));
    if(choices.some(order=>order.id===last))select.value=last;
  }
  if(tab==='members'){
    columns=['会员姓名','注册日期'];
    display=memberRows.map(member=>[member.name,member.registeredAt?localDate(new Date(member.registeredAt)):'未记录']);
  }
  el('export').hidden=tab==='mapping';
  el('head').parentElement.hidden=tab==='mapping';
  el('table-title').textContent=captions[tab];
  const head=document.createElement('tr');
  for(const label of columns){const cell=document.createElement('th');cell.scope='col';cell.textContent=label;head.append(cell);}
  el('head').replaceChildren(head);
  exportRows=[columns,...display.map(row=>row.map(format))];
  const domRows=display.map((values,index)=>{
    const row=document.createElement('tr');
    values.forEach((value,col)=>{
      const cell=row.insertCell();
      if(col===0&&['stock','profit','alerts','overview'].includes(tab)){
        const input=document.createElement('input');input.value=value;input.maxLength=250;input.placeholder='备注';input.setAttribute('aria-label',stockRows[index].sku+' 备注');
        input.onchange=()=>{
          const current=read(notesKey,'{}');current[noteNamespace+matchKey(stockRows[index])]=input.value;write(notesKey,current);
          exportRows[index+1][0]=input.value;
        };cell.append(input);
      }else{
        cell.textContent=format(value);
        if(columns[col]==='经营利润'&&value<0)cell.className='negative';
      }
    });return row;
  });
  if(!domRows.length){const row=document.createElement('tr');const cell=row.insertCell();cell.colSpan=columns.length;cell.textContent='当前筛选下暂无数据';domRows.push(row);}
  el('body').replaceChildren(...domRows);
  points=trend;draw();
}
function draw(){
  const c=el('trend'), ctx=c.getContext('2d'), w=c.clientWidth,h=c.clientHeight,dpr=devicePixelRatio||1;
  c.width=w*dpr;c.height=h*dpr;ctx.scale(dpr,dpr);
  const left=14, bottom=h-28, step=(w-left*2)/Math.max(points.length,1);
  for(let i=0;i<5;i++){const y=12+(bottom-12)*i/4;ctx.strokeStyle='#d4e2f0';ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(w-left,y);ctx.stroke();}
  const max=key=>Math.max(1,...points.map(p=>p[key]));
  const adMax=max('ads');
  points.forEach((p,i)=>{
    const x=left+(i+.5)*step, height=p.ads/adMax*(bottom-12);
    ctx.fillStyle='#c97541';ctx.fillRect(x-step*.28,bottom-height,step*.56,height);
    if(i%Math.ceil(points.length/Math.max(2,Math.floor(w/85)))===0){
      ctx.fillStyle='#43586e';ctx.font='12px system-ui';ctx.textAlign='center';ctx.fillText(p.date.slice(5),x,h-8);
    }
  });
  for(const [key,color] of [['orders','#087a73'],['signed','#6748ae']]){
    const peak=max(key);ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=2;
    points.forEach((p,i)=>{const x=left+(i+.5)*step,y=bottom-p[key]/peak*(bottom-12);if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);});ctx.stroke();
  }
  c.setAttribute('aria-label',points.map(p=>p.date+' 订单 '+p.orders+' 签收 '+p.signed+' 广告费 '+money(p.ads)).join('；')||'暂无经营趋势');
}
function download(contents,type,name){
  const url=URL.createObjectURL(new Blob([contents],{type})), a=document.createElement('a');
  a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function parseCsv(text){
  const rows=[];let row=[],value='',quoted=false;
  for(let i=0;i<text.length;i++){
    const char=text[i];
    if(char==='"'){if(quoted&&text[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}
    else if(!quoted&&(char===','||char==='\n')){
      row.push(value);value='';
      if(char==='\n'){rows.push(row);row=[];}
    }else if(char!=='\r'||quoted)value+=char;
  }
  if(quoted)throw Error('CSV 有未闭合引号。');
  if(value||row.length)rows.push([...row,value]);
  return rows.filter(values=>values.some(value=>value.trim()));
}
function validated(form){
  const entry=Object.fromEntries(fields.map(key=>[key,String(form[key]??'').trim()]));
  entry.sku=entry.sku.toUpperCase();
  if(!fields.every(key=>entry[key])||!markets.includes(entry.market)||!/^\d{4}-\d{2}-\d{2}$/.test(entry.date)||!Number.isFinite(Date.parse(entry.date))||new Date(entry.date).toISOString().slice(0,10)!==entry.date)throw Error('请检查日期、市场、SKU 和广告字段。');
  for(const key of fields.slice(6)){
    entry[key]=Number(entry[key]);
    if(!Number.isFinite(entry[key])||entry[key]<0||(key!=='ads'&&!Number.isInteger(entry[key])))throw Error('花费须为非负数字，展示、点击、浏览和成效须为非负整数。');
  }
  return entry;
}
function storeAds(entries){
  const merged=new Map(read(adKey,'[]').map(row=>[adId(row),row]));
  entries.forEach(row=>merged.set(adId(row),row));
  write(adKey,[...merged.values()]);
  el('filters').elements.source.value='local';
  el('status').textContent='已保存 '+entries.length+' 条广告记录。';
  render();
}
el('ad-form').onsubmit=event=>{
  event.preventDefault();
  try{storeAds([validated(Object.fromEntries(new FormData(event.currentTarget)))]);}
  catch(error){el('status').textContent=error.message;}
};
el('template').onclick=()=>download('\uFEFF'+fields.join(',')+'\r\n'+[dateBack(0),'津巴布韦','ZW-101','测试账号','测品','示例广告',25,1500,60,40,8].join(','),'text/csv;charset=utf-8','广告导入模板.csv');
el('import').onchange=async event=>{
  const input=event.currentTarget,file=input.files[0];if(!file)return;
  try{
    if(file.size>2000000)throw Error('请使用 2 MB 以内的 CSV。');
    const [header,...rows]=parseCsv((await file.text()).replace(/^\uFEFF/,''));
    if(!header||header.length!==fields.length||fields.some(key=>!header.includes(key))||!rows.length)throw Error('请按模板填写列名及数据。');
    storeAds(rows.map((row,i)=>{
      try{if(row.length!==header.length)throw Error('列数不匹配。');return validated(Object.fromEntries(header.map((key,j)=>[key,row[j]])));}
      catch(error){throw Error('第 '+(i+2)+' 行：'+error.message);}
    }));
  }catch(error){el('status').textContent=error.message;}
  finally{input.value='';}
};
el('export').onclick=()=>{
  const escape=value=>String(value).replace(/[<>&]/g,char=>({'<':'&lt;','>':'&gt;','&':'&amp;'})[char]).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'');
  const xml=exportRows.map(row=>'<Row>'+row.map(value=>'<Cell><Data ss:Type="'+(typeof value==='number'?'Number':'String')+'">'+escape(value)+'</Data></Cell>').join('')+'</Row>').join('');
  download('<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="经营明细"><Table>'+xml+'</Table></Worksheet></Workbook>','application/vnd.ms-excel','经营明细.xml');
};
el('filters').onsubmit=event=>event.preventDefault();
el('filters').oninput=render;
el('presets').onclick=event=>{
  const {offset,month}=event.target.dataset;
  const range=el('filters').elements;
  if(offset!==undefined){range.start.value=range.end.value=dateBack(Number(offset));render();return;}
  if(month!==undefined){
    const today=dateBack(0),year=Number(today.slice(0,4)),current=Number(today.slice(5,7))-1;
    const date=new Date(Date.UTC(year,current-Number(month),1));
    range.start.value=date.toISOString().slice(0,10);
    range.end.value=Number(month)?new Date(Date.UTC(year,current,0)).toISOString().slice(0,10):today;
    render();return;
  }
  if(event.target.dataset.days===undefined)return;
  const days=Number(event.target.dataset.days),filter=el('filters').elements;
  filter.start.value=days?dateBack(days-1):'';filter.end.value=days?dateBack(0):'';render();
};
function setTab(next){
  if(!Object.hasOwn(captions,next))return;
  tab=next;
  const url=new URL(location.href);url.searchParams.set('tab',next);history.replaceState(null,'',url);
  for(const id of ['tabs','sidebar','modules']){
    for(const button of el(id).querySelectorAll('button')){
      const active=button.dataset.tab===next;button.classList.toggle('active',active);
      button.setAttribute('aria-pressed',String(active));
    }
  }
  if(next==='finance'||next==='members')el('filters').elements.source.value='local';
  render();
}
for(const id of ['tabs','sidebar','modules']){
  el(id).onclick=event=>{const button=event.target.closest('[data-tab]');if(button)setTab(button.dataset.tab);};
}
el('finance-form').elements.date.value=dateBack(0);
el('finance-form').onsubmit=async event=>{
  event.preventDefault();
  const form=event.currentTarget,body=Object.fromEntries(new FormData(form));
  body.amount=Number(body.amount);
  const submit=form.querySelector('button');submit.disabled=true;
  try{
    await commerceApi('admin/ledger',{method:'POST',body});
    cloud=await commerceApi('admin/state');
    form.elements.amount.value='';form.elements.reference.value='';
    el('status').textContent='资金流水已登记。';render();
  }catch(error){el('status').textContent=error.message;}
  finally{submit.disabled=false;}
};
el('refresh').onclick=async()=>{
  try{cloud=await commerceApi('admin/state');render();el('status').textContent='已刷新服务端数据。';}
  catch(error){el('status').textContent=error.message;}
};
window.addEventListener('resize',draw);
window.addEventListener('storage',render);
setTab(new URLSearchParams(location.search).get('tab')||'overview');
