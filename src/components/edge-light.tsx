/**
 * Fixed-position ambient overlay that hugs the viewport edges with a
 * thin, breathing glow — pointer-events-none so it never blocks input.
 * Pass `color` as null/undefined to render nothing (off state).
 */
export function EdgeLight({ color }: { color: string | null | undefined }) {
  if (!color) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50 motion-safe:animate-edge-light"
      style={{ boxShadow: `inset 0 0 20px 4px ${color}` }}
    />
  );
}
