/**
 * Kredo — the rising notch mark.
 *
 * Two stacked chevrons: the white one is the K's floor, the gold one climbs
 * past its frame. The score climbing IS the brand.
 *
 * Variants:
 *   - "full": mark + wordmark
 *   - "mark": mark only (favicon-sized, embedded badges)
 *   - "wordmark": wordmark only
 */

import React from "react";

export type LogoVariant = "full" | "mark" | "wordmark";
export type LogoSize = "sm" | "md" | "lg";
export type LogoTheme = "light" | "dark";

interface LogoProps {
  variant?: LogoVariant;
  size?: LogoSize;
  theme?: LogoTheme;
  className?: string;
}

const sizeMap = {
  sm: { mark: "w-5 h-5", text: "text-base tracking-[0.28em]" },
  md: { mark: "w-6 h-6", text: "text-lg tracking-[0.3em]" },
  lg: { mark: "w-8 h-8", text: "text-2xl tracking-[0.32em]" },
};

export function Logo({
  variant = "full",
  size = "md",
  theme = "dark",
  className = "",
}: LogoProps) {
  const inkClass = theme === "dark" ? "text-foreground" : "text-background";
  const { mark: markSize, text: textSize } = sizeMap[size];

  const Mark = () => (
    <svg
      className={`${markSize} ${inkClass} transition-colors`}
      viewBox="0 0 200 120"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Kredo logo"
    >
      <path
        d="M 55 90 L 55 30"
        stroke="currentColor"
        strokeWidth="10"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M 55 62 L 82 42 L 108 62"
        stroke="currentColor"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M 55 62 L 82 82 L 108 62 L 135 42"
        stroke="#D6AC57"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="135" cy="42" r="8" fill="#D6AC57" />
    </svg>
  );

  const Wordmark = () => (
    <span
      className={`${textSize} font-semibold ${inkClass} font-[family-name:var(--font-display)] transition-colors`}
    >
      KREDO
    </span>
  );

  if (variant === "mark") {
    return (
      <div className={`inline-flex items-center ${className}`}>
        <Mark />
      </div>
    );
  }
  if (variant === "wordmark") {
    return (
      <div className={`inline-flex items-center ${className}`}>
        <Wordmark />
      </div>
    );
  }
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <Mark />
      <Wordmark />
    </div>
  );
}

export function LogoFull(props: Omit<LogoProps, "variant">) {
  return <Logo {...props} variant="full" />;
}
export function LogoMark(props: Omit<LogoProps, "variant">) {
  return <Logo {...props} variant="mark" />;
}
export function LogoWordmark(props: Omit<LogoProps, "variant">) {
  return <Logo {...props} variant="wordmark" />;
}
