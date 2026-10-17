// Runs synchronously while the HTML parses, before first paint. On the client
// it renders as inert text/plain so React doesn't warn about <script> tags.
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
