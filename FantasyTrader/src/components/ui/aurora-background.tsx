"use client";
import { cn } from "@/lib/utils";
import React, { type ReactNode } from "react";

interface AuroraBackgroundProps extends React.HTMLProps<HTMLDivElement> {
  children: ReactNode;
  showRadialGradient?: boolean;
}

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
        <div
          className="absolute inset-0 overflow-hidden"
          style={
            {
              "--aurora":
                "radial-gradient(ellipse at 20% 50%, #059669 0%, transparent 55%), radial-gradient(ellipse at 80% 20%, #064e3b 0%, transparent 55%), radial-gradient(ellipse at 60% 80%, #10b981 0%, transparent 50%), radial-gradient(ellipse at 40% 30%, #047857 0%, transparent 45%)",
              "--dark-gradient":
                "radial-gradient(ellipse at 50% 50%, transparent 0%, #000 70%)",
            } as React.CSSProperties
          }
        >
          <div
            className={cn(
              "animate-aurora pointer-events-none absolute -inset-[10px] opacity-70 blur-[20px] filter will-change-transform",
              showRadialGradient &&
                "[mask-image:radial-gradient(ellipse_at_50%_50%,black_30%,transparent_80%)]",
            )}
           style={{
              backgroundImage:
                "radial-gradient(ellipse at 10% 40%, #7c3aed 0%, transparent 50%), radial-gradient(ellipse at 30% 70%, #059669 0%, transparent 50%), radial-gradient(ellipse at 60% 30%, #0ea5e9 0%, transparent 50%), radial-gradient(ellipse at 80% 60%, #10b981 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, #4f46e5 0%, transparent 45%), radial-gradient(ellipse at 90% 10%, #34d399 0%, transparent 45%)",
                 backgroundSize: "600% 300%",
                 backgroundPosition: "0% 50%",
              }}
          ></div>
        </div>
        {children}
      </div>
    </main>
  );
};