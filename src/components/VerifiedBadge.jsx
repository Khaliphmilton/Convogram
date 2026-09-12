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
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flex: "0 0 auto",
        flexShrink: 0,
        verticalAlign: "middle",
        marginLeft: 4,
        lineHeight: 0,
        color: "#1d9bf0",
        position: "relative",
        top: -1,
      }}
    >
      <svg viewBox="0 0 24 24" width={s} height={s} aria-hidden="true" style={{ display: "block" }}>
        <path d="M12 1.75 14.15 3l2.48-.05 1.18 2.18 2.18 1.18-.05 2.48L21.25 11 20 13.15l.05 2.48-2.18 1.18-1.18 2.18-2.48-.05L12 20.25l-2.15-1.31-2.48.05-1.18-2.18-2.18-1.18.05-2.48L2.75 11l1.31-2.15-.05-2.48 2.18-1.18 1.18-2.18 2.48.05L12 1.75Z" fill="currentColor" />
        <path d="m8.2 12.15 2.35 2.3 5.25-5.35" fill="none" stroke="white" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
