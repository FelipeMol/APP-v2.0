-- Migration: add latitude and longitude columns to obras table
-- These columns enable displaying obras as map markers on the dashboard.

ALTER TABLE obras
  ADD COLUMN IF NOT EXISTS latitude  NUMERIC(10, 7) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7) DEFAULT NULL;
