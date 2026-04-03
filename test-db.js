import postgres from 'postgres';

const project = 'emvibxbcrvritkwkguya';
const passwords = [
    'Admin%40CIMA2024%21',
    'CIMA_ADMIN_SETUP_2024'
];
const host = 'aws-1-eu-central-1.pooler.supabase.com';

async function test() {
    for (const pass of passwords) {
        const url = `postgresql://postgres.${project}:${pass}@${host}:6543/postgres?options=project%3Demvibxbcrvritkwkguya`;
        console.log(`Testing with host ${host}, password: ${pass.substring(0, 4)}...`);
        const sql = postgres(url, { prepare: false, connect_timeout: 5 });
        try {
            const result = await sql`select 1`;
            console.log(`SUCCESS with host ${host}, password: ${pass.substring(0, 4)}...`);
            await sql.end();
            process.exit(0);
        } catch (err) {
            console.log(`FAILED with host ${host}, password: ${pass.substring(0, 4)}... Error: ${err.message}`);
        }
    }
    process.exit(1);
}

test();
