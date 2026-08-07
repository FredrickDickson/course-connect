-- Add the missing foreign key from certifications.user_id to users.id.
--
-- certifications.course_id already has a FK (certifications_course_id_fkey),
-- but user_id never got one — likely another instance of the migration-drift
-- pattern already documented elsewhere in this repo. Without it, PostgREST
-- cannot resolve the embedded-resource shorthand `user:users(...)` used by
-- storage.getCertificationById() (server/storage.ts), so GET
-- /api/certifications/:id 500s on every request with "Could not find a
-- relationship between 'certifications' and 'users'" — the
-- certificate-of-completion page is unusable for every certificate, always.
--
-- Verified safe to add: zero existing certifications rows have a user_id
-- that doesn't match a real users.id.

ALTER TABLE public.certifications
  ADD CONSTRAINT certifications_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
