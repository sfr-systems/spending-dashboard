"use client";
import { useEffect, useRef } from "react";

export function StarBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function draw() {
      if (!canvas || !ctx) return;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const count = Math.floor((canvas.width * canvas.height) / 6000);
      for (let i = 0; i < count; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        // mix of tiny pinpoints and slightly larger ones
        const r = Math.random() < 0.85 ? Math.random() * 0.6 + 0.2 : Math.random() * 1.2 + 0.6;
        const opacity = Math.random() * 0.35 + 0.08;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(210, 220, 255, ${opacity})`;
        ctx.fill();
      }
    }

    draw();

    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none -z-10"
      aria-hidden="true"
    />
  );
}
