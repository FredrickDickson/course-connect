INSERT INTO categories (name, slug, description) VALUES
  ('Ethics', 'ethics', 'Professional ethics and conduct courses'),
  ('Corporate Governance', 'corporate-governance', 'Corporate governance and board management'),
  ('Compliance', 'compliance', 'Regulatory compliance and risk management'),
  ('Human Rights Law', 'human-rights-law', 'Human rights and humanitarian law'),
  ('Maritime Law', 'maritime-law', 'Maritime and admiralty law'),
  ('Environmental Law', 'environmental-law', 'Environmental regulation and policy'),
  ('Contract Law', 'contract-law', 'Contract drafting and enforcement'),
  ('Intellectual Property', 'intellectual-property', 'IP law, patents, trademarks, and copyright'),
  ('Tax Law', 'tax-law', 'Taxation and fiscal law'),
  ('Real Estate Law', 'real-estate-law', 'Property and real estate law'),
  ('Family Law', 'family-law', 'Family and domestic relations law'),
  ('Criminal Law', 'criminal-law', 'Criminal justice and procedure'),
  ('Employment Law', 'employment-law', 'Labor and employment regulations'),
  ('Banking & Finance', 'banking-finance', 'Banking, finance, and securities law'),
  ('Technology & Cyber Law', 'technology-cyber-law', 'Tech regulation, data privacy, and cybersecurity')
ON CONFLICT DO NOTHING;