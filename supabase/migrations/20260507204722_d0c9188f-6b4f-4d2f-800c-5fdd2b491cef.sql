GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lessons TO authenticated;
GRANT SELECT ON TABLE public.lessons TO anon;
GRANT ALL ON TABLE public.lessons TO service_role;
GRANT USAGE ON SCHEMA public TO authenticated, anon, service_role;