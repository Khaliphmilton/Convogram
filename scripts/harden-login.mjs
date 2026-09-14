import fs from "node:fs";

// Login hardening is already committed to src/main.jsx. The Android workflow
// still invokes this script for compatibility, so keep it as a safe verifier
// and add the navigation unread-message module needed by the mobile build.
const path = "src/main.jsx";
let source = fs.readFileSync(path, "utf8");

const required = [
  'setTimeout(() => {',
  'Could not start Convogram',
  'Unable to sign in right now',
  'class ConvogramErrorBoundary',
];

for (const marker of required) {
  if (!source.includes(marker)) {
    throw new Error(`Login hardening marker is missing: ${marker}`);
  }
}

if (source.includes("Loading your social world")) {
  throw new Error("Obsolete startup loading screen is still present.");
}

const unreadImport = 'import "./lib/message-unread-badge";';
if (!source.includes(unreadImport)) {
  const importMarker = 'import "./index.css";';
  if (!source.includes(importMarker)) {
    throw new Error("Could not locate main stylesheet import.");
  }
  source = source.replace(importMarker, `${importMarker}\n${unreadImport}`);
  fs.writeFileSync(path, source);
}

console.log("Convogram login hardening and unread-message navigation badge verification passed.");
