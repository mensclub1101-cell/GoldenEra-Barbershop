"use server";

import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Posting to the shop's Instagram through Meta's Graph API (Facebook login
// flavour: a Page token for the Page the Instagram account is linked to).
// The token is a Cloudflare secret (INSTAGRAM_TOKEN) and never leaves the
// server. Instagram fetches the photo or video from a public Supabase
// Storage URL, so the phone uploads first and sends us that URL.
//
// Three steps, each its own action so the phone can show progress and a
// video has time to process: start -> check (until ready) -> publish.

const GRAPH = "https://graph.facebook.com/v26.0";
const IG_USER_ID = process.env.INSTAGRAM_USER_ID ?? "17841455088955973";
const BUCKET = "post-media";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export async function instagramReady() {
  return Boolean(process.env.INSTAGRAM_TOKEN);
}

async function graph<T>(path: string, params: Record<string, string>, method: "GET" | "POST" = "POST"): Promise<Result<T>> {
  const token = process.env.INSTAGRAM_TOKEN;
  if (!token) return { ok: false, error: "Instagram isn't connected yet." };
  const body = new URLSearchParams(params);
  const url = method === "GET" ? `${GRAPH}/${path}?${body}` : `${GRAPH}/${path}`;
  try {
    const res = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token}` },
      ...(method === "POST" ? { body } : {}),
    });
    const json = (await res.json()) as T & { error?: { message?: string; error_user_msg?: string } };
    if (!res.ok || json.error) {
      console.error("instagram", path, json.error);
      return { ok: false, error: json.error?.error_user_msg || json.error?.message || "Instagram said no. Try again." };
    }
    return { ok: true, data: json };
  } catch (e) {
    console.error("instagram", path, e);
    return { ok: false, error: "Couldn't reach Instagram. Check your signal and try again." };
  }
}

// Only files our own staff uploaded to our bucket, in their own folder.
function ownMediaUrl(url: string, userId: string) {
  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${userId}/`;
  return url.startsWith(base) && !url.slice(base.length).includes("..");
}

export async function startInstagramPost(mediaUrl: string, isVideo: boolean, caption: string): Promise<Result<{ id: string }>> {
  const viewer = await requireRole("barber", "owner");
  if (!ownMediaUrl(mediaUrl, viewer.userId)) return { ok: false, error: "Upload the photo again." };
  const text = caption.slice(0, 2200);
  return graph<{ id: string }>(
    `${IG_USER_ID}/media`,
    isVideo ? { media_type: "REELS", video_url: mediaUrl, caption: text } : { image_url: mediaUrl, caption: text },
  );
}

// FINISHED = ready to publish; IN_PROGRESS = keep waiting (videos take a bit).
export async function checkInstagramPost(containerId: string): Promise<Result<{ status: string }>> {
  await requireRole("barber", "owner");
  if (!/^\d+$/.test(containerId)) return { ok: false, error: "Start the post again." };
  const r = await graph<{ status_code?: string }>(containerId, { fields: "status_code" }, "GET");
  return r.ok ? { ok: true, data: { status: r.data.status_code ?? "FINISHED" } } : r;
}

export async function publishInstagramPost(containerId: string, mediaUrl: string): Promise<Result<{ permalink: string | null }>> {
  const viewer = await requireRole("barber", "owner");
  if (!/^\d+$/.test(containerId)) return { ok: false, error: "Start the post again." };
  const published = await graph<{ id: string }>(`${IG_USER_ID}/media_publish`, { creation_id: containerId });
  if (!published.ok) return published;
  // Instagram has its own copy now; tidy up ours.
  if (ownMediaUrl(mediaUrl, viewer.userId)) {
    const path = mediaUrl.split(`/public/${BUCKET}/`)[1];
    const supabase = await createClient();
    await supabase.storage.from(BUCKET).remove([decodeURIComponent(path)]);
  }
  const link = await graph<{ permalink?: string }>(published.data.id, { fields: "permalink" }, "GET");
  return { ok: true, data: { permalink: link.ok ? (link.data.permalink ?? null) : null } };
}
