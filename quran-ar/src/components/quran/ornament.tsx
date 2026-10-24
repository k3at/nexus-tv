export function StarOrnament({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="5.5" y="5.5" width="13" height="13" />
      <rect x="5.5" y="5.5" width="13" height="13" transform="rotate(45 12 12)" />
      <circle cx="12" cy="12" r="2.1" />
    </svg>
  );
}

export function OrnamentDivider({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center gap-2 text-primary/50 ${className}`}
      aria-hidden="true"
    >
      <span className="ornament-line h-px w-16" />
      <span className="h-1 w-1 rounded-full bg-primary/30" />
      <StarOrnament className="h-4 w-4" />
      <span className="h-1 w-1 rounded-full bg-primary/30" />
      <span className="ornament-line h-px w-16" />
    </div>
  );
}
