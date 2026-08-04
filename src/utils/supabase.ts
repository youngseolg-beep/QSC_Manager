import { createClient } from '@supabase/supabase-js';

// 공유해주신 URL 및 Anon Key
const rawUrl = 'https://fdbxikqwzingtzcptfsh.supabase.co/rest/v1/';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkYnhpa3F3emluZ3R6Y3B0ZnNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4MDk1MzgsImV4cCI6MjEwMTM4NTUzOH0.9BwBhuVVI84IwIE_mKooQ22VgVtu6Js-e4p9BAM08LU';

// ⚠️ 핵심: URL 뒤에 붙은 /rest/v1/ 경로를 강제로 날려서 순수 도메인(https://fdbxikqwzingtzcptfsh.supabase.co)만 추출
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
