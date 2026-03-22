-- PDI Board — Initial Schema
-- Run this in Supabase SQL Editor (or any PostgreSQL instance)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- PDIs: each user (identified by Clerk user_id) can have multiple PDIs
CREATE TABLE IF NOT EXISTS pdis (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL,
  title       TEXT NOT NULL DEFAULT 'Meu PDI',
  start_date  DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Themes: each PDI has N themes
CREATE TABLE IF NOT EXISTS themes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pdi_id         UUID NOT NULL REFERENCES pdis(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  color          TEXT NOT NULL DEFAULT '#3b82f6',
  position       INT NOT NULL DEFAULT 0,
  token_position INT NOT NULL DEFAULT 0
);

-- Checkpoints: each theme has N checkpoints
CREATE TABLE IF NOT EXISTS checkpoints (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id   UUID NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  month      INT NOT NULL,
  biweekly   INT NOT NULL,
  type       TEXT NOT NULL DEFAULT 'normal', -- normal | bonus | setback | milestone
  status     TEXT NOT NULL DEFAULT 'planned', -- planned | in-progress | done
  points     INT NOT NULL DEFAULT 0,
  notes      TEXT DEFAULT '',
  links      JSONB DEFAULT '[]'
);

-- 1:1 meetings
CREATE TABLE IF NOT EXISTS one_on_ones (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pdi_id     UUID NOT NULL REFERENCES pdis(id) ON DELETE CASCADE,
  date       DATE,
  notes      TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Evidence
CREATE TABLE IF NOT EXISTS evidence (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pdi_id        UUID NOT NULL REFERENCES pdis(id) ON DELETE CASCADE,
  checkpoint_id UUID REFERENCES checkpoints(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  url           TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_pdis_clerk_user ON pdis(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_themes_pdi ON themes(pdi_id);
CREATE INDEX IF NOT EXISTS idx_checkpoints_theme ON checkpoints(theme_id);
CREATE INDEX IF NOT EXISTS idx_oneononoes_pdi ON one_on_ones(pdi_id);
CREATE INDEX IF NOT EXISTS idx_evidence_pdi ON evidence(pdi_id);
