"use client";

import { useState } from "react";
import { ActionForm, Field, SubmitButton, inputClass } from "@/components/forms";
import { checkIn } from "@/app/actions/auth";
import { clock, telHref } from "@/lib/shop";

// open: the shop takes walk-ins right now; slots: arrival times left today.
type Shop = {
  slug: string;
  name: string;
  phone: string | null;
  open: boolean;
  slots: string[];
  reopens: string;
  barbers: { id: string; name: string }[];
};

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
        <div className="rounded-xl bg-paper-2 p-4 text-sm text-ink-2">
          <p>
            {current?.name} is done taking walk-ins for today.
            {current?.reopens && ` Check-in opens ${current.reopens}.`}
          </p>
          {current?.phone && (
            <a href={telHref(current.phone)} className="mt-3 inline-block font-semibold text-ink underline">
              Call {current.name} {current.phone}
            </a>
          )}
        </div>
      ) : (
        <fieldset key={shop} className="min-w-0">
          <legend className="mb-1.5 block text-sm font-semibold">ETA</legend>
          <p className="mb-2 text-xs text-muted">When will you get to the shop? Swipe for later times.</p>
          {/* One row that swipes sideways, so a full day of times doesn't push Check in off the screen. */}
          <div className="relative -mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {[...(current?.open ? [""] : []), ...(current?.slots ?? [])].map((t, i) => (
              <label key={t || "now"} className="shrink-0 cursor-pointer snap-start">
                <input type="radio" name="eta" value={t} defaultChecked={i === 0} className="peer sr-only" />
                <span className="block whitespace-nowrap rounded-full border border-line px-4 py-2 text-sm font-semibold transition peer-checked:border-ink peer-checked:bg-ink peer-checked:text-paper peer-focus-visible:ring-2 peer-focus-visible:ring-ink">
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
