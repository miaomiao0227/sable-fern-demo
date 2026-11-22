const mockOrderKey = 'commerce-mock-orders-v1';
function loadMockOrders(){
  return JSON.parse(localStorage.getItem(mockOrderKey)||'[]');
}
function updateMockOrders(update){
  const orders=loadMockOrders();
  update(orders);
  localStorage.setItem(mockOrderKey,JSON.stringify(orders));
}
function orderProfit(order){
  return order.status==='signed' ? order.price*order.quantity-order.cost*order.quantity-order.shipping : 0;
}
