// Shown the moment someone taps a link, while the next page loads, so the app
// never looks frozen.
export default function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center py-32" role="status" aria-label="Loading">
      {/* eslint-disable-next-line @next/next/no-img-element -- static SVG logo */}
      <img src="/brand/logo-black.svg" alt="" width={2863} height={610} className="h-8 w-auto animate-pulse opacity-60" />
    </div>
  );
}
