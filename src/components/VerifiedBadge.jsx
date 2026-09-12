import { BadgeCheck } from "lucide-react";

export function VerifiedBadge({ verified, verificationStatus, size = 16 }) {
  const isVerified = verified === true || verificationStatus === "verified";
  if (!isVerified) return null;
  return <BadgeCheck className="verified-badge" size={size} aria-label="Convogram Verified" title="Convogram Verified" color="#1d9bf0" fill="#1d9bf0" stroke="white" />;
}
