interface WaveDividerProps {
  className?: string;
}

export function WaveDivider({ className = "" }: WaveDividerProps) {
  // Generate multiple staggered sine wave paths
  const width = 1200;
  const height = 40;
  const waves = [
    { amplitude: 10, period: 320, yOffset: 20, opacity: 0.9, color: "url(#waveGrad1)" },
    { amplitude: 7, period: 280, yOffset: 22, opacity: 0.6, color: "url(#waveGrad2)" },
    { amplitude: 13, period: 360, yOffset: 18, opacity: 0.45, color: "url(#waveGrad1)" },
    { amplitude: 5, period: 240, yOffset: 21, opacity: 0.3, color: "url(#waveGrad2)" },
    { amplitude: 9, period: 300, yOffset: 19, opacity: 0.5, color: "url(#waveGrad1)" },
  ];

  function sinePathD(amplitude: number, period: number, yOffset: number, phaseShift = 0) {
    const points = 200;
    const step = width / points;
    let d = "";
    for (let i = 0; i <= points; i++) {
      const x = i * step;
      const y = yOffset + amplitude * Math.sin((2 * Math.PI * (x + phaseShift)) / period);
      d += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
    }
    return d;
  }

  return (
    <div className={`w-full overflow-hidden ${className}`} aria-hidden="true">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="w-full h-10"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="waveGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="50%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
          <linearGradient id="waveGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="50%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
        {waves.map((w, i) => (
          <path
            key={i}
            d={sinePathD(w.amplitude, w.period, w.yOffset, i * 40)}
            fill="none"
            stroke={w.color}
            strokeWidth="1.2"
            opacity={w.opacity}
          />
        ))}
      </svg>
    </div>
  );
}
