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
        display: "inline-flex",
        width: s,
        height: s,
        marginLeft: 4,
        verticalAlign: "-3px",
        flex: `0 0 ${s}px`,
        lineHeight: 0,
      }}
    >
      <svg viewBox="0 0 24 24" width={s} height={s} aria-hidden="true" style={{ display: "block" }}>
        <circle cx="12" cy="12" r="11" fill="#20A4F3" />
        <path
          d="m7.25 12.1 3.05 3.05 6.45-6.45"
          fill="none"
          stroke="#fff"
          strokeWidth="2.35"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
