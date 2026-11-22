CREATE TABLE product_visits (
  day TEXT NOT NULL,
  market TEXT NOT NULL,
  sku TEXT NOT NULL,
  user_id TEXT NOT NULL,
  PRIMARY KEY (day, market, sku, user_id)
);
