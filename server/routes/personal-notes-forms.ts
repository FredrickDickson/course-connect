/**
 * Personal Notes Forms API Routes
 * 
 * Handles submission and retrieval of confidential employee information forms
 */

import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../storage";
import { requireSupabaseAuth } from "../supabaseAuth";
import { requireRole } from "../middleware/roleProtection";
import formidable from "formidable";
import fs from "fs/promises";
import path from "path";

const router = Router();

/**
 * POST /api/personal-notes-forms
 * Submit a new personal notes form (public access)
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const form = formidable({ multiples: true });
    
    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error("Form parsing error:", err);
        return res.status(400).json({ error: "Failed to parse form data" });
      }

      try {
        // Helper to get first value from field
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

        // Upload files to Supabase Storage
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

            // Get public URL
            const { data: urlData } = supabaseAdmin.storage
              .from('personal-notes-forms')
              .getPublicUrl(data.path);

            return urlData.publicUrl;
          } catch (error) {
            console.error("File processing error:", error);
            return null;
          }
        };

        // Handle file uploads
        const idDocumentsUrl = files.idDocuments ? await uploadFile(files.idDocuments as formidable.File, 'id-documents') : null;
        const leftThumbUrl = files.leftThumb ? await uploadFile(files.leftThumb as formidable.File, 'thumbprints') : null;
        const rightThumbUrl = files.rightThumb ? await uploadFile(files.rightThumb as formidable.File, 'thumbprints') : null;

        // Parse children details if provided
        let childrenDetails = null;
        const childrenNames = getField(fields.childrenNames);
        if (childrenNames) {
          // Simple parsing: "Name (age), Name (age)"
          childrenDetails = childrenNames.split(',').map((child: string) => {
            const match = child.trim().match(/^(.+?)\s*\((\d+)\)$/);
            if (match) {
              return { name: match[1].trim(), age: parseInt(match[2]) };
            }
            return { name: child.trim(), age: null };
          });
        }

        // Prepare data for database insertion
        const formData = {
          // A. Personal Details
          full_name: getField(fields.fullName),
          other_names: getField(fields.otherNames),
          gender: getField(fields.gender),
          date_of_birth: getField(fields.dateOfBirth),
          age: parseInt(getField(fields.age) || '0'),
          nationality: getField(fields.nationality),
          hometown: getField(fields.hometown),
          region: getField(fields.region),
          languages_spoken: getField(fields.languagesSpoken)?.split(',').map((l: string) => l.trim()),
          
          // B. Identification
          ghana_card_no: getField(fields.ghanaCardNo),
          passport_no: getField(fields.passportNo),
          voter_id_no: getField(fields.voterIdNo),
          nhis_no: getField(fields.nhisNo),
          tin: getField(fields.tin),
          id_documents_urls: idDocumentsUrl ? [idDocumentsUrl] : [],
          
          // C. Current Residential Address
          house_no: getField(fields.houseNo),
          street_area: getField(fields.streetArea),
          town_city: getField(fields.townCity),
          gps_address: getField(fields.gpsAddress),
          length_of_stay: getField(fields.lengthOfStay),
          
          // E. Family Information
          father_name: getField(fields.fatherName),
          mother_name: getField(fields.motherName),
          number_of_children: parseInt(getField(fields.numberOfChildren) || '0'),
          children_details: childrenDetails,
          
          // F. Next of Kin
          nok_name: getField(fields.nokName),
          nok_relationship: getField(fields.nokRelationship),
          nok_telephone: getField(fields.nokTelephone),
          nok_address: getField(fields.nokAddress),
          nok_occupation: getField(fields.nokOccupation),
          
          // G. Emergency Contact
          emergency_name: getField(fields.emergencyName),
          emergency_relationship: getField(fields.emergencyRelationship),
          emergency_telephone: getField(fields.emergencyTelephone),
          emergency_address: getField(fields.emergencyAddress),
          
          // H. Education
          education_history: [{
            qualification: getField(fields.highestQualification),
            school: getField(fields.schoolAttended),
            year: getField(fields.yearCompleted),
          }],
          
          // K. Health Information
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
          
          // P. Social Media
          facebook: getField(fields.facebook),
          tiktok: getField(fields.tiktok),
          twitter_x: getField(fields.twitterX),
          
          // R. Biometric Record
          height: getField(fields.height),
          distinguishing_marks: getField(fields.distinguishingMarks),
          left_thumb_url: leftThumbUrl,
          right_thumb_url: rightThumbUrl,
          
          // S. Declaration
          employee_signature_name: getField(fields.employeeSignatureName),
          declaration_date: getField(fields.declarationDate),
          
          // Metadata
          submitted_at: new Date().toISOString(),
        };

        // Insert into database
        const { data, error } = await supabaseAdmin
          .from('personal_notes_forms')
          .insert([formData])
          .select()
          .single();

        if (error) {
          console.error("Database insertion error:", error);
          return res.status(500).json({ error: "Failed to save form data" });
        }

        res.json({ 
          success: true, 
          message: "Form submitted successfully",
          id: data.id 
        });
      } catch (error) {
        console.error("Form processing error:", error);
        res.status(500).json({ error: "Failed to process form" });
      }
    });
  } catch (error) {
    console.error("Request error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/personal-notes-forms
 * Get all form submissions (admin only)
 */
router.get("/", requireSupabaseAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('personal_notes_forms')
      .select('*')
      .order('submitted_at', { ascending: false});

    if (error) {
      console.error("Database query error:", error);
      return res.status(500).json({ error: "Failed to fetch forms" });
    }

    res.json({ forms: data });
  } catch (error) {
    console.error("Request error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/personal-notes-forms/:id
 * Get a specific form by ID (admin only)
 */
router.get("/:id", requireSupabaseAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('personal_notes_forms')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error("Database query error:", error);
      return res.status(404).json({ error: "Form not found" });
    }

    res.json({ form: data });
  } catch (error) {
    console.error("Request error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * PUT /api/personal-notes-forms/:id/review
 * Add review notes to a form (admin only)
 */
router.put("/:id/review", requireSupabaseAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { id } = req.params;
    const { notes } = req.body;

    const { data, error } = await supabaseAdmin
      .from('personal_notes_forms')
      .update({
        review_notes: notes,
        reviewed_by_admin_id: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error("Database update error:", error);
      return res.status(500).json({ error: "Failed to update form" });
    }

    res.json({ success: true, form: data });
  } catch (error) {
    console.error("Request error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * DELETE /api/personal-notes-forms/:id
 * Delete a form submission (admin only)
 */
router.delete("/:id", requireSupabaseAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('personal_notes_forms')
      .delete()
      .eq('id', id);

    if (error) {
      console.error("Database delete error:", error);
      return res.status(500).json({ error: "Failed to delete form" });
    }

    res.json({ success: true, message: "Form deleted successfully" });
  } catch (error) {
    console.error("Request error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
