import fs from "node:fs";

// Login hardening is already committed to src/main.jsx. The Android workflow
// still invokes this script for compatibility, so keep it as a safe verifier
// rather than mutating source files during CI.
const source = fs.readFileSync("src/main.jsx", "utf8");

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

console.log("Convogram login hardening is already present; CI verification passed.");
