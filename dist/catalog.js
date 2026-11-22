const stores={
  '津巴布韦':{name:'Harare Finds',info:'面向津巴布韦市场的数码与日用好物。',products:[['ZW-101','蓝牙无线耳机',29,'🎧'],['ZW-102','运动智能手表',39,'⌚'],['ZW-103','太阳能庭院灯',24,'💡']]},
  '肯尼亚':{name:'Nairobi Market',info:'面向肯尼亚市场的厨房、家居与出行用品。',products:[['KE-101','便携榨汁杯',25,'🥤'],['KE-102','车载吸尘器',35,'🚙'],['KE-103','折叠收纳箱',22,'📦']]},
  '坦桑尼亚':{name:'Dar Select',info:'面向坦桑尼亚市场的家居与便携设备。',products:[['TZ-101','迷你投影仪',85,'📽️'],['TZ-102','多功能切菜器',19,'🥕'],['TZ-103','便携应急灯',26,'🔦']]}
};
const photos={
 'ZW-103':'https://mobileimages.lowes.com/productimages/18b434da-1e93-41cc-969b-28e429e55211/61410922.jpg?size=pdhism',
 'KE-101':'https://www.homesmiths.ae/cdn/shop/files/904354.jpg?v=1750254046',
 'KE-102':'https://image.rakuten.co.jp/hype/cabinet/sgazo42/7987730_2.jpg',
 'KE-103':'https://www.vinogasg.com/cdn/shop/files/VINOGATEMPLATEOriginal____1.jpg?v=1707899089',
 'TZ-102':'https://img.kilimall.com/c/obs/seller/100004158/goods_image/250331113443_5c1d776af442b60ee830daa9057f6eee.jpg',
 'TZ-103':'https://img.mbizmarket.co.id/products/thumbs/800x800/2023/04/04/16f91f9f2efb5f697fcd67403eea36a0.jpg',
 'ZW-101':'https://images.unsplash.com/photo-1613629758552-443027994609?auto=format&fit=crop&w=900&q=82',
 'ZW-102':'https://images.unsplash.com/photo-1548960254-5139d80bd5ec?auto=format&fit=crop&w=900&q=82',
 'TZ-101':'https://oriwhiz.com/cdn/shop/files/TBD0604752201A_a41d6729-9ba8-4837-b08c-bfec1024eb55.jpg?width=900'
};
const copy={
 'ZW-101':'头戴式无线耳机，适合通勤时听播客，也可以放在书桌旁用于日常影音。',
 'ZW-102':'运动风格智能手表，适合日常佩戴。可根据运动记录需求和手机系统确认适配型号。',
 'ZW-103':'给庭院小径和花坛增加夜间照明，可选择白天有直射阳光的位置摆放。',
 'KE-101':'适合准备少量现打果饮，杯体兼作搅拌容器。使用前可先将水果切小。',
 'KE-102':'用于清理车内座椅缝隙、脚垫和后备箱里的碎屑。',
 'KE-103':'用于分类整理衣物、杂物和随车用品，空置时可折叠收纳。',
 'TZ-101':'适合布置桌面观影角。选购时可核对投影距离、接口和供电要求。',
 'TZ-102':'适合备餐时处理常见蔬菜。使用后可清洗接触食物的部件。',
 'TZ-103':'可放在玄关、床边或露营包里，用于停电或夜间短时照明。'
};
const sampleGalleries={
  'ZW-101':['https://images.unsplash.com/photo-1628116709703-c1c9ad550d36?auto=format&fit=crop&w=1200&q=82'],
  'ZW-102':['https://images.unsplash.com/photo-1637756856827-6be13c20ec72?auto=format&fit=crop&w=1200&q=82','https://images.unsplash.com/photo-1639055038710-3c83fe307708?auto=format&fit=crop&w=1200&q=82'],
  'KE-102':['https://www.mayoreototal.mx/cdn/shop/files/e24ce8f83fed4fdec757e06711bfc43f_945x.jpg?v=1729198972'],
  'TZ-101':['https://img.ricardostatic.ch/images/ca01d55a-b973-47a8-b284-6a32fdb39656/t_1800x1350/neuwertiger-mini-beamer-hy300-perfekt-fur-den-sommer'],
  'TZ-102':['https://i5-mx.walmartimages.com/mg/gm/3pp/asr/999f01c0-7572-497c-ac15-cf9e36279b51.32ebdf0f1abf981e2c643ddf2d041e46.jpeg?odnBg=ffffff&odnHeight=800&odnWidth=800'],
  'TZ-103':['https://down-id.img.susercontent.com/file/id-11134207-23030-s0uxa14xkvov3d','https://down-id.img.susercontent.com/file/id-11134207-7qul1-li8int70w9eh83'],
  'KE-101':['https://i.rtings.com/assets/products/zIK9C3Mk/blendjet-2/design-large.jpg','https://www.bigw.com.au/medias/sys_master/images/images/he4/h84/51535377596446.jpg']
};
const sampleCategories={'ZW-101':'tech','ZW-102':'tech','ZW-103':'home','KE-101':'kitchen','KE-102':'auto','KE-103':'home','TZ-101':'tech','TZ-102':'kitchen','TZ-103':'home'};
const sampleVariants={'KE-101':[
  {sku:'KE-101-MINT-STD',configuration:'Standard',color:'Mint',price:25,inventory:12},
  {sku:'KE-101-MINT-PLUS',configuration:'With spare cup',color:'Mint',price:31,inventory:7},
  {sku:'KE-101-BLK-STD',configuration:'Standard',color:'Black',price:26,inventory:9}
]};
const newSamples=[
  ['SF-201','紧凑机械键盘','Compact mechanical keyboard','Clavier mécanique compact',49,'tech','适合书桌或紧凑工作台的机械键盘。','https://images.unsplash.com/photo-1632079003110-d694908500da?auto=format&fit=crop&w=1200&q=82',['https://images.unsplash.com/photo-1634306625640-04ac053e544b?auto=format&fit=crop&w=1200&q=82'],48],
  ['SF-202','极简桌面台灯','Minimal desk lamp','Lampe de bureau minimaliste',34,'home','适合书桌、床头或阅读角的桌面照明。','https://amoslighting.co.uk/cdn/shop/files/843b84696e0f676a88c70d7f3d0f6ac5344c0aca.jpg?width=1000',['https://amoslighting.co.uk/cdn/shop/files/835ccdaf0c6372b722b797ddebceb5aa9a917769.jpg?width=1000'],37],
  ['SF-203','便携保温水壶','Insulated travel bottle','Gourde isotherme',23,'kitchen','适合上下班、健身与短途出行携带。','https://media.promobrands.com.au/app/uploads/DSC09620-scaled.jpg',['https://lcofficial.com/cdn/shop/files/l-couture-water-bottles-insulated-water-bottle-black-29254190366769.jpg'],61],
  ['SF-204','陶瓷咖啡杯','Ceramic coffee mug','Tasse à café en céramique',14,'kitchen','日常咖啡、茶饮或办公桌上的简洁杯具。','https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=1000&q=82',['https://images.unsplash.com/photo-1735567645260-b60c388325a6?auto=format&fit=crop&w=1000&q=82'],82],
  ['SF-205','车载手机支架','Car phone mount','Support de téléphone pour voiture',16,'auto','日常驾车时便于固定手机。安装位置应保持视线通畅。','https://d2v80xjmx68n4w.cloudfront.net/members/portfolios/GJ4Wb1695057906.png?w=800',['https://techunion.com.au/cdn/shop/products/3sixt-long-arm-window-mount-3s-0564-automotive-317521_grande.jpg'],42],
  ['SF-206','折叠后备箱收纳袋','Foldable trunk organizer','Organiseur de coffre pliable',28,'auto','用于整理购物袋、随车用品和短途出行物品。','https://cdn.salla.sa/XyApj/heY9p6GtWyVmyHiJIv2H18i2IXhhZTfu4j6aQP1D.jpg',['https://drivr.com.br/cdn/shop/files/Fotoorganizador-com-produtos.jpg?width=900'],29]
].map(([sku,name,en,fr,price,category,description,image,gallery,sampleSales],index)=>({
  sku,name,localizedNames:{en,fr},price,category,description,image,gallery,sampleSales,
  saleCountries:Object.keys(stores),inventory:24,reference:true,createdAt:'2026-11-'+(16+index),
  variants:[
    {sku:sku+'-S',configuration:'标准',color:'经典色',price,inventory:18},
    {sku:sku+'-L',configuration:'大号',color:'经典色',price:price+4,inventory:12},
    {sku:sku+'-S-D',configuration:'标准',color:'深色',price:price+2,inventory:10}
  ]
}));
function saleCountries(product){
  return Array.isArray(product.saleCountries)?product.saleCountries:[product.market];
}
function marketCatalog(market, products){
  if(!Object.hasOwn(stores,market))return [];
  const catalog=new Map(stores[market].products.map(([sku,name,price])=>[
    sku,{sku,name,price,market,image:photos[sku],description:copy[sku],gallery:sampleGalleries[sku]||[],category:sampleCategories[sku],variants:sampleVariants[sku]||[],inventory:20,reference:true,sampleSales:12+Number(sku.slice(-1))*7}
  ]));
  for(const product of newSamples)catalog.set(product.sku,{...product,market});
  for(const product of products.filter(p=>p.listed&&saleCountries(p).includes(market)))catalog.set(product.sku,product);
  return [...catalog.values()];
}
function listedProducts(market){
  return marketCatalog(market,window.sharedProducts||[]);
}
function detailUrl(sku){
  return 'product.html?'+new URLSearchParams({sku});
}
function productImages(product){
  return [...new Set([product.image,...(product.gallery||[])].filter(Boolean))];
}