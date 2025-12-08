import { createClient } from "@supabase/supabase-js";
const supabaseUrl = "https://gisokaxcmiophjafoqhj.supabase.co";
const supabaseKey = "sb_publishable_x67dt-cFW8VJociON6jy1g_hu4bh0EM";

export const supabase = createClient(supabaseUrl, supabaseKey);
