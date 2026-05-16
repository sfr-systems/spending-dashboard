"use client";

import { useEffect, useRef } from "react";

interface WaveDividerProps {
  className?: string;
  scrollOffset?: number;
}

// Paths are generated in pixel-space coordinates.
// VIEW_W covers any reasonable inner-div pixel width; viewBox is updated dynamically.
const VIEW_W = 4000;
const VIEW_H = 40;
// PAD: extra units beyond each edge so per-wave parallax shifts never show gaps
const PAD = 300;

// depth > 1 = closer (moves more); depth < 1 = further (moves less)
// Periods are now in pixels, so wave density is constant regardless of viewport width.
const waves = [
  { amplitude: 10, period: 280, yOffset: 20, opacity: 0.9,  color: "url(#waveGrad1)", depth: 1.25 },
  { amplitude: 7,  period: 240, yOffset: 22, opacity: 0.6,  color: "url(#waveGrad2)", depth: 1.05 },
  { amplitude: 13, period: 320, yOffset: 18, opacity: 0.45, color: "url(#waveGrad1)", depth: 0.87 },
  { amplitude: 5,  period: 200, yOffset: 21, opacity: 0.3,  color: "url(#waveGrad2)", depth: 0.68 },
  { amplitude: 9,  period: 260, yOffset: 19, opacity: 0.5,  color: "url(#waveGrad1)", depth: 0.95 },
];

export function WaveDivider({ className = "", scrollOffset = 0 }: WaveDividerProps) {
  const outerRef  = useRef<HTMLDivElement>(null);
  const innerRef  = useRef<HTMLDivElement>(null);
  const svgRef    = useRef<SVGSVGElement>(null);
  const groupRefs = useRef<(SVGGElement | null)[]>([]);
  // Current viewBox width (= inner div pixel width) used in scroll math
  const viewBoxW  = useRef<number>(VIEW_W);

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    const svg   = svgRef.current;
    if (!outer || !inner || !svg) return;

    // Keep viewBox width equal to the inner div's pixel width so 1 SVG unit = 1 px.
    // More viewport width → more wave cycles visible at constant period.
    function updateViewBox() {
      const w = Math.round(outer!.offsetWidth * 1.5);
      viewBoxW.current = w;
      svg!.setAttribute("viewBox", `0 0 ${w} ${VIEW_H}`);
    }

    const ro = new ResizeObserver(updateViewBox);
    ro.observe(outer);
    updateViewBox();

    // Walk up to find the element that actually scrolls
    let scrollEl: Element | null = inner.parentElement;
    while (scrollEl && scrollEl !== document.documentElement) {
      const { overflowY } = window.getComputedStyle(scrollEl);
      if (overflowY === "auto" || overflowY === "scroll") break;
      scrollEl = scrollEl.parentElement;
    }
    const target: EventTarget = scrollEl ?? window;

    function onScroll() {
      if (!inner) return;
      const scrollY =
        target === window ? window.scrollY : (target as Element).scrollTop;

      const sinVal   = Math.sin((scrollY + scrollOffset) / 600);
      const shiftPct = sinVal * (100 / 6);
      inner.style.transform = `translateX(${shiftPct.toFixed(3)}%)`;

      // Per-wave parallax in SVG units (= pixels at current viewBox scale)
      const extraSvgBase = sinVal * (viewBoxW.current / 6);
      groupRefs.current.forEach((g, i) => {
        if (!g) return;
        g.setAttribute("transform", `translate(${(extraSvgBase * (waves[i].depth - 1)).toFixed(2)}, 0)`);
      });
    }

    onScroll();
    target.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      ro.disconnect();
      target.removeEventListener("scroll", onScroll);
    };
  }, []);

  function seededRand(n: number) {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  function sineY(x: number, amplitude: number, period: number, yOffset: number, phaseShift: number) {
    return yOffset + amplitude * Math.sin((2 * Math.PI * (x + phaseShift)) / period);
  }

  function sinePathD(amplitude: number, period: number, yOffset: number, phaseShift = 0) {
    const xStart = -PAD;
    const xEnd   = VIEW_W + PAD;
    const steps  = 600;
    let d = "";
    for (let i = 0; i <= steps; i++) {
      const x = xStart + (i / steps) * (xEnd - xStart);
      const y = sineY(x, amplitude, period, yOffset, phaseShift);
      d += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
    }
    return d;
  }

  function generateDots(
    amplitude: number,
    period: number,
    yOffset: number,
    phaseShift: number,
    waveIndex: number
  ) {
    const dots: { x: number; y: number; r: number; opacity: number }[] = [];
    const xStart  = -PAD;
    const xEnd    = VIEW_W + PAD;
    const samples = 2000;

    for (let i = 0; i <= samples; i++) {
      const seed   = i * 7 + waveIndex * 10000;
      const jitter = (seededRand(seed + 1) - 0.5) * ((xEnd - xStart) / samples) * 1.4;
      const x      = Math.max(xStart, Math.min(xEnd, xStart + (i / samples) * (xEnd - xStart) + jitter));

      const sineVal = Math.sin((2 * Math.PI * (x + phaseShift)) / period);
      const dipFactor = (sineVal + 1) / 2;

      const threshold = 0.04 + dipFactor * dipFactor * 0.52;
      if (seededRand(seed) > threshold) continue;

      const r       = 0.5 + seededRand(seed + 2) * 1.1 * (0.5 + dipFactor * 0.5);
      const opacity = 0.2 + dipFactor * 0.6;
      const waveY   = sineY(x, amplitude, period, yOffset, phaseShift);
      const lift    = 0.6 + seededRand(seed + 4) * seededRand(seed + 5) * 4;
      const scatter = seededRand(seed + 3) * (1 - dipFactor) * 5;
      const y       = Math.max(r, waveY - r - lift - scatter);

      dots.push({ x, y, r, opacity });
    }

    return dots;
  }

  return (
    <div
      ref={outerRef}
      className={`overflow-hidden w-[calc(100%+2rem)] -ml-4 md:w-[calc(100%+4rem)] md:-ml-8 ${className}`}
      aria-hidden="true"
    >
      <div ref={innerRef} style={{ width: "150%", marginLeft: "-25%" }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="none"
          className="w-full h-10"
          style={{ overflow: "visible" }}
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
          {waves.map((w, i) => {
            const phaseShift = i * 80;
            const dots = generateDots(w.amplitude, w.period, w.yOffset, phaseShift, i);
            return (
              <g
                key={i}
                ref={(el) => { groupRefs.current[i] = el; }}
              >
                <path
                  d={sinePathD(w.amplitude, w.period, w.yOffset, phaseShift)}
                  fill="none"
                  stroke={w.color}
                  strokeWidth="1.2"
                  opacity={w.opacity}
                />
                {dots.map((dot, j) => (
                  <circle
                    key={j}
                    cx={dot.x}
                    cy={dot.y}
                    r={dot.r}
                    fill={w.color}
                    opacity={dot.opacity * w.opacity}
                  />
                ))}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
