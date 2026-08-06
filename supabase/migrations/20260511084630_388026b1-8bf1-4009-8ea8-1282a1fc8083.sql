ALTER TABLE public.mux_assets
  ADD COLUMN IF NOT EXISTS mux_upload_id text,
  ADD COLUMN IF NOT EXISTS error_message text;

CREATE INDEX IF NOT EXISTS mux_assets_mux_upload_id_idx ON public.mux_assets(mux_upload_id);