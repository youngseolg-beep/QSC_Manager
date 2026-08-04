import { createClient } from '@supabase/supabase-js';

// Supabase Dashboard -> Project Settings -> API에서 확인 가능한 정확한 값
const supabaseUrl = 'https://vyilbllhllxndlyzskfh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5aWxibGxobGx4bmRseXpza2ZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAxNzIzODMsImV4cCI6MjA1NTc0ODM4M30.S66v9wGkUIsi8K8j-IAtE0B-fAypQZpt0rT8lVdIOfk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false
  }
});
