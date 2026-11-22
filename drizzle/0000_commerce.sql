CREATE TABLE commerce_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  revision INTEGER NOT NULL DEFAULT 0,
  data TEXT NOT NULL DEFAULT '{"products":[],"orders":[],"users":{},"days":[]}'
);
--> statement-breakpoint
INSERT INTO commerce_state (id) VALUES (1);
