import { createBrowserClient } from "@supabase/ssr";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Client Components: live updates (walk-ins, chat) and quick taps. One client
// per tab; it reads the same session cookies the server sets.
let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function getBrowserClient() {
  client ??= createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
  return client;
}

// Subscribe to a live channel as the signed-in user. The realtime socket would
// otherwise connect with the anon key before the session loads, and RLS turns
// an anonymous subscriber away. Returns a cleanup function.
export function subscribeAsUser(name: string, build: (channel: RealtimeChannel) => RealtimeChannel) {
  const supabase = getBrowserClient();
  let channel: RealtimeChannel | null = null;
  let cancelled = false;
  supabase.auth.getSession().then(async ({ data }) => {
    if (cancelled || !data.session) return;
    await supabase.realtime.setAuth(data.session.access_token);
    channel = build(supabase.channel(name)).subscribe();
  });
  return () => {
    cancelled = true;
    if (channel) supabase.removeChannel(channel);
  };
}
