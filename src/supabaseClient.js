import { createClient } from "@supabase/supabase-js";
const supabaseUrl = "https://gisokaxcmiophjafoqhj.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdpc29rYXhjbWlvcGhqYWZvcWhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2NjA2OTAsImV4cCI6MjA4MDIzNjY5MH0.l4x7sRCF7wcJItJ4Z6shL0moVIMxu1e4ewUjiZ_AKyY";

export const supabase = createClient(supabaseUrl, supabaseKey);