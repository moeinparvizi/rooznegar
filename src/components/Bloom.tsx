const PETAL_COLORS = [
  "var(--green)",
  "var(--gold)",
  "var(--blue)",
  "var(--clay)",
  "var(--olive)",
];

export function Bloom({
  variant = 0,
  size = 28,
  bare = false,
  animate = false,
  muted = false,
  className,
  style,
}: {
  variant?: number;
  size?: number;
  bare?: boolean;
  animate?: boolean;
  muted?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const petal = muted ? "var(--faint)" : PETAL_COLORS[variant % PETAL_COLORS.length];
  const rotation = (variant % 5) * 7 - 14;
  const vb = bare ? "0 0 40 40" : "0 0 40 52";
  const height = bare ? size : Math.round(size * 1.3);
  return (
    <svg
      width={size}
      height={height}
      viewBox={vb}
      fill="none"
      aria-hidden
      className={`${animate ? "bloom-in" : ""} ${className ?? ""}`}
      style={style}
    >
      {!bare && (
        <>
          <path
            d="M20 50V27"
            stroke="var(--green)"
            strokeWidth="1.7"
            strokeLinecap="round"
            opacity={muted ? 0.28 : 0.7}
          />
          <path
            d="M20 41c-5.2-.4-8-3-8.4-7.1 4.7-.3 8 2.2 8.4 7.1Z"
            fill="var(--green)"
            opacity={muted ? 0.2 : 0.42}
          />
          <path
            d="M20 34c4.4-.6 6.8-2.8 7.1-6.3-4.1-.2-6.7 2-7.1 6.3Z"
            fill="var(--green)"
            opacity={muted ? 0.15 : 0.3}
          />
        </>
      )}
      <g transform={`translate(20 ${bare ? 20 : 17}) rotate(${rotation})`}>
        {Array.from({ length: 5 }, (_, i) => (
          <ellipse
            key={i}
            cx="0"
            cy="-7.4"
            rx="4.1"
            ry="7.1"
            fill={petal}
            opacity={muted ? 0.35 : 0.92}
            transform={`rotate(${i * 72})`}
          />
        ))}
        <circle
          cx="0"
          cy="0"
          r="3.1"
          fill={muted ? "var(--line-strong)" : "var(--bloom-gold)"}
        />
        <circle
          cx="0"
          cy="0"
          r="1.1"
          fill="var(--green-deep)"
          opacity={muted ? 0.2 : 0.5}
        />
      </g>
    </svg>
  );
}
