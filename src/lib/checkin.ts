import { asSchedule, isWorkingNow, walkinSlots } from "@/lib/schedule";
import { locations } from "@/lib/shop";

// Everything the walk-in form needs per shop: arrival times left today and
// the barbers who are in right now. Barbers without a schedule still show.
// Shared by the public check-in page and the client app.
export function checkInShops(
  shops: { id: string; slug: string; name: string }[],
  barbers: { id: string; shop_id: string; display_name: string; schedule: unknown }[],
  now = new Date(),
) {
  return shops.map((s) => ({
    slug: s.slug,
    name: s.name,
    phone: locations.find((l) => l.slug === s.slug)?.phone ?? null,
    ...walkinSlots(locations.find((l) => l.slug === s.slug)?.schedule ?? [], now),
    barbers: barbers
      .filter((b) => b.shop_id === s.id)
      .filter((b) => {
        const schedule = asSchedule(b.schedule);
        return !schedule || isWorkingNow(schedule, now);
      })
      .map((b) => ({ id: b.id, name: b.display_name })),
  }));
}
