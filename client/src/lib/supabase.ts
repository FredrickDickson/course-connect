import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://emvibxbcrvritkwkguya.supabase.co';
const supabaseKey = 'sb_publishable_aCasNKB6_GbuTAK6yTGqBA_95zG6X-c';

export const supabase = createClient(supabaseUrl, supabaseKey);
