-- ============================================
-- TEST: Submit Multiple Personal Notes Forms
-- Creates 5 different employee submissions
-- ============================================

-- Employee 1: Kwame Mensah (Male, Accra)
INSERT INTO personal_notes_forms (
  full_name, gender, date_of_birth, age, nationality, hometown, region, languages_spoken,
  ghana_card_no, street_area, town_city, gps_address,
  nok_name, nok_relationship, nok_telephone, nok_address,
  emergency_name, emergency_relationship, emergency_telephone, emergency_address,
  blood_group, rhesus_factor, medical_conditions,
  employee_signature_name, declaration_date
) VALUES (
  'Kwame Mensah', 'male', '1990-05-15', 34, 'Ghanaian', 'Kumasi', 'Ashanti', ARRAY['English', 'Twi'],
  'GHA-123456789-0', 'Kwame Nkrumah Avenue', 'Accra', 'GA-123-4567',
  'Abena Mensah', 'Sister', '+233244123456', 'Tema, Greater Accra',
  'Akosua Mensah', 'Mother', '+233244654321', 'Kumasi, Ashanti',
  'O+', 'positive', ARRAY['Hypertension (High Blood Pressure)'],
  'Kwame Mensah', CURRENT_DATE
);

-- Employee 2: Ama Osei (Female, Kumasi)
INSERT INTO personal_notes_forms (
  full_name, gender, date_of_birth, age, nationality, hometown, region, languages_spoken,
  ghana_card_no, street_area, town_city, gps_address,
  nok_name, nok_relationship, nok_telephone, nok_address,
  emergency_name, emergency_relationship, emergency_telephone, emergency_address,
  blood_group, rhesus_factor,
  employee_signature_name, declaration_date
) VALUES (
  'Ama Osei', 'female', '1995-08-22', 29, 'Ghanaian', 'Accra', 'Greater Accra', ARRAY['English', 'Ga', 'Twi'],
  'GHA-987654321-5', 'Adum Street', 'Kumasi', 'AK-456-7890',
  'Kofi Osei', 'Brother', '+233201234567', 'Accra, Greater Accra',
  'Yaa Osei', 'Mother', '+233208765432', 'Accra, Greater Accra',
  'A-', 'negative',
  'Ama Osei', CURRENT_DATE
);

-- Employee 3: Yaw Boateng (Male, Takoradi)
INSERT INTO personal_notes_forms (
  full_name, gender, date_of_birth, age, nationality, hometown, region, languages_spoken,
  ghana_card_no, voter_id_no, street_area, town_city,
  nok_name, nok_relationship, nok_telephone, nok_address,
  emergency_name, emergency_relationship, emergency_telephone, emergency_address,
  blood_group, rhesus_factor, medical_conditions,
  employee_signature_name, declaration_date
) VALUES (
  'Yaw Boateng', 'male', '1988-03-10', 36, 'Ghanaian', 'Takoradi', 'Western', ARRAY['English', 'Fante'],
  'GHA-555666777-8', 'VOT-12345678', 'Market Circle', 'Takoradi',
  'Efua Boateng', 'Wife', '+233248888888', 'Takoradi, Western',
  'Kwesi Boateng', 'Father', '+233249999999', 'Takoradi, Western',
  'B+', 'positive', ARRAY['Diabetes'],
  'Yaw Boateng', CURRENT_DATE
);

-- Employee 4: Akua Asante (Female, Tema)
INSERT INTO personal_notes_forms (
  full_name, gender, date_of_birth, age, nationality, hometown, region, languages_spoken,
  ghana_card_no, nhis_no, street_area, town_city, gps_address,
  nok_name, nok_relationship, nok_telephone, nok_address,
  emergency_name, emergency_relationship, emergency_telephone, emergency_address,
  blood_group, rhesus_factor,
  facebook, tiktok,
  employee_signature_name, declaration_date
) VALUES (
  'Akua Asante', 'female', '1992-11-30', 31, 'Ghanaian', 'Tema', 'Greater Accra', ARRAY['English', 'Ga'],
  'GHA-111222333-4', 'NHIS-777888999', 'Community 25', 'Tema', 'GA-999-8888',
  'Kwame Asante', 'Husband', '+233245555555', 'Tema, Greater Accra',
  'Ama Asante', 'Sister', '+233246666666', 'Accra, Greater Accra',
  'AB+', 'positive',
  'https://facebook.com/akua.asante', '@akua_asante',
  'Akua Asante', CURRENT_DATE
);

-- Employee 5: Kofi Adjei (Male, Cape Coast)
INSERT INTO personal_notes_forms (
  full_name, gender, date_of_birth, age, nationality, hometown, region, languages_spoken,
  ghana_card_no, passport_no, tin, street_area, town_city,
  nok_name, nok_relationship, nok_telephone, nok_address,
  emergency_name, emergency_relationship, emergency_telephone, emergency_address,
  blood_group, rhesus_factor, medical_conditions, known_allergies,
  height, distinguishing_marks,
  employee_signature_name, declaration_date
) VALUES (
  'Kofi Adjei', 'male', '1985-07-18', 39, 'Ghanaian', 'Cape Coast', 'Central', ARRAY['English', 'Fante', 'Twi'],
  'GHA-444555666-7', 'G9876543', 'TIN-123456789', 'Victoria Park Road', 'Cape Coast',
  'Abena Adjei', 'Mother', '+233243333333', 'Cape Coast, Central',
  'Yaa Adjei', 'Sister', '+233244444444', 'Cape Coast, Central',
  'O-', 'negative', ARRAY['Asthma'], 'Dust, Pollen',
  '6''2" (188cm)', 'Tattoo on right arm',
  'Kofi Adjei', CURRENT_DATE
);

-- Verify all insertions
SELECT 
  id,
  full_name,
  gender,
  age,
  town_city,
  region,
  nok_telephone,
  blood_group,
  submitted_at
FROM personal_notes_forms
ORDER BY submitted_at DESC
LIMIT 5;

-- Summary statistics
DO $$
DECLARE
  total_forms INTEGER;
  male_count INTEGER;
  female_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_forms FROM personal_notes_forms;
  SELECT COUNT(*) INTO male_count FROM personal_notes_forms WHERE gender = 'male';
  SELECT COUNT(*) INTO female_count FROM personal_notes_forms WHERE gender = 'female';
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ TEST FORMS SUBMITTED SUCCESSFULLY!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '📊 SUMMARY STATISTICS';
  RAISE NOTICE '   Total Forms: %', total_forms;
  RAISE NOTICE '   Male: %', male_count;
  RAISE NOTICE '   Female: %', female_count;
  RAISE NOTICE '';
  RAISE NOTICE '👥 EMPLOYEES ADDED:';
  RAISE NOTICE '   1. Kwame Mensah (34, Male) - Accra';
  RAISE NOTICE '   2. Ama Osei (29, Female) - Kumasi';
  RAISE NOTICE '   3. Yaw Boateng (36, Male) - Takoradi';
  RAISE NOTICE '   4. Akua Asante (31, Female) - Tema';
  RAISE NOTICE '   5. Kofi Adjei (39, Male) - Cape Coast';
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 NEXT STEPS:';
  RAISE NOTICE '   1. Go to Admin Dashboard';
  RAISE NOTICE '   2. Click "Personal Notes" tab';
  RAISE NOTICE '   3. Search for names, IDs, or locations';
  RAISE NOTICE '   4. View detailed form information';
  RAISE NOTICE '   5. Export to Excel';
  RAISE NOTICE '';
  RAISE NOTICE '🔗 URL: http://localhost:5000/admin?tab=personal-notes';
  RAISE NOTICE '';
END $$;
