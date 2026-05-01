-- Add end_date column to themes table
-- Allows users to define custom end date for each theme

ALTER TABLE themes ADD COLUMN end_date DATE;

-- Optional: add an index for queries filtering by end_date
CREATE INDEX idx_themes_end_date ON themes(end_date);
