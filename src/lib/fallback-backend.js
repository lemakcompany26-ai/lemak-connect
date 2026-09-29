import { createClient as createSupabase } from '@supabase/supabase-js';

// Your FREE Supabase - create account at supabase.com (2 min)
const supabase = createSupabase(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY
);

export const fallback = {
  // This will replace base44.entities, auth, etc
  isBase44Down: false,

  async safeCall(base44Call, fallbackCall){
    try {
      const res = await base44Call();
      return res;
    } catch (e) {
      console.warn("Base44 down, switching to fallback", e);
      this.isBase44Down = true;
      return await fallbackCall();
    }
  }
};

export { supabase };
