"use client";
import { cn } from "@/lib/utils";
import React, { type ReactNode } from "react";

interface AuroraBackgroundProps extends React.HTMLProps<HTMLDivElement> {
  children: ReactNode;
  showRadialGradient?: boolean;
}

// dir: "r" = left→right, "l" = right→left, "dr" = diagonal down-right, "ur" = diagonal up-right
const blobs: { color: string; w: string; h: string; top: string; left: string; dir: string; delay: string; duration: string }[] = [
  { color: "#c8a882", w: "38%", h: "80%",  top: "25%",  left: "-40%",  dir: "r",  delay: "0s",   duration: "16s" },
  { color: "#5a8a88", w: "30%", h: "120%", top: "-15%", left: "140%",  dir: "l",  delay: "-4s",  duration: "20s" },
  { color: "#c8a882", w: "32%", h: "60%",  top: "55%",  left: "-35%",  dir: "dr", delay: "-7s",  duration: "14s" },
  { color: "#5a8a88", w: "28%", h: "100%", top: "10%",  left: "140%",  dir: "l",  delay: "-11s", duration: "22s" },
  { color: "#a07850", w: "36%", h: "90%",  top: "-10%", left: "-38%",  dir: "ur", delay: "-2s",  duration: "18s" },
  { color: "#3d6b69", w: "24%", h: "70%",  top: "65%",  left: "-32%",  dir: "r",  delay: "-14s", duration: "13s" },
  { color: "#c8a882", w: "30%", h: "110%", top: "5%",   left: "-36%",  dir: "dr", delay: "-6s",  duration: "21s" },
  { color: "#5a8a88", w: "26%", h: "55%",  top: "75%",  left: "140%",  dir: "l",  delay: "-9s",  duration: "15s" },
  { color: "#a07850", w: "34%", h: "130%", top: "-25%", left: "140%",  dir: "ur", delay: "-1s",  duration: "19s" },
  { color: "#3d6b69", w: "28%", h: "75%",  top: "40%",  left: "-30%",  dir: "ur", delay: "-16s", duration: "24s" },
];

export const AuroraBackground = ({
  className,
  children,
  showRadialGradient = true,
  ...props
}: AuroraBackgroundProps) => {
  return (
    <div
      className={cn(
        "transition-bg relative flex flex-col bg-[#0a0908] text-[#ede8df]",
        className,
      )}
      {...props}
    >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {blobs.map((blob, i) => (
            <div
              key={i}
              className={`animate-aurora-${blob.dir} pointer-events-none absolute blur-[90px] will-change-transform`}
              style={{
                width: blob.w,
                height: blob.h,
                top: blob.top,
                left: blob.left,
                background: `radial-gradient(ellipse 100% 100%, ${blob.color} 0%, transparent 100%)`,
                animationDuration: blob.duration,
                animationDelay: blob.delay,
              }}
            />
          ))}
        </div>
        {children}
      </div>
  );
};