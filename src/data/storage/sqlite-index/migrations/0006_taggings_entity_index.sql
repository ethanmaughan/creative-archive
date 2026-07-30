-- Index taggings by entity so we can prune/replace a single document's tags cheaply
-- (the PK leads with tag_id, which doesn't help entity-scoped lookups).
CREATE INDEX idx_taggings_entity ON taggings (entity_type, entity_id);
