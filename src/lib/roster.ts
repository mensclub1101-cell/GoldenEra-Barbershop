import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { asSchedule } from "@/lib/schedule";
import {
  barbers as fallbackBarbers,
  locations as fallbackLocations,
  type Barber,
  type Location,
} from "@/lib/shop";

export type Roster = { locations: Location[]; barbers: Barber[] };

// Public roster for the landing page: active barbers and shop info, as the
// owner and barbers maintain them in the app. Anonymous read; RLS limits it
// to active seats. Falls back to the copy in shop.ts if the database is
// unreachable, so the site never goes blank.
export async function getRoster(): Promise<Roster> {
  try {
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const [shops, seats] = await Promise.all([
      supabase.from("shops").select("*").order("sort"),
      supabase.from("barbers").select("*").eq("active", true).order("sort").order("display_name"),
    ]);
    if (shops.error) throw shops.error;
    if (seats.error) throw seats.error;

    const slugById = new Map(shops.data.map((s) => [s.id, s.slug]));
    return {
      locations: shops.data.map((s) => ({
        slug: s.slug,
        name: s.name,
        street: s.street,
        city: s.city,
        region: s.region,
        postalCode: s.postal_code,
        phone: s.phone,
        schedule: fallbackLocations.find((l) => l.slug === s.slug)?.schedule ?? [],
        photo: s.photo_url ?? fallbackLocations.find((l) => l.slug === s.slug)?.photo ?? null,
      })),
      barbers: seats.data.map((b) => ({
        name: b.display_name,
        location: slugById.get(b.shop_id) ?? "",
        specialty: b.specialty,
        phone: b.phone,
        bookingUrl: b.booking_url,
        instagram: b.instagram,
        schedule: asSchedule(b.schedule),
      })),
    };
  } catch (error) {
    console.error("getRoster: falling back to static roster", error);
    return { locations: fallbackLocations, barbers: fallbackBarbers };
  }
}
