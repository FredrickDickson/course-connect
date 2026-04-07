INSERT INTO public.members (user_id, full_name, email, member_id, membership_level, status, issue_date, expiry_date, post_nominal)
VALUES (
  '6a177f96-d829-4810-a044-33be13803e35',
  'Fredrick Dickson',
  'fredrickdickson026@gmail.com',
  (SELECT generate_member_id()),
  'member',
  'active',
  '2025-01-15',
  '2026-01-15',
  'MCIMArb'
);