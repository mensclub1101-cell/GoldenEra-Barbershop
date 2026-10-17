"use client";

import { useEffect, useRef, useState } from "react";

// Homepage hero visuals: a one-time full-screen intro (shop walkthrough with
// the logo lighting up), then a looping walkthrough behind the hero content.
// Bloom and light flashes are baked into the videos (scripts/build-hero-media.sh);
// the browser only plays them and runs the logo/fade CSS.
//
// The inline script in INTRO_SCRIPT decides before first paint whether the intro
// plays, by setting <html data-intro="play">. When it ends this component sets
// data-intro="done", which fades the hero content in (see globals.css).

const SESSION_KEY = "ge-intro-seen";
const INTRO_STALL_MS = 2500; // give up on a slow intro video and open the site
const LOGO_AT_S = 2.6; // logo starts revealing this far into the intro video
const LOGO_EVENT = "ge-intro-logo"; // fired when the logo shows; the loop starts loading then

export const INTRO_SCRIPT = `try{var d=document.documentElement;if(!sessionStorage.getItem("${SESSION_KEY}")&&!matchMedia("(prefers-reduced-motion: reduce)").matches){d.dataset.intro="play";sessionStorage.setItem("${SESSION_KEY}","1")}}catch(e){}`;

type Orientation = "portrait" | "landscape";

const media = (name: "intro" | "loop", o: Orientation) => ({
  webm: `/media/hero-${name}-${o}.webm`,
  mp4: `/media/hero-${name}-${o}.mp4`,
  poster: `/media/hero-${name}-${o}.jpg`,
});

function currentOrientation(): Orientation {
  return matchMedia("(orientation: portrait)").matches ? "portrait" : "landscape";
}

// MP4 (H.264) first: it plays everywhere, iOS included. WebM is the fallback for
// browsers without H.264. iOS only autoplays inline video that is muted, so set
// both the properties and the attributes it checks.
function setSources(video: HTMLVideoElement, files: { webm: string; mp4: string; poster: string }) {
  video.muted = video.defaultMuted = true;
  video.playsInline = true;
  video.setAttribute("muted", "");
  video.setAttribute("playsinline", "");
  video.poster = files.poster;
  video.replaceChildren(
    Object.assign(document.createElement("source"), { src: files.mp4, type: "video/mp4" }),
    Object.assign(document.createElement("source"), { src: files.webm, type: "video/webm" }),
  );
  video.load();
}

// Autoplay can be refused (iPhone Low Power Mode does this). Playback started
// from a tap is always allowed, so retry on the visitor's first interaction.
function playOrWaitForTap(video: HTMLVideoElement) {
  video.play().catch(() => {
    const retry = () => {
      video.play().catch(() => {});
      for (const t of TAP_EVENTS) window.removeEventListener(t, retry);
    };
    for (const t of TAP_EVENTS) window.addEventListener(t, retry, { passive: true });
  });
}
const TAP_EVENTS = ["touchend", "click", "keydown"] as const;

function motionAllowed() {
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
  return !saveData && !matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function HeroMedia() {
  const loopRef = useRef<HTMLVideoElement>(null);
  const introRef = useRef<HTMLVideoElement>(null);
  const [intro, setIntro] = useState<"off" | "playing" | "leaving">("off");
  const [logo, setLogo] = useState(false);

  useEffect(() => {
    if (logo) window.dispatchEvent(new Event(LOGO_EVENT));
  }, [logo]);

  // Background loop: pick the file for the screen's orientation, swap on
  // rotation, and pause while the hero is off screen.
  useEffect(() => {
    const video = loopRef.current;
    if (!video || !motionAllowed()) return;
    let shown: Orientation | null = null;
    const load = () => {
      const o = currentOrientation();
      if (o === shown) return;
      shown = o;
      setSources(video, media("loop", o));
      playOrWaitForTap(video);
    };
    // Don't compete with the intro for bandwidth: wait until its logo shows.
    if (document.documentElement.dataset.intro === "play") {
      window.addEventListener(LOGO_EVENT, load, { once: true });
    } else {
      load();
    }
    const mq = matchMedia("(orientation: portrait)");
    mq.addEventListener("change", load);
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) video.play().catch(() => {});
      else video.pause();
    });
    io.observe(video);
    return () => {
      window.removeEventListener(LOGO_EVENT, load);
      mq.removeEventListener("change", load);
      io.disconnect();
    };
  }, []);

  // Intro: only when the inline script asked for it on this page load.
  useEffect(() => {
    const root = document.documentElement;
    if (root.dataset.intro !== "play") return;
    const video = introRef.current;
    if (!video) return;
    setIntro("playing");
    root.style.overflow = "hidden";

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      setLogo(true);
      setIntro("leaving");
      root.dataset.intro = "done";
      root.style.overflow = "";
      window.setTimeout(() => setIntro("off"), 1000);
    };

    const stall = window.setTimeout(finish, INTRO_STALL_MS);
    const onPlaying = () => window.clearTimeout(stall);
    const onTime = () => {
      if (video.currentTime >= LOGO_AT_S) setLogo(true);
    };
    video.addEventListener("playing", onPlaying);
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("ended", finish);
    video.addEventListener("error", finish);
    const onKey = (e: KeyboardEvent) => {
      if (["Escape", "Enter", " "].includes(e.key)) finish();
    };
    window.addEventListener("keydown", onKey);

    setSources(video, media("intro", currentOrientation()));
    video.play().catch(finish);

    window.addEventListener("ge-intro-skip", finish);
    return () => {
      window.clearTimeout(stall);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("ge-intro-skip", finish);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("ended", finish);
      video.removeEventListener("error", finish);
      root.style.overflow = "";
    };
  }, []);

  return (
    <>
      {/* Background: poster right away (server-rendered), loop video over it once it plays. */}
      <div aria-hidden className="absolute inset-0 overflow-hidden bg-ink">
        <picture>
          <source media="(orientation: portrait)" srcSet={media("loop", "portrait").poster} />
          <img src={media("loop", "landscape").poster} alt="" className="h-full w-full object-cover" />
        </picture>
        <video
          ref={loopRef}
          muted
          loop
          playsInline
          autoPlay
          preload="none"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* Darken behind the text so it stays readable over any frame. */}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/45 to-ink/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/60 to-transparent" />
      </div>

      {/* One-time intro. Hidden unless <html data-intro="play">; tap anywhere skips. */}
      <div className="intro fixed inset-0 z-[60] bg-ink" data-state={intro}>
        <video
          ref={introRef}
          muted
          playsInline
          preload="auto"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div aria-hidden className="absolute inset-0 bg-ink/25" />
        <div aria-hidden className="logo-reveal absolute inset-0 grid place-items-center px-8" data-on={logo}>
          <div className="relative w-full max-w-3xl">
            <div className="logo-halo" />
            {/* eslint-disable-next-line @next/next/no-img-element -- static SVG, no optimization needed */}
            <img src="/brand/logo-white.svg" alt="" className="logo-glow absolute inset-0 h-auto w-full" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-white.svg" alt="" className="logo-mark relative h-auto w-full" />
          </div>
        </div>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event("ge-intro-skip"))}
          className="absolute inset-0 flex cursor-pointer items-end justify-center pb-10 text-xs font-semibold uppercase tracking-[0.3em] text-paper/60"
        >
          Tap to skip
        </button>
      </div>
    </>
  );
}
