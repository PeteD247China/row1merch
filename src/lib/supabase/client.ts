import { createBrowserClient } from "@supabase/ssr";

// Lazy singleton — never called during SSR/build, only in browser event handlers
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
