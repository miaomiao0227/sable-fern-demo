async function commerceApi(path, options={}){
  if(location.pathname.startsWith('/review/'))return globalThis.reviewCommerceApi(path,options);
  const response=await fetch('/api/'+path,{
    method:options.method||'GET',credentials:'same-origin',
    headers:options.body?{'content-type':'application/json'}:{},
    body:options.body?JSON.stringify(options.body):undefined
  });
  const result=await response.json();
  if(!response.ok)throw Error(result.error||'请求失败');
  return result;
}
async function loadSharedCatalog(){
  const result=await commerceApi('catalog');
  window.sharedProducts=result.products;window.sharedSales=result.sales||{};
}
const languages={
 zh:{shop:'Sable & Fern',search:'搜索',placeholder:'搜索商品名称或 SKU',all:'全部分类',tech:'数码',home:'家居',kitchen:'厨房',auto:'车品',cart:'购物车',account:'我的账户',login:'登录 / 注册',logout:'退出',detail:'查看详情',quantity:'数量',buy:'加入购物车',description:'商品介绍',config:'配置',color:'颜色',market:'市场'},
 en:{shop:'Sable & Fern',search:'Search',placeholder:'Search products or SKU',all:'All categories',tech:'Electronics',home:'Home',kitchen:'Kitchen',auto:'Automotive',cart:'Cart',account:'My account',login:'Sign in / Register',logout:'Sign out',detail:'View product',quantity:'Quantity',buy:'Add to cart',description:'Product details',config:'Configuration',color:'Color',market:'Market'},
 fr:{shop:'Sable & Fern',search:'Rechercher',placeholder:'Rechercher un produit ou SKU',all:'Toutes les catégories',tech:'Électronique',home:'Maison',kitchen:'Cuisine',auto:'Auto',cart:'Panier',account:'Mon compte',login:'Connexion / Inscription',logout:'Déconnexion',detail:'Voir le produit',quantity:'Quantité',buy:'Ajouter au panier',description:'Description',config:'Configuration',color:'Couleur',market:'Marché'}
};
const locale=()=>{
  const url=new URLSearchParams(location.search).get('lang');
  const chosen=url||localStorage.getItem('commerce-language');
  return Object.hasOwn(languages,chosen)?chosen:'zh';
};
const translate=key=>languages[locale()][key]||key;
const deliveryCountries=['津巴布韦','肯尼亚','坦桑尼亚'];
function deliveryCountry(){
  const country=localStorage.getItem('commerce-delivery-country');
  return deliveryCountries.includes(country)?country:'';
}
function initShopNav(){
  document.documentElement.lang=locale()==='zh'?'zh-CN':locale();
  const nav=document.getElementById('shop-nav');
  if(!nav)return;

  nav.innerHTML='<div class="shop-top"><a class="brand" href="storefront.html"></a><form action="storefront.html"><input name="q"><button></button></form><div class="shop-actions"><a href="checkout.html" data-word="cart"></a><a href="account.html" data-word="login"></a><select id="delivery-country"></select><select aria-label="Display currency" id="currency"><option value="USD">USD</option><option value="EUR">EUR ≈</option><option value="GBP">GBP ≈</option></select><select aria-label="Language" id="language"><option value="zh">简体中文</option><option value="en">English</option><option value="fr">Français</option></select></div></div><nav class="shop-categories" aria-label="Category"></nav>';
  nav.querySelector('.brand').textContent=translate('shop');
  const country=nav.querySelector('#delivery-country');
  const countryLabel=phrase('配送国家');
  country.setAttribute('aria-label',countryLabel);
  const placeholder=new Option(phrase('选择配送国家'),'');
  country.replaceChildren(placeholder,...deliveryCountries.map(value=>new Option(countryLabel+' · '+phrase(value),value)));
  country.value=deliveryCountry();
  country.onchange=()=>{
    if(country.value)localStorage.setItem('commerce-delivery-country',country.value);
    else localStorage.removeItem('commerce-delivery-country');
    const url=new URL(location.href);url.searchParams.delete('market');location.assign(url);
  };
  const search=nav.querySelector('[name=q]');
  search.placeholder=translate('placeholder');search.setAttribute('aria-label',translate('search'));
  search.value=new URLSearchParams(location.search).get('q')||'';
  nav.querySelector('button').textContent=translate('search');
  for(const link of nav.querySelectorAll('[data-word]'))link.textContent=translate(link.dataset.word);
  const selector=nav.querySelector('#language');selector.value=locale();
  selector.onchange=()=>{
    localStorage.setItem('commerce-language',selector.value);
    const url=new URL(location.href);url.searchParams.set('lang',selector.value);location.assign(url);
  };
  const currency=nav.querySelector('#currency');
  currency.value=localStorage.getItem('commerce-currency')||'USD';
  const info={zh:'换算为演示汇率；结算币种为 USD',en:'Indicative demo conversion; settlement in USD',fr:'Conversion indicative de démonstration ; règlement en USD'};
  currency.title=info[locale()];
  currency.onchange=()=>{localStorage.setItem('commerce-currency',currency.value);location.reload();};
  if(new URLSearchParams(location.search).has('lang'))localStorage.setItem('commerce-language',locale());
  translatePage();

  const locationQuery=new URLSearchParams(location.search);
  const isShop=location.pathname==='/'||location.pathname.endsWith('/storefront.html');
  const mode=locationQuery.has('q')?'products':locationQuery.get('view')||(locationQuery.has('category')?'categories':'home');
  const navWords={zh:['首页','分类','商品','配送说明'],en:['Home','Categories','Products','Delivery'],fr:['Accueil','Catégories','Produits','Livraison']}[locale()];
  const destinations=['storefront.html','storefront.html?view=categories','storefront.html?view=products','storefront.html?view=delivery'];
  for(const [index,key] of ['home','categories','products','delivery'].entries()){
    const link=document.createElement('a');
    link.href=destinations[index];link.textContent=navWords[index];
    if(isShop&&mode===key){link.className='selected';link.setAttribute('aria-current','page');}
    nav.querySelector('nav').append(link);
  }
  commerceApi('session').then(session=>{
    const link=nav.querySelector('[data-word=login]');
    if(session.signedIn)link.textContent=translate('account');
    if(session.admin){
      const admin=document.createElement('a');admin.href='workflow.html';admin.textContent='运营台';link.after(admin);
    }
  }).catch(()=>{});
}

const phraseBook={
 '配送国家':['Ship to','Livrer en'],'选择配送国家':['Choose shipping country','Choisir le pays de livraison'],
 '请在顶部选择收货地址所在的国家，以查看可购买的商品。':['Choose your shipping country above to see available products.','Choisissez le pays de livraison ci-dessus pour voir les produits disponibles.'],
 '此商品暂不配送到你选择的国家。':['This item cannot be delivered to your selected country.','Cet article ne peut pas être livré dans le pays sélectionné.'],
 '该商品暂不可配送':['Unavailable for delivery','Livraison indisponible'],
 '继续选购':['Continue shopping','Continuer vos achats'],'返回商城':['Back to shop','Retour à la boutique'],
 '购物车与结账':['Cart and checkout','Panier et commande'],'购物车商品':['Cart items','Articles du panier'],
 '收货信息':['Delivery details','Adresse de livraison'],'收件人':['Recipient','Destinataire'],
 '联系电话':['Phone number','Téléphone'],'城市':['City','Ville'],'详细地址':['Street address','Adresse complète'],
 '提交模拟 COD 订单':['Place test COD order','Passer la commande test'],'数量':['Quantity','Quantité'],
 '规格与包装':['Specifications and packaging','Caractéristiques et emballage'],
 '配送与售后':['Shipping and returns','Livraison et retours'],
 '展示店铺 · 模拟下单不收款':['Demo store · test orders are free','Boutique démo · aucune somme prélevée'],
 '模拟 COD · 请使用测试收货资料 · USD':['Test COD · use sample delivery details · USD','Paiement test à la livraison · utilisez des coordonnées fictives · USD'],
 '该商品当前不可浏览。请返回商城选择其他商品。':['This product is unavailable. Choose another item in the shop.','Ce produit est indisponible. Choisissez un autre article.'],
 '购物车为空。':['Your cart is empty.','Votre panier est vide.'],'移除':['Remove','Retirer'],
 '请选择商品':['Choose a product','Choisissez un produit'],'配送市场':['Delivery market','Marché de livraison'],
 '到付合计':['Total due on delivery','Total à la livraison'],'模拟运费':['Test shipping','Livraison test'],
 '商品':['Items','Articles'],'暂无图片':['No image','Aucune image'],'图片暂不可用':['Image unavailable','Image indisponible'],
 '没有找到匹配的商品。':['No matching products.','Aucun produit correspondant.'],
 '暂无商品描述。':['No description yet.','Aucune description pour le moment.'],
 '已加入购物车。':['Added to cart.','Ajouté au panier.'],'查看购物车':['View cart','Voir le panier'],
 '参考摄影':['Reference photography','Photographie indicative'],
 '津巴布韦':['Zimbabwe','Zimbabwe'],'肯尼亚':['Kenya','Kenya'],'坦桑尼亚':['Tanzania','Tanzanie']
};
function phrase(value){
  const index=locale()==='en'?0:locale()==='fr'?1:-1;
  return index<0?value:phraseBook[value]?.[index]||value;
}
function translatePage(){
  const walker=document.createTreeWalker(document.querySelector('main'),NodeFilter.SHOW_TEXT);
  while(walker.nextNode()){
    const node=walker.currentNode, value=node.textContent.trim();
    if(value&&Object.hasOwn(phraseBook,value))node.textContent=node.textContent.replace(value,phrase(value));
  }
}
const sampleRates={USD:1,EUR:.9,GBP:.8};
function displayMoney(amount){
  const stored=localStorage.getItem('commerce-currency'),currency=Object.hasOwn(sampleRates,stored)?stored:'USD';
  const formatted=new Intl.NumberFormat(locale(),{style:'currency',currency}).format(amount*sampleRates[currency]);
  return currency==='USD'?formatted:formatted+' ≈';
}
const seedText={
 'ZW-101':[['Wireless headphones','Over-ear headphones for podcasts and everyday listening.'],['Casque sans fil','Casque circum-aural pour les podcasts et l’écoute quotidienne.']],
 'ZW-102':[['Sports smartwatch','A sporty smartwatch for everyday wear. Check model compatibility before ordering.'],['Montre connectée sport','Une montre sportive au quotidien. Vérifiez la compatibilité du modèle.']],
 'ZW-103':[['Solar garden light','Light garden paths with a solar-powered stake light.'],['Lampe solaire de jardin','Éclairez les allées avec cette lampe solaire sur piquet.']],
 'KE-101':[['Portable blender','A cup-style blender for small portions of fruit drinks.'],['Mixeur portable','Un mixeur nomade pour préparer de petites portions de boissons fruitées.']],
 'KE-102':[['Car vacuum','A handheld vacuum for seats, mats and other small spaces.'],['Aspirateur pour voiture','Un aspirateur à main pour les sièges, tapis et petits espaces.']],
 'KE-103':[['Foldable storage box','Organize everyday items in a box that folds away when empty.'],['Boîte de rangement pliable','Organisez vos affaires dans une boîte pliable.']],
 'TZ-101':[['Mini projector','A compact projector for a tabletop viewing setup.'],['Mini-projecteur','Un projecteur compact à installer sur une table.']],
 'TZ-102':[['Vegetable chopper','Prepare vegetables for everyday cooking.'],['Coupe-légumes','Préparez facilement les légumes du quotidien.']],
 'TZ-103':[['Emergency lantern','A portable light for short outages and camping.'],['Lanterne de secours','Une lumière portable pour les pannes et le camping.']]
};
function translatedProduct(product){
  const index=locale()==='en'?0:locale()==='fr'?1:-1;
  const content=product.reference&&seedText[product.sku]?.[index];
  return content?{...product,name:content[0],description:content[1]}:product.localizedNames?.[locale()]?{...product,name:product.localizedNames[locale()]}:product;
}
