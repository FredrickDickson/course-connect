-- Add transcript support for lessons
-- This allows storing timestamped transcriptions for video/audio content

ALTER TABLE lessons ADD COLUMN IF NOT EXISTS transcript JSONB;

COMMENT ON COLUMN lessons.transcript IS 'Timestamped transcript entries in format: [{"timestamp": "0:00", "text": "..."}]';

-- Example transcript format:
-- [
--   {"timestamp": "0:00", "text": "Welcome to CIMA Learn..."},
--   {"timestamp": "0:15", "text": "Negotiation is the most simple process..."}
-- ]
