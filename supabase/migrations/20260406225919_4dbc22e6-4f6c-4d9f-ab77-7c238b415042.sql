
-- Course enrollments table
CREATE TABLE public.course_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_ref TEXT NOT NULL UNIQUE,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  ticket_type TEXT NOT NULL DEFAULT 'associate',
  ticket_price NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'GHS',
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  country TEXT,
  phone TEXT,
  whatsapp TEXT,
  institution TEXT,
  address TEXT,
  programme_selected TEXT,
  personal_statement TEXT,
  payment_method TEXT NOT NULL DEFAULT 'paystack' CHECK (payment_method IN ('paystack', 'bank_transfer', 'invoice')),
  payment_status TEXT NOT NULL DEFAULT 'pending_bank' CHECK (payment_status IN ('confirmed', 'pending_bank', 'pending_invoice', 'cancelled')),
  paystack_reference TEXT,
  admin_notes TEXT,
  invoice_expiry_date TIMESTAMP WITH TIME ZONE,
  user_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMP WITH TIME ZONE
);

-- Add ticket/capacity columns to courses
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS ticket_types JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS total_capacity INTEGER,
  ADD COLUMN IF NOT EXISTS enquiry_phone_1 TEXT,
  ADD COLUMN IF NOT EXISTS enquiry_phone_2 TEXT;

-- Course waitlist
CREATE TABLE public.course_waitlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  ticket_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Booking reference generator
CREATE OR REPLACE FUNCTION public.generate_booking_ref()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  year_str TEXT;
  seq_num INTEGER;
  new_ref TEXT;
BEGIN
  year_str := EXTRACT(YEAR FROM now())::TEXT;
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(booking_ref FROM 10) AS INTEGER)
  ), 0) + 1
  INTO seq_num
  FROM public.course_enrollments
  WHERE booking_ref LIKE 'CIMA-' || year_str || '-%';
  
  new_ref := 'CIMA-' || year_str || '-' || LPAD(seq_num::TEXT, 5, '0');
  NEW.booking_ref := new_ref;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_booking_ref
  BEFORE INSERT ON public.course_enrollments
  FOR EACH ROW
  WHEN (NEW.booking_ref IS NULL OR NEW.booking_ref = '')
  EXECUTE FUNCTION public.generate_booking_ref();

-- Indexes
CREATE INDEX idx_course_enrollments_course_id ON public.course_enrollments(course_id);
CREATE INDEX idx_course_enrollments_payment_status ON public.course_enrollments(payment_status);
CREATE INDEX idx_course_enrollments_email ON public.course_enrollments(email);
CREATE INDEX idx_course_enrollments_user_id ON public.course_enrollments(user_id);
CREATE INDEX idx_course_waitlist_course_id ON public.course_waitlist(course_id);

-- RLS
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_waitlist ENABLE ROW LEVEL SECURITY;

-- course_enrollments policies
CREATE POLICY "Admins can manage all course enrollments"
  ON public.course_enrollments FOR ALL
  TO authenticated
  USING (is_admin((auth.uid())::text));

CREATE POLICY "Users can view own course enrollments"
  ON public.course_enrollments FOR SELECT
  TO authenticated
  USING (user_id = (auth.uid())::text);

CREATE POLICY "Anyone can create course enrollments"
  ON public.course_enrollments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anon can create course enrollments"
  ON public.course_enrollments FOR INSERT
  TO anon
  WITH CHECK (true);

-- course_waitlist policies
CREATE POLICY "Admins can manage waitlist"
  ON public.course_waitlist FOR ALL
  TO authenticated
  USING (is_admin((auth.uid())::text));

CREATE POLICY "Anyone can join waitlist"
  ON public.course_waitlist FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Authenticated can join waitlist"
  ON public.course_waitlist FOR INSERT
  TO authenticated
  WITH CHECK (true);
