import fs from "node:fs";

const rawJson = process.env.GOOGLE_SERVICES_JSON;
const b64 = process.env.GOOGLE_SERVICES_JSON_B64;
const appGradle = "android/app/build.gradle";
const rootGradle = "android/build.gradle";

function parseFirebaseConfig(value, sourceName) {
  const text = String(value ?? "").trim();
  if (!text) return null;

  // Accept a normal JSON secret even if it was accidentally placed in the B64 secret.
  if (text.startsWith("{")) {
    try {
      return JSON.parse(text);
    } catch (error) {
      throw new Error(`${sourceName} contains invalid JSON: ${error.message}`);
    }
  }

  // Accept standard Base64, Base64 with whitespace/newlines, and Base64URL.
  const normalized = text.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(normalized) || normalized.length % 4 === 1) {
    throw new Error(`${sourceName} is neither valid JSON nor valid Base64`);
  }

  try {
    const decoded = Buffer.from(normalized, "base64").toString("utf8").replace(/^\uFEFF/, "").trim();
    return JSON.parse(decoded);
  } catch (error) {
    throw new Error(`${sourceName} is not valid Base64-encoded Firebase JSON: ${error.message}`);
  }
}

let firebaseConfig = null;
try {
  if (rawJson?.trim()) {
    firebaseConfig = parseFirebaseConfig(rawJson, "GOOGLE_SERVICES_JSON");
  } else if (b64?.trim()) {
    firebaseConfig = parseFirebaseConfig(b64, "GOOGLE_SERVICES_JSON_B64");
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

if (!firebaseConfig) {
  console.log("No Firebase Android config secret set; leaving Firebase push build configuration unchanged.");
  process.exit(0);
}

fs.mkdirSync("android/app", { recursive: true });
fs.writeFileSync("android/app/google-services.json", JSON.stringify(firebaseConfig, null, 2));

let root = fs.readFileSync(rootGradle, "utf8");
if (root.includes("com.google.gms.google-services")) {
  console.log("Google services Gradle plugin already configured.");
} else if (/plugins\s*\{/.test(root)) {
  root = root.replace(/plugins\s*\{/, "plugins {\n    id 'com.google.gms.google-services' version '4.4.4' apply false");
  fs.writeFileSync(rootGradle, root);
} else if (root.includes("dependencies {")) {
  root = root.replace(/dependencies\s*\{/, "dependencies {\n        classpath 'com.google.gms:google-services:4.4.4'");
  fs.writeFileSync(rootGradle, root);
}

let app = fs.readFileSync(appGradle, "utf8");
if (!app.includes("com.google.gms.google-services")) {
  if (/plugins\s*\{/.test(app)) {
    app = app.replace(/plugins\s*\{/, "plugins {\n    id 'com.google.gms.google-services'");
  } else {
    app = "apply plugin: 'com.google.gms.google-services'\n" + app;
  }
  fs.writeFileSync(appGradle, app);
}

console.log("Firebase Android push configuration applied.");
