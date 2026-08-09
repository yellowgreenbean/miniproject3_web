const TUFT_POSITIONS = [
  [14, 30],
  [46, 16],
  [80, 8],
  [116, 14],
  [150, 24],
  [182, 30],
  [212, 22],
  [246, 10],
  [280, 6],
  [314, 16],
  [348, 30],
  [368, 38],
];

export default function GrassHill() {
  return (
    <div className="grassHill" aria-hidden="true">
      <svg viewBox="0 0 390 100" preserveAspectRatio="none" width="100%" height="100%">
        <defs>
          <linearGradient id="hillGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-hill-top)" />
            <stop offset="100%" stopColor="var(--color-hill-bottom)" />
          </linearGradient>
          <symbol id="grassTuft" viewBox="0 0 10 10">
            <path
              d="M5 10 L5 3M5 6 L1.5 1M5 6 L8.5 1"
              stroke="var(--color-hill-bottom)"
              strokeWidth="1.4"
              strokeLinecap="round"
              fill="none"
            />
          </symbol>
        </defs>
        <path
          d="M0 44 C 65 4, 135 4, 195 28 C 255 4, 325 4, 390 44 L390 100 L0 100 Z"
          fill="url(#hillGrad)"
        />
        {TUFT_POSITIONS.map(([x, y]) => (
          <use key={x} href="#grassTuft" x={x} y={y} width="13" height="13" />
        ))}
      </svg>
    </div>
  );
}
