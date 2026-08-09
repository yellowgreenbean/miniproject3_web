export default function GrassHill() {
  return (
    <div className="grassHill" aria-hidden="true">
      <svg viewBox="0 0 400 100" preserveAspectRatio="none" width="100%" height="100%">
        <defs>
          <linearGradient id="hillGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-hill-top)" />
            <stop offset="100%" stopColor="var(--color-hill-bottom)" />
          </linearGradient>
        </defs>
        <path
          d="M0 46 C 70 8, 150 8, 200 30 C 250 8, 330 8, 400 46 L400 100 L0 100 Z"
          fill="url(#hillGrad)"
        />
        {[20, 55, 95, 135, 175, 215, 255, 295, 335, 375].map((x, i) => (
          <path
            key={x}
            d={`M${x} ${40 - (i % 3) * 4} l-3 -8 M${x} ${40 - (i % 3) * 4} l0 -9 M${x} ${40 - (i % 3) * 4} l3 -8`}
            stroke="var(--color-hill-bottom)"
            strokeWidth="1.6"
            strokeLinecap="round"
            fill="none"
          />
        ))}
      </svg>
    </div>
  );
}
