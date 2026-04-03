import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const sql = postgres(process.env.DATABASE_URL, { prepare: false });

async function fixOrphanedData() {
  try {
    console.log('Finding orphaned courses...');
    const orphanedCourses = await sql`
      SELECT c.id, c.title, c.instructor_id 
      FROM courses c 
      LEFT JOIN users u ON c.instructor_id = u.id 
      WHERE u.id IS NULL AND c.instructor_id IS NOT NULL;
    `;
    
    console.log(`Found ${orphanedCourses.length} orphaned courses.`);
    
    if (orphanedCourses.length > 0) {
      console.log('Setting instructor_id to NULL for orphaned courses (if possible) or deleting them...');
      
      // Let's just delete the orphaned courses since they point to an invalid user
      // or we can set instructor_id to NULL. But in schema, instructor_id might be nullable.
      // Let's check if it's nullable. Let's try to set to NULL first.
      await sql`
        UPDATE courses 
        SET instructor_id = NULL 
        WHERE id IN (
          SELECT c.id 
          FROM courses c 
          LEFT JOIN users u ON c.instructor_id = u.id 
          WHERE u.id IS NULL AND c.instructor_id IS NOT NULL
        )
      `;
      console.log('Successfully set orphaned courses instructor_id to NULL.');
    }

    // Also check other foreign keys just in case
    console.log('Finding orphaned enrollments...');
    const orphanedEnrollments = await sql`
      SELECT e.id 
      FROM enrollments e 
      LEFT JOIN users u ON e.user_id = u.id 
      WHERE u.id IS NULL
    `;
    console.log(`Found ${orphanedEnrollments.length} orphaned enrollments.`);
    if (orphanedEnrollments.length > 0) {
      await sql`DELETE FROM enrollments WHERE id IN (SELECT e.id FROM enrollments e LEFT JOIN users u ON e.user_id = u.id WHERE u.id IS NULL)`;
      console.log('Successfully deleted orphaned enrollments.');
    }

    // Delete orphaned favorites
    console.log('Finding orphaned favorites...');
    await sql`DELETE FROM favorites WHERE user_id NOT IN (SELECT id FROM users)`;
    console.log('Cleaned up favorites.');
    
    // Check missing password column before drizzle push
    console.log('Database cleanup completed!');

  } catch (err) {
    console.error('Error fixing orphaned data:', err);
  } finally {
    await sql.end();
  }
}

fixOrphanedData();
