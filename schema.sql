-- Loot Logger Database Schema for Neon PostgreSQL
-- Run this in your Neon SQL Editor to create the table

CREATE TABLE IF NOT EXISTS loot_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    character VARCHAR(255) NOT NULL,
    character_class VARCHAR(50),
    character_level INTEGER,
    difficulty VARCHAR(50),
    item_name VARCHAR(255) NOT NULL,
    item_id VARCHAR(255),
    quality VARCHAR(50) NOT NULL DEFAULT 'normal',
    location VARCHAR(255),
    dropped_by VARCHAR(255),
    stats JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_loot_logs_timestamp ON loot_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_loot_logs_quality ON loot_logs(quality);
CREATE INDEX IF NOT EXISTS idx_loot_logs_character ON loot_logs(character);

-- Optional: Create a view for unique items
CREATE OR REPLACE VIEW unique_items AS
SELECT * FROM loot_logs WHERE quality = 'unique';

-- Optional: Create a view for set items
CREATE OR REPLACE VIEW set_items AS
SELECT * FROM loot_logs WHERE quality = 'set';
