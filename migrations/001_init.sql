CREATE TABLE IF NOT EXISTS images (
  id TEXT PRIMARY KEY,
  file_path TEXT NOT NULL,
  source_url TEXT NOT NULL,
  license TEXT NOT NULL,
  expected_subject TEXT NOT NULL,
  expected_category TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS image_metadata (
  image_id TEXT PRIMARY KEY REFERENCES images(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  category TEXT NOT NULL,
  attributes JSONB NOT NULL,
  caption TEXT NOT NULL,
  confidence NUMERIC NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  status TEXT NOT NULL CHECK (status IN ('accepted', 'flagged', 'failed')),
  failure_reason TEXT,
  model TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS image_vectors (
  image_id TEXT PRIMARY KEY REFERENCES images(id) ON DELETE CASCADE,
  embedding JSONB NOT NULL,
  model TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  expected_subject TEXT,
  expected_category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS post_vectors (
  post_id TEXT PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
  embedding JSONB NOT NULL,
  model TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS suggestions (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  image_id TEXT REFERENCES images(id) ON DELETE SET NULL,
  rank INTEGER NOT NULL,
  similarity NUMERIC NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('suggested', 'rejected', 'no_confident_match')),
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  suggestion_id TEXT NOT NULL REFERENCES suggestions(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('approved', 'rejected')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'complete', 'failed')),
  total INTEGER NOT NULL DEFAULT 0,
  processed INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS cost_logs (
  id TEXT PRIMARY KEY,
  job_id TEXT REFERENCES jobs(id) ON DELETE SET NULL,
  call_type TEXT NOT NULL CHECK (call_type IN ('vision', 'embedding')),
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  input_units INTEGER NOT NULL DEFAULT 0,
  output_units INTEGER NOT NULL DEFAULT 0,
  estimated_cost_usd NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_images_category ON images(expected_category);
CREATE INDEX IF NOT EXISTS idx_metadata_subject ON image_metadata(subject);
CREATE INDEX IF NOT EXISTS idx_metadata_category ON image_metadata(category);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(expected_category);
CREATE INDEX IF NOT EXISTS idx_suggestions_post ON suggestions(post_id, rank);
CREATE INDEX IF NOT EXISTS idx_cost_logs_job ON cost_logs(job_id);
