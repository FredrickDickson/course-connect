-- Migration: Rename user_track_progress to track_progress
-- This migration fixes the table name mismatch between the schema and the actual table
-- Safe to run multiple times - checks if old table exists before renaming

-- Check if the old table exists and rename it
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'user_track_progress'
        AND table_schema = 'public'
    ) THEN
        -- Rename the table
        ALTER TABLE user_track_progress RENAME TO track_progress;
        
        -- Rename the index
        IF EXISTS (
            SELECT 1 
            FROM pg_indexes 
            WHERE indexname = 'idx_user_track_progress_user_id'
        ) THEN
            ALTER INDEX idx_user_track_progress_user_id RENAME TO idx_track_progress_user_id;
        END IF;
        
        IF EXISTS (
            SELECT 1 
            FROM pg_indexes 
            WHERE indexname = 'idx_user_track_progress_track'
        ) THEN
            ALTER INDEX idx_user_track_progress_track RENAME TO idx_track_progress_track;
        END IF;
        
        IF EXISTS (
            SELECT 1 
            FROM pg_indexes 
            WHERE indexname = 'idx_user_track_progress_level'
        ) THEN
            ALTER INDEX idx_user_track_progress_level RENAME TO idx_track_progress_level;
        END IF;
        
        -- Rename the trigger
        IF EXISTS (
            SELECT 1 
            FROM pg_trigger 
            WHERE tgname = 'update_user_track_progress_updated_at'
        ) THEN
            ALTER TRIGGER update_user_track_progress_updated_at ON track_progress RENAME TO update_track_progress_updated_at;
        END IF;
        
        RAISE NOTICE 'Renamed user_track_progress to track_progress';
    ELSE
        RAISE NOTICE 'Table user_track_progress does not exist - assuming track_progress already exists';
    END IF;
END $$;
