-- Replace random 6-digit member IDs with a sequential CIMA-000001 style format.
-- A real sequence guarantees uniqueness and ordering, so the old
-- generate-random-and-retry-on-collision loop is no longer needed.
CREATE SEQUENCE IF NOT EXISTS public.member_id_seq START WITH 1;

CREATE OR REPLACE FUNCTION public.generate_member_id()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  new_id TEXT;
BEGIN
  new_id := 'CIMA-' || LPAD(nextval('public.member_id_seq')::TEXT, 6, '0');
  RETURN new_id;
END;
$$;
