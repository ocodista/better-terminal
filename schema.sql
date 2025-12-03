-- Cloudflare D1 Schema for better-shell telemetry
-- This stores anonymous installation telemetry data

-- Installation events table
CREATE TABLE IF NOT EXISTS installations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  -- Anonymous session identifier (hashed)
  session_hash TEXT NOT NULL,
  -- Platform info
  os TEXT NOT NULL,
  os_version TEXT,
  arch TEXT NOT NULL,
  -- Installation metadata
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  duration_ms INTEGER,
  -- Overall status
  status TEXT NOT NULL DEFAULT 'started', -- started, completed, failed, cancelled
  -- Installation mode
  interactive BOOLEAN NOT NULL DEFAULT 0,
  minimal BOOLEAN NOT NULL DEFAULT 0,
  -- Version
  cli_version TEXT NOT NULL
);

-- Tool installation results
CREATE TABLE IF NOT EXISTS tool_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  installation_id INTEGER NOT NULL,
  tool_id TEXT NOT NULL,
  status TEXT NOT NULL, -- installed, skipped, failed
  duration_ms INTEGER,
  error_message TEXT,
  FOREIGN KEY (installation_id) REFERENCES installations(id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_installations_started_at ON installations(started_at);
CREATE INDEX IF NOT EXISTS idx_installations_status ON installations(status);
CREATE INDEX IF NOT EXISTS idx_installations_os ON installations(os);
CREATE INDEX IF NOT EXISTS idx_tool_results_tool_id ON tool_results(tool_id);
CREATE INDEX IF NOT EXISTS idx_tool_results_status ON tool_results(status);
