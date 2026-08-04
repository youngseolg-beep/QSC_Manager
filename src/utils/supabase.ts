import { createClient } from '@supabase/supabase-js';

// Supabase 대시보드 URL & Anon Key
const supabaseUrl = 'https://vyilbllhllxndlyzskfh.supabase.co'.trim();
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5aWxibGxobGx4bmRseXpza2ZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAxNzIzODMsImV4cCI6MjA1NTc0ODM4M30.S66v9wGkUIsi8K8j-IAtE0B-fAypQZpt0rT8lVdIOfk'.trim();

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
