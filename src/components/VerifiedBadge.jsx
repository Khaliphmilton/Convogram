import React from "react";

export function VerifiedBadge({ verified, verificationStatus, size = 17, className = "" }) {
  const isVerified = verified === true || verificationStatus === "verified";
  if (!isVerified) return null;

  const s = Number(size) || 17;

  return (
    <span
      className={`verified-badge ${className}`.trim()}
      role="img"
      aria-label="Convogram Verified"
      title="Convogram Verified"
      style={{
        width: s,
        height: s,
        display: "inline-block",
        verticalAlign: "-3px",
        marginLeft: 4,
        flex: `0 0 ${s}px`,
        lineHeight: 0,
      }}
    >
      <svg viewBox="0 0 24 24" width={s} height={s} aria-hidden="true" style={{ display: "block" }}>
        <path
          d="M12 1.35l2.48 1.52 2.9-.1 1.18 2.65 2.65 1.18-.1 2.9L22.65 12l-1.54 2.5.1 2.9-2.65 1.18-1.18 2.65-2.9-.1L12 22.65l-2.5-1.52-2.9.1-1.18-2.65-2.65-1.18.1-2.9L1.35 12l1.52-2.5-.1-2.9 2.65-1.18L6.6 2.77l2.9.1L12 1.35z"
          fill="#20A4F3"
        />
        <path
          d="m7.25 12.05 3.05 3.05 6.45-6.45"
          fill="none"
          stroke="#fff"
          strokeWidth="2.15"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
