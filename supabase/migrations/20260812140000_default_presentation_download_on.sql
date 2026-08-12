-- Default presentation downloads to ON: instructors previously had to opt in
-- per presentation, and every presentation uploaded before this migration
-- was locked out of downloads. Flip the default and backfill existing rows.
ALTER TABLE public.presentations ALTER COLUMN allow_download SET DEFAULT true;

UPDATE public.presentations SET allow_download = true WHERE allow_download = false;
