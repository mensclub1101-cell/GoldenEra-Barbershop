"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/browser";
import { checkInstagramPost, publishInstagramPost, startInstagramCarousel, startInstagramPost } from "@/app/actions/instagram";

type Tab = "instagram" | "client";
type Mode = "single" | "beforeAfter";
type Picked = { file: File; url: string };

// Seasonal ideas show up a few weeks ahead, with a countdown.
const SEASONS: { label: string; date: (year: number) => Date; idea: string }[] = [
  { label: "New Year", date: (y) => new Date(y, 0, 1), idea: "New year, fresh cut. Get booked for the first week." },
  { label: "Valentine's", date: (y) => new Date(y, 1, 14), idea: "Look sharp for Valentine's. Slots going fast." },
  { label: "Easter", date: (y) => easter(y), idea: "Fresh for Easter Sunday. Book the weekend." },
  { label: "Prom", date: (y) => new Date(y, 4, 1), idea: "Prom season cut. Lock in your day early." },
  { label: "Graduation", date: (y) => new Date(y, 5, 1), idea: "Walk the stage fresh. Grad cuts all month." },
  { label: "Father's Day", date: (y) => nthWeekday(y, 5, 0, 3), idea: "Father's Day: bring pops in, both fresh." },
  { label: "4th of July", date: (y) => new Date(y, 6, 4), idea: "Fresh for the 4th. Get in before the holiday." },
  { label: "Back to school", date: (y) => new Date(y, 7, 10), idea: "Back-to-school cuts. Book the kids in." },
  { label: "Halloween", date: (y) => new Date(y, 9, 31), idea: "Halloween weekend. Clean cut under the costume." },
  { label: "Thanksgiving", date: (y) => nthWeekday(y, 10, 4, 4), idea: "Fresh for Thanksgiving. Book before the holiday rush." },
  { label: "Christmas", date: (y) => new Date(y, 11, 25), idea: "Holiday cuts. Get booked before Christmas." },
];
const IDEAS = [
  { label: "Fresh cut", idea: "Fresh cut, clean finish." },
  { label: "Design work", idea: "Show off the design work." },
  { label: "Line-up", idea: "Sharp line-up, two weeks fresh." },
  { label: "Beard work", idea: "Beard shaped and lined." },
  { label: "Openings", idea: "Openings this week. Link to book." },
];

function nthWeekday(year: number, month: number, weekday: number, n: number) {
  const first = new Date(year, month, 1);
  const offset = (weekday - first.getDay() + 7) % 7;
  return new Date(year, month, 1 + offset + (n - 1) * 7);
}
function easter(y: number) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  return new Date(y, Math.floor((h + l - 7 * m + 114) / 31) - 1, ((h + l - 7 * m + 114) % 31) + 1);
}
function upcoming(today: Date) {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return SEASONS.flatMap((s) =>
    [start.getFullYear(), start.getFullYear() + 1].map((y) => ({ ...s, days: Math.round((+s.date(y) - +start) / 86400000) })),
  )
    .filter((s) => s.days >= 0 && s.days <= 30)
    .sort((a, b) => a.days - b.days)
    .slice(0, 2);
}

// Photo/video picker: big tap area (iPhone offers library, camera or files),
// plus direct Camera and Camera roll buttons.
function MediaPicker({
  picked,
  onPick,
  label,
  photoOnly = false,
}: {
  picked: Picked | null;
  onPick: (p: Picked | null) => void;
  label?: string;
  photoOnly?: boolean;
}) {
  const any = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const roll = useRef<HTMLInputElement>(null);
  const take = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (picked) URL.revokeObjectURL(picked.url);
    onPick({ file, url: URL.createObjectURL(file) });
  };
  const isVideo = picked?.file.type.startsWith("video/");
  const accept = photoOnly ? "image/*" : "image/*,video/*";
  const compact = Boolean(label);

  return (
    <div className="space-y-3">
      <input ref={any} type="file" accept={accept} onChange={take} className="hidden" />
      <input ref={camera} type="file" accept={accept} capture="environment" onChange={take} className="hidden" />
      <input ref={roll} type="file" accept={accept} onChange={take} className="hidden" />
      <button
        type="button"
        onClick={() => any.current?.click()}
        className={`relative grid aspect-[4/5] w-full place-items-center overflow-hidden border-2 border-dashed border-line bg-paper-2 text-center ${
          compact ? "rounded-2xl" : "rounded-3xl"
        }`}
      >
        {label && (
          <span className="absolute left-2 top-2 z-10 rounded-full bg-ink px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-paper">
            {label}
          </span>
        )}
        {picked ? (
          isVideo ? (
            <video src={picked.url} className="h-full w-full object-cover" muted playsInline autoPlay loop />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- local preview of the picked file
            <img src={picked.url} alt="Picked" className="h-full w-full object-cover" />
          )
        ) : (
          <span>
            <svg viewBox="0 0 24 24" className={`mx-auto fill-none stroke-ink ${compact ? "h-8 w-8" : "h-10 w-10"}`} strokeWidth={1.6} aria-hidden>
              <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
              <circle cx="12" cy="13" r="3.5" />
            </svg>
            <span className="mt-2 block px-2 text-sm font-semibold text-ink-2">
              {compact ? "Tap to add" : photoOnly ? "Tap to choose a photo" : "Tap to choose photo or video"}
            </span>
          </span>
        )}
      </button>
      <div className={`grid gap-2 ${compact ? "grid-cols-1" : "grid-cols-2"}`}>
        <button type="button" onClick={() => camera.current?.click()} className={`rounded-2xl border border-ink text-sm font-semibold ${compact ? "py-2.5" : "py-3"}`}>
          {compact ? "Snap" : photoOnly ? "Take photo" : "Take photo / video"}
        </button>
        <button type="button" onClick={() => roll.current?.click()} className={`rounded-2xl border border-ink text-sm font-semibold ${compact ? "py-2.5" : "py-3"}`}>
          Camera roll
        </button>
      </div>
      {picked && (
        <button type="button" onClick={() => onPick(null)} className="text-xs font-semibold text-muted underline">
          Remove
        </button>
      )}
    </div>
  );
}

// Instagram feed photos must be JPEG with a shape between 4:5 (tall) and
// 1.91:1 (wide). Re-encode any photo (HEIC, PNG...) as JPEG, center-crop it
// into that range and cap the width at 1440px.
async function instagramJpeg(file: File, exactFourFive = false): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("Couldn't read that photo."));
    i.src = URL.createObjectURL(file);
  });
  let sw = img.naturalWidth;
  let sh = img.naturalHeight;
  // Before & after photos are both cut to exactly 4:5 so the two slides match.
  const min = 4 / 5;
  const max = exactFourFive ? 4 / 5 : 1.91;
  if (sw / sh < min) sh = Math.round(sw / min);
  else if (sw / sh > max) sw = Math.round(sh * max);
  const sx = Math.round((img.naturalWidth - sw) / 2);
  const sy = Math.round((img.naturalHeight - sh) / 2);
  const scale = Math.min(1, 1440 / sw);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(sw * scale);
  canvas.height = Math.round(sh * scale);
  canvas.getContext("2d")!.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(img.src);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't prepare that photo."))), "image/jpeg", 0.9),
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// iPhone Safari can put an image on the clipboard as PNG; videos can't be copied.
async function copyImage(file: File) {
  if (!file.type.startsWith("image/") || typeof ClipboardItem === "undefined") return false;
  try {
    const png = new Promise<Blob>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext("2d")!.drawImage(img, 0, 0);
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("no blob"))), "image/png");
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
    await navigator.clipboard.write([new ClipboardItem({ "image/png": png })]);
    return true;
  } catch {
    return false;
  }
}

export function MediaStudio({
  barberName,
  shopName,
  bookingUrl,
  siteUrl,
  clients,
  userId,
  instagramConnected,
  barberInstagram,
}: {
  barberName: string;
  shopName: string;
  bookingUrl: string | null;
  siteUrl: string;
  clients: { name: string; phone: string }[];
  userId: string;
  instagramConnected: boolean;
  barberInstagram: string | null;
}) {
  const [tab, setTab] = useState<Tab>("instagram");
  const [picked, setPicked] = useState<Picked | null>(null);
  const [mode, setMode] = useState<Mode>("single");
  const [before, setBefore] = useState<Picked | null>(null);
  const [after, setAfter] = useState<Picked | null>(null);
  const [ask, setAsk] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("");
  const [posting, setPosting] = useState(false);
  const [permalink, setPermalink] = useState<string | null>(null);
  const [today, setToday] = useState<Date | null>(null);
  useEffect(() => {
    const id = setTimeout(() => setToday(new Date()), 0); // dates differ between server and phone
    return () => clearTimeout(id);
  }, []);
  const seasons = useMemo(() => (today ? upcoming(today) : []), [today]);
  const link = bookingUrl ?? siteUrl;
  const firstName = (n: string) => n.split(" ")[0];
  const match = clients.find((c) => c.phone.replace(/\D/g, "").endsWith(phone.replace(/\D/g, "").slice(-10)) && phone.replace(/\D/g, "").length >= 10);

  const addIdea = (idea: string) => setAsk((a) => (a.trim() ? `${a.trim()} ${idea}` : idea));

  const handle = barberInstagram?.replace(/^@/, "").trim();
  const caption = () =>
    [
      ...(mode === "beforeAfter" ? ["Before ➡️ After. Swipe to see it."] : []),
      ask.trim() || "Fresh cut.",
      "",
      `✂️ ${handle ? `@${handle}` : barberName} · Golden Era ${shopName}`,
      `Book: ${link}`,
      "",
      "#GoldenEraBarbershop #MorenoValley #MorenoValleyBarber #Barbershop #FreshCut",
    ].join("\n");

  // Upload to our storage, hand Instagram the public URL, wait until it's
  // processed (videos take a while), then publish.
  const uploadForInstagram = async (file: File, exactFourFive: boolean) => {
    const isVideo = file.type.startsWith("video/");
    const body = isVideo ? file : await instagramJpeg(file, exactFourFive);
    const ext = isVideo ? (file.type === "video/quicktime" ? "mov" : "mp4") : "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const supabase = getBrowserClient();
    const up = await supabase.storage.from("post-media").upload(path, body, { contentType: isVideo ? file.type : "image/jpeg" });
    if (up.error) throw new Error("Upload failed. Check your signal and try again.");
    return supabase.storage.from("post-media").getPublicUrl(path).data.publicUrl;
  };

  const postToInstagram = async () => {
    const beforeAfter = mode === "beforeAfter";
    if (beforeAfter && (!before || !after)) return setStatus("Add both the before and the after photo.");
    if (!beforeAfter && !picked) return setStatus("Pick a photo or video first.");
    const isVideo = !beforeAfter && picked!.file.type.startsWith("video/");
    if (isVideo && !/^video\/(mp4|quicktime)$/.test(picked!.file.type)) return setStatus("Instagram takes MP4 or MOV videos.");
    if (isVideo && picked!.file.size > 100 * 1024 * 1024) return setStatus("That video is over 100 MB. Trim it and try again.");
    setPosting(true);
    setPermalink(null);
    const mediaUrls: string[] = [];
    try {
      setStatus(isVideo ? "Uploading your video…" : beforeAfter ? "Getting your before & after ready…" : "Getting your photo ready…");
      for (const f of beforeAfter ? [before!.file, after!.file] : [picked!.file]) mediaUrls.push(await uploadForInstagram(f, beforeAfter));

      setStatus("Sending to Instagram…");
      const started = beforeAfter
        ? await startInstagramCarousel(mediaUrls, caption())
        : await startInstagramPost(mediaUrls[0], isVideo, caption());
      if (!started.ok) throw new Error(started.error);

      // Photos are usually ready at once; videos can take a minute or two.
      for (let i = 0; i < 60; i++) {
        const check = await checkInstagramPost(started.data.id);
        if (!check.ok) throw new Error(check.error);
        if (check.data.status === "FINISHED") break;
        if (check.data.status === "ERROR" || check.data.status === "EXPIRED") throw new Error("Instagram couldn't process that file. Try a different one.");
        if (i === 59) throw new Error("Instagram is taking too long. Try again in a minute.");
        setStatus(isVideo ? "Instagram is processing your video. This can take a minute…" : "Almost there…");
        await sleep(3000);
      }

      setStatus("Posting…");
      const done = await publishInstagramPost(started.data.id, mediaUrls);
      if (!done.ok) throw new Error(done.error);
      setPermalink(done.data.permalink);
      setStatus("Posted to the shop's Instagram.");
      setPicked(null);
      setBefore(null);
      setAfter(null);
      setAsk("");
    } catch (e) {
      // Leave nothing half-done in storage when it fails.
      const paths = mediaUrls.map((u) => u.split("/public/post-media/")[1]);
      if (paths.length) await getBrowserClient().storage.from("post-media").remove(paths).catch(() => {});
      setStatus(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setPosting(false);
    }
  };

  const shareToInstagram = async () => {
    const items = mode === "beforeAfter" && tab === "instagram" ? [before, after] : [picked];
    if (items.some((p) => !p)) return setStatus(items.length > 1 ? "Add both the before and the after photo." : "Pick a photo or video first.");
    const files = items.map((p) => p!.file);
    const text = caption();
    const copied = await copyText(text);
    const shareData = { files };
    if (navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
        setStatus(copied ? "Caption copied. Paste it in Instagram." : "Shared. Add your caption in Instagram.");
      } catch {
        setStatus("Share cancelled.");
      }
    } else {
      for (const p of items) Object.assign(document.createElement("a"), { href: p!.url, download: p!.file.name }).click();
      setStatus(copied ? "Saved and copied the caption. Post it from your phone." : "Saved.");
    }
  };

  const message = (name?: string) =>
    `Thanks for coming in${name ? `, ${firstName(name)}` : ""}! Here's your cut from ${firstName(barberName)} at Golden Era. Book your next one: ${link}`;

  const openMessages = async () => {
    const digits = phone.replace(/[^\d+]/g, "");
    if (digits.replace(/\D/g, "").length < 10) return setStatus("Enter the client's phone number.");
    const copiedPhoto = picked ? await copyImage(picked.file) : false;
    setStatus(
      picked
        ? copiedPhoto
          ? "Photo copied. In Messages, tap the text box and Paste."
          : "Messages is open. Attach the photo from your camera roll."
        : "Messages is open.",
    );
    // iPhone Messages reads "&body=" after the number.
    window.location.assign(`sms:${digits}&body=${encodeURIComponent(message(match?.name))}`);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 rounded-full bg-paper-2 p-1">
        {(["instagram", "client"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setTab(t);
              setStatus("");
            }}
            className={`rounded-full py-2.5 text-sm font-semibold uppercase tracking-wider transition ${
              tab === t ? "bg-ink text-paper" : "text-ink-2"
            }`}
          >
            {t === "instagram" ? "Instagram" : "Client 💈"}
          </button>
        ))}
      </div>

      <p className="text-sm text-ink-2">
        {tab === "instagram"
          ? "Say what you want and it builds the post for the shop's Instagram."
          : "Send your client their cut with a thank-you and your booking link."}
      </p>

      {tab === "instagram" && (
        <div className="grid grid-cols-2 gap-1 rounded-full border border-line p-1 text-xs font-semibold">
          {(
            [
              ["single", "Photo or video"],
              ["beforeAfter", "Before & after"],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setStatus("");
              }}
              aria-pressed={mode === m}
              className={`rounded-full py-2 transition ${mode === m ? "bg-paper-2 text-ink" : "text-muted"}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {tab === "instagram" && mode === "beforeAfter" ? (
        <div className="grid grid-cols-2 gap-3">
          <MediaPicker picked={before} onPick={setBefore} label="Before" photoOnly />
          <MediaPicker picked={after} onPick={setAfter} label="After" photoOnly />
        </div>
      ) : (
        <MediaPicker picked={picked} onPick={setPicked} />
      )}

      {tab === "instagram" ? (
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.25em] text-muted">Tell AI what you want</span>
            <textarea
              value={ask}
              onChange={(e) => setAsk(e.target.value)}
              rows={3}
              maxLength={600}
              placeholder="Mid fade, skin drop. Keep it clean and confident, plug weekend openings."
              className="w-full rounded-2xl border border-line bg-paper px-4 py-3 text-base outline-none focus:border-ink"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {seasons.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => addIdea(s.idea)}
                className="flex items-center gap-2 rounded-full border border-ink px-3 py-2 text-sm font-semibold"
              >
                {s.label}
                <span className="rounded-full bg-ink px-1.5 text-[11px] text-paper">{s.days === 0 ? "today" : `${s.days}d`}</span>
              </button>
            ))}
            {IDEAS.map((i) => (
              <button
                key={i.label}
                type="button"
                onClick={() => addIdea(i.idea)}
                className="rounded-full border border-line px-3 py-2 text-sm font-semibold"
              >
                {i.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted">Tap an idea to add it, or just say what you want.</p>
          {instagramConnected ? (
            <>
              <div>
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.25em] text-muted">Caption preview</span>
                <p className="whitespace-pre-line rounded-2xl bg-paper-2 p-4 text-sm text-ink-2">{caption()}</p>
              </div>
              <button
                type="button"
                onClick={postToInstagram}
                disabled={posting || (mode === "beforeAfter" ? !before || !after : !picked)}
                className="w-full rounded-full bg-ink py-3.5 text-sm font-semibold uppercase tracking-wider text-paper disabled:opacity-50"
              >
                {posting ? "Posting…" : "Post to Instagram"}
              </button>
              <button
                type="button"
                onClick={shareToInstagram}
                disabled={posting}
                className="w-full text-center text-xs font-semibold text-muted underline disabled:opacity-50"
              >
                Or share it yourself
              </button>
            </>
          ) : (
            <>
              <p className="rounded-2xl border border-line p-4 text-sm text-ink-2">
                <strong className="text-ink">Instagram isn&rsquo;t connected yet,</strong> so this can&rsquo;t post by
                itself. Tap below to copy the caption and share the photo to Instagram yourself.
              </p>
              <button type="button" onClick={shareToInstagram} className="w-full rounded-full bg-ink py-3.5 text-sm font-semibold uppercase tracking-wider text-paper">
                Share to Instagram
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.25em] text-muted">Client phone</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="tel"
              inputMode="tel"
              list="client-phones"
              placeholder="(951) 555-0123"
              className="w-full rounded-2xl border border-line bg-paper px-4 py-3 text-base outline-none focus:border-ink"
            />
            <datalist id="client-phones">
              {clients.map((c) => (
                <option key={c.phone} value={c.phone}>
                  {c.name}
                </option>
              ))}
            </datalist>
          </label>
          {match && <p className="text-xs font-semibold text-ink">Sending to {match.name}</p>}
          <div className="rounded-2xl bg-paper-2 p-4 text-sm text-ink-2">{message(match?.name)}</div>
          <button type="button" onClick={openMessages} className="w-full rounded-full bg-ink py-3.5 text-sm font-semibold uppercase tracking-wider text-paper">
            Open in Messages
          </button>
        </div>
      )}

      {status && (
        <p role="status" className="rounded-2xl bg-paper-2 px-4 py-3 text-sm">
          {status}
          {permalink && (
            <>
              {" "}
              <a href={permalink} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
                View it
              </a>
            </>
          )}
        </p>
      )}
    </div>
  );
}
