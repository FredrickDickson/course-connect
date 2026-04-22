/**
 * Data Migration Script: Update Course Records with Track and Qualification Level
 * 
 * This script updates existing courses to populate the new `track` and `qualification_level` fields
 * based on the existing `level` field and course title/description content.
 * 
 * Run with: tsx scripts/migrate-course-tracks.ts
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Helper function to determine track from course title/description
function determineTrack(title: string, description: string | null): "ARBITRATION" | "MEDIATION" {
  const text = `${title} ${description || ""}`.toLowerCase();
  
  // Arbitration keywords
  const arbitrationKeywords = [
    "arbitration",
    "arbitrator",
    "arbitral",
    "dispute resolution",
    "adr",
  ];
  
  // Mediation keywords
  const mediationKeywords = [
    "mediation",
    "mediator",
    "conflict resolution",
    "negotiation",
  ];
  
  const hasArbitration = arbitrationKeywords.some(keyword => text.includes(keyword));
  const hasMediation = mediationKeywords.some(keyword => text.includes(keyword));
  
  if (hasArbitration && !hasMediation) return "ARBITRATION";
  if (hasMediation && !hasArbitration) return "MEDIATION";
  
  // Default to ARBITRATION if unclear or contains both
  return "ARBITRATION";
}

// Helper function to map old level to new qualification_level
function mapQualificationLevel(level: string): "ASSOCIATE" | "MEMBER" | "FELLOW" {
  const levelMap: Record<string, "ASSOCIATE" | "MEMBER" | "FELLOW"> = {
    "associate": "ASSOCIATE",
    "member": "MEMBER",
    "fellow": "FELLOW",
  };
  
  return levelMap[level.toLowerCase()] || "ASSOCIATE";
}

async function migrateCourseTracks() {
  try {
    console.log("Starting course track migration...");
    
    // Fetch all courses
    const { data: courses, error } = await supabase
      .from("courses")
      .select("id, title, description, level");
    
    if (error) throw error;
    
    if (!courses || courses.length === 0) {
      console.log("No courses found to migrate.");
      return;
    }
    
    console.log(`Found ${courses.length} courses to migrate.`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const course of courses as any[]) {
      const track = determineTrack(course.title, course.description);
      const qualificationLevel = mapQualificationLevel(course.level);
      
      // Check if already has values
      if (course.track === track && course.qualification_level === qualificationLevel) {
        skippedCount++;
        console.log(`Skipping ${course.title} - already up to date`);
        continue;
      }
      
      // Update course
      const { error: updateError } = await supabase
        .from("courses")
        .update({
          track,
          qualification_level: qualificationLevel,
        })
        .eq("id", course.id);
      
      if (updateError) {
        console.error(`Failed to update course ${course.title}:`, updateError);
        continue;
      }
      
      updatedCount++;
      console.log(`Updated ${course.title}: track=${track}, qualification_level=${qualificationLevel}`);
    }
    
    console.log("\nMigration complete!");
    console.log(`Updated: ${updatedCount} courses`);
    console.log(`Skipped: ${skippedCount} courses`);
    
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

// Run the migration
migrateCourseTracks()
  .then(() => {
    console.log("Migration completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
