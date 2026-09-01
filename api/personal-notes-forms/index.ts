import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import formidable from 'formidable';
import fs from 'fs/promises';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Helper to get first value from formidable field
const getField = (field: any): string | undefined => {
  if (Array.isArray(field)) return field[0];
  return field;
};

// Helper to parse JSON field
const parseJsonField = (field: any): any => {
  const value = getField(field);
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

// Helper to upload file to Supabase Storage
const uploadFile = async (file: formidable.File, folder: string): Promise<string | null> => {
  if (!file || !file.filepath) return null;
  
  try {
    const fileBuffer = await fs.readFile(file.filepath);
    const fileName = `${folder}/${Date.now()}-${file.originalFilename || 'file'}`;
    
    const { data, error } = await supabaseAdmin.storage
      .from('personal-notes-forms')
      .upload(fileName, fileBuffer, {
        contentType: file.mimetype || 'application/octet-stream',
        upsert: false,
      });

    if (error) {
      console.error("File upload error:", error);
      return null;
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('personal-notes-forms')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (error) {
    console.error("File processing error:", error);
    return null;
  }
};

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // POST - Submit new form (public access)
  if (req.method === 'POST') {
    try {
      const form = formidable({ multiples: true });
      
      return new Promise((resolve, reject) => {
        form.parse(req as any, async (err, fields, files) => {
          if (err) {
            console.error("Form parsing error:", err);
            res.status(400).json({ error: "Failed to parse form data" });
            return resolve(undefined);
          }

          try {
            // Handle file uploads
            const idDocumentsUrl = files.idDocuments ? await uploadFile(
              Array.isArray(files.idDocuments) ? files.idDocuments[0] : files.idDocuments,
              'id-documents'
            ) : null;
            const leftThumbUrl = files.leftThumb ? await uploadFile(
              Array.isArray(files.leftThumb) ? files.leftThumb[0] : files.leftThumb,
              'thumbprints'
            ) : null;
            const rightThumbUrl = files.rightThumb ? await uploadFile(
              Array.isArray(files.rightThumb) ? files.rightThumb[0] : files.rightThumb,
              'thumbprints'
            ) : null;

            // Parse children details
            let childrenDetails = null;
            const childrenNames = getField(fields.childrenNames);
            if (childrenNames) {
              childrenDetails = childrenNames.split(',').map((child: string) => {
                const match = child.trim().match(/^(.+?)\s*\((\d+)\)$/);
                if (match) {
                  return { name: match[1].trim(), age: parseInt(match[2]) };
                }
                return { name: child.trim(), age: null };
              });
            }

            // Prepare data
            const formData = {
              full_name: getField(fields.fullName),
              other_names: getField(fields.otherNames),
              gender: getField(fields.gender),
              date_of_birth: getField(fields.dateOfBirth),
              age: parseInt(getField(fields.age) || '0'),
              nationality: getField(fields.nationality),
              hometown: getField(fields.hometown),
              region: getField(fields.region),
              languages_spoken: getField(fields.languagesSpoken)?.split(',').map((l: string) => l.trim()),
              ghana_card_no: getField(fields.ghanaCardNo),
              passport_no: getField(fields.passportNo),
              voter_id_no: getField(fields.voterIdNo),
              nhis_no: getField(fields.nhisNo),
              tin: getField(fields.tin),
              id_documents_urls: idDocumentsUrl ? [idDocumentsUrl] : [],
              house_no: getField(fields.houseNo),
              street_area: getField(fields.streetArea),
              town_city: getField(fields.townCity),
              gps_address: getField(fields.gpsAddress),
              length_of_stay: getField(fields.lengthOfStay),
              father_name: getField(fields.fatherName),
              mother_name: getField(fields.motherName),
              number_of_children: parseInt(getField(fields.numberOfChildren) || '0'),
              children_details: childrenDetails,
              nok_name: getField(fields.nokName),
              nok_relationship: getField(fields.nokRelationship),
              nok_telephone: getField(fields.nokTelephone),
              nok_address: getField(fields.nokAddress),
              nok_occupation: getField(fields.nokOccupation),
              emergency_name: getField(fields.emergencyName),
              emergency_relationship: getField(fields.emergencyRelationship),
              emergency_telephone: getField(fields.emergencyTelephone),
              emergency_address: getField(fields.emergencyAddress),
              education_history: [{
                qualification: getField(fields.highestQualification),
                school: getField(fields.schoolAttended),
                year: getField(fields.yearCompleted),
              }],
              blood_group: getField(fields.bloodGroup),
              rhesus_factor: getField(fields.rhesusFactor),
              medical_conditions: parseJsonField(fields.medicalConditions) || [],
              other_medical_condition: getField(fields.otherMedicalCondition),
              known_allergies: getField(fields.knownAllergies),
              current_medication: getField(fields.currentMedication),
              previous_illnesses: getField(fields.previousIllnesses),
              physical_limitations: getField(fields.physicalLimitations) === 'true',
              physical_limitations_details: getField(fields.physicalLimitationsDetails),
              doctor_telephone: getField(fields.doctorTelephone),
              vaccination_status: parseJsonField(fields.vaccinations) || [],
              other_vaccination: getField(fields.otherVaccination),
              facebook: getField(fields.facebook),
              tiktok: getField(fields.tiktok),
              twitter_x: getField(fields.twitterX),
              height: getField(fields.height),
              distinguishing_marks: getField(fields.distinguishingMarks),
              left_thumb_url: leftThumbUrl,
              right_thumb_url: rightThumbUrl,
              employee_signature_name: getField(fields.employeeSignatureName),
              declaration_date: getField(fields.declarationDate),
              submitted_at: new Date().toISOString(),
            };

            const { data, error } = await supabaseAdmin
              .from('personal_notes_forms')
              .insert([formData])
              .select()
              .single();

            if (error) {
              console.error("Database insertion error:", error);
              res.status(500).json({ error: "Failed to save form data" });
              return resolve(undefined);
            }

            res.json({ 
              success: true, 
              message: "Form submitted successfully",
              id: data.id 
            });
            return resolve(undefined);
          } catch (error) {
            console.error("Form processing error:", error);
            res.status(500).json({ error: "Failed to process form" });
            return resolve(undefined);
          }
        });
      });
    } catch (error) {
      console.error("Request error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  // GET - List all forms (admin only)
  if (req.method === 'GET') {
    try {
      // TODO: Add auth check here
      const { data, error } = await supabaseAdmin
        .from('personal_notes_forms')
        .select('*')
        .order('submitted_at', { ascending: false});

      if (error) {
        console.error("Database query error:", error);
        return res.status(500).json({ error: "Failed to fetch forms" });
      }

      return res.json({ forms: data });
    } catch (error) {
      console.error("Request error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
