-- Add attachment_urls column to forum_replies table
ALTER TABLE public.forum_replies
  ADD COLUMN IF NOT EXISTS attachment_urls text[];

-- Add comment for documentation
COMMENT ON COLUMN public.forum_replies.attachment_urls IS 'Array of URLs for file attachments (images, PDFs, etc.)';
