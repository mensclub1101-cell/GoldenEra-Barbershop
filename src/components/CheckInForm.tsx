"use client";

import { useState } from "react";
import { ActionForm, Field, SubmitButton, inputClass } from "@/components/forms";
import { checkIn } from "@/app/actions/auth";

type Shop = { slug: string; name: string; barbers: { id: string; name: string }[] };

export function CheckInForm({ shops, initialShop }: { shops: Shop[]; initialShop?: string }) {
  const [shop, setShop] = useState(initialShop && shops.some((s) => s.slug === initialShop) ? initialShop : shops[0]?.slug);
  const barbers = shops.find((s) => s.slug === shop)?.barbers ?? [];

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
      <SubmitButton className="w-full">Check in</SubmitButton>
    </ActionForm>
  );
}
