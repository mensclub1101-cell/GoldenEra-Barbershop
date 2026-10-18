"use client";

import { useEffect, useRef, useState } from "react";
import { getBrowserClient, subscribeAsUser } from "@/lib/supabase/browser";
import type { Tables } from "@/lib/database.types";

type Message = Tables<"shop_messages">;

const timeFmt = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", minute: "2-digit" });

// Shop group chat: everyone on staff at this shop, live.
export function ShopChat({
  shopId,
  me,
  myName,
  initial,
}: {
  shopId: string;
  me: string;
  myName: string;
  initial: Message[];
}) {
  const [messages, setMessages] = useState(initial);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return subscribeAsUser(`chat:${shopId}`, (channel) =>
      channel.on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "shop_messages", filter: `shop_id=eq.${shopId}` },
        (change) => {
          const row = change.new as Message;
          setMessages((m) => (m.some((x) => x.id === row.id) ? m : [...m, row].slice(-50)));
        },
      ),
    );
  }, [shopId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setDraft("");
    setError("");
    const { data, error: err } = await getBrowserClient()
      .from("shop_messages")
      .insert({ shop_id: shopId, author_name: myName, body })
      .select()
      .single();
    if (err) {
      setError("Couldn't send. Try again.");
      setDraft(body);
    } else if (data) {
      setMessages((m) => (m.some((x) => x.id === data.id) ? m : [...m, data].slice(-50)));
    }
  };

  return (
    <div>
      <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
        {messages.length === 0 && <p className="text-sm text-muted">No messages yet. Say what&rsquo;s up.</p>}
        {messages.map((m) => {
          const mine = m.author_id === me;
          return (
            <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-ink text-paper" : "bg-paper-2"}`}>
                {m.body}
              </div>
              <span className="mt-0.5 text-[10px] text-muted">
                {mine ? "You" : m.author_name} · {timeFmt.format(new Date(m.created_at))}
              </span>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <form onSubmit={send} className="mt-3 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={500}
          placeholder="Message the shop"
          className="min-w-0 flex-1 rounded-full border border-line bg-paper px-4 py-2.5 text-base outline-none focus:border-ink"
        />
        <button type="submit" className="rounded-full bg-ink px-4 text-sm font-semibold text-paper">
          Send
        </button>
      </form>
      {error && <p className="mt-2 text-xs text-red-800">{error}</p>}
    </div>
  );
}
