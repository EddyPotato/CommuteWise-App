import { supabase } from '../supabaseClient';

export const logAction = async (action, details) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      await supabase.from('admin_logs').insert({
        admin_id: user.id,
        admin_email: user.email,
        action: action,
        details: details
      });
    }
  } catch (error) {
    console.error("Failed to log action:", error);
  }
};