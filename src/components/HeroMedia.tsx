"use client";

import { useEffect, useRef } from "react";

// Homepage hero background: the outside walkthrough plays once, then fades into
// the looping interior walkthrough. Content sits on top from the first paint;
// nothing waits for the video. Bloom and light flashes are baked into the files
// (scripts/build-hero-media.sh); the browser only plays them.

type Orientation = "portrait" | "landscape";
type Files = { webm: string; mp4: string; poster: string };

const media = (name: "intro" | "loop", o: Orientation): Files => ({
  webm: `/media/hero-${name}-${o}.webm`,
  mp4: `/media/hero-${name}-${o}.mp4`,
  poster: `/media/hero-${name}-${o}.jpg`,
});

const LOOP_PRELOAD_S = 3; // start fetching the loop this far into the intro

function currentOrientation(): Orientation {
  return matchMedia("(orientation: portrait)").matches ? "portrait" : "landscape";
}

function motionAllowed() {
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
  return !saveData && !matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// MP4 (H.264) first: it plays everywhere, iOS included. WebM is the fallback for
// browsers without H.264. iOS only autoplays inline video that is muted, so set
// both the properties and the attributes it checks.
function setSources(video: HTMLVideoElement, files: Files) {
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
const TAP_EVENTS = ["touchend", "click", "keydown"] as const;
function playOrWaitForTap(video: HTMLVideoElement) {
  video.play().catch(() => {
    const retry = () => {
      video.play().catch(() => {});
      for (const t of TAP_EVENTS) window.removeEventListener(t, retry);
    };
    for (const t of TAP_EVENTS) window.addEventListener(t, retry, { passive: true });
  });
}

export function HeroMedia() {
  const introRef = useRef<HTMLVideoElement>(null);
  const loopRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const intro = introRef.current;
    const loop = loopRef.current;
    if (!intro || !loop || !motionAllowed()) return;

    let orientation = currentOrientation();
    let loopLoaded = false;
    const loadLoop = () => {
      if (loopLoaded) return;
      loopLoaded = true;
      setSources(loop, media("loop", orientation));
    };
    // Intro done (or failed): fade it out over the loop.
    const toLoop = () => {
      loadLoop();
      playOrWaitForTap(loop);
      intro.dataset.done = "true";
    };
    const onTime = () => {
      if (intro.currentTime >= LOOP_PRELOAD_S) loadLoop();
    };
    intro.addEventListener("timeupdate", onTime);
    intro.addEventListener("ended", toLoop);
    setSources(intro, media("intro", orientation));
    // Give up on the intro only when its last source fails (earlier ones failing
    // just means the browser moves on to the next format).
    intro.lastElementChild?.addEventListener("error", toLoop);
    playOrWaitForTap(intro);

    // Rotating the phone switches to the other cut of the loop.
    const mq = matchMedia("(orientation: portrait)");
    const onRotate = () => {
      orientation = currentOrientation();
      intro.pause();
      intro.dataset.done = "true";
      loopLoaded = false;
      loadLoop();
      playOrWaitForTap(loop);
    };
    mq.addEventListener("change", onRotate);

    // Pause while the hero is scrolled out of view.
    const io = new IntersectionObserver(([entry]) => {
      const active = intro.dataset.done ? loop : intro;
      if (entry.isIntersecting) active.play().catch(() => {});
      else active.pause();
    });
    io.observe(loop);

    return () => {
      intro.removeEventListener("timeupdate", onTime);
      intro.removeEventListener("ended", toLoop);
      intro.lastElementChild?.removeEventListener("error", toLoop);
      mq.removeEventListener("change", onRotate);
      io.disconnect();
    };
  }, []);

  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden bg-ink">
      {/* Poster right away (server-rendered); the videos cover it once they play. */}
      <picture>
        <source media="(orientation: portrait)" srcSet={media("intro", "portrait").poster} />
        <img src={media("intro", "landscape").poster} alt="" className="h-full w-full object-cover" />
      </picture>
      <video ref={loopRef} muted loop playsInline preload="none" className="absolute inset-0 h-full w-full object-cover" />
      <video
        ref={introRef}
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 data-[done]:opacity-0"
      />
      {/* Darken behind the text so it stays readable over any frame. */}
      <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/45 to-ink/30" />
      <div className="absolute inset-0 bg-gradient-to-r from-ink/60 to-transparent" />
    </div>
  );
}
