import fs from "node:fs";

const rawJson = process.env.GOOGLE_SERVICES_JSON;
const b64 = process.env.GOOGLE_SERVICES_JSON_B64;
const appGradle = "android/app/build.gradle";
const rootGradle = "android/build.gradle";

let firebaseConfig = null;
if (rawJson) {
  try {
    firebaseConfig = JSON.parse(rawJson);
  } catch (error) {
    console.error("GOOGLE_SERVICES_JSON is not valid JSON:", error.message);
    process.exit(1);
  }
} else if (b64) {
  try {
    firebaseConfig = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
  } catch (error) {
    console.error("GOOGLE_SERVICES_JSON_B64 is not valid Base64-encoded JSON:", error.message);
    process.exit(1);
  }
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
