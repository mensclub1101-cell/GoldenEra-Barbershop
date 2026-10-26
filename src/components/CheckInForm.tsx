"use client";

import { useState } from "react";
import { ActionForm, Field, SubmitButton, inputClass } from "@/components/forms";
import { checkIn } from "@/app/actions/auth";
import { clock } from "@/lib/shop";

// open: the shop takes walk-ins right now; slots: arrival times left today.
type Shop = { slug: string; name: string; open: boolean; slots: string[]; barbers: { id: string; name: string }[] };

export function CheckInForm({ shops, initialShop }: { shops: Shop[]; initialShop?: string }) {
  const [shop, setShop] = useState(initialShop && shops.some((s) => s.slug === initialShop) ? initialShop : shops[0]?.slug);
  const current = shops.find((s) => s.slug === shop);
  const barbers = current?.barbers ?? [];
  const closed = !current?.open && !current?.slots.length;

  return (
    <ActionForm action={checkIn} resetOnSuccess className="space-y-4">
      <fieldset>
        <legend className="mb-1.5 block text-sm font-semibold">Shop</legend>
        <div className="grid grid-cols-2 gap-2">
          {shops.map((s) => (
            <label
              key={s.slug}
              className={`cursor-pointer rounded-xl border px-4 py-3 text-center text-sm font-semibold ${
                shop === s.slug ? "border-ink bg-ink text-paper" : "border-line"
              }`}
            >
              <input
                type="radio"
                name="shop"
                value={s.slug}
                checked={shop === s.slug}
                onChange={() => setShop(s.slug)}
                className="sr-only"
              />
              {s.name}
            </label>
          ))}
        </div>
      </fieldset>
      <Field label="Your name" name="name" autoComplete="given-name" required />
      <Field label="Phone" name="phone" type="tel" autoComplete="tel" placeholder="(951) 555-0123" required hint="So your barber can call you when it's your turn." />
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">Barber</span>
        <select key={shop} name="barber_id" className={inputClass} defaultValue="">
          <option value="">First available</option>
          {barbers.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>
      {closed ? (
        <p className="rounded-xl bg-paper-2 p-4 text-sm text-ink-2">
          {current?.name} is done taking walk-ins for today. Check in again tomorrow.
        </p>
      ) : (
        <fieldset key={shop}>
          <legend className="mb-1.5 block text-sm font-semibold">ETA</legend>
          <p className="mb-2 text-xs text-muted">When will you get to the shop?</p>
          <div className="flex flex-wrap gap-2">
            {[...(current?.open ? [""] : []), ...(current?.slots ?? [])].map((t, i) => (
              <label key={t || "now"} className="cursor-pointer">
                <input type="radio" name="eta" value={t} defaultChecked={i === 0} className="peer sr-only" />
                <span className="block rounded-full border border-line px-4 py-2 text-sm font-semibold transition peer-checked:border-ink peer-checked:bg-ink peer-checked:text-paper peer-focus-visible:ring-2 peer-focus-visible:ring-ink">
                  {t ? clock(t) : "Now"}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {!closed && <SubmitButton className="w-full">Check in</SubmitButton>}
    </ActionForm>
  );
}
