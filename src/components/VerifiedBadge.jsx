import { BadgeCheck } from "lucide-react";

export function VerifiedBadge({ verified, size = 16 }) {
  if (!verified) return null;
  return <BadgeCheck className="verified-badge" size={size} aria-label="Convogram Verified" title="Convogram Verified" color="#1d9bf0" fill="#1d9bf0" stroke="white" />;
}
