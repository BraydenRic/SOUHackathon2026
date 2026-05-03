"use client";
import { cn } from "@/lib/utils";
import React, { type ReactNode } from "react";

interface AuroraBackgroundProps extends React.HTMLProps<HTMLDivElement> {
  children: ReactNode;
  showRadialGradient?: boolean;
}

const blobs = [
  { color: "#7c3aed", size: "20% 35%", top: "55%", delay: "0s",   duration: "14s" },
  { color: "#059669", size: "15% 50%", top: "25%", delay: "-3s",  duration: "17s" },
  { color: "#0ea5e9", size: "22% 30%", top: "70%", delay: "-6s",  duration: "12s" },
  { color: "#c8a882", size: "18% 55%", top: "35%", delay: "-9s",  duration: "19s" },
  { color: "#4f46e5", size: "20% 28%", top: "65%", delay: "-2s",  duration: "15s" },
  { color: "#34d399", size: "25% 45%", top: "20%", delay: "-11s", duration: "11s" },
  { color: "#7c3aed", size: "16% 52%", top: "60%", delay: "-5s",  duration: "18s" },
  { color: "#0ea5e9", size: "22% 33%", top: "30%", delay: "-8s",  duration: "13s" },
  { color: "#059669", size: "18% 48%", top: "75%", delay: "-1s",  duration: "16s" },
  { color: "#4f46e5", size: "20% 38%", top: "40%", delay: "-13s", duration: "20s" },
];

export const AuroraBackground = ({
  className,
  children,
  showRadialGradient = true,
  ...props
}: AuroraBackgroundProps) => {
  return (
    <main>
      <div
        className={cn(
          "transition-bg relative flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-slate-100",
          className,
        )}
        {...props}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {blobs.map((blob, i) => (
            <div
              key={i}
              className="animate-aurora-blob pointer-events-none absolute blur-[40px] opacity-60 will-change-transform"
              style={{
                width: "40%",
                height: blob.size.split(" ")[1],
                top: blob.top,
                left: "-40%",
                transform: "translateY(-50%)",
                background: `radial-gradient(ellipse ${blob.size}, ${blob.color} 0%, transparent 100%)`,
                animationDuration: blob.duration,
                animationDelay: blob.delay,
              }}
            />
          ))}
        </div>
        {children}
      </div>
    </main>
  );
};