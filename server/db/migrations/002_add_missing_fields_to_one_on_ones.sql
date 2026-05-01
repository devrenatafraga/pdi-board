-- PDI Board — Add missing fields to one_on_ones
-- Adds checkpoint_id and points fields to track which checkpoint was discussed and points awarded

ALTER TABLE one_on_ones
ADD COLUMN theme_id UUID REFERENCES themes(id) ON DELETE SET NULL,
ADD COLUMN checkpoint_id UUID REFERENCES checkpoints(id) ON DELETE SET NULL,
ADD COLUMN points INT DEFAULT 0;

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_one_on_ones_checkpoint ON one_on_ones(checkpoint_id);
CREATE INDEX IF NOT EXISTS idx_one_on_ones_theme ON one_on_ones(theme_id);
