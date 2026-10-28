export function BrandMark({
  size = 30,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden
      className={className}
    >
      <path
        d="M20 37V23"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity=".65"
      />
      <path
        d="M20 30c-5.5-.3-8.5-3.2-8.9-7.6 5-.3 8.5 2.4 8.9 7.6Z"
        fill="currentColor"
        opacity=".35"
      />
      <g fill="currentColor">
        <ellipse cx="20" cy="9" rx="4.4" ry="7.2" />
        <ellipse cx="20" cy="9" rx="4.4" ry="7.2" transform="rotate(72 20 16)" />
        <ellipse cx="20" cy="9" rx="4.4" ry="7.2" transform="rotate(144 20 16)" />
        <ellipse cx="20" cy="9" rx="4.4" ry="7.2" transform="rotate(216 20 16)" />
        <ellipse cx="20" cy="9" rx="4.4" ry="7.2" transform="rotate(288 20 16)" />
      </g>
      <circle cx="20" cy="16" r="3.3" fill="var(--bloom-gold)" />
      <circle cx="20" cy="16" r="1.2" fill="var(--green-deep)" opacity=".55" />
    </svg>
  );
}

export function BrandWord({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-baseline gap-[3px]">
      <span
        className="font-extrabold tracking-[-0.04em]"
        style={{ fontSize: compact ? 18 : 21 }}
      >
        روزنگار
      </span>
      {!compact && (
        <span
          className="h-[5px] w-[5px] rounded-full"
          style={{ background: "var(--bloom-gold)" }}
        />
      )}
    </span>
  );
}
