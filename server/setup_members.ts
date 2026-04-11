import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function setupMembersTable() {
  try {
    console.log('Setting up members table...');
    
    // Create members by inserting data (table auto-creation)
    const members = [
      { id: 'CIM001', name: 'Dr. Sarah Thompson', membership_type: 'fellow', issue_date: '1 January 2023', expiry_date: '31 December 2026' },
      { id: 'CIM002', name: 'James Wilson', membership_type: 'member', issue_date: '15 March 2023', expiry_date: '31 December 2025' },
      { id: 'CIM003', name: 'Maria Garcia', membership_type: 'associate', issue_date: '1 June 2024', expiry_date: '31 December 2025' },
      { id: 'CIM004', name: 'Prof. David Chen', membership_type: 'fellow', issue_date: '1 January 2022', expiry_date: '31 December 2027' },
      { id: 'CIM005', name: 'Emma Johnson', membership_type: 'member', issue_date: '10 September 2023', expiry_date: '31 December 2026' }
    ];
    
    for (const member of members) {
      const { data, error } = await supabaseAdmin
        .from('members')
        .upsert(member, { onConflict: 'id' });
      
      if (error) {
        console.error('Error inserting member:', member.id, error.message);
      } else {
        console.log('✅ Added member:', member.id, '-', member.name);
      }
    }
    
    console.log('Members table setup completed!');
    return true;
    
  } catch (err: any) {
    console.error('Setup error:', err.message);
    return false;
  }
}

setupMembersTable().then(success => {
  if (success) {
    console.log('✅ Migration completed successfully');
    process.exit(0);
  } else {
    console.log('❌ Migration failed');
    process.exit(1);
  }
});
