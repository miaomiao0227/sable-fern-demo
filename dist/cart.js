const cartKey='commerce-cart-v1';
const deliveryFees={'津巴布韦':4,'肯尼亚':3,'坦桑尼亚':4.5};
function loadCart(){
  return JSON.parse(localStorage.getItem(cartKey)||'{"id":null,"lines":[]}');
}
function saveCart(lines){
  localStorage.setItem(cartKey,JSON.stringify({id:crypto.randomUUID(),lines}));
}
function addToCart(market,sku,quantity,variant){
  const {lines}=loadCart();

  const existing=lines.find(line=>line.sku===sku&&line.variant===variant);
  if(!Number.isInteger(quantity)||quantity<1||(existing?.quantity||0)+quantity>99)throw Error('每款商品可选 1–99 件。');
  if(existing)existing.quantity+=quantity;else lines.push({market,sku,quantity,variant});
  saveCart(lines);
}
function resolveCart(cart,market){
  return cart.lines.map(line=>{
    const product=listedProducts(market).find(item=>item.sku===line.sku);
    const selected=product?.variants?.find(v=>v.sku===line.variant); return {...line,market,product:product?.variants?.length&&!selected?undefined:selected?{...product,...selected,name:product.name+" · "+selected.configuration+" / "+selected.color}:product};
  });
}

const instantCartKey='commerce-instant-cart-v1';
function beginInstantCheckout(line){
  sessionStorage.setItem(instantCartKey,JSON.stringify({id:crypto.randomUUID(),lines:[line]}));
}
function loadCheckoutCart(instant){
  return instant?JSON.parse(sessionStorage.getItem(instantCartKey)||'{"id":null,"lines":[]}'):loadCart();
}
function saveCheckoutCart(instant,lines){
  if(!instant){saveCart(lines);return;}
  sessionStorage.setItem(instantCartKey,JSON.stringify({id:crypto.randomUUID(),lines}));
}