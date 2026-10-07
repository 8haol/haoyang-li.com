/**
 * The dark stage's atmosphere: two slow, soft pools of colour drifting behind the cards, plus a faint grain. Pure CSS
 * (transform-only keyframes on pre-blurred gradients), so it costs nothing next to the WebGL layer; frozen under
 * reduced motion by the global animation override.
 */
export function StageBackdrop({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <div className="stage-pool stage-pool-a" />
      <div className="stage-pool stage-pool-b" />
      <div className="stage-grain" />
    </div>
  );
}
