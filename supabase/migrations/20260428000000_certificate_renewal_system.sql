-- Certificate Renewal System Database Schema Updates
-- Adds missing columns and tables for n8n workflow integration

-- Add renewal tracking columns to members table
ALTER TABLE public.members 
ADD COLUMN IF NOT EXISTS renewal_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_renewal_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS part TEXT; -- For membership level (associate, member, fellow)

-- Add status column to renewal_history table for tracking confirmation state
ALTER TABLE public.renewal_history
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP WITH TIME ZONE;

-- Create email_logs table for n8n to track sent reminder emails
CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  template_type TEXT NOT NULL, -- e.g., '60days', '30days', '7days', 'today', '30days_overdue'
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  email_to TEXT NOT NULL,
  subject TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for email_logs queries
CREATE INDEX IF NOT EXISTS idx_email_logs_member_id ON public.email_logs(member_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_template_type ON public.email_logs(template_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON public.email_logs(sent_at);

-- Create activity_log table for n8n to log renewal activities
CREATE TABLE IF NOT EXISTS public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- e.g., 'membership_renewed', 'certificate_generated'
  entity_type TEXT NOT NULL, -- e.g., 'member', 'certificate'
  entity_id UUID,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for activity_log queries
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON public.activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_action_type ON public.activity_log(action_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity_type ON public.activity_log(entity_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON public.activity_log(created_at);

-- Enable Row Level Security
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_logs
-- Service role can do everything
CREATE POLICY "Service role can manage email_logs" ON public.email_logs
  FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for activity_log
-- Service role can do everything
CREATE POLICY "Service role can manage activity_log" ON public.activity_log
  FOR ALL USING (auth.role() = 'service_role');

-- Users can read their own activity logs
CREATE POLICY "Users can read own activity_logs" ON public.activity_log
  FOR SELECT USING (auth.uid() = user_id);
