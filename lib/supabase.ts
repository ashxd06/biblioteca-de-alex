import { createClient } from "@supabase/supabase-js";
export const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL||"http://x.local", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||"x");
export const login = () => sb.auth.signInWithOAuth({ provider:"google", options:{ redirectTo: location.origin,
  scopes:"https://www.googleapis.com/auth/drive.readonly", queryParams:{access_type:"offline",prompt:"consent"} }});
export function watchToken(){ sb.auth.onAuthStateChange((_e,s)=>{ if(s?.provider_token) localStorage.setItem("gtoken",s.provider_token); }); }
