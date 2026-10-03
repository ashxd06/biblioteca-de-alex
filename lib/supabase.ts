import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const DRIVE_TOKEN_KEY = "biblioteca-drive-token";

// The placeholder keeps the client importable during a build. Every action
// that needs Supabase checks the real configuration first, so requests are
// never accidentally sent to a fake endpoint.
export const configured = Boolean(url && anonKey);
export const sb = createClient(url || "https://not-configured.invalid", anonKey || "not-configured");

function requireConfiguration() {
  if (!configured) {
    throw new Error("Falta conectar Supabase en Vercel. Aún no se puede iniciar sesión con Google.");
  }
}

function rememberProviderToken(session: { provider_token?: string | null } | null | undefined) {
  if (session?.provider_token) localStorage.setItem(DRIVE_TOKEN_KEY, session.provider_token);
}

export async function login() {
  requireConfiguration();
  const { error } = await sb.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin,
      // This is deliberately read-only: the application can list and read
      // PDFs, but cannot change, upload, or delete anything in Drive.
      scopes: "https://www.googleapis.com/auth/drive.readonly",
      queryParams: { access_type: "offline", prompt: "consent" },
    },
  });
  if (error) throw error;
}

export function watchToken() {
  if (!configured) return () => {};
  void sb.auth.getSession().then(({ data }) => rememberProviderToken(data.session));
  const { data: listener } = sb.auth.onAuthStateChange((_event, session) => rememberProviderToken(session));
  return () => listener.subscription.unsubscribe();
}

export async function driveAccessToken() {
  requireConfiguration();
  const { data, error } = await sb.auth.getSession();
  if (error) throw error;
  rememberProviderToken(data.session);
  const token = data.session?.provider_token || localStorage.getItem(DRIVE_TOKEN_KEY);
  if (!token) {
    throw new Error("Conecta Google y acepta el permiso para ver tus archivos de Drive antes de abrir la biblioteca.");
  }
  return token;
}
