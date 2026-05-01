
-- Create membership level enum
CREATE TYPE public.membership_level AS ENUM ('associate', 'member', 'fellow');

-- Create membership status enum  
CREATE TYPE public.membership_status AS ENUM ('pending', 'active', 'expiring', 'expired');

-- Create members table
CREATE TABLE public.members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  country TEXT,
  membership_level membership_level,
  member_id TEXT NOT NULL UNIQUE,
  status membership_status NOT NULL DEFAULT 'pending',
  post_nominal TEXT,
  issue_date DATE,
  expiry_date DATE,
  payment_status TEXT DEFAULT 'unpaid',
  payment_reference TEXT,
  certificate_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index on member_id for fast verification lookups
CREATE INDEX idx_members_member_id ON public.members(member_id);
CREATE INDEX idx_members_user_id ON public.members(user_id);
CREATE INDEX idx_members_status ON public.members(status);
CREATE INDEX idx_members_expiry_date ON public.members(expiry_date);

-- Enable RLS
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- Members can view their own record
CREATE POLICY "Members can view own record"
  ON public.members FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::text);

-- Admins can do everything
CREATE POLICY "Admins can manage all members"
  ON public.members FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()::text));

-- Public verification: anyone can look up by member_id (read-only, limited columns via API)
CREATE POLICY "Public can verify members"
  ON public.members FOR SELECT
  TO anon
  USING (status IN ('active', 'expiring', 'expired'));

-- Create email reminder logs table
CREATE TABLE public.email_reminder_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
  email_type TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'sent',
  error_message TEXT
);

CREATE INDEX idx_email_logs_member ON public.email_reminder_logs(member_id);
CREATE INDEX idx_email_logs_type ON public.email_reminder_logs(email_type);

ALTER TABLE public.email_reminder_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view email logs
CREATE POLICY "Admins can view email logs"
  ON public.email_reminder_logs FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()::text));

CREATE POLICY "Admins can insert email logs"
  ON public.email_reminder_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()::text));

-- Trigger for updated_at
CREATE TRIGGER update_members_updated_at
  BEFORE UPDATE ON public.members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate unique 6-digit member ID
CREATE OR REPLACE FUNCTION public.generate_member_id()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  new_id TEXT;
  exists_already BOOLEAN;
BEGIN
  LOOP
    new_id := LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0');
    SELECT EXISTS(SELECT 1 FROM public.members WHERE member_id = new_id) INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  RETURN new_id;
END;
$$;
