import { headers } from "next/headers";
import { siteUrl as configuredSiteUrl } from "@/lib/shop";

// The address this request came in on, so link previews and invite links follow
// the site wherever it's served (workers.dev today, a custom domain later).
// Falls back to NEXT_PUBLIC_SITE_URL when there's no request host.
export async function getSiteUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return configuredSiteUrl;
  const local = /^(localhost|127\.0\.0\.1)(:|$)/.test(host);
  const proto = h.get("x-forwarded-proto") ?? (local ? "http" : "https");
  return `${proto}://${host}`;
}
