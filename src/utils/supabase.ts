import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fdbxikqwzingtzcptfsh.supabase.co/rest/v1/';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkYnhpa3F3emluZ3R6Y3B0ZnNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4MDk1MzgsImV4cCI6MjEwMTM4NTUzOH0.9BwBhuVVI84IwIE_mKooQ22VgVtu6Js-e4p9BAM08LU';

export const supabase = createClient(supabaseUrl, supabaseKey);
