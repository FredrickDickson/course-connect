INSERT INTO categories (name, slug, description) VALUES
  ('Arbitration', 'arbitration', 'Courses on arbitration principles and practice'),
  ('Mediation', 'mediation', 'Courses on mediation techniques and conflict resolution'),
  ('Negotiation', 'negotiation', 'Courses on negotiation strategies'),
  ('Business Law', 'business-law', 'Business and commercial law courses'),
  ('International Law', 'international-law', 'International law and treaties'),
  ('Dispute Resolution', 'dispute-resolution', 'General dispute resolution methods'),
  ('Professional Development', 'professional-development', 'Career and skills development'),
  ('Leadership', 'leadership', 'Leadership and management courses')
ON CONFLICT DO NOTHING;