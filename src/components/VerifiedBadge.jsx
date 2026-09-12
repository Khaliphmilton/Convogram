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
        {/* Solid blue social-platform verification badge: no white circle */}
        <path
          d="M12 1.4 14.55 3l2.99-.16 1.28 2.72 2.72 1.28-.16 2.99L23 12l-1.62 2.55.16 2.99-2.72 1.28-1.28 2.72-2.99-.16L12 22.6l-2.55-1.62-2.99.16-1.28-2.72-2.72-1.28.16-2.99L1 12l1.62-2.55-.16-2.99 2.72-1.28 1.28-2.72 2.99.16L12 1.4Z"
          fill="#1DA1F2"
        />
        <path
          d="m7.35 12.05 3.05 3.02 6.35-6.35"
          fill="none"
          stroke="#fff"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
