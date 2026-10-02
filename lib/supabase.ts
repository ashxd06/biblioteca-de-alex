import { createClient } from "@supabase/supabase-js";
export const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL||"http://x.local", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||"x");
export const login = () => sb.auth.signInWithOAuth({
  provider: "google",
  options: {
    redirectTo: location.origin,
  },
});
