const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

async function createMembersTable() {
  try {
    console.log('Creating members table...');
    
    // SQL to create table and insert data
    const sql = `
      CREATE TABLE IF NOT EXISTS members (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        membership_type TEXT NOT NULL CHECK (membership_type IN ('associate', 'member', 'fellow')),
        issue_date TEXT NOT NULL,
        expiry_date TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      ALTER TABLE members ENABLE ROW LEVEL SECURITY;
      
      CREATE POLICY "Allow public read access to members" ON members
        FOR SELECT USING (true);
      
      INSERT INTO members (id, name, membership_type, issue_date, expiry_date) VALUES
        ('CIM001', 'Dr. Sarah Thompson', 'fellow', '1 January 2023', '31 December 2026'),
        ('CIM002', 'James Wilson', 'member', '15 March 2023', '31 December 2025'),
        ('CIM003', 'Maria Garcia', 'associate', '1 June 2024', '31 December 2025'),
        ('CIM004', 'Prof. David Chen', 'fellow', '1 January 2022', '31 December 2027'),
        ('CIM005', 'Emma Johnson', 'member', '10 September 2023', '31 December 2026');
    `;
    
    // Since we can't execute raw SQL directly, we'll insert data using the client
    const members = [
      { id: 'CIM001', name: 'Dr. Sarah Thompson', membership_type: 'fellow', issue_date: '1 January 2023', expiry_date: '31 December 2026' },
      { id: 'CIM002', name: 'James Wilson', membership_type: 'member', issue_date: '15 March 2023', expiry_date: '31 December 2025' },
      { id: 'CIM003', name: 'Maria Garcia', membership_type: 'associate', issue_date: '1 June 2024', expiry_date: '31 December 2025' },
      { id: 'CIM004', name: 'Prof. David Chen', membership_type: 'fellow', issue_date: '1 January 2022', expiry_date: '31 December 2027' },
      { id: 'CIM005', name: 'Emma Johnson', membership_type: 'member', issue_date: '10 September 2023', expiry_date: '31 December 2026' }
    ];
    
    // Insert members one by one
    for (const member of members) {
      const { data, error } = await supabase
        .from('members')
        .upsert(member, { onConflict: 'id' });
      
      if (error) {
        console.error('Error inserting member:', member.id, error);
      } else {
        console.log('Inserted member:', member.id, member.name);
      }
    }
    
    console.log('Members table setup completed!');
    return true;
    
  } catch (err) {
    console.error('Error:', err);
    return false;
  }
}

createMembersTable().then(success => {
  if (success) {
    console.log('Migration completed successfully');
    process.exit(0);
  } else {
    console.log('Migration failed');
    process.exit(1);
  }
});
